const Moto = require("../models/Moto");
const Cliente = require("../models/Cliente");
const Mecanico = require("../models/Mecanico");
const Mantenimiento = require("../models/Mantenimiento");
const Repuesto = require("../models/Repuesto");
const Transaccion = require("../models/Transaccion");
const Usuario = require("../models/Usuario");

const obtenerEstadisticas = async (req, res, next) => {
  try {
    const [
      totalClientes,
      totalMotos,
      totalMecanicos,
      mantenimientosActivos,
      mantenimientosTotales,
      repuestosBajoStock,
    ] = await Promise.all([
      Cliente.countDocuments(),
      Moto.countDocuments(),
      Mecanico.countDocuments({ activo: true }),
      Mantenimiento.countDocuments({ estado: { $nin: ["Entregado"] } }),
      Mantenimiento.countDocuments(),
      Repuesto.countDocuments({
        activo: true,
        $expr: { $lte: ["$stock", "$stockMinimo"] },
      }),
    ]);

    const [ingresosAgg, egresosAgg] = await Promise.all([
      Transaccion.aggregate([
        { $match: { tipo: "ingreso" } },
        { $group: { _id: null, total: { $sum: "$monto" } } },
      ]),
      Transaccion.aggregate([
        { $match: { tipo: "egreso" } },
        { $group: { _id: null, total: { $sum: "$monto" } } },
      ]),
    ]);

    const ingresos = ingresosAgg[0]?.total || 0;
    const egresos = egresosAgg[0]?.total || 0;

    return res.json({
      totales: {
        clientes: totalClientes,
        motos: totalMotos,
        mecanicosActivos: totalMecanicos,
        mantenimientosActivos,
        mantenimientosTotales,
        repuestosBajoStock,
      },
      finanzas: { ingresos, egresos, balance: ingresos - egresos },
    });
  } catch (error) {
    next(error);
  }
};

const mantenimientosPorEstado = async (req, res, next) => {
  try {
    const resultado = await Mantenimiento.aggregate([
      { $group: { _id: "$estado", count: { $sum: 1 } } },
    ]);
    return res.json({ porEstado: resultado });
  } catch (error) {
    next(error);
  }
};

const ingresosPorMes = async (req, res, next) => {
  try {
    const hace12Meses = new Date();
    hace12Meses.setMonth(hace12Meses.getMonth() - 12);

    const resultado = await Transaccion.aggregate([
      { $match: { tipo: "ingreso", fecha: { $gte: hace12Meses } } },
      {
        $group: {
          _id: { anio: { $year: "$fecha" }, mes: { $month: "$fecha" } },
          total: { $sum: "$monto" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.anio": 1, "_id.mes": 1 } },
    ]);

    return res.json({ ingresosPorMes: resultado });
  } catch (error) {
    next(error);
  }
};

const rankingMecanicos = async (req, res, next) => {
  try {
    const resultado = await Mantenimiento.aggregate([
      {
        $group: {
          _id: "$mecanicoId",
          totalMantenimientos: { $sum: 1 },
          totalComision: { $sum: "$pagoMecanico" },
          pendientePago: {
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
      { $sort: { totalComision: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "mecanicos",
          localField: "_id",
          foreignField: "_id",
          as: "mecanico",
        },
      },
      { $unwind: "$mecanico" },
      {
        $project: {
          _id: 1,
          totalMantenimientos: 1,
          totalComision: 1,
          pendientePago: 1,
          nombre: "$mecanico.nombre",
        },
      },
    ]);

    return res.json({ ranking: resultado });
  } catch (error) {
    next(error);
  }
};

// ─── Notificaciones del sistema ───────────────────
const obtenerNotificaciones = async (req, res, next) => {
  try {
    const notificaciones = [];

    // 1. Repuestos con bajo stock
    const repuestosBajoStock = await Repuesto.find({
      activo: true,
      $or: [
        { $expr: { $lte: ["$stock", "$stockMinimo"] } },
        { stock: { $lte: 20 } },
      ],
    })
      .select("nombre stock stockMinimo")
      .limit(20)
      .lean();

    repuestosBajoStock.forEach((r) => {
      notificaciones.push({
        id: `stock-${r._id}`,
        tipo: "warning",
        categoria: "inventario",
        titulo: "Stock bajo",
        mensaje: `${r.nombre} - Quedan ${r.stock} unidades (minimo ${r.stockMinimo})`,
        fecha: new Date().toISOString(),
        enlace: "/src/pages/repuestos.html?filtro=bajoStock",
      });
    });

    // 2. Mantenimientos listos para entregar
    const mantenimientosListos = await Mantenimiento.find({ estado: "Listo" })
      .populate("motoId", "placa marca modelo")
      .populate("mecanicoId", "nombre")
      .sort({ fechaIngreso: -1 })
      .limit(10)
      .lean();

    mantenimientosListos.forEach((m) => {
      notificaciones.push({
        id: `listo-${m._id}`,
        tipo: "info",
        categoria: "taller",
        titulo: "Listo para entregar",
        mensaje:
          `${m.motoId?.placa || "Moto"} - ${m.motoId?.marca || ""} ${m.motoId?.modelo || ""}`.trim(),
        fecha: m.fechaIngreso,
        enlace: `/src/pages/mantenimientos.html?id=${m._id}`,
      });
    });

    // 3. Mantenimientos en taller (Recibido, En Diagnostico, En Reparacion)
    const mantenimientosActivos = await Mantenimiento.find({
      estado: { $in: ["Recibido", "En Diagnostico", "En Reparacion"] },
    })
      .populate("motoId", "placa")
      .sort({ fechaIngreso: 1 })
      .limit(15)
      .lean();

    mantenimientosActivos.forEach((m) => {
      const dias = Math.floor(
        (Date.now() - new Date(m.fechaIngreso)) / 86400000,
      );
      if (dias >= 5) {
        notificaciones.push({
          id: `demora-${m._id}`,
          tipo: "danger",
          categoria: "taller",
          titulo: "Mantenimiento demorado",
          mensaje: `${m.motoId?.placa || "Moto"} lleva ${dias} dias en taller (estado: ${m.estado})`,
          fecha: m.fechaIngreso,
          enlace: `/src/pages/mantenimientos.html?id=${m._id}`,
        });
      }
    });

    // 4. Pagos pendientes a mecanicos (ultimos 30 dias)
    const hace30Dias = new Date(Date.now() - 30 * 86400000);
    const pagosPendientes = await Mantenimiento.find({
      pagadoAlMecanico: false,
      estado: "Entregado",
      fechaEntrega: { $gte: hace30Dias },
      pagoMecanico: { $gt: 0 },
    })
      .populate("mecanicoId", "nombre")
      .lean();

    const agrupadoPorMecanico = {};
    pagosPendientes.forEach((m) => {
      const id = m.mecanicoId?._id?.toString() || "desconocido";
      const nombre = m.mecanicoId?.nombre || "Sin asignar";
      if (!agrupadoPorMecanico[id]) {
        agrupadoPorMecanico[id] = { nombre, monto: 0, cantidad: 0 };
      }
      agrupadoPorMecanico[id].monto += m.pagoMecanico;
      agrupadoPorMecanico[id].cantidad += 1;
    });

    Object.entries(agrupadoPorMecanico).forEach(([id, info]) => {
      notificaciones.push({
        id: `pago-${id}`,
        tipo: "warning",
        categoria: "finanzas",
        titulo: "Pago pendiente a mecanico",
        mensaje: `${info.nombre} tiene ${info.cantidad} trabajo(s) sin pagar ($${info.monto.toLocaleString("es-CO")})`,
        fecha: new Date().toISOString(),
        enlace: `/src/pages/mecanicos.html?view=pagos`,
      });
    });

    // 5. Saldo pendiente de clientes (mantenimientos entregados sin pago completo)
    const saldosPendientes = await Mantenimiento.countDocuments({
      estadoPago: { $in: ["Pendiente", "Abonado"] },
      estado: "Entregado",
      saldoPendiente: { $gt: 0 },
    });

    if (saldosPendientes > 0) {
      notificaciones.push({
        id: "saldos-pendientes",
        tipo: "warning",
        categoria: "finanzas",
        titulo: "Saldos pendientes",
        mensaje: `Hay ${saldosPendientes} mantenimiento(s) entregado(s) con saldo sin cobrar`,
        fecha: new Date().toISOString(),
        enlace: "/src/pages/mantenimientos.html?estadoPago=Pendiente",
      });
    }

    // 6. Cuentas bloqueadas permanentemente
    const usuariosBloqueados = await Usuario.countDocuments({
      bloqueadoPermanente: true,
    });

    if (usuariosBloqueados > 0) {
      notificaciones.push({
        id: "cuentas-bloqueadas",
        tipo: "danger",
        categoria: "seguridad",
        titulo: "Cuentas bloqueadas",
        mensaje: `${usuariosBloqueados} cuenta(s) bloqueada(s) permanentemente`,
        fecha: new Date().toISOString(),
        enlace: "/src/pages/configuracion.html",
      });
    }

    // Ordenar: danger > warning > info
    const orden = { danger: 0, warning: 1, info: 2 };
    notificaciones.sort((a, b) => {
      const diff = orden[a.tipo] - orden[b.tipo];
      if (diff !== 0) return diff;
      return new Date(b.fecha) - new Date(a.fecha);
    });

    return res.json({
      total: notificaciones.length,
      notificaciones,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerEstadisticas,
  mantenimientosPorEstado,
  ingresosPorMes,
  rankingMecanicos,
  obtenerNotificaciones,
};
