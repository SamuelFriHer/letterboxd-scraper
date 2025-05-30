import fs from 'fs';
import { createObjectCsvWriter } from 'csv-writer';
import readlineSync from 'readline-sync';
import puppeteer, { Browser } from 'puppeteer';
import path from 'path';

interface MovieDetails {
  title: string;
  year: string;
  directors: string;
  imdbLink: string;
  metascore: number;
}

/**
 * Función para obtener el input del usuario.
 */
function getUserInput() {
  const option = readlineSync.question('Selecciona una opción (popular, year, decade): ').toLowerCase();

  let yearOrDecade = '';
  if (option === 'year') {
    yearOrDecade = readlineSync.question('Introduce el año (ej. 2023): ');
  } else if (option === 'decade') {
    yearOrDecade = readlineSync.question('Introduce la década (ej. 1990): ');
  }

  const pages = readlineSync.questionInt('Número de páginas a scrapear: ');

  return { option, yearOrDecade, pages };
}

/**
 * Construye la URL de Letterboxd según la opción elegida.
 */
function buildLetterboxdUrl(option: string, yearOrDecade: string, page: number): string {
  let url = 'https://letterboxd.com/films/';

  if (option === 'year') {
    url += `year/${yearOrDecade}/`;
  } else if (option === 'decade') {
    url += `popular/decade/${yearOrDecade}s/`;
  } else {
    url += 'popular/';
  }

  if (page > 1) {
    url += `page/${page}/`;
  }

  return url;
}

/**
 * Scrapea una página de Letterboxd para obtener películas.
 */
async function scrapeLetterboxdPage(url: string) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  await page.waitForSelector('.poster-container', { timeout: 10000 });

  const movies = await page.evaluate(() => {
    const movieElements = document.querySelectorAll('.poster-container');
    const movieList: { title: string; link: string }[] = [];

    movieElements.forEach((movie) => {
      const titleElement = movie.querySelector('.frame-title');
      const linkElement = movie.querySelector('a.frame');

      const title = titleElement?.textContent?.trim();
      const link = linkElement?.getAttribute('href');

      if (title && link) {
        movieList.push({
          title,
          link: `https://letterboxd.com${link}`,
        });
      }
    });

    return movieList;
  });

  await browser.close();
  return movies;
}

/**
 * Scrapea los detalles de una película en Letterboxd.
 */
async function scrapeMovieDetails(url: string, browser: Browser) {
  const slug = url.split('/film/')[1]?.replace('/', '') || 'desconocido';
  console.log(`\n🎬 Scrapeando: ${slug}`);

  const MAX_RETRIES = 3;
  let retries = 0;

  while (retries <= MAX_RETRIES) {
    try {
      const page = await browser.newPage();

      // Incrementar el timeout para la navegación
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000, // Incrementar a 60 segundos
      });

      const movieDetails: MovieDetails = await page.evaluate(() => {
        const titleElement = document.querySelector('h1.headline-1 span.name');
        const yearElement = document.querySelector('div.releaseyear a');
        const directorsElements = document.querySelectorAll('.directorlist a');
        const imdbElement = document.querySelector("a[href*='imdb.com/title']");

        const title = titleElement?.textContent?.trim() || 'Desconocido';
        const year = yearElement?.textContent?.trim() || 'Desconocido';

        const directors = Array.from(directorsElements)
          .map((dir) => dir.textContent?.trim())
          .filter(Boolean)
          .join(', ');

        let imdbLink = imdbElement?.getAttribute('href') || '';
        if (imdbLink.startsWith('/')) {
          imdbLink = `https://www.imdb.com${imdbLink}`;
        }
        imdbLink = imdbLink.replace('/maindetails', '/');

        return { title, year, directors, imdbLink, metascore: -1 };
      });

      if (movieDetails.imdbLink) {
        movieDetails.metascore = await getMetascore(movieDetails.imdbLink, browser);
      }

      await page.close();
      return movieDetails;
    } catch (error) {
      retries++;

      // Cerrar la página si se produjo un error durante la navegación
      try {
        const pages = await browser.pages();
        const lastPage = pages[pages.length - 1];
        await lastPage.close();
      } catch (e) {
        // Ignorar errores al intentar cerrar la página
      }

      if (retries <= MAX_RETRIES) {
        const waitTime = retries * 5000; // Espera incremental: 5s, 10s, 15s
        console.log(
          `⚠️ Error al cargar ${slug}. Reintento ${retries}/${MAX_RETRIES} en ${waitTime / 1000} segundos...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        console.log(`❌ No se pudo cargar ${slug} después de ${MAX_RETRIES} intentos.`);
        // Devolver datos parciales para no perder toda la película
        return {
          title: slug.replace(/-/g, ' '),
          year: 'Desconocido',
          directors: 'Desconocido',
          imdbLink: '',
          metascore: -1,
        };
      }
    }
  }

  // Nunca debería llegar aquí, pero TypeScript necesita un retorno
  return {
    title: slug.replace(/-/g, ' '),
    year: 'Desconocido',
    directors: 'Desconocido',
    imdbLink: '',
    metascore: -1,
  };
}

/**
 * Obtiene el Metascore de IMDb.
 */
async function getMetascore(imdbUrl: string, browser: Browser): Promise<number> {
  console.log(`🔍 Buscando Metascore en IMDb...`);

  const MAX_RETRIES = 2;
  let retries = 0;

  while (retries <= MAX_RETRIES) {
    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      );

      await page.goto(imdbUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 45000, // 45 segundos de timeout
      });

      try {
        const metascoreText = await page.$eval('.metacritic-score-box', (el) => el.textContent?.trim() || 'N/A');

        const metascore = parseInt(metascoreText, 10);
        console.log(`✅ Metascore: ${metascore}`);

        await page.close();
        return isNaN(metascore) ? -1 : metascore;
      } catch (error) {
        console.log('⚠️ No se encontró el Metascore.');
        await page.close();
        return -1;
      }
    } catch (error) {
      retries++;

      // Cerrar la página si se produjo un error
      try {
        const pages = await browser.pages();
        const lastPage = pages[pages.length - 1];
        await lastPage.close();
      } catch (e) {
        // Ignorar errores al intentar cerrar la página
      }

      if (retries <= MAX_RETRIES) {
        const waitTime = retries * 3000; // 3s, 6s
        console.log(`⚠️ Error al cargar IMDb. Reintento ${retries}/${MAX_RETRIES} en ${waitTime / 1000} segundos...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        console.log(`❌ No se pudo cargar IMDb después de ${MAX_RETRIES} intentos.`);
        return -1;
      }
    }
  }

  return -1;
}

/**
 * Guarda los datos en CSV, filtrando solo las películas con Metascore > 80.
 */
async function saveToCSV(movies: MovieDetails[], filename: string) {
  if (!fs.existsSync('output')) {
    fs.mkdirSync('output');
  }

  const filteredMovies = movies.filter((movie) => movie.metascore > 80);

  if (filteredMovies.length === 0) {
    console.log('⚠️ Ninguna película tiene Metascore > 80. No se guardará el CSV.');
    return;
  }

  const csvWriter = createObjectCsvWriter({
    path: path.join('output', filename),
    header: [
      { id: 'title', title: 'Título' },
      { id: 'year', title: 'Año' },
      { id: 'directors', title: 'Directores' },
      { id: 'metascore', title: 'Metascore' },
    ],
  });

  await csvWriter.writeRecords(filteredMovies);
  console.log(`\n✅ Datos guardados en output/${filename}`);
}

/**
 * Función principal.
 */
async function main() {
  console.log('🎬 Bienvenido al Scraper de Letterboxd');

  const { option, yearOrDecade, pages } = getUserInput();
  const browser = await puppeteer.launch({ headless: true });

  const movies: MovieDetails[] = [];

  for (let page = 1; page <= pages; page++) {
    const url = buildLetterboxdUrl(option, yearOrDecade, page);
    console.log(`\n📄 Explorando página ${page} de ${pages}: ${url}`);

    const movieLinks = await scrapeLetterboxdPage(url);
    for (let i = 0; i < movieLinks.length; i++) {
      console.log(`\n📽️ Película ${i + 1} de ${movieLinks.length}`);
      const details = await scrapeMovieDetails(movieLinks[i].link, browser);
      movies.push(details);
    }
  }

  await browser.close();

  const filename = `letterboxd_${option}${yearOrDecade ? `_${yearOrDecade}` : ''}.csv`;
  await saveToCSV(movies, filename);

  console.log('✅ Scraping finalizado.');
}

// Ejecutar
main();
