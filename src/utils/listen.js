function listen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);
    const onListening = () => {
      server.removeListener("error", onError);
      resolve(server);
    };
    const onError = (error) => {
      server.removeListener("listening", onListening);
      reject(error);
    };

    server.once("listening", onListening);
    server.once("error", onError);
  });
}

async function listenWithFallback(app, port) {
  try {
    return await listen(app, port);
  } catch (error) {
    if (error.code !== "EADDRINUSE") {
      throw error;
    }

    const fallbackPort = port + 1;
    console.warn(`Port ${port} is already in use; trying port ${fallbackPort}.`);
    return listen(app, fallbackPort);
  }
}

module.exports = { listenWithFallback };
