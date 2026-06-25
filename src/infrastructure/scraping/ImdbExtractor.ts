import { Page } from 'puppeteer';
import { TaskLoggerService } from '../../domain/ports/LoggerService';

/**
 * Extracts and parses Metascore ratings from IMDb page DOM and JSON structures.
 */
export class ImdbExtractor {
  /**
   * Extracts the Metascore from the active IMDb page.
   * @param page The active Puppeteer page context.
   * @param taskLogger The logger to transmit execution progress steps.
   * @returns A promise resolving to the extracted Metascore, or -1 if unavailable.
   */
  public async extractMetascore(
    page: Page,
    taskLogger: TaskLoggerService
  ): Promise<number> {
    try {
      await this.waitForMetascoreElements(page);
      const hasContainer = await this.checkMetascoreExists(page);
      if (!hasContainer) {
        taskLogger.warn('⚠️ Contenedor de Metascore no hallado.');
        return -1;
      }

      await this.waitForMetascoreRender(page);
      const metascoreText = await page.evaluate(this.evaluateMetascoreDOM);
      return this.parseMetascoreText(metascoreText, taskLogger);
    } catch (error) {
      taskLogger.error('⚠️ Metascore no hallado. Error: ' + error);
      return -1;
    }
  }

  private async waitForMetascoreElements(page: Page): Promise<void> {
    await page
      .waitForFunction(
        () => {
          if (
            document.querySelector('.three-Elements, .metacritic-score-box')
          ) {
            return true;
          }
          const dataIsland = document.querySelector('script#__NEXT_DATA__');
          if (dataIsland && dataIsland.innerHTML.length > 1000) {
            try {
              JSON.parse(dataIsland.innerHTML);
              return true;
            } catch (_e) {
              return false;
            }
          }
          return false;
        },
        { timeout: 20000 }
      )
      .catch(() => {});
  }

  private async checkMetascoreExists(page: Page): Promise<boolean> {
    return page.evaluate(() => {
      const dataIsland = document.querySelector('script#__NEXT_DATA__');
      if (dataIsland && dataIsland.innerHTML.length > 1000) {
        try {
          const data = JSON.parse(dataIsland.innerHTML);
          const mc = data?.props?.pageProps?.aboveTheFoldData?.metacritic;
          if (mc !== null && mc !== undefined) {
            return true;
          }
        } catch (_e) {
          // Ignore and check DOM
        }
      }
      if (
        document.querySelector(
          '.three-Elements, .metacritic-score-box, a[href*="criticreviews"]'
        )
      ) {
        return true;
      }
      return false;
    });
  }

  private async waitForMetascoreRender(page: Page): Promise<void> {
    await page
      .waitForFunction(
        () => {
          const el = document.querySelector(
            '.three-Elements .score, .metacritic-score-box, .score-box--metacritic, a[href*="criticreviews"]'
          );
          return el && el.textContent && el.textContent.trim().length > 0;
        },
        { timeout: 3000 }
      )
      .catch(() => {});
  }

  private evaluateMetascoreDOM(): string {
    const dataIsland = document.querySelector('script#__NEXT_DATA__');
    if (dataIsland) {
      try {
        const data = JSON.parse(dataIsland.innerHTML);
        const score =
          data?.props?.pageProps?.aboveTheFoldData?.metacritic?.metascore
            ?.score;
        if (score !== undefined && score !== null && !isNaN(Number(score))) {
          return String(score);
        }
      } catch (_e) {
        // Fallback to DOM selectors
      }
    }

    const selectors = [
      'a[href*="criticreviews"] .metacritic-score-box',
      'a[href*="criticreviews"] .score',
      'span.three-Elements .score',
      '.metacritic-score-box',
      '[data-testid="score-box-metacritic"]',
      '.score-box--metacritic',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const score = el?.textContent?.trim();
      if (score && !isNaN(parseInt(score, 10))) {
        return score;
      }
    }
    return 'N/A';
  }

  private parseMetascoreText(text: string, logger: TaskLoggerService): number {
    if (text === 'N/A') {
      logger.warn('⚠️ No se encontró el Metascore.');
      return -1;
    }
    const metascore = parseInt(text, 10);
    if (isNaN(metascore)) {
      return -1;
    }
    logger.log(`✅ Metascore: ${metascore}`);
    return metascore;
  }
}
