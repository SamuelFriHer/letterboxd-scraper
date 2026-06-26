import { Movie } from '../domain/models/Movie';
import { ScrapingConfiguration } from '../domain/models/ScrapingConfiguration';
import { CatalogProvider } from '../domain/ports/CatalogProvider';
import { RatingProvider } from '../domain/ports/RatingProvider';
import { MovieStorage } from '../domain/ports/MovieStorage';
import {
  LoggerService,
  TaskLoggerService,
} from '../domain/ports/LoggerService';
import { BrowserCoordinator } from '../infrastructure/browser/BrowserCoordinator';
import { AppConfiguration } from '../config/AppConfiguration';

/**
 * Application use case orchestrating the complete catalog scraping workflow.
 */
export class ExtractCatalogUseCase {
  constructor(
    private browserCoordinator: BrowserCoordinator,
    private catalogProvider: CatalogProvider,
    private ratingProvider: RatingProvider,
    private movieStorage: MovieStorage,
    private logger: LoggerService
  ) {}

  /**
   * Executes the full scraping process based on the specified input parameters.
   * @param config The requested scraping configuration attributes.
   * @returns A promise that resolves when the overall process finalizes successfully.
   */
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

  private async scrapeSingleMovie(
    url: string
  ): Promise<{ movie: Movie; logger: TaskLoggerService }> {
    const slug = url.split('/film/')[1]?.replace('/', '') || 'desconocido';
    const taskLogger = this.logger.createTaskLogger(slug);
    const config = AppConfiguration.getInstance();
    const maxRetries = config.scraping.catalog.maxRetries;
    const retryDelay = config.scraping.catalog.retryDelay;

    for (let retries = 0; retries <= maxRetries; retries++) {
      try {
        return await this.tryMovieExtraction(url, slug, taskLogger);
      } catch (_error) {
        await this.browserCoordinator.cleanupPage();
        if (retries < maxRetries) {
          taskLogger.warn(`⚠️ Retry ${retries}/${maxRetries} for ${slug}...`);
          await new Promise((resolve) =>
            setTimeout(resolve, retries * retryDelay)
          );
        }
      }
    }

    taskLogger.error(`❌ Failed: ${slug}`);
    return this.createFallbackMovie(slug, taskLogger);
  }

  private async tryMovieExtraction(
    url: string,
    slug: string,
    logger: TaskLoggerService
  ): Promise<{ movie: Movie; logger: TaskLoggerService }> {
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
    logger: TaskLoggerService
  ): { movie: Movie; logger: TaskLoggerService } {
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
