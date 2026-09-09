/**
 * S26.8-E2 — Gate online do Nível 0 / Subsolo
 * Somente leitura. Não altera CONFIG, cartografia, registros ou cache.
 *
 * Objetivo:
 * - validar que a cartografia operacional do N0 está íntegra no backend;
 * - validar resolução determinística dos 24 polígonos operacionais;
 * - garantir que E01 (macro agregada legada) continua fora da resolução;
 * - validar metadados mínimos retornados pelo resolvedor.
 */

const S268E2 = Object.freeze({
  VERSAO: 'S26.8-E2',
  NIVEL: 'PLA-CFF-N0-2025',
  ESPERADO: Object.freeze({
    ESTACIONAMENTO: 6,
    CIRCULACAO_VEICULAR: 10,
    RAMPA_ACESSO: 2,
    ACESSO_PEDESTRE: 1,
    AREA_EXTERNA: 4,
    SUBSOLO_GERAL: 1
  }),
  TOTAL_RESOLVIVEL: 24,
  E01: 'AREA-N0-EXTERNA'
});

function s268E2PontoNoPoligono_(x, y, pol) {
  if (typeof s243PontoNoPoligono_ === 'function') {
    try { return !!s243PontoNoPoligono_(x, y, pol); } catch (_) {}
  }
  if (!Array.isArray(pol) || pol.length < 3) return false;
  let dentro = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const xi = Number(pol[i].x), yi = Number(pol[i].y);
    const xj = Number(pol[j].x), yj = Number(pol[j].y);
    const cruza = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

function s268E2CandidatosInternos_(pol) {
  if (!Array.isArray(pol) || pol.length < 3) return [];
  const xs = pol.map(function(p){ return Number(p.x); });
  const ys = pol.map(function(p){ return Number(p.y); });
  const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
  const minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
  const centro = {
    x: xs.reduce(function(a,b){ return a+b; },0) / xs.length,
    y: ys.reduce(function(a,b){ return a+b; },0) / ys.length
  };
  const out = [centro, {x:(minX+maxX)/2, y:(minY+maxY)/2}];

  // Pontos internos aproximados a partir de vértices/arestas, afastados da borda.
  pol.forEach(function(p, i){
    const q = pol[(i + 1) % pol.length];
    const vx = Number(p.x), vy = Number(p.y);
    const mx = (vx + Number(q.x)) / 2, my = (vy + Number(q.y)) / 2;
    out.push({x: centro.x * 0.25 + vx * 0.75, y: centro.y * 0.25 + vy * 0.75});
    out.push({x: centro.x * 0.25 + mx * 0.75, y: centro.y * 0.25 + my * 0.75});
  });

  // Grade determinística para polígonos côncavos ou áreas parcialmente sobrepostas.
  const passos = 14;
  for (let iy = 1; iy < passos; iy++) {
    for (let ix = 1; ix < passos; ix++) {
      out.push({
        x: minX + (maxX - minX) * (ix / passos),
        y: minY + (maxY - minY) * (iy / passos)
      });
    }
  }

  const vistos = {};
  return out.filter(function(p){
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return false;
    const k = p.x.toFixed(7) + '|' + p.y.toFixed(7);
    if (vistos[k]) return false;
    vistos[k] = true;
    return s268E2PontoNoPoligono_(p.x, p.y, pol);
  });
}

function s268E2AcharPontoResolvido_(area, areas) {
  const candidatos = s268E2CandidatosInternos_(area.poligono);
  for (let i = 0; i < candidatos.length; i++) {
    const p = candidatos[i];
    let resolvida = null;
    try {
      resolvida = s268DResolverArea_(areas, p.x, p.y);
    } catch (_) {}
    if (resolvida && String(resolvida.id) === String(area.id)) {
      return {ok:true, x:p.x, y:p.y, resolvida:resolvida};
    }
  }
  return {ok:false, candidatos:candidatos.length};
}

function diagnosticoGateS268E2() {
  exigirPermissaoS14_('administrar');

  const checks = [];
  const add = function(nome, ok, detalhe) {
    checks.push({nome:nome, ok:!!ok, detalhe:String(detalhe == null ? '' : detalhe)});
  };

  add('BASE_D4_DISPONIVEL', typeof diagnosticoS268D4 === 'function', 'diagnosticoS268D4');
  add('API_OPERACAO_N0', typeof appObterOperacaoNivel0S268D === 'function', 'appObterOperacaoNivel0S268D');
  add('API_RESOLVER_N0', typeof appResolverPontoNivel0S268D === 'function', 'appResolverPontoNivel0S268D');

  const op = appObterOperacaoNivel0S268D();
  const areas = Array.isArray(op && op.areas) ? op.areas : [];
  const validas = areas.filter(function(a){
    return a && a.status === 'VALIDADA' && Array.isArray(a.poligono) && a.poligono.length >= 4;
  });
  const resolviveis = validas.filter(function(a){ return a.participaResolucao !== false; });
  const e01 = areas.find(function(a){ return String(a.id) === S268E2.E01; }) || null;

  add('N0_CORRETO', String(op && op.nivel) === S268E2.NIVEL, op && op.nivel);
  add('N0_OPERAVEL', !!(op && op.operavel), String(!!(op && op.operavel)));
  add('N0_CARTOGRAFIA_ATIVA', !!(op && op.cartografiaAtiva), String(!!(op && op.cartografiaAtiva)));
  add('N0_AREAS_COMPOSTAS', !!(op && op.areasCompostas), String(!!(op && op.areasCompostas)));
  add('E01_FORA_RESOLUCAO', !!(e01 && e01.participaResolucao === false), e01 ? e01.modoGeometria : 'ausente');
  add('TOTAL_RESOLVIVEL', resolviveis.length === S268E2.TOTAL_RESOLVIVEL, resolviveis.length + '/' + S268E2.TOTAL_RESOLVIVEL);

  Object.keys(S268E2.ESPERADO).forEach(function(tipo){
    const qtd = resolviveis.filter(function(a){ return String(a.tipoArea) === tipo; }).length;
    add('QTD_' + tipo, qtd === S268E2.ESPERADO[tipo], qtd + '/' + S268E2.ESPERADO[tipo]);
  });

  const amostras = [];
  resolviveis.forEach(function(area){
    const achou = s268E2AcharPontoResolvido_(area, areas);
    const nomeCheck = 'RESOLVE_' + String(area.codigo || area.id || '').replace(/[^A-Za-z0-9_]+/g, '_').toUpperCase();
    if (!achou.ok) {
      add(nomeCheck, false, String(area.id) + ' sem ponto interno que resolva para si; candidatos=' + String(achou.candidatos || 0));
      amostras.push({id:area.id, codigo:area.codigo, tipo:area.tipoArea, ok:false});
      return;
    }

    let rpc = null;
    try { rpc = appResolverPontoNivel0S268D({x:achou.x, y:achou.y}); } catch (e) { rpc = {ok:false, erro:String(e && e.message || e)}; }
    const rpcOk = !!(rpc && rpc.ok && String(rpc.areaId) === String(area.id) && String(rpc.idNivel) === S268E2.NIVEL && String(rpc.piso) === '0');
    add(nomeCheck, rpcOk, String(area.id) + ' @ ' + achou.x.toFixed(5) + ',' + achou.y.toFixed(5));
    amostras.push({
      id: area.id,
      codigo: area.codigo,
      tipo: area.tipoArea,
      nome: area.nome,
      ok: rpcOk,
      x: Number(achou.x.toFixed(6)),
      y: Number(achou.y.toFixed(6)),
      areaFisicaId: rpc && rpc.areaFisicaId || '',
      subareaFisicaId: rpc && rpc.subareaFisicaId || ''
    });
  });

  const out = {
    ok: checks.every(function(c){ return c.ok; }),
    candidato: 'MVP-3.30.0-SINALIZACAO-S26.8',
    diagnostico: 'S26.8-E2-N0-ONLINE',
    totalChecks: checks.length,
    falhas: checks.filter(function(c){ return !c.ok; }).length,
    checks: checks,
    totalAreasValidas: validas.length,
    totalAreasResolviveis: resolviveis.length,
    amostras: amostras,
    somenteLeitura: true,
    versao: S268E2.VERSAO,
    proximoGate: 'S26.8-E3-CORRESPONDENCIA-N0-N1'
  };
  console.log('[S26.8-E2] ' + JSON.stringify(out));
  return out;
}
