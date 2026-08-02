import { TaskLoggerService } from '../../domain/ports/LoggerService';

/**
 * Service providing fallback rating lookups via OMDb API using IMDb identifiers.
 */
export class OmdbRatingService {
  /**
   * Fetches the integer Metascore from OMDb API for a target IMDb ID.
   * @param imdbId The string identifier for the IMDb item (e.g., 'tt15398776').
   * @param logger The logger service for recording operation progress.
   * @returns A promise resolving to the integer Metascore, or -1 if unavailable.
   */
  public async fetchMetascore(
    imdbId: string,
    logger: TaskLoggerService
  ): Promise<number> {
    try {
      const apiKey = process.env.OMDB_API_KEY || 'trilogy';
      const response = await fetch(
        `http://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`
      );
      if (!response.ok) return -1;

      const payload = (await response.json()) as {
        Response?: string;
        Metascore?: string;
      };

      if (
        payload.Response === 'True' &&
        payload.Metascore &&
        payload.Metascore !== 'N/A'
      ) {
        const score = parseInt(payload.Metascore, 10);
        if (!isNaN(score)) {
          logger.log(`✅ Metascore (vía OMDb): ${score}`);
          return score;
        }
      }
    } catch (_error) {
      // Suppress API network exceptions gracefully
    }
    return -1;
  }
}
