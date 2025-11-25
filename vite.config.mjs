import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const rootDir = path.resolve(__dirname, "src");

export default defineConfig(({ mode }) => ({
  root: rootDir,
  plugins: [react()],
  publicDir: path.resolve(rootDir, "static"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    target: "chrome121",
    rollupOptions: {
      input: {
        portfolio: path.resolve(rootDir, "portfolio.html"),
        background: path.resolve(rootDir, "background/background.js"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "background") {
            return "background.js";
          }
          if (chunk.name === "portfolio") {
            return "portfolio.js";
          }
          return "assets/[name].js";
        },
        chunkFileNames: "chunks/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
}));
