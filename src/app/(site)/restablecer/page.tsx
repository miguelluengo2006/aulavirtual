import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  // La URL lleva el token: que no se envíe a otros sitios al salir.
  referrer: "no-referrer",
};

export default function RestablecerPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
