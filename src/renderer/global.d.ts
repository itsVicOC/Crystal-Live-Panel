import type {
  ConnectionProbeResult,
  ConnectionSettings,
  OverlayState
} from "../shared/types";

declare global {
  interface Window {
    crystalPanel?: {
      selectRom(): Promise<OverlayState | null>;
      copyText(value: string): Promise<void>;
      openOverlay(): Promise<void>;
      getConnectionSettings(): Promise<ConnectionSettings>;
      testConnection(settings: ConnectionSettings): Promise<ConnectionProbeResult>;
    };
  }
}

export {};
