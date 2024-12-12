import { WebSocketServer } from 'ws';
import { setupWebSocketServer } from './User';

const wss = new WebSocketServer({ port: 3001 });
setupWebSocketServer(wss);