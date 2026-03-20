import readlineSync from 'readline-sync';
import { UserInput } from './types';

/**
 * Función que solicita por consola la configuración del scraping.
 * Interactivamente pide opción, año o década y el número de páginas, realizando su validación.
 * @returns Un objeto UserInput con las preferencias ingresadas.
 * @throws Lanzará error si el usuario introduce valores no válidos.
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
 * Construye la URL base de búsqueda de Letterboxd de acuerdo
 * a los parámetros ingresados por el usuario.
 * @param option El tipo de filtro seleccionado ('popular', 'year', 'decade').
 * @param yearOrDecade El año (ej. 2023) o década (ej. 1990) si corresponde.
 * @param page El número de página actual que se va a scrapear.
 * @returns La URL en formato string lista para ser navegada.
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
