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
