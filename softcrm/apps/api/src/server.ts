import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { createServer, type Server } from 'node:http';
import { getConfig } from './config/index.js';
import { correlationMiddleware } from './middleware/correlation.js';
import { authMiddleware } from './middleware/auth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './health.js';
import { authRouter } from './modules/platform/auth/auth.routes.js';
import { rbacRouter } from './modules/platform/rbac/rbac.routes.js';
import { auditRouter } from './modules/platform/audit/audit.routes.js';
import { customFieldRouter } from './modules/platform/custom-fields/custom-field.routes.js';
import { salesRouter } from './modules/sales/routes.js';
import { accountingRouter } from './modules/accounting/routes.js';
import { supportRouter } from './modules/support/routes.js';
import { inventoryRouter } from './modules/inventory/routes.js';
import { commsRouter } from './modules/comms/routes.js';
import { marketingRouter } from './modules/marketing/routes.js';
import { analyticsRouter } from './modules/analytics/routes.js';
import { projectsRouter } from './modules/projects/routes.js';
import { workflowRouter } from './modules/platform/workflows/workflow.routes.js';
import { gdprRouter } from './modules/platform/gdpr/gdpr.routes.js';
import { syncRouter } from './modules/sync/routes.js';
import { searchRouter } from './modules/platform/search/search.routes.js';
import { notificationRouter } from './modules/platform/notifications/notification.routes.js';
import { notificationPreferenceRouter } from './modules/platform/notifications/notification-preference.routes.js';
import { registerNotificationListeners } from './modules/platform/notifications/notification.listeners.js';
import { hrRouter } from './modules/hr/routes.js';
import { registerHrListeners } from './modules/hr/listeners.js';
import { manufacturingRouter } from './modules/manufacturing/routes.js';
import { registerManufacturingListeners } from './modules/manufacturing/listeners.js';
import { warehouseRouter } from './modules/warehouse/routes.js';
import { registerWarehouseListeners } from './modules/warehouse/listeners.js';
import { procurementRouter } from './modules/procurement/routes.js';
import { registerProcurementListeners } from './modules/procurement/listeners.js';
import { posRouter } from './modules/pos/routes.js';
import { registerListeners as registerPosListeners } from './modules/pos/listeners.js';
import { assetsRouter } from './modules/assets/routes.js';
import { registerListeners as registerAssetsListeners } from './modules/assets/listeners.js';
import { qualityRouter } from './modules/quality/routes.js';
import { registerQualityListeners } from './modules/quality/listeners.js';
import { eventBus } from './infra/event-bus.js';
import { auditMiddleware } from './middleware/audit.js';
import { logger } from './logger.js';

export function createApp(): Express {
  const app = express();
  const config = getConfig();

  // ── Core middleware ──────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({ origin: config.WEB_URL, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ── Observability ───────────────────────────────────────────────────────────
  app.use(correlationMiddleware);
  app.use(
    pinoHttp({
      logger,
      customProps(req: Request) {
        return { requestId: (req as Request & { requestId?: string }).requestId };
      },
      autoLogging: {
        ignore(req: Request) {
          return req.url === '/health' || req.url === '/ready';
        },
      },
    }),
  );

  // ── Health (before auth) ────────────────────────────────────────────────────
  app.use(healthRouter);

  // ── Auth & Tenant (skipped for public routes by auth middleware) ─────────
  app.use(authMiddleware);
  app.use(tenantMiddleware);

  // ── Module routes ───────────────────────────────────────────────────────────
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/platform/roles', rbacRouter);
  app.use('/api/v1/platform/audit', auditRouter);
  app.use('/api/v1/platform/custom-fields', customFieldRouter);
  app.use('/api/v1/sales', salesRouter);
  app.use('/api/v1/accounting', accountingRouter);
  app.use('/api/v1/support', supportRouter);
  app.use('/api/v1/inventory', inventoryRouter);
  app.use('/api/v1/comms', commsRouter);
  app.use('/api/v1/marketing', marketingRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/projects', projectsRouter);
  app.use('/api/v1/platform/workflows', workflowRouter);
  app.use('/api/v1/platform', gdprRouter);
  app.use('/api/v1/platform/search', searchRouter);
  app.use('/api/v1/platform/notifications', notificationRouter);
  app.use('/api/v1/platform/notification-preferences', notificationPreferenceRouter);
  app.use('/api/v1/sync', syncRouter);
  app.use('/api/v1/hr', hrRouter);
  app.use('/api/v1/manufacturing', manufacturingRouter);
  app.use('/api/v1/warehouse', warehouseRouter);
  app.use('/api/v1/procurement', procurementRouter);
  app.use('/api/v1/pos', posRouter);
  app.use('/api/v1/assets', assetsRouter);
  app.use('/api/v1/quality', qualityRouter);

  // ── Register event-driven notification listeners ─────────────────────────────
  registerNotificationListeners();
  registerHrListeners();
  registerManufacturingListeners();
  registerWarehouseListeners(eventBus);
  registerProcurementListeners();
  registerPosListeners();
  registerAssetsListeners(eventBus);
  registerQualityListeners();

  // ── Audit (captures mutations after routes respond) ─────────────────────────
  app.use(auditMiddleware);

  // ── Error handler (must be last) ────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}

export function startServer(app: Express): Server {
  const config = getConfig();
  const httpServer = createServer(app);

  httpServer.listen(config.PORT, () => {
    logger.info(`🚀 SoftCRM API listening on port ${config.PORT} [${config.NODE_ENV}]`);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return httpServer;
}
