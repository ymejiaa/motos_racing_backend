require("dotenv").config();
const mongoose = require("mongoose");
const conectarDB = require("../config/db");

const Usuario = require("../models/Usuario");
const Mecanico = require("../models/Mecanico");
const Cliente = require("../models/Cliente");
const Moto = require("../models/Moto");
const Servicio = require("../models/Servicio");
const Repuesto = require("../models/Repuesto");
const Proveedor = require("../models/Proveedor");
const Mantenimiento = require("../models/Mantenimiento");
const Transaccion = require("../models/Transaccion");

(async () => {
  await conectarDB();

  console.log("\n── Modelos cargados correctamente ──");
  const modelos = [
    Usuario,
    Mecanico,
    Cliente,
    Moto,
    Servicio,
    Repuesto,
    Proveedor,
    Mantenimiento,
    Transaccion,
  ];

  modelos.forEach((m) => {
    console.log(" -", m.modelName, "->", m.collection.name);
  });

  // Prueba 1: comision del mecanico calculada automaticamente
  console.log("\n[Prueba 1] Comision del mecanico (30% de mano de obra)");
  const mant = new Mantenimiento({
    motoId: new mongoose.Types.ObjectId(),
    mecanicoId: new mongoose.Types.ObjectId(),
    registradoPor: new mongoose.Types.ObjectId(),
    kilometraje: 15000,
    serviciosRealizados: [
      {
        servicioId: new mongoose.Types.ObjectId(),
        nombre: "Cambio de aceite",
        precio: 50000,
      },
      {
        servicioId: new mongoose.Types.ObjectId(),
        nombre: "Sincronizacion",
        precio: 40000,
      },
    ],
    repuestosUtilizados: [
      {
        repuestoId: new mongoose.Types.ObjectId(),
        nombre: "Aceite 20W50",
        cantidad: 1,
        precioUnitario: 30000,
        subtotal: 30000,
      },
    ],
  });

  await mant.validate();

  console.log(
    " subtotalServicios:",
    mant.subtotalServicios,
    "(esperado 90000)",
  );
  console.log(
    " subtotalRepuestos:",
    mant.subtotalRepuestos,
    "(esperado 30000)",
  );
  console.log(" costoTotal       :", mant.costoTotal, "(esperado 120000)");
  console.log(" pagoMecanico     :", mant.pagoMecanico, "(esperado 27000)");
  console.log(" estadoPago       :", mant.estadoPago, "(esperado Pendiente)");

  const okComision = mant.pagoMecanico === 27000;
  console.log(" Resultado        :", okComision ? "OK" : "FALLO");

  // Prueba 2: cambio de estado con auditoria
  console.log("\n[Prueba 2] Cambio de estado con auditoria");
  const usuarioId = new mongoose.Types.ObjectId();
  mant.cambiarEstado("En Reparacion", usuarioId, "Se inicia el trabajo");
  mant.cambiarEstado("Entregado", usuarioId, "Cliente satisfecho");

  console.log(" Estado actual    :", mant.estado);
  console.log(
    " Historial        :",
    mant.historialEstados.length,
    "entradas (esperado 2)",
  );
  console.log(
    " Fecha entrega    :",
    mant.fechaEntrega ? "asignada" : "no asignada",
  );
  const okAuditoria =
    mant.historialEstados.length === 2 && mant.fechaEntrega !== null;
  console.log(" Resultado        :", okAuditoria ? "OK" : "FALLO");

  // Prueba 3: validacion de categoria en Transaccion
  console.log("\n[Prueba 3] Validacion de categoria en Transaccion");
  const trans = new Transaccion({
    tipo: "ingreso",
    categoria: "categoria_invalida",
    monto: 50000,
    registradoPor: new mongoose.Types.ObjectId(),
  });
  try {
    await trans.validate();
    console.log(" FALLO -> acepto la categoria invalida");
  } catch (error) {
    console.log(" OK ->", error.errors.categoria.message);
  }

  // Prueba 4: validacion de monto cero en Transaccion
  console.log("\n[Prueba 4] Validacion de monto cero");
  const trans2 = new Transaccion({
    tipo: "egreso",
    categoria: "gasto_operativo",
    monto: 0,
    registradoPor: new mongoose.Types.ObjectId(),
  });
  try {
    await trans2.validate();
    console.log(" FALLO -> acepto el monto cero");
  } catch (error) {
    console.log(" OK ->", error.errors.monto.message);
  }

  console.log("\nTodo listo. Cerrando conexion...");
  await mongoose.connection.close();
  process.exit(0);
})().catch(async (error) => {
  console.error("\nError en el script:", error.message);
  await mongoose.connection.close();
  process.exit(1);
});
