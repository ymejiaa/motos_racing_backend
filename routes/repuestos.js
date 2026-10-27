const express = require("express");
const { body, param } = require("express-validator");

const repuestoController = require("../controllers/repuestoController");
const validarCampos = require("../middlewares/validarCampos");
const {
  verificarAuth,
  bloquearPorCambioObligatorio,
} = require("../middlewares/auth");

const router = express.Router();

router.use(verificarAuth);
router.use(bloquearPorCambioObligatorio);

// POST
router.post(
  "/",
  [
    body("nombre")
      .trim()
      .isLength({ min: 2, max: 150 })
      .withMessage("Nombre invalido"),
    body("precioVenta")
      .isFloat({ min: 0 })
      .withMessage("Precio de venta invalido"),
    body("stock").optional().isInt({ min: 0 }).withMessage("Stock invalido"),
    body("stockMinimo")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Stock minimo invalido"),
  ],
  validarCampos,
  repuestoController.crearRepuesto,
);

// GET
router.get("/", repuestoController.listarRepuestos);
router.get("/generar-referencia", repuestoController.generarReferenciaPreview);
router.get("/ventas", repuestoController.historialVentas);

// GET :id
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  repuestoController.obtenerRepuesto,
);

// PUT :id
router.put(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  repuestoController.actualizarRepuesto,
);

// POST ajustar stock
router.post(
  "/:id/ajustar-stock",
  [
    param("id").isMongoId().withMessage("ID invalido"),
    body("cantidad").isInt().withMessage("Cantidad invalida"),
  ],
  validarCampos,
  repuestoController.ajustarStock,
);

// POST vender
router.post(
  "/:id/vender",
  [
    param("id").isMongoId().withMessage("ID invalido"),
    body("cantidad").isInt({ min: 1 }).withMessage("Cantidad invalida"),
    body("montoRecibido")
      .isFloat({ min: 0 })
      .withMessage("Monto recibido invalido"),
  ],
  validarCampos,
  repuestoController.venderRepuesto,
);

// DELETE :id
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  repuestoController.eliminarRepuesto,
);

// POST reversar venta
router.post(
  "/ventas/:id/reverso",
  [
    param("id").isMongoId().withMessage("ID invalido"),
    body("motivo").optional().isString(),
  ],
  validarCampos,
  repuestoController.reversarVenta,
);

module.exports = router;
