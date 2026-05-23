module.exports = ({ config }) => {
  const IS_DEV = process.env.APP_ENV === 'development';

  return {
    ...config,
    // Add (Dev) suffix to app name during development
    name: IS_DEV ? `${config.name} (Dev)` : config.name,
    
    // Set separate iOS bundle identifier for side-by-side installation
    ios: {
      ...config.ios,
      bundleIdentifier: IS_DEV ? 'com.cardgame.tractor.dev' : 'com.cardgame.tractor',
    },
    
    // Set separate Android package name for side-by-side installation
    android: {
      ...config.android,
      package: IS_DEV ? 'com.cardgame.tractor.dev' : 'com.cardgame.tractor',
    },
    
    // Dynamically align the EAS Update channel to 'development' for dev clients
    updates: {
      ...config.updates,
      requestHeaders: {
        ...config.updates?.requestHeaders,
        'expo-channel-name': IS_DEV 
          ? 'development' 
          : (config.updates?.requestHeaders?.['expo-channel-name'] || 'production'),
      },
    },
  };
};
