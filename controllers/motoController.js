const Moto = require("../models/Moto");
const Cliente = require("../models/Cliente");
const Mantenimiento = require("../models/Mantenimiento");

const crearMoto = async (req, res, next) => {
  try {
    const {
      placa,
      marca,
      modelo,
      color,
      cilindraje,
      anio,
      numeroMotor,
      numeroChasis,
      clienteId,
    } = req.body;

    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(400).json({ msg: "El cliente indicado no existe" });
    }

    const moto = new Moto({
      placa,
      marca,
      modelo,
      color,
      cilindraje,
      anio,
      numeroMotor,
      numeroChasis,
      clienteId,
    });

    await moto.save();
    await moto.populate("clienteId", "nombre telefono");

    return res.status(201).json({ msg: "Moto creada correctamente", moto });
  } catch (error) {
    next(error);
  }
};

const listarMotos = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const skip = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const clienteId = req.query.clienteId;
    const marca = req.query.marca;
    const estado = req.query.estado; // "enTaller" | "fueraTaller" | ""

    const filtro = {};
    if (clienteId) filtro.clienteId = clienteId;
    if (marca) filtro.marca = new RegExp(`^${marca}$`, "i");
    if (search) {
      const regex = new RegExp(search, "i");
      filtro.$or = [{ placa: regex }, { marca: regex }, { modelo: regex }];
    }

    // Si se filtra por estado
    let motosEnTallerIds = null;
    if (estado === "enTaller" || estado === "fueraTaller") {
      motosEnTallerIds = await Mantenimiento.distinct("motoId", {
        estado: {
          $in: ["Recibido", "En Diagnostico", "En Reparacion", "Listo"],
        },
      });

      if (estado === "enTaller") {
        filtro._id = { $in: motosEnTallerIds };
      } else {
        filtro._id = { $nin: motosEnTallerIds };
      }
    }

    // Traer TODAS las motos que cumplen el filtro (sin paginar aun)
    const todasMotos = await Moto.find(filtro)
      .populate("clienteId", "nombre telefono")
      .lean();

    // Obtener mantenimientos activos de esas motos
    const motoIds = todasMotos.map((m) => m._id);
    const mantenimientosActivos = await Mantenimiento.aggregate([
      {
        $match: {
          motoId: { $in: motoIds },
          estado: {
            $in: ["Recibido", "En Diagnostico", "En Reparacion", "Listo"],
          },
        },
      },
      {
        $group: {
          _id: "$motoId",
          estadoActual: { $first: "$estado" },
          fechaIngreso: { $first: "$fechaIngreso" },
        },
      },
    ]);

    const enTallerMap = {};
    mantenimientosActivos.forEach((m) => {
      enTallerMap[m._id.toString()] = {
        enMantenimiento: true,
        estadoActual: m.estadoActual,
        fechaIngresoActual: m.fechaIngreso,
      };
    });

    // Agregar info de mantenimiento y ordenar: primero las que estan en taller
    const motosConEstado = todasMotos.map((moto) => {
      const info = enTallerMap[moto._id.toString()];
      return {
        ...moto,
        enMantenimiento: !!info,
        estadoActual: info?.estadoActual || null,
        fechaIngresoActual: info?.fechaIngreso || null,
      };
    });

    motosConEstado.sort((a, b) => {
      // Primero las que estan en taller
      if (a.enMantenimiento && !b.enMantenimiento) return -1;
      if (!a.enMantenimiento && b.enMantenimiento) return 1;

      // Dentro del mismo grupo, ordenar por fecha
      if (a.enMantenimiento && b.enMantenimiento) {
        return new Date(b.fechaIngresoActual) - new Date(a.fechaIngresoActual);
      }

      // Las no en taller por createdAt descendente
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Aplicar paginacion manual
    const total = motosConEstado.length;
    const motosPaginadas = motosConEstado.slice(skip, skip + limit);

    return res.json({
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
      motos: motosPaginadas,
    });
  } catch (error) {
    next(error);
  }
};

const obtenerMoto = async (req, res, next) => {
  try {
    const moto = await Moto.findById(req.params.id).populate(
      "clienteId",
      "nombre telefono email",
    );
    if (!moto) return res.status(404).json({ msg: "Moto no encontrada" });
    return res.json({ moto });
  } catch (error) {
    next(error);
  }
};

// Historial completo de mantenimientos de una moto
const historialMoto = async (req, res, next) => {
  try {
    const moto = await Moto.findById(req.params.id).populate(
      "clienteId",
      "nombre telefono email cedula",
    );
    if (!moto) return res.status(404).json({ msg: "Moto no encontrada" });

    const mantenimientos = await Mantenimiento.find({ motoId: moto._id })
      .populate("mecanicoId", "nombre")
      .populate("registradoPor", "nombre")
      .sort({ fechaIngreso: -1 });

    return res.json({ moto, mantenimientos });
  } catch (error) {
    next(error);
  }
};

const actualizarMoto = async (req, res, next) => {
  try {
    const moto = await Moto.findById(req.params.id);
    if (!moto) return res.status(404).json({ msg: "Moto no encontrada" });

    const campos = [
      "placa",
      "marca",
      "modelo",
      "color",
      "cilindraje",
      "anio",
      "numeroMotor",
      "numeroChasis",
      "clienteId",
    ];
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) moto[campo] = req.body[campo];
    });

    if (req.body.clienteId) {
      const cliente = await Cliente.findById(req.body.clienteId);
      if (!cliente)
        return res.status(400).json({ msg: "El cliente indicado no existe" });
    }

    await moto.save();
    await moto.populate("clienteId", "nombre telefono");

    return res.json({ msg: "Moto actualizada correctamente", moto });
  } catch (error) {
    next(error);
  }
};

const eliminarMoto = async (req, res, next) => {
  try {
    const moto = await Moto.findById(req.params.id);
    if (!moto) return res.status(404).json({ msg: "Moto no encontrada" });

    const mantenimientos = await Mantenimiento.countDocuments({
      motoId: moto._id,
    });
    if (mantenimientos > 0) {
      return res.status(400).json({
        msg: `No se puede eliminar: la moto tiene ${mantenimientos} mantenimiento(s) registrado(s)`,
      });
    }

    await moto.deleteOne();
    return res.json({ msg: "Moto eliminada correctamente" });
  } catch (error) {
    next(error);
  }
};

// Obtener lista de marcas unicas existentes
const listarMarcas = async (req, res, next) => {
  try {
    const marcas = await Moto.distinct("marca");
    marcas.sort((a, b) => a.localeCompare(b));
    return res.json({ marcas });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearMoto,
  listarMotos,
  obtenerMoto,
  historialMoto,
  actualizarMoto,
  eliminarMoto,
  listarMarcas,
};
