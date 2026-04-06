# 📌 Detail Project
## Implementasi Sistem Analisis Sentimen Umpan Balik Siswa terhadap Proses Pembelajaran menggunakan NLP dan Naive Bayes Berbasis Website

---

## 1. Deskripsi Singkat
Sistem ini merupakan aplikasi berbasis web yang digunakan untuk:
- Menyediakan fitur tryout bagi siswa
- Mengumpulkan umpan balik (feedback) siswa setelah tryout
- Menganalisis sentimen dari feedback menggunakan metode Naive Bayes
- Menampilkan hasil analisis dalam bentuk dashboard

Analisis dilakukan berdasarkan:
- Mata pelajaran
- Aspek pembelajaran

---

## 2. Tujuan Sistem
- Membantu sekolah mengevaluasi proses pembelajaran
- Mengetahui sentimen siswa terhadap pembelajaran
- Memberikan insight berdasarkan mata pelajaran dan aspek pembelajaran

---

## 3. Teknologi yang Digunakan

### Frontend & Backend Web
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui

### Authentication
- Auth.js (email & password, untuk siswa pakai NISN)

### Database
- MySQL
- Prisma ORM

### NLP Service
- Python
- FastAPI
- scikit-learn (Naive Bayes)
- Sastrawi (stemming Bahasa Indonesia)

### Deployment
- Vercel (Next.js)
- Railway / Render (FastAPI)
- MySQL (Neon/Supabase/PlanetScale/local server)

---

## 4. Arsitektur Sistem

### 1. Web App (Next.js)
- Menangani UI dan interaksi pengguna
- Menyimpan data ke database
- Mengirim request ke API NLP

### 2. NLP Service (FastAPI)
- Melakukan preprocessing teks
- Melakukan klasifikasi sentimen
- Mengembalikan hasil sentimen

### 3. Database (MySQL)
- Menyimpan seluruh data sistem

---

## 5. Role Pengguna

### 1. Admin
- Mengelola seluruh data sistem
- Mengelola akun guru dan siswa
- Mengelola mata pelajaran
- Menentukan guru pengampu untuk setiap mata pelajaran
- Melihat seluruh hasil tryout, feedback, dan analisis sentimen

### 2. Guru
- Login ke sistem
- Melihat mata pelajaran yang diampu
- Mengelola soal tryout (CRUD) pada mata pelajaran yang diampu
- Melihat hasil tryout siswa berdasarkan mata pelajaran yang diampu
- Melihat feedback siswa berdasarkan mata pelajaran yang diampu
- Melihat hasil analisis sentimen berdasarkan mata pelajaran dan aspek pembelajaran pada mata pelajaran yang diampu

### 3. Siswa
- Login ke sistem
- Mengikuti tryout berdasarkan mata pelajaran
- Melihat hasil tryout
- Mengisi feedback setelah tryout

---

## 6. Konsep Tryout

- Tryout dibuat **per mata pelajaran**
- Setiap mata pelajaran memiliki soal masing-masing
- Jumlah soal: 10–15 per mata pelajaran

### Alur Tryout:
1. Siswa memilih mata pelajaran
2. Siswa mengerjakan soal
3. Siswa submit jawaban
4. Sistem menghitung skor
5. Siswa mengisi feedback

---

## 7. Konsep Feedback

Setelah tryout, siswa wajib mengisi feedback:

### Field:
- Mata pelajaran (otomatis)
- Aspek pembelajaran (dropdown)
- Komentar (teks bebas)

### Aspek pembelajaran:
- Materi
- Penyampaian
- Soal

---

## 8. Analisis Sentimen

### Metode:
- Naive Bayes (MultinomialNB)

### Tahapan:
1. Case folding
2. Tokenizing
3. Stopword removal
4. Stemming (Sastrawi)
5. Vectorization (TF-IDF)
6. Classification (Naive Bayes)

### Output:
- Positif
- Negatif
- Netral

---

## 9. Alur Sistem

1. Siswa login
2. Siswa memilih mata pelajaran
3. Siswa mengerjakan tryout
4. Siswa submit jawaban
5. Siswa mengisi feedback
6. Sistem mengirim komentar ke API NLP
7. API mengembalikan hasil sentimen
8. Data disimpan ke database
9. Admin melihat dashboard

---

## 10. Fitur Utama

### Admin:
- Login
- CRUD akun guru
- CRUD akun siswa
- CRUD mata pelajaran
- Menentukan guru pengampu mata pelajaran
- Melihat seluruh hasil tryout
- Melihat seluruh feedback
- Melihat dashboard analisis sentimen

### Guru:
- Login
- Melihat mata pelajaran yang diampu
- CRUD soal tryout sesuai mata pelajaran yang diampu
- Melihat hasil tryout siswa
- Melihat feedback siswa
- Melihat dashboard sentimen per mata pelajaran dan per aspek pembelajaran

### Siswa:
- Login
- Memilih mata pelajaran
- Mengerjakan tryout
- Melihat skor
- Mengisi feedback

---

## 11. Dashboard

Menampilkan:
- Sentimen per mata pelajaran
- Sentimen per aspek pembelajaran
- Grafik distribusi sentimen
- Tabel data feedback

---

## 12. Output Sistem

- Label sentimen (positif, negatif, netral)
- Grafik hasil analisis
- Data feedback siswa
- Insight untuk evaluasi pembelajaran

---

## 13. Keunggulan Sistem

- Integrasi tryout dan analisis sentimen
- Analisis berbasis mata pelajaran
- Analisis berbasis aspek pembelajaran
- Menggunakan NLP Bahasa Indonesia
- Berbasis web dan dapat diakses online

---