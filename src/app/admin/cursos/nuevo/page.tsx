import { CourseForm } from "../../_components/course-form";
import { PageHeader } from "../../_components/ui";

export default function NewCoursePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Crear curso"
        description="Empieza con los datos básicos. Después podrás añadir módulos, lecciones y preguntas. Se crea como borrador."
        back={{ href: "/admin/cursos", label: "Volver a cursos" }}
      />
      <div className="glass p-5 sm:p-7">
        <CourseForm />
      </div>
    </div>
  );
}
