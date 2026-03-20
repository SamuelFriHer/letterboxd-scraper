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

  /**
   * Guarda un mensaje informativo de forma no persistente.
   * Sólo se mostrará si no hay un error persistente previo.
   * @param message El mensaje a registrar.
   */
  public log(message: string): void {
    this.messages.push(message);
  }

  /**
   * Guarda un mensaje de advertencia y marca la tarea como persistente
   * para asegurar que el mensaje se imprima en los resultados finales.
   * @param message El mensaje de advertencia.
   */
  public warn(message: string): void {
    this.persistent = true;
    this.messages.push(message);
  }

  /**
   * Guarda un mensaje de error y marca la tarea como persistente
   * para asegurar que se reporte el error en la salida.
   * @param message El mensaje de error.
   */
  public error(message: string): void {
    this.persistent = true;
    this.messages.push(message);
  }

  /**
   * Indica si la tarea actual contiene mensajes persistentes (advertencias o errores).
   * @returns Verdadero si existen advertencias o errores, de lo contrario falso.
   */
  public isPersistent(): boolean {
    return this.persistent;
  }

  /**
   * Devuelve la lista completa de mensajes guardados por el logger de la tarea.
   * @returns Un array de string con los mensajes.
   */
  public getMessages(): string[] {
    return this.messages;
  }

  /**
   * Devuelve el identificador único (slug) de la película correspondiente a la tarea.
   * @returns El slug de la tarea en curso.
   */
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

  /**
   * Imprime un mensaje destacado (cabecera) por consola.
   * @param message El texto de la cabecera.
   */
  public header(message: string): void {
    process.stdout.write(message + '\n');
  }

  /**
   * Crea un nuevo logger dedicado para una tarea específica basada en su slug.
   * @param slug El identificador de la película (slug).
   * @returns Una instancia de TaskLogger configurada para la tarea.
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
