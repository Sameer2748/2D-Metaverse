import { WebSocketServer } from "ws";
import { setupWebSocketServer } from "./User";

const wss = new WebSocketServer({ port: 4001 });
setupWebSocketServer(wss);
