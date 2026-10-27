const express = require("express");
const { body, param } = require("express-validator");

const clienteController = require("../controllers/clienteController");
const validarCampos = require("../middlewares/validarCampos");
const {
  verificarAuth,
  bloquearPorCambioObligatorio,
} = require("../middlewares/auth");

const router = express.Router();

router.use(verificarAuth);
router.use(bloquearPorCambioObligatorio);

// ─── POST /rapido (antes de /:id) ─────────────────
router.post(
  "/rapido",
  [
    body("nombre")
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Nombre invalido"),
    body("telefono")
      .trim()
      .isLength({ min: 7, max: 20 })
      .withMessage("Telefono invalido"),
    body("placa")
      .trim()
      .isLength({ min: 5, max: 8 })
      .withMessage("Placa invalida"),
    body("marca").trim().notEmpty().withMessage("Marca obligatoria"),
    body("modelo").trim().notEmpty().withMessage("Modelo obligatorio"),
  ],
  validarCampos,
  clienteController.crearClienteYMotoRapido,
);

// ─── POST / ───────────────────────────────────────
router.post(
  "/",
  [
    body("nombre")
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Nombre invalido"),
    body("telefono")
      .trim()
      .isLength({ min: 7, max: 20 })
      .withMessage("Telefono invalido"),
  ],
  validarCampos,
  clienteController.crearCliente,
);

// ─── GET / ────────────────────────────────────────
router.get("/", clienteController.listarClientes);

// ─── GET /:id ─────────────────────────────────────
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  clienteController.obtenerCliente,
);

// ─── PUT /:id ─────────────────────────────────────
router.put(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  clienteController.actualizarCliente,
);

// ─── DELETE /:id ──────────────────────────────────
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  clienteController.eliminarCliente,
);

module.exports = router;
