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

const SUCTION = {
  1: { label: 'Silent', tags: [TAG.Vacuum, TAG.Min, TAG.Quiet, TAG.LowNoise] },
  2: { label: 'Standard', tags: [TAG.Vacuum, TAG.Auto] },
  3: { label: 'Medium', tags: [TAG.Vacuum, TAG.DeepClean] },
  4: { label: 'Turbo', tags: [TAG.Vacuum, TAG.Max] },
} as const;

const WATER = { 1: 'Low', 2: 'Medium', 3: 'High' } as const;

const COMBINED = [
  { label: 'Silent', suction: 1, water: 1 },
  { label: 'Standard', suction: 2, water: 2 },
  { label: 'Maximum', suction: 3, water: 3 },
  { label: 'Turbo', suction: 4, water: 3 },
] as const;

// Keep mode IDs stable across releases: Matter persists the selected ID.
// Numeric MIoT levels use the names shown by Xiaomi Home for the E12.
export const VACUUM_CLEAN_MODES: readonly VacuumCleaningMode[] = [
  { mode: 0, label: 'Vacuum', settings: { mode: 0 }, modeTags: [TAG.Vacuum] },
  { mode: 1, label: 'Vacuum and mop', settings: { mode: 1 }, modeTags: [TAG.Vacuum, TAG.Mop] },
  { mode: 2, label: 'Mop', settings: { mode: 2 }, modeTags: [TAG.Mop] },
  ...([1, 2, 3, 4] as const).map(level => ({
    mode: 9 + level, label: `Vacuum: ${SUCTION[level].label}`,
    settings: { mode: 0, suction: level }, modeTags: SUCTION[level].tags,
  })),
  ...COMBINED.map((preset, index) => ({
    mode: 20 + index, label: `Vacuum and mop: ${preset.label}`,
    settings: { mode: 1, suction: preset.suction, water: preset.water },
    modeTags: [...SUCTION[preset.suction].tags, TAG.Mop],
  })),
  ...([1, 2, 3] as const).map(level => ({
    mode: 29 + level, label: `Mop: water ${WATER[level]}`,
    settings: { mode: 2, water: level },
    modeTags: [TAG.Mop, level === 1 ? TAG.Min : level === 2 ? TAG.Auto : TAG.Max],
  })),
];

export function findCleaningMode(mode: number): VacuumCleaningMode | undefined {
  return VACUUM_CLEAN_MODES.find(candidate => candidate.mode === mode);
}

/** Preserve a selected preset only while every setting it claims is true. */
export function cleaningModeForState(state: VacuumState, previous?: number): number {
  const settings = previous === undefined ? undefined : findCleaningMode(previous)?.settings;
  if (settings && settings.mode === state.mode
    && (settings.suction === undefined || settings.suction === state.suction)
    && (settings.water === undefined || settings.water === state.water)) return previous!;
  return state.mode;
}
