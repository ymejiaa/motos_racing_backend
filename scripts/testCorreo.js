require("dotenv").config();
const {
  enviarCorreo,
  plantillaPasswordTemporal,
} = require("../utils/enviarCorreo");

(async () => {
  try {
    console.log("Enviando correo de prueba a", process.env.EMAIL_USER, "...");
    const info = await enviarCorreo({
      para: process.env.EMAIL_USER,
      asunto: "Prueba de correo - Motos Racing Quibdo",
      html: plantillaPasswordTemporal("Yam Mejia", "ABC123@test"),
    });
    console.log("Correo enviado correctamente.");
    console.log("ID del mensaje:", info.messageId);
    process.exit(0);
  } catch (error) {
    console.error("Error al enviar:", error.message);
    process.exit(1);
  }
})();
