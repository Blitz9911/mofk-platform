# Residual risks (V011)

- BLE id/name are not a trusted hardware identity. Two phones can register different `client_key` values for the same adapter.
- Reinstall creates a new `client_key`.
- VIN may be missing or all-FF. That is INCONCLUSIVE, not fraud.
- Calibration IDs change after ECU updates → LIKELY_MATCH, not MISMATCH, when VIN still matches.
- Protocol/PID maps are weak and never verify a vehicle alone.
- Enforcement is off by default. Monitoring must not drop the BLE session.
- Set `app.settings.vin_pepper` in the database before storing VIN HMACs. Without it, `vin_hmac` stays null.
- Do not enable `EXPO_PUBLIC_MFK_BINDING_ENFORCEMENT_ENABLED` until UAT.

## Manual checklist

1. Flags false: live data, DTC, vehicle info, pairing unchanged.
2. Enable binding only: register + bind with connected adapter; UI shows unverified hardware notice.
3. Missing VIN: result is not MISMATCH.
4. Different VIN: MISMATCH; history not overwritten.
5. Transfer: cooldown 72h; old binding deactivated only on complete.
6. Unauthenticated RPC calls fail.
7. Direct table inserts from the client fail (no INSERT grant).
