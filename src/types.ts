export interface MovieDetails {
  title: string;
  year: string;
  directors: string;
  imdbLink: string;
  metascore: number;
}

export interface UserInput {
  option: string;
  yearOrDecade: string;
  pages: number;
}

export interface MovieLink {
  title: string;
  link: string;
}
