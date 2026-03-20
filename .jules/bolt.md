## 2024-03-08 - Puppeteer Resource Optimization

**Learning:** Letterboxd and IMDb are extremely heavy on assets (images, fonts, stylesheets, and tracking media) which significantly slow down Puppeteer page loads if `waitUntil: 'networkidle2'` is used. The core HTML data needed for scraping is available much earlier.

**Action:** Implemented request interception in `src/utils.ts` (`optimizePageLoad`) to block non-essential resources (`image`, `media`, `font`, `stylesheet`) and changed `waitUntil` to `domcontentloaded` for `fetchMovieDetailsFromPage`. When optimizing scrapers, always consider blocking visual/media assets if only DOM text is required.

## $(date +%Y-%m-%d) - [Puppeteer Resource Blocking on Static Pages]

**Learning:** While the application was already blocking images, media, fonts, and stylesheets, blocking `script`, `xhr`, and `fetch` requests on static detail pages (where the required data is already present in the initial server-side rendered HTML) provides a massive performance boost (e.g. IMDb load time dropped from ~4.3s to ~0.8s, and Letterboxd detail pages from ~1.7s to ~0.3s). However, list pages that rely on JS to render dynamic content (like posters) will break if scripts are blocked.
**Action:** Always verify if the data needed for scraping is present in the initial HTML DOM. If so, selectively block `script`, `xhr`, and `fetch` requests for those specific pages, while leaving them enabled for pages that require JS rendering.

## 2024-03-20 - [Puppeteer Networkidle2 Performance Trap]

**Learning:** Using `waitUntil: 'networkidle2'` on tracker-heavy sites like Letterboxd's list pages causes Puppeteer to wait ~25s per page because tracking scripts and slow third-party requests keep the network active. Since the application explicitly uses a `waitForSelector` (`waitForMovies`) to ensure the DOM nodes for `.posteritem` are ready, waiting for network idle is completely redundant and causes a massive bottleneck.
**Action:** Always prefer `waitUntil: 'domcontentloaded'` over `networkidle2` when navigating, especially if you already have explicit element wait logic right after the navigation. This reduces load time from ~25s to <1s.
