import type { MiotProperty } from './profiles.js';

export const SUPPORTED_VACUUM_MODELS: readonly string[] = ['xiaomi.vacuum.b112', 'xiaomi.vacuum.b112gl'];

export interface VacuumState {
  readonly status: number;
  readonly fault: number;
  /** 0: vacuum, 1: vacuum and mop, 2: mop. */
  readonly mode: number;
  readonly battery: number;
  readonly suction: number;
  readonly water: number;
  readonly filterLife: number;
  readonly mainBrushLife: number;
  readonly sideBrushLife: number;
  readonly mopLife: number;
  readonly sampledAt: number;
}

export type VacuumProperty = Exclude<keyof VacuumState, 'sampledAt'>;
export type WritableVacuumProperty = 'mode' | 'suction' | 'water';
/** Semantic Matter RVC errors, kept protocol-independent in device profiles. */
export type VacuumFaultKind =
  | 'failedToFindChargingDock'
  | 'stuck'
  | 'dustBinMissing'
  | 'dustBinFull'
  | 'waterTankEmpty'
  | 'waterTankMissing'
  | 'waterTankLidOpen'
  | 'mopCleaningPadMissing'
  | 'lowBattery'
  | 'cannotReachTargetArea'
  | 'dirtyWaterTankFull'
  | 'dirtyWaterTankMissing'
  | 'wheelsJammed'
  | 'brushJammed'
  | 'navigationSensorObscured';
export interface VacuumFaultDefinition {
  readonly description: string;
  readonly kind?: VacuumFaultKind;
  /** Cleaning task modes made unavailable by this particular fault. */
  readonly blockedModes?: readonly number[];
}
export interface MiotAction { readonly siid: number; readonly aiid: number }
export interface VacuumProfile {
  readonly productName: string;
  readonly source: string;
  readonly properties: Readonly<Record<VacuumProperty, MiotProperty>>;
  readonly actions: Readonly<Record<'start' | 'stop' | 'dock', MiotAction>>;
  /** Firmware states that confirm the stop-sweeping action used by Matter Pause. */
  readonly pauseStatuses: readonly number[];
  readonly identify: MiotProperty;
  readonly statuses: Readonly<Record<number, string>>;
  /** Device fault metadata kept together to prevent mappings drifting apart. */
  readonly faults: Readonly<Record<number, VacuumFaultDefinition>>;
  /** Values carried in the fault field that do not indicate a device failure. */
  readonly nonErrorFaultCodes: readonly number[];
}

// Verified against Xiaomi's MIoT instance API on 2026-09-17.
const E10_PROFILE: VacuumProfile = {
  productName: 'Xiaomi Robot Vacuum E10',
  source: 'https://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:vacuum:0000A006:xiaomi-b112:1',
  properties: {
    status: { siid: 2, piid: 1, format: 'integer', min: 0, max: 8 },
    // The specification supplies a range, not an error-code dictionary.
    fault: { siid: 2, piid: 2, format: 'integer', min: 0, max: 3000 },
    mode: { siid: 2, piid: 4, format: 'integer', min: 0, max: 2, writable: true },
    battery: { siid: 3, piid: 1, format: 'integer', min: 0, max: 100 },
    suction: { siid: 7, piid: 5, format: 'integer', min: 0, max: 4, writable: true },
    water: { siid: 7, piid: 6, format: 'integer', min: 0, max: 3, writable: true },
    filterLife: { siid: 7, piid: 12, format: 'integer', min: 0, max: 100 },
    mainBrushLife: { siid: 7, piid: 10, format: 'integer', min: 0, max: 100 },
    sideBrushLife: { siid: 7, piid: 8, format: 'integer', min: 0, max: 100 },
    mopLife: { siid: 7, piid: 14, format: 'integer', min: 0, max: 100 },
  },
  actions: {
    start: { siid: 2, aiid: 1 },
    stop: { siid: 2, aiid: 2 },
    dock: { siid: 3, aiid: 1 },
  },
  pauseStatuses: [2],
  identify: { siid: 4, piid: 1, format: 'integer', min: 1, max: 1, writable: true },
  // E10 field report (2026-09-17): 2105 at 100% battery, no Xiaomi Home fault.
  // Consistent with python-miio's Viomi "Fully charged" indication:
  // https://github.com/rytilahti/python-miio/issues/789
  // This is an observed E10 exception, not an official error-code dictionary.
  // Do not assume that every code >= 2000 is harmless on this model.
  nonErrorFaultCodes: [0, 2105],
  statuses: {
    0: 'Sleeping', 1: 'Idle', 2: 'Paused', 3: 'Returning to dock',
    4: 'Charging', 5: 'Vacuuming', 6: 'Vacuuming and mopping', 7: 'Mopping', 8: 'Updating firmware',
  },
  faults: {},
};

// Verified independently against Xiaomi's published E12 MIoT instance on
// 2026-10-16. Its addresses and ranges currently match the E10, but keep a
// separate profile so model-specific firmware behavior can diverge safely.
const E12_PROFILE: VacuumProfile = {
  ...E10_PROFILE,
  productName: 'Xiaomi Robot Vacuum E12',
  source: 'https://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:vacuum:0000A006:xiaomi-b112gl:1',
  // E12 field report (2026-10-16): 2103 while status 4 reported normal
  // charging at 22% battery. The shared B112-family table identifies 2104
  // as fully charged; both are device indications rather than failures.
  nonErrorFaultCodes: [0, 2103, 2104],
  // E12 field report (2026-10-16): stop-sweeping invoked by Matter Pause
  // settled at status 1 (Idle). Accept the spec-declared Paused state too,
  // while publishing whichever operational state the firmware actually reads.
  pauseStatuses: [1, 2],
  // 522 and 2103 are physically verified on this E12. The remaining codes
  // come from the shared B112-family miIO table and intentionally remain
  // model-local until field observations confirm them on this firmware.
  faults: {
    500: { description: 'Navigation sensor timed out. Clean it and restart the robot.', kind: 'navigationSensorObscured' },
    501: { description: 'Drive wheels are jammed. Remove any trapped objects.', kind: 'wheelsJammed' },
    502: { description: 'Battery is too low to continue cleaning.', kind: 'lowBattery' },
    503: { description: 'Dust bin is not installed.', kind: 'dustBinMissing' },
    508: { description: 'Robot is on an uneven surface. Move it to level ground.', kind: 'stuck' },
    509: { description: 'Cliff sensor error. Clean the sensors and move the robot.', kind: 'navigationSensorObscured' },
    510: { description: 'Collision sensor is stuck. Check and clean the bumper.', kind: 'navigationSensorObscured' },
    511: { description: 'Robot could not return to the charging dock.', kind: 'failedToFindChargingDock' },
    512: { description: 'Robot could not return to the charging dock.', kind: 'failedToFindChargingDock' },
    513: { description: 'Robot could not navigate to the requested area.', kind: 'cannotReachTargetArea' },
    514: { description: 'Robot is stuck. Clear obstacles and move it.', kind: 'stuck' },
    515: { description: 'Charging error. Check the dock and charging contacts.' },
    516: { description: 'Mop temperature error. Let the robot cool down.' },
    521: { description: 'Water tank is not installed.', kind: 'waterTankMissing', blockedModes: [1, 2] },
    522: { description: 'Mop pad is not installed. Attach it or select Vacuum.', kind: 'mopCleaningPadMissing', blockedModes: [1, 2] },
    525: { description: 'Water tank is empty. Add clean water.', kind: 'waterTankEmpty', blockedModes: [1, 2] },
    527: { description: 'Remove the mop pad before continuing.' },
    528: { description: 'Dust bin is not installed.', kind: 'dustBinMissing' },
    529: { description: 'Mop pad and water tank are not installed.', kind: 'waterTankMissing', blockedModes: [1, 2] },
    530: { description: 'Mop pad and water tank are not installed.', kind: 'waterTankMissing', blockedModes: [1, 2] },
    531: { description: 'Water tank is not installed.', kind: 'waterTankMissing', blockedModes: [1, 2] },
    2101: { description: 'Battery is low. Cleaning will continue after charging.', kind: 'lowBattery' },
  },
};

const VACUUM_PROFILES: Readonly<Record<string, VacuumProfile>> = {
  'xiaomi.vacuum.b112': E10_PROFILE,
  'xiaomi.vacuum.b112gl': E12_PROFILE,
};

export function getVacuumProfile(model: string): VacuumProfile {
  const profile = VACUUM_PROFILES[model];
  if (!profile) throw new Error(`Unsupported vacuum model: ${model}`);
  return profile;
}

/** Keep raw codes in readings; classify them consistently in guards and presentation. */
export function hasVacuumFault(profile: VacuumProfile, code: number): boolean {
  return !profile.nonErrorFaultCodes.includes(code);
}

export function vacuumFaultDescription(profile: VacuumProfile, code: number): string {
  return profile.faults[code]?.description ?? `Xiaomi error ${code}. See Xiaomi Home for recovery instructions.`;
}

export function vacuumFaultKind(profile: VacuumProfile, code: number): VacuumFaultKind | undefined {
  return profile.faults[code]?.kind;
}

export function faultBlocksCleaningMode(profile: VacuumProfile, code: number, mode: number): boolean {
  return profile.faults[code]?.blockedModes?.includes(mode) ?? false;
}
