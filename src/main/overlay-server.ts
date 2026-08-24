import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import type { OverlayState } from "../shared/types.js";
import type { StateService } from "./state-service.js";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

export class OverlayServer {
  readonly host = "127.0.0.1";
  readonly port = 17654;
  private readonly root: string;
  private readonly stateService: StateService;
  private latest: OverlayState;
  private readonly server;
  private readonly sockets = new WebSocketServer({ noServer: true });

  constructor(root: string, stateService: StateService) {
    this.root = resolve(root);
    this.stateService = stateService;
    this.latest = stateService.getState();
    this.server = createServer((request, response) => void this.handle(request, response));
    this.server.on("upgrade", (request, socket, head) => {
      if (new URL(request.url ?? "/", `http://${this.host}`).pathname !== "/ws") {
        socket.destroy();
        return;
      }
      this.sockets.handleUpgrade(request, socket, head, (websocket) => this.sockets.emit("connection", websocket));
    });
    this.sockets.on("connection", (socket) => socket.send(JSON.stringify(this.latest)));
    stateService.subscribe((state) => {
      this.latest = state;
      const payload = JSON.stringify(state);
      for (const client of this.sockets.clients) if (client.readyState === WebSocket.OPEN) client.send(payload);
    });
  }

  listen(): Promise<void> {
    return new Promise((resolvePromise, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.port, this.host, () => resolvePromise());
    });
  }

  close(): Promise<void> {
    return new Promise((resolvePromise) => this.server.close(() => resolvePromise()));
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      const url = new URL(request.url ?? "/", `http://${this.host}`);
      response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:17654");
      response.setHeader("X-Content-Type-Options", "nosniff");
      if (url.pathname === "/api/state") {
        response.writeHead(200, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" });
        response.end(JSON.stringify(this.latest));
        return;
      }
      if (url.pathname.startsWith("/sprites/")) {
        const spriteDirectory = this.stateService.getSpriteDirectory();
        if (!spriteDirectory) return this.notFound(response);
        const name = url.pathname.slice("/sprites/".length);
        if (!/^\d{3}\.png$/.test(name)) return this.notFound(response);
        return this.sendFile(join(spriteDirectory, name), response, true);
      }
      const route = url.pathname === "/" || url.pathname === "/control" ? "/index.html" : url.pathname === "/overlay" ? "/overlay.html" : url.pathname;
      const decoded = decodeURIComponent(route);
      const candidate = normalize(join(this.root, decoded));
      if (candidate !== this.root && !candidate.startsWith(this.root + sep)) return this.notFound(response);
      await this.sendFile(candidate, response, false);
    } catch {
      this.notFound(response);
    }
  }

  private async sendFile(path: string, response: ServerResponse, immutable: boolean): Promise<void> {
    await access(path);
    const info = await stat(path);
    if (!info.isFile()) return this.notFound(response);
    response.writeHead(200, {
      "Content-Type": MIME[extname(path)] ?? "application/octet-stream",
      "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache"
    });
    createReadStream(path).pipe(response);
  }

  private notFound(response: ServerResponse): void {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}
