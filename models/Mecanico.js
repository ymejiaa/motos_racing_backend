const mongoose = require("mongoose");

const MecanicoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [100, "El nombre no puede superar los 100 caracteres"],
    },
    email: {
      type: String,
      required: [true, "El correo es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "El correo no tiene un formato valido",
      ],
    },
    cedula: {
      type: String,
      required: [true, "La cedula es obligatoria"],
      unique: true,
      trim: true,
      minlength: [5, "La cedula debe tener al menos 5 caracteres"],
      maxlength: [15, "La cedula no puede superar los 15 caracteres"],
    },
    telefono: {
      type: String,
      default: null,
      trim: true,
    },
    direccion: {
      type: String,
      default: null,
      trim: true,
    },
    especialidad: {
      type: String,
      default: null,
      trim: true,
    },
    fechaIngreso: {
      type: Date,
      default: null,
    },
    activo: {
      type: Boolean,
      default: true,
    },
    notas: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "mecanicos",
    versionKey: false,
  },
);

MecanicoSchema.index({ nombre: "text" });

module.exports = mongoose.model("Mecanico", MecanicoSchema);
