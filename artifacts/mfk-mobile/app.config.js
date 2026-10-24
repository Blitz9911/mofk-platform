const base = require("./app.json");

const isUat = process.env.EXPO_PUBLIC_MFK_ENV === "uat";
const skipLocalPluginResolution = process.env.MFK_SKIP_LOCAL_CONFIG_PLUGINS === "1";
const expo = base.expo;
const plugins = isUat
  ? expo.plugins.filter((plugin) => {
      const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
      return pluginName !== "./plugins/with-carplay.js";
    })
  : expo.plugins;

module.exports = {
  ...expo,
  updates: isUat ? { ...expo.updates, enabled: false } : expo.updates,
  name: isUat ? "مفك UAT" : expo.name,
  scheme: isUat ? "mfk-mobile-uat" : expo.scheme,
  plugins: skipLocalPluginResolution ? [] : plugins,
  ios: {
    ...expo.ios,
    bundleIdentifier: isUat ? "com.mfk.diagnostics.uat" : expo.ios.bundleIdentifier,
    // CarPlay belongs to the published app. The isolated UAT app only requests
    // capabilities required by its own config plugins, including notifications.
    entitlements: isUat ? { "aps-environment": "production" } : expo.ios.entitlements,
  },
  android: {
    ...expo.android,
    package: isUat ? "com.mfk.diagnostics.uat" : expo.android.package,
  },
  extra: {
    ...expo.extra,
    mfkEnvironment: isUat ? "uat" : "production",
  },
};
