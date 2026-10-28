const express = require("express");
const Post = require("../models/Post");
const { authenticate, requireAdmin } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get(
  "/posts/pending",
  asyncHandler(async (_req, res) => {
    const posts = await Post.find({ status: "pending" })
      .populate("createdBy", "name email")
      .sort({ createdAt: 1 });
    return res.json({ posts });
  }),
);

router.patch(
  "/posts/approve/:id",
  asyncHandler(async (req, res) => {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { status: "approved" },
      { new: true, runValidators: true },
    );
    if (!post) return res.status(404).json({ message: "Pending post not found" });
    return res.json({ post });
  }),
);

router.patch(
  "/posts/reject/:id",
  asyncHandler(async (req, res) => {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { status: "rejected" },
      { new: true, runValidators: true },
    );
    if (!post) return res.status(404).json({ message: "Pending post not found" });
    return res.json({ post });
  }),
);

module.exports = router;
