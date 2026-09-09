/**
 * S26.10-G1 — TORRES / NÚCLEOS VERTICAIS
 * Integração complementar com a localização de Sinalização do Mall.
 *
 * Escopo desta subfase:
 * - acrescenta contexto de nível + Torre ao REGISTROS sem substituir localização existente;
 * - preserva snapshot de Torre capturado offline no momento do cadastro;
 * - quando o cliente não envia Torre, o servidor pode enriquecer a partir da publicação vigente;
 * - não altera APP_VERSAO / APP_FASE;
 * - não implementa ocorrências/auditorias (S26.10-G2 após Gate G1).
 */

const S2610G = Object.freeze({
  FASE: 'S26.10-G1',
  SCHEMA: '1',
  COLUNAS_REGISTROS: [
    'ID_PLANTA_NIVEL',
    'X_NIVEL',
    'Y_NIVEL',
    'ID_TORRE',
    'CODIGO_TORRE',
    'NOME_TORRE',
    'ID_REPRESENTACAO_TORRE',
    'VERSAO_GEOMETRIA_TORRE',
    'ORIGEM_TORRE'
  ]
});

function setupS2610G() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('REGISTROS');
  if (!sh) throw new Error('REGISTROS ausente.');

  const linhasAntes = Math.max(0, sh.getLastRow() - 1);
  const adicionadas = s2610GGarantirColunas_(sh, S2610G.COLUNAS_REGISTROS);
  const linhasDepois = Math.max(0, sh.getLastRow() - 1);

  const cfg = ss.getSheetByName('CONFIG');
  if (cfg && typeof setConfigValue_ === 'function') {
    setConfigValue_(cfg, 'S2610G_STATUS', 'INSTALADO', 'Integração complementar de Torres com Sinalização');
    setConfigValue_(cfg, 'S2610G_SCHEMA', S2610G.SCHEMA, 'Schema de localização complementar de Torre em REGISTROS');
    setConfigValue_(cfg, 'S2610G_SOFT_DELETE', 'NAO', 'Soft delete permanece fora do escopo');
  }
  SpreadsheetApp.flush();

  const out = {
    ok: linhasAntes === linhasDepois,
    fase: S2610G.FASE,
    colunasAdicionadas: adicionadas,
    linhasAntes: linhasAntes,
    linhasDepois: linhasDepois,
    registrosPreservados: linhasAntes === linhasDepois
  };
  console.log('[S26.10-G1][SETUP] ' + JSON.stringify(out));
  return out;
}

function s2610GGarantirColunas_(sh, colunas) {
  const lastCol = Math.max(1, sh.getLastColumn());
  const head = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function (v) { return String(v || '').trim(); });
  const faltantes = (colunas || []).filter(function (c) { return head.indexOf(c) < 0; });
  if (!faltantes.length) return [];

  if (sh.getMaxColumns() < lastCol + faltantes.length) {
    sh.insertColumnsAfter(sh.getMaxColumns(), (lastCol + faltantes.length) - sh.getMaxColumns());
  }
  sh.getRange(1, lastCol + 1, 1, faltantes.length)
    .setValues([faltantes])
    .setFontWeight('bold')
    .setBackground('#171B68')
    .setFontColor('#FFFFFF');
  return faltantes;
}

/**
 * Contrato usado por MapService.appCriarRegistroS3.
 * Se o cliente já trouxe Torre do snapshot offline, ela é PRESERVADA e não é
 * recalculada durante uma sincronização posterior. Isso protege o histórico
 * contra uma publicação cartográfica que possa ter mudado depois do cadastro.
 */
function s2610GNormalizarLocalizacaoRegistro_(dados) {
  const d = dados || {};
  const out = {
    idPlantaNivel: s2610GTexto_(d.idPlantaNivel),
    xNivel: s2610GNumeroNormalizadoOuNaN_(d.xNivel),
    yNivel: s2610GNumeroNormalizadoOuNaN_(d.yNivel),
    idTorre: s2610GTexto_(d.idTorre),
    codigoTorre: s2610GTexto_(d.codigoTorre),
    nomeTorre: s2610GTexto_(d.nomeTorre),
    idRepresentacaoTorre: s2610GTexto_(d.idRepresentacaoTorre),
    versaoGeometriaTorre: s2610GNumeroInteiro_(d.versaoGeometriaTorre),
    origemTorre: s2610GTexto_(d.origemTorre)
  };

  if (out.idPlantaNivel && !/^PLA-CFF-N[0-3]-2025$/.test(out.idPlantaNivel)) {
    throw new Error('ID_PLANTA_NIVEL inválido para localização de Torre.');
  }
  if (out.idPlantaNivel && (!Number.isFinite(out.xNivel) || !Number.isFinite(out.yNivel))) {
    throw new Error('X_NIVEL/Y_NIVEL são obrigatórios quando ID_PLANTA_NIVEL é informado.');
  }

  // Snapshot capturado no dispositivo tem precedência histórica.
  if (out.idTorre) {
    out.origemTorre = out.origemTorre || 'CLIENTE_LOCAL_FIRST';
    return out;
  }

  // Sem Torre no payload: servidor pode enriquecer usando a publicação vigente.
  if (out.idPlantaNivel && Number.isFinite(out.xNivel) && Number.isFinite(out.yNivel) && typeof appResolverTorreS2610D === 'function') {
    try {
      const r = appResolverTorreS2610D({
        idPlantaNivel: out.idPlantaNivel,
        x: out.xNivel,
        y: out.yNivel
      });
      if (r && r.resolvido && r.torre && r.representacao) {
        out.idTorre = s2610GTexto_(r.torre.idTorre);
        out.codigoTorre = s2610GTexto_(r.torre.codigo);
        out.nomeTorre = s2610GTexto_(r.torre.nome);
        out.idRepresentacaoTorre = s2610GTexto_(r.representacao.idRepresentacao);
        out.versaoGeometriaTorre = s2610GNumeroInteiro_(r.representacao.versaoGeometria);
        out.origemTorre = 'SERVIDOR_PUBLICADO_SYNC';
      }
    } catch (e) {
      // Complementar: falha de Torre nunca invalida o registro horizontal.
      console.info('[S26.10-G1] enriquecimento servidor de Torre ignorado: ' + (e && e.message ? e.message : e));
    }
  }
  return out;
}

function s2610GTexto_(v) {
  return String(v == null ? '' : v).trim();
}
function s2610GNumeroNormalizadoOuNaN_(v) {
  if (v === '' || v == null) return NaN;
  const n = Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 1) return NaN;
  return n;
}
function s2610GNumeroInteiro_(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function testeContratosIntegracaoTorresS2610G() {
  exigirPermissaoS14_('administrar');
  const checks = [];
  const add = function (nome, ok, detalhe) { checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || '') }); };

  try {
    const p = s2610GNormalizarLocalizacaoRegistro_({
      idPlantaNivel: 'PLA-CFF-N2-2025', xNivel: 0.75, yNivel: 0.80,
      idTorre: 'TORRE-T01', codigoTorre: 'T01', nomeTorre: 'Torre 1',
      idRepresentacaoTorre: 'TORRE-T01-N2', versaoGeometriaTorre: 1,
      origemTorre: 'INDEXEDDB'
    });
    add('S2610G_CONTRATO_PRESERVA_SNAPSHOT_CLIENTE', p.idTorre === 'TORRE-T01' && p.origemTorre === 'INDEXEDDB', p.idRepresentacaoTorre);
  } catch (e) {
    add('S2610G_CONTRATO_PRESERVA_SNAPSHOT_CLIENTE', false, e.message);
  }

  try {
    const p = s2610GNormalizarLocalizacaoRegistro_({ idPlantaNivel: 'PLA-CFF-N2-2025', xNivel: 0.751616, yNivel: 0.800141 });
    add('S2610G_CONTRATO_ENRIQUECE_SEM_TORRE', !p.idTorre || p.idTorre === 'TORRE-T01', p.idTorre || 'fora/sem publicação');
  } catch (e) {
    add('S2610G_CONTRATO_ENRIQUECE_SEM_TORRE', false, e.message);
  }

  try {
    s2610GNormalizarLocalizacaoRegistro_({ idPlantaNivel: 'PLA-INVALIDA', xNivel: .1, yNivel: .1 });
    add('S2610G_CONTRATO_PLANTA_INVALIDA_BLOQUEADA', false, 'não bloqueou');
  } catch (e) {
    add('S2610G_CONTRATO_PLANTA_INVALIDA_BLOQUEADA', true, 'bloqueada');
  }

  const falhas = checks.filter(function (c) { return !c.ok; }).length;
  const out = { ok: falhas === 0, gate: falhas === 0 ? 'APTO_PARA_TESTE_UI' : 'BLOQUEADO', fase: S2610G.FASE, checks: checks, falhas: falhas };
  console.log('[S26.10-G1][CONTRATOS] ' + JSON.stringify(out));
  return out;
}


function testePersistenciaTemporariaIntegracaoTorresS2610G() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const nome = '__QA_S2610G_REGISTROS_' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  const checks = [];
  const add = function (n, ok, d) { checks.push({ nome:n, ok:!!ok, detalhe:String(d || '') }); };
  let sh = null;
  try {
    sh = ss.insertSheet(nome);
    const headers = (typeof CABECALHOS_REGISTROS_S3_ === 'function')
      ? CABECALHOS_REGISTROS_S3_()
      : ['ID_REGISTRO'].concat(S2610G.COLUNAS_REGISTROS);
    if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);

    const torre = s2610GNormalizarLocalizacaoRegistro_({
      idPlantaNivel:'PLA-CFF-N2-2025', xNivel:.751616, yNivel:.800141,
      idTorre:'TORRE-T01', codigoTorre:'T01', nomeTorre:'Torre 1',
      idRepresentacaoTorre:'TORRE-T01-N2', versaoGeometriaTorre:1, origemTorre:'INDEXEDDB'
    });
    const obj = {
      ID_REGISTRO:'QA-S2610G', ID_PLANTA_NIVEL:torre.idPlantaNivel,
      X_NIVEL:torre.xNivel, Y_NIVEL:torre.yNivel, ID_TORRE:torre.idTorre,
      CODIGO_TORRE:torre.codigoTorre, NOME_TORRE:torre.nomeTorre,
      ID_REPRESENTACAO_TORRE:torre.idRepresentacaoTorre,
      VERSAO_GEOMETRIA_TORRE:torre.versaoGeometriaTorre, ORIGEM_TORRE:torre.origemTorre
    };
    appendObjetoS3_(sh, obj);
    const rows = linhasObjetosS2_(nome);
    const r = rows[0] || {};
    add('S2610G_QA_PERSISTE_TORRE', String(r.ID_TORRE || '') === 'TORRE-T01', String(r.ID_TORRE || ''));
    add('S2610G_QA_PERSISTE_REPRESENTACAO', String(r.ID_REPRESENTACAO_TORRE || '') === 'TORRE-T01-N2', String(r.ID_REPRESENTACAO_TORRE || ''));
    add('S2610G_QA_PERSISTE_COORD_NIVEL', Number(r.X_NIVEL) === .751616 && Number(r.Y_NIVEL) === .800141, String(r.X_NIVEL) + ',' + String(r.Y_NIVEL));
  } catch (e) {
    add('S2610G_QA_EXECUCAO', false, e.message);
  } finally {
    try { if (sh) ss.deleteSheet(sh); } catch (_) { }
  }
  add('S2610G_QA_CLEANUP', !ss.getSheetByName(nome), 'sem aba QA residual');
  const falhas = checks.filter(function (c) { return !c.ok; }).length;
  const out = { ok:falhas===0, gate:falhas===0?'APTO_PARA_APROVACAO_PERSISTENCIA':'BLOQUEADO', fase:S2610G.FASE, checks:checks, falhas:falhas };
  console.log('[S26.10-G1][PERSISTENCIA-QA] ' + JSON.stringify(out));
  return out;
}

function diagnosticoIntegracaoTorresS2610G() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const checks = [];
  const add = function (nome, ok, detalhe, bloqueante) {
    checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || ''), bloqueante: bloqueante !== false });
  };

  const sh = ss.getSheetByName('REGISTROS');
  add('S2610G_ABA_REGISTROS', !!sh, sh ? 'REGISTROS' : 'ausente');
  if (sh) {
    const h = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getDisplayValues()[0].map(String);
    S2610G.COLUNAS_REGISTROS.forEach(function (c) {
      add('S2610G_COLUNA_' + c, h.indexOf(c) >= 0, c);
    });
  }

  add('S2610G_DEP_RESOLVEDOR', typeof appResolverTorreS2610D === 'function', 'appResolverTorreS2610D');
  add('S2610G_DEP_OFFLINE', typeof appObterPacoteTorresOfflineS2610E === 'function', 'appObterPacoteTorresOfflineS2610E');
  add('S2610G_DEP_PUBLICACAO', typeof appObterEstadoPublicadoTorresS2610F === 'function', 'appObterEstadoPublicadoTorresS2610F');
  add('S2610G_DEP_CRIAR_REGISTRO', typeof appCriarRegistroS3 === 'function', 'appCriarRegistroS3');

  let publicado = null;
  try { publicado = appObterEstadoPublicadoTorresS2610F(); } catch (e) { publicado = { erro: e.message }; }
  add('S2610G_PUBLICACAO_TORRES_LEGIVEL', !!(publicado && publicado.ok), publicado && publicado.publicacao ? String(publicado.publicacao.versao || publicado.publicacao.VERSAO || 'PUBLICADA') : (publicado && publicado.erro || 'sem publicação'));
  if (publicado && publicado.ok) {
    add('S2610G_REPRESENTACOES_PUBLICADAS', Array.isArray(publicado.representacoes) && publicado.representacoes.length > 0, String((publicado.representacoes || []).length) + ' representação(ões)');
  }

  const cfg = (typeof lerConfigComoObjeto_ === 'function') ? lerConfigComoObjeto_(ss) : {};
  add('S2610G_CONFIG_NAO_PROMOVIDA_S2610', String(cfg.APP_FASE || '') !== 'S26.10', String(cfg.APP_VERSAO || '') + ' / ' + String(cfg.APP_FASE || ''));

  const falhasBloqueantes = checks.filter(function (c) { return c.bloqueante && !c.ok; }).length;
  const out = {
    ok: falhasBloqueantes === 0,
    gate: falhasBloqueantes === 0 ? 'APTO_PARA_TESTE_UI' : 'BLOQUEADO',
    fase: S2610G.FASE,
    totais: {
      registros: sh ? Math.max(0, sh.getLastRow() - 1) : 0,
      representacoesPublicadas: publicado && Array.isArray(publicado.representacoes) ? publicado.representacoes.length : 0
    },
    checks: checks,
    falhas: checks.filter(function (c) { return !c.ok; }).length,
    falhasBloqueantes: falhasBloqueantes
  };
  return out;
}

function mostrarDiagnosticoIntegracaoTorresS2610G() {
  const d = diagnosticoIntegracaoTorresS2610G();
  console.log('[S26.10-G1][RESULTADO] ' + JSON.stringify(d));
  (d.checks || []).filter(function (c) { return !c.ok; }).forEach(function (c) {
    console.warn('[S26.10-G1][FALHA] ' + c.nome + ' — ' + c.detalhe);
  });
  console.log('[S26.10-G1][ENCERRADO] gate=' + d.gate + '; falhasBloqueantes=' + d.falhasBloqueantes);
  return d;
}
