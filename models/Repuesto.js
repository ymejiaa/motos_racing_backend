const mongoose = require("mongoose");

const RepuestoSchema = new mongoose.Schema(
  {
    // Referencia auto-generada: MTR + 4 digitos (ej: MTR4739)
    referencia: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^MTR\d{4}$/, "La referencia debe tener el formato MTR0000"],
    },
    nombre: {
      type: String,
      required: [true, "El nombre del repuesto es obligatorio"],
      trim: true,
      minlength: [2, "El nombre debe tener al menos 2 caracteres"],
      maxlength: [150, "El nombre no puede superar los 150 caracteres"],
    },
    descripcion: {
      type: String,
      default: null,
      trim: true,
    },
    // Con que motos es compatible (texto libre)
    compatibilidad: {
      type: String,
      default: null,
      trim: true,
    },
    // Relaciones
    marcaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarcaRepuesto",
      default: null,
    },
    categoriaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoriaRepuesto",
      default: null,
    },
    proveedorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proveedor",
      default: null,
    },
    // Stock
    stock: {
      type: Number,
      required: [true, "El stock es obligatorio"],
      min: [0, "El stock no puede ser negativo"],
      default: 0,
    },
    stockMinimo: {
      type: Number,
      default: 20,
      min: [0, "El stock minimo no puede ser negativo"],
    },
    // Precios
    precioCompra: {
      type: Number,
      default: 0,
      min: [0, "El precio de compra no puede ser negativo"],
    },
    precioVenta: {
      type: Number,
      required: [true, "El precio de venta es obligatorio"],
      min: [0, "El precio de venta no puede ser negativo"],
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "repuestos",
    versionKey: false,
  },
);

// ─── Indices ──────────────────────────────────────
RepuestoSchema.index({ stock: 1 });
RepuestoSchema.index({ marcaId: 1 });
RepuestoSchema.index({ categoriaId: 1 });
RepuestoSchema.index({ proveedorId: 1 });
RepuestoSchema.index({ activo: 1 });
RepuestoSchema.index({ nombre: "text" });

// ─── Virtual: margen de ganancia ──────────────────
RepuestoSchema.virtual("margen").get(function () {
  return (this.precioVenta || 0) - (this.precioCompra || 0);
});

RepuestoSchema.virtual("porcentajeMargen").get(function () {
  if (!this.precioVenta || this.precioVenta === 0) return 0;
  const margen = this.precioVenta - (this.precioCompra || 0);
  return +((margen / this.precioVenta) * 100).toFixed(2);
});

// Incluir virtuales en toJSON
RepuestoSchema.set("toJSON", { virtuals: true });
RepuestoSchema.set("toObject", { virtuals: true });
// ─── Virtual: es reversible (no electrico ni lubricacion) ───
RepuestoSchema.virtual("esReversible").get(function () {
  // Se calcula segun la categoria. Si no hay categoria, se asume reversible.
  // Esta funcion se llama desde el controlador cuando hay populate.
  return true; // Se redefine en el controlador segun categoria
});

module.exports = mongoose.model("Repuesto", RepuestoSchema);
