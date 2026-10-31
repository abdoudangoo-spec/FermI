// ═══════════════════════════════════════════════════════════
//  plugins/withLocalNetwork.js
//  Le contrôleur IoT se joint en HTTP sur le réseau local (pas de certificat possible).
//  - Android : autorise le trafic en clair (le code de l'app refuse HTTP hors réseau local).
//  - iOS : NSAllowsLocalNetworking (ajouté dans app.json) limite l'exception au réseau local.
// ═══════════════════════════════════════════════════════════
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withLocalNetwork(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) app.$['android:usesCleartextTraffic'] = 'true';
    return cfg;
  });
};
