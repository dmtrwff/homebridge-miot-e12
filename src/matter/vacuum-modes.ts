import type { VacuumState } from '../devices/vacuum-profile.js';

interface CleaningSettings { readonly mode: number; readonly suction?: number; readonly water?: number }
export interface VacuumCleaningMode {
  readonly mode: number;
  readonly label: string;
  readonly settings: CleaningSettings;
  readonly modeTags: readonly number[];
}

// Standard Matter RVC Clean Mode tags. Strength tags let Apple Home present
// suction presets as distinct choices instead of collapsing identical Vacuum
// modes. Homebridge 2.4 does not expose this enum through api.matter.types.
const TAG = {
  Auto: 0,
  Quiet: 2,
  LowNoise: 3,
  Min: 6,
  Max: 7,
  DeepClean: 0x4000,
  Vacuum: 0x4001,
  Mop: 0x4002,
} as const;

// Keep mode IDs stable across releases: Matter persists the selected ID.
// Numeric MIoT levels use the names shown by Xiaomi Home for the E12.
export const VACUUM_CLEAN_MODES: readonly VacuumCleaningMode[] = [
  { mode: 20, label: 'Silent', settings: { mode: 1, suction: 1, water: 1 }, modeTags: [TAG.Vacuum, TAG.Mop, TAG.Min, TAG.Quiet, TAG.LowNoise] },
  { mode: 21, label: 'Standard', settings: { mode: 1, suction: 2, water: 2 }, modeTags: [TAG.Vacuum, TAG.Mop, TAG.Auto] },
  { mode: 22, label: 'Maximum', settings: { mode: 1, suction: 3, water: 3 }, modeTags: [TAG.Vacuum, TAG.Mop, TAG.DeepClean] },
  { mode: 23, label: 'Turbo', settings: { mode: 1, suction: 4, water: 3 }, modeTags: [TAG.Vacuum, TAG.Mop, TAG.Max] },
];

export const DEFAULT_CLEAN_MODE = 21;

export function findCleaningMode(mode: number): VacuumCleaningMode | undefined {
  return VACUUM_CLEAN_MODES.find(candidate => candidate.mode === mode);
}

/** Publish only supported Matter IDs, including after an external device change. */
export function cleaningModeForState(state: VacuumState, previous?: number): number {
  const settings = previous === undefined ? undefined : findCleaningMode(previous)?.settings;
  if (settings && settings.mode === state.mode
    && (settings.suction === undefined || settings.suction === state.suction)
    && (settings.water === undefined || settings.water === state.water)) return previous!;
  return VACUUM_CLEAN_MODES.find(candidate => candidate.settings.mode === state.mode
    && candidate.settings.suction === state.suction
    && candidate.settings.water === state.water)?.mode ?? DEFAULT_CLEAN_MODE;
}
