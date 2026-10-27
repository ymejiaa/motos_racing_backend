const errorHandler = (err, req, res, next) => {
  console.error("Error:", err.message);

  // Error de validacion de Mongoose
  if (err.name === "ValidationError") {
    const errores = Object.values(err.errors).map((e) => ({
      campo: e.path,
      mensaje: e.message,
    }));
    return res.status(400).json({
      msg: "Error de validacion",
      errores,
    });
  }

  // Error de duplicado en MongoDB
  if (err.code === 11000) {
    const campo = Object.keys(err.keyPattern || {})[0];
    return res.status(409).json({
      msg: `Ya existe un registro con ese ${campo}`,
      campo,
    });
  }

  // Error de ObjectId invalido
  if (err.name === "CastError") {
    return res.status(400).json({
      msg: `Formato invalido para el campo ${err.path}`,
    });
  }

  // JWT invalido
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ msg: "Token invalido" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ msg: "Token expirado" });
  }

  // Errores con status custom
  if (err.status) {
    return res.status(err.status).json({
      msg: err.message,
      errores: err.errores || undefined,
    });
  }

  // Error generico
  return res.status(500).json({
    msg: "Error interno del servidor",
  });
};

module.exports = errorHandler;
