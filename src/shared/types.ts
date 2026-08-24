export type ConnectionStatus = "online" | "paused" | "offline" | "waiting";

export interface Diagnostic {
  code: string;
  level: "ok" | "warning" | "error";
  message: string;
}

export interface ConnectionState {
  status: ConnectionStatus;
  updatedAt: string | null;
  retroArchVersion: string | null;
  game: string | null;
  crc32: string | null;
  diagnosticCode: string | null;
}

export interface ConnectionSettings {
  host: string;
  port: number;
}

export interface ConnectionProbeResult {
  ok: boolean;
  settings: ConnectionSettings;
  version: string | null;
  statusRaw: string | null;
  diagnostics: Diagnostic[];
}

export interface TrainerState {
  name: string;
  id: number;
  money: number;
  gameTimeHours: number;
  gameTimeMinutes: number;
  badges: number;
  badgeCount: number;
}

export interface PartyMember {
  slot: number;
  species: number;
  level: number;
  spriteKey: string;
}

export type Region = "JOHTO" | "KANTO" | "UNKNOWN";

export interface LocationState {
  region: Region;
  mapGroup: number;
  mapNumber: number;
  x: number;
  y: number;
  landmark: string;
  displayLabel: string;
  markerX: number | null;
  markerY: number | null;
}

export interface OverlayState {
  connection: ConnectionState;
  trainer: TrainerState | null;
  party: PartyMember[];
  location: LocationState;
  diagnostics: Diagnostic[];
  rom: {
    configured: boolean;
    supported: boolean;
    title: string | null;
    crc32: string | null;
    sha256: string | null;
    spritesReady: boolean;
  };
}

export interface RomProfile {
  id: string;
  title: string;
  crc32: string;
  sha256: string;
  expectedCore: string;
  ram: {
    readStart: number;
    readLength: number;
    readRanges: Array<{ address: number; length: number }>;
    playerId: number;
    playerName: number;
    playerNameLength: number;
    gameTimeHours: number;
    gameTimeMinutes: number;
    gameTimeSeconds: number;
    money: number;
    johtoBadges: number;
    mapGroup: number;
    mapNumber: number;
    yCoord: number;
    xCoord: number;
    partyCount: number;
    partySpecies: number;
    partyLevels: number[];
  };
  sprites: {
    pointerTableOffset: number;
    unownPointerTableOffset: number;
    paletteTableOffset: number;
    baseDataOffset: number;
    baseDataEntrySize: number;
    dimensionOffset: number;
    bankFix: number;
    speciesCount: number;
  };
}
