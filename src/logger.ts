import * as readline from 'readline';

/**
 * Maneja los logs de una tarea individual (película).
 * Almacena los mensajes para imprimirlos todos juntos al final.
 */
export class TaskLogger {
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

/**
 * Singleton Logger para manejar la salida por consola.
 */
export class Logger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public header(message: string): void {
    process.stdout.write(message + '\n');
  }

  /**
   * Crea un nuevo logger para una tarea específica.
   */
  public createTaskLogger(slug: string): TaskLogger {
    return new TaskLogger(slug);
  }

  /**
   * Imprime los resultados de un lote y limpia los que no sean persistentes.
   */
  public logBatchResults(taskLoggers: TaskLogger[]): void {
    // Imprimir solo los mensajes persistentes (errores, advertencias)
    const persistentMessages = taskLoggers
      .filter((task) => task.isPersistent())
      .map((task) => task.getMessages().join(' | '));

    for (const msg of persistentMessages) {
      process.stdout.write(msg + '\n');
    }
  }

  // Métodos legacy para compatibilidad si fuera necesario
  public log(message: string): void {
    process.stdout.write(message + '\n');
  }

  public warn(message: string): void {
    process.stdout.write(message + '\n');
  }

  public error(message: string): void {
    process.stdout.write(message + '\n');
  }
}

export const logger = Logger.getInstance();
