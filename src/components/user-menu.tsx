import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

export async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/entrar" className="hover:underline">
          Entrar
        </Link>
        <Link
          href="/registro"
          className="rounded-md bg-stone-900 px-3 py-1.5 text-white hover:bg-stone-700"
        >
          Crear cuenta
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/mis-cursos" className="hover:underline">
        Mis cursos
      </Link>
      {user.role === "teacher" && (
        <Link href="/profesor" className="hover:underline">
          Profesor
        </Link>
      )}
      {user.role === "admin" && (
        <Link href="/admin" className="hover:underline">
          Admin
        </Link>
      )}
      <span className="text-stone-500">{user.name}</span>
      <SignOutButton />
    </nav>
  );
}
