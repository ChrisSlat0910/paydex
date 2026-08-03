import type { IncomingMessage } from 'http';
import type { Server } from 'http';

import { WebSocketServer, WebSocket } from 'ws';

import { logger } from '../config/logger';

// userId -> Set of active connections
const connections = new Map<string, Set<WebSocket>>();

export function initWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // Full auth + connection management implemented in issue #21
    logger.debug('WebSocket connection established', { url: req.url });

    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(heartbeat);
    });

    ws.on('error', (err) => {
      logger.error('WebSocket error', { error: err.message });
    });
  });

  return wss;
}

export function broadcast(userId: string, payload: unknown): void {
  const userConnections = connections.get(userId);
  if (!userConnections) return;

  const message = JSON.stringify(payload);

  for (const ws of userConnections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

export { connections };
