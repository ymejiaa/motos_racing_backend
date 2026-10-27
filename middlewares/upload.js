const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "mantenimientos");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    cb(null, `mant_${timestamp}_${random}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const tiposPermitidos = /jpeg|jpg|png|webp/;
  const extValida = tiposPermitidos.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimeValido = tiposPermitidos.test(file.mimetype);

  if (extValida && mimeValido) return cb(null, true);
  cb(new Error("Solo se permiten imagenes JPG, PNG o WEBP"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    files: 10,
  },
});

module.exports = upload;
