const nodemailer = require("nodemailer");

const crearTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const enviarCorreo = async ({ para, asunto, html, texto }) => {
  const transporter = crearTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: para,
    subject: asunto,
    text: texto || "",
    html: html || "",
  };
  return await transporter.sendMail(mailOptions);
};

// Plantilla: contrasena temporal (sigue existiendo por si acaso)
const plantillaPasswordTemporal = (nombre, password) => {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#141414;border:1px solid #1f1f1f;border-radius:12px;padding:40px;">
        <tr><td align="center" style="padding-bottom:24px;border-bottom:1px solid #1f1f1f;">
          <div style="display:inline-block;background:#16a34a;color:#ffffff;font-weight:900;font-size:18px;padding:12px 18px;border-radius:8px;letter-spacing:1px;">MR</div>
          <p style="margin:12px 0 0 0;font-size:12px;letter-spacing:3px;color:#16a34a;">MOTOS RACING QUIBDO</p>
        </td></tr>
        <tr><td style="padding-top:32px;">
          <h1 style="margin:0 0 12px 0;font-size:22px;">Acceso al sistema</h1>
          <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#a1a1aa;">Hola ${nombre}, se ha creado tu cuenta de administrador. Tu contrasena temporal es:</p>
          <table width="100%" style="background:#0a0a0a;border:1px solid #16a34a;border-radius:10px;padding:20px;margin-bottom:24px;">
            <tr><td align="center">
              <p style="margin:0;font-size:22px;font-weight:bold;color:#ffffff;font-family:Consolas,monospace;">${password}</p>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#71717a;">Deberas cambiarla al iniciar sesion.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

// Plantilla: link para restablecer contrasena
const plantillaRecuperacionLink = (nombre, enlace) => {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#141414;border:1px solid #1f1f1f;border-radius:12px;padding:40px;">
        <tr><td align="center" style="padding-bottom:24px;border-bottom:1px solid #1f1f1f;">
          <div style="display:inline-block;background:#16a34a;color:#ffffff;font-weight:900;font-size:18px;padding:12px 18px;border-radius:8px;letter-spacing:1px;">MR</div>
          <p style="margin:12px 0 0 0;font-size:12px;letter-spacing:3px;color:#16a34a;">MOTOS RACING QUIBDO</p>
        </td></tr>
        <tr><td style="padding-top:32px;">
          <h1 style="margin:0 0 12px 0;font-size:22px;">Restablecer contrasena</h1>
          <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#a1a1aa;">Hola ${nombre}, recibimos una solicitud para restablecer tu contrasena. Este enlace expira en 30 minutos.</p>
          <table width="100%" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="${enlace}" style="display:inline-block;background:#16a34a;color:#ffffff;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">Restablecer contrasena</a>
            </td></tr>
          </table>
          <p style="margin:0 0 16px 0;font-size:13px;color:#71717a;">Si el boton no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="margin:0 0 24px 0;font-size:12px;color:#16a34a;word-break:break-all;font-family:Consolas,monospace;">${enlace}</p>
          <p style="margin:0;font-size:13px;color:#71717a;">Si no solicitaste este cambio, ignora este correo.</p>
        </td></tr>
        <tr><td align="center" style="padding-top:32px;border-top:1px solid #1f1f1f;">
          <p style="margin:0;font-size:11px;color:#52525b;">Motos Racing Quibdo - Sistema interno</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

module.exports = {
  enviarCorreo,
  plantillaPasswordTemporal,
  plantillaRecuperacionLink,
};
