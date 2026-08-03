import { MovieFactory } from '../../../src/domain/factories/MovieFactory';

describe('MovieFactory', () => {
  describe('create', () => {
    it('should create a Movie object with fallback values when details are empty', () => {
      const slug = 'interstellar';
      const movie = MovieFactory.create(slug);

      expect(movie).toEqual({
        title: 'interstellar',
        year: 'Desconocido',
        directors: 'Desconocido',
        imdbLink: '',
        metascore: -1,
      });
    });

    it('should format hyphenated slug as fallback title when title is missing', () => {
      const slug = 'blade-runner-2049';
      const movie = MovieFactory.create(slug);

      expect(movie.title).toBe('blade runner 2049');
    });

    it('should populate provided movie details and explicit metascore', () => {
      const slug = 'the-godfather';
      const movieDetails = {
        title: 'The Godfather',
        year: '1972',
        directors: 'Francis Ford Coppola',
        imdbLink: 'https://www.imdb.com/title/tt0068646/',
      };
      const metascore = 100;

      const movie = MovieFactory.create(slug, movieDetails, metascore);

      expect(movie).toEqual({
        title: 'The Godfather',
        year: '1972',
        directors: 'Francis Ford Coppola',
        imdbLink: 'https://www.imdb.com/title/tt0068646/',
        metascore: 100,
      });
    });

    it('should prioritize details.metascore over third argument if present', () => {
      const slug = 'pulp-fiction';
      const movieDetails = {
        title: 'Pulp Fiction',
        metascore: 94,
      };

      const movie = MovieFactory.create(slug, movieDetails, 50);

      expect(movie.metascore).toBe(94);
    });
  });
});
