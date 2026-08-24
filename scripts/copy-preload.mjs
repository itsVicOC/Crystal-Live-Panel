import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist-electron/main", { recursive: true });
await copyFile("src/main/preload.cjs", "dist-electron/main/preload.cjs");
