const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const Post = require("../models/Post");
const { authenticate } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const {
  parsePostUploads,
  uploadsFromRequest,
  uploadDirectory,
} = require("../middleware/uploads");

const router = express.Router();
const postFields = ["title", "description", "content", "category", "status"];

function setUploadFields(post, uploaded) {
  if (uploaded.image) post.image = uploaded.image;
  if (uploaded.documents.length > 0) post.documents.push(...uploaded.documents);
}

async function removeFiles(files) {
  await Promise.all(files.map(async (file) => {
    const stillReferenced = await Post.exists({
      $or: [{ "image.filename": file.filename }, { "documents.filename": file.filename }],
    });
    if (stillReferenced) return;
    await fs.unlink(path.join(uploadDirectory, file.filename)).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }));
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const posts = await Post.find({ status: "approved" })
      .select("-documents")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    return res.json({ posts });
  }),
);

router.get(
  "/my-posts",
  authenticate,
  asyncHandler(async (req, res) => {
    const posts = await Post.find({ createdBy: req.user.id })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    return res.json({ posts });
  }),
);

router.post(
  "/",
  authenticate,
  parsePostUploads,
  asyncHandler(async (req, res) => {
    const { title, description, content, category, status = "draft" } = req.body;
    if (
      typeof title !== "string" ||
      typeof content !== "string" ||
      !title.trim() ||
      !content.trim() ||
      !["draft", "pending"].includes(status)
    ) {
      await removeFiles(Object.values(req.files || {}).flat());
      return res.status(400).json({
        message: "A title, content, and a draft or pending status are required",
      });
    }

    let post;
    try {
      post = await Post.create({
        title,
        description,
        content,
        category,
        status,
        createdBy: req.user.id,
        ...uploadsFromRequest(req),
      });
    } catch (error) {
      await removeFiles(Object.values(req.files || {}).flat());
      throw error;
    }
    return res.status(201).json({ post });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const post = await Post.findOne({ _id: req.params.id, status: "approved" })
      .select("-documents")
      .populate("createdBy", "name");
    if (!post) return res.status(404).json({ message: "Post not found" });
    return res.json({ post });
  }),
);

router.patch(
  "/:id",
  authenticate,
  parsePostUploads,
  asyncHandler(async (req, res) => {
    const uploadedFiles = Object.values(req.files || {}).flat();
    const post = await Post.findById(req.params.id);
    if (!post) {
      await removeFiles(uploadedFiles);
      return res.status(404).json({ message: "Post not found" });
    }
    if (post.createdBy.toString() !== req.user.id) {
      await removeFiles(uploadedFiles);
      return res.status(403).json({ message: "You can only update your own posts" });
    }

    const previousImage = post.image;
    for (const field of postFields) {
      if (req.body[field] !== undefined) post[field] = req.body[field];
    }
    if (req.body.status !== undefined && !["draft", "pending"].includes(req.body.status)) {
      await removeFiles(uploadedFiles);
      return res.status(400).json({ message: "Posts can only be saved as draft or pending" });
    }
    setUploadFields(post, uploadsFromRequest(req));
    if (
      post.status === "approved" &&
      ["title", "description", "content", "category", "image", "documents"].some((field) =>
        post.isModified(field),
      )
    ) {
      post.status = "pending";
    }

    try {
      await post.save();
    } catch (error) {
      await removeFiles(uploadedFiles);
      throw error;
    }
    if (previousImage && post.image?.filename !== previousImage.filename) {
      await removeFiles([previousImage]);
    }
    return res.json({ post });
  }),
);

router.delete(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own posts" });
    }

    const files = [post.image, ...post.documents].filter(Boolean);
    await post.deleteOne();
    await removeFiles(files);
    return res.status(204).end();
  }),
);

module.exports = router;
