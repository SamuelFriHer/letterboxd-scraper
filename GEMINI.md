# GEMINI.md - Letterboxd Scraper

## Project Overview

`letterboxd-scraper` is a Node.js/TypeScript application designed to scrape movie information from [Letterboxd](https://letterboxd.com). It allows users to fetch details about popular movies, or movies filtered by a specific year or decade.

### Key Features

- **Scraping:** Uses Puppeteer (with `puppeteer-extra-plugin-stealth`) to navigate Letterboxd.
- **Data Extraction:** Collects movie titles, release years, directors, and IMDb links.
- **IMDb Integration:** Navigates to IMDb via the extracted link to fetch the movie's Metascore.
- **Filtering & Output:** Specifically filters for movies with high Metascores and saves the collected data into CSV files within the `output/` directory.
- **Interactive CLI:** Prompts the user for scraping parameters (type of search, year/decade, number of pages).

### Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **Scraping:** Puppeteer, Puppeteer Extra Stealth
- **Data Export:** `csv-writer`
- **Environment:** Docker-based development and execution.

---

## Building and Running

The project is designed to be run within a Docker container to ensure environment consistency and handle Puppeteer dependencies easily.

### Primary Commands (via Docker)

- **Run Scraper:** `docker compose run --rm scraper` (Interactively starts the scraping process).
- **Build Project:** `docker compose run --rm scraper npm run build` (Compiles TypeScript to `dist/`).
- **Lint Code:** `docker compose run --rm scraper npm run lint`
- **Format Code:** `docker compose run --rm scraper npm run format`

### Local NPM Scripts (if Node.js is installed)

- `npm run build`: Compiles TypeScript.
- `npm run start`: Compiles and runs the entry point (`dist/index.js`).
- `npm run lint`: Executes ESLint.
- `npm run format`: Executes Prettier.

---

## Project Structure and Architecture

- **`src/index.ts`**: The main entry point. Orchestrates user input, browser initialization, and the high-level scraping loop.
- **`src/letterboxd.ts`**: Contains logic for scraping Letterboxd list pages and individual film pages. Implements retry logic and error handling for navigation.
- **`src/imdb.ts`**: Handles navigation to IMDb to extract Metascore information.
- **`src/scraping_utils.ts`**: Low-level Puppeteer helpers (cookie consent handling, element waiting, DOM extraction).
- **`src/input.ts`**: Manages interactive CLI prompts using `readline-sync`.
- **`src/output.ts`**: Logic for writing `MovieDetails` objects to CSV files.
- **`src/config.ts`**: Centralized configuration for Puppeteer (headless mode, args, etc.).
- **`src/types.ts`**: Shared TypeScript interfaces (e.g., `MovieDetails`, `MovieLink`).
- **`src/utils.ts`**: Helper functions for array chunking, delay, and data cleanup.
- **`src/logger.ts`**: Formatted console logging.

---

## Development Conventions

- **Type Safety:** All data structures should be typed in `src/types.ts`.
- **Bot Detection:** Always use the stealth plugin and respect the batching/retry logic defined in `src/index.ts` and `src/letterboxd.ts` to avoid being blocked.
- **Error Handling:** Puppeteer operations are wrapped in try-catch blocks with retries for resilience against network or timeout issues.
- **Output:** All scraped data must be stored in the `output/` directory, which is mapped as a volume in Docker.
- **Code Style:** Strictly follow the ESLint and Prettier configurations defined in the root.
