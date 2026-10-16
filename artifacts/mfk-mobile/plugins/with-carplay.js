const { createRequire } = require("module");
const fs = require("fs");
const path = require("path");

function loadConfigPlugins() {
  const roots = [path.join(__dirname, ".."), process.cwd()];
  for (const root of roots) {
    try {
      const req = createRequire(path.join(root, "package.json"));
      try {
        return req("expo/config-plugins");
      } catch {
        return req("@expo/config-plugins");
      }
    } catch {
      /* try next root */
    }
  }
  return null;
}

const SWIFT = `import CarPlay
import UIKit

@objc(CarPlaySceneDelegate)
final class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
  func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didConnect interfaceController: CPInterfaceController
  ) {
    let items = [
      CPListItem(text: "مفك MFK", detailText: "التشخيص الكامل من الآيفون عند الوقوف"),
      CPListItem(text: "CarPlay", detailText: "عرض الحالة فقط — بدون فحص أو مسح أكواد"),
    ]
    let list = CPListTemplate(title: "مفك", sections: [CPListSection(items: items)])
    interfaceController.setRootTemplate(list, animated: false, completion: nil)
  }
}
`;

function withCarPlay(config) {
  const plugins = loadConfigPlugins();
  if (!plugins) return config;

  const { IOSConfig, withEntitlementsPlist, withInfoPlist, withXcodeProject, withDangerousMod } = plugins;

  config = withInfoPlist(config, (config) => {
    const manifest = config.modResults.UIApplicationSceneManifest ?? {};
    manifest.UIApplicationSupportsMultipleScenes = true;
    const scenes = manifest.UISceneConfigurations ?? {};
    scenes.CPTemplateApplicationSceneSessionRoleApplication = [
      {
        UISceneClassName: "CPTemplateApplicationScene",
        UISceneConfigurationName: "CarPlay",
        UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate",
      },
    ];
    manifest.UISceneConfigurations = scenes;
    config.modResults.UIApplicationSceneManifest = manifest;
    return config;
  });

  config = withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.developer.carplay-driving-task"] = true;
    return config;
  });

  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const sourceRoot = IOSConfig.Paths.getSourceRoot(config.modRequest.projectRoot);
      fs.mkdirSync(sourceRoot, { recursive: true });
      fs.writeFileSync(path.join(sourceRoot, "CarPlaySceneDelegate.swift"), SWIFT);
      return config;
    },
  ]);

  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const sourceRoot = IOSConfig.Paths.getSourceRoot(config.modRequest.projectRoot);
    const appName = path.basename(sourceRoot);
    const file = `${appName}/CarPlaySceneDelegate.swift`;
    const target = project.getFirstTarget()?.uuid;
    if (target && !project.hasFile(file)) {
      project.addSourceFile(file, { target });
    }
    if (target) {
      project.addFramework("CarPlay.framework", { target, weak: true });
    }
    return config;
  });

  return config;
}

module.exports = withCarPlay;
