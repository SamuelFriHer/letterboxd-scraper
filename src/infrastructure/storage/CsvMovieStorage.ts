import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { MovieStorage } from '../../domain/ports/MovieStorage';
import { Movie } from '../../domain/models/Movie';
import { AppConfiguration } from '../../config/AppConfiguration';

export class CsvMovieStorage implements MovieStorage {
  private config = AppConfiguration.getInstance();

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

    const filename = this.generateFilename(option, identifier);
    await this.writeCsv(outputDir, filename, filteredMovies);
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
