import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
        portfolio: path.resolve(rootDir, "index.html"),
        background: path.resolve(rootDir, "background/background.js"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
}));
