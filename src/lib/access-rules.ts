// Reglas de acceso puras (sin base de datos) para poder testearlas.

export type AccessInput = {
  role: "admin" | "teacher" | "student";
  courseStatus: "draft" | "published" | "archived";
  includedInSubscription: boolean;
  hasEnrollment: boolean;
  hasActiveSubscription: boolean;
  isTeacherOfCourse: boolean;
};

export function decideCourseAccess(i: AccessInput): boolean {
  // El admin lo ve todo, incluidos los borradores (para revisarlos).
  if (i.role === "admin") return true;

  // Los profesores ven sus cursos para atender dudas y foro.
  if (i.isTeacherOfCourse) return true;

  // Un borrador solo lo ven admin y profesores asignados.
  if (i.courseStatus === "draft") return false;

  // Quien compró el curso conserva el acceso aunque luego se archive.
  if (i.hasEnrollment) return true;

  // La suscripción solo da acceso a cursos publicados del catálogo.
  return (
    i.courseStatus === "published" &&
    i.includedInSubscription &&
    i.hasActiveSubscription
  );
}
