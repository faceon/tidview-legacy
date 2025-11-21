import { execa } from "execa";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "fs-extra";
import esbuild from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const chromeDir = path.join(rootDir, "chrome");
const distDir = path.join(chromeDir, "dist");
const nextOutDir = path.join(rootDir, "out");
const manifestTarget = process.env.MANIFEST_TARGET ?? "extension";

async function run() {
  console.log("▶︎ Building Next.js static output for extension...");
  await execa("next", ["build"], {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, TARGET: "extension" },
  });

  if (!(await fs.pathExists(nextOutDir))) {
    throw new Error(`Expected Next export at ${nextOutDir}`);
  }

  await fs.emptyDir(distDir);

  console.log("▶︎ Copying Next export to chrome/dist...");
  await fs.copy(nextOutDir, distDir);

  const nestedPortfolioHtml = path.join(distDir, "portfolio", "index.html");
  const flattenedPortfolioHtml = path.join(distDir, "portfolio.html");

  if (await fs.pathExists(flattenedPortfolioHtml)) {
    console.log("▶︎ portfolio.html already emitted by Next export");
  } else if (await fs.pathExists(nestedPortfolioHtml)) {
    await fs.copy(nestedPortfolioHtml, flattenedPortfolioHtml);
    await fs.remove(path.join(distDir, "portfolio"));
    console.log(
      "▶︎ Flattened portfolio/index.html to portfolio.html for Chrome action",
    );
  } else {
    throw new Error(
      "Could not find a generated portfolio page in the Next export. Did you add /portfolio to the app directory?",
    );
  }

  console.log("▶︎ Bundling background service worker...");
  await esbuild.build({
    entryPoints: [
      path.join(chromeDir, "src", "background", "service-worker.ts"),
    ],
    bundle: true,
    outfile: path.join(distDir, "background.js"),
    target: "es2022",
    platform: "browser",
    format: "esm",
    sourcemap: true,
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV ?? "production",
      ),
    },
  });

  const manifestSource = path.join(
    chromeDir,
    `manifest.${manifestTarget}.json`,
  );
  if (!(await fs.pathExists(manifestSource))) {
    throw new Error(`Manifest template ${manifestSource} does not exist.`);
  }
  await fs.copy(manifestSource, path.join(distDir, "manifest.json"));

  console.log(`▶︎ Copied manifest ${manifestTarget} to dist/manifest.json`);

  console.log("✅ Chrome extension assets ready in", distDir);
}

run().catch((error) => {
  console.error("Extension build failed", error);
  process.exitCode = 1;
});
