/**
 * Defines the parameters for the scraping execution strategy.
 */
export interface ScrapingConfiguration {
  option: string;
  yearOrDecade: string;
  pages: number;
  directorSlug?: string;
}
