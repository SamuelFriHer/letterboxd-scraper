import { RatingProvider } from '../../domain/ports/RatingProvider';
import { TaskLoggerService } from '../../domain/ports/LoggerService';
import { OmdbRatingService } from './OmdbRatingService';

/**
 * Concrete rating provider that extracts Metascores via OMDb API using IMDb identifiers.
 */
export class OmdbRatingProvider implements RatingProvider {
  private omdbService: OmdbRatingService;

  constructor(omdbService?: OmdbRatingService) {
    this.omdbService = omdbService || new OmdbRatingService();
  }

  /**
   * Extracts the IMDb identifier from the source URL and retrieves its Metascore rating.
   * @param imdbUrl The URL string containing an IMDb identifier.
   * @param taskLogger The logger service to record process steps.
   * @returns A promise resolving to the integer Metascore, or -1 if unavailable.
   */
  public async getMetascore(
    imdbUrl: string,
    taskLogger: TaskLoggerService
  ): Promise<number> {
    taskLogger.log(`🔍 Buscando Metascore vía OMDb API...`);
    const imdbIdMatch = imdbUrl.match(/tt\d+/);
    if (!imdbIdMatch) {
      taskLogger.warn(`⚠️ Enlace de IMDb no contiene identificador válido.`);
      return -1;
    }
    return this.omdbService.fetchMetascore(imdbIdMatch[0], taskLogger);
  }
}
