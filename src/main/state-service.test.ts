import { describe, expect, it } from "vitest";
import { StateService } from "./state-service.js";
import { RetroArchRamError, RetroArchTimeoutError } from "./retroarch-client.js";

describe("StateService connection probe", () => {
  it("separately verifies status and core RAM support", async () => {
    const service = new StateService("/tmp/crystal-panel-test", {
      command: async (command) =>
        command === "VERSION"
          ? "VERSION 1.21.0"
          : "GET_STATUS PLAYING Nintendo - Game Boy Color,Pokemon Crystal,crc32=9ab996c9",
      readCoreRam: async () => Buffer.from([0])
    });

    const result = await service.probeConnection();
    expect(result.ok).toBe(true);
    expect(result.statusRaw).toContain("crc32=9ab996c9");
    expect(result.diagnostics.map((item) => item.code)).toEqual([
      "UDP_VERSION_OK",
      "GET_STATUS_OK",
      "READ_CORE_RAM_OK"
    ]);
  });

  it("distinguishes an unsupported RAM command from an offline emulator", async () => {
    const service = new StateService("/tmp/crystal-panel-test", {
      command: async (command) =>
        command === "VERSION"
          ? "VERSION 1.21.0"
          : "GET_STATUS PLAYING Nintendo - Game Boy Color,Pokemon Crystal,crc32=9ab996c9",
      readCoreRam: async () => {
        throw new RetroArchRamError("不支持 READ_CORE_RAM", "READ_CORE_RAM 0 -1");
      }
    });

    const result = await service.probeConnection();
    expect(result.ok).toBe(false);
    expect(result.diagnostics.at(-1)?.code).toBe("READ_CORE_RAM_UNSUPPORTED");
  });

  it("reports a UDP status timeout with the selected endpoint", async () => {
    const service = new StateService(
      "/tmp/crystal-panel-test",
      {
        command: async (command) => {
          throw new RetroArchTimeoutError(command);
        },
        readCoreRam: async () => Buffer.alloc(0)
      },
      { host: "127.0.0.1", port: 55444 }
    );

    const result = await service.probeConnection();
    expect(result.ok).toBe(false);
    expect(result.diagnostics.at(-1)).toMatchObject({ code: "UDP_NO_RESPONSE", level: "error" });
    expect(result.diagnostics.at(-1)?.message).toContain("127.0.0.1:55444");
  });
});
