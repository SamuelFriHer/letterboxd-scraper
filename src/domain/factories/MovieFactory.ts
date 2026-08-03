import { Movie } from '../models/Movie';

/**
 * Factory for creating Movie domain entities with standard fallback defaults.
 */
export class MovieFactory {
  /**
   * Instantiates a Movie domain object, applying fallback default values for unpopulated fields.
   *
   * @param slug - The film identifier used as fallback title formatting.
   * @param details - Extracted partial movie details.
   * @param metascore - Metascore rating value.
   * @returns Complete Movie object with guaranteed non-null standard defaults.
   */
  public static create(
    slug: string,
    details: Partial<Movie> = {},
    metascore: number = -1
  ): Movie {
    const fallbackTitle = slug.replace(/-/g, ' ');
    return {
      title: details.title || fallbackTitle,
      year: details.year || 'Desconocido',
      directors: details.directors || 'Desconocido',
      imdbLink: details.imdbLink || '',
      metascore: details.metascore ?? metascore,
    };
  }
}
