const { createRequire } = require("module");
const path = require("path");

function loadNotificationsPlugin() {
  const roots = [path.join(__dirname, ".."), process.cwd()];
  for (const root of roots) {
    try {
      const req = createRequire(path.join(root, "package.json"));
      return req("expo-notifications/app.plugin.js");
    } catch {
      /* try next root */
    }
  }
  return null;
}

module.exports = function withMfkNotifications(config) {
  const plugin = loadNotificationsPlugin();
  if (!plugin) return config;
  const impl = plugin.default || plugin;
  return impl(config, {
    color: "#FF6A00",
    defaultChannel: "mofk",
    enableBackgroundRemoteNotifications: true,
  });
};
