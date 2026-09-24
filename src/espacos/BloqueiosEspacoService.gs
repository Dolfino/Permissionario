/**
 * SINALIZAÇÃO DO MALL — GESTÃO DE ESPAÇOS FÍSICOS (M2A)
 * Módulo: BloqueiosEspacoService.gs
 * Objetivo: Fonte Soberana Temporal de Restrições Técnicas, Impedimentos e Cálculo de Disponibilidade.
 * Runtime: Google Apps Script (V8 Engine)
 */

/**
 * Retorna a aba BLOQUEIOS_ESPACO garantindo headers se necessário.
 * @private
 */
function obterAbaBloqueiosEspaco_() {
  const ss = obterPlanilhaEspacosCanonico_();
  let sh = ss.getSheetByName(ESPACOS_CONFIG.SHEET_BLOQUEIOS);
  if (!sh) {
    sh = ss.insertSheet(ESPACOS_CONFIG.SHEET_BLOQUEIOS);
    sh.getRange(1, 1, 1, BLOQUEIOS_ESPACO_HEADERS.length).setValues([BLOQUEIOS_ESPACO_HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/**
 * Gera o próximo ID_BLOQUEIO sequencial.
 * Formato: BLQ-000001
 * @private
 */
function gerarProximoIdBloqueio_() {
  const sh = obterAbaBloqueiosEspaco_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) {
    return ESPACOS_CONFIG.PREFIXO_ID_BLOQUEIO + String(1).padStart(ESPACOS_CONFIG.PAD_DIGITOS_ID, '0');
  }

  const values = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  let maxSeq = 0;
  const regex = new RegExp('^' + ESPACOS_CONFIG.PREFIXO_ID_BLOQUEIO + '(\\d+)$');

  for (let i = 0; i < values.length; i++) {
    const val = String(values[i][0] || '').trim();
    const match = val.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  }

  const nextSeq = maxSeq + 1;
  return ESPACOS_CONFIG.PREFIXO_ID_BLOQUEIO + String(nextSeq).padStart(ESPACOS_CONFIG.PAD_DIGITOS_ID, '0');
}

/**
 * Normaliza e valida data/hora ISO.
 * @private
 */
function normalizarDataHoraIso_(dt, nomeCampo) {
  if (!dt) return null;
  const d = new Date(dt);
  if (isNaN(d.getTime())) {
    throw new Error('DATA_INVALIDA: ' + nomeCampo + ' contém formato de data/hora inválido: "' + dt + '".');
  }
  return d.toISOString();
}

/**
 * Valida os dados de abertura de um bloqueio técnico.
 * @private
 */
function validarDadosBloqueio_(dados) {
  if (!dados || typeof dados !== 'object') {
    throw new Error('VALIDACAO_BLOQUEIO: Dados do bloqueio são obrigatórios.');
  }

  if (!dados.ID_ESPACO || String(dados.ID_ESPACO).trim() === '') {
    throw new Error('VALIDACAO_BLOQUEIO: ID_ESPACO é obrigatório.');
  }

  // Integridade referencial: ESPACO deve existir
  const espaco = obterEspacoPorId(dados.ID_ESPACO);
  if (!espaco) {
    throw new Error('INTEGRIDADE_REFERENCIAL: Não existe espaço físico cadastrado com ID_ESPACO: ' + dados.ID_ESPACO);
  }

  if (!dados.TIPO_BLOQUEIO || !ESPACOS_ENUMS.TIPO_BLOQUEIO_TECNICO.includes(dados.TIPO_BLOQUEIO)) {
    throw new Error('VALIDACAO_BLOQUEIO: TIPO_BLOQUEIO inválido: "' + dados.TIPO_BLOQUEIO + '". Opções: ' + ESPACOS_ENUMS.TIPO_BLOQUEIO_TECNICO.join(', '));
  }

  if (!dados.DATA_HORA_INICIO) {
    throw new Error('VALIDACAO_BLOQUEIO: DATA_HORA_INICIO é obrigatória.');
  }

  const dtInicio = new Date(dados.DATA_HORA_INICIO);
  if (isNaN(dtInicio.getTime())) {
    throw new Error('VALIDACAO_BLOQUEIO: DATA_HORA_INICIO com formato inválido: ' + dados.DATA_HORA_INICIO);
  }

  if (dados.DATA_HORA_FIM) {
    const dtFim = new Date(dados.DATA_HORA_FIM);
    if (isNaN(dtFim.getTime())) {
      throw new Error('VALIDACAO_BLOQUEIO: DATA_HORA_FIM com formato inválido: ' + dados.DATA_HORA_FIM);
    }
    if (dtFim < dtInicio) {
      throw new Error('INTERVALO_INVALIDO: DATA_HORA_FIM (' + dados.DATA_HORA_FIM + ') não pode ser anterior a DATA_HORA_INICIO (' + dados.DATA_HORA_INICIO + ').');
    }
  }

  if (dados.SEVERIDADE && !ESPACOS_ENUMS.SEVERIDADE_BLOQUEIO.includes(dados.SEVERIDADE)) {
    throw new Error('VALIDACAO_BLOQUEIO: SEVERIDADE inválida: "' + dados.SEVERIDADE + '". Opções: ' + ESPACOS_ENUMS.SEVERIDADE_BLOQUEIO.join(', '));
  }
}

/**
 * Abre um novo bloqueio técnico temporal sobre um espaço físico.
 * @param {Object} dados
 * @param {string} usuario
 * @returns {Object} Bloqueio criado
 */
function criarBloqueio(dados, usuario) {
  validarDadosBloqueio_(dados);

  const sh = obterAbaBloqueiosEspaco_();
  const idBloqueio = dados.ID_BLOQUEIO ? String(dados.ID_BLOQUEIO).trim() : gerarProximoIdBloqueio_();
  const idEspaco = String(dados.ID_ESPACO).trim();
  const dtInicioIso = normalizarDataHoraIso_(dados.DATA_HORA_INICIO, 'DATA_HORA_INICIO');
  const dtFimIso = dados.DATA_HORA_FIM ? normalizarDataHoraIso_(dados.DATA_HORA_FIM, 'DATA_HORA_FIM') : '';

  // Determina status inicial
  const agora = new Date();
  const dInicio = new Date(dtInicioIso);
  let statusInicial = dados.STATUS || (dInicio > agora ? 'PROGRAMADO' : 'VIGENTE');

  // Efeitos operacionais (padrões inteligentes por tipo/severidade)
  const isInterdicao = dados.TIPO_BLOQUEIO === 'INTERDICAO_DEFESA_CIVIL_BOMBEIROS' || dados.SEVERIDADE === 'CRITICA';
  const isObra = dados.TIPO_BLOQUEIO === 'OBRA_REFORMA_ESTRUTURAL';

  const bloqueiaReserva = dados.BLOQUEIA_RESERVA !== undefined ? (dados.BLOQUEIA_RESERVA ? 'SIM' : 'NAO') : (isInterdicao || isObra ? 'SIM' : 'NAO');
  const bloqueiaOcupacao = dados.BLOQUEIA_OCUPACAO !== undefined ? (dados.BLOQUEIA_OCUPACAO ? 'SIM' : 'NAO') : (isInterdicao || isObra ? 'SIM' : 'NAO');
  const bloqueiaMontagem = dados.BLOQUEIA_MONTAGEM !== undefined ? (dados.BLOQUEIA_MONTAGEM ? 'SIM' : 'NAO') : (isInterdicao ? 'SIM' : 'NAO');

  const severidade = dados.SEVERIDADE || (isInterdicao ? 'CRITICA' : (isObra ? 'ALTA' : 'MEDIA'));
  const user = String(usuario || Session.getActiveUser().getEmail() || 'SISTEMA').trim();

  const rowValues = [
    idBloqueio,
    idEspaco,
    dados.TIPO_BLOQUEIO,
    dtInicioIso,
    dtFimIso,
    bloqueiaReserva,
    bloqueiaOcupacao,
    bloqueiaMontagem,
    severidade,
    statusInicial,
    String(dados.MOTIVO || '').trim(),
    String(dados.ORIGEM_BLOQUEIO || 'CEOP_OPERACIONAL').trim(),
    String(dados.ID_REGISTRO_CEOP || '').trim(),
    String(dados.NUMERO_AS || '').trim(),
    String(dados.RESPONSAVEL || user).trim(),
    agora.toISOString(),
    user,
    '', // CONCLUIDO_EM
    '', // CONCLUIDO_POR
    String(dados.OBSERVACOES || '').trim()
  ];

  sh.appendRow(rowValues);

  return obterBloqueioPorId(idBloqueio);
}

/**
 * Busca um bloqueio por ID.
 * @param {string} idBloqueio
 * @returns {Object|null}
 */
function obterBloqueioPorId(idBloqueio) {
  if (!idBloqueio) return null;
  const id = String(idBloqueio).trim();
  const sh = obterAbaBloqueiosEspaco_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return null;

  const finder = sh.getRange(2, 1, lastRow - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  if (!finder) return null;

  const rowNum = finder.getRow();
  const vals = sh.getRange(rowNum, 1, 1, BLOQUEIOS_ESPACO_HEADERS.length).getValues()[0];

  const obj = {};
  BLOQUEIOS_ESPACO_HEADERS.forEach((h, idx) => {
    obj[h] = vals[idx] !== undefined && vals[idx] !== null ? String(vals[idx]) : '';
  });

  return obj;
}

/**
 * Encerra/conclui formalmente um bloqueio técnico.
 * @param {string} idBloqueio
 * @param {string} motivo
 * @param {string} usuario
 * @returns {Object} Bloqueio atualizado
 */
function encerrarBloqueio(idBloqueio, motivo, usuario) {
  const id = String(idBloqueio).trim();
  const sh = obterAbaBloqueiosEspaco_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) throw new Error('NAO_ENCONTRADO: Nenhum bloqueio registrado.');

  const finder = sh.getRange(2, 1, lastRow - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  if (!finder) throw new Error('NAO_ENCONTRADO: Bloqueio não localizado: ' + id);

  const rowNum = finder.getRow();
  const agora = new Date().toISOString();
  const user = String(usuario || Session.getActiveUser().getEmail() || 'SISTEMA').trim();

  const colStatus = BLOQUEIOS_ESPACO_HEADERS.indexOf('STATUS') + 1;
  const colFim = BLOQUEIOS_ESPACO_HEADERS.indexOf('DATA_HORA_FIM') + 1;
  const colConcEm = BLOQUEIOS_ESPACO_HEADERS.indexOf('CONCLUIDO_EM') + 1;
  const colConcPor = BLOQUEIOS_ESPACO_HEADERS.indexOf('CONCLUIDO_POR') + 1;
  const colObs = BLOQUEIOS_ESPACO_HEADERS.indexOf('OBSERVACOES') + 1;

  sh.getRange(rowNum, colStatus).setValue('CONCLUIDO');
  sh.getRange(rowNum, colFim).setValue(agora);
  sh.getRange(rowNum, colConcEm).setValue(agora);
  sh.getRange(rowNum, colConcPor).setValue(user);

  if (motivo) {
    const obsAtual = sh.getRange(rowNum, colObs).getValue();
    const novaObs = (obsAtual ? obsAtual + ' | ' : '') + '[' + agora + '] Encerramento: ' + motivo;
    sh.getRange(rowNum, colObs).setValue(novaObs);
  }

  return obterBloqueioPorId(id);
}

/**
 * Lista todos os bloqueios de um determinado espaço.
 * @param {string} idEspaco
 * @param {string} [filtroStatus]
 * @returns {Array<Object>}
 */
function listarBloqueiosDoEspaco(idEspaco, filtroStatus) {
  if (!idEspaco) return [];
  const id = String(idEspaco).trim();
  const sh = obterAbaBloqueiosEspaco_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return [];

  const data = sh.getRange(2, 1, lastRow - 1, BLOQUEIOS_ESPACO_HEADERS.length).getValues();

  return data.map(vals => {
    const obj = {};
    BLOQUEIOS_ESPACO_HEADERS.forEach((h, idx) => {
      obj[h] = vals[idx] !== undefined && vals[idx] !== null ? String(vals[idx]) : '';
    });
    return obj;
  }).filter(b => {
    if (b.ID_ESPACO !== id) return false;
    if (filtroStatus && b.STATUS !== filtroStatus) return false;
    return true;
  });
}

/**
 * Lista bloqueios vigentes em uma determinada data e hora de referência.
 * @param {string} idEspaco
 * @param {Date|string} [dataReferencia]
 * @returns {Array<Object>}
 */
function listarBloqueiosVigentes(idEspaco, dataReferencia) {
  const todos = listarBloqueiosDoEspaco(idEspaco);
  const tRef = dataReferencia ? new Date(dataReferencia).getTime() : Date.now();

  return todos.filter(b => {
    if (b.STATUS === 'CONCLUIDO' || b.STATUS === 'CANCELADO') return false;

    const tInicio = new Date(b.DATA_HORA_INICIO).getTime();
    if (isNaN(tInicio) || tRef < tInicio) return false;

    if (b.DATA_HORA_FIM) {
      const tFim = new Date(b.DATA_HORA_FIM).getTime();
      if (!isNaN(tFim) && tRef > tFim) return false;
    }

    return true;
  });
}

/**
 * Calcula dinamicamente o Estado Técnico Soberano do Espaço a partir de seus bloqueios ativos.
 * Regra:
 * - Se houver interdição ou severidade crítica -> 'INTERDITADO'
 * - Se houver obra/reforma estrutural -> 'EM_REFORMA'
 * - Se houver manutenção preventiva/corretiva ativa -> 'MANUTENCAO'
 * - Se nenhum bloqueio ativo -> 'LIBERADO'
 *
 * @param {string} idEspaco
 * @param {Date|string} [dataReferencia]
 * @returns {string} 'LIBERADO' | 'MANUTENCAO' | 'INTERDITADO' | 'EM_REFORMA'
 */
function calcularEstadoTecnicoEspaco(idEspaco, dataReferencia) {
  const vigentes = listarBloqueiosVigentes(idEspaco, dataReferencia);
  if (!vigentes || vigentes.length === 0) {
    return 'LIBERADO';
  }

  // Precedência de severidade
  if (vigentes.some(b => b.TIPO_BLOQUEIO === 'INTERDICAO_DEFESA_CIVIL_BOMBEIROS' || b.SEVERIDADE === 'CRITICA')) {
    return 'INTERDITADO';
  }

  if (vigentes.some(b => b.TIPO_BLOQUEIO === 'OBRA_REFORMA_ESTRUTURAL')) {
    return 'EM_REFORMA';
  }

  if (vigentes.some(b => b.TIPO_BLOQUEIO.startsWith('MANUTENCAO') || b.BLOQUEIA_OCUPACAO === 'SIM')) {
    return 'MANUTENCAO';
  }

  // Bloqueios leves que não impedem ocupação direta
  return 'MANUTENCAO';
}

/**
 * Avalia se o espaço está tecnicamente disponível para uma determinada finalidade e período.
 * @param {string} idEspaco
 * @param {Date|string} dataInicio
 * @param {Date|string} dataFim
 * @param {string} finalidade 'RESERVA' | 'OCUPACAO' | 'MONTAGEM'
 * @returns {Object} { disponivel: boolean, motivoBloqueio: string, bloqueiosConcorrentes: Array }
 */
function verificarDisponibilidadeTecnica(idEspaco, dataInicio, dataFim, finalidade) {
  const tIni = new Date(dataInicio).getTime();
  const tFim = new Date(dataFim).getTime();

  if (isNaN(tIni) || isNaN(tFim) || tFim < tIni) {
    throw new Error('INTERVALO_INVALIDO: Período de consulta inválido.');
  }

  const fin = String(finalidade || 'OCUPACAO').toUpperCase();
  const campoFlag = fin === 'RESERVA' ? 'BLOQUEIA_RESERVA' : (fin === 'MONTAGEM' ? 'BLOQUEIA_MONTAGEM' : 'BLOQUEIA_OCUPACAO');

  const todos = listarBloqueiosDoEspaco(idEspaco);
  const conflitos = todos.filter(b => {
    if (b.STATUS === 'CONCLUIDO' || b.STATUS === 'CANCELADO') return false;
    if (b[campoFlag] !== 'SIM') return false;

    const bIni = new Date(b.DATA_HORA_INICIO).getTime();
    const bFim = b.DATA_HORA_FIM ? new Date(b.DATA_HORA_FIM).getTime() : Infinity;

    // Sobreposição de intervalos: [tIni, tFim] intercepta [bIni, bFim]
    return (tIni <= bFim && tFim >= bIni);
  });

  return {
    disponivel: conflitos.length === 0,
    motivoBloqueio: conflitos.length > 0 ? conflitos.map(c => c.TIPO_BLOQUEIO + ': ' + c.MOTIVO).join('; ') : '',
    bloqueiosConcorrentes: conflitos
  };
}
