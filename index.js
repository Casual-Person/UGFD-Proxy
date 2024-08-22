import express from "express";
import compression from "compression";
import { createServer } from "node:http";
import { publicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { join } from "node:path";
import { hostname } from "node:os";
import wisp from "wisp-server-node";

const app = express();
app.use(compression());
app.use(express.static(publicPath, { maxAge: '1d' }));
app.use("/uv/", express.static(uvPath, { maxAge: '1d' }));
app.use("/epoxy/", express.static(epoxyPath, { maxAge: '1d' }));
app.use("/baremux/", express.static(baremuxPath, { maxAge: '1d' }));

app.use((req, res) => {
  res.status(404);
  res.sendFile(join(publicPath, "404.html"));
});

const server = createServer();

server.on("request", (req, res) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  app(req, res);
});

server.on("upgrade", (req, socket, head) => {
  if (req.url.endsWith("/wisp/"))
    wisp.routeRequest(req, socket, head);
  else
    socket.end();
});

let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 8080;

server.on("listening", () => {
  const address = server.address();

  console.log("Listening on:");
  console.log(`	http://localhost:${address.port}`);
  console.log(`	http://${hostname()}:${address.port}`);
  console.log(
    `	http://${address.family === "IPv6" ? `[${address.address}]` : address.address
    }:${address.port}`
  );
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close();
  process.exit(0);
}

server.listen({
  port,
});

