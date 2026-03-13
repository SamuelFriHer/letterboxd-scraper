import readlineSync from 'readline-sync';
import { UserInput } from './types';

/**
 * Función para obtener el input del usuario.
 */
export function getUserInput(): UserInput {
  const option = readlineSync
    .question('Selecciona una opción (popular, year, decade): ')
    .toLowerCase();

  if (!['popular', 'year', 'decade'].includes(option)) {
    throw new Error('Opción no válida. Debe ser popular, year o decade.');
  }

  let yearOrDecade = '';
  if (option === 'year') {
    yearOrDecade = readlineSync.question('Introduce el año (ej. 2023): ');
    if (!/^\d{4}$/.test(yearOrDecade)) {
      throw new Error(
        'Formato de año no válido. Debe ser de 4 dígitos (ej. 2023).'
      );
    }
  } else if (option === 'decade') {
    yearOrDecade = readlineSync.question('Introduce la década (ej. 1990): ');
    if (!/^\d{4}$/.test(yearOrDecade)) {
      throw new Error(
        'Formato de década no válido. Debe ser de 4 dígitos (ej. 1990).'
      );
    }
  }

  const pages = readlineSync.questionInt('Número de páginas a scrapear: ');
  if (pages <= 0) {
    throw new Error('El número de páginas debe ser mayor que 0.');
  }

  return { option, yearOrDecade, pages };
}

/**
 * Construye la URL de Letterboxd según la opción elegida.
 */
export function buildLetterboxdUrl(
  option: string,
  yearOrDecade: string,
  page: number
): string {
  let url = 'https://letterboxd.com/films/';

  if (option === 'year') {
    url += `year/${yearOrDecade}/`;
  } else if (option === 'decade') {
    url += `popular/decade/${yearOrDecade}s/`;
  } else {
    url += 'popular/';
  }

  if (page > 1) {
    url += `page/${page}/`;
  }

  return url;
}
