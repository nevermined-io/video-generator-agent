import pino from "pino";

/**
 * Configures and exports a logger instance for the application.
 *
 * This logger is used throughout the project for structured and readable logging.
 * It uses the `pino` library, which is a high-performance logging library for Node.js.
 *
 * Configuration:
 * - **Transport**: Specifies `pino-pretty` to format logs in a human-readable way.
 * - **Log Level**: Set to `"info"` by default to include informational messages and above
 *   (e.g., warnings, errors). Debugging logs are excluded unless the level is explicitly changed.
 */
export const logger = pino({
  transport: { target: "pino-pretty" },
  level: "info",
});
