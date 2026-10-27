const Mantenimiento = require("../models/Mantenimiento");
const Moto = require("../models/Moto");
const Mecanico = require("../models/Mecanico");
const Servicio = require("../models/Servicio");
const Repuesto = require("../models/Repuesto");
const Transaccion = require("../models/Transaccion");
const fs = require("fs");
const path = require("path");

const crearMantenimiento = async (req, res, next) => {
  try {
    const {
      motoId,
      mecanicoId,
      kilometraje,
      motivoIngreso,
      diagnostico,
      observaciones,
      recomendacionesProxima,
      fechaPromesa,
      serviciosRealizados,
      repuestosUtilizados,
    } = req.body;

    // Validar que se suban imagenes (obligatorias)
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        msg: "Debes subir al menos una imagen de la moto",
      });
    }

    const moto = await Moto.findById(motoId);
    if (!moto)
      return res.status(400).json({ msg: "La moto indicada no existe" });

    const mecanico = await Mecanico.findById(mecanicoId);
    if (!mecanico)
      return res.status(400).json({ msg: "El mecanico indicado no existe" });
    if (!mecanico.activo)
      return res.status(400).json({ msg: "El mecanico esta inactivo" });

    const servicios =
      typeof serviciosRealizados === "string"
        ? JSON.parse(serviciosRealizados)
        : serviciosRealizados || [];
    const repuestos =
      typeof repuestosUtilizados === "string"
        ? JSON.parse(repuestosUtilizados)
        : repuestosUtilizados || [];

    const serviciosEnriquecidos = [];
    for (const s of servicios) {
      const servicio = await Servicio.findById(s.servicioId);
      if (!servicio)
        return res
          .status(400)
          .json({ msg: `Servicio no encontrado: ${s.servicioId}` });
      serviciosEnriquecidos.push({
        servicioId: servicio._id,
        nombre: servicio.nombre,
        precio: s.precio !== undefined ? s.precio : servicio.precioBase,
        notas: s.notas || null,
      });
    }

    const repuestosEnriquecidos = [];
    for (const r of repuestos) {
      const repuesto = await Repuesto.findById(r.repuestoId);
      if (!repuesto)
        return res
          .status(400)
          .json({ msg: `Repuesto no encontrado: ${r.repuestoId}` });
      if (repuesto.stock < r.cantidad) {
        return res.status(400).json({
          msg: `Stock insuficiente para ${repuesto.nombre}. Disponible: ${repuesto.stock}, solicitado: ${r.cantidad}`,
        });
      }

      const precioUnitario =
        r.precioUnitario !== undefined
          ? r.precioUnitario
          : repuesto.precioVenta;
      repuestosEnriquecidos.push({
        repuestoId: repuesto._id,
        nombre: repuesto.nombre,
        cantidad: r.cantidad,
        precioUnitario,
        subtotal: precioUnitario * r.cantidad,
      });

      repuesto.stock -= r.cantidad;
      await repuesto.save();
    }

    const imagenes = (req.files || []).map((file) => ({
      url: `/uploads/mantenimientos/${file.filename}`,
      descripcion: req.body[`desc_${file.filename}`] || null,
      momento: req.body[`momento_${file.filename}`] || "ingreso",
      fecha: new Date(),
      subidoPor: req.usuario._id,
    }));

    const mantenimiento = new Mantenimiento({
      motoId,
      mecanicoId,
      registradoPor: req.usuario._id,
      kilometraje,
      motivoIngreso,
      diagnostico,
      observaciones,
      recomendacionesProxima,
      fechaPromesa: fechaPromesa || null,
      serviciosRealizados: serviciosEnriquecidos,
      repuestosUtilizados: repuestosEnriquecidos,
      imagenes,
      historialEstados: [
        {
          estado: "Recibido",
          fecha: new Date(),
          usuarioId: req.usuario._id,
          nota: "Ingreso al taller",
        },
      ],
    });

    await mantenimiento.save();
    await mantenimiento.populate([
      {
        path: "motoId",
        select: "placa marca modelo clienteId",
        populate: {
          path: "clienteId",
          select: "nombre telefono",
        },
      },
      { path: "mecanicoId", select: "nombre" },
    ]);

    return res
      .status(201)
      .json({ msg: "Mantenimiento creado correctamente", mantenimiento });
  } catch (error) {
    next(error);
  }
};

const listarMantenimientos = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const skip = (page - 1) * limit;

    const filtro = {};
    if (req.query.estado) filtro.estado = req.query.estado;
    if (req.query.mecanicoId) filtro.mecanicoId = req.query.mecanicoId;
    if (req.query.motoId) filtro.motoId = req.query.motoId;
    if (req.query.estadoPago) filtro.estadoPago = req.query.estadoPago;
    if (req.query.pagadoAlMecanico !== undefined) {
      filtro.pagadoAlMecanico = req.query.pagadoAlMecanico === "true";
    }
    if (req.query.desde || req.query.hasta) {
      filtro.fechaIngreso = {};
      if (req.query.desde) filtro.fechaIngreso.$gte = new Date(req.query.desde);
      if (req.query.hasta) filtro.fechaIngreso.$lte = new Date(req.query.hasta);
    }
    if (req.query.clienteId) {
      const Moto = require("../models/Moto");
      const motos = await Moto.find({ clienteId: req.query.clienteId }).select(
        "_id",
      );
      const motoIds = motos.map((m) => m._id);
      filtro.motoId = { $in: motoIds };
    }

    const [total, mantenimientos] = await Promise.all([
      Mantenimiento.countDocuments(filtro),
      Mantenimiento.find(filtro)
        .populate({
          path: "motoId",
          select: "placa marca modelo color cilindraje clienteId",
          populate: {
            path: "clienteId",
            select: "nombre telefono cedula",
          },
        })
        .populate("mecanicoId", "nombre")
        .sort({ fechaIngreso: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
      mantenimientos,
    });
  } catch (error) {
    next(error);
  }
};

const obtenerMantenimiento = async (req, res, next) => {
  try {
    const mantenimiento = await Mantenimiento.findById(req.params.id)
      .populate({
        path: "motoId",
        select: "placa marca modelo color cilindraje numeroMotor numeroChasis",
        populate: {
          path: "clienteId",
          select: "nombre telefono cedula email direccion",
        },
      })
      .populate("mecanicoId", "nombre email telefono")
      .populate("registradoPor", "nombre email");

    if (!mantenimiento)
      return res.status(404).json({ msg: "Mantenimiento no encontrado" });
    return res.json({ mantenimiento });
  } catch (error) {
    next(error);
  }
};

const actualizarMantenimiento = async (req, res, next) => {
  try {
    const mantenimiento = await Mantenimiento.findById(req.params.id);
    if (!mantenimiento)
      return res.status(404).json({ msg: "Mantenimiento no encontrado" });
    if (mantenimiento.estado === "Entregado") {
      return res
        .status(400)
        .json({ msg: "No se puede modificar un mantenimiento ya entregado" });
    }

    [
      "kilometraje",
      "motivoIngreso",
      "diagnostico",
      "observaciones",
      "recomendacionesProxima",
      "fechaPromesa",
    ].forEach((campo) => {
      if (req.body[campo] !== undefined) mantenimiento[campo] = req.body[campo];
    });

    await mantenimiento.save();
    return res.json({
      msg: "Mantenimiento actualizado correctamente",
      mantenimiento,
    });
  } catch (error) {
    next(error);
  }
};

const cambiarEstado = async (req, res, next) => {
  try {
    const { estado, nota } = req.body;
    const mantenimiento = await Mantenimiento.findById(req.params.id);
    if (!mantenimiento) {
      return res.status(404).json({ msg: "Mantenimiento no encontrado" });
    }

    if (mantenimiento.bloqueado) {
      return res.status(403).json({
        msg: "Este mantenimiento esta bloqueado y no se puede modificar",
      });
    }

    const estadosValidos = [
      "Recibido",
      "En Diagnostico",
      "En Reparacion",
      "Listo",
      "Entregado",
    ];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ msg: "Estado invalido" });
    }

    mantenimiento.cambiarEstado(estado, req.usuario._id, nota);
    await mantenimiento.save();

    if (estado === "Entregado" && mantenimiento.saldoPendiente <= 0) {
      const existe = await Transaccion.findOne({
        mantenimientoId: mantenimiento._id,
        categoria: "pago_cliente",
      });
      if (!existe) {
        await Transaccion.create({
          tipo: "ingreso",
          categoria: "pago_cliente",
          monto: mantenimiento.costoTotal,
          metodo: "Efectivo",
          descripcion: `Pago completo mantenimiento #${mantenimiento._id}`,
          mantenimientoId: mantenimiento._id,
          registradoPor: req.usuario._id,
        });
      }
    }

    return res.json({ msg: `Estado cambiado a ${estado}`, mantenimiento });
  } catch (error) {
    next(error);
  }
};

const subirImagenes = async (req, res, next) => {
  try {
    const mantenimiento = await Mantenimiento.findById(req.params.id);
    if (!mantenimiento)
      return res.status(404).json({ msg: "Mantenimiento no encontrado" });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: "No se recibieron imagenes" });
    }

    const nuevas = req.files.map((file) => ({
      url: `/uploads/mantenimientos/${file.filename}`,
      descripcion: req.body[`desc_${file.filename}`] || null,
      momento: req.body[`momento_${file.filename}`] || "durante",
      fecha: new Date(),
      subidoPor: req.usuario._id,
    }));

    mantenimiento.imagenes.push(...nuevas);
    await mantenimiento.save();

    return res.json({
      msg: `${nuevas.length} imagen(es) agregada(s)`,
      imagenes: mantenimiento.imagenes,
    });
  } catch (error) {
    next(error);
  }
};

const eliminarImagen = async (req, res, next) => {
  try {
    const mantenimiento = await Mantenimiento.findById(req.params.id);
    if (!mantenimiento)
      return res.status(404).json({ msg: "Mantenimiento no encontrado" });

    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || index >= mantenimiento.imagenes.length) {
      return res.status(400).json({ msg: "Indice de imagen invalido" });
    }

    const imagen = mantenimiento.imagenes[index];
    const filePath = path.join(__dirname, "..", imagen.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    mantenimiento.imagenes.splice(index, 1);
    await mantenimiento.save();
    return res.json({
      msg: "Imagen eliminada correctamente",
      imagenes: mantenimiento.imagenes,
    });
  } catch (error) {
    next(error);
  }
};

const registrarAnticipo = async (req, res, next) => {
  try {
    const { monto, metodo, referencia } = req.body;
    const mantenimiento = await Mantenimiento.findById(req.params.id);
    if (!mantenimiento)
      return res.status(404).json({ msg: "Mantenimiento no encontrado" });

    if (monto <= 0)
      return res.status(400).json({ msg: "El monto debe ser mayor a cero" });
    if (monto > mantenimiento.saldoPendiente) {
      return res
        .status(400)
        .json({ msg: "El anticipo supera el saldo pendiente" });
    }

    mantenimiento.anticipo += monto;
    await mantenimiento.save();

    await Transaccion.create({
      tipo: "ingreso",
      categoria: "pago_cliente",
      monto,
      metodo: metodo || "Efectivo",
      referencia: referencia || null,
      descripcion: `Anticipo mantenimiento #${mantenimiento._id}`,
      mantenimientoId: mantenimiento._id,
      registradoPor: req.usuario._id,
    });

    return res.json({ msg: "Anticipo registrado", mantenimiento });
  } catch (error) {
    next(error);
  }
};

const eliminarMantenimiento = async (req, res, next) => {
  try {
    const mantenimiento = await Mantenimiento.findById(req.params.id);
    if (!mantenimiento) {
      return res.status(404).json({ msg: "Mantenimiento no encontrado" });
    }

    if (mantenimiento.bloqueado) {
      return res.status(403).json({
        msg: "Este mantenimiento esta bloqueado y no se puede eliminar",
      });
    }

    for (const img of mantenimiento.imagenes) {
      const filePath = path.join(__dirname, "..", img.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    for (const r of mantenimiento.repuestosUtilizados) {
      const repuesto = await Repuesto.findById(r.repuestoId);
      if (repuesto) {
        repuesto.stock += r.cantidad;
        await repuesto.save();
      }
    }

    await mantenimiento.deleteOne();
    return res.json({ msg: "Mantenimiento eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

// ─── Actualizar mantenimiento completo (incluye servicios y repuestos) ───
const actualizarMantenimientoCompleto = async (req, res, next) => {
  try {
    const mantenimiento = await Mantenimiento.findById(req.params.id);
    if (!mantenimiento) {
      return res.status(404).json({ msg: "Mantenimiento no encontrado" });
    }

    if (mantenimiento.bloqueado) {
      return res.status(403).json({
        msg: "Este mantenimiento esta bloqueado y no se puede modificar",
      });
    }

    const {
      kilometraje,
      motivoIngreso,
      diagnostico,
      observaciones,
      recomendacionesProxima,
      fechaPromesa,
      estado,
      valorMantenimiento,
      estadoPago,
      repuestosUtilizados,
    } = req.body;

    // ─── Repuestos: ajustar stock ────────────────
    const repuestosActuales = mantenimiento.repuestosUtilizados || [];
    const repuestosNuevos = repuestosUtilizados || [];

    // Devolver stock de repuestos eliminados
    for (const rAntiguo of repuestosActuales) {
      const existe = repuestosNuevos.find(
        (r) => r.repuestoId.toString() === rAntiguo.repuestoId.toString(),
      );
      if (!existe) {
        const repuesto = await Repuesto.findById(rAntiguo.repuestoId);
        if (repuesto) {
          repuesto.stock += rAntiguo.cantidad;
          await repuesto.save();
        }
      }
    }

    // Ajustar stock de repuestos modificados o nuevos
    const repuestosEnriquecidos = [];
    for (const r of repuestosNuevos) {
      const repuesto = await Repuesto.findById(r.repuestoId);
      if (!repuesto) continue;

      const rAntiguo = repuestosActuales.find(
        (ra) => ra.repuestoId.toString() === r.repuestoId.toString(),
      );

      if (rAntiguo) {
        const diff = r.cantidad - rAntiguo.cantidad;
        if (diff > 0 && repuesto.stock < diff) {
          return res.status(400).json({
            msg: `Stock insuficiente para ${repuesto.nombre}`,
          });
        }
        repuesto.stock -= diff;
        await repuesto.save();
      } else {
        if (repuesto.stock < r.cantidad) {
          return res.status(400).json({
            msg: `Stock insuficiente para ${repuesto.nombre}`,
          });
        }
        repuesto.stock -= r.cantidad;
        await repuesto.save();
      }

      repuestosEnriquecidos.push({
        repuestoId: repuesto._id,
        nombre: repuesto.nombre,
        cantidad: r.cantidad,
        precioUnitario: r.precioUnitario,
        subtotal: r.subtotal,
      });
    }

    // ─── Actualizar campos ────────────────────────
    if (kilometraje !== undefined) mantenimiento.kilometraje = kilometraje;
    if (motivoIngreso !== undefined)
      mantenimiento.motivoIngreso = motivoIngreso;
    if (diagnostico !== undefined) mantenimiento.diagnostico = diagnostico;
    if (observaciones !== undefined)
      mantenimiento.observaciones = observaciones;
    if (recomendacionesProxima !== undefined)
      mantenimiento.recomendacionesProxima = recomendacionesProxima;
    if (fechaPromesa !== undefined)
      mantenimiento.fechaPromesa = fechaPromesa || null;
    if (valorMantenimiento !== undefined)
      mantenimiento.valorMantenimiento = valorMantenimiento;
    if (estadoPago !== undefined) mantenimiento.estadoPago = estadoPago;

    mantenimiento.repuestosUtilizados = repuestosEnriquecidos;

    // ─── Cambio de estado ─────────────────────────
    if (estado && estado !== mantenimiento.estado) {
      mantenimiento.cambiarEstado(
        estado,
        req.usuario._id,
        "Cambio desde edicion",
      );
    }

    // ─── Bloquear si esta entregado y pagado ─────
    if (
      mantenimiento.estado === "Entregado" &&
      mantenimiento.estadoPago === "Pagado"
    ) {
      mantenimiento.bloqueado = true;
    }

    await mantenimiento.save();
    await mantenimiento.populate([
      {
        path: "motoId",
        select: "placa marca modelo clienteId",
        populate: { path: "clienteId", select: "nombre telefono" },
      },
      { path: "mecanicoId", select: "nombre" },
    ]);

    return res.json({ msg: "Mantenimiento actualizado", mantenimiento });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearMantenimiento,
  listarMantenimientos,
  obtenerMantenimiento,
  actualizarMantenimiento,
  actualizarMantenimientoCompleto,
  cambiarEstado,
  subirImagenes,
  eliminarImagen,
  registrarAnticipo,
  eliminarMantenimiento,
};
