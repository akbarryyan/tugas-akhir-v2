import { z } from "zod";

export const teacherCreateSchema = z.object({
  email: z.email("Email guru tidak valid.").transform((value) => value.trim().toLowerCase()),
  name: z.string().trim().min(3, "Nama guru minimal 3 karakter."),
  nip: z.string().trim().min(5, "NIP minimal 5 karakter."),
  password: z.string().min(6, "Password minimal 6 karakter."),
});

export const teacherUpdateSchema = z.object({
  email: z.email("Email guru tidak valid.").transform((value) => value.trim().toLowerCase()),
  name: z.string().trim().min(3, "Nama guru minimal 3 karakter."),
  nip: z.string().trim().min(5, "NIP minimal 5 karakter."),
  password: z.string().optional(),
  teacherId: z.string().min(1),
  userId: z.string().min(1),
});

export const studentCreateSchema = z.object({
  className: z.string().trim().min(2, "Kelas wajib diisi."),
  name: z.string().trim().min(3, "Nama siswa minimal 3 karakter."),
  nisn: z.string().trim().min(10, "NISN minimal 10 digit."),
});

export const studentUpdateSchema = z.object({
  className: z.string().trim().min(2, "Kelas wajib diisi."),
  name: z.string().trim().min(3, "Nama siswa minimal 3 karakter."),
  nisn: z.string().trim().min(10, "NISN minimal 10 digit."),
  studentId: z.string().min(1),
  userId: z.string().min(1),
});

export const subjectSchema = z.object({
  description: z.string().trim().optional(),
  isActive: z.boolean(),
  name: z.string().trim().min(3, "Nama mata pelajaran minimal 3 karakter."),
});

export const subjectUpdateSchema = subjectSchema.extend({
  subjectId: z.string().min(1),
});

export const subjectStatusSchema = z.object({
  isActive: z.boolean(),
  subjectId: z.string().min(1),
});

export const assignmentSchema = z.object({
  classNames: z
    .array(z.string().trim().min(2))
    .min(1, "Minimal satu kelas wajib dipilih."),
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih."),
  teacherId: z.string().min(1, "Guru wajib dipilih."),
});
