const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UsuarioSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      default: null,
      select: false,
    },
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
    password: {
      type: String,
      required: [true, "La contrasena es obligatoria"],
      minlength: [
        60,
        "La contrasena debe estar hasheada (minimo 60 caracteres)",
      ],
      select: false,
    },
    telefono: {
      type: String,
      default: null,
      trim: true,
    },
    rol: {
      type: String,
      enum: {
        values: ["admin"],
        message: "Rol no valido. Solo se permite admin",
      },
      default: "admin",
    },
    activo: {
      type: Boolean,
      default: true,
    },
    resetPasswordCode: {
      type: String,
      default: null,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
    },
    debeCambiarPassword: {
      type: Boolean,
      default: false,
    },
    intentosFallidos: {
      type: Number,
      default: 0,
    },
    bloqueadoHasta: {
      type: Date,
      default: null,
    },
    bloqueadoPermanente: {
      type: Boolean,
      default: false,
    },
    bloqueosTemporalesRealizados: {
      type: Number,
      default: 0,
    },
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },
    ultimoAcceso: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "usuarios",
    versionKey: false,
  },
);

// ─── Hook: hashear contrasena antes de validar ────
UsuarioSchema.pre("validate", async function () {
  if (!this.isModified("password")) return;

  // Si ya es un hash bcrypt valido, no re-hashear
  if (/^\$2[aby]\$\d{2}\$.{53}$/.test(this.password)) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ─── Metodo: comparar contrasena ──────────────────
UsuarioSchema.methods.compararPassword = async function (passwordPlano) {
  return await bcrypt.compare(passwordPlano, this.password);
};

// ─── Ocultar campos sensibles al serializar ───────
UsuarioSchema.methods.toJSON = function () {
  const usuario = this.toObject();
  delete usuario.password;
  delete usuario.resetPasswordCode;
  delete usuario.resetPasswordExpires;
  return usuario;
};

module.exports = mongoose.model("Usuario", UsuarioSchema);
