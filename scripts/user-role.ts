// npm run user:role <email> <admin|teacher|student>
import "./_env";

const [email, role] = process.argv.slice(2);
if (!email || !["admin", "teacher", "student"].includes(role)) {
  console.error("Uso: npm run user:role <email> <admin|teacher|student>");
  process.exit(2);
}

const { db, pool } = await import("@/db");
const { user } = await import("@/db/schema");
const { eq } = await import("drizzle-orm");

const updated = await db
  .update(user)
  .set({ role: role as "admin" | "teacher" | "student" })
  .where(eq(user.email, email.toLowerCase()))
  .returning({ email: user.email });

console.log(
  updated.length
    ? `✓ ${email} ahora es ${role}`
    : `✗ No existe ningún usuario con el email ${email}. Primero tiene que registrarse.`,
);
await pool.end();
process.exitCode = updated.length ? 0 : 1;
