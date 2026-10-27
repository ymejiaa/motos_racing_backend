const express = require("express");

const dashboardController = require("../controllers/dashboardController");
const {
  verificarAuth,
  bloquearPorCambioObligatorio,
} = require("../middlewares/auth");

const router = express.Router();

router.use(verificarAuth);
router.use(bloquearPorCambioObligatorio);

router.get("/", dashboardController.obtenerEstadisticas);
router.get(
  "/mantenimientos-por-estado",
  dashboardController.mantenimientosPorEstado,
);
router.get("/ingresos-por-mes", dashboardController.ingresosPorMes);
router.get("/ranking-mecanicos", dashboardController.rankingMecanicos);
router.get("/notificaciones", dashboardController.obtenerNotificaciones);

module.exports = router;
