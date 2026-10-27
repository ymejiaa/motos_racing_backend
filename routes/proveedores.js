const express = require("express");
const { body, param } = require("express-validator");

const proveedorController = require("../controllers/proveedorController");
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
      .isLength({ min: 3, max: 150 })
      .withMessage("Nombre invalido"),
    body("telefono")
      .trim()
      .isLength({ min: 7, max: 20 })
      .withMessage("Telefono invalido"),
    body("email")
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage("Correo invalido"),
  ],
  validarCampos,
  proveedorController.crearProveedor,
);

router.get("/", proveedorController.listarProveedores);

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  proveedorController.obtenerProveedor,
);

router.put(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  proveedorController.actualizarProveedor,
);

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  proveedorController.eliminarProveedor,
);

module.exports = router;
