import { TaskLoggerService } from './LoggerService';

/**
 * Defines the contract for fetching external movie ratings.
 */
export interface RatingProvider {
  /**
   * Retrieves the Metascore for a given rating source URL.
   * @param ratingUrl The specific URL linking to the rating source.
   * @param taskLogger The logger to contextually record the process.
   * @returns A promise that resolves to the Metascore.
   */
  getMetascore(
    ratingUrl: string,
    taskLogger: TaskLoggerService
  ): Promise<number>;
}
