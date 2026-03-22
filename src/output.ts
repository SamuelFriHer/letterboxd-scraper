import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { MovieDetails } from './types';
import { config } from './config';

/**
 * Guarda los datos de las películas proporcionadas en formato CSV.
 * Omitirá el almacenamiento si ninguna película cumple los requisitos de puntuación preestablecidos.
 * Solo guarda películas con Metascore superior a 80.
 * @param movies La lista de detalles de las películas extraídas.
 * @param filename El nombre del archivo CSV a la salida.
 * @param option La opción elegida, para determinar el subdirectorio de salida.
 */
export async function saveToCSV(
  movies: MovieDetails[],
  filename: string,
  option: string = 'popular'
): Promise<void> {
  let outputDir = config.paths.output;
  if (option !== 'popular') {
    outputDir = path.join(outputDir, option);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
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
  const safePath = path.join(outputDir, safeFilename);

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
