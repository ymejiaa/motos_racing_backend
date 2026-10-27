const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");
const generarJWT = require("../utils/generarJWT");
const { notificarSesionInvalidada } = require("../utils/sse");
const {
  enviarCorreo,
  plantillaRecuperacionLink,
} = require("../utils/enviarCorreo");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 8 * 60 * 60 * 1000,
};

// ─── Constantes de seguridad ──────────────────────
const MAX_INTENTOS_ANTES_DE_TEMPORAL = 5; // 5 intentos -> bloqueo temporal
const DURACION_BLOQUEO_TEMPORAL_MS = 3 * 60 * 1000; // 3 minutos
const MAX_INTENTOS_ANTES_DE_PERMANENTE = 3; // 3 intentos despues de temporal -> permanente
const TIEMPO_TOKEN_RESET_MS = 30 * 60 * 1000; // 30 minutos

// ─── POST /api/auth/login ─────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log("=== DEBUG LOGIN ===");
    console.log(
      "Email recibido:",
      JSON.stringify(email),
      "longitud:",
      email?.length,
    );
    console.log("Password recibido:", password ? "SI (oculto)" : "VACIO");

    const usuario = await Usuario.findOne({ email }).select("+password");
    console.log(
      "Usuario encontrado:",
      usuario ? usuario.email : "NO ENCONTRADO",
    );
    console.log("===================");

    // Correo no existe
    if (!usuario) {
      return res.status(401).json({ msg: "El correo no esta registrado" });
    }

    // Cuenta desactivada
    if (!usuario.activo) {
      return res.status(403).json({ msg: "Usuario desactivado" });
    }

    // Cuenta bloqueada permanentemente
    if (usuario.bloqueadoPermanente) {
      return res.status(403).json({
        msg: "Cuenta bloqueada permanentemente. Debes restablecer tu contrasena para desbloquearla.",
        codigo: "BLOQUEADO_PERMANENTE",
      });
    }

    // Cuenta bloqueada temporalmente
    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
      const minutosRestantes = Math.ceil(
        (usuario.bloqueadoHasta - new Date()) / 60000,
      );
      return res.status(429).json({
        msg: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutosRestantes} minuto(s).`,
        codigo: "BLOQUEADO_TEMPORAL",
        minutosRestantes,
      });
    }

    // Si el bloqueo temporal expiro, limpiarlo
    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta <= new Date()) {
      usuario.bloqueadoHasta = null;
      // No limpiamos intentosFallidos aqui: se limpian al hacer login exitoso
    }

    // Verificar contrasena
    const coincide = await usuario.compararPassword(password);

    if (!coincide) {
      usuario.intentosFallidos = (usuario.intentosFallidos || 0) + 1;

      // Determinar si ya tuvo un bloqueo temporal previo
      const yaTuvoBloqueoTemporal = usuario.bloqueosTemporalesRealizados >= 1;

      if (yaTuvoBloqueoTemporal) {
        // Fase 2: 3 intentos fallidos -> bloqueo permanente
        if (usuario.intentosFallidos >= MAX_INTENTOS_ANTES_DE_PERMANENTE) {
          usuario.bloqueadoPermanente = true;
          usuario.intentosFallidos = 0;
          await usuario.save();

          return res.status(403).json({
            msg: "Cuenta bloqueada permanentemente. Restablece tu contrasena para desbloquearla.",
            codigo: "BLOQUEADO_PERMANENTE",
          });
        }
      } else {
        // Fase 1: 5 intentos fallidos -> bloqueo temporal de 3 min
        if (usuario.intentosFallidos >= MAX_INTENTOS_ANTES_DE_TEMPORAL) {
          usuario.bloqueadoHasta = new Date(
            Date.now() + DURACION_BLOQUEO_TEMPORAL_MS,
          );
          usuario.bloqueosTemporalesRealizados += 1;
          usuario.intentosFallidos = 0;
          await usuario.save();

          return res.status(429).json({
            msg: "Cuenta bloqueada temporalmente por 3 minutos.",
            codigo: "BLOQUEADO_TEMPORAL",
            minutosRestantes: 3,
          });
        }
      }

      await usuario.save();

      const intentosRestantes = yaTuvoBloqueoTemporal
        ? MAX_INTENTOS_ANTES_DE_PERMANENTE - usuario.intentosFallidos
        : MAX_INTENTOS_ANTES_DE_TEMPORAL - usuario.intentosFallidos;

      return res.status(401).json({
        msg: `Contrasena incorrecta. Te quedan ${intentosRestantes} intento(s).`,
        intentosRestantes,
      });
    }

    // Login exitoso: limpiar intentos y bloqueos
    usuario.intentosFallidos = 0;
    usuario.bloqueadoHasta = null;
    // OJO: bloqueosTemporalesRealizados NO se limpia; queda como historial
    usuario.ultimoAcceso = new Date();
    const sessionId = crypto.randomBytes(32).toString("hex");
    usuario.sessionId = sessionId;

    await usuario.save();

    notificarSesionInvalidada(
      usuario._id.toString(),
      "Se inicio sesion en otro dispositivo",
    );

    const token = await generarJWT(
      usuario._id,
      usuario.rol,
      usuario.debeCambiarPassword,
      sessionId,
    );

    res.cookie("token", token, COOKIE_OPTIONS);

    return res.json({
      msg: "Login exitoso",
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        debeCambiarPassword: usuario.debeCambiarPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/logout ────────────────────────
const logout = async (req, res, next) => {
  try {
    // Invalida la sesion actual del usuario (si esta autenticado)
    let token = null;
    if (req.cookies && req.cookies.token) token = req.cookies.token;
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.id) {
          await Usuario.findByIdAndUpdate(decoded.id, {
            $set: { sessionId: null },
          });
        }
      } catch (e) {
        // Si el token es invalido, no hacemos nada
      }
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.json({ msg: "Sesion cerrada correctamente" });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/auth/verify ─────────────────────────
const verify = async (req, res) => {
  return res.json({
    autenticado: true,
    usuario: {
      id: req.usuario._id,
      nombre: req.usuario.nombre,
      email: req.usuario.email,
      rol: req.usuario.rol,
      debeCambiarPassword: req.usuario.debeCambiarPassword,
    },
  });
};

// ─── POST /api/auth/solicitar-reset ───────────────
// Genera un token unico y envia un LINK al correo
const solicitarReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    const usuario = await Usuario.findOne({ email });

    // Correo no existe
    if (!usuario) {
      return res.status(404).json({ msg: "El correo no esta registrado" });
    }

    // Cuenta desactivada
    if (!usuario.activo) {
      return res.status(403).json({ msg: "Usuario desactivado" });
    }

    // Solo se permite restablecer si la cuenta esta bloqueada permanentemente
    if (!usuario.bloqueadoPermanente) {
      return res.status(403).json({
        msg: "Esta cuenta no esta bloqueada. Puedes iniciar sesion normalmente.",
        codigo: "NO_BLOQUEADA",
      });
    }

    // Generar token aleatorio de 64 caracteres
    const tokenPlano = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(tokenPlano)
      .digest("hex");

    usuario.resetPasswordToken = tokenHash;
    usuario.resetPasswordExpires = new Date(Date.now() + TIEMPO_TOKEN_RESET_MS);
    usuario.resetPasswordCode = null;
    await usuario.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const enlace = `${frontendUrl}/src/pages/restablecer.html?token=${tokenPlano}&email=${encodeURIComponent(usuario.email)}`;

    try {
      await enviarCorreo({
        para: usuario.email,
        asunto: "Restablecer contrasena - Motos Racing Quibdo",
        html: plantillaRecuperacionLink(usuario.nombre, enlace),
      });
    } catch (mailError) {
      console.error(
        "Error al enviar correo de recuperacion:",
        mailError.message,
      );
    }

    return res.json({
      msg: "Enlace enviado. Revisa tu correo electronico.",
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/verificar-token-reset ─────────
// Verifica que el token del link sea valido
const verificarTokenReset = async (req, res, next) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({ msg: "Token o correo faltante" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const usuario = await Usuario.findOne({ email }).select(
      "+resetPasswordToken +resetPasswordExpires",
    );

    if (
      !usuario ||
      !usuario.resetPasswordToken ||
      usuario.resetPasswordToken !== tokenHash ||
      !usuario.resetPasswordExpires ||
      usuario.resetPasswordExpires < new Date()
    ) {
      return res.status(400).json({ msg: "Enlace invalido o expirado" });
    }

    // Solo cuentas bloqueadas permanentemente
    if (!usuario.bloqueadoPermanente) {
      return res.status(403).json({
        msg: "Esta cuenta no esta bloqueada. Inicia sesion normalmente.",
      });
    }

    return res.json({ msg: "Token valido", valido: true });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/cambiar-password ──────────────
const cambiarPassword = async (req, res, next) => {
  try {
    const { passwordActual, passwordNueva } = req.body;

    const usuario = await Usuario.findById(req.usuario._id).select("+password");

    if (!usuario) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    if (!usuario.debeCambiarPassword) {
      if (!passwordActual) {
        return res
          .status(400)
          .json({ msg: "Debes indicar la contrasena actual" });
      }

      const coincide = await usuario.compararPassword(passwordActual);
      if (!coincide) {
        return res
          .status(401)
          .json({ msg: "La contrasena actual es incorrecta" });
      }
    }

    usuario.password = passwordNueva;
    usuario.debeCambiarPassword = false;
    usuario.resetPasswordCode = null;
    usuario.resetPasswordToken = null;
    usuario.resetPasswordExpires = null;

    await usuario.save();

    // Regenerar el sessionId tambien (por seguridad)
    const nuevoSessionId = crypto.randomBytes(32).toString("hex");
    usuario.sessionId = nuevoSessionId;
    await usuario.save();

    const token = await generarJWT(
      usuario._id,
      usuario.rol,
      false,
      nuevoSessionId,
    );
    res.cookie("token", token, COOKIE_OPTIONS);

    return res.json({
      msg: "Contrasena actualizada correctamente",
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        debeCambiarPassword: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

const actualizarPerfil = async (req, res, next) => {
  try {
    const { nombre, email, telefono } = req.body;
    const usuario = await Usuario.findById(req.usuario._id);

    if (!usuario) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    // Si cambia el email, verificar que no esté en uso
    if (email && email !== usuario.email) {
      const existe = await Usuario.findOne({
        email,
        _id: { $ne: usuario._id },
      });
      if (existe) {
        return res.status(400).json({ msg: "El email ya está en uso" });
      }
      usuario.email = email;
    }

    if (nombre) usuario.nombre = nombre;
    if (telefono !== undefined) usuario.telefono = telefono;

    await usuario.save();

    return res.json({
      msg: "Perfil actualizado correctamente",
      usuario: usuario.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/restablecer-password ──────────
// Restablecer con token del link. DESBLOQUEA la cuenta.
const restablecerPassword = async (req, res, next) => {
  try {
    const { token, email, passwordNueva } = req.body;

    if (!token || !email || !passwordNueva) {
      return res.status(400).json({ msg: "Datos incompletos" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const usuario = await Usuario.findOne({ email }).select(
      "+resetPasswordToken +resetPasswordExpires",
    );

    if (
      !usuario ||
      !usuario.resetPasswordToken ||
      usuario.resetPasswordToken !== tokenHash ||
      !usuario.resetPasswordExpires ||
      usuario.resetPasswordExpires < new Date()
    ) {
      return res.status(400).json({ msg: "Enlace invalido o expirado" });
    }

    if (!usuario.bloqueadoPermanente) {
      return res.status(403).json({
        msg: "Esta cuenta no esta bloqueada permanentemente.",
      });
    }

    usuario.password = passwordNueva;
    usuario.debeCambiarPassword = false;
    usuario.resetPasswordToken = null;
    usuario.resetPasswordExpires = null;
    usuario.resetPasswordCode = null;
    usuario.intentosFallidos = 0;
    usuario.bloqueadoHasta = null;
    usuario.sessionId = null;
    usuario.ultimoAcceso = new Date();
    usuario.bloqueadoPermanente = false;
    usuario.bloqueosTemporalesRealizados = 0;

    await usuario.save();

    return res.json({
      msg: "Contrasena restablecida correctamente. Ya puedes iniciar sesion.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  verify,
  solicitarReset,
  verificarTokenReset,
  cambiarPassword,
  restablecerPassword,
  actualizarPerfil,
};
