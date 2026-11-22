// Mensajes de error de autenticación en español. Función pura, con tests.

export type AuthErrorLike = { code?: string; status?: number; message?: string } | null | undefined;

const messages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "El email o la contraseña no son correctos.",
  INVALID_PASSWORD: "El email o la contraseña no son correctos.",
  USER_NOT_FOUND: "El email o la contraseña no son correctos.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "El email o la contraseña no son correctos.",
  INVALID_EMAIL: "Revisa el email: no parece válido.",
  USER_ALREADY_EXISTS:
    "Ya existe una cuenta con este email. Entra con tu contraseña o recupérala si no la recuerdas.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Ya existe una cuenta con este email. Entra con tu contraseña o recupérala si no la recuerdas.",
  PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
  PASSWORD_TOO_LONG: "La contraseña no puede tener más de 128 caracteres.",
  NAME_REQUIRED: "Escribe tu nombre.",
  NAME_TOO_LONG: "El nombre es demasiado largo (máximo 80 caracteres).",
  EMAIL_NOT_VERIFIED: "Aún no has confirmado tu email.",
  EMAIL_ALREADY_VERIFIED: "Tu email ya está confirmado. Ya puedes entrar.",
  INVALID_TOKEN: "El enlace no es válido o ya se ha usado. Pide uno nuevo.",
  TOKEN_EXPIRED: "El enlace ha caducado. Pide uno nuevo.",
};

export function authErrorMessage(error: AuthErrorLike): string {
  if (!error) return "";
  if (error.status === 429) {
    return "Demasiados intentos seguidos. Espera un minuto y vuelve a probar.";
  }
  if (error.code && messages[error.code]) return messages[error.code];
  if (!error.status) {
    return "No hemos podido conectar. Revisa tu conexión a internet e inténtalo de nuevo.";
  }
  return "Algo ha fallado. Inténtalo de nuevo en unos segundos.";
}

/** Códigos que llegan en la URL (?error=...) desde los enlaces de los emails. */
export function linkErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  const c = code.toUpperCase();
  if (c === "TOKEN_EXPIRED") return messages.TOKEN_EXPIRED;
  return messages.INVALID_TOKEN;
}

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
