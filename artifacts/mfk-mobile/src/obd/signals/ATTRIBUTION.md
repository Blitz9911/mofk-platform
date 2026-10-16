# Diagnostic signal definitions

`vendor/saej1979.json` is an unmodified snapshot of OBDb/SAEJ1979,
revision `d3259214a9e0340c4a6cff9ec5f8ff5953eee6f2`:
https://github.com/OBDb/SAEJ1979/blob/d3259214a9e0340c4a6cff9ec5f8ff5953eee6f2/signalsets/v3/default.json

Copyright the OBDb/SAEJ1979 contributors. Licensed under CC BY-SA 4.0:
https://creativecommons.org/licenses/by-sa/4.0/ (full text in vendor/LICENSE.txt).
No endorsement by OBDb or SAE is implied.

The metadata adaptations and Arabic labels in signal-registry.ts are distributed
under the same CC BY-SA 4.0 license. Changes: stable PID-qualified IDs, categories,
Arabic labels, support-bit gating, exclusion of unverified definitions, and
explicit corrections described in code. Decoder/application code is independently
implemented. No paid SAE tables or proprietary scanner databases are included.

Reference cross-check: https://github.com/brendan-w/python-OBD/blob/master/obd/commands.py
and obd/decoders.py (reference only; no GPL source code copied).
Vendor transport reference: Drove West V011 Application Integration Reference Rev1.0,
22 September 2026, supplied by the user. FFE1 notify / FFE2 write.
