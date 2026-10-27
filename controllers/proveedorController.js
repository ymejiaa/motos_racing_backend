const Proveedor = require("../models/Proveedor");
const Repuesto = require("../models/Repuesto");

const crearProveedor = async (req, res, next) => {
  try {
    const {
      nombre,
      nit,
      telefono,
      email,
      direccion,
      contacto,
      productosQueProvee,
      notas,
    } = req.body;
    const proveedor = new Proveedor({
      nombre,
      nit,
      telefono,
      email,
      direccion,
      contacto,
      productosQueProvee,
      notas,
    });
    await proveedor.save();
    return res
      .status(201)
      .json({ msg: "Proveedor creado correctamente", proveedor });
  } catch (error) {
    next(error);
  }
};

const listarProveedores = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const skip = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const activo = req.query.activo;

    const filtro = {};
    if (activo !== undefined) filtro.activo = activo === "true";
    if (search) {
      const regex = new RegExp(search, "i");
      filtro.$or = [{ nombre: regex }, { nit: regex }, { telefono: regex }];
    }

    const [total, proveedores] = await Promise.all([
      Proveedor.countDocuments(filtro),
      Proveedor.find(filtro).sort({ nombre: 1 }).skip(skip).limit(limit),
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
      proveedores,
    });
  } catch (error) {
    next(error);
  }
};

const obtenerProveedor = async (req, res, next) => {
  try {
    const proveedor = await Proveedor.findById(req.params.id);
    if (!proveedor)
      return res.status(404).json({ msg: "Proveedor no encontrado" });

    const repuestos = await Repuesto.find({
      proveedorId: proveedor._id,
    }).select("nombre referencia stock precioVenta");

    return res.json({ proveedor, repuestos });
  } catch (error) {
    next(error);
  }
};

const actualizarProveedor = async (req, res, next) => {
  try {
    const proveedor = await Proveedor.findById(req.params.id);
    if (!proveedor)
      return res.status(404).json({ msg: "Proveedor no encontrado" });

    const campos = [
      "nombre",
      "nit",
      "telefono",
      "email",
      "direccion",
      "contacto",
      "productosQueProvee",
      "notas",
      "activo",
    ];
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) proveedor[campo] = req.body[campo];
    });

    await proveedor.save();
    return res.json({ msg: "Proveedor actualizado correctamente", proveedor });
  } catch (error) {
    next(error);
  }
};

const eliminarProveedor = async (req, res, next) => {
  try {
    const proveedor = await Proveedor.findById(req.params.id);
    if (!proveedor)
      return res.status(404).json({ msg: "Proveedor no encontrado" });

    const repuestos = await Repuesto.countDocuments({
      proveedorId: proveedor._id,
    });
    if (repuestos > 0) {
      proveedor.activo = false;
      await proveedor.save();
      return res.json({
        msg: "El proveedor tiene repuestos asociados. Se ha desactivado.",
        proveedor,
      });
    }

    await proveedor.deleteOne();
    return res.json({ msg: "Proveedor eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearProveedor,
  listarProveedores,
  obtenerProveedor,
  actualizarProveedor,
  eliminarProveedor,
};
