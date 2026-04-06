import { Role } from "@prisma/client";

export function getDashboardPathForRole(role: Role) {
  switch (role) {
    case Role.ADMIN:
      return "/admin";
    case Role.GURU:
      return "/guru";
    case Role.SISWA:
      return "/siswa";
    default:
      return "/login";
  }
}
