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
            className={`pointer-events-auto flex w-full max-w-sm gap-3 rounded-xl border bg-white px-4 py-3 text-sm text-[#0f1b33] shadow-lg ${
              t.tone === "error" ? "border-red-200" : "border-teal-200"
            }`}
          >
            <span aria-hidden className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs text-white ${t.tone === "error" ? "bg-red-600" : "bg-teal-600"}`}>
              {t.tone === "error" ? "!" : "✓"}
            </span>
            <div>
              <p className="font-medium">{t.tone === "error" ? "No se ha guardado" : "Hecho"}</p>
              <p className="text-[#52617a]">{t.text}</p>
              {t.reauth && <ReauthButton />}
            </div>
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
      className="mt-2 font-medium text-[#1d4ed8] underline underline-offset-2"
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

// ─── Diálogos ─────────────────────────────────────────────────

export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto rounded-2xl border border-[#e1e7f0] bg-white p-0 text-[#0f1b33] shadow-2xl backdrop:bg-[#061430]/50 backdrop:backdrop-blur-[2px]"
      style={{ width: `min(94vw, ${wide ? "40rem" : "28rem"})` }}
    >
      {open && (
        <div className="space-y-5 p-6">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}

/**
 * Botón que pide confirmación antes de actuar.
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
  children,
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
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" disabled={disabled} className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        typeToConfirm={typeToConfirm}
        danger={danger}
        onConfirm={onConfirm}
      >
        {children}
      </ConfirmDialog>
    </>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  typeToConfirm,
  danger,
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  typeToConfirm?: string;
  danger?: boolean;
  onConfirm: (typed: string) => Promise<boolean>;
  children?: React.ReactNode;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = !typeToConfirm || typed.trim().toLowerCase() === typeToConfirm.toLowerCase();
  const close = () => {
    setTyped("");
    onClose();
  };
  return (
    <Dialog open={open} onClose={close} title={title}>
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!ready) return;
          setBusy(true);
          const ok = await onConfirm(typed);
          setBusy(false);
          if (ok) close();
        }}
      >
        <div className="space-y-2 text-sm text-[#52617a]">{description}</div>
        {children}
        {typeToConfirm && (
          <label className="block">
            <span className="a-label">
              Escribe <strong className="font-mono text-[#0f1b33]">{typeToConfirm}</strong> para confirmar
            </span>
            <input className="a-input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
          </label>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="a-btn a-btn-secondary" onClick={close}>
            Cancelar
          </button>
          <button type="submit" disabled={!ready || busy} className={`a-btn ${danger ? "a-btn-danger" : "a-btn-primary"}`}>
            {busy ? "Un momento…" : confirmLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
