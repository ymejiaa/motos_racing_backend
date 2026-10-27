const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");

const verificarAuth = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (
      !token &&
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ msg: "No autenticado" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Traemos el usuario CON el sessionId (que tiene select: false)
    const usuario = await Usuario.findById(decoded.id).select(
      "-password +sessionId",
    );

    if (!usuario) {
      return res.status(401).json({ msg: "Usuario no encontrado" });
    }

    if (!usuario.activo) {
      return res.status(403).json({ msg: "Usuario desactivado" });
    }

    // ─── Verificacion de sesion unica ─────────────
    if (!usuario.sessionId || usuario.sessionId !== decoded.sid) {
      return res.status(401).json({
        msg: "Tu sesion fue cerrada porque se inicio sesion en otro dispositivo",
        codigo: "SESION_INVALIDADA",
      });
    }

    // Quitar el sessionId del objeto para no exponerlo
    usuario.sessionId = undefined;

    req.usuario = usuario;
    next();
  } catch (error) {
    console.error("Error en verificarAuth:", error.message);

    if (error.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ msg: "Token invalido", codigo: "TOKEN_INVALIDO" });
    }
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ msg: "Token expirado", codigo: "TOKEN_EXPIRADO" });
    }

    return res
      .status(401)
      .json({ msg: "Token invalido o expirado", codigo: "TOKEN_INVALIDO" });
  }
};

const bloquearPorCambioObligatorio = (req, res, next) => {
  if (req.usuario && req.usuario.debeCambiarPassword) {
    return res.status(403).json({
      msg: "Debes cambiar tu contrasena antes de continuar",
      codigo: "CAMBIO_OBLIGATORIO",
    });
  }
  next();
};

const soloAdmin = (req, res, next) => {
  if (!req.usuario || req.usuario.rol !== "admin") {
    return res
      .status(403)
      .json({ msg: "Acceso denegado: se requiere rol admin" });
  }
  next();
};

module.exports = {
  verificarAuth,
  bloquearPorCambioObligatorio,
  soloAdmin,
};
