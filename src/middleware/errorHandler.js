function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid resource ID" });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "An account with that email already exists" });
  }
  if (error.name === "MulterError") {
    return res.status(400).json({ message: error.message });
  }
  if (error.message === "Unsupported upload type for this field") {
    return res.status(400).json({ message: error.message });
  }
  if (error.status && error.status < 500) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
}

module.exports = errorHandler;
