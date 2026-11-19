# homebridge-miot-e12

Homebridge Matter plugin for the **Xiaomi Robot Vacuum E12** (`xiaomi.vacuum.b112gl`) with local control and native Apple Home integration. It publishes the robot as a Matter Robotic Vacuum Cleaner and uses Xiaomi Cloud only during setup to discover the local address and token.

This build intentionally supports only the exact E12 model identifier `xiaomi.vacuum.b112gl`; every other model is rejected by configuration validation and cloud import.

## Features

- Start, stop, pause, resume, and return to dock
- Separate Vacuum, Vacuum and mop, and Mop tasks
- Four Vacuum suction levels and three Mop water-flow levels
- Four complete Vacuum-and-mop presets: Silent, Standard, Maximum, and Turbo
- Battery, charging, activity, consumable reminders, and native Matter errors
- Local polling and control after setup
- Stable Matter identity across IP and token changes when `did` or `id` is preserved

The E12 implementation has been exercised on physical `xiaomi.vacuum.b112gl` hardware, including Matter pairing, cleaning controls, docking, Locate, charging indications, and missing-mop recovery.

The four combined Vacuum-and-mop presets use these exact E12 settings:

| Preset | Suction | Water |
| --- | --- | --- |
| Silent | Silent (`1`) | Low (`1`) |
| Standard | Standard (`2`) | Medium (`2`) |
| Maximum | Medium (`3`) | High (`3`) |
| Turbo | Turbo (`4`) | High (`3`) |

## Requirements

- Node.js 22.12+, 24, or 26
- Homebridge 2.4+
- Matter enabled on the main or child bridge running this plugin
- Apple Home with robot-vacuum support
- E12 already paired with Xiaomi Home and reachable from Homebridge over UDP port 54321
- A reserved local IPv4 address for the robot

## Install

```bash
npm install -g homebridge-miot-e12
```

Then open the plugin settings in Homebridge and either sign in to Xiaomi with the QR flow or add the E12 manually.

## Apple Home pairing

1. Save the E12 configuration and restart Homebridge.
2. Enable Matter for the bridge running the plugin.
3. Open the Homebridge Matter pairing screen for the E12 accessory.
4. Add the displayed Matter code in Apple Home.

The robot is paired separately from Homebridge's regular HomeKit bridge.

## Manual configuration

```json
{
  "platform": "XiaomiMiot",
  "name": "Xiaomi MIoT",
  "pollInterval": 15,
  "devices": [
    {
      "name": "Robot Vacuum E12",
      "model": "xiaomi.vacuum.b112gl",
      "host": "192.168.1.50",
      "token": "00112233445566778899aabbccddeeff",
      "id": "living-room-e12"
    }
  ]
}
```

Keep `id` unchanged when the IP address or token changes. Cloud import supplies a `did`, which serves the same identity-preservation purpose.

## Charging indications

Xiaomi uses status `4` for the robot while it is on the charging dock. Codes `2103`, `2104`, and `2105` in the E12 fault field are charging/full-charge indications rather than failures. The plugin preserves these raw values in diagnostics without publishing a false HomeKit error. Matter has no separate `Fully Charged` operational state, so Apple Home may continue to display `Charging` at 100%.

## Limitations

- Maps, room selection, schedules, and consumable resets remain in Xiaomi Home.
- Apple Home presentation depends on the controller and home-hub versions.
- Unknown nonzero Xiaomi fault codes remain visible as native operational errors.

## Development

```bash
npm ci
npm run check
```

The check runs TypeScript validation and the production build. Generated output is written to `dist/`, which is intentionally excluded from Git and created automatically during npm packaging.

## References

- [Xiaomi Robot Vacuum E12 MIoT specification](https://miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:vacuum:0000A006:xiaomi-b112gl:1)
- [Homebridge Matter setup guide](https://github.com/homebridge-plugins/homebridge-matter/wiki/Enabling-Matter)

## License

MIT
