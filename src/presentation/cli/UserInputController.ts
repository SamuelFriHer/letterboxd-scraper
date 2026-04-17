import readlineSync from 'readline-sync';
import { ScrapingConfiguration } from '../../domain/models/ScrapingConfiguration';

/**
 * CLI boundary controller that actively manages interactive user prompts.
 */
export class UserInputController {
  /**
   * Triggers the comprehensive interactive terminal input data process.
   * @returns The dynamically assembled scraping configuration map.
   */
  public promptConfiguration(): ScrapingConfiguration {
    const option = this.promptOption();
    const extraParams = this.promptExtraParams(option);
    const pages = this.promptPagesCount(option);

    return {
      option,
      yearOrDecade: extraParams.yearOrDecade,
      pages,
      directorSlug: extraParams.directorSlug,
    };
  }

  private promptOption(): string {
    return readlineSync
      .question(
        'Selecciona una opción (popular, year, decade, director) [popular]: ',
        {
          limit: ['popular', 'year', 'decade', 'director'],
          limitMessage:
            '⚠️ Opción no válida. Elige popular, year, decade o director.',
          defaultInput: 'popular',
        }
      )
      .toLowerCase();
  }

  private promptExtraParams(option: string) {
    let yearOrDecade = '';
    let directorSlug: string | undefined = undefined;

    if (option === 'director') {
      const rawDirector = readlineSync.question(
        'Introduce el nombre del director (ej. Paul Thomas Anderson): ',
        {
          limit: /^[a-zA-Z0-9\s-]+$/,
          limitMessage: '⚠️ El nombre contiene caracteres no válidos.',
        }
      );
      directorSlug = rawDirector
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    } else if (option === 'year') {
      const currentYear = new Date().getFullYear().toString();
      yearOrDecade = readlineSync.question(
        `Introduce el año (ej. 2023) [${currentYear}]: `,
        {
          limit: /^(18|19|20)\d{2}$/,
          limitMessage:
            '⚠️ Error. Debe ser un año válido de 4 dígitos (ej. 2023).',
          defaultInput: currentYear,
        }
      );
    } else if (option === 'decade') {
      const currentDecade = (
        Math.floor(new Date().getFullYear() / 10) * 10
      ).toString();
      yearOrDecade = readlineSync.question(
        `Introduce la década (ej. 1990) [${currentDecade}]: `,
        {
          limit: /^(18|19|20)\d0$/,
          limitMessage:
            '⚠️ Error. Debe ser una década válida terminada en 0 (ej. 1980).',
          defaultInput: currentDecade,
        }
      );
    }

    return { yearOrDecade, directorSlug };
  }

  private promptPagesCount(option: string): number {
    if (option === 'director') return 1;

    const pagesStr = readlineSync.question(
      'Número de páginas a scrapear [1]: ',
      {
        limit: (input: string) => {
          if (input === '') return true;
          const num = parseInt(input, 10);
          return !isNaN(num) && num > 0;
        },
        limitMessage: '⚠️ El número de páginas debe ser un entero mayor que 0.',
        defaultInput: '1',
      }
    );
    return parseInt(pagesStr, 10);
  }
}
