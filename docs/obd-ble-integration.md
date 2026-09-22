# MFK OBD BLE Integration

## Overview

This document describes the first production-ready mobile integration between the MFK Expo app and the V011 OBD-II adapter.

The V011 adapter exposes an ELM327-compatible command interface over Bluetooth Low Energy.

## Native Build Requirement

BLE uses `react-native-ble-plx`, which requires a native Expo Development Build or a production native build.

Expo Go is not supported for this feature because it does not include the native BLE module.

## Selected BLE Library

Selected library: `react-native-ble-plx`

Reasons:

- Mature React Native BLE API.
- Supports scanning, connection, service discovery, characteristic write, and notifications.
- Supports Base64 characteristic transport used by React Native native bridges.
- Can be configured through Expo config plugins for native builds.

## Expo Configuration

Mobile app:

`artifacts/mfk-mobile`

Config file:

`artifacts/mfk-mobile/app.json`

### Android Permissions

- `android.permission.BLUETOOTH_SCAN`
- `android.permission.BLUETOOTH_CONNECT`
- `android.permission.ACCESS_FINE_LOCATION`

Runtime behavior:

- Android 12 and newer requests Bluetooth scan/connect permissions.
- Older Android versions request fine location because BLE scanning historically requires location permission.

### iOS Permissions

`NSBluetoothAlwaysUsageDescription`

Arabic description:

`يستخدم مفك البلوتوث للاتصال بجهاز فحص السيارة وقراءة بيانات المركبة.`

## V011 BLE UUIDs

Service UUID:

- Short: `FFE0`
- Expanded: `0000ffe0-0000-1000-8000-00805f9b34fb`

Write characteristic:

- Short: `FFE1`
- Expanded: `0000ffe1-0000-1000-8000-00805f9b34fb`

Notify characteristic:

- Short: `FFE2`
- Expanded: `0000ffe2-0000-1000-8000-00805f9b34fb`

All UUID matching is case-insensitive and supports short and expanded UUID formats.

## Architecture

OBD source lives under:

`artifacts/mfk-mobile/src/obd`

Main layers:

- `ble/`: permission, scan, connection, UUID discovery, notification subscription.
- `elm327/`: command queue, command transport, response buffering, initialization.
- `pids/`: standard PID definitions, formulas, supported PID parsing, DTC decoding.
- `services/`: OBD orchestration, logging, mock transport.
- `hooks/`: React hook used by the connection screen.
- `types/`: strict TypeScript contracts.

UI screen:

`artifacts/mfk-mobile/app/obd-connect.tsx`

Entry point from diagnostics:

`artifacts/mfk-mobile/app/(tabs)/diagnostics.tsx`

## ELM327 Initialization Sequence

Commands are sent sequentially. The next command is not sent until the previous command receives the final prompt character `>`.

Initial sequence:

- `ATZ`
- `ATE0`
- `ATL0`
- `ATS0`
- `ATH0`
- `ATAT1`
- `ATSP0`
- `ATI`
- `ATRV`
- `0100`
- `ATDP`

`ATZ` uses a longer timeout. Optional formatting commands are logged as warnings when unsupported and do not necessarily fail the whole connection.

## BLE Data Transport

`react-native-ble-plx` transports characteristic values as Base64.

Commands are ASCII encoded, Base64 transported, and always terminated with carriage return:

`ATZ\r`

Responses are buffered until `>` is received. The parser removes:

- null bytes
- command echo
- carriage returns
- line feeds
- prompt character
- duplicated whitespace

Status messages such as `NO DATA`, `UNABLE TO CONNECT`, `CAN ERROR`, and `BUS ERROR` are preserved.

## Supported PIDs

Initial Mode 01 support includes:

- `0104` engine load
- `0105` coolant temperature
- `0106` short-term fuel trim bank 1
- `0107` long-term fuel trim bank 1
- `010B` intake manifold pressure
- `010C` RPM
- `010D` speed
- `010E` timing advance
- `010F` intake air temperature
- `0110` mass airflow
- `0111` throttle position
- `012F` fuel level
- `0142` control module voltage
- `0146` ambient temperature
- `015E` engine fuel rate

DTC support:

- Mode `03`: stored DTCs
- Mode `07`: pending DTCs
- Mode `0A`: permanent DTCs

VIN support is prepared through Mode `09` mock responses, but VIN is not permanently logged.

## Live Polling

Polling starts only after initialization confirms vehicle communication.

Initial polling groups:

- Fast, about 900 ms: RPM and speed.
- Normal, about 1500 ms: engine load and throttle.
- Slow, about 4000 ms: coolant temperature, fuel level, and control module voltage.

Polling uses the same serialized ELM327 command queue. Polling stops on disconnect or when the app goes to background.

## Mock Transport

Mock transport:

`artifacts/mfk-mobile/src/obd/services/mock-elm327-transport.ts`

The UI exposes a development helper button named `تجربة المحاكاة`.

The mock mode is not automatically enabled in production. It only runs when explicitly selected from the OBD connection screen.

## Testing

Parser and queue tests:

```powershell
node artifacts\mfk-mobile\scripts\test-obd-parsers.cjs
```

Mobile typecheck:

```powershell
.\node_modules\.bin\tsc.cmd -p artifacts\mfk-mobile\tsconfig.json --noEmit
```

After installing native dependencies, also run:

```powershell
pnpm --filter @workspace/mfk-mobile run typecheck
pnpm --filter @workspace/mfk-mobile run build
```

## Physical Adapter Test Steps

1. Install dependencies.
2. Create an Expo Development Build.
3. Install the development build on the phone.
4. Turn ignition to ACC or start the vehicle safely.
5. Plug V011 into the OBD-II port.
6. Open MFK mobile app.
7. Go to `التشخيص`.
8. Tap `بدء جلسة جديدة`.
9. Tap `بحث عن القطعة`.
10. Select the V011 adapter from the discovered devices.
11. Confirm that `ELM327`, voltage, protocol, and supported PID count appear.
12. Confirm live cards update for RPM, speed, coolant temperature, engine load, throttle, fuel, and voltage.

## Troubleshooting

Device not found:

- Confirm V011 is powered by the OBD-II port.
- Confirm Bluetooth is enabled.
- Scan again near the vehicle.
- Use manual selection when the device name is not V011.

Permission denied:

- Enable Bluetooth permission in system settings.
- On older Android versions, enable location permission for BLE scanning.

Bluetooth disabled:

- Turn on Bluetooth and scan again.

Service `FFE0` missing:

- The selected device may not be the V011 adapter.
- Try rescanning and selecting another device.

Write characteristic `FFE1` missing:

- The adapter may expose a different firmware profile.
- Capture the debug console and verify services.

Notify characteristic `FFE2` missing:

- Notifications cannot be received, so ELM327 responses cannot complete.
- Select another device or restart the adapter.

Notifications not received:

- Confirm connection did not drop.
- Restart scan and reconnect.
- Some clone adapters need ignition on before responding reliably.

`NO DATA`:

- Vehicle may not be ready.
- Ignition may be off.
- PID may be unsupported.
- ECU may not respond to the selected protocol.

`UNABLE TO CONNECT`:

- Confirm V011 is seated correctly.
- Turn ignition to ACC or start the vehicle safely.
- Reconnect the adapter.

Command timeout:

- Adapter may be busy or disconnected.
- Reduce polling load.
- Reconnect and retry.

Clone ELM327 behavior:

- Some clones do not support every AT command.
- Optional setup commands are logged as warnings when safe.

Unsupported AT command:

- The initializer continues when the command is optional.
- Required failures stop initialization and show a friendly Arabic message.

## Known Limitations

- Manufacturer-specific PIDs are not implemented.
- High-frequency live data is not synchronized to the cloud.
- Physical V011 validation must be performed with the real adapter.
- Expo Go is not supported.
