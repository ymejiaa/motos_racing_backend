const mongoose = require("mongoose");

const ServicioDiarioSchema = new mongoose.Schema(
  {
    servicioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Servicio",
      required: [true, "El servicio es obligatorio"],
    },
    nombreServicio: {
      type: String,
      required: true,
      trim: true,
    },
    precioServicio: {
      type: Number,
      required: true,
      min: 0,
    },
    mecanicoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mecanico",
      required: [true, "El mecanico es obligatorio"],
    },
    nombreMecanico: {
      type: String,
      required: true,
      trim: true,
    },
    cedulaMecanico: {
      type: String,
      default: null,
      trim: true,
    },
    montoRecibido: {
      type: Number,
      required: true,
      min: 0,
    },
    cambio: {
      type: Number,
      default: 0,
      min: 0,
    },
    comisionMecanico: {
      type: Number,
      required: true,
      min: 0,
    },
    comisionTaller: {
      type: Number,
      required: true,
      min: 0,
    },
    porcentajeComision: {
      type: Number,
      default: 0.3,
      min: 0,
      max: 1,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    registradoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    pagadoAlMecanico: {
      type: Boolean,
      default: false,
    },
    fechaPagoMecanico: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "servicios_diarios",
    versionKey: false,
  },
);

// ─── Indices ──────────────────────────────────────
ServicioDiarioSchema.index({ mecanicoId: 1, fecha: -1 });
ServicioDiarioSchema.index({ fecha: -1 });
ServicioDiarioSchema.index({ pagadoAlMecanico: 1 });
ServicioDiarioSchema.index({ servicioId: 1 });

// ─── Hook: calcular cambio y comisiones ───────────
ServicioDiarioSchema.pre("validate", function () {
  if (this.montoRecibido !== undefined && this.precioServicio !== undefined) {
    this.cambio = Math.max(this.montoRecibido - this.precioServicio, 0);
  }

  if (
    this.precioServicio !== undefined &&
    this.porcentajeComision !== undefined
  ) {
    this.comisionMecanico = +(
      this.precioServicio * this.porcentajeComision
    ).toFixed(2);
    this.comisionTaller = +(
      this.precioServicio - this.comisionMecanico
    ).toFixed(2);
  }
});

module.exports = mongoose.model("ServicioDiario", ServicioDiarioSchema);
