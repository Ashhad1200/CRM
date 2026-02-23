import pino from 'pino';
import { getConfig } from './config/index.js';

let _logger: pino.Logger | null = null;

export function getLogger(): pino.Logger {
  if (_logger) return _logger;
  let config: { LOG_LEVEL: string; NODE_ENV: string };
  try {
    config = getConfig();
  } catch {
    config = { LOG_LEVEL: 'info', NODE_ENV: 'development' };
  }
  _logger = pino({
    level: config.LOG_LEVEL,
    transport:
      config.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  });
  return _logger;
}

export const logger = getLogger();
