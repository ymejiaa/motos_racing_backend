const mongoose = require("mongoose");

const conectarDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    console.log(`📦 Base de datos: ${conn.connection.name}`);

    mongoose.connection.on("error", (err) => {
      console.error("❌ Error de MongoDB:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB desconectado");
    });
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = conectarDB;
