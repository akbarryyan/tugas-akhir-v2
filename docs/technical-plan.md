# Technical Plan

## 1. Audit Implementasi Saat Ini

Dokumen acuan fitur:
- `docs/detail-project.md`

Kondisi repo saat ini:
- Aplikasi masih berupa scaffold awal Next.js App Router.
- Dependensi aktif baru mencakup `next`, `react`, `react-dom`, `typescript`, `eslint`, dan `tailwindcss`.
- Halaman utama masih template bawaan `create-next-app`.
- Belum ada modul autentikasi, database, dashboard, API internal, maupun service NLP.

Temuan struktur:
- `app/layout.tsx`: layout root default.
- `app/page.tsx`: landing page default Next.js.
- `app/globals.css`: styling dasar Tailwind v4 + warna default.
- `package.json`: belum ada `auth.js`, `prisma`, `mysql2`, komponen UI, charting, validasi form, maupun utilitas pendukung.

Kecocokan dengan kebutuhan TA:

Sudah ada:
- Next.js App Router
- TypeScript
- Tailwind CSS

Belum ada:
- Login dengan role `admin`, `guru`, `siswa`
- Otorisasi per role
- Skema database MySQL
- Prisma ORM
- CRUD akun guru
- CRUD akun siswa
- CRUD mata pelajaran
- Penugasan guru pengampu
- CRUD soal tryout
- Alur pengerjaan tryout dan penilaian
- Hasil tryout siswa
- Form feedback setelah tryout
- Aspek pembelajaran `Materi`, `Penyampaian`, `Soal`
- Integrasi API NLP
- Service FastAPI Python
- Klasifikasi sentimen `Positif`, `Negatif`, `Netral`
- Dashboard analitik
- Grafik distribusi sentimen
- Tabel feedback
- shadcn/ui

Kesimpulan audit:
- Repo saat ini belum mengimplementasikan kebutuhan bisnis inti Tugas Akhir.
- Langkah paling aman adalah memulai dari desain data dan alur domain terlebih dahulu, lalu baru membangun autentikasi, modul, dan integrasi NLP di atas fondasi itu.

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
- Karena metode login berbeda antar role, tabel `User` perlu mendukung field autentikasi yang bersifat opsional tergantung role.

### Entitas Inti

#### 1. User
Menyimpan akun login untuk semua role.

Field minimum:
- `id`
- `name`
- `email` opsional, dipakai untuk admin dan guru
- `passwordHash` opsional, dipakai untuk admin dan guru
- `role`
- `authMethod`
- `createdAt`
- `updatedAt`

Catatan:
- Untuk implementasi awal, akun bisa disatukan dalam satu tabel `User`.
- Jika nanti diperlukan data akademik yang lebih spesifik, gunakan profil turunan seperti `TeacherProfile` dan `StudentProfile`.
- Kombinasi yang disarankan:
  - `ADMIN` dan `GURU` memakai `authMethod = EMAIL_PASSWORD`
  - `SISWA` memakai `authMethod = NISN`

#### 2. TeacherProfile
Menyimpan data tambahan guru.

Field minimum:
- `id`
- `userId`
- `nip` atau identifier guru
- `createdAt`
- `updatedAt`

#### 3. StudentProfile
Menyimpan data tambahan siswa.

Field minimum:
- `id`
- `userId`
- `nisn`
- `className`
- `createdAt`
- `updatedAt`

Catatan:
- `nisn` menjadi identifier login siswa.
- Jika nanti sekolah juga butuh `NIS` internal, field itu bisa ditambahkan terpisah dari `nisn`.

#### 4. Subject
Mata pelajaran tryout.

Field minimum:
- `id`
- `name`
- `description`
- `isActive`
- `createdAt`
- `updatedAt`

#### 5. SubjectTeacher
Relasi guru pengampu ke mata pelajaran.

Field minimum:
- `id`
- `subjectId`
- `teacherId`
- `createdAt`

Catatan:
- Struktur ini mendukung kemungkinan satu mapel diajar lebih dari satu guru.

#### 6. Question
Soal tryout per mata pelajaran.

Field minimum:
- `id`
- `subjectId`
- `createdByTeacherId`
- `questionText`
- `optionA`
- `optionB`
- `optionC`
- `optionD`
- `correctOption`
- `explanation` opsional
- `isActive`
- `createdAt`
- `updatedAt`

Catatan:
- Jika nanti ingin tipe soal lebih fleksibel, opsi jawaban bisa dipisah ke tabel `QuestionOption`.
- Untuk tahap TA, model pilihan ganda sederhana sudah cukup.

#### 7. TryoutSession
Mewakili satu percobaan tryout siswa pada satu mata pelajaran.

Field minimum:
- `id`
- `studentId`
- `subjectId`
- `status` (`IN_PROGRESS`, `SUBMITTED`, `GRADED`)
- `startedAt`
- `submittedAt` opsional
- `score` opsional
- `totalQuestions`
- `correctAnswers`
- `createdAt`
- `updatedAt`

Catatan:
- Entitas ini penting agar histori pengerjaan siswa tersimpan rapi.

#### 8. TryoutAnswer
Jawaban siswa per soal pada satu sesi tryout.

Field minimum:
- `id`
- `tryoutSessionId`
- `questionId`
- `selectedOption`
- `isCorrect`
- `answeredAt`

#### 9. LearningAspect
Untuk aspek pembelajaran feedback.

Opsi awal:
- `MATERI`
- `PENYAMPAIAN`
- `SOAL`

Catatan:
- Bisa berupa enum Prisma, tidak harus tabel terpisah.

#### 10. Feedback
Umpan balik siswa setelah tryout.

Field minimum:
- `id`
- `studentId`
- `subjectId`
- `tryoutSessionId`
- `aspect`
- `comment`
- `createdAt`

Catatan:
- Satu `TryoutSession` dapat memiliki lebih dari satu feedback jika siswa diminta menilai beberapa aspek dalam entri terpisah.
- Jika ingin satu form berisi banyak aspek sekaligus, maka pisahkan menjadi `FeedbackSubmission` dan `FeedbackItem`. Untuk tahap awal, model satu baris per aspek lebih sederhana.

#### 11. SentimentAnalysis
Hasil klasifikasi sentimen dari komentar feedback.

Field minimum:
- `id`
- `feedbackId`
- `label` (`POSITIF`, `NEGATIF`, `NETRAL`)
- `confidence` opsional
- `preprocessedText` opsional
- `modelVersion` opsional
- `analyzedAt`

Catatan:
- Memisahkan hasil analisis dari tabel `Feedback` memberi ruang untuk audit model dan retraining di masa depan.

## 3. Relasi Data yang Disarankan

Relasi inti:
- Satu `User` punya satu role.
- Satu `User` guru dapat punya satu `TeacherProfile`.
- Satu `User` siswa dapat punya satu `StudentProfile`.
- Satu `Subject` dapat punya banyak `Question`.
- Satu `Subject` dapat punya banyak relasi `SubjectTeacher`.
- Satu `TeacherProfile` dapat mengampu banyak `Subject` lewat `SubjectTeacher`.
- Satu `StudentProfile` dapat punya banyak `TryoutSession`.
- Satu `TryoutSession` terkait ke satu `Subject`.
- Satu `TryoutSession` punya banyak `TryoutAnswer`.
- Satu `TryoutSession` dapat punya banyak `Feedback`.
- Satu `Feedback` memiliki satu hasil `SentimentAnalysis`.

## 4. Alur Sistem ke Model Data

### Alur siswa
1. Siswa login melalui `User`.
2. Siswa memilih `Subject`.
3. Sistem membuat `TryoutSession`.
4. Siswa menjawab beberapa `Question` dan tiap jawaban disimpan ke `TryoutAnswer`.
5. Saat submit, sistem menghitung nilai dari `TryoutAnswer`, lalu memperbarui `TryoutSession`.
6. Setelah itu siswa mengirim `Feedback`.
7. Komentar feedback dikirim ke service NLP.
8. Hasil klasifikasi disimpan ke `SentimentAnalysis`.

### Alur guru
1. Guru login.
2. Guru hanya melihat `Subject` yang terhubung melalui `SubjectTeacher`.
3. Guru CRUD `Question` pada mata pelajaran yang diampu.
4. Guru melihat `TryoutSession`, `Feedback`, dan `SentimentAnalysis` untuk mapelnya.

### Alur admin
1. Admin login.
2. Admin mengelola `User`, `TeacherProfile`, `StudentProfile`, `Subject`, dan `SubjectTeacher`.
3. Admin melihat seluruh data tryout, feedback, dan dashboard agregat.

## 5. Struktur Folder Aplikasi yang Disarankan

Berikut struktur yang cocok untuk App Router dan domain proyek ini:

```text
app/
  (public)/
    login/
      page.tsx
  (dashboard)/
    admin/
      page.tsx
      users/
      subjects/
      teachers/
      feedback/
      analytics/
    guru/
      page.tsx
      questions/
      results/
      feedback/
      analytics/
    siswa/
      page.tsx
      subjects/
      tryout/
      results/
      feedback/
  api/
    auth/
    nlp/
lib/
  auth/
  db/
  nlp/
  validations/
  utils/
components/
  ui/
  layout/
  forms/
  charts/
prisma/
  schema.prisma
docs/
```

Catatan:
- Gunakan route group seperti `(public)` dan `(dashboard)` agar URL tetap bersih.
- Folder non-route internal bisa memakai private folder seperti `_components` bila diperlukan.

## 6. Roadmap Implementasi Bertahap

### Tahap 1: Fondasi Domain dan Database
Target:
- Menetapkan skema entitas dan relasi.
- Menambahkan Prisma dan koneksi MySQL.
- Menyiapkan migration awal.

Output:
- `prisma/schema.prisma`
- koneksi database
- seed awal role dan data dummy dasar

### Tahap 2: Autentikasi dan Otorisasi
Target:
- Menambahkan autentikasi campuran.
- Menetapkan guard berdasarkan role.
- Membuat alur login dan redirect dashboard sesuai role.

Output:
- login admin dan guru via email/password berfungsi
- login siswa via NISN berfungsi
- session tersedia di server
- akses per role terbatas

### Tahap 3: Modul Master Data Admin
Target:
- CRUD guru
- CRUD siswa
- CRUD mata pelajaran
- assignment guru pengampu

Output:
- admin dapat mengelola seluruh data master

### Tahap 4: Modul Bank Soal Guru
Target:
- guru dapat melihat mapel yang diampu
- CRUD soal per mapel

Output:
- bank soal aktif dan siap dipakai tryout

### Tahap 5: Modul Tryout Siswa
Target:
- siswa melihat daftar mapel
- siswa memulai tryout
- siswa menjawab soal
- sistem menghitung skor saat submit

Output:
- alur tryout end-to-end tanpa feedback

### Tahap 6: Modul Feedback
Target:
- siswa wajib mengisi feedback setelah submit tryout
- aspek pembelajaran tersimpan
- komentar tersimpan

Output:
- data feedback siap dianalisis

### Tahap 7: Integrasi Service NLP
Target:
- membuat service FastAPI terpisah
- endpoint klasifikasi sentimen
- integrasi dari Next.js ke FastAPI
- penyimpanan hasil analisis

Output:
- komentar bisa diklasifikasikan ke `POSITIF`, `NEGATIF`, atau `NETRAL`

### Tahap 8: Dashboard dan Analitik
Target:
- dashboard admin global
- dashboard guru per mata pelajaran
- distribusi sentimen per mapel dan aspek
- tabel feedback terfilter

Output:
- insight evaluasi pembelajaran tersedia

## 7. Prioritas Implementasi Praktis

Urutan kerja yang direkomendasikan:
1. Finalkan model data
2. Buat Prisma schema
3. Pasang Auth.js
4. Bangun dashboard shell per role
5. Kerjakan CRUD master data
6. Kerjakan bank soal
7. Kerjakan tryout
8. Kerjakan feedback
9. Integrasikan NLP
10. Tambahkan dashboard analitik

## 8. Risiko Teknis yang Perlu Dijaga

- Jika desain feedback tidak ditetapkan dari awal, dashboard aspek pembelajaran bisa jadi sulit dirapikan.
- Jika hasil sentimen langsung ditanam di tabel feedback tanpa jejak metadata, evaluasi model akan lebih sulit.
- Jika role dan relasi guru-mapel tidak dibatasi jelas, otorisasi guru rawan bocor.
- Jika tryout session tidak dipisahkan dari jawaban, histori dan rekap skor akan sulit dikelola.

## 9. Rekomendasi Langkah Berikutnya

Langkah coding berikutnya yang paling masuk akal:
1. Install dependensi inti `prisma`, `@prisma/client`, `mysql2`, `next-auth` atau Auth.js yang sesuai versi proyek.
2. Buat `prisma/schema.prisma` berdasarkan rancangan entitas di dokumen ini.
3. Siapkan environment database lokal.
4. Generate migration awal.

Dokumen ini dimaksudkan sebagai baseline teknis agar implementasi repo konsisten dengan kebutuhan Tugas Akhir.
