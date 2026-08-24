import type { OverlayState } from "./types.js";

export function createDefaultState(): OverlayState {
  return {
    connection: {
      status: "waiting",
      updatedAt: null,
      retroArchVersion: null,
      game: null,
      crc32: null,
      diagnosticCode: "WAITING_FOR_RETROARCH"
    },
    trainer: null,
    party: [],
    location: {
      region: "UNKNOWN",
      mapGroup: 0,
      mapNumber: 0,
      x: 0,
      y: 0,
      landmark: "UNKNOWN",
      displayLabel: "UNKNOWN",
      markerX: null,
      markerY: null
    },
    diagnostics: [],
    rom: {
      configured: false,
      supported: false,
      title: null,
      crc32: null,
      sha256: null,
      spritesReady: false
    }
  };
}
