const mongoose = require("mongoose");

const ServicioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del servicio es obligatorio"],
      unique: true,
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [100, "El nombre no puede superar los 100 caracteres"],
    },
    descripcion: {
      type: String,
      default: null,
      trim: true,
    },
    precioBase: {
      type: Number,
      required: [true, "El precio base es obligatorio"],
      min: [0, "El precio no puede ser negativo"],
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "servicios",
    versionKey: false,
  },
);

ServicioSchema.index({ activo: 1 });

module.exports = mongoose.model("Servicio", ServicioSchema);
