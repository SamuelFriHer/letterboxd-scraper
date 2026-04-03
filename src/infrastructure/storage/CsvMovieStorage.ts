import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { MovieStorage } from '../../domain/ports/MovieStorage';
import { Movie } from '../../domain/models/Movie';
import { AppConfiguration } from '../../config/AppConfiguration';

/**
 * A storage execution implementation that saves scraped movies to CSV files.
 */
export class CsvMovieStorage implements MovieStorage {
  private config = AppConfiguration.getInstance();

  /**
   * Evaluates movies and writes valid entries (Metascore > 80) to a persistent CSV file.
   * @param movies The complete list of movies retrieved.
   * @param option The targeted retrieval strategy defining the folder structure.
   * @param identifier Optional entity identifier to dynamically construct the filename.
   */
  public async save(
    movies: Movie[],
    option: string,
    identifier?: string
  ): Promise<void> {
    const outputDir = this.getOutputDir(option);
    this.ensureDirectoryExists(outputDir);

    const filteredMovies = movies.filter((m) => m.metascore > 80);
    if (filteredMovies.length === 0) {
      console.log(
        '⚠️ Ninguna película tiene Metascore > 80. No se guardará el CSV.'
      );
      return;
    }

    // Sanitize data against CSV Formula Injection
    const sanitizedMovies = filteredMovies.map((m) => ({
      ...m,
      title: this.sanitizeCsvField(m.title),
      directors: this.sanitizeCsvField(m.directors),
    }));

    const filename = this.generateFilename(option, identifier);
    await this.writeCsv(outputDir, filename, sanitizedMovies);
  }

  private sanitizeCsvField(field: string): string {
    if (!field) return field;
    // Prevent CSV Formula Injection by prepending a single quote
    // if the field starts with =, +, -, @, \t, or \r
    if (/^[=+\-@\t\r]/.test(field)) {
      return `'${field}`;
    }
    return field;
  }

  private getOutputDir(option: string): string {
    let dir = this.config.paths.output;
    if (option !== 'popular') {
      dir = path.join(dir, option);
    }
    return dir;
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private generateFilename(option: string, identifier?: string): string {
    if (option === 'director' && identifier) {
      return `${option}_${identifier}.csv`;
    }
    if (identifier) {
      return `${option}_${identifier}.csv`;
    }
    return `${option}.csv`;
  }

  private async writeCsv(
    dir: string,
    filename: string,
    items: Movie[]
  ): Promise<void> {
    const safePath = path.join(dir, path.basename(filename));
    const csvWriter = createObjectCsvWriter({
      path: safePath,
      header: [
        { id: 'title', title: 'Título' },
        { id: 'year', title: 'Año' },
        { id: 'directors', title: 'Directores' },
        { id: 'metascore', title: 'Metascore' },
      ],
    });

    await csvWriter.writeRecords(items);
    console.log(`\n✅ Datos guardados en ${safePath}`);
  }
}
