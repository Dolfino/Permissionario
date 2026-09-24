/**
 * SINALIZAÇÃO DO MALL — GESTÃO DE ESPAÇOS FÍSICOS (M2A / M2B)
 * Módulo: EspacosIntegracaoMapa.gs
 * Objetivo: Integração relacional entre ESPACOS (Ativo Físico) e LOJAS_MAPA (Representação Cartográfica).
 * Cardinalidade: ESPACO (1) -> (0..N) REPRESENTACOES_CARTOGRAFICAS
 * Runtime: Google Apps Script (V8 Engine)
 */

/**
 * Retorna a aba LOJAS_MAPA na Planilha Canônica de Cartografia.
 * @private
 */
function obterAbaLojasMapa_() {
  const ss = obterPlanilhaCartografiaCanonico_();
  const sh = ss.getSheetByName(ESPACOS_CONFIG.SHEET_LOJAS_MAPA);
  if (!sh) throw new Error('LOJAS_MAPA_AUSENTE: Aba LOJAS_MAPA não localizada na planilha canônica de cartografia.');
  return sh;
}

/**
 * Garante que a aba LOJAS_MAPA possua as colunas ID_ESPACO e PAPEL_REPRESENTACAO de forma idempotente.
 * @returns {Object} { alterado: boolean, headers: Array<string> }
 */
function garantirColunasIntegracaoLojasMapa_() {
  const sh = obterAbaLojasMapa_();
  const lastCol = Math.max(1, sh.getLastColumn());
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
  let alterado = false;

  if (!headers.includes('ID_ESPACO')) {
    const nextCol = sh.getLastColumn() + 1;
    sh.getRange(1, nextCol).setValue('ID_ESPACO');
    headers.push('ID_ESPACO');
    alterado = true;
  }

  if (!headers.includes('PAPEL_REPRESENTACAO')) {
    const nextCol = sh.getLastColumn() + 1;
    sh.getRange(1, nextCol).setValue('PAPEL_REPRESENTACAO');
    headers.push('PAPEL_REPRESENTACAO');
    alterado = true;
  }

  return { alterado: alterado, headers: headers };
}

/**
 * Vincula um pino cartográfico em LOJAS_MAPA a um espaço físico permanente.
 * @param {string} idLojaMapa PK do pino no mapa
 * @param {string} idEspaco PK do espaço físico
 * @param {string} [papelRepresentacao] 'PRIMARIA' | 'SECUNDARIA' | 'HISTORICA' | 'SIMBOLICA'
 * @param {string} [usuario]
 * @returns {Object} { idLojaMapa, idEspaco, papelRepresentacao, atualizado: boolean }
 */
function vincularEspacoAPinoMapa(idLojaMapa, idEspaco, papelRepresentacao, usuario) {
  garantirColunasIntegracaoLojasMapa_();

  const idPin = String(idLojaMapa || '').trim();
  const idEsp = String(idEspaco || '').trim();
  const papel = papelRepresentacao || 'PRIMARIA';

  if (!idPin) throw new Error('PARAMETRO_OBRIGATORIO: idLojaMapa é obrigatório.');
  if (!idEsp) throw new Error('PARAMETRO_OBRIGATORIO: idEspaco é obrigatório.');

  if (!ESPACOS_ENUMS.PAPEL_REPRESENTACAO_CARTOGRAFICA.includes(papel)) {
    throw new Error('PAPEL_INVALIDO: ' + papel + '. Válidos: ' + ESPACOS_ENUMS.PAPEL_REPRESENTACAO_CARTOGRAFICA.join(', '));
  }

  // Validação: ESPACO deve existir
  const espaco = obterEspacoPorId(idEsp);
  if (!espaco) {
    throw new Error('INTEGRIDADE_REFERENCIAL: Não existe espaço físico com ID_ESPACO: ' + idEsp);
  }

  const sh = obterAbaLojasMapa_();
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());

  const colIdPin = headers.indexOf('ID_LOJA_MAPA') + 1;
  const colIdEsp = headers.indexOf('ID_ESPACO') + 1;
  const colPapel = headers.indexOf('PAPEL_REPRESENTACAO') + 1;
  const colMapa = headers.indexOf('ID_MAPA_SETOR') + 1;

  if (colIdPin <= 0 || colIdEsp <= 0 || colPapel <= 0) {
    throw new Error('ESTRUTURA_CORROMPIDA: Colunas necessárias não localizadas em LOJAS_MAPA.');
  }

  // Localiza a linha do pino
  const finder = sh.getRange(2, colIdPin, lastRow - 1, 1).createTextFinder(idPin).matchEntireCell(true).findNext();
  if (!finder) throw new Error('PINO_NAO_ENCONTRADO: Pino não localizado em LOJAS_MAPA: ' + idPin);

  const rowNum = finder.getRow();
  const idMapaSetor = colMapa > 0 ? sh.getRange(rowNum, colMapa).getValue() : '';

  // Constraint de negócio: no máximo 1 pino PRIMARIO por ID_ESPACO no mesmo mapa
  if (papel === 'PRIMARIA') {
    const todosPinos = listarPinosDoEspaco(idEsp);
    const primarioExistente = todosPinos.find(p => p.PAPEL_REPRESENTACAO === 'PRIMARIA' && p.ID_LOJA_MAPA !== idPin && p.ID_MAPA_SETOR === idMapaSetor);
    if (primarioExistente) {
      throw new Error('CONFLITO_REPRESENTACAO_PRIMARIA: O espaço ' + idEsp + ' já possui o pino primário ' + primarioExistente.ID_LOJA_MAPA + ' no setor ' + idMapaSetor);
    }
  }

  // Atualiza vínculo
  sh.getRange(rowNum, colIdEsp).setValue(idEsp);
  sh.getRange(rowNum, colPapel).setValue(papel);

  // Atualiza timestamp se houver coluna ATUALIZADO_EM
  const colAtualizadoEm = headers.indexOf('ATUALIZADO_EM') + 1;
  if (colAtualizadoEm > 0) sh.getRange(rowNum, colAtualizadoEm).setValue(new Date().toISOString());

  return {
    idLojaMapa: idPin,
    idEspaco: idEsp,
    papelRepresentacao: papel,
    atualizado: true
  };
}

/**
 * Remove o vínculo de um pino com qualquer espaço.
 * @param {string} idLojaMapa
 * @returns {Object}
 */
function desvincularPinoMapa(idLojaMapa) {
  garantirColunasIntegracaoLojasMapa_();
  const idPin = String(idLojaMapa || '').trim();
  const sh = obterAbaLojasMapa_();
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());

  const colIdPin = headers.indexOf('ID_LOJA_MAPA') + 1;
  const colIdEsp = headers.indexOf('ID_ESPACO') + 1;
  const colPapel = headers.indexOf('PAPEL_REPRESENTACAO') + 1;

  const finder = sh.getRange(2, colIdPin, lastRow - 1, 1).createTextFinder(idPin).matchEntireCell(true).findNext();
  if (!finder) throw new Error('PINO_NAO_ENCONTRADO: ' + idPin);

  const rowNum = finder.getRow();
  sh.getRange(rowNum, colIdEsp).setValue('');
  sh.getRange(rowNum, colPapel).setValue('');

  return { idLojaMapa: idPin, desvinculado: true };
}

/**
 * Lista todos os pinos associados a um espaço físico.
 * @param {string} idEspaco
 * @returns {Array<Object>}
 */
function listarPinosDoEspaco(idEspaco) {
  garantirColunasIntegracaoLojasMapa_();
  const idEsp = String(idEspaco || '').trim();
  const sh = obterAbaLojasMapa_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return [];

  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
  const data = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();

  const colIdEsp = headers.indexOf('ID_ESPACO');
  if (colIdEsp < 0) return [];

  return data.filter(r => String(r[colIdEsp] || '').trim() === idEsp).map(r => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = r[idx]; });
    return obj;
  });
}

/**
 * Atualiza múltiplos pinos em LOJAS_MAPA em uma única operação em bloco.
 * Preserva 100% dos dados legados e grava exclusivamente ID_ESPACO e PAPEL_REPRESENTACAO.
 * @param {Map<string, string>} mapaPinos Map de idLojaMapa -> idEspaco
 * @returns {number} Quantidade de pinos atualizados
 */
function vincularEspacosAPinosMapaEmBloco_(mapaPinos) {
  if (!mapaPinos || mapaPinos.size === 0) return 0;
  garantirColunasIntegracaoLojasMapa_();
  const sh = obterAbaLojasMapa_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return 0;

  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
  const colIdPin = headers.indexOf('ID_LOJA_MAPA');
  const colIdEsp = headers.indexOf('ID_ESPACO');
  const colPapel = headers.indexOf('PAPEL_REPRESENTACAO');

  if (colIdPin < 0 || colIdEsp < 0 || colPapel < 0) {
    throw new Error('Colunas necessárias não encontradas em LOJAS_MAPA');
  }

  const range = sh.getRange(2, 1, lastRow - 1, lastCol);
  const data = range.getValues();
  let atualizados = 0;

  for (let r = 0; r < data.length; r++) {
    const pinId = String(data[r][colIdPin] || '').trim();
    if (mapaPinos.has(pinId)) {
      const idEsp = mapaPinos.get(pinId);
      data[r][colIdEsp] = idEsp;
      data[r][colPapel] = 'PRIMARIA';
      atualizados++;
    }
  }

  if (atualizados > 0) {
    range.setValues(data);
  }
  return atualizados;
}
