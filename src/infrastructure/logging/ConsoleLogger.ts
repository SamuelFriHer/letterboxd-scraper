import {
  LoggerService,
  TaskLoggerService,
} from '../../domain/ports/LoggerService';

export class ConsoleLogger implements LoggerService {
  public log(message: string): void {
    process.stdout.write(message + '\n');
  }

  public warn(message: string): void {
    process.stdout.write(message + '\n');
  }

  public error(message: string): void {
    process.stdout.write(message + '\n');
  }

  public header(message: string): void {
    process.stdout.write(message + '\n');
  }

  public createTaskLogger(slug: string): TaskLoggerService {
    return new ConsoleTaskLogger(slug);
  }

  public logBatchResults(taskLoggers: TaskLoggerService[]): void {
    const persistentMessages = taskLoggers
      .filter((task) => task.isPersistent())
      .map((task) => task.getMessages().join(' | '));

    for (const msg of persistentMessages) {
      process.stdout.write(msg + '\n');
    }
  }
}

class ConsoleTaskLogger implements TaskLoggerService {
  private messages: string[] = [];
  private persistent: boolean = false;

  constructor(private slug: string) {
    this.messages.push(`🎬 Scrapeando: ${this.slug}`);
  }

  public log(message: string): void {
    this.messages.push(message);
  }

  public warn(message: string): void {
    this.persistent = true;
    this.messages.push(message);
  }

  public error(message: string): void {
    this.persistent = true;
    this.messages.push(message);
  }

  public isPersistent(): boolean {
    return this.persistent;
  }

  public getMessages(): string[] {
    return this.messages;
  }

  public getSlug(): string {
    return this.slug;
  }
}
