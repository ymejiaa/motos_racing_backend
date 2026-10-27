const MarcaRepuesto = require("../models/MarcaRepuesto");
const Repuesto = require("../models/Repuesto");

// ─── Crear ────────────────────────────────────────
const crearMarca = async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;

    const marca = new MarcaRepuesto({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
    });

    await marca.save();

    return res.status(201).json({
      msg: "Marca creada correctamente",
      marca,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Listar ───────────────────────────────────────
const listarMarcas = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 50, 1),
      200,
    );
    const skip = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const activo = req.query.activo;

    const filtro = {};
    if (activo !== undefined) filtro.activo = activo === "true";
    if (search) filtro.nombre = new RegExp(search, "i");

    const [total, marcas] = await Promise.all([
      MarcaRepuesto.countDocuments(filtro),
      MarcaRepuesto.find(filtro).sort({ nombre: 1 }).skip(skip).limit(limit),
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
      marcas,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Obtener ──────────────────────────────────────
const obtenerMarca = async (req, res, next) => {
  try {
    const marca = await MarcaRepuesto.findById(req.params.id);
    if (!marca) return res.status(404).json({ msg: "Marca no encontrada" });
    return res.json({ marca });
  } catch (error) {
    next(error);
  }
};

// ─── Actualizar ───────────────────────────────────
const actualizarMarca = async (req, res, next) => {
  try {
    const marca = await MarcaRepuesto.findById(req.params.id);
    if (!marca) return res.status(404).json({ msg: "Marca no encontrada" });

    ["nombre", "descripcion", "activo"].forEach((campo) => {
      if (req.body[campo] !== undefined) marca[campo] = req.body[campo];
    });

    await marca.save();
    return res.json({ msg: "Marca actualizada correctamente", marca });
  } catch (error) {
    next(error);
  }
};

// ─── Eliminar (soft delete si esta en uso) ────────
const eliminarMarca = async (req, res, next) => {
  try {
    const marca = await MarcaRepuesto.findById(req.params.id);
    if (!marca) return res.status(404).json({ msg: "Marca no encontrada" });

    // Verificar si hay repuestos que la usan
    const usos = await Repuesto.countDocuments({ marcaId: marca._id });

    if (usos > 0) {
      marca.activo = false;
      await marca.save();
      return res.json({
        msg: `La marca tiene ${usos} repuesto(s) asociado(s). Se ha desactivado.`,
        marca,
      });
    }

    await marca.deleteOne();
    return res.json({ msg: "Marca eliminada correctamente" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearMarca,
  listarMarcas,
  obtenerMarca,
  actualizarMarca,
  eliminarMarca,
};
