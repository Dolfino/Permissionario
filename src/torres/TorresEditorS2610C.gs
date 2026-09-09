/**
 * S26.10-C — TORRES / NÚCLEOS VERTICAIS
 * Contrato de carregamento do editor administrativo + diagnóstico.
 *
 * Não promove APP_VERSAO / APP_FASE.
 * Não cria seed.
 * Não publica rascunhos.
 * Não altera o resolvedor operacional nem o pacote offline.
 */

const S2610C = Object.freeze({
  FASE: 'S26.10-C',
  UI: '1',
  PLANTAS: Object.freeze({
    N0: 'PLA-CFF-N0-2025',
    N1: 'PLA-CFF-N1-2025',
    N2: 'PLA-CFF-N2-2025',
    N3: 'PLA-CFF-N3-2025'
  })
});

function appCarregarEditorTorresS2610C() {
  exigirPermissaoS14_('administrar');

  if (typeof S2610B === 'undefined') {
    throw new Error('Backend S26.10-B não carregado. Adicione TorresServiceS2610B.gs antes do editor.');
  }

  const ss = SpreadsheetApp.getActive();
  const shT = ss.getSheetByName(S2610B.SHEET_TORRES);
  const shR = ss.getSheetByName(S2610B.SHEET_REPRESENTACOES);
  const shC = ss.getSheetByName(S2610B.SHEET_COMPONENTES);
  if (!shT || !shR || !shC) {
    throw new Error('Estruturas de Torres ausentes. Execute setupS2610B() antes de abrir o editor.');
  }

  const torres = s240Objects_(shT).map(s2610BTorreRpc_);
  const representacoes = s240Objects_(shR).map(s2610BRepresentacaoRpc_);
  const componentes = s240Objects_(shC).map(s2610BComponenteRpc_);

  torres.sort(function (a, b) {
    return String(a.codigo || '').localeCompare(String(b.codigo || ''), 'pt-BR', { numeric: true });
  });
  representacoes.sort(function (a, b) {
    const ka = String(a.idNivel || '') + '|' + String(a.idTorre || '');
    const kb = String(b.idNivel || '') + '|' + String(b.idTorre || '');
    return ka.localeCompare(kb, 'pt-BR', { numeric: true });
  });
  componentes.sort(function (a, b) {
    const ka = String(a.idTorre || '') + '|' + String(a.codigo || '');
    const kb = String(b.idTorre || '') + '|' + String(b.codigo || '');
    return ka.localeCompare(kb, 'pt-BR', { numeric: true });
  });

  return {
    fase: S2610C.FASE,
    ui: S2610C.UI,
    catalogos: {
      tiposTorre: S2610B.TIPOS_TORRE.slice(),
      tiposComponente: S2610B.TIPOS_COMPONENTE.slice(),
      statusEntidade: S2610B.STATUS_ENTIDADE.slice(),
      statusPublicacao: S2610B.STATUS_PUBLICACAO.slice(),
      niveis: Object.keys(S2610C.PLANTAS).map(function (idNivel) {
        return { idNivel: idNivel, idPlantaNivel: S2610C.PLANTAS[idNivel] };
      })
    },
    torres: torres,
    representacoes: representacoes,
    componentes: componentes,
    regras: {
      geometriaIndependentePorNivel: true,
      publicarPeloEditor: false,
      excluirPeloEditor: false,
      offlineNestaEtapa: false
    }
  };
}

function diagnosticoTorresEditorS2610C() {
  exigirPermissaoS14_('administrar');

  const ss = SpreadsheetApp.getActive();
  const checks = [];
  const add = function (nome, ok, detalhe, bloqueante) {
    checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || ''), bloqueante: bloqueante !== false });
  };

  const cfg = (typeof s2610BConfigObj_ === 'function') ? s2610BConfigObj_(ss) : {};
  const funcs = {
    appCarregarEditorTorresS2610C: typeof appCarregarEditorTorresS2610C === 'function',
    appSalvarTorreS2610B: typeof appSalvarTorreS2610B === 'function',
    appSalvarRepresentacaoTorreS2610B: typeof appSalvarRepresentacaoTorreS2610B === 'function',
    appSalvarComponenteTorreS2610B: typeof appSalvarComponenteTorreS2610B === 'function',
    appObterImagemNivelS241: typeof appObterImagemNivelS241 === 'function'
  };
  Object.keys(funcs).forEach(function (fn) {
    add('S2610C_API_' + fn, funcs[fn], fn);
  });

  add('S2610C_ABA_TORRES', !!ss.getSheetByName('CARTOGRAFIA_TORRES'), 'CARTOGRAFIA_TORRES');
  add('S2610C_ABA_REPRESENTACOES', !!ss.getSheetByName('CARTOGRAFIA_TORRE_REPRESENTACOES'), 'CARTOGRAFIA_TORRE_REPRESENTACOES');
  add('S2610C_ABA_COMPONENTES', !!ss.getSheetByName('CARTOGRAFIA_TORRE_COMPONENTES'), 'CARTOGRAFIA_TORRE_COMPONENTES');
  add('S2610C_CONFIG_NAO_PROMOVIDA', String(cfg.APP_FASE || '') !== 'S26.10', String(cfg.APP_VERSAO || '') + ' / ' + String(cfg.APP_FASE || ''));

  let dados = null;
  try {
    dados = appCarregarEditorTorresS2610C();
    add('S2610C_CARGA_EDITOR', true,
      'torres=' + dados.torres.length + '; representacoes=' + dados.representacoes.length + '; componentes=' + dados.componentes.length);
  } catch (e) {
    add('S2610C_CARGA_EDITOR', false, e && e.message ? e.message : String(e));
  }

  if (dados) {
    const pares = new Set();
    let duplicados = 0;
    dados.representacoes.forEach(function (r) {
      const k = String(r.idTorre || '') + '|' + String(r.idNivel || '');
      if (pares.has(k)) duplicados++;
      pares.add(k);
    });
    add('S2610C_REP_UNICA_POR_TORRE_NIVEL', duplicados === 0, duplicados + ' duplicidade(s)');

    const idsTorres = new Set(dados.torres.map(function (t) { return String(t.idTorre || ''); }));
    const orfas = dados.representacoes.filter(function (r) { return !idsTorres.has(String(r.idTorre || '')); });
    add('S2610C_REP_SEM_ORFAS', orfas.length === 0, orfas.length + ' órfã(s)');

    const niveisInvalidos = dados.representacoes.filter(function (r) {
      const t = dados.torres.find(function (x) { return String(x.idTorre || '') === String(r.idTorre || ''); });
      return !t || !Array.isArray(t.niveisAtendidos) || !t.niveisAtendidos.includes(String(r.idNivel || ''));
    });
    add('S2610C_REP_NIVEL_DECLARADO', niveisInvalidos.length === 0, niveisInvalidos.length + ' inconsistência(s)');
  }

  const falhos = checks.filter(function (c) { return !c.ok; });
  const bloqueantes = falhos.filter(function (c) { return c.bloqueante; });
  return {
    ok: bloqueantes.length === 0,
    gate: bloqueantes.length === 0 ? 'APTO_PARA_TESTE_UI' : 'BLOQUEADO',
    fase: S2610C.FASE,
    checks: checks,
    falhas: falhos.length,
    falhasBloqueantes: bloqueantes.length
  };
}

function mostrarDiagnosticoTorresEditorS2610C() {
  const r = diagnosticoTorresEditorS2610C();
  console.log('[S26.10-C][RESULTADO] ' + JSON.stringify(r));
  r.checks.filter(function (c) { return !c.ok; }).forEach(function (c) {
    console.warn('[S26.10-C][FALHA] ' + c.nome + ' — ' + c.detalhe);
  });
  console.log('[S26.10-C][ENCERRADO] gate=' + r.gate + '; falhasBloqueantes=' + r.falhasBloqueantes);
  return r;
}
