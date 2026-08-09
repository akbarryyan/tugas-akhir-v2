# Detail Project
## Implementasi Sistem Analisis Sentimen Umpan Balik Siswa terhadap Proses Pembelajaran menggunakan NLP dan Naive Bayes Berbasis Website

---

## 1. Deskripsi Singkat
Sistem ini merupakan aplikasi berbasis web yang digunakan untuk:
- Menyediakan fitur tryout bagi siswa
- Mengumpulkan umpan balik siswa setelah tryout tentang proses pembelajaran pada mata pelajaran terkait
- Menganalisis sentimen dari feedback menggunakan metode Naive Bayes
- Menampilkan hasil analisis dalam bentuk dashboard

Analisis dilakukan berdasarkan:
- Mata pelajaran
- Aspek pembelajaran (Materi, Penyampaian, Soal)

---

## 2. Tujuan Sistem
- Membantu sekolah mengevaluasi proses pembelajaran
- Mengetahui sentimen siswa terhadap pembelajaran
- Memberikan insight berdasarkan mata pelajaran dan aspek pembelajaran

---

## 3. Teknologi yang Digunakan

### Frontend & Backend Web
| Technology | Version | Usage |
|-----------|---------|-------|
| Next.js | 16.2.2 | Framework (App Router) |
| TypeScript | 5.x | Language |
| Tailwind CSS | 4.x | Styling |
| Prisma | 7.6.0 | ORM (MariaDB adapter) |
| NextAuth | 4.24.13 | Authentication (JWT) |
| Zod | 4.3.6 | Validation |
| xlsx | 0.18.5 | Excel import/export |

### NLP Service
| Technology | Version | Usage |
|-----------|---------|-------|
| Python | 3.11+ | Language |
| FastAPI | 0.115.12 | API framework |
| scikit-learn | 1.6.1 | Naive Bayes classifier |
| Sastrawi | 1.0.1 | Stemming Bahasa Indonesia |
| Pandas | 2.2.3 | Data processing |
| joblib | 1.4.2 | Model serialization |

### Database
- MariaDB 10.6+ (atau MySQL 8+)
- Prisma ORM dengan `@prisma/adapter-mariadb`

---

## 4. Arsitektur Sistem

```
┌─────────────────────────────────────────────────┐
│  Frontend (Next.js 16, port 3000)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ /admin   │ │ /guru    │ │ /siswa           │ │
│  │ CRUD all │ │ bank soal│ │ tryout + feedback│ │
│  │ import xl│ │ tryout   │ │                  │ │
│  │ review   │ │ feedback │ │                  │ │
│  │ sentimen │ │          │ │                  │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│         │              │              │          │
│         └──────────────┼──────────────┘          │
│                        │                         │
│              Prisma + MariaDB                    │
│              NextAuth (JWT)                      │
│                        │                         │
│         lib/nlp/sentiment-analysis.ts            │
│                    HTTP POST                     │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  Sentiment Service (FastAPI, port 8000)          │
│  /predict → preprocessing → Naive Bayes → label │
│  /health  → model status                        │
│  scripts/train_model.py → pipeline.joblib        │
└─────────────────────────────────────────────────┘
```

### 1. Web App (Next.js)
- Menangani UI dan interaksi pengguna
- Menyimpan data ke database via Prisma
- Mengirim request HTTP ke service NLP
- Server actions untuk semua operasi CRUD

### 2. NLP Service (FastAPI)
- Preprocessing teks (Sastrawi: stopword removal + stemming)
- Klasifikasi sentimen (TF-IDF + MultinomialNB)
- Mengembalikan label + confidence

### 3. Database (MariaDB)
- Menyimpan seluruh data sistem
- 15 model utama via Prisma schema

---

## 5. Role Pengguna

### 1. Admin
- Login: email + password (`admin@sekolah.sch.id` / `Admin123!`)
- Dashboard: `/admin`
- Mengelola seluruh data sistem
- CRUD akun guru (termasuk import Excel)
- CRUD akun siswa (termasuk import Excel)
- CRUD mata pelajaran (termasuk import Excel)
- Menentukan guru pengampu untuk setiap mata pelajaran
- Monitoring tryout
- Review sentimen (manual override label, reanalyze massal/per-item)
- Export dataset untuk training model
- Audit log aktivitas

### 2. Guru
- Login: email + password (`guru@sekolah.sch.id` / `Guru123!`)
- Dashboard: `/guru`
- Melihat mata pelajaran yang diampu
- Mengelola bank soal dan soal tryout (CRUD) pada mata pelajaran yang diampu
- Membuat dan mempublikasikan tryout
- Melihat hasil tryout siswa berdasarkan mata pelajaran yang diampu
- Melihat dan meninjau umpan balik siswa terhadap proses pembelajaran
- Melihat hasil analisis sentimen per mata pelajaran dan aspek

### 3. Siswa
- Login: NISN saja tanpa password (contoh: `1234567890`)
- Dashboard: `/siswa`
- Mengikuti tryout berdasarkan mata pelajaran
- Melihat hasil tryout dan skor
- Mengisi 3 umpan balik wajib per tryout (Materi, Penyampaian, Soal)
- Melihat progres belajar

---

## 6. Konsep Tryout

- Tryout dibuat **per mata pelajaran**
- Setiap mata pelajaran memiliki soal masing-masing (pilihan ganda A/B/C/D)
- Soal dikelola melalui bank soal, lalu dipilih ke dalam tryout
- Guru bisa menentukan durasi tryout (menit)

### Alur Tryout:
1. Siswa memilih tryout yang tersedia (published)
2. Sistem membuat TryoutSession
3. Siswa mengerjakan soal (dengan timer)
4. Siswa submit jawaban
5. Sistem menghitung skor otomatis
6. Siswa mengisi 3 feedback wajib (Materi, Penyampaian, Soal)
7. Feedback dikirim ke service NLP untuk analisis sentimen
8. Hasil sentimen tersimpan di database

---

## 7. Konsep Feedback

Setelah tryout, siswa **wajib** mengisi 3 umpan balik pembelajaran:

### Aspek pembelajaran (enum `LearningAspect`):
| Enum | Label | Deskripsi |
|------|-------|-----------|
| `MATERI` | Materi | Kualitas materi yang diajarkan |
| `PENYAMPAIAN` | Penyampaian | Cara guru menyampaikan materi |
| `SOAL` | Evaluasi | Kualitas soal tryout |

### Field feedback:
- Mata pelajaran (otomatis dari tryout)
- Aspek pembelajaran (3 aspek wajib)
- Komentar (teks bebas, min 3 karakter)

### Constraint:
- Satu feedback per aspek per tryout session (`@@unique([tryoutSessionId, aspect])`)

---

## 8. Analisis Sentimen

### Pipeline NLP:
1. **Case folding** — lowercase semua teks
2. **Cleaning** — hapus karakter non-alphanumeric
3. **Stopword removal** — Sastrawi, dengan pengecualian kata negasi ("tidak", "belum", "tanpa")
4. **Stemming** — Sastrawi stemmer Bahasa Indonesia
5. **Vectorization** — TF-IDF (unigram + bigram, sublinear_tf)
6. **Classification** — Multinomial Naive Bayes

### Output:
| Label | Deskripsi |
|-------|-----------|
| `POSITIF` | Sentimen positif terhadap pembelajaran |
| `NEGATIF` | Sentimen negatif terhadap pembelajaran |
| `NETRAL` | Sentimen netral/ambigu |

### Model metadata:
- Confidence score (0-1)
- Model version (`nb-v1`)
- Auto method (`NAIVE_BAYES`)
- Preprocessed text (untuk audit)

### Review Manual:
- Admin dan guru bisa override label sentimen manual
- Label source: `AUTO` atau `MANUAL`
- Jika manual, `finalLabel` berubah tapi `autoLabel` tetap tersimpan
- Guru hanya bisa review feedback pada mapel yang diampu

---

## 9. Alur Sistem

### Alur Siswa:
1. Siswa login dengan NISN
2. Siswa memilih tryout yang tersedia
3. Siswa mengerjakan soal → submit → skor dihitung
4. Siswa mengisi 3 feedback wajib
5. Feedback dikirim ke FastAPI `/predict`
6. Hasil sentimen disimpan ke `SentimentAnalysis`

### Alur Guru:
1. Guru login dengan email+password
2. Guru mengelola bank soal dan soal
3. Guru membuat tryout dari bank soal → publish
4. Guru melihat hasil tryout siswa
5. Guru melihat dan meninjau feedback/sentimen

### Alur Admin:
1. Admin login dengan email+password
2. Admin mengelola data master (guru, siswa, mapel, pengampu)
3. Admin monitoring tryout dan sentimen
4. Admin review/override sentimen jika diperlukan
5. Admin export dataset → training ulang model

---

## 10. Fitur Utama

### Admin:
- [x] Login email+password
- [x] CRUD akun guru (manual + import Excel)
- [x] CRUD akun siswa (manual + import Excel)
- [x] CRUD mata pelajaran (manual + import Excel)
- [x] Assignment guru pengampu mata pelajaran
- [x] Monitoring tryout
- [x] Review sentimen (manual override + reanalyze)
- [x] Export dataset training
- [x] Audit log aktivitas

### Guru:
- [x] Login email+password
- [x] Melihat mata pelajaran yang diampu
- [x] Bank soal + CRUD soal tryout
- [x] Membuat dan publish tryout
- [x] Melihat hasil tryout siswa
- [x] Melihat dan review umpan balik siswa
- [x] Dashboard sentimen per mapel dan aspek

### Siswa:
- [x] Login NISN
- [x] Memilih tryout
- [x] Mengerjakan tryout (timer)
- [x] Submit jawaban → skor otomatis
- [x] Mengisi 3 feedback wajib
- [x] Melihat hasil dan progres

---

## 11. Dashboard

### Admin Dashboard (`/admin`):
- Statistik: jumlah guru, siswa, mapel, tryout
- Cakupan pengampu (persentase mapel yang punya guru)
- Status tryout (draft vs published)
- Statistik review sentimen (manual vs otomatis)
- Modul administrasi utama

### Guru Dashboard (`/guru`):
- Mata pelajaran yang diampu
- Bank soal dan tryout
- Feedback dan sentimen siswa

### Siswa Dashboard (`/siswa`):
- Daftar tryout tersedia
- Hasil tryout
- Progres belajar
- Cuaca (widget)

---

## 12. Database Schema

### Model Utama (15 model):

| Model | Deskripsi | Relasi Kunci |
|-------|-----------|-------------|
| User | Akun semua role | → TeacherProfile, StudentProfile |
| TeacherProfile | Data guru (NIP) | → User, SubjectTeacher, Question, BankSoal, Tryout |
| StudentProfile | Data siswa (NISN, kelas) | → User, TryoutSession, Feedback |
| Subject | Mata pelajaran | → Question, BankSoal, Tryout, SubjectTeacher, Feedback |
| SubjectTeacher | Relasi guru ↔ mapel | → Subject, TeacherProfile |
| Question | Soal pilihan ganda | → Subject, TeacherProfile, BankSoalQuestion, TryoutQuestion, TryoutAnswer |
| BankSoal | Kumpulan soal | → Subject, TeacherProfile, BankSoalQuestion, Tryout |
| BankSoalQuestion | Relasi bank soal ↔ soal | → BankSoal, Question |
| Tryout | Paket tryout | → Subject, BankSoal, TeacherProfile, TryoutQuestion, TryoutSession |
| TryoutQuestion | Relasi tryout ↔ soal | → Tryout, Question |
| TryoutSession | Sesi pengerjaan siswa | → StudentProfile, Tryout, TryoutAnswer, Feedback |
| TryoutAnswer | Jawaban per soal | → TryoutSession, Question |
| Feedback | Umpan balik siswa | → StudentProfile, Subject, TryoutSession, SentimentAnalysis |
| SentimentAnalysis | Hasil klasifikasi sentimen | → Feedback, User (reviewer) |

### Enum:
- Role: `ADMIN`, `GURU`, `SISWA`
- AuthMethod: `EMAIL_PASSWORD`, `NISN`
- AnswerOption: `A`, `B`, `C`, `D`
- TryoutStatus: `IN_PROGRESS`, `SUBMITTED`, `GRADED`
- LearningAspect: `MATERI`, `PENYAMPAIAN`, `SOAL`
- SentimentLabel: `POSITIF`, `NEGATIF`, `NETRAL`
- LabelSource: `AUTO`, `MANUAL`
- AutoMethod: `LEXICON`, `NAIVE_BAYES`

---

## 13. Output Sistem

- Label sentimen (POSITIF, NEGATIF, NETRAL) dengan confidence score
- Dashboard statistik untuk admin
- Data umpan balik siswa per mapel dan aspek
- Export dataset CSV untuk training model
- Insight untuk evaluasi pembelajaran

---

## 14. API Endpoint

### Next.js (Internal)
Semua operasi melalui server actions, bukan REST API. Satu endpoint export:
- `GET /admin/feedback/export` — export dataset CSV (dengan token auth)

### FastAPI Sentiment Service
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/health` | GET | Status service dan model |
| `/predict` | POST | Prediksi sentimen dari komentar |

Request `/predict`:
```json
{
  "comment": "Materinya cukup jelas",
  "aspect": "MATERI",
  "subject": "Agama"
}
```

Response:
```json
{
  "label": "POSITIF",
  "confidence": 0.85,
  "preprocessedText": "materi cukup jelas",
  "modelVersion": "nb-v1",
  "modelReady": true,
  "autoMethod": "NAIVE_BAYES"
}
```

---

## 15. Keunggulan Sistem

- Integrasi tryout dan analisis sentimen dalam satu portal
- Analisis berbasis mata pelajaran dan aspek pembelajaran
- NLP Bahasa Indonesia dengan penanganan kata negasi
- Review manual sentimen oleh admin/guru
- Import data massal dari Excel
- Audit log aktivitas admin
- Berbasis web dan dapat diakses online

---
