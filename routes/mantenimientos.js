const express = require("express");
const { body, param } = require("express-validator");

const mantenimientoController = require("../controllers/mantenimientoController");
const validarCampos = require("../middlewares/validarCampos");
const {
  verificarAuth,
  bloquearPorCambioObligatorio,
} = require("../middlewares/auth");
const upload = require("../middlewares/upload");

const router = express.Router();

router.use(verificarAuth);
router.use(bloquearPorCambioObligatorio);

router.post(
  "/",
  upload.array("imagenes", 10),
  [
    body("motoId").isMongoId().withMessage("Moto invalida"),
    body("mecanicoId").isMongoId().withMessage("Mecanico invalido"),
    body("kilometraje").isFloat({ min: 0 }).withMessage("Kilometraje invalido"),
  ],
  validarCampos,
  mantenimientoController.crearMantenimiento,
);

router.get("/", mantenimientoController.listarMantenimientos);

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  mantenimientoController.obtenerMantenimiento,
);

router.put(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  mantenimientoController.actualizarMantenimiento,
);

router.patch(
  "/:id/estado",
  [
    param("id").isMongoId().withMessage("ID invalido"),
    body("estado").notEmpty().withMessage("El estado es obligatorio"),
  ],
  validarCampos,
  mantenimientoController.cambiarEstado,
);

router.post(
  "/:id/imagenes",
  upload.array("imagenes", 10),
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  mantenimientoController.subirImagenes,
);

router.put(
  "/:id/completo",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  mantenimientoController.actualizarMantenimientoCompleto,
);

router.delete(
  "/:id/imagenes/:index",
  [
    param("id").isMongoId().withMessage("ID invalido"),
    param("index").isInt({ min: 0 }).withMessage("Indice invalido"),
  ],
  validarCampos,
  mantenimientoController.eliminarImagen,
);

router.post(
  "/:id/anticipo",
  [
    param("id").isMongoId().withMessage("ID invalido"),
    body("monto").isFloat({ gt: 0 }).withMessage("Monto invalido"),
  ],
  validarCampos,
  mantenimientoController.registrarAnticipo,
);

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  mantenimientoController.eliminarMantenimiento,
);

module.exports = router;
