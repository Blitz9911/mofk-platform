export function isUatEnvironment() {
  return process.env.MFK_ENV === "uat" || process.env.EXPO_PUBLIC_MFK_ENV === "uat";
}

export function authTokenSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.AUTH_TOKEN_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production" || isUatEnvironment()) {
    throw new Error("JWT_SECRET or AUTH_TOKEN_SECRET must be set in UAT/production.");
  }
  return "mofk-dev-secret-change-me";
}

export function assertAuthConfiguration(): void {
  authTokenSecret();
}
