const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  publicPath: '/30DayMapChallenge-15_Fire/',
  transpileDependencies: true,
  devServer: {
    port: 8080,
    host: 'localhost',
  },
});
