const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-gesture-handler's package.json "exports" map doesn't resolve
// cleanly through Metro's package-exports resolution in this SDK/library
// version combo ("Unable to resolve './components/touchables'") — falling
// back to Metro's classic main-field resolution avoids it.
config.resolver.unstable_enablePackageExports = false;

// expo-camera's web-only barcode-scanning code path pulls in
// `barcode-detector`, whose dual ESM/CJS package layout Metro fails to
// resolve here even with package-exports resolution off (both dist/es and
// dist/cjs builds exist on disk — this is a Metro/dependency quirk, not
// something in this app's code). This app never uses barcode scanning, so
// on web only, redirect it to Metro's built-in empty module rather than let
// bundling fail outright. Doesn't affect Android/iOS, which don't hit this
// code path at all.
const { resolveRequest } = config.resolver;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'barcode-detector') {
    return { type: 'empty' };
  }
  return resolveRequest
    ? resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
