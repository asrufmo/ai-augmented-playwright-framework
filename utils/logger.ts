import { createLogger, format, transports } from 'winston';
import * as path from 'path';
import * as fs from 'fs';

const logDir = path.resolve('./logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return stack
    ? `${ts} [${level}] ${message}\n${stack}`
    : `${ts} [${level}] ${message}`;
});

export const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat,
  ),
  transports: [
    new transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
    new transports.File({
      filename: path.join(logDir, 'test-run.log'),
      maxsize: 5_242_880, // 5 MB
      maxFiles: 5,
    }),
    new transports.File({
      filename: path.join(logDir, 'errors.log'),
      level: 'error',
    }),
  ],
});

export function logApiCall(method: string, url: string, status: number, durationMs: number): void {
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
  logger.log(level, `API ${method.toUpperCase()} ${url} → ${status} (${durationMs}ms)`);
}
