/**
 * SINALIZAÇÃO DO MALL — GESTÃO DE ESPAÇOS FÍSICOS (M2B-0 / M2B)
 * Módulo: EspacosStagingService.gs
 * Objetivo: Camada intermediária de staging/quarentena para reconciliação pré-migração.
 * Suporta idempotência estrita com hash SHA-256, linhagem por snapshot (ID_SNAPSHOT_ORIGEM, ID_REGISTRO_ORIGEM),
 * recuperação automática de falhas no meio da transação (Crash Recovery via CHAVE_MIGRACAO_ORIGEM),
 * processamento em lotes orientado a estado e promoção exatamente-uma-vez (exactly-once).
 * Runtime: Google Apps Script (V8 Engine)
 */

/**
 * Retorna a aba ESPACOS_MIGRACAO_STAGING garantindo headers se necessário.
 * @private
 */
function obterAbaEspacosStaging_() {
  const ss = obterPlanilhaEspacosCanonico_();
  let sh = ss.getSheetByName(ESPACOS_CONFIG.SHEET_STAGING);
  if (!sh) {
    sh = ss.insertSheet(ESPACOS_CONFIG.SHEET_STAGING);
    sh.getRange(1, 1, 1, ESPACOS_STAGING_HEADERS.length).setValues([ESPACOS_STAGING_HEADERS]);
    sh.setFrozenRows(1);
  } else {
    // Garante que todas as colunas de linhagem do M2B-0 estejam presentes
    const h = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
    const faltantes = ESPACOS_STAGING_HEADERS.filter(c => !h.includes(c));
    if (faltantes.length > 0) {
      sh.getRange(1, h.length + 1, 1, faltantes.length).setValues([faltantes]);
    }
  }
  return sh;
}

/**
 * Gera múltiplos IDs de staging de forma atômica e soberana via ScriptLock e ScriptProperties.
 * @param {number} [quantidade=1]
 * @returns {Array<string>} Lista de IDs gerados (ex: ['STG-000001', ...])
 * @private
 */
function gerarProximosIdsStagingSeguro_(quantidade) {
  const qtd = Math.max(1, parseInt(quantidade || 1, 10));
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(ESPACOS_CONFIG.LOCK_TIMEOUT_MS)) {
    throw new Error('CONCORRENCIA_LOCK_TIMEOUT: Não foi possível obter ScriptLock para ID_STAGING.');
  }

  try {
    const props = PropertiesService.getScriptProperties();
    let seqAtual = parseInt(props.getProperty(ESPACOS_CONFIG.CHAVE_PROP_SEQUENCIAL_STAGING) || '0', 10);

    if (seqAtual === 0) {
      const sh = obterAbaEspacosStaging_();
      const lastRow = sh.getLastRow();
      if (lastRow > 1) {
        const values = sh.getRange(2, 1, lastRow - 1, 1).getValues();
        const regex = new RegExp('^' + ESPACOS_CONFIG.PREFIXO_ID_STAGING + '(\\d+)$');
        for (let i = 0; i < values.length; i++) {
          const match = String(values[i][0] || '').trim().match(regex);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > seqAtual) seqAtual = num;
          }
        }
      }
    }

    const ids = [];
    for (let k = 0; k < qtd; k++) {
      seqAtual += 1;
      ids.push(ESPACOS_CONFIG.PREFIXO_ID_STAGING + String(seqAtual).padStart(ESPACOS_CONFIG.PAD_DIGITOS_ID, '0'));
    }
    props.setProperty(ESPACOS_CONFIG.CHAVE_PROP_SEQUENCIAL_STAGING, String(seqAtual));
    return ids;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Gera o próximo ID de staging de forma atômica soberana via ScriptLock e ScriptProperties.
 * Formato: STG-000001
 * @private
 */
function gerarProximoIdStagingSeguro_() {
  return gerarProximosIdsStagingSeguro_(1)[0];
}

/**
 * Calcula o hash SHA-256 canônico a partir dos campos de origem brutos.
 * Garante idempotência e detecção de alterações na fonte de origem.
 * @param {Object|Array|string} dadosOrigem
 * @returns {string} Hexadecimal em minúsculas (64 chars)
 * @private
 */
function calcularHashOrigem_(dadosOrigem) {
  let strCanonica = '';
  if (Array.isArray(dadosOrigem)) {
    strCanonica = dadosOrigem.map(v => String(v ?? '').trim()).join('|');
  } else if (typeof dadosOrigem === 'object' && dadosOrigem !== null) {
    const chaves = [
      'FONTE_ORIGEM', 'CHAVE_ORIGEM', 'LUC_LEGADO', 'SETOR_LEGADO',
      'RUA_LEGADA', 'NUMERO_LEGADO', 'TIPO_LEGADO', 'SUBTIPO_LEGADO',
      'STATUS_LEGADO', 'DISPONIBILIDADE_LEGADA', 'AREA_LEGADA', 'CONTRATO_LEGADO'
    ];
    strCanonica = chaves.map(k => String(dadosOrigem[k] ?? '').trim()).join('|');
  } else {
    strCanonica = String(dadosOrigem || '');
  }

  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, strCanonica, Utilities.Charset.UTF_8);
  let hex = '';
  for (let i = 0; i < rawHash.length; i++) {
    let byte = rawHash[i];
    if (byte < 0) byte += 256;
    let byteStr = byte.toString(16);
    if (byteStr.length === 1) byteStr = '0' + byteStr;
    hex += byteStr;
  }
  return hex;
}

/**
 * Gera um ID de registro determinístico estável (ID_REGISTRO_ORIGEM) invariante à reordenação física de linhas.
 * @param {Object} rec
 * @returns {string} Ex: 'REG-3B9A7F1C82D4E5A0'
 * @private
 */
function gerarIdRegistroOrigemDeterminostico_(rec) {
  const camposIdentificadores = [
    String(rec.LUC_LEGADO || rec.LUC || '').trim().toUpperCase(),
    String(rec.SETOR_LEGADO || rec.SETOR || '').trim().toUpperCase(),
    String(rec.CONTRATO_LEGADO || rec.CONTRATO || rec.Contrato || '').trim(),
    String(rec.LOJISTA_LEGADO || rec.LOJISTA || rec.Lojista || '').trim(),
    String(rec.NOME_FANTASIA || rec.NomeFantasia || '').trim(),
    String(rec.AREA_LEGADA || rec.Area || '').trim(),
    String(rec.TIPO_LEGADO || rec.TIPO || rec.Tipo || '').trim(),
    String(rec.STATUS_LEGADO || rec.STATUS || rec.Status || '').trim()
  ].join('|');

  const hash = calcularHashOrigem_(camposIdentificadores);
  return 'REG-' + hash.substring(0, 16).toUpperCase();
}

/**
 * Insere ou atualiza um lote de registros na camada de staging de forma estritamente idempotente.
 * Requisito M2B-0:
 * - Identidade baseada em ID_SNAPSHOT_ORIGEM e ID_REGISTRO_ORIGEM estável.
 * - Reordenar a fonte não duplica nem cria novo registro.
 * - Alterações reais nos dados de origem são detectadas via HASH_ORIGEM.
 * @param {Array<Object>} registros Lista de registros brutos ou mapeados
 * @param {string} [idSnapshotOrigem] Identificador imutável do snapshot (ex: 'SNAP-LOJISTAS-20260924-E8F9A1B2')
 * @param {string} [fonteOrigem] Nome da base de origem (ex: 'BASE_LOJISTAS_CENTRO_FASHION')
 * @param {string} [versaoMigracao] Versão do pipeline de migração
 * @param {string} [usuario] Usuário operador
 * @returns {Object} { total: number, inseridos: number, atualizados: number, inalterados: number }
 */
function inserirOuAtualizarStaging(registros, idSnapshotOrigem, fonteOrigem, versaoMigracao, usuario) {
  if (!Array.isArray(registros) || registros.length === 0) {
    return { total: 0, inseridos: 0, atualizados: 0, inalterados: 0 };
  }

  const sh = obterAbaEspacosStaging_();
  const lastRow = sh.getLastRow();
  const snapshot = idSnapshotOrigem || ESPACOS_CONFIG.SNAPSHOT_ORIGEM_PADRAO;
  const fonte = fonteOrigem || 'BASE_LOJISTAS_CENTRO_FASHION';
  const versao = versaoMigracao || ESPACOS_CONFIG.VERSAO_MIGRACAO;
  const user = String(usuario || Session.getActiveUser().getEmail() || 'SISTEMA_M2B').trim();
  const agora = new Date().toISOString();

  // Carrega registros existentes no staging por CHAVE_MIGRACAO_ORIGEM
  const mapaExistentes = new Map(); // Chave: CHAVE_MIGRACAO_ORIGEM -> { rowNum, hash, idStaging, status }

  if (lastRow > 1) {
    const dadosAtuais = sh.getRange(2, 1, lastRow - 1, ESPACOS_STAGING_HEADERS.length).getValues();
    const colIdStg = ESPACOS_STAGING_HEADERS.indexOf('ID_STAGING');
    const colChaveMig = ESPACOS_STAGING_HEADERS.indexOf('CHAVE_MIGRACAO_ORIGEM');
    const colHash = ESPACOS_STAGING_HEADERS.indexOf('HASH_ORIGEM');
    const colStatus = ESPACOS_STAGING_HEADERS.indexOf('STATUS_MIGRACAO');

    for (let i = 0; i < dadosAtuais.length; i++) {
      const k = String(dadosAtuais[i][colChaveMig] || '').trim();
      if (k) {
        mapaExistentes.set(k, {
          rowNum: i + 2,
          idStaging: String(dadosAtuais[i][colIdStg] || '').trim(),
          hash: String(dadosAtuais[i][colHash] || '').trim(),
          status: String(dadosAtuais[i][colStatus] || '').trim()
        });
      }
    }
  }

  const novasLinhas = [];
  let inseridos = 0;
  let atualizados = 0;
  let inalterados = 0;

  // Pré-reserva de IDs para registros inéditos em uma única operação atômica
  let qtdNovos = 0;
  for (let idx = 0; idx < registros.length; idx++) {
    const r = registros[idx];
    const idReg = r.ID_REGISTRO_ORIGEM || gerarIdRegistroOrigemDeterminostico_(r);
    const chMig = `${snapshot}::${idReg}`;
    if (!mapaExistentes.has(chMig)) qtdNovos++;
  }
  const idsReservados = qtdNovos > 0 ? gerarProximosIdsStagingSeguro_(qtdNovos) : [];
  let cursorIdStg = 0;

  for (let idx = 0; idx < registros.length; idx++) {
    const r = registros[idx];
    const idRegistroOrigem = r.ID_REGISTRO_ORIGEM || gerarIdRegistroOrigemDeterminostico_(r);
    const chaveMigracaoOrigem = `${snapshot}::${idRegistroOrigem}`;
    const chaveOrigem = String(r.CHAVE_ORIGEM || r.LUC_LEGADO || r.LUC || idRegistroOrigem).trim();
    const linhaOrigem = r.LINHA_ORIGEM !== undefined ? r.LINHA_ORIGEM : (idx + 2);

    const dadosParaHash = {
      FONTE_ORIGEM: fonte,
      CHAVE_ORIGEM: chaveOrigem,
      LUC_LEGADO: r.LUC_LEGADO || r.LUC || '',
      SETOR_LEGADO: r.SETOR_LEGADO || r.SETOR || '',
      RUA_LEGADA: r.RUA_LEGADA || r.RUA || '',
      NUMERO_LEGADO: r.NUMERO_LEGADO || r.NUMERO || '',
      TIPO_LEGADO: r.TIPO_LEGADO || r.TIPO || '',
      SUBTIPO_LEGADO: r.SUBTIPO_LEGADO || r.SUBTIPO || '',
      STATUS_LEGADO: r.STATUS_LEGADO || r.STATUS || '',
      DISPONIBILIDADE_LEGADA: r.DISPONIBILIDADE_LEGADA || r.DISPONIBILIDADE || '',
      AREA_LEGADA: r.AREA_LEGADA || r.Area || '',
      CONTRATO_LEGADO: r.CONTRATO_LEGADO || r.CONTRATO || r.Contrato || ''
    };

    const hashCalculado = r.HASH_ORIGEM ? String(r.HASH_ORIGEM).trim() : calcularHashOrigem_(dadosParaHash);

    if (mapaExistentes.has(chaveMigracaoOrigem)) {
      const existente = mapaExistentes.get(chaveMigracaoOrigem);
      if (existente.hash === hashCalculado) {
        // Idempotente: Dados idênticos na fonte, nenhuma ação necessária
        inalterados++;
      } else {
        // Alteração detectada na fonte de origem: atualiza registro existente sem duplicar linha
        const rowNum = existente.rowNum;
        const colHash = ESPACOS_STAGING_HEADERS.indexOf('HASH_ORIGEM') + 1;
        const colDiag = ESPACOS_STAGING_HEADERS.indexOf('DIAGNOSTICO') + 1;
        const colStatus = ESPACOS_STAGING_HEADERS.indexOf('STATUS_MIGRACAO') + 1;
        const colVersao = ESPACOS_STAGING_HEADERS.indexOf('VERSAO_MIGRACAO') + 1;
        const colProcEm = ESPACOS_STAGING_HEADERS.indexOf('PROCESSADO_EM') + 1;
        const colProcPor = ESPACOS_STAGING_HEADERS.indexOf('PROCESSADO_POR') + 1;
        const colObs = ESPACOS_STAGING_HEADERS.indexOf('OBSERVACAO_REVISAO') + 1;

        sh.getRange(rowNum, colHash).setValue(hashCalculado);
        sh.getRange(rowNum, colDiag).setValue(r.DIAGNOSTICO || 'REQUER_REVISAO');
        sh.getRange(rowNum, colStatus).setValue('CLASSIFICADO');
        sh.getRange(rowNum, colVersao).setValue(versao);
        sh.getRange(rowNum, colProcEm).setValue(agora);
        sh.getRange(rowNum, colProcPor).setValue(user);
        sh.getRange(rowNum, colObs).setValue('Dado de origem alterado. Reclassificado via hash.');

        existente.hash = hashCalculado;
        atualizados++;
      }
    } else {
      // Registro inédito: utiliza ID pré-reservado
      const idStaging = idsReservados[cursorIdStg++];
      const grauConfianca = r.GRAU_CONFIANCA || 'DETERMINISTICO';
      const confiancaIdentidade = r.CONFIANCA_IDENTIDADE || grauConfianca;
      const confiancaAtributos = r.CONFIANCA_ATRIBUTOS || 'DECLARADO';
      const confiancaTipologia = r.CONFIANCA_TIPOLOGIA || 'NORMALIZADO';

      const row = [
        idStaging,
        snapshot,
        idRegistroOrigem,
        fonte,
        chaveOrigem,
        chaveMigracaoOrigem,
        linhaOrigem,
        hashCalculado,
        String(r.LUC_LEGADO || r.LUC || '').trim(),
        String(r.SETOR_LEGADO || r.SETOR || '').trim(),
        String(r.RUA_LEGADA || r.RUA || '').trim(),
        String(r.NUMERO_LEGADO || r.NUMERO || '').trim(),
        String(r.TIPO_LEGADO || r.TIPO || '').trim(),
        String(r.SUBTIPO_LEGADO || r.SUBTIPO || '').trim(),
        String(r.STATUS_LEGADO || r.STATUS || '').trim(),
        String(r.DISPONIBILIDADE_LEGADA || r.DISPONIBILIDADE || '').trim(),
        r.DIAGNOSTICO || 'CRIAR_ESPACO',
        grauConfianca,
        confiancaIdentidade,
        confiancaAtributos,
        confiancaTipologia,
        String(r.ID_LOJA_MAPA || '').trim(),
        '', // ID_ESPACO_GERADO (preenchido exclusivamente na promoção)
        'PENDENTE', // STATUS_MIGRACAO inicial
        versao,
        agora,
        user,
        String(r.OBSERVACAO_REVISAO || '').trim()
      ];

      novasLinhas.push(row);
      mapaExistentes.set(chaveMigracaoOrigem, {
        rowNum: lastRow + novasLinhas.length,
        idStaging: idStaging,
        hash: hashCalculado,
        status: 'PENDENTE'
      });
      inseridos++;
    }
  }

  if (novasLinhas.length > 0) {
    sh.getRange(sh.getLastRow() + 1, 1, novasLinhas.length, ESPACOS_STAGING_HEADERS.length).setValues(novasLinhas);
  }

  return {
    total: registros.length,
    inseridos: inseridos,
    atualizados: atualizados,
    inalterados: inalterados
  };
}

/**
 * Promove um registro de staging para a entidade canônica ESPACOS com garantia estrita EXACTLY-ONCE
 * e sobrevivência a falhas no meio da transação (Crash Recovery via CHAVE_MIGRACAO_ORIGEM).
 * Requisito M2B-0:
 * 1. Verifica se staging já possui ID_ESPACO_GERADO.
 * 2. Verifica se ESPACOS já possui um registro com a mesma CHAVE_MIGRACAO_ORIGEM (recuperação de crash).
 * 3. Se encontrar espaço preexistente, repara o staging e reutiliza o ID sem criar duplicata.
 * 4. Suporta Failure Injection para validação automatizada.
 * @param {string} idStaging ID da linha em ESPACOS_MIGRACAO_STAGING (ex: 'STG-000001')
 * @param {string} [usuario] Usuário promovente
 * @param {Object} [opcoes] { simularFalhaAposCriarEspaco: boolean }
 * @returns {Object} { idStaging: string, idEspaco: string, jaPromovido: boolean, recuperadoDeFalha: boolean }
 */
function promoverRegistroStaging(idStaging, usuario, opcoes) {
  if (!idStaging) throw new Error('ID_STAGING_OBRIGATORIO: Informe o ID do registro de staging.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(ESPACOS_CONFIG.LOCK_TIMEOUT_MS)) {
    throw new Error('CONCORRENCIA_LOCK_TIMEOUT: Não foi possível obter ScriptLock para promover registro ' + idStaging);
  }

  try {
    const shStg = obterAbaEspacosStaging_();
    const lastRow = shStg.getLastRow();
    if (lastRow <= 1) throw new Error('STAGING_VAZIO: Nenhuma linha em staging.');

    const finder = shStg.getRange(2, 1, lastRow - 1, 1).createTextFinder(idStaging).matchEntireCell(true).findNext();
    if (!finder) throw new Error('STAGING_NAO_ENCONTRADO: Registro ' + idStaging + ' não localizado.');

    const rowNum = finder.getRow();
    const rowValues = shStg.getRange(rowNum, 1, 1, ESPACOS_STAGING_HEADERS.length).getValues()[0];
    const getVal = (colName) => rowValues[ESPACOS_STAGING_HEADERS.indexOf(colName)];

    const statusAtual = String(getVal('STATUS_MIGRACAO') || '').trim();
    const idEspacoExistenteNoStaging = String(getVal('ID_ESPACO_GERADO') || '').trim();
    const chaveMigracaoOrigem = String(getVal('CHAVE_MIGRACAO_ORIGEM') || '').trim();
    const user = String(usuario || Session.getActiveUser().getEmail() || 'SISTEMA_MIGRACAO').trim();
    const agora = new Date().toISOString();

    const colIdEspaco = ESPACOS_STAGING_HEADERS.indexOf('ID_ESPACO_GERADO') + 1;
    const colStatus = ESPACOS_STAGING_HEADERS.indexOf('STATUS_MIGRACAO') + 1;
    const colProcEm = ESPACOS_STAGING_HEADERS.indexOf('PROCESSADO_EM') + 1;
    const colProcPor = ESPACOS_STAGING_HEADERS.indexOf('PROCESSADO_POR') + 1;

    // TIER 1: Se staging já está promovido e possui ID_ESPACO_GERADO
    if (statusAtual === 'PROMOVIDO' && idEspacoExistenteNoStaging !== '') {
      return {
        idStaging: idStaging,
        idEspaco: idEspacoExistenteNoStaging,
        jaPromovido: true,
        recuperadoDeFalha: false,
        mensagem: 'Registro já promovido anteriormente. ID_ESPACO preservado: ' + idEspacoExistenteNoStaging
      };
    }

    // TIER 2 (CRASH RECOVERY): Se a execução anterior falhou APÓS criar em ESPACOS e ANTES de atualizar staging
    if (chaveMigracaoOrigem) {
      const espacoOrfaoNoStaging = procurarEspacoPorChaveOrigem_(chaveMigracaoOrigem);
      if (espacoOrfaoNoStaging) {
        // REPARAÇÃO DO STAGING: Vincula o ID_ESPACO já criado e encerra sem duplicar!
        const idEspacoRecuperado = espacoOrfaoNoStaging.ID_ESPACO;
        shStg.getRange(rowNum, colIdEspaco).setValue(idEspacoRecuperado);
        shStg.getRange(rowNum, colStatus).setValue('PROMOVIDO');
        shStg.getRange(rowNum, colProcEm).setValue(agora);
        shStg.getRange(rowNum, colProcPor).setValue(user);

        // Garante registro no Ledger Permanente
        if (typeof consultarLedgerPorIdEspaco === 'function' && !consultarLedgerPorIdEspaco(idEspacoRecuperado)) {
          gravarEntradaLedgerMigracao_({
            ID_SNAPSHOT_ORIGEM: String(getVal('ID_SNAPSHOT_ORIGEM') || ESPACOS_CONFIG.SNAPSHOT_ORIGEM_PADRAO).trim(),
            ID_REGISTRO_ORIGEM: String(getVal('ID_REGISTRO_ORIGEM') || '').trim(),
            CHAVE_MIGRACAO_ORIGEM: chaveMigracaoOrigem,
            ID_STAGING: idStaging,
            ID_ESPACO: idEspacoRecuperado,
            LUC: String(getVal('LUC_LEGADO') || '').trim(),
            SETOR: String(getVal('SETOR_LEGADO') || '').trim(),
            HASH_ORIGEM: String(getVal('HASH_ORIGEM') || '').trim(),
            VERSAO_REGRA: String(getVal('VERSAO_MIGRACAO') || ESPACOS_CONFIG.VERSAO_MIGRACAO).trim(),
            PROMOVIDO_EM: agora,
            PROMOVIDO_POR: user
          });
        }

        return {
          idStaging: idStaging,
          idEspaco: idEspacoRecuperado,
          jaPromovido: true,
          recuperadoDeFalha: true,
          mensagem: 'Recuperação de falha ativa: Staging reparado a partir de espaço já persistido em ESPACOS: ' + idEspacoRecuperado
        };
      }
    }

    const grauConfianca = String(getVal('GRAU_CONFIANCA') || '').trim();
    const confiancaIdentidade = String(getVal('CONFIANCA_IDENTIDADE') || grauConfianca || 'DETERMINISTICO').trim();
    const confiancaAtributos = String(getVal('CONFIANCA_ATRIBUTOS') || 'DECLARADO').trim();
    const confiancaTipologia = String(getVal('CONFIANCA_TIPOLOGIA') || 'NORMALIZADO').trim();

    const luc = String(getVal('LUC_LEGADO') || '').trim();
    const setor = String(getVal('SETOR_LEGADO') || '').trim();
    const rua = String(getVal('RUA_LEGADA') || '').trim();
    const numero = String(getVal('NUMERO_LEGADO') || '').trim();
    const tipoLegado = String(getVal('TIPO_LEGADO') || '').trim();
    const subtipoLegado = String(getVal('SUBTIPO_LEGADO') || '').trim();
    const idPino = String(getVal('ID_LOJA_MAPA') || '').trim();

    // Normalização arquitetural da tipologia física (preservando tipo legado se incerto)
    let tipoEspacoFisico = 'BOX';
    const tipoUpper = tipoLegado.toUpperCase();
    if (tipoUpper.includes('QUIOSQUE')) tipoEspacoFisico = 'QUIOSQUE';
    else if (tipoUpper.includes('LOJA')) tipoEspacoFisico = 'LOJA';
    else if (tipoUpper.includes('MINIBOX')) tipoEspacoFisico = 'MINIBOX';
    else if (tipoUpper.includes('STAND')) tipoEspacoFisico = 'STAND_MALL';
    else if (tipoUpper.includes('DOCA')) tipoEspacoFisico = 'DOCA';
    else if (tipoUpper.includes('EVENTO')) tipoEspacoFisico = 'AREA_ABERTA';

    // Criação atômica no cadastro canônico ESPACOS
    const novoEspaco = criarEspaco({
      LUC: luc,
      SETOR: setor,
      RUA: rua,
      NUMERO: numero,
      CLASSE_ESPACO: 'COMERCIAL',
      ELEGIVEL_RESERVA: 'SIM',
      TIPO_ESPACO_FISICO: tipoEspacoFisico,
      SUBTIPO_ESPACO_FISICO: subtipoLegado || tipoEspacoFisico,
      TIPO_LEGADO: tipoLegado,
      SUBTIPO_LEGADO: subtipoLegado,
      ESTADO_CADASTRAL: 'ATIVO',
      ORIGEM_DADOS: 'MIGRACAO_LEGADO_2026',
      CONFIANCA_CADASTRO: grauConfianca || 'DETERMINISTICO',
      CONFIANCA_IDENTIDADE: confiancaIdentidade,
      CONFIANCA_ATRIBUTOS: confiancaAtributos,
      CONFIANCA_TIPOLOGIA: confiancaTipologia,
      CHAVE_MIGRACAO_ORIGEM: chaveMigracaoOrigem,
      CRIADO_EM: agora,
      OBSERVACOES: 'Migrado do staging ' + idStaging + (idPino ? ' [Pino: ' + idPino + ']' : '')
    }, user);

    const idEspacoGerado = novoEspaco.ID_ESPACO;

    // SIMULAÇÃO DE FALHA (FAILURE INJECTION) PARA TESTE DE RESILIÊNCIA M2B-0
    if (opcoes && opcoes.simularFalhaAposCriarEspaco === true) {
      throw new Error('FAILURE_INJECTION_M2B0: Falha simulada imediatamente após criar ESPACOS (' + idEspacoGerado + ') e antes de gravar staging.');
    }

    // Vinculação permanente em ESPACOS_MIGRACAO_STAGING
    shStg.getRange(rowNum, colIdEspaco).setValue(idEspacoGerado);
    shStg.getRange(rowNum, colStatus).setValue('PROMOVIDO');
    shStg.getRange(rowNum, colProcEm).setValue(agora);
    shStg.getRange(rowNum, colProcPor).setValue(user);

    // Gravação no LEDGER PERMANENTE DA MIGRAÇÃO (M2B Requisito 6)
    if (typeof gravarEntradaLedgerMigracao_ === 'function') {
      gravarEntradaLedgerMigracao_({
        ID_SNAPSHOT_ORIGEM: String(getVal('ID_SNAPSHOT_ORIGEM') || ESPACOS_CONFIG.SNAPSHOT_ORIGEM_PADRAO).trim(),
        ID_REGISTRO_ORIGEM: String(getVal('ID_REGISTRO_ORIGEM') || '').trim(),
        CHAVE_MIGRACAO_ORIGEM: chaveMigracaoOrigem,
        ID_STAGING: idStaging,
        ID_ESPACO: idEspacoGerado,
        LUC: luc,
        SETOR: setor,
        HASH_ORIGEM: String(getVal('HASH_ORIGEM') || '').trim(),
        VERSAO_REGRA: String(getVal('VERSAO_MIGRACAO') || ESPACOS_CONFIG.VERSAO_MIGRACAO).trim(),
        PROMOVIDO_EM: agora,
        PROMOVIDO_POR: user
      });
    }

    return {
      idStaging: idStaging,
      idEspaco: idEspacoGerado,
      jaPromovido: false,
      recuperadoDeFalha: false,
      mensagem: 'Promovido com sucesso exatamente uma vez.'
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Executa o processamento em lotes da camada de staging orientado a estado individual (STATUS_MIGRACAO).
 * Requisito M2B-0:
 * - A retomada não depende exclusivamente de offset físico de linha.
 * - Localiza próximos registros com status elegível ('PENDENTE', 'CLASSIFICADO', 'VALIDADO').
 * - Grava checkpoint seguro nas ScriptProperties.
 * @param {Object} [opcoes] { tamanhoLote: number, somenteConfianca: string, resetCheckpoint: boolean }
 * @param {string} [usuario] Usuário responsável
 * @returns {Object} { processadosLote: number, checkpoint: Object, temMais: boolean }
 */
function processarLoteStagingRetomavel(opcoes, usuario) {
  const opts = opcoes || {};
  const tamanhoLote = opts.tamanhoLote || ESPACOS_CONFIG.TAMANHO_LOTE_PADRAO;
  const props = PropertiesService.getScriptProperties();
  const tempoInicio = Date.now();
  const user = String(usuario || Session.getActiveUser().getEmail() || 'SISTEMA_MIGRACAO').trim();

  if (opts.resetCheckpoint) {
    props.deleteProperty(ESPACOS_CONFIG.CHAVE_PROP_CHECKPOINT_MIGRACAO);
  }

  let checkpoint = {
    ultimoIdStaging: '',
    totalProcessados: 0,
    status: 'EM_ANDAMENTO',
    ultimaExecucao: null
  };

  const rawCheckpoint = props.getProperty(ESPACOS_CONFIG.CHAVE_PROP_CHECKPOINT_MIGRACAO);
  if (rawCheckpoint) {
    try {
      checkpoint = JSON.parse(rawCheckpoint);
    } catch (_) {
      checkpoint = { ultimoIdStaging: '', totalProcessados: 0, status: 'EM_ANDAMENTO', ultimaExecucao: null };
    }
  }

  const sh = obterAbaEspacosStaging_();
  const lastRow = sh.getLastRow();

  if (lastRow <= 1) {
    checkpoint.status = 'CONCLUIDO';
    checkpoint.ultimaExecucao = new Date().toISOString();
    props.setProperty(ESPACOS_CONFIG.CHAVE_PROP_CHECKPOINT_MIGRACAO, JSON.stringify(checkpoint));
    return { processadosLote: 0, checkpoint: checkpoint, temMais: false };
  }

  const dados = sh.getRange(2, 1, lastRow - 1, ESPACOS_STAGING_HEADERS.length).getValues();
  const colIdStg = ESPACOS_STAGING_HEADERS.indexOf('ID_STAGING');
  const colStatus = ESPACOS_STAGING_HEADERS.indexOf('STATUS_MIGRACAO');
  const colProcEm = ESPACOS_STAGING_HEADERS.indexOf('PROCESSADO_EM');

  let processadosNesteLote = 0;
  let ultimoIdProcessado = checkpoint.ultimoIdStaging;
  let encontrouLinhasElegiveisRestantes = false;

  for (let i = 0; i < dados.length; i++) {
    // Guarda de tempo contra limite de execução do Apps Script
    if (Date.now() - tempoInicio > ESPACOS_CONFIG.MAX_TEMPO_EXECUCAO_MS) {
      encontrouLinhasElegiveisRestantes = true;
      break;
    }

    const rowNum = i + 2;
    const idStg = String(dados[i][colIdStg] || '').trim();
    const statusAtual = String(dados[i][colStatus] || '').trim();

    // Filtra apenas registros elegíveis para processamento/classificação
    if (statusAtual === 'PENDENTE') {
      sh.getRange(rowNum, colStatus + 1).setValue('CLASSIFICADO');
      sh.getRange(rowNum, colProcEm + 1).setValue(new Date().toISOString());

      processadosNesteLote++;
      ultimoIdProcessado = idStg;

      if (processadosNesteLote >= tamanhoLote) {
        // Verifica se há mais após este lote
        encontrouLinhasElegiveisRestantes = (i + 1) < dados.length;
        break;
      }
    }
  }

  checkpoint.totalProcessados += processadosNesteLote;
  checkpoint.ultimoIdStaging = ultimoIdProcessado;
  checkpoint.status = encontrouLinhasElegiveisRestantes ? 'EM_ANDAMENTO' : 'CONCLUIDO';
  checkpoint.ultimaExecucao = new Date().toISOString();

  props.setProperty(ESPACOS_CONFIG.CHAVE_PROP_CHECKPOINT_MIGRACAO, JSON.stringify(checkpoint));

  return {
    processadosLote: processadosNesteLote,
    checkpoint: checkpoint,
    temMais: encontrouLinhasElegiveisRestantes,
    tempoDecorridoMs: Date.now() - tempoInicio
  };
}

/**
 * Retorna estatísticas consolidadas e detalhadas da camada de staging.
 * @returns {Object}
 */
function obterEstatisticasStaging() {
  const sh = obterAbaEspacosStaging_();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) {
    return {
      total: 0,
      porDiagnostico: {},
      porConfianca: {},
      porStatus: {},
      totalPromovidos: 0
    };
  }

  const data = sh.getRange(2, 1, lastRow - 1, ESPACOS_STAGING_HEADERS.length).getValues();
  const colDiag = ESPACOS_STAGING_HEADERS.indexOf('DIAGNOSTICO');
  const colConf = ESPACOS_STAGING_HEADERS.indexOf('GRAU_CONFIANCA');
  const colStatus = ESPACOS_STAGING_HEADERS.indexOf('STATUS_MIGRACAO');
  const colEspaco = ESPACOS_STAGING_HEADERS.indexOf('ID_ESPACO_GERADO');

  const porDiag = {};
  const porConf = {};
  const porStatus = {};
  let totalPromovidos = 0;

  data.forEach(r => {
    const d = String(r[colDiag] || 'NAO_DEFINIDO');
    const c = String(r[colConf] || 'NAO_DEFINIDO');
    const s = String(r[colStatus] || 'NAO_DEFINIDO');
    const esp = String(r[colEspaco] || '').trim();

    porDiag[d] = (porDiag[d] || 0) + 1;
    porConf[c] = (porConf[c] || 0) + 1;
    porStatus[s] = (porStatus[s] || 0) + 1;

    if (esp || s === 'PROMOVIDO') totalPromovidos++;
  });

  return {
    total: data.length,
    porDiagnostico: porDiag,
    porConfianca: porConf,
    porStatus: porStatus,
    totalPromovidos: totalPromovidos
  };
}

/**
 * Promove múltiplos registros de staging em bloco com alta performance.
 * Reduz centenas de roundtrips a poucas operações em lote (setValues),
 * preservando exatamente as mesmas regras de integridade, Exactly-Once, Ledger e ScriptLock.
 * @param {Array<string>} idsStaging Lista de IDs de staging a promover
 * @param {string} [usuario] Usuário operador
 * @returns {Array<Object>} Lista de resultados por ID [{ idStaging, idEspaco, status, jaPromovido, recuperadoDeFalha }]
 */
function promoverLoteStagingEmBloco(idsStaging, usuario) {
  if (!Array.isArray(idsStaging) || idsStaging.length === 0) return [];
  const user = String(usuario || Session.getActiveUser().getEmail() || 'SISTEMA_M2B').trim();
  const agora = new Date().toISOString();

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(ESPACOS_CONFIG.LOCK_TIMEOUT_MS)) {
    throw new Error('CONCORRENCIA_LOCK_TIMEOUT: Não foi possível obter ScriptLock para promover lote em bloco.');
  }

  try {
    const shStg = obterAbaEspacosStaging_();
    const lastRowStg = shStg.getLastRow();
    if (lastRowStg <= 1) throw new Error('STAGING_VAZIO: Nenhuma linha em staging.');

    const dadosStg = shStg.getRange(2, 1, lastRowStg - 1, ESPACOS_STAGING_HEADERS.length).getValues();
    const mapaStgPorId = new Map();
    const colIdStg = ESPACOS_STAGING_HEADERS.indexOf('ID_STAGING');
    const colChaveMig = ESPACOS_STAGING_HEADERS.indexOf('CHAVE_MIGRACAO_ORIGEM');
    const colIdReg = ESPACOS_STAGING_HEADERS.indexOf('ID_REGISTRO_ORIGEM');
    for (let r = 0; r < dadosStg.length; r++) {
      const entry = { rowIdx: r, rowNum: r + 2, data: dadosStg[r], modificado: false };
      const id = String(dadosStg[r][colIdStg] || '').trim();
      const chMig = String(dadosStg[r][colChaveMig] || '').trim();
      const idReg = String(dadosStg[r][colIdReg] || '').trim();
      if (id) mapaStgPorId.set(id, entry);
      if (chMig) mapaStgPorId.set(chMig, entry);
      if (idReg) mapaStgPorId.set(idReg, entry);
    }

    const shEsp = obterAbaEspacos_();
    const lastRowEsp = shEsp.getLastRow();
    const mapaEspPorChaveOrigem = new Map();
    if (lastRowEsp > 1) {
      const dadosEsp = shEsp.getRange(2, 1, lastRowEsp - 1, ESPACOS_HEADERS.length).getValues();
      const colChaveOrigemEsp = ESPACOS_HEADERS.indexOf('CHAVE_MIGRACAO_ORIGEM');
      const colIdEsp = ESPACOS_HEADERS.indexOf('ID_ESPACO');
      for (let r = 0; r < dadosEsp.length; r++) {
        const ch = String(dadosEsp[r][colChaveOrigemEsp] || '').trim();
        if (ch) mapaEspPorChaveOrigem.set(ch, String(dadosEsp[r][colIdEsp] || '').trim());
      }
    }

    const itensParaPromover = [];
    const resultados = [];
    const getValRow = (row, colName) => row[ESPACOS_STAGING_HEADERS.indexOf(colName)];

    for (let i = 0; i < idsStaging.length; i++) {
      const idStg = idsStaging[i];
      if (!mapaStgPorId.has(idStg)) {
        resultados.push({ idStaging: idStg, status: 'ERRO', erro: 'Registro não encontrado em staging: ' + idStg });
        continue;
      }

      const stgEntry = mapaStgPorId.get(idStg);
      const row = stgEntry.data;
      const statusAtual = String(getValRow(row, 'STATUS_MIGRACAO') || '').trim();
      const idEspacoExistente = String(getValRow(row, 'ID_ESPACO_GERADO') || '').trim();
      const chaveMig = String(getValRow(row, 'CHAVE_MIGRACAO_ORIGEM') || '').trim();

      // Tier 1: Já promovido
      if (statusAtual === 'PROMOVIDO' && idEspacoExistente !== '') {
        resultados.push({ idStaging: idStg, idEspaco: idEspacoExistente, status: 'OK', jaPromovido: true, recuperadoDeFalha: false });
        continue;
      }

      // Tier 2: Crash recovery
      if (chaveMig && mapaEspPorChaveOrigem.has(chaveMig)) {
        const idRecuperado = mapaEspPorChaveOrigem.get(chaveMig);
        row[ESPACOS_STAGING_HEADERS.indexOf('ID_ESPACO_GERADO')] = idRecuperado;
        row[ESPACOS_STAGING_HEADERS.indexOf('STATUS_MIGRACAO')] = 'PROMOVIDO';
        row[ESPACOS_STAGING_HEADERS.indexOf('PROCESSADO_EM')] = agora;
        row[ESPACOS_STAGING_HEADERS.indexOf('PROCESSADO_POR')] = user;
        stgEntry.modificado = true;

        resultados.push({ idStaging: idStg, idEspaco: idRecuperado, status: 'OK', jaPromovido: true, recuperadoDeFalha: true });
        continue;
      }

      itensParaPromover.push({ idStaging: idStg, stgEntry: stgEntry });
    }

    // Se houver novos para promover
    if (itensParaPromover.length > 0) {
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
      const pinosAtualizar = new Map();

      for (let k = 0; k < itensParaPromover.length; k++) {
        const item = itensParaPromover[k];
        const stgEntry = item.stgEntry;
        const row = stgEntry.data;

        seqEsp += 1;
        const idEspaco = ESPACOS_CONFIG.PREFIXO_ID_ESPACO + String(seqEsp).padStart(ESPACOS_CONFIG.PAD_DIGITOS_ID, '0');

        seqIde += 1;
        const idIdentificador = ESPACOS_CONFIG.PREFIXO_ID_IDENTIFICADOR + String(seqIde).padStart(ESPACOS_CONFIG.PAD_DIGITOS_ID, '0');

        const luc = String(getValRow(row, 'LUC_LEGADO') || '').trim();
        const setor = String(getValRow(row, 'SETOR_LEGADO') || '').trim();
        const rua = String(getValRow(row, 'RUA_LEGADA') || '').trim();
        const numero = String(getValRow(row, 'NUMERO_LEGADO') || '').trim();
        const tipoLegado = String(getValRow(row, 'TIPO_LEGADO') || '').trim();
        const subtipoLegado = String(getValRow(row, 'SUBTIPO_LEGADO') || '').trim();
        const idPino = String(getValRow(row, 'ID_LOJA_MAPA') || '').trim();
        const grauConfianca = String(getValRow(row, 'GRAU_CONFIANCA') || 'DETERMINISTICO').trim();
        const confiancaIdentidade = String(getValRow(row, 'CONFIANCA_IDENTIDADE') || grauConfianca).trim();
        const confiancaAtributos = String(getValRow(row, 'CONFIANCA_ATRIBUTOS') || 'DECLARADO').trim();
        const confiancaTipologia = String(getValRow(row, 'CONFIANCA_TIPOLOGIA') || 'NORMALIZADO').trim();
        const chaveMig = String(getValRow(row, 'CHAVE_MIGRACAO_ORIGEM') || '').trim();

        let tipoEspacoFisico = 'BOX';
        const tipoUpper = tipoLegado.toUpperCase();
        if (tipoUpper.includes('QUIOSQUE')) tipoEspacoFisico = 'QUIOSQUE';
        else if (tipoUpper.includes('LOJA')) tipoEspacoFisico = 'LOJA';
        else if (tipoUpper.includes('MINIBOX')) tipoEspacoFisico = 'MINIBOX';
        else if (tipoUpper.includes('STAND')) tipoEspacoFisico = 'STAND_MALL';
        else if (tipoUpper.includes('DOCA')) tipoEspacoFisico = 'DOCA';
        else if (tipoUpper.includes('EVENTO')) tipoEspacoFisico = 'AREA_ABERTA';

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
          'MIGRACAO_LEGADO_2026',
          grauConfianca,
          confiancaIdentidade,
          confiancaAtributos,
          confiancaTipologia,
          chaveMig,
          agora,
          '',
          agora,
          user,
          'Migrado do staging ' + item.idStaging + (idPino ? ' [Pino: ' + idPino + ']' : '')
        ]);

        if (luc) {
          novasLinhasIdentificadores.push([
            idIdentificador,
            idEspaco,
            'LUC',
            luc,
            agora,
            '',
            'SIM',
            'SIM',
            'MIGRACAO_LEGADO_2026',
            agora,
            user,
            'Identificador principal migrado'
          ]);
        }

        novasLinhasLedger.push([
          String(getValRow(row, 'ID_SNAPSHOT_ORIGEM') || ESPACOS_CONFIG.SNAPSHOT_ORIGEM_PADRAO).trim(),
          String(getValRow(row, 'ID_REGISTRO_ORIGEM') || '').trim(),
          chaveMig,
          item.idStaging,
          idEspaco,
          luc,
          setor,
          String(getValRow(row, 'HASH_ORIGEM') || '').trim(),
          String(getValRow(row, 'VERSAO_MIGRACAO') || ESPACOS_CONFIG.VERSAO_MIGRACAO).trim(),
          agora,
          user
        ]);

        if (idPino) {
          pinosAtualizar.set(idPino, idEspaco);
        }

        row[ESPACOS_STAGING_HEADERS.indexOf('ID_ESPACO_GERADO')] = idEspaco;
        row[ESPACOS_STAGING_HEADERS.indexOf('STATUS_MIGRACAO')] = 'PROMOVIDO';
        row[ESPACOS_STAGING_HEADERS.indexOf('PROCESSADO_EM')] = agora;
        row[ESPACOS_STAGING_HEADERS.indexOf('PROCESSADO_POR')] = user;
        stgEntry.modificado = true;

        resultados.push({ idStaging: item.idStaging, idEspaco: idEspaco, status: 'OK', jaPromovido: false, recuperadoDeFalha: false });
      }

      props.setProperty(ESPACOS_CONFIG.CHAVE_PROP_SEQUENCIAL_ESPACO, String(seqEsp));
      props.setProperty(ESPACOS_CONFIG.CHAVE_PROP_SEQUENCIAL_IDENTIFICADOR, String(seqIde));

      if (novasLinhasEspacos.length > 0) {
        shEsp.getRange(shEsp.getLastRow() + 1, 1, novasLinhasEspacos.length, ESPACOS_HEADERS.length).setValues(novasLinhasEspacos);
      }

      if (novasLinhasIdentificadores.length > 0) {
        const shIde = obterAbaEspacoIdentificadores_();
        shIde.getRange(shIde.getLastRow() + 1, 1, novasLinhasIdentificadores.length, ESPACO_IDENTIFICADORES_HEADERS.length).setValues(novasLinhasIdentificadores);
      }

      if (novasLinhasLedger.length > 0) {
        const shLed = obterAbaEspacosLedger_();
        shLed.getRange(shLed.getLastRow() + 1, 1, novasLinhasLedger.length, ESPACOS_LEDGER_HEADERS.length).setValues(novasLinhasLedger);
      }

      if (pinosAtualizar.size > 0 && typeof vincularEspacosAPinosMapaEmBloco_ === 'function') {
        vincularEspacosAPinosMapaEmBloco_(pinosAtualizar);
      }
    }

    // Salva linhas modificadas no staging
    const temModificados = Array.from(mapaStgPorId.values()).some(e => e.modificado);
    if (temModificados) {
      shStg.getRange(2, 1, dadosStg.length, ESPACOS_STAGING_HEADERS.length).setValues(dadosStg);
    }

    return resultados;
  } finally {
    lock.releaseLock();
  }
}

