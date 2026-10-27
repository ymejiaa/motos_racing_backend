const express = require("express");
const { body } = require("express-validator");

const configuracionController = require("../controllers/configuracionController");
const validarCampos = require("../middlewares/validarCampos");
const {
  verificarAuth,
  bloquearPorCambioObligatorio,
  soloAdmin,
} = require("../middlewares/auth");

const router = express.Router();

router.use(verificarAuth);
router.use(bloquearPorCambioObligatorio);

// GET /api/configuracion
router.get("/", configuracionController.obtenerConfiguracion);

// PUT /api/configuracion
router.put("/", configuracionController.actualizarConfiguracion);

module.exports = router;
