import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import { verify } from 'jsonwebtoken';

import { WebSocketServer, WebSocket } from 'ws';

import { env } from '../config/env';
import { logger } from '../config/logger';

interface JwtPayload {
  sub: string;
  role: string;
}

const connections = new Map<string, Set<WebSocket>>();

function addConnection(userId: string, ws: WebSocket): void {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(ws);
}

function removeConnection(userId: string, ws: WebSocket): void {
  const userConnections = connections.get(userId);
  if (!userConnections) return;
  userConnections.delete(ws);
  if (userConnections.size === 0) {
    connections.delete(userId);
  }
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

export function broadcastAll(payload: unknown): void {
  const message = JSON.stringify(payload);

  for (const userConnections of connections.values()) {
    for (const ws of userConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
}

export function initWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Missing token');
      return;
    }

    let userId: string;

    try {
      const payload = verify(token, env.JWT_SECRET) as JwtPayload;
      userId = payload.sub;
    } catch {
      ws.close(1008, 'Invalid token');
      return;
    }

    addConnection(userId, ws);
    logger.info('WebSocket client connected', { userId });

    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(heartbeat);
      removeConnection(userId, ws);
      logger.info('WebSocket client disconnected', { userId });
    });

    ws.on('error', (err) => {
      logger.error('WebSocket error', { userId, error: err.message });
    });

    ws.send(JSON.stringify({ type: 'CONNECTED', userId }));
  });

  logger.info('WebSocket server initialized');

  return wss;
}
