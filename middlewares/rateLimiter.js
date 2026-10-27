const rateLimit = require("express-rate-limit");

// ─── Helper para respuestas 429 consistentes ──────
const handler429 = (mensaje) => (req, res, next, options) => {
  res.status(429).json({
    msg: mensaje,
    codigo: "RATE_LIMIT",
    retryAfter: Math.ceil(options.windowMs / 1000),
  });
};

// ─── 1. Auth: muy estricto (login, reset) ─────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos por IP cada 15 min
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler429(
    "Demasiados intentos de autenticacion. Intenta de nuevo en 15 minutos.",
  ),
  skipSuccessfulRequests: true, // No cuenta los login exitosos
});

// ─── 2. API general: moderado ─────────────────────
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 120, // 120 peticiones por minuto
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler429("Demasiadas peticiones. Intenta de nuevo en un minuto."),
});

// ─── 3. Escritura: más estricto para POST/PUT/DELETE ─
const writeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 escrituras por minuto
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler429(
    "Demasiadas operaciones de escritura. Intenta de nuevo en un minuto.",
  ),
  skipFailedRequests: false, // Cuenta los errores
});

// ─── 4. Solo lectura: muy relajado ────────────────
const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 300, // 300 lecturas por minuto
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler429(
    "Demasiadas peticiones de lectura. Intenta de nuevo en un minuto.",
  ),
});

module.exports = {
  authLimiter,
  apiLimiter,
  writeLimiter,
  readLimiter,
};
