import readlineSync from 'readline-sync';
import { ScrapingConfiguration } from '../../domain/models/ScrapingConfiguration';

export class UserInputController {
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
      .question('Selecciona una opción (popular, year, decade, director): ', {
        limit: ['popular', 'year', 'decade', 'director'],
        limitMessage:
          '⚠️ Opción no válida. Elige popular, year, decade o director.',
      })
      .toLowerCase();
  }

  private promptExtraParams(option: string) {
    let yearOrDecade = '';
    let directorSlug: string | undefined = undefined;

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
        limitMessage:
          '⚠️ Error. Debe ser un año válido de 4 dígitos (ej. 2023).',
      });
    } else if (option === 'decade') {
      yearOrDecade = readlineSync.question('Introduce la década (ej. 1990): ', {
        limit: /^(18|19|20)\d0$/,
        limitMessage:
          '⚠️ Error. Debe ser una década válida terminada en 0 (ej. 1980).',
      });
    }

    return { yearOrDecade, directorSlug };
  }

  private promptPagesCount(option: string): number {
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
}
