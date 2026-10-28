const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");

process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/test";
process.env.JWT_SECRET ||= "test-secret-with-sufficient-length";
process.env.GEMINI_API_KEY = "";

const app = require("../src/app");
const { improvePost } = require("../src/services/gemini");
let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("health endpoint reports unavailable when MongoDB is disconnected", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    status: "unavailable",
    database: "disconnected",
  });
});

test("unknown routes return a JSON 404", async () => {
  const response = await fetch(`${baseUrl}/not-a-route`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: "Route not found" });
});

test("AI improvement explains when Gemini is not configured", async () => {
  await assert.rejects(improvePost({}, []), (error) => {
    assert.equal(error.status, 503);
    assert.match(error.message, /GEMINI_API_KEY/);
    return true;
  });
});
