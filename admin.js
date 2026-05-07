const adminState = {
  currentUser: CanteenStore.getCurrentUser("admin"),
  currentView: "dashboard",
  showArchivedMenu: false
};

const authScreen = document.getElementById("authScreen");
const appShell = document.getElementById("appShell");
const authFeedback = document.getElementById("authFeedback");
const adminLoginForm = document.getElementById("adminLoginForm");
const logoutBtn = document.getElementById("logoutBtn");
const adminMenuForm = document.getElementById("adminMenuForm");
const adminMenuList = document.getElementById("adminMenuList");
const categoryList = document.getElementById("categoryList");
const menuFeedback = document.getElementById("menuFeedback");
const orderList = document.getElementById("orderList");
const verifyPaymentForm = document.getElementById("verifyPaymentForm");
const verifyPaymentResult = document.getElementById("verifyPaymentResult");
const verifyPickupForm = document.getElementById("verifyPickupForm");
const verifyPickupResult = document.getElementById("verifyPickupResult");
const verifyPaymentSection = document.getElementById("verifyPaymentSection");

let refreshIntervalId = null;

function startAutoRefresh() {
  if (refreshIntervalId) return;
  refreshIntervalId = window.setInterval(() => {
    if (!adminState.currentUser || adminState.currentUser.role !== "admin") return;
    renderTop();
    renderOrderList();
  }, 1000);
}

function stopAutoRefresh() {
  if (!refreshIntervalId) return;
  window.clearInterval(refreshIntervalId);
  refreshIntervalId = null;
}

function syncFromStorage(event) {
  if (!event.key) return;
  if (!["canteen-menu-v4", "canteen-orders-v4", "canteen-current-admin-v4"].includes(event.key)) {
    return;
  }

  adminState.currentUser = CanteenStore.getCurrentUser("admin");
  if (!adminState.currentUser || adminState.currentUser.role !== "admin") {
    showAuth();
    return;
  }

  renderTop();
  renderMenuList();
  renderOrderList();
}

function formatCurrency(amount) {
  return `Rs. ${amount}`;
}

function getCategoryLabel(category) {
  const settings = CanteenStore.getSettings();
  const categories = Array.isArray(settings.categories) ? settings.categories : [];
  const found = categories.find((entry) => entry && entry.value === category);
  if (found && found.label) return found.label;
  if (category === "main_course") return "Main Course";
  if (category === "curries") return "Curries";
  if (category === "bakes_snacks") return "Bakes & Snacks";
  if (category === "egg_items") return "Egg Items";
  if (category === "todays_special") return "Today's Special";
  if (category === "hot_drinks") return "Hot Drinks";
  if (category === "juices_milkshakes") return "Juices & Milkshakes";
  if (category === "ice_creams") return "Ice Creams";
  return "Chat";
}

function slugifyCategoryLabel(label) {
  return String(label)
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getCategories() {
  const settings = CanteenStore.getSettings();
  return Array.isArray(settings.categories) ? settings.categories : [];
}

function saveCategories(categories) {
  CanteenStore.saveSettings({
    ...CanteenStore.getSettings(),
    categories
  });
}

function renderCategoryDropdown(selectedValue = "") {
  const dropdown = document.getElementById("foodCategory");
  if (!dropdown) return;

  const categories = getCategories().filter((entry) => entry && entry.enabled !== false);
  dropdown.innerHTML = categories
    .map((entry) => `<option value="${entry.value}">${entry.label}</option>`)
    .join("");

  if (selectedValue && categories.some((entry) => entry.value === selectedValue)) {
    dropdown.value = selectedValue;
  }
}

function renderCategoryList() {
  if (!categoryList) return;
  const categories = getCategories();
  if (categories.length === 0) {
    categoryList.innerHTML = `<div class="empty-state">No categories available.</div>`;
    return;
  }

  categoryList.innerHTML = categories
    .map(
      (entry) => `
        <article class="admin-item">
          <div class="admin-item__top">
            <div>
              <h4>${entry.label}</h4>
              <div class="history-meta">${entry.value}</div>
            </div>
            <strong>${entry.enabled === false ? "Hidden" : "Visible"}</strong>
          </div>
          <div class="admin-item__actions">
            <button class="status-btn ${entry.enabled === false ? "disabled" : "enabled"}" type="button" data-action="toggle-category" data-value="${entry.value}">
              ${entry.enabled === false ? "Show" : "Hide"}
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function toggleCategory(categoryValue) {
  const categories = getCategories();
  const category = categories.find((entry) => entry && entry.value === categoryValue);
  if (!category) return;
  category.enabled = category.enabled === false;
  saveCategories(categories);
  renderCategoryList();
  renderCategoryDropdown();
  setMenuFeedback("Category updated.", "success");
}

function setAuthFeedback(message, type = "") {
  authFeedback.textContent = message;
  authFeedback.className = `feedback ${type}`.trim();
}

function setMenuFeedback(message, type = "") {
  menuFeedback.textContent = message;
  menuFeedback.className = `feedback ${type}`.trim();
}

function setVerifyPaymentFeedback(message, type = "") {
  verifyPaymentResult.textContent = message;
  verifyPaymentResult.className = `feedback ${type}`.trim();
}

function showAuth() {
  authScreen.classList.remove("hidden");
  appShell.classList.add("hidden");
}

function showApp() {
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
}

function renderTop() {
  const menu = CanteenStore.getMenu();
  const orders = CanteenStore.getOrders().filter((order) => order.status !== "Cancelled");
  const enabledCount = menu.filter((item) => item.enabled && !item.archived).length;
  const pendingCount = orders.filter((order) => order.status !== "Collected").length;
  const collectedCount = orders.filter((order) => order.status === "Collected").length;

  document.getElementById("enabledCount").textContent = `${enabledCount} items enabled`;
  document.getElementById("summaryEnabled").textContent = enabledCount;
  document.getElementById("summaryOrders").textContent = orders.length;
  document.getElementById("summaryPending").textContent = pendingCount;
  document.getElementById("summaryCollected").textContent = collectedCount;
}

function renderMenuList() {
  const menu = CanteenStore.getMenu();
  const visibleMenu = menu.filter((item) => !item.archived);
  const listMenu = adminState.showArchivedMenu ? menu : visibleMenu;
  if (listMenu.length === 0) {
    adminMenuList.innerHTML = `<div class="empty-state">No menu items added yet.</div>`;
    return;
  }

  adminMenuList.innerHTML = listMenu
    .map(
      (item) => `
        <article class="admin-item">
          <div class="admin-item__top">
            <div>
              <h4>${item.name}</h4>
              <div class="history-meta">${getCategoryLabel(item.category)} • ${formatCurrency(item.price)}</div>
            </div>
            <strong>${item.archived ? "Removed" : item.enabled ? "Visible" : "Hidden"}</strong>
          </div>
          <div class="admin-item__actions">
            <button class="status-btn ${item.enabled ? "enabled" : "disabled"}" type="button" data-action="toggle" data-id="${item.id}">
              ${item.enabled ? "Hide" : "Show"}
            </button>
            <button class="ghost-btn" type="button" data-action="edit" data-id="${item.id}">
              Edit
            </button>
            <button class="ghost-btn" type="button" data-action="archive" data-id="${item.id}">
              ${item.archived ? "Restore" : "Remove"}
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function editMenuItem(itemId) {
  const menu = CanteenStore.getMenu();
  const item = menu.find((entry) => entry.id === itemId);
  if (!item) return;

  const nextName = window.prompt("Edit item name:", item.name);
  if (nextName === null) return;
  const cleanedName = nextName.trim();
  if (!cleanedName) {
    setMenuFeedback("Name cannot be empty.", "error");
    return;
  }

  const nextPriceRaw = window.prompt("Edit item price:", String(item.price));
  if (nextPriceRaw === null) return;
  const nextPrice = Number(nextPriceRaw);
  if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
    setMenuFeedback("Price must be a valid number.", "error");
    return;
  }

  item.name = cleanedName;
  item.price = nextPrice;
  CanteenStore.saveMenu(menu);
  setMenuFeedback(`Updated ${item.name}.`, "success");
  renderTop();
  renderMenuList();
}

function renderOrderList() {
  const pendingOrders = CanteenStore.getOrders().filter((order) => {
    if (order.status === "Collected" || order.status === "Cancelled") return false;
    if (order.paymentMethod === "UPI" && !order.paymentReported) return false;
    return true;
  });

  if (verifyPaymentSection) {
    const needsUpiPaymentVerification = pendingOrders.some(
      (order) => order.paymentMethod === "UPI" && !order.paymentVerifiedByAdmin
    );
    verifyPaymentSection.classList.toggle("hidden", !needsUpiPaymentVerification);
  }

  if (pendingOrders.length === 0) {
    orderList.innerHTML = `<div class="empty-state">No pending pickup orders.</div>`;
    return;
  }

  orderList.innerHTML = pendingOrders
    .slice()
    .reverse()
    .map(
      (order) => `
        <article class="history-item">
          <div class="history-head">
            <div>
              <h4>${order.userName}</h4>
              <div class="history-meta">${order.userRole}${
                order.paymentMethod === "UPI" ? ` • ${order.orderId}` : ""
              }</div>
            </div>
            <div class="history-total">PIN ${order.pin}</div>
          </div>
          <div class="history-meta">${order.items.map((item) => `${item.name} x${item.quantity}`).join(", ")}</div>
          <div class="history-meta">${order.pickupSlot} • ${order.paymentMethod}${
            order.paymentMethod === "UPI"
              ? ` • ${order.paymentVerifiedByAdmin ? "Payment verified" : "Payment pending"}`
              : ""
          }</div>
        </article>
      `
    )
    .join("");
}

function switchView(viewName) {
  adminState.currentView = viewName;
  document.querySelectorAll(".view-section").forEach((section) => {
    section.classList.toggle("hidden", section.id !== `${viewName}View`);
  });

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
}

function handleLogin(event) {
  event.preventDefault();
  const identifier = document.getElementById("adminIdentifier").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  const admin = CanteenStore.getUsers().find(
    (user) => user.role === "admin" && user.identifier === identifier && user.password === password
  );

  if (!admin) {
    setAuthFeedback("Invalid admin ID or password.", "error");
    return;
  }

  adminState.currentUser = admin;
  CanteenStore.setCurrentUser(admin, "admin");
  renderShell();
}

function handleLogout() {
  adminState.currentUser = null;
  CanteenStore.clearCurrentUser("admin");
  stopAutoRefresh();
  showAuth();
  setAuthFeedback("");
}

function handleMenuSubmit(event) {
  event.preventDefault();
  const menu = CanteenStore.getMenu();
  const name = document.getElementById("foodName").value.trim();
  const price = Number(document.getElementById("foodPrice").value);
  const category = document.getElementById("foodCategory").value;
  const image = document.getElementById("foodImage").value.trim();

  if (!name || !price || !image) {
    setMenuFeedback("Please complete all menu item details.", "error");
    return;
  }

  menu.push({
    id: Date.now(),
    name,
    price,
    category,
    enabled: true,
    image
  });

  CanteenStore.saveMenu(menu);
  adminMenuForm.reset();
  setMenuFeedback(`${name} added successfully.`, "success");
  renderTop();
  renderMenuList();
}

function toggleMenuItem(itemId) {
  const menu = CanteenStore.getMenu();
  const item = menu.find((entry) => entry.id === itemId);
  if (!item) return;
  if (item.archived) {
    setMenuFeedback("This item is removed. Restore it to make changes.", "error");
    return;
  }
  item.enabled = !item.enabled;
  CanteenStore.saveMenu(menu);
  renderTop();
  renderMenuList();
}

function archiveMenuItem(itemId) {
  const menu = CanteenStore.getMenu();
  const item = menu.find((entry) => entry.id === itemId);
  if (!item) return;
  if (!item.archived) {
    const confirmRemove = window.confirm(`Remove ${item.name}? You can restore it later by enabling "Show removed items".`);
    if (!confirmRemove) return;
    item.archived = true;
    item.enabled = false;
    setMenuFeedback(`${item.name} removed.`, "success");
  } else {
    item.archived = false;
    setMenuFeedback(`${item.name} restored.`, "success");
  }
  CanteenStore.saveMenu(menu);
  renderTop();
  renderMenuList();
}

function verifyOrderByPin(pin) {
  const cleanedPin = String(pin || "").trim();
  const orders = CanteenStore.getOrders();
  const order = orders.find((entry) => entry.pin === cleanedPin);

  verifyPickupResult.classList.remove("hidden");

  if (!order) {
    verifyPickupResult.className = "verification-box error";
    verifyPickupResult.innerHTML = `<strong>No order found</strong><div>Please check the pickup PIN and try again.</div>`;
    return;
  }

  if (order.status === "Cancelled") {
    verifyPickupResult.className = "verification-box error";
    verifyPickupResult.innerHTML = `<strong>Order cancelled</strong><div>This order was cancelled and cannot be verified.</div>`;
    return;
  }

  if (order.status === "Collected") {
    verifyPickupResult.className = "verification-box error";
    verifyPickupResult.innerHTML = `<strong>Already verified</strong><div>This order was already verified earlier.</div>`;
    return;
  }

  if (order.paymentMethod === "UPI" && !order.paymentVerifiedByAdmin) {
    verifyPickupResult.className = "verification-box error";
    verifyPickupResult.innerHTML = `<strong>Payment not verified</strong><div>Please verify payment first.</div>`;
    return;
  }

  order.status = "Collected";
  CanteenStore.saveOrders(orders);
  verifyPickupResult.className = "verification-box";
  verifyPickupResult.innerHTML = `
    <strong>${order.userName}</strong>
    <div>Pickup verified.</div>
  `;
  renderTop();
  renderOrderList();
}

function verifyPaymentByOrderId(orderId) {
  const orders = CanteenStore.getOrders();
  const cleaned = String(orderId || "").trim();
  const lowered = cleaned.toLowerCase();
  const digitsOnly = cleaned.replace(/\D/g, "");
  const order = orders.find((entry) => {
    const existing = String(entry.orderId || "").toLowerCase();
    if (!existing) return false;
    if (existing === lowered) return true;
    if (digitsOnly && existing.endsWith(digitsOnly)) return true;
    return false;
  });

  verifyPaymentResult.classList.remove("hidden");

  if (!order) {
    verifyPaymentResult.className = "verification-box error";
    verifyPaymentResult.innerHTML = `<strong>No order found</strong><div>Enter the full CFOS ID (like CFOS-1234) or just the last 4 digits.</div>`;
    return;
  }

  if (order.status === "Cancelled") {
    verifyPaymentResult.className = "verification-box error";
    verifyPaymentResult.innerHTML = `<strong>Order cancelled</strong><div>This order was cancelled and cannot be verified.</div>`;
    return;
  }

  if (order.paymentMethod !== "UPI") {
    verifyPaymentResult.className = "verification-box error";
    verifyPaymentResult.innerHTML = `<strong>Not required</strong><div>Cash orders are verified only during pickup using the PIN.</div>`;
    return;
  }

  if (order.paymentMethod === "UPI" && !order.paymentReported) {
    verifyPaymentResult.className = "verification-box error";
    verifyPaymentResult.innerHTML = `<strong>Payment not submitted</strong><div>Ask the user to tap “I have paid” first.</div>`;
    return;
  }

  if (order.paymentVerifiedByAdmin) {
    verifyPaymentResult.className = "verification-box error";
    verifyPaymentResult.innerHTML = `<strong>Already verified</strong><div>This order was already verified earlier.</div>`;
    return;
  }

  order.paymentVerifiedByAdmin = true;
  CanteenStore.saveOrders(orders);
  verifyPaymentResult.className = "verification-box";
  verifyPaymentResult.innerHTML = `
    <strong>${order.userName}</strong>
    <div>Payment verified. User can collect on time.</div>
  `;
  renderTop();
  renderOrderList();
}

function verifyPickup(event) {
  event.preventDefault();
  const pin = document.getElementById("verifyPickupInput").value.trim();
  verifyOrderByPin(pin);
}

function renderShell() {
  if (!adminState.currentUser || adminState.currentUser.role !== "admin") {
    showAuth();
    return;
  }

  showApp();
  document.getElementById("sidebarAvatar").textContent = "A";
  document.getElementById("sidebarName").textContent = adminState.currentUser.name;
  document.getElementById("welcomeHeading").textContent = "Hello, Admin";
  renderTop();
  renderMenuList();
  renderOrderList();
  switchView(adminState.currentView);
  startAutoRefresh();
}

function attachEvents() {
  adminLoginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);
  adminMenuForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addMenuItem();
  });

  const addCategoryBtn = document.getElementById("addCategoryBtn");
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener("click", () => {
      const input = document.getElementById("newCategoryName");
      const rawLabel = input ? input.value.trim() : "";
      if (!rawLabel) {
        setMenuFeedback("Enter a category name.", "error");
        return;
      }

      const value = slugifyCategoryLabel(rawLabel);
      if (!value) {
        setMenuFeedback("Enter a valid category name.", "error");
        return;
      }

      const categories = getCategories();
      const exists = categories.some(
        (entry) => entry && (entry.value === value || String(entry.label).toLowerCase() === rawLabel.toLowerCase())
      );
      if (exists) {
        setMenuFeedback("Category already exists.", "error");
        return;
      }

      const updated = [...categories, { value, label: rawLabel, enabled: true }];
      saveCategories(updated);
      renderCategoryDropdown(value);
      renderCategoryList();
      if (input) input.value = "";
      setMenuFeedback("Category added.", "success");
    });
  }
  if (verifyPaymentForm) {
    verifyPaymentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const orderId = document.getElementById("verifyPaymentInput").value.trim();
      verifyPaymentByOrderId(orderId);
    });
  }
  if (verifyPickupForm) {
    verifyPickupForm.addEventListener("submit", verifyPickup);
  }
  window.addEventListener("storage", syncFromStorage);

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  adminMenuList.addEventListener("click", (event) => {
    const action = event.target.dataset.action;
    const id = Number(event.target.dataset.id);
    if (!action || !id) return;
    if (action === "toggle") toggleMenuItem(id);
    if (action === "edit") editMenuItem(id);
    if (action === "archive") archiveMenuItem(id);
  });
}

function init() {
  CanteenStore.bootstrap();
  renderCategoryDropdown();
  renderCategoryList();
  attachEvents();

  if (adminState.currentUser && adminState.currentUser.role === "admin") {
    renderShell();
  } else {
    showAuth();
     setAuthFeedback("");
  }
}

init();
