import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { listPackage, extractFile } = require("@electron/asar");
const archive = resolve(process.argv[2] ?? "release/win-unpacked/resources/app.asar");
const expected = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const entries = listPackage(archive).map(path => path.replaceAll("\\", "/").replace(/^\//, ""));
const required = [
  "package.json", "LICENSE", "NOTICE.md",
  "dist-electron/main/main.js", "dist-electron/main/preload.cjs",
  "dist-renderer/index.html", "dist-renderer/overlay.html",
  "dist-renderer/overlay-background.png",
  "dist-renderer/badges/johto.svg", "dist-renderer/badges/kanto.svg"
];
for (const path of required) assert(entries.includes(path), `Missing runtime file: ${path}`);
for (const path of entries) {
  assert(!/\.(?:gb|gbc|sav|srm|rtc|state\d*)$/i.test(path), `Game or save file in package: ${path}`);
  assert(!/^(?:src|scripts|docs|assets|sprites)(?:\/|$)/.test(path), `Development file or cache in package: ${path}`);
  assert(!/^dist-(?:electron|renderer)\/.*\.(?:test|spec)\./.test(path), `Test in package: ${path}`);
  assert(path !== "config.json", "User configuration in package");
  if (!/^(?:dist-electron|dist-renderer)\/.*\.(?:js|cjs|json|map|html|css)$/.test(path)) continue;
  const content = extractFile(archive, path).toString("utf8");
  assert(!/\/Users\/|[A-Z]:\\(?:Users|Games)\\|CRYSTAL_TEST_ROM|visual-fixture/.test(content), `Private path or test fixture in package: ${path}`);
}
const packaged = JSON.parse(extractFile(archive, "package.json").toString("utf8"));
assert.equal(packaged.version, expected.version, "Packaged version differs from package.json");
if (process.env.GITHUB_REF_TYPE === "tag") {
  assert.equal(process.env.GITHUB_REF_NAME, `v${packaged.version}`, "Tag and application version differ");
}
console.log(`Package audit passed: v${packaged.version}, ${entries.length} entries; required runtime files present; no game files, saves, extracted sprites, private paths, or first-party test fixtures.`);
