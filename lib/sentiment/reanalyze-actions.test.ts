import { AuthMethod, AutoMethod, LabelSource, Role, SentimentLabel } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    feedback: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    sentimentAnalysis: {
      update: vi.fn(),
    },
    teacherProfile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/admin/activity", () => ({
  recordAdminActivity: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentSession: vi.fn(),
}));

vi.mock("@/lib/nlp/sentiment-analysis", () => ({
  predictSentiment: vi.fn(),
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
import { predictSentiment } from "@/lib/nlp/sentiment-analysis";
import {
  reanalyzeSingleSentimentAction,
  reanalyzeVisibleSentimentsAction,
} from "@/lib/sentiment/reanalyze-actions";

const mockedFindFirst = vi.mocked(prisma.feedback.findFirst);
const mockedFindMany = vi.mocked(prisma.feedback.findMany);
const mockedUpdate = vi.mocked(prisma.sentimentAnalysis.update);
const mockedTeacherFindUnique = vi.mocked(prisma.teacherProfile.findUnique);
const mockedRecordActivity = vi.mocked(recordAdminActivity);
const mockedGetSession = vi.mocked(getCurrentSession);
const mockedPredict = vi.mocked(predictSentiment);

function makeSession(role: Role) {
  return {
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@test.com",
      image: null,
      role,
      authMethod: AuthMethod.EMAIL_PASSWORD,
    },
    expires: "2099-01-01",
  } as any;
}

function makePrediction(overrides: Partial<{
  autoLabel: SentimentLabel;
  autoConfidence: number;
  autoMethod: AutoMethod;
  modelVersion: string | null;
  preprocessedText: string | null;
}> = {}) {
  return {
    autoLabel: SentimentLabel.POSITIF,
    autoConfidence: 0.85,
    autoMethod: AutoMethod.NAIVE_BAYES,
    modelVersion: "nb-v1",
    preprocessedText: "materi jelas",
    ...overrides,
  };
}

function makeFeedback(overrides: Partial<{
  id: string;
  aspect: string;
  comment: string;
  subject: { name: string };
  sentiment: {
    id: string;
    labelSource: LabelSource;
    manualLabel: SentimentLabel | null;
  } | null;
}> = {}) {
  return {
    id: "feedback-1",
    aspect: "MATERI",
    comment: "Materinya bagus",
    subject: { name: "Agama" },
    sentiment: {
      id: "sentiment-1",
      labelSource: LabelSource.AUTO,
      manualLabel: null,
    },
    ...overrides,
  } as any;
}

function makeFormData(entries: Record<string, string>) {
  const defaults: Record<string, string> = {
    redirectTo: "/admin/feedback",
    feedbackId: "",
    query: "",
  };
  const fd = new FormData();
  for (const [key, value] of Object.entries({ ...defaults, ...entries })) {
    fd.set(key, value);
  }
  return fd;
}

describe("reanalyzeSingleSentimentAction — error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects with error when no session", async () => {
    mockedGetSession.mockResolvedValueOnce(null as any);

    const error = await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "fb-1" }),
    ).catch((e) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("REDIRECT:");
    expect((error as Error).message).toContain("type=error");
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("redirects with error when role is SISWA", async () => {
    mockedGetSession.mockResolvedValueOnce(makeSession(Role.SISWA));

    const error = await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "fb-1" }),
    ).catch((e) => e);

    expect((error as Error).message).toContain("tidak+memiliki+akses");
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("redirects with error when feedback not found", async () => {
    mockedGetSession.mockResolvedValueOnce(makeSession(Role.ADMIN));
    mockedFindFirst.mockResolvedValueOnce(null);

    const error = await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "missing" }),
    ).catch((e) => e);

    expect((error as Error).message).toContain("tidak+ditemukan");
    expect(mockedPredict).not.toHaveBeenCalled();
  });

  it("redirects with error when feedback has no sentiment", async () => {
    mockedGetSession.mockResolvedValueOnce(makeSession(Role.ADMIN));
    mockedFindFirst.mockResolvedValueOnce(
      makeFeedback({ sentiment: null }),
    );

    const error = await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "fb-1" }),
    ).catch((e) => e);

    expect((error as Error).message).toContain("tidak+ditemukan");
    expect(mockedPredict).not.toHaveBeenCalled();
  });

  it("redirects with error when GURU has no teacher profile", async () => {
    mockedGetSession.mockResolvedValueOnce(makeSession(Role.GURU));
    mockedTeacherFindUnique.mockResolvedValueOnce(null);

    const error = await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "fb-1" }),
    ).catch((e) => e);

    expect((error as Error).message).toContain("Profil+guru+tidak+ditemukan");
  });

  it("redirects with error when feedbackId is empty (zod)", async () => {
    mockedGetSession.mockResolvedValueOnce(makeSession(Role.ADMIN));

    const error = await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "" }),
    ).catch((e) => e);

    expect(mockedFindFirst).not.toHaveBeenCalled();
  });
});

describe("reanalyzeSingleSentimentAction — AUTO label", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSession.mockResolvedValue(makeSession(Role.ADMIN));
    mockedFindFirst.mockResolvedValue(
      makeFeedback({ sentiment: { id: "sent-1", labelSource: LabelSource.AUTO, manualLabel: null } }),
    );
    mockedPredict.mockResolvedValue(makePrediction());
    mockedUpdate.mockResolvedValue({} as any);
    mockedRecordActivity.mockResolvedValue(undefined);
  });

  it("calls predictSentiment with feedback data", async () => {
    await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "fb-1" }),
    ).catch(() => {});

    expect(mockedPredict).toHaveBeenCalledWith({
      aspect: "MATERI",
      comment: "Materinya bagus",
      subject: "Agama",
    });
  });

  it("updates with AUTO data: overwrites finalLabel + clears manual fields", async () => {
    await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "fb-1" }),
    ).catch(() => {});

    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sent-1" },
        data: expect.objectContaining({
          autoLabel: SentimentLabel.POSITIF,
          autoConfidence: 0.85,
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

  it("records admin activity for ADMIN", async () => {
    await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "fb-1" }),
    ).catch(() => {});

    expect(mockedRecordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
        entityType: "MAPEL",
      }),
    );
  });

  it("does not record admin activity for GURU", async () => {
    mockedGetSession.mockResolvedValueOnce(makeSession(Role.GURU));
    mockedTeacherFindUnique.mockResolvedValueOnce({ id: "teacher-1" } as any);

    await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "fb-1" }),
    ).catch(() => {});

    expect(mockedRecordActivity).not.toHaveBeenCalled();
  });
});

describe("reanalyzeSingleSentimentAction — MANUAL label preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSession.mockResolvedValue(makeSession(Role.ADMIN));
    mockedFindFirst.mockResolvedValue(
      makeFeedback({
        sentiment: { id: "sent-1", labelSource: LabelSource.MANUAL, manualLabel: null },
      }),
    );
    mockedPredict.mockResolvedValue(makePrediction());
    mockedUpdate.mockResolvedValue({} as any);
  });

  it("preserves MANUAL: updates autoLabel only, does NOT touch finalLabel/manualLabel", async () => {
    await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "fb-1" }),
    ).catch(() => {});

    const updateData = mockedUpdate.mock.calls[0][0].data;
    expect(updateData).toHaveProperty("autoLabel", SentimentLabel.POSITIF);
    expect(updateData).toHaveProperty("autoConfidence", 0.85);
    expect(updateData).not.toHaveProperty("finalLabel");
    expect(updateData).not.toHaveProperty("manualLabel");
    expect(updateData).not.toHaveProperty("labelSource");
    expect(updateData).not.toHaveProperty("reviewNotes");
    expect(updateData).not.toHaveProperty("reviewedAt");
    expect(updateData).not.toHaveProperty("reviewedByUserId");
  });
});

describe("reanalyzeVisibleSentimentsAction — mass reanalyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSession.mockResolvedValue(makeSession(Role.ADMIN));
    mockedPredict.mockResolvedValue(makePrediction());
    mockedUpdate.mockResolvedValue({} as any);
    mockedRecordActivity.mockResolvedValue(undefined);
  });

  it("redirects with error when no feedbacks found", async () => {
    mockedFindMany.mockResolvedValueOnce([]);

    const error = await reanalyzeVisibleSentimentsAction(
      makeFormData({}),
    ).catch((e) => e);

    expect((error as Error).message).toContain("ada+data");
    expect(mockedPredict).not.toHaveBeenCalled();
  });

  it("processes all feedbacks and updates each sentiment", async () => {
    mockedFindMany.mockResolvedValueOnce([
      makeFeedback({ id: "fb-1", sentiment: { id: "sent-1", labelSource: LabelSource.AUTO, manualLabel: null } }),
      makeFeedback({ id: "fb-2", sentiment: { id: "sent-2", labelSource: LabelSource.AUTO, manualLabel: null } }),
    ]);

    await reanalyzeVisibleSentimentsAction(
      makeFormData({}),
    ).catch(() => {});

    expect(mockedPredict).toHaveBeenCalledTimes(2);
    expect(mockedUpdate).toHaveBeenCalledTimes(2);
  });

  it("preserves MANUAL labels in mass reanalyze", async () => {
    mockedFindMany.mockResolvedValueOnce([
      makeFeedback({
        id: "fb-1",
        sentiment: { id: "sent-1", labelSource: LabelSource.MANUAL, manualLabel: null },
      }),
      makeFeedback({
        id: "fb-2",
        sentiment: { id: "sent-2", labelSource: LabelSource.AUTO, manualLabel: null },
      }),
    ]);

    await reanalyzeVisibleSentimentsAction(
      makeFormData({}),
    ).catch(() => {});

    const manualUpdate = mockedUpdate.mock.calls[0][0].data;
    const autoUpdate = mockedUpdate.mock.calls[1][0].data;

    expect(manualUpdate).not.toHaveProperty("finalLabel");
    expect(autoUpdate).toHaveProperty("finalLabel", SentimentLabel.POSITIF);
    expect(autoUpdate).toHaveProperty("labelSource", LabelSource.AUTO);
  });

  it("limits to 40 feedbacks (take param)", async () => {
    mockedFindMany.mockResolvedValueOnce([]);

    await reanalyzeVisibleSentimentsAction(
      makeFormData({}),
    ).catch(() => {});

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 40,
      }),
    );
  });

  it("skips feedbacks with null sentiment", async () => {
    mockedFindMany.mockResolvedValueOnce([
      makeFeedback({ id: "fb-1", sentiment: null }),
      makeFeedback({ id: "fb-2", sentiment: { id: "sent-2", labelSource: LabelSource.AUTO, manualLabel: null } }),
    ]);

    await reanalyzeVisibleSentimentsAction(
      makeFormData({}),
    ).catch(() => {});

    expect(mockedPredict).toHaveBeenCalledTimes(1);
    expect(mockedUpdate).toHaveBeenCalledTimes(1);
  });
});
