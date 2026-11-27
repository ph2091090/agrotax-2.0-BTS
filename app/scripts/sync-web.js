const fs = require('fs');
const path = require('path');

const raizApp = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(raizApp, 'shared/config/app.config.json'), 'utf8'));
const url = process.env.AGROTAX_URL || (config.environment === 'development' ? config.developmentUrl : config.productionUrl);

const capacitorConfig = {
  appId: 'br.com.agrotax.app',
  appName: config.appName,
  webDir: 'shared/web',
  server: {
    url,
    androidScheme: 'https',
    allowNavigation: [new URL(url).host, 'localhost', '127.0.0.1'],
    cleartext: url.startsWith('http://'),
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1600,
      backgroundColor: '#2f8f5b',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

fs.writeFileSync(path.join(raizApp, 'capacitor.config.json'), JSON.stringify(capacitorConfig, null, 2) + '\n');

const destino = path.join(raizApp, 'shared/web/mobile');
fs.mkdirSync(destino, { recursive: true });
const origem = path.join(raizApp, 'shared');
for (const arquivo of ['css/app-adapter.css', 'mobile/adapter.js', 'mobile/offline.html', 'mobile/fallback.html']) {
  fs.copyFileSync(path.join(origem, arquivo), path.join(destino, path.basename(arquivo)));
}
fs.copyFileSync(path.join(destino, 'fallback.html'), path.join(raizApp, 'shared/web/index.html'));

console.log(`[agrotax] URL ativa: ${url}`);
console.log('[agrotax] capacitor.config.json e shared/web atualizados.');
