import { AuthMethod, Role } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/options", () => ({
  authOptions: {},
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { getServerSession } from "next-auth";
import { getCurrentSession, requireRole } from "@/lib/auth/session";

const mockedGetServerSession = vi.mocked(getServerSession);

function makeSession(role: Role, authMethod: AuthMethod = AuthMethod.EMAIL_PASSWORD) {
  return {
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@test.com",
      image: null,
      role,
      authMethod,
    },
    expires: "2099-01-01",
  } as any;
}

describe("getCurrentSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to getServerSession with authOptions", async () => {
    const session = makeSession(Role.ADMIN);
    mockedGetServerSession.mockResolvedValueOnce(session);

    const result = await getCurrentSession();

    expect(result).toBe(session);
    expect(mockedGetServerSession).toHaveBeenCalledTimes(1);
  });

  it("returns null when no session", async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);

    const result = await getCurrentSession();

    expect(result).toBeNull();
  });
});

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns session when role matches", async () => {
    const session = makeSession(Role.ADMIN);
    mockedGetServerSession.mockResolvedValueOnce(session);

    const result = await requireRole([Role.ADMIN]);

    expect(result).toBe(session);
  });

  it("returns session when role is in allowed list", async () => {
    const session = makeSession(Role.GURU);
    mockedGetServerSession.mockResolvedValueOnce(session);

    const result = await requireRole([Role.ADMIN, Role.GURU]);

    expect(result).toBe(session);
  });

  it("redirects to /login when no session", async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);

    await expect(requireRole([Role.ADMIN])).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /login when session has no user", async () => {
    mockedGetServerSession.mockResolvedValueOnce({ user: null } as any);

    await expect(requireRole([Role.ADMIN])).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects GURU to /guru when only ADMIN allowed", async () => {
    const session = makeSession(Role.GURU);
    mockedGetServerSession.mockResolvedValueOnce(session);

    await expect(requireRole([Role.ADMIN])).rejects.toThrow("REDIRECT:/guru");
  });

  it("redirects SISWA to /siswa when only ADMIN allowed", async () => {
    const session = makeSession(Role.SISWA);
    mockedGetServerSession.mockResolvedValueOnce(session);

    await expect(requireRole([Role.ADMIN])).rejects.toThrow("REDIRECT:/siswa");
  });

  it("redirects ADMIN to /admin when only SISWA allowed", async () => {
    const session = makeSession(Role.ADMIN);
    mockedGetServerSession.mockResolvedValueOnce(session);

    await expect(requireRole([Role.SISWA])).rejects.toThrow("REDIRECT:/admin");
  });

  it("allows SISWA when SISWA is in allowed list", async () => {
    const session = makeSession(Role.SISWA, AuthMethod.NISN);
    mockedGetServerSession.mockResolvedValueOnce(session);

    const result = await requireRole([Role.SISWA]);

    expect(result).toBe(session);
  });
});
