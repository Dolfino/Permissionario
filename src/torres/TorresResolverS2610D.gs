/**
 * S26.10-D — TORRES / NÚCLEOS VERTICAIS
 * Resolvedor cartográfico complementar por nível/planta.
 *
 * Regras:
 * - NÃO substitui setor, área, corredor, estacionamento ou localização existente;
 * - usa coordenadas normalizadas da planta composta do próprio nível;
 * - NÃO transforma/copias coordenadas entre N0/N1/N2/N3;
 * - operação normal enxerga apenas Torre ATIVA + PUBLICADA e representação ATIVA + PUBLICADA;
 * - preview administrativo pode enxergar RASCUNHO/VALIDADA/PUBLICADA, mas nunca é usado como resolvedor operacional;
 * - sobreposição entre duas torres é tratada como AMBIGUIDADE, nunca escolhida silenciosamente;
 * - ponto exatamente sobre a borda é considerado pertencente ao polígono (regra determinística).
 *
 * Baseline preservada:
 * - não altera APP_VERSAO / APP_FASE;
 * - não grava dados;
 * - não publica rascunhos;
 * - sem integração offline nesta etapa (S26.10-E).
 */

const S2610D = Object.freeze({
  FASE: 'S26.10-D',
  EPS_BORDA: 1e-9,
  MODOS: Object.freeze({
    OPERACIONAL: 'OPERACIONAL',
    PREVIEW_ADMIN: 'PREVIEW_ADMIN'
  })
});

// -----------------------------------------------------------------------------
// APIs PÚBLICAS
// -----------------------------------------------------------------------------

/**
 * Resolvedor operacional. Somente conteúdo ATIVA + PUBLICADA participa.
 * Entrada: { idNivel | idPlantaNivel, x, y }
 */
function appResolverTorreS2610D(payload) {
  exigirPermissaoS14_('consultarMapa');
  return s2610DResolverPayload_(payload, S2610D.MODOS.OPERACIONAL);
}

/**
 * Preview exclusivamente administrativo para validar geometrias ainda em
 * RASCUNHO/VALIDADA antes do ciclo formal de publicação da S26.10-F.
 */
function appResolverTorrePreviewS2610D(payload) {
  exigirPermissaoS14_('administrar');
  return s2610DResolverPayload_(payload, S2610D.MODOS.PREVIEW_ADMIN);
}

/**
 * Contrato já preparado para a S26.10-E: retorna somente representações
 * operacionais publicadas de um nível, em formato seguro para cache local.
 * Esta função NÃO altera o pacote offline ainda.
 */
function appListarRepresentacoesOperacionaisTorresS2610D(payload) {
  exigirPermissaoS14_('consultarMapa');
  payload = (typeof payload === 'string') ? { idNivel: payload } : (payload || {});
  const nivel = s2610DResolverNivel_(payload);
  const contexto = s2610DCarregarContexto_(nivel, S2610D.MODOS.OPERACIONAL);
  return {
    ok: true,
    fase: S2610D.FASE,
    idNivel: nivel.idNivel,
    idPlantaNivel: nivel.idPlantaNivel,
    representacoes: contexto.representacoes.map(s2610DRepresentacaoCache_),
    invalidasIgnoradas: contexto.invalidas.slice()
  };
}

// -----------------------------------------------------------------------------
// RESOLUÇÃO
// -----------------------------------------------------------------------------

function s2610DResolverPayload_(payload, modo) {
  payload = payload || {};
  const nivel = s2610DResolverNivel_(payload);
  const x = Number(payload.x);
  const y = Number(payload.y);
  s2610DValidarCoordenada_(x, y);

  const contexto = s2610DCarregarContexto_(nivel, modo);
  const r = resolverTorreEmRepresentacoesS2610D_(
    x,
    y,
    contexto.representacoes,
    { idNivel: nivel.idNivel, idPlantaNivel: nivel.idPlantaNivel }
  );

  return Object.assign({}, r, {
    fase: S2610D.FASE,
    modo: modo,
    idNivel: nivel.idNivel,
    idPlantaNivel: nivel.idPlantaNivel,
    x: x,
    y: y,
    complementar: true,
    invalidasIgnoradas: contexto.invalidas.slice()
  });
}

/**
 * Motor puro. Recebe representações já filtradas para o nível desejado.
 * Pode ser reutilizado no cliente/offline na etapa S26.10-E.
 */
function resolverTorreEmRepresentacoesS2610D_(x, y, representacoes, contexto) {
  s2610DValidarCoordenada_(Number(x), Number(y));
  representacoes = Array.isArray(representacoes) ? representacoes : [];
  contexto = contexto || {};

  const candidatas = representacoes.filter(function (r) {
    return Array.isArray(r.poligono) && s2610DPontoNoPoligonoInclusivo_(Number(x), Number(y), r.poligono);
  }).sort(function (a, b) {
    return String(a.codigo || a.idTorre || '').localeCompare(String(b.codigo || b.idTorre || ''), 'pt-BR', { numeric: true });
  });

  if (!candidatas.length) {
    return {
      ok: true,
      resolvido: false,
      motivo: 'FORA_DE_TORRE',
      torre: null,
      representacao: null,
      candidatos: [],
      resumo: ''
    };
  }

  if (candidatas.length > 1) {
    return {
      ok: false,
      resolvido: false,
      motivo: 'AMBIGUIDADE_TORRES',
      torre: null,
      representacao: null,
      candidatos: candidatas.map(s2610DCandidatoRpc_),
      resumo: 'Ponto contido em mais de uma Torre/Núcleo vertical.'
    };
  }

  const c = candidatas[0];
  return {
    ok: true,
    resolvido: true,
    motivo: 'TORRE_IDENTIFICADA',
    torre: {
      idTorre: String(c.idTorre || ''),
      codigo: String(c.codigo || ''),
      nome: String(c.nome || ''),
      tipo: String(c.tipo || ''),
      niveisAtendidos: Array.isArray(c.niveisAtendidos) ? c.niveisAtendidos.slice() : []
    },
    representacao: {
      idRepresentacao: String(c.idRepresentacao || ''),
      idNivel: String(c.idNivel || contexto.idNivel || ''),
      idPlantaNivel: String(c.idPlantaNivel || contexto.idPlantaNivel || ''),
      versaoGeometria: Number(c.versaoGeometria || 0)
    },
    candidatos: [s2610DCandidatoRpc_(c)],
    resumo: s2610DResumo_(c)
  };
}

// -----------------------------------------------------------------------------
// LEITURA / FILTROS
// -----------------------------------------------------------------------------

function s2610DCarregarContexto_(nivel, modo) {
  let torres = [];
  let reps = [];

  // S26.10-F: após instalar a governança, o modo OPERACIONAL lê exclusivamente
  // o snapshot imutável da última publicação. Edições do estado de trabalho não
  // afetam o mapa até nova publicação formal.
  if (modo === S2610D.MODOS.OPERACIONAL &&
      typeof s2610FGovernancaInstalada_ === 'function' && s2610FGovernancaInstalada_() &&
      typeof s2610FEstadoPublicadoRaw_ === 'function') {
    const publicado = s2610FEstadoPublicadoRaw_();
    torres = publicado.torres || [];
    reps = publicado.representacoes || [];
  } else {
    const ss = SpreadsheetApp.getActive();
    const shT = ss.getSheetByName(S2610B.SHEET_TORRES);
    const shR = ss.getSheetByName(S2610B.SHEET_REPRESENTACOES);
    if (!shT || !shR) return { representacoes: [], invalidas: [] };
    torres = s240Objects_(shT);
    reps = s240Objects_(shR);
  }

  const torresPorId = {};
  torres.forEach(function (t) {
    const id = String(t.ID_TORRE || '').trim();
    if (id) torresPorId[id] = t;
  });

  const out = [];
  const invalidas = [];
  reps.forEach(function (r) {
    const idNivel = s2610BUpper_(r.ID_NIVEL);
    const idPlantaNivel = s2610BText_(r.ID_PLANTA_NIVEL);
    if (idNivel !== nivel.idNivel || idPlantaNivel !== nivel.idPlantaNivel) return;

    const idTorre = String(r.ID_TORRE || '').trim();
    const t = torresPorId[idTorre];
    if (!t) { invalidas.push(String(r.ID_REPRESENTACAO || '') + ': torre órfã'); return; }
    if (!s2610DParticipa_(t, r, modo)) return;

    try {
      const poligono = s2610BNormalizarPoligono_(r.POLIGONO_JSON);
      const torreRpc = s2610BTorreRpc_(t);
      const repRpc = s2610BRepresentacaoRpc_(r);
      out.push({
        idTorre: torreRpc.idTorre,
        codigo: torreRpc.codigo,
        nome: torreRpc.nome,
        tipo: torreRpc.tipo,
        niveisAtendidos: torreRpc.niveisAtendidos,
        idRepresentacao: repRpc.idRepresentacao,
        idNivel: repRpc.idNivel,
        idPlantaNivel: repRpc.idPlantaNivel,
        versaoGeometria: repRpc.versaoGeometria,
        statusPublicacaoTorre: torreRpc.statusPublicacao,
        statusPublicacaoRepresentacao: repRpc.statusPublicacao,
        poligono: poligono
      });
    } catch (e) {
      invalidas.push(String(r.ID_REPRESENTACAO || '') + ': ' + String(e && e.message || e));
    }
  });

  return { representacoes: out, invalidas: invalidas };
}

function s2610DParticipa_(torreRow, repRow, modo) {
  if (s2610BUpper_(torreRow.STATUS) !== 'ATIVA') return false;
  if (s2610BUpper_(repRow.STATUS) !== 'ATIVA') return false;

  if (modo === S2610D.MODOS.OPERACIONAL) {
    return s2610BUpper_(torreRow.STATUS_PUBLICACAO) === 'PUBLICADA' &&
      s2610BUpper_(repRow.STATUS_PUBLICACAO) === 'PUBLICADA';
  }

  // PREVIEW_ADMIN: permite estados de publicação conhecidos, mas mantém
  // somente entidades fisicamente ATIVAS.
  return S2610B.STATUS_PUBLICACAO.includes(s2610BUpper_(torreRow.STATUS_PUBLICACAO)) &&
    S2610B.STATUS_PUBLICACAO.includes(s2610BUpper_(repRow.STATUS_PUBLICACAO));
}

function s2610DResolverNivel_(payload) {
  payload = payload || {};
  return s2610BResolverNivel_(payload.idNivel, payload.idPlantaNivel);
}

// -----------------------------------------------------------------------------
// GEOMETRIA
// -----------------------------------------------------------------------------

function s2610DValidarCoordenada_(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
    throw new Error('Coordenadas da planta devem estar normalizadas no intervalo 0..1.');
  }
}

function s2610DPontoNoPoligonoInclusivo_(x, y, pts) {
  if (!Array.isArray(pts) || pts.length < 3) return false;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (s2610DPontoNoSegmento_(x, y, Number(a.x), Number(a.y), Number(b.x), Number(b.y), S2610D.EPS_BORDA)) {
      return true;
    }
  }
  if (typeof s243PontoNoPoligono_ === 'function') {
    return !!s243PontoNoPoligono_(x, y, pts);
  }
  // Fallback equivalente caso o helper histórico não esteja disponível.
  let dentro = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = Number(pts[i].x), yi = Number(pts[i].y);
    const xj = Number(pts[j].x), yj = Number(pts[j].y);
    const cruza = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-15) + xi);
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

function s2610DPontoNoSegmento_(px, py, ax, ay, bx, by, eps) {
  eps = Number(eps || 1e-9);
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const cross = vx * wy - vy * wx;
  if (Math.abs(cross) > eps) return false;
  const dot = wx * vx + wy * vy;
  if (dot < -eps) return false;
  const len2 = vx * vx + vy * vy;
  if (dot - len2 > eps) return false;
  return true;
}

// Busca um ponto interno somente para diagnóstico/QA. Não participa da operação.
function s2610DPontoInternoTeste_(poligono) {
  const pts = s2610BNormalizarPoligono_(poligono);
  const media = pts.reduce(function (a, p) { a.x += p.x; a.y += p.y; return a; }, { x: 0, y: 0 });
  media.x /= pts.length; media.y /= pts.length;
  if (s2610DPontoNoPoligonoInclusivo_(media.x, media.y, pts)) return media;

  const xs = pts.map(function (p) { return p.x; });
  const ys = pts.map(function (p) { return p.y; });
  const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
  const minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);

  // Grade determinística, suficiente para polígonos pequenos de núcleos verticais.
  for (let gy = 1; gy <= 19; gy++) {
    for (let gx = 1; gx <= 19; gx++) {
      const x = minX + (maxX - minX) * gx / 20;
      const y = minY + (maxY - minY) * gy / 20;
      if (s2610DPontoNoPoligonoInclusivo_(x, y, pts)) return { x: x, y: y };
    }
  }
  return null;
}

// -----------------------------------------------------------------------------
// SERIALIZAÇÃO
// -----------------------------------------------------------------------------

function s2610DRepresentacaoCache_(r) {
  return {
    idTorre: String(r.idTorre || ''),
    codigo: String(r.codigo || ''),
    nome: String(r.nome || ''),
    tipo: String(r.tipo || ''),
    idRepresentacao: String(r.idRepresentacao || ''),
    idNivel: String(r.idNivel || ''),
    idPlantaNivel: String(r.idPlantaNivel || ''),
    versaoGeometria: Number(r.versaoGeometria || 0),
    poligono: (r.poligono || []).map(function (p) { return { x: Number(p.x), y: Number(p.y) }; })
  };
}

function s2610DCandidatoRpc_(r) {
  return {
    idTorre: String(r.idTorre || ''),
    codigo: String(r.codigo || ''),
    nome: String(r.nome || ''),
    idRepresentacao: String(r.idRepresentacao || ''),
    idNivel: String(r.idNivel || ''),
    idPlantaNivel: String(r.idPlantaNivel || ''),
    versaoGeometria: Number(r.versaoGeometria || 0)
  };
}

function s2610DResumo_(r) {
  const codigo = String(r.codigo || '').trim();
  const nome = String(r.nome || '').trim();
  if (codigo && nome) return 'Torre ' + codigo + ' — ' + nome;
  if (codigo) return 'Torre ' + codigo;
  return nome || 'Torre/Núcleo vertical';
}

// -----------------------------------------------------------------------------
// QA / GATES
// -----------------------------------------------------------------------------

function testeContratosResolverTorresS2610D() {
  exigirPermissaoS14_('administrar');
  const checks = [];
  const add = function (nome, ok, detalhe) {
    checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || '') });
  };

  const pN1 = [
    { x: 0.10, y: 0.10 }, { x: 0.30, y: 0.10 },
    { x: 0.30, y: 0.30 }, { x: 0.10, y: 0.30 }
  ];
  const pN2 = [
    { x: 0.65, y: 0.65 }, { x: 0.85, y: 0.65 },
    { x: 0.85, y: 0.85 }, { x: 0.65, y: 0.85 }
  ];

  const baseN1 = [{
    idTorre: 'TORRE-T01', codigo: 'T01', nome: 'Torre 01', tipo: 'NUCLEO_VERTICAL',
    niveisAtendidos: ['N1', 'N2'], idRepresentacao: 'TORRE-T01-N1', idNivel: 'N1',
    idPlantaNivel: 'PLA-CFF-N1-2025', versaoGeometria: 1, poligono: pN1
  }];
  const baseN2 = [{
    idTorre: 'TORRE-T01', codigo: 'T01', nome: 'Torre 01', tipo: 'NUCLEO_VERTICAL',
    niveisAtendidos: ['N1', 'N2'], idRepresentacao: 'TORRE-T01-N2', idNivel: 'N2',
    idPlantaNivel: 'PLA-CFF-N2-2025', versaoGeometria: 1, poligono: pN2
  }];

  const dentro = resolverTorreEmRepresentacoesS2610D_(0.20, 0.20, baseN1, { idNivel: 'N1' });
  add('S2610D_DENTRO_T01', dentro.ok && dentro.resolvido && dentro.torre && dentro.torre.idTorre === 'TORRE-T01', dentro.resumo);

  const fora = resolverTorreEmRepresentacoesS2610D_(0.50, 0.50, baseN1, { idNivel: 'N1' });
  add('S2610D_FORA_RETORNA_NULL', fora.ok && !fora.resolvido && fora.torre === null && fora.motivo === 'FORA_DE_TORRE', fora.motivo);

  const borda = resolverTorreEmRepresentacoesS2610D_(0.10, 0.20, baseN1, { idNivel: 'N1' });
  add('S2610D_BORDA_INCLUSIVA', borda.ok && borda.resolvido && borda.torre.idTorre === 'TORRE-T01', borda.motivo);

  const n2PontoN1 = resolverTorreEmRepresentacoesS2610D_(0.20, 0.20, baseN2, { idNivel: 'N2' });
  const n2PontoN2 = resolverTorreEmRepresentacoesS2610D_(0.75, 0.75, baseN2, { idNivel: 'N2' });
  add('S2610D_GEOMETRIA_INDEPENDENTE_NIVEIS', !n2PontoN1.resolvido && n2PontoN2.resolvido, 'N1 e N2 usam polígonos independentes');

  const sobreposta = baseN1.concat([{
    idTorre: 'TORRE-T02', codigo: 'T02', nome: 'Torre 02', tipo: 'NUCLEO_VERTICAL',
    niveisAtendidos: ['N1'], idRepresentacao: 'TORRE-T02-N1', idNivel: 'N1',
    idPlantaNivel: 'PLA-CFF-N1-2025', versaoGeometria: 1,
    poligono: [
      { x: 0.15, y: 0.15 }, { x: 0.35, y: 0.15 },
      { x: 0.35, y: 0.35 }, { x: 0.15, y: 0.35 }
    ]
  }]);
  const amb = resolverTorreEmRepresentacoesS2610D_(0.20, 0.20, sobreposta, { idNivel: 'N1' });
  add('S2610D_SOBREPOSICAO_NAO_ESCOLHE_SILENCIOSO', !amb.ok && amb.motivo === 'AMBIGUIDADE_TORRES' && amb.candidatos.length === 2, amb.motivo);

  let coordBloq = false;
  try { resolverTorreEmRepresentacoesS2610D_(1.2, 0.5, baseN1, {}); } catch (_) { coordBloq = true; }
  add('S2610D_COORDENADA_INVALIDA_BLOQUEADA', coordBloq, coordBloq ? 'bloqueada' : 'não bloqueada');

  const falhas = checks.filter(function (c) { return !c.ok; });
  const out = {
    ok: falhas.length === 0,
    gate: falhas.length ? 'BLOQUEADO' : 'APTO_PARA_TESTE_REAL',
    fase: S2610D.FASE,
    checks: checks,
    falhas: falhas.length
  };
  console.log('[S26.10-D][CONTRATOS] ' + JSON.stringify(out));
  return out;
}

/**
 * Teste somente leitura sobre as geometrias reais já cadastradas no editor C.
 * Usa PREVIEW_ADMIN para poder validar RASCUNHOS sem publicá-los.
 */
function testeRepresentacoesReaisTorresS2610D() {
  exigirPermissaoS14_('administrar');
  const checks = [];
  const add = function (nome, ok, detalhe) {
    checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || '') });
  };

  let total = 0;
  let testadas = 0;
  Object.keys(S2610B.NIVEIS).forEach(function (idNivel) {
    const nivel = { idNivel: idNivel, idPlantaNivel: S2610B.NIVEIS[idNivel] };
    const ctx = s2610DCarregarContexto_(nivel, S2610D.MODOS.PREVIEW_ADMIN);
    total += ctx.representacoes.length;

    ctx.representacoes.forEach(function (rep) {
      const p = s2610DPontoInternoTeste_(rep.poligono);
      if (!p) {
        add('S2610D_REAL_' + rep.idRepresentacao, false, 'Não foi possível obter ponto interno de QA.');
        return;
      }
      const r = resolverTorreEmRepresentacoesS2610D_(p.x, p.y, ctx.representacoes, nivel);
      const contemEsperada = Array.isArray(r.candidatos) && r.candidatos.some(function (c) { return c.idRepresentacao === rep.idRepresentacao; });
      const semAmbiguidade = r.ok && r.resolvido && r.torre && r.torre.idTorre === rep.idTorre;
      add('S2610D_REAL_' + rep.idRepresentacao, semAmbiguidade && contemEsperada,
        'ponto=' + p.x.toFixed(6) + ',' + p.y.toFixed(6) + '; resultado=' + String(r.motivo || ''));
      testadas++;
    });

    ctx.invalidas.forEach(function (msg, idx) {
      add('S2610D_REAL_INVALIDA_' + idNivel + '_' + (idx + 1), false, msg);
    });
  });

  add('S2610D_REAL_HA_REPRESENTACOES', total > 0, total + ' representação(ões) real(is) encontrada(s)');
  const falhas = checks.filter(function (c) { return !c.ok; });
  const out = {
    ok: falhas.length === 0,
    gate: falhas.length ? 'BLOQUEADO' : 'APTO_PARA_APROVACAO',
    fase: S2610D.FASE,
    totais: { encontradas: total, testadas: testadas },
    checks: checks,
    falhas: falhas.length
  };
  console.log('[S26.10-D][REAIS] ' + JSON.stringify(out));
  return out;
}

function diagnosticoResolverTorresS2610D() {
  exigirPermissaoS14_('administrar');
  const checks = [];
  const add = function (nome, ok, detalhe, bloqueante) {
    checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || ''), bloqueante: bloqueante !== false });
  };

  const ss = SpreadsheetApp.getActive();
  add('S2610D_DEP_S2610B', typeof S2610B === 'object', 'S2610B', true);
  add('S2610D_DEP_PIP_S243', typeof s243PontoNoPoligono_ === 'function', 's243PontoNoPoligono_', true);
  add('S2610D_API_RESOLVER', typeof appResolverTorreS2610D === 'function', 'appResolverTorreS2610D', true);
  add('S2610D_API_PREVIEW', typeof appResolverTorrePreviewS2610D === 'function', 'appResolverTorrePreviewS2610D', true);
  add('S2610D_API_LISTAR_OFFLINE_FUTURO', typeof appListarRepresentacoesOperacionaisTorresS2610D === 'function', 'appListarRepresentacoesOperacionaisTorresS2610D', true);
  add('S2610D_ABA_TORRES', !!ss.getSheetByName(S2610B.SHEET_TORRES), S2610B.SHEET_TORRES, true);
  add('S2610D_ABA_REPRESENTACOES', !!ss.getSheetByName(S2610B.SHEET_REPRESENTACOES), S2610B.SHEET_REPRESENTACOES, true);

  let adminTotal = 0;
  let opTotal = 0;
  let invalidasOp = [];
  Object.keys(S2610B.NIVEIS).forEach(function (idNivel) {
    const nivel = { idNivel: idNivel, idPlantaNivel: S2610B.NIVEIS[idNivel] };
    const preview = s2610DCarregarContexto_(nivel, S2610D.MODOS.PREVIEW_ADMIN);
    const op = s2610DCarregarContexto_(nivel, S2610D.MODOS.OPERACIONAL);
    adminTotal += preview.representacoes.length;
    opTotal += op.representacoes.length;
    invalidasOp = invalidasOp.concat(op.invalidas);
    add('S2610D_NIVEL_' + idNivel + '_LEGIVEL', preview.invalidas.length === 0,
      'preview=' + preview.representacoes.length + '; operacional=' + op.representacoes.length + '; inválidas=' + preview.invalidas.length, true);
  });

  add('S2610D_REPRESENTACOES_ADMIN_DISPONIVEIS', adminTotal > 0, adminTotal + ' representação(ões) para preview', true);
  add('S2610D_OPERACIONAL_NAO_VAZA_RASCUNHO', opTotal <= adminTotal, 'preview=' + adminTotal + '; operacional=' + opTotal, true);
  add('S2610D_OPERACIONAL_SEM_GEOMETRIA_INVALIDA', invalidasOp.length === 0, invalidasOp.length ? invalidasOp.join(' | ') : 'OK', true);

  const cfg = (typeof s2610BConfigObj_ === 'function') ? s2610BConfigObj_(ss) : {};
  add('S2610D_CONFIG_NAO_PROMOVIDA_S2610', String(cfg.APP_FASE || '') !== 'S26.10', String(cfg.APP_VERSAO || '') + ' / ' + String(cfg.APP_FASE || ''), true);

  const falhasBloqueantes = checks.filter(function (c) { return !c.ok && c.bloqueante; });
  return {
    ok: falhasBloqueantes.length === 0,
    gate: falhasBloqueantes.length ? 'BLOQUEADO' : 'APTO_PARA_APROVACAO',
    fase: S2610D.FASE,
    totais: { previewAdmin: adminTotal, operacionalPublicada: opTotal },
    checks: checks,
    falhas: checks.filter(function (c) { return !c.ok; }).length,
    falhasBloqueantes: falhasBloqueantes.length
  };
}

function mostrarDiagnosticoResolverTorresS2610D() {
  const r = diagnosticoResolverTorresS2610D();
  console.log('[S26.10-D][RESULTADO] ' + JSON.stringify(r));
  r.checks.filter(function (c) { return !c.ok; }).forEach(function (c) {
    console.warn('[S26.10-D][FALHA] ' + c.nome + ' — ' + c.detalhe);
  });
  console.log('[S26.10-D][ENCERRADO] gate=' + r.gate + '; falhasBloqueantes=' + r.falhasBloqueantes);
  return r;
}
