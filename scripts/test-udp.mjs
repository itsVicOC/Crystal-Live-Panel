import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const vitest = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
const result = spawnSync(process.execPath, [vitest, "run", "src/main/retroarch-client.test.ts"], {
  stdio: "inherit",
  env: { ...process.env, ALLOW_UDP_TEST: "1" }
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
