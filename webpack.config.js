const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const babelConfig = path.resolve(__dirname, "babel.config.js");

module.exports = {
  mode: "production",
  devtool: "source-map",
  entry: {
    background: "./src/background/background.js",
    portfolio: "./src/portfolio/portfolio.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "src/static",
          to: ".",
        },
        {
          from: "src/portfolio/portfolio.html",
          to: "portfolio.html",
        },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            cacheDirectory: true,
            configFile: babelConfig,
          },
        },
      },
      {
        test: /\.css$/i,
        type: "asset/source",
      },
    ],
  },
  resolve: {
    extensions: [".js"],
  },
};
