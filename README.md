# Analisis Sentimen Pembelajaran — Frontend

Portal akademik berbasis web untuk tryout siswa dan analisis sentimen umpan balik pembelajaran. Bagian dari Tugas Akhir.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | NextAuth v4 (JWT, CredentialsProvider) |
| Database | MariaDB + Prisma ORM v7 |
| Validation | Zod v4 |
| Excel | xlsx (SheetJS) |

## Struktur Folder

```text
frontend/
├── app/
│   ├── admin/              # Dashboard admin
│   │   ├── guru/           # CRUD guru
│   │   ├── siswa/          # CRUD siswa
│   │   ├── mapel/          # CRUD mata pelajaran
│   │   ├── pengampu/       # Assignment guru → mapel
│   │   ├── tryout/         # Monitoring tryout
│   │   ├── feedback/       # Review sentimen + export
│   │   ├── aktivitas/      # Log aktivitas admin
│   │   ├── import-template/
│   │   ├── profile/
│   │   ├── _actions.ts     # Server actions (CRUD + import Excel)
│   │   └── layout.tsx
│   ├── guru/               # Dashboard guru
│   │   ├── bank-soal/      # Bank soal
│   │   ├── soal/           # CRUD soal
│   │   ├── tryout/         # Kelola tryout
│   │   ├── feedback/       # Lihat feedback siswa
│   │   ├── profile/
│   │   └── layout.tsx
│   ├── siswa/              # Dashboard siswa
│   │   ├── tryout/         # Daftar & kerjakan tryout
│   │   ├── hasil/          # Hasil tryout
│   │   ├── tanggapan/      # Isi feedback
│   │   ├── progres/        # Progres belajar
│   │   ├── pengaturan/
│   │   └── layout.tsx
│   ├── login/              # Halaman login
│   ├── api/auth/           # NextAuth API route
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Root redirect
├── components/
│   ├── auth/               # Dashboard shell per role
│   └── ui/                 # Toast, confirm dialog
├── lib/
│   ├── auth/               # Auth config, password, session, redirect
│   ├── db/                 # Prisma client, MariaDB config
│   ├── nlp/                # Client ke FastAPI sentiment service
│   ├── sentiment/          # Server actions: review & reanalyze
│   ├── admin/              # Audit log aktivitas admin
│   ├── weather/            # Cuaca untuk dashboard siswa
│   └── student-feedback.ts # Helper aspek feedback
├── prisma/
│   ├── schema.prisma       # 15 model database
│   ├── seed.mjs            # Seed data awal
│   └── migrations/
├── scripts/
│   └── hash-password.mjs   # Utility hash password
├── types/
│   └── next-auth.d.ts      # Type augmentation NextAuth
└── docs/
    ├── detail-project.md   # Spesifikasi project
    └── technical-plan.md   # Rancangan teknis
```

## Setup

### Prerequisites

- Node.js 20+
- MariaDB 10.6+ (atau MySQL 8+)
- Python 3.11+ (untuk sentiment service)

### Instalasi

```bash
cd frontend
npm install
cp .env.example .env  # buat file .env jika belum ada
```

### Environment Variables

Buat file `.env` di root `frontend/`:

```env
DATABASE_URL=mysql://user:password@localhost:3306/nama_database
NEXTAUTH_SECRET=generate-random-secret
NEXTAUTH_URL=http://localhost:3000
SENTIMENT_ANALYSIS_SERVICE_URL=http://127.0.0.1:8000
TRAINING_DATASET_EXPORT_TOKEN=token-yang-sama-dengan-service
```

### Database

```bash
npx prisma db push        # Push schema ke database
npx prisma generate       # Generate Prisma client
node prisma/seed.mjs      # Seed data awal
```

### Jalankan

```bash
npm run dev               # Development server di http://localhost:3000
npm run build             # Production build
npm run lint              # Lint check
```

### Seed Data

Seed menghasilkan:

| Data | Detail |
|------|--------|
| Admin | `admin@sekolah.sch.id` / `Admin123!` |
| Guru 1 | `guru@sekolah.sch.id` / `Guru123!` (Agama) |
| Guru 2 | `guru2@sekolah.sch.id` / `Guru123!` (Matematika, B. Indonesia) |
| Siswa | NISN: `1234567890`, `0987654321`, `1122334455`, `9988776655` |
| Mapel | Agama, Matematika, Bahasa Indonesia |
| Soal | 5 soal per mapel (15 total) |
| Tryout | 3 tryout (published) |
| Sesi | 8 sesi selesai, 24 feedback, 24 sentimen |

## Role & Auth

| Role | Login | Dashboard |
|------|-------|-----------|
| ADMIN | Email + Password | `/admin` |
| GURU | Email + Password | `/guru` |
| SISWA | NISN (tanpa password) | `/siswa` |

Password di-hash dengan `scrypt` (Node.js crypto). Siswa tidak punya password — cukup NISN.

## Arsitektur

```
┌─────────────────────────────────────┐
│  Next.js (port 3000)                │
│  ┌────────┐ ┌──────┐ ┌───────────┐ │
│  │ Admin  │ │ Guru │ │   Siswa   │ │
│  └────────┘ └──────┘ └───────────┘ │
│         Prisma + MariaDB            │
│         NextAuth (JWT)              │
│                                     │
│  lib/nlp/sentiment-analysis.ts      │
│           HTTP POST                 │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  FastAPI (port 8000)                │
│  /predict → Naive Bayes → label     │
│  /health  → model status            │
└─────────────────────────────────────┘
```

## Modul Utama

### Admin (`/admin`)
- CRUD guru, siswa, mata pelajaran (termasuk import Excel)
- Assignment guru pengampu ke mata pelajaran
- Monitoring tryout
- Review sentimen (manual label override, reanalyze massal/per-item)
- Export dataset untuk training
- Audit log aktivitas

### Guru (`/guru`)
- Bank soal & CRUD soal (pilihan ganda)
- Kelola tryout (buat, publish)
- Lihat hasil tryout siswa
- Lihat & review feedback siswa (hanya mapel yang diampu)

### Siswa (`/siswa`)
- Lihat daftar tryout tersedia
- Kerjakan tryout (timer, pilihan ganda)
- Lihat hasil & skor
- Isi 3 feedback wajib (Materi, Penyampaian, Evaluasi) per tryout

## Database Schema

15 model utama:

- **User** — akun semua role (ADMIN/GURU/SISWA)
- **TeacherProfile** — data guru (NIP)
- **StudentProfile** — data siswa (NISN, kelas)
- **Subject** — mata pelajaran
- **SubjectTeacher** — relasi guru ↔ mapel
- **Question** — soal pilihan ganda
- **BankSoal** — kumpulan soal
- **BankSoalQuestion** — relasi bank soal ↔ soal
- **Tryout** — paket tryout
- **TryoutQuestion** — relasi tryout ↔ soal
- **TryoutSession** — sesi pengerjaan siswa
- **TryoutAnswer** — jawaban per soal
- **Feedback** — umpan balik siswa (3 aspek)
- **SentimentAnalysis** — hasil klasifikasi sentimen

## Scripts

| Command | Fungsi |
|---------|--------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run db:push` | Push schema ke DB |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed data awal |
| `npm run db:studio` | Prisma Studio (GUI) |
| `npm run auth:hash-password` | Hash password manual |

## Catatan Penting

- **Next.js 16** — ada breaking changes dari versi sebelumnya. Baca guide di `node_modules/next/dist/docs/` sebelum edit.
- **MariaDB adapter** — Prisma pakai `@prisma/adapter-mariadb`, bukan MySQL connector standar.
- **AdminActivity** — tabel audit log dibuat otomatis via raw SQL, bukan Prisma migration.
- **No frontend tests** — belum ada test framework di frontend.
- **Dataset kecil** — data seed hanya bootstrap. Perlu jauh lebih banyak data berlabel untuk hasil TA layak.
