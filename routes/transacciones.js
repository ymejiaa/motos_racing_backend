const express = require("express");
const { body, param } = require("express-validator");

const transaccionController = require("../controllers/transaccionController");
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
    body("tipo").isIn(["ingreso", "egreso"]).withMessage("Tipo invalido"),
    body("categoria").notEmpty().withMessage("La categoria es obligatoria"),
    body("monto").isFloat({ gt: 0 }).withMessage("Monto invalido"),
  ],
  validarCampos,
  transaccionController.crearTransaccion,
);

router.get("/", transaccionController.listarTransacciones);
router.get("/resumen", transaccionController.resumenFinanciero);

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  transaccionController.obtenerTransaccion,
);

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  transaccionController.eliminarTransaccion,
);

module.exports = router;
