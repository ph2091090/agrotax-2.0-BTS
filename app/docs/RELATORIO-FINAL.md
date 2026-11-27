# Relatório final — adaptação multiplataforma AGROTAX

## Objetivo

Transformar o site AGROTAX existente em clientes para Android, Windows e Linux/Ubuntu, preservando integralmente o site, a API, o banco de dados, as regras de cálculo e a identidade visual originais.

## Decisões técnicas

- **Android:** Capacitor 6, pacote `br.com.agrotax.app`, WebView com `MainActivity` customizada.
- **Windows:** Electron 30 com Electron Builder 24, executável portátil e instalador NSIS, isolamento de contexto, sandbox e `nodeIntegration` desativado.
- **Linux/Ubuntu:** o mesmo cliente Electron gera pacote `.deb` amd64 e AppImage x86_64, com ícones hicolor e atalho de aplicativo.
- **Backend:** nenhuma duplicação. Os clientes consomem a API original em `https://agrotax.onrender.com`.
- **Autenticação:** token administrativo permanece no servidor e é guardado nos clientes desktop com `safeStorage`; no Android permanece no `sessionStorage` da WebView.
- **URL:** apenas a URL documentada em `README.md:9` foi utilizada; nenhum endpoint foi inventado.
- **Build Windows sem Wine:** como o ambiente não possui Wine funcional, o Electron Builder foi configurado para gerar somente o executável portátil sem edição de PE. Ícone e metadados de versão foram aplicados com `resedit`, e o instalador foi compilado com NSIS Linux local.

## Estrutura criada

- `app/shared/config/app.config.json`: configuração compartilhada por Android, Windows e Linux.
- `app/shared/web`, `app/shared/css/app-adapter.css`, `app/shared/mobile/adapter.js`: camada comum de adaptação visual e recursos nativos.
- `app/android`: projeto Capacitor/Android com ícones adaptativos, splash e `MainActivity.java`.
- `app/windows`: base Electron compartilhada por Windows e Linux, com janela principal, splash, tela offline, preload seguro, IPC limitado e persistência criptografada.
- `app/scripts`: geração de assets, sincronização, builds Android/Windows/Linux, marcação de PE, instalador NSIS e empacotamento Debian/AppImage.
- `app/tests`: testes automatizados de estrutura, segurança e integridade dos originais.
- `app/backup`: cópia integral do frontend e de arquivos críticos da API antes de qualquer empacotamento.
- `app/.toolchain`: JDK 17, Android SDK 34 e NSIS 3.09 instalados localmente; Electron Builder baixa as ferramentas AppImage/FPM sob demanda.
- `app/assets/linux`: ícones PNG 16 a 512 px para integração com o ambiente de área de trabalho Linux.

## Recursos nativos implementados

- Android: câmera/galeria via Capacitor Camera, compartilhamento, download de arquivos via Filesystem, notificações locais, Preferences, Browser, Network, App e detecção de conexão com tela offline.
- Windows: `contextBridge` restrito, validação de navegação e links externos, downloads para pasta de Downloads, notificações do sistema, impressão, salvamento de texto, sessão administrativa criptografada e persistência do tamanho/posição da janela.
- Linux: os mesmos recursos do Electron, com ícone PNG nativo, nome de aplicativo AGROTAX, atalho no menu e `plataforma` reportada dinamicamente como `linux`.
- Ambos: tabs de navegação adaptadas, tratamento de timeout de requisição, aviso de conexão e suporte a idiomas português/espanhol.

## Validação executada

- `npm run app:android:build`: concluído.
- `npm run app:windows:build`: concluído.
- `npm run app:linux:build`: concluído.
- `npm run app:test`: 13/13 testes aprovados.
- `npm test`: 31/31 testes da API aprovados após `npm --prefix API install`.
- Integridade dos originais: `app/backup/front-end/index.html` é idêntico a `front-end/index.html`.
- Ícone e versão `2.1.0.0` confirmados por leitura dos recursos PE em `Agrotax.exe` e `Agrotax-Setup.exe`.
- Correção de inicialização desktop: `app.getPath('resources')` foi substituído por `process.resourcesPath`; o binário Linux agora permanece em execução após a abertura.
- Correção de GPU/Linux: `--disable-gpu` e `--disable-dev-shm-usage` aplicados automaticamente em builds empacotados, evitando `GPU process isn't usable. Goodbye.`
- `dpkg-deb -I Agrotax.deb`: pacote `agrotax-apps` 2.1.0, arquitetura `amd64`, homepage oficial e dependências Electron.
- AppImage identificado como ELF x86_64 e respondendo a `--appimage-version`; foi detectado que a abertura direta exige `libfuse.so.2`.
- `Agrotax-Linux` foi validado em execução real neste ambiente, permanecendo ativo após a abertura sem FUSE.

## Artefatos

| Artefato | Tamanho | SHA-256 |
| --- | --- | --- |
| `app/build/android/Agrotax.apk` | 6,0 MB | `64cfc0b9cb70d7f66a164a3d84f308ad8224975bc38f3513ef659a6fe3348d9a` |
| `app/build/android/Agrotax-release-unsigned.apk` | 4,8 MB | `f8900e105bb85acf0aa150ea622054744134292c8fd2c626ffc779a92e59a611` |
| `app/build/android/Agrotax.aab` | 4,2 MB | `a176f2eb2daa53c1186f692d4b9dae64f480ef2e102e4011667d38b743b55f2e` |
| `app/build/windows/Agrotax.exe` | 68 MB | `d2105047c91f1a6aa6706116dca2528bf17013a343e6d84e74732fb9f46ceae9` |
| `app/build/windows/Agrotax-Setup.exe` | 77 MB | `ed69adca9893f87e0cf9acb256fee3466ada5d7c9942a7dd1a83b38d8f9cd98b` |
| `app/build/linux/Agrotax.deb` | 71 MB | `03c7098270e18d0418a05f812fa55fe84475a4cbd134ecdb79791858ccd6014e` |
| `app/build/linux/Agrotax.AppImage` | 103 MB | `7a16e711d6eccf43d36bb700855ba60c9ec320f9d13121e846669d760e55d082` |
| `app/build/linux/Agrotax-Linux` | 124 bytes | `4b7864e69f474f7bb4d4de44154d6e4ea467b74f36d00b50987b1ac3b6fe5c9d` |

## Limitações e próximos passos

- APK release, AAB e executáveis Windows não estão assinados. Para publicação são necessários keystore Android e certificado Authenticode.
- O `.deb` não é assinado com chave GPG; para um repositório APT público seria necessário assinar o pacote.
- Não foi possível executar o APK em um dispositivo Android ou instalar o EXE em uma máquina Windows dentro deste ambiente; a validação foi estrutural e de build.
- O AppImage exige `libfuse2` no Ubuntu; sem ele, use `Agrotax-Linux` ou `./Agrotax.AppImage --appimage-extract-and-run`.
- O funcionamento completo depende da API em produção estar disponível em `https://agrotax.onrender.com`.
- Permissões de câmera, notificações e rede são solicitadas somente quando o recurso é usado.
- O instalador Windows é por usuário e instala em `%LOCALAPPDATA%\AGROTAX`; instalação por máquina exigiria elevação de privilégio.
- Em Linux sem keyring, a criptografia `safeStorage` pode ficar indisponível; o token administrativo não é persistido nesse caso.

## Conclusão

Os aplicativos Android, Windows e Linux/Ubuntu foram gerados com sucesso a partir do site original, sem alterar seus arquivos e sem duplicar backend ou banco. O APK debug, o EXE portátil, o instalador Windows, o `.deb`, o AppImage e o lançador Linux sem FUSE estão prontos. As pendências restantes são assinatura para distribuição pública e testes em dispositivos/ambientes gráficos reais.
