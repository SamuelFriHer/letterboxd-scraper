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
    // 1. Imprimir todos los mensajes del lote
    for (const task of taskLoggers) {
      const output = task.getMessages().join(' | ');
      process.stdout.write(output + '\n');
    }

    // 2. Esperar un poco para que el usuario vea el progreso (opcional, pero útil)
    // 3. Borrar los mensajes no persistentes (hacia atrás)
    let linesToClear = 0;
    const persistentMessages: string[] = [];

    // Recorremos al revés para saber cuántas líneas borrar desde el final
    for (let i = taskLoggers.length - 1; i >= 0; i--) {
      const task = taskLoggers[i];
      if (!task.isPersistent()) {
        linesToClear++;
      } else {
        // Si encontramos uno persistente, lo guardamos para re-imprimirlo después de borrar
        persistentMessages.unshift(task.getMessages().join(' | '));
        // Pero primero borramos todo lo que haya hasta aquí para "reorganizar"
        linesToClear++;
      }
    }

    if (linesToClear > 0) {
      readline.moveCursor(process.stdout, 0, -linesToClear);
      readline.clearScreenDown(process.stdout);
    }

    // Re-imprimir solo los persistentes
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
