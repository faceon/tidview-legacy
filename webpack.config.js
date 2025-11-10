const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

const litSuppressor = path.resolve(
  __dirname,
  "src/common/lit-dev-warn-suppressor.js",
);

module.exports = {
  mode: "production",
  devtool: "source-map",
  entry: {
    background: "./src/background/background.js",
    popup: [litSuppressor, "./src/popup/popup.js"],
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
        {
          from: "src/popup/popup.css",
          to: "popup.css",
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
