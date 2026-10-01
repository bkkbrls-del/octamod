import type { FirmwareInspection } from './base'
export type BuildReport = {
  version: string; revision: string; sourceCommit: string | null; sourceTreeSha256: string; moduleIds: string[]; moduleVersions: Record<string,string>; keepStockFx2: boolean
  osBytes: number; runtimeBytes: number; fx1Rows: number; fx2Rows: number
}
export type BuildProgress = 'composing' | 'packing' | 'verifying'
export type EngineRequest =
  | { id: number; type: 'inspect'; buffer: ArrayBuffer; name: string }
  | { id: number; type: 'validate' | 'build'; moduleIds: string[]; keepStockFx2: boolean }
  | { id: number; type: 'clear' }
export type EngineResponse =
  | { id: number; type: 'inspection'; inspection: FirmwareInspection }
  | { id: number; type: 'validated'; report: BuildReport }
  | { id: number; type: 'progress'; phase: BuildProgress }
  | { id: number; type: 'built'; buffer: ArrayBuffer; report: BuildReport; sha256: string }
  | { id: number; type: 'cleared' }
  | { id: number; type: 'error'; message: string }
// Native byte-parity and rejection checks also passed through this worker
// in the actual browser. See docs/VERIFICATION.md for the supported profiles.
export const ENGINE_AVAILABLE = true
export const DOWNLOADS_ENABLED = true
export const FIRMWARE_VERSION = 'OCTAMOD79'
