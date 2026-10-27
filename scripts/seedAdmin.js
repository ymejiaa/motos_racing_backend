require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");

const conectarDB = require("../config/db");
const Usuario = require("../models/Usuario");
const generarPassword = require("../utils/generarPassword");
const {
  enviarCorreo,
  plantillaPasswordTemporal,
} = require("../utils/enviarCorreo");

const preguntar = (pregunta) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      rl.close();
      resolve(respuesta.trim());
    });
  });
};

const enviarOImprimir = async (email, nombre, passwordTemporal) => {
  const tieneConfigCorreo =
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    !process.env.EMAIL_USER.includes("tu_correo") &&
    !process.env.EMAIL_PASS.includes("tu_app_password");

  if (!tieneConfigCorreo) {
    console.log("\nCorreo no configurado en .env.");
    console.log("Contrasena temporal generada:");
    console.log(`   ${passwordTemporal}\n`);
    console.log(
      "Guarda esta contrasena. El admin debera cambiarla al iniciar sesion.\n",
    );
    return;
  }

  console.log("\nEnviando correo con la contrasena temporal...");

  try {
    await enviarCorreo({
      para: email,
      asunto: "Acceso al sistema - Motos Racing Quibdo",
      html: plantillaPasswordTemporal(nombre, passwordTemporal),
    });
    console.log(`Correo enviado a ${email}\n`);
  } catch (error) {
    console.log("\nNo se pudo enviar el correo:", error.message);
    console.log("Contrasena temporal generada:");
    console.log(`   ${passwordTemporal}\n`);
    console.log(
      "Guarda esta contrasena. El admin debera cambiarla al iniciar sesion.\n",
    );
  }
};

const crearAdmin = async () => {
  await conectarDB();

  console.log("\n── Crear nuevo administrador ──\n");

  const nombre = await preguntar("Nombre completo: ");
  const email = await preguntar("Correo electronico: ").then((e) =>
    e.toLowerCase(),
  );

  if (!nombre || !email) {
    console.log("\nNombre y correo son obligatorios.\n");
    await mongoose.connection.close();
    process.exit(1);
  }

  const existente = await Usuario.findOne({ email });

  if (existente) {
    console.log(`\nYa existe un usuario con el correo ${email}\n`);

    const respuesta = await preguntar(
      "Deseas reenviar una contrasena temporal? (s/n): ",
    );
    if (respuesta.toLowerCase() !== "s") {
      await mongoose.connection.close();
      process.exit(0);
    }

    const passwordTemporal = generarPassword(14);
    existente.password = passwordTemporal;
    existente.debeCambiarPassword = true;
    existente.intentosFallidos = 0;
    existente.bloqueadoHasta = null;
    await existente.save();

    await enviarOImprimir(email, existente.nombre, passwordTemporal);

    await mongoose.connection.close();
    process.exit(0);
  }

  const passwordTemporal = generarPassword(14);

  const nuevoAdmin = new Usuario({
    nombre,
    email,
    password: passwordTemporal,
    rol: "admin",
    activo: true,
    debeCambiarPassword: true,
  });

  await nuevoAdmin.save();

  console.log("\nAdmin creado correctamente en la base de datos.");

  await enviarOImprimir(email, nombre, passwordTemporal);

  await mongoose.connection.close();
  process.exit(0);
};

crearAdmin().catch(async (error) => {
  console.error("\nError al crear admin:", error.message);
  await mongoose.connection.close();
  process.exit(1);
});
