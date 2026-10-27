const express = require("express");
const { body, param } = require("express-validator");

const marcaRepuestoController = require("../controllers/marcaRepuestoController");
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
      .isLength({ min: 2, max: 50 })
      .withMessage("El nombre debe tener entre 2 y 50 caracteres"),
  ],
  validarCampos,
  marcaRepuestoController.crearMarca,
);

router.get("/", marcaRepuestoController.listarMarcas);

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  marcaRepuestoController.obtenerMarca,
);

router.put(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  marcaRepuestoController.actualizarMarca,
);

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  marcaRepuestoController.eliminarMarca,
);

module.exports = router;
