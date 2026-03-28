import { Movie } from '../models/Movie';

/**
 * Defines the contract for parsing generic catalog and movie details pages.
 */
export interface CatalogProvider {
  /**
   * Explores a specific page and returns a list of basic movie links.
   * @param url The catalog page URL to scrape.
   */
  exploreCatalogPage(url: string): Promise<{ title: string; link: string }[]>;

  /**
   * Obtains the core details of a specific movie from its page link.
   * @param url The specific movie detail URL.
   */
  getMovieDetails(url: string): Promise<Partial<Movie> & { imdbLink?: string }>;
}
