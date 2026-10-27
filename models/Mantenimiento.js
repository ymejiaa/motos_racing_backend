const mongoose = require("mongoose");

// Subesquema: servicio realizado dentro de un mantenimiento
const ServicioRealizadoSchema = new mongoose.Schema(
  {
    servicioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Servicio",
      required: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    precio: {
      type: Number,
      required: true,
      min: 0,
    },
    notas: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: false },
);

// Subesquema: repuesto utilizado dentro de un mantenimiento
const RepuestoUtilizadoSchema = new mongoose.Schema(
  {
    repuestoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repuesto",
      required: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1,
    },
    precioUnitario: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

// Subesquema: imagen del mantenimiento
const ImagenSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    descripcion: {
      type: String,
      default: null,
      trim: true,
    },
    momento: {
      type: String,
      enum: ["ingreso", "durante", "entrega"],
      required: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    subidoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null,
    },
  },
  { _id: false },
);

// Subesquema: autorizacion adicional aprobada por el cliente
const AutorizacionSchema = new mongoose.Schema(
  {
    descripcion: {
      type: String,
      required: true,
      trim: true,
    },
    monto: {
      type: Number,
      required: true,
      min: 0,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    autorizadoPor: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: false },
);

// Subesquema: cambio de estado (auditoria)
const HistorialEstadoSchema = new mongoose.Schema(
  {
    estado: {
      type: String,
      required: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null,
    },
    nota: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: false },
);

const MantenimientoSchema = new mongoose.Schema(
  {
    // ─── Relaciones principales ─────────────────
    motoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Moto",
      required: [true, "La moto es obligatoria"],
    },
    mecanicoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mecanico",
      required: [true, "El mecanico es obligatorio"],
    },
    registradoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "El usuario que registra es obligatorio"],
    },

    // ─── Datos de la visita ─────────────────────
    kilometraje: {
      type: Number,
      required: [true, "El kilometraje es obligatorio"],
      min: [0, "El kilometraje no puede ser negativo"],
    },
    fechaIngreso: {
      type: Date,
      default: Date.now,
    },
    fechaEntrega: {
      type: Date,
      default: null,
    },
    fechaPromesa: {
      type: Date,
      default: null,
    },

    // ─── Estado del trabajo ─────────────────────
    estado: {
      type: String,
      enum: {
        values: [
          "Recibido",
          "En Diagnostico",
          "En Reparacion",
          "Listo",
          "Entregado",
        ],
        message: "Estado no valido",
      },
      default: "Recibido",
    },

    // ─── Descripciones ──────────────────────────
    motivoIngreso: {
      type: String,
      default: null,
      trim: true,
    },
    diagnostico: {
      type: String,
      default: null,
      trim: true,
    },
    observaciones: {
      type: String,
      default: null,
      trim: true,
    },
    recomendacionesProxima: {
      type: String,
      default: null,
      trim: true,
    },

    // ─── Imagenes (evidencia) ───────────────────
    imagenes: {
      type: [ImagenSchema],
      default: [],
    },

    // ─── Trabajos y repuestos ───────────────────
    serviciosRealizados: {
      type: [ServicioRealizadoSchema],
      default: [],
    },
    repuestosUtilizados: {
      type: [RepuestoUtilizadoSchema],
      default: [],
    },
    autorizacionesAdicionales: {
      type: [AutorizacionSchema],
      default: [],
    },

    // ─── Economia ───────────────────────────────
    subtotalServicios: {
      type: Number,
      default: 0,
      min: 0,
    },
    subtotalRepuestos: {
      type: Number,
      default: 0,
      min: 0,
    },
    descuento: {
      type: Number,
      default: 0,
      min: 0,
    },
    costoTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    anticipo: {
      type: Number,
      default: 0,
      min: 0,
    },
    saldoPendiente: {
      type: Number,
      default: 0,
      min: 0,
    },
    estadoPago: {
      type: String,
      enum: {
        values: ["Pendiente", "Abonado", "Pagado"],
        message: "Estado de pago no valido",
      },
      default: "Pendiente",
    },

    valorMantenimiento: {
      type: Number,
      default: 0,
      min: 0,
    },
    bloqueado: {
      type: Boolean,
      default: false,
    },

    // ─── Pago al mecanico ───────────────────────
    pagoMecanico: {
      type: Number,
      default: 0,
      min: 0,
    },
    pagadoAlMecanico: {
      type: Boolean,
      default: false,
    },
    fechaPagoMecanico: {
      type: Date,
      default: null,
    },

    // ─── Auditoria de estados ───────────────────
    historialEstados: {
      type: [HistorialEstadoSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "mantenimientos",
    versionKey: false,
  },
);

// ─── Indices ──────────────────────────────────────
MantenimientoSchema.index({ motoId: 1, fechaIngreso: -1 });
MantenimientoSchema.index({ mecanicoId: 1, fechaIngreso: -1 });
MantenimientoSchema.index({ estado: 1 });
MantenimientoSchema.index({ fechaIngreso: -1 });
MantenimientoSchema.index({ estadoPago: 1 });
MantenimientoSchema.index({ pagadoAlMecanico: 1 });

// ─── Constante de comision ────────────────────────
const PORCENTAJE_COMISION = 0.5;

// ─── Hook: recalcular totales antes de validar ────
MantenimientoSchema.pre("validate", function () {
  // Subtotal servicios
  this.subtotalServicios = this.serviciosRealizados.reduce(
    (acc, s) => acc + (s.precio || 0),
    0,
  );

  // Subtotal repuestos
  this.subtotalRepuestos = this.repuestosUtilizados.reduce(
    (acc, r) => acc + (r.subtotal || 0),
    0,
  );

  // Costo total (lo que paga el cliente)
  this.costoTotal =
    (this.valorMantenimiento || 0) +
    this.subtotalServicios +
    this.subtotalRepuestos -
    (this.descuento || 0);

  // Saldo pendiente
  this.saldoPendiente = this.costoTotal - (this.anticipo || 0);

  // Estado de pago automatico
  // Si el costo total es 0 (aun no se definio el valor), queda Pendiente
  if (this.costoTotal <= 0) {
    this.estadoPago = "Pendiente";
  } else if (this.saldoPendiente <= 0) {
    this.estadoPago = "Pagado";
  } else if (this.anticipo > 0) {
    this.estadoPago = "Abonado";
  } else {
    this.estadoPago = "Pendiente";
  }

  // Mano de obra = valor manual + servicios (si los hay)
  const manoDeObra =
    (this.valorMantenimiento || 0) + (this.subtotalServicios || 0);

  // Comision del mecanico: SOLO sobre mano de obra
  this.pagoMecanico = +(manoDeObra * PORCENTAJE_COMISION).toFixed(2);

  // Fecha de entrega automatica al pasar a Entregado
  if (this.estado === "Entregado" && !this.fechaEntrega) {
    this.fechaEntrega = new Date();
  }
});

// ─── Metodo: cambiar estado con auditoria ─────────
MantenimientoSchema.methods.cambiarEstado = function (
  nuevoEstado,
  usuarioId,
  nota,
) {
  this.estado = nuevoEstado;
  this.historialEstados.push({
    estado: nuevoEstado,
    fecha: new Date(),
    usuarioId: usuarioId || null,
    nota: nota || null,
  });

  if (nuevoEstado === "Entregado" && !this.fechaEntrega) {
    this.fechaEntrega = new Date();
  }
};

module.exports = mongoose.model("Mantenimiento", MantenimientoSchema);
