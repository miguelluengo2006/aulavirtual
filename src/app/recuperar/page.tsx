import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ForgotForm } from "@/components/auth/forgot-form";
import { emailEnabled } from "@/lib/email";

export const metadata: Metadata = { title: "Recuperar contraseña | Aula Virtual" };

export default function RecuperarPage() {
  return (
    <Suspense>
      <Forgot />
    </Suspense>
  );
}

async function Forgot() {
  await connection(); // depende de la configuración del servidor en cada petición
  return <ForgotForm available={emailEnabled()} />;
}
