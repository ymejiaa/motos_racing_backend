const express = require("express");
const { body, param } = require("express-validator");

const servicioDiarioController = require("../controllers/servicioDiarioController");
const validarCampos = require("../middlewares/validarCampos");
const {
  verificarAuth,
  bloquearPorCambioObligatorio,
} = require("../middlewares/auth");

const router = express.Router();

router.use(verificarAuth);
router.use(bloquearPorCambioObligatorio);

// ─── POST /api/servicios-diarios ──────────────────
router.post(
  "/",
  [
    body("servicioId").isMongoId().withMessage("Servicio invalido"),
    body("mecanicoId").isMongoId().withMessage("Mecanico invalido"),
    body("montoRecibido")
      .isFloat({ min: 0 })
      .withMessage("Monto recibido invalido"),
    body("fecha").optional().isISO8601().withMessage("Fecha invalida"),
  ],
  validarCampos,
  servicioDiarioController.crearServicioDiario,
);

// ─── GET /api/servicios-diarios ───────────────────
router.get("/", servicioDiarioController.listarServiciosDiarios);

// ─── GET /api/servicios-diarios/:id ───────────────
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  servicioDiarioController.obtenerServicioDiario,
);

// ─── DELETE /api/servicios-diarios/:id ────────────
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  servicioDiarioController.eliminarServicioDiario,
);

module.exports = router;
