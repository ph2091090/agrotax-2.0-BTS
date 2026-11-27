const fs = require('fs');
const path = require('path');

async function marcaExecutavel(caminhoExe, caminhoIco, config) {
  const ResEdit = await import('resedit');
  const buffer = fs.readFileSync(caminhoExe);
  const exe = ResEdit.NtExecutable.from(buffer);
  const recursos = ResEdit.NtExecutableResource.from(exe);

  const arquivoIcones = ResEdit.Data.IconFile.from(fs.readFileSync(caminhoIco));
  const grupos = ResEdit.Resource.IconGroupEntry.fromEntries(recursos.entries);
  const idIcone = grupos.length ? grupos[0].id : 1;
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    recursos.entries,
    idIcone,
    1033,
    arquivoIcones.icons.map((item) => item.data)
  );

  const versoes = ResEdit.Resource.VersionInfo.fromEntries(recursos.entries);
  const versao = versoes.length ? versoes[0] : ResEdit.Resource.VersionInfo.createEmpty();
  versao.setFileVersion(config.maior, config.menor, config.patch, 0, 1033);
  versao.setProductVersion(config.maior, config.menor, config.patch, 0, 1033);
  versao.setStringValues({ lang: 1033, codepage: 1200 }, {
    CompanyName: config.empresa,
    FileDescription: config.descricao,
    FileVersion: config.texto,
    InternalName: config.nomeInterno,
    LegalCopyright: config.copyright,
    OriginalFilename: path.basename(caminhoExe),
    ProductName: config.produto,
    ProductVersion: config.texto,
  });
  versao.outputToResourceEntries(recursos.entries);

  recursos.outputResource(exe);
  fs.writeFileSync(caminhoExe, Buffer.from(exe.generate()));
  console.log('[agrotax] ícone e versão aplicados: ' + path.basename(caminhoExe));
}

module.exports = { marcaExecutavel };

if (require.main === module) {
  const [, , exe, ico] = process.argv;
  if (!exe || !ico) {
    console.error('Uso: node mark-exe.js <exe> <ico>');
    process.exit(1);
  }
  marcaExecutavel(exe, ico, {
    maior: 2,
    menor: 1,
    patch: 0,
    texto: '2.1.0.0',
    empresa: 'AgroTax',
    produto: 'AGROTAX',
    descricao: 'AGROTAX - aplicativo desktop',
    nomeInterno: 'Agrotax',
    copyright: 'Copyright (c) 2026 AgroTax',
  }).catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
}
