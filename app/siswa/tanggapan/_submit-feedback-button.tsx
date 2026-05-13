"use client";

import { useFormStatus } from "react-dom";

export function SubmitFeedbackButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Menyimpan tanggapan..." : "Simpan Tanggapan"}
    </button>
  );
}
