import dgram from "node:dgram";
import { afterEach, describe, expect, it } from "vitest";
import { parseStatus, RetroArchClient } from "./retroarch-client.js";

const servers: dgram.Socket[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve()))
    )
  );
});

async function fakeRetroArch(handler: (command: string) => string): Promise<number> {
  const server = dgram.createSocket("udp4");
  servers.push(server);
  server.on("message", (message, remote) => {
    const response = handler(message.toString());
    server.send(Buffer.from(response), remote.port, remote.address);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.bind(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (typeof address === "string") throw new Error("Expected an IPv4 UDP address");
  return address.port;
}

describe("RetroArchClient", () => {
  it.runIf(process.env.ALLOW_UDP_TEST === "1")("serializes and reads RAM bytes", async () => {
    const port = await fakeRetroArch((command) =>
      command.startsWith("READ_CORE_RAM") ? "READ_CORE_RAM 1000 01 AB FF" : ""
    );
    const client = new RetroArchClient({ port, timeoutMs: 300 });
    await expect(client.readCoreRam(0x1000, 3)).resolves.toEqual(Buffer.from([1, 0xab, 0xff]));
  });

  it("blocks write commands", async () => {
    const client = new RetroArchClient();
    await expect(client.command("WRITE_CORE_RAM 1000 FF")).rejects.toThrow("Blocked non-read-only command");
  });
});

describe("parseStatus", () => {
  it("parses a playing status", () => {
    expect(parseStatus("GET_STATUS PLAYING Nintendo - Game Boy Color,game,crc32=9ab996c9")).toMatchObject({
      mode: "PLAYING",
      game: "game",
      crc32: "9AB996C9"
    });
  });
  it("parses contentless", () => expect(parseStatus("GET_STATUS CONTENTLESS").mode).toBe("CONTENTLESS"));

  it("accepts whitespace, extra fields and a spaced crc field", () => {
    expect(
      parseStatus(
        "GET_STATUS   PAUSED   Nintendo - Game Boy Color, Pokemon Crystal, slot=1, crc32 = 9ab996c9, extra=value"
      )
    ).toEqual({
      mode: "PAUSED",
      systemId: "Nintendo - Game Boy Color",
      game: "Pokemon Crystal",
      crc32: "9AB996C9"
    });
  });

  it("accepts a valid status without a crc field", () => {
    expect(parseStatus("GET_STATUS PLAYING Game Boy Color, Pokemon Crystal")).toMatchObject({
      mode: "PLAYING",
      crc32: null
    });
  });

  it("reports the raw unexpected response", () => {
    expect(() => parseStatus("GET_STATUS RUNNING odd response")).toThrow("RUNNING odd response");
  });
});
