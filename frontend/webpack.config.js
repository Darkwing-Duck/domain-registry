const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const DIST = path.resolve(__dirname, 'dist')

module.exports = {
  mode: "development",
  entry: path.resolve(__dirname, 'src/main.js'),
  devServer: {
    static: {
      directory: DIST
    },
    watchFiles: [path.resolve(__dirname, 'src')],
    compress: true,
    port: 8080,
  },
  output: {
    filename: 'bundle.js',
    path: DIST,
    clean: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/*'),
          to: path.resolve(DIST, "[name][ext]"),
          globOptions: {
            ignore: ['**/*.js'],
          }
        }
      ]
    }),
  ]
};
