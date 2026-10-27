const express = require("express");
const { body, param } = require("express-validator");

const mecanicoController = require("../controllers/mecanicoController");
const validarCampos = require("../middlewares/validarCampos");
const {
  verificarAuth,
  bloquearPorCambioObligatorio,
} = require("../middlewares/auth");

const router = express.Router();

router.use(verificarAuth);
router.use(bloquearPorCambioObligatorio);

router.post(
  "/",
  [
    body("nombre")
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Nombre invalido"),
    body("email").isEmail().withMessage("Correo invalido").normalizeEmail(),
    body("cedula")
      .trim()
      .matches(/^\d{10}$/)
      .withMessage("La cedula debe tener exactamente 10 digitos numericos"),
    body("telefono")
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\d{10}$/)
      .withMessage("El telefono debe tener exactamente 10 digitos numericos"),
  ],
  validarCampos,
  mecanicoController.crearMecanico,
);

router.get("/", mecanicoController.listarMecanicos);

router.get("/pagos-resumen", mecanicoController.resumenPagosMecanicos);

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  mecanicoController.obtenerMecanico,
);

router.get(
  "/:id/trabajos-pendientes",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  mecanicoController.trabajosPendientes,
);

router.get(
  "/:id/estadisticas",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  mecanicoController.estadisticasMecanico,
);

router.post(
  "/:id/pagar",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  mecanicoController.pagarMecanico,
);

router.put(
  "/:id",
  [
    param("id").isMongoId().withMessage("ID invalido"),
    body("nombre")
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Nombre invalido"),
    body("email")
      .optional()
      .isEmail()
      .withMessage("Correo invalido")
      .normalizeEmail(),
    body("cedula")
      .optional()
      .trim()
      .matches(/^\d{10}$/)
      .withMessage("La cedula debe tener exactamente 10 digitos numericos"),
    body("telefono")
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\d{10}$/)
      .withMessage("El telefono debe tener exactamente 10 digitos numericos"),
  ],
  validarCampos,
  mecanicoController.actualizarMecanico,
);

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  mecanicoController.eliminarMecanico,
);

router.patch(
  "/:id/toggle-activo",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  mecanicoController.toggleActivoMecanico,
);

module.exports = router;
