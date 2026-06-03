import http from "http";
import fs from "fs";
import path from "path";

/** Serve a directory at /{filename} for ML image download URLs. */
export function startLocalImageServer(rootDir, port = 9090) {
  const root = path.resolve(rootDir);
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(req.url.replace(/^\//, ""));
    if (!name || name.includes("..")) {
      res.writeHead(400);
      res.end("Bad request");
      return;
    }
    const filePath = path.join(root, name);
    if (!filePath.startsWith(root) || !fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type =
      ext === ".png" ? "image/png" : ext === ".jpeg" || ext === ".jpg" ? "image/jpeg" : "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve({ server, baseUrl: `http://127.0.0.1:${port}` }));
  });
}

export function stopServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}
