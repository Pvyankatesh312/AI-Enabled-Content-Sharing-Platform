const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const Post = require("../models/Post");
const { authenticate } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { improvePost } = require("../services/gemini");
const { uploadDirectory } = require("../middleware/uploads");

const router = express.Router();
const documentUpload = require("multer")({
  dest: uploadDirectory,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, callback) => {
    if (["application/pdf", "text/plain", "text/markdown"].includes(file.mimetype)) {
      return callback(null, true);
    }
    const error = new Error("Only PDF, TXT, and Markdown documents are supported");
    error.status = 400;
    return callback(error);
  },
}).array("documents", 5);

function receiveDocuments(req, res, next) {
  documentUpload(req, res, (error) => (error ? next(error) : next()));
}

router.post(
  "/improve/:postId",
  authenticate,
  receiveDocuments,
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      await cleanup(req.files);
      return res.status(404).json({ message: "Post not found" });
    }
    if (post.createdBy.toString() !== req.user.id) {
      await cleanup(req.files);
      return res.status(403).json({ message: "You can only improve your own posts" });
    }

    const attachedDocuments = [
      ...post.documents.map((document) => ({
        path: path.join(uploadDirectory, document.filename),
        mimeType: document.mimeType,
      })),
      ...(req.files || []).map((file) => ({ path: file.path, mimeType: file.mimetype })),
    ];

    let improvedContent;
    try {
      improvedContent = await improvePost(post, attachedDocuments);
      const improvedPost = await Post.create({
        title: post.title,
        description: post.description,
        content: improvedContent,
        image: post.image,
        category: post.category,
        createdBy: req.user.id,
        status: "draft",
        sourcePost: post.id,
      });
      return res.status(201).json({ post: improvedPost });
    } finally {
      await cleanup(req.files);
    }
  }),
);

async function cleanup(files = []) {
  await Promise.all(
    files.map((file) => fs.unlink(file.path).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    })),
  );
}

module.exports = router;
