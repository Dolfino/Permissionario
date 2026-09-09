/**
 * S26.10-E1 — Compatibilidade de contratos públicos S26.9-F2.
 *
 * MOTIVO:
 * O frontend S26.9-F2 chama duas APIs públicas que não existem no backend
 * recebido/deployado:
 *   - appIdentidadeAplicacaoS269F2()
 *   - appCatalogosDominioSnapshotS269F2()
 *
 * Esta correção é ADITIVA e SOMENTE LEITURA.
 * Não altera CONFIG, catálogos, registros, cartografia, offline, versão ou fase.
 */

function appIdentidadeAplicacaoS269F2() {
  var ss = null;

  if (typeof obterPlanilhaS269F2_ === 'function') {
    ss = obterPlanilhaS269F2_();
  } else if (
    typeof ConfigService !== 'undefined' &&
    ConfigService &&
    typeof ConfigService.obterPlanilha === 'function'
  ) {
    ss = ConfigService.obterPlanilha();
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    throw new Error('Não foi possível resolver a planilha da aplicação.');
  }

  var aba = ss.getSheetByName('CONFIG');
  if (!aba) {
    throw new Error('Aba CONFIG não encontrada.');
  }

  var cfg = {};
  if (typeof lerConfigS269F2_ === 'function') {
    cfg = lerConfigS269F2_(aba) || {};
  } else {
    var lastRow = Math.max(aba.getLastRow(), 1);
    var valores = aba.getRange(1, 1, lastRow, Math.min(Math.max(aba.getLastColumn(), 2), 3)).getValues();
    for (var i = 1; i < valores.length; i++) {
      var chave = String(valores[i][0] || '').trim();
      if (!chave) continue;
      cfg[chave] = String(valores[i][1] == null ? '' : valores[i][1]).trim();
    }
  }

  return {
    ok: true,
    contrato: 'IDENTIDADE_APLICACAO_S26_9_F2',
    faseContrato: 'S26.9-F2',
    app: {
      versao: String(cfg.APP_VERSAO || ''),
      fase: String(cfg.APP_FASE || '')
    },
    geradoEm: new Date().toISOString()
  };
}

function appCatalogosDominioSnapshotS269F2() {
  if (typeof appCatalogosDominioSnapshot !== 'function') {
    throw new Error('Dependência ausente: appCatalogosDominioSnapshot().');
  }
  return appCatalogosDominioSnapshot();
}

function diagnosticoCompatibilidadeS269F2S2610E() {
  var checks = [];
  function add(nome, ok, detalhe, bloqueante) {
    checks.push({
      nome: String(nome),
      ok: !!ok,
      detalhe: detalhe == null ? '' : String(detalhe),
      bloqueante: bloqueante !== false
    });
  }

  add(
    'S269F2_COMPAT_API_IDENTIDADE',
    typeof appIdentidadeAplicacaoS269F2 === 'function',
    'appIdentidadeAplicacaoS269F2',
    true
  );
  add(
    'S269F2_COMPAT_API_SNAPSHOT',
    typeof appCatalogosDominioSnapshotS269F2 === 'function',
    'appCatalogosDominioSnapshotS269F2',
    true
  );
  add(
    'S269F2_COMPAT_DEP_SNAPSHOT_ORIGINAL',
    typeof appCatalogosDominioSnapshot === 'function',
    'appCatalogosDominioSnapshot',
    true
  );

  var identidade = null;
  var erroIdentidade = '';
  try {
    identidade = appIdentidadeAplicacaoS269F2();
  } catch (e) {
    erroIdentidade = e && e.message ? e.message : String(e);
  }

  add(
    'S269F2_COMPAT_IDENTIDADE_LEGIVEL',
    !!identidade && identidade.ok === true && !erroIdentidade,
    erroIdentidade || JSON.stringify(identidade && identidade.app || {}),
    true
  );
  add(
    'S269F2_COMPAT_IDENTIDADE_RELEASE_ATUAL',
    !!identidade &&
      identidade.ok === true &&
      String(identidade.app && identidade.app.versao || '') === 'MVP-3.31.0-SINALIZACAO-S26.9' &&
      String(identidade.app && identidade.app.fase || '') === 'S26.9',
    identidade ? String(identidade.app && identidade.app.versao || '') + ' / ' + String(identidade.app && identidade.app.fase || '') : erroIdentidade,
    true
  );

  var snapshot = null;
  var erroSnapshot = '';
  try {
    snapshot = appCatalogosDominioSnapshotS269F2();
  } catch (e2) {
    erroSnapshot = e2 && e2.message ? e2.message : String(e2);
  }

  add(
    'S269F2_COMPAT_SNAPSHOT_LEGIVEL',
    !!snapshot && snapshot.ok === true && Array.isArray(snapshot.catalogos) && !erroSnapshot,
    erroSnapshot || ('catalogos=' + (snapshot && Array.isArray(snapshot.catalogos) ? snapshot.catalogos.length : 0)),
    true
  );
  add(
    'S269F2_COMPAT_SNAPSHOT_REVISAO',
    !!snapshot && typeof snapshot.revisaoGlobal === 'string' && snapshot.revisaoGlobal.length > 0,
    snapshot ? String(snapshot.revisaoGlobal || '') : erroSnapshot,
    true
  );

  var falhos = checks.filter(function (c) { return c.bloqueante && !c.ok; });
  var resultado = {
    ok: falhos.length === 0,
    gate: falhos.length === 0 ? 'APTO_PARA_RETESTE_FRONTEND' : 'BLOQUEADO',
    fase: 'S26.10-E1',
    escopo: 'COMPATIBILIDADE_S26.9_F2',
    checks: checks,
    falhas: checks.filter(function (c) { return !c.ok; }).length,
    falhasBloqueantes: falhos.length
  };

  console.info('[S26.10-E1][COMPAT-S269F2]', JSON.stringify(resultado));
  return resultado;
}

function mostrarDiagnosticoCompatibilidadeS269F2S2610E() {
  var r = diagnosticoCompatibilidadeS269F2S2610E();
  console.info('[S26.10-E1][ENCERRADO] gate=' + r.gate + '; falhasBloqueantes=' + r.falhasBloqueantes);
  return r;
}
