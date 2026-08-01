import { AuthMethod, LabelSource, Role, SentimentLabel } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    sentimentAnalysis: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/admin/activity", () => ({
  recordAdminActivity: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { recordAdminActivity } from "@/lib/admin/activity";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { reviewSentimentAction } from "@/lib/sentiment/review-actions";

const mockedFindUnique = vi.mocked(prisma.sentimentAnalysis.findUnique);
const mockedUpdate = vi.mocked(prisma.sentimentAnalysis.update);
const mockedRecordActivity = vi.mocked(recordAdminActivity);
const mockedGetSession = vi.mocked(getCurrentSession);

function makeSession(role: Role) {
  return {
    user: {
      id: "user-1",
      name: "Admin",
      email: "admin@test.com",
      image: null,
      role,
      authMethod: AuthMethod.EMAIL_PASSWORD,
    },
    expires: "2099-01-01",
  } as any;
}

function makeSentiment(overrides: Partial<{
  id: string;
  autoLabel: SentimentLabel;
  feedbackId: string;
  feedback: {
    aspect: string;
    comment: string;
    subject: {
      name: string;
      subjectTeachers: Array<{ teacher: { userId: string } }>;
    };
    tryoutSession: { tryout: { title: string } };
  };
}> = {}) {
  return {
    id: "sentiment-1",
    autoLabel: SentimentLabel.NEGATIF,
    feedbackId: "feedback-1",
    feedback: {
      aspect: "MATERI",
      comment: "Materinya cukup baik",
      subject: {
        name: "Agama",
        subjectTeachers: [{ teacher: { userId: "user-1" } }],
      },
      tryoutSession: { tryout: { title: "Tryout 1" } },
    },
    ...overrides,
  } as any;
}

function makeFormData(entries: Record<string, string>) {
  const defaults: Record<string, string> = {
    redirectTo: "/admin/feedback",
    sentimentId: "",
    manualLabel: "",
    reviewNotes: "",
  };
  const fd = new FormData();
  for (const [key, value] of Object.entries({ ...defaults, ...entries })) {
    fd.set(key, value);
  }
  return fd;
}

function expectRedirect(error: unknown, path: string) {
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toContain(`REDIRECT:${path}`);
}

describe("reviewSentimentAction — error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects with error when no session", async () => {
    mockedGetSession.mockResolvedValueOnce(null as any);

    const error = await reviewSentimentAction(
      makeFormData({ sentimentId: "sent-1" }),
    ).catch((e) => e);

    expectRedirect(error, "/admin/feedback");
    expect((error as Error).message).toContain("type=error");
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it("redirects with error when session has no user", async () => {
    mockedGetSession.mockResolvedValueOnce({ user: null } as any);

    const error = await reviewSentimentAction(
      makeFormData({ sentimentId: "sent-1" }),
    ).catch((e) => e);

    expectRedirect(error, "/admin/feedback");
    expect((error as Error).message).toContain("type=error");
  });

  it("redirects with error when role is SISWA", async () => {
    mockedGetSession.mockResolvedValueOnce(makeSession(Role.SISWA));

    const error = await reviewSentimentAction(
      makeFormData({ sentimentId: "sent-1" }),
    ).catch((e) => e);

    expectRedirect(error, "/admin/feedback");
    expect((error as Error).message).toContain("tidak+memiliki+akses");
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it("redirects with error when sentiment not found", async () => {
    mockedGetSession.mockResolvedValueOnce(makeSession(Role.ADMIN));
    mockedFindUnique.mockResolvedValueOnce(null);

    const error = await reviewSentimentAction(
      makeFormData({ sentimentId: "missing-id" }),
    ).catch((e) => e);

    expectRedirect(error, "/admin/feedback");
    expect((error as Error).message).toContain("tidak+ditemukan");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("redirects with error when GURU not authorized for subject", async () => {
    mockedGetSession.mockResolvedValueOnce(makeSession(Role.GURU));
    mockedFindUnique.mockResolvedValueOnce(
      makeSentiment({
        feedback: {
          aspect: "MATERI",
          comment: "test",
          subject: {
            name: "Matematika",
            subjectTeachers: [{ teacher: { userId: "different-user" } }],
          },
          tryoutSession: { tryout: { title: "Tryout" } },
        },
      }),
    );

    const error = await reviewSentimentAction(
      makeFormData({ sentimentId: "sent-1" }),
    ).catch((e) => e);

    expectRedirect(error, "/admin/feedback");
    expect((error as Error).message).toContain("mata+pelajaran+yang+diampu");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("redirects with error when sentimentId is empty (zod)", async () => {
    mockedGetSession.mockResolvedValueOnce(makeSession(Role.ADMIN));

    const error = await reviewSentimentAction(
      makeFormData({ sentimentId: "" }),
    ).catch((e) => e);

    expectRedirect(error, "/admin/feedback");
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });
});

describe("reviewSentimentAction — manual override", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSession.mockResolvedValue(makeSession(Role.ADMIN));
    mockedFindUnique.mockResolvedValue(makeSentiment());
    mockedUpdate.mockResolvedValue({} as any);
    mockedRecordActivity.mockResolvedValue(undefined);
  });

  it("updates with MANUAL label when manualLabel provided", async () => {
    await reviewSentimentAction(
      makeFormData({
        sentimentId: "sent-1",
        manualLabel: "POSITIF",
        reviewNotes: "Setuju dengan siswa",
      }),
    ).catch(() => {});

    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sentiment-1" },
        data: expect.objectContaining({
          finalLabel: SentimentLabel.POSITIF,
          labelSource: LabelSource.MANUAL,
          manualLabel: SentimentLabel.POSITIF,
          reviewNotes: "Setuju dengan siswa",
          reviewedByUserId: "user-1",
        }),
      }),
    );
  });

  it("records admin activity when ADMIN overrides", async () => {
    await reviewSentimentAction(
      makeFormData({
        sentimentId: "sent-1",
        manualLabel: "NEGATIF",
      }),
    ).catch(() => {});

    expect(mockedRecordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
        entityType: "MAPEL",
      }),
    );
  });

  it("sets reviewedAt to a Date when overriding", async () => {
    await reviewSentimentAction(
      makeFormData({
        sentimentId: "sent-1",
        manualLabel: "NEGATIF",
      }),
    ).catch(() => {});

    const updateCall = mockedUpdate.mock.calls[0][0];
    expect(updateCall.data.reviewedAt).toBeInstanceOf(Date);
  });

  it("sets reviewNotes to null when not provided", async () => {
    await reviewSentimentAction(
      makeFormData({
        sentimentId: "sent-1",
        manualLabel: "POSITIF",
      }),
    ).catch(() => {});

    const updateCall = mockedUpdate.mock.calls[0][0];
    expect(updateCall.data.reviewNotes).toBeNull();
  });
});

describe("reviewSentimentAction — reset to auto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSession.mockResolvedValue(makeSession(Role.ADMIN));
    mockedFindUnique.mockResolvedValue(
      makeSentiment({ autoLabel: SentimentLabel.POSITIF }),
    );
    mockedUpdate.mockResolvedValue({} as any);
    mockedRecordActivity.mockResolvedValue(undefined);
  });

  it("resets to AUTO when no manualLabel provided", async () => {
    await reviewSentimentAction(
      makeFormData({ sentimentId: "sent-1" }),
    ).catch(() => {});

    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sentiment-1" },
        data: expect.objectContaining({
          finalLabel: SentimentLabel.POSITIF,
          labelSource: LabelSource.AUTO,
          manualLabel: null,
          reviewNotes: null,
          reviewedAt: null,
          reviewedByUserId: null,
        }),
      }),
    );
  });

  it("records admin activity when resetting", async () => {
    await reviewSentimentAction(
      makeFormData({ sentimentId: "sent-1" }),
    ).catch(() => {});

    expect(mockedRecordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
      }),
    );
  });

  it("uses autoLabel as finalLabel when resetting", async () => {
    mockedFindUnique.mockResolvedValueOnce(
      makeSentiment({ autoLabel: SentimentLabel.NEGATIF }),
    );

    await reviewSentimentAction(
      makeFormData({ sentimentId: "sent-1" }),
    ).catch(() => {});

    const updateCall = mockedUpdate.mock.calls[0][0];
    expect(updateCall.data.finalLabel).toBe(SentimentLabel.NEGATIF);
  });
});

describe("reviewSentimentAction — GURU authorized", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSession.mockResolvedValue(makeSession(Role.GURU));
    mockedFindUnique.mockResolvedValue(
      makeSentiment({
        feedback: {
          aspect: "MATERI",
          comment: "test",
          subject: {
            name: "Agama",
            subjectTeachers: [{ teacher: { userId: "user-1" } }],
          },
          tryoutSession: { tryout: { title: "Tryout" } },
        },
      }),
    );
    mockedUpdate.mockResolvedValue({} as any);
  });

  it("allows GURU to override when they teach the subject", async () => {
    await reviewSentimentAction(
      makeFormData({
        sentimentId: "sent-1",
        manualLabel: "POSITIF",
      }),
    ).catch(() => {});

    expect(mockedUpdate).toHaveBeenCalled();
  });

  it("does not record admin activity for GURU", async () => {
    await reviewSentimentAction(
      makeFormData({
        sentimentId: "sent-1",
        manualLabel: "POSITIF",
      }),
    ).catch(() => {});

    expect(mockedRecordActivity).not.toHaveBeenCalled();
  });
});
