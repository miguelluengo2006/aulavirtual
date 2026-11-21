// npm run course:validate content/courses/<slug>/course.json
import { argPath, loadManifest } from "./_manifest";

const ok = await loadManifest(argPath());
process.exit(ok ? 0 : 1);
