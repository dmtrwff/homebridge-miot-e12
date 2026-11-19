import type { API, DynamicPlatformPlugin, Logger, MatterAccessory, PlatformAccessory, PlatformConfig } from 'homebridge';
import { deviceIdentity, parseConfig, type DeviceConfig } from './config.js';
import { getDeviceDefinition, type AccessoryController } from './devices/registry.js';
import { MiioTransport } from './miio/transport.js';
import { MatterIdentityStore } from './matter/identity-store.js';
import { ACCESSORY_UUID_NAMESPACE, PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

export class XiaomiMiotPlatform implements DynamicPlatformPlugin {
  private readonly cached = new Map<string, PlatformAccessory>();
  private readonly cachedMatter = new Map<string, MatterAccessory>();
  private closed = false;
  private readonly controllers: AccessoryController[] = [];
  constructor(private readonly log: Logger, private readonly config: PlatformConfig, private readonly api: API) {
    api.on('didFinishLaunching', () => this.launch());
    api.on('shutdown', () => { this.closed = true; for (const controller of this.controllers) controller.stop(); });
  }
  configureAccessory(accessory: PlatformAccessory): void { this.cached.set(accessory.UUID, accessory); }
  configureMatterAccessory(accessory: MatterAccessory): void { this.cachedMatter.set(accessory.UUID, accessory); }
  private findCached<T extends { UUID: string; context: Record<string, unknown> }>(identity: string, claimed: ReadonlySet<string>, cache: ReadonlyMap<string, T>): T | undefined {
    const identified = [...cache.values()].find(item =>
      !claimed.has(item.UUID) && item.context.identity === identity);
    if (identified) return identified;
    const legacy = cache.get(this.api.hap.uuid.generate(`${ACCESSORY_UUID_NAMESPACE}:${identity}`));
    // Older caches did not persist identity. A UUID match is safe only while
    // no newer identity has claimed that cached accessory.
    return legacy && !claimed.has(legacy.UUID) && legacy.context.identity === undefined ? legacy : undefined;
  }
  private allocateUuid(identity: string, claimed: ReadonlySet<string>, cache: ReadonlyMap<string, unknown>): string {
    const base = `${ACCESSORY_UUID_NAMESPACE}:${identity}`;
    let uuid = this.api.hap.uuid.generate(base);
    for (let suffix = 1; cache.has(uuid) || claimed.has(uuid); suffix++) {
      uuid = this.api.hap.uuid.generate(`${base}:replacement:${suffix}`);
    }
    return uuid;
  }
  private launch(): void {
    if (this.closed) return;
    // Cached values alone are never proof that an accessory is reachable.
    for (const accessory of this.cached.values()) {
      for (const service of accessory.services) {
        if (service.UUID === this.api.hap.Service.AccessoryInformation.UUID) continue;
        for (const characteristic of service.characteristics) {
          if ([this.api.hap.Characteristic.Name.UUID, this.api.hap.Characteristic.ConfiguredName.UUID].includes(characteristic.UUID)) continue;
          const unavailable = () => new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
          characteristic.onGet(() => { throw unavailable(); });
          if (characteristic.props.perms.includes(this.api.hap.Perms.PAIRED_WRITE)) characteristic.onSet(() => { throw unavailable(); });
          characteristic.updateValue(unavailable());
        }
      }
    }
    let parsed: ReturnType<typeof parseConfig>;
    try { parsed = parseConfig(this.config); } catch (error) {
      this.log.error(`Configuration error: ${error instanceof Error ? error.message : 'invalid configuration'}`);
      return;
    }
    // This E12-only build publishes no bridged HAP accessories. Remove cached
    // accessories left by older builds after the new configuration validates.
    if (Array.isArray(this.config.devices) && this.cached.size) {
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [...this.cached.values()]);
    }
    void this.launchMatter(parsed.devices, parsed.pollInterval).catch(() => {
      this.log.error('Could not initialize Matter devices. Check the Homebridge Matter logs.');
    });
    if (!parsed.devices.length) this.log.info('No devices configured. Open plugin settings to sign in to Xiaomi or add an IP address and token.');
  }

  private async launchMatter(devices: DeviceConfig[], pollInterval: number): Promise<void> {
    const configured = devices.filter(device => getDeviceDefinition(device.model)?.protocol === 'matter');
    const matter = this.api.matter;
    if (!matter) {
      if (configured.length) this.log.error('Robot vacuums require Homebridge 2.4 or newer with Matter enabled on this bridge. Enable Matter, restart, then pair each vacuum using its own Matter code.');
      return;
    }
    if (!configured.length && !this.cachedMatter.size) return;
    const store = new MatterIdentityStore(this.api.user.storagePath());
    let identities: Awaited<ReturnType<MatterIdentityStore['load']>>;
    try { identities = await store.load(); } catch (error) {
      this.log.error(error instanceof Error ? error.message : 'Could not restore Matter device identities.');
      return;
    }
    for (const [uuid, accessory] of this.cachedMatter) {
      if (typeof accessory.context.identity === 'string' && typeof accessory.context.model === 'string') {
        identities.set(uuid, { UUID: uuid, context: { identity: accessory.context.identity, model: accessory.context.model } });
      }
    }
    const active = new Set<string>();
    for (const device of configured) {
      if (this.closed) return;
      const definition = getDeviceDefinition(device.model)!;
      if (definition.protocol !== 'matter') continue;
      const identity = deviceIdentity(device);
      const existing = this.findCached(identity, active, identities)
        ?? (identity !== `host:${device.host}` ? this.findCached(`host:${device.host}`, active, identities) : undefined);
      const uuid = existing?.UUID ?? this.allocateUuid(identity, active, identities);
      active.add(uuid);
      identities.set(uuid, { UUID: uuid, context: { model: device.model, identity } });
      // Save before publishing so an interrupted first launch retains the same pairing identity.
      try { await store.save(identities); } catch (error) {
        this.log.error(error instanceof Error ? error.message : 'Could not save Matter device identities.');
        return;
      }
      if (this.closed) return;
      const transport = new MiioTransport(device.host, device.token);
      let controller: AccessoryController | undefined;
      try {
        const created = definition.create(this.api, this.log, uuid, device, transport, pollInterval);
        controller = created;
        // Rebuild all handlers; cached values never establish live device state.
        created.accessory.context = { model: device.model, identity };
        this.controllers.push(created);
        await matter.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [created.accessory]);
        if (this.closed) { created.stop(); return; }
        // Homebridge currently resolves external registration even when publishing failed.
        if (!await matter.getAccessoryState(uuid, 'rvcRunMode')) throw new Error('Matter accessory was not published');
        if (this.closed) { created.stop(); return; }
        created.start();
      } catch (error) {
        controller?.stop();
        transport.close();
        const detail = (error instanceof Error ? error.message : 'Unknown Matter initialization error')
          .split(device.token).join('[redacted]').replace(/[\r\n]/g, ' ').slice(0, 240);
        this.log.error(`${device.name}: could not initialize the native Matter accessory (${detail}). Check the Homebridge Matter logs.`);
      }
    }
    if (!this.closed && Array.isArray(this.config.devices)) {
      const removed = [...this.cachedMatter.values()].filter(accessory => !active.has(accessory.UUID));
      if (removed.length) await matter.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, removed);
    }
  }

}
