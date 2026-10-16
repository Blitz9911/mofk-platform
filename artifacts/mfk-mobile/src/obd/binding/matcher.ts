import type { FingerprintMatchResult, VehicleFingerprint } from "./types";

function fieldOk(value: string | null | undefined, availability?: string) {
  return Boolean(value) && availability !== "malformed" && availability !== "timeout";
}

function bothOk(
  left: VehicleFingerprint,
  right: VehicleFingerprint,
  key: "vinNormalized" | "calibrationId" | "cvn",
  availabilityKey: "vinAvailability" | "calibrationAvailability" | "cvnAvailability",
) {
  return fieldOk(left[key], left[availabilityKey]) && fieldOk(right[key], right[availabilityKey]);
}

export function matchVehicleFingerprints(
  registered: VehicleFingerprint,
  observed: VehicleFingerprint,
): FingerprintMatchResult {
  if (
    observed.collectionError ||
    observed.vinAvailability === "timeout" ||
    observed.vinAvailability === "malformed" ||
    observed.calibrationAvailability === "malformed" ||
    observed.cvnAvailability === "malformed"
  ) {
    return "INCONCLUSIVE";
  }

  const observedHasIdentity =
    fieldOk(observed.vinNormalized, observed.vinAvailability) ||
    fieldOk(observed.calibrationId, observed.calibrationAvailability) ||
    fieldOk(observed.cvn, observed.cvnAvailability) ||
    Boolean(observed.protocol) ||
    Boolean(observed.supportedPidsNormalized);

  if (!observedHasIdentity) return "UNSUPPORTED";

  if (bothOk(registered, observed, "vinNormalized", "vinAvailability")) {
    if (registered.vinNormalized !== observed.vinNormalized) return "MISMATCH";
    if (
      bothOk(registered, observed, "calibrationId", "calibrationAvailability") &&
      registered.calibrationId !== observed.calibrationId
    ) {
      return "LIKELY_MATCH";
    }
    return "VERIFIED";
  }

  const vinConflict =
    registered.vinAvailability === "ok" &&
    observed.vinAvailability === "ok" &&
    registered.vinNormalized &&
    observed.vinNormalized &&
    registered.vinNormalized !== observed.vinNormalized;
  if (vinConflict) return "MISMATCH";

  const calBoth = bothOk(registered, observed, "calibrationId", "calibrationAvailability");
  const calSame = calBoth && registered.calibrationId === observed.calibrationId;
  const calDifferent = calBoth && registered.calibrationId !== observed.calibrationId;
  const weakSame =
    Boolean(registered.protocol && observed.protocol && registered.protocol === observed.protocol) &&
    Boolean(
      registered.supportedPidsNormalized &&
        observed.supportedPidsNormalized &&
        registered.supportedPidsNormalized === observed.supportedPidsNormalized,
    );

  if (calSame && weakSame) return "LIKELY_MATCH";
  if (calDifferent) return "INCONCLUSIVE";
  return "INCONCLUSIVE";
}

export function matchLabelAr(result: FingerprintMatchResult) {
  switch (result) {
    case "VERIFIED":
      return "تم التحقق";
    case "LIKELY_MATCH":
      return "مرجح أنها نفس المركبة";
    case "INCONCLUSIVE":
      return "التحقق غير متاح";
    case "MISMATCH":
      return "مركبة مختلفة";
    default:
      return "التحقق غير مدعوم";
  }
}
