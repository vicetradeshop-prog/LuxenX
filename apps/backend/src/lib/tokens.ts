/**
 * Jetons signés (format JWT HS256 minimal, sans dépendance externe)
 * et refresh tokens aléatoires hachés avant stockage.
 */
import { createHmac, randomBytes, createHash, timingSafeEqual } from "node:crypto";

export interface AccessTokenPayload {
  sub: string; // userId
  sid: string; // id de session (révocation)
  role: "user" | "admin";
  iat: number;
  exp: number;
}

const b64url = (buf: Buffer | string): string =>
  Buffer.from(buf).toString("base64url");

export function signAccessToken(
  payload: Omit<AccessTokenPayload, "iat" | "exp">,
  secret: string,
  ttlSeconds: number,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }));
  const sig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts as [string, string, string];
  const expected = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AccessTokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}

/** Refresh token : 48 octets aléatoires ; seul le hash SHA-256 est stocké. */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function newSessionId(): string {
  return randomBytes(12).toString("hex");
}
