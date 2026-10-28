const mongoose = require("mongoose");

const uploadSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
  },
  { _id: false },
);

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 500 },
    content: { type: String, required: true, trim: true, maxlength: 50000 },
    image: { type: uploadSchema, default: null },
    documents: { type: [uploadSchema], default: [] },
    category: { type: String, trim: true, maxlength: 100 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected"],
      default: "draft",
      index: true,
    },
    sourcePost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

postSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
