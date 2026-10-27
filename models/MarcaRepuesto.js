const mongoose = require("mongoose");

const MarcaRepuestoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre de la marca es obligatorio"],
      unique: true,
      trim: true,
      minlength: [2, "El nombre debe tener al menos 2 caracteres"],
      maxlength: [50, "El nombre no puede superar los 50 caracteres"],
    },
    descripcion: {
      type: String,
      default: null,
      trim: true,
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "marcas_repuestos",
    versionKey: false,
  },
);

MarcaRepuestoSchema.index({ activo: 1 });
MarcaRepuestoSchema.index({ nombre: "text" });

module.exports = mongoose.model("MarcaRepuesto", MarcaRepuestoSchema);
