# Technical Plan

## 1. Audit Implementasi Saat Ini

Dokumen acuan fitur:
- `docs/detail-project.md`

### Status Implementasi

**Sudah terimplementasi (Tahap 1-8 selesai):**

| Tahap | Fitur | Status |
|-------|-------|--------|
| 1 | Fondasi Domain dan Database | Selesai |
| 2 | Autentikasi dan Otorisasi | Selesai |
| 3 | Modul Master Data Admin | Selesai |
| 4 | Modul Bank Soal Guru | Selesai |
| 5 | Modul Tryout Siswa | Selesai |
| 6 | Modul Feedback | Selesai |
| 7 | Integrasi Service NLP | Selesai |
| 8 | Dashboard dan Analitik | Selesai |

### Detail Implementasi

#### Tahap 1: Fondasi Domain dan Database
- [x] `prisma/schema.prisma` — 15 model dengan relasi lengkap
- [x] Koneksi MariaDB via `@prisma/adapter-mariadb`
- [x] Migration tersimpan di `prisma/migrations/`
- [x] Seed data awal di `prisma/seed.mjs`

#### Tahap 2: Autentikasi dan Otorisasi
- [x] NextAuth v4 dengan CredentialsProvider
- [x] Login admin/guru: email + password (scrypt hash)
- [x] Login siswa: NISN (tanpa password)
- [x] JWT strategy dengan role di token
- [x] `requireRole()` guard di setiap layout
- [x] Redirect ke dashboard sesuai role

#### Tahap 3: Modul Master Data Admin
- [x] CRUD guru (create, update, delete, import Excel)
- [x] CRUD siswa (create, update, delete, import Excel)
- [x] CRUD mata pelajaran (create, update, delete, toggle status, import Excel)
- [x] Assignment guru pengampu ke mata pelajaran
- [x] Preview sebelum import Excel (validasi duplikat, format)
- [x] Audit log aktivitas admin

#### Tahap 4: Modul Bank Soal Guru
- [x] Guru melihat mapel yang diampu
- [x] CRUD soal per mapel (pilihan ganda A/B/C/D)
- [x] Bank soal (kumpulan soal)

#### Tahap 5: Modul Tryout Siswa
- [x] Guru buat tryout dari bank soal
- [x] Publish tryout
- [x] Siswa lihat daftar tryout tersedia
- [x] Siswa kerjakan tryout (timer)
- [x] Submit jawaban → skor otomatis
- [x] Histori tryout (TryoutSession + TryoutAnswer)

#### Tahap 6: Modul Feedback
- [x] 3 aspek wajib: MATERI, PENYAMPAIAN, SOAL
- [x] Form feedback setelah submit tryout
- [x] Constraint: 1 feedback per aspek per session

#### Tahap 7: Integrasi Service NLP
- [x] FastAPI service terpisah (`sentiment-analysis-service/`)
- [x] Endpoint `POST /predict` — klasifikasi sentimen
- [x] Preprocessing: Sastrawi (stopword + stemming), keep negasi
- [x] Pipeline: TF-IDF + MultinomialNB
- [x] Integrasi dari Next.js ke FastAPI via HTTP
- [x] Penyimpanan hasil analisis ke `SentimentAnalysis`
- [x] Review manual (admin/guru bisa override label)
- [x] Reanalyze massal dan per-item
- [x] Export dataset untuk training
- [x] Training script dengan auto-download dari admin export

#### Tahap 8: Dashboard dan Analitik
- [x] Dashboard admin global (statistik, cakupan pengampu, status tryout)
- [x] Dashboard guru per mata pelajaran
- [x] Review sentimen per mapel dan aspek
- [x] Tabel feedback

---

## 2. Rancangan Domain Sistem

### Role

Sistem memiliki 3 role utama:
- `ADMIN`
- `GURU`
- `SISWA`

### Metode Autentikasi

Sistem menggunakan autentikasi campuran:
- `ADMIN`: login dengan email dan password
- `GURU`: login dengan email dan password
- `SISWA`: login dengan `NISN` saja

Catatan:
- Siswa tidak melalui proses registrasi mandiri.
- Akun siswa disiapkan oleh admin dari data master siswa.
- Password di-hash dengan `scrypt` (Node.js crypto), bukan bcrypt.

### Entitas Inti

#### 1. User
Menyimpan akun login untuk semua role.

Field:
- `id` (cuid)
- `name`
- `email` (opsional, dipakai untuk admin dan guru)
- `avatarUrl` (opsional)
- `passwordHash` (opsional, dipakai untuk admin dan guru)
- `role` (enum: ADMIN, GURU, SISWA)
- `authMethod` (enum: EMAIL_PASSWORD, NISN)
- `createdAt`
- `updatedAt`

#### 2. TeacherProfile
Menyimpan data tambahan guru.

Field:
- `id`
- `userId` (unique)
- `nip` (unique)
- `createdAt`
- `updatedAt`

#### 3. StudentProfile
Menyimpan data tambahan siswa.

Field:
- `id`
- `userId` (unique)
- `nisn` (unique)
- `className`
- `createdAt`
- `updatedAt`

#### 4. Subject
Mata pelajaran tryout.

Field:
- `id`
- `name` (unique)
- `description` (opsional, Text)
- `isActive` (default: true)
- `createdAt`
- `updatedAt`

#### 5. SubjectTeacher
Relasi guru pengampu ke mata pelajaran.

Field:
- `id`
- `subjectId`
- `teacherId`
- `createdAt`

Constraint: `@@unique([subjectId, teacherId])`

#### 6. Question
Soal tryout per mata pelajaran.

Field:
- `id`
- `subjectId`
- `createdByTeacherId`
- `questionText` (Text)
- `optionA` (Text)
- `optionB` (Text)
- `optionC` (Text)
- `optionD` (Text)
- `correctOption` (enum: A, B, C, D)
- `explanation` (opsional, Text)
- `isActive` (default: true)
- `createdAt`
- `updatedAt`

#### 7. BankSoal
Kumpulan soal.

Field:
- `id`
- `subjectId`
- `createdByTeacherId`
- `title`
- `description` (opsional, Text)
- `isActive` (default: true)
- `createdAt`
- `updatedAt`

#### 8. BankSoalQuestion
Relasi bank soal ke soal.

Field:
- `id`
- `bankSoalId`
- `questionId`
- `orderNumber`

Constraint: `@@unique([bankSoalId, questionId])`, `@@unique([bankSoalId, orderNumber])`

#### 9. Tryout
Paket tryout.

Field:
- `id`
- `subjectId`
- `bankSoalId` (opsional)
- `createdByTeacherId` (opsional)
- `title`
- `description` (opsional, Text)
- `isPublished` (default: false)
- `durationMinutes` (opsional)
- `createdAt`
- `updatedAt`

#### 10. TryoutQuestion
Relasi tryout ke soal.

Field:
- `id`
- `tryoutId`
- `questionId`
- `orderNumber`

Constraint: `@@unique([tryoutId, questionId])`, `@@unique([tryoutId, orderNumber])`

#### 11. TryoutSession
Sesi pengerjaan siswa.

Field:
- `id`
- `studentId`
- `tryoutId`
- `status` (enum: IN_PROGRESS, SUBMITTED, GRADED; default: IN_PROGRESS)
- `startedAt`
- `submittedAt` (opsional)
- `score` (opsional, Decimal(5,2))
- `totalQuestions` (default: 0)
- `correctAnswers` (default: 0)
- `createdAt`
- `updatedAt`

#### 12. TryoutAnswer
Jawaban per soal.

Field:
- `id`
- `tryoutSessionId`
- `questionId`
- `selectedOption` (enum: A, B, C, D)
- `isCorrect`
- `answeredAt`

Constraint: `@@unique([tryoutSessionId, questionId])`

#### 13. Feedback
Umpan balik siswa setelah tryout.

Field:
- `id`
- `studentId`
- `subjectId`
- `tryoutSessionId`
- `aspect` (enum: MATERI, PENYAMPAIAN, SOAL)
- `comment` (Text)
- `createdAt`

Constraint: `@@unique([tryoutSessionId, aspect])`

#### 14. SentimentAnalysis
Hasil klasifikasi sentimen.

Field:
- `id`
- `feedbackId` (unique)
- `autoLabel` (enum: POSITIF, NEGATIF, NETRAL)
- `autoConfidence` (opsional, Decimal(5,4))
- `autoMethod` (enum: LEXICON, NAIVE_BAYES)
- `manualLabel` (opsional, enum)
- `finalLabel` (enum)
- `labelSource` (enum: AUTO, MANUAL)
- `preprocessedText` (opsional, Text)
- `modelVersion` (opsional)
- `reviewedByUserId` (opsional)
- `reviewedAt` (opsional)
- `reviewNotes` (opsional, Text)
- `analyzedAt`
- `updatedAt`

---

## 3. Relasi Data yang Disarankan

Relasi inti:
- Satu `User` punya satu role.
- Satu `User` guru dapat punya satu `TeacherProfile`.
- Satu `User` siswa dapat punya satu `StudentProfile`.
- Satu `Subject` dapat punya banyak `Question`.
- Satu `Subject` dapat punya banyak `Tryout`.
- Satu `Subject` dapat punya banyak relasi `SubjectTeacher`.
- Satu `TeacherProfile` dapat mengampu banyak `Subject` lewat `SubjectTeacher`.
- Satu `Tryout` dapat punya banyak `TryoutQuestion`.
- Satu `Tryout` dapat punya banyak `TryoutSession`.
- Satu `StudentProfile` dapat punya banyak `TryoutSession`.
- Satu `TryoutSession` punya banyak `TryoutAnswer`.
- Satu `TryoutSession` dapat punya banyak `Feedback`.
- Satu `Feedback` memiliki satu hasil `SentimentAnalysis`.

## 4. Alur Sistem ke Model Data

### Alur siswa
1. Siswa login melalui `User`.
2. Siswa memilih `Tryout` yang tersedia (published).
3. Sistem membuat `TryoutSession`.
4. Sistem mengambil daftar soal dari `TryoutQuestion`, lalu tiap jawaban siswa disimpan ke `TryoutAnswer`.
5. Saat submit, sistem menghitung nilai dari `TryoutAnswer`, lalu memperbarui `TryoutSession`.
6. Setelah itu siswa mengirim 3 `Feedback` (MATERI, PENYAMPAIAN, SOAL).
7. Komentar feedback dikirim ke service NLP (`/predict`).
8. Hasil klasifikasi disimpan ke `SentimentAnalysis`.

### Alur guru
1. Guru login.
2. Guru hanya melihat `Subject` yang terhubung melalui `SubjectTeacher`.
3. Guru CRUD `Question` pada mata pelajaran yang diampu.
4. Guru menyusun `Tryout` dan memilih soal melalui `TryoutQuestion`.
5. Guru melihat `TryoutSession`, `Feedback`, dan `SentimentAnalysis` untuk tryout/mapelnya.
6. Guru bisa review manual sentimen pada mapel yang diampu.

### Alur admin
1. Admin login.
2. Admin mengelola `User`, `TeacherProfile`, `StudentProfile`, `Subject`, dan `SubjectTeacher`.
3. Admin melihat seluruh data tryout, feedback, dan dashboard agregat.
4. Admin bisa review/override sentimen, reanalyze, dan export dataset.
5. Semua aktivitas admin tercatat di audit log.

## 5. Struktur Folder Aplikasi

Struktur aktual implementasi:

```text
app/
  admin/
    guru/               # CRUD guru
    siswa/              # CRUD siswa
    mapel/              # CRUD mata pelajaran
    pengampu/           # Assignment guru → mapel
    tryout/             # Monitoring tryout
    feedback/           # Review sentimen + export
    aktivitas/          # Audit log
    import-template/
    profile/
    _actions.ts         # Server actions (CRUD + import)
    _components.tsx
    _import-preview.tsx
    _live-filters.tsx
    _sentiment-charts.tsx
    layout.tsx
    page.tsx
  guru/
    bank-soal/          # Bank soal
    soal/               # CRUD soal
    tryout/             # Kelola tryout
    feedback/           # Lihat feedback
    profile/
    layout.tsx
    page.tsx
  siswa/
    tryout/             # Kerjakan tryout
    hasil/              # Hasil tryout
    tanggapan/          # Isi feedback
    progres/            # Progres belajar
    pengaturan/
    layout.tsx
    page.tsx
  login/
    page.tsx
  api/auth/
    [...nextauth]/      # NextAuth route
  layout.tsx
  page.tsx
components/
  auth/                 # Dashboard shell per role
  ui/                   # Toast, confirm dialog
lib/
  auth/                 # options.ts, password.ts, session.ts, redirect.ts
  db/                   # prisma.ts, mariadb-config.ts
  nlp/                  # sentiment-analysis.ts (client ke FastAPI)
  sentiment/            # reanalyze-actions.ts, review-actions.ts
  admin/                # activity.ts (audit log)
  weather/              # student-dashboard-weather.ts
  student-feedback.ts   # Helper aspek feedback
prisma/
  schema.prisma
  seed.mjs
  migrations/
scripts/
  hash-password.mjs
types/
  next-auth.d.ts
```

## 6. Roadmap Implementasi Bertahap

### Tahap 1: Fondasi Domain dan Database
**Status: SELESAI**

- [x] Skema entitas dan relasi (15 model)
- [x] Prisma + MariaDB adapter
- [x] Migration awal
- [x] Seed data awal

### Tahap 2: Autentikasi dan Otorisasi
**Status: SELESAI**

- [x] Autentikasi campuran (email+password, NISN)
- [x] Guard berdasarkan role (`requireRole()`)
- [x] Alur login dan redirect dashboard sesuai role
- [x] JWT strategy dengan role di token

### Tahap 3: Modul Master Data Admin
**Status: SELESAI**

- [x] CRUD guru (manual + import Excel)
- [x] CRUD siswa (manual + import Excel)
- [x] CRUD mata pelajaran (manual + import Excel + toggle status)
- [x] Assignment guru pengampu
- [x] Audit log aktivitas

### Tahap 4: Modul Bank Soal Guru
**Status: SELESAI**

- [x] Guru melihat mapel yang diampu
- [x] CRUD soal per mapel
- [x] Bank soal

### Tahap 5: Modul Tryout Siswa
**Status: SELESAI**

- [x] Siswa melihat daftar tryout
- [x] Siswa memulai tryout (timer)
- [x] Siswa menjawab soal
- [x] Sistem menghitung skor saat submit

### Tahap 6: Modul Feedback
**Status: SELESAI**

- [x] Siswa wajib mengisi 3 feedback setelah submit tryout
- [x] Aspek pembelajaran tersimpan (MATERI, PENYAMPAIAN, SOAL)
- [x] Komentar tersimpan

### Tahap 7: Integrasi Service NLP
**Status: SELESAI**

- [x] Service FastAPI terpisah
- [x] Endpoint klasifikasi sentimen (`/predict`)
- [x] Integrasi dari Next.js ke FastAPI
- [x] Penyimpanan hasil analisis
- [x] Review manual sentimen
- [x] Reanalyze massal/per-item
- [x] Export dataset + training script

### Tahap 8: Dashboard dan Analitik
**Status: SELESAI**

- [x] Dashboard admin global
- [x] Dashboard guru per mata pelajaran
- [x] Distribusi sentimen per mapel dan aspek
- [x] Tabel feedback terfilter

---

## 7. Prioritas Implementasi Praktis

Urutan kerja yang direkomendasikan (sudah selesai):
1. ~~Finalkan model data~~ ✓
2. ~~Buat Prisma schema~~ ✓
3. ~~Pasang Auth.js~~ ✓
4. ~~Bangun dashboard shell per role~~ ✓
5. ~~Kerjakan CRUD master data~~ ✓
6. ~~Kerjakan bank soal~~ ✓
7. ~~Kerjakan tryout~~ ✓
8. ~~Kerjakan feedback~~ ✓
9. ~~Integrasikan NLP~~ ✓
10. ~~Tambahkan dashboard analitik~~ ✓

## 8. Risiko Teknis yang Perlu Dijaga

- Jika desain feedback tidak ditetapkan dari awal, dashboard aspek pembelajaran bisa jadi sulit dirapikan. **→ Ditangani: 3 aspek wajib dengan constraint unique per session.**
- Jika hasil sentimen langsung ditanam di tabel feedback tanpa jejak metadata, evaluasi model akan lebih sulit. **→ Ditangani: SentimentAnalysis terpisah dengan metadata lengkap.**
- Jika role dan relasi guru-mapel tidak dibatasi jelas, otorisasi guru rawan bocor. **→ Ditangani: requireRole() + filter SubjectTeacher di setiap query guru.**
- Jika tryout session tidak dipisahkan dari jawaban, histori dan rekap skor akan sulit dikelola. **→ Ditangani: TryoutSession + TryoutAnswer terpisah.**

## 9. Area Teknis yang Perlu Perhatian

### Risiko Jika Diubah:
- `lib/auth/options.ts` — config auth provider. Salah ubah = login rusak
- `lib/db/prisma.ts` — Prisma singleton. Ubah = connection leak
- `prisma/schema.prisma` — schema change butuh migration. Cascade delete di banyak relasi
- `lib/nlp/sentiment-analysis.ts` — bridge ke FastAPI. Service down = feedback gagal
- `app/admin/_actions.ts` — 1700+ lines, semua CRUD admin. Banyak validation + transaction
- `lib/sentiment/reanalyze-actions.ts` — reanalyze massal, manual label preservation logic
- `app/services/preprocessing.py` — negasi word list. Hapus "tidak" = sentimen rusak

### Keterbatasan Saat Ini:
- Dataset training sangat kecil (hanya bootstrap)
- Tidak ada test di frontend
- Backend test minimal (2 test)
- Tidak ada rate limiting
- Tidak ada CORS config
- `AdminActivity` tabel dibuat via raw SQL, bukan Prisma model

## 10. Rekomendasi Pengembangan Selanjutnya

1. **Perbesar dataset training** — kumpulkan feedback siswa real sebanyak mungkin
2. **Tambah test** — minimal integration test untuk flow critical
3. **Rate limiting** — tambah middleware untuk API endpoints
4. **Monitoring** — tambah logging untuk error tracking
5. **Backup strategy** — database backup otomatis
6. **Performance** — pagination untuk tabel besar, caching untuk dashboard

---

Dokumen ini dimaksudkan sebagai baseline teknis agar implementasi repo konsisten dengan kebutuhan Tugas Akhir.
