const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { listenWithFallback } = require("../src/utils/listen");

test("retries on the next port when the preferred port is in use", async () => {
  const attemptedPorts = [];
  const app = {
    listen(port) {
      attemptedPorts.push(port);
      const server = new EventEmitter();
      server.address = () => ({ port });

      process.nextTick(() => {
        if (port === 3000) {
          const error = new Error("Port is already in use");
          error.code = "EADDRINUSE";
          server.emit("error", error);
        } else {
          server.emit("listening");
        }
      });

      return server;
    },
  };
  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    const server = await listenWithFallback(app, 3000);
    assert.deepEqual(attemptedPorts, [3000, 3001]);
    assert.equal(server.address().port, 3001);
  } finally {
    console.warn = originalWarn;
  }
});

test("does not retry for errors other than an occupied port", async () => {
  const attemptedPorts = [];
  const app = {
    listen(port) {
      attemptedPorts.push(port);
      const server = new EventEmitter();
      process.nextTick(() => server.emit("error", new Error("Listen failed")));
      return server;
    },
  };

  await assert.rejects(listenWithFallback(app, 3000), /Listen failed/);
  assert.deepEqual(attemptedPorts, [3000]);
});
