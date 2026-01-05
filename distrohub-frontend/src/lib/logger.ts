/**
 * Logger utility for development-only logging
 * In production, only errors and warnings are logged
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  warn: (...args: any[]) => {
    // Always log warnings, even in production
    console.warn(...args);
  },
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },
};

