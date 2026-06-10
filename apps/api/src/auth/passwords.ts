import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_ALGORITHM = "scrypt";
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

export function createPasswordHash(password: string) {
  const salt = randomBytes(SALT_BYTES).toString("base64url");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("base64url");

  return `${HASH_ALGORITHM}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, expectedHash] = storedHash.split("$");

  if (algorithm !== HASH_ALGORITHM || !salt || !expectedHash) {
    return false;
  }

  const provided = Buffer.from(
    scryptSync(password, salt, KEY_LENGTH).toString("base64url")
  );
  const expected = Buffer.from(expectedHash);

  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}
