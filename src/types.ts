/**
 * Interfaz que define la estructura de datos de una película.
 * Contiene información básica como título, año, directores y puntuaciones.
 */
export interface MovieDetails {
  title: string;
  year: string;
  directors: string;
  imdbLink: string;
  metascore: number;
}

/**
 * Interfaz que define las opciones proporcionadas por el usuario
 * para configurar el proceso de scraping.
 */
export interface UserInput {
  option: string;
  yearOrDecade: string;
  pages: number;
  directorSlug?: string;
}

/**
 * Interfaz simplificada para almacenar el enlace y título
 * provisional de una película antes de obtener todos los detalles.
 */
export interface MovieLink {
  title: string;
  link: string;
}
