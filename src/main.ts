import { UserInputController } from './presentation/cli/UserInputController';
import { BrowserCoordinator } from './infrastructure/browser/BrowserCoordinator';
import { ConsoleLogger } from './infrastructure/logging/ConsoleLogger';
import { LetterboxdCatalogProvider } from './infrastructure/scraping/LetterboxdCatalogProvider';
import { ImdbRatingProvider } from './infrastructure/scraping/ImdbRatingProvider';
import { CsvMovieStorage } from './infrastructure/storage/CsvMovieStorage';
import { ExtractCatalogUseCase } from './application/ExtractCatalogUseCase';

async function bootstrap() {
  const logger = new ConsoleLogger();
  logger.header('\n🎬 Bienvenido al Scraper de Letterboxd\n');

  const inputController = new UserInputController();
  const config = inputController.promptConfiguration();

  const browserCoordinator = new BrowserCoordinator();

  const catalogProvider = new LetterboxdCatalogProvider(
    browserCoordinator,
    logger
  );

  const ratingProvider = new ImdbRatingProvider(browserCoordinator);

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
