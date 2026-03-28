import {
  LoggerService,
  TaskLoggerService,
} from '../../domain/ports/LoggerService';

/**
 * A logger implementation that outputs messages to the standard console.
 */
export class ConsoleLogger implements LoggerService {
  /**
   * Logs an informational standard output message.
   * @param message The text to log.
   */
  public log(message: string): void {
    process.stdout.write(message + '\n');
  }

  /**
   * Logs a standardized warning message.
   * @param message The warning text.
   */
  public warn(message: string): void {
    process.stdout.write(message + '\n');
  }

  /**
   * Logs a standardized error message.
   * @param message The error text.
   */
  public error(message: string): void {
    process.stdout.write(message + '\n');
  }

  /**
   * Logs a prominently formatted header, commonly used for separating sections.
   * @param message The header text.
   */
  public header(message: string): void {
    process.stdout.write(message + '\n');
  }

  /**
   * Creates an isolated logging context for a specific task using the console.
   * @param slug A unique identifier for the task.
   * @returns A newly instantiated logging context.
   */
  public createTaskLogger(slug: string): TaskLoggerService {
    return new ConsoleTaskLogger(slug);
  }

  /**
   * Analyzes an array of task loggers and prints the persistent messages grouped together.
   * @param taskLoggers The completed or failed tasks loggers.
   */
  public logBatchResults(taskLoggers: TaskLoggerService[]): void {
    const persistentMessages = taskLoggers
      .filter((task) => task.isPersistent())
      .map((task) => task.getMessages().join(' | '));

    for (const msg of persistentMessages) {
      process.stdout.write(msg + '\n');
    }
  }
}

/**
 * A concrete task logger that accumulates messages to be output selectively.
 */
class ConsoleTaskLogger implements TaskLoggerService {
  private messages: string[] = [];
  private persistent: boolean = false;

  constructor(private slug: string) {
    this.messages.push(`🎬 Scrapeando: ${this.slug}`);
  }

  /**
   * Logs an informational message silently unless later deemed persistent.
   * @param message The internal task log text.
   */
  public log(message: string): void {
    this.messages.push(message);
  }

  /**
   * Flags the task as persistent and stores a warning message to be forcibly displayed.
   * @param message The warning description.
   */
  public warn(message: string): void {
    this.persistent = true;
    this.messages.push(message);
  }

  /**
   * Flags the task as persistent and stores an error message to be forcibly displayed.
   * @param message The error description.
   */
  public error(message: string): void {
    this.persistent = true;
    this.messages.push(message);
  }

  /**
   * Indicates if this logger instance must output its historical messages.
   * @returns True if the instance contains warnings or errors.
   */
  public isPersistent(): boolean {
    return this.persistent;
  }

  /**
   * Retrieves all ordered messages recorded during the task lifespan.
   * @returns An array of textual messages.
   */
  public getMessages(): string[] {
    return this.messages;
  }

  /**
   * Retrieves the task unique identifier assigned at creation.
   * @returns The string identifier (slug).
   */
  public getSlug(): string {
    return this.slug;
  }
}
