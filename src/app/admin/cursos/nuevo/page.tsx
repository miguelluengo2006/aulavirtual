import { CourseWizard } from "../../_components/course-wizard";
import { PageHeader } from "../../_components/ui";

export default function NewCoursePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/admin/cursos", label: "Cursos" }}
        title="Crear un curso"
        description="Tres pasos: los datos, el temario y revisar. Nada se guarda hasta el final."
      />
      <CourseWizard />
    </div>
  );
}
