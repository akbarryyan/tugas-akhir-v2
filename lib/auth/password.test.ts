import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword", () => {
  it("returns string with scrypt prefix", () => {
    const hash = hashPassword("test123");
    expect(hash).toMatch(/^scrypt\$[a-f0-9]+\$[a-f0-9]+$/);
  });

  it("generates different hashes for same password (random salt)", () => {
    const hash1 = hashPassword("test123");
    const hash2 = hashPassword("test123");
    expect(hash1).not.toBe(hash2);
  });

  it("produces hash with 3 parts separated by $", () => {
    const hash = hashPassword("mypassword");
    const parts = hash.split("$");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("scrypt");
  });
});

describe("verifyPassword", () => {
  it("returns true for correct password", () => {
    const hash = hashPassword("mySecret123");
    expect(verifyPassword("mySecret123", hash)).toBe(true);
  });

  it("returns false for wrong password", () => {
    const hash = hashPassword("mySecret123");
    expect(verifyPassword("wrongPassword", hash)).toBe(false);
  });

  it("returns false for empty hash", () => {
    expect(verifyPassword("test", "")).toBe(false);
  });

  it("returns false for hash without $ separator", () => {
    expect(verifyPassword("test", "invalidhash")).toBe(false);
  });

  it("returns false for hash with only prefix and salt (missing hash part)", () => {
    expect(verifyPassword("test", "scrypt$abcsalt")).toBe(false);
  });

  it("returns false for wrong prefix", () => {
    const hash = hashPassword("mySecret123");
    const [, salt, storedHash] = hash.split("$");
    const wrongPrefix = `bcrypt$${salt}$${storedHash}`;
    expect(verifyPassword("mySecret123", wrongPrefix)).toBe(false);
  });

  it("returns false for tampered hash (same length, different content)", () => {
    const hash = hashPassword("mySecret123");
    const [prefix, salt, storedHash] = hash.split("$");
    const tamperedHash = `${prefix}$${salt}$${"a".repeat(storedHash.length)}`;
    expect(verifyPassword("mySecret123", tamperedHash)).toBe(false);
  });

  it("returns false for hash with invalid hex in stored hash", () => {
    const hash = hashPassword("mySecret123");
    const [prefix, salt] = hash.split("$");
    const invalidHex = `${prefix}$${salt}$zzzz`;
    expect(verifyPassword("mySecret123", invalidHex)).toBe(false);
  });

  it("handles different password lengths", () => {
    const shortHash = hashPassword("a");
    const longHash = hashPassword("a".repeat(1000));
    expect(verifyPassword("a", shortHash)).toBe(true);
    expect(verifyPassword("a".repeat(1000), longHash)).toBe(true);
    expect(verifyPassword("a", longHash)).toBe(false);
  });
});
