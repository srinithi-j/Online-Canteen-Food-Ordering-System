const userState = {
  authMode: "login",
  selectedRole: "student",
  currentView: "dashboard",
  filter: "all",
  search: "",
  paymentMethod: "UPI",
  cart: [],
  currentUser: CanteenStore.getCurrentUser("user")
};

const DEFAULT_UPI_PAYEE_VPA = "your-canteen-upi-id@bank";
const DEFAULT_UPI_PAYEE_NAME = "Canteen";
const DEFAULT_UPI_PAYEE_AID = "";

const authScreen = document.getElementById("authScreen");
const appShell = document.getElementById("appShell");
const authFeedback = document.getElementById("authFeedback");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginTabBtn = document.getElementById("loginTabBtn");
const signupTabBtn = document.getElementById("signupTabBtn");
const logoutBtn = document.getElementById("logoutBtn");
const menuGrid = document.getElementById("menuGrid");
const cartItems = document.getElementById("cartItems");
const itemsTotal = document.getElementById("itemsTotal");
const grandTotal = document.getElementById("grandTotal");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const formFeedback = document.getElementById("formFeedback");
const historyList = document.getElementById("historyList");
const profileHistoryList = document.getElementById("profileHistoryList");
const searchInput = document.getElementById("searchInput");
const filterGroup = document.getElementById("filterGroup");
const paymentMethods = document.getElementById("paymentMethods");
const selectedPaymentLabel = document.getElementById("selectedPaymentLabel");
const roleButtons = document.querySelectorAll(".role-btn");

const upiPaySection = document.getElementById("upiPaySection");
const upiQrImage = document.getElementById("upiQrImage");
const upiPayLink = document.getElementById("upiPayLink");
const payNowBtn = document.getElementById("payNowBtn");
const cancelOrderBtn = document.getElementById("cancelOrderBtn");

const API_BASE = "http://localhost:3001";

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

async function startRazorpayPayment(order) {
  if (!order) return;
  if (!window.Razorpay) {
    setFormFeedback("Payment module not loaded. Please refresh and try again.", "error");
    return;
  }

  if (order.paymentStatus === "Paid") {
    setFormFeedback("Payment already completed for this order.", "success");
    return;
  }

  try {
    if (payNowBtn) payNowBtn.disabled = true;
    setFormFeedback("Opening payment...", "");

    const { keyId } = await fetchJson(`${API_BASE}/api/payments/razorpay/key`);
    const rpOrder = await fetchJson(`${API_BASE}/api/payments/razorpay/order`, {
      method: "POST",
      body: JSON.stringify({
        amount: Math.round(Number(order.total) * 100),
        currency: "INR",
        receipt: order.orderId
      })
    });

    const options = {
      key: keyId,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      name: "Canteen",
      description: `Order ${order.orderId}`,
      order_id: rpOrder.id,
      prefill: {
        name: order.userName
      },
      handler: async function (response) {
        try {
          const verifyResult = await fetchJson(`${API_BASE}/api/payments/razorpay/verify`, {
            method: "POST",
            body: JSON.stringify(response)
          });

          if (!verifyResult.verified) {
            setFormFeedback("Payment verification failed. Please contact support.", "error");
            return;
          }

          const orders = CanteenStore.getOrders();
          const stored = orders.find((entry) => entry.id === order.id);
          if (stored) {
            stored.paymentStatus = "Paid";
            stored.paymentProvider = "Razorpay";
            stored.paymentId = response.razorpay_payment_id;
            stored.razorpayOrderId = response.razorpay_order_id;
            stored.paymentVerifiedAt = new Date().toLocaleString();
            CanteenStore.saveOrders(orders);
          }

          setFormFeedback("Payment verified. You can collect your order.", "success");
          renderPickupCard(stored || order);
          renderHistory();
          renderProfileSummary();
        } catch (err) {
          setFormFeedback(err?.message || "Payment verification failed.", "error");
        }
      }
    };

    const razorpayCheckout = new window.Razorpay(options);
    razorpayCheckout.on("payment.failed", function () {
      setFormFeedback("Payment failed or cancelled.", "error");
    });
    razorpayCheckout.open();
  } catch (err) {
    setFormFeedback(err?.message || "Could not start payment.", "error");
  } finally {
    if (payNowBtn) payNowBtn.disabled = false;
  }
}

function syncFromStorage(event) {
  if (!event.key) return;
  if (!["canteen-menu-v4", "canteen-orders-v4", "canteen-current-user-v4", "canteen-settings-v1"].includes(event.key)) {
    return;
  }

  userState.currentUser = CanteenStore.getCurrentUser("user");

  if (!userState.currentUser || userState.currentUser.role === "admin") {
    showAuth();
    return;
  }

  renderTop();
  renderMenu();
  renderHistory();
  renderProfileSummary();

  const latestOrder = getOrders().slice(-1)[0];
  if (latestOrder) {
    renderPickupCard(latestOrder);
  }
}

function formatCurrency(amount) {
  return `Rs. ${amount}`;
}

function buildUpiUri({ vpa, name, amount, note, aid }) {
  const cleanedVpa = String(vpa || "").trim();
  const cleanedName = String(name || "").trim();
  const cleanedAid = String(aid || "").trim();

  if (cleanedAid) {
    return (
      "upi://pay?" +
      `pa=${encodeURIComponent(cleanedVpa)}` +
      `&pn=${encodeURIComponent(cleanedName)}` +
      `&aid=${encodeURIComponent(cleanedAid)}`
    );
  }

  const params = new URLSearchParams();
  params.set("pa", cleanedVpa);
  params.set("pn", cleanedName);
  params.set("cu", "INR");

  if (amount !== undefined && amount !== null && amount !== "") {
    params.set("am", Number(amount).toFixed(2));
  }

  const cleanedNote = String(note || "").trim();
  if (cleanedNote) {
    params.set("tn", cleanedNote);
  }

  return `upi://pay?${params.toString()}`;
}

function getUpiSettings() {
  const fallback = {
    upiVpa: DEFAULT_UPI_PAYEE_VPA,
    upiPayeeName: DEFAULT_UPI_PAYEE_NAME,
    upiAid: DEFAULT_UPI_PAYEE_AID
  };

  if (!CanteenStore.getSettings) return { ...fallback };
  const settings = CanteenStore.getSettings();
  if (!settings || typeof settings !== "object") return { ...fallback };
  return {
    upiVpa: (settings.upiVpa || "").trim() || fallback.upiVpa,
    upiPayeeName: (settings.upiPayeeName || "").trim() || fallback.upiPayeeName,
    upiAid: (settings.upiAid || "").trim() || fallback.upiAid
  };
}

function ensureUpiSettings() {
  if (!CanteenStore.saveSettings || !CanteenStore.getSettings) return;

  const current = getUpiSettings();
  const isPlaceholder = current.upiVpa === DEFAULT_UPI_PAYEE_VPA;
  if (!isPlaceholder) return;

  const vpa = window.prompt("Enter UPI ID for receiving payments:", "");
  if (vpa === null) return;
  const cleanedVpa = vpa.trim();
  if (!cleanedVpa) return;

  const name = window.prompt("Enter payee name (shown in UPI app):", "Canteen");
  if (name === null) return;
  const cleanedName = name.trim();
  if (!cleanedName) return;

  const aid = window.prompt("Enter UPI AID (optional):", "");
  if (aid === null) return;

  CanteenStore.saveSettings({
    upiVpa: cleanedVpa,
    upiPayeeName: cleanedName,
    upiAid: String(aid || "").trim()
  });
}

function getCategoryLabel(category) {
 if (category === "main_course") return "Main Course";
  if (category === "curries") return "Curries";
  if (category === "bakes_snacks") return "Bakes & Snacks";
  if (category === "todays_special") return "Today's Special";
  if (category === "hot_drinks") return "Hot Drinks";
  if (category === "juices_milkshakes") return "Juices & Milkshakes";
  if (category === "ice_creams") return "Ice Creams";
  return "Chat";
}

function setAuthFeedback(message, type = "") {
  authFeedback.textContent = message;
  authFeedback.className = `feedback ${type}`.trim();
}

function setFormFeedback(message, type = "") {
  formFeedback.textContent = message;
  formFeedback.className = `feedback ${type}`.trim();
}

function getUsers() {
  return CanteenStore.getUsers();
}

function getMenu() {
  return CanteenStore.getMenu().filter((item) => item.enabled && !item.archived);
}

function getOrders() {
  const allOrders = CanteenStore.getOrders();
  if (!userState.currentUser) return [];
  return allOrders.filter((order) => order.userId === userState.currentUser.id && order.status !== "Cancelled");
}

function clearPickupCard() {
  const emptyState = document.getElementById("emptyPickupState");
  const pickupCard = document.getElementById("pickupCard");
  if (emptyState) emptyState.classList.remove("hidden");
  if (pickupCard) pickupCard.classList.add("hidden");
  if (upiPaySection) upiPaySection.classList.add("hidden");
}

function cancelActiveOrder() {
  const activeOrderId = userState.activeOrderId;
  if (!activeOrderId) return;

  const orders = CanteenStore.getOrders();
  const order = orders.find((entry) => entry.id === activeOrderId);
  if (!order || !userState.currentUser || order.userId !== userState.currentUser.id) return;

  if (order.status === "Collected") {
    setFormFeedback("This order was already verified and cannot be cancelled.", "error");
    return;
  }

  const confirmCancel = window.confirm("Cancel this order? This will remove it from active orders.");
  if (!confirmCancel) return;

  order.status = "Cancelled";
  CanteenStore.saveOrders(orders);
  userState.activeOrderId = null;
  clearPickupCard();
  renderHistory();
  renderProfileSummary();
  setFormFeedback("Order cancelled.", "success");
}

function getCartTotal() {
  return userState.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function showAuth() {
  authScreen.classList.remove("hidden");
  appShell.classList.add("hidden");
}

function showApp() {
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
}

function updateAuthLabels() {
  const isTeacher = userState.selectedRole === "teacher";
  document.getElementById("loginTitle").textContent = isTeacher ? "Teacher Login" : "Student Login";
  document.getElementById("signupTitle").textContent = isTeacher ? "Teacher Sign Up" : "Student Sign Up";
  document.getElementById("loginIdLabel").textContent = isTeacher ? "Teacher ID" : "Register number";
  document.getElementById("signupIdLabel").textContent = isTeacher ? "Teacher ID" : "Register number";
  document.getElementById("signupDepartmentLabel").textContent = isTeacher ? "Department" : "Department / year";
  document.getElementById("userDepartmentLabel").textContent = isTeacher ? "Department" : "Department / year";
  document.getElementById("loginIdentifier").placeholder = isTeacher ? "TEACH101" : "22CS1042";
  document.getElementById("signupIdentifier").placeholder = isTeacher ? "TEACH101" : "22CS1042";
  document.getElementById("signupDepartment").placeholder = isTeacher ? "Mathematics" : "CSE - 3rd year";
}

function switchAuthMode(mode) {
  userState.authMode = mode;
  loginTabBtn.classList.toggle("active", mode === "login");
  signupTabBtn.classList.toggle("active", mode === "signup");
  loginForm.classList.toggle("hidden", mode !== "login");
  signupForm.classList.toggle("hidden", mode !== "signup");
  updateAuthLabels();
  setAuthFeedback("");
}

function renderSidebar() {
  const currentUser = userState.currentUser;
  document.getElementById("sidebarAvatar").textContent = getInitials(currentUser.name) || "U";
  document.getElementById("sidebarName").textContent = currentUser.name;
  document.getElementById("sidebarRoleText").textContent =
    currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
}

function renderTop() {
  document.getElementById("welcomeHeading").textContent = `Hello, ${userState.currentUser.name}`;
  document.getElementById("availableItemCount").textContent = `${getMenu().length} items`;
}

function fillOrderForm() {
  const user = userState.currentUser;
  document.getElementById("userName").value = user.name;
  document.getElementById("userIdentifier").value = user.identifier;
  document.getElementById("userDepartment").value = user.department;
}

function renderMenu() {
  const visibleItems = getMenu().filter((item) => {
    const filterMatch = userState.filter === "all" || item.category === userState.filter;
    const searchMatch = item.name.toLowerCase().includes(userState.search.toLowerCase());
    return filterMatch && searchMatch;
  });

  if (visibleItems.length === 0) {
    menuGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
         No items available right now.
      </div>
    `;
    return;
  }

  menuGrid.innerHTML = visibleItems
    .map(
      (item) => `
        <article class="menu-card">
          <img class="menu-image" src="${item.image}" alt="${item.name}" />
          <div class="menu-card__body">
            <h3>${item.name}</h3>
            <div class="menu-meta">
              <span class="category-tag">${getCategoryLabel(item.category)}</span>
            </div>
            <div class="menu-footer">
              <span class="price">${formatCurrency(item.price)}</span>
              <button class="add-btn" type="button" data-id="${item.id}">Add to cart</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderCart() {
  if (userState.cart.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-state">
        Your cart is empty. Add items from the menu to continue.
      </div>
    `;
  } else {
    cartItems.innerHTML = userState.cart
      .map(
        (item) => `
          <div class="cart-item">
            <div class="cart-item__info">
              <img class="cart-thumb" src="${item.image}" alt="${item.name}" />
              <div>
                <h4>${item.name}</h4>
                <div class="history-meta">${formatCurrency(item.price)} each</div>
              </div>
            </div>
            <div class="qty-controls">
              <button class="qty-btn" type="button" data-action="decrease" data-id="${item.id}">-</button>
              <strong>${item.quantity}</strong>
              <button class="qty-btn" type="button" data-action="increase" data-id="${item.id}">+</button>
            </div>
          </div>
        `
      )
      .join("");
  }

  const total = getCartTotal();
  itemsTotal.textContent = formatCurrency(total);
  grandTotal.textContent = formatCurrency(total);
  selectedPaymentLabel.textContent = userState.paymentMethod;
}

function buildHistoryMarkup(orders) {
  if (orders.length === 0) {
    return `<div class="empty-state">No orders found yet.</div>`;
  }

  return orders
    .slice()
    .reverse()
    .map(
      (order) => `
        <article class="history-item">
          <div class="history-head">
            <div>
              <h4>${order.orderId}</h4>
              <div class="history-meta">${order.userName} • ${order.userRole}</div>
            </div>
            <div class="history-total">${formatCurrency(order.total)}</div>
          </div>
          <div class="history-meta">${order.items.map((item) => `${item.name} x${item.quantity}`).join(", ")}</div>
          <div class="history-meta">${order.paymentMethod} • PIN ${order.pin} • ${order.createdAt}</div>
          <div class="history-meta">Status: ${order.status === "Collected" ? "Verified — collect your order" : order.status}</div>
        </article>
      `
    )
    .join("");
}

function renderHistory() {
  const orders = getOrders();
  historyList.innerHTML = buildHistoryMarkup(orders.slice(0, 6));
  profileHistoryList.innerHTML = buildHistoryMarkup(orders);
}

function renderProfileSummary() {
  const orders = getOrders();
  const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
  const averageOrder = orders.length ? Math.round(totalSpent / orders.length) : 0;
  const paymentCount = {};

  orders.forEach((order) => {
    paymentCount[order.paymentMethod] = (paymentCount[order.paymentMethod] || 0) + 1;
  });

  let topPayment = "-";
  let topCount = 0;
  Object.entries(paymentCount).forEach(([method, count]) => {
    if (count > topCount) {
      topPayment = method;
      topCount = count;
    }
  });

  const latestOrder = orders[orders.length - 1];
  document.getElementById("summaryOrders").textContent = orders.length;
  document.getElementById("summarySpent").textContent = formatCurrency(totalSpent);
  document.getElementById("summaryPayment").textContent = topPayment;
  document.getElementById("profileAvatar").textContent = getInitials(userState.currentUser.name) || "U";
  document.getElementById("profileName").textContent = userState.currentUser.name;
  document.getElementById("profileIdentifier").textContent = userState.currentUser.identifier;
  document.getElementById("profileDepartment").textContent = userState.currentUser.department;
  document.getElementById("profileSpent").textContent = formatCurrency(totalSpent);
  document.getElementById("profileOrders").textContent = orders.length;
  document.getElementById("profileAverage").textContent = formatCurrency(averageOrder);
  document.getElementById("profileTopPayment").textContent = topPayment;
}

function renderPickupCard(order) {
  userState.activeOrderId = order.id;
  document.getElementById("emptyPickupState").classList.add("hidden");
  document.getElementById("pickupCard").classList.remove("hidden");
  document.getElementById("orderIdValue").textContent = order.orderId;
  document.getElementById("pickupPinValue").textContent = order.pin;
  document.getElementById("pickupUserName").textContent = order.userName;
  document.getElementById("pickupUserRole").textContent = order.userRole;
  document.getElementById("pickupSlotValue").textContent = order.pickupSlot;
  document.getElementById("pickupPaymentValue").textContent = order.paymentMethod;

  const isUpiPayment = order.paymentMethod === "UPI";
  if (isUpiPayment) {
    ensureUpiSettings();
  }
  const { upiVpa: payeeVpa, upiPayeeName: payeeName, upiAid: payeeAid } = getUpiSettings();

  const upiUri = isUpiPayment
    ? buildUpiUri({
        vpa: payeeVpa,
        name: payeeName,
        amount: payeeAid ? undefined : order.total,
        note: payeeAid ? "" : `Order ${order.orderId}`,
        aid: payeeAid
      })
    : "";

  if (upiPaySection && upiQrImage && upiPayLink) {
    upiPaySection.classList.toggle("hidden", !isUpiPayment);
    if (isUpiPayment) {
      upiPayLink.href = upiUri;
      upiPayLink.rel = "noreferrer";
      upiPayLink.target = "_blank";
      upiQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        upiUri
      )}`;

      if (payNowBtn) {
        payNowBtn.classList.toggle("hidden", order.paymentStatus === "Paid");
        payNowBtn.onclick = () => startRazorpayPayment(order);
      }
    }
  }

  if (cancelOrderBtn) {
    cancelOrderBtn.classList.toggle("hidden", order.status === "Collected");
  }

  const statusLine = document.getElementById("pickupStatusLine");
  if (statusLine) {
    statusLine.textContent =
      order.status === "Collected" ? "Order verified — collect your order" : "Waiting for verification";
  }

  const pickupQrData = JSON.stringify({
    orderId: order.orderId,
    pin: order.pin,
    userName: order.userName,
    userRole: order.userRole
  });

  const pickupQrImage = document.getElementById("qrImage");
  if (pickupQrImage) {
    pickupQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      pickupQrData
    )}`;
  }
}

function addToCart(itemId) {
  const selectedItem = getMenu().find((item) => item.id === itemId);
  const existingItem = userState.cart.find((item) => item.id === itemId);

  if (!selectedItem) return;

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    userState.cart.push({ ...selectedItem, quantity: 1 });
  }

  renderCart();
  setFormFeedback(`${selectedItem.name} added to cart.`, "success");
}

function updateCartItem(itemId, action) {
  const targetItem = userState.cart.find((item) => item.id === itemId);
  if (!targetItem) return;

  if (action === "increase") {
    targetItem.quantity += 1;
  } else {
    targetItem.quantity -= 1;
  }

  userState.cart = userState.cart.filter((item) => item.quantity > 0);
  renderCart();
}

function readOrderForm() {
  return {
    userName: document.getElementById("userName").value.trim(),
    userIdentifier: document.getElementById("userIdentifier").value.trim(),
    userDepartment: document.getElementById("userDepartment").value.trim(),
    pickupSlot: document.getElementById("pickupSlot").value,
    paymentMethod: userState.paymentMethod
  };
}

function validateOrderForm(data) {
  if (!data.userName || !data.userIdentifier || !data.userDepartment || !data.pickupSlot) {
    return "Please complete all order details before placing the order.";
  }

  if (userState.cart.length === 0) {
    return "Add at least one food item to place an order.";
  }

  return "";
}

function placeOrder() {
  const formData = readOrderForm();
  const errorMessage = validateOrderForm(formData);

  if (errorMessage) {
    setFormFeedback(errorMessage, "error");
    return;
  }

  const orders = CanteenStore.getOrders();
  const order = {
    id: Date.now(),
    orderId: `CFOS-${Math.floor(1000 + Math.random() * 9000)}`,
    pin: `${Math.floor(1000 + Math.random() * 9000)}`,
    userId: userState.currentUser.id,
    userName: formData.userName,
    userRole: userState.currentUser.role.charAt(0).toUpperCase() + userState.currentUser.role.slice(1),
    pickupSlot: formData.pickupSlot,
    paymentMethod: formData.paymentMethod,
    total: getCartTotal(),
    status: "Awaiting collection",
    createdAt: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    }),
    items: userState.cart.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price
    }))
  };

  orders.push(order);
  CanteenStore.saveOrders(orders);
  renderPickupCard(order);
  renderHistory();
  renderProfileSummary();
  setFormFeedback(`Order placed successfully. Pickup PIN is ${order.pin}.`, "success");
  userState.cart = [];
  renderCart();
  switchView("pickup");
}

function switchView(viewName) {
  userState.currentView = viewName;
  document.querySelectorAll(".view-section").forEach((section) => {
    section.classList.toggle("hidden", section.id !== `${viewName}View`);
  });

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
}

function handleLogin(event) {
  event.preventDefault();
  const identifier = document.getElementById("loginIdentifier").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  const user = getUsers().find(
    (item) =>
      item.role === userState.selectedRole &&
      item.identifier === identifier &&
      item.password === password
  );

  if (!user) {
    setAuthFeedback("Invalid ID or password for the selected role.", "error");
    return;
  }

  userState.currentUser = user;
  CanteenStore.setCurrentUser(user, "user");
  renderShell();
}

function handleSignup(event) {
  event.preventDefault();

  const name = document.getElementById("signupName").value.trim();
  const identifier = document.getElementById("signupIdentifier").value.trim();
  const department = document.getElementById("signupDepartment").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  if (!name || !identifier || !department || !password) {
    setAuthFeedback("Please complete all signup details.", "error");
    return;
  }

  const users = getUsers();
  const existingUser = users.find(
    (user) => user.role === userState.selectedRole && user.identifier === identifier
  );

  if (existingUser) {
    setAuthFeedback("This ID already has an account.", "error");
    return;
  }

  const newUser = {
    id: Date.now(),
    name,
    identifier,
    department,
    password,
    role: userState.selectedRole
  };

  users.push(newUser);
  CanteenStore.saveUsers(users);
  userState.currentUser = newUser;
  CanteenStore.setCurrentUser(newUser, "user");
  renderShell();
}

function handleLogout() {
  userState.currentUser = null;
  userState.cart = [];
  CanteenStore.clearCurrentUser("user");
  showAuth();
  switchAuthMode("login");
  setAuthFeedback("");
}

function renderShell() {
  if (!userState.currentUser || userState.currentUser.role === "admin") {
    showAuth();
    return;
  }

  showApp();
  renderSidebar();
  renderTop();
  fillOrderForm();
  renderMenu();
  renderCart();
  renderHistory();
  renderProfileSummary();

  const latestOrder = getOrders().slice(-1)[0];
  if (latestOrder) {
    renderPickupCard(latestOrder);
  }

  switchView(userState.currentView);
}

function attachEvents() {
  loginTabBtn.addEventListener("click", () => switchAuthMode("login"));
  signupTabBtn.addEventListener("click", () => switchAuthMode("signup"));
  loginForm.addEventListener("submit", handleLogin);
  signupForm.addEventListener("submit", handleSignup);
  logoutBtn.addEventListener("click", handleLogout);
  placeOrderBtn.addEventListener("click", placeOrder);
  if (cancelOrderBtn) {
    cancelOrderBtn.addEventListener("click", cancelActiveOrder);
  }
  window.addEventListener("storage", syncFromStorage);

  roleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      userState.selectedRole = button.dataset.role;
      roleButtons.forEach((item) => {
        item.classList.toggle("active", item.dataset.role === userState.selectedRole);
      });
      updateAuthLabels();
    });
  });

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  menuGrid.addEventListener("click", (event) => {
    if (!event.target.dataset.id) return;
    addToCart(Number(event.target.dataset.id));
  });

  cartItems.addEventListener("click", (event) => {
    if (!event.target.dataset.action) return;
    updateCartItem(Number(event.target.dataset.id), event.target.dataset.action);
  });

  filterGroup.addEventListener("click", (event) => {
    if (!event.target.dataset.filter) return;
    userState.filter = event.target.dataset.filter;
    document.querySelectorAll(".filter-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.filter === userState.filter);
    });
    renderMenu();
  });

  searchInput.addEventListener("input", (event) => {
    userState.search = event.target.value;
    renderMenu();
  });

  paymentMethods.addEventListener("click", (event) => {
    if (!event.target.dataset.payment) return;
    userState.paymentMethod = event.target.dataset.payment;
    document.querySelectorAll(".payment-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.payment === userState.paymentMethod);
    });
    renderCart();
  });
}

function init() {
  CanteenStore.bootstrap();
  attachEvents();
  updateAuthLabels();

  if (userState.currentUser && userState.currentUser.role !== "admin") {
    renderShell();
  } else {
    showAuth();
    setAuthFeedback("");
  }
}

init();