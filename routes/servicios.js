const express = require("express");
const { body, param } = require("express-validator");

const servicioController = require("../controllers/servicioController");
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
    body("precioBase")
      .isFloat({ min: 0 })
      .withMessage("El precio debe ser mayor o igual a 0"),
  ],
  validarCampos,
  servicioController.crearServicio,
);

router.get("/", servicioController.listarServicios);

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  servicioController.obtenerServicio,
);

router.put(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  servicioController.actualizarServicio,
);

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  servicioController.eliminarServicio,
);

module.exports = router;
