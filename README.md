# Aula Virtual

Plataforma de cursos de pago. Los cursos se crean con Claude Code a partir de una carpeta (vídeos + HTML para los quizzes) o desde el panel de administración.

La guía completa del proyecto está en [`CLAUDE.md`](./CLAUDE.md).

## Puesta en marcha

Necesitas Node.js 22+ y una base de datos PostgreSQL (local, [Neon](https://neon.tech) o [Supabase](https://supabase.com)).

```bash
npm install
cp .env.example .env.local     # rellena DATABASE_URL y BETTER_AUTH_SECRET
npm run db:migrate
npm run dev
```

Abre http://localhost:3000, crea tu cuenta y hazte admin:

```bash
npm run user:role tu@email.com admin
```

## Subir un vídeo

Necesitas [ffmpeg](https://ffmpeg.org) instalado y las variables `R2_*` en `.env.local` (ver `CLAUDE.md` → Vídeo, incluida la política CORS del bucket).

```bash
npm run video:prepare -- ~/videos/intro.mp4 cursos/mi-curso/introduccion --upload
```

Convierte el vídeo a HLS cifrado, lo sube a R2 y te da el bloque `video` para el `course.json`.

## Importar un curso

Pídele a Claude Code que prepare un curso a partir de una carpeta, o hazlo a mano:

```bash
npm run course:validate content/courses/nextjs-desde-cero/course.json
npm run course:import -- content/courses/nextjs-desde-cero/course.json
```

El curso entra como borrador; revísalo en `/admin`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run db:generate` | Crea una migración tras cambiar `src/db/schema.ts` |
| `npm run db:migrate` | Aplica las migraciones |
| `npm run course:validate <ruta>` | Valida un `course.json` |
| `npm run course:import -- <ruta>` | Importa un curso como borrador |
| `npm run user:role <email> <rol>` | Cambia el rol (`admin`, `teacher`, `student`) |
| `npm run video:prepare -- <vídeo> <carpeta> --upload` | Convierte un vídeo a HLS cifrado y lo sube a R2 |
| `npm test` | Tests |
| `npm run typecheck` / `npm run lint` | Comprobaciones |
