const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const Post = require("../models/Post");
const { authenticate } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { uploadDirectory } = require("../middleware/uploads");

const router = express.Router();

router.get(
  "/:filename",
  asyncHandler(async (req, res, next) => {
    const filename = path.basename(req.params.filename);
    const post = await Post.findOne({ "image.filename": filename });
    if (!post) return res.status(404).json({ message: "Image not found" });

    if (post.status !== "approved") {
      return authenticate(req, res, async () => {
        if (post.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
          return res.status(403).json({ message: "You cannot access this image" });
        }
        return sendImage(filename, res, next);
      });
    }
    return sendImage(filename, res, next);
  }),
);

function sendImage(filename, res, next) {
  res.sendFile(path.join(uploadDirectory, filename), (error) => {
    if (error) next(error);
  });
}

module.exports = router;
