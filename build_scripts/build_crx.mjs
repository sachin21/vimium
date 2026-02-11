import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import JSON5 from "json5";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(projectRoot, "dist", "vimium");

// Files and directories to exclude from the build.
const EXCLUDE_LIST = [
  "*.md",
  ".*",
  "CREDITS",
  "MIT-LICENSE.txt",
  "build_scripts",
  "dist",
  "make.js",
  "deno.json",
  "deno.lock",
  "reload.html",
  "reload.js",
  "test_harnesses",
  "tests",
  "node_modules",
  "package.json",
  "package-lock.json",
  "key.pem",
  "docs",
];

function parseManifest() {
  const text = fs.readFileSync(path.join(projectRoot, "manifest.json"), "utf-8");
  return JSON5.parse(text);
}

function build(manifest) {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const rsyncExcludes = EXCLUDE_LIST.flatMap((item) => ["--exclude", item]);
  execSync(["rsync", "-r", ".", outputDir, ...rsyncExcludes].map((a) => `'${a}'`).join(" "), {
    cwd: projectRoot,
  });

  // Write a clean JSON manifest (without JSON5 comments).
  fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

function main() {
  const manifest = parseManifest();
  const version = manifest.version;
  console.log(`Building Vimium v${version} for Chrome...`);

  build(manifest);

  console.log();
  console.log(`Build complete: ${outputDir}`);
  console.log();
  console.log("To install in Chrome:");
  console.log("  1. Open chrome://extensions");
  console.log('  2. Enable "Developer mode" (top right)');
  console.log('  3. Click "Load unpacked"');
  console.log(`  4. Select: ${outputDir}`);
}

main();
