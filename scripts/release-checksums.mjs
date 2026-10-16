import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const { version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const directory = resolve(process.argv[2] ?? "release");
const files = ["exe", "zip"].map(extension => `Crystal-Live-Panel-${version}-x64.${extension}`);
const lines = [];
for (const name of files) {
  const path = resolve(directory, name);
  assert((await stat(path)).size > 0, `Empty release asset: ${name}`);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  lines.push(`${hash.digest("hex")}  ${name}`);
}
await writeFile(resolve(directory, "SHA256SUMS.txt"), lines.join("\n") + "\n", "utf8");
console.log(lines.join("\n"));
