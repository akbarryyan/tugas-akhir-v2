import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const HASH_PREFIX = "scrypt";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return `${HASH_PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedPasswordHash: string) {
  const [prefix, salt, storedHash] = storedPasswordHash.split("$");

  if (
    prefix !== HASH_PREFIX ||
    typeof salt !== "string" ||
    typeof storedHash !== "string"
  ) {
    return false;
  }

  const passwordHash = scryptSync(password, salt, KEY_LENGTH);
  const storedHashBuffer = Buffer.from(storedHash, "hex");

  if (passwordHash.byteLength !== storedHashBuffer.byteLength) {
    return false;
  }

  return timingSafeEqual(passwordHash, storedHashBuffer);
}
