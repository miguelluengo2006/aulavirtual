"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { signOut } from "@/lib/auth-client";
import type { ActionResult } from "@/lib/admin/action";

// ─── Avisos ───────────────────────────────────────────────────

type Toast = { id: number; tone: "success" | "error"; text: string; reauth?: boolean };
const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), t.tone === "error" ? 9000 : 3500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:left-auto sm:right-6 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={`glass glass-strong pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 text-sm ${t.tone === "error" ? "border-danger/50" : "border-accent/50"}`}
          >
            <p>
              <span className={t.tone === "error" ? "text-danger" : "text-accent"}>{t.tone === "error" ? "No se ha guardado. " : "Hecho. "}</span>
              {t.text}
            </p>
            {t.reauth && <ReauthButton />}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/** Cierra la sesión y lleva a entrar, para volver luego a esta misma página. */
function ReauthButton() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <button
      type="button"
      className="link mt-2"
      onClick={async () => {
        await signOut();
        router.push(`/entrar?next=${encodeURIComponent(pathname)}`);
      }}
    >
      Volver a entrar
    </button>
  );
}

/** Ejecuta una acción del panel y muestra el resultado. */
export function useAdminAction() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = useCallback(
    <T,>(fn: () => Promise<ActionResult<T>>, success?: string, onSuccess?: (data: T) => void) =>
      new Promise<boolean>((resolve) => {
        start(async () => {
          try {
            const r = await fn();
            if (r.ok) {
              if (success) toast({ tone: "success", text: success });
              onSuccess?.(r.data);
              resolve(true);
            } else {
              toast({ tone: "error", text: r.error, reauth: r.reauth });
              resolve(false);
            }
          } catch {
            toast({ tone: "error", text: "No hemos podido conectar con el servidor. Revisa tu conexión." });
            resolve(false);
          }
        });
      }),
    [toast],
  );
  return { run, pending };
}

// ─── Confirmación ─────────────────────────────────────────────

/**
 * Botón que pide confirmación en un diálogo antes de actuar.
 * Con `typeToConfirm`, hay que escribir ese texto exacto para poder continuar.
 */
export function ConfirmButton({
  label,
  title,
  description,
  confirmLabel,
  typeToConfirm,
  danger,
  className,
  disabled,
  onConfirm,
}: {
  label: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  typeToConfirm?: string;
  danger?: boolean;
  className?: string;
  disabled?: boolean;
  onConfirm: (typed: string) => Promise<boolean>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = !typeToConfirm || typed.trim() === typeToConfirm;

  useEffect(() => {
    const d = ref.current;
    const reset = () => setTyped("");
    d?.addEventListener("close", reset);
    return () => d?.removeEventListener("close", reset);
  }, []);

  return (
    <>
      <button type="button" disabled={disabled} className={className} onClick={() => ref.current?.showModal()}>
        {label}
      </button>
      <dialog
        ref={ref}
        className="glass glass-strong m-auto w-[min(92vw,28rem)] p-0 text-white backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <form
          method="dialog"
          className="space-y-5 p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!ready) return;
            setBusy(true);
            const ok = await onConfirm(typed);
            setBusy(false);
            if (ok) ref.current?.close();
          }}
        >
          <h2 className="text-xl">{title}</h2>
          <div className="space-y-2 text-sm text-muted">{description}</div>
          {typeToConfirm && (
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted">
                Escribe <strong className="font-mono text-white">{typeToConfirm}</strong> para confirmar
              </span>
              <input className="field" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
            </label>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => ref.current?.close()}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!ready || busy}
              className={`btn btn-sm ${danger ? "bg-danger text-navy hover:bg-danger/85" : "btn-primary"}`}
            >
              {busy ? "Un momento…" : confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
