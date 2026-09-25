/**
 * SINALIZAÇÃO DO MALL — GESTÃO DE ESPAÇOS FÍSICOS (MILESTONE M2C)
 * Módulo: EspacosM2CService.gs
 * Objetivo: Serviços de saneamento da quarentena, reconciliação cartográfica e promoção M2C-1 (9 LUC-DEMO).
 * Runtime: Google Apps Script (V8 Engine)
 */

const M2C1_LUCS_DEMO_ALVO = Object.freeze([
  'AVALN2228',
  'AVALN2232',
  'ADMMN1172',
  'ADMMN1176',
  'RANPM2105',
  'APCBR2110',
  'R2DMR3320',
  'APCBR1104',
  'APCBR1108'
]);

/**
 * Executa a análise prévia (dry-run) dos 9 casos LUC-DEMO comprovando os 8 requisitos.
 * @returns {Object} Relatório com as 8 comprovações por caso
 */
function analisarM2C1Demo() {
  const shEsp = obterAbaEspacos_();
  const shStg = obterAbaEspacosStaging_();
  const shMapa = obterAbaLojasMapa_();

  const lastRowEsp = shEsp.getLastRow();
  const lastRowStg = shStg.getLastRow();
  const lastRowMapa = shMapa.getLastRow();

  // 1. Indexa ESPACOS existentes
  const espacosPorLuc = new Map();
  if (lastRowEsp > 1) {
    const dadosEsp = shEsp.getRange(2, 1, lastRowEsp - 1, ESPACOS_HEADERS.length).getValues();
    const colLucEsp = ESPACOS_HEADERS.indexOf('LUC');
    const colIdEsp = ESPACOS_HEADERS.indexOf('ID_ESPACO');
    for (let r = 0; r < dadosEsp.length; r++) {
      const luc = String(dadosEsp[r][colLucEsp] || '').trim().toUpperCase();
      if (luc) espacosPorLuc.set(luc, String(dadosEsp[r][colIdEsp] || '').trim());
    }
  }

  // 2. Indexa STAGING
  const stgPorLuc = new Map();
  if (lastRowStg > 1) {
    const dadosStg = shStg.getRange(2, 1, lastRowStg - 1, ESPACOS_STAGING_HEADERS.length).getValues();
    const colLucStg = ESPACOS_STAGING_HEADERS.indexOf('LUC_LEGADO');
    const colIdStg = ESPACOS_STAGING_HEADERS.indexOf('ID_STAGING');
    const colChaveMig = ESPACOS_STAGING_HEADERS.indexOf('CHAVE_MIGRACAO_ORIGEM');
    const colStatusStg = ESPACOS_STAGING_HEADERS.indexOf('STATUS_MIGRACAO');
    const colSetorStg = ESPACOS_STAGING_HEADERS.indexOf('SETOR_LEGADO');
    const colNumStg = ESPACOS_STAGING_HEADERS.indexOf('NUMERO_LEGADO');
    const colTipoStg = ESPACOS_STAGING_HEADERS.indexOf('TIPO_LEGADO');
    const colSubtipoStg = ESPACOS_STAGING_HEADERS.indexOf('SUBTIPO_LEGADO');
    const colLinhaOrig = ESPACOS_STAGING_HEADERS.indexOf('LINHA_ORIGEM');

    for (let r = 0; r < dadosStg.length; r++) {
      const luc = String(dadosStg[r][colLucStg] || '').trim().toUpperCase();
      if (luc) {
        stgPorLuc.set(luc, {
          rowNum: r + 2,
          rowIdx: r,
          idStaging: String(dadosStg[r][colIdStg] || '').trim(),
          chaveMig: String(dadosStg[r][colChaveMig] || '').trim(),
          statusMigracao: String(dadosStg[r][colStatusStg] || '').trim(),
          setor: String(dadosStg[r][colSetorStg] || '').trim(),
          numero: String(dadosStg[r][colNumStg] || '').trim(),
          tipo: String(dadosStg[r][colTipoStg] || '').trim(),
          subtipo: String(dadosStg[r][colSubtipoStg] || '').trim(),
          linhaOrigem: dadosStg[r][colLinhaOrig]
        });
      }
    }
  }

  // 3. Indexa LOJAS_MAPA
  const pinosPorLucDerivado = new Map();
  if (lastRowMapa > 1) {
    const dadosMapa = shMapa.getRange(2, 1, lastRowMapa - 1, shMapa.getLastColumn()).getValues();
    const headersMapa = shMapa.getRange(1, 1, 1, shMapa.getLastColumn()).getValues()[0].map(h => String(h || '').trim());
    const colIdPin = headersMapa.indexOf('ID_LOJA_MAPA');
    const colLucPin = headersMapa.indexOf('LUC');
    const colNumPin = headersMapa.indexOf('NUMERO_LOJA');
    const colCorredor = headersMapa.indexOf('ID_CORREDOR');
    const colIdEspaco = headersMapa.indexOf('ID_ESPACO');

    for (let r = 0; r < dadosMapa.length; r++) {
      const idLojaMapa = String(dadosMapa[r][colIdPin] || '').trim();
      const lucCol = String(dadosMapa[r][colLucPin] || '').trim();
      const match = idLojaMapa.match(/LMP-[A-Z0-9]+-([A-Z0-9]+)-([0-9]+)/);
      const lucDer = match ? (match[1] + match[2]).toUpperCase() : '';

      const pinoObj = {
        rowNum: r + 2,
        rowIdx: r,
        idLojaMapa,
        lucColuna: lucCol,
        lucDerivado: lucDer,
        corredor: String(dadosMapa[r][colCorredor] || '').trim(),
        numero: String(dadosMapa[r][colNumPin] || '').trim(),
        idEspacoExistente: colIdEspaco >= 0 ? String(dadosMapa[r][colIdEspaco] || '').trim() : ''
      };

      if (lucDer) {
        if (!pinosPorLucDerivado.has(lucDer)) pinosPorLucDerivado.set(lucDer, []);
        pinosPorLucDerivado.get(lucDer).push(pinoObj);
      }
    }
  }

  const relatorio = [];

  for (let i = 0; i < M2C1_LUCS_DEMO_ALVO.length; i++) {
    const luc = M2C1_LUCS_DEMO_ALVO[i];
    const stg = stgPorLuc.get(luc);
    const espacoExistente = espacosPorLuc.get(luc);
    const pinos = pinosPorLucDerivado.get(luc) || [];

    const pinoUnico = pinos.length === 1 ? pinos[0] : null;

    const prova1_staging = !!stg && stg.statusMigracao !== 'PROMOVIDO';
    const prova2_lucReal = !!stg;
    const prova3_idPino = !!pinoUnico;
    const prova4_lucAtualDemo = !!pinoUnico && pinoUnico.lucColuna.startsWith('LUC-DEMO');
    const prova5_lucDerivado = !!pinoUnico && pinoUnico.lucDerivado === luc;
    const prova6_endereco = !!pinoUnico && !!pinoUnico.corredor && !!pinoUnico.numero;
    const prova7_semEspacoConcorrente = !espacoExistente;
    const prova8_semPinoConcorrente = pinos.length === 1 && (!pinoUnico.idEspacoExistente);

    const inequivoco = prova1_staging && prova2_lucReal && prova3_idPino && prova4_lucAtualDemo &&
                       prova5_lucDerivado && prova6_endereco && prova7_semEspacoConcorrente && prova8_semPinoConcorrente;

    relatorio.push({
      luc,
      inequivoco,
      provas: {
        '1_registroFisicoStaging': prova1_staging ? 'OK (Staging ' + stg.idStaging + ')' : 'FALHA',
        '2_lucRealBaseImobiliaria': prova2_lucReal ? 'OK (' + luc + ')' : 'FALHA',
        '3_idLojaMapa': prova3_idPino ? 'OK (' + pinoUnico.idLojaMapa + ')' : 'FALHA',
        '4_lucAtualPino': prova4_lucAtualDemo ? 'OK (' + pinoUnico.lucColuna + ')' : 'FALHA',
        '5_lucDerivado': prova5_lucDerivado ? 'OK (' + pinoUnico.lucDerivado + ')' : 'FALHA',
        '6_setorCorredorNumero': prova6_endereco ? 'OK (' + pinoUnico.corredor + ' / ' + pinoUnico.numero + ')' : 'FALHA',
        '7_ausenciaEspacoConcorrente': prova7_semEspacoConcorrente ? 'OK (0 existentes)' : 'FALHA (Já existe: ' + espacoExistente + ')',
        '8_ausenciaPinoConcorrente': prova8_semPinoConcorrente ? 'OK (1 pino desvinculado)' : 'FALHA'
      },
      detalhes: {
        idLojaMapa: pinoUnico ? pinoUnico.idLojaMapa : null,
        lucDemoAnterior: pinoUnico ? pinoUnico.lucColuna : null,
        chaveMigracaoOrigem: stg ? stg.chaveMig : null,
        idStaging: stg ? stg.idStaging : null
      }
    });
  }

  const todosAprovados = relatorio.every(r => r.inequivoco);

  return {
    totalAnalisados: relatorio.length,
    totalAprovados: relatorio.filter(r => r.inequivoco).length,
    aptoParaPromocao: todosAprovados,
    itens: relatorio
  };
}

/**
 * Promove com segurança transacional os 9 casos LUC-DEMO no Milestone M2C-1.
 * @param {string} [usuario] Operador da migração
 * @returns {Object} Resultado detalhado do gate M2C-1
 */
function promoverM2C1Demo(usuario) {
  const user = String(usuario || Session.getActiveUser().getEmail() || 'SISTEMA_M2C1').trim();
  const agora = new Date().toISOString();

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(ESPACOS_CONFIG.LOCK_TIMEOUT_MS)) {
    throw new Error('CONCORRENCIA_LOCK_TIMEOUT: Não foi possível obter ScriptLock para o Gate M2C-1.');
  }

  try {
    const analise = analisarM2C1Demo();
    if (!analise.aptoParaPromocao) {
      throw new Error('PRECHECK_GATE_M2C1_FALHOU: Nem todos os 9 casos foram considerados inequívocos.');
    }

    const shEsp = obterAbaEspacos_();
    const shIde = obterAbaEspacoIdentificadores_();
    const shLed = obterAbaEspacosLedger_();
    const shStg = obterAbaEspacosStaging_();
    const shMapa = obterAbaLojasMapa_();

    // Carrega dados completos de STAGING para atualização
    const lastRowStg = shStg.getLastRow();
    const dadosStg = shStg.getRange(2, 1, lastRowStg - 1, ESPACOS_STAGING_HEADERS.length).getValues();
    const colLucStg = ESPACOS_STAGING_HEADERS.indexOf('LUC_LEGADO');
    const mapaLinhaStgPorLuc = new Map();
    for (let r = 0; r < dadosStg.length; r++) {
      const luc = String(dadosStg[r][colLucStg] || '').trim().toUpperCase();
      if (luc) mapaLinhaStgPorLuc.set(luc, r);
    }

    // Carrega dados completos de LOJAS_MAPA para atualização
    garantirColunasIntegracaoLojasMapa_();
    const lastRowMapa = shMapa.getLastRow();
    const lastColMapa = shMapa.getLastColumn();
    const rangeMapa = shMapa.getRange(2, 1, lastRowMapa - 1, lastColMapa);
    const dadosMapa = rangeMapa.getValues();
    const headersMapa = shMapa.getRange(1, 1, 1, lastColMapa).getValues()[0].map(h => String(h || '').trim());
    const colIdPin = headersMapa.indexOf('ID_LOJA_MAPA');
    const colLucPin = headersMapa.indexOf('LUC');
    const colIdEspPin = headersMapa.indexOf('ID_ESPACO');
    const colPapelPin = headersMapa.indexOf('PAPEL_REPRESENTACAO');
    const colObsPin = headersMapa.indexOf('OBSERVACAO');

    const mapaLinhaMapaPorId = new Map();
    for (let r = 0; r < dadosMapa.length; r++) {
      const pinId = String(dadosMapa[r][colIdPin] || '').trim();
      if (pinId) mapaLinhaMapaPorId.set(pinId, r);
    }

    // Sequenciais canônicos
    const props = PropertiesService.getScriptProperties();
    let seqEsp = parseInt(props.getProperty(ESPACOS_CONFIG.CHAVE_PROP_SEQUENCIAL_ESPACO) || '0', 10);
    const maxEsp = obterMaxIdExistenteEspacos_();
    if (seqEsp < maxEsp) seqEsp = maxEsp;

    let seqIde = parseInt(props.getProperty(ESPACOS_CONFIG.CHAVE_PROP_SEQUENCIAL_IDENTIFICADOR) || '0', 10);
    const maxIde = obterMaxIdExistenteIdentificadores_();
    if (seqIde < maxIde) seqIde = maxIde;

    const novasLinhasEspacos = [];
    const novasLinhasIdentificadores = [];
    const novasLinhasLedger = [];
    const promovidosResumo = [];

    const getValStg = (row, col) => row[ESPACOS_STAGING_HEADERS.indexOf(col)];

    for (let i = 0; i < analise.itens.length; i++) {
      const itemAnalise = analise.itens[i];
      const luc = itemAnalise.luc;
      const rStg = mapaLinhaStgPorLuc.get(luc);
      const rowStg = dadosStg[rStg];

      seqEsp += 1;
      const idEspaco = ESPACOS_CONFIG.PREFIXO_ID_ESPACO + String(seqEsp).padStart(ESPACOS_CONFIG.PAD_DIGITOS_ID, '0');

      // 1. Identificador Principal (LUC real)
      seqIde += 1;
      const idIdePrincipal = ESPACOS_CONFIG.PREFIXO_ID_IDENTIFICADOR + String(seqIde).padStart(ESPACOS_CONFIG.PAD_DIGITOS_ID, '0');
      novasLinhasIdentificadores.push([
        idIdePrincipal,
        idEspaco,
        'LUC',
        luc,
        agora,
        '',
        'SIM',
        'SIM',
        'MIGRACAO_M2C1_DEMO',
        agora,
        user,
        'Identificador principal promovido do saneamento LUC-DEMO'
      ]);

      // 2. Identificador Histórico Preservado (LUC-DEMO anterior)
      seqIde += 1;
      const idIdeHistorico = ESPACOS_CONFIG.PREFIXO_ID_IDENTIFICADOR + String(seqIde).padStart(ESPACOS_CONFIG.PAD_DIGITOS_ID, '0');
      const lucDemoAnterior = itemAnalise.detalhes.lucDemoAnterior || 'LUC-DEMO';
      novasLinhasIdentificadores.push([
        idIdeHistorico,
        idEspaco,
        'LUC_DEMO_HISTORICO',
        lucDemoAnterior,
        agora,
        agora,
        'NAO',
        'NAO',
        'MIGRACAO_M2C1_DEMO',
        agora,
        user,
        'Evidência histórica do pino experimental preservada conforme regra M2C-1'
      ]);

      const setor = String(getValStg(rowStg, 'SETOR_LEGADO') || '').trim();
      const rua = String(getValStg(rowStg, 'RUA_LEGADA') || '').trim();
      const numero = String(getValStg(rowStg, 'NUMERO_LEGADO') || '').trim();
      const tipoLegado = String(getValStg(rowStg, 'TIPO_LEGADO') || '').trim();
      const subtipoLegado = String(getValStg(rowStg, 'SUBTIPO_LEGADO') || '').trim();
      const chaveMig = String(getValStg(rowStg, 'CHAVE_MIGRACAO_ORIGEM') || '').trim();
      const idPino = itemAnalise.detalhes.idLojaMapa;

      let tipoEspacoFisico = 'BOX';
      const tipoUpper = tipoLegado.toUpperCase();
      if (tipoUpper.includes('QUIOSQUE')) tipoEspacoFisico = 'QUIOSQUE';
      else if (tipoUpper.includes('LOJA')) tipoEspacoFisico = 'LOJA';
      else if (tipoUpper.includes('MINIBOX')) tipoEspacoFisico = 'MINIBOX';
      else if (tipoUpper.includes('STAND')) tipoEspacoFisico = 'STAND_MALL';

      // 3. Registro Canônico em ESPACOS
      novasLinhasEspacos.push([
        idEspaco,
        luc,
        setor.toUpperCase(),
        rua,
        numero,
        'COMERCIAL',
        'SIM',
        tipoEspacoFisico,
        subtipoLegado || tipoEspacoFisico,
        tipoLegado,
        subtipoLegado,
        'ATIVO',
        'MIGRACAO_M2C1_DEMO',
        'DETERMINISTICO',
        'IDENTIDADE_CONFIRMADA',
        'DECLARADO',
        'NORMALIZADO',
        chaveMig,
        agora,
        '',
        agora,
        user,
        'Promovido no Milestone M2C-1 saneando pino ' + lucDemoAnterior + ' [Pino: ' + idPino + ']'
      ]);

      // 4. Registro no LEDGER
      novasLinhasLedger.push([
        String(getValStg(rowStg, 'ID_SNAPSHOT_ORIGEM') || ESPACOS_CONFIG.SNAPSHOT_ORIGEM_PADRAO).trim(),
        String(getValStg(rowStg, 'ID_REGISTRO_ORIGEM') || '').trim(),
        chaveMig,
        String(getValStg(rowStg, 'ID_STAGING') || '').trim(),
        idEspaco,
        luc,
        setor,
        String(getValStg(rowStg, 'HASH_ORIGEM') || '').trim(),
        'M2C1-2026-09-24',
        agora,
        user
      ]);

      // 5. Atualiza LOJAS_MAPA
      const rMapa = mapaLinhaMapaPorId.get(idPino);
      if (rMapa !== undefined) {
        dadosMapa[rMapa][colIdEspPin] = idEspaco;
        dadosMapa[rMapa][colPapelPin] = 'PRIMARIA';
        dadosMapa[rMapa][colLucPin] = luc; // Atualiza coluna LUC com o valor cadastral real comprovado
        const obsAtual = String(dadosMapa[rMapa][colObsPin] || '').trim();
        dadosMapa[rMapa][colObsPin] = (obsAtual ? obsAtual + ' | ' : '') +
          '[M2C-1] Migrado de teste DEMO (' + lucDemoAnterior + '). LUC real: ' + luc + '. Espaço ' + idEspaco + '.';
      }

      // 6. Atualiza STAGING
      rowStg[ESPACOS_STAGING_HEADERS.indexOf('ID_LOJA_MAPA')] = idPino;
      rowStg[ESPACOS_STAGING_HEADERS.indexOf('ID_ESPACO_GERADO')] = idEspaco;
      rowStg[ESPACOS_STAGING_HEADERS.indexOf('STATUS_MIGRACAO')] = 'PROMOVIDO';
      rowStg[ESPACOS_STAGING_HEADERS.indexOf('GRAU_CONFIANCA')] = 'DETERMINISTICO';
      rowStg[ESPACOS_STAGING_HEADERS.indexOf('CONFIANCA_IDENTIDADE')] = 'IDENTIDADE_CONFIRMADA';
      rowStg[ESPACOS_STAGING_HEADERS.indexOf('PROCESSADO_EM')] = agora;
      rowStg[ESPACOS_STAGING_HEADERS.indexOf('PROCESSADO_POR')] = user;
      rowStg[ESPACOS_STAGING_HEADERS.indexOf('OBSERVACAO_REVISAO')] =
        '[M2C-1] Promovido com sucesso. Histórico DEMO (' + lucDemoAnterior + ') preservado em identificadores.';

      promovidosResumo.push({
        luc,
        idEspaco,
        idLojaMapa: idPino,
        lucDemoAnterior,
        idIdePrincipal,
        idIdeHistorico,
        chaveMig
      });
    }

    // Persiste sequenciais atualizados
    props.setProperty(ESPACOS_CONFIG.CHAVE_PROP_SEQUENCIAL_ESPACO, String(seqEsp));
    props.setProperty(ESPACOS_CONFIG.CHAVE_PROP_SEQUENCIAL_IDENTIFICADOR, String(seqIde));

    // Batch writes em todas as abas
    shEsp.getRange(shEsp.getLastRow() + 1, 1, novasLinhasEspacos.length, ESPACOS_HEADERS.length).setValues(novasLinhasEspacos);
    shIde.getRange(shIde.getLastRow() + 1, 1, novasLinhasIdentificadores.length, ESPACO_IDENTIFICADORES_HEADERS.length).setValues(novasLinhasIdentificadores);
    shLed.getRange(shLed.getLastRow() + 1, 1, novasLinhasLedger.length, ESPACOS_LEDGER_HEADERS.length).setValues(novasLinhasLedger);
    rangeMapa.setValues(dadosMapa);
    shStg.getRange(2, 1, dadosStg.length, ESPACOS_STAGING_HEADERS.length).setValues(dadosStg);

    return {
      sucesso: true,
      milestone: 'M2C-1',
      totalAnalisados: analise.totalAnalisados,
      totalPromovidos: promovidosResumo.length,
      sequencialFinalEspaco: seqEsp,
      sequencialFinalIdentificador: seqIde,
      promovidos: promovidosResumo
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Retorna a aba CARTOGRAFIA_HISTORICO garantindo headers se necessário.
 * @private
 */
function obterAbaCartografiaHistorico_() {
  const ss = obterPlanilhaCartografiaCanonico_();
  let sh = ss.getSheetByName('CARTOGRAFIA_HISTORICO');
  if (!sh) {
    sh = ss.insertSheet('CARTOGRAFIA_HISTORICO');
    sh.getRange(1, 1, 1, S253_HIST_HEADERS.length).setValues([S253_HIST_HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/**
 * 1. Backfill dos 9 eventos do M2C-1 em CARTOGRAFIA_HISTORICO.
 * @param {string} [usuario]
 * @returns {Object}
 */
function backfillM2C1HistoricoCartografico(usuario) {
  const user = usuario || 'SISTEMA_M2C';
  const shHist = obterAbaCartografiaHistorico_();
  const lastRow = shHist.getLastRow();
  
  // Indexa eventos existentes para idempotência
  const eventosExistentes = new Set();
  if (lastRow > 1) {
    const dados = shHist.getRange(2, 1, lastRow - 1, 4).getValues();
    for (let r = 0; r < dados.length; r++) {
      const tipo = String(dados[r][1] || '').trim();
      const pino = String(dados[r][3] || '').trim();
      if (tipo === 'M2C1_CORRECAO_LUC_DEMO') {
        eventosExistentes.add(pino);
      }
    }
  }

  const eventosDemo9 = [
    { pino: 'LMP-AM-AVALN-2228-D-2642-9530', lucReal: 'AVALN2228', lucDemo: 'LUC-DEMO-006', idEspaco: 'ESP-004780' },
    { pino: 'LMP-AM-AVALN-2232-D-2461-9530', lucReal: 'AVALN2232', lucDemo: 'LUC-DEMO-005', idEspaco: 'ESP-004781' },
    { pino: 'LMP-AZ-ADMMN-1172-D-1213-4879', lucReal: 'ADMMN1172', lucDemo: 'LUC-DEMO-002', idEspaco: 'ESP-004782' },
    { pino: 'LMP-AZ-ADMMN-1176-D-1211-4727', lucReal: 'ADMMN1176', lucDemo: 'LUC-DEMO-001', idEspaco: 'ESP-004783' },
    { pino: 'LMP-BR-RANPM-2105-2111-E-1589-1016', lucReal: 'RANPM2105', lucDemo: 'LUC-DEMO-008', idEspaco: 'ESP-004784' },
    { pino: 'LMP-BR-APCBR-2110-E-8923-1158', lucReal: 'APCBR2110', lucDemo: 'LUC-DEMO-007', idEspaco: 'ESP-004785' },
    { pino: 'LMP-RX-R2DMR-3320-E-2153-2308', lucReal: 'R2DMR3320', lucDemo: 'LUC-DEMO-010', idEspaco: 'ESP-004786' },
    { pino: 'LMP-VD-APCBR-1104-E-8940-1128', lucReal: 'APCBR1104', lucDemo: 'LUC-DEMO-003', idEspaco: 'ESP-004787' },
    { pino: 'LMP-VD-APCBR-1108-E-8940-1292', lucReal: 'APCBR1108', lucDemo: 'LUC-DEMO-004', idEspaco: 'ESP-004788' }
  ];

  const novasLinhas = [];
  const agora = Utilities.formatDate(new Date(), ESPACOS_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');

  for (const item of eventosDemo9) {
    if (eventosExistentes.has(item.pino)) continue;

    const idEvento = 'CART-HIST-' + Utilities.getUuid().replace(/-/g, '').slice(0, 16).toUpperCase();
    const antesJson = JSON.stringify({
      LUC: item.lucDemo,
      ID_ESPACO: '',
      PAPEL_REPRESENTACAO: '',
      OBSERVACAO: ''
    });
    const depoisJson = JSON.stringify({
      LUC: item.lucReal,
      ID_ESPACO: item.idEspaco,
      PAPEL_REPRESENTACAO: 'PRIMARIA',
      OBSERVACAO: '[M2C-1] Migrado de teste DEMO (' + item.lucDemo + '). LUC real: ' + item.lucReal + '. Espaço ' + item.idEspaco + '.'
    });

    novasLinhas.push([
      idEvento,
      'M2C1_CORRECAO_LUC_DEMO',
      'LOJAS_MAPA',
      item.pino,
      item.idEspaco,
      'M2C-1',
      antesJson,
      depoisJson,
      'M2C1_CORRECAO_LUC_DEMO: Correção e homologação do pino DEMO para ativo físico real',
      user,
      agora,
      'MIGRACAO_M2C'
    ]);
  }

  if (novasLinhas.length > 0) {
    shHist.getRange(shHist.getLastRow() + 1, 1, novasLinhas.length, S253_HIST_HEADERS.length).setValues(novasLinhas);
  }

  return {
    sucesso: true,
    totalNovosEventos: novasLinhas.length,
    jaExistentes: eventosDemo9.length - novasLinhas.length
  };
}

/**
 * 2. Resolve e vincula as 42 representações secundárias em LOJAS_MAPA e registra histórico.
 * @param {string} [usuario]
 * @returns {Object}
 */
function resolverSecundariasM2C11(usuario) {
  const user = usuario || 'SISTEMA_M2C';
  const shMapa = obterAbaLojasMapa_();
  const shHist = obterAbaCartografiaHistorico_();
  const lastRowMapa = shMapa.getLastRow();
  if (lastRowMapa <= 1) return { sucesso: false, erro: 'LOJAS_MAPA vazia' };

  const numCols = shMapa.getLastColumn();
  const headers = shMapa.getRange(1, 1, 1, numCols).getValues()[0].map(h => String(h || '').trim());
  const colIdPino = headers.indexOf('ID_LOJA_MAPA');
  const colIdEspaco = headers.indexOf('ID_ESPACO');
  const colPapel = headers.indexOf('PAPEL_REPRESENTACAO');
  const colStatusRev = headers.indexOf('STATUS_REVISAO');
  const colMotivoRev = headers.indexOf('MOTIVO_REVISAO');
  const colRevPor = headers.indexOf('REVISADO_POR');
  const colRevEm = headers.indexOf('REVISADO_EM');

  const rangeDados = shMapa.getRange(2, 1, lastRowMapa - 1, numCols);
  const dados = rangeDados.getValues();

  // Carrega mapeamento das 42 secundárias
  const pinosSecundarios42 = [
    { id: 'LMP-AZ-RCRFR-1319-E-2562-0871', esp: 'ESP-002430' },
    { id: 'LMP-AZ-RCRFR-1315-E-2562-1023', esp: 'ESP-002428' },
    { id: 'LMP-AZ-RCRFR-1311-E-2562-1175', esp: 'ESP-001817' },
    { id: 'LMP-AZ-RCRFR-1307-E-2562-1327', esp: 'ESP-001815' },
    { id: 'LMP-AZ-RCRFR-1303-E-2562-1481', esp: 'ESP-001813' },
    { id: 'LMP-AZ-RCRFR-1299-E-2562-1633', esp: 'ESP-002426' },
    { id: 'LMP-AZ-RCRFR-1295-E-2562-1785', esp: 'ESP-002424' },
    { id: 'LMP-AZ-RCRFR-1258-E-2612-3264', esp: 'ESP-002417' },
    { id: 'LMP-VD-RPDPR-1239-E-4583-6985', esp: 'ESP-004641' },
    { id: 'LMP-VD-RPDPR-1243-E-4583-7157', esp: 'ESP-004309' },
    { id: 'LMP-VD-RPDPR-1247-E-4583-7328', esp: 'ESP-004311' },
    { id: 'LMP-VD-RPDPR-1251-E-4583-7499', esp: 'ESP-004312' },
    { id: 'LMP-VD-RPDPR-1255-E-4583-7671', esp: 'ESP-004313' },
    { id: 'LMP-VD-RPDPR-1259-E-4583-7842', esp: 'ESP-004315' },
    { id: 'LMP-VD-RPDPR-1263-E-4583-8013', esp: 'ESP-004645' },
    { id: 'LMP-VD-RSNAL-1239-E-6981-6985', esp: 'ESP-004667' },
    { id: 'LMP-VD-RSNAL-1243-E-6981-7157', esp: 'ESP-004346' },
    { id: 'LMP-VD-RSNAL-1247-E-6981-7328', esp: 'ESP-004348' },
    { id: 'LMP-VD-RSNAL-1251-E-6981-7499', esp: 'ESP-004350' },
    { id: 'LMP-VD-RSNAL-1255-E-6981-7671', esp: 'ESP-004352' },
    { id: 'LMP-VD-RSNAL-1259-E-6981-7842', esp: 'ESP-004354' },
    { id: 'LMP-VD-RSNAL-1263-E-6981-8013', esp: 'ESP-004668' },
    { id: 'LMP-AM-R2DMR-2318-E-1967-2407', esp: 'ESP-001233' },
    { id: 'LMP-AM-R2DMR-2314-E-1967-2535', esp: 'ESP-001231' },
    { id: 'LMP-AM-R2DMR-2310-E-1967-2664', esp: 'ESP-001229' },
    { id: 'LMP-AM-R2DMR-2302-E-1967-2921', esp: 'ESP-001225' },
    { id: 'LMP-AM-R2DMR-2294-E-1967-3178', esp: 'ESP-001221' },
    { id: 'LMP-AM-R2DMR-2190-E-1970-6521', esp: 'ESP-000903' },
    { id: 'LMP-AM-R2DMR-2186-E-1970-6650', esp: 'ESP-000901' },
    { id: 'LMP-AM-R2DMR-2182-E-1971-6778', esp: 'ESP-000899' },
    { id: 'LMP-AM-R2DMR-2174-E-1970-7035', esp: 'ESP-000895' },
    { id: 'LMP-AM-R2DMR-2170-E-1970-7164', esp: 'ESP-000893' },
    { id: 'LMP-AM-R2DMR-2166-E-1970-7293', esp: 'ESP-000891' },
    { id: 'LMP-AM-R2DMR-2154-E-1971-7678', esp: 'ESP-000885' },
    { id: 'LMP-AM-R2DMR-2150-E-1971-7807', esp: 'ESP-000883' },
    { id: 'LMP-AM-RCNDD-2204-E-3788-6071', esp: 'ESP-000957' },
    { id: 'LMP-AM-RGNSM-2146-E-6515-7935', esp: 'ESP-001030' },
    { id: 'LMP-AM-RJSA-2122-E-1284-8733', esp: 'ESP-001593' },
    { id: 'LMP-AM-RSNPM-2156-E-6061-7613', esp: 'ESP-001133' },
    { id: 'LMP-BR-RLBBR-2131-E-5093-2150', esp: 'ESP-002964' },
    { id: 'LMP-BR-TVPR-2191-E-3679-4254', esp: 'ESP-002978' },
    { id: 'LMP-RX-RJSA-3122-E-1452-8638', esp: 'ESP-004017' }
  ];

  const mapSec = new Map();
  pinosSecundarios42.forEach(s => mapSec.set(s.id, s.esp));

  const agora = Utilities.formatDate(new Date(), ESPACOS_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  const eventosHist = [];
  let vinculados = 0;

  for (let r = 0; r < dados.length; r++) {
    const idPino = String(dados[r][colIdPino] || '').trim();
    if (mapSec.has(idPino)) {
      const idEsp = mapSec.get(idPino);
      const antesStatus = dados[r][colStatusRev] || '';
      const antesMotivo = dados[r][colMotivoRev] || '';

      // Atualiza LOJAS_MAPA
      dados[r][colIdEspaco] = idEsp;
      dados[r][colPapel] = 'SECUNDARIA';
      dados[r][colStatusRev] = 'SECUNDARIA_CONFIRMADA';
      dados[r][colMotivoRev] = 'SEGUNDA_FACE_ACESSO_CORREDOR';
      dados[r][colRevPor] = user;
      dados[r][colRevEm] = agora;

      // Evento histórico
      const idEvento = 'CART-HIST-' + Utilities.getUuid().replace(/-/g, '').slice(0, 16).toUpperCase();
      const antesJson = JSON.stringify({
        ID_ESPACO: '',
        PAPEL_REPRESENTACAO: '',
        STATUS_REVISAO: antesStatus,
        MOTIVO_REVISAO: antesMotivo
      });
      const depoisJson = JSON.stringify({
        ID_ESPACO: idEsp,
        PAPEL_REPRESENTACAO: 'SECUNDARIA',
        STATUS_REVISAO: 'SECUNDARIA_CONFIRMADA',
        MOTIVO_REVISAO: 'SEGUNDA_FACE_ACESSO_CORREDOR'
      });

      eventosHist.push([
        idEvento,
        'VINCULO_SECUNDARIA',
        'LOJAS_MAPA',
        idPino,
        idEsp,
        'M2C-1.1',
        antesJson,
        depoisJson,
        'Vinculação de representação secundária (segunda face/acesso) ao espaço físico canônico já existente',
        user,
        agora,
        'FECHAMENTO_M2C1_1'
      ]);

      vinculados++;
    }
  }

  // Grava LOJAS_MAPA
  rangeDados.setValues(dados);

  // Grava CARTOGRAFIA_HISTORICO
  if (eventosHist.length > 0) {
    shHist.getRange(shHist.getLastRow() + 1, 1, eventosHist.length, S253_HIST_HEADERS.length).setValues(eventosHist);
  }

  return {
    sucesso: true,
    totalVinculados: vinculados,
    totalEventosGravados: eventosHist.length
  };
}

/**
 * 3. Persiste a governança nos 140 pinos restantes em LOJAS_MAPA.
 * @param {string} [usuario]
 * @returns {Object}
 */
function persistirGovernancaPinosRestantesM2C11(usuario) {
  const user = usuario || 'SISTEMA_M2C';
  const shMapa = obterAbaLojasMapa_();
  const lastRowMapa = shMapa.getLastRow();
  if (lastRowMapa <= 1) return { sucesso: false, erro: 'LOJAS_MAPA vazia' };

  const numCols = shMapa.getLastColumn();
  const headers = shMapa.getRange(1, 1, 1, numCols).getValues()[0].map(h => String(h || '').trim());
  const colIdPino = headers.indexOf('ID_LOJA_MAPA');
  const colIdEspaco = headers.indexOf('ID_ESPACO');
  const colStatusRev = headers.indexOf('STATUS_REVISAO');
  const colMotivoRev = headers.indexOf('MOTIVO_REVISAO');
  const colRevPor = headers.indexOf('REVISADO_POR');
  const colRevEm = headers.indexOf('REVISADO_EM');

  const rangeDados = shMapa.getRange(2, 1, lastRowMapa - 1, numCols);
  const dados = rangeDados.getValues();

  const agora = Utilities.formatDate(new Date(), ESPACOS_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  let atualizados = 0;
  const contagem = {};

  for (let r = 0; r < dados.length; r++) {
    const idPino = String(dados[r][colIdPino] || '').trim();
    const idEsp = String(dados[r][colIdEspaco] || '').trim();

    // Apenas pinos que ainda NÃO possuem ID_ESPACO (os 140 restantes)
    if (!idEsp) {
      let statusNovo = '';
      let motivoNovo = '';

      // 1. Pino experimental DEMO descontinuado
      if (idPino === 'LMP-RX-AVCRP-3143-E-8406-8036') {
        statusNovo = 'DEMO_DESCONTINUADO';
        motivoNovo = 'PINO_EXPERIMENTAL_SEM_ATIVO';
      }
      // 2. Erro sistemático AVALN1106
      else if (idPino.includes('AVALN-1106')) {
        statusNovo = 'ERRO_IDENTIFICACAO';
        motivoNovo = 'ERRO_SISTEMATICO_OCR_PDF';
      }
      // 3. Duplicidades imobiliárias conhecidas
      else if (idPino.includes('ADMMN-1262') || idPino.includes('RGVSM-2277')) {
        statusNovo = 'REQUER_REVISAO';
        motivoNovo = 'DUPLICIDADE_BASE_IMOBILIARIA';
      }
      // 4. Representações compostas / vértices de megalojas
      else if (
        idPino.includes('RJSA-3112') ||
        idPino.includes('RJSA-3108') ||
        idPino.includes('AVDMO-2159') ||
        idPino.includes('AVDMO-2160')
      ) {
        statusNovo = 'COMPOSTA_PENDENTE';
        motivoNovo = 'MULTI_VERTICE_MEGALOJA';
      }
      // 5. Duplicidades cartográficas
      else if (dados[r][colStatusRev] === 'DUPLICIDADE_POSSIVEL' || dados[r][colMotivoRev] === 'MESMO_SETOR_CORREDOR_LADO_NUMERO') {
        statusNovo = 'DUPLICIDADE_CARTOGRAFICA';
        motivoNovo = 'SOBREPOSICAO_MESMO_CORREDOR_LADO_NUMERO';
      }
      // 6. Sem ativo cadastral (extrações de PDF sem correspondente imobiliário)
      else {
        statusNovo = 'SEM_ATIVO_CADASTRAL';
        motivoNovo = 'EXTRACAO_PDF_SEM_CORRESPONDENTE';
      }

      dados[r][colStatusRev] = statusNovo;
      dados[r][colMotivoRev] = motivoNovo;
      dados[r][colRevPor] = user;
      dados[r][colRevEm] = agora;

      contagem[statusNovo] = (contagem[statusNovo] || 0) + 1;
      atualizados++;
    }
  }

  rangeDados.setValues(dados);

  return {
    sucesso: true,
    totalAtualizados: atualizados,
    distribuicao: contagem
  };
}

/**
 * 4. Orquestrador completo do Fechamento M2C-1.1
 * Executa as 3 etapas de fechamento cartográfico.
 * @param {string} [usuario]
 * @returns {Object}
 */
function executarFechamentoM2C11(usuario) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(ESPACOS_CONFIG.LOCK_TIMEOUT_MS)) {
    throw new Error('CONCORRENCIA_DETECTADA: Não foi possível obter trava para o Fechamento M2C-1.1.');
  }

  try {
    const user = usuario || 'SISTEMA_M2C';
    const resBackfill = backfillM2C1HistoricoCartografico(user);
    const resSecundarias = resolverSecundariasM2C11(user);
    const resGovernanca = persistirGovernancaPinosRestantesM2C11(user);

    return {
      sucesso: true,
      milestone: 'M2C-1.1',
      executadoEm: new Date().toISOString(),
      executadoPor: user,
      backfillHistorico: resBackfill,
      secundarias: resSecundarias,
      governancaRestantes: resGovernanca
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Inspeciona as tabelas canônicas reais dos bancos CADASTRO360 e FINANCEIRO.
 */
function inspecionarTabelasFontesReaisM2C2_() {
  const idCad = '1pzCRZ2799jKCGWFJETjLz2TjVs2JkIs1iYQV468HZNA';
  const idFin = '1f9-I94mjByCnoKXKBSSQPUL5ZdnHiYnmuZDmWKoeiN0';
  
  const ssCad = SpreadsheetApp.openById(idCad);
  const ssFin = SpreadsheetApp.openById(idFin);

  function getInfo(ss, aba) {
    const sh = ss.getSheetByName(aba);
    if (!sh || sh.getLastRow() < 1) return { existe: false };
    const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(v => String(v || '').trim());
    let sample = [];
    if (sh.getLastRow() >= 2) {
      sample = sh.getRange(2, 1, Math.min(2, sh.getLastRow() - 1), h.length).getValues();
    }
    return {
      existe: true,
      linhas: sh.getLastRow(),
      colunas: h,
      amostra: sample
    };
  }

  return {
    lojas: getInfo(ssCad, 'LOJAS'),
    permissionarios: getInfo(ssCad, 'PERMISSIONARIOS'),
    ocupacoes: getInfo(ssCad, 'OCUPACOES'),
    contratos: getInfo(ssFin, 'CONTRATOS'),
    contratoEspacos: getInfo(ssFin, 'CONTRATO_ESPACOS')
  };
}

/**
 * Extrai dados brutos de tabelas canônicas para auditoria e joins multi-fonte.
 * @param {string} tabela Nome da tabela canônica
 * @returns {Object}
 */
function extrairTabelaCanonicaM2C2_(tabela) {
  const bancos = {
    LOJAS: '1pzCRZ2799jKCGWFJETjLz2TjVs2JkIs1iYQV468HZNA',
    PERMISSIONARIOS: '1pzCRZ2799jKCGWFJETjLz2TjVs2JkIs1iYQV468HZNA',
    OCUPACOES: '1pzCRZ2799jKCGWFJETjLz2TjVs2JkIs1iYQV468HZNA',
    CONTRATOS: '1f9-I94mjByCnoKXKBSSQPUL5ZdnHiYnmuZDmWKoeiN0',
    CONTRATO_ESPACOS: '1f9-I94mjByCnoKXKBSSQPUL5ZdnHiYnmuZDmWKoeiN0',
    REGISTROS: '1j5bYY-0JpbLd95FyV19lyRPSG6j9kpoM8UCCWZjKchs',
    CORREDORES: '1j5bYY-0JpbLd95FyV19lyRPSG6j9kpoM8UCCWZjKchs',
    MAPA_AREAS_NIVEL: '1j5bYY-0JpbLd95FyV19lyRPSG6j9kpoM8UCCWZjKchs'
  };

  const idSs = bancos[tabela];
  if (!idSs) throw new Error('Tabela desconhecida: ' + tabela);

  const ss = SpreadsheetApp.openById(idSs);
  const sh = ss.getSheetByName(tabela);
  if (!sh) throw new Error('Aba não encontrada: ' + tabela);

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 1 || lastCol < 1) {
    return { sucesso: true, tabela, totalLinhas: 0, colunas: [], linhas: [] };
  }

  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const colunas = values[0].map(c => String(c || '').trim());
  const linhas = values.slice(1);

  return {
    sucesso: true,
    tabela,
    totalLinhas: linhas.length,
    colunas,
    linhas
  };
}

const M2C_DIAGNOSTICO_HEADERS = Object.freeze([
  'ID_STAGING',
  'LUC_LEGADO',
  'STATUS_IDENTIDADE_FISICA',
  'STATUS_IDENTIFICADOR',
  'CLASSE_ATIVO_FISICO',
  'STATUS_CARTOGRAFICO',
  'CORREDOR_OFICIAL',
  'FONTES_EVIDENCIA',
  'CONTRADICOES',
  'JUSTIFICATIVA',
  'ELEGIVEL_VISTORIA',
  'VERSAO_REGRA',
  'ID_EXECUCAO_DIAGNOSTICO',
  'HASH_FONTE',
  'DIAGNOSTICADO_EM',
  'DIAGNOSTICADO_POR',
  'ATUALIZADO_EM'
]);

const M2C_DIAGNOSTICO_HISTORICO_HEADERS = Object.freeze([
  'ID_HISTORICO_DIAGNOSTICO',
  'ID_EXECUCAO_DIAGNOSTICO',
  'ID_STAGING',
  'LUC_LEGADO',
  'STATUS_IDENTIDADE_FISICA',
  'STATUS_IDENTIFICADOR',
  'CLASSE_ATIVO_FISICO',
  'STATUS_CARTOGRAFICO',
  'CORREDOR_OFICIAL',
  'FONTES_EVIDENCIA',
  'CONTRADICOES',
  'JUSTIFICATIVA',
  'ELEGIVEL_VISTORIA',
  'VERSAO_REGRA',
  'HASH_FONTE',
  'REGISTRADO_EM',
  'REGISTRADO_POR'
]);

/**
 * Persiste as classificações dos 4 eixos do M2C-2B-1 na aba canônica ESPACOS_M2C_DIAGNOSTICO
 * e registra snapshot imutável em ESPACOS_M2C_DIAGNOSTICO_HISTORICO.
 *
 * @param {Array<Object>} registros Lista de 1.106 objetos classificados nos 4 eixos
 * @param {string} [versaoRegra='M2C-2B-1'] Versão da regra aplicada
 * @param {string} [idExecucao] ID da execução diagnóstica (ex: EXEC-M2C2B1-...)
 * @param {string} [hashFonte] Hash SHA-256 da base de dados de entrada
 * @param {string} [usuario] Usuário responsável
 * @returns {Object}
 */
function persistirDiagnostico4EixosM2C_(registros, versaoRegra, idExecucao, hashFonte, usuario) {
  const user = usuario || 'SISTEMA_M2C2B1';
  const regra = versaoRegra || 'M2C-2B-1';
  const agora = Utilities.formatDate(new Date(), ESPACOS_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  const execId = idExecucao || ('EXEC-' + Utilities.formatDate(new Date(), ESPACOS_CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase());
  const hash = hashFonte || 'SHA256_BASE_LOJISTAS_1106_CANONICO';

  const ss = obterPlanilhaEspacosCanonico_();

  // 1. Aba ESPACOS_M2C_DIAGNOSTICO (Estado Corrente)
  let shDiag = ss.getSheetByName('ESPACOS_M2C_DIAGNOSTICO');
  if (!shDiag) {
    shDiag = ss.insertSheet('ESPACOS_M2C_DIAGNOSTICO');
    shDiag.getRange(1, 1, 1, M2C_DIAGNOSTICO_HEADERS.length).setValues([M2C_DIAGNOSTICO_HEADERS]);
    shDiag.setFrozenRows(1);
  } else {
    // Garante que cabeçalhos estão atualizados
    shDiag.getRange(1, 1, 1, M2C_DIAGNOSTICO_HEADERS.length).setValues([M2C_DIAGNOSTICO_HEADERS]);
  }

  const linhasDiag = registros.map(r => [
    r.ID_STAGING,
    r.LUC_LEGADO,
    r.STATUS_IDENTIDADE_FISICA,
    r.STATUS_IDENTIFICADOR,
    r.CLASSE_ATIVO_FISICO,
    r.STATUS_CARTOGRAFICO,
    r.CORREDOR_OFICIAL || '',
    Array.isArray(r.FONTES_EVIDENCIA) ? r.FONTES_EVIDENCIA.join('; ') : String(r.FONTES_EVIDENCIA || ''),
    Array.isArray(r.CONTRADICOES) ? r.CONTRADICOES.join('; ') : String(r.CONTRADICOES || ''),
    r.JUSTIFICATIVA || '',
    r.ELEGIVEL_VISTORIA || 'NAO',
    regra,
    execId,
    hash,
    agora,
    user,
    agora
  ]);

  const lastRow = shDiag.getLastRow();
  if (lastRow > 1) {
    shDiag.getRange(2, 1, lastRow - 1, M2C_DIAGNOSTICO_HEADERS.length).clearContent();
  }
  shDiag.getRange(2, 1, linhasDiag.length, M2C_DIAGNOSTICO_HEADERS.length).setValues(linhasDiag);

  // 2. Aba ESPACOS_M2C_DIAGNOSTICO_HISTORICO (Append-Only Eventos)
  let shHist = ss.getSheetByName('ESPACOS_M2C_DIAGNOSTICO_HISTORICO');
  if (!shHist) {
    shHist = ss.insertSheet('ESPACOS_M2C_DIAGNOSTICO_HISTORICO');
    shHist.getRange(1, 1, 1, M2C_DIAGNOSTICO_HISTORICO_HEADERS.length).setValues([M2C_DIAGNOSTICO_HISTORICO_HEADERS]);
    shHist.setFrozenRows(1);
  }

  let maxHistId = 0;
  const lastRowHist = shHist.getLastRow();
  if (lastRowHist > 1) {
    const idsExistentes = shHist.getRange(2, 1, lastRowHist - 1, 1).getValues();
    idsExistentes.forEach(v => {
      const m = String(v[0] || '').match(/^DGH-(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxHistId) maxHistId = n;
      }
    });
  }

  const linhasHist = registros.map(r => {
    maxHistId++;
    return [
      'DGH-' + String(maxHistId).padStart(6, '0'),
      execId,
      r.ID_STAGING,
      r.LUC_LEGADO,
      r.STATUS_IDENTIDADE_FISICA,
      r.STATUS_IDENTIFICADOR,
      r.CLASSE_ATIVO_FISICO,
      r.STATUS_CARTOGRAFICO,
      r.CORREDOR_OFICIAL || '',
      Array.isArray(r.FONTES_EVIDENCIA) ? r.FONTES_EVIDENCIA.join('; ') : String(r.FONTES_EVIDENCIA || ''),
      Array.isArray(r.CONTRADICOES) ? r.CONTRADICOES.join('; ') : String(r.CONTRADICOES || ''),
      r.JUSTIFICATIVA || '',
      r.ELEGIVEL_VISTORIA || 'NAO',
      regra,
      hash,
      agora,
      user
    ];
  });

  if (linhasHist.length > 0) {
    shHist.getRange(lastRowHist + 1, 1, linhasHist.length, M2C_DIAGNOSTICO_HISTORICO_HEADERS.length).setValues(linhasHist);
  }

  // 3. Sincroniza metadados dos 4 eixos em ESPACOS_MIGRACAO_STAGING
  let atualizadosStg = 0;
  const shStg = obterAbaEspacosStaging_();
  const lastRowStg = shStg.getLastRow();
  if (lastRowStg > 1) {
    const rangeStg = shStg.getRange(2, 1, lastRowStg - 1, ESPACOS_STAGING_HEADERS.length);
    const dadosStg = rangeStg.getValues();
    const colIdStg = ESPACOS_STAGING_HEADERS.indexOf('ID_STAGING');
    const colDiag = ESPACOS_STAGING_HEADERS.indexOf('DIAGNOSTICO');
    const colConfIdent = ESPACOS_STAGING_HEADERS.indexOf('CONFIANCA_IDENTIDADE');
    const colObs = ESPACOS_STAGING_HEADERS.indexOf('OBSERVACAO_REVISAO');
    
    const mapaReg = new Map();
    registros.forEach(r => mapaReg.set(r.ID_STAGING, r));

    for (let i = 0; i < dadosStg.length; i++) {
      const idStg = String(dadosStg[i][colIdStg] || '').trim();
      if (mapaReg.has(idStg)) {
        const r = mapaReg.get(idStg);
        dadosStg[i][colDiag] = r.STATUS_IDENTIDADE_FISICA;
        dadosStg[i][colConfIdent] = r.STATUS_IDENTIDADE_FISICA;
        dadosStg[i][colObs] = '[' + regra + '] Eixo A: ' + r.STATUS_IDENTIDADE_FISICA +
          ' | Eixo B: ' + r.STATUS_IDENTIFICADOR +
          ' | Eixo C: ' + r.CLASSE_ATIVO_FISICO +
          ' | Eixo D: ' + r.STATUS_CARTOGRAFICO + ' (candidato sem representação vinculada). ' + r.JUSTIFICATIVA;
        atualizadosStg++;
      }
    }
    if (atualizadosStg > 0) {
      rangeStg.setValues(dadosStg);
    }
  }

  return {
    sucesso: true,
    totalPersistidos: linhasDiag.length,
    totalHistoricoAppended: linhasHist.length,
    totalAtualizadosStaging: atualizadosStg,
    idExecucao: execId,
    versaoRegra: regra,
    hashFonte: hash,
    planilha: ss.getId(),
    aba: 'ESPACOS_M2C_DIAGNOSTICO',
    abaHistorico: 'ESPACOS_M2C_DIAGNOSTICO_HISTORICO',
    atualizadoEm: agora,
    atualizadoPor: user
  };
}


/**
 * Corrige os ID_STAGING no diagnóstico M2C quando houver divergência de lineage.
 * Registra cada correção como evento append-only em ESPACOS_M2C_DIAGNOSTICO_HISTORICO.
 * 
 * NÃO altera ESPACOS, LEDGER, STAGING nem qualquer ID_ESPACO.
 * 
 * @param {Array<Object>} correcoes Lista de { idStagingAnterior, idStagingCorreto, luc }
 * @param {string} [versaoRegra='M2C-2B-3']
 * @param {string} [motivo='CORRECAO_LINEAGE_ID_STAGING']
 * @param {string} [usuario='SISTEMA_M2C2B3']
 * @returns {Object}
 */
function corrigirLineageDiagnosticoM2C_(correcoes, versaoRegra, motivo, usuario) {
  const user = usuario || 'SISTEMA_M2C2B3';
  const regra = versaoRegra || 'M2C-2B-3';
  const motivoEvento = motivo || 'CORRECAO_LINEAGE_ID_STAGING';
  const agora = Utilities.formatDate(new Date(), ESPACOS_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  const execId = 'EXEC-LINEAGE-' + Utilities.formatDate(new Date(), ESPACOS_CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();

  const ss = obterPlanilhaEspacosCanonico_();
  const shDiag = ss.getSheetByName('ESPACOS_M2C_DIAGNOSTICO');
  if (!shDiag || shDiag.getLastRow() < 2) {
    throw new Error('ESPACOS_M2C_DIAGNOSTICO ausente ou vazia.');
  }

  const hDiag = shDiag.getRange(1, 1, 1, shDiag.getLastColumn()).getValues()[0].map(function(c) { return String(c || '').trim(); });
  const dadosDiag = shDiag.getRange(2, 1, shDiag.getLastRow() - 1, hDiag.length).getValues();
  const colIdStg = hDiag.indexOf('ID_STAGING');
  const colLuc = hDiag.indexOf('LUC_LEGADO');
  const colAtualizado = hDiag.indexOf('ATUALIZADO_EM');

  // Monta mapa de correção: idAnterior -> idCorreto
  var mapaCorrecao = {};
  for (var c = 0; c < correcoes.length; c++) {
    mapaCorrecao[correcoes[c].idStagingAnterior] = correcoes[c].idStagingCorreto;
  }

  // Aplica correções em ESPACOS_M2C_DIAGNOSTICO
  var corrigidos = 0;
  var eventosHistorico = [];
  for (var r = 0; r < dadosDiag.length; r++) {
    var idAtual = String(dadosDiag[r][colIdStg] || '').trim();
    if (mapaCorrecao[idAtual]) {
      var idCorreto = mapaCorrecao[idAtual];
      dadosDiag[r][colIdStg] = idCorreto;
      if (colAtualizado >= 0) dadosDiag[r][colAtualizado] = agora;
      corrigidos++;

      eventosHistorico.push({
        idStagingAnterior: idAtual,
        idStagingCorreto: idCorreto,
        luc: String(dadosDiag[r][colLuc] || '').trim()
      });
    }
  }

  if (corrigidos > 0) {
    shDiag.getRange(2, 1, dadosDiag.length, hDiag.length).setValues(dadosDiag);
  }

  // Registra eventos de correção em ESPACOS_M2C_DIAGNOSTICO_HISTORICO
  var shHist = ss.getSheetByName('ESPACOS_M2C_DIAGNOSTICO_HISTORICO');
  if (shHist) {
    var lastRowHist = shHist.getLastRow();
    var maxHistId = 0;
    if (lastRowHist > 1) {
      var idsExistentes = shHist.getRange(2, 1, lastRowHist - 1, 1).getValues();
      for (var i = 0; i < idsExistentes.length; i++) {
        var mId = String(idsExistentes[i][0] || '').match(/^DGH-(\d+)$/);
        if (mId) {
          var n = parseInt(mId[1], 10);
          if (n > maxHistId) maxHistId = n;
        }
      }
    }

    var linhasHist = [];
    for (var e = 0; e < eventosHistorico.length; e++) {
      maxHistId++;
      var ev = eventosHistorico[e];
      linhasHist.push([
        'DGH-' + String(maxHistId).padStart(6, '0'),
        execId,
        ev.idStagingCorreto,          // ID_STAGING (corrigido)
        ev.luc,                        // LUC_LEGADO
        'CORRECAO_LINEAGE',            // STATUS_IDENTIDADE_FISICA (usado como tipo de evento)
        motivoEvento,                  // STATUS_IDENTIFICADOR (usado para motivo)
        '',                            // CLASSE_ATIVO_FISICO
        '',                            // STATUS_CARTOGRAFICO
        '',                            // CORREDOR_OFICIAL
        'ID_STAGING_ANTERIOR=' + ev.idStagingAnterior + '; ID_STAGING_CORRETO=' + ev.idStagingCorreto, // FONTES_EVIDENCIA
        '',                            // CONTRADICOES
        motivoEvento + ': ID_STAGING derivado de LINHA_ORIGEM no script de dry-run em vez da PK persistida real.', // JUSTIFICATIVA
        '',                            // ELEGIVEL_VISTORIA
        regra,                         // VERSAO_REGRA
        '',                            // HASH_FONTE
        agora,                         // REGISTRADO_EM
        user                           // REGISTRADO_POR
      ]);
    }

    if (linhasHist.length > 0) {
      shHist.getRange(lastRowHist + 1, 1, linhasHist.length, M2C_DIAGNOSTICO_HISTORICO_HEADERS.length).setValues(linhasHist);
    }
  }

  return {
    sucesso: true,
    corrigidos: corrigidos,
    totalEventosHistorico: eventosHistorico.length,
    idExecucao: execId,
    versaoRegra: regra,
    motivo: motivoEvento,
    corrigidoEm: agora,
    corrigidoPor: user
  };
}



