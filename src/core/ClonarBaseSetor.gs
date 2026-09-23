// ========================================================
// SINALIZAÇÃO DO MALL — PROVISIONAMENTO E CLONAGEM DE BASE
// Módulo: ClonarBaseSetor.gs
// Objetivo: Clonar a base testada e funcional para novos setores
//           da empresa, replicando pastas e planilhas limpas.
// ========================================================

/**
 * Identificadores de referência dos recursos de template da aplicação base.
 */
var PROVISIONING_CONFIG = Object.freeze({
  TEMPLATE_SPREADSHEET_ID: '1j5bYY-0JpbLd95FyV19lyRPSG6j9kpoM8UCCWZjKchs',
  TEMPLATE_FOLDER_ID: '1tbGCbyz3gxMHkNgbcSgbl1Zt2baDZ5xh',
  TIMEZONE: 'America/Fortaleza'
});

/**
 * Ponto de entrada para a interface gráfica da planilha (Menu 'Sinalização do Mall').
 * Permite ao usuário informar interativamente o nome do novo setor.
 */
function menuProvisionarNovoSetor() {
  var ui = SpreadsheetApp.getUi();
  var promptResultado = ui.prompt(
    'Provisionar Base para Novo Setor',
    'Digite o nome do novo setor da empresa (ex: Almoxarifado, Estacionamento, Operações):',
    ui.ButtonSet.OK_CANCEL
  );

  if (promptResultado.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var nomeSetor = promptResultado.getResponseText().trim();
  if (!nomeSetor) {
    ui.alert('Aviso', 'O nome do setor não pode estar vazio.', ui.ButtonSet.OK);
    return;
  }

  var confirmacao = ui.alert(
    'Confirmar Provisionamento',
    'Deseja criar a base completa para o setor "' + nomeSetor + '"?\n\n' +
    '• Estrutura de pastas nova e limpa no Drive\n' +
    '• Nova planilha com todas as abas e formatos preservados\n' +
    '• Dados operacionais zerados (pronta para uso)',
    ui.ButtonSet.YES_NO
  );

  if (confirmacao !== ui.Button.YES) {
    return;
  }

  try {
    var res = clonarBaseParaNovoSetor(nomeSetor);

    var htmlMensagem =
      '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; padding: 14px; color: #1f2937;">' +
      '<div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">' +
      '  <span style="font-size:22px;">✅</span>' +
      '  <h3 style="margin:0; color:#065f46; font-size:18px;">Base Provisionada com Sucesso!</h3>' +
      '</div>' +
      '<p style="margin: 0 0 10px 0;"><b>Setor:</b> ' + res.setor + '</p>' +
      '<div style="background:#f3f4f6; border-radius:8px; padding:12px; margin-bottom:12px; font-size:13px;">' +
      '  <p style="margin:0 0 8px 0;"><b>📊 Nova Planilha:</b><br>' +
      '     <a href="' + res.planilha.url + '" target="_blank" style="color:#2563eb; font-weight:600; text-decoration:underline;">' + res.planilha.nome + '</a>' +
      '  </p>' +
      '  <p style="margin:0;"><b>📁 Nova Pasta no Drive:</b><br>' +
      '     <a href="' + res.pastaRaiz.url + '" target="_blank" style="color:#2563eb; font-weight:600; text-decoration:underline;">' + res.pastaRaiz.nome + '</a>' +
      '  </p>' +
      '</div>' +
      '<table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:12px;">' +
      '  <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding:4px 0; color:#6b7280;">Pastas estruturadas:</td><td style="text-align:right; font-weight:bold;">' + res.pastasCriadas.length + '</td></tr>' +
      '  <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding:4px 0; color:#6b7280;">Abas sanitizadas (limpas):</td><td style="text-align:right; font-weight:bold;">' + res.abasLimpas.length + '</td></tr>' +
      '  <tr><td style="padding:4px 0; color:#6b7280;">Administrador inicial:</td><td style="text-align:right; font-weight:bold;">' + (res.adminAdicionado || 'Sim') + '</td></tr>' +
      '</table>' +
      '<div style="font-size:11px; color:#6b7280; border-top: 1px solid #e5e7eb; padding-top:8px;">' +
      '  <b>Próximo passo:</b> Abra a nova planilha e, caso queira publicar como Web App independente, acesse <i>Extensões &gt; Apps Script &gt; Implantar &gt; Nova implantação</i>.' +
      '</div>' +
      '</div>';

    var dialog = HtmlService.createHtmlOutput(htmlMensagem).setWidth(520).setHeight(360);
    ui.showModalDialog(dialog, 'Provisionamento Concluído');

  } catch (erro) {
    ui.alert('Erro ao Provisionar', 'Ocorreu um erro durante o provisionamento:\n\n' + erro.message, ui.ButtonSet.OK);
  }
}

/**
 * Função principal para clonar e provisionar uma nova instância do sistema por setor.
 * Pode ser chamada programaticamente ou via scripts de automação.
 *
 * @param {string} nomeSetor - Nome do setor (ex: "Almoxarifado", "Estacionamento", "Segurança").
 * @param {string} [pastaDestinoPaiId] - ID da pasta no Drive onde a nova pasta do setor será criada.
 *                                      Se omitido, cria no mesmo diretório pai da pasta template.
 * @param {Object} [opcoes] - Opções avançadas de customização.
 * @param {string} [opcoes.templateSpreadsheetId] - ID alternativo de planilha template.
 * @param {string} [opcoes.templateFolderId] - ID alternativo de pasta template.
 * @param {boolean} [opcoes.preservarCatalogos=true] - Se true, preserva as opções padrão de domínio.
 * @param {boolean} [opcoes.adicionarUsuarioAdmin=true] - Se true, adiciona o executor como ADMIN em USUARIOS.
 * @param {string} [opcoes.emailAdmin] - E-mail do administrador inicial (padrão: usuário ativo).
 * @return {Object} Relatório estruturado com IDs, URLs e resumo das operações.
 */
function clonarBaseParaNovoSetor(nomeSetor, pastaDestinoPaiId, opcoes) {
  if (!nomeSetor || typeof nomeSetor !== 'string' || !nomeSetor.trim()) {
    throw new Error('O parâmetro "nomeSetor" é obrigatório e deve ser um texto válido.');
  }

  var setorNormalizado = nomeSetor.trim();
  opcoes = opcoes || {};
  var templateSsId = opcoes.templateSpreadsheetId || PROVISIONING_CONFIG.TEMPLATE_SPREADSHEET_ID;
  var templateFolderId = opcoes.templateFolderId || PROVISIONING_CONFIG.TEMPLATE_FOLDER_ID;
  var preservarCatalogos = opcoes.preservarCatalogos !== false;
  var adicionarAdmin = opcoes.adicionarUsuarioAdmin !== false;
  var emailAdmin = opcoes.emailAdmin || (Session.getActiveUser() ? Session.getActiveUser().getEmail() : '') || 'admin@empresa.com';

  var relatorio = {
    setor: setorNormalizado,
    iniciadoEm: new Date().toISOString(),
    pastasCriadas: [],
    mapaPastasPorNome: {},
    mapaPastasPorId: {},
    abasProcessadas: [],
    abasLimpas: [],
    configuracoesAtualizadas: {},
    adminAdicionado: emailAdmin
  };

  // 1. Localizar pasta pai de destino
  var pastaDestinoPai = null;
  if (pastaDestinoPaiId) {
    pastaDestinoPai = DriveApp.getFolderById(pastaDestinoPaiId);
  } else {
    var pastaTemplate = DriveApp.getFolderById(templateFolderId);
    var pais = pastaTemplate.getParents();
    pastaDestinoPai = pais.hasNext() ? pais.next() : DriveApp.getRootFolder();
  }

  // 2. Criar pasta raiz para o novo setor
  var nomePastaRaiz = 'Sinalização - ' + setorNormalizado;
  var novaPastaRaiz = pastaDestinoPai.createFolder(nomePastaRaiz);
  relatorio.pastaRaiz = {
    id: novaPastaRaiz.getId(),
    nome: novaPastaRaiz.getName(),
    url: novaPastaRaiz.getUrl()
  };

  // 3. Replicar estrutura de subpastas recursivamente (sem copiar arquivos)
  var pastaTemplateOrigem = DriveApp.getFolderById(templateFolderId);
  clonarEstruturaPastasRecursiva_(pastaTemplateOrigem, novaPastaRaiz, relatorio);

  // Garantir existência das pastas funcionais essenciais caso não existissem no template
  garantirSubpastaSeNaoExistir_(novaPastaRaiz, 'Fotos', relatorio);
  garantirSubpastaSeNaoExistir_(novaPastaRaiz, 'Backups', relatorio);
  garantirSubpastaSeNaoExistir_(novaPastaRaiz, 'Relatórios', relatorio);

  // 4. Copiar a planilha base para a nova pasta raiz do setor
  var arquivoPlanilhaOrigem = DriveApp.getFileById(templateSsId);
  var nomeNovaPlanilha = 'Mapa - Sinalização - ' + setorNormalizado;
  var copiaPlanilhaArquivo = arquivoPlanilhaOrigem.makeCopy(nomeNovaPlanilha, novaPastaRaiz);

  relatorio.planilha = {
    id: copiaPlanilhaArquivo.getId(),
    nome: copiaPlanilhaArquivo.getName(),
    url: copiaPlanilhaArquivo.getUrl()
  };

  // 5. Abrir a planilha clonada e sanitizar todas as abas
  var novaSs = SpreadsheetApp.open(copiaPlanilhaArquivo);
  var abas = novaSs.getSheets();

  // Mapear pastas funcionais descobertas
  var idPastaFotos = relatorio.mapaPastasPorNome['FOTOS'] ||
                     relatorio.mapaPastasPorNome['FOTOS_REGISTROS'] ||
                     relatorio.mapaPastasPorNome['FOTO'] ||
                     novaPastaRaiz.getId();

  var idPastaBackups = relatorio.mapaPastasPorNome['BACKUPS'] ||
                       relatorio.mapaPastasPorNome['BACKUP'] ||
                       novaPastaRaiz.getId();

  var idPastaRelatorios = relatorio.mapaPastasPorNome['RELATÓRIOS'] ||
                          relatorio.mapaPastasPorNome['RELATORIOS'] ||
                          relatorio.mapaPastasPorNome['SLIDES'] ||
                          novaPastaRaiz.getId();

  for (var i = 0; i < abas.length; i++) {
    var sh = abas[i];
    var nomeAba = sh.getName();
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();

    relatorio.abasProcessadas.push(nomeAba);

    if (nomeAba === 'CONFIG') {
      // Atualizar chaves de ambiente na aba CONFIG
      atualizarOuInserirConfig_(sh, 'DRIVE_ROOT_FOLDER_ID', novaPastaRaiz.getId(), 'Pasta raiz do setor no Google Drive');
      atualizarOuInserirConfig_(sh, 'FOTOS_REGISTROS_FOLDER_ID', idPastaFotos, 'Pasta de fotos do setor no Google Drive');
      atualizarOuInserirConfig_(sh, 'BACKUPS_FOLDER_ID', idPastaBackups, 'Pasta de backups do setor no Google Drive');
      atualizarOuInserirConfig_(sh, 'SLIDES_RELATORIOS_FOLDER_ID', idPastaRelatorios, 'Pasta de relatórios do setor');
      atualizarOuInserirConfig_(sh, 'SETOR_NOME', setorNormalizado, 'Nome do setor vinculado');
      atualizarOuInserirConfig_(sh, 'APP_NOME', 'Sinalização - ' + setorNormalizado, 'Identificador da aplicação');
      atualizarOuInserirConfig_(sh, 'PROVISIONADO_EM', Utilities.formatDate(new Date(), PROVISIONING_CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"), 'Data/hora de provisionamento desta base');
      atualizarOuInserirConfig_(sh, 'PROVISIONADO_POR', emailAdmin, 'E-mail do executor do provisionamento');
      atualizarOuInserirConfig_(sh, 'TEMPLATE_ORIGEM_SPREADSHEET_ID', templateSsId, 'ID da planilha base utilizada como template');
      atualizarOuInserirConfig_(sh, 'TEMPLATE_ORIGEM_FOLDER_ID', templateFolderId, 'ID da pasta raiz template utilizada');

      relatorio.configuracoesAtualizadas = {
        DRIVE_ROOT_FOLDER_ID: novaPastaRaiz.getId(),
        FOTOS_REGISTROS_FOLDER_ID: idPastaFotos,
        BACKUPS_FOLDER_ID: idPastaBackups,
        SLIDES_RELATORIOS_FOLDER_ID: idPastaRelatorios,
        SETOR_NOME: setorNormalizado
      };

    } else if (nomeAba === 'USUARIOS') {
      // Limpar usuários operacionais antigos
      if (lastRow > 1 && lastCol > 0) {
        sh.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      }

      // Adicionar o usuário executor como ADMIN inicial
      if (adicionarAdmin && emailAdmin) {
        configurarUsuarioAdminInicial_(sh, emailAdmin, setorNormalizado);
      }
      relatorio.abasLimpas.push({ aba: nomeAba, linhasRemovidas: Math.max(0, lastRow - 1), reinicializada: true });

    } else if (nomeAba === 'PERFIS_PERMISSOES' || nomeAba === 'README') {
      // Preservar tabelas mestras estáticas e documentação
      continue;

    } else if ((nomeAba === 'CATALOGOS_DOMINIO' || nomeAba === 'CATALOGOS_DOMINIO_OPCOES') && preservarCatalogos) {
      // Preservar opções padrão de catálogo se solicitado
      continue;

    } else {
      // Limpar todos os registros operacionais (linhas 2 em diante), preservando cabeçalhos e formatações
      if (lastRow > 1 && lastCol > 0) {
        sh.getRange(2, 1, lastRow - 1, lastCol).clearContent();
        relatorio.abasLimpas.push({ aba: nomeAba, linhasRemovidas: lastRow - 1 });
      }
    }
  }

  // Gravar e consolidar todas as alterações
  SpreadsheetApp.flush();
  relatorio.concluidoEm = new Date().toISOString();
  relatorio.ok = true;

  return relatorio;
}

/**
 * Reclona recursivamente a estrutura de subpastas do Google Drive sem copiar nenhum arquivo interno.
 * @private
 */
function clonarEstruturaPastasRecursiva_(pastaOrigem, pastaDestino, relatorio) {
  var subpastas = pastaOrigem.getFolders();
  while (subpastas.hasNext()) {
    var sub = subpastas.next();
    var nomeSub = sub.getName();
    var novaSub = pastaDestino.createFolder(nomeSub);

    relatorio.pastasCriadas.push({
      nome: nomeSub,
      id: novaSub.getId(),
      url: novaSub.getUrl(),
      origemId: sub.getId(),
      parentNome: pastaDestino.getName()
    });

    var chaveNome = nomeSub.trim().toUpperCase();
    relatorio.mapaPastasPorNome[chaveNome] = novaSub.getId();
    relatorio.mapaPastasPorId[sub.getId()] = novaSub.getId();

    // Recursão para subdiretórios
    clonarEstruturaPastasRecursiva_(sub, novaSub, relatorio);
  }
}

/**
 * Garante que uma pasta funcional (ex: 'Fotos', 'Backups') exista no destino.
 * @private
 */
function garantirSubpastaSeNaoExistir_(pastaPai, nomeSubpasta, relatorio) {
  var chave = nomeSubpasta.trim().toUpperCase();
  if (relatorio.mapaPastasPorNome[chave]) {
    return relatorio.mapaPastasPorNome[chave];
  }
  var nova = pastaPai.createFolder(nomeSubpasta);
  relatorio.mapaPastasPorNome[chave] = nova.getId();
  relatorio.pastasCriadas.push({
    nome: nomeSubpasta,
    id: nova.getId(),
    url: nova.getUrl(),
    origemId: null,
    parentNome: pastaPai.getName()
  });
  return nova.getId();
}

/**
 * Atualiza ou insere um par chave-valor na aba CONFIG da planilha clonada.
 * @private
 */
function atualizarOuInserirConfig_(shConfig, chave, valor, descricao) {
  var lastRow = shConfig.getLastRow();
  var chaveBuscada = String(chave || '').trim();

  if (lastRow >= 2) {
    var valoresColunaChaves = shConfig.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    for (var i = 0; i < valoresColunaChaves.length; i++) {
      if (String(valoresColunaChaves[i] || '').trim() === chaveBuscada) {
        shConfig.getRange(i + 2, 2).setValue(valor);
        if (typeof descricao !== 'undefined' && descricao !== null) {
          shConfig.getRange(i + 2, 3).setValue(descricao);
        }
        return;
      }
    }
  }

  // Se não existia, anexa nova linha
  shConfig.appendRow([chaveBuscada, valor, descricao || '']);
}

/**
 * Adiciona o usuário executor como administrador na aba USUARIOS da nova planilha.
 * @private
 */
function configurarUsuarioAdminInicial_(shUsuarios, emailAdmin, nomeSetor) {
  var lastCol = Math.max(1, shUsuarios.getLastColumn());
  var headers = shUsuarios.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || '').trim().toUpperCase();
  });

  var linha = new Array(headers.length);
  for (var col = 0; col < headers.length; col++) {
    var h = headers[col];
    if (h === 'EMAIL') {
      linha[col] = emailAdmin;
    } else if (h === 'NOME') {
      linha[col] = 'Administrador ' + nomeSetor;
    } else if (h === 'PERFIL') {
      linha[col] = 'ADMIN';
    } else if (h === 'ATIVO') {
      linha[col] = true;
    } else if (h === 'SETOR_PADRAO') {
      linha[col] = nomeSetor;
    } else if (h === 'ULTIMO_ACESSO') {
      linha[col] = '';
    } else if (h === 'OBSERVACAO') {
      linha[col] = 'Administrador inicial provisionado automaticamente';
    } else {
      linha[col] = '';
    }
  }

  shUsuarios.appendRow(linha);
}

/**
 * Função utilitária para teste rápido de provisionamento via editor de script.
 */
function testarProvisionamentoManual() {
  var resultado = clonarBaseParaNovoSetor('Setor Teste ' + Utilities.formatDate(new Date(), 'America/Fortaleza', 'yyyyMMdd_HHmm'));
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
