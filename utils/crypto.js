const crypto = require("crypto");

// ─── Configuracion ────────────────────────────────
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Llave maestra (en el .env)
const getMasterKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("Falta ENCRYPTION_KEY en .env");
  }
  return key;
};

// ─── Derivar una clave a partir del master key ────
const derivarClave = (salt) => {
  return crypto.pbkdf2Sync(
    getMasterKey(),
    salt,
    ITERATIONS,
    KEY_LENGTH,
    "sha512",
  );
};

// ─── Encriptar un texto ───────────────────────────
const encriptar = (texto) => {
  if (texto === null || texto === undefined || texto === "") return null;
  if (typeof texto !== "string") texto = String(texto);

  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = derivarClave(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encriptado = Buffer.concat([
    cipher.update(texto, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Formato: salt:iv:tag:encriptado (todo en hex)
  return `${salt.toString("hex")}:${iv.toString("hex")}:${tag.toString("hex")}:${encriptado.toString("hex")}`;
};

// ─── Desencriptar un texto ────────────────────────
const desencriptar = (textoEncriptado) => {
  if (!textoEncriptado) return null;
  if (typeof textoEncriptado !== "string") return null;

  try {
    const partes = textoEncriptado.split(":");
    if (partes.length !== 4) return textoEncriptado; // No esta encriptado

    const [saltHex, ivHex, tagHex, encriptadoHex] = partes;
    const salt = Buffer.from(saltHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encriptado = Buffer.from(encriptadoHex, "hex");

    const key = derivarClave(salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const desencriptado = Buffer.concat([
      decipher.update(encriptado),
      decipher.final(),
    ]);
    return desencriptado.toString("utf8");
  } catch (error) {
    console.error("Error al desencriptar:", error.message);
    return null;
  }
};

// ─── Hash para busquedas (HMAC) ───────────────────
// Permite buscar por un campo encriptado sin desencriptar todos.
const hashBusqueda = (texto) => {
  if (!texto) return null;
  const hmac = crypto.createHmac("sha256", getMasterKey());
  hmac.update(String(texto).trim().toLowerCase());
  return hmac.digest("hex");
};

module.exports = {
  encriptar,
  desencriptar,
  hashBusqueda,
};
