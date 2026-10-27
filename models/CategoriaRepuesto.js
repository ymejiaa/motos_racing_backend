const mongoose = require("mongoose");

const CategoriaRepuestoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre de la categoria es obligatorio"],
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
    collection: "categorias_repuestos",
    versionKey: false,
  },
);

CategoriaRepuestoSchema.index({ activo: 1 });
CategoriaRepuestoSchema.index({ nombre: "text" });

module.exports = mongoose.model("CategoriaRepuesto", CategoriaRepuestoSchema);
