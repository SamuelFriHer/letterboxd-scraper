import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { MovieDetails } from './types';
import { config } from './config';

/**
 * Guarda los datos en CSV, filtrando solo las películas con Metascore > 80.
 */
export async function saveToCSV(
  movies: MovieDetails[],
  filename: string
): Promise<void> {
  if (!fs.existsSync(config.paths.output)) {
    fs.mkdirSync(config.paths.output, { recursive: true });
  }

  const filteredMovies = movies.filter((movie) => movie.metascore > 80);

  if (filteredMovies.length === 0) {
    console.log(
      '⚠️ Ninguna película tiene Metascore > 80. No se guardará el CSV.'
    );
    return;
  }

  // Sanitizar el nombre del archivo para prevenir Path Traversal
  const safeFilename = path.basename(filename);
  const safePath = path.join(config.paths.output, safeFilename);

  const csvWriter = createObjectCsvWriter({
    path: safePath,
    header: [
      { id: 'title', title: 'Título' },
      { id: 'year', title: 'Año' },
      { id: 'directors', title: 'Directores' },
      { id: 'metascore', title: 'Metascore' },
    ],
  });

  await csvWriter.writeRecords(filteredMovies);
  console.log(`\n✅ Datos guardados en ${safePath}`);
}
