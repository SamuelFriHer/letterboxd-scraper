import readlineSync from 'readline-sync';
import { UserInput } from './types';

/**
 * Función que solicita por consola la configuración del scraping.
 * @returns Un objeto UserInput con las preferencias ingresadas.
 */
export function getUserInput(): UserInput {
  const option = getOption();
  const { yearOrDecade, directorSlug } = getExtraParam(option);
  const pages = getPagesCount(option);
  return { option, yearOrDecade, pages, directorSlug };
}

/**
 * Solicita interactivamente la opción principal del scraper.
 * @returns La opción seleccionada en minúsculas.
 */
function getOption(): string {
  return readlineSync
    .question('Selecciona una opción (popular, year, decade, director): ', {
      limit: ['popular', 'year', 'decade', 'director'],
      limitMessage:
        '⚠️ Opción no válida. Elige popular, year, decade o director.',
    })
    .toLowerCase();
}

/**
 * Solicita los parámetros extra que dependan de la opción.
 * @param option La opción previamente seleccionada.
 * @returns Un objeto con el año, la década o el slug del director.
 */
function getExtraParam(option: string) {
  let yearOrDecade = '';
  let directorSlug = undefined;

  if (option === 'director') {
    directorSlug = readlineSync.question(
      'Introduce el identificador del director (ej. paul-thomas-anderson): ',
      {
        limit: /^[a-z0-9-]+$/,
        limitMessage: '⚠️ Usa minúsculas, números y guiones.',
      }
    );
  } else if (option === 'year') {
    yearOrDecade = readlineSync.question('Introduce el año (ej. 2023): ', {
      limit: /^(18|19|20)\d{2}$/,
      limitMessage: '⚠️ Error. Debe ser un año válido de 4 dígitos (ej. 2023).',
    });
  } else if (option === 'decade') {
    yearOrDecade = readlineSync.question('Introduce la década (ej. 1990): ', {
      limit: /^(18|19|20)\d0$/,
      limitMessage:
        '⚠️ Error. Debe ser una década válida terminada en 0 (ej. 1980, 1990, 2000).',
    });
  }

  return { yearOrDecade, directorSlug };
}

/**
 * Solicita la cantidad de páginas a scrapear.
 * @param option La opción previamente seleccionada.
 * @returns El número de páginas válidas enteras.
 */
function getPagesCount(option: string): number {
  if (option === 'director') return 1;

  const pagesStr = readlineSync.question('Número de páginas a scrapear: ', {
    limit: (input: string) => {
      const num = parseInt(input, 10);
      return !isNaN(num) && num > 0;
    },
    limitMessage: '⚠️ El número de páginas debe ser un entero mayor que 0.',
  });
  return parseInt(pagesStr, 10);
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
  page: number,
  directorSlug?: string
): string {
  if (option === 'director' && directorSlug) {
    return `https://letterboxd.com/director/${directorSlug}/`;
  }

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
