import { createLogger, format, transports } from 'winston';

import { env } from './env';

const { combine, timestamp, json, colorize, simple } = format;

export const logger = createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format:
    env.NODE_ENV === 'production'
      ? combine(timestamp(), json())
      : combine(colorize(), timestamp(), simple()),
  transports: [new transports.Console()],
  silent: env.NODE_ENV === 'test',
});
