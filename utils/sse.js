const conexionesPorUsuario = new Map();

const agregarConexion = (userId, res) => {
  if (!conexionesPorUsuario.has(userId)) {
    conexionesPorUsuario.set(userId, new Set());
  }
  conexionesPorUsuario.get(userId).add(res);
};

const eliminarConexion = (userId, res) => {
  const set = conexionesPorUsuario.get(userId);
  if (set) {
    set.delete(res);
    if (set.size === 0) conexionesPorUsuario.delete(userId);
  }
};

const notificarSesionInvalidada = (userId, motivo) => {
  const conexiones = conexionesPorUsuario.get(userId);
  if (!conexiones) return;

  const payload = JSON.stringify({
    evento: "sesion-invalidada",
    motivo: motivo || "Se inicio sesion en otro dispositivo",
  });

  conexiones.forEach((res) => {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch (e) {
      eliminarConexion(userId, res);
    }
  });
};

module.exports = {
  agregarConexion,
  eliminarConexion,
  notificarSesionInvalidada,
  conexionesPorUsuario,
};
