import { Movie } from '../models/Movie';

export interface CatalogProvider {
  /**
   * Explores a specific page and returns a list of movies (with or without full details yet).
   * @param url The page URL to scrape.
   */
  exploreCatalogPage(url: string): Promise<{ title: string; link: string }[]>;

  /**
   * Obtains the core details of a specific movie from its page link.
   * @param url The specific movie URL.
   */
  getMovieDetails(url: string): Promise<Partial<Movie> & { imdbLink?: string }>;
}
