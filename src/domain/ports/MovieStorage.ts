import { Movie } from '../models/Movie';

/**
 * Defines the contract for persisting scraped movie data.
 */
export interface MovieStorage {
  /**
   * Persists a collection of movies to a target storage medium.
   * @param movies The list of completely scraped movies.
   * @param option The user-selected scraping option (e.g., year, popular).
   * @param identifier Optional entity identifier (like year string or director slug).
   * @returns A promise that resolves when saving completes.
   */
  save(movies: Movie[], option: string, identifier?: string): Promise<void>;
}
