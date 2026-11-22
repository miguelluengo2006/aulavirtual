// Plantillas de email (HTML con estilos en línea + texto plano).

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(opts: { title: string; intro: string; button?: { label: string; url: string }; outro: string }) {
  const button = opts.button
    ? `<tr><td style="padding:8px 0 24px"><a href="${escape(opts.button.url)}" style="display:inline-block;background:#ffffff;color:#061430;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px">${escape(opts.button.label)}</a></td></tr>
       <tr><td style="font-size:13px;color:#9fb0d0;padding-bottom:24px">Si el botón no funciona, copia este enlace en el navegador:<br><a href="${escape(opts.button.url)}" style="color:#2dd4bf;word-break:break-all">${escape(opts.button.url)}</a></td></tr>`
    : "";
  return `<!doctype html><html lang="es"><body style="margin:0;background:#061430;font-family:Poppins,Segoe UI,Helvetica,Arial,sans-serif;color:#ffffff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#061430;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0d2148;border:1px solid #1f3a6e;border-radius:24px;padding:32px">
<tr><td style="font-weight:600;font-size:15px;padding-bottom:24px">Aula Virtual</td></tr>
<tr><td style="font-size:24px;font-weight:600;letter-spacing:-0.5px;padding-bottom:12px">${escape(opts.title)}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#dbe6ff;padding-bottom:24px">${opts.intro}</td></tr>
${button}
<tr><td style="font-size:13px;line-height:1.6;color:#9fb0d0">${opts.outro}</td></tr>
</table></td></tr></table></body></html>`;
}

export function verifyEmailTemplate(name: string, url: string) {
  return {
    subject: "Confirma tu email para empezar",
    html: layout({
      title: `Hola, ${escape(name)}`,
      intro: "Confirma tu email para activar tu cuenta de Aula Virtual. Solo tienes que pulsar el botón.",
      button: { label: "Confirmar mi email", url },
      outro: "El enlace caduca en 24 horas. Si no has creado una cuenta, puedes ignorar este email.",
    }),
    text: `Hola, ${name}\n\nConfirma tu email para activar tu cuenta de Aula Virtual:\n${url}\n\nEl enlace caduca en 24 horas. Si no has creado una cuenta, ignora este email.`,
  };
}

export function resetPasswordTemplate(name: string, url: string) {
  return {
    subject: "Restablece tu contraseña",
    html: layout({
      title: "Restablece tu contraseña",
      intro: `Hola, ${escape(name)}. Hemos recibido una solicitud para cambiar la contraseña de tu cuenta.`,
      button: { label: "Elegir una contraseña nueva", url },
      outro:
        "El enlace caduca en 1 hora y solo se puede usar una vez. Si no lo has pedido tú, ignora este email: tu contraseña no cambiará.",
    }),
    text: `Hola, ${name}\n\nPara elegir una contraseña nueva, abre este enlace:\n${url}\n\nCaduca en 1 hora y solo se puede usar una vez. Si no lo has pedido tú, ignora este email.`,
  };
}

export function existingAccountTemplate(name: string, signInUrl: string, resetUrl: string) {
  return {
    subject: "Ya tienes una cuenta en Aula Virtual",
    html: layout({
      title: "Ya tienes una cuenta",
      intro: `Hola, ${escape(name)}. Alguien ha intentado crear una cuenta nueva con este email, pero ya tienes una. Entra con tu contraseña de siempre.`,
      button: { label: "Entrar en mi cuenta", url: signInUrl },
      outro: `¿No recuerdas la contraseña? <a href="${escape(resetUrl)}" style="color:#2dd4bf">Puedes elegir una nueva</a>. Si no has sido tú, no tienes que hacer nada.`,
    }),
    text: `Hola, ${name}\n\nAlguien ha intentado crear una cuenta con este email, pero ya tienes una. Entra aquí: ${signInUrl}\n¿No recuerdas la contraseña? ${resetUrl}\nSi no has sido tú, no tienes que hacer nada.`,
  };
}

export function passwordChangedTemplate(name: string, resetUrl: string) {
  return {
    subject: "Tu contraseña ha cambiado",
    html: layout({
      title: "Tu contraseña ha cambiado",
      intro: `Hola, ${escape(name)}. La contraseña de tu cuenta se acaba de cambiar y hemos cerrado la sesión en todos tus dispositivos.`,
      outro: `Si no has sido tú, <a href="${escape(resetUrl)}" style="color:#2dd4bf">elige otra contraseña ahora</a>.`,
    }),
    text: `Hola, ${name}\n\nLa contraseña de tu cuenta se acaba de cambiar y hemos cerrado la sesión en todos tus dispositivos.\nSi no has sido tú, elige otra ahora: ${resetUrl}`,
  };
}
