/**
 * ============================================================
 * S26.10-R6C — EXECUÇÃO SEGURA DE REMOÇÃO + TOMBSTONES
 * ============================================================
 *
 * Dependências:
 * - ReferenciaCentralS2610R2.gs
 * - ReferenciaCentralS2610R6A_FIX1.gs
 * - ReferenciaCentralS2610R6B.gs
 *
 * Esta etapa implementa a infraestrutura de exclusão física,
 * mas a UI de "Remover" só deve ser liberada após os Gates
 * backend + cache desta própria etapa.
 *
 * Regras:
 * - somente ADMIN;
 * - somente referência INATIVA;
 * - zero dependências reconhecidas ou ambíguas;
 * - revalidação completa sob LockService imediatamente antes;
 * - confirmação explícita pelo ID_REFERENCIA;
 * - snapshot integral antes da exclusão;
 * - ledger REFERENCIAS_REMOVIDAS para rollback/cache;
 * - auditoria antes e depois;
 * - rollback automático se ocorrer falha após deleteRow();
 * - tombstone público mínimo para expurgar caches nos dispositivos;
 * - APP_VERSAO / APP_FASE preservadas.
 */

const S2610R6C = Object.freeze({
  VERSAO: 'S26.10-R6C',
  DIAGNOSTICO: 'S26.10-R6C-EXECUCAO-REMOCAO-SEGURA',
  BASELINE_VERSAO: 'MVP-3.31.0-SINALIZACAO-S26.9',
  BASELINE_FASE: 'S26.9',
  ABA_REFERENCIAS: 'PONTOS_REFERENCIA',
  ABA_REMOVIDAS: 'REFERENCIAS_REMOVIDAS',
  HEADERS_REMOVIDAS: Object.freeze([
    'ID_REMOCAO',
    'ID_REFERENCIA',
    'ID_MAPA_SETOR',
    'NOME',
    'X_NORMALIZADO',
    'Y_NORMALIZADO',
    'REMOVIDO_EM',
    'REMOVIDO_POR',
    'MOTIVO',
    'STATUS',
    'LINHA_ORIGINAL',
    'SNAPSHOT_JSON'
  ])
});


function s2610R6CTexto_(valor) {
  return String(valor == null ? '' : valor).trim();
}


function s2610R6CConfig_(ss) {
  const sh = ss.getSheetByName('CONFIG');
  const out = {};

  if (!sh || sh.getLastRow() < 2) return out;

  sh.getRange(2, 1, sh.getLastRow() - 1, 2)
    .getValues()
    .forEach(function(row) {
      const k = s2610R6CTexto_(row[0]);
      if (k) out[k] = s2610R6CTexto_(row[1]);
    });

  return out;
}


function s2610R6CValidarBaselineSetup_(ss) {
  const cfg = s2610R6CConfig_(ss);

  if (
    cfg.APP_VERSAO !== S2610R6C.BASELINE_VERSAO ||
    cfg.APP_FASE !== S2610R6C.BASELINE_FASE
  ) {
    throw new Error(
      'S26.10-R6C bloqueado: baseline inesperada. ' +
      (cfg.APP_VERSAO || 'sem versão') + ' / ' +
      (cfg.APP_FASE || 'sem fase')
    );
  }

  if (
    typeof APP !== 'undefined' &&
    (
      APP.VERSAO !== S2610R6C.BASELINE_VERSAO ||
      APP.FASE !== S2610R6C.BASELINE_FASE
    )
  ) {
    throw new Error(
      'S26.10-R6C bloqueado: runtime APP não corresponde à baseline S26.9.'
    );
  }

  return cfg;
}


function s2610R6CValidarOperacao_(ss) {
  return s2610ValidarOperacao_(
    s2610R6CConfig_(ss),
    'S26.10-R6C'
  );
}


function s2610R6CExigirAdmin_() {
  if (typeof exigirPermissaoS14_ !== 'function') {
    throw new Error('S26.10-R6C: permissão S14 indisponível.');
  }

  return exigirPermissaoS14_('administrar');
}


function s2610R6CExigirDependencias_() {
  if (
    typeof appAnalisarDependenciasReferenciasS2610R6AFix1 !== 'function'
  ) {
    throw new Error(
      'S26.10-R6C exige ReferenciaCentralS2610R6A_FIX1.gs.'
    );
  }

  if (
    typeof appAvaliarRemocaoReferenciaS2610R6B !== 'function'
  ) {
    throw new Error(
      'S26.10-R6C exige ReferenciaCentralS2610R6B.gs.'
    );
  }

  if (typeof registrarAuditoriaS15_ !== 'function') {
    throw new Error(
      'S26.10-R6C exige auditoria S15.'
    );
  }
}


function s2610R6CUsuario_(sessao) {
  sessao = sessao || {};
  let email = s2610R6CTexto_(
    sessao.email || sessao.usuarioEmail || ''
  );

  if (!email) {
    try {
      email = s2610R6CTexto_(
        Session.getActiveUser().getEmail()
      );
    } catch (_) {}
  }

  if (!email) {
    try {
      email = s2610R6CTexto_(
        Session.getEffectiveUser().getEmail()
      );
    } catch (_) {}
  }

  return {
    email: email || 'APPS_SCRIPT',
    nome: s2610R6CTexto_(
      sessao.nome || email || 'Administrador'
    ),
    perfil: s2610R6CTexto_(
      sessao.perfil || 'ADMIN'
    ).toUpperCase()
  };
}


function s2610R6CHeaders_(sh) {
  if (!sh || sh.getLastColumn() < 1) return [];

  return sh
    .getRange(1, 1, 1, sh.getLastColumn())
    .getValues()[0]
    .map(function(v) {
      return s2610R6CTexto_(v);
    });
}


function s2610R6CValidarHeaders_(sh, esperados) {
  const headers = s2610R6CHeaders_(sh);
  const ausentes = esperados.filter(function(h) {
    return headers.indexOf(h) < 0;
  });

  if (ausentes.length) {
    throw new Error(
      'Estrutura inválida em ' + sh.getName() +
      '. Coluna(s) ausente(s): ' + ausentes.join(', ')
    );
  }

  return headers;
}


function s2610R6CLocalizarReferencia_(sh, idReferencia) {
  const id = s2610R6CTexto_(idReferencia);

  if (!id) {
    throw new Error('ID_REFERENCIA não informado.');
  }

  const headers = s2610R6CHeaders_(sh);
  const idxId = headers.indexOf('ID_REFERENCIA');

  if (idxId < 0) {
    throw new Error('PONTOS_REFERENCIA sem ID_REFERENCIA.');
  }

  if (sh.getLastRow() < 2) {
    throw new Error('Referência não encontrada: ' + id);
  }

  const rows = sh
    .getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn())
    .getValues();

  for (let i = 0; i < rows.length; i++) {
    if (s2610R6CTexto_(rows[i][idxId]) === id) {
      const obj = {};
      headers.forEach(function(h, j) {
        if (h) obj[h] = rows[i][j];
      });

      return {
        linha: i + 2,
        headers: headers,
        valores: rows[i].slice(),
        objeto: obj
      };
    }
  }

  throw new Error('Referência não encontrada: ' + id);
}


function s2610R6CEhAtiva_(obj) {
  const v = s2610R6CTexto_(obj.ATIVO || 'SIM').toUpperCase();

  return !(
    v === 'NAO' ||
    v === 'NÃO' ||
    v === 'FALSE' ||
    v === '0' ||
    v === 'INATIVA' ||
    v === 'INATIVO'
  );
}


function s2610R6CAbaRemovidas_(ss, criar) {
  let sh = ss.getSheetByName(S2610R6C.ABA_REMOVIDAS);

  if (!sh && criar) {
    sh = ss.insertSheet(S2610R6C.ABA_REMOVIDAS);

    sh.getRange(
      1,
      1,
      1,
      S2610R6C.HEADERS_REMOVIDAS.length
    ).setValues([
      Array.from(S2610R6C.HEADERS_REMOVIDAS)
    ]);

    sh.setFrozenRows(1);
  }

  if (sh) {
    s2610R6CValidarHeaders_(
      sh,
      Array.from(S2610R6C.HEADERS_REMOVIDAS)
    );
  }

  return sh;
}


function s2610R6CAppendTombstone_(sh, dados) {
  const headers = s2610R6CHeaders_(sh);
  const row = headers.map(function(h) {
    return Object.prototype.hasOwnProperty.call(dados, h)
      ? dados[h]
      : '';
  });

  sh.appendRow(row);

  return sh.getLastRow();
}


function s2610R6CAtualizarStatusTombstone_(sh, linha, status) {
  const headers = s2610R6CHeaders_(sh);
  const idx = headers.indexOf('STATUS');

  if (idx < 0) {
    throw new Error('REFERENCIAS_REMOVIDAS sem STATUS.');
  }

  sh.getRange(linha, idx + 1).setValue(status);
}


function s2610R6CRestaurarLinha_(sh, linhaOriginal, valores) {
  const linha = Number(linhaOriginal);

  if (!Number.isFinite(linha) || linha < 2) {
    throw new Error('Linha original inválida para rollback.');
  }

  /*
   * Normalmente deleteRow() apenas desloca as linhas e a linha original
   * continua disponível. Se for necessário, ampliamos a grade.
   */
  if (linha > sh.getMaxRows()) {
    sh.insertRowsAfter(
      sh.getMaxRows(),
      linha - sh.getMaxRows()
    );
  }

  sh.insertRowBefore(linha);

  sh.getRange(
    linha,
    1,
    1,
    valores.length
  ).setValues([valores]);
}


function setupS2610R6C() {
  const sessao = s2610R6CExigirAdmin_();
  s2610R6CExigirDependencias_();

  const ss = SpreadsheetApp.getActive();
  s2610R6CValidarBaselineSetup_(ss);

  const existente = !!ss.getSheetByName(
    S2610R6C.ABA_REMOVIDAS
  );

  const sh = s2610R6CAbaRemovidas_(ss, true);

  SpreadsheetApp.flush();

  const out = {
    ok: true,
    fase: S2610R6C.VERSAO,
    aba: sh.getName(),
    criadaAgora: !existente,
    headers: Array.from(S2610R6C.HEADERS_REMOVIDAS),
    usuario: s2610R6CUsuario_(sessao),
    alterouEstrutura: !existente,
    alterouReferencias: false
  };

  console.log(
    '[S26.10-R6C][SETUP] ' + JSON.stringify(out)
  );

  return out;
}


/**
 * Endpoint mínimo para sincronização de cache.
 * Não expõe SNAPSHOT_JSON, usuário ou motivo.
 *
 * Pode ser chamado por perfis operacionais porque tombstones
 * não contêm dados sensíveis; são apenas instruções de expurgo.
 */
function appListarTombstonesReferenciasS2610R6C() {
  const ss = SpreadsheetApp.getActive();
  s2610R6CValidarOperacao_(ss);

  const sh = s2610R6CAbaRemovidas_(ss, false);

  if (!sh || sh.getLastRow() < 2) {
    return {
      ok: true,
      fase: S2610R6C.VERSAO,
      tombstones: []
    };
  }

  const headers = s2610R6CHeaders_(sh);
  const valores = sh
    .getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn())
    .getValues();

  const tombstones = [];

  valores.forEach(function(row) {
    const obj = {};

    headers.forEach(function(h, i) {
      if (h) obj[h] = row[i];
    });

    if (
      s2610R6CTexto_(obj.STATUS).toUpperCase() !== 'REMOVIDA'
    ) {
      return;
    }

    tombstones.push({
      idRemocao: s2610R6CTexto_(obj.ID_REMOCAO),
      idReferencia: s2610R6CTexto_(obj.ID_REFERENCIA),
      idMapaSetor: s2610R6CTexto_(obj.ID_MAPA_SETOR),
      nome: s2610R6CTexto_(obj.NOME),
      x: Number(obj.X_NORMALIZADO),
      y: Number(obj.Y_NORMALIZADO),
      removidoEm:
        obj.REMOVIDO_EM instanceof Date
          ? obj.REMOVIDO_EM.toISOString()
          : s2610R6CTexto_(obj.REMOVIDO_EM)
    });
  });

  return {
    ok: true,
    fase: S2610R6C.VERSAO,
    tombstones: tombstones
  };
}


/**
 * Executa remoção física somente quando todas as travas passam.
 *
 * payload:
 * {
 *   idReferencia,
 *   confirmacaoId,  // deve ser exatamente o ID
 *   motivo,
 *   dryRun
 * }
 */
function appRemoverReferenciaS2610R6C(payload) {
  payload = payload || {};

  const sessao = s2610R6CExigirAdmin_();
  s2610R6CExigirDependencias_();

  const ss = SpreadsheetApp.getActive();
  s2610R6CValidarOperacao_(ss);

  const idReferencia =
    s2610R6CTexto_(payload.idReferencia);

  const confirmacaoId =
    s2610R6CTexto_(payload.confirmacaoId);

  const motivo =
    s2610R6CTexto_(payload.motivo) ||
    'Remoção administrativa pela Central de Referências.';

  if (!idReferencia) {
    throw new Error('Informe ID_REFERENCIA.');
  }

  if (confirmacaoId !== idReferencia) {
    throw new Error(
      'Confirmação inválida. Digite/confirme exatamente o ID_REFERENCIA.'
    );
  }

  /*
   * Pré-avaliação fora do lock para feedback rápido.
   * A mesma avaliação é repetida sob lock antes do deleteRow().
   */
  const previa =
    appAvaliarRemocaoReferenciaS2610R6B(idReferencia);

  if (previa.decisao !== 'CANDIDATA_REMOCAO_FISICA_R6C') {
    return {
      ok: false,
      bloqueada: true,
      fase: S2610R6C.VERSAO,
      idReferencia: idReferencia,
      decisao: previa.decisao,
      motivos: previa.motivos || [],
      alterouDados: false
    };
  }

  if (payload.dryRun === true) {
    return {
      ok: true,
      dryRun: true,
      fase: S2610R6C.VERSAO,
      idReferencia: idReferencia,
      decisao: previa.decisao,
      prontoParaRemover: true,
      cacheInvalidationRequired: true,
      alterouDados: false
    };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  let deletou = false;
  let tombstoneRow = 0;
  let linhaOriginal = 0;
  let valoresOriginais = null;
  let shReferencias = null;
  let shRemovidas = null;

  try {
    /*
     * Revalidação SOB LOCK.
     */
    const reanalise =
      appAnalisarDependenciasReferenciasS2610R6AFix1();

    const dep = reanalise.referencias.find(function(item) {
      return (
        s2610R6CTexto_(item.idReferencia) === idReferencia
      );
    });

    if (!dep) {
      throw new Error(
        'Referência não localizada no inventário R6A sob lock.'
      );
    }

    if (Number(dep.totalUsos || 0) > 0) {
      throw new Error(
        'Remoção bloqueada: surgiram dependências antes da exclusão.'
      );
    }

    shReferencias = ss.getSheetByName(
      S2610R6C.ABA_REFERENCIAS
    );

    if (!shReferencias) {
      throw new Error('PONTOS_REFERENCIA não encontrada.');
    }

    const local =
      s2610R6CLocalizarReferencia_(
        shReferencias,
        idReferencia
      );

    if (s2610R6CEhAtiva_(local.objeto)) {
      throw new Error(
        'Remoção bloqueada: referência voltou a ficar ativa.'
      );
    }

    linhaOriginal = local.linha;
    valoresOriginais = local.valores.slice();

    shRemovidas =
      s2610R6CAbaRemovidas_(ss, false);

    if (!shRemovidas) {
      throw new Error(
        'Execute setupS2610R6C() antes da primeira remoção.'
      );
    }

    const user = s2610R6CUsuario_(sessao);
    const agora = new Date();

    const idRemocao =
      'RREF-' +
      Utilities.formatDate(
        agora,
        APP.TIMEZONE || 'America/Fortaleza',
        'yyyyMMddHHmmss'
      ) +
      '-' +
      Utilities.getUuid()
        .replace(/-/g, '')
        .substring(0, 8)
        .toUpperCase();

    const snapshot = {};
    local.headers.forEach(function(h, i) {
      if (h) snapshot[h] = local.valores[i];
    });

    /*
     * 1) Snapshot/tombstone ANTES de deleteRow().
     */
    tombstoneRow =
      s2610R6CAppendTombstone_(
        shRemovidas,
        {
          ID_REMOCAO: idRemocao,
          ID_REFERENCIA: idReferencia,
          ID_MAPA_SETOR:
            s2610R6CTexto_(local.objeto.ID_MAPA_SETOR),
          NOME:
            s2610R6CTexto_(local.objeto.NOME),
          X_NORMALIZADO:
            Number(local.objeto.X_NORMALIZADO),
          Y_NORMALIZADO:
            Number(local.objeto.Y_NORMALIZADO),
          REMOVIDO_EM: agora,
          REMOVIDO_POR: user.email,
          MOTIVO: motivo,
          STATUS: 'PREPARADA',
          LINHA_ORIGINAL: linhaOriginal,
          SNAPSHOT_JSON: JSON.stringify(snapshot)
        }
      );

    /*
     * 2) Auditoria PREPARADA. Se a auditoria lançar erro,
     *    a linha operacional ainda existe e nada é perdido.
     */
    registrarAuditoriaS15_({
      acao: 'REFERENCIA_CENTRAL_REMOCAO_PREPARADA',
      entidade: 'PONTO_REFERENCIA',
      entidadeId: idReferencia,
      resultado: 'PREPARADA',
      origem: 'WEB_APP',
      usuarioEmail: user.email,
      usuarioNome: user.nome,
      perfil: user.perfil,
      valorAnterior: snapshot,
      detalhes: {
        fase: S2610R6C.VERSAO,
        idRemocao: idRemocao,
        motivo: motivo,
        linhaOriginal: linhaOriginal,
        totalDependenciasRevalidadas: Number(dep.totalUsos || 0)
      }
    });

    /*
     * 3) Exclusão física da entidade operacional.
     */
    shReferencias.deleteRow(linhaOriginal);
    deletou = true;

    /*
     * 4) Fecha o tombstone.
     */
    s2610R6CAtualizarStatusTombstone_(
      shRemovidas,
      tombstoneRow,
      'REMOVIDA'
    );

    /*
     * 5) Auditoria final.
     */
    registrarAuditoriaS15_({
      acao: 'REFERENCIA_CENTRAL_REMOVIDA',
      entidade: 'PONTO_REFERENCIA',
      entidadeId: idReferencia,
      resultado: 'SUCESSO',
      origem: 'WEB_APP',
      usuarioEmail: user.email,
      usuarioNome: user.nome,
      perfil: user.perfil,
      valorAnterior: snapshot,
      detalhes: {
        fase: S2610R6C.VERSAO,
        idRemocao: idRemocao,
        motivo: motivo,
        cacheInvalidationRequired: true
      }
    });

    SpreadsheetApp.flush();

    return {
      ok: true,
      fase: S2610R6C.VERSAO,
      idRemocao: idRemocao,
      idReferencia: idReferencia,
      idMapaSetor:
        s2610R6CTexto_(local.objeto.ID_MAPA_SETOR),
      nome:
        s2610R6CTexto_(local.objeto.NOME),
      x: Number(local.objeto.X_NORMALIZADO),
      y: Number(local.objeto.Y_NORMALIZADO),
      removidaFisicamente: true,
      dependenciasNoMomentoDaRemocao: 0,
      cacheInvalidationRequired: true,
      tombstone: {
        idRemocao: idRemocao,
        idReferencia: idReferencia,
        idMapaSetor:
          s2610R6CTexto_(local.objeto.ID_MAPA_SETOR),
        nome:
          s2610R6CTexto_(local.objeto.NOME),
        x: Number(local.objeto.X_NORMALIZADO),
        y: Number(local.objeto.Y_NORMALIZADO),
        removidoEm: agora.toISOString()
      }
    };

  } catch (e) {
    /*
     * Se algo falhar DEPOIS de deleteRow(), restaura a referência
     * automaticamente usando o snapshot integral.
     */
    if (
      deletou &&
      shReferencias &&
      valoresOriginais
    ) {
      try {
        s2610R6CRestaurarLinha_(
          shReferencias,
          linhaOriginal,
          valoresOriginais
        );

        if (shRemovidas && tombstoneRow) {
          s2610R6CAtualizarStatusTombstone_(
            shRemovidas,
            tombstoneRow,
            'ROLLBACK_AUTOMATICO'
          );
        }

        SpreadsheetApp.flush();

        try {
          registrarAuditoriaS15_({
            acao: 'REFERENCIA_CENTRAL_REMOCAO_ROLLBACK',
            entidade: 'PONTO_REFERENCIA',
            entidadeId: idReferencia,
            resultado: 'ROLLBACK',
            origem: 'WEB_APP',
            detalhes: {
              fase: S2610R6C.VERSAO,
              erroOriginal: e.message || String(e)
            }
          });
        } catch (_) {}

      } catch (rollbackErr) {
        console.error(
          '[S26.10-R6C] FALHA CRÍTICA NO ROLLBACK',
          rollbackErr
        );
      }
    } else if (shRemovidas && tombstoneRow) {
      try {
        s2610R6CAtualizarStatusTombstone_(
          shRemovidas,
          tombstoneRow,
          'NAO_REMOVIDA'
        );
      } catch (_) {}
    }

    throw e;

  } finally {
    lock.releaseLock();
  }
}


/**
 * ============================================================
 * GATE BACKEND R6C
 * ============================================================
 *
 * Não remove nada.
 */
function diagnosticoS2610R6C() {
  const checks = [];

  function add(nome, ok, detalhe) {
    checks.push({
      nome: nome,
      ok: !!ok,
      detalhe: String(
        detalhe == null ? '' : detalhe
      )
    });
  }

  const ss = SpreadsheetApp.getActive();
  const cfg = s2610R6CConfig_(ss);

  add(
    'BASELINE_VERSAO',
    cfg.APP_VERSAO === S2610R6C.BASELINE_VERSAO,
    cfg.APP_VERSAO || 'ausente'
  );

  add(
    'BASELINE_FASE',
    cfg.APP_FASE === S2610R6C.BASELINE_FASE,
    cfg.APP_FASE || 'ausente'
  );

  add(
    'DEP_R6A_FIX1',
    typeof appAnalisarDependenciasReferenciasS2610R6AFix1 ===
      'function',
    'appAnalisarDependenciasReferenciasS2610R6AFix1'
  );

  add(
    'DEP_R6B',
    typeof appAvaliarRemocaoReferenciaS2610R6B ===
      'function',
    'appAvaliarRemocaoReferenciaS2610R6B'
  );

  add(
    'DEP_AUDITORIA',
    typeof registrarAuditoriaS15_ === 'function',
    'registrarAuditoriaS15_'
  );

  add(
    'ABA_TOMBSTONES',
    !!ss.getSheetByName(S2610R6C.ABA_REMOVIDAS),
    S2610R6C.ABA_REMOVIDAS
  );

  let headersOk = false;
  let headersDetalhe = '';

  try {
    const sh = s2610R6CAbaRemovidas_(ss, false);
    if (sh) {
      s2610R6CValidarHeaders_(
        sh,
        Array.from(S2610R6C.HEADERS_REMOVIDAS)
      );
      headersOk = true;
      headersDetalhe =
        S2610R6C.HEADERS_REMOVIDAS.length + ' coluna(s)';
    }
  } catch (e) {
    headersDetalhe = e.message || String(e);
  }

  add(
    'ESTRUTURA_TOMBSTONES',
    headersOk,
    headersDetalhe
  );

  add(
    'API_REMOVER_R6C',
    typeof appRemoverReferenciaS2610R6C === 'function',
    'appRemoverReferenciaS2610R6C'
  );

  add(
    'API_LISTAR_TOMBSTONES',
    typeof appListarTombstonesReferenciasS2610R6C ===
      'function',
    'appListarTombstonesReferenciasS2610R6C'
  );

  /*
   * Caso ativo sem dependência: deve ser BLOQUEADO.
   */
  let ativo = null;
  let erroAtivo = '';

  try {
    ativo = appRemoverReferenciaS2610R6C({
      idReferencia: 'REF-20260828113557-07AAEA07',
      confirmacaoId: 'REF-20260828113557-07AAEA07',
      dryRun: true
    });
  } catch (e) {
    erroAtivo = e.message || String(e);
  }

  add(
    'ATIVA_NAO_PODE_REMOVER',
    !!(
      ativo &&
      ativo.ok === false &&
      ativo.bloqueada &&
      ativo.decisao === 'BLOQUEADA_ENQUANTO_ATIVA'
    ),
    ativo ? ativo.decisao : erroAtivo
  );

  /*
   * Caso histórico: deve continuar bloqueado.
   */
  let historica = null;
  let erroHistorica = '';

  try {
    historica = appRemoverReferenciaS2610R6C({
      idReferencia: 'REF-20260801095223-1AD502B2',
      confirmacaoId: 'REF-20260801095223-1AD502B2',
      dryRun: true
    });
  } catch (e) {
    erroHistorica = e.message || String(e);
  }

  add(
    'HISTORICA_NAO_PODE_REMOVER',
    !!(
      historica &&
      historica.ok === false &&
      historica.bloqueada &&
      historica.decisao === 'BLOQUEADA_POR_DEPENDENCIA'
    ),
    historica ? historica.decisao : erroHistorica
  );

  let tomb = null;
  let erroTomb = '';

  try {
    tomb = appListarTombstonesReferenciasS2610R6C();
  } catch (e) {
    erroTomb = e.message || String(e);
  }

  add(
    'TOMBSTONES_EXECUCAO_REAL',
    !!(
      tomb &&
      tomb.ok &&
      Array.isArray(tomb.tombstones)
    ),
    tomb
      ? tomb.tombstones.length + ' tombstone(s)'
      : erroTomb
  );

  const refsAntes =
    ss.getSheetByName(S2610R6C.ABA_REFERENCIAS)
      .getLastRow() - 1;

  const falhas = checks.filter(function(c) {
    return !c.ok;
  });

  const out = {
    ok: falhas.length === 0,
    diagnostico: S2610R6C.DIAGNOSTICO,
    fase: S2610R6C.VERSAO,
    totalChecks: checks.length,
    falhas: falhas.length,
    checks: checks,
    referencias: refsAntes,
    alterouReferenciasNoGate: false,
    gate:
      falhas.length === 0
        ? 'APTO_PARA_GATE_CACHE_R6C'
        : 'BLOQUEADO',
    proximaEtapa:
      'S26.10-R6C-GATE-CACHE-E-FUNCIONAL'
  };

  console.log(
    '[S26.10-R6C] ' + JSON.stringify(out)
  );

  return out;
}
