/**
 * ============================================================
 * S26.10-F2 — PROMOÇÃO OFICIAL DA RELEASE
 * ============================================================
 *
 * Release:
 *   MVP-3.32.0-SINALIZACAO-S26.10
 *
 * Rollback:
 *   MVP-3.31.0-SINALIZACAO-S26.9
 *
 * Fluxo:
 * 1. diagnosticoPrePromocaoS2610F2()
 * 2. promoverS2610F2('PROMOVER_MVP_3_32_0_S26_10')
 * 3. nova implantação/reload
 * 4. diagnosticoS2610F2()
 * 5. frontend: await diagnosticoVisualS2610F2()
 *
 * A promoção altera SOMENTE CONFIG.APP_VERSAO e CONFIG.APP_FASE.
 */

const S2610F2 = Object.freeze({
  FASE: 'S26.10-F2',
  RELEASE: 'MVP-3.32.0-SINALIZACAO-S26.10',
  APP_FASE: 'S26.10',
  ROLLBACK: 'MVP-3.31.0-SINALIZACAO-S26.9',
  ROLLBACK_FASE: 'S26.9',
  CONFIRMACAO:
    'PROMOVER_MVP_3_32_0_S26_10',
  CONFIRMACAO_ROLLBACK:
    'ROLLBACK_MVP_3_31_0_S26_9',
  PROP_SNAPSHOT:
    'S2610_F2_ROLLBACK_SNAPSHOT'
});


function s2610F2Texto_(v) {
  return String(v == null ? '' : v).trim();
}


function s2610F2Config_(ss) {
  const sh = ss.getSheetByName('CONFIG');
  if (!sh) {
    throw new Error(
      'S26.10-F2: aba CONFIG não encontrada.'
    );
  }

  const out = {};

  if (sh.getLastRow() >= 2) {
    sh.getRange(
      2,
      1,
      sh.getLastRow() - 1,
      2
    )
      .getValues()
      .forEach(function(row) {
        const k =
          s2610F2Texto_(row[0]);

        if (k) {
          out[k] =
            s2610F2Texto_(row[1]);
        }
      });
  }

  return out;
}


function s2610F2SetConfig_(
  ss,
  valores
) {
  const sh =
    ss.getSheetByName('CONFIG');

  if (!sh) {
    throw new Error(
      'S26.10-F2: aba CONFIG não encontrada.'
    );
  }

  const last =
    Math.max(1, sh.getLastRow());

  const rows =
    last >= 2
      ? sh.getRange(
          2,
          1,
          last - 1,
          2
        ).getValues()
      : [];

  const idx = {};

  rows.forEach(function(row, i) {
    const k =
      s2610F2Texto_(row[0]);

    if (k) {
      idx[k] = i + 2;
    }
  });

  Object.keys(valores).forEach(
    function(k) {
      const valor =
        valores[k];

      if (idx[k]) {
        sh.getRange(
          idx[k],
          2
        ).setValue(valor);
      } else {
        sh.appendRow([
          k,
          valor
        ]);
      }
    }
  );
}


function diagnosticoPrePromocaoS2610F2() {
  exigirPermissaoS14_('administrar');

  const ss =
    SpreadsheetApp.getActive();

  const cfg =
    s2610F2Config_(ss);

  const checks = [];

  function add(nome, ok, detalhe) {
    checks.push({
      nome: nome,
      ok: !!ok,
      detalhe:
        String(
          detalhe == null
            ? ''
            : detalhe
        )
    });
  }

  add(
    'BASELINE_VERSAO_S269',
    cfg.APP_VERSAO ===
      S2610F2.ROLLBACK,
    cfg.APP_VERSAO || 'ausente'
  );

  add(
    'BASELINE_FASE_S269',
    cfg.APP_FASE ===
      S2610F2.ROLLBACK_FASE,
    cfg.APP_FASE || 'ausente'
  );

  let f1 = null;
  let erroF1 = '';

  try {
    f1 =
      diagnosticoS2610F1();
  } catch (e) {
    erroF1 =
      e && e.message
        ? e.message
        : String(e);
  }

  add(
    'GATE_F1_BACKEND',
    !!(
      f1 &&
      f1.ok &&
      Number(f1.falhas) === 0 &&
      f1.gate ===
        'APTO_PARA_GATE_FRONTEND_S26.10-F1'
    ),
    f1
      ? (
          f1.totalChecks +
          '/' +
          f1.totalChecks +
          ' • ' +
          f1.gate
        )
      : erroF1
  );

  let r8 = null;
  let erroR8 = '';

  try {
    r8 =
      diagnosticoS2610R8();
  } catch (e) {
    erroR8 =
      e && e.message
        ? e.message
        : String(e);
  }

  add(
    'GATE_R8_FIX5',
    !!(
      r8 &&
      r8.ok &&
      Number(r8.falhas) === 0
    ),
    r8
      ? (
          r8.totalChecks +
          '/' +
          r8.totalChecks +
          ' • ' +
          r8.gate
        )
      : erroR8
  );

  const falhas =
    checks.filter(function(c) {
      return !c.ok;
    });

  const out = {
    ok: falhas.length === 0,
    fase: S2610F2.FASE,
    diagnostico:
      'S26.10-F2-PRE-PROMOCAO',
    totalChecks:
      checks.length,
    falhas:
      falhas.length,
    checks: checks,
    alterouDados: false,
    gate:
      falhas.length === 0
        ? 'APTO_PARA_PROMOVER_S26.10'
        : 'BLOQUEADO'
  };

  console.log(
    '[S26.10-F2][PRE] ' +
    JSON.stringify(out)
  );

  return out;
}


function executarPromocaoS2610F2() {
  return promoverS2610F2(S2610F2.CONFIRMACAO);
}


function executarRollbackS2610F2() {
  return rollbackS2610F2(S2610F2.CONFIRMACAO_ROLLBACK);
}


function promoverS2610F2(confirmacao) {
  exigirPermissaoS14_('administrar');

  if (
    confirmacao !== undefined &&
    confirmacao !== null &&
    s2610F2Texto_(confirmacao) !== '' &&
    s2610F2Texto_(confirmacao) !== S2610F2.CONFIRMACAO
  ) {
    throw new Error(
      'Confirmação inválida. Use exatamente: ' +
      S2610F2.CONFIRMACAO
    );
  }

  const lock =
    LockService.getDocumentLock();

  if (!lock.tryLock(30000)) {
    throw new Error(
      'S26.10-F2: não foi possível obter lock da planilha.'
    );
  }

  const ss =
    SpreadsheetApp.getActive();

  try {
    const cfg =
      s2610F2Config_(ss);

    if (
      cfg.APP_VERSAO ===
        S2610F2.RELEASE &&
      cfg.APP_FASE ===
        S2610F2.APP_FASE
    ) {
      return {
        ok: true,
        fase: S2610F2.FASE,
        idempotente: true,
        alterouDados: false,
        release: {
          appVersao:
            S2610F2.RELEASE,
          appFase:
            S2610F2.APP_FASE,
          rollback:
            S2610F2.ROLLBACK
        },
        gate:
          'PROMOCAO_JA_APLICADA'
      };
    }

    const pre =
      diagnosticoPrePromocaoS2610F2();

    if (!pre.ok) {
      throw new Error(
        'S26.10-F2 bloqueado pelo Gate pré-promoção.'
      );
    }

    const snapshot = {
      salvoEm:
        new Date().toISOString(),
      appVersao:
        cfg.APP_VERSAO || '',
      appFase:
        cfg.APP_FASE || '',
      destinoVersao:
        S2610F2.RELEASE,
      destinoFase:
        S2610F2.APP_FASE
    };

    PropertiesService
      .getScriptProperties()
      .setProperty(
        S2610F2.PROP_SNAPSHOT,
        JSON.stringify(snapshot)
      );

    try {
      s2610F2SetConfig_(
        ss,
        {
          APP_VERSAO:
            S2610F2.RELEASE,
          APP_FASE:
            S2610F2.APP_FASE
        }
      );

      SpreadsheetApp.flush();

      const depois =
        s2610F2Config_(ss);

      if (
        depois.APP_VERSAO !==
          S2610F2.RELEASE ||
        depois.APP_FASE !==
          S2610F2.APP_FASE
      ) {
        throw new Error(
          'Verificação pós-escrita da CONFIG falhou.'
        );
      }

      const out = {
        ok: true,
        fase: S2610F2.FASE,
        alterouDados: true,
        release: {
          appVersao:
            depois.APP_VERSAO,
          appFase:
            depois.APP_FASE,
          rollback:
            S2610F2.ROLLBACK
        },
        snapshotRollback:
          snapshot,
        gate:
          'PROMOCAO_CONCLUIDA_RECARREGAR_WEBAPP',
        proximaEtapa:
          'DIAGNOSTICO_POS_PROMOCAO_S26.10-F2'
      };

      console.log(
        '[S26.10-F2][PROMOCAO] ' +
        JSON.stringify(out)
      );

      return out;

    } catch (e) {
      /*
       * Rollback automático somente se a promoção
       * falhar no meio da escrita/verificação.
       */
      s2610F2SetConfig_(
        ss,
        {
          APP_VERSAO:
            snapshot.appVersao,
          APP_FASE:
            snapshot.appFase
        }
      );

      SpreadsheetApp.flush();

      throw new Error(
        'Promoção S26.10 falhou e a CONFIG foi restaurada: ' +
        (
          e && e.message
            ? e.message
            : String(e)
        )
      );
    }

  } finally {
    lock.releaseLock();
  }
}


function diagnosticoS2610F2() {
  exigirPermissaoS14_('administrar');

  const ss =
    SpreadsheetApp.getActive();

  const cfg =
    s2610F2Config_(ss);

  const checks = [];

  function add(nome, ok, detalhe) {
    checks.push({
      nome: nome,
      ok: !!ok,
      detalhe:
        String(
          detalhe == null
            ? ''
            : detalhe
        )
    });
  }

  add(
    'CONFIG_APP_VERSAO_S2610',
    cfg.APP_VERSAO ===
      S2610F2.RELEASE,
    cfg.APP_VERSAO || 'ausente'
  );

  add(
    'CONFIG_APP_FASE_S2610',
    cfg.APP_FASE ===
      S2610F2.APP_FASE,
    cfg.APP_FASE || 'ausente'
  );

  add(
    'RUNTIME_APP_VERSAO_S2610',
    typeof APP !== 'undefined' &&
      APP.VERSAO === S2610F2.RELEASE,
    typeof APP !== 'undefined'
      ? APP.VERSAO
      : 'APP ausente'
  );

  add(
    'RUNTIME_APP_FASE_S2610',
    typeof APP !== 'undefined' &&
      APP.FASE === S2610F2.APP_FASE,
    typeof APP !== 'undefined'
      ? APP.FASE
      : 'APP ausente'
  );

  let erroCompatibilidade = '';

  try {
    s2610ValidarOperacao_(
      cfg,
      'S26.10-F2 pós-promoção'
    );
  } catch (e) {
    erroCompatibilidade =
      e && e.message
        ? e.message
        : String(e);
  }

  add(
    'ESTADO_OPERACIONAL_RUNTIME_CONFIG',
    !erroCompatibilidade,
    erroCompatibilidade || 'S26.10 consistente'
  );

  [
    [
      'TORRES_EDITOR',
      typeof appCarregarEditorTorresS2610C ===
        'function'
    ],
    [
      'TORRES_OFFLINE',
      typeof appObterPacoteTorresOfflineS2610E ===
        'function'
    ],
    [
      'REFERENCIAS_LISTAR',
      typeof appListarReferenciasS2610R2 ===
        'function'
    ],
    [
      'REFERENCIAS_REMOVER',
      typeof appRemoverReferenciaS2610R6C ===
        'function'
    ],
    [
      'REFERENCIAS_CATALOGO',
      typeof appCatalogosReferenciaS2610R8 ===
        'function'
    ],
    [
      'IDENTIDADE_CONFIG',
      typeof appIdentidadeAplicacaoS269F2 ===
        'function'
    ]
  ].forEach(function(item) {
    add(
      'API_' + item[0],
      item[1],
      item[0]
    );
  });

  let referencias = null;
  let erroReferencias = '';

  try {
    referencias =
      appListarReferenciasS2610R2({
        status: 'TODAS'
      });
  } catch (e) {
    erroReferencias =
      e && e.message
        ? e.message
        : String(e);
  }

  add(
    'SMOKE_REFERENCIAS_LISTAR',
    !!(
      referencias &&
      referencias.ok === true &&
      Array.isArray(referencias.referencias)
    ),
    erroReferencias ||
      (
        'total=' +
        String(referencias ? referencias.total : 0)
      )
  );

  let tombstones = null;
  let erroTombstones = '';

  try {
    tombstones =
      appListarTombstonesReferenciasS2610R6C();
  } catch (e) {
    erroTombstones =
      e && e.message
        ? e.message
        : String(e);
  }

  add(
    'SMOKE_REFERENCIAS_TOMBSTONES',
    !!(
      tombstones &&
      tombstones.ok === true &&
      Array.isArray(tombstones.tombstones)
    ),
    erroTombstones ||
      (
        'total=' +
        String(
          tombstones && Array.isArray(tombstones.tombstones)
            ? tombstones.tombstones.length
            : 0
        )
      )
  );

  let catalogosReferencia = null;
  let erroCatalogosReferencia = '';

  try {
    catalogosReferencia =
      appCatalogosReferenciaS2610R8({
        incluirInativos: false
      });
  } catch (e) {
    erroCatalogosReferencia =
      e && e.message
        ? e.message
        : String(e);
  }

  add(
    'SMOKE_REFERENCIAS_CATALOGO',
    !!(
      catalogosReferencia &&
      catalogosReferencia.ok === true &&
      Array.isArray(catalogosReferencia.tipos) &&
      Array.isArray(catalogosReferencia.subtipos)
    ),
    erroCatalogosReferencia ||
      (
        'tipos=' +
        String(
          catalogosReferencia && catalogosReferencia.tipos
            ? catalogosReferencia.tipos.length
            : 0
        ) +
        ' / subtipos=' +
        String(
          catalogosReferencia && catalogosReferencia.subtipos
            ? catalogosReferencia.subtipos.length
            : 0
        )
      )
  );

  let catalogosDominio = null;
  let erroCatalogosDominio = '';

  try {
    catalogosDominio =
      appCatalogosDominioSnapshotS269F2();
  } catch (e) {
    erroCatalogosDominio =
      e && e.message
        ? e.message
        : String(e);
  }

  add(
    'SMOKE_CATALOGOS_DOMINIO_SNAPSHOT',
    !!(
      catalogosDominio &&
      catalogosDominio.ok === true &&
      Array.isArray(catalogosDominio.catalogos)
    ),
    erroCatalogosDominio ||
      (
        'catalogos=' +
        String(
          catalogosDominio && catalogosDominio.catalogos
            ? catalogosDominio.catalogos.length
            : 0
        )
      )
  );

  const prop =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        S2610F2.PROP_SNAPSHOT
      );

  add(
    'SNAPSHOT_ROLLBACK_DISPONIVEL',
    !!prop,
    prop
      ? 'OK'
      : 'ausente'
  );

  const falhas =
    checks.filter(function(c) {
      return !c.ok;
    });

  const out = {
    ok: falhas.length === 0,
    fase: S2610F2.FASE,
    diagnostico:
      'S26.10-F2-POS-PROMOCAO',
    release: {
      appVersao:
        cfg.APP_VERSAO || '',
      appFase:
        cfg.APP_FASE || '',
      rollback:
        S2610F2.ROLLBACK
    },
    totalChecks:
      checks.length,
    falhas:
      falhas.length,
    checks: checks,
    gate:
      falhas.length === 0
        ? 'APTO_PARA_GATE_VISUAL_RELEASE_S26.10'
        : 'BLOQUEADO'
  };

  console.log(
    '[S26.10-F2][POS] ' +
    JSON.stringify(out)
  );

  return out;
}


function rollbackS2610F2(confirmacao) {
  exigirPermissaoS14_('administrar');

  if (
    confirmacao !== undefined &&
    confirmacao !== null &&
    s2610F2Texto_(confirmacao) !== '' &&
    s2610F2Texto_(confirmacao) !== S2610F2.CONFIRMACAO_ROLLBACK
  ) {
    throw new Error(
      'Confirmação inválida. Use exatamente: ' +
      S2610F2.CONFIRMACAO_ROLLBACK
    );
  }

  const lock =
    LockService.getDocumentLock();

  if (!lock.tryLock(30000)) {
    throw new Error(
      'S26.10-F2: não foi possível obter lock para rollback.'
    );
  }

  try {
    const ss =
      SpreadsheetApp.getActive();

    const cfg =
      s2610F2Config_(ss);

    if (
      cfg.APP_VERSAO ===
        S2610F2.ROLLBACK &&
      cfg.APP_FASE ===
        S2610F2.ROLLBACK_FASE
    ) {
      return {
        ok: true,
        idempotente: true,
        alterouDados: false,
        gate:
          'ROLLBACK_JA_APLICADO'
      };
    }

    if (
      cfg.APP_VERSAO !==
        S2610F2.RELEASE ||
      cfg.APP_FASE !==
        S2610F2.APP_FASE
    ) {
      throw new Error(
        'Rollback bloqueado: a CONFIG não está na release S26.10 esperada.'
      );
    }

    s2610F2SetConfig_(
      ss,
      {
        APP_VERSAO:
          S2610F2.ROLLBACK,
        APP_FASE:
          S2610F2.ROLLBACK_FASE
      }
    );

    SpreadsheetApp.flush();

    const depois =
      s2610F2Config_(ss);

    const ok =
      depois.APP_VERSAO ===
        S2610F2.ROLLBACK &&
      depois.APP_FASE ===
        S2610F2.ROLLBACK_FASE;

    if (!ok) {
      throw new Error(
        'Rollback não pôde ser verificado.'
      );
    }

    const out = {
      ok: true,
      fase: S2610F2.FASE,
      alterouDados: true,
      rollback: {
        appVersao:
          depois.APP_VERSAO,
        appFase:
          depois.APP_FASE
      },
      gate:
        'ROLLBACK_CONCLUIDO_RECARREGAR_WEBAPP'
    };

    console.log(
      '[S26.10-F2][ROLLBACK] ' +
      JSON.stringify(out)
    );

    return out;

  } finally {
    lock.releaseLock();
  }
}
