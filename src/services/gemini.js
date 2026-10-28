const { GoogleGenAI } = require("@google/genai");
const env = require("../config/env");

async function improvePost(post, documentPaths) {
  if (!env.geminiApiKey) {
    const error = new Error("AI improvement is unavailable; configure GEMINI_API_KEY in .env");
    error.status = 503;
    throw error;
  }
  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
  const input = [
    {
      type: "text",
      text: [
        "Improve the writing of this content while preserving its original meaning and factual claims.",
        "Use any attached documents only as reference material and do not invent facts.",
        "Return only the improved content, without commentary or a title.",
        `Title: ${post.title}`,
        `Description: ${post.description || ""}`,
        `Content:\n${post.content}`,
      ].join("\n\n"),
    },
  ];

  for (const documentPath of documentPaths) {
    const uploadedFile = await ai.files.upload({
      file: documentPath.path,
      config: { mime_type: documentPath.mimeType },
    });
    input.push({
      type: "document",
      uri: uploadedFile.uri,
      mime_type: uploadedFile.mimeType || documentPath.mimeType,
    });
  }

  const interaction = await ai.interactions.create({
    model: env.geminiModel,
    input,
  });

  const improvedContent = interaction.output_text?.trim();
  if (!improvedContent) {
    throw new Error("Gemini returned an empty improvement");
  }
  return improvedContent;
}

module.exports = { improvePost };
