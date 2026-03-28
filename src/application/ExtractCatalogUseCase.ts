import { Movie } from '../domain/models/Movie';
import { ScrapingConfiguration } from '../domain/models/ScrapingConfiguration';
import { CatalogProvider } from '../domain/ports/CatalogProvider';
import { RatingProvider } from '../domain/ports/RatingProvider';
import { MovieStorage } from '../domain/ports/MovieStorage';
import { LoggerService } from '../domain/ports/LoggerService';
import { BrowserCoordinator } from '../infrastructure/browser/BrowserCoordinator';

export class ExtractCatalogUseCase {
  constructor(
    private browserCoordinator: BrowserCoordinator,
    private catalogProvider: CatalogProvider,
    private ratingProvider: RatingProvider,
    private movieStorage: MovieStorage,
    private logger: LoggerService
  ) {}

  public async execute(config: ScrapingConfiguration): Promise<void> {
    await this.browserCoordinator.startBrowser();
    const movies: Movie[] = [];

    try {
      for (let page = 1; page <= config.pages; page++) {
        const url = this.buildLetterboxdUrl(config, page);
        this.logger.header(
          `\n📄 Explorando página ${page} de ${config.pages}: ${url}`
        );

        const movieLinks = await this.catalogProvider.exploreCatalogPage(url);
        await this.processMovieBatches(movieLinks, movies);
      }
    } finally {
      await this.browserCoordinator.stopBrowser();
    }

    const id =
      config.option === 'director' ? config.directorSlug : config.yearOrDecade;
    await this.movieStorage.save(movies, config.option, id);

    this.logger.header('✅ Scraping finalizado.');
  }

  private buildLetterboxdUrl(
    config: ScrapingConfiguration,
    page: number
  ): string {
    if (config.option === 'director' && config.directorSlug) {
      return `https://letterboxd.com/director/${config.directorSlug}/`;
    }

    let url = 'https://letterboxd.com/films/';

    if (config.option === 'year') {
      url += `year/${config.yearOrDecade}/`;
    } else if (config.option === 'decade') {
      url += `popular/decade/${config.yearOrDecade}s/`;
    } else {
      url += 'popular/';
    }

    if (page > 1) {
      url += `page/${page}/`;
    }

    return url;
  }

  private async processMovieBatches(
    movieLinks: { title: string; link: string }[],
    movies: Movie[]
  ): Promise<void> {
    const BATCH_SIZE = 5;
    const batches = this.browserCoordinator.chunk(movieLinks, BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.header(
        `📦 Procesando lote ${i + 1} de ${batches.length} (${batch.length} películas)...`
      );

      const resultsBatch = await Promise.all(
        batch.map((m) => this.scrapeSingleMovie(m.link))
      );

      this.logger.logBatchResults(resultsBatch.map((r) => r.logger));
      movies.push(...resultsBatch.map((r) => r.movie));
    }
  }

  private async scrapeSingleMovie(url: string) {
    const slug = url.split('/film/')[1]?.replace('/', '') || 'desconocido';
    const taskLogger = this.logger.createTaskLogger(slug);
    const MAX_RETRIES = 3;

    for (let retries = 0; retries <= MAX_RETRIES; retries++) {
      try {
        return await this.tryMovieExtraction(url, slug, taskLogger);
      } catch (_e) {
        await this.browserCoordinator.cleanupPage();
        if (retries < MAX_RETRIES) {
          taskLogger.warn(`⚠️ Retry ${retries}/${MAX_RETRIES} for ${slug}...`);
          await new Promise((r) => setTimeout(r, retries * 5000));
        }
      }
    }

    taskLogger.error(`❌ Failed: ${slug}`);
    return this.createFallbackMovie(slug, taskLogger);
  }

  private async tryMovieExtraction(
    url: string,
    slug: string,
    logger: import('../domain/ports/LoggerService').TaskLoggerService
  ) {
    const detailData = await this.catalogProvider.getMovieDetails(url);
    let metascore = -1;

    if (detailData.imdbLink) {
      metascore = await this.ratingProvider.getMetascore(
        detailData.imdbLink,
        logger
      );
    }

    const completeMovie: Movie = {
      title: detailData.title || slug.replace(/-/g, ' '),
      year: detailData.year || 'Desconocido',
      directors: detailData.directors || 'Desconocido',
      imdbLink: detailData.imdbLink || '',
      metascore,
    };

    return { movie: completeMovie, logger: logger };
  }

  private createFallbackMovie(
    slug: string,
    logger: import('../domain/ports/LoggerService').TaskLoggerService
  ) {
    return {
      movie: {
        title: slug.replace(/-/g, ' '),
        year: 'Desconocido',
        directors: 'Desconocido',
        imdbLink: '',
        metascore: -1,
      },
      logger,
    };
  }
}
