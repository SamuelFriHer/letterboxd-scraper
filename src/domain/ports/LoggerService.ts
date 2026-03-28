/**
 * Provides logging capabilities across the application.
 */
export interface LoggerService {
  /** Logs an informational message. */
  log(message: string): void;
  /** Logs a warning message. */
  warn(message: string): void;
  /** Logs an error message. */
  error(message: string): void;
  /** Logs a prominently formatted header message. */
  header(message: string): void;
  /** Logs the accumulated results of a batch of tasks. */
  logBatchResults(batchData: TaskLoggerService[]): void;
  /** Creates an isolated logging context for a specific task. */
  createTaskLogger(slug: string): TaskLoggerService;
}

/**
 * Provides isolated logging for an individual task.
 */
export interface TaskLoggerService {
  /** Logs an informational message. */
  log(message: string): void;
  /** Logs a warning message. */
  warn(message: string): void;
  /** Logs an error message. */
  error(message: string): void;
  /** Indicates if this logger instance retains its messages in memory. */
  isPersistent(): boolean;
  /** Retrieves all accumulated messages. */
  getMessages(): string[];
  /** Retrieves the unique identifier of the task. */
  getSlug(): string;
}
