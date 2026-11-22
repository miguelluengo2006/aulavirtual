"use client";

import { useEffect, useId, useRef, useState } from "react";

/** Contenedor común de las pantallas de acceso. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto mt-4 w-full max-w-md space-y-5">
      <div className="glass space-y-6 p-7 sm:p-10">
        <div className="space-y-2">
          <h1 className="text-3xl">{title}</h1>
          {subtitle && <p className="text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
      {footer && <p className="text-center text-sm text-muted">{footer}</p>}
    </div>
  );
}

/** Mensaje de error o aviso; recibe el foco al aparecer para lectores de pantalla y teclado. */
export function FormMessage({
  tone,
  children,
}: {
  tone: "error" | "info" | "success";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [children]);
  const styles = {
    error: "border-danger/40 bg-danger/10",
    info: "border-info/40 bg-info/10",
    success: "border-accent/40 bg-accent/10",
  }[tone];
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-2xl border px-4 py-3 text-sm outline-none ${styles}`}
    >
      {children}
    </div>
  );
}

export function TextField({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span className="pl-1 text-sm text-muted">{label}</span>
      <input id={id} className="field" aria-describedby={hint ? `${id}-hint` : undefined} {...props} />
      {hint && (
        <span id={`${id}-hint`} className="block pl-1 text-xs text-subtle">
          {hint}
        </span>
      )}
    </label>
  );
}

/** Campo de contraseña con botón para mostrarla. */
export function PasswordField({
  label,
  autoComplete,
  value,
  onChange,
  describedBy,
  name = "password",
}: {
  label: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  onChange: (v: string) => void;
  describedBy?: string;
  name?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block pl-1 text-sm text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          maxLength={128}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          className="field pr-14"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="M3 3l18 18" strokeLinecap="round" />}
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Requisitos de la contraseña, que se marcan mientras se escribe. */
export function PasswordRequirements({ id, password }: { id: string; password: string }) {
  const ok = password.length >= 8;
  return (
    <p id={id} className={`flex items-center gap-2 pl-1 text-xs ${ok ? "text-accent" : "text-subtle"}`}>
      <span
        aria-hidden
        className={`grid size-4 place-items-center rounded-full text-[9px] ${ok ? "bg-accent text-navy" : "border border-white/30"}`}
      >
        {ok && "✓"}
      </span>
      Al menos 8 caracteres{!ok && password.length > 0 ? ` (llevas ${password.length})` : ""}
    </p>
  );
}

/** Botón para reenviar un email, con espera entre envíos. */
export function ResendButton({
  onResend,
  cooldown = 60,
  label = "Reenviar el email",
}: {
  onResend: () => Promise<boolean>;
  cooldown?: number;
  label?: string;
}) {
  const [left, setLeft] = useState(cooldown);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <button
      type="button"
      disabled={left > 0 || sending}
      onClick={async () => {
        setSending(true);
        const ok = await onResend();
        setSending(false);
        if (ok) setLeft(cooldown);
      }}
      className="btn btn-ghost w-full"
    >
      {sending ? "Enviando…" : left > 0 ? `${label} (en ${left} s)` : label}
    </button>
  );
}
