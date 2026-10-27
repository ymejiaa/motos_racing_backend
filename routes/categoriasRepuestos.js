const express = require("express");
const { body, param } = require("express-validator");

const categoriaRepuestoController = require("../controllers/categoriaRepuestoController");
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
  categoriaRepuestoController.crearCategoria,
);

router.get("/", categoriaRepuestoController.listarCategorias);

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  categoriaRepuestoController.obtenerCategoria,
);

router.put(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  categoriaRepuestoController.actualizarCategoria,
);

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("ID invalido")],
  validarCampos,
  categoriaRepuestoController.eliminarCategoria,
);

module.exports = router;
