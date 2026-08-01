# Diagram Sistem

> Semua diagram dalam format Mermaid. Render di [mermaid.live](https://mermaid.live), GitHub/GitLab markdown, atau VS Code (extension Mermaid Preview).

---

## 1. Pipeline Sistem (NLP & ML)

```mermaid
%%{init: {'themeVariables': {'clusterBkg': 'transparent', 'clusterBorder': 'transparent'}}}%%
flowchart TD
    Start([Mulai]) --> A[/Input Teks Komentar/]

    subgraph PRE [" "]
        direction LR
        B[Case Folding<br/>Lowercase] --> C[Hapus Karakter<br/>Khusus & Angka] --> D[Normalize<br/>Whitespace] --> E[Stopword Removal<br/>Sastrawi] --> F[Pertahankan<br/>Kata Negasi] --> G[Tokenizing] --> H[Stemming<br/>Sastrawi]
    end

    A --> B
    H --> I[TF-IDF Vectorization<br/>ngram_range = 1,2<br/>min_df = 1<br/>sublinear_tf = True]
    I --> J[Naive Bayes Classifier<br/>MultinomialNB<br/>alpha = 1.0<br/>fit_prior = True]
    J --> K{Hasil Prediksi}
    K --> L[POSITIF]
    K --> M[NEGATIF]
    K --> N[NETRAL]
    L --> O[Simpan ke Database<br/>autoLabel, autoConfidence,<br/>preprocessedText, autoMethod]
    M --> O
    N --> O
    O --> P[finalLabel = autoLabel<br/>labelSource = AUTO]
    P --> End([Selesai])

    style PRE fill:none,stroke:none,color:transparent
```

---

## 2. Flowchart Sistem

### 2.1 Flowchart Fitur Login & Autentikasi

```mermaid
flowchart TD
    Start([Mulai]) --> InputCred[/Input Kredensial Login/]

    InputCred --> MethodCheck{Metode Login?}

    MethodCheck -->|Email + Password| StaffCheck[Validasi Email dan Password via Zod]
    MethodCheck -->|NISN| NisnCheck[Validasi NISN min 10 digit via Zod]

    StaffCheck --> StaffDB{User Ditemukan di Database?}
    StaffDB -->|Ya| CheckHash{Password Cocok?}
    StaffDB -->|Tidak| Fail([Gagal Login])

    NisnCheck --> NisnDB{NISN Ditemukan di Database?}
    NisnDB -->|Ya| BuildToken[Buat JWT Token dengan role dan authMethod]
    NisnDB -->|Tidak| Fail

    CheckHash -->|Ya| BuildToken
    CheckHash -->|Tidak| Fail

    BuildToken --> SetSession[Set Session id, name, email, role, authMethod]
    SetSession --> RoleCheck{Role?}

    RoleCheck -->|ADMIN| AdminDash[/Redirect ke /admin/]
    RoleCheck -->|GURU| GuruDash[/Redirect ke /guru/]
    RoleCheck -->|SISWA| SiswaDash[/Redirect ke /siswa/]

    AdminDash --> End([Selesai])
    GuruDash --> End
    SiswaDash --> End
    Fail --> End
```

---

### 2.2 Flowchart Fitur Manajemen Data Guru

```mermaid
flowchart TD
    Start([Mulai]) --> Auth{Sudah Login<br/>sebagai ADMIN?}
    Auth -->|Tidak| Login([Redirect ke /login])
    Auth -->|Ya| Menu[/Pilih Menu<br/>Kelola Guru/]

    Menu --> Action{Pilih Aksi}

    Action -->|Tambah| FormAdd[/Input Form:<br/>Nama, Email, NIP, Password/]
    FormAdd --> ValidateAdd[Validasi Zod<br/>email valid, nama min 3,<br/>NIP min 5, password min 6]
    ValidateAdd --> CheckDup{Email/NIP<br/>Duplikat?}
    CheckDup -->|Ya| ErrorAdd([Tampilkan Error])
    CheckDup -->|Tidak| HashPwd[Hash Password<br/>scrypt]
    HashPwd --> CreateTx[Transaction:<br/>Create User + TeacherProfile]
    CreateTx --> LogActivity[Record AdminActivity<br/>action: CREATE]
    LogActivity --> Revalidate[Revalidate Path]
    Revalidate --> Success([Sukses: Data tersimpan])

    Action -->|Edit| FormEdit[/Input Form Edit:<br/>Nama, Email, NIP,<br/>Password opsional/]
    FormEdit --> ValidateEdit[Validasi Zod]
    ValidateEdit --> UpdateTx[Transaction:<br/>Update User + TeacherProfile]
    UpdateTx --> LogUpdate[Record AdminActivity<br/>action: UPDATE]
    LogUpdate --> Revalidate

    Action -->|Hapus| ConfirmDel{Konfirmasi<br/>Hapus?}
    ConfirmDel -->|Batal| Menu
    ConfirmDel -->|Ya| CheckSoal{Guru punya<br/>Soal?}
    CheckSoal -->|Ya| Blocked([Diblokir:<br/>onDelete Restrict])
    CheckSoal -->|Tidak| DeleteUser[Delete User<br/>cascade TeacherProfile,<br/>BankSoal, SubjectTeacher]
    DeleteUser --> LogDelete[Record AdminActivity<br/>action: DELETE]
    LogDelete --> Revalidate

    Action -->|Import Excel| UploadFile[/Upload File<br/>.xlsx / .csv/]
    UploadFile --> ParseFile[Parse Excel<br/>validasi header + rows]
    ParseFile --> PreviewData[/Tampilkan Preview:<br/>valid vs error/]
    PreviewData --> ConfirmImport{Konfirmasi<br/>Import?}
    ConfirmImport -->|Batal| Menu
    ConfirmImport -->|Ya| CheckDupImport{Ada Duplikat<br/>di DB?}
    CheckDupImport -->|Ya| ErrorImport([Tampilkan Error])
    CheckDupImport -->|Tidak| BatchInsert[Transaction:<br/>Batch Create Users<br/>+ TeacherProfiles]
    BatchInsert --> LogImport[Record AdminActivity<br/>action: IMPORT]
    LogImport --> Revalidate
```

---

### 2.3 Flowchart Fitur Manajemen Data Siswa

```mermaid
flowchart TD
    Start([Mulai]) --> Auth{Sudah Login<br/>sebagai ADMIN?}
    Auth -->|Tidak| Login([Redirect ke /login])
    Auth -->|Ya| Menu[/Pilih Menu<br/>Kelola Siswa/]

    Menu --> Action{Pilih Aksi}

    Action -->|Tambah| FormAdd[/Input Form:<br/>Nama, NISN, Kelas/]
    FormAdd --> ValidateAdd[Validasi Zod<br/>nama min 3, NISN min 10,<br/>kelas min 2]
    ValidateAdd --> CheckDup{NISN<br/>Duplikat?}
    CheckDup -->|Ya| ErrorAdd([Tampilkan Error])
    CheckDup -->|Tidak| CreateTx[Transaction:<br/>Create User role SISWA<br/>+ StudentProfile<br/>authMethod NISN]
    CreateTx --> LogActivity[Record AdminActivity<br/>action: CREATE]
    LogActivity --> Revalidate[Revalidate Path]
    Revalidate --> Success([Sukses: Data tersimpan])

    Action -->|Edit| FormEdit[/Input Form Edit:<br/>Nama, NISN, Kelas/]
    FormEdit --> ValidateEdit[Validasi Zod]
    ValidateEdit --> UpdateTx[Transaction:<br/>Update User + StudentProfile]
    UpdateTx --> LogUpdate[Record AdminActivity<br/>action: UPDATE]
    LogUpdate --> Revalidate

    Action -->|Hapus| ConfirmDel{Konfirmasi<br/>Hapus?}
    ConfirmDel -->|Batal| Menu
    ConfirmDel -->|Ya| DeleteUser[Delete User<br/>cascade StudentProfile,<br/>TryoutSession, Feedback,<br/>SentimentAnalysis]
    DeleteUser --> LogDelete[Record AdminActivity<br/>action: DELETE]
    LogDelete --> Revalidate

    Action -->|Import Excel| UploadFile[/Upload File<br/>.xlsx / .csv/]
    UploadFile --> ParseFile[Parse Excel<br/>validasi header + rows]
    ParseFile --> PreviewData[/Tampilkan Preview:<br/>valid vs error/]
    PreviewData --> ConfirmImport{Konfirmasi<br/>Import?}
    ConfirmImport -->|Batal| Menu
    ConfirmImport -->|Ya| CheckDupImport{Ada Duplikat<br/>di DB?}
    CheckDupImport -->|Ya| ErrorImport([Tampilkan Error])
    CheckDupImport -->|Tidak| BatchInsert[Transaction:<br/>Batch Create Users<br/>+ StudentProfiles]
    BatchInsert --> LogImport[Record AdminActivity<br/>action: IMPORT]
    LogImport --> Revalidate
```

---

### 2.4 Flowchart Fitur Manajemen Mata Pelajaran & Pengampu

```mermaid
flowchart TD
    Start([Mulai]) --> Auth{Sudah Login<br/>sebagai ADMIN?}
    Auth -->|Tidak| Login([Redirect ke /login])
    Auth -->|Ya| Menu{Pilih Menu}

    Menu -->|Kelola Mapel| MapelFlow
    Menu -->|Kelola Pengampu| PengampuFlow

    %% === MAPEL FLOW ===
    subgraph MapelFlow ["Alur Mata Pelajaran"]
        direction TD
        MapelAction{Pilih Aksi}

        MapelAction -->|Tambah| FormMapel[/Input:<br/>Nama, Deskripsi, Status/]
        FormMapel --> ValidateMapel[Validasi Zod<br/>nama min 3]
        ValidateMapel --> CheckName{Name Duplikat?}
        CheckName -->|Ya| ErrMapel([Error])
        CheckName -->|Tidak| CreateMapel[Create Subject]
        CreateMapel --> LogCreate[Record AdminActivity<br/>action: CREATE]
        LogCreate --> RevalMapel[Revalidate]

        MapelAction -->|Edit| FormEditMapel[/Input Edit Mapel/]
        FormEditMapel --> UpdateMapel[Update Subject]
        UpdateMapel --> LogUpdateMapel[Record AdminActivity<br/>action: UPDATE]
        LogUpdateMapel --> RevalMapel

        MapelAction -->|Toggle Status| ToggleMapel[Update isActive<br/>true/false]
        ToggleMapel --> LogToggle[Record AdminActivity<br/>action: TOGGLE]
        LogToggle --> RevalMapel

        MapelAction -->|Hapus| ConfirmMapel{Konfirmasi?}
        ConfirmMapel -->|Ya| DeleteMapel[Delete Subject<br/>cascade: Question, BankSoal,<br/>Tryout, Feedback, SentimentAnalysis]
        DeleteMapel --> LogDeleteMapel[Record AdminActivity<br/>action: DELETE]
        LogDeleteMapel --> RevalMapel
    end

    %% === PENGAMPU FLOW ===
    subgraph PengampuFlow ["Alur Guru Pengampu"]
        direction TD
        PengampuAction{Pilih Aksi}

        PengampuAction -->|Assign| FormAssign[/Pilih Mapel<br/>+ Pilih Guru/]
        FormAssign --> ValidateAssign[Validasi Zod<br/>subjectId + teacherId]
        ValidateAssign --> CheckAssign{Relasi sudah<br/>ada?}
        CheckAssign -->|Ya| ErrAssign([Error])
        CheckAssign -->|Tidak| CreateAssign[Create SubjectTeacher]
        CreateAssign --> LogAssign[Record AdminActivity<br/>action: CREATE]
        LogAssign --> RevalAssign[Revalidate]

        PengampuAction -->|Hapus| ConfirmAssign{Konfirmasi?}
        ConfirmAssign -->|Ya| DeleteAssign[Delete SubjectTeacher]
        DeleteAssign --> LogDelAssign[Record AdminActivity<br/>action: DELETE]
        LogDelAssign --> RevalAssign
    end

    RevalMapel --> End([Selesai])
    RevalAssign --> End
```

---

### 2.5 Flowchart Fitur Manajemen Bank Soal & Tryout

```mermaid
flowchart TD
    Start([Mulai]) --> Auth{Sudah Login<br/>sebagai GURU?}
    Auth -->|Tidak| Login([Redirect ke /login])
    Auth -->|Ya| LoadProfile[Ambil TeacherProfile<br/>berdasarkan userId]
    LoadProfile --> Menu{Pilih Menu}

    Menu -->|Bank Soal| BankFlow
    Menu -->|Soal| SoalFlow
    Menu -->|Tryout| TryoutFlow

    %% === BANK SOAL FLOW ===
    subgraph BankFlow ["Alur Bank Soal"]
        direction TD
        BankAction{Pilih Aksi}
        BankAction -->|Buat| FormBank[/Input:<br/>Judul, Deskripsi,<br/>Pilih Mapel/]
        FormBank --> CreateBank[Create BankSoal]
        CreateBank --> DoneBank([Bank Soal Tersimpan])

        BankAction -->|Tambah Soal| PilihBank[/Pilih Bank Soal<br/>+ Pilih Soal/]
        PilihBank --> AddQuestion[Create BankSoalQuestion<br/>dengan orderNumber]
        AddQuestion --> DoneBank

        BankAction -->|Hapus| ConfirmBank{Konfirmasi?}
        ConfirmBank -->|Ya| DeleteBank[Delete BankSoal<br/>cascade BankSoalQuestion]
        DeleteBank --> DoneBank
    end

    %% === SOAL FLOW ===
    subgraph SoalFlow ["Alur Soal"]
        direction TD
        SoalAction{Pilih Aksi}
        SoalAction -->|Buat| FormSoal[/Input:<br/>Teks Soal, Opsi A-D,<br/>Kunci, Penjelasan/]
        FormSoal --> ValidateSoal[Validasi Zod]
        ValidateSoal --> CreateSoal[Create Question<br/>subjectId + createdByTeacherId]
        CreateSoal --> DoneSoal([Soal Tersimpan])

        SoalAction -->|Edit| FormEditSoal[/Input Edit Soal/]
        FormEditSoal --> UpdateSoal[Update Question]
        UpdateSoal --> DoneSoal

        SoalAction -->|Hapus| ConfirmSoal{Konfirmasi?}
        ConfirmSoal -->|Ya| DeleteSoal[Delete Question<br/>cascade BankSoalQuestion,<br/>TryoutQuestion, TryoutAnswer]
        DeleteSoal --> DoneSoal
    end

    %% === TRYOUT FLOW ===
    subgraph TryoutFlow ["Alur Tryout"]
        direction TD
        TryoutAction{Pilih Aksi}
        TryoutAction -->|Buat| FormTryout[/Input:<br/>Judul, Deskripsi,<br/>Durasi, Pilih Bank Soal/]
        FormTryout --> CreateTryout[Create Tryout<br/>+ TryoutQuestion dari BankSoal]
        CreateTryout --> DraftState[Tryout Status:<br/>isPublished = false]
        DraftState --> DoneTryout([Tryout Draft Tersimpan])

        TryoutAction -->|Publish| PublishCheck{Set isPublished<br/>= true}
        PublishCheck --> DonePublish([Tryout Dipublikasi<br/>siswa dapat mengerjakan])

        TryoutAction -->|Lihat Hasil| ViewResults[/Tampilkan Daftar<br/>TryoutSession siswa<br/>+ Skor/]
        ViewResults --> DoneTryout
    end

    DoneBank --> End([Selesai])
    DoneSoal --> End
    DoneTryout --> End
    DonePublish --> End
```

---

### 2.6 Flowchart Fitur Pengerjaan Tryout

```mermaid
flowchart TD
    Start([Mulai]) --> Auth{Sudah Login<br/>sebagai SISWA?}
    Auth -->|Tidak| Login([Redirect ke /login])
    Auth -->|Ya| Dash[Dashboard Siswa]

    Dash --> ListTryout[/Lihat Daftar Tryout<br/>yang Published/]
    ListTryout --> PilihTryout[/Pilih Tryout/]

    PilihTryout --> CheckSession{Pernah<br/>mengerjakan?}
    CheckSession -->|Sudah GRADED| ShowResult[/Tampilkan Hasil<br/>sebelumnya/]
    CheckSession -->|Sudah IN_PROGRESS| Resume[ Lanjutkan Sesi]
    CheckSession -->|Belum| CreateSession

    CreateSession[Create TryoutSession<br/>status: IN_PROGRESS<br/>startedAt: now]
    CreateSession --> SoalLoop
    Resume --> SoalLoop

    SoalLoop[/Tampilkan Soal<br/>sesuai orderNumber/] --> PilihJawab[/Siswa Pilih<br/>A / B / C / D/]
    PilihJawab --> SaveAnswer[Save TryoutAnswer<br/>isCorrect: selected = correct]
    SaveAnswer --> NextSoal{Soal<br/>Terakhir?}
    NextSoal -->|Tidak| SoalLoop

    NextSoal -->|Ya| SubmitGate{Klik<br/>Submit?}
    SubmitGate -->|Belum| SoalLoop

    SubmitGate -->|Ya| ConfirmSubmit{Konfirmasi<br/>Submit?}
    ConfirmSubmit -->|Batal| SoalLoop
    ConfirmSubmit -->|Ya| HitungSkor[Hitung:<br/>correctAnswers / totalQuestions x 100]

    HitungSkor --> UpdateSession[Update TryoutSession:<br/>status: GRADED,<br/>score, submittedAt: now]
    UpdateSession --> ShowSkor[/Tampilkan Skor<br/>ke Siswa/]
    ShowSkor --> End([Selesai])
```

---

### 2.7 Flowchart Fitur Feedback & Analisis Sentimen

```mermaid
flowchart TD
    Start([Mulai]) --> SubmitTryout[/Siswa Submit Tryout<br/>Status: GRADED/]

    SubmitTryout --> CheckFeedback{Feedback<br/>3 Aspek<br/>Lengkap?}
    CheckFeedback -->|Belum Lengkap| PilihAspek[/Pilih Aspek:<br/>Materi / Penyampaian / Soal/]

    PilihAspek --> CheckAlready{Aspek sudah<br/>diisi?}
    CheckAlready -->|Sudah| PilihAspek
    CheckAlready -->|Belum| InputComment[/Input Komentar<br/>min 3 karakter/]

    InputComment --> SaveFeedback[Simpan Feedback<br/>ke Database<br/>tryoutSessionId + aspect]
    SaveFeedback --> CheckSentiment{Sudah punya<br/>SentimentAnalysis?}

    CheckSentiment -->|Sudah| SkipNLP[Skip:<br/>sudah dianalisis]
    CheckSentiment -->|Belum| CallAPI[Kirim ke FastAPI<br/>POST /predict<br/>comment, aspect, subject]

    CallAPI --> ServiceCheck{Service<br/>Available?}
    ServiceCheck -->|Tidak| ErrorSave[Simpan tanpa sentimen<br/>tampilkan error]
    ServiceCheck -->|Ya| Preprocess[Preprocessing:<br/>Case Folding → Hapus Angka<br/>→ Stopword → Stemming]

    Preprocess --> Vectorize[TF-IDF Vectorization<br/>ngram 1,2 sublinear_tf]
    Vectorize --> Predict[Naive Bayes<br/>alpha=1.0 fit_prior=True]
    Predict --> GetLabel[/Hasil:<br/>POSITIF / NEGATIF / NETRAL<br/>+ confidence score/]

    GetLabel --> SaveSentiment[Simpan SentimentAnalysis:<br/>autoLabel, autoConfidence,<br/>autoMethod = NAIVE_BAYES,<br/>preprocessedText,<br/>finalLabel = autoLabel,<br/>labelSource = AUTO]

    SaveSentiment --> CheckFeedback
    SkipNLP --> CheckFeedback
    ErrorSave --> CheckFeedback

    CheckFeedback -->|Lengkap| End([Selesai:<br/>Feedback & Sentimen Tersimpan])
```

---

### 2.8 Flowchart Fitur Review & Override Sentimen

```mermaid
flowchart TD
    Start([Mulai]) --> Auth{Login sebagai<br/>ADMIN atau GURU?}
    Auth -->|Tidak| Login([Redirect ke /login])
    Auth -->|Ya| LoadData[Ambil Daftar Feedback<br/>+ SentimentAnalysis]

    Auth -->|GURU| FilterGuru[Filter: hanya mapel<br/>yang diampu<br/>via SubjectTeacher]
    Auth -->|ADMIN| FilterGuru

    LoadData --> DisplayList[/Tampilkan Daftar:<br/>Komentar, autoLabel,<br/>finalLabel, labelSource,<br/>confidence, aspek, mapel/]

    DisplayList --> ShowChart[Tampilkan Chart:<br/>Distribusi sentimen<br/>per aspek + per mapel<br/>berdasarkan finalLabel]

    DisplayList --> Action{Pilih Aksi}

    Action -->|Override Manual| FormOverride[/Pilih Label:<br/>POSITIF / NEGATIF / NETRAL<br/>+ Catatan Review/]
    FormOverride --> CheckTeacher{GURU authorized<br/>untuk mapel ini?}
    CheckTeacher -->|Tidak| ErrAuth([Error:<br/>tidak berhak])
    CheckTeacher -->|Ya| UpdateManual[Update SentimentAnalysis:<br/>manualLabel = pilihan,<br/>finalLabel = manualLabel,<br/>labelSource = MANUAL,<br/>reviewedAt = now,<br/>reviewedByUserId]

    UpdateManual --> LogAdmin{Role = ADMIN?}
    LogAdmin -->|Ya| RecordActivity[Record AdminActivity<br/>action: UPDATE]
    LogAdmin -->|Tidak| Revalidate
    RecordActivity --> Revalidate[Revalidate Path]

    Action -->|Reset ke Auto| ResetConfirm{Konfirmasi<br/>Reset?}
    ResetConfirm -->|Ya| UpdateAuto[Update SentimentAnalysis:<br/>finalLabel = autoLabel,<br/>labelSource = AUTO,<br/>manualLabel = null,<br/>reviewNotes = null,<br/>reviewedAt = null]
    UpdateAuto --> LogAdmin

    Action -->|Reanalyze Single| ReanalyzeOne[Kirim 1 Feedback<br/>ke FastAPI /predict]
    ReanalyzeOne --> CheckManual{labelSource<br/>= MANUAL?}
    CheckManual -->|Ya| UpdateAuto_Only[Update autoLabel,<br/>autoConfidence, preprocessedText<br/>finalLabel TIDAK diubah]
    CheckManual -->|Tidak| UpdateFull[Update autoLabel, autoConfidence,<br/>preprocessedText,<br/>finalLabel = autoLabel,<br/>labelSource = AUTO,<br/>clear manual fields]
    UpdateAuto_Only --> LogAdmin
    UpdateFull --> LogAdmin

    Action -->|Reanalyze Massal| ReanalyzeBatch[Ambil max 40 Feedback<br/>sesuai filter]
    ReanalyzeBatch --> LoopEach[Loop: setiap feedback]
    LoopEach --> CallAPI[Kirim ke FastAPI /predict]
    CallAPI --> CheckManual
    LoopEach --> Revalidate

    Action -->|Export CSV| ExportData[Generate CSV:<br/>comment, preprocessedText,<br/>aspect, subject, autoLabel,<br/>finalLabel, labelSource]
    ExportData --> DownloadCSV[/Download File CSV/]
    DownloadCSV --> DisplayList

    Revalidate --> DisplayList
    ErrAuth --> DisplayList
```

---

## 3. Use Case Diagram

```mermaid
flowchart LR
    %% Actors
    Admin(("👤<br/>ADMIN"))
    Guru(("👤<br/>GURU"))
    Siswa(("👤<br/>SISWA"))
    FastAPI(("⚙️<br/>FastAPI<br/>Service"))

    %% System Boundary
    subgraph System ["Sistem Analisis Sentimen Pembelajaran"]
        direction TB

        %% Auth
        UC1(["Login Email + Password"])
        UC2(["Login NISN"])

        %% Admin Use Cases
        UC3(["Kelola Data Guru"])
        UC4(["Kelola Data Siswa"])
        UC5(["Kelola Mata Pelajaran"])
        UC6(["Assign Guru Pengampu"])
        UC7(["Import Data Excel"])
        UC8(["Monitor Tryout"])
        UC9(["Review Sentimen"])
        UC10(["Override Label Manual"])
        UC11(["Export Dataset CSV"])
        UC12(["Reanalyze Sentimen"])
        UC13(["Lihat Dashboard Statistik"])

        %% Guru Use Cases
        UC14(["Kelola Bank Soal"])
        UC15(["CRUD Soal Tryout"])
        UC16(["Buat & Publish Tryout"])
        UC17(["Lihat Hasil Tryout Siswa"])
        UC18(["Review Feedback Siswa"])
        UC19(["Override Label Manual"])
        UC20(["Reanalyze Sentimen"])

        %% Siswa Use Cases
        UC21(["Lihat Daftar Tryout"])
        UC22(["Kerjakan Tryout"])
        UC23(["Lihat Hasil & Skor"])
        UC24(["Isi Feedback 3 Aspek"])

        %% ML Service
        UC25(["Preprocessing Teks"])
        UC26(["Prediksi Sentimen"])
    end

    %% Admin connections
    Admin --- UC1
    Admin --- UC3
    Admin --- UC4
    Admin --- UC5
    Admin --- UC6
    Admin --- UC7
    Admin --- UC8
    Admin --- UC9
    Admin --- UC10
    Admin --- UC11
    Admin --- UC12
    Admin --- UC13

    %% Guru connections
    Guru --- UC1
    Guru --- UC14
    Guru --- UC15
    Guru --- UC16
    Guru --- UC17
    Guru --- UC18
    Guru --- UC19
    Guru --- UC20

    %% Siswa connections
    Siswa --- UC2
    Siswa --- UC21
    Siswa --- UC22
    Siswa --- UC23
    Siswa --- UC24

    %% FastAPI connections
    UC24 -.->|include| UC25
    UC12 -.->|trigger| UC25
    UC20 -.->|trigger| UC25
    UC25 -.->|include| UC26

    %% Include relationships
    UC3 -.->|include| UC7
    UC4 -.->|include| UC7
    UC9 -.->|extend| UC10
    UC9 -.->|extend| UC12
    UC18 -.->|extend| UC19
    UC18 -.->|extend| UC20
    UC22 -.->|include| UC24
```

---

## 4. Activity Diagram

### 4.1 Activity Diagram: Alur Tryout Siswa

```mermaid
flowchart TD
    Start([Mulai]) --> S1[/Siswa Login dengan NISN/]

    S1 --> S2[Sistem Verifikasi NISN]
    S2 --> S3{NISN Valid?}
    S3 -->|Tidak| S1
    S3 -->|Ya| S4[Tampilkan Daftar Tryout]

    S4 --> S5[/Pilih Tryout/]
    S5 --> S6{Tryout Published?}
    S6 -->|Tidak| S4
    S6 -->|Ya| S7[Buat TryoutSession<br/>Status: IN_PROGRESS]

    S7 --> S8[/Tampilkan Soal Pertama/]
    S8 --> S9[/Siswa Pilih Jawaban<br/>A / B / C / D/]

    S9 --> S10[Simpan TryoutAnswer]
    S10 --> S11{Soal Terakhir?}
    S11 -->|Tidak| S8
    S11 -->|Ya| S12[/Klik Submit/]

    S12 --> S13{Konfirmasi Submit?}
    S13 -->|Batal| S8
    S13 -->|Ya| S14[Hitung Skor Otomatis]

    S14 --> S15[Update TryoutSession:<br/>Status: GRADED, Score, correctAnswers]
    S15 --> S16[/Tampilkan Hasil Skor/]

    S16 --> S17{Feedback Lengkap?<br/>3 Aspek}
    S17 -->|Belum| S18[/Pilih Aspek:<br/>Materi / Penyampaian / Soal/]

    S18 --> S19[/Input Komentar/]
    S19 --> S20[Simpan Feedback ke DB]
    S20 --> S21[Kirim ke FastAPI<br/>POST /predict]

    S21 --> S22[Preprocessing:<br/>Case Folding → Stopword → Stemming]
    S22 --> S23[TF-IDF + Naive Bayes]
    S23 --> S24[Simpan SentimentAnalysis:<br/>autoLabel, finalLabel, AUTO]

    S24 --> S17
    S17 -->|Lengkap| End([Selesai])
```

### 4.2 Activity Diagram: Review & Override Sentimen (Admin/Guru)

```mermaid
flowchart TD
    Start([Mulai]) --> R1[/Admin/Guru Buka<br/>Halaman Review Sentimen/]

    R1 --> R2[Tampilkan Daftar Feedback<br/>+ Hasil Sentimen]
    R2 --> R3{Pilih Aksi?}

    R3 -->|Override Manual| O1[/Pilih Label Manual:<br/>POSITIF / NEGATIF / NETRAL/]
    O1 --> O2[/Input Catatan Review<br/>Opsional/]
    O2 --> O3[Update SentimentAnalysis:<br/>manualLabel, finalLabel,<br/>labelSource = MANUAL, reviewedAt]
    O3 --> O4[Record AdminActivity<br/>jika Admin]
    O4 --> R2

    R3 -->|Reset ke Auto| RS1[Update SentimentAnalysis:<br/>finalLabel = autoLabel,<br/>labelSource = AUTO,<br/>clear manualLabel]
    RS1 --> RS2[Record AdminActivity<br/>jika Admin]
    RS2 --> R2

    R3 -->|Reanalyze Single| RA1[Kirim Feedback ke<br/>FastAPI POST /predict]
    RA1 --> RA2{labelSource<br/>= MANUAL?}
    RA2 -->|Ya| RA3[Update autoLabel,<br/>autoConfidence saja<br/>finalLabel TIDAK diubah]
    RA2 -->|Tidak| RA4[Update autoLabel,<br/>finalLabel = autoLabel,<br/>labelSource = AUTO,<br/>clear manual fields]
    RA3 --> RA5[Record AdminActivity<br/>jika Admin]
    RA4 --> RA5
    RA5 --> R2

    R3 -->|Reanalyze Massal| RM1[Ambil 40 Feedback<br/>terfilter]
    RM1 --> RM2{Ada Data?}
    RM2 -->|Tidak| RM3[/Tampilkan Pesan:<br/>Tidak ada data/]
    RM3 --> R2
    RM2 -->|Ya| RM4[Loop: Untuk Setiap Feedback]
    RM4 --> RM5[Kirim ke FastAPI /predict]
    RM5 --> RA2
    RM4 --> RM6[Update Counter]
    RM6 --> RM7[Record AdminActivity<br/>jika Admin]
    RM7 --> R2

    R3 -->|Export CSV| E1[Generate CSV:<br/>comment, preprocessedText,<br/>aspect, subject, autoLabel,<br/>finalLabel, labelSource]
    E1 --> E2[/Download File CSV/]
    E2 --> R2

    R3 -->|Keluar| End([Selesai])
```

---

## 5. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o| TeacherProfile : "has (1:1, cascade)"
    User ||--o| StudentProfile : "has (1:1, cascade)"
    User ||--o{ SentimentAnalysis : "reviewed by (1:N, set null)"

    TeacherProfile ||--o{ SubjectTeacher : "teaches (1:N)"
    TeacherProfile ||--o{ Question : "created (1:N, restrict)"
    TeacherProfile ||--o{ BankSoal : "created (1:N, cascade)"
    TeacherProfile ||--o{ Tryout : "created (1:N, set null)"

    StudentProfile ||--o{ TryoutSession : "has sessions (1:N)"
    StudentProfile ||--o{ Feedback : "wrote (1:N)"

    Subject ||--o{ Question : "has (1:N)"
    Subject ||--o{ BankSoal : "has (1:N)"
    Subject ||--o{ Tryout : "has (1:N)"
    Subject ||--o{ SubjectTeacher : "assigned to (1:N)"
    Subject ||--o{ Feedback : "about (1:N)"

    SubjectTeacher }o--|| Subject : "belongs to"
    SubjectTeacher }o--|| TeacherProfile : "belongs to"

    BankSoal ||--o{ BankSoalQuestion : "contains (1:N)"
    Question ||--o{ BankSoalQuestion : "in (1:N)"

    Tryout ||--o{ TryoutQuestion : "contains (1:N)"
    Question ||--o{ TryoutQuestion : "in (1:N)"

    Tryout ||--o{ TryoutSession : "has (1:N)"
    StudentProfile ||--o{ TryoutSession : "participates (1:N)"

    TryoutSession ||--o{ TryoutAnswer : "has (1:N)"
    Question ||--o{ TryoutAnswer : "answered in (1:N)"

    TryoutSession ||--o{ Feedback : "from (1:N)"
    Feedback ||--o| SentimentAnalysis : "analyzed as (1:1, cascade)"

    Tryout }o--o| BankSoal : "uses (N:1, set null)"

    User {
        string id PK
        string name
        string email UK
        string avatarUrl
        string passwordHash
        Role role
        AuthMethod authMethod
        datetime createdAt
        datetime updatedAt
    }

    TeacherProfile {
        string id PK
        string userId FK "unique"
        string nip UK
        datetime createdAt
        datetime updatedAt
    }

    StudentProfile {
        string id PK
        string userId FK "unique"
        string nisn UK
        string className
        datetime createdAt
        datetime updatedAt
    }

    Subject {
        string id PK
        string name UK
        string description
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    SubjectTeacher {
        string id PK
        string subjectId FK
        string teacherId FK
        datetime createdAt
    }

    Question {
        string id PK
        string subjectId FK
        string createdByTeacherId FK
        string questionText
        string optionA
        string optionB
        string optionC
        string optionD
        AnswerOption correctOption
        string explanation
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    BankSoal {
        string id PK
        string subjectId FK
        string createdByTeacherId FK
        string title
        string description
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    BankSoalQuestion {
        string id PK
        string bankSoalId FK
        string questionId FK
        int orderNumber
    }

    Tryout {
        string id PK
        string subjectId FK
        string bankSoalId FK "nullable"
        string createdByTeacherId FK "nullable"
        string title
        string description
        boolean isPublished
        int durationMinutes
        datetime createdAt
        datetime updatedAt
    }

    TryoutQuestion {
        string id PK
        string tryoutId FK
        string questionId FK
        int orderNumber
    }

    TryoutSession {
        string id PK
        string studentId FK
        string tryoutId FK
        TryoutStatus status
        datetime startedAt
        datetime submittedAt
        decimal score
        int totalQuestions
        int correctAnswers
        datetime createdAt
        datetime updatedAt
    }

    TryoutAnswer {
        string id PK
        string tryoutSessionId FK
        string questionId FK
        AnswerOption selectedOption
        boolean isCorrect
        datetime answeredAt
    }

    Feedback {
        string id PK
        string studentId FK
        string subjectId FK
        string tryoutSessionId FK
        LearningAspect aspect
        string comment
        datetime createdAt
    }

    SentimentAnalysis {
        string id PK
        string feedbackId FK "unique"
        SentimentLabel autoLabel
        decimal autoConfidence
        AutoMethod autoMethod
        SentimentLabel manualLabel
        SentimentLabel finalLabel
        LabelSource labelSource
        string preprocessedText
        string modelVersion
        string reviewedByUserId FK "nullable"
        datetime reviewedAt
        string reviewNotes
        datetime analyzedAt
        datetime updatedAt
    }
```

---

## 6. Struktur Database

### Enum

| Enum           | Nilai                          |
| -------------- | ------------------------------ |
| Role           | ADMIN, GURU, SISWA             |
| AuthMethod     | EMAIL_PASSWORD, NISN           |
| AnswerOption   | A, B, C, D                     |
| TryoutStatus   | IN_PROGRESS, SUBMITTED, GRADED |
| LearningAspect | MATERI, PENYAMPAIAN, SOAL      |
| SentimentLabel | POSITIF, NEGATIF, NETRAL       |
| LabelSource    | AUTO, MANUAL                   |
| AutoMethod     | LEXICON, NAIVE_BAYES           |

### Tabel: User

| Field        | Tipe       | Constraint         | Keterangan               |
| ------------ | ---------- | ------------------ | ------------------------ |
| id           | String     | PK, default cuid() | ID unik user             |
| name         | String     | NOT NULL           | Nama lengkap             |
| email        | String     | UNIQUE, nullable   | Email admin/guru         |
| avatarUrl    | String     | nullable           | URL foto profil          |
| passwordHash | String     | nullable           | Hash scrypt (admin/guru) |
| role         | Role       | NOT NULL           | ADMIN / GURU / SISWA     |
| authMethod   | AuthMethod | NOT NULL           | EMAIL_PASSWORD / NISN    |
| createdAt    | DateTime   | default now()      | Timestamp dibuat         |
| updatedAt    | DateTime   | @updatedAt         | Timestamp update         |

**Index:** `role`, `authMethod`

### Tabel: TeacherProfile

| Field     | Tipe     | Constraint                             | Keterangan          |
| --------- | -------- | -------------------------------------- | ------------------- |
| id        | String   | PK, default cuid()                     | ID unik profil guru |
| userId    | String   | FK → User.id, UNIQUE, onDelete Cascade | Relasi ke User      |
| nip       | String   | UNIQUE, NOT NULL                       | Nomor Induk Pegawai |
| createdAt | DateTime | default now()                          |                     |
| updatedAt | DateTime | @updatedAt                             |                     |

### Tabel: StudentProfile

| Field     | Tipe     | Constraint                             | Keterangan                 |
| --------- | -------- | -------------------------------------- | -------------------------- |
| id        | String   | PK, default cuid()                     | ID unik profil siswa       |
| userId    | String   | FK → User.id, UNIQUE, onDelete Cascade | Relasi ke User             |
| nisn      | String   | UNIQUE, NOT NULL                       | Nomor Induk Siswa Nasional |
| className | String   | NOT NULL                               | Nama kelas                 |
| createdAt | DateTime | default now()                          |                            |
| updatedAt | DateTime | @updatedAt                             |                            |

**Index:** `className`

### Tabel: Subject

| Field       | Tipe     | Constraint         | Keterangan             |
| ----------- | -------- | ------------------ | ---------------------- |
| id          | String   | PK, default cuid() | ID unik mata pelajaran |
| name        | String   | UNIQUE, NOT NULL   | Nama mapel             |
| description | String   | nullable, Text     | Deskripsi mapel        |
| isActive    | Boolean  | default true       | Status aktif           |
| createdAt   | DateTime | default now()      |                        |
| updatedAt   | DateTime | @updatedAt         |                        |

**Index:** `isActive`

### Tabel: SubjectTeacher

| Field     | Tipe     | Constraint                               | Keterangan         |
| --------- | -------- | ---------------------------------------- | ------------------ |
| id        | String   | PK, default cuid()                       | ID unik assignment |
| subjectId | String   | FK → Subject.id, onDelete Cascade        |                    |
| teacherId | String   | FK → TeacherProfile.id, onDelete Cascade |                    |
| createdAt | DateTime | default now()                            |                    |

**Unique:** `[subjectId, teacherId]`
**Index:** `teacherId`

### Tabel: Question

| Field              | Tipe         | Constraint                                | Keterangan                                |
| ------------------ | ------------ | ----------------------------------------- | ----------------------------------------- |
| id                 | String       | PK, default cuid()                        | ID unik soal                              |
| subjectId          | String       | FK → Subject.id, onDelete Cascade         |                                           |
| createdByTeacherId | String       | FK → TeacherProfile.id, onDelete Restrict | Tidak bisa hapus guru jika masih ada soal |
| questionText       | String       | NOT NULL, Text                            | Pertanyaan                                |
| optionA            | String       | NOT NULL, Text                            | Opsi A                                    |
| optionB            | String       | NOT NULL, Text                            | Opsi B                                    |
| optionC            | String       | NOT NULL, Text                            | Opsi C                                    |
| optionD            | String       | NOT NULL, Text                            | Opsi D                                    |
| correctOption      | AnswerOption | NOT NULL                                  | Kunci jawaban                             |
| explanation        | String       | nullable, Text                            | Penjelasan jawaban                        |
| isActive           | Boolean      | default true                              | Status aktif                              |
| createdAt          | DateTime     | default now()                             |                                           |
| updatedAt          | DateTime     | @updatedAt                                |                                           |

**Index:** `[subjectId, isActive]`, `createdByTeacherId`

### Tabel: BankSoal

| Field              | Tipe     | Constraint                               | Keterangan        |
| ------------------ | -------- | ---------------------------------------- | ----------------- |
| id                 | String   | PK, default cuid()                       | ID unik bank soal |
| subjectId          | String   | FK → Subject.id, onDelete Cascade        |                   |
| createdByTeacherId | String   | FK → TeacherProfile.id, onDelete Cascade |                   |
| title              | String   | NOT NULL                                 | Judul bank soal   |
| description        | String   | nullable, Text                           |                   |
| isActive           | Boolean  | default true                             |                   |
| createdAt          | DateTime | default now()                            |                   |
| updatedAt          | DateTime | @updatedAt                               |                   |

**Index:** `subjectId`, `createdByTeacherId`, `isActive`

### Tabel: BankSoalQuestion

| Field       | Tipe   | Constraint                         | Keterangan  |
| ----------- | ------ | ---------------------------------- | ----------- |
| id          | String | PK, default cuid()                 |             |
| bankSoalId  | String | FK → BankSoal.id, onDelete Cascade |             |
| questionId  | String | FK → Question.id, onDelete Cascade |             |
| orderNumber | Int    | NOT NULL                           | Urutan soal |

**Unique:** `[bankSoalId, questionId]`, `[bankSoalId, orderNumber]`
**Index:** `questionId`

### Tabel: Tryout

| Field              | Tipe     | Constraint                                         | Keterangan        |
| ------------------ | -------- | -------------------------------------------------- | ----------------- |
| id                 | String   | PK, default cuid()                                 |                   |
| subjectId          | String   | FK → Subject.id, onDelete Cascade                  |                   |
| bankSoalId         | String   | FK → BankSoal.id, nullable, onDelete SetNull       |                   |
| createdByTeacherId | String   | FK → TeacherProfile.id, nullable, onDelete SetNull |                   |
| title              | String   | NOT NULL                                           | Judul tryout      |
| description        | String   | nullable, Text                                     |                   |
| isPublished        | Boolean  | default false                                      | Status publish    |
| durationMinutes    | Int      | nullable                                           | Durasi pengerjaan |
| createdAt          | DateTime | default now()                                      |                   |
| updatedAt          | DateTime | @updatedAt                                         |                   |

**Index:** `subjectId`, `bankSoalId`, `createdByTeacherId`, `isPublished`, `[subjectId, isPublished]`

### Tabel: TryoutQuestion

| Field       | Tipe   | Constraint                         | Keterangan  |
| ----------- | ------ | ---------------------------------- | ----------- |
| id          | String | PK, default cuid()                 |             |
| tryoutId    | String | FK → Tryout.id, onDelete Cascade   |             |
| questionId  | String | FK → Question.id, onDelete Cascade |             |
| orderNumber | Int    | NOT NULL                           | Urutan soal |

**Unique:** `[tryoutId, questionId]`, `[tryoutId, orderNumber]`
**Index:** `questionId`

### Tabel: TryoutSession

| Field          | Tipe         | Constraint                               | Keterangan    |
| -------------- | ------------ | ---------------------------------------- | ------------- |
| id             | String       | PK, default cuid()                       |               |
| studentId      | String       | FK → StudentProfile.id, onDelete Cascade |               |
| tryoutId       | String       | FK → Tryout.id, onDelete Cascade         |               |
| status         | TryoutStatus | default IN_PROGRESS                      | Status sesi   |
| startedAt      | DateTime     | default now()                            | Waktu mulai   |
| submittedAt    | DateTime     | nullable                                 | Waktu submit  |
| score          | Decimal      | nullable, Decimal(5,2)                   | Skor 0-100    |
| totalQuestions | Int          | default 0                                | Total soal    |
| correctAnswers | Int          | default 0                                | Jawaban benar |
| createdAt      | DateTime     | default now()                            |               |
| updatedAt      | DateTime     | @updatedAt                               |               |

**Index:** `studentId`, `tryoutId`, `status`, `[studentId, tryoutId]`

### Tabel: TryoutAnswer

| Field           | Tipe         | Constraint                              | Keterangan    |
| --------------- | ------------ | --------------------------------------- | ------------- |
| id              | String       | PK, default cuid()                      |               |
| tryoutSessionId | String       | FK → TryoutSession.id, onDelete Cascade |               |
| questionId      | String       | FK → Question.id, onDelete Cascade      |               |
| selectedOption  | AnswerOption | NOT NULL                                | Pilihan siswa |
| isCorrect       | Boolean      | NOT NULL                                | Benar/salah   |
| answeredAt      | DateTime     | default now()                           |               |

**Unique:** `[tryoutSessionId, questionId]`
**Index:** `questionId`

### Tabel: Feedback

| Field           | Tipe           | Constraint                               | Keterangan                  |
| --------------- | -------------- | ---------------------------------------- | --------------------------- |
| id              | String         | PK, default cuid()                       |                             |
| studentId       | String         | FK → StudentProfile.id, onDelete Cascade |                             |
| subjectId       | String         | FK → Subject.id, onDelete Cascade        |                             |
| tryoutSessionId | String         | FK → TryoutSession.id, onDelete Cascade  |                             |
| aspect          | LearningAspect | NOT NULL                                 | MATERI / PENYAMPAIAN / SOAL |
| comment         | String         | NOT NULL, Text                           | Komentar feedback           |
| createdAt       | DateTime       | default now()                            |                             |

**Unique:** `[tryoutSessionId, aspect]` — 1 aspek per sesi
**Index:** `studentId`, `subjectId`, `aspect`

### Tabel: SentimentAnalysis

| Field            | Tipe           | Constraint                                 | Keterangan                  |
| ---------------- | -------------- | ------------------------------------------ | --------------------------- |
| id               | String         | PK, default cuid()                         |                             |
| feedbackId       | String         | FK → Feedback.id, UNIQUE, onDelete Cascade | Relasi 1:1                  |
| autoLabel        | SentimentLabel | NOT NULL                                   | Hasil prediksi otomatis     |
| autoConfidence   | Decimal        | nullable, Decimal(5,4)                     | Skor confidence 0-1         |
| autoMethod       | AutoMethod     | NOT NULL                                   | LEXICON / NAIVE_BAYES       |
| manualLabel      | SentimentLabel | nullable                                   | Label override manual       |
| finalLabel       | SentimentLabel | NOT NULL                                   | Label final untuk dashboard |
| labelSource      | LabelSource    | NOT NULL                                   | AUTO / MANUAL               |
| preprocessedText | String         | nullable, Text                             | Teks setelah preprocessing  |
| modelVersion     | String         | nullable                                   | Versi model                 |
| reviewedByUserId | String         | FK → User.id, nullable, onDelete SetNull   | Reviewer                    |
| reviewedAt       | DateTime       | nullable                                   | Waktu review                |
| reviewNotes      | String         | nullable, Text                             | Catatan reviewer            |
| analyzedAt       | DateTime       | default now()                              | Waktu analisis              |
| updatedAt        | DateTime       | @updatedAt                                 |                             |

**Index:** `autoLabel`, `finalLabel`, `labelSource`, `autoMethod`, `reviewedByUserId`

### Tabel: AdminActivity (Raw SQL, bukan Prisma model)

| Field       | Tipe         | Constraint                   | Keterangan                         |
| ----------- | ------------ | ---------------------------- | ---------------------------------- |
| id          | VARCHAR(191) | PK                           | UUID                               |
| actorId     | VARCHAR(191) | nullable                     | User ID admin                      |
| actorName   | VARCHAR(191) | NOT NULL                     | Nama admin                         |
| action      | VARCHAR(64)  | NOT NULL                     | CREATE/UPDATE/DELETE/IMPORT/TOGGLE |
| entityType  | VARCHAR(64)  | NOT NULL                     | GURU/SISWA/MAPEL/PENGAMPU/PROFIL   |
| entityLabel | VARCHAR(191) | NOT NULL                     | Label entitas                      |
| message     | TEXT         | NOT NULL                     | Pesan aktivitas                    |
| details     | TEXT         | nullable                     | Detail perubahan                   |
| createdAt   | DATETIME(3)  | default CURRENT_TIMESTAMP(3) |                                    |

**Index:** `createdAt`, `entityType`, `action`

---

## 7. Class Diagram

```mermaid
classDiagram
    direction TB

    %% ─── Domain Models (Prisma) ───────────────────────────

    class User {
        +String id
        +String name
        +String? email
        +String? avatarUrl
        +String? passwordHash
        +Role role
        +AuthMethod authMethod
        +DateTime createdAt
        +DateTime updatedAt
    }

    class TeacherProfile {
        +String id
        +String userId
        +String nip
        +DateTime createdAt
        +DateTime updatedAt
    }

    class StudentProfile {
        +String id
        +String userId
        +String nisn
        +String className
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Subject {
        +String id
        +String name
        +String? description
        +Boolean isActive
        +DateTime createdAt
        +DateTime updatedAt
    }

    class SubjectTeacher {
        +String id
        +String subjectId
        +String teacherId
        +DateTime createdAt
    }

    class Question {
        +String id
        +String subjectId
        +String createdByTeacherId
        +String questionText
        +String optionA
        +String optionB
        +String optionC
        +String optionD
        +AnswerOption correctOption
        +String? explanation
        +Boolean isActive
        +DateTime createdAt
        +DateTime updatedAt
    }

    class BankSoal {
        +String id
        +String subjectId
        +String createdByTeacherId
        +String title
        +String? description
        +Boolean isActive
        +DateTime createdAt
        +DateTime updatedAt
    }

    class BankSoalQuestion {
        +String id
        +String bankSoalId
        +String questionId
        +Int orderNumber
    }

    class Tryout {
        +String id
        +String subjectId
        +String? bankSoalId
        +String? createdByTeacherId
        +String title
        +String? description
        +Boolean isPublished
        +Int? durationMinutes
        +DateTime createdAt
        +DateTime updatedAt
    }

    class TryoutQuestion {
        +String id
        +String tryoutId
        +String questionId
        +Int orderNumber
    }

    class TryoutSession {
        +String id
        +String studentId
        +String tryoutId
        +TryoutStatus status
        +DateTime startedAt
        +DateTime? submittedAt
        +Decimal? score
        +Int totalQuestions
        +Int correctAnswers
        +DateTime createdAt
        +DateTime updatedAt
    }

    class TryoutAnswer {
        +String id
        +String tryoutSessionId
        +String questionId
        +AnswerOption selectedOption
        +Boolean isCorrect
        +DateTime answeredAt
    }

    class Feedback {
        +String id
        +String studentId
        +String subjectId
        +String tryoutSessionId
        +LearningAspect aspect
        +String comment
        +DateTime createdAt
    }

    class SentimentAnalysis {
        +String id
        +String feedbackId
        +SentimentLabel autoLabel
        +Decimal? autoConfidence
        +AutoMethod autoMethod
        +SentimentLabel? manualLabel
        +SentimentLabel finalLabel
        +LabelSource labelSource
        +String? preprocessedText
        +String? modelVersion
        +String? reviewedByUserId
        +DateTime? reviewedAt
        +String? reviewNotes
        +DateTime analyzedAt
        +DateTime updatedAt
    }

    %% ─── Relationships ─────────────────────────────────────

    User "1" --> "0..1" TeacherProfile : has
    User "1" --> "0..1" StudentProfile : has
    User "1" --> "0..*" SentimentAnalysis : reviewedBy

    TeacherProfile "1" --> "0..*" SubjectTeacher : teaches
    TeacherProfile "1" --> "0..*" Question : creates
    TeacherProfile "1" --> "0..*" BankSoal : creates
    TeacherProfile "1" --> "0..*" Tryout : creates

    StudentProfile "1" --> "0..*" TryoutSession : has
    StudentProfile "1" --> "0..*" Feedback : writes

    Subject "1" --> "0..*" Question : has
    Subject "1" --> "0..*" BankSoal : has
    Subject "1" --> "0..*" Tryout : has
    Subject "1" --> "0..*" SubjectTeacher : assigned
    Subject "1" --> "0..*" Feedback : about

    SubjectTeacher "*" --> "1" Subject
    SubjectTeacher "*" --> "1" TeacherProfile

    BankSoal "1" --> "0..*" BankSoalQuestion : contains
    Question "1" --> "0..*" BankSoalQuestion : in

    Tryout "1" --> "0..*" TryoutQuestion : contains
    Question "1" --> "0..*" TryoutQuestion : in
    Tryout "*" --> "0..1" BankSoal : uses

    Tryout "1" --> "0..*" TryoutSession : has
    StudentProfile "1" --> "0..*" TryoutSession : participates

    TryoutSession "1" --> "0..*" TryoutAnswer : has
    Question "1" --> "0..*" TryoutAnswer : answered

    TryoutSession "1" --> "0..*" Feedback : from
    Feedback "1" --> "0..1" SentimentAnalysis : analyzed

    %% ─── Python ML Service Classes ─────────────────────────

    class Settings {
        +String app_env
        +String app_host
        +Int app_port
        +String model_version
        +String model_path
        +String? training_dataset_export_url
        +String? training_dataset_export_token
        +String cors_origins
        +Int rate_limit_per_minute
        +get_settings() Settings
    }

    class PredictRequest {
        +String comment
        +LearningAspect aspect
        +String? subject
    }

    class PredictResponse {
        +SentimentLabel label
        +Float confidence
        +String preprocessedText
        +String modelVersion
        +Boolean modelReady
        +AutoMethod autoMethod
    }

    class HealthResponse {
        +String status
        +String modelVersion
        +Boolean modelReady
    }

    class Preprocessing {
        +StemmerFactory stemmer
        +StopWordRemover stopword_remover
        +preprocess_text(text: str) str
    }

    class ModelLoader {
        +get_model_path() Path
        +is_model_ready() bool
        +load_model() Any
    }

    class Inference {
        +_coerce_label(value: object) SentimentLabel
        +predict_sentiment(payload: PredictRequest) PredictResponse
    }

    class TrainModel {
        +build_pipeline() Pipeline
        +load_and_validate_dataset(path: Path) DataFrame
        +can_use_stratified_split(df: DataFrame, test_size: float) bool
        +main() void
    }

    PredictRequest --> Inference : input
    Inference --> PredictResponse : output
    Inference ..> Preprocessing : uses
    Inference ..> ModelLoader : uses
    TrainModel ..> Preprocessing : uses
    Settings --> ModelLoader : config
    Settings --> TrainModel : config

    %% ─── Frontend Auth Classes ─────────────────────────────

    class AuthOptions {
        +signInPage: String
        +sessionStrategy: String
        +providers: Provider[]
        +jwtCallback(token, user) JWT
        +sessionCallback(session, token) Session
    }

    class PasswordUtil {
        +hashPassword(password: String) String
        +verifyPassword(password: String, hash: String) Boolean
    }

    class SessionManager {
        +getCurrentSession() Session?
        +requireRole(allowedRoles: Role[]) Session
    }

    class SentimentClient {
        +predictSentiment(input: PredictSentimentInput) PredictSentimentResult
        -getSentimentServiceUrl() String
        -coerceSentimentLabel(value: String) SentimentLabel
        -coerceAutoMethod(value: String) AutoMethod
    }

    AuthOptions ..> PasswordUtil : uses
    SessionManager ..> AuthOptions : uses
    SentimentClient ..> PredictRequest : sends
```

---

## Keterangan Simbol

### Flowchart

| Simbol              | Bentuk Mermaid | Fungsi                |
| ------------------- | -------------- | --------------------- |
| Oval/Terminator     | `([teks])`     | Mulai/Selesai         |
| Persegi/Proses      | `[teks]`       | Proses/operasi        |
| Diamond/Keputusan   | `{teks}`       | Percabangan/kondisi   |
| Jajaran genjang/I-O | `[/teks/]`     | Input/Output          |
| Silinder/Database   | `[(teks)]`     | Database/penyimpanan  |
| Subroutine          | `[[teks]]`     | Proses terdefinisi    |
| Garis putus-putus   | `-.->`         | Relasi include/extend |

### ERD

| Simbol   | Arti         |
| -------- | ------------ | ----- | -------------------------- | ------------------------- | ---------- |
| `        |              | --    |                            | `                         | One to One |
| `        |              | --o   | `                          | One to Zero-or-One        |
| `        |              | --o{` | One to Many (zero or more) |
| `        |              | --    | {`                         | One to Many (one or more) |
| `}o--o{` | Many to Many |

### Class Diagram

| Simbol                | Arti                |
| --------------------- | ------------------- |
| `+`                   | Public              |
| `-`                   | Private             |
| `#`                   | Protected           |
| `-->`                 | Asosiasi (directed) |
| `..>`                 | Dependency          |
| `..>` `uses`          | Uses relationship   |
| `1` / `0..*` / `0..1` | Multiplicity        |
