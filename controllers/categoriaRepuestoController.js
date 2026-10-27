const CategoriaRepuesto = require("../models/CategoriaRepuesto");
const Repuesto = require("../models/Repuesto");

// ─── Crear ────────────────────────────────────────
const crearCategoria = async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;

    const categoria = new CategoriaRepuesto({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
    });

    await categoria.save();

    return res.status(201).json({
      msg: "Categoria creada correctamente",
      categoria,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Listar ───────────────────────────────────────
const listarCategorias = async (req, res, next) => {
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

    const [total, categorias] = await Promise.all([
      CategoriaRepuesto.countDocuments(filtro),
      CategoriaRepuesto.find(filtro)
        .sort({ nombre: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
      categorias,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Obtener ──────────────────────────────────────
const obtenerCategoria = async (req, res, next) => {
  try {
    const categoria = await CategoriaRepuesto.findById(req.params.id);
    if (!categoria)
      return res.status(404).json({ msg: "Categoria no encontrada" });
    return res.json({ categoria });
  } catch (error) {
    next(error);
  }
};

// ─── Actualizar ───────────────────────────────────
const actualizarCategoria = async (req, res, next) => {
  try {
    const categoria = await CategoriaRepuesto.findById(req.params.id);
    if (!categoria)
      return res.status(404).json({ msg: "Categoria no encontrada" });

    ["nombre", "descripcion", "activo"].forEach((campo) => {
      if (req.body[campo] !== undefined) categoria[campo] = req.body[campo];
    });

    await categoria.save();
    return res.json({ msg: "Categoria actualizada correctamente", categoria });
  } catch (error) {
    next(error);
  }
};

// ─── Eliminar (soft delete si esta en uso) ────────
const eliminarCategoria = async (req, res, next) => {
  try {
    const categoria = await CategoriaRepuesto.findById(req.params.id);
    if (!categoria)
      return res.status(404).json({ msg: "Categoria no encontrada" });

    const usos = await Repuesto.countDocuments({ categoriaId: categoria._id });

    if (usos > 0) {
      categoria.activo = false;
      await categoria.save();
      return res.json({
        msg: `La categoria tiene ${usos} repuesto(s) asociado(s). Se ha desactivado.`,
        categoria,
      });
    }

    await categoria.deleteOne();
    return res.json({ msg: "Categoria eliminada correctamente" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearCategoria,
  listarCategorias,
  obtenerCategoria,
  actualizarCategoria,
  eliminarCategoria,
};
