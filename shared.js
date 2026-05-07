const CanteenStore = (() => {
  const keys = {
    users: "canteen-users-v4",
    currentUserUser: "canteen-current-user-v4",
    currentUserAdmin: "canteen-current-admin-v4",
    orders: "canteen-orders-v4",
    menu: "canteen-menu-v4",
    settings: "canteen-settings-v1"
  };

  const defaultUsers = [
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
      name: "ADMIN_07",
      identifier: "ADMIN_07",
      department: "Canteen Office",
      password: "admin07",
      role: "admin"
    }
  ];
  const defaultMenu = [];
  const defaultSettings = {
    upiVpa: "",
    upiPayeeName: "",
    upiAid: "",
    categories: [
      { value: "main_course", label: "Main Course", enabled: true },
      { value: "curries", label: "Curries", enabled: true },
      { value: "bakes_snacks", label: "Bakes & Snacks", enabled: true },
      { value: "egg_items", label: "Egg Items", enabled: true },
      { value: "todays_special", label: "Today's Special", enabled: true },
      { value: "hot_drinks", label: "Hot Drinks", enabled: true },
      { value: "juices_milkshakes", label: "Juices & Milkshakes", enabled: true },
      { value: "ice_creams", label: "Ice Creams", enabled: true },
      { value: "chat", label: "Chat", enabled: true }
    ]
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function bootstrap() {
    const users = read(keys.users, null);
    if (!Array.isArray(users) || users.length === 0) {
      write(keys.users, defaultUsers);
    }

    const menu = read(keys.menu, null);
    if (!Array.isArray(menu)) {
      write(keys.menu, defaultMenu);
    }

    const orders = read(keys.orders, null);
    if (!Array.isArray(orders)) {
      write(keys.orders, []);
    }

    const settings = read(keys.settings, null);
    if (!settings || typeof settings !== "object") {
      write(keys.settings, defaultSettings);
    } else if (!Array.isArray(settings.categories) || settings.categories.length === 0) {
      write(keys.settings, {
        ...defaultSettings,
        ...settings,
        categories: defaultSettings.categories
      });
    } else {
      const migratedCategories = settings.categories
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          ...entry,
          enabled: entry.enabled !== false
        }));
      write(keys.settings, {
        ...defaultSettings,
        ...settings,
        categories: migratedCategories
      });
    }

    const adminSession = read(keys.currentUserAdmin, null);
    const userSession = read(keys.currentUserUser, null);
    if (!adminSession && userSession && typeof userSession === "object" && userSession.role === "admin") {
      write(keys.currentUserAdmin, userSession);
      localStorage.removeItem(keys.currentUserUser);
    }
  }

  function getUsers() {
    return read(keys.users, defaultUsers);
  }

  function saveUsers(users) {
    write(keys.users, Array.isArray(users) ? users : []);
  }

  function getMenu() {
    return read(keys.menu, defaultMenu);
  }

  function saveMenu(menu) {
    write(keys.menu, Array.isArray(menu) ? menu : []);
  }

  function getOrders() {
    return read(keys.orders, []);
  }

  function saveOrders(orders) {
    write(keys.orders, orders);
  }

  function getSettings() {
    const settings = read(keys.settings, defaultSettings);
    if (!settings || typeof settings !== "object") return { ...defaultSettings };
    return {
      ...defaultSettings,
      ...settings
    };
  }

  function saveSettings(settings) {
    write(keys.settings, {
      ...defaultSettings,
      ...(settings && typeof settings === "object" ? settings : {})
    });
  }

  function getCurrentUser(portal = "user") {
    const key = portal === "admin" ? keys.currentUserAdmin : keys.currentUserUser;
    return read(key, null);
  }

  function setCurrentUser(user, portal = "user") {
    const key = portal === "admin" ? keys.currentUserAdmin : keys.currentUserUser;
    write(key, user);
  }

  function clearCurrentUser(portal = "user") {
    const key = portal === "admin" ? keys.currentUserAdmin : keys.currentUserUser;
    localStorage.removeItem(key);
  }

  return {
    bootstrap,
    getUsers,
    saveUsers,
    getMenu,
    saveMenu,
    getOrders,
    saveOrders,
    getSettings,
    saveSettings,
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser
  };
})();
