import { AutoMethod, LearningAspect, SentimentLabel } from "@prisma/client";

type PredictSentimentInput = {
  aspect: LearningAspect;
  comment: string;
  subject: string;
};

type PredictSentimentResult = {
  autoConfidence: number;
  autoLabel: SentimentLabel;
  autoMethod: AutoMethod;
  modelVersion: string | null;
  preprocessedText: string | null;
};

type ServiceResponse = {
  autoMethod?: string;
  confidence?: number;
  label?: string;
  modelVersion?: string;
  preprocessedText?: string;
};

const DEFAULT_SERVICE_URL = "http://127.0.0.1:8000";

function getSentimentServiceUrl() {
  return (process.env.SENTIMENT_ANALYSIS_SERVICE_URL ?? DEFAULT_SERVICE_URL).replace(/\/$/, "");
}

function coerceSentimentLabel(value: string | undefined): SentimentLabel {
  const normalized = value?.trim().toUpperCase();

  if (normalized === SentimentLabel.POSITIF) {
    return SentimentLabel.POSITIF;
  }

  return SentimentLabel.NEGATIF;
}

function coerceAutoMethod(value: string | undefined): AutoMethod {
  return value?.trim().toUpperCase() === AutoMethod.NAIVE_BAYES
    ? AutoMethod.NAIVE_BAYES
    : AutoMethod.LEXICON;
}

export async function predictSentiment({
  aspect,
  comment,
  subject,
}: PredictSentimentInput): Promise<PredictSentimentResult> {
  const response = await fetch(`${getSentimentServiceUrl()}/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      aspect,
      comment,
      subject,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Gagal menganalisis sentimen. Service merespons ${response.status}.`);
  }

  const payload = (await response.json()) as ServiceResponse;

  return {
    autoConfidence:
      typeof payload.confidence === "number" && Number.isFinite(payload.confidence)
        ? payload.confidence
        : 0,
    autoLabel: coerceSentimentLabel(payload.label),
    autoMethod: coerceAutoMethod(payload.autoMethod),
    modelVersion: typeof payload.modelVersion === "string" ? payload.modelVersion : null,
    preprocessedText: typeof payload.preprocessedText === "string" ? payload.preprocessedText : null,
  };
}
