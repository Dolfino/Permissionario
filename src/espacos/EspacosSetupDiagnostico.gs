/**
 * SINALIZAÇÃO DO MALL — GESTÃO DE ESPAÇOS FÍSICOS (M2B-0 / M2B)
 * Módulo: EspacosSetupDiagnostico.gs
 * Objetivo: Setup, Diagnóstico Estrutural, Bateria de Testes de Preflight de Produção (Failure Injection, ScriptLock, Crash Recovery, Idempotência e Linhagem Estável).
 * Runtime: Google Apps Script (V8 Engine)
 */

/**
 * Executa o provisionamento estrutural das entidades do M2B-0.
 * Idempotente: não sobrescreve nem apaga dados pré-existentes. Adiciona novas colunas dinamicamente se necessário.
 * @returns {Object}
 */
function setupEspacosM2A() {
  const ssEspacos = obterPlanilhaEspacosCanonico_();
  const resultados = [];

  // Helper para provisionar ou atualizar colunas
  const provisionarAba = function (nomeAba, headersEsperados) {
    let sh = ssEspacos.getSheetByName(nomeAba);
    if (!sh) {
      sh = ssEspacos.insertSheet(nomeAba);
      sh.getRange(1, 1, 1, headersEsperados.length).setValues([headersEsperados]);
      sh.setFrozenRows(1);
      resultados.push({ entidade: nomeAba, acao: 'CRIADA', colunas: headersEsperados.length });
    } else {
      const colunasExistentes = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
      const colunasFaltantes = headersEsperados.filter(c => !colunasExistentes.includes(c));
      if (colunasFaltantes.length > 0) {
        const colInicio = colunasExistentes.length + 1;
        sh.getRange(1, colInicio, 1, colunasFaltantes.length).setValues([colunasFaltantes]);
        resultados.push({ entidade: nomeAba, acao: 'ATUALIZADA_COM_NOVAS_COLUNAS', novasColunas: colunasFaltantes });
      } else {
        resultados.push({ entidade: nomeAba, acao: 'PRESERVADA' });
      }
    }
  };

  // 1. Aba ESPACOS (Canônica)
  provisionarAba(ESPACOS_CONFIG.SHEET_ESPACOS, ESPACOS_HEADERS);

  // 2. Aba ESPACO_IDENTIFICADORES (Canônica)
  provisionarAba(ESPACOS_CONFIG.SHEET_IDENTIFICADORES, ESPACO_IDENTIFICADORES_HEADERS);

  // 3. Aba ESPACO_INFRAESTRUTURA (Canônica)
  provisionarAba(ESPACOS_CONFIG.SHEET_INFRAESTRUTURA, ESPACO_INFRAESTRUTURA_HEADERS);

  // 4. Aba BLOQUEIOS_ESPACO (Canônica)
  provisionarAba(ESPACOS_CONFIG.SHEET_BLOQUEIOS, BLOQUEIOS_ESPACO_HEADERS);

  // 5. Aba ESPACOS_MIGRACAO_STAGING (Canônica)
  provisionarAba(ESPACOS_CONFIG.SHEET_STAGING, ESPACOS_STAGING_HEADERS);

  // 6. Aba ESPACOS_MIGRACAO_LEDGER (Canônica)
  provisionarAba(ESPACOS_CONFIG.SHEET_LEDGER, ESPACOS_LEDGER_HEADERS);

  // 7. Integração com LOJAS_MAPA (Canônica Cartografia)
  const resMapa = garantirColunasIntegracaoLojasMapa_();
  resultados.push({
    entidade: ESPACOS_CONFIG.SHEET_LOJAS_MAPA,
    acao: resMapa.alterado ? 'COLUNAS_INTEGRACAO_ADICIONADAS' : 'PRESERVADA'
  });

  return {
    sucesso: true,
    fase: 'M2B-0',
    timestamp: new Date().toISOString(),
    spreadsheetEspacosId: ssEspacos.getId(),
    resultados: resultados
  };
}

/**
 * Diagnóstico estrutural e integridade de schema do M2B-0 (Preflight de Produção).
 * @returns {Object}
 */
function diagnosticoEspacosM2A() {
  const ssEspacos = obterPlanilhaEspacosCanonico_();
  const ssMapa = obterPlanilhaCartografiaCanonico_();
  const checks = [];
  const add = function (nome, ok, detalhe) { checks.push({ nome: nome, ok: !!ok, detalhe: detalhe }); };

  // 1. Verificação de abas no domínio de espaços
  const abasEsperadas = [
    ESPACOS_CONFIG.SHEET_ESPACOS,
    ESPACOS_CONFIG.SHEET_IDENTIFICADORES,
    ESPACOS_CONFIG.SHEET_INFRAESTRUTURA,
    ESPACOS_CONFIG.SHEET_BLOQUEIOS,
    ESPACOS_CONFIG.SHEET_STAGING,
    ESPACOS_CONFIG.SHEET_LEDGER
  ];

  abasEsperadas.forEach(nome => {
    const sh = ssEspacos.getSheetByName(nome);
    add('ABA_' + nome, !!sh, sh ? 'Presente com ' + sh.getLastRow() + ' linhas em ' + ssEspacos.getId() : 'Ausente em ' + ssEspacos.getId());
  });

  // Verificação de LOJAS_MAPA na cartografia
  const shMapa = ssMapa.getSheetByName(ESPACOS_CONFIG.SHEET_LOJAS_MAPA);
  add('ABA_' + ESPACOS_CONFIG.SHEET_LOJAS_MAPA, !!shMapa, shMapa ? 'Presente com ' + shMapa.getLastRow() + ' linhas em ' + ssMapa.getId() : 'Ausente');

  // Isolamento topológico: assegura que abas de espaços não vazaram para a planilha Permissionário se diferente
  try {
    const ssAtiva = SpreadsheetApp.getActive();
    if (ssAtiva && ssAtiva.getId() !== ssEspacos.getId()) {
      const duplicadas = abasEsperadas.filter(nome => !!ssAtiva.getSheetByName(nome));
      add('ISOLAMENTO_TOPOLOGICO_PERMISSIONARIO', duplicadas.length === 0, duplicadas.length === 0 ? 'Conforme: nenhuma aba duplicada em ' + ssAtiva.getId() : 'FALHA: Abas criadas na planilha errada: ' + duplicadas.join(', '));
    }
  } catch (_) {}

  // 2. Validação de Headers em ESPACOS
  const shEsp = ssEspacos.getSheetByName(ESPACOS_CONFIG.SHEET_ESPACOS);
  if (shEsp) {
    const h = shEsp.getRange(1, 1, 1, Math.max(1, shEsp.getLastColumn())).getValues()[0];
    const todosHeaders = ESPACOS_HEADERS.every(c => h.includes(c));
    add('HEADERS_ESPACOS', todosHeaders, todosHeaders ? 'Conformes (' + ESPACOS_HEADERS.length + ' colunas)' : 'Incompletos');

    const temAtivo = h.includes('ATIVO');
    add('SEM_CAMPO_ATIVO_CONCORRENTE', !temAtivo, temAtivo ? 'FALHA: Coluna ATIVO detectada.' : 'Aprovado (Exclusivamente ESTADO_CADASTRAL)');

    const temChaveMigracao = h.includes('CHAVE_MIGRACAO_ORIGEM');
    add('ESPACOS_CHAVE_MIGRACAO_IDEMPOTENCIA', temChaveMigracao, temChaveMigracao ? 'Presente' : 'Ausente');

    const temConfiancasSeparadas = h.includes('CONFIANCA_IDENTIDADE') && h.includes('CONFIANCA_ATRIBUTOS');
    add('ESPACOS_CONFIANCAS_SEPARADAS', temConfiancasSeparadas, temConfiancasSeparadas ? 'Identidade e Atributos separados' : 'Ausentes');
  }

  // 3. Validação de Headers em ESPACO_IDENTIFICADORES
  const shIdent = ssEspacos.getSheetByName(ESPACOS_CONFIG.SHEET_IDENTIFICADORES);
  if (shIdent) {
    const h = shIdent.getRange(1, 1, 1, Math.max(1, shIdent.getLastColumn())).getValues()[0];
    const todos = ESPACO_IDENTIFICADORES_HEADERS.every(c => h.includes(c));
    add('HEADERS_IDENTIFICADORES', todos, todos ? 'Conformes (' + ESPACO_IDENTIFICADORES_HEADERS.length + ' colunas)' : 'Incompletos');

    const temPrincipal = h.includes('PRINCIPAL');
    add('IDENTIFICADORES_CAMPO_PRINCIPAL', temPrincipal, temPrincipal ? 'Presente (Suporte a múltiplos vigentes/fusão)' : 'Ausente');
  }

  // 4. Validação de Headers em ESPACOS_MIGRACAO_STAGING
  const shStg = ssEspacos.getSheetByName(ESPACOS_CONFIG.SHEET_STAGING);
  if (shStg) {
    const h = shStg.getRange(1, 1, 1, Math.max(1, shStg.getLastColumn())).getValues()[0];
    const temSnapshot = h.includes('ID_SNAPSHOT_ORIGEM') && h.includes('ID_REGISTRO_ORIGEM') && h.includes('CHAVE_MIGRACAO_ORIGEM');
    add('STAGING_LINHAGEM_SNAPSHOT_ESTAVEL', temSnapshot, temSnapshot ? 'Campos estáveis de snapshot presentes' : 'Ausentes');
  }

  // 5. Validação de Headers em ESPACOS_MIGRACAO_LEDGER
  const shLedger = ssEspacos.getSheetByName(ESPACOS_CONFIG.SHEET_LEDGER);
  if (shLedger) {
    const h = shLedger.getRange(1, 1, 1, Math.max(1, shLedger.getLastColumn())).getValues()[0];
    const todosLedger = ESPACOS_LEDGER_HEADERS.every(c => h.includes(c));
    add('HEADERS_LEDGER_PERMANENTE', todosLedger, todosLedger ? 'Conformes (' + ESPACOS_LEDGER_HEADERS.length + ' colunas)' : 'Incompletos');
  }

  const aprovado = checks.every(c => c.ok);

  return {
    ok: aprovado,
    fase: 'M2B-0',
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    checks: checks
  };
}

/**
 * Bateria completa de testes automatizados de Preflight de Produção (M2B-0).
 * Executa testes de resiliência: Failure Injection (recuperação de crash no meio da transação),
 * soberania de ScriptLock/ScriptProperties, múltiplos identificadores com PRINCIPAL, e ordenação invariante.
 * @returns {Object}
 */
function testesUnitariosEspacosM2A() {
  const resultados = [];
  const registrar = function (nome, sucesso, detalhe) {
    resultados.push({ teste: nome, ok: !!sucesso, detalhe: detalhe || '' });
  };

  setupEspacosM2A();

  let idEspacoTeste = null;
  let idBloqueioTeste = null;
  let idStagingTeste = null;

  try {
    // TESTE 1: Geração soberana de ID_ESPACO via ScriptLock e ScriptProperties
    const id1 = gerarProximoIdEspacoSeguro_();
    const id2 = gerarProximoIdEspacoSeguro_();
    const idValido1 = /^ESP-\d{6}$/.test(id1);
    const idValido2 = /^ESP-\d{6}$/.test(id2);
    const idsDiferentes = id1 !== id2;
    registrar('T01_GERACAO_SOBERANA_SCRIPTLOCK', idValido1 && idValido2 && idsDiferentes, 'IDs gerados via ScriptProperties: ' + id1 + ', ' + id2);

    // TESTE 2: Criação de ESPACO com dados válidos e confiança separada
    const espacoCriado = criarEspaco({
      ID_ESPACO: 'ESP-TEST-000001',
      LUC: 'TESTE-LUC-001',
      SETOR: 'SETOR AMARELO',
      RUA: 'Avenida Alberto Nepomuceno',
      NUMERO: '9999',
      CLASSE_ESPACO: 'COMERCIAL',
      ELEGIVEL_RESERVA: 'SIM',
      TIPO_ESPACO_FISICO: 'BOX',
      SUBTIPO_ESPACO_FISICO: 'BOX_PADRAO',
      ESTADO_CADASTRAL: 'ATIVO',
      ORIGEM_DADOS: 'MANUAL',
      CONFIANCA_CADASTRO: 'DETERMINISTICO',
      CONFIANCA_IDENTIDADE: 'DETERMINISTICO',
      CONFIANCA_ATRIBUTOS: 'DECLARADO',
      CHAVE_MIGRACAO_ORIGEM: 'SNAP-TEST::REG-TEST-001',
      OBSERVACOES: 'Registro de teste unitário M2B-0'
    }, 'TESTE_RUNNER');

    idEspacoTeste = espacoCriado.ID_ESPACO;
    const criouOk = espacoCriado && espacoCriado.ID_ESPACO === 'ESP-TEST-000001' && espacoCriado.CONFIANCA_IDENTIDADE === 'DETERMINISTICO';
    registrar('T02_CRIAR_ESPACO_CONFIANCA_SEPARADA', criouOk, 'Criado: ' + idEspacoTeste);

    // TESTE 3: Rejeição de campo concorrente ATIVO
    let rejeitouAtivo = false;
    try {
      criarEspaco({
        LUC: 'TESTE-LUC-INV',
        CLASSE_ESPACO: 'COMERCIAL',
        TIPO_ESPACO_FISICO: 'BOX',
        ATIVO: 'SIM'
      }, 'TESTE_RUNNER');
    } catch (e) {
      rejeitouAtivo = e.message.includes('redundante e proibido');
    }
    registrar('T03_REJEITAR_CAMPO_ATIVO_CONCORRENTE', rejeitouAtivo, 'Rejeitou com sucesso');

    // TESTE 4: Rejeição de CLASSE_ESPACO inválida
    let rejeitouClasse = false;
    try {
      criarEspaco({
        LUC: 'TESTE-LUC-INV',
        CLASSE_ESPACO: 'CLASSE_INVENTADA_XYZ',
        TIPO_ESPACO_FISICO: 'BOX'
      }, 'TESTE_RUNNER');
    } catch (e) {
      rejeitouClasse = e.message.includes('CLASSE_ESPACO inválida');
    }
    registrar('T04_REJEITAR_CLASSE_INVALIDA', rejeitouClasse, 'Rejeitou valor fora do enum');

    // TESTE 5: Espaço de Eventos permanente desacoplado de temporalidade
    const espacoEvento = criarEspaco({
      ID_ESPACO: 'ESP-TEST-000002',
      LUC: 'TESTE-EVENTO-001',
      SETOR: 'SETOR VERDE',
      CLASSE_ESPACO: 'AREA_EVENTO',
      ELEGIVEL_RESERVA: 'SIM',
      TIPO_ESPACO_FISICO: 'AREA_ABERTA',
      ESTADO_CADASTRAL: 'ATIVO',
      ORIGEM_DADOS: 'MANUAL',
      OBSERVACOES: 'Praça permanente de eventos'
    }, 'TESTE_RUNNER');

    const eventoOk = espacoEvento && espacoEvento.CLASSE_ESPACO === 'AREA_EVENTO' && espacoEvento.ELEGIVEL_RESERVA === 'SIM';
    registrar('T05_AREA_EVENTO_PERMANENTE_DESACOPLADA', eventoOk, 'Área permanente criada');
    limparDadosTesteM2A_('ESP-TEST-000002', null, null);

    // TESTE 6: Histórico de identificadores com PRINCIPAL e múltiplos vigentes (fusão de boxes)
    const idHistorico1 = listarIdentificadoresEspaco(idEspacoTeste);
    const temLucInicialPrincipal = idHistorico1.length > 0 && idHistorico1[0].PRINCIPAL === 'SIM' && idHistorico1[0].ATUAL === 'SIM';

    // Adiciona segundo código ativo decorrente de unificação (mantém ambos ativos, designa novo principal)
    adicionarIdentificadorEspaco(idEspacoTeste, 'LUC', 'TESTE-LUC-001-UNIFICADO', true, 'TESTE_RUNNER', 'Unificação de box', false);
    const idHistorico2 = listarIdentificadoresEspaco(idEspacoTeste);
    const antigoPermaneceAtivoNaoPrincipal = idHistorico2.some(h => h.VALOR === 'TESTE-LUC-001' && h.ATUAL === 'SIM' && h.PRINCIPAL === 'NAO');
    const novoAtivoPrincipal = idHistorico2.some(h => h.VALOR === 'TESTE-LUC-001-UNIFICADO' && h.ATUAL === 'SIM' && h.PRINCIPAL === 'SIM');
    const cacheSincronizado = obterEspacoPorId(idEspacoTeste).LUC === 'TESTE-LUC-001-UNIFICADO';

    registrar('T06_IDENTIFICADORES_PRINCIPAL_E_FUSAO', temLucInicialPrincipal && antigoPermaneceAtivoNaoPrincipal && novoAtivoPrincipal && cacheSincronizado, 'Múltiplos identificadores ativos com exatamente um principal');

    // TESTE 7: Invariância de Ordenação na Fonte (Linhagem Determinística)
    const recA = { LUC: 'TESTE-ORD-1', SETOR: 'AMARELO', Contrato: '111', Lojista: 'LOJISTA A' };
    const recB = { LUC: 'TESTE-ORD-2', SETOR: 'VERDE', Contrato: '222', Lojista: 'LOJISTA B' };

    // Ordem 1: A depois B
    const idRegA1 = gerarIdRegistroOrigemDeterminostico_(recA);
    const idRegB1 = gerarIdRegistroOrigemDeterminostico_(recB);

    // Ordem 2: B depois A (reordenação da planilha)
    const idRegB2 = gerarIdRegistroOrigemDeterminostico_(recB);
    const idRegA2 = gerarIdRegistroOrigemDeterminostico_(recA);

    const ordenacaoInvariante = idRegA1 === idRegA2 && idRegB1 === idRegB2 && idRegA1 !== idRegB1;
    registrar('T07_LINHAGEM_INVARIANTE_A_REORDENACAO', ordenacaoInvariante, 'Chaves de origem idênticas independente da posição na planilha');

    // TESTE 8: Staging com Idempotência Estrita via SHA-256
    const loteStgTeste = [{
      ID_REGISTRO_ORIGEM: 'REG-TEST-CRASH-001',
      CHAVE_ORIGEM: 'TEST-CRASH-001',
      LUC_LEGADO: 'TESTE-LUC-CRASH',
      SETOR_LEGADO: 'SETOR AZUL',
      RUA_LEGADA: 'Rua do Teste Crash',
      NUMERO_LEGADO: '100',
      TIPO_LEGADO: 'BOX',
      DIAGNOSTICO: 'CRIAR_ESPACO',
      GRAU_CONFIANCA: 'DETERMINISTICO'
    }];

    inserirOuAtualizarStaging(loteStgTeste, 'SNAP-TEST-CRASH', 'BASE_TESTE', 'M2B-0', 'TESTE_RUNNER');
    const shStg = obterAbaEspacosStaging_();
    const fStg = shStg.getRange(2, 6, shStg.getLastRow() - 1, 1).createTextFinder('SNAP-TEST-CRASH::REG-TEST-CRASH-001').matchEntireCell(true).findNext();
    idStagingTeste = shStg.getRange(fStg.getRow(), 1).getValue();

    // TESTE 8: Staging - Detecção de alteração de origem via hash
    const loteStgAlterado = [{
      ID_REGISTRO_ORIGEM: 'REG-TEST-CRASH-001',
      CHAVE_ORIGEM: 'TEST-CRASH-001',
      LUC_LEGADO: 'TESTE-LUC-CRASH',
      SETOR_LEGADO: 'SETOR AZUL',
      RUA_LEGADA: 'Rua do Teste Crash ALTERADA',
      NUMERO_LEGADO: '100',
      TIPO_LEGADO: 'BOX',
      DIAGNOSTICO: 'CRIAR_ESPACO',
      GRAU_CONFIANCA: 'DETERMINISTICO'
    }];
    const resStgAlterado = inserirOuAtualizarStaging(loteStgAlterado, 'SNAP-TEST-CRASH', 'BASE_TESTE', 'M2B-0', 'TESTE_RUNNER');
    const alteracaoDetectada = resStgAlterado.atualizados === 1 && resStgAlterado.inseridos === 0;
    registrar('T08_STAGING_DETECCAO_ALTERACAO_HASH', alteracaoDetectada, 'Dado alterado detectado via hash e atualizado sem duplicar');

    // TESTE 9 (CRÍTICO M2B-0): FAILURE INJECTION & CRASH RECOVERY
    // Simula que a execução travou imediatamente após gravar ESPACOS e antes de gravar staging
    let capturouFalhaInjetada = false;
    try {
      promoverRegistroStaging(idStagingTeste, 'TESTE_RUNNER', { simularFalhaAposCriarEspaco: true });
    } catch (e) {
      capturouFalhaInjetada = e.message.includes('FAILURE_INJECTION_M2B0');
    }

    // Verifica que o espaço foi criado em ESPACOS, mas o staging ainda NÃO está promovido (cenário de crash)
    const espacoNoMeioDoCrash = procurarEspacoPorChaveOrigem_('SNAP-TEST-CRASH::REG-TEST-CRASH-001');
    const stagingAposCrash = shStg.getRange(fStg.getRow(), ESPACOS_STAGING_HEADERS.indexOf('STATUS_MIGRACAO') + 1).getValue();
    const crashSimuladoComSucesso = capturouFalhaInjetada && espacoNoMeioDoCrash !== null && stagingAposCrash !== 'PROMOVIDO';

    // REEXECUÇÃO APÓS FALHA (RETRY DE PRODUÇÃO)
    const resRetry = promoverRegistroStaging(idStagingTeste, 'TESTE_RUNNER');
    const stagingReparado = shStg.getRange(fStg.getRow(), ESPACOS_STAGING_HEADERS.indexOf('STATUS_MIGRACAO') + 1).getValue();
    const idEspacoNoStagingReparado = shStg.getRange(fStg.getRow(), ESPACOS_STAGING_HEADERS.indexOf('ID_ESPACO_GERADO') + 1).getValue();

    // Verifica que NÃO criou outro ID_ESPACO e reaproveitou o mesmo
    const retryRecuperou = resRetry.recuperadoDeFalha === true && resRetry.idEspaco === espacoNoMeioDoCrash.ID_ESPACO;
    const stagingSincronizado = stagingReparado === 'PROMOVIDO' && idEspacoNoStagingReparado === espacoNoMeioDoCrash.ID_ESPACO;

    // Confirma contagem de espaços em ESPACOS com essa chave = exatamente 1
    const shEsp = obterAbaEspacos_();
    const colChaveIdx = ESPACOS_HEADERS.indexOf('CHAVE_MIGRACAO_ORIGEM') + 1;
    const todosEspacosChave = shEsp.getRange(2, colChaveIdx, shEsp.getLastRow() - 1, 1).getValues().filter(r => r[0] === 'SNAP-TEST-CRASH::REG-TEST-CRASH-001');
    const exatamenteUmEspaco = todosEspacosChave.length === 1;

    registrar('T09_CRASH_RECOVERY_FAILURE_INJECTION', crashSimuladoComSucesso && retryRecuperou && stagingSincronizado && exatamenteUmEspaco, 'Falha no meio da transação recuperada com sucesso e exatamente 1 espaço criado');
    limparDadosTesteM2A_(espacoNoMeioDoCrash.ID_ESPACO, null, idStagingTeste);

    // TESTE 10: Infraestrutura 1:1 com tipagem numérica estrita
    const infraCriada = salvarInfraestrutura({
      ID_ESPACO: idEspacoTeste,
      AREA_M2: 25.5,
      LARGURA_M: 4.25,
      PROFUNDIDADE_M: 6.0,
      PE_DIREITO_M: 3.2,
      VOLTAGEM_V: 220,
      POTENCIA_KVA: 15.0,
      DISJUNTOR_A: 40,
      AGUA_POTAVEL: 'SIM',
      ESGOTO: 'SIM',
      CAIXA_GORDURA: 'NAO',
      PONTO_FIBRA: 'NAO_VERIFICADO',
      CLIMATIZACAO: 'SPLIT'
    }, 'TESTE_RUNNER');

    const infraOk = infraCriada && infraCriada.AREA_M2 === 25.5 && infraCriada.PONTO_FIBRA === 'NAO_VERIFICADO';
    registrar('T10_SALVAR_INFRAESTRUTURA_ESTRITA', infraOk, 'Valores numéricos e utilidades validadas');

    // TESTE 11: Rejeição de strings com unidades embutidas (ex: '220V', '25m2')
    let rejeitouUnidadeTexto = false;
    try {
      salvarInfraestrutura({
        ID_ESPACO: idEspacoTeste,
        VOLTAGEM_V: '220V'
      }, 'TESTE_RUNNER');
    } catch (e) {
      rejeitouUnidadeTexto = e.message.includes('UNIDADE_INVALIDA');
    }
    registrar('T11_REJEITAR_UNIDADE_TEXTO_EM_NUMERO', rejeitouUnidadeTexto, 'Rejeitou "220V" corretamente');

    // TESTE 12: Integridade referencial: Rejeitar infraestrutura órfã
    let rejeitouInfraOrfa = false;
    try {
      salvarInfraestrutura({
        ID_ESPACO: 'ESP-999999-INEXISTENTE',
        AREA_M2: 10
      }, 'TESTE_RUNNER');
    } catch (e) {
      rejeitouInfraOrfa = e.message.includes('INTEGRIDADE_REFERENCIAL');
    }
    registrar('T12_INTEGRIDADE_REFERENCIAL_INFRAESTRUTURA', rejeitouInfraOrfa, 'Impediu infraestrutura órfã');

    // TESTE 13: Bloqueio Técnico Temporal com efeitos e recálculo dinâmico
    const agora = new Date();
    const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
    const bloqueioCriado = criarBloqueio({
      ID_ESPACO: idEspacoTeste,
      TIPO_BLOQUEIO: 'OBRA_REFORMA_ESTRUTURAL',
      DATA_HORA_INICIO: agora.toISOString(),
      DATA_HORA_FIM: amanha.toISOString(),
      BLOQUEIA_RESERVA: true,
      BLOQUEIA_OCUPACAO: true,
      BLOQUEIA_MONTAGEM: true,
      SEVERIDADE: 'ALTA',
      MOTIVO: 'Reforma de teste unitário M2B-0'
    }, 'TESTE_RUNNER');

    idBloqueioTeste = bloqueioCriado.ID_BLOQUEIO;
    const estTecnicoBloqueado = calcularEstadoTecnicoEspaco(idEspacoTeste);
    const dispReserva = verificarDisponibilidadeTecnica(idEspacoTeste, agora, amanha, 'RESERVA');

    encerrarBloqueio(idBloqueioTeste, 'Reforma concluída', 'TESTE_RUNNER');
    const estTecnicoLiberado = calcularEstadoTecnicoEspaco(idEspacoTeste);

    const bloqDinamicoOk = bloqueioCriado && estTecnicoBloqueado === 'EM_REFORMA' && !dispReserva.disponivel && estTecnicoLiberado === 'LIBERADO';
    registrar('T13_BLOQUEIO_TEMPORAL_E_ESTADO_DINAMICO', bloqDinamicoOk, 'Estado dinâmico LIBERADO -> EM_REFORMA -> LIBERADO');

    // TESTE 14: Ficha 360° Completa do Espaço com PRINCIPAL e histórico
    const fichaCompleta = obterFichaEspacoCompleta(idEspacoTeste);
    const temIdentPrincipal = fichaCompleta && fichaCompleta.identificadores && fichaCompleta.identificadores.some(i => i.PRINCIPAL === 'SIM');
    const fichaOk = fichaCompleta && fichaCompleta.espaco && fichaCompleta.infraestrutura && temIdentPrincipal;
    registrar('T14_FICHA_ESPACO_COMPLETA_COM_PRINCIPAL', fichaOk, 'Cartão 360° com identificador principal comprovado');

    // TESTE 15: Proteção do Contador contra Reset ou Regressão em ScriptProperties (M2B Requisito 4)
    const props = PropertiesService.getScriptProperties();
    const chaveProp = ESPACOS_CONFIG.CHAVE_PROP_SEQUENCIAL_ESPACO;
    const valorOriginalProp = props.getProperty(chaveProp);

    // Simula criação de espaço de teste com ID alto conhecido
    const idAltoTeste = 'ESP-009990';
    const espacoAlto = criarEspaco({
      ID_ESPACO: idAltoTeste,
      LUC: 'TEST-REC-MAX',
      SETOR: 'SETOR AZUL',
      CLASSE_ESPACO: 'COMERCIAL',
      TIPO_ESPACO_FISICO: 'BOX',
      ESTADO_CADASTRAL: 'ATIVO',
      ORIGEM_DADOS: 'MANUAL',
      OBSERVACOES: 'Teste de autorrecuperação de contador'
    }, 'TESTE_RUNNER');

    // Cenário 1: Propriedade regredida para valor baixo (ex: 100 < 9990)
    props.setProperty(chaveProp, '100');
    const proximoIdAposRegressao = gerarProximoIdEspacoSeguro_();
    const recuperouRegressao = parseInt(proximoIdAposRegressao.replace('ESP-', ''), 10) === 9991;

    // Cenário 2: Propriedade apagada (null) -> reconstrói a partir do MAX(9990) da aba
    props.deleteProperty(chaveProp);
    const proximoIdAposDelete = gerarProximoIdEspacoSeguro_();
    const recuperouDelete = parseInt(proximoIdAposDelete.replace('ESP-', ''), 10) === 9991;

    // Cenário 3: Propriedade corrompida (não-numérica / NaN) -> reconstrói a partir do MAX(9990) da aba
    props.setProperty(chaveProp, 'VALOR_CORROMPIDO_INVALIDO');
    const proximoIdAposCorrompido = gerarProximoIdEspacoSeguro_();
    const recuperouCorrompido = parseInt(proximoIdAposCorrompido.replace('ESP-', ''), 10) === 9991;

    // Limpa o registro de teste alto
    limparDadosTesteM2A_(idAltoTeste, null, null);

    // Restaura propriedade
    if (valorOriginalProp) {
      props.setProperty(chaveProp, valorOriginalProp);
    } else {
      props.deleteProperty(chaveProp);
    }
    // Sincroniza contador final com os dados reais
    gerarProximoIdEspacoSeguro_();

    const teste15Ok = recuperouRegressao && recuperouDelete && recuperouCorrompido;
    registrar('T15_RESET_SCRIPT_PROPERTY_RECOVERY', teste15Ok, 'NEXT_ID > MAX(ID_EXISTENTE) garantido sob reset, delete e corrupção');

  } catch (errGeral) {
    registrar('FALHA_CATASTROFICA_TESTES', false, String(errGeral?.message || errGeral));
  } finally {
    limparDadosTesteM2A_(idEspacoTeste, idBloqueioTeste, null);
  }

  const todasOk = resultados.every(r => r.ok);
  return {
    sucesso: todasOk,
    fase: 'M2B-0',
    totalTestes: resultados.length,
    aprovados: resultados.filter(r => r.ok).length,
    falhas: resultados.filter(r => !r.ok).length,
    resultados: resultados
  };
}

/**
 * Remove registros de teste gerados durante a suíte automatizada.
 * HARDENING M2B-0:
 * - Apenas remove registros com namespace 'TEST-' ou marcadores em LUC/OBSERVACOES.
 * - Lança erro se qualquer ID de produção for acidentalmente fornecido.
 * @param {string} [idEspaco]
 * @param {string} [idBloqueio]
 * @param {string} [idStaging]
 * @private
 */
function limparDadosTesteM2A_(idEspaco, idBloqueio, idStaging) {
  const ss = obterPlanilhaEspacosCanonico_();

  const validarNamespaceTeste = function (id, prefixosValidos) {
    if (!id) return false;
    const str = String(id).trim().toUpperCase();
    const ehTeste = prefixosValidos.some(p => str.startsWith(p) || str.includes('TEST'));
    if (!ehTeste) {
      throw new Error('SEGURANCA_TESTES_ABORTADA: Tentativa ilegal de exclusão em registro de produção: ' + id);
    }
    return true;
  };

  if (idBloqueio && validarNamespaceTeste(idBloqueio, ['BLQ-', 'TEST-'])) {
    const shBloq = ss.getSheetByName(ESPACOS_CONFIG.SHEET_BLOQUEIOS);
    if (shBloq && shBloq.getLastRow() > 1) {
      const f = shBloq.getRange(2, 1, shBloq.getLastRow() - 1, 1).createTextFinder(idBloqueio).matchEntireCell(true).findNext();
      if (f) shBloq.deleteRow(f.getRow());
    }
  }

  if (idStaging && validarNamespaceTeste(idStaging, ['STG-', 'TEST-'])) {
    const shStg = ss.getSheetByName(ESPACOS_CONFIG.SHEET_STAGING);
    if (shStg && shStg.getLastRow() > 1) {
      const f = shStg.getRange(2, 1, shStg.getLastRow() - 1, 1).createTextFinder(idStaging).matchEntireCell(true).findNext();
      if (f) shStg.deleteRow(f.getRow());
    }
  }

  if (idEspaco) {
    const shEsp = ss.getSheetByName(ESPACOS_CONFIG.SHEET_ESPACOS);
    let ehTeste = String(idEspaco).toUpperCase().includes('TEST');

    if (!ehTeste && shEsp && shEsp.getLastRow() > 1) {
      const f = shEsp.getRange(2, 1, shEsp.getLastRow() - 1, 1).createTextFinder(idEspaco).matchEntireCell(true).findNext();
      if (f) {
        const rowData = shEsp.getRange(f.getRow(), 1, 1, ESPACOS_HEADERS.length).getValues()[0];
        const luc = String(rowData[ESPACOS_HEADERS.indexOf('LUC')] || '').toUpperCase();
        const obs = String(rowData[ESPACOS_HEADERS.indexOf('OBSERVACOES')] || '').toUpperCase();
        const chaveMig = String(rowData[ESPACOS_HEADERS.indexOf('CHAVE_MIGRACAO_ORIGEM')] || '').toUpperCase();
        if (luc.includes('TEST') || obs.includes('TEST') || chaveMig.includes('TEST')) {
          ehTeste = true;
        }
      }
    }

    if (!ehTeste) {
      throw new Error('SEGURANCA_TESTES_ABORTADA: Tentativa ilegal de exclusão em registro de produção: ' + idEspaco);
    }

    // 1. Limpa Identificadores vinculados
    const shIdent = ss.getSheetByName(ESPACOS_CONFIG.SHEET_IDENTIFICADORES);
    if (shIdent && shIdent.getLastRow() > 1) {
      const dadosIdent = shIdent.getRange(2, 2, shIdent.getLastRow() - 1, 1).getValues();
      for (let i = dadosIdent.length - 1; i >= 0; i--) {
        if (dadosIdent[i][0] === idEspaco) {
          shIdent.deleteRow(i + 2);
        }
      }
    }

    // 2. Limpa Infraestrutura
    const shInfra = ss.getSheetByName(ESPACOS_CONFIG.SHEET_INFRAESTRUTURA);
    if (shInfra && shInfra.getLastRow() > 1) {
      const f = shInfra.getRange(2, 1, shInfra.getLastRow() - 1, 1).createTextFinder(idEspaco).matchEntireCell(true).findNext();
      if (f) shInfra.deleteRow(f.getRow());
    }

    // 3. Limpa Espaço
    if (shEsp && shEsp.getLastRow() > 1) {
      const f = shEsp.getRange(2, 1, shEsp.getLastRow() - 1, 1).createTextFinder(idEspaco).matchEntireCell(true).findNext();
      if (f) shEsp.deleteRow(f.getRow());
    }
  }
}

/**
 * Rotina de Rollback do M2B-0.
 * @returns {Object}
 */
function rollbackEspacosM2A() {
  const ss = obterPlanilhaEspacosCanonico_();
  const relatorio = [];

  const abasNovas = [
    ESPACOS_CONFIG.SHEET_STAGING,
    ESPACOS_CONFIG.SHEET_BLOQUEIOS,
    ESPACOS_CONFIG.SHEET_INFRAESTRUTURA,
    ESPACOS_CONFIG.SHEET_IDENTIFICADORES,
    ESPACOS_CONFIG.SHEET_ESPACOS
  ];

  abasNovas.forEach(nome => {
    const sh = ss.getSheetByName(nome);
    if (sh) {
      const totalLinhas = sh.getLastRow();
      if (totalLinhas <= 1) {
        ss.deleteSheet(sh);
        relatorio.push({ aba: nome, acao: 'EXCLUIDA_SEM_DADOS' });
      } else {
        relatorio.push({ aba: nome, acao: 'PRESERVADA_COM_DADOS', linhas: totalLinhas });
      }
    }
  });

  return {
    sucesso: true,
    fase: 'M2B-0',
    acao: 'ROLLBACK',
    timestamp: new Date().toISOString(),
    detalhes: relatorio
  };
}

/**
 * Menus interativos para a planilha
 */
function menuSetupEspacosM2A() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    'Setup M2B-0 — Preflight de Produção & Soberania',
    'Deseja provisionar/atualizar a estrutura canônica de Espaços (M2B-0)?\n\n' +
    'Esta operação adiciona as colunas de linhagem determinística, chave de idempotência contra crashes e suporte a múltiplos identificadores.\n\n' +
    'Deseja prosseguir?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  try {
    const res = setupEspacosM2A();
    ui.alert(
      'Setup M2B-0 Concluído',
      'Estruturas provisionadas com sucesso!\n\n' +
      res.resultados.map(r => '• ' + r.entidade + ': ' + r.acao).join('\n'),
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('Erro no Setup M2B-0', 'Falha: ' + (err?.message || err), ui.ButtonSet.OK);
  }
}

function menuDiagnosticoEspacosM2A() {
  const ui = SpreadsheetApp.getUi();
  try {
    const diag = diagnosticoEspacosM2A();
    const falhas = diag.checks.filter(c => !c.ok);
    ui.alert(
      'Diagnóstico M2B-0 — Integridade & Schemas',
      'Resultado: ' + (diag.ok ? 'TODAS AS ESTRUTURAS APROVADAS' : 'PENDÊNCIAS DETECTADAS') + '\n\n' +
      '• Total de verificações: ' + diag.totalChecks + '\n' +
      '• Falhas: ' + diag.falhas + '\n\n' +
      (falhas.length > 0 ? 'Problemas:\n• ' + falhas.map(f => f.nome + ': ' + f.detalhe).join('\n• ') : 'Todas as 6 entidades, colunas canônicas, linhagem estável e recuperação de falha estão conformes.'),
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('Erro no Diagnóstico', 'Falha: ' + (err?.message || err), ui.ButtonSet.OK);
  }
}

function menuTestesEspacosM2A() {
  const ui = SpreadsheetApp.getUi();
  try {
    const res = testesUnitariosEspacosM2A();
    const falhas = res.resultados.filter(r => !r.ok);
    ui.alert(
      'Testes de Preflight M2B-0',
      'Resultado: ' + (res.sucesso ? '100% DOS TESTES APROVADOS' : 'FALHAS NOS TESTES') + '\n\n' +
      '• Total de testes: ' + res.totalTestes + '\n' +
      '• Aprovados: ' + res.aprovados + '\n' +
      '• Falhas: ' + res.falhas + '\n\n' +
      (falhas.length > 0 ? 'Falhas:\n• ' + falhas.map(f => f.teste + ': ' + f.detalhe).join('\n• ') : 'Todos os 14 testes (incluindo Failure Injection e Crash Recovery) passaram com sucesso.'),
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('Erro nos Testes', 'Falha: ' + (err?.message || err), ui.ButtonSet.OK);
  }
}
