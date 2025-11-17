/**
 * Logging utility for development and production environments.
 * Provides conditional logging based on environment and structured log formatting.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  data?: unknown[];
}

/**
 * Formats a log entry with timestamp and level prefix.
 */
function formatLogEntry(entry: LogEntry): string {
  return `[${entry.level.toUpperCase()}] ${entry.timestamp}`;
}

/**
 * Application logger with environment-aware output.
 */
export const logger = {
  /**
   * Debug logging - only shown in development mode.
   * Use for detailed diagnostic information during development.
   */
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      const entry: LogEntry = {
        level: 'debug',
        timestamp: new Date().toISOString(),
        message: 'DEBUG',
        data: args,
      };
      // eslint-disable-next-line no-console
      console.log(formatLogEntry(entry), ...args);
    }
  },

  /**
   * Info logging - shown in all environments.
   * Use for general informational messages about application state.
   */
  info: (...args: unknown[]) => {
    const entry: LogEntry = {
      level: 'info',
      timestamp: new Date().toISOString(),
      message: 'INFO',
      data: args,
    };
    console.info(formatLogEntry(entry), ...args);
  },

  /**
   * Warning logging - shown in all environments.
   * Use for potentially harmful situations that don't prevent operation.
   */
  warn: (...args: unknown[]) => {
    const entry: LogEntry = {
      level: 'warn',
      timestamp: new Date().toISOString(),
      message: 'WARN',
      data: args,
    };
    console.warn(formatLogEntry(entry), ...args);
  },

  /**
   * Error logging - shown in all environments.
   * Use for error conditions that affect functionality.
   * In production, these should be sent to error tracking service (e.g., Sentry).
   */
  error: (...args: unknown[]) => {
    const entry: LogEntry = {
      level: 'error',
      timestamp: new Date().toISOString(),
      message: 'ERROR',
      data: args,
    };
    console.error(formatLogEntry(entry), ...args);

    // TODO: Send to Sentry in production (T-013)
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(args[0]);
    // }
  },
};
