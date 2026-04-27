"use client";

import { useEffect, useState } from "react";

type ExamHeaderTimerProps = {
  durationMinutes: number | null;
};

export function ExamHeaderTimer({ durationMinutes }: ExamHeaderTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(
    durationMinutes ? durationMinutes * 60 : null,
  );

  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((currentSeconds) => {
        if (currentSeconds === null) {
          return null;
        }

        if (currentSeconds <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [remainingSeconds]);

  if (remainingSeconds === null) {
    return (
      <div className="rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Waktu Ujian
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">Fleksibel</p>
      </div>
    );
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const toneClass =
    remainingSeconds <= 5 * 60
      ? "text-amber-600"
      : "text-slate-900";

  return (
    <div className="rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Waktu Ujian
      </p>
      <p className={`mt-1 text-sm font-semibold ${toneClass}`}>
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </p>
    </div>
  );
}
