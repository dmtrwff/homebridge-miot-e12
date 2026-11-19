# Changelog

## Unreleased

- Publish exactly four Matter cleaning modes—Silent, Standard, Maximum, and Turbo—instead of the previous 14-entry task/level matrix.
- Clarify the npm display name and description for the E12-only Matter plugin.
- Support only Xiaomi Robot Vacuum E12 (`xiaomi.vacuum.b112gl`).
- Remove E10 and air-purifier registration, configuration, cloud-import eligibility, UI code, implementation modules, and documentation.
- Use the verified E12 vacuum-and-mop presets: Silent+Low, Standard+Medium, Medium+High (Maximum), and Turbo+High.
- Treat E12 charging indications `2103`, `2104`, and `2105` as healthy states while retaining raw diagnostic values.
- Correct the Homebridge plugin identifier to `homebridge-miot-e12`.
- Remove inherited upstream publishing automation, internal tests, and generated build output from the public source tree.

## 0.2.2-e12.18

- Last release before the E12-only source cleanup.
