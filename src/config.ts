import path from 'path';

export const config = {
  puppeteer: {
    headless: true,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
