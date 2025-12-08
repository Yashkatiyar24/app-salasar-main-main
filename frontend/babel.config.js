module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Expo Router babel plugin
      require.resolve('expo-router/babel'),

      // 👇 MUST be last plugin
      'react-native-reanimated/plugin',
    ],
  };
};
