import { UserInputController } from './presentation/cli/UserInputController';
import { BrowserCoordinator } from './infrastructure/browser/BrowserCoordinator';
import { ConsoleLogger } from './infrastructure/logging/ConsoleLogger';
import { LetterboxdCatalogProvider } from './infrastructure/scraping/LetterboxdCatalogProvider';
import { OmdbRatingProvider } from './infrastructure/scraping/OmdbRatingProvider';
import { CsvMovieStorage } from './infrastructure/storage/CsvMovieStorage';
import { ExtractCatalogUseCase } from './application/ExtractCatalogUseCase';

/**
 * Initializes and bootstraps the main application dependencies.
 * Assembles the scraping workflow utilizing layered-architecture providers.
 */
async function bootstrap() {
  const logger = new ConsoleLogger();
  logger.header('\n🎬 Bienvenido al Scraper de Letterboxd\n');

  const inputController = new UserInputController();
  const config = inputController.promptConfiguration();

  const browserCoordinator = new BrowserCoordinator(logger);

  const catalogProvider = new LetterboxdCatalogProvider(
    browserCoordinator,
    logger
  );

  const ratingProvider = new OmdbRatingProvider();

  const storageProvider = new CsvMovieStorage();

  const extractCatalogUseCase = new ExtractCatalogUseCase(
    browserCoordinator,
    catalogProvider,
    ratingProvider,
    storageProvider,
    logger
  );

  await extractCatalogUseCase.execute(config);
}

bootstrap().catch((error) => {
  console.error('❌ Unhandled error during application execution:', error);
  process.exit(1);
});
