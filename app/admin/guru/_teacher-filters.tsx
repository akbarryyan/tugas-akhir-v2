"use client";

import { LiveFilters } from "@/app/admin/_live-filters";

type TeacherFiltersProps = {
  field: "all" | "email" | "name" | "nip";
  query?: string;
};

export function TeacherFilters({ field, query }: TeacherFiltersProps) {
  return (
    <LiveFilters
      field={field}
      options={[
        { label: "Semua Data", value: "all" },
        { label: "Nama Guru", value: "name" },
        { label: "Email", value: "email" },
        { label: "NIP", value: "nip" },
      ]}
      placeholder="Cari nama guru, email, atau NIP"
      query={query}
    />
  );
}
