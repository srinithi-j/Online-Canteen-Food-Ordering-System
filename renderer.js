const storageKeys = {
  users: "canteen-users-v2",
  currentUser: "canteen-current-user-v2",
  orders: "canteen-orders-v2",
  menu: "canteen-menu-v2"
};

const defaultMenu = [
  {
    id: 1,
    name: "Veg Fried Rice",
    price: 70,
    category: "meal",
    availability: "lunch",
    enabled: true,
    image: "https://source.unsplash.com/featured/600x400/?veg,fried-rice"
  },
  {
    id: 2,
    name: "Chicken Biryani",
    price: 120,
    category: "meal",
    availability: "lunch",
    enabled: true,
    image: "https://source.unsplash.com/featured/600x400/?chicken,biryani"
  },
  {
    id: 3,
    name: "Masala Dosa",
    price: 55,
    category: "snack",
    availability: "morning",
    enabled: true,
    image: "https://source.unsplash.com/featured/600x400/?masala,dosa"
  },
  {
    id: 4,
    name: "Paneer Roll",
    price: 60,
    category: "snack",
    availability: "evening",
    enabled: true,
    image: "https://source.unsplash.com/featured/600x400/?paneer,roll"
  },
  {
    id: 5,
    name: "Lemon Juice",
    price: 25,
    category: "drink",
    availability: "all_day",
    enabled: true,
    image: "https://source.unsplash.com/featured/600x400/?lemon,juice"
  },
  {
    id: 6,
    name: "Cold Coffee",
    price: 45,
    category: "drink",
    availability: "all_day",
    enabled: true,
    image: "https://source.unsplash.com/featured/600x400/?cold,coffee"
  }
];

const appState = {
  authMode: "login",
  selectedRole: "student",
  currentView: "userDashboard",
  filter: "all",
  search: "",
  paymentMethod: "UPI",
  cart: [],
  users: JSON.parse(localStorage.getItem(storageKeys.users) || "[]"),
  currentUser: JSON.parse(localStorage.getItem(storageKeys.currentUser) || "null"),
  orders: JSON.parse(localStorage.getItem(storageKeys.orders) || "[]"),
  menu: JSON.parse(localStorage.getItem(storageKeys.menu) || "[]")
};

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
const simulateScanBtn = document.getElementById("simulateScanBtn");
const scanResult = document.getElementById("scanResult");
const sidebarNav = document.getElementById("sidebarNav");
const adminMenuForm = document.getElementById("adminMenuForm");
const adminMenuFeedback = document.getElementById("adminMenuFeedback");
const adminMenuList = document.getElementById("adminMenuList");
const verifyForm = document.getElementById("verifyForm");
const verifyResult = document.getElementById("verifyResult");
const adminOrderList = document.getElementById("adminOrderList");

function formatCurrency(amount) {
  return `Rs. ${amount}`;
}

function getCategoryLabel(category) {
  if (category === "meal") return "Meal";
  if (category === "snack") return "Snack";
  return "Drink";
}

function getAvailabilityLabel(session) {
  if (session === "all_day") return "All day";
  return session.charAt(0).toUpperCase() + session.slice(1);
}

function saveUsers() {
  localStorage.setItem(storageKeys.users, JSON.stringify(appState.users));
}

function saveCurrentUser() {
  localStorage.setItem(storageKeys.currentUser, JSON.stringify(appState.currentUser));
}

function saveOrders() {
  localStorage.setItem(storageKeys.orders, JSON.stringify(appState.orders));
}

function saveMenu() {
  localStorage.setItem(storageKeys.menu, JSON.stringify(appState.menu));
}

function setAuthFeedback(message, type = "") {
  authFeedback.textContent = message;
  authFeedback.className = `feedback ${type}`.trim();
}

function setFormFeedback(message, type = "") {
  formFeedback.textContent = message;
  formFeedback.className = `feedback ${type}`.trim();
}

function setAdminMenuFeedback(message, type = "") {
  adminMenuFeedback.textContent = message;
  adminMenuFeedback.className = `feedback ${type}`.trim();
}

function createDefaultDataIfNeeded() {
  if (appState.users.length === 0) {
    appState.users = [
      {
        id: 1,
        name: "Aswin",
        identifier: "22CS1042",
        department: "CSE - 3rd year",
        password: "1234",
        role: "student"
      },
      {
        id: 2,
        name: "Meena Ma'am",
        identifier: "TEACH101",
        department: "Mathematics",
        password: "1234",
        role: "teacher"
      },
      {
        id: 3,
        name: "Canteen Admin",
        identifier: "ADMIN01",
        department: "Canteen Office",
        password: "admin123",
        role: "admin"
      }
    ];
    saveUsers();
  }

  if (appState.menu.length === 0) {
    appState.menu = defaultMenu;
    saveMenu();
  }
}

function getCurrentSession() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 19) return "evening";
  return "night";
}

function getAvailableMenu() {
  const session = getCurrentSession();
  return appState.menu.filter((item) => {
    const sessionMatch = item.availability === "all_day" || item.availability === session;
    return item.enabled && sessionMatch;
  });
}

function getOrdersForCurrentUser() {
  if (!appState.currentUser) return [];
  if (appState.currentUser.role === "admin") return appState.orders;
  return appState.orders.filter((order) => order.userId === appState.currentUser.id);
}

function getCartTotal() {
  return appState.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function switchAuthMode(mode) {
  appState.authMode = mode;
  loginTabBtn.classList.toggle("active", mode === "login");
  signupTabBtn.classList.toggle("active", mode === "signup");
  loginForm.classList.toggle("hidden", mode !== "login");
  signupForm.classList.toggle("hidden", mode !== "signup");
  signupTabBtn.disabled = appState.selectedRole === "admin";
  if (appState.selectedRole === "admin" && mode === "signup") {
    appState.authMode = "login";
    switchAuthMode("login");
    return;
  }
  updateAuthLabels();
  setAuthFeedback("");
}

function updateAuthLabels() {
  const roleTitle =
    appState.selectedRole === "student"
      ? "Student"
      : appState.selectedRole === "teacher"
        ? "Teacher"
        : "Admin";

  const idLabel = appState.selectedRole === "teacher" ? "Teacher ID" : appState.selectedRole === "admin" ? "Admin ID" : "Register number";
  const idPlaceholder =
    appState.selectedRole === "teacher"
      ? "TEACH101"
      : appState.selectedRole === "admin"
        ? "ADMIN01"
        : "22CS1042";

  document.getElementById("loginTitle").textContent = `${roleTitle} Login`;
  document.getElementById("signupTitle").textContent = `${roleTitle} Sign Up`;
  document.getElementById("loginIdLabel").textContent = idLabel;
  document.getElementById("signupIdLabel").textContent = idLabel;
  document.getElementById("loginRegister").placeholder = idPlaceholder;
  document.getElementById("signupRegister").placeholder = idPlaceholder;
}

function showAuth() {
  authScreen.classList.remove("hidden");
  appShell.classList.add("hidden");
}

function showApp() {
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
}

function fillOrderFormFromUser() {
  if (!appState.currentUser || appState.currentUser.role === "admin") return;
  document.getElementById("userName").value = appState.currentUser.name;
  document.getElementById("userId").value = appState.currentUser.identifier;
  document.getElementById("userDept").value = appState.currentUser.department;
}

function generateOrderId() {
  return `CFOS-${Math.floor(1000 + Math.random() * 9000)}`;
}

function generatePin() {
  return `${Math.floor(1000 + Math.random() * 9000)}`;
}

function renderSidebar() {
  const user = appState.currentUser;
  if (!user) return;

  document.getElementById("sidebarAvatar").textContent = getInitials(user.name) || "U";
  document.getElementById("sidebarName").textContent = user.name;
  document.getElementById("sidebarRoleText").textContent =
    user.role.charAt(0).toUpperCase() + user.role.slice(1);

  if (user.role === "admin") {
    document.getElementById("sidebarTitle").textContent = "Admin Panel";
    document.getElementById("sidebarSubtitle").textContent =
      "Manage menu availability and verify pickups.";
    sidebarNav.innerHTML = `
      <button class="nav-btn" data-view="adminDashboard" type="button">Admin Dashboard</button>
      <button class="nav-btn" data-view="adminMenu" type="button">Manage Menu</button>
      <button class="nav-btn" data-view="adminVerify" type="button">Verify QR / PIN</button>
    `;
  } else {
    document.getElementById("sidebarTitle").textContent = "User Panel";
    document.getElementById("sidebarSubtitle").textContent =
      "Order from items available in the canteen now.";
    sidebarNav.innerHTML = `
      <button class="nav-btn" data-view="userDashboard" type="button">Dashboard</button>
      <button class="nav-btn" data-view="menu" type="button">Menu</button>
      <button class="nav-btn" data-view="order" type="button">Order</button>
      <button class="nav-btn" data-view="pickup" type="button">Pickup</button>
      <button class="nav-btn" data-view="profile" type="button">Profile</button>
    `;
  }

  sidebarNav.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });
}

function renderTopBar() {
  const user = appState.currentUser;
  const session = getAvailabilityLabel(getCurrentSession());
  document.getElementById("welcomeHeading").textContent = `Hello, ${user.name}`;
  document.getElementById("currentSessionLabel").textContent = `${session} session`;
  document.getElementById("availableItemCount").textContent = `${getAvailableMenu().length} items`;
}

function renderRushIndicator() {
  const hour = new Date().getHours();
  let label = "Comfortable crowd";
  let wait = "6 min wait";

  if (hour >= 12 && hour <= 13) {
    label = "Heavy crowd";
    wait = "15 min wait";
  } else if (hour === 11 || hour === 14) {
    label = "Moderate crowd";
    wait = "10 min wait";
  }

  document.getElementById("rushLabel").textContent = label;
  document.getElementById("waitTime").textContent = wait;
}

function renderMenu() {
  const sourceMenu = appState.currentUser?.role === "admin" ? appState.menu : getAvailableMenu();
  const visibleItems = sourceMenu.filter((item) => {
    const filterMatch = appState.filter === "all" || item.category === appState.filter;
    const searchMatch = item.name.toLowerCase().includes(appState.search.toLowerCase());
    return filterMatch && searchMatch;
  });

  if (visibleItems.length === 0) {
    menuGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        No food items are available for this session right now.
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
              <span class="history-meta">${getAvailabilityLabel(item.availability)}</span>
            </div>
            <div class="menu-footer">
              <span class="price">${formatCurrency(item.price)}</span>
              ${
                appState.currentUser?.role === "admin"
                  ? `<span class="history-meta">${item.enabled ? "Enabled" : "Disabled"}</span>`
                  : `<button class="add-btn" type="button" data-id="${item.id}">Add to cart</button>`
              }
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderCart() {
  if (!cartItems) return;

  if (appState.cart.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-state">
        Your cart is empty. Add items from the menu to continue.
      </div>
    `;
  } else {
    cartItems.innerHTML = appState.cart
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
  selectedPaymentLabel.textContent = appState.paymentMethod;
}

function buildHistoryMarkup(orders) {
  if (orders.length === 0) {
    return `
      <div class="empty-state">
        No orders found yet.
      </div>
    `;
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
              <div class="history-meta">${order.userName} • ${order.userRole} • ${order.pickupSlot}</div>
            </div>
            <div class="history-total">${formatCurrency(order.total)}</div>
          </div>
          <div class="history-meta">${order.items.map((item) => `${item.name} x${item.quantity}`).join(", ")}</div>
          <div class="history-meta">${order.paymentMethod} • PIN ${order.pin} • ${order.createdAt}</div>
        </article>
      `
    )
    .join("");
}

function renderHistory() {
  const orders = getOrdersForCurrentUser();
  historyList.innerHTML = buildHistoryMarkup(orders.slice(0, 6));
  profileHistoryList.innerHTML = buildHistoryMarkup(orders);
}

function renderProfileSummary() {
  if (!appState.currentUser || appState.currentUser.role === "admin") return;

  const orders = getOrdersForCurrentUser();
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
  document.getElementById("summaryPin").textContent = latestOrder ? latestOrder.pin : "----";
  document.getElementById("profileSpent").textContent = formatCurrency(totalSpent);
  document.getElementById("profileOrders").textContent = orders.length;
  document.getElementById("profileAverage").textContent = formatCurrency(averageOrder);
  document.getElementById("profileTopPayment").textContent = topPayment;
  document.getElementById("profileAvatar").textContent = getInitials(appState.currentUser.name) || "U";
  document.getElementById("profileName").textContent = appState.currentUser.name;
  document.getElementById("profileId").textContent = appState.currentUser.identifier;
  document.getElementById("profileDepartment").textContent = appState.currentUser.department;
}

function renderPickupCard(order) {
  document.getElementById("emptyPickupState").classList.add("hidden");
  document.getElementById("pickupCard").classList.remove("hidden");
  document.getElementById("orderIdValue").textContent = order.orderId;
  document.getElementById("pickupPinValue").textContent = order.pin;
  document.getElementById("pickupUserName").textContent = order.userName;
  document.getElementById("pickupUserRole").textContent = order.userRole;
  document.getElementById("pickupSlotValue").textContent = order.pickupSlot;
  document.getElementById("pickupPaymentValue").textContent = order.paymentMethod;

  const qrPayload = encodeURIComponent(
    JSON.stringify({
      orderId: order.orderId,
      pin: order.pin,
      userName: order.userName,
      userRole: order.userRole
    })
  );

  document.getElementById(
    "qrImage"
  ).src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrPayload}`;
}

function renderAdminSummary() {
  const enabledItems = appState.menu.filter((item) => item.enabled).length;
  const pendingOrders = appState.orders.filter((order) => order.status !== "Collected").length;
  document.getElementById("adminEnabledCount").textContent = `${enabledItems} items`;
  document.getElementById("adminPendingCount").textContent = `${pendingOrders} orders`;
}

function renderAdminMenuList() {
  if (appState.menu.length === 0) {
    adminMenuList.innerHTML = `<div class="empty-state">No menu items added yet.</div>`;
    return;
  }

  adminMenuList.innerHTML = appState.menu
    .map(
      (item) => `
        <article class="admin-item">
          <div class="admin-item__top">
            <div>
              <h4>${item.name}</h4>
              <div class="history-meta">${getCategoryLabel(item.category)} • ${getAvailabilityLabel(item.availability)} • ${formatCurrency(item.price)}</div>
            </div>
            <strong>${item.enabled ? "Visible" : "Hidden"}</strong>
          </div>
          <div class="admin-item__actions">
            <button class="status-btn ${item.enabled ? "enabled" : "disabled"}" type="button" data-action="toggle-menu" data-id="${item.id}">
              ${item.enabled ? "Disable" : "Enable"}
            </button>
            <button class="ghost-btn" type="button" data-action="delete-menu" data-id="${item.id}">
              Remove
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderAdminOrderList() {
  const pendingOrders = appState.orders.filter((order) => order.status !== "Collected");
  if (pendingOrders.length === 0) {
    adminOrderList.innerHTML = `<div class="empty-state">No pending pickup orders.</div>`;
    return;
  }

  adminOrderList.innerHTML = pendingOrders
    .slice()
    .reverse()
    .map(
      (order) => `
        <article class="history-item">
          <div class="history-head">
            <div>
              <h4>${order.userName}</h4>
              <div class="history-meta">${order.userRole} • ${order.orderId}</div>
            </div>
            <div class="history-total">PIN ${order.pin}</div>
          </div>
          <div class="history-meta">${order.items.map((item) => `${item.name} x${item.quantity}`).join(", ")}</div>
          <div class="history-meta">${order.pickupSlot} • ${order.paymentMethod}</div>
        </article>
      `
    )
    .join("");
}

function readOrderForm() {
  return {
    userName: document.getElementById("userName").value.trim(),
    userIdentifier: document.getElementById("userId").value.trim(),
    userDepartment: document.getElementById("userDept").value.trim(),
    pickupSlot: document.getElementById("pickupSlot").value,
    paymentMethod: appState.paymentMethod
  };
}

function validateOrderForm(data) {
  if (!data.userName || !data.userIdentifier || !data.userDepartment || !data.pickupSlot) {
    return "Please complete all order details before placing the order.";
  }

  if (appState.cart.length === 0) {
    return "Add at least one food item to place an order.";
  }

  return "";
}

function addToCart(itemId) {
  const selectedItem = appState.menu.find((item) => item.id === itemId);
  const existingItem = appState.cart.find((item) => item.id === itemId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    appState.cart.push({ ...selectedItem, quantity: 1 });
  }

  renderCart();
  setFormFeedback(`${selectedItem.name} added to cart.`, "success");
}

function updateCartItem(itemId, action) {
  const targetItem = appState.cart.find((item) => item.id === itemId);
  if (!targetItem) return;

  if (action === "increase") {
    targetItem.quantity += 1;
  } else {
    targetItem.quantity -= 1;
  }

  appState.cart = appState.cart.filter((item) => item.quantity > 0);
  renderCart();
}

function placeOrder() {
  const formData = readOrderForm();
  const errorMessage = validateOrderForm(formData);

  if (errorMessage) {
    setFormFeedback(errorMessage, "error");
    return;
  }

  const order = {
    id: Date.now(),
    orderId: generateOrderId(),
    pin: generatePin(),
    userId: appState.currentUser.id,
    userName: formData.userName,
    userRole: appState.currentUser.role.charAt(0).toUpperCase() + appState.currentUser.role.slice(1),
    userIdentifier: formData.userIdentifier,
    userDepartment: formData.userDepartment,
    pickupSlot: formData.pickupSlot,
    paymentMethod: formData.paymentMethod,
    total: getCartTotal(),
    status: "Awaiting collection",
    createdAt: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    }),
    items: appState.cart.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price
    }))
  };

  appState.orders.push(order);
  saveOrders();
  renderPickupCard(order);
  renderHistory();
  renderProfileSummary();
  renderAdminSummary();
  renderAdminOrderList();
  scanResult.classList.add("hidden");
  setFormFeedback(`Order placed successfully. Pickup PIN is ${order.pin}.`, "success");
  appState.cart = [];
  renderCart();
  switchView("pickup");
}

function switchView(viewName) {
  appState.currentView = viewName;
  document.querySelectorAll(".view-section").forEach((section) => {
    section.classList.toggle("hidden", section.id !== `${viewName}View`);
  });

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
}

function handleLogin(event) {
  event.preventDefault();

  const identifier = document.getElementById("loginRegister").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  const user = appState.users.find(
    (item) =>
      item.role === appState.selectedRole &&
      item.identifier === identifier &&
      item.password === password
  );

  if (!user) {
    setAuthFeedback("Invalid ID or password for the selected role.", "error");
    return;
  }

  appState.currentUser = user;
  saveCurrentUser();
  appState.currentView = user.role === "admin" ? "adminDashboard" : "userDashboard";
  renderShell();
}

function handleSignup(event) {
  event.preventDefault();

  if (appState.selectedRole === "admin") {
    setAuthFeedback("Admin signup is disabled. Use the default admin login.", "error");
    return;
  }

  const name = document.getElementById("signupName").value.trim();
  const identifier = document.getElementById("signupRegister").value.trim();
  const department = document.getElementById("signupDepartment").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  if (!name || !identifier || !department || !password) {
    setAuthFeedback("Please complete all signup details.", "error");
    return;
  }

  const existingUser = appState.users.find(
    (user) => user.role === appState.selectedRole && user.identifier === identifier
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
    role: appState.selectedRole
  };

  appState.users.push(newUser);
  saveUsers();
  appState.currentUser = newUser;
  saveCurrentUser();
  appState.currentView = "userDashboard";
  renderShell();
}

function handleLogout() {
  appState.currentUser = null;
  appState.cart = [];
  saveCurrentUser();
  showAuth();
  switchAuthMode("login");
  setAuthFeedback(
    "Demo accounts: Student 22CS1042/1234, Teacher TEACH101/1234, Admin ADMIN01/admin123"
  );
}

function handleAdminMenuSubmit(event) {
  event.preventDefault();

  const name = document.getElementById("adminFoodName").value.trim();
  const price = Number(document.getElementById("adminFoodPrice").value);
  const category = document.getElementById("adminFoodCategory").value;
  const availability = document.getElementById("adminFoodSession").value;
  const image = document.getElementById("adminFoodImage").value.trim();

  if (!name || !price || !image) {
    setAdminMenuFeedback("Please complete all menu item details.", "error");
    return;
  }

  appState.menu.push({
    id: Date.now(),
    name,
    price,
    category,
    availability,
    enabled: true,
    image
  });
  saveMenu();
  adminMenuForm.reset();
  setAdminMenuFeedback(`${name} added successfully.`, "success");
  renderAdminMenuList();
  renderMenu();
  renderAdminSummary();
  renderTopBar();
}

function toggleMenuItem(itemId) {
  const item = appState.menu.find((menuItem) => menuItem.id === itemId);
  if (!item) return;
  item.enabled = !item.enabled;
  saveMenu();
  renderAdminMenuList();
  renderMenu();
  renderAdminSummary();
  renderTopBar();
}

function deleteMenuItem(itemId) {
  appState.menu = appState.menu.filter((item) => item.id !== itemId);
  saveMenu();
  renderAdminMenuList();
  renderMenu();
  renderAdminSummary();
  renderTopBar();
}

function simulateQrScan() {
  const latestOrder = getOrdersForCurrentUser().slice(-1)[0];
  if (!latestOrder) return;

  scanResult.classList.remove("hidden");
  scanResult.innerHTML = `
    <strong>${latestOrder.userName}</strong>
    <div>Verification done.</div>
    <div>Collect your order.</div>
  `;
}

function verifyByPin(event) {
  event.preventDefault();
  const pin = document.getElementById("verifyPinInput").value.trim();
  const order = appState.orders.find((item) => item.pin === pin);

  verifyResult.classList.remove("hidden");

  if (!order) {
    verifyResult.className = "verification-box error";
    verifyResult.innerHTML = `<strong>No order found</strong><div>Please check the PIN and try again.</div>`;
    return;
  }

  order.status = "Collected";
  saveOrders();
  verifyResult.className = "verification-box";
  verifyResult.innerHTML = `
    <strong>${order.userName}</strong>
    <div>Verification done.</div>
    <div>Collect your order.</div>
  `;
  renderAdminSummary();
  renderAdminOrderList();
}

function renderShell() {
  if (!appState.currentUser) {
    showAuth();
    return;
  }

  showApp();
  renderSidebar();
  renderTopBar();
  renderRushIndicator();

  if (appState.currentUser.role !== "admin") {
    fillOrderFormFromUser();
    renderMenu();
    renderCart();
    renderHistory();
    renderProfileSummary();
    const latestOrder = getOrdersForCurrentUser().slice(-1)[0];
    if (latestOrder) {
      renderPickupCard(latestOrder);
    }
  } else {
    renderAdminSummary();
    renderAdminMenuList();
    renderAdminOrderList();
  }

  switchView(appState.currentView);
}

function attachEvents() {
  loginTabBtn.addEventListener("click", () => switchAuthMode("login"));
  signupTabBtn.addEventListener("click", () => switchAuthMode("signup"));
  loginForm.addEventListener("submit", handleLogin);
  signupForm.addEventListener("submit", handleSignup);
  logoutBtn.addEventListener("click", handleLogout);
  placeOrderBtn.addEventListener("click", placeOrder);
  adminMenuForm.addEventListener("submit", handleAdminMenuSubmit);
  verifyForm.addEventListener("submit", verifyByPin);
  simulateScanBtn.addEventListener("click", simulateQrScan);

  roleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      appState.selectedRole = button.dataset.role;
      roleButtons.forEach((item) => {
        item.classList.toggle("active", item.dataset.role === appState.selectedRole);
      });
      if (appState.selectedRole === "admin") {
        switchAuthMode("login");
      } else {
        signupTabBtn.disabled = false;
      }
      updateAuthLabels();
    });
  });

  menuGrid.addEventListener("click", (event) => {
    if (!event.target.dataset.id || appState.currentUser?.role === "admin") return;
    addToCart(Number(event.target.dataset.id));
  });

  cartItems.addEventListener("click", (event) => {
    if (!event.target.dataset.action) return;
    updateCartItem(Number(event.target.dataset.id), event.target.dataset.action);
  });

  filterGroup.addEventListener("click", (event) => {
    if (!event.target.dataset.filter) return;
    appState.filter = event.target.dataset.filter;
    document.querySelectorAll(".filter-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.filter === appState.filter);
    });
    renderMenu();
  });

  searchInput.addEventListener("input", (event) => {
    appState.search = event.target.value;
    renderMenu();
  });

  paymentMethods.addEventListener("click", (event) => {
    if (!event.target.dataset.payment) return;
    appState.paymentMethod = event.target.dataset.payment;
    document.querySelectorAll(".payment-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.payment === appState.paymentMethod);
    });
    renderCart();
  });

  adminMenuList.addEventListener("click", (event) => {
    const action = event.target.dataset.action;
    const id = Number(event.target.dataset.id);
    if (!action || !id) return;
    if (action === "toggle-menu") toggleMenuItem(id);
    if (action === "delete-menu") deleteMenuItem(id);
  });
}

function init() {
  createDefaultDataIfNeeded();
  attachEvents();
  updateAuthLabels();

  if (appState.currentUser) {
    renderShell();
  } else {
    showAuth();
    setAuthFeedback(
      "Demo accounts: Student 22CS1042/1234, Teacher TEACH101/1234, Admin ADMIN01/admin123"
    );
  }
}

init();
