/**
 * ============================================================
 * S26.10-R7-FIX3 — REGRESSÃO DINÂMICA SEM DUPLO SCAN DE PLANILHA
 * ============================================================
 *
 * Objetivo:
 * - consolidar os Gates R1→R6C;
 * - provar que a referência removida saiu da base operacional;
 * - provar que o tombstone real existe;
 * - provar que histórico/dependências continuam preservados;
 * - não promover APP_VERSAO / APP_FASE ainda.
 *
 * SOMENTE LEITURA.
 */

const S2610R7 = Object.freeze({
  FASE: 'S26.10-R7-FIX3',
  DIAGNOSTICO: 'S26.10-R7-FIX3-REGRESSAO-DINAMICA-SEM-RESCAN',
  BASELINE_VERSAO: 'MVP-3.31.0-SINALIZACAO-S26.9',
  BASELINE_FASE: 'S26.9',
  ID_REMOVIDO_TESTE: 'REF-20260828133940-AA7C8915'
});


function s2610R7Texto_(valor) {
  return String(valor == null ? '' : valor).trim();
}


function s2610R7Config_(ss) {
  const sh = ss.getSheetByName('CONFIG');
  const out = {};

  if (!sh || sh.getLastRow() < 2) return out;

  sh.getRange(2, 1, sh.getLastRow() - 1, 2)
    .getValues()
    .forEach(function(row) {
      const k = s2610R7Texto_(row[0]);
      if (k) out[k] = s2610R7Texto_(row[1]);
    });

  return out;
}


function diagnosticoS2610R7() {
  if (typeof exigirPermissaoS14_ !== 'function') {
    throw new Error('S26.10-R7: permissão S14 indisponível.');
  }

  exigirPermissaoS14_('administrar');

  const ss = SpreadsheetApp.getActive();
  const cfg = s2610R7Config_(ss);
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
    cfg.APP_VERSAO === S2610R7.BASELINE_VERSAO,
    cfg.APP_VERSAO || 'ausente'
  );

  add(
    'BASELINE_FASE_PRESERVADA',
    cfg.APP_FASE === S2610R7.BASELINE_FASE,
    cfg.APP_FASE || 'ausente'
  );

  [
    ['R2_LISTAR', 'appListarReferenciasS2610R2'],
    ['R2_OBTER', 'appObterReferenciaS2610R2'],
    ['R2_CRIAR', 'appCriarReferenciaS2610R2'],
    ['R2_ATIVAR', 'appAtivarReferenciaS2610R2'],
    ['R2_DESATIVAR', 'appDesativarReferenciaS2610R2'],
    ['R5_REPOSICIONAR', 'appReposicionarReferenciaS2610R5'],
    ['R6A_DEPENDENCIAS', 'appAnalisarDependenciasReferenciasS2610R6AFix1'],
    ['R6B_POLITICA', 'appResumoPoliticaRemocaoReferenciasS2610R6B'],
    ['R6C_REMOVER', 'appRemoverReferenciaS2610R6C'],
    ['R6C_TOMBSTONES', 'appListarTombstonesReferenciasS2610R6C']
  ].forEach(function(item) {
    add(
      'API_' + item[0],
      typeof globalThis[item[1]] === 'function',
      item[1]
    );
  });

  let lista = null;
  let erroLista = '';

  try {
    lista = appListarReferenciasS2610R2({
      status: 'TODAS'
    });
  } catch (e) {
    erroLista = e.message || String(e);
  }

  add(
    'TOTAL_REFERENCIAS_CONSISTENTE',
    !!(
      lista &&
      lista.ok &&
      Number(lista.total) >= 1 &&
      Array.isArray(lista.referencias) &&
      Number(lista.total) === lista.referencias.length
    ),
    lista
      ? (
          String(lista.total) +
          ' referência(s) atuais'
        )
      : erroLista
  );

  const idsAtuais =
    lista && Array.isArray(lista.referencias)
      ? lista.referencias.map(function(r) {
          return s2610R7Texto_(r.idReferencia);
        })
      : [];

  add(
    'REMOVIDA_AUSENTE_DA_BASE_OPERACIONAL',
    idsAtuais.indexOf(S2610R7.ID_REMOVIDO_TESTE) < 0,
    S2610R7.ID_REMOVIDO_TESTE
  );

  let obterRemovidaFalhou = false;
  let obterRemovidaDetalhe = '';

  try {
    const r = appObterReferenciaS2610R2(
      S2610R7.ID_REMOVIDO_TESTE
    );

    obterRemovidaDetalhe = JSON.stringify(r);
    obterRemovidaFalhou = !(
      r &&
      r.ok &&
      r.referencia
    );
  } catch (e) {
    obterRemovidaFalhou = true;
    obterRemovidaDetalhe = e.message || String(e);
  }

  add(
    'REMOVIDA_NAO_PODE_SER_OBTIDA',
    obterRemovidaFalhou,
    obterRemovidaDetalhe
  );

  let tomb = null;
  let erroTomb = '';

  try {
    tomb = appListarTombstonesReferenciasS2610R6C();
  } catch (e) {
    erroTomb = e.message || String(e);
  }

  const tombstoneReal =
    tomb && Array.isArray(tomb.tombstones)
      ? tomb.tombstones.find(function(t) {
          return (
            s2610R7Texto_(t.idReferencia) ===
            S2610R7.ID_REMOVIDO_TESTE
          );
        })
      : null;

  add(
    'TOMBSTONE_REAL_EXISTE',
    !!tombstoneReal,
    tombstoneReal
      ? (
          tombstoneReal.idRemocao +
          ' / ' +
          tombstoneReal.nome
        )
      : erroTomb
  );

  add(
    'TOMBSTONES_LEDGER_CONSISTENTE',
    !!(
      tomb &&
      Array.isArray(tomb.tombstones) &&
      tomb.tombstones.length >= 1
    ),
    tomb && Array.isArray(tomb.tombstones)
      ? String(tomb.tombstones.length)
      : erroTomb
  );

  const shRemovidas =
    ss.getSheetByName('REFERENCIAS_REMOVIDAS');

  add(
    'LEDGER_REFERENCIAS_REMOVIDAS',
    !!shRemovidas,
    shRemovidas ? shRemovidas.getName() : 'ausente'
  );

  let analise = null;
  let erroAnalise = '';

  try {
    analise =
      appAnalisarDependenciasReferenciasS2610R6AFix1();
  } catch (e) {
    erroAnalise = e.message || String(e);
  }

  add(
    'DEPENDENCIAS_TOTAL_IGUAL_BASE',
    !!(
      analise &&
      analise.ok &&
      lista &&
      lista.ok &&
      Number(analise.inventario.referencias) ===
        Number(lista.total)
    ),
    analise
      ? (
          String(analise.inventario.referencias) +
          ' / base=' +
          String(lista ? lista.total : '?')
        )
      : erroAnalise
  );

  add(
    'QUATRO_REFERENCIAS_HISTORICAS_BLOQUEADAS',
    !!(
      analise &&
      Number(analise.inventario.bloqueadas) === 4
    ),
    analise
      ? String(analise.inventario.bloqueadas)
      : erroAnalise
  );

  add(
    'SETE_USOS_HISTORICOS_PRESERVADOS',
    !!(
      analise &&
      Number(analise.inventario.usosDiretos) === 7
    ),
    analise
      ? String(analise.inventario.usosDiretos)
      : erroAnalise
  );

  add(
    'ZERO_IDS_DESCONHECIDOS',
    !!(
      analise &&
      Number(analise.inventario.idsDesconhecidos) === 0
    ),
    analise
      ? String(analise.inventario.idsDesconhecidos)
      : erroAnalise
  );

  /*
   * S26.10-R7-FIX3
   *
   * O R7 já executou appAnalisarDependenciasReferenciasS2610R6AFix1()
   * acima. O appResumoPoliticaRemocaoReferenciasS2610R6B() executa
   * exatamente essa análise novamente, fazendo um segundo scan pesado
   * da planilha no mesmo diagnóstico.
   *
   * Em bases maiores / latência alta do Google Sheets, esse segundo scan
   * pode provocar:
   * "Service Spreadsheets timed out while accessing document..."
   *
   * Para o Gate final, reutilizamos o MESMO inventário R6A já validado e
   * aplicamos aqui, em memória, a política pública R6B:
   * - totalUsos > 0 => BLOQUEADA_POR_DEPENDENCIA
   * - sem usos + ativa => BLOQUEADA_ENQUANTO_ATIVA
   * - sem usos + inativa => CANDIDATA_REMOCAO_FISICA_R6C
   *
   * A existência da API R6B continua sendo checada no início do Gate.
   * Nenhum dado é alterado.
   */

  let politica = null;
  let erroPolitica = '';

  try {
    if (!analise || !analise.ok || !Array.isArray(analise.referencias)) {
      throw new Error(
        'Inventário R6A indisponível para derivar a política R6B.'
      );
    }

    const porDecisao = {
      BLOQUEADA_POR_DEPENDENCIA: 0,
      BLOQUEADA_ENQUANTO_ATIVA: 0,
      CANDIDATA_REMOCAO_FISICA_R6C: 0
    };

    analise.referencias.forEach(function(dep) {
      const totalUsos = Number(dep.totalUsos || 0);
      const ativa = dep.ativo === true;
      let decisao = '';

      if (totalUsos > 0) {
        decisao = 'BLOQUEADA_POR_DEPENDENCIA';
      } else if (ativa) {
        decisao = 'BLOQUEADA_ENQUANTO_ATIVA';
      } else {
        decisao = 'CANDIDATA_REMOCAO_FISICA_R6C';
      }

      porDecisao[decisao]++;
    });

    politica = {
      ok: true,
      fonte: 'R6A_REUTILIZADO_SEM_RESCAN',
      inventario: {
        referencias: analise.referencias.length,
        bloqueadasPorDependencia:
          porDecisao.BLOQUEADA_POR_DEPENDENCIA,
        bloqueadasEnquantoAtivas:
          porDecisao.BLOQUEADA_ENQUANTO_ATIVA,
        candidatasR6C:
          porDecisao.CANDIDATA_REMOCAO_FISICA_R6C
      }
    };
  } catch (e) {
    erroPolitica = e.message || String(e);
  }

  add(
    'POLITICA_TOTAL_IGUAL_BASE',
    !!(
      politica &&
      politica.ok &&
      lista &&
      lista.ok &&
      Number(politica.inventario.referencias) ===
        Number(lista.total)
    ),
    politica
      ? (
          String(politica.inventario.referencias) +
          ' / base=' +
          String(lista ? lista.total : '?') +
          ' / ' +
          politica.fonte
        )
      : erroPolitica
  );

  add(
    'POLITICA_QUATRO_BLOQUEADAS_DEPENDENCIA',
    !!(
      politica &&
      Number(
        politica.inventario.bloqueadasPorDependencia
      ) === 4
    ),
    politica
      ? String(
          politica.inventario.bloqueadasPorDependencia
        )
      : erroPolitica
  );

  const totalPoliticaClassificado =
    politica
      ? (
          Number(
            politica.inventario.bloqueadasPorDependencia || 0
          ) +
          Number(
            politica.inventario.bloqueadasEnquantoAtivas || 0
          ) +
          Number(
            politica.inventario.candidatasR6C || 0
          )
        )
      : 0;

  add(
    'POLITICA_CLASSIFICACAO_COMPLETA',
    !!(
      politica &&
      politica.ok &&
      totalPoliticaClassificado ===
        Number(politica.inventario.referencias)
    ),
    politica
      ? (
          'dependência=' +
          String(
            politica.inventario.bloqueadasPorDependencia
          ) +
          ' / ativas=' +
          String(
            politica.inventario.bloqueadasEnquantoAtivas
          ) +
          ' / candidatas=' +
          String(
            politica.inventario.candidatasR6C
          ) +
          ' / total=' +
          String(politica.inventario.referencias) +
          ' / sem rescan'
        )
      : erroPolitica
  );

  add(
    'POLITICA_ZERO_CANDIDATAS',
    !!(
      politica &&
      Number(politica.inventario.candidatasR6C) === 0
    ),
    politica
      ? String(politica.inventario.candidatasR6C)
      : erroPolitica
  );

  const falhas =
    checks.filter(function(c) {
      return !c.ok;
    });

  const out = {
    ok: falhas.length === 0,
    diagnostico: S2610R7.DIAGNOSTICO,
    fase: S2610R7.FASE,
    totalChecks: checks.length,
    falhas: falhas.length,
    checks: checks,
    resumo: {
      referenciasAtuais:
        lista ? Number(lista.total) : null,
      classificadasPolitica:
        politica ? totalPoliticaClassificado : null,
      tombstones:
        tomb && Array.isArray(tomb.tombstones)
          ? tomb.tombstones.length
          : null,
      bloqueadasPorHistorico:
        analise
          ? Number(analise.inventario.bloqueadas)
          : null,
      usosHistoricos:
        analise
          ? Number(analise.inventario.usosDiretos)
          : null,
      referenciaRemovidaTeste:
        S2610R7.ID_REMOVIDO_TESTE
    },
    alterouDados: false,
    baselinePromovida: false,
    gate:
      falhas.length === 0
        ? 'APTO_PARA_GATE_FRONTEND_R7'
        : 'BLOQUEADO',
    proximaEtapa:
      'S26.10-R7-FIX3-FRONTEND-OFFLINE-REGRESSAO'
  };

  console.log(
    '[S26.10-R7-FIX3] ' + JSON.stringify(out)
  );

  return out;
}
