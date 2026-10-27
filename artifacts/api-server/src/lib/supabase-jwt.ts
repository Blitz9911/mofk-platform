import { createPublicKey, verify as verifySignature } from "node:crypto";

export type SupabaseJwtPayload = {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
};

type SupabaseJwk = { kid?: string; kty: string; alg?: string; use?: string; [key: string]: unknown };
type PublicJwk = SupabaseJwk & { n?: string; e?: string; x?: string; y?: string; crv?: string };
type JwksResponse = { keys?: SupabaseJwk[] };
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;
let jwksCache: { url: string; expiresAt: number; keys: SupabaseJwk[] } | null = null;

function projectRef(): string | null {
  const explicit = process.env.MFK_UAT_SUPABASE_REF || process.env.EXPO_PUBLIC_MFK_UAT_SUPABASE_REF;
  if (explicit) return explicit;
  const match = (process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i);
  return match?.[1] ?? null;
}

function decode(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as { alg?: string; kid?: string };
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as SupabaseJwtPayload;
    const signature = Buffer.from(parts[2], "base64url");
    if (!header.alg || !payload.sub || !payload.iss || payload.exp == null || !signature.length) return null;
    return { header, payload, signingInput: `${parts[0]}.${parts[1]}`, signature };
  } catch {
    return null;
  }
}

async function fetchJwks(url: string): Promise<SupabaseJwk[]> {
  if (jwksCache && jwksCache.url === url && jwksCache.expiresAt > Date.now()) return jwksCache.keys;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`JWKS request failed: ${response.status}`);
    const body = (await response.json()) as JwksResponse;
    const keys = Array.isArray(body.keys) ? body.keys : [];
    if (!keys.length) throw new Error("Supabase JWKS response contained no keys");
    jwksCache = { url, expiresAt: Date.now() + JWKS_CACHE_TTL_MS, keys };
    return keys;
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifySupabaseJwt(token: string): Promise<SupabaseJwtPayload | null> {
  const decoded = decode(token);
  const ref = projectRef();
  if (!decoded || !ref) return null;
  const issuer = `https://${ref}.supabase.co/auth/v1`;
  const audience = decoded.payload.aud;
  const audienceOk = Array.isArray(audience) ? audience.includes("authenticated") : audience === "authenticated";
  const now = Math.floor(Date.now() / 1000);
  if (decoded.payload.iss !== issuer || !audienceOk || decoded.payload.exp! <= now || (decoded.payload.nbf != null && decoded.payload.nbf > now + 30)) return null;
  if (!decoded.header.kid || !["RS256", "ES256"].includes(decoded.header.alg!)) return null;
  try {
    const jwk = (await fetchJwks(`${issuer}/.well-known/jwks.json`)).find((key) => key.kid === decoded.header.kid && (key.use == null || key.use === "sig"));
    if (!jwk) return null;
    const publicKey = createPublicKey({ key: jwk as PublicJwk, format: "jwk" });
    const algorithm = decoded.header.alg === "RS256" ? "RSA-SHA256" : "sha256";
    return verifySignature(algorithm, Buffer.from(decoded.signingInput), publicKey, decoded.signature) ? decoded.payload : null;
  } catch {
    return null;
  }
}
