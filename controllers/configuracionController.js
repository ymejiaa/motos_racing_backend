const Configuracion = require("../models/Configuracion");

// Valores por defecto
const DEFAULTS = {
  iva: 0.19,
  descuento: 0.05,
  nombreTaller: "Motos Racing Quibdo",
  nitTaller: "",
  direccionTaller: "",
  telefonoTaller: "",
};

// ─── Obtener toda la configuracion ────────────────
const obtenerConfiguracion = async (req, res, next) => {
  try {
    const registros = await Configuracion.find();

    const config = { ...DEFAULTS };
    registros.forEach((r) => {
      config[r.clave] = r.valor;
    });

    return res.json({ configuracion: config });
  } catch (error) {
    next(error);
  }
};

// ─── Actualizar configuracion ─────────────────────
const actualizarConfiguracion = async (req, res, next) => {
  try {
    const campos = req.body;

    for (const [clave, valor] of Object.entries(campos)) {
      await Configuracion.findOneAndUpdate(
        { clave },
        { clave, valor },
        { upsert: true, new: true },
      );
    }

    const registros = await Configuracion.find();
    const config = { ...DEFAULTS };
    registros.forEach((r) => {
      config[r.clave] = r.valor;
    });

    return res.json({
      msg: "Configuracion actualizada correctamente",
      configuracion: config,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Seed inicial (por si no hay nada) ────────────
const seedConfiguracion = async () => {
  try {
    for (const [clave, valor] of Object.entries(DEFAULTS)) {
      const existe = await Configuracion.findOne({ clave });
      if (!existe) {
        await Configuracion.create({ clave, valor });
      }
    }
  } catch (error) {
    console.error("Error al inicializar configuracion:", error.message);
  }
};

module.exports = {
  obtenerConfiguracion,
  actualizarConfiguracion,
  seedConfiguracion,
  DEFAULTS,
};
