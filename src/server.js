const mongoose = require("mongoose");
const app = require("./app");
const env = require("./config/env");

async function start() {
  await mongoose.connect(env.mongoUri);
  const server = app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received; closing server`);
    server.close(async (error) => {
      if (error) {
        console.error("Failed to close HTTP server", error);
        process.exitCode = 1;
      }
      await mongoose.disconnect();
    });
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("Failed to start API", error);
  process.exitCode = 1;
});
