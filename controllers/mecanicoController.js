const Mecanico = require("../models/Mecanico");
const Mantenimiento = require("../models/Mantenimiento");
const Transaccion = require("../models/Transaccion");
const ServicioDiario = require("../models/ServicioDiario");

// ─── Crear mecanico ───────────────────────────────
const crearMecanico = async (req, res, next) => {
  try {
    const {
      nombre,
      email,
      cedula,
      telefono,
      direccion,
      especialidad,
      fechaIngreso,
      notas,
    } = req.body;

    const mecanico = new Mecanico({
      nombre,
      email,
      cedula,
      telefono,
      direccion,
      especialidad,
      fechaIngreso,
      notas,
    });

    await mecanico.save();
    return res
      .status(201)
      .json({ msg: "Mecanico creado correctamente", mecanico });
  } catch (error) {
    next(error);
  }
};

// ─── Listar mecanicos ─────────────────────────────
const listarMecanicos = async (req, res, next) => {
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
      filtro.$or = [{ nombre: regex }, { email: regex }, { cedula: regex }];
    }

    const [total, mecanicos] = await Promise.all([
      Mecanico.countDocuments(filtro),
      Mecanico.find(filtro).sort({ nombre: 1 }).skip(skip).limit(limit),
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
      mecanicos,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Obtener mecanico ─────────────────────────────
const obtenerMecanico = async (req, res, next) => {
  try {
    const mecanico = await Mecanico.findById(req.params.id);
    if (!mecanico) {
      return res.status(404).json({ msg: "Mecanico no encontrado" });
    }
    return res.json({ mecanico });
  } catch (error) {
    next(error);
  }
};

// ─── Estadisticas del mecanico (mantenimientos + servicios diarios) ───
const estadisticasMecanico = async (req, res, next) => {
  try {
    const mecanico = await Mecanico.findById(req.params.id);
    if (!mecanico) {
      return res.status(404).json({ msg: "Mecanico no encontrado" });
    }

    const desde = req.query.desde ? new Date(req.query.desde) : null;
    const hasta = req.query.hasta ? new Date(req.query.hasta) : null;

    // Filtros
    const matchFechasMant = { mecanicoId: mecanico._id };
    const matchFechasDiario = { mecanicoId: mecanico._id };

    if (desde || hasta) {
      matchFechasMant.fechaIngreso = {};
      matchFechasDiario.fecha = {};
      if (desde) {
        matchFechasMant.fechaIngreso.$gte = desde;
        matchFechasDiario.fecha.$gte = desde;
      }
      if (hasta) {
        const fin = new Date(hasta);
        fin.setHours(23, 59, 59, 999);
        matchFechasMant.fechaIngreso.$lte = fin;
        matchFechasDiario.fecha.$lte = fin;
      }
    }

    // Mantenimientos
    const [resumenMant] = await Mantenimiento.aggregate([
      { $match: matchFechasMant },
      {
        $group: {
          _id: null,
          totalMantenimientos: { $sum: 1 },
          totalComision: { $sum: "$pagoMecanico" },
          totalFacturado: { $sum: "$costoTotal" },
          pagado: {
            $sum: {
              $cond: [{ $eq: ["$pagadoAlMecanico", true] }, "$pagoMecanico", 0],
            },
          },
          pendiente: {
            $sum: {
              $cond: [
                { $eq: ["$pagadoAlMecanico", false] },
                "$pagoMecanico",
                0,
              ],
            },
          },
        },
      },
    ]);

    // Servicios diarios
    const [resumenDiario] = await ServicioDiario.aggregate([
      { $match: matchFechasDiario },
      {
        $group: {
          _id: null,
          totalServiciosDiarios: { $sum: 1 },
          totalComision: { $sum: "$comisionMecanico" },
          totalFacturado: { $sum: "$precioServicio" },
          pagado: {
            $sum: {
              $cond: [
                { $eq: ["$pagadoAlMecanico", true] },
                "$comisionMecanico",
                0,
              ],
            },
          },
          pendiente: {
            $sum: {
              $cond: [
                { $eq: ["$pagadoAlMecanico", false] },
                "$comisionMecanico",
                0,
              ],
            },
          },
        },
      },
    ]);

    const mant = resumenMant || {
      totalMantenimientos: 0,
      totalComision: 0,
      totalFacturado: 0,
      pagado: 0,
      pendiente: 0,
    };
    const diario = resumenDiario || {
      totalServiciosDiarios: 0,
      totalComision: 0,
      totalFacturado: 0,
      pagado: 0,
      pendiente: 0,
    };

    const resumen = {
      totalMantenimientos: mant.totalMantenimientos,
      totalServiciosDiarios: diario.totalServiciosDiarios,
      totalTrabajos: mant.totalMantenimientos + diario.totalServiciosDiarios,
      totalComision: mant.totalComision + diario.totalComision,
      totalFacturado: mant.totalFacturado + diario.totalFacturado,
      pagado: mant.pagado + diario.pagado,
      pendiente: mant.pendiente + diario.pendiente,
    };

    return res.json({ mecanico, resumen });
  } catch (error) {
    next(error);
  }
};

// ─── Trabajos pendientes de pago (mantenimientos + servicios diarios) ───
const trabajosPendientes = async (req, res, next) => {
  try {
    const mecanico = await Mecanico.findById(req.params.id);
    if (!mecanico) {
      return res.status(404).json({ msg: "Mecanico no encontrado" });
    }

    // Mantenimientos pendientes
    const mantenimientos = await Mantenimiento.find({
      mecanicoId: mecanico._id,
      pagadoAlMecanico: false,
      pagoMecanico: { $gt: 0 },
    })
      .populate("motoId", "placa marca modelo")
      .sort({ fechaIngreso: -1 });

    // Servicios diarios pendientes
    const serviciosDiarios = await ServicioDiario.find({
      mecanicoId: mecanico._id,
      pagadoAlMecanico: false,
      comisionMecanico: { $gt: 0 },
    }).sort({ fecha: -1 });

    // Convertir ambos a un formato uniforme
    const listaMant = mantenimientos.map((m) => ({
      _id: m._id,
      tipo: "mantenimiento",
      fecha: m.fechaIngreso,
      fechaEntrega: m.fechaEntrega,
      estado: m.estado,
      descripcion: m.motoId
        ? `${m.motoId.placa} - ${m.motoId.marca} ${m.motoId.modelo}`
        : "Moto eliminada",
      detalle: `${m.serviciosRealizados?.length || 0} servicio(s)`,
      totalFacturado: m.costoTotal || 0,
      comision: m.pagoMecanico || 0,
    }));

    const listaDiarios = serviciosDiarios.map((s) => ({
      _id: s._id,
      tipo: "servicio_diario",
      fecha: s.fecha,
      fechaEntrega: s.fecha,
      estado: "Completado",
      descripcion: s.nombreServicio,
      detalle: "Servicio diario",
      totalFacturado: s.precioServicio || 0,
      comision: s.comisionMecanico || 0,
    }));

    // Combinar y ordenar por fecha descendente
    const trabajos = [...listaMant, ...listaDiarios].sort(
      (a, b) => new Date(b.fecha) - new Date(a.fecha),
    );

    const totalPendiente = trabajos.reduce((acc, t) => acc + t.comision, 0);

    return res.json({
      mecanico: {
        _id: mecanico._id,
        nombre: mecanico.nombre,
        email: mecanico.email,
      },
      totalPendiente,
      totalTrabajos: trabajos.length,
      trabajos,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Pagar mecanico (marca mantenimientos + servicios diarios) ───
const pagarMecanico = async (req, res, next) => {
  try {
    const mecanico = await Mecanico.findById(req.params.id);
    if (!mecanico) {
      return res.status(404).json({ msg: "Mecanico no encontrado" });
    }

    // Pendientes de mantenimientos
    const mantPendientes = await Mantenimiento.find({
      mecanicoId: mecanico._id,
      pagadoAlMecanico: false,
      pagoMecanico: { $gt: 0 },
    });

    // Pendientes de servicios diarios
    const diariosPendientes = await ServicioDiario.find({
      mecanicoId: mecanico._id,
      pagadoAlMecanico: false,
      comisionMecanico: { $gt: 0 },
    });

    const totalMant = mantPendientes.reduce(
      (acc, m) => acc + (m.pagoMecanico || 0),
      0,
    );
    const totalDiario = diariosPendientes.reduce(
      (acc, s) => acc + (s.comisionMecanico || 0),
      0,
    );
    const totalPagado = totalMant + totalDiario;
    const totalTrabajos = mantPendientes.length + diariosPendientes.length;

    if (totalTrabajos === 0) {
      return res.json({
        msg: "No hay pagos pendientes para este mecanico",
        totalPagado: 0,
        trabajosPagados: 0,
      });
    }

    const ahora = new Date();

    // Marcar mantenimientos
    if (mantPendientes.length > 0) {
      await Mantenimiento.updateMany(
        {
          mecanicoId: mecanico._id,
          pagadoAlMecanico: false,
          pagoMecanico: { $gt: 0 },
        },
        { $set: { pagadoAlMecanico: true, fechaPagoMecanico: ahora } },
      );
    }

    // Marcar servicios diarios
    if (diariosPendientes.length > 0) {
      await ServicioDiario.updateMany(
        {
          mecanicoId: mecanico._id,
          pagadoAlMecanico: false,
          comisionMecanico: { $gt: 0 },
        },
        { $set: { pagadoAlMecanico: true, fechaPagoMecanico: ahora } },
      );
    }

    // Registrar la transaccion de egreso
    await Transaccion.create({
      tipo: "egreso",
      categoria: "pago_mecanico",
      monto: totalPagado,
      metodo: "Efectivo",
      descripcion: `Pago a ${mecanico.nombre}: ${mantPendientes.length} mantenimiento(s) + ${diariosPendientes.length} servicio(s) diario(s)`,
      mecanicoId: mecanico._id,
      fecha: ahora,
      registradoPor: req.usuario._id,
    });

    return res.json({
      msg: `Pago registrado: ${totalTrabajos} trabajo(s) por un total de ${totalPagado.toLocaleString("es-CO")}`,
      totalPagado,
      trabajosPagados: totalTrabajos,
      mantenimientosPagados: mantPendientes.length,
      serviciosDiariosPagados: diariosPendientes.length,
      fecha: ahora,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Actualizar mecanico ──────────────────────────
const actualizarMecanico = async (req, res, next) => {
  try {
    const mecanico = await Mecanico.findById(req.params.id);
    if (!mecanico) {
      return res.status(404).json({ msg: "Mecanico no encontrado" });
    }

    const campos = [
      "nombre",
      "email",
      "cedula",
      "telefono",
      "direccion",
      "especialidad",
      "fechaIngreso",
      "notas",
      "activo",
    ];
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) mecanico[campo] = req.body[campo];
    });

    await mecanico.save();
    return res.json({
      msg: "Mecanico actualizado correctamente",
      mecanico,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Eliminar mecanico ────────────────────────────
const eliminarMecanico = async (req, res, next) => {
  try {
    const mecanico = await Mecanico.findById(req.params.id);
    if (!mecanico) {
      return res.status(404).json({ msg: "Mecanico no encontrado" });
    }

    const mantenimientos = await Mantenimiento.countDocuments({
      mecanicoId: mecanico._id,
    });
    if (mantenimientos > 0) {
      // Soft delete
      mecanico.activo = false;
      await mecanico.save();
      return res.json({
        msg: "El mecanico tiene mantenimientos asociados. Se ha desactivado en lugar de eliminar.",
        mecanico,
      });
    }

    await mecanico.deleteOne();
    return res.json({ msg: "Mecanico eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

// ─── Toggle activo ────────────────────────────────
const toggleActivoMecanico = async (req, res, next) => {
  try {
    const mecanico = await Mecanico.findById(req.params.id);
    if (!mecanico) {
      return res.status(404).json({ msg: "Mecanico no encontrado" });
    }

    mecanico.activo = !mecanico.activo;
    await mecanico.save();

    return res.json({
      msg: mecanico.activo ? "Mecanico activado" : "Mecanico desactivado",
      mecanico,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Resumen de pagos de TODOS los mecanicos ───
const resumenPagosMecanicos = async (req, res, next) => {
  try {
    const search = (req.query.search || "").trim();
    const desde = req.query.desde ? new Date(req.query.desde) : null;
    const hasta = req.query.hasta ? new Date(req.query.hasta) : null;

    // Filtro de mecanicos
    const filtroMecanicos = {};
    if (search) {
      const regex = new RegExp(search, "i");
      filtroMecanicos.$or = [{ nombre: regex }, { email: regex }];
    }

    const mecanicos = await Mecanico.find(filtroMecanicos).sort({ nombre: 1 });
    const mecanicoIds = mecanicos.map((m) => m._id);

    // Filtros de fecha
    const matchFechasMant = {};
    const matchFechasDiario = {};
    if (desde || hasta) {
      matchFechasMant.fechaIngreso = {};
      matchFechasDiario.fecha = {};
      if (desde) {
        matchFechasMant.fechaIngreso.$gte = desde;
        matchFechasDiario.fecha.$gte = desde;
      }
      if (hasta) {
        const fin = new Date(hasta);
        fin.setHours(23, 59, 59, 999);
        matchFechasMant.fechaIngreso.$lte = fin;
        matchFechasDiario.fecha.$lte = fin;
      }
    }

    // Agrupacion de mantenimientos
    const aggMant = await Mantenimiento.aggregate([
      { $match: { mecanicoId: { $in: mecanicoIds }, ...matchFechasMant } },
      {
        $group: {
          _id: "$mecanicoId",
          totalMantenimientos: { $sum: 1 },
          totalComisionMant: { $sum: "$pagoMecanico" },
          pagadoMant: {
            $sum: {
              $cond: [{ $eq: ["$pagadoAlMecanico", true] }, "$pagoMecanico", 0],
            },
          },
          pendienteMant: {
            $sum: {
              $cond: [
                { $eq: ["$pagadoAlMecanico", false] },
                "$pagoMecanico",
                0,
              ],
            },
          },
          ultimoPagoMant: {
            $max: {
              $cond: [
                { $eq: ["$pagadoAlMecanico", true] },
                "$fechaPagoMecanico",
                null,
              ],
            },
          },
        },
      },
    ]);

    // Agrupacion de servicios diarios
    const aggDiarios = await ServicioDiario.aggregate([
      { $match: { mecanicoId: { $in: mecanicoIds }, ...matchFechasDiario } },
      {
        $group: {
          _id: "$mecanicoId",
          totalDiarios: { $sum: 1 },
          totalComisionDiario: { $sum: "$comisionMecanico" },
          pagadoDiario: {
            $sum: {
              $cond: [
                { $eq: ["$pagadoAlMecanico", true] },
                "$comisionMecanico",
                0,
              ],
            },
          },
          pendienteDiario: {
            $sum: {
              $cond: [
                { $eq: ["$pagadoAlMecanico", false] },
                "$comisionMecanico",
                0,
              ],
            },
          },
          ultimoPagoDiario: {
            $max: {
              $cond: [
                { $eq: ["$pagadoAlMecanico", true] },
                "$fechaPagoMecanico",
                null,
              ],
            },
          },
        },
      },
    ]);

    // Mapas para combinar
    const mapaMant = {};
    aggMant.forEach((a) => {
      mapaMant[a._id.toString()] = a;
    });
    const mapaDiarios = {};
    aggDiarios.forEach((a) => {
      mapaDiarios[a._id.toString()] = a;
    });

    const resultado = mecanicos.map((m) => {
      const mant = mapaMant[m._id.toString()] || {};
      const dia = mapaDiarios[m._id.toString()] || {};

      const pagadoMant = mant.pagadoMant || 0;
      const pagadoDiario = dia.pagadoDiario || 0;
      const pendienteMant = mant.pendienteMant || 0;
      const pendienteDiario = dia.pendienteDiario || 0;

      // Elegir la fecha mas reciente entre los dos ultimos pagos
      const fechasPago = [mant.ultimoPagoMant, dia.ultimoPagoDiario].filter(
        Boolean,
      );
      const ultimoPago =
        fechasPago.length > 0
          ? new Date(Math.max(...fechasPago.map((f) => new Date(f))))
          : null;

      return {
        _id: m._id,
        nombre: m.nombre,
        email: m.email,
        activo: m.activo,
        totalMantenimientos: mant.totalMantenimientos || 0,
        totalServiciosDiarios: dia.totalDiarios || 0,
        totalTrabajos:
          (mant.totalMantenimientos || 0) + (dia.totalDiarios || 0),
        totalComision:
          (mant.totalComisionMant || 0) + (dia.totalComisionDiario || 0),
        pagado: pagadoMant + pagadoDiario,
        pendiente: pendienteMant + pendienteDiario,
        ultimoPago,
      };
    });

    const totales = resultado.reduce(
      (acc, m) => {
        acc.totalComision += m.totalComision;
        acc.totalPagado += m.pagado;
        acc.totalPendiente += m.pendiente;
        return acc;
      },
      { totalComision: 0, totalPagado: 0, totalPendiente: 0 },
    );

    return res.json({
      total: resultado.length,
      mecanicos: resultado,
      totales,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Exports ──────────────────────────────────────
module.exports = {
  crearMecanico,
  listarMecanicos,
  obtenerMecanico,
  estadisticasMecanico,
  trabajosPendientes,
  pagarMecanico,
  actualizarMecanico,
  eliminarMecanico,
  toggleActivoMecanico,
  resumenPagosMecanicos,
};
