const { composePlugins, withNx } = require('@nx/webpack');
const webpack = require('webpack');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), (config) => {
  // Mark optional NestJS modules as external so webpack doesn't try to bundle them
  // NestJS handles missing optional modules gracefully
  config.externals = [
    ...(Array.isArray(config.externals)
      ? config.externals
      : config.externals
      ? [config.externals]
      : []),
    '@nestjs/microservices',
    '@nestjs/websockets',
    'class-transformer/storage',
  ];

  // Ignore these optional modules completely during bundling
  config.plugins = [
    ...(config.plugins || []),
    new webpack.IgnorePlugin({
      resourceRegExp:
        /^(@nestjs\/microservices|@nestjs\/websockets|class-transformer\/storage)/,
    }),
  ];

  return config;
});
