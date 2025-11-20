/**
 * Canvas Roots Logging System
 *
 * Structured logging with support for export and analysis.
 * Based on Sonigraph's logging implementation.
 */

/**
 * Core logger interface
 */
export interface ILogger {
	debug(category: string, message: string, data?: unknown): void;
	info(category: string, message: string, data?: unknown): void;
	warn(category: string, message: string, data?: unknown): void;
	error(category: string, message: string, error?: unknown): void;
	time(operation: string): () => void;
	withContext(context: Record<string, unknown>): ContextualLogger;
	enrichError(error: Error, context: Record<string, unknown>): Error;
}

/**
 * Logger with attached context
 */
export interface ContextualLogger extends ILogger {
	getContext(): Record<string, unknown>;
}

/**
 * Individual log entry
 */
export interface LogEntry {
	timestamp: Date;
	level: LogLevel;
	component: string;
	category: string;
	message: string;
	data?: unknown;
	context?: Record<string, unknown>;
}

/**
 * Log severity levels
 */
export type LogLevel = 'off' | 'error' | 'warn' | 'info' | 'debug';

/**
 * Log level priority map
 */
const LOG_LEVELS: Record<LogLevel, number> = {
	'off': 0,
	'error': 1,
	'warn': 2,
	'info': 3,
	'debug': 4
};

/**
 * Logger implementation
 */
class Logger implements ILogger {
	private component: string;
	private context?: Record<string, unknown>;

	constructor(component: string, context?: Record<string, unknown>) {
		this.component = component;
		this.context = context;
	}

	debug(category: string, message: string, data?: unknown): void {
		this.log('debug', category, message, data);
	}

	info(category: string, message: string, data?: unknown): void {
		this.log('info', category, message, data);
	}

	warn(category: string, message: string, data?: unknown): void {
		this.log('warn', category, message, data);
	}

	error(category: string, message: string, error?: unknown): void {
		this.log('error', category, message, error);
	}

	time(operation: string): () => void {
		const startTime = performance.now();
		return () => {
			const duration = performance.now() - startTime;
			this.debug('performance', `${operation} completed in ${duration.toFixed(2)}ms`);
		};
	}

	withContext(newContext: Record<string, unknown>): ContextualLogger {
		const mergedContext = { ...this.context, ...newContext };
		return new ContextualLoggerImpl(this.component, mergedContext);
	}

	enrichError(error: Error, context: Record<string, unknown>): Error {
		interface EnrichedError extends Error {
			context?: Record<string, unknown>;
		}
		const enrichedError = new Error(error.message) as EnrichedError;
		enrichedError.name = error.name;
		enrichedError.stack = error.stack;
		enrichedError.context = { ...this.context, ...context };
		return enrichedError;
	}

	private log(level: LogLevel, category: string, message: string, data?: unknown): void {
		if (level === 'off') return;

		const entry: LogEntry = {
			timestamp: new Date(),
			level,
			component: this.component,
			category,
			message,
			data,
			context: this.context
		};

		this.output(entry);
	}

	private output(entry: LogEntry): void {
		// Always collect logs for export
		LoggerFactoryClass.collectLog(entry);

		// Output to console if log level permits
		if (LOG_LEVELS[entry.level] <= LoggerFactoryClass.getLogLevelValue()) {
			const contextStr = entry.context ? ` [${JSON.stringify(entry.context)}]` : '';
			const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
			const logMessage = `[Canvas Roots] [${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}] [${entry.component}/${entry.category}]${contextStr} ${entry.message}${dataStr}`;

			switch (entry.level) {
				case 'debug':
					console.debug(logMessage);
					break;
				case 'info':
					console.info(logMessage);
					break;
				case 'warn':
					console.warn(logMessage);
					break;
				case 'error':
					console.error(logMessage);
					break;
			}
		}
	}
}

/**
 * Contextual logger implementation
 */
class ContextualLoggerImpl extends Logger implements ContextualLogger {
	private contextData: Record<string, unknown>;

	constructor(component: string, context: Record<string, unknown>) {
		super(component, context);
		this.contextData = context;
	}

	getContext(): Record<string, unknown> {
		return { ...this.contextData };
	}
}

/**
 * Logger factory - manages all loggers and log collection
 */
class LoggerFactoryClass {
	private loggers = new Map<string, ILogger>();
	private static logLevel: LogLevel = 'debug';
	private static logs: LogEntry[] = [];
	private static maxLogs: number = 10000; // Prevent memory overflow

	/**
	 * Collect a log entry for export
	 */
	static collectLog(entry: LogEntry): void {
		// Prevent unbounded growth
		if (LoggerFactoryClass.logs.length >= LoggerFactoryClass.maxLogs) {
			// Remove oldest 10% when limit reached
			LoggerFactoryClass.logs.splice(0, Math.floor(LoggerFactoryClass.maxLogs * 0.1));
		}
		LoggerFactoryClass.logs.push(entry);
	}

	/**
	 * Get all collected logs
	 */
	static getLogs(): LogEntry[] {
		return LoggerFactoryClass.logs.slice();
	}

	/**
	 * Clear all collected logs
	 */
	static clearLogs(): void {
		LoggerFactoryClass.logs = [];
	}

	/**
	 * Get or create a logger for a component
	 */
	getLogger(component: string): ILogger {
		if (!this.loggers.has(component)) {
			this.loggers.set(component, new Logger(component));
		}
		return this.loggers.get(component)!;
	}

	/**
	 * Set global log level
	 */
	static setLogLevel(level: LogLevel): void {
		LoggerFactoryClass.logLevel = level;
	}

	/**
	 * Get current log level
	 */
	static getLogLevel(): LogLevel {
		return LoggerFactoryClass.logLevel;
	}

	/**
	 * Get numeric log level value
	 */
	static getLogLevelValue(): number {
		return LOG_LEVELS[LoggerFactoryClass.logLevel];
	}

	/**
	 * Set maximum number of logs to keep in memory
	 */
	static setMaxLogs(max: number): void {
		LoggerFactoryClass.maxLogs = max;
	}

	/**
	 * Initialize logger with configuration
	 */
	initialize(config?: { logLevel?: LogLevel; maxLogs?: number }): void {
		if (config?.logLevel) {
			LoggerFactoryClass.setLogLevel(config.logLevel);
		}
		if (config?.maxLogs) {
			LoggerFactoryClass.setMaxLogs(config.maxLogs);
		}
	}
}

/**
 * Global factory instance
 */
const loggerFactory = new LoggerFactoryClass();

/**
 * Get a logger for a component
 */
export function getLogger(component: string): ILogger {
	return loggerFactory.getLogger(component);
}

/**
 * Export factory for configuration and log access
 */
export { loggerFactory, LoggerFactoryClass as LoggerFactory };
