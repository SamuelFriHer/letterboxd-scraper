import path from 'path';

/**
 * Objeto de configuración global de la aplicación.
 * Define parámetros de Puppeteer, límites de reintentos, 
 * rutas de salida y tiempos de espera para las operaciones de scraping.
 */
export const config = {
  puppeteer: {
    headless: true,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: ['--disable-dev-shm-usage'],
  },
  timeouts: {
    selector: 10000,
    pageLoad: 60000,
    retryBase: 5000,
  },
  retries: {
    max: 3,
  },
  paths: {
    output: path.resolve(__dirname, '../output'),
  },
};
