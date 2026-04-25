"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { AnswerOption } from "@prisma/client";

import { useConfirmDialog } from "@/components/ui/confirm-dialog-provider";
import { useToast } from "@/components/ui/toast-provider";

type TryoutQuestionItem = {
  id: string;
  orderNumber: number;
  question: {
    id: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    questionText: string;
  };
};

type TryoutExamClientProps = {
  durationMinutes: number | null;
  errorRedirectPath: string;
  questions: TryoutQuestionItem[];
  subjectName: string;
  submitAction: (formData: FormData) => Promise<void>;
  successRedirectPath: string;
  title: string;
  tryoutId: string;
};

const EXAM_WARNING_THRESHOLD_SECONDS = 5 * 60;

export function TryoutExamClient({
  durationMinutes,
  errorRedirectPath,
  questions,
  subjectName,
  submitAction,
  successRedirectPath,
  title,
  tryoutId,
}: TryoutExamClientProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, AnswerOption>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(
    durationMinutes ? durationMinutes * 60 : null,
  );
  const questionRefs = useRef<Record<number, HTMLElement | null>>({});
  const isTimeWarningShownRef = useRef(false);
  const isTimeUpShownRef = useRef(false);
  const answeredCount = Object.keys(selectedAnswers).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const markedCount = Object.values(markedQuestions).filter(Boolean).length;
  const paletteLabel = durationMinutes ? "Sisa Waktu" : "Mode Waktu";
  const timerToneClass =
    remainingSeconds !== null && remainingSeconds <= EXAM_WARNING_THRESHOLD_SECONDS
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700";
  const { showToast } = useToast();

  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((currentSeconds) => {
        if (currentSeconds === null) {
          return null;
        }

        if (currentSeconds <= 1) {
          clearInterval(timer);
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [remainingSeconds]);

  useEffect(() => {
    if (
      remainingSeconds === null ||
      remainingSeconds > EXAM_WARNING_THRESHOLD_SECONDS ||
      isTimeWarningShownRef.current
    ) {
      return;
    }

    isTimeWarningShownRef.current = true;
    showToast({
      message: "Waktu ujian tinggal 5 menit. Periksa kembali jawabanmu sebelum dikirim.",
      type: "info",
    });
  }, [remainingSeconds, showToast]);

  useEffect(() => {
    if (remainingSeconds !== 0 || isTimeUpShownRef.current) {
      return;
    }

    isTimeUpShownRef.current = true;
    showToast({
      message: "Waktu ujian telah habis. Segera kirim jawabanmu sekarang.",
      type: "error",
    });
  }, [remainingSeconds, showToast]);

  const questionPaletteItems = useMemo(
    () =>
      questions.map((item) => ({
        isAnswered: Boolean(selectedAnswers[item.question.id]),
        isMarked: Boolean(markedQuestions[item.question.id]),
        questionId: item.question.id,
        orderNumber: item.orderNumber,
      })),
    [markedQuestions, questions, selectedAnswers],
  );

  const timerLabel =
    remainingSeconds === null
      ? "Fleksibel"
      : `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(
          remainingSeconds % 60,
        ).padStart(2, "0")}`;

  return (
    <form action={submitAction} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="tryoutId" value={tryoutId} />
      <input type="hidden" name="errorRedirectPath" value={errorRedirectPath} />
      <input type="hidden" name="successRedirectPath" value={successRedirectPath} />

      <div className="grid min-h-0 flex-1 gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-h-0 space-y-4 overflow-y-auto pr-1">
          {questions.map((item) => (
            <article
              key={item.id}
              id={`soal-${item.orderNumber}`}
              ref={(element) => {
                questionRefs.current[item.orderNumber] = element;
              }}
              className="rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Soal {item.orderNumber}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    selectedAnswers[item.question.id]
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {selectedAnswers[item.question.id] ? "Sudah dijawab" : "Belum dijawab"}
                </span>
                {markedQuestions[item.question.id] ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    Ragu-ragu
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-800">
                {item.question.questionText}
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <AnswerChoice
                  checked={selectedAnswers[item.question.id] === "A"}
                  label="A"
                  name={`answer_${item.question.id}`}
                  onChange={(value) => {
                    setSelectedAnswers((currentAnswers) => ({
                      ...currentAnswers,
                      [item.question.id]: value,
                    }));
                  }}
                  text={item.question.optionA}
                />
                <AnswerChoice
                  checked={selectedAnswers[item.question.id] === "B"}
                  label="B"
                  name={`answer_${item.question.id}`}
                  onChange={(value) => {
                    setSelectedAnswers((currentAnswers) => ({
                      ...currentAnswers,
                      [item.question.id]: value,
                    }));
                  }}
                  text={item.question.optionB}
                />
                <AnswerChoice
                  checked={selectedAnswers[item.question.id] === "C"}
                  label="C"
                  name={`answer_${item.question.id}`}
                  onChange={(value) => {
                    setSelectedAnswers((currentAnswers) => ({
                      ...currentAnswers,
                      [item.question.id]: value,
                    }));
                  }}
                  text={item.question.optionC}
                />
                <AnswerChoice
                  checked={selectedAnswers[item.question.id] === "D"}
                  label="D"
                  name={`answer_${item.question.id}`}
                  onChange={(value) => {
                    setSelectedAnswers((currentAnswers) => ({
                      ...currentAnswers,
                      [item.question.id]: value,
                    }));
                  }}
                  text={item.question.optionD}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMarkedQuestions((currentMarked) => ({
                      ...currentMarked,
                      [item.question.id]: !currentMarked[item.question.id],
                    }));
                  }}
                  className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                    markedQuestions[item.question.id]
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                  }`}
                >
                  {markedQuestions[item.question.id] ? "Batalkan Tanda" : "Ragu-ragu / Tandai Soal"}
                </button>
                <span className="text-sm text-slate-500">
                  Gunakan tanda ini untuk menandai soal yang ingin kamu cek lagi sebelum submit.
                </span>
              </div>
            </article>
          ))}
        </section>

        <aside className="space-y-4">
          <div className="rounded-[1.7rem] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_22px_54px_rgba(15,23,42,0.14)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
                  Ringkasan Ujian
                </p>
                <h2 className="mt-3 text-lg font-semibold tracking-tight">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{subjectName}</p>
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${timerToneClass}`}
              >
                {paletteLabel}
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              <ExamMetaItem label="Sisa waktu" value={timerLabel} />
              <ExamMetaItem label="Sudah dijawab" value={`${answeredCount}`} />
              <ExamMetaItem label="Belum dijawab" value={`${unansweredCount}`} />
              <ExamMetaItem label="Ditandai" value={`${markedCount}`} />
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-300">
              Pastikan semua soal terjawab sebelum kamu mengirim tryout ini. Setelah dikirim,
              hasil langsung tersimpan dan tidak bisa diulang.
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Nomor Soal
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Hijau sudah dijawab, kuning ditandai ragu-ragu.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  Answered
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                  Marked
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5">
              {questionPaletteItems.map((item) => (
                <button
                  key={item.orderNumber}
                  type="button"
                  onClick={() => {
                    questionRefs.current[item.orderNumber]?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                  className={`inline-flex h-11 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                    item.isMarked
                      ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : item.isAnswered
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  {item.orderNumber}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-slate-200/80 bg-white p-5">
            <ConfirmExamSubmitButton
              answeredCount={answeredCount}
              totalQuestions={questions.length}
            />
            <p className="mt-3 text-center text-xs leading-6 text-slate-500">
              Konfirmasi akan muncul sebelum jawaban dikirim ke sistem.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}

function AnswerChoice({
  checked,
  label,
  name,
  onChange,
  text,
}: {
  checked: boolean;
  label: AnswerOption;
  name: string;
  onChange: (value: AnswerOption) => void;
  text: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-[1.3rem] border px-4 py-3 text-sm transition ${
        checked
          ? "border-sky-300 bg-sky-50/80 text-sky-900 shadow-[0_10px_24px_rgba(14,165,233,0.08)]"
          : "border-slate-200/80 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50/40"
      }`}
    >
      <input
        checked={checked}
        name={name}
        type="radio"
        value={label}
        required
        onChange={() => onChange(label)}
        className="mt-1 h-4 w-4 border-slate-300 text-sky-600"
      />
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Opsi {label}
        </span>
        <span className="mt-1 block leading-6">{text}</span>
      </span>
    </label>
  );
}

function ExamMetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function ConfirmExamSubmitButton({
  answeredCount,
  totalQuestions,
}: {
  answeredCount: number;
  totalQuestions: number;
}) {
  const formRef = useRef<HTMLButtonElement | null>(null);
  const { pending } = useFormStatus();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  return (
    <button
      ref={formRef}
      type="button"
      disabled={pending}
      onClick={async () => {
        if (unansweredCount > 0) {
          showToast({
            message: `Masih ada ${unansweredCount} soal yang belum dijawab. Lengkapi dulu sebelum mengirim.`,
            type: "error",
          });
          return;
        }

        const isConfirmed = await confirm({
          confirmLabel: "Ya, kirim jawaban",
          message:
            "Periksa kembali jawabanmu. Setelah dikirim, tryout akan langsung dinilai dan tidak bisa dikerjakan ulang.",
          title: "Kirim jawaban ujian sekarang?",
          variant: "neutral",
        });

        if (!isConfirmed) {
          return;
        }

        formRef.current?.form?.requestSubmit();
      }}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <SpinnerIcon />
          Mengirim...
        </>
      ) : (
        "Kirim Jawaban Tryout"
      )}
    </button>
  );
}

function SpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 animate-spin"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        className="stroke-white/35"
        strokeWidth="2.5"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        className="stroke-white"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}
