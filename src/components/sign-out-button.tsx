"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-stone-500 hover:text-stone-900"
      onClick={async () => {
        await signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}
