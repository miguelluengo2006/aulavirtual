import type { Metadata } from "next";
import { Suspense } from "react";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Entrar | Aula Virtual" };

export default function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <Suspense>
      <RedirectIfSignedIn searchParams={searchParams}>
        <SignInForm />
      </RedirectIfSignedIn>
    </Suspense>
  );
}
