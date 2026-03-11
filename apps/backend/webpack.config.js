const { composePlugins, withNx } = require('@nx/webpack');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), (config) => {
  // Lambda bundling: mark optional NestJS modules as external
  // NestJS dynamically requires optional modules via optional-require.
  // We need to tell webpack these are external and shouldn't be bundled.
  config.externals = [
    // Keep existing externals and add NestJS optional modules
    ...(Array.isArray(config.externals)
      ? config.externals
      : config.externals
      ? [config.externals]
      : []),
    // Exclude NestJS optional modules
    '@nestjs/microservices',
    '@nestjs/websockets',
    'class-transformer',
  ];
  return config;
});
