/**
 * SINALIZAÇÃO DO MALL — GESTÃO DE ESPAÇOS FÍSICOS (M2B-0 / M2B)
 * Módulo: EspacosService.gs
 * Objetivo: Gestão cadastral do ativo imobiliário, geração atômica de IDs protegida por ScriptLock/ScriptProperties, histórico de identificadores com PRINCIPAL, idempotência contra falhas e ciclo de vida.
 * Runtime: Google Apps Script (V8 Engine)
 *
 * REGRA DE SOBERANIA ARQUITETURAL:
 * Este projeto é o ÚNICO escritor e alocador autorizado de ID_ESPACO em todo o ecossistema.
 * A geração é atômica, global e protegida por ScriptLock e ScriptProperties.
 */

/**
 * Retorna a aba ESPACOS garantindo headers se necessário.
 * @private
 */
function obterAbaEspacos_() {
  const ss = obterPlanilhaEspacosCanonico_();
  let sh = ss.getSheetByName(ESPACOS_CONFIG.SHEET_ESPACOS);
  if (!sh) {
    sh = ss.insertSheet(ESPACOS_CONFIG.SHEET_ESPACOS);
    sh.getRange(1, 1, 1, ESPACOS_HEADERS.length).setValues([ESPACOS_HEADERS]);
    sh.setFrozenRows(1);
  } else {
    // Garante que colunas adicionadas no M2B-0 estejam presentes
    const h = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
    const faltantes = ESPACOS_HEADERS.filter(c => !h.includes(c));
    if (faltantes.length > 0) {
      sh.getRange(1, h.length + 1, 1, faltantes.length).setValues([faltantes]);
    }
  }
  return sh;
}

/**
 * Retorna a aba ESPACO_IDENTIFICADORES garantindo headers se necessário.
 * @private
 */
function obterAbaEspacoIdentificadores_() {
  const ss = obterPlanilhaEspacosCanonico_();
  let sh = ss.getSheetByName(ESPACOS_CONFIG.SHEET_IDENTIFICADORES);
  if (!sh) {
    sh = ss.insertSheet(ESPACOS_CONFIG.SHEET_IDENTIFICADORES);
    sh.getRange(1, 1, 1, ESPACO_IDENTIFICADORES_HEADERS.length).setValues([ESPACO_IDENTIFICADORES_HEADERS]);
    sh.setFrozenRows(1);
  } else {
    const h = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
    const faltantes = ESPACO_IDENTIFICADORES_HEADERS.filter(c => !h.includes(c));
    if (faltantes.length > 0) {
      sh.getRange(1, h.length + 1, 1, faltantes.length).setValues([faltantes]);
    }
  }
  return sh;
}

/**
 * Retorna a aba ESPACOS_MIGRACAO_LEDGER garantindo headers se necessário.
 * @private
 */
function obterAbaEspacosLedger_() {
  const ss = obterPlanilhaEspacosCanonico_();
  let sh = ss.getSheetByName(ESPACOS_CONFIG.SHEET_LEDGER);
  if (!sh) {
    sh = ss.insertSheet(ESPACOS_CONFIG.SHEET_LEDGER);
    sh.getRange(1, 1, 1, ESPACOS_LEDGER_HEADERS.length).setValues([ESPACOS_LEDGER_HEADERS]);
    sh.setFrozenRows(1);
  } else {
    const h = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
    const faltantes = ESPACOS_LEDGER_HEADERS.filter(c => !h.includes(c));
    if (faltantes.length > 0) {
      sh.getRange(1, h.length + 1, 1, faltantes.length).setValues([faltantes]);
    }
  }
  return sh;
}

/**
 * Retorna o maior número sequencial numérico já existente na aba ESPACOS.
 * Utilizado para proteção de integridade: NEXT_ID > MAX(ID_EXISTENTE) sempre.
 * @returns {number}
 * @private
 */
function obterMaxIdExistenteEspacos_() {
  const sh = obterAbaEspacos_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return 0;

  const values = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  const regex = new RegExp('^' + ESPACOS_CONFIG.PREFIXO_ID_ESPACO + '(\\d+)$');
  let maxNum = 0;
  for (let i = 0; i < values.length; i++) {
    const match = String(values[i][0] || '').trim().match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return maxNum;
}

/**
 * Retorna o maior número sequencial numérico já existente na aba ESPACO_IDENTIFICADORES.
 * @returns {number}
 * @private
 */
function obterMaxIdExistenteIdentificadores_() {
  const sh = obterAbaEspacoIdentificadores_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return 0;

  const values = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  const regex = new RegExp('^' + ESPACOS_CONFIG.PREFIXO_ID_IDENTIFICADOR + '(\\d+)$');
  let maxNum = 0;
  for (let i = 0; i < values.length; i++) {
    const match = String(values[i][0] || '').trim().match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return maxNum;
}

/**
 * Gera o próximo ID_ESPACO de forma atômica e soberana via ScriptLock e ScriptProperties.
 * Proteção contra reset/regressão (M2B Requisito 4):
 * Se a propriedade estiver ausente, corrompida ou com valor menor que o máximo existente na tabela,
 * reconstrói automaticamente o contador antes de emitir novo ID. Regra: NEXT_ID > MAX(ID_EXISTENTE) sempre.
 * @returns {string} Formato: 'ESP-000001'
 * @private
 */
function gerarProximoIdEspacoSeguro_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(ESPACOS_CONFIG.LOCK_TIMEOUT_MS)) {
    throw new Error('CONCORRENCIA_LOCK_TIMEOUT: Não foi possível obter ScriptLock para alocar ID_ESPACO. Tente novamente.');
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const propVal = props.getProperty(ESPACOS_CONFIG.CHAVE_PROP_SEQUENCIAL_ESPACO);
    let seqAtual = propVal ? parseInt(propVal, 10) : 0;
    if (isNaN(seqAtual)) seqAtual = 0;

    const maxExistente = obterMaxIdExistenteEspacos_();
    if (seqAtual < maxExistente) {
      seqAtual = maxExistente;
    }

    seqAtual += 1;
    props.setProperty(ESPACOS_CONFIG.CHAVE_PROP_SEQUENCIAL_ESPACO, String(seqAtual));
    return ESPACOS_CONFIG.PREFIXO_ID_ESPACO + String(seqAtual).padStart(ESPACOS_CONFIG.PAD_DIGITOS_ID, '0');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Alias retrocompatível para geração segura de ID_ESPACO.
 * @returns {string}
 * @private
 */
function gerarProximoIdEspaco_() {
  return gerarProximoIdEspacoSeguro_();
}

/**
 * Gera o próximo ID_IDENTIFICADOR de forma atômica soberana via ScriptLock e ScriptProperties.
 * Protegido contra reset ou regressão.
 * @returns {string} Formato: 'IDE-000001'
 * @private
 */
function gerarProximoIdIdentificadorSeguro_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(ESPACOS_CONFIG.LOCK_TIMEOUT_MS)) {
    throw new Error('CONCORRENCIA_LOCK_TIMEOUT: Lock timeout em gerarProximoIdIdentificadorSeguro_.');
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const propVal = props.getProperty(ESPACOS_CONFIG.CHAVE_PROP_SEQUENCIAL_IDENTIFICADOR);
    let seqAtual = propVal ? parseInt(propVal, 10) : 0;
    if (isNaN(seqAtual)) seqAtual = 0;

    const maxExistente = obterMaxIdExistenteIdentificadores_();
    if (seqAtual < maxExistente) {
      seqAtual = maxExistente;
    }

    seqAtual += 1;
    props.setProperty(ESPACOS_CONFIG.CHAVE_PROP_SEQUENCIAL_IDENTIFICADOR, String(seqAtual));
    return ESPACOS_CONFIG.PREFIXO_ID_IDENTIFICADOR + String(seqAtual).padStart(ESPACOS_CONFIG.PAD_DIGITOS_ID, '0');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Procura um espaço físico por sua CHAVE_MIGRACAO_ORIGEM (idempotência contra crashes no meio da transação).
 * @param {string} chaveMigracaoOrigem Ex: 'SNAP-LOJISTAS-20260924-E8F9A1B2::REG-3B9A7F1C82D4E5A0'
 * @returns {Object|null}
 * @private
 */
function procurarEspacoPorChaveOrigem_(chaveMigracaoOrigem) {
  if (!chaveMigracaoOrigem) return null;
  const chave = String(chaveMigracaoOrigem).trim();
  const sh = obterAbaEspacos_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return null;

  const colChaveIdx = ESPACOS_HEADERS.indexOf('CHAVE_MIGRACAO_ORIGEM') + 1;
  const finder = sh.getRange(2, colChaveIdx, lastRow - 1, 1).createTextFinder(chave).matchEntireCell(true).findNext();
  if (!finder) return null;

  const rowNum = finder.getRow();
  const rowData = sh.getRange(rowNum, 1, 1, ESPACOS_HEADERS.length).getValues()[0];
  const obj = {};
  ESPACOS_HEADERS.forEach((h, idx) => { obj[h] = rowData[idx]; });
  return obj;
}

/**
 * Validação rigorosa dos dados de entrada de um espaço físico.
 * @private
 */
function validarDadosEspaco_(dados, isUpdate) {
  if (!dados || typeof dados !== 'object') {
    throw new Error('VALIDACAO_ESPACO: Dados do espaço são obrigatórios.');
  }

  if (isUpdate && dados.ID_ESPACO !== undefined) {
    throw new Error('VALIDACAO_ESPACO: ID_ESPACO é a identidade permanente e imutável.');
  }

  // Desacoplamento: CLASSE_ESPACO vs ELEGIVEL_RESERVA
  if (dados.CLASSE_ESPACO) {
    if (!ESPACOS_ENUMS.CLASSE_ESPACO.includes(dados.CLASSE_ESPACO)) {
      throw new Error('VALIDACAO_ESPACO: CLASSE_ESPACO inválida: "' + dados.CLASSE_ESPACO + '". Opções: ' + ESPACOS_ENUMS.CLASSE_ESPACO.join(', '));
    }
  } else if (!isUpdate) {
    throw new Error('VALIDACAO_ESPACO: CLASSE_ESPACO é obrigatória.');
  }

  if (dados.ELEGIVEL_RESERVA) {
    if (!ESPACOS_ENUMS.ELEGIVEL_RESERVA.includes(dados.ELEGIVEL_RESERVA)) {
      throw new Error('VALIDACAO_ESPACO: ELEGIVEL_RESERVA deve ser "SIM" ou "NAO".');
    }
  }

  if (dados.TIPO_ESPACO_FISICO) {
    if (!ESPACOS_ENUMS.TIPO_ESPACO_FISICO.includes(dados.TIPO_ESPACO_FISICO)) {
      throw new Error('VALIDACAO_ESPACO: TIPO_ESPACO_FISICO inválido: "' + dados.TIPO_ESPACO_FISICO + '". Opções: ' + ESPACOS_ENUMS.TIPO_ESPACO_FISICO.join(', '));
    }
  } else if (!isUpdate) {
    throw new Error('VALIDACAO_ESPACO: TIPO_ESPACO_FISICO é obrigatório.');
  }

  if (dados.ESTADO_CADASTRAL) {
    if (!ESPACOS_ENUMS.ESTADO_CADASTRAL.includes(dados.ESTADO_CADASTRAL)) {
      throw new Error('VALIDACAO_ESPACO: ESTADO_CADASTRAL inválido: "' + dados.ESTADO_CADASTRAL + '". Opções: ' + ESPACOS_ENUMS.ESTADO_CADASTRAL.join(', '));
    }
  }

  // Regra M2A: Sem campo concorrente ATIVO
  if (dados.ATIVO !== undefined) {
    throw new Error('VALIDACAO_ESPACO: Campo "ATIVO" é redundante e proibido. Utilize exclusivamente "ESTADO_CADASTRAL".');
  }

  // Validação de Proveniência M2B-0
  if (dados.ORIGEM_DADOS && !ESPACOS_ENUMS.ORIGEM_DADOS.includes(dados.ORIGEM_DADOS)) {
    throw new Error('VALIDACAO_ESPACO: ORIGEM_DADOS inválida: ' + dados.ORIGEM_DADOS);
  }

  if (dados.CONFIANCA_CADASTRO && !ESPACOS_ENUMS.CONFIANCA_CADASTRO.includes(dados.CONFIANCA_CADASTRO)) {
    throw new Error('VALIDACAO_ESPACO: CONFIANCA_CADASTRO inválida: ' + dados.CONFIANCA_CADASTRO);
  }

  if (dados.CONFIANCA_IDENTIDADE && !ESPACOS_ENUMS.CONFIANCA_IDENTIDADE.includes(dados.CONFIANCA_IDENTIDADE)) {
    throw new Error('VALIDACAO_ESPACO: CONFIANCA_IDENTIDADE inválida: ' + dados.CONFIANCA_IDENTIDADE);
  }
}

/**
 * Cria um novo espaço físico com identidade permanente segura contra concorrência e chave de idempotência de migração.
 * Registra o histórico inicial de identificadores se o LUC for informado.
 * @param {Object} dados
 * @param {string} usuario
 * @returns {Object} Espaço criado
 */
function criarEspaco(dados, usuario) {
  validarDadosEspaco_(dados, false);

  // M2B-0: Checagem prévia de idempotência por CHAVE_MIGRACAO_ORIGEM
  if (dados.CHAVE_MIGRACAO_ORIGEM) {
    const existente = procurarEspacoPorChaveOrigem_(dados.CHAVE_MIGRACAO_ORIGEM);
    if (existente) {
      return existente;
    }
  }

  const sh = obterAbaEspacos_();
  const idEspaco = dados.ID_ESPACO ? String(dados.ID_ESPACO).trim() : gerarProximoIdEspacoSeguro_();

  // Validação defensiva de duplicidade
  if (sh.getLastRow() > 1) {
    const finder = sh.getRange(2, 1, sh.getLastRow() - 1, 1).createTextFinder(idEspaco).matchEntireCell(true).findNext();
    if (finder) {
      throw new Error('CONFLITO_ID_ESPACO: Já existe um espaço com o ID: ' + idEspaco);
    }
  }

  const agora = new Date().toISOString();
  const user = String(usuario || Session.getActiveUser().getEmail() || 'SISTEMA').trim();

  // Regra de padrão de elegibilidade de reserva
  let elegivelReserva = dados.ELEGIVEL_RESERVA;
  if (!elegivelReserva) {
    elegivelReserva = dados.CLASSE_ESPACO === 'COMERCIAL' || dados.CLASSE_ESPACO === 'AREA_EVENTO' || dados.CLASSE_ESPACO === 'EVENTO' ? 'SIM' : 'NAO';
  }

  const estadoCadastral = dados.ESTADO_CADASTRAL || 'ATIVO';
  const lucAtual = String(dados.LUC || '').trim();

  const row = [
    idEspaco,
    lucAtual,
    String(dados.SETOR || '').trim().toUpperCase(),
    String(dados.RUA || '').trim(),
    String(dados.NUMERO || '').trim(),
    dados.CLASSE_ESPACO,
    elegivelReserva,
    dados.TIPO_ESPACO_FISICO,
    String(dados.SUBTIPO_ESPACO_FISICO || '').trim(),
    String(dados.TIPO_LEGADO || '').trim(),
    String(dados.SUBTIPO_LEGADO || '').trim(),
    estadoCadastral,
    dados.ORIGEM_DADOS || 'MANUAL',
    dados.CONFIANCA_CADASTRO || 'DETERMINISTICO',
    dados.CONFIANCA_IDENTIDADE || 'DETERMINISTICO',
    dados.CONFIANCA_ATRIBUTOS || 'DECLARADO',
    dados.CONFIANCA_TIPOLOGIA || 'NORMALIZADO',
    dados.CHAVE_MIGRACAO_ORIGEM || '',
    dados.CRIADO_EM || agora,
    dados.DATA_ORIGEM_ATIVO || '',
    agora,
    user,
    String(dados.OBSERVACOES || '').trim()
  ];

  sh.appendRow(row);

  // M2B-0: Registra o LUC na tabela associativa histórica ESPACO_IDENTIFICADORES com PRINCIPAL = 'SIM'
  if (lucAtual) {
    registrarIdentificadorEspaco_(idEspaco, 'LUC', lucAtual, true, true, dados.ORIGEM_DADOS || 'CADASTRO_INICIAL', agora, user, 'Identificador inicial');
  }

  return obterEspacoPorId(idEspaco);
}

/**
 * Registra um identificador histórico ou corrente para o espaço com suporte a PRINCIPAL.
 * @private
 */
function registrarIdentificadorEspaco_(idEspaco, tipo, valor, atual, principal, origem, agora, user, obs) {
  const sh = obterAbaEspacoIdentificadores_();
  const idIde = gerarProximoIdIdentificadorSeguro_();
  const row = [
    idIde,
    idEspaco,
    tipo,
    String(valor).trim(),
    agora,
    '', // VALIDO_ATE
    atual ? 'SIM' : 'NAO',
    principal ? 'SIM' : 'NAO',
    origem || 'SISTEMA',
    agora,
    user,
    obs || ''
  ];
  sh.appendRow(row);
  return idIde;
}

/**
 * Adiciona ou substitui um identificador (ex: alteração de LUC decorrente de renumeração/subdivisão ou fusão de boxes).
 * Suporta múltiplos identificadores vigentes (ATUAL = 'SIM') mantendo exatamente um como PRINCIPAL = 'SIM'.
 * @param {string} idEspaco
 * @param {string} tipoIdentificador 'LUC' | 'NUMERO_ANTERIOR' | 'CODIGO_PROJETO' | 'ALVARA' | 'IPTU' | 'OUTRO'
 * @param {string} valor
 * @param {boolean} [isPrincipal=true] Se deve ser o identificador principal exibido
 * @param {string} [usuario]
 * @param {string} [observacao]
 * @param {boolean} [encerrarAnterior=false] Se deve encerrar a vigência do anterior (ATUAL='NAO') ou manter ativo como secundário
 * @returns {Object}
 */
function adicionarIdentificadorEspaco(idEspaco, tipoIdentificador, valor, isPrincipal, usuario, observacao, encerrarAnterior) {
  const id = String(idEspaco).trim();
  const espaco = obterEspacoPorId(id);
  if (!espaco) throw new Error('NAO_ENCONTRADO: Espaço não localizado: ' + id);

  if (!ESPACOS_ENUMS.TIPO_IDENTIFICADOR.includes(tipoIdentificador)) {
    throw new Error('TIPO_IDENTIFICADOR_INVALIDO: ' + tipoIdentificador);
  }

  const principal = isPrincipal !== undefined ? !!isPrincipal : true;
  const user = String(usuario || Session.getActiveUser().getEmail() || 'SISTEMA').trim();
  const agora = new Date().toISOString();
  const sh = obterAbaEspacoIdentificadores_();
  const lastRow = sh.getLastRow();

  if (lastRow > 1) {
    const data = sh.getRange(2, 1, lastRow - 1, ESPACO_IDENTIFICADORES_HEADERS.length).getValues();
    const colIdEsp = ESPACO_IDENTIFICADORES_HEADERS.indexOf('ID_ESPACO');
    const colTipo = ESPACO_IDENTIFICADORES_HEADERS.indexOf('TIPO_IDENTIFICADOR');
    const colPrinc = ESPACO_IDENTIFICADORES_HEADERS.indexOf('PRINCIPAL') + 1;
    const colAtual = ESPACO_IDENTIFICADORES_HEADERS.indexOf('ATUAL') + 1;
    const colAte = ESPACO_IDENTIFICADORES_HEADERS.indexOf('VALIDO_ATE') + 1;

    for (let i = 0; i < data.length; i++) {
      if (data[i][colIdEsp] === id && data[i][colTipo] === tipoIdentificador) {
        const rowNum = i + 2;
        // Se o novo é principal, remove o status de principal dos anteriores
        if (principal && data[i][ESPACO_IDENTIFICADORES_HEADERS.indexOf('PRINCIPAL')] === 'SIM') {
          sh.getRange(rowNum, colPrinc).setValue('NAO');
        }
        // Se explicitamente solicitado encerrar vigência do anterior
        if (encerrarAnterior && data[i][ESPACO_IDENTIFICADORES_HEADERS.indexOf('ATUAL')] === 'SIM') {
          sh.getRange(rowNum, colAtual).setValue('NAO');
          sh.getRange(rowNum, colAte).setValue(agora);
        }
      }
    }

    // Se for principal e do tipo LUC, sincroniza o cache em ESPACOS
    if (principal && tipoIdentificador === 'LUC') {
      atualizarEspaco(id, { LUC: String(valor).trim() }, user);
    }
  }

  const idIde = registrarIdentificadorEspaco_(id, tipoIdentificador, valor, true, principal, 'ALTERACAO_CADASTRAL', agora, user, observacao);

  return {
    idIdentificador: idIde,
    idEspaco: id,
    tipoIdentificador: tipoIdentificador,
    valor: valor,
    atual: true,
    principal: principal
  };
}

/**
 * Lista todos os identificadores históricos e vigentes de um espaço.
 * @param {string} idEspaco
 * @returns {Array<Object>}
 */
function listarIdentificadoresEspaco(idEspaco) {
  const id = String(idEspaco).trim();
  const sh = obterAbaEspacoIdentificadores_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return [];

  const data = sh.getRange(2, 1, lastRow - 1, ESPACO_IDENTIFICADORES_HEADERS.length).getValues();
  const colIdEsp = ESPACO_IDENTIFICADORES_HEADERS.indexOf('ID_ESPACO');

  return data.filter(r => r[colIdEsp] === id).map(row => {
    const obj = {};
    ESPACO_IDENTIFICADORES_HEADERS.forEach((h, idx) => { obj[h] = row[idx]; });
    return obj;
  });
}

/**
 * Busca um espaço por seu ID permanente.
 * @param {string} idEspaco
 * @returns {Object|null}
 */
function obterEspacoPorId(idEspaco) {
  if (!idEspaco) return null;
  const id = String(idEspaco).trim();
  const sh = obterAbaEspacos_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return null;

  const finder = sh.getRange(2, 1, lastRow - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  if (!finder) return null;

  const rowValues = sh.getRange(finder.getRow(), 1, 1, ESPACOS_HEADERS.length).getValues()[0];
  const obj = {};
  ESPACOS_HEADERS.forEach((h, idx) => {
    obj[h] = rowValues[idx] !== undefined && rowValues[idx] !== null ? String(rowValues[idx]) : '';
  });
  return obj;
}

/**
 * Busca um espaço pelo LUC atual ou histórico.
 * @param {string} luc
 * @returns {Object|null}
 */
/**
 * Busca espaço por LUC.
 * Por padrão, retorna apenas identificadores ativos/atuais (ATUAL = 'SIM').
 * Identificadores históricos/inativos só são considerados se opcoes.incluirHistorico === true.
 * @param {string} luc
 * @param {Object} [opcoes]
 * @param {boolean} [opcoes.incluirHistorico=false]
 * @returns {Object|null}
 */
function obterEspacoPorLuc(luc, opcoes) {
  if (!luc) return null;
  const opt = opcoes || {};
  const incluirHistorico = opt.incluirHistorico === true;
  const lucBuscado = String(luc).trim().toUpperCase();
  const shEsp = obterAbaEspacos_();
  const lastRowEsp = shEsp.getLastRow();

  // 1. Busca rápida no cache de ESPACOS (LUC atual ativo)
  if (lastRowEsp > 1) {
    const colLuc = ESPACOS_HEADERS.indexOf('LUC') + 1;
    const finder = shEsp.getRange(2, colLuc, lastRowEsp - 1, 1).createTextFinder(lucBuscado).matchEntireCell(true).findNext();
    if (finder) {
      const idEspaco = shEsp.getRange(finder.getRow(), 1).getValue();
      return obterEspacoPorId(idEspaco);
    }
  }

  // 2. Busca em ESPACO_IDENTIFICADORES
  const shIde = obterAbaEspacoIdentificadores_();
  const lastRowIde = shIde.getLastRow();
  if (lastRowIde > 1) {
    const colValor = ESPACO_IDENTIFICADORES_HEADERS.indexOf('VALOR') + 1;
    const finders = shIde.getRange(2, colValor, lastRowIde - 1, 1).createTextFinder(lucBuscado).matchEntireCell(true).findAll();
    if (finders && finders.length > 0) {
      const colIdEsp = ESPACO_IDENTIFICADORES_HEADERS.indexOf('ID_ESPACO') + 1;
      const colAtual = ESPACO_IDENTIFICADORES_HEADERS.indexOf('ATUAL') + 1;
      for (let i = 0; i < finders.length; i++) {
        const row = finders[i].getRow();
        const atual = String(shIde.getRange(row, colAtual).getValue() || '').trim().toUpperCase();
        if (atual === 'SIM' || incluirHistorico) {
          const idEsp = shIde.getRange(row, colIdEsp).getValue();
          return obterEspacoPorId(idEsp);
        }
      }
    }
  }

  return null;
}

/**
 * Lista espaços com filtros opcionais.
 * @param {Object} [filtros]
 * @returns {Array<Object>}
 */
function listarEspacos(filtros) {
  const sh = obterAbaEspacos_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return [];

  const data = sh.getRange(2, 1, lastRow - 1, ESPACOS_HEADERS.length).getValues();
  const f = filtros || {};

  return data.map(rowValues => {
    const obj = {};
    ESPACOS_HEADERS.forEach((h, idx) => {
      obj[h] = rowValues[idx] !== undefined && rowValues[idx] !== null ? String(rowValues[idx]) : '';
    });
    return obj;
  }).filter(e => {
    if (f.setor && e.SETOR !== String(f.setor).trim().toUpperCase()) return false;
    if (f.classe && e.CLASSE_ESPACO !== f.classe) return false;
    if (f.elegivelReserva && e.ELEGIVEL_RESERVA !== f.elegivelReserva) return false;
    if (f.tipoFisico && e.TIPO_ESPACO_FISICO !== f.tipoFisico) return false;
    if (f.estadoCadastral && e.ESTADO_CADASTRAL !== f.estadoCadastral) return false;
    if (f.rua && !e.RUA.toUpperCase().includes(String(f.rua).toUpperCase())) return false;
    return true;
  });
}

/**
 * Atualiza campos cadastrais de um espaço existente.
 * @param {string} idEspaco
 * @param {Object} patch
 * @param {string} usuario
 * @returns {Object} Espaço atualizado
 */
function atualizarEspaco(idEspaco, patch, usuario) {
  validarDadosEspaco_(patch, true);

  const id = String(idEspaco).trim();
  const sh = obterAbaEspacos_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) throw new Error('NAO_ENCONTRADO: Nenhum espaço cadastrado.');

  const finder = sh.getRange(2, 1, lastRow - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  if (!finder) throw new Error('NAO_ENCONTRADO: Espaço não localizado: ' + id);

  const rowNum = finder.getRow();
  const agora = new Date().toISOString();
  const user = String(usuario || Session.getActiveUser().getEmail() || 'SISTEMA').trim();

  const camposEditaveis = [
    'LUC', 'SETOR', 'RUA', 'NUMERO', 'CLASSE_ESPACO', 'ELEGIVEL_RESERVA',
    'TIPO_ESPACO_FISICO', 'SUBTIPO_ESPACO_FISICO',
    'ESTADO_CADASTRAL', 'ORIGEM_DADOS', 'CONFIANCA_CADASTRO',
    'CONFIANCA_IDENTIDADE', 'CONFIANCA_ATRIBUTOS', 'CONFIANCA_TIPOLOGIA',
    'DATA_ORIGEM_ATIVO', 'OBSERVACOES'
  ];

  camposEditaveis.forEach(campo => {
    if (patch[campo] !== undefined) {
      const colIdx = ESPACOS_HEADERS.indexOf(campo) + 1;
      sh.getRange(rowNum, colIdx).setValue(patch[campo]);
    }
  });

  const colAtualizadoEm = ESPACOS_HEADERS.indexOf('ATUALIZADO_EM') + 1;
  const colAtualizadoPor = ESPACOS_HEADERS.indexOf('ATUALIZADO_POR') + 1;
  sh.getRange(rowNum, colAtualizadoEm).setValue(agora);
  sh.getRange(rowNum, colAtualizadoPor).setValue(user);

  return obterEspacoPorId(id);
}

/**
 * Transição formal de ciclo de vida cadastral do ativo.
 * @param {string} idEspaco
 * @param {string} novoEstado
 * @param {string} motivo
 * @param {string} usuario
 * @returns {Object}
 */
function alterarEstadoCadastral(idEspaco, novoEstado, motivo, usuario) {
  if (!ESPACOS_ENUMS.ESTADO_CADASTRAL.includes(novoEstado)) {
    throw new Error('ESTADO_INVALIDO: ' + novoEstado + '. Válidos: ' + ESPACOS_ENUMS.ESTADO_CADASTRAL.join(', '));
  }

  const espaco = obterEspacoPorId(idEspaco);
  if (!espaco) throw new Error('NAO_ENCONTRADO: Espaço não localizado: ' + idEspaco);

  const obsAtual = espaco.OBSERVACOES ? espaco.OBSERVACOES + ' | ' : '';
  const novaObs = obsAtual + '[' + new Date().toISOString() + '] Transição: ' + espaco.ESTADO_CADASTRAL + ' -> ' + novoEstado + ' (Motivo: ' + (motivo || 'N/A') + ')';

  return atualizarEspaco(idEspaco, {
    ESTADO_CADASTRAL: novoEstado,
    OBSERVACOES: novaObs
  }, usuario);
}

/**
 * Monta o Cartão 360° Técnico Físico do Espaço:
 * Cadastro + Infraestrutura Técnica 1:1 + Identificadores Históricos + Bloqueios Vigentes + Estado Técnico Calculado.
 * @param {string} idEspaco
 * @param {Date|string} [dataReferencia]
 * @returns {Object}
 */
function obterFichaEspacoCompleta(idEspaco, dataReferencia) {
  const espaco = obterEspacoPorId(idEspaco);
  if (!espaco) throw new Error('NAO_ENCONTRADO: Espaço não localizado: ' + idEspaco);

  const dataRef = dataReferencia ? new Date(dataReferencia) : new Date();

  // Infraestrutura 1:1
  const infra = typeof obterInfraestrutura === 'function' ? obterInfraestrutura(idEspaco) : null;

  // Identificadores históricos (com PRINCIPAL)
  const identificadores = listarIdentificadoresEspaco(idEspaco);

  // Bloqueios vigentes e estado técnico dinâmico
  const bloqueiosVigentes = typeof listarBloqueiosVigentes === 'function' ? listarBloqueiosVigentes(idEspaco, dataRef) : [];
  const estadoTecnicoCalculado = typeof calcularEstadoTecnicoEspaco === 'function' ? calcularEstadoTecnicoEspaco(idEspaco, dataRef) : 'LIBERADO';

  return {
    espaco: espaco,
    infraestrutura: infra,
    identificadores: identificadores,
    bloqueiosVigentes: bloqueiosVigentes,
    estadoTecnicoCalculado: estadoTecnicoCalculado,
    dataReferencia: dataRef.toISOString()
  };
}

/**
 * Grava uma entrada no Ledger Permanente da Migração (M2B Requisito 6).
 * Trilha inequívoca relacionando fonte antiga -> registro de staging -> novo espaço.
 * @param {Object} entrada
 * @returns {Object}
 * @private
 */
function gravarEntradaLedgerMigracao_(entrada) {
  if (!entrada || !entrada.ID_ESPACO) {
    throw new Error('DADOS_LEDGER_INVALIDOS: ID_ESPACO obrigatório para registrar no ledger.');
  }

  const sh = obterAbaEspacosLedger_();
  const row = [
    String(entrada.ID_SNAPSHOT_ORIGEM || ESPACOS_CONFIG.SNAPSHOT_ORIGEM_PADRAO).trim(),
    String(entrada.ID_REGISTRO_ORIGEM || '').trim(),
    String(entrada.CHAVE_MIGRACAO_ORIGEM || '').trim(),
    String(entrada.ID_STAGING || '').trim(),
    String(entrada.ID_ESPACO || '').trim(),
    String(entrada.LUC || '').trim(),
    String(entrada.SETOR || '').trim(),
    String(entrada.HASH_ORIGEM || '').trim(),
    String(entrada.VERSAO_REGRA || ESPACOS_CONFIG.VERSAO_MIGRACAO).trim(),
    String(entrada.PROMOVIDO_EM || new Date().toISOString()).trim(),
    String(entrada.PROMOVIDO_POR || Session.getActiveUser().getEmail() || 'SISTEMA_MIGRACAO').trim()
  ];

  sh.appendRow(row);
  return entrada;
}

/**
 * Consulta o Ledger Permanente para responder: "De qual registro legado nasceu ESP-001234?"
 * @param {string} idEspaco
 * @returns {Object|null}
 */
function consultarLedgerPorIdEspaco(idEspaco) {
  if (!idEspaco) return null;
  const sh = obterAbaEspacosLedger_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return null;

  const colIdEspaco = ESPACOS_LEDGER_HEADERS.indexOf('ID_ESPACO') + 1;
  const finder = sh.getRange(2, colIdEspaco, lastRow - 1, 1).createTextFinder(idEspaco).matchEntireCell(true).findNext();
  if (!finder) return null;

  const rowValues = sh.getRange(finder.getRow(), 1, 1, ESPACOS_LEDGER_HEADERS.length).getValues()[0];
  const obj = {};
  ESPACOS_LEDGER_HEADERS.forEach((h, idx) => {
    obj[h] = rowValues[idx];
  });
  return obj;
}

/**
 * Consulta o Ledger Permanente para responder: "Para qual ID_ESPACO foi migrado o LUC XYZ neste snapshot?"
 * @param {string} luc
 * @param {string} [idSnapshot]
 * @returns {Object|null}
 */
function consultarLedgerPorLuc(luc, idSnapshot) {
  if (!luc) return null;
  const sh = obterAbaEspacosLedger_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return null;

  const lucClean = String(luc).trim().toUpperCase();
  const snapClean = idSnapshot ? String(idSnapshot).trim() : null;

  const colLuc = ESPACOS_LEDGER_HEADERS.indexOf('LUC');
  const colSnap = ESPACOS_LEDGER_HEADERS.indexOf('ID_SNAPSHOT_ORIGEM');
  const data = sh.getRange(2, 1, lastRow - 1, ESPACOS_LEDGER_HEADERS.length).getValues();

  for (let i = 0; i < data.length; i++) {
    const rowLuc = String(data[i][colLuc] || '').trim().toUpperCase();
    const rowSnap = String(data[i][colSnap] || '').trim();
    if (rowLuc === lucClean && (!snapClean || rowSnap === snapClean)) {
      const obj = {};
      ESPACOS_LEDGER_HEADERS.forEach((h, idx) => {
        obj[h] = data[i][idx];
      });
      return obj;
    }
  }
  return null;
}

/**
 * Consulta o Ledger Permanente por CHAVE_MIGRACAO_ORIGEM.
 * @param {string} chaveMigracaoOrigem
 * @returns {Object|null}
 */
function consultarLedgerPorChaveMigracao(chaveMigracaoOrigem) {
  if (!chaveMigracaoOrigem) return null;
  const sh = obterAbaEspacosLedger_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return null;

  const colChave = ESPACOS_LEDGER_HEADERS.indexOf('CHAVE_MIGRACAO_ORIGEM') + 1;
  const finder = sh.getRange(2, colChave, lastRow - 1, 1).createTextFinder(chaveMigracaoOrigem).matchEntireCell(true).findNext();
  if (!finder) return null;

  const rowValues = sh.getRange(finder.getRow(), 1, 1, ESPACOS_LEDGER_HEADERS.length).getValues()[0];
  const obj = {};
  ESPACOS_LEDGER_HEADERS.forEach((h, idx) => {
    obj[h] = rowValues[idx];
  });
  return obj;
}
