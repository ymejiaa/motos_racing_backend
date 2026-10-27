const ServicioDiario = require("../models/ServicioDiario");
const Servicio = require("../models/Servicio");
const Mecanico = require("../models/Mecanico");
const Transaccion = require("../models/Transaccion");

// ─── Crear servicio diario ────────────────────────
const crearServicioDiario = async (req, res, next) => {
  try {
    const { servicioId, mecanicoId, montoRecibido, fecha } = req.body;

    // Validar servicio
    const servicio = await Servicio.findById(servicioId);
    if (!servicio) {
      return res.status(400).json({ msg: "El servicio indicado no existe" });
    }
    if (!servicio.activo) {
      return res.status(400).json({ msg: "El servicio esta inactivo" });
    }

    // Validar mecanico
    const mecanico = await Mecanico.findById(mecanicoId);
    if (!mecanico) {
      return res.status(400).json({ msg: "El mecanico indicado no existe" });
    }
    if (!mecanico.activo) {
      return res.status(400).json({ msg: "El mecanico esta inactivo" });
    }

    // Validar monto recibido
    const monto = Number(montoRecibido);
    if (isNaN(monto) || monto < servicio.precioBase) {
      return res.status(400).json({
        msg: `El monto recibido (${monto}) no puede ser menor al precio del servicio (${servicio.precioBase})`,
      });
    }

    // Crear el servicio diario
    const nuevo = new ServicioDiario({
      servicioId: servicio._id,
      nombreServicio: servicio.nombre,
      precioServicio: servicio.precioBase,
      mecanicoId: mecanico._id,
      nombreMecanico: mecanico.nombre,
      cedulaMecanico: mecanico.cedula || null,
      montoRecibido: monto,
      porcentajeComision: 0.3,
      fecha: fecha ? new Date(fecha) : new Date(),
      registradoPor: req.usuario._id,
    });

    await nuevo.save();

    // Registrar ingreso en transacciones
    await Transaccion.create({
      tipo: "ingreso",
      categoria: "pago_cliente",
      monto: servicio.precioBase,
      metodo: "Efectivo",
      descripcion: `Servicio diario: ${servicio.nombre} - ${mecanico.nombre}`,
      fecha: nuevo.fecha,
      registradoPor: req.usuario._id,
    });

    await nuevo.populate([
      { path: "servicioId", select: "nombre precioBase" },
      { path: "mecanicoId", select: "nombre cedula" },
    ]);

    return res.status(201).json({
      msg: "Servicio diario registrado correctamente",
      servicioDiario: nuevo,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Listar servicios diarios ─────────────────────
const listarServiciosDiarios = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const skip = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const desde = req.query.desde ? new Date(req.query.desde) : null;
    const hasta = req.query.hasta ? new Date(req.query.hasta) : null;
    const mecanicoId = req.query.mecanicoId;
    const pagadoAlMecanico = req.query.pagadoAlMecanico;

    const filtro = {};

    if (search) {
      const regex = new RegExp(search, "i");
      filtro.$or = [
        { nombreMecanico: regex },
        { cedulaMecanico: regex },
        { nombreServicio: regex },
      ];
    }

    if (mecanicoId) filtro.mecanicoId = mecanicoId;

    if (pagadoAlMecanico !== undefined) {
      filtro.pagadoAlMecanico = pagadoAlMecanico === "true";
    }

    if (desde || hasta) {
      filtro.fecha = {};
      if (desde) filtro.fecha.$gte = desde;
      if (hasta) {
        // Incluir todo el dia
        const fin = new Date(hasta);
        fin.setHours(23, 59, 59, 999);
        filtro.fecha.$lte = fin;
      }
    }

    const [total, serviciosDiarios] = await Promise.all([
      ServicioDiario.countDocuments(filtro),
      ServicioDiario.find(filtro)
        .populate("servicioId", "nombre")
        .populate("mecanicoId", "nombre cedula")
        .sort({ fecha: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    // Totales del filtro
    const totales = await ServicioDiario.aggregate([
      { $match: filtro },
      {
        $group: {
          _id: null,
          totalPrecio: { $sum: "$precioServicio" },
          totalComisionMecanico: { $sum: "$comisionMecanico" },
          totalComisionTaller: { $sum: "$comisionTaller" },
        },
      },
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
      totales: totales[0] || {
        totalPrecio: 0,
        totalComisionMecanico: 0,
        totalComisionTaller: 0,
      },
      serviciosDiarios,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Obtener servicio diario ──────────────────────
const obtenerServicioDiario = async (req, res, next) => {
  try {
    const servicioDiario = await ServicioDiario.findById(req.params.id)
      .populate("servicioId", "nombre precioBase descripcion")
      .populate("mecanicoId", "nombre cedula email telefono")
      .populate("registradoPor", "nombre email");

    if (!servicioDiario) {
      return res.status(404).json({ msg: "Servicio diario no encontrado" });
    }

    return res.json({ servicioDiario });
  } catch (error) {
    next(error);
  }
};

// ─── Eliminar servicio diario ─────────────────────
const eliminarServicioDiario = async (req, res, next) => {
  try {
    const servicioDiario = await ServicioDiario.findById(req.params.id);
    if (!servicioDiario) {
      return res.status(404).json({ msg: "Servicio diario no encontrado" });
    }

    if (servicioDiario.pagadoAlMecanico) {
      return res.status(400).json({
        msg: "No se puede eliminar: este servicio ya fue pagado al mecanico",
      });
    }

    // Eliminar la transaccion de ingreso asociada
    await Transaccion.deleteOne({
      tipo: "ingreso",
      categoria: "pago_cliente",
      descripcion: `Servicio diario: ${servicioDiario.nombreServicio} - ${servicioDiario.nombreMecanico}`,
      monto: servicioDiario.precioServicio,
    });

    await servicioDiario.deleteOne();

    return res.json({ msg: "Servicio diario eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearServicioDiario,
  listarServiciosDiarios,
  obtenerServicioDiario,
  eliminarServicioDiario,
};
