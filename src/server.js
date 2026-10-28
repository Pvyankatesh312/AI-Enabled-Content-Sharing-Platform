const mongoose = require("mongoose");
const app = require("./app");
const env = require("./config/env");
const { listenWithFallback } = require("./utils/listen");

async function start() {
  await mongoose.connect(env.mongoUri);
  const server = await listenWithFallback(app, env.port);
  console.log(`API listening on port ${server.address().port}`);

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

start().catch(async (error) => {
  console.error("Failed to start API", error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error("Failed to disconnect from MongoDB", disconnectError);
  }
  process.exitCode = 1;
});
