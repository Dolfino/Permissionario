// ========================================================
// SINALIZAÇÃO DO MALL — PROVISIONAMENTO E CLONAGEM DE BASE
// Módulo: ClonarBaseSetor.gs
// Objetivo: Clonar a base testada e funcional para novos setores
//           da empresa, preservando toda a cartografia (plantas,
//           setores, torres e calibrações) e limpando apenas
//           os registros operacionais do dia a dia.
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
 * Lista explícita de abas que contêm DADOS OPERACIONAIS / OCORRÊNCIAS / REGISTROS.
 * APENAS estas abas têm seus registros (linhas 2+) limpos durante a clonagem.
 * Todas as abas de infraestrutura física do shopping (PLANTAS, MAPAS_SETORES,
 * MAPA_TRANSFORMACOES, MAPA_AREAS_NIVEL, CARTOGRAFIA_TORRES, etc.) são PRESERVADAS.
 */
var ABAS_OPERACIONAIS_PARA_LIMPAR = [
  'REGISTROS',
  'REGISTRO_FOTOS',
  'REGISTRO_HISTORICO',
  'AUDITORIA',
  'PENDENCIAS',
  'AGENDA_INSPECOES',
  'PLANOS_PREVENTIVOS',
  'ALERTAS_OPERACIONAIS',
  'REGRAS_NOTIFICACAO',
  'NOTIFICACOES_ENVIO',
  'SESSOES_USUARIO',
  'BACKUPS',
  'CARTOGRAFIA_HISTORICO'
];

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
    '• Cartografia completa do shopping preservada (Plantas, Setores, Torres e Áreas)\n' +
    '• Registros operacionais zerados (pronta para uso)',
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
      '  <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding:4px 0; color:#6b7280;">Abas de cartografia preservadas:</td><td style="text-align:right; font-weight:bold; color:#065f46;">' + (res.abasPreservadas ? res.abasPreservadas.length : 0) + '</td></tr>' +
      '  <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding:4px 0; color:#6b7280;">Abas operacionais limpas:</td><td style="text-align:right; font-weight:bold;">' + res.abasLimpas.length + '</td></tr>' +
      '  <tr><td style="padding:4px 0; color:#6b7280;">Administrador inicial:</td><td style="text-align:right; font-weight:bold;">' + (res.adminAdicionado || 'Sim') + '</td></tr>' +
      '</table>' +
      '<div style="font-size:11px; color:#6b7280; border-top: 1px solid #e5e7eb; padding-top:8px;">' +
      '  <b>Próximo passo:</b> Abra a nova planilha e acesse <i>Extensões &gt; Apps Script &gt; Implantar &gt; Nova implantação</i> para publicar o Web App deste setor.' +
      '</div>' +
      '</div>';

    var dialog = HtmlService.createHtmlOutput(htmlMensagem).setWidth(520).setHeight(390);
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
 * @param {Object} [opcoes] - Opções avançadas de customização.
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
  var adicionarAdmin = opcoes.adicionarUsuarioAdmin !== false;
  var emailAdmin = opcoes.emailAdmin || (Session.getActiveUser() ? Session.getActiveUser().getEmail() : '') || 'admin@empresa.com';

  var relatorio = {
    setor: setorNormalizado,
    iniciadoEm: new Date().toISOString(),
    pastasCriadas: [],
    mapaPastasPorNome: {},
    mapaPastasPorId: {},
    abasProcessadas: [],
    abasPreservadas: [],
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

  // Garantir existência das pastas funcionais essenciais
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

  // 5. Abrir a planilha clonada e sanitizar APENAS as abas operacionais
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

    } else if (ABAS_OPERACIONAIS_PARA_LIMPAR.indexOf(nomeAba) !== -1) {
      // Limpar APENAS as abas operacionais (linhas 2 em diante)
      if (lastRow > 1 && lastCol > 0) {
        sh.getRange(2, 1, lastRow - 1, lastCol).clearContent();
        relatorio.abasLimpas.push({ aba: nomeAba, linhasRemovidas: lastRow - 1 });
      }

    } else {
      // TODAS AS DEMAIS ABAS:
      // (PLANTAS, MAPAS_SETORES, MAPA_TRANSFORMACOES, MAPA_AREAS_NIVEL, CARTOGRAFIA_TORRES,
      // CARTOGRAFIA_TORRE_REPRESENTACOES, CARTOGRAFIA_TORRE_COMPONENTES, CARTOGRAFIA_PUBLICACOES,
      // PONTOS_REFERENCIA, REFERENCIAS_CATALOGO, CAMADAS_PRESETS_CORPORATIVOS, CATALOGOS_DOMINIO,
      // CATALOGOS_DOMINIO_OPCOES, PERFIS_PERMISSOES, README)
      // SÃO PRESERVADAS COM TODOS OS DADOS DA INFRAESTRUTURA DO SHOPPING!
      relatorio.abasPreservadas.push(nomeAba);
    }
  }

  // Gravar e consolidar todas as alterações
  SpreadsheetApp.flush();
  relatorio.concluidoEm = new Date().toISOString();
  relatorio.ok = true;

  return relatorio;
}

/**
 * Repara ou sincroniza as abas de cartografia da planilha template para uma planilha de setor
 * que tenha ficado sem as informações de mapas, setores ou torres.
 *
 * @param {string} [idPlanilhaDestino] - ID da planilha a ser reparada (se omitido, usa a planilha ativa).
 * @param {string} [idPlanilhaOrigem] - ID da planilha template (padrão: template oficial).
 */
function sincronizarCartografiaDoModelo(idPlanilhaDestino, idPlanilhaOrigem) {
  var ssDestino = idPlanilhaDestino ? SpreadsheetApp.openById(idPlanilhaDestino) : SpreadsheetApp.getActiveSpreadsheet();
  var idOrigem = idPlanilhaOrigem || PROVISIONING_CONFIG.TEMPLATE_SPREADSHEET_ID;
  var ssOrigem = SpreadsheetApp.openById(idOrigem);

  var abasCartografia = [
    'PLANTAS',
    'MAPAS_SETORES',
    'MAPA_TRANSFORMACOES',
    'MAPA_AREAS_NIVEL',
    'SETORES',
    'CARTOGRAFIA_COLECOES',
    'CARTOGRAFIA_ARQUIVOS',
    'CORREDORES',
    'CORREDOR_PONTOS',
    'SEGMENTOS_CORREDORES',
    'CRUZAMENTOS',
    'PONTOS_REFERENCIA',
    'REFERENCIAS_CATALOGO',
    'LOJAS_MAPA',
    'LOJAS',
    'CARTOGRAFIA_TORRES',
    'CARTOGRAFIA_TORRE_REPRESENTACOES',
    'CARTOGRAFIA_TORRE_COMPONENTES',
    'CARTOGRAFIA_PUBLICACOES',
    'CAMADAS_PRESETS_CORPORATIVOS'
  ];

  var copiadas = [];

  for (var i = 0; i < abasCartografia.length; i++) {
    var nomeAba = abasCartografia[i];
    var shSrc = ssOrigem.getSheetByName(nomeAba);
    if (!shSrc || shSrc.getLastRow() < 2) continue;

    var shDst = ssDestino.getSheetByName(nomeAba);
    if (!shDst) {
      shDst = ssDestino.insertSheet(nomeAba);
    }

    var lr = shSrc.getLastRow();
    var lc = shSrc.getLastColumn();
    if (lr > 0 && lc > 0) {
      var vals = shSrc.getRange(1, 1, lr, lc).getValues();
      shDst.clear();
      shDst.getRange(1, 1, lr, lc).setValues(vals);
      copiadas.push(nomeAba + ' (' + (lr - 1) + ' registros)');
    }
  }

  SpreadsheetApp.flush();

  return {
    ok: true,
    planilha: ssDestino.getName(),
    totalAbas: copiadas.length,
    abas: copiadas
  };
}

/**
 * Função direta para restaurar a cartografia da planilha recém-criada de Manutenção.
 */
function repararPlanilhaManutencao() {
  var idManutencao = '1R-w0TH5gtu5oBVL-NPtdG5Hpsrv_v32hMhyAYyZfxz0';
  var res = sincronizarCartografiaDoModelo(idManutencao);
  Logger.log('Resultado do reparo da Manutenção: ' + JSON.stringify(res, null, 2));
  return res;
}

/**
 * Item de menu para sincronizar ou reparar a cartografia da planilha ativa com o modelo mestre.
 */
function menuSincronizarCartografia() {
  var ui = SpreadsheetApp.getUi();
  var confirmacao = ui.alert(
    'Sincronizar Cartografia do Mall',
    'Deseja atualizar todas as plantas, setores, transformações e torres a partir do modelo mestre?\n\n' +
    'Seus registros operacionais NÃO serão apagados.',
    ui.ButtonSet.YES_NO
  );

  if (confirmacao !== ui.Button.YES) return;

  try {
    var res = sincronizarCartografiaDoModelo();
    ui.alert(
      'Cartografia Atualizada',
      'Sucesso! Foram sincronizadas ' + res.totalAbas + ' abas de cartografia:\n\n' + res.abas.join('\n'),
      ui.ButtonSet.OK
    );
  } catch (e) {
    ui.alert('Erro ao Sincronizar', 'Falha: ' + e.message, ui.ButtonSet.OK);
  }
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
