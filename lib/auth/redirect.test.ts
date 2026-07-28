import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getDashboardPathForRole } from "@/lib/auth/redirect";

describe("getDashboardPathForRole", () => {
  it("returns /admin for ADMIN role", () => {
    expect(getDashboardPathForRole(Role.ADMIN)).toBe("/admin");
  });

  it("returns /guru for GURU role", () => {
    expect(getDashboardPathForRole(Role.GURU)).toBe("/guru");
  });

  it("returns /siswa for SISWA role", () => {
    expect(getDashboardPathForRole(Role.SISWA)).toBe("/siswa");
  });

  it("returns /login for unknown role value", () => {
    expect(getDashboardPathForRole("UNKNOWN" as Role)).toBe("/login");
  });

  it("returns /login for empty string", () => {
    expect(getDashboardPathForRole("" as Role)).toBe("/login");
  });

  it("returns /login for null cast as Role", () => {
    expect(getDashboardPathForRole(null as unknown as Role)).toBe("/login");
  });

  it("returns /login for undefined cast as Role", () => {
    expect(getDashboardPathForRole(undefined as unknown as Role)).toBe("/login");
  });
});
