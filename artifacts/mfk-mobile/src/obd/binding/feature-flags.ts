function envFlag(name: string) {
  const value = process.env[name];
  if (value == null) return false;
  return value === "true" || value === "1" || value === "yes";
}

/** Defaults false. Do not enable enforcement in production without QA sign-off. */
export function isDeviceBindingEnabled() {
  return envFlag("EXPO_PUBLIC_MFK_DEVICE_BINDING_ENABLED");
}

export function isVehicleVerificationEnabled() {
  return envFlag("EXPO_PUBLIC_MFK_VEHICLE_VERIFICATION_ENABLED");
}

export function isBindingEnforcementEnabled() {
  return envFlag("EXPO_PUBLIC_MFK_BINDING_ENFORCEMENT_ENABLED");
}
