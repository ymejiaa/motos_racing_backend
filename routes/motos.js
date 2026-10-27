const express = require("express");
const { body, param } = require("express-validator");

const motoController = require("../controllers/motoController");
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
    body("placa")
      .trim()
      .isLength({ min: 5, max: 8 })
      .withMessage("La placa debe tener entre 5 y 8 caracteres"),
    body("marca").trim().notEmpty().withMessage("La marca es obligatoria"),
    body("modelo").trim().notEmpty().withMessage("El modelo es obligatorio"),
    body("clienteId").isMongoId().withMessage("Cliente invalido"),
    body("anio")
      .optional({ checkFalsy: true })
      .isInt({ min: 1950, max: 2100 })
      .withMessage("Anio invalido"),
  ],
  validarCampos,
  motoController.crearMoto,
);

router.get("/marcas", motoController.listarMarcas);

router.get("/", motoController.listarMotos);

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  motoController.obtenerMoto,
);

router.get(
  "/:id/historial",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  motoController.historialMoto,
);

router.put(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  motoController.actualizarMoto,
);

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  motoController.eliminarMoto,
);

module.exports = router;
