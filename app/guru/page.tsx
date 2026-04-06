export default function GuruPage() {
  return (
    <section className="grid gap-6 md:grid-cols-3">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Informasi
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">
          Ruang Kerja Guru
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Gunakan halaman ini untuk mengelola instrumen evaluasi, menelaah hasil
          siswa, dan memantau tanggapan siswa.
        </p>
      </div>

      <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Kegiatan Belajar
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">
          Soal dan Hasil Evaluasi
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Guru dapat menyiapkan soal sesuai mata pelajaran yang diampu serta
          meninjau hasil pengerjaan siswa secara berkala.
        </p>
      </div>

      <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Umpan Balik
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">
          Refleksi Pembelajaran
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Guru dapat menelaah tanggapan siswa sebagai bahan evaluasi untuk
          meningkatkan proses pembelajaran di kelas.
        </p>
      </div>
    </section>
  );
}
