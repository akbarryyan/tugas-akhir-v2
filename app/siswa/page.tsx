export default function SiswaPage() {
  return (
    <section className="grid gap-6 md:grid-cols-3">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Informasi
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">
          Halaman Siswa
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Di sini kamu bisa ikut tryout, lihat hasilnya, dan kasih tanggapan
          setelah selesai.
        </p>
      </div>

      <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Tryout
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">
          Daftar Mata Pelajaran
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Pilih mata pelajaran yang tersedia, lalu kerjakan tryout sesuai arahan
          yang diberikan.
        </p>
      </div>

      <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-6 shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Setelah Selesai
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-950">
          Hasil dan Tanggapan
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Setelah tryout selesai, kamu bisa lihat hasilnya lalu isi tanggapan
          tentang kegiatan belajar.
        </p>
      </div>
    </section>
  );
}
