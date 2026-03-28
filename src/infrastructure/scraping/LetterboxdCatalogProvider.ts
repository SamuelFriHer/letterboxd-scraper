import { Page } from 'puppeteer';
import { CatalogProvider } from '../../domain/ports/CatalogProvider';
import { Movie } from '../../domain/models/Movie';
import { LoggerService } from '../../domain/ports/LoggerService';
import { BrowserCoordinator } from '../browser/BrowserCoordinator';

export class LetterboxdCatalogProvider implements CatalogProvider {
  constructor(
    private browserCoordinator: BrowserCoordinator,
    private logger: LoggerService
  ) {}

  public async exploreCatalogPage(
    url: string
  ): Promise<{ title: string; link: string }[]> {
    this.browserCoordinator.validateSafeUrl(url, 'letterboxd.com');
    const page = await this.browserCoordinator.openOptimizedPage();

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.handleCookieConsent(page);
    await this.waitForMovies(page);

    const movies = await this.extractMoviesFromPage(page);
    await page.close();

    return movies;
  }

  public async getMovieDetails(
    url: string
  ): Promise<Partial<Movie> & { imdbLink?: string }> {
    this.browserCoordinator.validateSafeUrl(url, 'letterboxd.com');
    const page = await this.browserCoordinator.openDetailsOptimizedPage();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const imdbLink = await this.extractImdbLink(page);
      const details = await this.extractBasicMovieDetails(page);
      await page.close();
      return { ...details, imdbLink };
    } catch (e) {
      await page.close();
      throw e;
    }
  }

  private async handleCookieConsent(page: Page): Promise<void> {
    try {
      const consentButton = await page.$('.fc-cta-consent');
      if (consentButton) {
        this.logger.log('🍪 Diálogo de consentimiento detectado. Aceptando...');
        await consentButton.click();
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (_e) {
      // Ignore errors when cookies are not present
    }
  }

  private async waitForMovies(page: Page): Promise<void> {
    try {
      await page.waitForSelector('.posteritem, .tooltip.griditem', {
        timeout: 30000,
      });
    } catch (error) {
      this.logger.error('❌ Error: Timeout buscando películas.');
      throw error;
    }
  }

  private async extractMoviesFromPage(
    page: Page
  ): Promise<{ title: string; link: string }[]> {
    return page.evaluate(() => {
      const movieElements = document.querySelectorAll(
        '.posteritem, .tooltip.griditem'
      );
      const movieList: { title: string; link: string }[] = [];

      movieElements.forEach((movie) => {
        const component = movie.querySelector('.react-component');
        if (component) {
          const title = component.getAttribute('data-item-name') || '';
          const link = component.getAttribute('data-item-link') || '';
          if (title && link) {
            movieList.push({ title, link: `https://letterboxd.com${link}` });
          }
        }
      });
      return movieList;
    });
  }

  private async extractImdbLink(page: Page): Promise<string> {
    let link = await page.evaluate(() => {
      const el = document.querySelector("a[href*='imdb.com/title']");
      if (el) return el.getAttribute('href') || '';

      const links = Array.from(document.querySelectorAll('a'));
      const imdbFound = links.find((a) => a.href.includes('imdb.com/title/'));
      return imdbFound?.href || '';
    });

    if (link && link.startsWith('/')) {
      link = `https://www.imdb.com${link}`;
    }
    return this.validateImdbUrl(link);
  }

  private validateImdbUrl(url: string): string {
    if (!url) return '';
    try {
      const parsedUrl = new URL(url);
      const isHttp = ['http:', 'https:'].includes(parsedUrl.protocol);
      const isImdb =
        parsedUrl.hostname === 'imdb.com' ||
        parsedUrl.hostname.endsWith('.imdb.com');

      if (!isHttp || !isImdb) {
        this.logger.warn(`⚠️ Enlace de IMDb no seguro ignorado: ${url}`);
        return '';
      }
    } catch (_e) {
      return '';
    }
    return url.replace('/maindetails', '/');
  }

  private async extractBasicMovieDetails(page: Page): Promise<Partial<Movie>> {
    return page.evaluate(() => {
      const titleElement = document.querySelector(
        'h1.headline-1.primaryname span.name'
      );
      const yearElement = document.querySelector('span.releasedate a');
      const directorsElements = document.querySelectorAll(
        '.credits a.contributor[href^="/director/"]'
      );

      const title = titleElement?.textContent?.trim() || 'Desconocido';
      const year = yearElement?.textContent?.trim() || 'Desconocido';
      const directors = Array.from(directorsElements)
        .map((dir) => dir.textContent?.trim())
        .filter(Boolean)
        .join(', ');

      return { title, year, directors };
    });
  }
}
