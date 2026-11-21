import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

export async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <nav className="flex items-center gap-1">
        <Link href="/entrar" className="btn btn-sm text-muted hover:text-white">
          Entrar
        </Link>
        <Link href="/registro" className="btn btn-primary btn-sm">
          Crear cuenta
        </Link>
      </nav>
    );
  }

  const item = "btn btn-sm text-muted hover:text-white";
  return (
    <nav className="flex items-center gap-1">
      <Link href="/mis-cursos" className={item}>
        Mis cursos
      </Link>
      {user.role === "teacher" && (
        <Link href="/profesor" className={item}>
          Profesor
        </Link>
      )}
      {user.role === "admin" && (
        <Link href="/admin" className={item}>
          Admin
        </Link>
      )}
      <span
        title={user.email}
        className="ml-1 hidden size-8 place-items-center rounded-full bg-white/10 text-xs font-medium sm:grid"
      >
        {user.name.slice(0, 1).toUpperCase()}
      </span>
      <SignOutButton />
    </nav>
  );
}
