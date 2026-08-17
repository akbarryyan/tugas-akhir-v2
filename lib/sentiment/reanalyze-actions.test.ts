import { AuthMethod, AutoMethod, LabelSource, Role, SentimentLabel } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    feedback: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    sentimentAnalysis: {
      upsert: vi.fn(),
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
    // Meniru perilaku asli Next.js App Router: redirect() melempar Error
    // ber-message "NEXT_REDIRECT" dan menaruh tujuannya di properti digest.
    const error = new Error("NEXT_REDIRECT") as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;push;${path};307;`;
    throw error;
  }),
}));

import { recordAdminActivity } from "@/lib/admin/activity";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { predictSentiment } from "@/lib/nlp/sentiment-analysis";
import { redirect } from "next/navigation";
import {
  reanalyzeSingleSentimentAction,
  reanalyzeVisibleSentimentsAction,
} from "@/lib/sentiment/reanalyze-actions";

function redirectUrl(error: unknown) {
  const digest = String((error as { digest?: string }).digest ?? "");
  return digest.split(";").slice(2, -2).join(";");
}

const mockedFindFirst = vi.mocked(prisma.feedback.findFirst);
const mockedFindMany = vi.mocked(prisma.feedback.findMany);
const mockedUpsert = vi.mocked(prisma.sentimentAnalysis.upsert);
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
    expect((error as Error).message).toBe("NEXT_REDIRECT");
    expect(redirectUrl(error)).toContain("type=error");
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("redirects with error when role is SISWA", async () => {
    mockedGetSession.mockResolvedValueOnce(makeSession(Role.SISWA));

    const error = await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "fb-1" }),
    ).catch((e) => e);

    expect(redirectUrl(error)).toContain("tidak+memiliki+akses");
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("redirects with error when feedback not found", async () => {
    mockedGetSession.mockResolvedValueOnce(makeSession(Role.ADMIN));
    mockedFindFirst.mockResolvedValueOnce(null);

    const error = await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "missing" }),
    ).catch((e) => e);

    expect(redirectUrl(error)).toContain("tidak+ditemukan");
    expect(mockedPredict).not.toHaveBeenCalled();
  });

  it("creates the sentiment row when feedback has none yet", async () => {
    mockedGetSession.mockResolvedValueOnce(makeSession(Role.ADMIN));
    mockedFindFirst.mockResolvedValueOnce(
      makeFeedback({ id: "feedback-1", sentiment: null }),
    );
    mockedPredict.mockResolvedValueOnce({
      autoConfidence: 0.85,
      autoLabel: SentimentLabel.POSITIF,
      autoMethod: AutoMethod.NAIVE_BAYES,
      modelVersion: "nb-v1",
      preprocessedText: "materi jelas",
    });
    mockedUpsert.mockResolvedValueOnce({} as never);

    const error = await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "feedback-1" }),
    ).catch((e) => e);

    expect(redirectUrl(error)).toContain("type=success");
    expect(mockedPredict).toHaveBeenCalledTimes(1);
    expect(mockedUpsert.mock.calls[0][0].create).toEqual(
      expect.objectContaining({ feedbackId: "feedback-1" }),
    );
  });

  it("redirects with error when GURU has no teacher profile", async () => {
    mockedGetSession.mockResolvedValueOnce(makeSession(Role.GURU));
    mockedTeacherFindUnique.mockResolvedValueOnce(null);

    const error = await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "fb-1" }),
    ).catch((e) => e);

    expect(redirectUrl(error)).toContain("Profil+guru+tidak+ditemukan");
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
    mockedUpsert.mockResolvedValue({} as any);
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

    expect(mockedUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { feedbackId: "feedback-1" },
        update: expect.objectContaining({
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
    mockedUpsert.mockResolvedValue({} as any);
  });

  it("preserves MANUAL: updates autoLabel only, does NOT touch finalLabel/manualLabel", async () => {
    await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "fb-1" }),
    ).catch(() => {});

    const updateData = mockedUpsert.mock.calls[0][0].update;
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
    mockedUpsert.mockResolvedValue({} as any);
    mockedRecordActivity.mockResolvedValue(undefined);
  });

  it("redirects with error when no feedbacks found", async () => {
    mockedFindMany.mockResolvedValueOnce([]);

    const error = await reanalyzeVisibleSentimentsAction(
      makeFormData({}),
    ).catch((e) => e);

    expect(redirectUrl(error)).toContain("ada+data");
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
    expect(mockedUpsert).toHaveBeenCalledTimes(2);
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

    const manualUpdate = mockedUpsert.mock.calls[0][0].update;
    const autoUpdate = mockedUpsert.mock.calls[1][0].update;

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

  it("also analyses feedback that has no sentiment row yet", async () => {
    // Terjadi ketika layanan analisis sedang mati saat siswa mengirim
    // tanggapan. Baris seperti ini justru yang paling perlu dipulihkan, jadi
    // reanalyze harus membuat baris sentimennya, bukan melewatinya.
    mockedFindMany.mockResolvedValueOnce([
      makeFeedback({ id: "fb-1", sentiment: null }),
      makeFeedback({ id: "fb-2", sentiment: { id: "sent-2", labelSource: LabelSource.AUTO, manualLabel: null } }),
    ]);

    await reanalyzeVisibleSentimentsAction(
      makeFormData({}),
    ).catch(() => {});

    expect(mockedPredict).toHaveBeenCalledTimes(2);
    expect(mockedUpsert).toHaveBeenCalledTimes(2);
    expect(mockedUpsert.mock.calls[0][0].where).toEqual({ feedbackId: "fb-1" });
    expect(mockedUpsert.mock.calls[0][0].create).toEqual(
      expect.objectContaining({
        feedbackId: "fb-1",
        finalLabel: SentimentLabel.POSITIF,
        labelSource: LabelSource.AUTO,
      }),
    );
  });
});

describe("reanalyze — jalur sukses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSession.mockResolvedValue(makeSession(Role.ADMIN));
    mockedPredict.mockResolvedValue(makePrediction());
    mockedUpsert.mockResolvedValue({} as any);
    mockedRecordActivity.mockResolvedValue(undefined);
  });

  it("reanalyze satu data: redirect sukses tidak berubah jadi NEXT_REDIRECT", async () => {
    mockedFindFirst.mockResolvedValueOnce(
      makeFeedback({ sentiment: { id: "sent-1", labelSource: LabelSource.AUTO, manualLabel: null } }),
    );

    const error = await reanalyzeSingleSentimentAction(
      makeFormData({ feedbackId: "fb-1" }),
    ).catch((e) => e);

    expect((error as Error).message).toBe("NEXT_REDIRECT");
    expect(redirectUrl(error)).toContain("type=success");
    expect(redirectUrl(error)).not.toContain("NEXT_REDIRECT");
    expect(vi.mocked(redirect)).toHaveBeenCalledTimes(1);
  });

  it("reanalyze massal: redirect sukses tidak berubah jadi NEXT_REDIRECT", async () => {
    mockedFindMany.mockResolvedValueOnce([
      makeFeedback({ id: "fb-1", sentiment: { id: "sent-1", labelSource: LabelSource.AUTO, manualLabel: null } }),
    ]);

    const error = await reanalyzeVisibleSentimentsAction(
      makeFormData({}),
    ).catch((e) => e);

    expect(redirectUrl(error)).toContain("type=success");
    expect(redirectUrl(error)).not.toContain("NEXT_REDIRECT");
    expect(vi.mocked(redirect)).toHaveBeenCalledTimes(1);
  });
});
