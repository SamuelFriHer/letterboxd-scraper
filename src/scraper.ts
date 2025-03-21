import puppeteer from 'puppeteer';
import fs from 'fs';
import Papa from 'papaparse';

// Obtener argumentos de la línea de comandos
const args = process.argv.slice(2);
let filterType = 'popular';
let filterValue = '';
let maxPages = 1;

// Manejar casos de argumentos
if (args.length === 1) {
  // Solo "popular" o número de páginas
  if (!isNaN(parseInt(args[0]))) {
    maxPages = parseInt(args[0]);
  } else {
    filterType = args[0];
  }
} else if (args.length === 2) {
  if (!isNaN(parseInt(args[1]))) {
    filterType = args[0];
    maxPages = parseInt(args[1]);
  } else {
    filterType = args[0];
    filterValue = args[1];
  }
} else if (args.length === 3) {
  filterType = args[0];
  filterValue = args[1];
  maxPages = parseInt(args[2]);
}

async function scrapeLetterboxd() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  let baseUrl = 'https://letterboxd.com/films/popular/';
  if (filterType === 'year' && filterValue) {
    baseUrl = `https://letterboxd.com/films/year/${filterValue}/`;
  } else if (filterType === 'decade' && filterValue) {
    baseUrl = `https://letterboxd.com/films/decade/${filterValue}s/`;
  }

  let films: { title: string; year: string; rating: string }[] = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const url = `${baseUrl}page/${pageNum}/`;
    console.log(`🔎 Scrapeando: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    const newFilms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.poster-container')).map((el) => {
        const titleElement = el.querySelector('.frame-title') as HTMLElement;
        let title = titleElement ? titleElement.innerText.trim() : 'Desconocido';

        const yearMatch = title.match(/\((\d{4})\)$/);
        const year = yearMatch ? yearMatch[1] : 'Desconocido';
        title = title.replace(/\(\d{4}\)$/, '').trim();

        const rating = el.getAttribute('data-average-rating') || 'N/A';

        return { title, year, rating };
      });
    });

    films = films.concat(newFilms);
    console.log(`📌 Página ${pageNum} scrapeada: ${newFilms.length} películas.`);
  }

  console.log(`✅ Total de películas obtenidas: ${films.length}`);

  const csv = Papa.unparse(films);
  const fileName = `films_${filterType}${filterValue ? '_' + filterValue : ''}_p${maxPages}.csv`;
  fs.writeFileSync(fileName, csv, 'utf-8');
  console.log(`📁 Archivo '${fileName}' guardado correctamente.`);

  await browser.close();
}

scrapeLetterboxd();
