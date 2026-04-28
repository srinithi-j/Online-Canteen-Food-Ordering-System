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
const menuFeedback = document.getElementById("menuFeedback");
const verifyForm = document.getElementById("verifyForm");
const verifyResult = document.getElementById("verifyResult");
const orderList = document.getElementById("orderList");

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

function setMenuFeedback(message, type = "") {
  menuFeedback.textContent = message;
  menuFeedback.className = `feedback ${type}`.trim();
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
  const pendingOrders = CanteenStore.getOrders().filter(
    (order) => order.status !== "Collected" && order.status !== "Cancelled"
  );
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
              <div class="history-meta">${order.userRole} • ${order.orderId}</div>
            </div>
            <div class="history-total">PIN ${order.pin}</div>
          </div>
          <div class="history-meta">${order.items.map((item) => `${item.name} x${item.quantity}`).join(", ")}</div>
          <div class="history-meta">${order.pickupSlot} • ${order.paymentMethod}${
            order.paymentMethod === "UPI" ? ` • ${order.paymentStatus === "Paid" ? "Paid" : "Unpaid"}` : ""
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

  verifyResult.classList.remove("hidden");

  if (!order) {
    verifyResult.className = "verification-box error";
    verifyResult.innerHTML = `<strong>No order found</strong><div>Please check the PIN and try again.</div>`;
    return;
  }

  if (order.status === "Cancelled") {
    verifyResult.className = "verification-box error";
    verifyResult.innerHTML = `<strong>Order cancelled</strong><div>This order was cancelled and cannot be verified.</div>`;
    return;
  }

  if (order.paymentMethod === "UPI" && order.paymentStatus !== "Paid") {
    verifyResult.className = "verification-box error";
    verifyResult.innerHTML = `<strong>Payment not confirmed</strong><div>This UPI order is not marked as paid yet.</div>`;
    return;
  }

  if (order.status === "Collected") {
    verifyResult.className = "verification-box error";
    verifyResult.innerHTML = `<strong>Already verified</strong><div>This order was already verified earlier.</div>`;
    return;
  }

  order.status = "Collected";
  CanteenStore.saveOrders(orders);
  verifyResult.className = "verification-box";
  verifyResult.innerHTML = `
    <strong>${order.userName}</strong>
    <div>Order verified.</div>
  `;
  renderTop();
  renderOrderList();
}

function verifyPickup(event) {
  event.preventDefault();
  const pin = document.getElementById("verifyPinInput").value.trim();
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
}

function attachEvents() {
  adminLoginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);
  adminMenuForm.addEventListener("submit", handleMenuSubmit);
  verifyForm.addEventListener("submit", verifyPickup);
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
  attachEvents();

  if (adminState.currentUser && adminState.currentUser.role === "admin") {
    renderShell();
  } else {
    showAuth();
     setAuthFeedback("");
  }
}

init();