/**
 * SINALIZAÇÃO DO MALL — GESTÃO DE ESPAÇOS FÍSICOS (M2A)
 * Módulo: EspacoInfraestruturaService.gs
 * Objetivo: Gestão das características de engenharia, instalações e facilidades técnicas (relação 1:1 com ESPACOS).
 * Runtime: Google Apps Script (V8 Engine)
 */

/**
 * Retorna a aba ESPACO_INFRAESTRUTURA garantindo headers se necessário.
 * @private
 */
function obterAbaEspacoInfraestrutura_() {
  const ss = obterPlanilhaEspacosCanonico_();
  let sh = ss.getSheetByName(ESPACOS_CONFIG.SHEET_INFRAESTRUTURA);
  if (!sh) {
    sh = ss.insertSheet(ESPACOS_CONFIG.SHEET_INFRAESTRUTURA);
    sh.getRange(1, 1, 1, ESPACO_INFRAESTRUTURA_HEADERS.length).setValues([ESPACO_INFRAESTRUTURA_HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/**
 * Converte e valida valor numérico estrito.
 * Rejeita strings com unidades embutidas (ex: '220V', '25,21m2').
 * Retorna número ou null se vazio/desconhecido.
 * @private
 */
function normalizarNumeroEstrito_(val, nomeCampo) {
  if (val === null || val === undefined || val === '') return null;

  if (typeof val === 'number') {
    if (isNaN(val)) throw new Error('VALOR_INVALIDO: ' + nomeCampo + ' contém valor numérico NaN.');
    return val;
  }

  const s = String(val).trim();
  if (s === '') return null;

  // Rejeita unidades de texto embutidas
  if (/[a-zA-Z]/i.test(s)) {
    throw new Error('UNIDADE_INVALIDA: ' + nomeCampo + ' não deve conter texto ou sufixos de unidade ("' + s + '"). Insira apenas o número puro padronizado.');
  }

  // Converte vírgula decimal para ponto
  const normalizado = s.replace(',', '.');
  const num = parseFloat(normalizado);

  if (isNaN(num)) {
    throw new Error('VALOR_INVALIDO: ' + nomeCampo + ' não pôde ser convertido para número: "' + s + '".');
  }

  return num;
}

/**
 * Valida campo de utilidade/infraestrutura.
 * Aceita estritamente: 'SIM', 'NAO', 'NAO_VERIFICADO' ou null.
 * Nunca presume ausência quando a informação não foi levantada.
 * @private
 */
function normalizarUtilidade_(val, nomeCampo) {
  if (val === null || val === undefined || val === '') return 'NAO_VERIFICADO';

  const s = String(val).trim().toUpperCase();
  if (['SIM', 'S', 'TRUE', '1'].includes(s)) return 'SIM';
  if (['NAO', 'NÃO', 'N', 'FALSE', '0'].includes(s)) return 'NAO';
  if (['NAO_VERIFICADO', 'DESCONHECIDO', 'PENDENTE', 'NV'].includes(s)) return 'NAO_VERIFICADO';

  throw new Error('UTILIDADE_INVALIDA: ' + nomeCampo + ' deve ser "SIM", "NAO" ou "NAO_VERIFICADO". Recebido: "' + val + '".');
}

/**
 * Valida o payload de infraestrutura.
 * @private
 */
function validarDadosInfraestrutura_(dados) {
  if (!dados || typeof dados !== 'object') {
    throw new Error('VALIDACAO_INFRA: Dados de infraestrutura são obrigatórios.');
  }

  if (!dados.ID_ESPACO || String(dados.ID_ESPACO).trim() === '') {
    throw new Error('VALIDACAO_INFRA: ID_ESPACO é obrigatório para registrar infraestrutura.');
  }

  // Validação relacional 1:1: O espaço DEVE existir previamente em ESPACOS
  const espaco = obterEspacoPorId(dados.ID_ESPACO);
  if (!espaco) {
    throw new Error('INTEGRIDADE_REFERENCIAL: Não existe espaço físico cadastrado com ID_ESPACO: ' + dados.ID_ESPACO);
  }
}

/**
 * Registra ou atualiza as características de infraestrutura de um espaço (Upsert 1:1).
 * @param {Object} dados
 * @param {string} usuario
 * @returns {Object}
 */
function salvarInfraestrutura(dados, usuario) {
  validarDadosInfraestrutura_(dados);

  const idEspaco = String(dados.ID_ESPACO).trim();
  const sh = obterAbaEspacoInfraestrutura_();
  const lastRow = sh.getLastRow();

  // Dimensões físicas (metros e m²)
  const areaM2 = normalizarNumeroEstrito_(dados.AREA_M2, 'AREA_M2');
  const larguraM = normalizarNumeroEstrito_(dados.LARGURA_M, 'LARGURA_M');
  const profundidadeM = normalizarNumeroEstrito_(dados.PROFUNDIDADE_M, 'PROFUNDIDADE_M');
  const peDireitoM = normalizarNumeroEstrito_(dados.PE_DIREITO_M, 'PE_DIREITO_M');
  const testeiraM = normalizarNumeroEstrito_(dados.TESTEIRA_M, 'TESTEIRA_M');
  const alturaPortaM = normalizarNumeroEstrito_(dados.ALTURA_PORTA_M, 'ALTURA_PORTA_M');
  const cargaPiso = normalizarNumeroEstrito_(dados.CARGA_PISO_KGF_M2, 'CARGA_PISO_KGF_M2');

  // Elétrica (V, kVA, A, Qtd)
  const voltagem = normalizarNumeroEstrito_(dados.VOLTAGEM_V, 'VOLTAGEM_V');
  if (voltagem !== null && ![127, 220, 380].includes(voltagem)) {
    throw new Error('VOLTAGEM_INVALIDA: Tensão nominal deve ser 127, 220 ou 380 V. Recebido: ' + voltagem);
  }
  const potencia = normalizarNumeroEstrito_(dados.POTENCIA_KVA, 'POTENCIA_KVA');
  const disjuntor = normalizarNumeroEstrito_(dados.DISJUNTOR_A, 'DISJUNTOR_A');
  const pontosEletricos = normalizarNumeroEstrito_(dados.PONTOS_ELETRICOS_QTD, 'PONTOS_ELETRICOS_QTD');

  // Utilidades e conexões
  const agua = normalizarUtilidade_(dados.AGUA_POTAVEL, 'AGUA_POTAVEL');
  const esgoto = normalizarUtilidade_(dados.ESGOTO, 'ESGOTO');
  const caixaGordura = normalizarUtilidade_(dados.CAIXA_GORDURA, 'CAIXA_GORDURA');
  const fibra = normalizarUtilidade_(dados.PONTO_FIBRA, 'PONTO_FIBRA');
  const climatizacao = dados.CLIMATIZACAO ? String(dados.CLIMATIZACAO).trim().toUpperCase() : 'NAO_VERIFICADO';
  const exaustao = normalizarUtilidade_(dados.SISTEMA_EXAUSTAO, 'SISTEMA_EXAUSTAO');
  const detectores = normalizarUtilidade_(dados.DETECTORES_INCENDIO, 'DETECTORES_INCENDIO');

  const agora = new Date().toISOString();
  const respTecnico = String(dados.RESPONSAVEL_TECNICO || usuario || Session.getActiveUser().getEmail() || '').trim();

  const rowValues = [
    idEspaco,
    areaM2 !== null ? areaM2 : '',
    larguraM !== null ? larguraM : '',
    profundidadeM !== null ? profundidadeM : '',
    peDireitoM !== null ? peDireitoM : '',
    testeiraM !== null ? testeiraM : '',
    alturaPortaM !== null ? alturaPortaM : '',
    cargaPiso !== null ? cargaPiso : '',
    voltagem !== null ? voltagem : '',
    potencia !== null ? potencia : '',
    disjuntor !== null ? disjuntor : '',
    pontosEletricos !== null ? pontosEletricos : '',
    agua,
    esgoto,
    caixaGordura,
    fibra,
    climatizacao,
    exaustao,
    detectores,
    dados.DATA_LEVANTAMENTO || agora.split('T')[0],
    respTecnico,
    agora,
    String(dados.OBSERVACOES_TECNICAS || '').trim()
  ];

  // Verifica se já existe registro 1:1
  let targetRow = 0;
  if (lastRow > 1) {
    const finder = sh.getRange(2, 1, lastRow - 1, 1).createTextFinder(idEspaco).matchEntireCell(true).findNext();
    if (finder) targetRow = finder.getRow();
  }

  if (targetRow > 0) {
    sh.getRange(targetRow, 1, 1, ESPACO_INFRAESTRUTURA_HEADERS.length).setValues([rowValues]);
  } else {
    sh.appendRow(rowValues);
  }

  return obterInfraestrutura(idEspaco);
}

/**
 * Obtém a ficha de infraestrutura 1:1 de um espaço físico.
 * @param {string} idEspaco
 * @returns {Object|null}
 */
function obterInfraestrutura(idEspaco) {
  if (!idEspaco) return null;
  const id = String(idEspaco).trim();
  const sh = obterAbaEspacoInfraestrutura_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return null;

  const finder = sh.getRange(2, 1, lastRow - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  if (!finder) return null;

  const rowNum = finder.getRow();
  const vals = sh.getRange(rowNum, 1, 1, ESPACO_INFRAESTRUTURA_HEADERS.length).getValues()[0];

  const obj = {};
  ESPACO_INFRAESTRUTURA_HEADERS.forEach((h, idx) => {
    obj[h] = vals[idx] !== undefined && vals[idx] !== null ? vals[idx] : null;
  });

  return obj;
}
