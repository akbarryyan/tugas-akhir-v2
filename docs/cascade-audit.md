# Audit Cascade Delete

Analisis semua cascade delete path di `prisma/schema.prisma`. Dokumen ini wajib dibaca sebelum melakukan operasi delete apa pun.

## Strategi Deletion per Model

| Model | onDelete | Efek |
|-------|----------|------|
| User → TeacherProfile | **Cascade** | Hapus user guru → hapus profil guru otomatis |
| User → StudentProfile | **Cascade** | Hapus user siswa → hapus profil siswa otomatis |
| User → SentimentAnalysis (reviewedByUser) | **SetNull** | Hapus user reviewer → field `reviewedByUserId` di-set null |
| TeacherProfile → SubjectTeacher | **Cascade** | Hapus profil guru → hapus semua assignment pengampu |
| TeacherProfile → Question | **Restrict** | Hapus profil guru **DIBLOK** jika masih punya soal |
| TeacherProfile → BankSoal | **Cascade** | Hapus profil guru → hapus semua bank soal |
| TeacherProfile → Tryout (createdBy) | **SetNull** | Hapus profil guru → field `createdByTeacherId` di-set null |
| StudentProfile → TryoutSession | **Cascade** | Hapus profil siswa → hapus semua sesi tryout |
| StudentProfile → Feedback | **Cascade** | Hapus profil siswa → hapus semua feedback |
| Subject → Question | **Cascade** | Hapus mapel → hapus semua soal |
| Subject → BankSoal | **Cascade** | Hapus mapel → hapus semua bank soal |
| Subject → Tryout | **Cascade** | Hapus mapel → hapus semua tryout |
| Subject → SubjectTeacher | **Cascade** | Hapus mapel → hapus semua assignment pengampu |
| Subject → Feedback | **Cascade** | Hapus mapel → hapus semua feedback |
| BankSoal → BankSoalQuestion | **Cascade** | Hapus bank soal → hapus semua relasi soal |
| BankSoal → Tryout | **SetNull** | Hapus bank soal → field `bankSoalId` di-set null |
| Question → BankSoalQuestion | **Cascade** | Hapus soal → hapus dari semua bank soal |
| Question → TryoutQuestion | **Cascade** | Hapus soal → hapus dari semua tryout |
| Question → TryoutAnswer | **Cascade** | Hapus soal → hapus semua jawaban terkait |
| Tryout → TryoutQuestion | **Cascade** | Hapus tryout → hapus semua soal di tryout |
| Tryout → TryoutSession | **Cascade** | Hapus tryout → hapus semua sesi siswa |
| TryoutSession → TryoutAnswer | **Cascade** | Hapus sesi → hapus semua jawaban |
| TryoutSession → Feedback | **Cascade** | Hapus sesi → hapus semua feedback |
| Feedback → SentimentAnalysis | **Cascade** | Hapus feedback → hapus hasil analisis sentimen |

## Cascade Path Berisiko Tinggi

### 1. Delete Subject (PALING BERISIKO)

```
Subject
├── Question (Cascade)
│   ├── BankSoalQuestion (Cascade)
│   ├── TryoutQuestion (Cascade)
│   └── TryoutAnswer (Cascade)
├── BankSoal (Cascade)
│   └── BankSoalQuestion (Cascade)
├── Tryout (Cascade)
│   ├── TryoutQuestion (Cascade)
│   └── TryoutSession (Cascade)
│       ├── TryoutAnswer (Cascade)
│       └── Feedback (Cascade)
│           └── SentimentAnalysis (Cascade)
├── SubjectTeacher (Cascade)
└── Feedback (Cascade)
    └── SentimentAnalysis (Cascade)
```

**Dampak:** Hapus 1 mata pelajaran = hapus seluruh ekosistem data untuk mapel tersebut. Semua soal, bank soal, tryout, sesi siswa, jawaban, feedback, dan analisis sentimen terkait akan terhapus permanen.

**Mitigasi:** Jangan pernah hard-delete Subject. Gunakan soft-delete (tambah field `isDeleted` atau ubah `isActive = false`). Jika harus hapus, backup database terlebih dahulu.

### 2. Delete User SISWA

```
User (SISWA)
└── StudentProfile (Cascade)
    ├── TryoutSession (Cascade)
    │   ├── TryoutAnswer (Cascade)
    │   └── Feedback (Cascade)
    │       └── SentimentAnalysis (Cascade)
    └── Feedback (Cascade)
        └── SentimentAnalysis (Cascade)
```

**Dampak:** Hapus 1 siswa = hapus seluruh histori pengerjaan, jawaban, feedback, dan sentimen siswa tersebut.

**Mitigasi:** Pertimbangkan soft-delete untuk siswa yang lulus/keluar. Data histori berharga untuk analisis sentimen jangka panjang.

### 3. Delete User GURU

```
User (GURU)
└── TeacherProfile (Cascade)
    ├── SubjectTeacher (Cascade) — hapus semua assignment
    ├── BankSoal (Cascade)
    │   └── BankSoalQuestion (Cascade)
    ├── Tryout (SetNull) — createdByTeacherId di-set null, tryout tetap ada
    └── Question (RESTRICT) — DIBLOK jika guru masih punya soal
```

**Dampak:** Delete guru diblokir oleh Prisma jika guru masih memiliki soal (`onDelete: Restrict` pada relasi `Question → TeacherProfile`). Jika tidak punya soal, assignment pengampu dan bank soal terhapus. Tryout yang dibuat guru tetap ada (createdBy di-set null).

**Mitigasi:** Sebelum delete guru, reassign atau hapus soalnya terlebih dahulu. Bank soal yang hilang tidak bisa dikembalikan.

### 4. Delete Tryout

```
Tryout
├── TryoutQuestion (Cascade) — hapus konfigurasi soal
└── TryoutSession (Cascade)
    ├── TryoutAnswer (Cascade) — hapus semua jawaban siswa
    └── Feedback (Cascade)
        └── SentimentAnalysis (Cascade) — hapus semua analisis sentimen
```

**Dampak:** Hapus 1 tryout = hapus seluruh data pengerjaan siswa untuk tryout tersebut, termasuk feedback dan sentimen.

**Mitigasi:** Gunakan `isPublished = false` (unpublish) alih-alih delete. Hapus hanya jika tryout belum pernah dikerjakan.

## Rekomendasi

### Prioritas Critical

1. **Tambah soft-delete untuk Subject** — field `isDeleted Boolean @default(false)`. Filter `where: { isDeleted: false }` di semua query. Mencegah kehilangan data massal.
2. **Tambah soft-delete untuk User** — sama, untuk siswa dan guru. Data histori terjaga.

### Prioritas High

3. **Tambah konfirmasi delete di UI** — sudah ada `ConfirmDialogProvider`. Pastikan semua tombol delete pakai confirm dialog dengan pesan yang jelas tentang konsekuensi cascade.
4. **Backup otomatis** — setup cron job untuk mysqldump harian.

### Prioritas Medium

5. **Audit log untuk delete** — `AdminActivity` sudah record delete, tapi tidak record jumlah baris yang ter-cascade. Tambahkan detail cascade count di log.
6. **API endpoint untuk restore** — jika soft-delete diimplementasi, buat endpoint untuk restore data yang di-soft-delete.

## Quick Reference: Aman vs Berisiko

| Operasi | Risiko | Aman? |
|---------|--------|-------|
| Delete Subject | Critical | Tidak — cascade massal |
| Delete User (SISWA) | Critical | Tidak — hapus histori |
| Delete Tryout (dengan sesi) | High | Tidak — hapus data siswa |
| Delete User (GURU dengan soal) | Blocked | Diblok Prisma (Restrict) |
| Delete User (GURU tanpa soal) | Medium | Hapus bank soal + assignment |
| Delete SubjectTeacher | Low | Aman — hanya hapus relasi |
| Delete BankSoalQuestion | Low | Aman — hanya hapus relasi |
| Delete TryoutQuestion | Low | Aman — hanya hapus relasi |
| Delete SentimentAnalysis | Low | Aman — hanya hapus hasil analisis |
| Delete Feedback | Medium | Cascade ke SentimentAnalysis |
