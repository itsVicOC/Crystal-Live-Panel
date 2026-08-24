import dgram from "node:dgram";
import { OverlayServer } from "../dist-electron/main/overlay-server.js";
import { StateService } from "../dist-electron/main/state-service.js";
import { CRYSTAL_PATCHED_PROFILE as profile } from "../dist-electron/shared/profile.js";

const ram = Buffer.alloc(profile.ram.readLength);
const set = (address, ...values) => Buffer.from(values).copy(ram, address - profile.ram.readStart);
set(profile.ram.playerId, 0x30, 0x39);
set(profile.ram.playerName, 0x91, 0x84, 0x83, 0x50);
set(profile.ram.gameTimeHours, 0x00, 0x64);
set(profile.ram.gameTimeMinutes, 42);
set(profile.ram.gameTimeSeconds, 10);
set(profile.ram.money, 0x01, 0xe2, 0x40);
set(profile.ram.johtoBadges, 0b10101101);
set(profile.ram.mapGroup, 24);
set(profile.ram.mapNumber, 1);
set(profile.ram.yCoord, 10);
set(profile.ram.xCoord, 12);
set(profile.ram.partyCount, 6);
set(profile.ram.partySpecies, 152, 155, 158, 25, 133, 245);
[12, 14, 16, 22, 28, 40].forEach((level, index) => set(profile.ram.partyLevels[index], level));

const udp = dgram.createSocket("udp4");
udp.on("message", (message, remote) => {
  const command = message.toString("utf8");
  let response = "";
  if (command === "VERSION") response = "1.21.0";
  else if (command === "GET_STATUS") response = `GET_STATUS PLAYING Nintendo - Game Boy Color,Pokemon Crystal,crc32=${profile.crc32}`;
  else if (command.startsWith("READ_CORE_RAM")) {
    const [, rawAddress, rawLength] = command.split(/\s+/);
    const address = Number.parseInt(rawAddress, 16);
    const length = Number.parseInt(rawLength, 10);
    const bytes = ram.subarray(address - profile.ram.readStart, address - profile.ram.readStart + length);
    response = `READ_CORE_RAM ${rawAddress} ${[...bytes].map((byte) => byte.toString(16).toUpperCase().padStart(2, "0")).join(" ")}`;
  }
  udp.send(response, remote.port, remote.address);
});
await new Promise((resolve) => udp.bind(55355, "127.0.0.1", resolve));

const state = new StateService("/tmp/crystal-panel-visual");
const romPath = process.argv[2];
if (!romPath) throw new Error("Usage: node scripts/visual-fixture.mjs /path/to/game.gbc");
await state.configureRom(romPath);
state.start();
const server = new OverlayServer(new URL("../dist-renderer", import.meta.url).pathname, state);
await server.listen();
console.log("Visual fixture ready at http://127.0.0.1:17654/overlay");
