# Build dos aplicativos AGROTAX

## Pré-requisitos

- Node.js 18 ou superior e npm.
- Dependências instaladas: `npm --prefix API install` e `npm --prefix app install`.
- Ferramentas locais já incluídas em `app/.toolchain`: JDK 17, Android SDK 34 e NSIS 3.09.
- Não é necessário Wine: o EXE é gerado como portátil e o instalador é compilado com NSIS Linux.

## Comandos

Executar sempre a partir da raiz `/home/ifmt-aluno/Downloads/agrotax-2.0-BTS-main`.

| Comando | Finalidade |
| --- | --- |
| `npm run app:assets` | Gera ícones, splash e recursos visuais. |
| `npm run app:sync` | Gera `capacitor.config.json`, sincroniza `shared/web` e roda `cap sync android`. |
| `npm run app:android` | Abre o projeto Android no Android Studio. |
| `npm run app:android:build` | Gera APK debug, APK release unsigned e AAB. |
| `npm run app:windows` | Executa o cliente Electron em modo desenvolvimento. |
| `npm run app:windows:build` | Gera `Agrotax.exe` e `Agrotax-Setup.exe`. |
| `npm run app:linux` | Executa o cliente Electron em modo desenvolvimento no Linux. |
| `npm run app:linux:build` | Gera `Agrotax.deb` e `Agrotax.AppImage`. |
| `npm run app:test` | Executa os testes de estrutura dos aplicativos. |
| `npm test` | Executa os testes da API original. |

## Saídas

| Arquivo | Descrição |
| --- | --- |
| `app/build/android/Agrotax.apk` | APK debug, instalável diretamente. |
| `app/build/android/Agrotax-release-unsigned.apk` | APK release sem assinatura. |
| `app/build/android/Agrotax.aab` | Bundle release sem assinatura, para Google Play. |
| `app/build/windows/Agrotax.exe` | Executável portátil, sem instalação. |
| `app/build/windows/Agrotax-Setup.exe` | Instalador por usuário com atalhos e desinstalação. |
| `app/build/linux/Agrotax.deb` | Pacote Debian/Ubuntu amd64 com atalho e ícones. |
| `app/build/linux/Agrotax.AppImage` | Executável portátil Linux x86_64; exige `libfuse2` para abrir. |
| `app/build/linux/Agrotax-Linux` | Lançador portátil que abre sem FUSE, usando a pasta `Agrotax-Portable/`. |

## Observações

- A URL usada pelos clientes é exclusivamente `https://agrotax.onrender.com`, extraída de `README.md`.
- Nenhum banco de dados foi copiado para os aplicativos; eles consomem a API original.
- O token administrativo continua no servidor; nenhum segredo é embutido nos clientes.
- APK release e executáveis Windows não possuem assinatura de publicação. É necessário keystore Android e certificado Authenticode para distribuição pública.
- O instalador Windows usa `%LOCALAPPDATA%\AGROTAX`, não exige administrador e cria atalhos em Área de Trabalho e Menu Iniciar.
- No Ubuntu, use `app/build/linux/Agrotax-Linux` para abrir sem instalação e sem FUSE; o `.deb` pode ser instalado com `sudo apt install ./app/build/linux/Agrotax.deb`.
- Para abrir o `.AppImage` com duplo clique, instale `libfuse2` (`sudo apt install libfuse2`) ou execute `./Agrotax.AppImage --appimage-extract-and-run`.
- Em máquinas com GPU problemática, o cliente Linux já aplica `--disable-gpu` e `--disable-dev-shm-usage` automaticamente.
- O `.deb` declara dependências padrão do Electron (`libgtk-3-0`, `libnss3`, `libsecret-1-0`, entre outras) e registra ícones em `/usr/share/icons/hicolor`.
- Em Linux sem keyring, a criptografia `safeStorage` pode ficar indisponível; nesse caso o token administrativo não é persistido, por segurança.
