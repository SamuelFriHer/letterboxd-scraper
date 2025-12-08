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

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

No es necesario instalar Node.js ni npm en tu máquina local.

## Instalación y Configuración

1. Clona este repositorio:

   ```bash
   git clone git@github.com:SamuelFriHer/letterboxd-scraper.git
   cd letterboxd-scraper
   ```

2. Crea un archivo `.env` con tu ID de usuario y grupo para evitar problemas de permisos con los archivos generados:

   ```bash
   echo "UID=$(id -u)" > .env
   echo "GID=$(id -g)" >> .env
   ```

## Uso

Para ejecutar el scraper, utiliza el siguiente comando. Esto instalará las dependencias (si no están) y ejecutará el programa:

```bash
docker compose run --rm scraper
```

Sigue las instrucciones en la terminal:

- Selecciona una opción: `popular`, `year` o `decade`.
- Si seleccionas `year`, introduce el año (por ejemplo, `2023`).
- Si seleccionas `decade`, introduce la década (por ejemplo, `1990`).
- Introduce el número de páginas a scrapear.

Los datos se guardarán en un archivo CSV dentro de la carpeta `output`.

## Mantenimiento y Desarrollo

Puedes ejecutar cualquier comando de npm utilizando `docker compose run`. Aquí tienes algunos ejemplos comunes:

### Instalar nuevas dependencias

```bash
docker compose run --rm scraper npm install <nombre-paquete>
```

### Ejecutar Linter

Para verificar el código con ESLint:

```bash
docker compose run --rm scraper npm run lint
```

### Formatear código

Para formatear el código con Prettier:

```bash
docker compose run --rm scraper npm run format
```

### Reconstruir el proyecto

Si necesitas recompilar el TypeScript manualmente:

```bash
docker compose run --rm scraper npm run build
```

## Ejemplo

Si seleccionas `year` con el año `2023` y 2 páginas, el programa generará un archivo llamado `letterboxd_year_2023.csv` con las películas que tengan un Metascore mayor a 80.

## Notas

- El programa utiliza Puppeteer en modo `headless` dentro del contenedor.
- Los archivos generados en `output` y los cambios en el código se reflejarán en tu máquina local gracias a los volúmenes de Docker.

## Contribuciones

¡Las contribuciones son bienvenidas! Si encuentras un problema o tienes una idea para mejorar el proyecto, abre un issue o envía un pull request.

## Licencia

Este proyecto está licenciado bajo la [MIT License](LICENSE).
