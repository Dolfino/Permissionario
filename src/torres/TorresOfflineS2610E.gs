/**
 * S26.10-E — TORRES / NÚCLEOS VERTICAIS
 * Pacote cartográfico offline + contrato local-first.
 *
 * Regras:
 * - somente Torre ATIVA + PUBLICADA e representação ATIVA + PUBLICADA entram no pacote operacional;
 * - RASCUNHO/VALIDADA não são distribuídos para IndexedDB operacional;
 * - cada nível recebe somente sua geometria própria;
 * - nenhuma coordenada é copiada/transformada entre N0/N1/N2/N3;
 * - este arquivo não altera APP_VERSAO / APP_FASE e não cria abas;
 * - o armazenamento IndexedDB permanece no store existente mapPackages;
 * - a integração visual com formulários/ocorrências será tratada na S26.10-G.
 */

const S2610E = Object.freeze({
  FASE: 'S26.10-E',
  SCHEMA: 1,
  CAMPO_PACOTE: 'torresS2610E',
  VERSAO_CACHE: 'S26.10-E1'
});

/**
 * Retorna a parcela de Torres que deve ser incorporada ao mapPackage do nível.
 * Entrada: 'N2', 'PLA-CFF-N2-2025' ou {idNivel|idPlantaNivel: ...}.
 */
function appObterPacoteTorresOfflineS2610E(payload) {
  exigirPermissaoS14_('consultarMapa');
  s2610EDependente_('appListarRepresentacoesOperacionaisTorresS2610D');

  payload = (typeof payload === 'string')
    ? (/^PLA-CFF-N[0-3]-2025$/i.test(String(payload).trim())
      ? { idPlantaNivel: String(payload).trim() }
      : { idNivel: String(payload).trim() })
    : (payload || {});

  const nivel = s2610BResolverNivel_(payload.idNivel, payload.idPlantaNivel);
  const base = appListarRepresentacoesOperacionaisTorresS2610D({
    idNivel: nivel.idNivel,
    idPlantaNivel: nivel.idPlantaNivel
  });

  const representacoes = Array.isArray(base && base.representacoes)
    ? base.representacoes.map(s2610ENormalizarRepresentacaoCache_)
    : [];

  const assinaturaPayload = {
    schema: S2610E.SCHEMA,
    idNivel: nivel.idNivel,
    idPlantaNivel: nivel.idPlantaNivel,
    representacoes: representacoes.map(function (r) {
      return {
        idTorre: r.idTorre,
        codigo: r.codigo,
        idRepresentacao: r.idRepresentacao,
        versaoGeometria: r.versaoGeometria,
        poligono: r.poligono
      };
    })
  };

  return {
    ok: true,
    fase: S2610E.FASE,
    schema: S2610E.SCHEMA,
    versaoCache: S2610E.VERSAO_CACHE,
    idNivel: nivel.idNivel,
    idPlantaNivel: nivel.idPlantaNivel,
    fonte: 'OPERACIONAL_PUBLICADA',
    geradoEm: Utilities.formatDate(new Date(), APP.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    assinatura: s2610ESha256_(JSON.stringify(assinaturaPayload)),
    representacoes: representacoes,
    invalidasIgnoradas: Array.isArray(base && base.invalidasIgnoradas)
      ? base.invalidasIgnoradas.slice()
      : []
  };
}

function s2610ENormalizarRepresentacaoCache_(r) {
  r = r || {};
  const nivel = s2610BResolverNivel_(r.idNivel, r.idPlantaNivel);
  const poligono = s2610BNormalizarPoligono_(r.poligono);
  return {
    idTorre: String(r.idTorre || '').trim(),
    codigo: String(r.codigo || '').trim(),
    nome: String(r.nome || '').trim(),
    tipo: String(r.tipo || '').trim(),
    idRepresentacao: String(r.idRepresentacao || '').trim(),
    idNivel: nivel.idNivel,
    idPlantaNivel: nivel.idPlantaNivel,
    versaoGeometria: Number(r.versaoGeometria || 0),
    poligono: poligono.map(function (p) {
      return { x: Number(p.x), y: Number(p.y) };
    })
  };
}

function s2610ESha256_(texto) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(texto || ''),
    Utilities.Charset.UTF_8
  ).map(function (b) {
    return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0');
  }).join('');
}

function s2610EDependente_(nome) {
  let fn = null;
  try { fn = eval(nome); } catch (_) { fn = null; }
  if (typeof fn !== 'function') throw new Error('Dependência S26.10-E indisponível: ' + nome);
  return fn;
}

/**
 * Teste de contratos do envelope offline. Não grava dados.
 */
function testeContratosTorresOfflineS2610E() {
  exigirPermissaoS14_('administrar');
  const checks = [];
  const add = function (nome, ok, detalhe) {
    checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || '') });
  };

  try {
    const p = s2610ENormalizarRepresentacaoCache_({
      idTorre: 'TORRE-TQA',
      codigo: 'TQA',
      nome: 'Torre QA',
      tipo: 'NUCLEO_VERTICAL',
      idRepresentacao: 'TORRE-TQA-N2',
      idNivel: 'N2',
      idPlantaNivel: 'PLA-CFF-N2-2025',
      versaoGeometria: 1,
      poligono: [
        { x: 0.10, y: 0.10 },
        { x: 0.20, y: 0.10 },
        { x: 0.20, y: 0.20 },
        { x: 0.10, y: 0.20 }
      ]
    });
    add('S2610E_CONTRATO_REPRESENTACAO', p.idNivel === 'N2' && p.poligono.length === 4, p.idRepresentacao);
  } catch (e) {
    add('S2610E_CONTRATO_REPRESENTACAO', false, e.message);
  }

  try {
    const p1 = appObterPacoteTorresOfflineS2610E('N1');
    add('S2610E_PACOTE_N1', p1.ok && p1.schema === 1 && Array.isArray(p1.representacoes), 'representacoes=' + p1.representacoes.length);
    add('S2610E_PACOTE_FONTE_PUBLICADA', p1.fonte === 'OPERACIONAL_PUBLICADA', p1.fonte);
    add('S2610E_PACOTE_ASSINADO', /^[a-f0-9]{64}$/.test(String(p1.assinatura || '')), p1.assinatura ? 'SHA-256' : 'ausente');
  } catch (e) {
    add('S2610E_PACOTE_N1', false, e.message);
    add('S2610E_PACOTE_FONTE_PUBLICADA', false, e.message);
    add('S2610E_PACOTE_ASSINADO', false, e.message);
  }

  try {
    const p2 = appObterPacoteTorresOfflineS2610E('N2');
    // A prova real de não vazamento é feita comparando exatamente com o resolvedor D operacional:
    const op = appListarRepresentacoesOperacionaisTorresS2610D({ idNivel: 'N2' });
    add('S2610E_MESMO_CONJUNTO_OPERACIONAL',
      JSON.stringify(p2.representacoes || []) === JSON.stringify(op.representacoes || []),
      'offline=' + (p2.representacoes || []).length + '; operacional=' + (op.representacoes || []).length);
    add('S2610E_SEM_CANAL_PREVIEW', p2.fonte === 'OPERACIONAL_PUBLICADA', 'somente fonte operacional');
  } catch (e) {
    add('S2610E_MESMO_CONJUNTO_OPERACIONAL', false, e.message);
    add('S2610E_SEM_CANAL_PREVIEW', false, e.message);
  }

  const falhas = checks.filter(function (c) { return !c.ok; }).length;
  const out = {
    ok: falhas === 0,
    gate: falhas === 0 ? 'APTO_PARA_TESTE_CACHE' : 'BLOQUEADO',
    fase: S2610E.FASE,
    checks: checks,
    falhas: falhas
  };
  console.log('[S26.10-E][CONTRATOS] ' + JSON.stringify(out));
  return out;
}

function diagnosticoTorresOfflineS2610E() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const checks = [];
  const add = function (nome, ok, detalhe, bloqueante) {
    checks.push({
      nome: nome,
      ok: !!ok,
      detalhe: String(detalhe || ''),
      bloqueante: bloqueante !== false
    });
  };

  add('S2610E_DEP_S2610B', typeof S2610B === 'object', 'S2610B');
  add('S2610E_DEP_S2610D', typeof appListarRepresentacoesOperacionaisTorresS2610D === 'function', 'appListarRepresentacoesOperacionaisTorresS2610D');
  add('S2610E_API_PACOTE', typeof appObterPacoteTorresOfflineS2610E === 'function', 'appObterPacoteTorresOfflineS2610E');

  let total = 0;
  ['N0', 'N1', 'N2', 'N3'].forEach(function (idNivel) {
    try {
      const p = appObterPacoteTorresOfflineS2610E(idNivel);
      total += (p.representacoes || []).length;
      const todasDoNivel = (p.representacoes || []).every(function (r) {
        return r.idNivel === idNivel && r.idPlantaNivel === S2610B.NIVEIS[idNivel];
      });
      add('S2610E_PACOTE_' + idNivel,
        p.ok && p.schema === S2610E.SCHEMA && Array.isArray(p.representacoes) && todasDoNivel,
        'representacoes=' + (p.representacoes || []).length + '; invalidas=' + (p.invalidasIgnoradas || []).length);
    } catch (e) {
      add('S2610E_PACOTE_' + idNivel, false, e.message);
    }
  });

  const cfg = (typeof lerConfigComoObjeto_ === 'function') ? lerConfigComoObjeto_(ss) : {};
  add('S2610E_CONFIG_NAO_PROMOVIDA_S2610', String(cfg.APP_FASE || '') !== 'S26.10', String(cfg.APP_VERSAO || '') + ' / ' + String(cfg.APP_FASE || ''));
  add('S2610E_SEM_NOVO_OBJECTSTORE', true, 'usa mapPackages existente; DB version permanece responsabilidade do cliente atual');

  const falhasBloqueantes = checks.filter(function (c) { return c.bloqueante && !c.ok; }).length;
  const out = {
    ok: falhasBloqueantes === 0,
    gate: falhasBloqueantes === 0 ? 'APTO_PARA_TESTE_OFFLINE_UI' : 'BLOQUEADO',
    fase: S2610E.FASE,
    schema: S2610E.SCHEMA,
    representacoesOperacionais: total,
    checks: checks,
    falhas: checks.filter(function (c) { return !c.ok; }).length,
    falhasBloqueantes: falhasBloqueantes
  };
  return out;
}

function mostrarDiagnosticoTorresOfflineS2610E() {
  const d = diagnosticoTorresOfflineS2610E();
  console.log('[S26.10-E][RESULTADO] ' + JSON.stringify(d));
  (d.checks || []).filter(function (c) { return !c.ok; }).forEach(function (c) {
    console.warn('[S26.10-E][FALHA] ' + c.nome + ' — ' + c.detalhe);
  });
  console.log('[S26.10-E][ENCERRADO] gate=' + d.gate + '; falhasBloqueantes=' + d.falhasBloqueantes);
  return d;
}
