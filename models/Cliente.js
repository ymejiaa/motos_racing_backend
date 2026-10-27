const mongoose = require("mongoose");
const { encriptar, desencriptar, hashBusqueda } = require("../utils/crypto");

const ClienteSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [100, "El nombre no puede superar los 100 caracteres"],
    },
    telefono: {
      type: String,
      required: [true, "El telefono es obligatorio"],
      trim: true,
    },
    telefonoHash: {
      type: String,
      default: null,
      index: true,
      select: false,
    },
    notas: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "clientes",
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── Hook: encriptar al guardar ───────────────────
ClienteSchema.pre("save", function () {
  if (
    this.isModified("telefono") &&
    this.telefono &&
    !this.telefono.includes(":")
  ) {
    this.telefonoHash = hashBusqueda(this.telefono);
    this.telefono = encriptar(this.telefono);
  }
});

// ─── Metodo: desencriptar campos ──────────────────
ClienteSchema.methods.desencriptarCampos = function () {
  const obj = this.toObject({ virtuals: false });
  obj.telefono = desencriptar(obj.telefono);
  delete obj.telefonoHash;
  return obj;
};

ClienteSchema.methods.toJSON = function () {
  return this.desencriptarCampos();
};

ClienteSchema.index({ nombre: "text" });

module.exports = mongoose.model("Cliente", ClienteSchema);
