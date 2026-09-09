/**
 * ============================================================
 * S26.10-R6A — GATE DE DEPENDÊNCIAS PARA REMOÇÃO DE REFERÊNCIAS
 * ============================================================
 *
 * SOMENTE LEITURA.
 *
 * Objetivo:
 * - descobrir todas as dependências reais de PONTOS_REFERENCIA;
 * - não assumir apenas REGISTROS.REFERENCIA;
 * - escanear todas as abas por colunas REFERENCIA / ID_REFERENCIA;
 * - contar usos por referência;
 * - classificar referências como:
 *   BLOQUEADA_POR_DEPENDENCIA
 *   ELEGIVEL_PARA_REMOCAO_FUTURA
 *
 * Regras:
 * - NÃO remove nada;
 * - NÃO altera ATIVO;
 * - NÃO altera CONFIG;
 * - NÃO altera APP_VERSAO / APP_FASE;
 * - preserva histórico;
 * - remoção física só poderá nascer em R6B após este Gate.
 */

const S2610R6A = Object.freeze({
  VERSAO: 'S26.10-R6A',
  DIAGNOSTICO: 'S26.10-R6A-DEPENDENCIAS-REFERENCIAS',
  BASELINE_VERSAO: 'MVP-3.31.0-SINALIZACAO-S26.9',
  BASELINE_FASE: 'S26.9',
  ABA_REFERENCIAS: 'PONTOS_REFERENCIA',
  COLUNAS_DEPENDENCIA: Object.freeze([
    'REFERENCIA',
    'ID_REFERENCIA'
  ])
});


function s2610R6ATexto_(valor) {
  return String(valor == null ? '' : valor).trim();
}


function s2610R6AConfig_(ss) {
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
      const chave = s2610R6ATexto_(row[0]);

      if (chave) {
        out[chave] =
          s2610R6ATexto_(row[1]);
      }
    });

  return out;
}


function s2610R6AHeaders_(sh) {
  if (!sh || sh.getLastColumn() < 1) {
    return [];
  }

  return sh
    .getRange(
      1,
      1,
      1,
      sh.getLastColumn()
    )
    .getValues()[0]
    .map(function(v) {
      return s2610R6ATexto_(v);
    });
}


function s2610R6ALinhas_(sh) {
  if (
    !sh ||
    sh.getLastRow() < 2 ||
    sh.getLastColumn() < 1
  ) {
    return [];
  }

  const valores =
    sh.getDataRange().getValues();

  const headers =
    valores.shift().map(function(v) {
      return s2610R6ATexto_(v);
    });

  return valores
    .filter(function(row) {
      return row.some(function(v) {
        return s2610R6ATexto_(v) !== '';
      });
    })
    .map(function(row) {
      const obj = {};

      headers.forEach(function(h, i) {
        if (h) {
          obj[h] = row[i];
        }
      });

      return obj;
    });
}


function s2610R6ARefsMaster_(ss) {
  const sh =
    ss.getSheetByName(
      S2610R6A.ABA_REFERENCIAS
    );

  if (!sh) {
    throw new Error(
      'Aba PONTOS_REFERENCIA não encontrada.'
    );
  }

  const rows =
    s2610R6ALinhas_(sh);

  const mapa = {};

  rows.forEach(function(r) {
    const id =
      s2610R6ATexto_(r.ID_REFERENCIA);

    if (!id) {
      return;
    }

    mapa[id] = {
      idReferencia: id,
      nome:
        s2610R6ATexto_(r.NOME),
      tipo:
        s2610R6ATexto_(r.TIPO),
      subtipo:
        s2610R6ATexto_(r.SUBTIPO),
      idMapaSetor:
        s2610R6ATexto_(r.ID_MAPA_SETOR),
      ativo:
        s2610R6ATexto_(r.ATIVO || 'SIM')
          .toUpperCase() !== 'NAO',
      usos: [],
      totalUsos: 0
    };
  });

  return {
    sh: sh,
    rows: rows,
    mapa: mapa
  };
}


function s2610R6ARegistrarUso_(
  mapaRefs,
  idReferencia,
  aba,
  coluna,
  linha
) {
  const id =
    s2610R6ATexto_(idReferencia);

  if (!id || !mapaRefs[id]) {
    return false;
  }

  const ref = mapaRefs[id];

  ref.usos.push({
    aba: aba,
    coluna: coluna,
    linha: linha
  });

  ref.totalUsos++;

  return true;
}


/**
 * Escaneia todas as abas por colunas REFERENCIA / ID_REFERENCIA.
 *
 * Importante:
 * PONTOS_REFERENCIA é a entidade master e não conta como dependência.
 */
function s2610R6AEscanearDependencias_(ss, mapaRefs) {
  const dependencias = [];
  const desconhecidas = [];

  ss.getSheets().forEach(function(sh) {
    const nomeAba =
      sh.getName();

    if (
      nomeAba ===
      S2610R6A.ABA_REFERENCIAS
    ) {
      return;
    }

    const headers =
      s2610R6AHeaders_(sh);

    if (!headers.length) {
      return;
    }

    const colunas = [];

    headers.forEach(function(h, idx) {
      if (
        S2610R6A.COLUNAS_DEPENDENCIA
          .indexOf(h) >= 0
      ) {
        colunas.push({
          nome: h,
          index: idx
        });
      }
    });

    if (!colunas.length) {
      return;
    }

    const lastRow =
      sh.getLastRow();

    if (lastRow < 2) {
      dependencias.push({
        aba: nomeAba,
        colunas:
          colunas.map(function(c) {
            return c.nome;
          }),
        usosReconhecidos: 0,
        valoresNaoReconhecidos: 0
      });

      return;
    }

    const valores =
      sh
        .getRange(
          2,
          1,
          lastRow - 1,
          sh.getLastColumn()
        )
        .getValues();

    let reconhecidos = 0;
    let naoReconhecidos = 0;

    valores.forEach(function(row, i) {
      colunas.forEach(function(c) {
        const valor =
          s2610R6ATexto_(
            row[c.index]
          );

        if (!valor) {
          return;
        }

        if (
          s2610R6ARegistrarUso_(
            mapaRefs,
            valor,
            nomeAba,
            c.nome,
            i + 2
          )
        ) {
          reconhecidos++;
        } else {
          naoReconhecidos++;

          desconhecidas.push({
            aba:
              nomeAba,
            coluna:
              c.nome,
            linha:
              i + 2,
            valor:
              valor
          });
        }
      });
    });

    dependencias.push({
      aba:
        nomeAba,
      colunas:
        colunas.map(function(c) {
          return c.nome;
        }),
      usosReconhecidos:
        reconhecidos,
      valoresNaoReconhecidos:
        naoReconhecidos
    });
  });

  return {
    dependencias:
      dependencias,
    desconhecidas:
      desconhecidas
  };
}


function appAnalisarDependenciasReferenciasS2610R6A() {
  if (
    typeof exigirPermissaoS14_ !==
    'function'
  ) {
    throw new Error(
      'Permissão S14 indisponível.'
    );
  }

  exigirPermissaoS14_(
    'administrar'
  );

  const ss =
    SpreadsheetApp.getActive();

  const cfg =
    s2610R6AConfig_(ss);

  if (
    cfg.APP_VERSAO !==
      S2610R6A.BASELINE_VERSAO ||
    cfg.APP_FASE !==
      S2610R6A.BASELINE_FASE
  ) {
    throw new Error(
      'Baseline inesperada para R6A: ' +
      (cfg.APP_VERSAO || 'sem versão') +
      ' / ' +
      (cfg.APP_FASE || 'sem fase')
    );
  }

  const master =
    s2610R6ARefsMaster_(ss);

  const scan =
    s2610R6AEscanearDependencias_(
      ss,
      master.mapa
    );

  const referencias =
    Object.keys(master.mapa)
      .map(function(id) {
        const ref =
          master.mapa[id];

        return {
          idReferencia:
            ref.idReferencia,
          nome:
            ref.nome,
          tipo:
            ref.tipo,
          subtipo:
            ref.subtipo,
          idMapaSetor:
            ref.idMapaSetor,
          ativo:
            ref.ativo,
          totalUsos:
            ref.totalUsos,
          usos:
            ref.usos,
          classificacao:
            ref.totalUsos > 0
              ? 'BLOQUEADA_POR_DEPENDENCIA'
              : 'ELEGIVEL_PARA_REMOCAO_FUTURA'
        };
      })
      .sort(function(a, b) {
        if (b.totalUsos !== a.totalUsos) {
          return b.totalUsos - a.totalUsos;
        }

        return String(a.nome || '')
          .localeCompare(
            String(b.nome || ''),
            'pt-BR'
          );
      });

  const bloqueadas =
    referencias.filter(function(r) {
      return r.totalUsos > 0;
    });

  const elegiveis =
    referencias.filter(function(r) {
      return r.totalUsos === 0;
    });

  return {
    ok: true,
    fase:
      'S26.10-R6A',
    baseline: {
      appVersao:
        cfg.APP_VERSAO,
      appFase:
        cfg.APP_FASE
    },
    inventario: {
      referencias:
        referencias.length,
      bloqueadas:
        bloqueadas.length,
      elegiveis:
        elegiveis.length,
      abasComDependencias:
        scan.dependencias.length,
      valoresDependenciaNaoReconhecidos:
        scan.desconhecidas.length
    },
    dependencias:
      scan.dependencias,
    valoresNaoReconhecidos:
      scan.desconhecidas,
    referencias:
      referencias,
    alterouDados:
      false
  };
}


/**
 * ============================================================
 * GATE R6A
 * ============================================================
 */
function diagnosticoS2610R6A() {
  const checks = [];

  function add(
    nome,
    ok,
    detalhe
  ) {
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

  const ss =
    SpreadsheetApp.getActive();

  const cfg =
    s2610R6AConfig_(ss);

  add(
    'BASELINE_VERSAO',
    cfg.APP_VERSAO ===
      S2610R6A.BASELINE_VERSAO,
    cfg.APP_VERSAO || 'ausente'
  );

  add(
    'BASELINE_FASE',
    cfg.APP_FASE ===
      S2610R6A.BASELINE_FASE,
    cfg.APP_FASE || 'ausente'
  );

  add(
    'PONTOS_REFERENCIA',
    !!ss.getSheetByName(
      'PONTOS_REFERENCIA'
    ),
    'PONTOS_REFERENCIA'
  );

  add(
    'REGISTROS',
    !!ss.getSheetByName(
      'REGISTROS'
    ),
    'REGISTROS'
  );

  add(
    'PERMISSAO_S14',
    typeof exigirPermissaoS14_ ===
      'function',
    'exigirPermissaoS14_'
  );

  add(
    'SEM_API_REMOVER_R6A',
    typeof appRemoverReferenciaS2610R6 ===
      'undefined' &&
    typeof appExcluirReferenciaS2610R6 ===
      'undefined',
    'R6A é somente leitura'
  );

  let analise = null;
  let erro = '';

  try {
    analise =
      appAnalisarDependenciasReferenciasS2610R6A();
  } catch (e) {
    erro =
      e.message ||
      String(e);
  }

  add(
    'ANALISE_EXECUCAO_REAL',
    !!(
      analise &&
      analise.ok &&
      Array.isArray(
        analise.referencias
      )
    ),
    analise
      ? (
          analise.inventario.referencias +
          ' referência(s)'
        )
      : erro
  );

  add(
    'CLASSIFICACAO_COMPLETA',
    !!(
      analise &&
      analise.referencias.every(
        function(r) {
          return (
            r.classificacao ===
              'BLOQUEADA_POR_DEPENDENCIA' ||
            r.classificacao ===
              'ELEGIVEL_PARA_REMOCAO_FUTURA'
          );
        }
      )
    ),
    analise
      ? (
          analise.inventario.bloqueadas +
          ' bloqueada(s) / ' +
          analise.inventario.elegiveis +
          ' elegível(is)'
        )
      : 'não executado'
  );

  /*
   * Valores em colunas REFERENCIA/ID_REFERENCIA que não correspondem
   * a nenhum ID atual podem ser histórico legado, rótulo antigo ou
   * inconsistência. Não bloqueamos o diagnóstico por existência,
   * mas deixamos explícito para revisão antes de R6B.
   */
  add(
    'VALORES_DEPENDENCIA_INVENTARIADOS',
    !!analise,
    analise
      ? String(
          analise.inventario
            .valoresDependenciaNaoReconhecidos
        )
      : 'não executado'
  );

  const falhas =
    checks.filter(function(c) {
      return !c.ok;
    });

  const out = {
    ok:
      falhas.length === 0,

    diagnostico:
      S2610R6A.DIAGNOSTICO,

    fase:
      S2610R6A.VERSAO,

    totalChecks:
      checks.length,

    falhas:
      falhas.length,

    checks:
      checks,

    inventario:
      analise
        ? analise.inventario
        : null,

    alterouDados:
      false,

    gate:
      falhas.length === 0
        ? 'APTO_PARA_REVISAO_DEPENDENCIAS_R6'
        : 'BLOQUEADO',

    proximaEtapa:
      'S26.10-R6B-POLITICA-REMOCAO-SEGURA'
  };

  console.log(
    '[S26.10-R6A] ' +
    JSON.stringify(out)
  );

  if (analise) {
    console.log(
      '[S26.10-R6A][DEPENDENCIAS] ' +
      JSON.stringify({
        inventario:
          analise.inventario,
        dependencias:
          analise.dependencias,
        valoresNaoReconhecidos:
          analise.valoresNaoReconhecidos,
        elegiveis:
          analise.referencias
            .filter(function(r) {
              return r.totalUsos === 0;
            })
            .map(function(r) {
              return {
                idReferencia:
                  r.idReferencia,
                nome:
                  r.nome,
                ativo:
                  r.ativo
              };
            })
      })
    );
  }

  return out;
}
