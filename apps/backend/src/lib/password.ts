/**
 * Hachage de mots de passe — Argon2id via hash-wasm (WASM pur,
 * sans compilation native). Paramètres OWASP recommandés.
 * Les hachés ne quittent jamais le backend.
 */
import { argon2id, argon2Verify } from "hash-wasm";
import { randomBytes } from "node:crypto";

const PARAMS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 64 * 1024, // 64 Mo
  hashLength: 32,
} as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return argon2id({
    password,
    salt,
    ...PARAMS,
    outputType: "encoded", // format $argon2id$v=19$m=...,t=...,p=...$salt$hash
  });
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash: encoded });
  } catch {
    return false;
  }
}
