import { describe, expect, it } from "vitest";
import { decideCourseAccess, type AccessInput } from "./access-rules";

const base: AccessInput = {
  role: "student",
  courseStatus: "published",
  includedInSubscription: true,
  hasEnrollment: false,
  hasActiveSubscription: false,
  isTeacherOfCourse: false,
};

describe("decideCourseAccess", () => {
  it("sin compra ni suscripción no hay acceso", () => {
    expect(decideCourseAccess(base)).toBe(false);
  });
  it("la compra da acceso", () => {
    expect(decideCourseAccess({ ...base, hasEnrollment: true })).toBe(true);
  });
  it("la compra mantiene el acceso si el curso se archiva", () => {
    expect(decideCourseAccess({ ...base, hasEnrollment: true, courseStatus: "archived" })).toBe(true);
  });
  it("la suscripción da acceso a cursos del catálogo", () => {
    expect(decideCourseAccess({ ...base, hasActiveSubscription: true })).toBe(true);
  });
  it("la suscripción no da acceso a cursos fuera del catálogo", () => {
    expect(
      decideCourseAccess({ ...base, hasActiveSubscription: true, includedInSubscription: false }),
    ).toBe(false);
  });
  it("la suscripción no da acceso a cursos archivados", () => {
    expect(
      decideCourseAccess({ ...base, hasActiveSubscription: true, courseStatus: "archived" }),
    ).toBe(false);
  });
  it("un alumno nunca ve un borrador, aunque lo haya comprado", () => {
    expect(decideCourseAccess({ ...base, courseStatus: "draft", hasEnrollment: true })).toBe(false);
  });
  it("el admin ve los borradores", () => {
    expect(decideCourseAccess({ ...base, role: "admin", courseStatus: "draft" })).toBe(true);
  });
  it("el profesor del curso tiene acceso", () => {
    expect(decideCourseAccess({ ...base, role: "teacher", isTeacherOfCourse: true })).toBe(true);
  });
  it("un profesor no ve cursos que no son suyos", () => {
    expect(decideCourseAccess({ ...base, role: "teacher" })).toBe(false);
  });
});
