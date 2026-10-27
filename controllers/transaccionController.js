const Transaccion = require("../models/Transaccion");

const crearTransaccion = async (req, res, next) => {
  try {
    const {
      tipo,
      categoria,
      monto,
      metodo,
      referencia,
      descripcion,
      fecha,
      mantenimientoId,
      mecanicoId,
      proveedorId,
    } = req.body;

    const transaccion = new Transaccion({
      tipo,
      categoria,
      monto,
      metodo,
      referencia,
      descripcion,
      fecha: fecha || new Date(),
      mantenimientoId: mantenimientoId || null,
      mecanicoId: mecanicoId || null,
      proveedorId: proveedorId || null,
      registradoPor: req.usuario._id,
    });

    await transaccion.save();
    return res
      .status(201)
      .json({ msg: "Transaccion registrada correctamente", transaccion });
  } catch (error) {
    next(error);
  }
};

const listarTransacciones = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      200,
    );
    const skip = (page - 1) * limit;

    const filtro = {};
    if (req.query.tipo) filtro.tipo = req.query.tipo;
    if (req.query.categoria) filtro.categoria = req.query.categoria;
    if (req.query.metodo) filtro.metodo = req.query.metodo;

    if (req.query.desde || req.query.hasta) {
      filtro.fecha = {};
      if (req.query.desde) filtro.fecha.$gte = new Date(req.query.desde);
      if (req.query.hasta) filtro.fecha.$lte = new Date(req.query.hasta);
    }

    const [total, transacciones] = await Promise.all([
      Transaccion.countDocuments(filtro),
      Transaccion.find(filtro)
        .populate("registradoPor", "nombre")
        .populate("mecanicoId", "nombre")
        .populate("proveedorId", "nombre")
        .sort({ fecha: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
      transacciones,
    });
  } catch (error) {
    next(error);
  }
};

const obtenerTransaccion = async (req, res, next) => {
  try {
    const transaccion = await Transaccion.findById(req.params.id)
      .populate("registradoPor", "nombre email")
      .populate("mecanicoId", "nombre")
      .populate("proveedorId", "nombre");

    if (!transaccion)
      return res.status(404).json({ msg: "Transaccion no encontrada" });
    return res.json({ transaccion });
  } catch (error) {
    next(error);
  }
};

const resumenFinanciero = async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.desde || req.query.hasta) {
      filtro.fecha = {};
      if (req.query.desde) filtro.fecha.$gte = new Date(req.query.desde);
      if (req.query.hasta) filtro.fecha.$lte = new Date(req.query.hasta);
    }

    const resumen = await Transaccion.aggregate([
      { $match: filtro },
      {
        $group: { _id: "$tipo", total: { $sum: "$monto" }, count: { $sum: 1 } },
      },
    ]);

    const porCategoria = await Transaccion.aggregate([
      { $match: filtro },
      {
        $group: {
          _id: { tipo: "$tipo", categoria: "$categoria" },
          total: { $sum: "$monto" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const ingresos = resumen.find((r) => r._id === "ingreso")?.total || 0;
    const egresos = resumen.find((r) => r._id === "egreso")?.total || 0;

    return res.json({
      ingresos,
      egresos,
      balance: ingresos - egresos,
      detallePorCategoria: porCategoria,
    });
  } catch (error) {
    next(error);
  }
};

const eliminarTransaccion = async (req, res, next) => {
  try {
    const transaccion = await Transaccion.findByIdAndDelete(req.params.id);
    if (!transaccion)
      return res.status(404).json({ msg: "Transaccion no encontrada" });
    return res.json({ msg: "Transaccion eliminada correctamente" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearTransaccion,
  listarTransacciones,
  obtenerTransaccion,
  resumenFinanciero,
  eliminarTransaccion,
};
