const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

// (removed Lit suppressor — portfolio entry is now a React app)

module.exports = (_env, argv) => {
  const isProd = argv?.mode === "production";

  return {
    mode: isProd ? "production" : "development",
    devtool: "source-map",
    entry: {
      background: "./src/background/background.js",
      // React entry for the portfolio UI
      portfolio: "./src/portfolio/index.jsx",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      chunkFilename: isProd ? "[name].[contenthash].js" : "[name].js",
      publicPath: "",
      clean: true,
    },
    plugins: [
      ...(isProd
        ? [
            new MiniCssExtractPlugin({
              filename: "[name].css",
            }),
          ]
        : []),
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
          use: [
            isProd ? MiniCssExtractPlugin.loader : "style-loader",
            { loader: "css-loader", options: { esModule: false } },
          ],
        },
      ],
    },
    resolve: {
      extensions: [".js", ".jsx"],
    },
  };
};
