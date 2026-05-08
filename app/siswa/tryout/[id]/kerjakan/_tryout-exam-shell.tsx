"use client";

import Image from "next/image";
import { useState } from "react";

import { ExamHeaderTimer } from "@/app/siswa/tryout/[id]/kerjakan/_exam-header-timer";
import { TryoutExamClient } from "@/app/siswa/tryout/[id]/kerjakan/_tryout-exam-client";

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

type TryoutExamShellProps = {
  durationMinutes: number | null;
  errorRedirectPath: string;
  participantCode: string;
  questions: TryoutQuestionItem[];
  studentEmail: string | null;
  studentImage: string | null;
  studentName: string | null;
  subjectName: string;
  submitAction: (formData: FormData) => Promise<void>;
  successRedirectPath: string;
  title: string;
  tryoutCode: string;
  tryoutId: string;
};

export function TryoutExamShell({
  durationMinutes,
  errorRedirectPath,
  participantCode,
  questions,
  studentEmail,
  studentImage,
  studentName,
  subjectName,
  submitAction,
  successRedirectPath,
  title,
  tryoutCode,
  tryoutId,
}: TryoutExamShellProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  return (
    <>
      <header className="border-b border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
                {subjectName}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                {questions.length} soal
              </span>
              {durationMinutes ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  {durationMinutes} menit
                </span>
              ) : null}
            </div>
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                Mode Ujian CBT
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
                {title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {hasStarted
                  ? "Fokus kerjakan soal satu per satu. Setelah dikirim, hasil tryout langsung tersimpan dan tidak bisa dikerjakan ulang."
                  : "Baca petunjuk dan aturan pengerjaan terlebih dulu. Waktu ujian baru berjalan setelah kamu menekan tombol mulai dari layar persiapan."}
              </p>
            </div>
          </div>

          <div className="shrink-0 space-y-3">
            <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50 px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <StudentProfileAvatar image={studentImage} name={studentName} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Peserta Ujian
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {studentName ?? "Siswa"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {studentEmail ?? "Profil siswa aktif"}
                  </p>
                </div>
              </div>
            </div>
            <ExamHeaderTimer
              durationMinutes={durationMinutes}
              hasStarted={hasStarted}
            />
          </div>
        </div>
      </header>

      <TryoutExamClient
        durationMinutes={durationMinutes}
        errorRedirectPath={errorRedirectPath}
        hasStarted={hasStarted}
        onStart={() => {
          setStartedAt(new Date());
          setHasStarted(true);
        }}
        participantCode={participantCode}
        questions={questions}
        startedAt={startedAt}
        studentName={studentName}
        subjectName={subjectName}
        submitAction={submitAction}
        successRedirectPath={successRedirectPath}
        title={title}
        tryoutCode={tryoutCode}
        tryoutId={tryoutId}
      />
    </>
  );
}

function StudentProfileAvatar({
  image,
  name,
}: {
  image: string | null;
  name: string | null;
}) {
  const initials = (name ?? "Siswa")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  if (image) {
    return (
      <Image
        src={image}
        alt={name ?? "Foto profil siswa"}
        width={44}
        height={44}
        className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,_#60a5fa,_#2563eb_72%)] text-sm font-semibold text-white ring-2 ring-white">
      {initials || "S"}
    </div>
  );
}
