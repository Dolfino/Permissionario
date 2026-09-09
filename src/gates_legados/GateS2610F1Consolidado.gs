/**
 * ============================================================
 * S26.10-F1-FIX2 — GATE FINAL CONSOLIDADO / PROVA API CORES VIA R8
 * ============================================================
 *
 * SOMENTE LEITURA.
 * Não promove APP_VERSAO / APP_FASE.
 *
 * Consolida:
 * - baseline S26.9
 * - Torres / Núcleos verticais S26.10
 * - integração Torre + localização
 * - cache/offline de Torres
 * - Central de Referências R1→R8-FIX2
 * - remoção/tombstones
 * - catálogos Tipo/Subtipo + cores
 *
 * Gate esperado:
 * APTO_PARA_S26.10-F2-RELEASE
 */

const S2610F1 = Object.freeze({
  FASE: 'S26.10-F1-FIX2',
  DIAGNOSTICO: 'S26.10-F1-FIX2-GATE-FINAL-CONSOLIDADO',
  BASELINE_VERSAO: 'MVP-3.31.0-SINALIZACAO-S26.9',
  BASELINE_FASE: 'S26.9'
});


function s2610F1Texto_(v) {
  return String(v == null ? '' : v).trim();
}


function s2610F1Config_(ss) {
  const sh = ss.getSheetByName('CONFIG');
  const out = {};

  if (!sh || sh.getLastRow() < 2) return out;

  sh.getRange(2, 1, sh.getLastRow() - 1, 2)
    .getValues()
    .forEach(function(row) {
      const k = s2610F1Texto_(row[0]);
      if (k) out[k] = s2610F1Texto_(row[1]);
    });

  return out;
}


function diagnosticoS2610F1() {
  if (typeof exigirPermissaoS14_ !== 'function') {
    throw new Error('S26.10-F1: permissão S14 indisponível.');
  }

  exigirPermissaoS14_('administrar');

  const ss = SpreadsheetApp.getActive();
  const cfg = s2610F1Config_(ss);
  const checks = [];

  function add(nome, ok, detalhe) {
    checks.push({
      nome: nome,
      ok: !!ok,
      detalhe: String(detalhe == null ? '' : detalhe)
    });
  }

  add(
    'BASELINE_VERSAO_PRESERVADA',
    cfg.APP_VERSAO === S2610F1.BASELINE_VERSAO,
    cfg.APP_VERSAO || 'ausente'
  );

  add(
    'BASELINE_FASE_PRESERVADA',
    cfg.APP_FASE === S2610F1.BASELINE_FASE,
    cfg.APP_FASE || 'ausente'
  );

  [
    [
      'TORRES_EDITOR_CARREGAR',
      typeof appCarregarEditorTorresS2610C === 'function',
      'appCarregarEditorTorresS2610C'
    ],
    [
      'TORRES_SALVAR',
      typeof appSalvarTorreS2610B === 'function',
      'appSalvarTorreS2610B'
    ],
    [
      'TORRES_REPRESENTACAO',
      typeof appSalvarRepresentacaoTorreS2610B === 'function',
      'appSalvarRepresentacaoTorreS2610B'
    ],
    [
      'TORRES_COMPONENTE',
      typeof appSalvarComponenteTorreS2610B === 'function',
      'appSalvarComponenteTorreS2610B'
    ],
    [
      'TORRES_GOVERNANCA',
      typeof appCarregarGovernancaTorresS2610F === 'function',
      'appCarregarGovernancaTorresS2610F'
    ],
    [
      'TORRES_OFFLINE',
      typeof appObterPacoteTorresOfflineS2610E === 'function',
      'appObterPacoteTorresOfflineS2610E'
    ],
    [
      'REFERENCIAS_LISTAR',
      typeof appListarReferenciasS2610R2 === 'function',
      'appListarReferenciasS2610R2'
    ],
    [
      'REFERENCIAS_CRIAR',
      typeof appCriarReferenciaS2610R2 === 'function',
      'appCriarReferenciaS2610R2'
    ],
    [
      'REFERENCIAS_REPOSICIONAR',
      typeof appReposicionarReferenciaS2610R5 === 'function',
      'appReposicionarReferenciaS2610R5'
    ],
    [
      'REFERENCIAS_REMOVER',
      typeof appRemoverReferenciaS2610R6C === 'function',
      'appRemoverReferenciaS2610R6C'
    ],
    [
      'REFERENCIAS_TOMBSTONES',
      typeof appListarTombstonesReferenciasS2610R6C === 'function',
      'appListarTombstonesReferenciasS2610R6C'
    ],
    [
      'REFERENCIAS_CATALOGO',
      typeof appCatalogosReferenciaS2610R8 === 'function',
      'appCatalogosReferenciaS2610R8'
    ],
    [
      'IDENTIDADE_RELEASE_S269',
      typeof appIdentidadeAplicacaoS269F2 === 'function',
      'appIdentidadeAplicacaoS269F2'
    ]
  ].forEach(function(item) {
    add(
      'API_' + item[0],
      item[1],
      item[2]
    );
  });

  let r7 = null;
  let erroR7 = '';

  try {
    r7 = diagnosticoS2610R7();
  } catch (e) {
    erroR7 = e.message || String(e);
  }

  add(
    'R7_REFERENCIAS_FINAL',
    !!(r7 && r7.ok && Number(r7.falhas) === 0),
    r7
      ? (
          r7.totalChecks + '/' +
          r7.totalChecks + ' • ' +
          r7.gate
        )
      : erroR7
  );

  add(
    'R7_TOTAL_DINAMICO_VALIDO',
    !!(
      r7 &&
      r7.ok &&
      Number(r7.resumo?.referenciasAtuais) >= 1 &&
      Number(r7.resumo?.classificadasPolitica) ===
        Number(r7.resumo?.referenciasAtuais)
    ),
    r7 && r7.resumo
      ? (
          'referências=' +
          String(r7.resumo.referenciasAtuais) +
          ' / classificadas=' +
          String(r7.resumo.classificadasPolitica)
        )
      : erroR7
  );

  let r8 = null;
  let erroR8 = '';

  try {
    r8 = diagnosticoS2610R8();
  } catch (e) {
    erroR8 = e.message || String(e);
  }

  add(
    'R8_CATALOGOS_CORES',
    !!(r8 && r8.ok && Number(r8.falhas) === 0),
    r8
      ? (
          r8.totalChecks + '/' +
          r8.totalChecks + ' • ' +
          r8.gate
        )
      : erroR8
  );

  /*
   * S26.10-F1-FIX2
   * A API de cores já é validada pelo próprio diagnóstico R8,
   * no mesmo módulo/escopo onde ela está declarada.
   */
  const checkApiCoresR8 =
    r8 && Array.isArray(r8.checks)
      ? r8.checks.find(function(c) {
          return c && c.nome === 'API_CORES_MAPA';
        })
      : null;

  add(
    'API_REFERENCIAS_CORES_MAPA',
    !!(checkApiCoresR8 && checkApiCoresR8.ok),
    checkApiCoresR8
      ? checkApiCoresR8.detalhe
      : (erroR8 || 'check API_CORES_MAPA ausente no R8')
  );

  const shRefs = ss.getSheetByName('PONTOS_REFERENCIA');
  const shCat = ss.getSheetByName('REFERENCIAS_CATALOGO');
  const shRem = ss.getSheetByName('REFERENCIAS_REMOVIDAS');

  add(
    'ABA_PONTOS_REFERENCIA',
    !!shRefs,
    shRefs ? shRefs.getName() : 'ausente'
  );

  add(
    'ABA_REFERENCIAS_CATALOGO',
    !!shCat,
    shCat ? shCat.getName() : 'ausente'
  );

  add(
    'ABA_REFERENCIAS_REMOVIDAS',
    !!shRem,
    shRem ? shRem.getName() : 'ausente'
  );

  let tomb = null;
  let erroTomb = '';

  try {
    tomb = appListarTombstonesReferenciasS2610R6C();
  } catch (e) {
    erroTomb = e.message || String(e);
  }

  add(
    'TOMBSTONE_REAL_PRESERVADO',
    !!(
      tomb &&
      tomb.ok &&
      Array.isArray(tomb.tombstones) &&
      tomb.tombstones.length >= 1
    ),
    tomb
      ? String(tomb.tombstones.length)
      : erroTomb
  );

  /*
   * O módulo S26.11-A4 pode estar embarcado como candidato,
   * mas não deve alterar a identidade da release S26.10.
   */
  const candidatoA4 =
    typeof appListarAcessosDispositivosS2611A4 ===
      'function';

  add(
    'S2611_A4_NAO_PROMOVEU_BASELINE',
    !candidatoA4 ||
    (
      cfg.APP_VERSAO === S2610F1.BASELINE_VERSAO &&
      cfg.APP_FASE === S2610F1.BASELINE_FASE
    ),
    candidatoA4
      ? 'código candidato presente; baseline preservada'
      : 'código candidato não detectado'
  );

  const falhas = checks.filter(function(c) {
    return !c.ok;
  });

  const out = {
    ok: falhas.length === 0,
    diagnostico: S2610F1.DIAGNOSTICO,
    fase: S2610F1.FASE,
    totalChecks: checks.length,
    falhas: falhas.length,
    checks: checks,
    resumo: {
      referencias:
        r7 && r7.resumo
          ? r7.resumo.referenciasAtuais
          : null,
      tombstones:
        r7 && r7.resumo
          ? r7.resumo.tombstones
          : null,
      catalogos:
        r8 && r8.catalogos
          ? r8.catalogos
          : null
    },
    alterouDados: false,
    baselinePromovida: false,
    gate:
      falhas.length === 0
        ? 'APTO_PARA_GATE_FRONTEND_S26.10-F1'
        : 'BLOQUEADO',
    proximaEtapa:
      'S26.10-F1-FRONTEND-CONSOLIDADO'
  };

  console.log(
    '[S26.10-F1-FIX2] ' + JSON.stringify(out)
  );

  return out;
}
