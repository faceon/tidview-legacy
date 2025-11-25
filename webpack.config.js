const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

// (removed Lit suppressor — portfolio entry is now a React app)

module.exports = {
  mode: "production",
  devtool: "source-map",
  entry: {
    background: "./src/background/background.js",
    // React entry for the portfolio UI
    portfolio: "./src/portfolio/index.jsx",
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
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        type: "javascript/esm",
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-env", { targets: ">0.25%, not dead" }],
              ["@babel/preset-react", { runtime: "automatic" }],
            ],
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
    extensions: [".js", ".jsx"],
  },
};
