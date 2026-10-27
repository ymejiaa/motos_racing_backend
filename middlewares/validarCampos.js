const { validationResult } = require("express-validator");

const validarCampos = (req, res, next) => {
  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    return res.status(400).json({
      msg: "Errores de validacion",
      errores: errores.array().map((e) => ({
        campo: e.path,
        mensaje: e.msg,
      })),
    });
  }

  next();
};

module.exports = validarCampos;
