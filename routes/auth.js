const express = require("express");
const { body } = require("express-validator");

const authController = require("../controllers/authController");
const validarCampos = require("../middlewares/validarCampos");
const { verificarAuth } = require("../middlewares/auth");
const { agregarConexion, eliminarConexion } = require("../utils/sse");

const router = express.Router();

const REGEX_PASSWORD_FUERTE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&*!?.,\-_])[A-Za-z\d@#$%^&*!?.,\-_]{8,}$/;

const MENSAJE_PASSWORD_FUERTE =
  "La contrasena debe tener minimo 8 caracteres, una mayuscula, una minuscula, un numero y un caracter especial";

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Correo invalido").toLowerCase().trim(),
    body("password").notEmpty().withMessage("La contrasena es obligatoria"),
  ],
  validarCampos,
  authController.login,
);

router.post("/logout", authController.logout);

router.get("/verify", verificarAuth, authController.verify);

router.post(
  "/solicitar-reset",
  [body("email").isEmail().withMessage("Correo invalido").toLowerCase().trim()],
  validarCampos,
  authController.solicitarReset,
);

router.post(
  "/verificar-token-reset",
  [
    body("token").notEmpty().withMessage("Token requerido"),
    body("email").isEmail().withMessage("Correo invalido").toLowerCase().trim(),
  ],
  validarCampos,
  authController.verificarTokenReset,
);

router.post(
  "/cambiar-password",
  verificarAuth,
  [
    body("passwordNueva")
      .matches(REGEX_PASSWORD_FUERTE)
      .withMessage(MENSAJE_PASSWORD_FUERTE),
    body("passwordActual").optional().isString(),
  ],
  validarCampos,
  authController.cambiarPassword,
);

router.post(
  "/restablecer-password",
  [
    body("token").notEmpty().withMessage("Token requerido"),
    body("email").isEmail().withMessage("Correo invalido").toLowerCase().trim(),
    body("passwordNueva")
      .matches(REGEX_PASSWORD_FUERTE)
      .withMessage(MENSAJE_PASSWORD_FUERTE),
  ],
  validarCampos,
  authController.restablecerPassword,
);

router.put(
  "/perfil",
  [
    body("nombre")
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Nombre inválido"),
    body("email").optional().isEmail().withMessage("Email inválido"),
    body("telefono").optional({ checkFalsy: true }).trim(),
  ],
  validarCampos,
  authController.actualizarPerfil,
);

router.get("/events", verificarAuth, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Nginx
  res.flushHeaders();

  const userId = req.usuario._id.toString();
  agregarConexion(userId, res);

  // Enviar un primer ping para mantener la conexion viva
  res.write(`data: ${JSON.stringify({ evento: "conectado" })}\n\n`);

  // Heartbeat cada 30s para mantener la conexion
  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ evento: "ping" })}\n\n`);
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    eliminarConexion(userId, res);
  });
});

module.exports = router;
