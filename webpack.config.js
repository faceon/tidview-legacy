const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "production",
  devtool: "source-map",
  entry: {
    background: "./src/background/background.js",
    popup: "./src/popup/popup.js",
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
          from: "src/popup/popup.html",
          to: "popup.html",
        },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        type: "javascript/esm",
      },
    ],
  },
  resolve: {
    extensions: [".js"],
  },
};
