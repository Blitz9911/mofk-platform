# MFK Device & Vehicle Binding — Architecture

## Findings (existing production)

- Auth: Supabase JWT via `getValidSupabaseSession`. Mobile APIs go through `lib/supabase-api-bridge.ts`; the user id is taken from the session, not from the request body (vehicles POST already does this).
- Vehicles: `public.vehicles` (`user_id`, optional `vin`, `adapter_mac`). RLS: owner can CRUD. Do **not** replace this table.
- BLE / ELM: single `ObdService` + `Elm327CommandQueue`. VIN via Mode 09 `0902` (may be unavailable/all-FF). CALID/CVN/ECU name already read in `readVehicleInformation`.
- Live telemetry POST `/api/diagnostics/live/:vehicleId` currently uses `vehicles[0]` with no vehicle-identity check.
- V011 identity: BLE id/name only. Not a cryptographic hardware id. Saved locally in `src/obd/storage/saved-device.ts`.
- Subscriptions: isolated trial UI. Binding must not touch plans or payments.

## Integration points

1. Flags in `feature-flags.ts` (default off).
2. Fingerprint collect on the existing queue (`collectVehicleFingerprint`).
3. Matcher is pure and offline-testable.
4. Persistence via SECURITY DEFINER RPCs (no direct table writes from the client).
5. Telemetry persist gated only when `MFK_BINDING_ENFORCEMENT_ENABLED=true`.
6. UI `app/device-binding.tsx` hidden unless device-binding flag is on.

## Hardware limitation

Software binding **does not** lock a V011 adapter. BLE MAC/name/UUID are spoofable. `identity_type` stays `unverified_hardware` until cryptographic adapters exist.

## Rollback

Leave flags false. Optional: run `20261010_mfk_device_binding_rollback.sql`. Do not drop `vehicles` or auth tables.
