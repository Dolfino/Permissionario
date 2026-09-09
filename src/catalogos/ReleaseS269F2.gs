/**
 * S26.9-F2 — promoção final da release de Catálogos de Domínio.
 *
 * Escopo:
 * - valida o estado funcional antes/depois da promoção;
 * - altera somente CONFIG.APP_VERSAO / CONFIG.APP_FASE e metadados S26.9;
 * - não altera REGISTROS, geometrias, fotos, Outbox ou opções de catálogo;
 * - operação idempotente;
 * - exige permissão ADMINISTRAR quando o helper S14 estiver disponível.
 */

const RELEASE_S269F2 = Object.freeze({
  VERSAO_ANTERIOR: 'MVP-3.30.0-SINALIZACAO-S26.8',
  FASE_ANTERIOR: 'S26.8',
  VERSAO_ALVO: 'MVP-3.31.0-SINALIZACAO-S26.9',
  FASE_ALVO: 'S26.9'
});

function diagnosticoS269F2() {
  exigirAdminS269F2_();
  return diagnosticoInternoS269F2_();
}

function promoverReleaseS269F2() {
  exigirAdminS269F2_();

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const antes = diagnosticoInternoS269F2_();
    if (!antes.ok) {
      throw new Error('S26.9-F2 bloqueada: ' + JSON.stringify(antes.checksFalhos || []));
    }

    if (antes.estadoRelease === 'PROMOVIDO') {
      return antes;
    }

    if (antes.estadoRelease !== 'PRE_PROMOCAO') {
      throw new Error(
        'Estado de versão inesperado. Esperado ' +
        RELEASE_S269F2.VERSAO_ANTERIOR + '/' + RELEASE_S269F2.FASE_ANTERIOR +
        ' ou ' + RELEASE_S269F2.VERSAO_ALVO + '/' + RELEASE_S269F2.FASE_ALVO + '.'
      );
    }

    const planilha = obterPlanilhaS269F2_();
    const config = planilha.getSheetByName('CONFIG');
    if (!config) throw new Error('Aba CONFIG não encontrada.');

    const agora = new Date();
    setConfigS269F2_(config, 'APP_VERSAO', RELEASE_S269F2.VERSAO_ALVO, 'Versão atualmente instalada');
    setConfigS269F2_(config, 'APP_FASE', RELEASE_S269F2.FASE_ALVO, 'Fase funcional atualmente instalada');
    setConfigS269F2_(config, 'S26.9_STATUS', 'APROVADO', 'Estado final da Fase S26.9');
    setConfigS269F2_(config, 'S26.9_INSTALADO_EM', agora.toISOString(), 'Data/hora da promoção final da Fase S26.9');
    setConfigS269F2_(
      config,
      'S26.9_RELEASE_JSON',
      JSON.stringify({
        versaoAnterior: RELEASE_S269F2.VERSAO_ANTERIOR,
        faseAnterior: RELEASE_S269F2.FASE_ANTERIOR,
        versao: RELEASE_S269F2.VERSAO_ALVO,
        fase: RELEASE_S269F2.FASE_ALVO,
        promovidoEm: agora.toISOString(),
        revisaoCatalogos: antes.revisaoCatalogos || '',
        catalogos: antes.resumo ? antes.resumo.catalogos : 0,
        opcoes: antes.resumo ? antes.resumo.opcoes : 0,
        opcoesAtivas: antes.resumo ? antes.resumo.opcoesAtivas : 0,
        fixacoesAtivas: antes.resumo ? antes.resumo.fixacoesAtivas : 0
      }),
      'Evidência resumida da promoção S26.9-F2'
    );

    SpreadsheetApp.flush();

    registrarAuditoriaS269F2_('PROMOVER_RELEASE_S269F2', {
      anterior: {
        appVersao: RELEASE_S269F2.VERSAO_ANTERIOR,
        appFase: RELEASE_S269F2.FASE_ANTERIOR
      },
      novo: {
        appVersao: RELEASE_S269F2.VERSAO_ALVO,
        appFase: RELEASE_S269F2.FASE_ALVO
      },
      revisaoCatalogos: antes.revisaoCatalogos || ''
    });

    const depois = diagnosticoInternoS269F2_();
    if (!depois.ok || depois.estadoRelease !== 'PROMOVIDO') {
      throw new Error('Promoção gravada, porém o diagnóstico pós-promoção não aprovou: ' + JSON.stringify(depois));
    }
    return depois;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Reverte SOMENTE a marcação de versão na CONFIG.
 * Para rollback completo, também é necessário reimplantar a versão Web App S26.8.
 */
function reverterMarcacaoReleaseS269F2() {
  exigirAdminS269F2_();

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const planilha = obterPlanilhaS269F2_();
    const config = planilha.getSheetByName('CONFIG');
    if (!config) throw new Error('Aba CONFIG não encontrada.');

    const atual = lerConfigS269F2_(config);
    if (
      atual.APP_VERSAO !== RELEASE_S269F2.VERSAO_ALVO ||
      atual.APP_FASE !== RELEASE_S269F2.FASE_ALVO
    ) {
      throw new Error('Rollback de marcação permitido somente quando a CONFIG está na release S26.9.');
    }

    const agora = new Date().toISOString();
    setConfigS269F2_(config, 'APP_VERSAO', RELEASE_S269F2.VERSAO_ANTERIOR, 'Versão atualmente instalada');
    setConfigS269F2_(config, 'APP_FASE', RELEASE_S269F2.FASE_ANTERIOR, 'Fase funcional atualmente instalada');
    setConfigS269F2_(config, 'S26.9_STATUS', 'ROLLBACK_CONFIG', 'Estado final da Fase S26.9');
    setConfigS269F2_(config, 'S26.9_ROLLBACK_CONFIG_EM', agora, 'Data/hora da reversão da marcação de release');
    SpreadsheetApp.flush();

    registrarAuditoriaS269F2_('REVERTER_MARCACAO_RELEASE_S269F2', {
      anterior: {
        appVersao: RELEASE_S269F2.VERSAO_ALVO,
        appFase: RELEASE_S269F2.FASE_ALVO
      },
      novo: {
        appVersao: RELEASE_S269F2.VERSAO_ANTERIOR,
        appFase: RELEASE_S269F2.FASE_ANTERIOR
      }
    });

    return diagnosticoInternoS269F2_();
  } finally {
    lock.releaseLock();
  }
}

function diagnosticoInternoS269F2_() {
  const checks = [];
  const add = (nome, ok, detalhe) => checks.push({
    nome: String(nome),
    ok: !!ok,
    detalhe: detalhe == null ? '' : String(detalhe)
  });

  const planilha = obterPlanilhaS269F2_();
  const config = planilha.getSheetByName('CONFIG');
  if (!config) throw new Error('Aba CONFIG não encontrada.');
  const cfg = lerConfigS269F2_(config);

  const prePromocao =
    cfg.APP_VERSAO === RELEASE_S269F2.VERSAO_ANTERIOR &&
    cfg.APP_FASE === RELEASE_S269F2.FASE_ANTERIOR;
  const promovido =
    cfg.APP_VERSAO === RELEASE_S269F2.VERSAO_ALVO &&
    cfg.APP_FASE === RELEASE_S269F2.FASE_ALVO;

  add('CONFIG_VERSAO_RECONHECIDA', prePromocao || promovido, (cfg.APP_VERSAO || '') + ' / ' + (cfg.APP_FASE || ''));
  add('API_CATALOGOS_ADMIN', typeof appCatalogosAdminCarregar === 'function', typeof appCatalogosAdminCarregar);
  add('API_CATALOGOS_CRIAR', typeof appCatalogosAdminCriarOpcao === 'function', typeof appCatalogosAdminCriarOpcao);
  add('API_CATALOGOS_EDITAR', typeof appCatalogosAdminEditarOpcao === 'function', typeof appCatalogosAdminEditarOpcao);
  add('API_CATALOGOS_ATIVO', typeof appCatalogosAdminDefinirAtivo === 'function', typeof appCatalogosAdminDefinirAtivo);
  add('API_CATALOGOS_REORDENAR', typeof appCatalogosAdminReordenar === 'function', typeof appCatalogosAdminReordenar);
  add('API_CATALOGOS_REMOVER', typeof appCatalogosAdminRemoverOpcao === 'function', typeof appCatalogosAdminRemoverOpcao);
  add('API_CATALOGOS_HISTORICO', typeof appCatalogosAdminHistorico === 'function', typeof appCatalogosAdminHistorico);

  let resposta = null;
  let erroCatalogos = '';
  try {
    resposta = appCatalogosAdminCarregar();
  } catch (e) {
    erroCatalogos = e && e.message ? e.message : String(e);
  }

  add('CARREGAMENTO_CATALOGOS_OK', !!resposta && resposta.ok !== false && !erroCatalogos, erroCatalogos || 'OK');

  const catalogos = Array.isArray(resposta && resposta.catalogos) ? resposta.catalogos : [];
  const codigosEsperados = [
    'TIPO', 'FINALIDADE', 'MATERIAL', 'FIXACAO',
    'ESTADO_CONSERVACAO', 'CONDICAO', 'RESPONSAVEL'
  ];
  const porCodigo = {};
  const ids = [];
  let totalOpcoes = 0;
  let totalAtivas = 0;
  let ativasNaoPublicadas = 0;

  catalogos.forEach(c => {
    const codigo = String(c && c.codigo || '').toUpperCase();
    const opcoes = Array.isArray(c && c.opcoes) ? c.opcoes : [];
    const ativas = opcoes.filter(o => !!(o && o.ativo));
    porCodigo[codigo] = { total: opcoes.length, ativas: ativas.length };
    totalOpcoes += opcoes.length;
    totalAtivas += ativas.length;
    opcoes.forEach(o => {
      if (o && o.id) ids.push(String(o.id));
      if (o && o.ativo && !o.publicada) ativasNaoPublicadas++;
    });
  });

  const duplicados = ids.filter((id, i) => ids.indexOf(id) !== i);
  const fixacoesAtivas = Number(porCodigo.FIXACAO && porCodigo.FIXACAO.ativas || 0);

  add('TOTAL_CATALOGOS_7', catalogos.length === 7, catalogos.length);
  add('CATALOGOS_ESPERADOS', codigosEsperados.every(c => !!porCodigo[c]), codigosEsperados.filter(c => !porCodigo[c]).join(', ') || 'OK');
  add('TOTAL_OPCOES_MINIMO_82', totalOpcoes >= 82, totalOpcoes);
  add('IDS_SEM_DUPLICIDADE', duplicados.length === 0, duplicados.join(', ') || '0');
  add('FIXACAO_OPERACIONAL', fixacoesAtivas >= 1, fixacoesAtivas);
  add('ATIVAS_PUBLICADAS', ativasNaoPublicadas === 0, ativasNaoPublicadas);

  const falhos = checks.filter(c => !c.ok);
  const estadoRelease = promovido ? 'PROMOVIDO' : (prePromocao ? 'PRE_PROMOCAO' : 'INCONSISTENTE');
  const gate = falhos.length
    ? 'BLOQUEADO'
    : (promovido ? 'RELEASE_APROVADO' : 'APTO_PARA_PROMOCAO');

  const resultado = {
    ok: falhos.length === 0,
    gate,
    fase: 'S26.9-F2',
    estadoRelease,
    producao: {
      appVersao: cfg.APP_VERSAO || '',
      appFase: cfg.APP_FASE || '',
      alvoVersao: RELEASE_S269F2.VERSAO_ALVO,
      alvoFase: RELEASE_S269F2.FASE_ALVO
    },
    resumo: {
      catalogos: catalogos.length,
      opcoes: totalOpcoes,
      opcoesAtivas: totalAtivas,
      fixacoesAtivas
    },
    revisaoCatalogos: String(resposta && resposta.revisaoGlobal || ''),
    totalChecks: checks.length,
    falhas: falhos.length,
    checksFalhos: falhos,
    checks
  };

  console.info('[S26.9-F2-DIAG]', JSON.stringify(resultado));
  return resultado;
}

function obterPlanilhaS269F2_() {
  if (typeof ConfigService !== 'undefined' && ConfigService && typeof ConfigService.obterPlanilha === 'function') {
    return ConfigService.obterPlanilha();
  }
  const ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (!ativa) throw new Error('Não foi possível resolver a planilha da aplicação.');
  return ativa;
}

function lerConfigS269F2_(aba) {
  const lastRow = Math.max(aba.getLastRow(), 1);
  const valores = aba.getRange(1, 1, lastRow, Math.min(Math.max(aba.getLastColumn(), 2), 3)).getValues();
  const mapa = {};
  for (let i = 1; i < valores.length; i++) {
    const chave = String(valores[i][0] || '').trim();
    if (!chave) continue;
    mapa[chave] = String(valores[i][1] == null ? '' : valores[i][1]).trim();
  }
  return mapa;
}

function setConfigS269F2_(aba, chave, valor, descricao) {
  const lastRow = Math.max(aba.getLastRow(), 1);
  const chaves = lastRow > 1
    ? aba.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0] || '').trim())
    : [];
  const idx = chaves.indexOf(chave);
  if (idx >= 0) {
    const linha = idx + 2;
    aba.getRange(linha, 2).setValue(valor);
    if (descricao && !aba.getRange(linha, 3).getValue()) aba.getRange(linha, 3).setValue(descricao);
    return;
  }
  aba.appendRow([chave, valor, descricao || '']);
}

function exigirAdminS269F2_() {
  if (typeof exigirPermissaoS14_ === 'function') {
    exigirPermissaoS14_('administrar');
  }
}

function registrarAuditoriaS269F2_(acao, detalhes) {
  try {
    if (typeof UtilService === 'undefined' || !UtilService || typeof UtilService.appendObjeto !== 'function') return;

    let sessao = {};
    try {
      if (typeof appSessaoS14 === 'function') sessao = appSessaoS14() || {};
    } catch (_) { }

    const email = String(sessao.email || sessao.usuarioEmail || '').trim();
    const nome = String(sessao.nome || sessao.usuarioNome || '').trim();
    const perfil = String(sessao.perfil || '').trim();

    UtilService.appendObjeto('AUDITORIA', {
      ID_AUDITORIA: 'AUD-S269F2-' + Utilities.getUuid(),
      DATA_HORA: new Date(),
      USUARIO_EMAIL: email,
      USUARIO_NOME: nome,
      PERFIL: perfil,
      ACAO: acao,
      ENTIDADE: 'CONFIG',
      ENTIDADE_ID: 'APP_VERSAO',
      RESULTADO: 'SUCESSO',
      ORIGEM: 'APPS_SCRIPT',
      DEVICE_ID: '',
      DETALHES_JSON: JSON.stringify(detalhes || {}),
      VALOR_ANTERIOR_JSON: JSON.stringify((detalhes && detalhes.anterior) || {}),
      VALOR_NOVO_JSON: JSON.stringify((detalhes && detalhes.novo) || {}),
      VERSAO_APP: RELEASE_S269F2.VERSAO_ALVO
    });
  } catch (e) {
    console.warn('[S26.9-F2] Auditoria de release não pôde ser registrada.', e);
  }
}
