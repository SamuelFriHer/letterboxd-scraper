import { TaskLoggerService } from './LoggerService';

export interface RatingProvider {
  /**
   * Retrieves the Metascore for a given reference URL (like IMDb).
   * @param ratingUrl The specific URL linking to the rating source.
   * @param taskLogger The logger to contextually record the process.
   */
  getMetascore(
    ratingUrl: string,
    taskLogger: TaskLoggerService
  ): Promise<number>;
}
