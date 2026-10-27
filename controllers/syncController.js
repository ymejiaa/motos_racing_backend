const Configuracion = require("../models/Configuracion");
const Cliente = require("../models/Cliente");
const Moto = require("../models/Moto");
const Mecanico = require("../models/Mecanico");
const Servicio = require("../models/Servicio");
const Repuesto = require("../models/Repuesto");
const MarcaRepuesto = require("../models/MarcaRepuesto");
const CategoriaRepuesto = require("../models/CategoriaRepuesto");
const Proveedor = require("../models/Proveedor");
const Usuario = require("../models/Usuario");

// ─── Obtener todos los datos maestros para sync offline ───
const obtenerTodo = async (req, res, next) => {
  try {
    const [
      configuracion,
      clientes,
      motos,
      mecanicos,
      servicios,
      repuestos,
      marcas,
      categorias,
      proveedores,
    ] = await Promise.all([
      Configuracion.find().lean(),
      Cliente.find().lean(),
      Moto.find().populate("clienteId", "nombre telefono").lean(),
      Mecanico.find().lean(),
      Servicio.find().lean(),
      Repuesto.find()
        .populate("marcaId", "nombre")
        .populate("categoriaId", "nombre")
        .populate("proveedorId", "nombre")
        .lean(),
      MarcaRepuesto.find().lean(),
      CategoriaRepuesto.find().lean(),
      Proveedor.find().lean(),
    ]);

    const configObj = {
      iva: 0.19,
      descuento: 0.05,
      nombreTaller: "Motos Racing Quibdo",
      nitTaller: "",
      direccionTaller: "",
      telefonoTaller: "",
    };
    configuracion.forEach((c) => {
      configObj[c.clave] = c.valor;
    });

    return res.json({
      timestamp: new Date().toISOString(),
      configuracion: configObj,
      clientes,
      motos,
      mecanicos,
      servicios,
      repuestos,
      marcas,
      categorias,
      proveedores,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Obtener usuario autenticado (con hash para login offline) ───
const obtenerUsuarioParaOffline = async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id).select(
      "+password +sessionId",
    );

    if (!usuario) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    return res.json({
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        password: usuario.password,
        rol: usuario.rol,
        activo: usuario.activo,
        debeCambiarPassword: usuario.debeCambiarPassword,
        ultimoAcceso: usuario.ultimoAcceso,
        sessionId: usuario.sessionId,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerTodo,
  obtenerUsuarioParaOffline,
};
