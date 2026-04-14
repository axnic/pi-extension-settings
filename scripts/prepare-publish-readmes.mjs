import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const mode = process.argv[2];

const REPO_BLOB = "https://github.com/axnic/pi-extension-settings/blob/main/";
const REPO_RAW =
  "https://raw.githubusercontent.com/axnic/pi-extension-settings/main/";

function replaceRelativeMarkdownLinks(content, prefix) {
  return content.replaceAll("](./", `](${prefix}`);
}

function replaceRelativeHtmlHref(content, prefix) {
  return content.replaceAll('href="./', `href="${prefix}`);
}

function replaceBannerAssets(content) {
  return content
    .replaceAll('srcset="docs/assets/', `srcset="${REPO_RAW}docs/assets/`)
    .replaceAll('src="docs/assets/', `src="${REPO_RAW}docs/assets/`);
}

if (mode === "prepare:extension") {
  const readmePath = join(process.cwd(), "README.md");
  const backupPath = join(process.cwd(), ".README.md.publish-backup");
  try {
    writeFileSync(backupPath, readFileSync(readmePath, "utf8"), { flag: "wx" });
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
  }
  let readme = readFileSync(readmePath, "utf8");
  readme = replaceRelativeHtmlHref(readme, REPO_BLOB);
  readme = replaceRelativeMarkdownLinks(readme, REPO_BLOB);
  readme = replaceBannerAssets(readme);
  writeFileSync(readmePath, readme, "utf8");
  process.exit(0);
}

if (mode === "prepare:sdk") {
  const sourcePath = join(process.cwd(), "docs", "README.md");
  const outputPath = join(process.cwd(), "README.md");
  const backupPath = join(process.cwd(), ".README.md.publish-backup");
  try {
    writeFileSync(backupPath, readFileSync(outputPath, "utf8"), { flag: "wx" });
  } catch (e) {
    if (e.code !== "EEXIST" && e.code !== "ENOENT") throw e;
  }
  let readme = readFileSync(sourcePath, "utf8");
  readme = replaceRelativeMarkdownLinks(readme, `${REPO_BLOB}sdk/docs/`);
  readme = replaceRelativeHtmlHref(readme, `${REPO_BLOB}sdk/docs/`);
  writeFileSync(outputPath, readme, "utf8");
  process.exit(0);
}

if (mode === "restore:extension") {
  const readmePath = join(process.cwd(), "README.md");
  const backupPath = join(process.cwd(), ".README.md.publish-backup");
  if (existsSync(backupPath)) {
    writeFileSync(readmePath, readFileSync(backupPath, "utf8"), "utf8");
    rmSync(backupPath);
  }
  process.exit(0);
}

if (mode === "restore:sdk") {
  const outputPath = join(process.cwd(), "README.md");
  const backupPath = join(process.cwd(), ".README.md.publish-backup");
  if (existsSync(backupPath)) {
    writeFileSync(outputPath, readFileSync(backupPath, "utf8"), "utf8");
    rmSync(backupPath);
  } else if (existsSync(outputPath)) {
    rmSync(outputPath);
  }
  process.exit(0);
}

throw new Error(
  "Usage: node scripts/prepare-publish-readmes.mjs <prepare:extension|prepare:sdk|restore:extension|restore:sdk>",
);
