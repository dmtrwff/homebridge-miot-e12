# Changelog

## Unreleased

- Publish the fork independently as `homebridge-miot-e12` and document npm installation without requiring access to the upstream `@twinforce` scope.
- Rework the README for the independent E12 fork, document source-archive installation and hardware validation, correct the native mode count, point project metadata to the fork, and run CI on its `main` branch without enabling upstream npm publishing.
- Add Xiaomi Robot Vacuum E12 (`xiaomi.vacuum.b112gl`) as a separate native Matter vacuum profile, verified against Xiaomi's published MIoT specification and awaiting physical-device acceptance testing.
- Treat E12 code `2103` as its normal charging indication after observing it with status `4` at 22% battery; do not extend the E10-only `2105` exception without an E12 hardware observation.
- Avoid a command-handler `TypeError` on Homebridge Matter API builds whose runtime status object omits `InvalidInState`; rejected state-dependent commands now use the universally available Matter failure response while retaining the native RVC operational error.
- Tag E12 suction presets with standard Matter Quiet, Min, DeepClean, and Max mode tags and use friendly labels so Apple Home can distinguish power levels instead of collapsing identical Vacuum-tagged modes.
- Match the Xiaomi E12 app's exact level names: Silent, Standard, Medium, and Turbo for suction; Low, Medium, and High for water flow.
- Log concise state transitions with raw status, fault, cleaning mode, suction, water, and battery values, allowing E12 firmware behavior to be verified without noisy battery-only poll logs.
- Accept E12's observed `Idle` result from `stop-sweeping` as a completed Matter Pause request while publishing the truthful stopped state, and fall back to a plain protocol failure on older Homebridge runtimes that omit typed `Failure` and `InvalidInState` constructors.
- Give every water-level preset a unique standards-based Matter mode-tag set; identical Mop tags violated the Mode Base invariant and caused Apple Home to collapse or hide the choices after Mop was selected.
- Match Xiaomi Home for standalone Vacuum and Mop controls, and simplify Vacuum-and-mop into four complete presets: Silent+Low, Standard+Medium, Maximum (Medium+High), and Turbo+High.
- Handle Homebridge Matter runtimes that omit the entire protocol-status helper object, not only individual error constructors; failed and invalid commands now fall back safely without a handler `TypeError`.
- Describe the observed E12 fault `522` as a missing mop pad, keep wet modes blocked while it is active, and allow switching back to Vacuum so the user cannot become trapped in an unavailable mop mode.
- Audit fault gating so errors restrict only incompatible clean modes: unknown mechanical faults no longer lock harmless preset selection, while robot Start remains authoritative and missing-mop fault `522` blocks only wet modes.
- Bound native Matter operational-error details to the required 64-character maximum so descriptive faults cannot roll back endpoint updates, and reject Pause immediately outside active cleaning without sending a pointless stop command.
- Map confirmed Xiaomi fault `522` to Matter's native `MopCleaningPadMissing` error instead of a generic operation failure, with an extensible typed mapping for future verified E12 faults.
- Add the B112-family miIO fault table to the E12 profile, translating navigation, wheel, battery, bin, dock, tank and mop faults into native Matter RVC error categories; keep ambiguous charging and mop-temperature faults generic and treat charging/full-charge indications as healthy.
- Consolidate each vacuum fault's description, Matter category and blocked modes into one typed definition, centralize activity-state classification, and prevent Matter publication failures from being misreported as lost robot connectivity.

- Publish automatically after successful checks on every push or merge to `main`, using npm Trusted Publishing, automatic patch versions, queued releases, and idempotent retries.

- Explicitly clear stale Matter operational-error details when the robot recovers; nested state merging previously retained the old communication/fault description alongside NoError.
- Add background-refresh and live Matter endpoint diagnostics to Homebridge debug logs for investigating an Apple Home tile stuck on Updating; resolution of this Apple Home symptom still needs validation on an affected controller.
- Keep the polling timer scheduled after unexpected cycle failures and test six hours of passive polling, automatic recovery, and shutdown.
- Accept Xiaomi action acknowledgements that omit echoed service/action IDs, while checking any IDs supplied by the firmware.
- Accept pending MIoT command results and wait for delayed robot state updates before completing native Matter commands; mutations are never replayed.
- Share a three-second confirmation polling budget across a cleaning preset, polling only the changing properties.
- Preserve fresh activity and battery readings when a reachable robot rejects or does not confirm a command, instead of incorrectly reporting a communication failure.
- Add delayed-firmware regression coverage and exercise asynchronous commands through the real Homebridge Matter endpoint.

## 0.2.1

- Select the purifier's actual Sleep mode at 1% on the native speed slider; retain all 15 Favorite levels at 2–100% and preserve Sleep when HomeKit repeats Manual.
- Add optional display control for both CPA4 profiles using a linked native light with Off/Dim/On levels. It is disabled by default and changes only the display backlight.
- Report confirmed discrete slider values after writes and preserve display preferences during Xiaomi Cloud re-import.
- Accept repeated native cleaning settings without writing to the robot, including while physically paused or returning to dock.
- Preserve physical pause and docking when a Matter controller repeats the current run mode; native Resume continues to resume cleaning.
- Treat E10 code `2105` as a non-error indication based on a field report at full battery, while retaining raw readings and reporting all other unknown nonzero codes.
- Distinguish an actual setting change blocked by the current activity from a device fault, and include activity/battery context in fault warnings.
- Add regressions for physical state changes, repeated commands, fault recovery, and the real Homebridge Matter endpoint.

## 0.2.0

- Add Xiaomi Robot Vacuum E10 (`xiaomi.vacuum.b112`) as a native Matter Robotic Vacuum Cleaner in Apple Home, including cleaning, pause/resume, return to dock, battery, charging, identification, and operational errors.
- Expose vacuuming, mopping, and combined cleaning through native cleaning modes, including suction and water-level presets.
- Add Xiaomi Cloud discovery/import for the E10, manual local configuration, consumable replacement reminders in logs, and persistent Matter accessory identities.
- Translate documentation and the setup UI into English, with Docker installation and separate robot Matter pairing instructions.
- Require Homebridge 2.4.0 or later in the 2.x series. Matter must be enabled on the bridge running the plugin to use the E10.
- Retain the Air Purifier 4 Compact's native HomeKit integration and existing accessory identities.

E10 behavior is covered by automated tests and checked against its published MIoT specification. Physical-device and Apple Home acceptance testing remain pending; see [the hardware checklist](docs/HARDWARE-TEST.md).

## 0.1.0

- Initial public npm release as `@twinforce/homebridge-miot`.
- Add Air Purifier 4 Compact with native HomeKit purifier, air quality, and filter maintenance services.
- Add Xiaomi Cloud QR setup, device import, and manual local configuration.
