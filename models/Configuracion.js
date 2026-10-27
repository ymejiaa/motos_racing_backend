const mongoose = require("mongoose");

const ConfiguracionSchema = new mongoose.Schema(
  {
    clave: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    valor: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    descripcion: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "configuracion",
    versionKey: false,
  },
);

module.exports = mongoose.model("Configuracion", ConfiguracionSchema);
