import { Server as SocketServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config/index.js';
import { logger } from '../logger.js';
import type { JwtPayload } from '../middleware/auth.js';

let io: SocketServer | null = null;

/**
 * Initialize Socket.IO with Redis adapter for horizontal scaling.
 */
export function initWebSocket(httpServer: HttpServer): SocketServer {
  const config = getConfig();

  io = new SocketServer(httpServer, {
    cors: { origin: config.WEB_URL, credentials: true },
    transports: ['websocket', 'polling'],
  });

  // Redis adapter for multi-instance support
  const pubClient = new Redis(config.REDIS_URL);
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // JWT auth on connection
  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      socket.data['user'] = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data['user'] as JwtPayload;
    const tenantRoom = `tenant:${user.tid}`;
    const userRoom = `user:${user.sub}`;

    void socket.join([tenantRoom, userRoom]);
    logger.debug({ userId: user.sub, tenantId: user.tid }, 'WebSocket connected');

    socket.on('disconnect', () => {
      logger.debug({ userId: user.sub }, 'WebSocket disconnected');
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}

/**
 * Broadcast an event to all clients in a tenant room.
 */
export function broadcastToTenant(tenantId: string, event: { type: string; payload: unknown }): void {
  if (!io) {
    logger.warn('WebSocket not initialized — cannot broadcast');
    return;
  }
  io.to(`tenant:${tenantId}`).emit(event.type, event.payload);
}

/**
 * Send an event to a specific user.
 */
export function sendToUser(userId: string, event: { type: string; payload: unknown }): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event.type, event.payload);
}

export function getIO(): SocketServer | null {
  return io;
}
