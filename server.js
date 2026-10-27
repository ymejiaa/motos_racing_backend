require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const path = require("path");

// ─── Config ───────────────────────────────────────
const conectarDB = require("./config/db");
const { seedConfiguracion } = require("./controllers/configuracionController");
const errorHandler = require("./middlewares/errorHandler");
const {
  authLimiter,
  apiLimiter,
  writeLimiter,
  readLimiter,
} = require("./middlewares/rateLimiter");

// ─── Rutas ────────────────────────────────────────
const authRoutes = require("./routes/auth");
const clienteRoutes = require("./routes/clientes");
const motoRoutes = require("./routes/motos");
const mecanicoRoutes = require("./routes/mecanicos");
const servicioRoutes = require("./routes/servicios");
const servicioDiarioRoutes = require("./routes/serviciosDiarios");
const repuestoRoutes = require("./routes/repuestos");
const marcaRepuestoRoutes = require("./routes/marcasRepuestos");
const categoriaRepuestoRoutes = require("./routes/categoriasRepuestos");
const proveedorRoutes = require("./routes/proveedores");
const mantenimientoRoutes = require("./routes/mantenimientos");
const transaccionRoutes = require("./routes/transacciones");
const dashboardRoutes = require("./routes/dashboard");
const configuracionRoutes = require("./routes/configuracion");
const syncRoutes = require("./routes/sync");

// ─── Inicializar app ──────────────────────────────
const app = express();

// ─── Trust proxy (por si estas detras de Nginx/Cloudflare) ───
app.set("trust proxy", 1);

// ─── Conectar a MongoDB ───────────────────────────
conectarDB().then(() => {
  seedConfiguracion();
});

// ─── Helmet con CSP estricto ──────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.tailwindcss.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 año
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "deny" },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

// ─── CORS ─────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// ─── Parsers ──────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── Archivos estaticos ───────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Ruta de salud (sin rate limit) ───────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    mensaje: "Motos Racing Quibdo - API funcionando",
    entorno: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── Rate limiting global por metodo ──────────────
app.use("/api", (req, res, next) => {
  const metodo = req.method;

  if (metodo === "GET") {
    return readLimiter(req, res, next);
  } else if (["POST", "PUT", "PATCH", "DELETE"].includes(metodo)) {
    return writeLimiter(req, res, next);
  }

  return apiLimiter(req, res, next);
});

// ─── Rutas de la API ──────────────────────────────
// Auth con limite estricto
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/solicitar-reset", authLimiter);
app.use("/api/auth/restablecer-password", authLimiter);
app.use("/api/auth/verificar-codigo", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/motos", motoRoutes);
app.use("/api/mecanicos", mecanicoRoutes);
app.use("/api/servicios", servicioRoutes);
app.use("/api/servicios-diarios", servicioDiarioRoutes);
app.use("/api/repuestos", repuestoRoutes);
app.use("/api/marcas-repuestos", marcaRepuestoRoutes);
app.use("/api/categorias-repuestos", categoriaRepuestoRoutes);
app.use("/api/proveedores", proveedorRoutes);
app.use("/api/mantenimientos", mantenimientoRoutes);
app.use("/api/transacciones", transaccionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/configuracion", configuracionRoutes);
app.use("/api/sync", syncRoutes);

// ─── Manejo de rutas inexistentes ─────────────────
app.use((req, res) => {
  res.status(404).send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <meta name="theme-color" content="#0a0a0a">
  <title>404 - Motos Racing Quibdo</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    body {
      background-color: #0a0a0a;
      color: #ffffff;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      position: relative;
    }
    .grid-bg {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background-image:
        linear-gradient(rgba(22, 163, 74, 0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(22, 163, 74, 0.07) 1px, transparent 1px);
      background-size: 40px 40px;
    }
    .header-404 {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 2;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #18181b;
    }
    .center-404 {
      position: fixed;
      inset: 0;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px 20px 20px;
      text-align: center;
    }
    .number-404 {
      font-size: clamp(90px, 22vw, 260px);
      font-weight: 900;
      line-height: 0.95;
      letter-spacing: -0.05em;
      color: transparent;
      -webkit-text-stroke: 2px #16a34a;
      position: relative;
      display: inline-block;
      max-width: 100%;
    }
    .number-404::after {
      content: '404';
      position: absolute;
      inset: 0;
      color: #16a34a;
      clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
      animation: scan 3s linear infinite;
      pointer-events: none;
    }
    @keyframes scan {
      0%, 100% { transform: translateY(0); opacity: 0.9; }
      50% { transform: translateY(4px); opacity: 1; }
    }
    .line-accent {
      width: 60px;
      height: 3px;
      background-color: #16a34a;
      margin: 28px auto;
    }
    @media (max-width: 480px) {
      .number-404 { -webkit-text-stroke: 1.5px #16a34a; }
      .line-accent { width: 48px; height: 2px; margin: 20px auto; }
      .header-404 { padding: 16px 18px; }
      .center-404 { padding: 70px 16px 16px 16px; }
    }
  </style>
</head>
<body>
  <div class="grid-bg"></div>

  <header class="header-404">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 sm:w-10 sm:h-10 bg-green-600 rounded-lg flex items-center justify-center font-black text-white text-sm sm:text-base shrink-0">MR</div>
      <div class="leading-tight">
        <p class="font-bold text-xs sm:text-sm tracking-wide">MOTOS RACING</p>
        <p class="text-[10px] sm:text-xs text-green-500 tracking-widest">QUIBDO</p>
      </div>
    </div>
  </header>

  <main class="center-404">
    <div class="number-404" id="num404">404</div>
    <div class="line-accent" id="line"></div>
    <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold px-2" id="title">
      Ruta no encontrada
    </h1>
  </main>

  <script>
    gsap.from('#num404', { duration: 1, scale: 0.7, opacity: 0, ease: 'power4.out' });
    gsap.from('#line', { duration: 0.8, width: 0, delay: 0.3, ease: 'power3.out' });
    gsap.from('#title', { duration: 0.8, y: 30, opacity: 0, delay: 0.5, ease: 'power3.out' });
  </script>
</body>
</html>
  `);
});

// ─── Manejo global de errores ─────────────────────
app.use(errorHandler);

// ─── Arrancar servidor ────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV}`);
});
