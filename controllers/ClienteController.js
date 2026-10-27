const Cliente = require("../models/Cliente");
const Moto = require("../models/Moto");
const { hashBusqueda } = require("../utils/crypto");

// ─── Crear cliente ────────────────────────────────
const crearCliente = async (req, res, next) => {
  try {
    const { nombre, telefono, notas } = req.body;

    const cliente = new Cliente({
      nombre,
      telefono,
      notas,
    });

    await cliente.save();

    return res.status(201).json({
      msg: "Cliente creado correctamente",
      cliente: cliente.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Listar clientes (con ultima moto) ────────────
const listarClientes = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const skip = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const conMantenimientos = req.query.conMantenimientos === "true";
    const sinMantenimientos = req.query.sinMantenimientos === "true";

    const filtro = {};

    if (search) {
      const telefonoHash = hashBusqueda(search);
      filtro.$or = [{ nombre: new RegExp(search, "i") }, { telefonoHash }];
    }

    if (conMantenimientos || sinMantenimientos) {
      const Mantenimiento = require("../models/Mantenimiento");
      const mantenimientos = await Mantenimiento.distinct("motoId");
      const motos = await Moto.find({ _id: { $in: mantenimientos } }).distinct(
        "clienteId",
      );
      const clientesConMantenimientos = motos.map((id) => id.toString());

      if (conMantenimientos) {
        filtro._id = { $in: clientesConMantenimientos };
      } else if (sinMantenimientos) {
        filtro._id = { $nin: clientesConMantenimientos };
      }
    }

    const [total, clientes] = await Promise.all([
      Cliente.countDocuments(filtro),
      Cliente.find(filtro).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    const clientesConMoto = await Promise.all(
      clientes.map(async (c) => {
        const ultimaMoto = await Moto.findOne({ clienteId: c._id })
          .sort({ createdAt: -1 })
          .select("placa marca modelo")
          .lean();

        const totalMotos = await Moto.countDocuments({ clienteId: c._id });

        return {
          ...c.toJSON(),
          ultimaMoto,
          totalMotos,
        };
      }),
    );

    return res.json({
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
      clientes: clientesConMoto,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Obtener cliente ──────────────────────────────
const obtenerCliente = async (req, res, next) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ msg: "Cliente no encontrado" });
    }

    const motos = await Moto.find({ clienteId: cliente._id })
      .select("placa marca modelo color cilindraje")
      .lean();

    return res.json({
      cliente: cliente.toJSON(),
      motos,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Actualizar cliente ───────────────────────────
const actualizarCliente = async (req, res, next) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ msg: "Cliente no encontrado" });
    }

    const campos = ["nombre", "telefono", "notas"];
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) cliente[campo] = req.body[campo];
    });

    await cliente.save();
    return res.json({
      msg: "Cliente actualizado correctamente",
      cliente: cliente.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Eliminar cliente ─────────────────────────────
const eliminarCliente = async (req, res, next) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ msg: "Cliente no encontrado" });
    }

    const motosAsociadas = await Moto.countDocuments({
      clienteId: cliente._id,
    });
    if (motosAsociadas > 0) {
      return res.status(400).json({
        msg: `No se puede eliminar: el cliente tiene ${motosAsociadas} moto(s) registrada(s)`,
      });
    }

    await cliente.deleteOne();
    return res.json({ msg: "Cliente eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

// ─── Crear cliente + moto rapido ──────────────────
const crearClienteYMotoRapido = async (req, res, next) => {
  try {
    const { nombre, telefono, placa, marca, modelo } = req.body;

    if (!nombre || nombre.trim().length < 3) {
      return res
        .status(400)
        .json({ msg: "El nombre debe tener al menos 3 caracteres" });
    }
    if (!telefono || telefono.trim().length < 7) {
      return res
        .status(400)
        .json({ msg: "El telefono debe tener al menos 7 caracteres" });
    }
    if (!placa || placa.trim().length < 5) {
      return res.status(400).json({ msg: "La placa es obligatoria" });
    }
    if (!marca || !modelo) {
      return res
        .status(400)
        .json({ msg: "La marca y modelo son obligatorios" });
    }

    const placaNormalizada = placa.trim().toUpperCase();
    const motoExistente = await Moto.findOne({ placa: placaNormalizada });
    if (motoExistente) {
      return res.status(400).json({ msg: "Ya existe una moto con esa placa" });
    }

    const cliente = new Cliente({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      notas: "Cliente registrado desde mantenimiento",
    });

    await cliente.save();

    const moto = new Moto({
      placa: placaNormalizada,
      marca: marca.trim(),
      modelo: modelo.trim(),
      clienteId: cliente._id,
    });

    await moto.save();

    return res.status(201).json({
      msg: "Cliente y moto creados correctamente",
      cliente: cliente.toJSON(),
      moto,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearCliente,
  listarClientes,
  obtenerCliente,
  actualizarCliente,
  eliminarCliente,
  crearClienteYMotoRapido,
};
