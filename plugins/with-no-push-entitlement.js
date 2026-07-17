const { withEntitlementsPlist } = require('expo/config-plugins');

// Las cuentas personales gratuitas de Apple no admiten la capacidad de
// notificaciones push remotas (aps-environment), y expo-notifications la añade
// al proyecto en cada prebuild. Solo usamos notificaciones LOCALES (el
// recordatorio semanal), que no la necesitan, así que la retiramos.
//
// ⚠️ Al pasar a la cuenta de pago de Apple (App Store), elimina este plugin
// de app.json si algún día quieres push remotas de verdad.
module.exports = function withNoPushEntitlement(config) {
  return withEntitlementsPlist(config, (pluginConfig) => {
    delete pluginConfig.modResults['aps-environment'];
    return pluginConfig;
  });
};
