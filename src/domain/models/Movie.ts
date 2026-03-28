/**
 * Represents the core attributes of a successfully scraped movie.
 */
export interface Movie {
  title: string;
  year: string;
  directors: string;
  imdbLink: string;
  metascore: number;
}
