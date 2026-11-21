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
| `npm test` | Tests |
| `npm run typecheck` / `npm run lint` | Comprobaciones |
