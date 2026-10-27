const Repuesto = require("../models/Repuesto");
const Proveedor = require("../models/Proveedor");
const MarcaRepuesto = require("../models/MarcaRepuesto");
const CategoriaRepuesto = require("../models/CategoriaRepuesto");
const Mantenimiento = require("../models/Mantenimiento");
const Transaccion = require("../models/Transaccion");
const Cliente = require("../models/Cliente");
const Configuracion = require("../models/Configuracion");
const crypto = require("crypto");

// ─── Categorias excluidas del reverso ─────────────
const CATEGORIAS_NO_REVERSIBLES = [
  "electricos",
  "eléctricos",
  "lubricacion",
  "lubricación",
];

// ─── Generar referencia unica aleatoria MTR0000 ───
const generarReferenciaUnica = async () => {
  let intentos = 0;
  const maxIntentos = 100;

  while (intentos < maxIntentos) {
    const numero = String(Math.floor(1000 + Math.random() * 9000));
    const referencia = `MTR${numero}`;

    const existe = await Repuesto.findOne({ referencia });
    if (!existe) return referencia;

    intentos++;
  }

  for (let i = 1000; i <= 9999; i++) {
    const referencia = `MTR${i}`;
    const existe = await Repuesto.findOne({ referencia });
    if (!existe) return referencia;
  }

  throw new Error("No hay referencias disponibles");
};

// ─── Generar numero de recibo aleatorio ───────────
const generarNumeroRecibo = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `REC-${timestamp}-${random}`;
};

// --- Obtener configuracion (IVA, descuento) ---
const obtenerConfig = async () => {
  const registros = await Configuracion.find();
  const config = { iva: 0.19, descuento: 0.05 };

  registros.forEach((r) => {
    if (r.clave === "iva" || r.clave === "descuento") {
      const num = Number(r.valor);
      // Validar que sea un numero valido entre 0 y 1
      if (!isNaN(num) && num >= 0 && num <= 1) {
        config[r.clave] = num;
      }
    }
  });

  return config;
};

// ─── Verificar si un repuesto es reversible ───────
const esReversible = async (repuesto) => {
  if (!repuesto.categoriaId) return true;
  const categoria = await CategoriaRepuesto.findById(repuesto.categoriaId);
  if (!categoria) return true;
  const nombre = categoria.nombre.toLowerCase().trim();
  return !CATEGORIAS_NO_REVERSIBLES.some((c) => nombre.includes(c));
};

// ─── Crear repuesto ───────────────────────────────
const crearRepuesto = async (req, res, next) => {
  try {
    const {
      nombre,
      descripcion,
      compatibilidad,
      marcaId,
      categoriaId,
      proveedorId,
      stock,
      stockMinimo,
      precioCompra,
      precioVenta,
    } = req.body;

    if (marcaId) {
      const marca = await MarcaRepuesto.findById(marcaId);
      if (!marca)
        return res.status(400).json({ msg: "La marca indicada no existe" });
    }

    if (categoriaId) {
      const categoria = await CategoriaRepuesto.findById(categoriaId);
      if (!categoria)
        return res.status(400).json({ msg: "La categoria indicada no existe" });
    }

    if (proveedorId) {
      const proveedor = await Proveedor.findById(proveedorId);
      if (!proveedor)
        return res.status(400).json({ msg: "El proveedor indicado no existe" });
    }

    const referencia = await generarReferenciaUnica();

    const repuesto = new Repuesto({
      referencia,
      nombre,
      descripcion,
      compatibilidad,
      marcaId: marcaId || null,
      categoriaId: categoriaId || null,
      proveedorId: proveedorId || null,
      stock: stock || 0,
      stockMinimo: stockMinimo !== undefined ? stockMinimo : 20,
      precioCompra: precioCompra || 0,
      precioVenta,
    });

    await repuesto.save();
    await repuesto.populate([
      { path: "marcaId", select: "nombre" },
      { path: "categoriaId", select: "nombre" },
      { path: "proveedorId", select: "nombre" },
    ]);

    return res.status(201).json({
      msg: "Repuesto creado correctamente",
      repuesto,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Listar repuestos ─────────────────────────────
const listarRepuestos = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      500,
    );
    const skip = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const activo = req.query.activo;
    const bajoStock = req.query.bajoStock === "true";
    const marcaId = req.query.marcaId;
    const categoriaId = req.query.categoriaId;

    const filtro = {};
    if (activo !== undefined) filtro.activo = activo === "true";
    if (marcaId) filtro.marcaId = marcaId;
    if (categoriaId) filtro.categoriaId = categoriaId;

    if (search) {
      const regex = new RegExp(search, "i");
      filtro.$or = [
        { nombre: regex },
        { referencia: regex },
        { compatibilidad: regex },
      ];
    }

    if (bajoStock) {
      filtro.$expr = { $lte: ["$stock", "$stockMinimo"] };
    }

    const [total, repuestos] = await Promise.all([
      Repuesto.countDocuments(filtro),
      Repuesto.find(filtro)
        .populate("marcaId", "nombre")
        .populate("categoriaId", "nombre")
        .populate("proveedorId", "nombre")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
      repuestos,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Obtener repuesto ─────────────────────────────
const obtenerRepuesto = async (req, res, next) => {
  try {
    const repuesto = await Repuesto.findById(req.params.id)
      .populate("marcaId", "nombre")
      .populate("categoriaId", "nombre")
      .populate("proveedorId", "nombre telefono email");

    if (!repuesto)
      return res.status(404).json({ msg: "Repuesto no encontrado" });
    return res.json({ repuesto });
  } catch (error) {
    next(error);
  }
};

// ─── Actualizar repuesto ──────────────────────────
const actualizarRepuesto = async (req, res, next) => {
  try {
    const repuesto = await Repuesto.findById(req.params.id);
    if (!repuesto)
      return res.status(404).json({ msg: "Repuesto no encontrado" });

    if (req.body.marcaId) {
      const marca = await MarcaRepuesto.findById(req.body.marcaId);
      if (!marca)
        return res.status(400).json({ msg: "La marca indicada no existe" });
    }
    if (req.body.categoriaId) {
      const categoria = await CategoriaRepuesto.findById(req.body.categoriaId);
      if (!categoria)
        return res.status(400).json({ msg: "La categoria indicada no existe" });
    }
    if (req.body.proveedorId) {
      const proveedor = await Proveedor.findById(req.body.proveedorId);
      if (!proveedor)
        return res.status(400).json({ msg: "El proveedor indicado no existe" });
    }

    const campos = [
      "nombre",
      "descripcion",
      "compatibilidad",
      "marcaId",
      "categoriaId",
      "proveedorId",
      "stock",
      "stockMinimo",
      "precioCompra",
      "precioVenta",
      "activo",
    ];
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) repuesto[campo] = req.body[campo];
    });

    await repuesto.save();
    await repuesto.populate([
      { path: "marcaId", select: "nombre" },
      { path: "categoriaId", select: "nombre" },
      { path: "proveedorId", select: "nombre" },
    ]);

    return res.json({ msg: "Repuesto actualizado correctamente", repuesto });
  } catch (error) {
    next(error);
  }
};

// ─── Ajustar stock ────────────────────────────────
const ajustarStock = async (req, res, next) => {
  try {
    const { cantidad, motivo } = req.body;
    const repuesto = await Repuesto.findById(req.params.id);
    if (!repuesto)
      return res.status(404).json({ msg: "Repuesto no encontrado" });

    const nuevoStock = repuesto.stock + Number(cantidad);
    if (nuevoStock < 0) {
      return res.status(400).json({ msg: "El stock no puede quedar negativo" });
    }

    repuesto.stock = nuevoStock;
    await repuesto.save();

    return res.json({
      msg: `Stock ajustado (${cantidad >= 0 ? "+" : ""}${cantidad})${motivo ? ` - ${motivo}` : ""}`,
      repuesto,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Vender repuesto (con IVA, descuento, cliente) ───
const venderRepuesto = async (req, res, next) => {
  try {
    const {
      cantidad,
      montoRecibido,
      metodo, // 'Efectivo' | 'Transferencia' | 'Nequi' | 'Daviplata' | 'Tarjeta'
      // Datos del cliente (opcionales)
      clienteId, // si ya existe
      cliente, // objeto con datos nuevos { cedula, nombre, email, telefono }
      consumidorFinal, // true o false
    } = req.body;

    const repuesto = await Repuesto.findById(req.params.id).populate(
      "categoriaId",
      "nombre",
    );
    if (!repuesto)
      return res.status(404).json({ msg: "Repuesto no encontrado" });
    if (!repuesto.activo)
      return res.status(400).json({ msg: "El repuesto esta inactivo" });

    const cant = Number(cantidad);
    if (isNaN(cant) || cant <= 0) {
      return res.status(400).json({ msg: "La cantidad debe ser mayor a cero" });
    }
    if (cant > repuesto.stock) {
      return res.status(400).json({
        msg: `Stock insuficiente. Disponible: ${repuesto.stock}, solicitado: ${cant}`,
      });
    }

    // ─── Calcular precios ────────────────────────
    const config = await obtenerConfig();
    const subtotal = repuesto.precioVenta * cant;
    const iva = +(subtotal * config.iva).toFixed(2);
    const subtotalConIva = +(subtotal + iva).toFixed(2);
    const descuento = +(subtotalConIva * config.descuento).toFixed(2);
    const total = +(subtotalConIva - descuento).toFixed(2);

    const monto = Number(montoRecibido);
    if (isNaN(monto) || monto < total) {
      return res.status(400).json({
        msg: `El monto recibido (${monto}) no puede ser menor al total (${total})`,
      });
    }

    const cambio = +(monto - total).toFixed(2);

    // ─── Resolver cliente ────────────────────────
    let clienteInfo = null;
    let clienteIdFinal = null;

    if (consumidorFinal) {
      // Consumidor final segun ley colombiana
      clienteInfo = {
        cedula: "222222222222",
        nombre: "Consumidor Final",
        email: null,
        telefono: null,
        consumidorFinal: true,
      };
    } else if (clienteId) {
      // Cliente existente
      const c = await Cliente.findById(clienteId);
      if (!c) return res.status(400).json({ msg: "Cliente no encontrado" });

      clienteInfo = {
        cedula: c.cedula || null,
        nombre: c.nombre,
        email: c.email || null,
        telefono: c.telefono || null,
        consumidorFinal: false,
      };
      clienteIdFinal = c._id;
    } else if (cliente && cliente.cedula && cliente.nombre) {
      // Cliente nuevo, guardarlo
      const nuevo = new Cliente({
        nombre: cliente.nombre,
        cedula: cliente.cedula,
        telefono: cliente.telefono || "0000000",
        email: cliente.email || null,
      });
      await nuevo.save();

      clienteInfo = {
        cedula: nuevo.cedula,
        nombre: nuevo.nombre,
        email: nuevo.email || null,
        telefono: nuevo.telefono || null,
        consumidorFinal: false,
      };
      clienteIdFinal = nuevo._id;
    } else {
      // Sin cliente → consumidor final por defecto
      clienteInfo = {
        cedula: "222222222222",
        nombre: "Consumidor Final",
        email: null,
        telefono: null,
        consumidorFinal: true,
      };
    }

    // ─── Descontar stock ─────────────────────────
    repuesto.stock -= cant;
    await repuesto.save();

    // ─── Generar numero de recibo ────────────────
    const numeroRecibo = generarNumeroRecibo();

    // ─── Registrar ingreso ───────────────────────
    const transaccion = await Transaccion.create({
      tipo: "ingreso",
      categoria: "pago_cliente",
      monto: total,
      metodo: metodo || "Efectivo",
      descripcion: `Venta: ${repuesto.nombre} (${repuesto.referencia}) x${cant} - ${clienteInfo.nombre}`,
      fecha: new Date(),
      registradoPor: req.usuario._id,
      // Campos nuevos
      numeroRecibo,
      subtotal,
      iva,
      descuento,
      items: [
        {
          repuestoId: repuesto._id,
          referencia: repuesto.referencia,
          nombre: repuesto.nombre,
          cantidad: cant,
          precioUnitario: repuesto.precioVenta,
          subtotal,
        },
      ],
      clienteInfo,
      metodoPago: metodo || "Efectivo",
      reversada: false,
    });

    return res.json({
      msg: "Venta registrada correctamente",
      venta: {
        _id: transaccion._id,
        numeroRecibo,
        repuesto: {
          _id: repuesto._id,
          referencia: repuesto.referencia,
          nombre: repuesto.nombre,
        },
        cantidad: cant,
        precioUnitario: repuesto.precioVenta,
        subtotal,
        iva,
        descuento,
        total,
        montoRecibido: monto,
        cambio,
        metodo: metodo || "Efectivo",
        clienteInfo,
        fecha: new Date(),
        // ← AGREGA ESTE ARRAY
        items: [
          {
            repuestoId: repuesto._id,
            referencia: repuesto.referencia,
            nombre: repuesto.nombre,
            cantidad: cant,
            precioUnitario: repuesto.precioVenta,
            subtotal,
          },
        ],
      },
      stockRestante: repuesto.stock,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Historial de ventas de repuestos ─────────────
const historialVentas = async (req, res, next) => {
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
    const metodo = req.query.metodo;
    const reversada = req.query.reversada;

    const filtro = {
      tipo: "ingreso",
      categoria: "pago_cliente",
      numeroRecibo: { $ne: null },
    };

    if (metodo) filtro.metodoPago = metodo;
    if (reversada !== undefined) filtro.reversada = reversada === "true";

    if (desde || hasta) {
      filtro.fecha = {};
      if (desde) filtro.fecha.$gte = desde;
      if (hasta) {
        const fin = new Date(hasta);
        fin.setHours(23, 59, 59, 999);
        filtro.fecha.$lte = fin;
      }
    }

    if (search) {
      const regex = new RegExp(search, "i");
      filtro.$or = [
        { numeroRecibo: regex },
        { "clienteInfo.nombre": regex },
        { "clienteInfo.cedula": regex },
        { "items.nombre": regex },
        { "items.referencia": regex },
      ];
    }

    const [total, ventas] = await Promise.all([
      Transaccion.countDocuments(filtro),
      Transaccion.find(filtro)
        .populate("registradoPor", "nombre")
        .sort({ fecha: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.json({
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
      ventas,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Reverso de venta ─────────────────────────────
const reversarVenta = async (req, res, next) => {
  try {
    const { motivo } = req.body;
    const venta = await Transaccion.findById(req.params.id);

    if (!venta) return res.status(404).json({ msg: "Venta no encontrada" });
    if (venta.reversada) {
      return res.status(400).json({ msg: "Esta venta ya fue reversada" });
    }
    if (!venta.items || venta.items.length === 0) {
      return res.status(400).json({ msg: "La venta no tiene items" });
    }

    // Verificar si TODOS los items son reversibles
    for (const item of venta.items) {
      const repuesto = await Repuesto.findById(item.repuestoId).populate(
        "categoriaId",
        "nombre",
      );
      if (!repuesto) continue;

      const reversible = await esReversible(repuesto);
      if (!reversible) {
        return res.status(400).json({
          msg: `No se puede reversar: "${repuesto.nombre}" es de una categoria que no permite devoluciones (electricos o lubricacion)`,
        });
      }
    }

    // Devolver stock
    for (const item of venta.items) {
      const repuesto = await Repuesto.findById(item.repuestoId);
      if (repuesto) {
        repuesto.stock += item.cantidad;
        await repuesto.save();
      }
    }

    // Marcar venta como reversada
    venta.reversada = true;
    venta.fechaReverso = new Date();
    venta.motivoReverso = motivo || "Reverso solicitado por el cliente";
    await venta.save();

    // Registrar egreso por el reverso
    await Transaccion.create({
      tipo: "egreso",
      categoria: "otro_egreso",
      monto: venta.monto,
      metodo: "Efectivo",
      descripcion: `Reverso venta ${venta.numeroRecibo} - ${venta.clienteInfo?.nombre || "Consumidor Final"} - Motivo: ${motivo || "Sin motivo"}`,
      fecha: new Date(),
      registradoPor: req.usuario._id,
      reversada: false,
      transaccionOriginalId: venta._id,
    });

    return res.json({
      msg: `Venta reversada. Se devolvieron ${venta.items.length} item(s) al inventario y $${venta.monto.toLocaleString("es-CO")} al cliente.`,
      venta,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Eliminar repuesto ────────────────────────────
const eliminarRepuesto = async (req, res, next) => {
  try {
    const repuesto = await Repuesto.findById(req.params.id);
    if (!repuesto)
      return res.status(404).json({ msg: "Repuesto no encontrado" });

    const usos = await Mantenimiento.countDocuments({
      "repuestosUtilizados.repuestoId": repuesto._id,
    });
    if (usos > 0) {
      repuesto.activo = false;
      await repuesto.save();
      return res.json({
        msg: "El repuesto tiene mantenimientos asociados. Se ha desactivado.",
        repuesto,
      });
    }

    await repuesto.deleteOne();
    return res.json({ msg: "Repuesto eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

// ─── Generar referencia preliminar ───────────────
const generarReferenciaPreview = async (req, res, next) => {
  try {
    const referencia = await generarReferenciaUnica();
    return res.json({ referencia });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearRepuesto,
  listarRepuestos,
  obtenerRepuesto,
  actualizarRepuesto,
  ajustarStock,
  venderRepuesto,
  historialVentas,
  reversarVenta,
  eliminarRepuesto,
  generarReferenciaPreview,
};
