const mongoose = require("mongoose");

const TransaccionSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: {
        values: ["ingreso", "egreso"],
        message: "El tipo debe ser ingreso o egreso",
      },
      required: [true, "El tipo es obligatorio"],
    },
    categoria: {
      type: String,
      enum: {
        values: [
          "pago_cliente",
          "compra_repuestos",
          "pago_mecanico",
          "gasto_operativo",
          "otro_ingreso",
          "otro_egreso",
        ],
        message: "Categoria no valida",
      },
      required: [true, "La categoria es obligatoria"],
    },
    monto: {
      type: Number,
      required: [true, "El monto es obligatorio"],
      min: [0.01, "El monto debe ser mayor a cero"],
    },
    metodo: {
      type: String,
      enum: {
        values: [
          "Efectivo",
          "Transferencia",
          "Nequi",
          "Daviplata",
          "Tarjeta",
          "Otro",
        ],
        message: "Metodo de pago no valido",
      },
      default: "Efectivo",
    },
    referencia: {
      type: String,
      default: null,
      trim: true,
    },
    descripcion: {
      type: String,
      default: null,
      trim: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    // Campos especificos de ventas de repuestos
    numeroRecibo: {
      type: String,
      default: null,
    },
    subtotal: {
      type: Number,
      default: null,
    },
    iva: {
      type: Number,
      default: null,
    },
    descuento: {
      type: Number,
      default: null,
    },
    items: {
      type: [
        {
          repuestoId: mongoose.Schema.Types.ObjectId,
          referencia: String,
          nombre: String,
          cantidad: Number,
          precioUnitario: Number,
          subtotal: Number,
        },
      ],
      default: [],
    },
    clienteInfo: {
      type: {
        cedula: String,
        nombre: String,
        email: String,
        telefono: String,
        consumidorFinal: Boolean,
      },
      default: null,
    },
    metodoPago: {
      type: String,
      default: null,
    },
    reversada: {
      type: Boolean,
      default: false,
    },
    fechaReverso: {
      type: Date,
      default: null,
    },
    motivoReverso: {
      type: String,
      default: null,
    },
    transaccionOriginalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaccion",
      default: null,
    },

    // ─── Relaciones opcionales ──────────────────
    mantenimientoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mantenimiento",
      default: null,
    },
    mecanicoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mecanico",
      default: null,
    },
    proveedorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proveedor",
      default: null,
    },

    // ─── Quien registro el movimiento ───────────
    registradoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: [true, "El usuario que registra es obligatorio"],
    },
  },
  {
    timestamps: true,
    collection: "transacciones",
    versionKey: false,
  },
);

// ─── Indices ──────────────────────────────────────
TransaccionSchema.index({ tipo: 1, fecha: -1 });
TransaccionSchema.index({ categoria: 1 });
TransaccionSchema.index({ fecha: -1 });
TransaccionSchema.index({ mecanicoId: 1, fecha: -1 });
TransaccionSchema.index({ mantenimientoId: 1 });
TransaccionSchema.index({ proveedorId: 1 });

module.exports = mongoose.model("Transaccion", TransaccionSchema);
