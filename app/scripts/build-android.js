const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const raizApp = path.resolve(__dirname, '..');
const raizProjeto = path.resolve(raizApp, '..');
const ferramentas = path.join(raizApp, '.toolchain');
const androidDir = path.join(raizApp, 'android');
const saida = path.join(raizApp, 'build/android');

function definirAmbiente() {
  const env = Object.assign({}, process.env);
  const jdk = process.env.JAVA_HOME || path.join(ferramentas, 'jdk');
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(ferramentas, 'android-sdk');
  if (!fs.existsSync(jdk)) throw new Error('JDK 17 não encontrado em ' + jdk + '. Veja app/docs/build-android.md.');
  if (!fs.existsSync(sdk)) throw new Error('Android SDK não encontrado em ' + sdk + '. Veja app/docs/build-android.md.');
  env.JAVA_HOME = jdk;
  env.ANDROID_HOME = sdk;
  env.ANDROID_SDK_ROOT = sdk;
  env.PATH = path.join(jdk, 'bin') + path.delimiter + path.join(sdk, 'platform-tools') + path.delimiter + env.PATH;
  return env;
}

function executar(comando, args, env, opcoes = {}) {
  console.log('[agrotax] ' + comando + ' ' + args.join(' '));
  const resultado = spawnSync(comando, args, {
    cwd: opcoes.cwd || raizApp,
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
  if (resultado.status !== 0) throw new Error('Comando falhou: ' + comando + ' ' + args.join(' '));
}

function copiar(origem, destino) {
  if (!fs.existsSync(origem)) throw new Error('Arquivo esperado não foi gerado: ' + origem);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(origem, destino);
  console.log('[agrotax] ' + path.relative(raizProjeto, destino));
}

execFileSync(process.execPath, [path.join(__dirname, 'sync-web.js')], { cwd: raizApp, stdio: 'inherit' });
execFileSync(process.execPath, [path.join(raizApp, 'node_modules/@capacitor/cli/bin/capacitor'), 'sync', 'android'], { cwd: raizApp, stdio: 'inherit' });

const env = definirAmbiente();
const gradlew = path.join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
if (process.platform !== 'win32') fs.chmodSync(gradlew, 0o755);

executar(gradlew, [':app:assembleDebug'], env, { cwd: androidDir });
executar(gradlew, [':app:assembleRelease'], env, { cwd: androidDir });
executar(gradlew, [':app:bundleRelease'], env, { cwd: androidDir });

const apkDebug = path.join(androidDir, 'app/build/outputs/apk/debug/app-debug.apk');
const apkRelease = path.join(androidDir, 'app/build/outputs/apk/release/app-release-unsigned.apk');
const aabRelease = path.join(androidDir, 'app/build/outputs/bundle/release/app-release.aab');

copiar(apkDebug, path.join(saida, 'Agrotax.apk'));
if (fs.existsSync(apkRelease)) copiar(apkRelease, path.join(saida, 'Agrotax-release-unsigned.apk'));
if (fs.existsSync(aabRelease)) copiar(aabRelease, path.join(saida, 'Agrotax.aab'));
console.log('[agrotax] Build Android concluído.');
