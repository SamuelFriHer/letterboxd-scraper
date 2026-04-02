# Letterboxd Scraper

## Overview

`letterboxd-scraper` is a tool for scraping movie information from [Letterboxd](https://letterboxd.com). It allows you to gather details such as title, release year, directors, and Metascore for popular movies, movies from a specific year or decade, or movies from a specific director. The results are filtered (only movies with a Metascore > 80) and seamlessly saved into organized CSV files.

## Features

- Scrape movies by defining criteria: `popular`, `year`, `decade`, or `director`.
- Extracted details include:
  - Title
  - Release Year
  - Directors
  - Metascore (retrieved dynamically from IMDb, including cookie consent handling).
- **Filtering:** Automatically filters out movies with a Metascore of 80 or lower.
- **Smart Output Organization:** Results are exported as CSV files and neatly organized into dedicated output subdirectories (e.g., `output/year/`, `output/decade/`, `output/director/`).
- **Clean Architecture:** Built with a strict layered architecture (Domain, Application, Infrastructure, Presentation), utilizing Object-Oriented Programming and Dependency Injection for high maintainability.
- **Code Documentation:** Fully documented TypeDoc API integration for clear developer onboarding.
- **Unit Testing:** Comprehensive test suite powered by Jest, enforcing 100% strict type safety.
- **Continuous Integration:** Automated build, linting, formatting, and testing pipelines driven by GitHub Actions.

## Requirements

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

Node.js and npm are **not** required to be installed on your local machine, as the app is containerized.

## Installation and Setup

1. Clone this repository:

   ```bash
   git clone git@github.com:SamuelFriHer/letterboxd-scraper.git
   cd letterboxd-scraper
   ```

2. Create a `.env` file with your user and group IDs to avoid file permission issues with the generated output and documentation files:

   ```bash
   echo "UID=$(id -u)" > .env
   echo "GID=$(id -g)" >> .env
   ```

## Usage

To run the scraper, execute the following command. This will initialize the container, install dependencies if necessary, and start the interactive program:

```bash
docker compose run --rm scraper
```

Follow the interactive prompts in the terminal:

- Select an option: `popular`, `year`, `decade`, or `director`.
- If `year` is selected, enter the year (e.g., `2023`).
- If `decade` is selected, enter the decade (e.g., `1990`).
- If `director` is selected, enter the last part of their Letterboxd URL (e.g., `paul-thomas-anderson`).
- Enter the number of pages to scrape (for non-director options).

The extracted data will be saved in a corresponding directory inside the `output` folder.

## Development and Maintenance

You can run any npm command inside the container using `docker compose run`.

### Running Tests

To execute the unit test suite via Jest:

```bash
docker compose run --rm scraper npm run test
```

### Generating Documentation

To generate TypeDoc documentation from the source code:

```bash
docker compose run --rm scraper npm run docs
```

The documentation will be generated in the `docs/` folder.

### Adding Dependencies

```bash
docker compose run --rm scraper npm install <package-name>
```

### Running the Linter

To verify code formatting with ESLint:

```bash
docker compose run --rm scraper npm run lint
```

### Formatting Code

To format the code using Prettier:

```bash
docker compose run --rm scraper npm run format
```

### Rebuilding the Project

To compile the TypeScript code manually:

```bash
docker compose run --rm scraper npm run build
```

## Example Walkthrough

If you select `director` and input `paul-thomas-anderson`, the program will scrape the director's page, extract all featured movies, bypass any IMDb cookie banners, look up their Metascores, and generate an intuitively named CSV log in `output/director/` containing all his films holding a Metascore strictly above 80.

## Notes

- The project controls Puppeteer in `headless` mode.
- Output artifacts (CSV files, TypeDoc HTML docs) and live code modifications are mirrored instantly to your local machine via Docker volumes.

## Contributing

Contributions are welcome! If you find an issue or have an improvement suggestion, feel free to open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
