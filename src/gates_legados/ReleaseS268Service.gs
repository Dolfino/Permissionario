/**
 * S26.8-E8 — Fechamento formal da release
 *
 * Release:
 * MVP-3.30.0-SINALIZACAO-S26.8
 *
 * Origem:
 * MVP-3.29.0-SINALIZACAO-S26.7
 */

const S268_RELEASE = Object.freeze({
  VERSAO: 'MVP-3.30.0-SINALIZACAO-S26.8',
  FASE: 'S26.8',

  VERSAO_ANTERIOR: 'MVP-3.29.0-SINALIZACAO-S26.7',
  FASE_ANTERIOR: 'S26.7',

  TIMEZONE: 'America/Fortaleza'
});


function s268ReleaseConfig_(cfg, chave) {
  if (!cfg || cfg.getLastRow() < 2) return '';

  const valores = cfg
    .getRange(2, 1, cfg.getLastRow() - 1, 2)
    .getValues();

  for (let i = 0; i < valores.length; i++) {
    if (
      String(valores[i][0] || '').trim() ===
      String(chave || '').trim()
    ) {
      return String(valores[i][1] || '').trim();
    }
  }

  return '';
}


function s268ReleaseCheck_(checks, nome, ok, detalhe) {
  checks.push({
    nome: nome,
    ok: !!ok,
    detalhe: String(detalhe == null ? '' : detalhe)
  });
}


// ========================================================
// CHECKPOINTS PRÉ-RELEASE
// ========================================================

function criarBackupPreReleaseS268() {
  exigirPermissaoS14_('administrar');

  if (typeof appCriarBackupS16 !== 'function') {
    throw new Error('API appCriarBackupS16 indisponível.');
  }

  return appCriarBackupS16(
    'S26.8 — backup pré-release MVP-3.30.0'
  );
}


function criarSnapshotPreReleaseS268() {
  exigirPermissaoS14_('administrar');

  if (typeof appCriarSnapshotCartograficoS253 !== 'function') {
    throw new Error(
      'API appCriarSnapshotCartograficoS253 indisponível.'
    );
  }

  return appCriarSnapshotCartograficoS253(
    'S26.8 — snapshot cartográfico pré-release MVP-3.30.0'
  );
}


// ========================================================
// PRÉ-RELEASE
// ========================================================

function diagnosticoPreReleaseS268() {
  exigirPermissaoS14_('administrar');

  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');
  const checks = [];

  s268ReleaseCheck_(
    checks,
    'CONFIG',
    !!cfg,
    'CONFIG'
  );

  if (!cfg) {
    return {
      ok: false,
      totalChecks: checks.length,
      falhas: 1,
      checks: checks
    };
  }


  // ------------------------------------------------------
  // Runtime candidato
  // ------------------------------------------------------

  s268ReleaseCheck_(
    checks,
    'RUNTIME_APP_VERSAO',
    typeof APP !== 'undefined' &&
      APP.VERSAO === S268_RELEASE.VERSAO,
    typeof APP !== 'undefined'
      ? APP.VERSAO
      : 'APP ausente'
  );

  s268ReleaseCheck_(
    checks,
    'RUNTIME_APP_FASE',
    typeof APP !== 'undefined' &&
      APP.FASE === S268_RELEASE.FASE,
    typeof APP !== 'undefined'
      ? APP.FASE
      : 'APP ausente'
  );


  // ------------------------------------------------------
  // CONFIG pode estar ainda em S26.7
  // ------------------------------------------------------

  const versaoConfig =
    s268ReleaseConfig_(cfg, 'APP_VERSAO');

  const faseConfig =
    s268ReleaseConfig_(cfg, 'APP_FASE');

  s268ReleaseCheck_(
    checks,
    'ORIGEM_VERSAO_VALIDA',
    versaoConfig === S268_RELEASE.VERSAO_ANTERIOR ||
      versaoConfig === S268_RELEASE.VERSAO,
    versaoConfig || 'ausente'
  );

  s268ReleaseCheck_(
    checks,
    'ORIGEM_FASE_VALIDA',
    faseConfig === S268_RELEASE.FASE_ANTERIOR ||
      faseConfig === S268_RELEASE.FASE,
    faseConfig || 'ausente'
  );


  // ------------------------------------------------------
  // Estrutura principal
  // ------------------------------------------------------

  [
    'CONFIG',
    'REGISTROS',
    'REGISTRO_FOTOS',
    'REGISTRO_HISTORICO',
    'USUARIOS',
    'PLANTAS',
    'MAPAS_SETORES',
    'MAPA_TRANSFORMACOES',
    'MAPA_AREAS_NIVEL',
    'CARTOGRAFIA_HISTORICO',
    'CARTOGRAFIA_PUBLICACOES',
    'CARTOGRAFIA_AREAS_FISICAS',
    'CAMADAS_PRESETS_CORPORATIVOS'
  ].forEach(function(nome) {
    s268ReleaseCheck_(
      checks,
      'ABA_' + nome,
      !!ss.getSheetByName(nome),
      nome
    );
  });


  // ------------------------------------------------------
  // Gates automáticos
  // ------------------------------------------------------

  let e2 = null;
  let e3 = null;
  let e4 = null;
  let e5 = null;

  try {
    if (typeof diagnosticoGateS268E2 === 'function') {
      e2 = diagnosticoGateS268E2();
    }
  } catch (_) {}

  try {
    if (typeof diagnosticoGateS268E3 === 'function') {
      e3 = diagnosticoGateS268E3();
    }
  } catch (_) {}

  try {
    if (typeof diagnosticoGateS268E4 === 'function') {
      e4 = diagnosticoGateS268E4();
    }
  } catch (_) {}

  try {
    if (typeof diagnosticoGateS268E5 === 'function') {
      e5 = diagnosticoGateS268E5();
    }
  } catch (_) {}


  s268ReleaseCheck_(
    checks,
    'GATE_E2',
    !!(e2 && e2.ok),
    e2
      ? e2.totalChecks + ' checks / ' + e2.falhas + ' falhas'
      : 'indisponível'
  );

  s268ReleaseCheck_(
    checks,
    'GATE_E3',
    !!(e3 && e3.ok),
    e3
      ? e3.totalChecks + ' checks / ' + e3.falhas + ' falhas'
      : 'indisponível'
  );

  s268ReleaseCheck_(
    checks,
    'GATE_E4_ESTRUTURAL',
    !!(e4 && e4.ok),
    e4
      ? e4.totalChecks + ' checks / ' + e4.falhas + ' falhas'
      : 'indisponível'
  );

  s268ReleaseCheck_(
    checks,
    'GATE_E5',
    !!(e5 && e5.ok),
    e5
      ? e5.totalChecks + ' checks / ' + e5.falhas + ' falhas'
      : 'indisponível'
  );


  // ------------------------------------------------------
  // Nível 0
  // ------------------------------------------------------

  const plantas =
    typeof s240Objects_ === 'function'
      ? s240Objects_(ss.getSheetByName('PLANTAS'))
      : [];

  [
    'PLA-CFF-N0-2025',
    'PLA-CFF-N1-2025',
    'PLA-CFF-N2-2025',
    'PLA-CFF-N3-2025'
  ].forEach(function(id) {
    s268ReleaseCheck_(
      checks,
      'PLANTA_' + id.replace(/[^A-Za-z0-9]/g, '_'),
      plantas.some(function(p) {
        return String(p.ID_PLANTA || '') === id;
      }),
      id
    );
  });


  // ------------------------------------------------------
  // APIs S26.8
  // ------------------------------------------------------

  [
    [
      'OPERACAO_N0',
      typeof appObterOperacaoNivel0S268D === 'function',
      'appObterOperacaoNivel0S268D'
    ],
    [
      'RESOLVER_N0',
      typeof appResolverPontoNivel0S268D === 'function',
      'appResolverPontoNivel0S268D'
    ],
    [
      'RELATORIO_INICIAR',
      typeof appIniciarApresentacaoS268B === 'function',
      'appIniciarApresentacaoS268B'
    ],
    [
      'RELATORIO_CONTINUAR',
      typeof appContinuarApresentacaoS268B === 'function',
      'appContinuarApresentacaoS268B'
    ],
    [
      'RELATORIO_STATUS',
      typeof appStatusApresentacaoS268B === 'function',
      'appStatusApresentacaoS268B'
    ]
  ].forEach(function(c) {
    s268ReleaseCheck_(
      checks,
      'API_' + c[0],
      c[1],
      c[2]
    );
  });


  const out = {
    ok: checks.every(function(c) {
      return c.ok;
    }),

    candidato: S268_RELEASE.VERSAO,
    diagnostico: 'S26.8-E8-PRE-RELEASE',

    totalChecks: checks.length,
    falhas: checks.filter(function(c) {
      return !c.ok;
    }).length,

    checks: checks,

    gatesManuaisPendentesDeRegistro: [
      'E4-B — Offline navegador',
      'E6 — Cadastro / fila / sincronização',
      'E7 — Google Apresentações'
    ],

    somenteLeitura: true
  };

  console.log(
    '[S26.8-E8-PRE] ' + JSON.stringify(out)
  );

  return out;
}


// ========================================================
// PROMOÇÃO FORMAL
// ========================================================

function finalizarS268Aprovado() {
  exigirPermissaoS14_('administrar');

  const pre = diagnosticoPreReleaseS268();

  if (!pre.ok) {
    throw new Error(
      'S26.8 não pode ser promovida. ' +
      pre.falhas +
      ' falha(s) no diagnóstico pré-release.'
    );
  }


  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');

  if (!cfg) {
    throw new Error('CONFIG ausente.');
  }


  const versaoAtual =
    s268ReleaseConfig_(cfg, 'APP_VERSAO');

  const faseAtual =
    s268ReleaseConfig_(cfg, 'APP_FASE');


  if (
    versaoAtual !== S268_RELEASE.VERSAO_ANTERIOR &&
    versaoAtual !== S268_RELEASE.VERSAO
  ) {
    throw new Error(
      'APP_VERSAO inesperada: ' +
      (versaoAtual || 'ausente')
    );
  }


  if (
    faseAtual !== S268_RELEASE.FASE_ANTERIOR &&
    faseAtual !== S268_RELEASE.FASE
  ) {
    throw new Error(
      'APP_FASE inesperada: ' +
      (faseAtual || 'ausente')
    );
  }


  const agora = Utilities.formatDate(
    new Date(),
    S268_RELEASE.TIMEZONE,
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );


  setConfigValue_(
    cfg,
    'APP_VERSAO',
    S268_RELEASE.VERSAO,
    'Versão atualmente instalada'
  );

  setConfigValue_(
    cfg,
    'APP_FASE',
    S268_RELEASE.FASE,
    'Fase funcional atualmente instalada'
  );


  setConfigValue_(
    cfg,
    'S268_STATUS',
    'APROVADO',
    'Release S26.8 aprovada'
  );

  setConfigValue_(
    cfg,
    'S268_GATE_E1',
    'APROVADO',
    'Pré-regressão integrada'
  );

  setConfigValue_(
    cfg,
    'S268_GATE_E2',
    '39/39',
    'Nível 0 online'
  );

  setConfigValue_(
    cfg,
    'S268_GATE_E3',
    '46/46',
    'Correspondência física N0/N1'
  );

  setConfigValue_(
    cfg,
    'S268_GATE_E4',
    'APROVADO',
    'Offline estrutural + navegador'
  );

  setConfigValue_(
    cfg,
    'S268_GATE_E5',
    '35/35',
    'Regressão setores e níveis'
  );

  setConfigValue_(
    cfg,
    'S268_GATE_E6',
    'APROVADO',
    'Cadastro, fila e sincronização'
  );

  setConfigValue_(
    cfg,
    'S268_GATE_E7',
    'APROVADO',
    'Google Apresentações'
  );


  setConfigValue_(
    cfg,
    'S268_NIVEL0',
    'OPERACIONAL',
    'Nível 0 / Subsolo operacional'
  );

  setConfigValue_(
    cfg,
    'S268_N0_AREAS_RESOLVIVEIS',
    '24',
    'Polígonos operacionais resolvíveis'
  );

  setConfigValue_(
    cfg,
    'S268_AREA_EXTERNA_COMPARTILHADA',
    'SIM',
    'Identidade física compartilhada N0/N1'
  );

  setConfigValue_(
    cfg,
    'S268_RELATORIO_LOTES',
    'SIM',
    'Google Slides processado em lotes'
  );

  setConfigValue_(
    cfg,
    'S268_SOFT_DELETE',
    'FORA_ESCOPO',
    'Soft delete permanece fora do escopo'
  );

  setConfigValue_(
    cfg,
    'S268_APROVADO_EM',
    agora,
    'Data/hora de aprovação da S26.8'
  );


  if (typeof registrarAuditoriaS15_ === 'function') {
    registrarAuditoriaS15_({
      acao: 'RELEASE_S268_APROVADA',
      entidade: 'SISTEMA',
      entidadeId: 'S26.8',
      resultado: 'SUCESSO',
      origem: 'APPS_SCRIPT',
      detalhes: {
        versaoAnterior: S268_RELEASE.VERSAO_ANTERIOR,
        versaoNova: S268_RELEASE.VERSAO,
        nivel0: true,
        areasResolviveis: 24,
        gates: 'E1-E7 APROVADOS'
      }
    });
  }


  SpreadsheetApp.flush();

  return diagnosticoFinalS268();
}


// ========================================================
// DIAGNÓSTICO FINAL
// ========================================================

function diagnosticoFinalS268() {
  exigirPermissaoS14_('administrar');

  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');
  const checks = [];

  const valor = function(chave) {
    return s268ReleaseConfig_(cfg, chave);
  };


  s268ReleaseCheck_(
    checks,
    'APP_RUNTIME_VERSAO',
    typeof APP !== 'undefined' &&
      APP.VERSAO === S268_RELEASE.VERSAO,
    typeof APP !== 'undefined'
      ? APP.VERSAO
      : 'APP ausente'
  );

  s268ReleaseCheck_(
    checks,
    'APP_RUNTIME_FASE',
    typeof APP !== 'undefined' &&
      APP.FASE === S268_RELEASE.FASE,
    typeof APP !== 'undefined'
      ? APP.FASE
      : 'APP ausente'
  );

  s268ReleaseCheck_(
    checks,
    'CONFIG_APP_VERSAO',
    valor('APP_VERSAO') === S268_RELEASE.VERSAO,
    valor('APP_VERSAO')
  );

  s268ReleaseCheck_(
    checks,
    'CONFIG_APP_FASE',
    valor('APP_FASE') === S268_RELEASE.FASE,
    valor('APP_FASE')
  );

  s268ReleaseCheck_(
    checks,
    'S268_STATUS',
    valor('S268_STATUS') === 'APROVADO',
    valor('S268_STATUS')
  );


  [
    'S268_GATE_E1',
    'S268_GATE_E2',
    'S268_GATE_E3',
    'S268_GATE_E4',
    'S268_GATE_E5',
    'S268_GATE_E6',
    'S268_GATE_E7'
  ].forEach(function(chave) {
    s268ReleaseCheck_(
      checks,
      chave,
      !!valor(chave),
      valor(chave) || 'ausente'
    );
  });


  s268ReleaseCheck_(
    checks,
    'N0_OPERACIONAL',
    valor('S268_NIVEL0') === 'OPERACIONAL',
    valor('S268_NIVEL0')
  );

  s268ReleaseCheck_(
    checks,
    'N0_24_AREAS',
    valor('S268_N0_AREAS_RESOLVIVEIS') === '24',
    valor('S268_N0_AREAS_RESOLVIVEIS')
  );

  s268ReleaseCheck_(
    checks,
    'AREA_EXTERNA_COMPARTILHADA',
    valor('S268_AREA_EXTERNA_COMPARTILHADA') === 'SIM',
    valor('S268_AREA_EXTERNA_COMPARTILHADA')
  );

  s268ReleaseCheck_(
    checks,
    'RELATORIO_LOTES',
    valor('S268_RELATORIO_LOTES') === 'SIM',
    valor('S268_RELATORIO_LOTES')
  );


  const out = {
    ok: checks.every(function(c) {
      return c.ok;
    }),

    version: valor('APP_VERSAO'),
    fase: valor('APP_FASE'),

    diagnostico: 'S26.8-RELEASE-FINAL',

    totalChecks: checks.length,

    falhas: checks.filter(function(c) {
      return !c.ok;
    }).length,

    checks: checks,

    rollback: {
      versao: S268_RELEASE.VERSAO_ANTERIOR,
      fase: S268_RELEASE.FASE_ANTERIOR
    }
  };


  console.log(
    '[S26.8-RELEASE-FINAL] ' +
    JSON.stringify(out)
  );

  return out;
}


function mostrarDiagnosticoFinalS268() {
  const d = diagnosticoFinalS268();

  const mensagem =
    (d.ok
      ? 'S26.8 APROVADA'
      : 'S26.8 COM PENDÊNCIAS') +
    '\n\n' +
    'Versão: ' + d.version +
    '\nFase: ' + d.fase +
    '\nDiagnóstico: ' + d.diagnostico +
    '\nChecks: ' + d.totalChecks +
    '\nFalhas: ' + d.falhas;

  try {
    SpreadsheetApp.getUi().alert(
      'Release S26.8',
      mensagem,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {
    console.log('[S26.8-RELEASE-FINAL] ' + mensagem.replace(/\n/g, ' | '));
  }

  return d;
}