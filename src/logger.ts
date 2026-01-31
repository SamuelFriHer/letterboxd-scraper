import * as readline from 'readline';

/**
 * Singleton Logger para manejar la salida por consola.
 * Permite agrupar logs por "item" (película) y borrarlos si el item se procesa correctamente.
 */
export class Logger {
  private static instance: Logger;
  private linesPrinted: number = 0;
  private isPersistent: boolean = false;
  private isItemActive: boolean = false;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Imprime un encabezado global o un mensaje que siempre debe permanecer.
   * No cuenta como parte del bloque "transitorio" del item actual.
   */
  public header(message: string): void {
    // Si hay un item activo, idealmente deberíamos cerrarlo o manejarlo,
    // pero asumiremos que header se llama fuera de items o antes de ellos.
    process.stdout.write(message + '\n');
  }

  /**
   * inicia un bloque de logs para un item (película).
   */
  public startItem(message: string): void {
    if (this.isItemActive) {
      // Por seguridad, si se llama startItem sin cerrar el anterior, forzamos cierre sin borrar
      this.reset();
    }
    this.isItemActive = true;
    this.printLine(message);
  }

  /**
   * Log normal. Se borrará si el item termina con éxito.
   */
  public log(message: string): void {
    this.printLine(message);
  }

  /**
   * Log de advertencia/error. Hace que todo el bloque del item sea persistente.
   */
  public warn(message: string): void {
    this.isPersistent = true;
    this.printLine(message);
  }

  /**
   * Log de error. Hace que todo el bloque del item sea persistente.
   */
  public error(message: string): void {
    this.isPersistent = true;
    this.printLine(message);
  }

  /**
   * Finaliza el bloque del item actual.
   * Si no hubo errores/warnings, borra las líneas impresas.
   * Si hubo errores/warnings, las deja.
   */
  public endItem(): void {
    if (!this.isItemActive) return;

    if (!this.isPersistent) {
      // Borrar las líneas
      if (this.linesPrinted > 0) {
        readline.moveCursor(process.stdout, 0, -this.linesPrinted);
        readline.clearScreenDown(process.stdout);
      }
    }

    this.reset();
  }

  private printLine(message: string): void {
    process.stdout.write(message + '\n');
    if (this.isItemActive) {
      // Contar saltos de línea explícitos en el mensaje más el salto final añadido
      const explicitNewLines = (message.match(/\n/g) || []).length;
      this.linesPrinted += 1 + explicitNewLines;
    }
  }

  private reset(): void {
    this.linesPrinted = 0;
    this.isPersistent = false;
    this.isItemActive = false;
  }
}

export const logger = Logger.getInstance();
