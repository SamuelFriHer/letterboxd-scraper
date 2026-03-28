import { Movie } from '../models/Movie';

export interface MovieStorage {
  /**
   * Persists a collection of movies to a storage medium.
   * @param movies The list of movies to be saved.
   * @param option The user option used to determine subdirectories.
   * @param identifier Optional identifier to name the storage file.
   */
  save(movies: Movie[], option: string, identifier?: string): Promise<void>;
}
