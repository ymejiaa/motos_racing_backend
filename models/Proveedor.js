const mongoose = require("mongoose");

const ProveedorSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del proveedor es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [150, "El nombre no puede superar los 150 caracteres"],
    },
    nit: {
      type: String,
      default: null,
      trim: true,
    },
    telefono: {
      type: String,
      required: [true, "El telefono es obligatorio"],
      trim: true,
      minlength: [7, "El telefono debe tener al menos 7 caracteres"],
      maxlength: [20, "El telefono no puede superar los 20 caracteres"],
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "El correo no tiene un formato valido",
      ],
    },
    direccion: {
      type: String,
      default: null,
      trim: true,
    },
    contacto: {
      type: String,
      default: null,
      trim: true,
    },
    productosQueProvee: {
      type: String,
      default: null,
      trim: true,
    },
    notas: {
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
    collection: "proveedores",
    versionKey: false,
  },
);

ProveedorSchema.index({ nit: 1 }, { sparse: true });
ProveedorSchema.index({ activo: 1 });
ProveedorSchema.index({ nombre: "text" });

module.exports = mongoose.model("Proveedor", ProveedorSchema);
