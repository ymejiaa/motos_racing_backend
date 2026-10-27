const Servicio = require("../models/Servicio");
const Mantenimiento = require("../models/Mantenimiento");

const crearServicio = async (req, res, next) => {
  try {
    const { nombre, descripcion, precioBase } = req.body;
    const servicio = new Servicio({ nombre, descripcion, precioBase });
    await servicio.save();
    return res
      .status(201)
      .json({ msg: "Servicio creado correctamente", servicio });
  } catch (error) {
    next(error);
  }
};

const listarServicios = async (req, res, next) => {
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

    const [total, servicios] = await Promise.all([
      Servicio.countDocuments(filtro),
      Servicio.find(filtro).sort({ nombre: 1 }).skip(skip).limit(limit),
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
      servicios,
    });
  } catch (error) {
    next(error);
  }
};

const obtenerServicio = async (req, res, next) => {
  try {
    const servicio = await Servicio.findById(req.params.id);
    if (!servicio)
      return res.status(404).json({ msg: "Servicio no encontrado" });
    return res.json({ servicio });
  } catch (error) {
    next(error);
  }
};

const actualizarServicio = async (req, res, next) => {
  try {
    const servicio = await Servicio.findById(req.params.id);
    if (!servicio)
      return res.status(404).json({ msg: "Servicio no encontrado" });

    ["nombre", "descripcion", "precioBase", "activo"].forEach((campo) => {
      if (req.body[campo] !== undefined) servicio[campo] = req.body[campo];
    });

    await servicio.save();
    return res.json({ msg: "Servicio actualizado correctamente", servicio });
  } catch (error) {
    next(error);
  }
};

const eliminarServicio = async (req, res, next) => {
  try {
    const servicio = await Servicio.findById(req.params.id);
    if (!servicio)
      return res.status(404).json({ msg: "Servicio no encontrado" });

    const usos = await Mantenimiento.countDocuments({
      "serviciosRealizados.servicioId": servicio._id,
    });
    if (usos > 0) {
      servicio.activo = false;
      await servicio.save();
      return res.json({
        msg: "El servicio tiene mantenimientos asociados. Se ha desactivado.",
        servicio,
      });
    }

    await servicio.deleteOne();
    return res.json({ msg: "Servicio eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearServicio,
  listarServicios,
  obtenerServicio,
  actualizarServicio,
  eliminarServicio,
};
