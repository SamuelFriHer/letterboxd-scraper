# Letterboxd Scraper

## Descripción

`letterboxd-scraper` es una herramienta para scrapear información de películas desde [Letterboxd](https://letterboxd.com). Permite obtener detalles como el título, año, directores y Metascore de películas populares, por año o por década, y guardar los resultados en un archivo CSV.

## Características

- Scrapea películas populares, por año o por década desde Letterboxd.
- Obtiene detalles de cada película, incluyendo:
  - Título
  - Año de lanzamiento
  - Directores
  - Metascore (si está disponible en IMDb)
- Filtra películas con un Metascore mayor a 80.
- Guarda los resultados en un archivo CSV.

## Requisitos

- Node.js (v16 o superior)
- npm o yarn
- [Puppeteer](https://pptr.dev) para la automatización del navegador.

## Instalación

1. Clona este repositorio:

   ```bash
   git clone https://github.com/SamuelFriHer/letterboxd-scraper.git
   cd letterboxd-scraper
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

## Uso

1. Ejecuta el programa:

   ```bash
   npm start
   ```

2. Sigue las instrucciones en la terminal:

   - Selecciona una opción: `popular`, `year` o `decade`.
   - Si seleccionas `year`, introduce el año (por ejemplo, `2023`).
   - Si seleccionas `decade`, introduce la década (por ejemplo, `1990`).
   - Introduce el número de páginas a scrapear.

3. Los datos se guardarán en un archivo CSV dentro de la carpeta `output`.

## Ejemplo

Si seleccionas `year` con el año `2023` y 2 páginas, el programa generará un archivo llamado `letterboxd_year_2023.csv` con las películas que tengan un Metascore mayor a 80.

## Notas

- El programa utiliza Puppeteer en modo `headless` para navegar por las páginas de Letterboxd e IMDb.
- Si no se encuentra un Metascore para una película, se asignará un valor de `-1`.

## Contribuciones

¡Las contribuciones son bienvenidas! Si encuentras un problema o tienes una idea para mejorar el proyecto, abre un issue o envía un pull request.

## Licencia

Este proyecto está licenciado bajo la [MIT License](LICENSE).
