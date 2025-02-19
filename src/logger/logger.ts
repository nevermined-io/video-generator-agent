import pino from "pino";
import pretty from "pino-pretty";

/**
 * Provides a configured logger using the pino library.
 * Transport is set to "pino-pretty" for human-readable output.
 * Default log level is "info".
 */
export const logger = pino(pretty({ sync: true }));
