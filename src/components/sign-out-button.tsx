"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-sm text-subtle hover:text-white"
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
