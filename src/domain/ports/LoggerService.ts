export interface LoggerService {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  header(message: string): void;
  logBatchResults(batchData: TaskLoggerService[]): void;
  createTaskLogger(slug: string): TaskLoggerService;
}

export interface TaskLoggerService {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  isPersistent(): boolean;
  getMessages(): string[];
  getSlug(): string;
}
