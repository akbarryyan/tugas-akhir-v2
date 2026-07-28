import { AuthMethod, Role } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword } from "@/lib/auth/password";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

const { providerConfigs } = vi.hoisted(() => ({
  providerConfigs: [] as Array<Record<string, unknown>>,
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: (config: Record<string, unknown>) => {
    providerConfigs.push(config);
    return {
      id: config.id,
      name: config.name,
      type: "credentials",
      ...config,
    };
  },
}));

import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth/options";

const mockedFindFirst = vi.mocked(prisma.user.findFirst);

const staffAuthorize = providerConfigs[0]?.authorize as
  | ((credentials: Record<string, unknown> | undefined, req: unknown) => Promise<unknown>)
  | undefined;
const studentAuthorize = providerConfigs[1]?.authorize as
  | ((credentials: Record<string, unknown> | undefined, req: unknown) => Promise<unknown>)
  | undefined;

function makeUser(overrides: Partial<{
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  passwordHash: string | null;
  role: Role;
  authMethod: AuthMethod;
}> = {}) {
  return {
    id: "user-1",
    name: "Test User",
    email: "test@sekolah.sch.id",
    avatarUrl: null,
    passwordHash: null,
    role: Role.ADMIN,
    authMethod: AuthMethod.EMAIL_PASSWORD,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("staff-credentials authorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user object on correct email + password", async () => {
    const passwordHash = hashPassword("Admin123!");
    mockedFindFirst.mockResolvedValueOnce(
      makeUser({ passwordHash, role: Role.ADMIN }),
    );

    const result = await staffAuthorize!(
      { email: "test@sekolah.sch.id", password: "Admin123!" },
      {},
    );

    expect(result).not.toBeNull();
    expect((result as any).id).toBe("user-1");
    expect((result as any).name).toBe("Test User");
    expect((result as any).role).toBe(Role.ADMIN);
    expect((result as any).authMethod).toBe(AuthMethod.EMAIL_PASSWORD);
  });

  it("returns null on wrong password", async () => {
    const passwordHash = hashPassword("Admin123!");
    mockedFindFirst.mockResolvedValueOnce(makeUser({ passwordHash }));

    const result = await staffAuthorize!(
      { email: "test@sekolah.sch.id", password: "wrongpassword" },
      {},
    );

    expect(result).toBeNull();
  });

  it("returns null when user not found", async () => {
    mockedFindFirst.mockResolvedValueOnce(null);

    const result = await staffAuthorize!(
      { email: "nonexistent@sekolah.sch.id", password: "any" },
      {},
    );

    expect(result).toBeNull();
  });

  it("returns null when user has no passwordHash", async () => {
    mockedFindFirst.mockResolvedValueOnce(makeUser({ passwordHash: null }));

    const result = await staffAuthorize!(
      { email: "test@sekolah.sch.id", password: "any" },
      {},
    );

    expect(result).toBeNull();
  });

  it("returns null on invalid email format (zod)", async () => {
    const result = await staffAuthorize!(
      { email: "not-an-email", password: "any" },
      {},
    );

    expect(result).toBeNull();
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("returns null on empty password (zod)", async () => {
    const result = await staffAuthorize!(
      { email: "test@sekolah.sch.id", password: "" },
      {},
    );

    expect(result).toBeNull();
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("returns null on null credentials", async () => {
    const result = await staffAuthorize!(undefined, {});

    expect(result).toBeNull();
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("normalizes email to lowercase before db query", async () => {
    const passwordHash = hashPassword("Admin123!");
    mockedFindFirst.mockResolvedValueOnce(makeUser({ passwordHash }));

    await staffAuthorize!(
      { email: "TEST@SEKOLAH.SCH.ID", password: "Admin123!" },
      {},
    );

    expect(mockedFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: "test@sekolah.sch.id",
        }),
      }),
    );
  });

  it("returns user with avatarUrl as image", async () => {
    const passwordHash = hashPassword("pass123");
    mockedFindFirst.mockResolvedValueOnce(
      makeUser({ passwordHash, avatarUrl: "https://example.com/avatar.png" }),
    );

    const result = await staffAuthorize!(
      { email: "test@sekolah.sch.id", password: "pass123" },
      {},
    );

    expect((result as any).image).toBe("https://example.com/avatar.png");
  });

  it("works for GURU role", async () => {
    const passwordHash = hashPassword("Guru123!");
    mockedFindFirst.mockResolvedValueOnce(
      makeUser({ passwordHash, role: Role.GURU }),
    );

    const result = await staffAuthorize!(
      { email: "guru@sekolah.sch.id", password: "Guru123!" },
      {},
    );

    expect((result as any).role).toBe(Role.GURU);
  });
});

describe("student-nisn authorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user object on correct NISN", async () => {
    mockedFindFirst.mockResolvedValueOnce(
      makeUser({
        id: "student-1",
        name: "Siswa Test",
        email: null,
        passwordHash: null,
        role: Role.SISWA,
        authMethod: AuthMethod.NISN,
      }),
    );

    const result = await studentAuthorize!({ nisn: "1234567890" }, {});

    expect(result).not.toBeNull();
    expect((result as any).id).toBe("student-1");
    expect((result as any).role).toBe(Role.SISWA);
    expect((result as any).authMethod).toBe(AuthMethod.NISN);
  });

  it("returns null when NISN not found", async () => {
    mockedFindFirst.mockResolvedValueOnce(null);

    const result = await studentAuthorize!({ nisn: "9999999999" }, {});

    expect(result).toBeNull();
  });

  it("returns null on NISN shorter than 10 chars (zod)", async () => {
    const result = await studentAuthorize!({ nisn: "12345" }, {});

    expect(result).toBeNull();
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("returns null on NISN longer than 20 chars (zod)", async () => {
    const result = await studentAuthorize!({ nisn: "12345678901234567890123" }, {});

    expect(result).toBeNull();
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("returns null on null credentials", async () => {
    const result = await studentAuthorize!(undefined, {});

    expect(result).toBeNull();
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("trims NISN whitespace before query", async () => {
    mockedFindFirst.mockResolvedValueOnce(
      makeUser({ role: Role.SISWA, authMethod: AuthMethod.NISN }),
    );

    await studentAuthorize!({ nisn: "  1234567890  " }, {});

    expect(mockedFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentProfile: expect.objectContaining({
            is: expect.objectContaining({
              nisn: "1234567890",
            }),
          }),
        }),
      }),
    );
  });
});

describe("jwt callback", () => {
  it("populates token from user on first sign-in", async () => {
    const token = {};
    const user = {
      id: "user-1",
      name: "Test",
      email: "test@test.com",
      image: "https://img.com/a.png",
      role: Role.ADMIN,
      authMethod: AuthMethod.EMAIL_PASSWORD,
    };

    const result = await (authOptions.callbacks as any).jwt({ token, user });

    expect(result.sub).toBe("user-1");
    expect(result.name).toBe("Test");
    expect(result.email).toBe("test@test.com");
    expect(result.picture).toBe("https://img.com/a.png");
    expect(result.role).toBe(Role.ADMIN);
    expect(result.authMethod).toBe(AuthMethod.EMAIL_PASSWORD);
  });

  it("preserves existing token when no user (refresh)", async () => {
    const token = {
      sub: "user-1",
      name: "Test",
      role: Role.ADMIN,
      authMethod: AuthMethod.EMAIL_PASSWORD,
    };

    const result = await (authOptions.callbacks as any).jwt({ token });

    expect(result).toEqual(token);
  });

  it("sets picture to null when image is undefined", async () => {
    const token = {};
    const user = {
      id: "user-1",
      name: "Test",
      email: null,
      image: undefined,
      role: Role.SISWA,
      authMethod: AuthMethod.NISN,
    };

    const result = await (authOptions.callbacks as any).jwt({ token, user });

    expect(result.picture).toBeNull();
    expect(result.email).toBeNull();
  });
});

describe("session callback", () => {
  it("populates session.user from token", async () => {
    const session = {
      user: {
        id: "",
        name: "",
        email: null,
        image: null,
        role: undefined,
        authMethod: undefined,
      },
    };
    const token = {
      sub: "user-1",
      name: "Test User",
      email: "test@test.com",
      picture: "https://img.com/a.png",
      role: Role.GURU,
      authMethod: AuthMethod.EMAIL_PASSWORD,
    };

    const result = await (authOptions.callbacks as any).session({ session, token });

    expect(result.user.id).toBe("user-1");
    expect(result.user.name).toBe("Test User");
    expect(result.user.email).toBe("test@test.com");
    expect(result.user.image).toBe("https://img.com/a.png");
    expect(result.user.role).toBe(Role.GURU);
    expect(result.user.authMethod).toBe(AuthMethod.EMAIL_PASSWORD);
  });

  it("handles null email in token", async () => {
    const session = {
      user: {
        id: "",
        name: "",
        email: null,
        image: null,
        role: undefined,
        authMethod: undefined,
      },
    };
    const token = {
      sub: "student-1",
      name: "Siswa",
      email: null,
      picture: null,
      role: Role.SISWA,
      authMethod: AuthMethod.NISN,
    };

    const result = await (authOptions.callbacks as any).session({ session, token });

    expect(result.user.email).toBeNull();
    expect(result.user.image).toBeNull();
    expect(result.user.role).toBe(Role.SISWA);
  });

  it("falls back to empty string when sub missing", async () => {
    const session = {
      user: {
        id: "",
        name: "",
        email: null,
        image: null,
        role: undefined,
        authMethod: undefined,
      },
    };
    const token = {
      name: "Test",
      role: Role.ADMIN,
      authMethod: AuthMethod.EMAIL_PASSWORD,
    };

    const result = await (authOptions.callbacks as any).session({ session, token });

    expect(result.user.id).toBe("");
  });
});
