import type { API, Logger, MatterAccessory } from 'homebridge';
import type { DeviceConfig } from '../config.js';
import type { MiotTransport } from '../miio/transport.js';
import { VacuumAccessory } from '../matter/vacuum-accessory.js';
import { SUPPORTED_VACUUM_MODELS } from './vacuum-profile.js';

export interface AccessoryController { start(): void; stop(): void }
export interface MatterAccessoryController extends AccessoryController { readonly accessory: MatterAccessory }
export interface MatterDeviceDefinition {
  readonly protocol: 'matter';
  readonly models: readonly string[];
  create(api: API, log: Logger, uuid: string, config: DeviceConfig, transport: MiotTransport, pollInterval: number): MatterAccessoryController;
}
export type DeviceDefinition = MatterDeviceDefinition;

const definitions: readonly DeviceDefinition[] = [{
  protocol: 'matter',
  models: SUPPORTED_VACUUM_MODELS,
  create: (api, log, uuid, config, transport, pollInterval) =>
    new VacuumAccessory(api, log, uuid, config, transport, pollInterval),
}];
export const SUPPORTED_MODELS = definitions.flatMap(definition => [...definition.models]);
export function getDeviceDefinition(model: string): DeviceDefinition | undefined {
  return definitions.find(definition => definition.models.includes(model));
}
export function isSupportedModel(model: string): boolean { return getDeviceDefinition(model) !== undefined; }
