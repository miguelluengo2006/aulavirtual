// npm run course:import -- content/courses/<slug>/course.json [--allow-published] [--prune]
// (el "--" hace falta para que npm pase las opciones al script)
import "./_env";
import { argPath, loadManifest } from "./_manifest";

const { db, pool } = await import("@/db");
const { importCourse, ImportError } = await import("@/lib/course-import");

const manifest = await loadManifest(argPath());
if (!manifest) process.exit(1);

const flags = new Set(process.argv.slice(2));
try {
  const r = await importCourse(db, manifest, {
    allowPublished: flags.has("--allow-published"),
    prune: flags.has("--prune"),
  });
  console.log(`\n✓ Curso ${r.created ? "creado" : "actualizado"} como ${r.status === "draft" ? "borrador" : r.status}`);
  console.log(`  id: ${r.courseId}`);
  console.log(`  Revísalo en /admin/cursos/${r.courseId}`);
  if (r.teachersAdded.length) console.log(`  Profesores añadidos: ${r.teachersAdded.join(", ")}`);
  if (r.teachersNotFound.length) {
    console.log(
      `  ! Profesores sin cuenta (que se registren y vuelve a importar): ${r.teachersNotFound.join(", ")}`,
    );
  }
  if (r.orphanLessons.length) {
    console.log(
      r.pruned
        ? `  Lecciones eliminadas: ${r.orphanLessons.join(", ")}`
        : `  ! Lecciones en la base de datos que no están en el manifiesto (no se han tocado; usa --prune para borrarlas): ${r.orphanLessons.join(", ")}`,
    );
  }
} catch (e) {
  console.error(`✗ ${e instanceof ImportError ? e.message : (e as Error).stack}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
