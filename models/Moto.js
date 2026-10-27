const mongoose = require("mongoose");

const MotoSchema = new mongoose.Schema(
  {
    placa: {
      type: String,
      required: [true, "La placa es obligatoria"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [5, "La placa debe tener al menos 5 caracteres"],
      maxlength: [8, "La placa no puede superar los 8 caracteres"],
    },
    marca: {
      type: String,
      required: [true, "La marca es obligatoria"],
      trim: true,
    },
    modelo: {
      type: String,
      required: [true, "El modelo es obligatorio"],
      trim: true,
    },
    clienteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
      required: [true, "El cliente es obligatorio"],
    },
  },
  {
    timestamps: true,
    collection: "motos",
    versionKey: false,
  },
);

MotoSchema.index({ clienteId: 1 });

module.exports = mongoose.model("Moto", MotoSchema);
