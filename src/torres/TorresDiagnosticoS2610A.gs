/**
 * S26.10-B — TORRES / NÚCLEOS VERTICAIS
 * Modelo físico + backend administrativo.
 *
 * Baseline preservada:
 * - produção continua em MVP-3.31.0-SINALIZACAO-S26.9 / S26.9 durante esta fase;
 * - nenhuma promoção de APP_VERSAO / APP_FASE é feita aqui;
 * - sem seed de torres;
 * - sem exclusão/soft delete;
 * - identidade física compartilhada + geometria independente por nível.
 */

const S2610B = Object.freeze({
  FASE: 'S26.10-B',
  SCHEMA: '1',
  SHEET_TORRES: 'CARTOGRAFIA_TORRES',
  SHEET_REPRESENTACOES: 'CARTOGRAFIA_TORRE_REPRESENTACOES',
  SHEET_COMPONENTES: 'CARTOGRAFIA_TORRE_COMPONENTES',
  STATUS_ENTIDADE: Object.freeze(['ATIVA', 'INATIVA']),
  STATUS_PUBLICACAO: Object.freeze(['RASCUNHO', 'VALIDADA', 'PUBLICADA']),
  TIPOS_TORRE: Object.freeze([
    'NUCLEO_VERTICAL',
    'NUCLEO_ELEVADORES',
    'NUCLEO_ESCADAS',
    'NUCLEO_MISTO',
    'TORRE_CIRCULACAO',
    'OUTRO'
  ]),
  TIPOS_COMPONENTE: Object.freeze([
    'ELEVADOR_SOCIAL',
    'ELEVADOR_SERVICO',
    'ELEVADOR_CARGA',
    'ESCADA_CONVENCIONAL',
    'ESCADA_INCENDIO',
    'HALL_ELEVADORES',
    'SHAFT',
    'PRUMADA_TECNICA',
    'OUTRO'
  ]),
  NIVEIS: Object.freeze({
    N0: 'PLA-CFF-N0-2025',
    N1: 'PLA-CFF-N1-2025',
    N2: 'PLA-CFF-N2-2025',
    N3: 'PLA-CFF-N3-2025'
  })
});

const S2610B_TORRES_HEADERS = Object.freeze([
  'ID_TORRE',
  'CODIGO',
  'NOME',
  'TIPO',
  'NIVEIS_ATENDIDOS_JSON',
  'STATUS',
  'STATUS_PUBLICACAO',
  'OBSERVACOES',
  'CRIADO_EM',
  'CRIADO_POR',
  'ATUALIZADO_EM',
  'ATUALIZADO_POR'
]);

const S2610B_REP_HEADERS = Object.freeze([
  'ID_REPRESENTACAO',
  'ID_TORRE',
  'ID_NIVEL',
  'ID_PLANTA_NIVEL',
  'POLIGONO_JSON',
  'STATUS',
  'STATUS_PUBLICACAO',
  'VERSAO_GEOMETRIA',
  'OBSERVACOES',
  'CRIADO_EM',
  'CRIADO_POR',
  'ATUALIZADO_EM',
  'ATUALIZADO_POR'
]);

const S2610B_COMP_HEADERS = Object.freeze([
  'ID_COMPONENTE',
  'ID_TORRE',
  'CODIGO',
  'TIPO',
  'NOME',
  'NIVEIS_ATENDIDOS_JSON',
  'STATUS',
  'STATUS_PUBLICACAO',
  'OBSERVACOES',
  'CRIADO_EM',
  'CRIADO_POR',
  'ATUALIZADO_EM',
  'ATUALIZADO_POR'
]);

// -----------------------------------------------------------------------------
// SETUP / DIAGNÓSTICO
// -----------------------------------------------------------------------------

function setupS2610B() {
  exigirPermissaoS14_('administrar');

  const ss = SpreadsheetApp.getActive();
  s240EnsureSheet_(ss, S2610B.SHEET_TORRES, S2610B_TORRES_HEADERS.slice());
  s240EnsureSheet_(ss, S2610B.SHEET_REPRESENTACOES, S2610B_REP_HEADERS.slice());
  s240EnsureSheet_(ss, S2610B.SHEET_COMPONENTES, S2610B_COMP_HEADERS.slice());

  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    // Deliberadamente não altera APP_VERSAO nem APP_FASE.
    setConfigValue_(cfg, 'S2610B_STATUS', 'INSTALADO', 'Torres / Núcleos verticais — modelo físico e backend');
    setConfigValue_(cfg, 'S2610B_SCHEMA', S2610B.SCHEMA, 'Schema das tabelas de Torres');
    setConfigValue_(cfg, 'S2610B_SEED_AUTOMATICO', 'NAO', 'Nenhuma torre fictícia é criada pelo setup');
    setConfigValue_(cfg, 'S2610B_SOFT_DELETE', 'NAO', 'Soft delete permanece fora de escopo');
  }

  SpreadsheetApp.flush();
  return diagnosticoS2610B();
}

function diagnosticoS2610B() {
  exigirPermissaoS14_('administrar');

  const ss = SpreadsheetApp.getActive();
  const checks = [];
  const add = function (nome, ok, detalhe, bloqueante) {
    checks.push({
      nome: String(nome || ''),
      ok: !!ok,
      detalhe: String(detalhe || ''),
      bloqueante: bloqueante !== false
    });
  };

  const cfg = s2610BConfigObj_(ss);
  const shT = ss.getSheetByName(S2610B.SHEET_TORRES);
  const shR = ss.getSheetByName(S2610B.SHEET_REPRESENTACOES);
  const shC = ss.getSheetByName(S2610B.SHEET_COMPONENTES);

  add('S2610B_ABA_TORRES', !!shT, S2610B.SHEET_TORRES);
  add('S2610B_ABA_REPRESENTACOES', !!shR, S2610B.SHEET_REPRESENTACOES);
  add('S2610B_ABA_COMPONENTES', !!shC, S2610B.SHEET_COMPONENTES);

  if (shT) add('S2610B_HEADERS_TORRES', s2610BHeadersContem_(shT, S2610B_TORRES_HEADERS), s2610BHeaderResumo_(shT, S2610B_TORRES_HEADERS));
  if (shR) add('S2610B_HEADERS_REPRESENTACOES', s2610BHeadersContem_(shR, S2610B_REP_HEADERS), s2610BHeaderResumo_(shR, S2610B_REP_HEADERS));
  if (shC) add('S2610B_HEADERS_COMPONENTES', s2610BHeadersContem_(shC, S2610B_COMP_HEADERS), s2610BHeaderResumo_(shC, S2610B_COMP_HEADERS));

  add('S2610B_CONFIG_STATUS', String(cfg.S2610B_STATUS || '') === 'INSTALADO', String(cfg.S2610B_STATUS || 'ausente'));
  add('S2610B_CONFIG_SCHEMA', String(cfg.S2610B_SCHEMA || '') === S2610B.SCHEMA, String(cfg.S2610B_SCHEMA || 'ausente'));
  add('S2610B_CONFIG_NAO_PROMOVIDA', String(cfg.APP_FASE || '') !== 'S26.10', String(cfg.APP_VERSAO || '') + ' / ' + String(cfg.APP_FASE || ''));

  const torres = shT ? s240Objects_(shT) : [];
  const reps = shR ? s240Objects_(shR) : [];
  const comps = shC ? s240Objects_(shC) : [];

  const idsTorre = torres.map(function (r) { return String(r.ID_TORRE || '').trim(); }).filter(Boolean);
  const codigosTorre = torres.map(function (r) { return String(r.CODIGO || '').trim().toUpperCase(); }).filter(Boolean);
  const idsRep = reps.map(function (r) { return String(r.ID_REPRESENTACAO || '').trim(); }).filter(Boolean);
  const idsComp = comps.map(function (r) { return String(r.ID_COMPONENTE || '').trim(); }).filter(Boolean);

  add('S2610B_IDS_TORRE_UNICOS', s2610BUnique_(idsTorre), idsTorre.length + ' ID(s)');
  add('S2610B_CODIGOS_TORRE_UNICOS', s2610BUnique_(codigosTorre), codigosTorre.length + ' código(s)');
  add('S2610B_IDS_REP_UNICOS', s2610BUnique_(idsRep), idsRep.length + ' ID(s)');
  add('S2610B_IDS_COMPONENTE_UNICOS', s2610BUnique_(idsComp), idsComp.length + ' ID(s)');

  const setTorres = new Set(idsTorre);
  const repsOrfas = reps.filter(function (r) { return !setTorres.has(String(r.ID_TORRE || '').trim()); });
  const compsOrfaos = comps.filter(function (r) { return !setTorres.has(String(r.ID_TORRE || '').trim()); });
  add('S2610B_REP_SEM_ORFAS', repsOrfas.length === 0, repsOrfas.length + ' representação(ões) órfã(s)');
  add('S2610B_COMP_SEM_ORFAOS', compsOrfaos.length === 0, compsOrfaos.length + ' componente(s) órfão(s)');

  const paresRep = reps.map(function (r) {
    return String(r.ID_TORRE || '').trim() + '|' + String(r.ID_PLANTA_NIVEL || '').trim();
  }).filter(function (x) { return x !== '|'; });
  add('S2610B_UNICA_REP_POR_TORRE_NIVEL', s2610BUnique_(paresRep), paresRep.length + ' vínculo(s) torre/planta');

  const torresInvalidas = [];
  torres.forEach(function (r) {
    try {
      s2610BNormalizarIdTorre_(r.ID_TORRE);
      if (!s2610BNormalizarCodigo_(r.CODIGO)) throw new Error('Código vazio.');
      if (s2610BText_(r.NOME).length < 3) throw new Error('Nome inválido.');
      s2610BEnum_(r.TIPO || 'NUCLEO_VERTICAL', S2610B.TIPOS_TORRE, 'Tipo de torre');
      s2610BEnum_(r.STATUS || 'ATIVA', S2610B.STATUS_ENTIDADE, 'Status da torre');
      s2610BEnum_(r.STATUS_PUBLICACAO || 'RASCUNHO', S2610B.STATUS_PUBLICACAO, 'Status de publicação');
      const ns = s2610BNormalizarNiveis_(r.NIVEIS_ATENDIDOS_JSON);
      if (!ns.length) throw new Error('Sem níveis atendidos.');
    } catch (e) { torresInvalidas.push(String(r.ID_TORRE || '?') + ': ' + (e.message || String(e))); }
  });
  add('S2610B_TORRES_VALIDAS', torresInvalidas.length === 0, torresInvalidas.length ? torresInvalidas.slice(0, 5).join(' | ') : torres.length + ' torre(s) válida(s)');

  const torrePorId = {};
  torres.forEach(function (r) { torrePorId[String(r.ID_TORRE || '').trim()] = r; });
  const refsNivelInvalidas = [];
  reps.forEach(function (r) {
    const t = torrePorId[String(r.ID_TORRE || '').trim()];
    if (!t) return;
    const ns = s2610BJsonArray_(t.NIVEIS_ATENDIDOS_JSON);
    if (!ns.includes(s2610BUpper_(r.ID_NIVEL))) refsNivelInvalidas.push(String(r.ID_REPRESENTACAO || '?'));
  });
  comps.forEach(function (r) {
    const t = torrePorId[String(r.ID_TORRE || '').trim()];
    if (!t) return;
    const nsT = s2610BJsonArray_(t.NIVEIS_ATENDIDOS_JSON);
    s2610BJsonArray_(r.NIVEIS_ATENDIDOS_JSON).forEach(function (n) {
      if (!nsT.includes(n)) refsNivelInvalidas.push(String(r.ID_COMPONENTE || '?') + ':' + n);
    });
  });
  add('S2610B_NIVEIS_FILHOS_CONTIDOS_NA_TORRE', refsNivelInvalidas.length === 0, refsNivelInvalidas.length ? refsNivelInvalidas.slice(0, 5).join(' | ') : 'OK');

  const repsInvalidas = [];
  reps.forEach(function (r) {
    try { s2610BValidarRepresentacaoRow_(r); } catch (e) {
      repsInvalidas.push(String(r.ID_REPRESENTACAO || '?') + ': ' + (e.message || String(e)));
    }
  });
  add('S2610B_REP_VALIDAS', repsInvalidas.length === 0, repsInvalidas.length ? repsInvalidas.slice(0, 5).join(' | ') : reps.length + ' representação(ões) válida(s)');

  const compsInvalidos = [];
  comps.forEach(function (r) {
    try {
      s2610BEnum_(r.STATUS || 'ATIVA', S2610B.STATUS_ENTIDADE, 'Status do componente');
      s2610BEnum_(r.STATUS_PUBLICACAO || 'RASCUNHO', S2610B.STATUS_PUBLICACAO, 'Status de publicação');
      const ns = s2610BNormalizarNiveis_(r.NIVEIS_ATENDIDOS_JSON);
      if (!ns.length) throw new Error('Sem níveis atendidos.');
    } catch (e) { compsInvalidos.push(String(r.ID_COMPONENTE || '?') + ': ' + (e.message || String(e))); }
  });
  add('S2610B_COMPONENTES_VALIDOS', compsInvalidos.length === 0, compsInvalidos.length ? compsInvalidos.slice(0, 5).join(' | ') : comps.length + ' componente(s) válido(s)');

  add('S2610B_API_SALVAR_TORRE', typeof appSalvarTorreS2610B === 'function', 'appSalvarTorreS2610B');
  add('S2610B_API_SALVAR_REP', typeof appSalvarRepresentacaoTorreS2610B === 'function', 'appSalvarRepresentacaoTorreS2610B');
  add('S2610B_API_SALVAR_COMP', typeof appSalvarComponenteTorreS2610B === 'function', 'appSalvarComponenteTorreS2610B');
  add('S2610B_DEP_UPSERT', typeof s240Upsert_ === 'function', 's240Upsert_');
  add('S2610B_DEP_HISTORICO', typeof s253RegistrarEvento_ === 'function', 's253RegistrarEvento_');
  add('S2610B_DEP_AUDITORIA', typeof registrarAuditoriaS15_ === 'function', 'registrarAuditoriaS15_');
  add('S2610B_TESTE_PERSISTENCIA_DISPONIVEL', typeof testePersistenciaTemporariaTorresS2610B === 'function', 'testePersistenciaTemporariaTorresS2610B');
  add('S2610B_SEM_DELETE_PUBLICO', typeof appExcluirTorreS2610B === 'undefined' && typeof appExcluirRepresentacaoTorreS2610B === 'undefined' && typeof appExcluirComponenteTorreS2610B === 'undefined', 'Nenhuma API pública de exclusão');

  const falhasBloqueantes = checks.filter(function (c) { return c.bloqueante && !c.ok; }).length;
  return {
    ok: falhasBloqueantes === 0,
    gate: falhasBloqueantes === 0 ? 'APTO_PARA_APROVACAO' : 'BLOQUEADO',
    fase: S2610B.FASE,
    schema: S2610B.SCHEMA,
    totais: { torres: torres.length, representacoes: reps.length, componentes: comps.length },
    checks: checks,
    falhas: checks.filter(function (c) { return !c.ok; }).length,
    falhasBloqueantes: falhasBloqueantes
  };
}

function mostrarDiagnosticoS2610B() {
  const r = diagnosticoS2610B();
  console.log('[S26.10-B][RESULTADO] ' + JSON.stringify(r));
  r.checks.filter(function (c) { return !c.ok; }).forEach(function (c) {
    console.warn('[S26.10-B][FALHA] ' + c.nome + ' — ' + c.detalhe);
  });
  console.log('[S26.10-B][ENCERRADO] gate=' + r.gate + '; falhasBloqueantes=' + r.falhasBloqueantes);
  return r;
}

// -----------------------------------------------------------------------------
// CATÁLOGOS / LEITURAS
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// MUTAÇÕES ADMINISTRATIVAS
// -----------------------------------------------------------------------------

function appSalvarTorreS2610B(payload) {
  const admin = exigirPermissaoS14_('administrar');
  payload = payload || {};

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName(S2610B.SHEET_TORRES);
    if (!sh) throw new Error('Execute setupS2610B() antes de cadastrar Torres.');

    const codigo = s2610BNormalizarCodigo_(payload.codigo);
    if (!codigo) throw new Error('Código da torre é obrigatório. Ex.: T01.');

    const idSolicitado = s2610BText_(payload.idTorre);
    const idTorre = idSolicitado ? s2610BNormalizarIdTorre_(idSolicitado) : ('TORRE-' + codigo);
    const antes = s2610BObterTorreRow_(idTorre);

    if (antes && String(antes.ID_TORRE || '') !== idTorre) throw new Error('ID da torre é imutável.');

    const conflitoCodigo = s240Objects_(sh).find(function (r) {
      return s2610BUpper_(r.CODIGO) === codigo && String(r.ID_TORRE || '') !== idTorre;
    });
    if (conflitoCodigo) throw new Error('Já existe outra torre com o código ' + codigo + '.');

    const nome = s2610BText_(payload.nome);
    if (nome.length < 3) throw new Error('Nome da torre deve possuir ao menos 3 caracteres.');

    const tipo = s2610BEnum_(payload.tipo || (antes && antes.TIPO) || 'NUCLEO_VERTICAL', S2610B.TIPOS_TORRE, 'Tipo de torre');
    const status = s2610BEnum_(payload.status || (antes && antes.STATUS) || 'ATIVA', S2610B.STATUS_ENTIDADE, 'Status da torre');
    // S26.10-B não promove publicação. Novos itens nascem como RASCUNHO e os existentes preservam o estado.
    const statusPublicacao = antes ? s2610BEnum_(antes.STATUS_PUBLICACAO || 'RASCUNHO', S2610B.STATUS_PUBLICACAO, 'Status de publicação') : 'RASCUNHO';
    const niveis = s2610BNormalizarNiveis_(payload.niveisAtendidos != null ? payload.niveisAtendidos : s2610BJsonArray_(antes && antes.NIVEIS_ATENDIDOS_JSON));
    if (!niveis.length) throw new Error('Informe ao menos um nível atendido pela torre.');
    s2610BValidarReducaoNiveisTorre_(idTorre, niveis);

    const agora = new Date();
    const usuario = s2610BUsuario_(admin);
    const row = {
      ID_TORRE: idTorre,
      CODIGO: codigo,
      NOME: nome,
      TIPO: tipo,
      NIVEIS_ATENDIDOS_JSON: JSON.stringify(niveis),
      STATUS: status,
      STATUS_PUBLICACAO: statusPublicacao,
      OBSERVACOES: s2610BText_(payload.observacoes),
      CRIADO_EM: antes ? antes.CRIADO_EM : agora,
      CRIADO_POR: antes ? antes.CRIADO_POR : usuario,
      ATUALIZADO_EM: agora,
      ATUALIZADO_POR: usuario
    };

    s240Upsert_(sh, 'ID_TORRE', row);
    SpreadsheetApp.flush();
    const depois = s2610BObterTorreRow_(idTorre);
    s2610BAuditarMutacao_(antes ? 'TORRE_ATUALIZADA' : 'TORRE_CRIADA', 'CARTOGRAFIA_TORRES', idTorre, antes, depois, payload.motivo);
    return s2610BTorreRpc_(depois);
  } finally {
    lock.releaseLock();
  }
}

function appSalvarRepresentacaoTorreS2610B(payload) {
  const admin = exigirPermissaoS14_('administrar');
  payload = payload || {};

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName(S2610B.SHEET_REPRESENTACOES);
    if (!sh) throw new Error('Execute setupS2610B() antes de cadastrar representações.');

    const idTorre = s2610BNormalizarIdTorre_(payload.idTorre);
    const torre = s2610BObterTorreRow_(idTorre);
    if (!torre) throw new Error('Torre física não encontrada: ' + idTorre + '.');

    const nivel = s2610BResolverNivel_(payload.idNivel, payload.idPlantaNivel);
    const niveisTorre = s2610BJsonArray_(torre.NIVEIS_ATENDIDOS_JSON);
    if (!niveisTorre.includes(nivel.idNivel)) throw new Error('A torre ' + idTorre + ' não declara atendimento ao nível ' + nivel.idNivel + '.');
    const idRepresentacao = idTorre + '-' + nivel.idNivel;
    const antes = s2610BObterPorId_(sh, 'ID_REPRESENTACAO', idRepresentacao);

    const poligono = s2610BNormalizarPoligono_(payload.poligono != null ? payload.poligono : payload.poligonoJson);
    const status = s2610BEnum_(payload.status || (antes && antes.STATUS) || 'ATIVA', S2610B.STATUS_ENTIDADE, 'Status da representação');
    // Publicação será controlada pelo workflow cartográfico na S26.10-F.
    const statusPublicacao = antes ? s2610BEnum_(antes.STATUS_PUBLICACAO || 'RASCUNHO', S2610B.STATUS_PUBLICACAO, 'Status de publicação') : 'RASCUNHO';
    const versao = Math.max(1, Number((antes && antes.VERSAO_GEOMETRIA) || 0) + 1);

    const agora = new Date();
    const usuario = s2610BUsuario_(admin);
    const row = {
      ID_REPRESENTACAO: idRepresentacao,
      ID_TORRE: idTorre,
      ID_NIVEL: nivel.idNivel,
      ID_PLANTA_NIVEL: nivel.idPlantaNivel,
      POLIGONO_JSON: JSON.stringify(poligono),
      STATUS: status,
      STATUS_PUBLICACAO: statusPublicacao,
      VERSAO_GEOMETRIA: versao,
      OBSERVACOES: s2610BText_(payload.observacoes),
      CRIADO_EM: antes ? antes.CRIADO_EM : agora,
      CRIADO_POR: antes ? antes.CRIADO_POR : usuario,
      ATUALIZADO_EM: agora,
      ATUALIZADO_POR: usuario
    };

    s2610BValidarRepresentacaoRow_(row);
    s240Upsert_(sh, 'ID_REPRESENTACAO', row);
    SpreadsheetApp.flush();
    const depois = s2610BObterPorId_(sh, 'ID_REPRESENTACAO', idRepresentacao);
    s2610BAuditarMutacao_(antes ? 'TORRE_REPRESENTACAO_ATUALIZADA' : 'TORRE_REPRESENTACAO_CRIADA', 'CARTOGRAFIA_TORRE_REPRESENTACOES', idRepresentacao, antes, depois, payload.motivo);
    return s2610BRepresentacaoRpc_(depois);
  } finally {
    lock.releaseLock();
  }
}

function appSalvarComponenteTorreS2610B(payload) {
  const admin = exigirPermissaoS14_('administrar');
  payload = payload || {};

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName(S2610B.SHEET_COMPONENTES);
    if (!sh) throw new Error('Execute setupS2610B() antes de cadastrar componentes.');

    const idTorre = s2610BNormalizarIdTorre_(payload.idTorre);
    const torre = s2610BObterTorreRow_(idTorre);
    if (!torre) throw new Error('Torre física não encontrada: ' + idTorre + '.');

    const codigo = s2610BNormalizarCodigo_(payload.codigo);
    if (!codigo) throw new Error('Código do componente é obrigatório. Ex.: E01.');

    const idSolicitado = s2610BText_(payload.idComponente);
    const idComponente = idSolicitado ? s2610BNormalizarIdComponente_(idSolicitado) : (idTorre + '-COMP-' + codigo);
    const antes = s2610BObterPorId_(sh, 'ID_COMPONENTE', idComponente);

    const conflito = s240Objects_(sh).find(function (r) {
      return String(r.ID_TORRE || '') === idTorre && s2610BUpper_(r.CODIGO) === codigo && String(r.ID_COMPONENTE || '') !== idComponente;
    });
    if (conflito) throw new Error('Já existe o componente ' + codigo + ' nesta torre.');

    const nome = s2610BText_(payload.nome);
    if (nome.length < 2) throw new Error('Nome do componente deve possuir ao menos 2 caracteres.');

    const tipo = s2610BEnum_(payload.tipo || (antes && antes.TIPO) || 'OUTRO', S2610B.TIPOS_COMPONENTE, 'Tipo do componente');
    const status = s2610BEnum_(payload.status || (antes && antes.STATUS) || 'ATIVA', S2610B.STATUS_ENTIDADE, 'Status do componente');
    const statusPublicacao = antes ? s2610BEnum_(antes.STATUS_PUBLICACAO || 'RASCUNHO', S2610B.STATUS_PUBLICACAO, 'Status de publicação') : 'RASCUNHO';
    const niveis = s2610BNormalizarNiveis_(payload.niveisAtendidos != null ? payload.niveisAtendidos : s2610BJsonArray_(antes && antes.NIVEIS_ATENDIDOS_JSON));
    if (!niveis.length) throw new Error('Informe ao menos um nível atendido pelo componente.');
    const niveisTorre = s2610BJsonArray_(torre.NIVEIS_ATENDIDOS_JSON);
    const fora = niveis.filter(function (n) { return !niveisTorre.includes(n); });
    if (fora.length) throw new Error('Componente utiliza nível(is) não atendido(s) pela torre: ' + fora.join(', ') + '.');

    const agora = new Date();
    const usuario = s2610BUsuario_(admin);
    const row = {
      ID_COMPONENTE: idComponente,
      ID_TORRE: idTorre,
      CODIGO: codigo,
      TIPO: tipo,
      NOME: nome,
      NIVEIS_ATENDIDOS_JSON: JSON.stringify(niveis),
      STATUS: status,
      STATUS_PUBLICACAO: statusPublicacao,
      OBSERVACOES: s2610BText_(payload.observacoes),
      CRIADO_EM: antes ? antes.CRIADO_EM : agora,
      CRIADO_POR: antes ? antes.CRIADO_POR : usuario,
      ATUALIZADO_EM: agora,
      ATUALIZADO_POR: usuario
    };

    s240Upsert_(sh, 'ID_COMPONENTE', row);
    SpreadsheetApp.flush();
    const depois = s2610BObterPorId_(sh, 'ID_COMPONENTE', idComponente);
    s2610BAuditarMutacao_(antes ? 'TORRE_COMPONENTE_ATUALIZADO' : 'TORRE_COMPONENTE_CRIADO', 'CARTOGRAFIA_TORRE_COMPONENTES', idComponente, antes, depois, payload.motivo);
    return s2610BComponenteRpc_(depois);
  } finally {
    lock.releaseLock();
  }
}

// -----------------------------------------------------------------------------
// TESTE NÃO DESTRUTIVO DOS CONTRATOS
// Não cria torre real. Exercita normalização/validação em memória.
// -----------------------------------------------------------------------------

function testeContratosTorresS2610B() {
  exigirPermissaoS14_('administrar');
  const checks = [];
  const add = function (nome, ok, detalhe) { checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || '') }); };

  const niveis = s2610BNormalizarNiveis_(['N3', 'N1', 'N1', 'N0']);
  add('S2610B_TEST_NIVEIS', JSON.stringify(niveis) === JSON.stringify(['N0', 'N1', 'N3']), JSON.stringify(niveis));

  const nivel = s2610BResolverNivel_('N2', '');
  add('S2610B_TEST_NIVEL_N2', nivel.idPlantaNivel === 'PLA-CFF-N2-2025', JSON.stringify(nivel));

  const pol = s2610BNormalizarPoligono_([{ x: 0.1, y: 0.1 }, { x: 0.4, y: 0.1 }, { x: 0.4, y: 0.5 }, { x: 0.1, y: 0.5 }]);
  add('S2610B_TEST_POLIGONO', pol.length === 4, pol.length + ' vértices');

  let rejeitou = false;
  try { s2610BNormalizarPoligono_([{ x: 0, y: 0 }, { x: 1, y: 1 }]); } catch (_) { rejeitou = true; }
  add('S2610B_TEST_POLIGONO_INVALIDO', rejeitou, rejeitou ? 'bloqueado' : 'não bloqueado');

  let nivelInvalido = false;
  try { s2610BResolverNivel_('N9', ''); } catch (_) { nivelInvalido = true; }
  add('S2610B_TEST_NIVEL_INVALIDO', nivelInvalido, nivelInvalido ? 'bloqueado' : 'não bloqueado');

  add('S2610B_TEST_RASCUNHO_NAO_OPERACIONAL', !s2610BRowOperacional_({ STATUS: 'ATIVA', STATUS_PUBLICACAO: 'RASCUNHO' }), 'RASCUNHO bloqueado no operacional');
  add('S2610B_TEST_PUBLICADA_OPERACIONAL', s2610BRowOperacional_({ STATUS: 'ATIVA', STATUS_PUBLICACAO: 'PUBLICADA' }), 'ATIVA + PUBLICADA disponível');

  const ok = checks.every(function (c) { return c.ok; });
  const r = { ok: ok, gate: ok ? 'APTO_PARA_TESTE_MUTACAO' : 'BLOQUEADO', fase: S2610B.FASE, checks: checks, falhas: checks.filter(function (c) { return !c.ok; }).length };
  console.log('[S26.10-B][CONTRATOS] ' + JSON.stringify(r));
  return r;
}

// -----------------------------------------------------------------------------
// TESTE DE PERSISTÊNCIA TEMPORÁRIA
// Cria somente abas QA efêmeras e as remove no finally. Não grava torres reais.
// -----------------------------------------------------------------------------

function testePersistenciaTemporariaTorresS2610B() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const sufixo = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  const nomes = {
    torres: '__QA_S2610B_T_' + sufixo,
    reps: '__QA_S2610B_R_' + sufixo,
    comps: '__QA_S2610B_C_' + sufixo
  };
  const checks = [];
  const add = function (nome, ok, detalhe) { checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || '') }); };

  try {
    const shT = s240EnsureSheet_(ss, nomes.torres, S2610B_TORRES_HEADERS.slice());
    const shR = s240EnsureSheet_(ss, nomes.reps, S2610B_REP_HEADERS.slice());
    const shC = s240EnsureSheet_(ss, nomes.comps, S2610B_COMP_HEADERS.slice());

    const agora = new Date();
    const torre = {
      ID_TORRE: 'TORRE-QA01', CODIGO: 'QA01', NOME: 'Torre QA', TIPO: 'NUCLEO_VERTICAL',
      NIVEIS_ATENDIDOS_JSON: JSON.stringify(['N0', 'N1']), STATUS: 'ATIVA', STATUS_PUBLICACAO: 'RASCUNHO',
      OBSERVACOES: 'QA temporário S26.10-B', CRIADO_EM: agora, CRIADO_POR: 'QA', ATUALIZADO_EM: agora, ATUALIZADO_POR: 'QA'
    };
    s240Upsert_(shT, 'ID_TORRE', torre);
    let rowsT = s240Objects_(shT);
    add('S2610B_PERSIST_CREATE', rowsT.length === 1 && String(rowsT[0].ID_TORRE || '') === 'TORRE-QA01', rowsT.length + ' linha(s)');

    torre.NOME = 'Torre QA Atualizada';
    torre.ATUALIZADO_EM = new Date();
    s240Upsert_(shT, 'ID_TORRE', torre);
    rowsT = s240Objects_(shT);
    add('S2610B_PERSIST_UPDATE_IDEMPOTENTE', rowsT.length === 1 && String(rowsT[0].NOME || '') === 'Torre QA Atualizada', rowsT.length + ' linha(s)');

    const rep = {
      ID_REPRESENTACAO: 'TORRE-QA01-N0', ID_TORRE: 'TORRE-QA01', ID_NIVEL: 'N0', ID_PLANTA_NIVEL: 'PLA-CFF-N0-2025',
      POLIGONO_JSON: JSON.stringify([{x:0.1,y:0.1},{x:0.2,y:0.1},{x:0.2,y:0.2},{x:0.1,y:0.2}]), STATUS: 'ATIVA',
      STATUS_PUBLICACAO: 'RASCUNHO', VERSAO_GEOMETRIA: 1, OBSERVACOES: 'QA', CRIADO_EM: agora, CRIADO_POR: 'QA', ATUALIZADO_EM: agora, ATUALIZADO_POR: 'QA'
    };
    s2610BValidarRepresentacaoRow_(rep);
    s240Upsert_(shR, 'ID_REPRESENTACAO', rep);
    add('S2610B_PERSIST_REPRESENTACAO', s240Objects_(shR).length === 1, '1 representação');

    const comp = {
      ID_COMPONENTE: 'TORRE-QA01-COMP-E01', ID_TORRE: 'TORRE-QA01', CODIGO: 'E01', TIPO: 'ELEVADOR_SOCIAL', NOME: 'Elevador QA',
      NIVEIS_ATENDIDOS_JSON: JSON.stringify(['N0', 'N1']), STATUS: 'ATIVA', STATUS_PUBLICACAO: 'RASCUNHO', OBSERVACOES: 'QA',
      CRIADO_EM: agora, CRIADO_POR: 'QA', ATUALIZADO_EM: agora, ATUALIZADO_POR: 'QA'
    };
    s240Upsert_(shC, 'ID_COMPONENTE', comp);
    add('S2610B_PERSIST_COMPONENTE', s240Objects_(shC).length === 1, '1 componente');

    SpreadsheetApp.flush();
  } finally {
    Object.keys(nomes).forEach(function (k) {
      try {
        const sh = ss.getSheetByName(nomes[k]);
        if (sh) ss.deleteSheet(sh);
      } catch (e) { console.error('[S26.10-B][QA-CLEANUP]', nomes[k], e); }
    });
  }

  const sobras = Object.keys(nomes).filter(function (k) { return !!ss.getSheetByName(nomes[k]); });
  add('S2610B_PERSIST_CLEANUP', sobras.length === 0, sobras.length ? sobras.join(', ') : 'sem abas QA residuais');

  const ok = checks.every(function (c) { return c.ok; });
  const r = { ok: ok, gate: ok ? 'APTO_PARA_APROVACAO' : 'BLOQUEADO', fase: S2610B.FASE, checks: checks, falhas: checks.filter(function (c) { return !c.ok; }).length };
  console.log('[S26.10-B][PERSISTENCIA] ' + JSON.stringify(r));
  return r;
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function s2610BConfigObj_(ss) {
  const sh = ss.getSheetByName('CONFIG');
  if (!sh || sh.getLastRow() < 2) return {};
  const vals = sh.getDataRange().getValues();
  const h = vals.shift().map(function (x) { return String(x || '').trim(); });
  const k = h.indexOf('CHAVE');
  const v = h.indexOf('VALOR');
  const out = {};
  if (k < 0 || v < 0) return out;
  vals.forEach(function (r) { const key = String(r[k] || '').trim(); if (key) out[key] = r[v]; });
  return out;
}

function s2610BHeadersContem_(sh, esperados) {
  if (!sh) return false;
  const h = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(function (x) { return String(x || '').trim(); });
  return esperados.every(function (x) { return h.includes(x); });
}

function s2610BHeaderResumo_(sh, esperados) {
  const h = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(function (x) { return String(x || '').trim(); });
  const faltam = esperados.filter(function (x) { return !h.includes(x); });
  return faltam.length ? ('Faltando: ' + faltam.join(', ')) : (esperados.length + '/' + esperados.length);
}

function s2610BUnique_(arr) {
  return new Set(arr).size === arr.length;
}

function s2610BRowOperacional_(r) {
  return s2610BUpper_(r && r.STATUS) === 'ATIVA' && s2610BUpper_(r && r.STATUS_PUBLICACAO) === 'PUBLICADA';
}

function s2610BText_(v) {
  return String(v == null ? '' : v).trim();
}

function s2610BUpper_(v) {
  return s2610BText_(v).toUpperCase();
}

function s2610BNormalizarCodigo_(v) {
  return s2610BUpper_(v).replace(/[^A-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function s2610BNormalizarIdTorre_(v) {
  let id = s2610BUpper_(v).replace(/[^A-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!id) throw new Error('ID da torre é obrigatório.');
  if (!id.startsWith('TORRE-')) id = 'TORRE-' + id;
  return id;
}

function s2610BNormalizarIdComponente_(v) {
  const id = s2610BUpper_(v).replace(/[^A-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!id) throw new Error('ID do componente é obrigatório.');
  return id;
}

function s2610BEnum_(v, permitidos, rotulo) {
  const x = s2610BUpper_(v);
  if (!permitidos.includes(x)) throw new Error((rotulo || 'Valor') + ' inválido: ' + x + '. Permitidos: ' + permitidos.join(', ') + '.');
  return x;
}

function s2610BJsonArray_(v) {
  if (Array.isArray(v)) return v;
  if (v == null || v === '') return [];
  try {
    const a = JSON.parse(String(v));
    return Array.isArray(a) ? a : [];
  } catch (_) { return []; }
}

function s2610BNormalizarNiveis_(v) {
  let arr = Array.isArray(v) ? v : s2610BJsonArray_(v);
  arr = arr.map(s2610BUpper_).filter(Boolean);
  arr.forEach(function (n) {
    if (!Object.prototype.hasOwnProperty.call(S2610B.NIVEIS, n)) throw new Error('Nível inválido: ' + n + '.');
  });
  const ordem = ['N0', 'N1', 'N2', 'N3'];
  return Array.from(new Set(arr)).sort(function (a, b) { return ordem.indexOf(a) - ordem.indexOf(b); });
}

function s2610BResolverNivel_(idNivel, idPlantaNivel) {
  const n = s2610BUpper_(idNivel);
  const p = s2610BText_(idPlantaNivel);
  if (n && Object.prototype.hasOwnProperty.call(S2610B.NIVEIS, n)) {
    if (p && p !== S2610B.NIVEIS[n]) throw new Error('Nível ' + n + ' não corresponde à planta ' + p + '.');
    return { idNivel: n, idPlantaNivel: S2610B.NIVEIS[n] };
  }
  if (p) {
    const achado = Object.keys(S2610B.NIVEIS).find(function (k) { return S2610B.NIVEIS[k] === p; });
    if (achado) return { idNivel: achado, idPlantaNivel: p };
  }
  throw new Error('Informe um nível válido entre N0, N1, N2 e N3.');
}

function s2610BNormalizarPoligono_(v) {
  let pts = v;
  if (typeof pts === 'string') {
    try { pts = JSON.parse(pts); } catch (_) { throw new Error('POLIGONO_JSON inválido.'); }
  }
  if (!Array.isArray(pts) || pts.length < 3) throw new Error('O polígono da torre precisa possuir pelo menos 3 vértices.');

  const out = pts.map(function (p, i) {
    let x, y;
    if (Array.isArray(p)) { x = Number(p[0]); y = Number(p[1]); }
    else { x = Number(p && (p.x != null ? p.x : p.X)); y = Number(p && (p.y != null ? p.y : p.Y)); }
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Vértice ' + (i + 1) + ' possui coordenada inválida.');
    if (x < 0 || x > 1 || y < 0 || y > 1) throw new Error('Vértice ' + (i + 1) + ' está fora do intervalo normalizado 0..1.');
    return { x: x, y: y };
  });

  const distintos = new Set(out.map(function (p) { return p.x.toFixed(8) + '|' + p.y.toFixed(8); }));
  if (distintos.size < 3) throw new Error('O polígono precisa possuir pelo menos 3 vértices distintos.');

  const area = Math.abs(s2610BAreaAssinada_(out));
  if (!(area > 1e-10)) throw new Error('O polígono possui área nula ou degenerada.');
  return out;
}

function s2610BAreaAssinada_(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

function s2610BObterPorId_(sh, chave, id) {
  if (!sh || !id) return null;
  return s240Objects_(sh).find(function (r) { return String(r[chave] || '').trim() === String(id || '').trim(); }) || null;
}

function s2610BObterTorreRow_(idTorre) {
  const sh = SpreadsheetApp.getActive().getSheetByName(S2610B.SHEET_TORRES);
  return sh ? s2610BObterPorId_(sh, 'ID_TORRE', idTorre) : null;
}

function s2610BListarRepresentacoesRows_(idTorre) {
  const sh = SpreadsheetApp.getActive().getSheetByName(S2610B.SHEET_REPRESENTACOES);
  if (!sh) return [];
  return s240Objects_(sh).filter(function (r) { return String(r.ID_TORRE || '').trim() === idTorre; });
}

function s2610BListarComponentesRows_(idTorre) {
  const sh = SpreadsheetApp.getActive().getSheetByName(S2610B.SHEET_COMPONENTES);
  if (!sh) return [];
  return s240Objects_(sh).filter(function (r) { return String(r.ID_TORRE || '').trim() === idTorre; });
}


function s2610BValidarReducaoNiveisTorre_(idTorre, novosNiveis) {
  const removidos = [];
  const reps = s2610BListarRepresentacoesRows_(idTorre);
  reps.forEach(function (r) {
    const n = s2610BUpper_(r.ID_NIVEL);
    if (n && !novosNiveis.includes(n)) removidos.push(n + ' (representação ' + String(r.ID_REPRESENTACAO || '') + ')');
  });
  const comps = s2610BListarComponentesRows_(idTorre);
  comps.forEach(function (r) {
    s2610BJsonArray_(r.NIVEIS_ATENDIDOS_JSON).forEach(function (n) {
      if (n && !novosNiveis.includes(n)) removidos.push(n + ' (componente ' + String(r.ID_COMPONENTE || '') + ')');
    });
  });
  if (removidos.length) {
    throw new Error('Não é possível remover nível(is) ainda referenciado(s) pela torre: ' + Array.from(new Set(removidos)).join(', ') + '.');
  }
  return true;
}

function s2610BValidarRepresentacaoRow_(r) {
  const idTorre = s2610BNormalizarIdTorre_(r.ID_TORRE);
  const nivel = s2610BResolverNivel_(r.ID_NIVEL, r.ID_PLANTA_NIVEL);
  const esperado = idTorre + '-' + nivel.idNivel;
  if (String(r.ID_REPRESENTACAO || '').trim() !== esperado) throw new Error('ID_REPRESENTACAO deve ser ' + esperado + '.');
  s2610BNormalizarPoligono_(r.POLIGONO_JSON);
  s2610BEnum_(r.STATUS || 'ATIVA', S2610B.STATUS_ENTIDADE, 'Status da representação');
  s2610BEnum_(r.STATUS_PUBLICACAO || 'RASCUNHO', S2610B.STATUS_PUBLICACAO, 'Status de publicação');
  return true;
}

function s2610BTorreRpc_(r) {
  return {
    idTorre: String(r.ID_TORRE || ''),
    codigo: String(r.CODIGO || ''),
    nome: String(r.NOME || ''),
    tipo: String(r.TIPO || ''),
    niveisAtendidos: s2610BJsonArray_(r.NIVEIS_ATENDIDOS_JSON),
    status: String(r.STATUS || ''),
    statusPublicacao: String(r.STATUS_PUBLICACAO || ''),
    observacoes: String(r.OBSERVACOES || ''),
    criadoEm: s2610BRpcSeguro_(r.CRIADO_EM),
    criadoPor: String(r.CRIADO_POR || ''),
    atualizadoEm: s2610BRpcSeguro_(r.ATUALIZADO_EM),
    atualizadoPor: String(r.ATUALIZADO_POR || '')
  };
}

function s2610BRepresentacaoRpc_(r) {
  return {
    idRepresentacao: String(r.ID_REPRESENTACAO || ''),
    idTorre: String(r.ID_TORRE || ''),
    idNivel: String(r.ID_NIVEL || ''),
    idPlantaNivel: String(r.ID_PLANTA_NIVEL || ''),
    poligono: s2610BJsonArrayOuObjeto_(r.POLIGONO_JSON),
    status: String(r.STATUS || ''),
    statusPublicacao: String(r.STATUS_PUBLICACAO || ''),
    versaoGeometria: Number(r.VERSAO_GEOMETRIA || 0),
    observacoes: String(r.OBSERVACOES || ''),
    criadoEm: s2610BRpcSeguro_(r.CRIADO_EM),
    criadoPor: String(r.CRIADO_POR || ''),
    atualizadoEm: s2610BRpcSeguro_(r.ATUALIZADO_EM),
    atualizadoPor: String(r.ATUALIZADO_POR || '')
  };
}

function s2610BComponenteRpc_(r) {
  return {
    idComponente: String(r.ID_COMPONENTE || ''),
    idTorre: String(r.ID_TORRE || ''),
    codigo: String(r.CODIGO || ''),
    tipo: String(r.TIPO || ''),
    nome: String(r.NOME || ''),
    niveisAtendidos: s2610BJsonArray_(r.NIVEIS_ATENDIDOS_JSON),
    status: String(r.STATUS || ''),
    statusPublicacao: String(r.STATUS_PUBLICACAO || ''),
    observacoes: String(r.OBSERVACOES || ''),
    criadoEm: s2610BRpcSeguro_(r.CRIADO_EM),
    criadoPor: String(r.CRIADO_POR || ''),
    atualizadoEm: s2610BRpcSeguro_(r.ATUALIZADO_EM),
    atualizadoPor: String(r.ATUALIZADO_POR || '')
  };
}

function s2610BJsonArrayOuObjeto_(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(String(v)); } catch (_) { return null; }
}

function s2610BRpcSeguro_(v) {
  if (v instanceof Date) return v.toISOString();
  return v == null ? '' : String(v);
}

function s2610BUsuario_(sessao) {
  if (sessao && sessao.email) return String(sessao.email);
  try { return Session.getActiveUser().getEmail() || ''; } catch (_) { return ''; }
}

function s2610BAuditarMutacao_(acao, entidade, entidadeId, antes, depois, motivo) {
  try {
    if (typeof s253RegistrarEvento_ === 'function') {
      s253RegistrarEvento_({
        tipoEvento: acao,
        entidade: entidade,
        entidadeId: entidadeId,
        nome: (depois && (depois.NOME || depois.CODIGO)) || (antes && (antes.NOME || antes.CODIGO)) || entidadeId,
        antes: antes || null,
        depois: depois || null,
        motivo: s2610BText_(motivo || 'S26.10-B — alteração administrativa de Torres / Núcleos verticais.'),
        origem: 'WEB_APP'
      });
    }
  } catch (e) { console.error('[S26.10-B][HISTORICO]', e); }

  try {
    if (typeof registrarAuditoriaS15_ === 'function') {
      registrarAuditoriaS15_({
        acao: acao,
        entidade: entidade,
        entidadeId: entidadeId,
        resultado: 'SUCESSO',
        origem: 'WEB_APP',
        valorAnterior: antes || null,
        valorNovo: depois || null,
        detalhes: { fase: S2610B.FASE, motivo: s2610BText_(motivo) }
      });
    }
  } catch (e2) { console.error('[S26.10-B][AUDITORIA]', e2); }
}
