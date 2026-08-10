const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-gesture-handler's package.json "exports" map doesn't resolve
// cleanly through Metro's package-exports resolution in this SDK/library
// version combo ("Unable to resolve './components/touchables'") — falling
// back to Metro's classic main-field resolution avoids it.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
