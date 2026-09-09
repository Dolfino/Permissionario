/**
 * ============================================================
 * S26.10-R6B — POLÍTICA DE REMOÇÃO SEGURA DE REFERÊNCIAS
 * ============================================================
 *
 * SOMENTE LEITURA / DECISÃO.
 *
 * Dependências:
 * - ReferenciaCentralS2610R2.gs
 * - ReferenciaCentralS2610R6A_FIX1.gs
 *
 * Política:
 * 1. Referência com qualquer dependência reconhecida/ambígua:
 *    NUNCA pode ser removida fisicamente.
 *    Pode apenas ser desativada.
 *
 * 2. Referência sem dependências, porém ATIVA:
 *    não pode ser removida.
 *    Deve ser desativada primeiro.
 *
 * 3. Referência sem dependências e INATIVA:
 *    torna-se candidata à remoção física futura.
 *
 * 4. R6B NÃO cria API de exclusão e NÃO altera dados.
 *    A execução física será isolada em R6C, com nova checagem sob lock,
 *    auditoria e tratamento do cache/offline.
 *
 * Baseline preservada:
 * APP_VERSAO = MVP-3.31.0-SINALIZACAO-S26.9
 * APP_FASE   = S26.9
 */

const S2610R6B = Object.freeze({
  VERSAO: 'S26.10-R6B',
  DIAGNOSTICO: 'S26.10-R6B-POLITICA-REMOCAO-SEGURA',
  BASELINE_VERSAO: 'MVP-3.31.0-SINALIZACAO-S26.9',
  BASELINE_FASE: 'S26.9'
});


function s2610R6BTexto_(valor) {
  return String(valor == null ? '' : valor).trim();
}


function s2610R6BConfig_(ss) {
  const sh = ss.getSheetByName('CONFIG');
  const out = {};

  if (!sh || sh.getLastRow() < 2) {
    return out;
  }

  sh.getRange(
    2,
    1,
    sh.getLastRow() - 1,
    2
  )
    .getValues()
    .forEach(function(row) {
      const k = s2610R6BTexto_(row[0]);

      if (k) {
        out[k] = s2610R6BTexto_(row[1]);
      }
    });

  return out;
}


function s2610R6BValidarOperacao_(ss) {
  return s2610ValidarOperacao_(
    s2610R6BConfig_(ss),
    'S26.10-R6B'
  );
}


function s2610R6BExigirAdmin_() {
  if (typeof exigirPermissaoS14_ !== 'function') {
    throw new Error('S26.10-R6B: permissão S14 indisponível.');
  }

  return exigirPermissaoS14_('administrar');
}


function s2610R6BDependencias_() {
  if (
    typeof appAnalisarDependenciasReferenciasS2610R6AFix1 !==
    'function'
  ) {
    throw new Error(
      'S26.10-R6B exige ReferenciaCentralS2610R6A_FIX1.gs.'
    );
  }

  return appAnalisarDependenciasReferenciasS2610R6AFix1();
}


function s2610R6BObterReferencia_(idReferencia) {
  if (typeof appObterReferenciaS2610R2 !== 'function') {
    throw new Error(
      'S26.10-R6B exige appObterReferenciaS2610R2().'
    );
  }

  const resposta =
    appObterReferenciaS2610R2(
      s2610R6BTexto_(idReferencia)
    );

  if (!resposta || !resposta.ok || !resposta.referencia) {
    throw new Error(
      'Referência não encontrada: ' +
      s2610R6BTexto_(idReferencia)
    );
  }

  return resposta.referencia;
}


/**
 * Avalia uma referência individual segundo a política R6B.
 * Não altera nenhuma célula.
 */
function appAvaliarRemocaoReferenciaS2610R6B(idReferencia) {
  s2610R6BExigirAdmin_();

  const ss = SpreadsheetApp.getActive();
  s2610R6BValidarOperacao_(ss);

  const id = s2610R6BTexto_(idReferencia);

  if (!id) {
    throw new Error('Informe o ID da referência.');
  }

  const ref = s2610R6BObterReferencia_(id);
  const analise = s2610R6BDependencias_();

  const dep =
    analise.referencias.find(function(item) {
      return (
        s2610R6BTexto_(item.idReferencia) === id
      );
    });

  if (!dep) {
    throw new Error(
      'Referência não apareceu no inventário R6A FIX1: ' + id
    );
  }

  const ativa = ref.ativo === true;
  const totalUsosDiretos = Number(dep.totalUsosDiretos || 0);
  const totalUsosAmbiguos = Number(dep.totalUsosAmbiguos || 0);
  const totalUsos = Number(dep.totalUsos || 0);

  const motivos = [];
  let decisao = '';

  if (totalUsos > 0) {
    decisao = 'BLOQUEADA_POR_DEPENDENCIA';

    motivos.push(
      'A referência possui vínculo histórico e não pode ser removida fisicamente.'
    );
  } else if (ativa) {
    decisao = 'BLOQUEADA_ENQUANTO_ATIVA';

    motivos.push(
      'A referência não possui dependências, mas precisa ser desativada antes de qualquer remoção física.'
    );
  } else {
    decisao = 'CANDIDATA_REMOCAO_FISICA_R6C';

    motivos.push(
      'A referência está inativa e não possui dependências reconhecidas ou ambíguas.'
    );
  }

  return {
    ok: true,
    fase: S2610R6B.VERSAO,
    idReferencia: id,
    nome: ref.nome || '',
    ativo: ativa,
    dependencia: {
      classificacaoR6A: dep.classificacao,
      totalUsos: totalUsos,
      totalUsosDiretos: totalUsosDiretos,
      totalUsosAmbiguos: totalUsosAmbiguos,
      usosDiretos: dep.usosDiretos || [],
      usosAmbiguos: dep.usosAmbiguos || []
    },
    decisao: decisao,
    motivos: motivos,
    capacidades: {
      desativar: ativa,
      reativar: !ativa,
      removerFisicamenteAgora: false,
      candidatoR6C:
        decisao === 'CANDIDATA_REMOCAO_FISICA_R6C'
    },
    politica: {
      dependenciaBloqueiaExclusao: true,
      ativoBloqueiaExclusao: true,
      exigeInativaSemDependencias: true,
      revalidarSobLockAntesExcluir: true,
      auditoriaObrigatoria: true,
      invalidacaoCacheObrigatoria: true
    },
    alterouDados: false
  };
}


/**
 * Retorna a visão consolidada da política.
 * Não altera nenhuma célula.
 */
function appResumoPoliticaRemocaoReferenciasS2610R6B() {
  s2610R6BExigirAdmin_();

  const ss = SpreadsheetApp.getActive();
  const cfg = s2610R6BValidarOperacao_(ss);
  const analise = s2610R6BDependencias_();

  const itens = analise.referencias.map(function(dep) {
    const id = dep.idReferencia;
    const ativa = dep.ativo === true;
    const totalUsos = Number(dep.totalUsos || 0);

    let decisao = '';

    if (totalUsos > 0) {
      decisao = 'BLOQUEADA_POR_DEPENDENCIA';
    } else if (ativa) {
      decisao = 'BLOQUEADA_ENQUANTO_ATIVA';
    } else {
      decisao = 'CANDIDATA_REMOCAO_FISICA_R6C';
    }

    return {
      idReferencia: id,
      nome: dep.nome || '',
      ativo: ativa,
      totalUsos: totalUsos,
      totalUsosDiretos: Number(dep.totalUsosDiretos || 0),
      totalUsosAmbiguos: Number(dep.totalUsosAmbiguos || 0),
      decisao: decisao
    };
  });

  const porDecisao = {
    BLOQUEADA_POR_DEPENDENCIA: 0,
    BLOQUEADA_ENQUANTO_ATIVA: 0,
    CANDIDATA_REMOCAO_FISICA_R6C: 0
  };

  itens.forEach(function(item) {
    porDecisao[item.decisao]++;
  });

  return {
    ok: true,
    fase: S2610R6B.VERSAO,
    baseline: {
      appVersao: cfg.APP_VERSAO,
      appFase: cfg.APP_FASE
    },
    inventario: {
      referencias: itens.length,
      bloqueadasPorDependencia:
        porDecisao.BLOQUEADA_POR_DEPENDENCIA,
      bloqueadasEnquantoAtivas:
        porDecisao.BLOQUEADA_ENQUANTO_ATIVA,
      candidatasR6C:
        porDecisao.CANDIDATA_REMOCAO_FISICA_R6C,
      legadosNaoVinculados:
        Number(
          analise.inventario.legadosNaoVinculados || 0
        ),
      idsDesconhecidos:
        Number(
          analise.inventario.idsDesconhecidos || 0
        )
    },
    referencias: itens,
    politica: {
      dependente:
        'NUNCA_REMOVER_FISICAMENTE',
      semDependenciaAtiva:
        'DESATIVAR_PRIMEIRO',
      semDependenciaInativa:
        'CANDIDATA_R6C',
      revalidarSobLockAntesExcluir: true,
      auditoriaObrigatoria: true,
      invalidacaoCacheObrigatoria: true
    },
    alterouDados: false
  };
}


/**
 * ============================================================
 * GATE R6B
 * ============================================================
 *
 * Somente leitura.
 */
function diagnosticoS2610R6B() {
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
  const cfg = s2610R6BConfig_(ss);

  add(
    'BASELINE_VERSAO',
    cfg.APP_VERSAO === S2610R6B.BASELINE_VERSAO,
    cfg.APP_VERSAO || 'ausente'
  );

  add(
    'BASELINE_FASE',
    cfg.APP_FASE === S2610R6B.BASELINE_FASE,
    cfg.APP_FASE || 'ausente'
  );

  add(
    'DEP_R2_OBTER',
    typeof appObterReferenciaS2610R2 === 'function',
    'appObterReferenciaS2610R2'
  );

  add(
    'DEP_R6A_FIX1',
    typeof appAnalisarDependenciasReferenciasS2610R6AFix1 ===
      'function',
    'appAnalisarDependenciasReferenciasS2610R6AFix1'
  );

  add(
    'PERMISSAO_S14',
    typeof exigirPermissaoS14_ === 'function',
    'exigirPermissaoS14_'
  );

  add(
    'SEM_API_EXCLUSAO_R6B',
    typeof appRemoverReferenciaS2610R6C === 'undefined' &&
    typeof appExcluirReferenciaS2610R6C === 'undefined',
    'R6B é somente política'
  );

  let resumo = null;
  let erroResumo = '';

  try {
    resumo =
      appResumoPoliticaRemocaoReferenciasS2610R6B();
  } catch (e) {
    erroResumo = e.message || String(e);
  }

  add(
    'RESUMO_EXECUCAO_REAL',
    !!(
      resumo &&
      resumo.ok &&
      Array.isArray(resumo.referencias)
    ),
    resumo
      ? (
          resumo.inventario.referencias +
          ' referência(s)'
        )
      : erroResumo
  );

  add(
    'QUATRO_BLOQUEADAS_DEPENDENCIA',
    !!(
      resumo &&
      resumo.inventario.bloqueadasPorDependencia === 4
    ),
    resumo
      ? String(
          resumo.inventario.bloqueadasPorDependencia
        )
      : 'não executado'
  );

  add(
    'VINTE_CINCO_SEM_DEPENDENCIA_ATIVAS',
    !!(
      resumo &&
      resumo.inventario.bloqueadasEnquantoAtivas === 25
    ),
    resumo
      ? String(
          resumo.inventario.bloqueadasEnquantoAtivas
        )
      : 'não executado'
  );

  add(
    'ZERO_CANDIDATAS_ENQUANTO_TODAS_ATIVAS',
    !!(
      resumo &&
      resumo.inventario.candidatasR6C === 0
    ),
    resumo
      ? String(
          resumo.inventario.candidatasR6C
        )
      : 'não executado'
  );

  let bloqueada = null;
  let erroBloqueada = '';

  try {
    bloqueada =
      appAvaliarRemocaoReferenciaS2610R6B(
        'REF-20260801095223-1AD502B2'
      );
  } catch (e) {
    erroBloqueada = e.message || String(e);
  }

  add(
    'CASO_HISTORICO_BLOQUEADO',
    !!(
      bloqueada &&
      bloqueada.decisao === 'BLOQUEADA_POR_DEPENDENCIA' &&
      bloqueada.dependencia.totalUsos === 4
    ),
    bloqueada
      ? (
          bloqueada.nome +
          ' / ' +
          bloqueada.dependencia.totalUsos +
          ' uso(s)'
        )
      : erroBloqueada
  );

  let elegivelAtiva = null;
  let erroElegivel = '';

  try {
    elegivelAtiva =
      appAvaliarRemocaoReferenciaS2610R6B(
        'REF-20260828113557-07AAEA07'
      );
  } catch (e) {
    erroElegivel = e.message || String(e);
  }

  add(
    'CASO_SEM_DEPENDENCIA_MAS_ATIVA_BLOQUEADO',
    !!(
      elegivelAtiva &&
      elegivelAtiva.decisao ===
        'BLOQUEADA_ENQUANTO_ATIVA' &&
      elegivelAtiva.dependencia.totalUsos === 0
    ),
    elegivelAtiva
      ? (
          elegivelAtiva.nome +
          ' / ativa=' +
          elegivelAtiva.ativo
        )
      : erroElegivel
  );

  add(
    'INVALIDACAO_CACHE_OBRIGATORIA_R6C',
    !!(
      resumo &&
      resumo.politica.invalidacaoCacheObrigatoria
    ),
    'nenhuma exclusão pública antes do Gate de cache'
  );

  const falhas =
    checks.filter(function(c) {
      return !c.ok;
    });

  const out = {
    ok: falhas.length === 0,
    diagnostico: S2610R6B.DIAGNOSTICO,
    fase: S2610R6B.VERSAO,
    totalChecks: checks.length,
    falhas: falhas.length,
    checks: checks,
    inventario:
      resumo ? resumo.inventario : null,
    politica:
      resumo ? resumo.politica : null,
    alterouDados: false,
    gate:
      falhas.length === 0
        ? 'APTO_PARA_S26.10-R6C'
        : 'BLOQUEADO',
    proximaEtapa:
      'S26.10-R6C-EXECUCAO-REMOCAO-SEGURA'
  };

  console.log(
    '[S26.10-R6B] ' +
    JSON.stringify(out)
  );

  return out;
}
