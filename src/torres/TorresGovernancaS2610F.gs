/**
 * S26.10-F — TORRES / NÚCLEOS VERTICAIS
 * Governança formal: rascunho, validação, publicação, histórico, snapshot e restauração controlada.
 *
 * Princípios:
 * - produção da aplicação permanece em MVP-3.31.0-SINALIZACAO-S26.9 / S26.9;
 * - o estado de trabalho fica nas três tabelas S26.10-B;
 * - o estado operacional é SEMPRE o snapshot imutável da última publicação S26.10-F;
 * - editar linhas já publicadas não altera o operacional até nova publicação;
 * - restauração de snapshot volta para o estado de trabalho como RASCUNHO e exige nova publicação;
 * - sem API pública de exclusão; soft delete continua fora de escopo.
 */

const S2610F = Object.freeze({
  FASE: 'S26.10-F',
  SCHEMA: 1,
  SHEET_PUBLICACOES: 'CARTOGRAFIA_TORRE_PUBLICACOES',
  STATUS: Object.freeze({
    RASCUNHO: 'RASCUNHO',
    EM_VALIDACAO: 'EM_VALIDACAO',
    PUBLICADA: 'PUBLICADA',
    ARQUIVADA: 'ARQUIVADA'
  }),
  TIPO_SNAPSHOT: 'SNAPSHOT_TORRES',
  ENTIDADE_SNAPSHOT: 'CARTOGRAFIA_TORRES',
  CONFIRMAR_PUBLICACAO: 'PUBLICAR',
  CONFIRMAR_RESTAURACAO: 'RESTAURAR'
});

const S2610F_PUB_HEADERS = Object.freeze([
  'ID_PUBLICACAO_TORRES', 'VERSAO', 'TITULO', 'STATUS', 'BASE_JSON', 'DRAFT_JSON',
  'HASH_DRAFT', 'CRIADO_EM', 'CRIADO_POR', 'ENVIADO_VALIDACAO_EM', 'ENVIADO_VALIDACAO_POR',
  'PUBLICADO_EM', 'PUBLICADO_POR', 'ARQUIVADO_EM', 'ARQUIVADO_POR', 'MOTIVO', 'OBSERVACOES'
]);

// -----------------------------------------------------------------------------
// SETUP / DIAGNÓSTICO
// -----------------------------------------------------------------------------

function setupS2610F() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const sh = s240EnsureSheet_(ss, S2610F.SHEET_PUBLICACOES, S2610F_PUB_HEADERS.slice());
  sh.setFrozenRows(1);

  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'S2610F_STATUS', 'INSTALADO', 'Governança formal de Torres / Núcleos verticais');
    setConfigValue_(cfg, 'S2610F_SCHEMA', String(S2610F.SCHEMA), 'Schema de publicação de Torres');
    setConfigValue_(cfg, 'S2610F_OPERACIONAL', 'SNAPSHOT_PUBLICADO', 'Operação lê publicação imutável, não o estado de trabalho');
    // Deliberadamente NÃO altera APP_VERSAO / APP_FASE.
  }
  SpreadsheetApp.flush();
  return diagnosticoGovernancaTorresS2610F();
}

function diagnosticoGovernancaTorresS2610F() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const checks = [];
  const add = function (nome, ok, detalhe, bloqueante) {
    checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || ''), bloqueante: bloqueante !== false });
  };

  const shP = ss.getSheetByName(S2610F.SHEET_PUBLICACOES);
  const shT = ss.getSheetByName(S2610B.SHEET_TORRES);
  const shR = ss.getSheetByName(S2610B.SHEET_REPRESENTACOES);
  const shC = ss.getSheetByName(S2610B.SHEET_COMPONENTES);
  add('S2610F_ABA_PUBLICACOES', !!shP, S2610F.SHEET_PUBLICACOES);
  add('S2610F_ABA_TORRES', !!shT, S2610B.SHEET_TORRES);
  add('S2610F_ABA_REPRESENTACOES', !!shR, S2610B.SHEET_REPRESENTACOES);
  add('S2610F_ABA_COMPONENTES', !!shC, S2610B.SHEET_COMPONENTES);
  if (shP) add('S2610F_HEADERS_PUBLICACOES', s2610FHeadersContem_(shP, S2610F_PUB_HEADERS), s2610FHeaderResumo_(shP, S2610F_PUB_HEADERS));

  const rows = shP ? s240Objects_(shP) : [];
  const ativos = rows.filter(function (r) {
    return [S2610F.STATUS.RASCUNHO, S2610F.STATUS.EM_VALIDACAO].includes(s2610FUpper_(r.STATUS));
  });
  const publicadas = rows.filter(function (r) { return s2610FUpper_(r.STATUS) === S2610F.STATUS.PUBLICADA; });
  add('S2610F_UNICO_PACOTE_ATIVO', ativos.length <= 1, ativos.length + ' pacote(s) ativo(s)');
  add('S2610F_UNICA_PUBLICACAO_OPERACIONAL', publicadas.length <= 1, publicadas.length + ' publicação(ões) ativa(s)');

  let trabalho = null;
  try {
    trabalho = s2610FEstadoTrabalhoRaw_();
    const v = s2610FValidarEstado_(trabalho);
    add('S2610F_ESTADO_TRABALHO_VALIDO', v.ok, v.ok ? s2610FResumoEstado_(trabalho) : v.erros.join(' | '));
  } catch (e) {
    add('S2610F_ESTADO_TRABALHO_VALIDO', false, e.message);
  }

  let pub = null;
  try {
    pub = s2610FPublicacaoAtual_();
    if (!pub) {
      add('S2610F_PUBLICACAO_LEGIVEL', true, 'Nenhuma publicação ainda — estado esperado antes da primeira publicação.');
    } else {
      const vpub = s2610FValidarEstado_(pub.draft);
      add('S2610F_PUBLICACAO_LEGIVEL', vpub.ok, pub.versao + ' • ' + pub.status + (vpub.ok ? '' : ' • ' + vpub.erros.join(' | ')));
    }
  } catch (e) {
    add('S2610F_PUBLICACAO_LEGIVEL', false, e.message);
  }

  add('S2610F_API_CICLO', typeof appObterCicloPublicacaoTorresS2610F === 'function', 'appObterCicloPublicacaoTorresS2610F');
  add('S2610F_API_PUBLICAR', typeof appPublicarTorresS2610F === 'function', 'appPublicarTorresS2610F');
  add('S2610F_API_SNAPSHOT', typeof appCriarSnapshotTorresS2610F === 'function', 'appCriarSnapshotTorresS2610F');
  add('S2610F_API_RESTAURAR', typeof appRestaurarSnapshotTorresComoRascunhoS2610F === 'function', 'appRestaurarSnapshotTorresComoRascunhoS2610F');
  add('S2610F_DEP_HISTORICO', typeof s253RegistrarEvento_ === 'function', 's253RegistrarEvento_');
  add('S2610F_DEP_AUDITORIA', typeof registrarAuditoriaS15_ === 'function', 'registrarAuditoriaS15_');

  const cfg = (typeof lerConfigComoObjeto_ === 'function') ? lerConfigComoObjeto_(ss) : {};
  add('S2610F_CONFIG_NAO_PROMOVIDA', String(cfg.APP_FASE || '') !== 'S26.10', String(cfg.APP_VERSAO || '') + ' / ' + String(cfg.APP_FASE || ''));

  const falhasBloqueantes = checks.filter(function (c) { return c.bloqueante && !c.ok; }).length;
  return {
    ok: falhasBloqueantes === 0,
    gate: falhasBloqueantes === 0 ? 'APTO_PARA_TESTE_FLUXO' : 'BLOQUEADO',
    fase: S2610F.FASE,
    totais: {
      publicacoes: rows.length,
      ativos: ativos.length,
      publicadas: publicadas.length,
      torresTrabalho: trabalho ? trabalho.torres.length : 0,
      representacoesTrabalho: trabalho ? trabalho.representacoes.length : 0,
      componentesTrabalho: trabalho ? trabalho.componentes.length : 0
    },
    checks: checks,
    falhas: checks.filter(function (c) { return !c.ok; }).length,
    falhasBloqueantes: falhasBloqueantes
  };
}

function mostrarDiagnosticoGovernancaTorresS2610F() {
  const d = diagnosticoGovernancaTorresS2610F();
  console.log('[S26.10-F][RESULTADO] ' + JSON.stringify(d));
  (d.checks || []).filter(function (c) { return !c.ok; }).forEach(function (c) {
    console.warn('[S26.10-F][FALHA] ' + c.nome + ' — ' + c.detalhe);
  });
  console.log('[S26.10-F][ENCERRADO] gate=' + d.gate + '; falhasBloqueantes=' + d.falhasBloqueantes);
  return d;
}

// -----------------------------------------------------------------------------
// ESTADO DE TRABALHO E ESTADO OPERACIONAL PUBLICADO
// -----------------------------------------------------------------------------

function s2610FGovernancaInstalada_() {
  try { return !!SpreadsheetApp.getActive().getSheetByName(S2610F.SHEET_PUBLICACOES); }
  catch (_) { return false; }
}

function s2610FEstadoTrabalhoRaw_() {
  const ss = SpreadsheetApp.getActive();
  const shT = ss.getSheetByName(S2610B.SHEET_TORRES);
  const shR = ss.getSheetByName(S2610B.SHEET_REPRESENTACOES);
  const shC = ss.getSheetByName(S2610B.SHEET_COMPONENTES);
  if (!shT || !shR || !shC) throw new Error('Estrutura S26.10-B incompleta. Execute setupS2610B().');
  return {
    schema: S2610F.SCHEMA,
    capturadoEm: new Date().toISOString(),
    torres: s240Objects_(shT),
    representacoes: s240Objects_(shR),
    componentes: s240Objects_(shC)
  };
}

/**
 * Fonte interna do resolvedor operacional S26.10-D e das APIs não-admin S26.10-B.
 * Nunca cai para as linhas de trabalho quando S26.10-F está instalado.
 */
function s2610FEstadoPublicadoRaw_() {
  const pub = s2610FPublicacaoAtual_();
  if (!pub) return { schema: S2610F.SCHEMA, torres: [], representacoes: [], componentes: [], publicacao: null };
  const estado = s2610FClonar_(pub.draft || {});
  const val = s2610FValidarEstado_(estado);
  if (!val.ok) throw new Error('Publicação de Torres inválida: ' + val.erros.join(' | '));
  return {
    schema: S2610F.SCHEMA,
    torres: estado.torres || [],
    representacoes: estado.representacoes || [],
    componentes: estado.componentes || [],
    publicacao: { id: pub.id, versao: pub.versao, publicadoEm: pub.publicadoEm, publicadoPor: pub.publicadoPor }
  };
}

function appObterEstadoPublicadoTorresS2610F() {
  exigirPermissaoS14_('consultarMapa');
  const e = s2610FEstadoPublicadoRaw_();
  return {
    ok: true,
    fase: S2610F.FASE,
    publicacao: e.publicacao,
    torres: (e.torres || []).map(s2610BTorreRpc_),
    representacoes: (e.representacoes || []).map(s2610BRepresentacaoRpc_),
    componentes: (e.componentes || []).map(s2610BComponenteRpc_)
  };
}

// -----------------------------------------------------------------------------
// CICLO DE PUBLICAÇÃO
// -----------------------------------------------------------------------------

function appObterCicloPublicacaoTorresS2610F() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(S2610F.SHEET_PUBLICACOES);
  const rows = sh ? s240Objects_(sh) : [];
  const lista = rows.map(s2610FPublicacaoRpc_).sort(function (a, b) {
    return new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0);
  });
  const ativo = lista.find(function (r) {
    return [S2610F.STATUS.RASCUNHO, S2610F.STATUS.EM_VALIDACAO].includes(r.status);
  }) || null;
  const publicada = lista.find(function (r) { return r.status === S2610F.STATUS.PUBLICADA; }) || null;
  const trabalho = s2610FEstadoTrabalhoRaw_();
  const valid = s2610FValidarEstado_(trabalho);
  return {
    fase: S2610F.FASE,
    ativo: ativo,
    publicada: publicada,
    lista: lista.slice(0, 50),
    trabalho: {
      resumo: s2610FResumoEstado_(trabalho),
      validacao: valid,
      hash: s2610FHashEstado_(trabalho)
    },
    mapaOperacionalProtegido: true
  };
}

function appCarregarGovernancaTorresS2610F() {
  exigirPermissaoS14_('administrar');
  return {
    ciclo: appObterCicloPublicacaoTorresS2610F(),
    snapshots: appListarSnapshotsTorresS2610F({ limite: 30 })
  };
}

function appCriarRascunhoPublicacaoTorresS2610F(payload) {
  exigirPermissaoS14_('administrar');
  payload = payload || {};
  const titulo = s2610FText_(payload.titulo);
  const motivo = s2610FText_(payload.motivo);
  if (titulo.length < 3) throw new Error('Informe um título para o pacote de Torres.');
  if (motivo.length < 5) throw new Error('Informe o motivo da alteração de Torres.');

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActive();
    const sh = s240EnsureSheet_(ss, S2610F.SHEET_PUBLICACOES, S2610F_PUB_HEADERS.slice());
    const rows = s240Objects_(sh);
    if (rows.some(function (r) {
      return [S2610F.STATUS.RASCUNHO, S2610F.STATUS.EM_VALIDACAO].includes(s2610FUpper_(r.STATUS));
    })) throw new Error('Já existe um pacote de Torres em RASCUNHO ou EM VALIDAÇÃO.');

    const trabalho = s2610FEstadoTrabalhoRaw_();
    const val = s2610FValidarEstado_(trabalho);
    if (!val.ok) throw new Error('Estado de trabalho inválido: ' + val.erros.join(' | '));

    const publicada = s2610FEstadoPublicadoRaw_();
    const base = {
      schema: S2610F.SCHEMA,
      torres: publicada.torres || [],
      representacoes: publicada.representacoes || [],
      componentes: publicada.componentes || []
    };
    const id = 'TORRE-PUB-' + Utilities.getUuid().replace(/-/g, '').slice(0, 16).toUpperCase();
    const versao = s2610FProximaVersao_(rows);
    const agora = new Date();
    const usuario = s2610FUsuario_();
    s240Upsert_(sh, 'ID_PUBLICACAO_TORRES', {
      ID_PUBLICACAO_TORRES: id,
      VERSAO: versao,
      TITULO: titulo,
      STATUS: S2610F.STATUS.RASCUNHO,
      BASE_JSON: JSON.stringify(base),
      DRAFT_JSON: JSON.stringify(trabalho),
      HASH_DRAFT: s2610FHashEstado_(trabalho),
      CRIADO_EM: agora,
      CRIADO_POR: usuario,
      ENVIADO_VALIDACAO_EM: '',
      ENVIADO_VALIDACAO_POR: '',
      PUBLICADO_EM: '',
      PUBLICADO_POR: '',
      ARQUIVADO_EM: '',
      ARQUIVADO_POR: '',
      MOTIVO: motivo,
      OBSERVACOES: 'S26.10-F — estado de trabalho isolado do snapshot operacional publicado.'
    });
    s2610FEvento_('RASCUNHO_TORRES_CRIADO', S2610F.SHEET_PUBLICACOES, id, titulo, null, { id: id, versao: versao, status: S2610F.STATUS.RASCUNHO }, motivo);
    return appObterCicloPublicacaoTorresS2610F();
  } finally {
    lock.releaseLock();
  }
}

function appEnviarValidacaoTorresS2610F(idPublicacao) {
  exigirPermissaoS14_('administrar');
  const pub = s2610FObterPublicacao_(idPublicacao);
  if (pub.status !== S2610F.STATUS.RASCUNHO) throw new Error('Somente RASCUNHO pode ser enviado para validação.');

  // Sincroniza a última edição do estado de trabalho antes de congelar a revisão.
  s2610FAtualizarDraftComEstadoAtual_(pub.id, 'Sincronização antes da validação');
  const atualizado = s2610FObterPublicacao_(pub.id);
  const val = s2610FValidarEstado_(atualizado.draft);
  if (!val.ok) throw new Error('Pacote não pode ser validado: ' + val.erros.join(' | '));

  s2610FAtualizarPublicacao_(pub.id, {
    STATUS: S2610F.STATUS.EM_VALIDACAO,
    ENVIADO_VALIDACAO_EM: new Date(),
    ENVIADO_VALIDACAO_POR: s2610FUsuario_()
  });
  s2610FEvento_('TORRES_ENVIADAS_VALIDACAO', S2610F.SHEET_PUBLICACOES, pub.id, pub.titulo,
    { status: S2610F.STATUS.RASCUNHO }, { status: S2610F.STATUS.EM_VALIDACAO }, pub.motivo);
  return appObterCicloPublicacaoTorresS2610F();
}

function appReabrirRascunhoTorresS2610F(idPublicacao) {
  exigirPermissaoS14_('administrar');
  const pub = s2610FObterPublicacao_(idPublicacao);
  if (pub.status !== S2610F.STATUS.EM_VALIDACAO) throw new Error('Somente pacote EM VALIDAÇÃO pode voltar para RASCUNHO.');
  s2610FAtualizarPublicacao_(pub.id, {
    STATUS: S2610F.STATUS.RASCUNHO,
    ENVIADO_VALIDACAO_EM: '',
    ENVIADO_VALIDACAO_POR: ''
  });
  s2610FEvento_('VALIDACAO_TORRES_REABERTA', S2610F.SHEET_PUBLICACOES, pub.id, pub.titulo,
    { status: S2610F.STATUS.EM_VALIDACAO }, { status: S2610F.STATUS.RASCUNHO }, 'Retorno para ajustes');
  return appObterCicloPublicacaoTorresS2610F();
}

/** Arquiva somente o pacote de revisão. Os dados de trabalho são preservados para evitar perda. */
function appArquivarRascunhoTorresS2610F(payload) {
  exigirPermissaoS14_('administrar');
  payload = payload || {};
  const pub = s2610FObterPublicacao_(payload.idPublicacao);
  const motivo = s2610FText_(payload.motivo);
  if (![S2610F.STATUS.RASCUNHO, S2610F.STATUS.EM_VALIDACAO].includes(pub.status)) throw new Error('Este pacote não pode ser arquivado.');
  if (motivo.length < 5) throw new Error('Informe o motivo do arquivamento.');
  s2610FAtualizarPublicacao_(pub.id, {
    STATUS: S2610F.STATUS.ARQUIVADA,
    ARQUIVADO_EM: new Date(),
    ARQUIVADO_POR: s2610FUsuario_(),
    OBSERVACOES: 'Pacote arquivado sem publicação. Dados de trabalho preservados. ' + motivo
  });
  s2610FEvento_('RASCUNHO_TORRES_ARQUIVADO', S2610F.SHEET_PUBLICACOES, pub.id, pub.titulo,
    { status: pub.status }, { status: S2610F.STATUS.ARQUIVADA }, motivo);
  return appObterCicloPublicacaoTorresS2610F();
}

function appPrevisualizarPublicacaoTorresS2610F(idPublicacao) {
  exigirPermissaoS14_('administrar');
  const pub = s2610FObterPublicacao_(idPublicacao);
  const base = pub.base || { torres: [], representacoes: [], componentes: [] };
  const draft = pub.draft || { torres: [], representacoes: [], componentes: [] };
  const diffs = {
    torres: s2610FCompararColecao_(base.torres || [], draft.torres || [], 'ID_TORRE'),
    representacoes: s2610FCompararColecao_(base.representacoes || [], draft.representacoes || [], 'ID_REPRESENTACAO'),
    componentes: s2610FCompararColecao_(base.componentes || [], draft.componentes || [], 'ID_COMPONENTE')
  };
  const totalMudancas = Object.keys(diffs).reduce(function (s, k) {
    const d = diffs[k];
    return s + d.adicionados.length + d.alterados.length + d.removidos.length;
  }, 0);
  return {
    id: pub.id,
    versao: pub.versao,
    titulo: pub.titulo,
    status: pub.status,
    motivo: pub.motivo,
    totalMudancas: totalMudancas,
    diffs: diffs,
    validacao: s2610FValidarEstado_(draft),
    resumoBase: s2610FResumoEstado_(base),
    resumoDestino: s2610FResumoEstado_(draft),
    hashDraft: pub.hashDraft
  };
}

function appPublicarTorresS2610F(payload) {
  exigirPermissaoS14_('administrar');
  payload = payload || {};
  const pub = s2610FObterPublicacao_(payload.idPublicacao);
  const confirmacao = s2610FUpper_(payload.confirmacao);
  if (pub.status !== S2610F.STATUS.EM_VALIDACAO) throw new Error('A publicação exige status EM VALIDAÇÃO.');
  if (confirmacao !== S2610F.CONFIRMAR_PUBLICACAO) throw new Error('Confirmação inválida. Digite PUBLICAR.');

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const trabalho = s2610FEstadoTrabalhoRaw_();
    const hashTrabalho = s2610FHashEstado_(trabalho);
    if (hashTrabalho !== pub.hashDraft) {
      throw new Error('O estado de trabalho mudou após o envio para validação. Reabra o rascunho antes de publicar.');
    }
    const val = s2610FValidarEstado_(pub.draft);
    if (!val.ok) throw new Error('Publicação bloqueada: ' + val.erros.join(' | '));

    const preview = appPrevisualizarPublicacaoTorresS2610F(pub.id);
    const seguranca = appCriarSnapshotTorresS2610F('Snapshot automático antes da publicação ' + pub.versao + ' — ' + pub.titulo);
    const publicado = s2610FNormalizarEstadoParaPublicacao_(pub.draft);

    // Atualiza o estado de trabalho para refletir a versão publicada.
    s2610FRestaurarEstadoTrabalho_(publicado, { statusPublicacao: 'PUBLICADA' });
    SpreadsheetApp.flush();

    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName(S2610F.SHEET_PUBLICACOES);
    const rows = s240Objects_(sh);
    rows.filter(function (r) {
      return s2610FUpper_(r.STATUS) === S2610F.STATUS.PUBLICADA && String(r.ID_PUBLICACAO_TORRES || '') !== pub.id;
    }).forEach(function (r) {
      s2610FAtualizarPublicacao_(String(r.ID_PUBLICACAO_TORRES || ''), {
        STATUS: S2610F.STATUS.ARQUIVADA,
        ARQUIVADO_EM: new Date(),
        ARQUIVADO_POR: s2610FUsuario_()
      });
    });

    s2610FAtualizarPublicacao_(pub.id, {
      STATUS: S2610F.STATUS.PUBLICADA,
      DRAFT_JSON: JSON.stringify(publicado),
      HASH_DRAFT: s2610FHashEstado_(publicado),
      PUBLICADO_EM: new Date(),
      PUBLICADO_POR: s2610FUsuario_()
    });

    const histId = s2610FEvento_('PUBLICACAO_TORRES', S2610F.SHEET_PUBLICACOES, pub.id,
      pub.versao + ' — ' + pub.titulo, pub.base, publicado, pub.motivo);
    s2610FAuditoria_('PUBLICAR_TORRES_S2610F', S2610F.SHEET_PUBLICACOES, pub.id, 'SUCESSO', {
      versao: pub.versao,
      snapshotSeguranca: seguranca.idEvento,
      eventoPublicacao: histId,
      totalMudancas: preview.totalMudancas
    });

    return {
      ok: true,
      fase: S2610F.FASE,
      idPublicacao: pub.id,
      versao: pub.versao,
      snapshotSeguranca: seguranca.idEvento,
      eventoPublicacao: histId,
      totalMudancas: preview.totalMudancas,
      requerAtualizacaoCache: true,
      estadoPublicado: s2610FResumoEstado_(publicado)
    };
  } catch (e) {
    s2610FAuditoria_('PUBLICAR_TORRES_S2610F', S2610F.SHEET_PUBLICACOES, pub.id, 'ERRO', { erro: e.message || String(e) });
    throw e;
  } finally {
    lock.releaseLock();
  }
}

// -----------------------------------------------------------------------------
// HOOKS PARA O EDITOR S26.10-B/C
// -----------------------------------------------------------------------------

/** Bloqueia edição enquanto o pacote está EM VALIDAÇÃO. */
function s2610FExigirEdicaoPermitida_() {
  const ativo = s2610FPublicacaoAtiva_();
  if (ativo && ativo.status === S2610F.STATUS.EM_VALIDACAO) {
    throw new Error('Existe um pacote de Torres EM VALIDAÇÃO. Reabra o rascunho antes de editar.');
  }
  return true;
}

/** Toda mutação do estado de trabalho volta o item alterado para RASCUNHO. */
/** Se existe pacote RASCUNHO ativo, mantém seu DRAFT_JSON sincronizado com o editor. */
function s2610FStageEstadoAtualSeRascunho_(motivo) {
  const ativo = s2610FPublicacaoAtiva_();
  if (!ativo || ativo.status !== S2610F.STATUS.RASCUNHO) return null;
  return s2610FAtualizarDraftComEstadoAtual_(ativo.id, motivo || 'Alteração administrativa de Torres');
}

function s2610FAtualizarDraftComEstadoAtual_(idPublicacao, motivo) {
  const pub = s2610FObterPublicacao_(idPublicacao);
  if (pub.status !== S2610F.STATUS.RASCUNHO) return null;
  const atual = s2610FEstadoTrabalhoRaw_();
  const val = s2610FValidarEstado_(atual);
  if (!val.ok) throw new Error('Estado de trabalho inválido: ' + val.erros.join(' | '));
  const hash = s2610FHashEstado_(atual);
  s2610FAtualizarPublicacao_(pub.id, { DRAFT_JSON: JSON.stringify(atual), HASH_DRAFT: hash });
  s2610FEvento_('ALTERACAO_RASCUNHO_TORRES', S2610F.SHEET_PUBLICACOES, pub.id, pub.titulo,
    null, { hashDraft: hash, resumo: s2610FResumoEstado_(atual) }, motivo || 'Rascunho de Torres atualizado');
  return { ok: true, idPublicacao: pub.id, hashDraft: hash };
}

// -----------------------------------------------------------------------------
// SNAPSHOT / RESTAURAÇÃO CONTROLADA
// -----------------------------------------------------------------------------

function appCriarSnapshotTorresS2610F(motivo) {
  exigirPermissaoS14_('administrar');
  const texto = s2610FText_(motivo || 'Snapshot manual de Torres');
  const estado = s2610FEstadoTrabalhoRaw_();
  const id = s253RegistrarEvento_({
    tipoEvento: S2610F.TIPO_SNAPSHOT,
    entidade: S2610F.ENTIDADE_SNAPSHOT,
    entidadeId: 'TORRES',
    nome: 'Snapshot Torres / Núcleos verticais',
    antes: null,
    depois: estado,
    motivo: texto,
    origem: 'WEB_APP'
  });
  s2610FAuditoria_('CRIAR_SNAPSHOT_TORRES_S2610F', S2610F.ENTIDADE_SNAPSHOT, id, 'SUCESSO', { motivo: texto });
  return { ok: true, idEvento: id, resumo: s2610FResumoEstado_(estado), hash: s2610FHashEstado_(estado) };
}

function appListarSnapshotsTorresS2610F(filtros) {
  exigirPermissaoS14_('administrar');
  filtros = filtros || {};
  const limite = Math.min(100, Math.max(1, Number(filtros.limite || 30)));
  const rows = appListarHistoricoCartograficoS253({ entidade: S2610F.ENTIDADE_SNAPSHOT, tipo: S2610F.TIPO_SNAPSHOT, limite: 200 });
  return (rows || []).slice(0, limite).map(function (r) {
    const estado = r.depois || {};
    return {
      idEvento: r.id,
      dataHora: r.dataHora,
      usuario: r.usuario,
      motivo: r.motivo,
      resumo: s2610FResumoEstado_(estado),
      hash: s2610FHashEstado_(estado)
    };
  });
}

/**
 * Restaura um snapshot SOMENTE para o estado de trabalho.
 * O operacional publicado permanece intacto até nova publicação formal.
 */
function appRestaurarSnapshotTorresComoRascunhoS2610F(payload) {
  exigirPermissaoS14_('administrar');
  payload = payload || {};
  const idEvento = s2610FText_(payload.idEvento);
  const motivo = s2610FText_(payload.motivo);
  const confirmacao = s2610FUpper_(payload.confirmacao);
  if (!idEvento) throw new Error('Informe o snapshot de Torres.');
  if (motivo.length < 5) throw new Error('Informe o motivo da restauração.');
  if (confirmacao !== S2610F.CONFIRMAR_RESTAURACAO) throw new Error('Confirmação inválida. Digite RESTAURAR.');

  s2610FExigirEdicaoPermitida_();
  const ev = appObterEventoCartograficoS253(idEvento);
  if (ev.tipo !== S2610F.TIPO_SNAPSHOT || ev.entidade !== S2610F.ENTIDADE_SNAPSHOT) throw new Error('Evento não é um snapshot de Torres restaurável.');
  const destino = ev.depois;
  const val = s2610FValidarEstado_(destino);
  if (!val.ok) throw new Error('Snapshot inválido: ' + val.erros.join(' | '));

  const seguranca = appCriarSnapshotTorresS2610F('Snapshot automático antes da restauração ' + idEvento);
  const restaurado = s2610FNormalizarEstadoComoRascunho_(destino);
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    s2610FRestaurarEstadoTrabalho_(restaurado, { statusPublicacao: 'RASCUNHO' });
    SpreadsheetApp.flush();
    s2610FStageEstadoAtualSeRascunho_('Restauração do snapshot ' + idEvento);
    const histId = s2610FEvento_('RESTAURACAO_SNAPSHOT_TORRES', S2610F.ENTIDADE_SNAPSHOT, idEvento,
      'Restauração de snapshot de Torres', null,
      { snapshotOrigem: idEvento, snapshotSeguranca: seguranca.idEvento, resumo: s2610FResumoEstado_(restaurado) }, motivo);
    s2610FAuditoria_('RESTAURAR_SNAPSHOT_TORRES_S2610F', S2610F.ENTIDADE_SNAPSHOT, idEvento, 'SUCESSO', {
      motivo: motivo, snapshotSeguranca: seguranca.idEvento, eventoHistorico: histId
    });
    return {
      ok: true,
      idEvento: idEvento,
      snapshotSeguranca: seguranca.idEvento,
      eventoHistorico: histId,
      resumo: s2610FResumoEstado_(restaurado),
      requerPublicacao: true,
      operacionalPreservado: true
    };
  } finally {
    lock.releaseLock();
  }
}

// -----------------------------------------------------------------------------
// VALIDAÇÃO DO ESTADO
// -----------------------------------------------------------------------------

function s2610FValidarEstado_(estado) {
  estado = estado || {};
  const erros = [];
  const torres = Array.isArray(estado.torres) ? estado.torres : [];
  const reps = Array.isArray(estado.representacoes) ? estado.representacoes : [];
  const comps = Array.isArray(estado.componentes) ? estado.componentes : [];

  if (!torres.length) erros.push('Nenhuma Torre/Núcleo vertical cadastrada.');
  s2610FValidarIdsUnicos_(torres, 'ID_TORRE', 'Torres', erros);
  s2610FValidarIdsUnicos_(reps, 'ID_REPRESENTACAO', 'Representações', erros);
  s2610FValidarIdsUnicos_(comps, 'ID_COMPONENTE', 'Componentes', erros);

  const codigos = {};
  torres.forEach(function (t) {
    try {
      const id = s2610BNormalizarIdTorre_(t.ID_TORRE);
      const codigo = s2610BNormalizarCodigo_(t.CODIGO);
      if (!codigo) throw new Error('código vazio');
      if (codigos[codigo] && codigos[codigo] !== id) erros.push('Código de torre duplicado: ' + codigo + '.');
      codigos[codigo] = id;
      if (s2610FText_(t.NOME).length < 3) erros.push(id + ': nome inválido.');
      s2610BEnum_(t.TIPO || 'NUCLEO_VERTICAL', S2610B.TIPOS_TORRE, 'Tipo de torre');
      s2610BEnum_(t.STATUS || 'ATIVA', S2610B.STATUS_ENTIDADE, 'Status da torre');
      const niveis = s2610BNormalizarNiveis_(s2610BJsonArray_(t.NIVEIS_ATENDIDOS_JSON));
      if (!niveis.length) erros.push(id + ': nenhum nível atendido.');
    } catch (e) { erros.push(String(t.ID_TORRE || 'Torre') + ': ' + e.message); }
  });

  const porTorre = {};
  torres.forEach(function (t) { porTorre[String(t.ID_TORRE || '')] = t; });
  const repPorVinculo = {};
  reps.forEach(function (r) {
    const idRep = String(r.ID_REPRESENTACAO || 'Representação');
    const torre = porTorre[String(r.ID_TORRE || '')];
    if (!torre) { erros.push(idRep + ': torre órfã.'); return; }
    try {
      s2610BValidarRepresentacaoRow_(r);
      const nivel = s2610BResolverNivel_(r.ID_NIVEL, r.ID_PLANTA_NIVEL);
      const niveisTorre = s2610BJsonArray_(torre.NIVEIS_ATENDIDOS_JSON);
      if (!niveisTorre.includes(nivel.idNivel)) erros.push(idRep + ': nível ' + nivel.idNivel + ' não declarado pela torre.');
      const key = String(r.ID_TORRE || '') + '|' + nivel.idNivel;
      if (repPorVinculo[key]) erros.push('Mais de uma representação para ' + key + '.');
      repPorVinculo[key] = idRep;
    } catch (e) { erros.push(idRep + ': ' + e.message); }
  });

  // Uma torre ATIVA precisa ter geometria em todos os níveis que declara atender.
  torres.filter(function (t) { return s2610FUpper_(t.STATUS) === 'ATIVA'; }).forEach(function (t) {
    const niveis = s2610BJsonArray_(t.NIVEIS_ATENDIDOS_JSON);
    niveis.forEach(function (n) {
      if (!repPorVinculo[String(t.ID_TORRE || '') + '|' + n]) erros.push(String(t.ID_TORRE || '') + ': falta representação em ' + n + '.');
    });
  });

  const compCodigoPorTorre = {};
  comps.forEach(function (c) {
    const id = String(c.ID_COMPONENTE || 'Componente');
    const torre = porTorre[String(c.ID_TORRE || '')];
    if (!torre) { erros.push(id + ': torre órfã.'); return; }
    try {
      const codigo = s2610BNormalizarCodigo_(c.CODIGO);
      s2610BEnum_(c.TIPO || 'OUTRO', S2610B.TIPOS_COMPONENTE, 'Tipo do componente');
      s2610BEnum_(c.STATUS || 'ATIVA', S2610B.STATUS_ENTIDADE, 'Status do componente');
      const niveis = s2610BNormalizarNiveis_(s2610BJsonArray_(c.NIVEIS_ATENDIDOS_JSON));
      const niveisTorre = s2610BJsonArray_(torre.NIVEIS_ATENDIDOS_JSON);
      const fora = niveis.filter(function (n) { return !niveisTorre.includes(n); });
      if (fora.length) erros.push(id + ': níveis fora da torre: ' + fora.join(', ') + '.');
      const key = String(c.ID_TORRE || '') + '|' + codigo;
      if (compCodigoPorTorre[key]) erros.push('Código de componente duplicado em ' + String(c.ID_TORRE || '') + ': ' + codigo + '.');
      compCodigoPorTorre[key] = id;
    } catch (e) { erros.push(id + ': ' + e.message); }
  });

  return { ok: erros.length === 0, erros: Array.from(new Set(erros)) };
}

function s2610FValidarIdsUnicos_(rows, key, nome, erros) {
  const vistos = {};
  (rows || []).forEach(function (r) {
    const id = String((r && r[key]) || '').trim();
    if (!id) { erros.push(nome + ': registro sem ' + key + '.'); return; }
    if (vistos[id]) erros.push(nome + ': ID duplicado ' + id + '.');
    vistos[id] = true;
  });
}

// -----------------------------------------------------------------------------
// HELPERS DE PUBLICAÇÃO / PERSISTÊNCIA
// -----------------------------------------------------------------------------

function s2610FPublicacaoAtiva_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(S2610F.SHEET_PUBLICACOES);
  if (!sh) return null;
  const row = s240Objects_(sh).find(function (r) {
    return [S2610F.STATUS.RASCUNHO, S2610F.STATUS.EM_VALIDACAO].includes(s2610FUpper_(r.STATUS));
  });
  return row ? s2610FPublicacaoRpc_(row) : null;
}

function s2610FPublicacaoAtual_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(S2610F.SHEET_PUBLICACOES);
  if (!sh) return null;
  const rows = s240Objects_(sh).filter(function (r) { return s2610FUpper_(r.STATUS) === S2610F.STATUS.PUBLICADA; });
  rows.sort(function (a, b) { return new Date(b.PUBLICADO_EM || 0) - new Date(a.PUBLICADO_EM || 0); });
  return rows.length ? s2610FPublicacaoRpc_(rows[0]) : null;
}

function s2610FObterPublicacao_(id) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(S2610F.SHEET_PUBLICACOES);
  if (!sh) throw new Error('Execute setupS2610F() antes.');
  const row = s240Objects_(sh).find(function (r) { return String(r.ID_PUBLICACAO_TORRES || '') === String(id || '').trim(); });
  if (!row) throw new Error('Pacote de publicação de Torres não encontrado.');
  return s2610FPublicacaoRpc_(row);
}

function s2610FAtualizarPublicacao_(id, patch) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(S2610F.SHEET_PUBLICACOES);
  if (!sh) throw new Error('Aba de publicações de Torres ausente.');
  const atual = s240Objects_(sh).find(function (r) { return String(r.ID_PUBLICACAO_TORRES || '') === String(id || ''); });
  if (!atual) throw new Error('Publicação de Torres não encontrada.');
  s240Upsert_(sh, 'ID_PUBLICACAO_TORRES', Object.assign({}, atual, patch || {}));
}

function s2610FPublicacaoRpc_(r) {
  return {
    id: String(r.ID_PUBLICACAO_TORRES || ''),
    versao: String(r.VERSAO || ''),
    titulo: String(r.TITULO || ''),
    status: s2610FUpper_(r.STATUS),
    base: s2610FParseJson_(r.BASE_JSON) || {},
    draft: s2610FParseJson_(r.DRAFT_JSON) || {},
    hashDraft: String(r.HASH_DRAFT || ''),
    criadoEm: s2610FRpcSeguro_(r.CRIADO_EM),
    criadoPor: String(r.CRIADO_POR || ''),
    enviadoValidacaoEm: s2610FRpcSeguro_(r.ENVIADO_VALIDACAO_EM),
    enviadoValidacaoPor: String(r.ENVIADO_VALIDACAO_POR || ''),
    publicadoEm: s2610FRpcSeguro_(r.PUBLICADO_EM),
    publicadoPor: String(r.PUBLICADO_POR || ''),
    arquivadoEm: s2610FRpcSeguro_(r.ARQUIVADO_EM),
    arquivadoPor: String(r.ARQUIVADO_POR || ''),
    motivo: String(r.MOTIVO || ''),
    observacoes: String(r.OBSERVACOES || '')
  };
}

function s2610FProximaVersao_(rows) {
  let maior = 0;
  (rows || []).forEach(function (r) {
    const m = /^T2026\.(\d{2})$/.exec(String(r.VERSAO || '').trim());
    if (m) maior = Math.max(maior, Number(m[1]));
  });
  return 'T2026.' + String(maior + 1).padStart(2, '0');
}

function s2610FNormalizarEstadoParaPublicacao_(estado) {
  const e = s2610FClonar_(estado || {});
  ['torres', 'representacoes', 'componentes'].forEach(function (k) {
    e[k] = Array.isArray(e[k]) ? e[k] : [];
    e[k].forEach(function (r) { r.STATUS_PUBLICACAO = 'PUBLICADA'; });
  });
  e.schema = S2610F.SCHEMA;
  e.publicadoEm = new Date().toISOString();
  return e;
}

function s2610FNormalizarEstadoComoRascunho_(estado) {
  const e = s2610FClonar_(estado || {});
  ['torres', 'representacoes', 'componentes'].forEach(function (k) {
    e[k] = Array.isArray(e[k]) ? e[k] : [];
    e[k].forEach(function (r) { r.STATUS_PUBLICACAO = 'RASCUNHO'; });
  });
  e.schema = S2610F.SCHEMA;
  e.restauradoEm = new Date().toISOString();
  return e;
}

function s2610FRestaurarEstadoTrabalho_(estado, opcoes) {
  opcoes = opcoes || {};
  const val = s2610FValidarEstado_(estado);
  if (!val.ok) throw new Error('Estado de Torres não pode ser restaurado: ' + val.erros.join(' | '));
  const ss = SpreadsheetApp.getActive();
  s2610FRestaurarColecao_(ss, S2610B.SHEET_TORRES, 'ID_TORRE', estado.torres || [], opcoes.statusPublicacao);
  s2610FRestaurarColecao_(ss, S2610B.SHEET_REPRESENTACOES, 'ID_REPRESENTACAO', estado.representacoes || [], opcoes.statusPublicacao);
  s2610FRestaurarColecao_(ss, S2610B.SHEET_COMPONENTES, 'ID_COMPONENTE', estado.componentes || [], opcoes.statusPublicacao);
}

function s2610FRestaurarColecao_(ss, nomeAba, chave, destino, statusPublicacao) {
  const sh = ss.getSheetByName(nomeAba);
  if (!sh) throw new Error('Aba ausente: ' + nomeAba + '.');
  const atuais = s240Objects_(sh);
  const idsDestino = new Set((destino || []).map(function (r) { return String(r[chave] || ''); }));
  const idsAtuais = new Set(atuais.map(function (r) { return String(r[chave] || ''); }));
  const data = sh.getDataRange().getValues();
  const headers = data.length ? data[0].map(String) : [];
  const idx = headers.indexOf(chave);
  if (idx < 0) throw new Error('Coluna ' + chave + ' ausente em ' + nomeAba + '.');

  // Remoção controlada somente no contexto explícito de restauração de snapshot.
  for (let i = data.length - 1; i >= 1; i--) {
    const id = String(data[i][idx] || '');
    if (id && idsAtuais.has(id) && !idsDestino.has(id)) sh.deleteRow(i + 1);
  }
  (destino || []).forEach(function (r) {
    const row = Object.assign({}, r);
    if (statusPublicacao) row.STATUS_PUBLICACAO = statusPublicacao;
    s240Upsert_(sh, chave, row);
  });
}

function s2610FCompararColecao_(antes, depois, chave) {
  const a = {}, b = {};
  (antes || []).forEach(function (r) { a[String(r[chave] || '')] = r; });
  (depois || []).forEach(function (r) { b[String(r[chave] || '')] = r; });
  const adicionados = [], removidos = [], alterados = [], iguais = [];
  Object.keys(b).forEach(function (id) {
    if (!Object.prototype.hasOwnProperty.call(a, id)) adicionados.push(id);
    else if (s2610FStableJson_(a[id]) !== s2610FStableJson_(b[id])) alterados.push(id);
    else iguais.push(id);
  });
  Object.keys(a).forEach(function (id) { if (!Object.prototype.hasOwnProperty.call(b, id)) removidos.push(id); });
  return { adicionados: adicionados, alterados: alterados, removidos: removidos, iguais: iguais };
}

function s2610FResumoEstado_(e) {
  e = e || {};
  return 'torres=' + ((e.torres || []).length) + '; representacoes=' + ((e.representacoes || []).length) + '; componentes=' + ((e.componentes || []).length);
}

function s2610FHashEstado_(estado) {
  const can = {
    torres: (estado && estado.torres || []).map(s2610FCanonRow_).sort(s2610FOrdenarCanon_),
    representacoes: (estado && estado.representacoes || []).map(s2610FCanonRow_).sort(s2610FOrdenarCanon_),
    componentes: (estado && estado.componentes || []).map(s2610FCanonRow_).sort(s2610FOrdenarCanon_)
  };
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(can), Utilities.Charset.UTF_8);
  return digest.map(function (b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0'); }).join('');
}

function s2610FCanonRow_(r) {
  const out = {};
  Object.keys(r || {}).sort().forEach(function (k) {
    // Metadados de modificação não alteram a semântica da publicação.
    if (['ATUALIZADO_EM', 'ATUALIZADO_POR', 'CRIADO_EM', 'CRIADO_POR'].includes(k)) return;
    let v = r[k];
    if (v instanceof Date) v = v.toISOString();
    out[k] = v;
  });
  return out;
}

function s2610FOrdenarCanon_(a, b) { return JSON.stringify(a).localeCompare(JSON.stringify(b)); }
function s2610FStableJson_(v) { return JSON.stringify(s2610FCanonRow_(v || {})); }
function s2610FClonar_(v) { return JSON.parse(JSON.stringify(v == null ? null : v)); }
function s2610FParseJson_(v) { if (v == null || v === '') return null; try { return JSON.parse(String(v)); } catch (_) { return null; } }
function s2610FText_(v) { return String(v == null ? '' : v).trim(); }
function s2610FUpper_(v) { return s2610FText_(v).toUpperCase(); }
function s2610FRpcSeguro_(v) { if (v instanceof Date) return v.toISOString(); return v == null ? '' : String(v); }
function s2610FUsuario_() { try { return Session.getActiveUser().getEmail() || ''; } catch (_) { return ''; } }

function s2610FEvento_(tipo, entidade, entidadeId, nome, antes, depois, motivo) {
  try {
    return s253RegistrarEvento_({ tipoEvento: tipo, entidade: entidade, entidadeId: entidadeId, nome: nome, antes: antes, depois: depois, motivo: motivo, origem: 'WEB_APP' });
  } catch (e) {
    console.error('[S26.10-F][HISTORICO]', e);
    return '';
  }
}

function s2610FAuditoria_(acao, entidade, entidadeId, resultado, detalhes) {
  try {
    registrarAuditoriaS15_({ acao: acao, entidade: entidade, entidadeId: entidadeId, resultado: resultado, origem: 'WEB_APP', detalhes: Object.assign({ fase: S2610F.FASE }, detalhes || {}) });
  } catch (e) { console.error('[S26.10-F][AUDITORIA]', e); }
}

function s2610FHeadersContem_(sh, esperados) {
  const last = Math.max(1, sh.getLastColumn());
  const headers = sh.getRange(1, 1, 1, last).getValues()[0].map(String);
  return (esperados || []).every(function (h) { return headers.includes(h); });
}
function s2610FHeaderResumo_(sh, esperados) {
  const last = Math.max(1, sh.getLastColumn());
  const headers = sh.getRange(1, 1, 1, last).getValues()[0].map(String);
  const n = (esperados || []).filter(function (h) { return headers.includes(h); }).length;
  return n + '/' + (esperados || []).length;
}

// -----------------------------------------------------------------------------
// QA / GATE
// -----------------------------------------------------------------------------

function testeContratosGovernancaTorresS2610F() {
  exigirPermissaoS14_('administrar');
  const checks = [];
  const add = function (nome, ok, detalhe) { checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || '') }); };

  const estado = {
    torres: [{ ID_TORRE: 'TORRE-TQA', CODIGO: 'TQA', NOME: 'Torre QA', TIPO: 'NUCLEO_VERTICAL', NIVEIS_ATENDIDOS_JSON: '["N1"]', STATUS: 'ATIVA', STATUS_PUBLICACAO: 'RASCUNHO' }],
    representacoes: [{ ID_REPRESENTACAO: 'TORRE-TQA-N1', ID_TORRE: 'TORRE-TQA', ID_NIVEL: 'N1', ID_PLANTA_NIVEL: 'PLA-CFF-N1-2025', POLIGONO_JSON: '[{"x":0.1,"y":0.1},{"x":0.2,"y":0.1},{"x":0.2,"y":0.2},{"x":0.1,"y":0.2}]', STATUS: 'ATIVA', STATUS_PUBLICACAO: 'RASCUNHO', VERSAO_GEOMETRIA: 1 }],
    componentes: []
  };
  const v = s2610FValidarEstado_(estado);
  add('S2610F_TEST_ESTADO_VALIDO', v.ok, v.ok ? 'válido' : v.erros.join(' | '));

  const publicado = s2610FNormalizarEstadoParaPublicacao_(estado);
  add('S2610F_TEST_PUBLICACAO_NORMALIZA', publicado.torres[0].STATUS_PUBLICACAO === 'PUBLICADA' && publicado.representacoes[0].STATUS_PUBLICACAO === 'PUBLICADA', 'PUBLICADA');

  const rascunho = s2610FNormalizarEstadoComoRascunho_(publicado);
  add('S2610F_TEST_RESTAURACAO_VIRA_RASCUNHO', rascunho.torres[0].STATUS_PUBLICACAO === 'RASCUNHO', 'RASCUNHO');

  const semRep = s2610FClonar_(estado); semRep.representacoes = [];
  const v2 = s2610FValidarEstado_(semRep);
  add('S2610F_TEST_FALTA_REP_BLOQUEADA', !v2.ok, (v2.erros || []).join(' | '));

  const h1 = s2610FHashEstado_(estado);
  const h2 = s2610FHashEstado_(s2610FClonar_(estado));
  add('S2610F_TEST_HASH_DETERMINISTICO', h1 === h2 && /^[a-f0-9]{64}$/.test(h1), h1 ? 'SHA-256' : 'ausente');

  const base = { torres: [], representacoes: [], componentes: [] };
  const dif = s2610FCompararColecao_(base.torres, estado.torres, 'ID_TORRE');
  add('S2610F_TEST_DIFF_ADICAO', dif.adicionados.length === 1 && dif.adicionados[0] === 'TORRE-TQA', JSON.stringify(dif));

  const falhas = checks.filter(function (c) { return !c.ok; }).length;
  const out = { ok: falhas === 0, gate: falhas === 0 ? 'APTO_PARA_TESTE_FLUXO_REAL' : 'BLOQUEADO', fase: S2610F.FASE, checks: checks, falhas: falhas };
  console.log('[S26.10-F][CONTRATOS] ' + JSON.stringify(out));
  return out;
}

/**
 * Teste não destrutivo sobre o estado real: valida e calcula preview em memória,
 * sem criar publicação e sem mudar status das linhas.
 */
function testeEstadoRealGovernancaTorresS2610F() {
  exigirPermissaoS14_('administrar');
  const estado = s2610FEstadoTrabalhoRaw_();
  const val = s2610FValidarEstado_(estado);
  const atual = s2610FEstadoPublicadoRaw_();
  const diffs = {
    torres: s2610FCompararColecao_(atual.torres || [], estado.torres || [], 'ID_TORRE'),
    representacoes: s2610FCompararColecao_(atual.representacoes || [], estado.representacoes || [], 'ID_REPRESENTACAO'),
    componentes: s2610FCompararColecao_(atual.componentes || [], estado.componentes || [], 'ID_COMPONENTE')
  };
  const totalMudancas = Object.keys(diffs).reduce(function (s, k) { const d = diffs[k]; return s + d.adicionados.length + d.alterados.length + d.removidos.length; }, 0);
  const out = {
    ok: val.ok,
    gate: val.ok ? 'APTO_PARA_PUBLICACAO_CONTROLADA' : 'BLOQUEADO',
    fase: S2610F.FASE,
    resumoTrabalho: s2610FResumoEstado_(estado),
    publicacaoAtual: atual.publicacao,
    totalMudancas: totalMudancas,
    diffs: diffs,
    validacao: val,
    hashTrabalho: s2610FHashEstado_(estado)
  };
  console.log('[S26.10-F][ESTADO-REAL] ' + JSON.stringify(out));
  return out;
}

/**
 * Executar APÓS a primeira publicação real pelo fluxo administrativo.
 * Não grava dados. Prova que resolver D e pacote E leem o snapshot publicado.
 */
function testePublicacaoRealTorresS2610F() {
  exigirPermissaoS14_('administrar');
  const checks = [];
  const add = function (nome, ok, detalhe) { checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || '') }); };
  const pub = s2610FPublicacaoAtual_();
  if (!pub) {
    const out0 = { ok: false, gate: 'AGUARDANDO_PRIMEIRA_PUBLICACAO', fase: S2610F.FASE, checks: [{ nome: 'S2610F_REAL_PUBLICACAO_EXISTE', ok: false, detalhe: 'Nenhuma publicação de Torres.' }], falhas: 1 };
    console.log('[S26.10-F][PUBLICACAO-REAL] ' + JSON.stringify(out0));
    return out0;
  }

  const estado = s2610FEstadoPublicadoRaw_();
  add('S2610F_REAL_PUBLICACAO_EXISTE', !!estado.publicacao, pub.versao);
  add('S2610F_REAL_STATUS_PUBLICADA', (estado.torres || []).every(function (r) { return s2610FUpper_(r.STATUS_PUBLICACAO) === 'PUBLICADA'; }) && (estado.representacoes || []).every(function (r) { return s2610FUpper_(r.STATUS_PUBLICACAO) === 'PUBLICADA'; }), s2610FResumoEstado_(estado));

  let testadas = 0;
  (estado.representacoes || []).forEach(function (r) {
    try {
      const pol = s2610BNormalizarPoligono_(r.POLIGONO_JSON);
      const p = s2610DPontoInternoTeste_(pol);
      if (!p) throw new Error('sem ponto interno de teste');
      const res = appResolverTorreS2610D({ idNivel: r.ID_NIVEL, x: p.x, y: p.y });
      const ok = res && res.resolvido && res.torre && res.torre.idTorre === String(r.ID_TORRE || '');
      add('S2610F_REAL_RESOLVE_' + String(r.ID_REPRESENTACAO || ''), ok, res ? res.motivo + ' • ' + (res.torre && res.torre.idTorre || '') : 'sem resposta');
      testadas++;
    } catch (e) {
      add('S2610F_REAL_RESOLVE_' + String(r.ID_REPRESENTACAO || ''), false, e.message);
    }
  });
  add('S2610F_REAL_REPRESENTACOES_TESTADAS', testadas === (estado.representacoes || []).length && testadas > 0, testadas + '/' + (estado.representacoes || []).length);

  ['N0','N1','N2','N3'].forEach(function (n) {
    try {
      const esperado = (estado.representacoes || []).filter(function (r) { return String(r.ID_NIVEL || '') === n && s2610FUpper_(r.STATUS) === 'ATIVA'; }).length;
      const pacote = appObterPacoteTorresOfflineS2610E(n);
      add('S2610F_REAL_OFFLINE_' + n, (pacote.representacoes || []).length === esperado, 'pacote=' + (pacote.representacoes || []).length + '; esperado=' + esperado);
    } catch (e) { add('S2610F_REAL_OFFLINE_' + n, false, e.message); }
  });

  const falhas = checks.filter(function (c) { return !c.ok; }).length;
  const out = { ok: falhas === 0, gate: falhas === 0 ? 'APTO_PARA_APROVACAO' : 'BLOQUEADO', fase: S2610F.FASE, publicacao: estado.publicacao, checks: checks, falhas: falhas };
  console.log('[S26.10-F][PUBLICACAO-REAL] ' + JSON.stringify(out));
  return out;
}

/**
 * QA de restauração em abas temporárias. Exercita a mesma primitiva usada pela
 * restauração real, inclusive remoção controlada e forcing para RASCUNHO.
 * Não toca nas três abas reais de Torres.
 */
function testeRestauracaoTemporariaTorresS2610F() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const sufixo = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  const nomes = {
    t: '__QA_S2610F_T_' + sufixo,
    r: '__QA_S2610F_R_' + sufixo,
    c: '__QA_S2610F_C_' + sufixo
  };
  const checks = [];
  const add = function (nome, ok, detalhe) { checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || '') }); };
  try {
    s240EnsureSheet_(ss, nomes.t, S2610B_TORRES_HEADERS.slice());
    s240EnsureSheet_(ss, nomes.r, S2610B_REP_HEADERS.slice());
    s240EnsureSheet_(ss, nomes.c, S2610B_COMP_HEADERS.slice());

    const shT = ss.getSheetByName(nomes.t), shR = ss.getSheetByName(nomes.r), shC = ss.getSheetByName(nomes.c);
    s240Upsert_(shT, 'ID_TORRE', { ID_TORRE: 'TORRE-ANTIGA', CODIGO: 'ANTIGA', NOME: 'Antiga QA', TIPO: 'NUCLEO_VERTICAL', NIVEIS_ATENDIDOS_JSON: '["N1"]', STATUS: 'ATIVA', STATUS_PUBLICACAO: 'PUBLICADA' });
    s240Upsert_(shT, 'ID_TORRE', { ID_TORRE: 'TORRE-TQA', CODIGO: 'TQA', NOME: 'Torre QA anterior', TIPO: 'NUCLEO_VERTICAL', NIVEIS_ATENDIDOS_JSON: '["N1"]', STATUS: 'ATIVA', STATUS_PUBLICACAO: 'PUBLICADA' });

    const destinoT = [{ ID_TORRE: 'TORRE-TQA', CODIGO: 'TQA', NOME: 'Torre QA restaurada', TIPO: 'NUCLEO_VERTICAL', NIVEIS_ATENDIDOS_JSON: '["N1"]', STATUS: 'ATIVA', STATUS_PUBLICACAO: 'PUBLICADA' }];
    const destinoR = [{ ID_REPRESENTACAO: 'TORRE-TQA-N1', ID_TORRE: 'TORRE-TQA', ID_NIVEL: 'N1', ID_PLANTA_NIVEL: 'PLA-CFF-N1-2025', POLIGONO_JSON: '[{"x":0.1,"y":0.1},{"x":0.2,"y":0.1},{"x":0.2,"y":0.2},{"x":0.1,"y":0.2}]', STATUS: 'ATIVA', STATUS_PUBLICACAO: 'PUBLICADA', VERSAO_GEOMETRIA: 3 }];
    const destinoC = [{ ID_COMPONENTE: 'TORRE-TQA-COMP-E01', ID_TORRE: 'TORRE-TQA', CODIGO: 'E01', TIPO: 'ELEVADOR_SOCIAL', NOME: 'Elevador QA', NIVEIS_ATENDIDOS_JSON: '["N1"]', STATUS: 'ATIVA', STATUS_PUBLICACAO: 'PUBLICADA' }];

    s2610FRestaurarColecao_(ss, nomes.t, 'ID_TORRE', destinoT, 'RASCUNHO');
    s2610FRestaurarColecao_(ss, nomes.r, 'ID_REPRESENTACAO', destinoR, 'RASCUNHO');
    s2610FRestaurarColecao_(ss, nomes.c, 'ID_COMPONENTE', destinoC, 'RASCUNHO');
    SpreadsheetApp.flush();

    const rt = s240Objects_(shT), rr = s240Objects_(shR), rc = s240Objects_(shC);
    add('S2610F_RESTORE_QA_REMOVE_EXCEDENTE', rt.length === 1 && String(rt[0].ID_TORRE || '') === 'TORRE-TQA', 'torres=' + rt.length);
    add('S2610F_RESTORE_QA_ATUALIZA', rt.length === 1 && String(rt[0].NOME || '') === 'Torre QA restaurada', String(rt[0] && rt[0].NOME || ''));
    add('S2610F_RESTORE_QA_RASCUNHO', [rt, rr, rc].every(function (rows) { return rows.length === 1 && String(rows[0].STATUS_PUBLICACAO || '') === 'RASCUNHO'; }), 'status forçado para RASCUNHO');
    add('S2610F_RESTORE_QA_FILHOS', rr.length === 1 && rc.length === 1, 'reps=' + rr.length + '; comps=' + rc.length);
  } catch (e) {
    add('S2610F_RESTORE_QA_EXECUCAO', false, e.message || String(e));
  } finally {
    Object.keys(nomes).forEach(function (k) {
      try { const sh = ss.getSheetByName(nomes[k]); if (sh) ss.deleteSheet(sh); } catch (_) { }
    });
  }
  const residuos = Object.keys(nomes).filter(function (k) { return !!ss.getSheetByName(nomes[k]); });
  add('S2610F_RESTORE_QA_CLEANUP', residuos.length === 0, residuos.length ? residuos.join(', ') : 'sem abas QA residuais');
  const falhas = checks.filter(function (c) { return !c.ok; }).length;
  const out = { ok: falhas === 0, gate: falhas === 0 ? 'APTO_PARA_APROVACAO_RESTAURACAO' : 'BLOQUEADO', fase: S2610F.FASE, checks: checks, falhas: falhas };
  console.log('[S26.10-F][RESTAURACAO-QA] ' + JSON.stringify(out));
  return out;
}
