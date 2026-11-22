import type { Metadata } from "next";
import { Suspense } from "react";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Crear cuenta | Aula Virtual" };

export default function RegistroPage({ searchParams }: PageProps<"/registro">) {
  return (
    <Suspense>
      <RedirectIfSignedIn searchParams={searchParams}>
        <SignUpForm />
      </RedirectIfSignedIn>
    </Suspense>
  );
}
