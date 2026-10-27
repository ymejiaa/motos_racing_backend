const jwt = require("jsonwebtoken");

const generarJWT = (
  usuarioId,
  rol,
  debeCambiarPassword = false,
  sessionId = null,
) => {
  return new Promise((resolve, reject) => {
    const payload = {
      id: usuarioId,
      rol,
      debeCambiarPassword,
      sid: sessionId,
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
      (error, token) => {
        if (error) {
          reject(new Error("No se pudo generar el token"));
        } else {
          resolve(token);
        }
      },
    );
  });
};

module.exports = generarJWT;
