const express = require("express");

const syncController = require("../controllers/syncController");
const {
  verificarAuth,
  bloquearPorCambioObligatorio,
} = require("../middlewares/auth");

const router = express.Router();

router.use(verificarAuth);
router.use(bloquearPorCambioObligatorio);

// GET /api/sync/todo
router.get("/todo", syncController.obtenerTodo);

// GET /api/sync/usuario
router.get("/usuario", syncController.obtenerUsuarioParaOffline);

module.exports = router;
