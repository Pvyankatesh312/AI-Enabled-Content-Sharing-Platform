const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const multer = require("multer");

const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedTypes = new Map([
  [".jpg", ["image/jpeg"]],
  [".jpeg", ["image/jpeg"]],
  [".png", ["image/png"]],
  [".webp", ["image/webp"]],
  [".pdf", ["application/pdf"]],
  [".txt", ["text/plain"]],
  [".md", ["text/markdown", "text/plain", "text/x-markdown"]],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

function fileFilter(_req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = allowedTypes.get(extension);
  const isImageField = file.fieldname === "image";
  const isImageType = file.mimetype.startsWith("image/");
  if (
    !allowedMimeTypes ||
    !allowedMimeTypes.includes(file.mimetype) ||
    (isImageField && !isImageType) ||
    (!isImageField && isImageType)
  ) {
    const error = new Error("Unsupported upload type for this field");
    error.status = 400;
    return callback(error);
  }
  return callback(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 6,
  },
});

function parsePostUploads(req, res, next) {
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "documents", maxCount: 5 },
  ])(req, res, (error) => {
    if (!error) return next();
    return next(error);
  });
}

function uploadsFromRequest(req) {
  const image = req.files?.image?.[0];
  const documents = req.files?.documents || [];

  return {
    image: image
      ? {
          filename: image.filename,
          originalName: image.originalname,
          mimeType: image.mimetype,
        }
      : undefined,
    documents: documents.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
    })),
  };
}

module.exports = { parsePostUploads, uploadsFromRequest, uploadDirectory };
