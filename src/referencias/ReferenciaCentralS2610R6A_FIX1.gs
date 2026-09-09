/**
 * ============================================================
 * S26.10-R6A-FIX2 — GATE DE DEPENDÊNCIAS + LEDGER TÉCNICO
 * ============================================================
 *
 * SOMENTE LEITURA.
 *
 * CORREÇÃO CRÍTICA:
 * O R6A original procurava somente ID_REFERENCIA exato.
 * Porém REGISTROS.REFERENCIA contém historicamente rótulos humanos
 * (ex.: "Acesso ao elevador torre 2", "Elevador Torre 5", "Quiosque"),
 * e não necessariamente o ID técnico.
 *
 * Este FIX1 reconhece dependências por:
 * 1) ID_REFERENCIA exato;
 * 2) nome normalizado único da referência;
 * 3) nome normalizado ambíguo — bloqueia conservadoramente todos
 *    os candidatos com o mesmo nome.
 *
 * NÃO ALTERA DADOS.
 * NÃO REMOVE REFERÊNCIAS.
 * NÃO ALTERA APP_VERSAO / APP_FASE.
 */

const S2610R6A_FIX1 = Object.freeze({
  VERSAO: 'S26.10-R6A-FIX2',
  DIAGNOSTICO: 'S26.10-R6A-FIX2-DEPENDENCIAS-SEM-LEDGER-REMOCOES',
  BASELINE_VERSAO: 'MVP-3.31.0-SINALIZACAO-S26.9',
  BASELINE_FASE: 'S26.9',
  ABA_REFERENCIAS: 'PONTOS_REFERENCIA',
  COLUNAS_DEPENDENCIA: Object.freeze([
    'REFERENCIA',
    'ID_REFERENCIA'
  ]),
  ABAS_TECNICAS_IGNORADAS: Object.freeze([
    'REFERENCIAS_REMOVIDAS'
  ])
});


function s2610R6AFix1Texto_(valor) {
  return String(valor == null ? '' : valor).trim();
}


function s2610R6AFix1NormalizarNome_(valor) {
  return s2610R6AFix1Texto_(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('pt-BR')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


function s2610R6AFix1Config_(ss) {
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
      const chave =
        s2610R6AFix1Texto_(row[0]);

      if (chave) {
        out[chave] =
          s2610R6AFix1Texto_(row[1]);
      }
    });

  return out;
}


function s2610R6AFix1Headers_(sh) {
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
      return s2610R6AFix1Texto_(v);
    });
}


function s2610R6AFix1Linhas_(sh) {
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
      return s2610R6AFix1Texto_(v);
    });

  return valores
    .filter(function(row) {
      return row.some(function(v) {
        return s2610R6AFix1Texto_(v) !== '';
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


function s2610R6AFix1Master_(ss) {
  const sh =
    ss.getSheetByName(
      S2610R6A_FIX1.ABA_REFERENCIAS
    );

  if (!sh) {
    throw new Error(
      'Aba PONTOS_REFERENCIA não encontrada.'
    );
  }

  const rows =
    s2610R6AFix1Linhas_(sh);

  const porId = {};
  const porNome = {};

  rows.forEach(function(r) {
    const id =
      s2610R6AFix1Texto_(
        r.ID_REFERENCIA
      );

    if (!id) {
      return;
    }

    const nome =
      s2610R6AFix1Texto_(r.NOME);

    const nomeNormalizado =
      s2610R6AFix1NormalizarNome_(
        nome
      );

    const ref = {
      idReferencia: id,
      nome: nome,
      nomeNormalizado:
        nomeNormalizado,
      tipo:
        s2610R6AFix1Texto_(r.TIPO),
      subtipo:
        s2610R6AFix1Texto_(r.SUBTIPO),
      idMapaSetor:
        s2610R6AFix1Texto_(
          r.ID_MAPA_SETOR
        ),
      ativo:
        s2610R6AFix1Texto_(
          r.ATIVO || 'SIM'
        ).toUpperCase() !== 'NAO',
      usosDiretos: [],
      usosAmbiguos: [],
      totalUsosDiretos: 0,
      totalUsosAmbiguos: 0
    };

    porId[id] = ref;

    if (nomeNormalizado) {
      if (!porNome[nomeNormalizado]) {
        porNome[nomeNormalizado] = [];
      }

      porNome[nomeNormalizado]
        .push(ref);
    }
  });

  return {
    sh: sh,
    rows: rows,
    porId: porId,
    porNome: porNome
  };
}


function s2610R6AFix1UsoDireto_(
  ref,
  detalhe
) {
  ref.usosDiretos.push(detalhe);
  ref.totalUsosDiretos++;
}


function s2610R6AFix1UsoAmbiguo_(
  ref,
  detalhe
) {
  ref.usosAmbiguos.push(detalhe);
  ref.totalUsosAmbiguos++;
}


function s2610R6AFix1ResolverValor_(
  master,
  valor,
  contexto
) {
  const bruto =
    s2610R6AFix1Texto_(valor);

  if (!bruto) {
    return {
      tipo: 'VAZIO'
    };
  }

  /*
   * 1. ID técnico exato.
   */
  if (master.porId[bruto]) {
    const ref =
      master.porId[bruto];

    s2610R6AFix1UsoDireto_(
      ref,
      Object.assign(
        {},
        contexto,
        {
          valorOriginal: bruto,
          modoVinculo:
            'ID_REFERENCIA_EXATO'
        }
      )
    );

    return {
      tipo:
        'RECONHECIDO_ID',
      ids:
        [ref.idReferencia]
    };
  }

  /*
   * Em ID_REFERENCIA, não tentamos transformar texto em nome.
   * Se a coluna é técnica, um ID desconhecido deve continuar
   * explicitamente inconsistente.
   */
  if (
    contexto.coluna ===
    'ID_REFERENCIA'
  ) {
    return {
      tipo:
        'ID_DESCONHECIDO',
      valor:
        bruto
    };
  }

  /*
   * 2. Nome normalizado.
   */
  const chaveNome =
    s2610R6AFix1NormalizarNome_(
      bruto
    );

  const candidatos =
    master.porNome[chaveNome] || [];

  if (candidatos.length === 1) {
    const ref =
      candidatos[0];

    s2610R6AFix1UsoDireto_(
      ref,
      Object.assign(
        {},
        contexto,
        {
          valorOriginal:
            bruto,
          modoVinculo:
            'NOME_NORMALIZADO_UNICO'
        }
      )
    );

    return {
      tipo:
        'RECONHECIDO_NOME',
      ids:
        [ref.idReferencia]
    };
  }

  if (candidatos.length > 1) {
    const ids =
      candidatos.map(function(ref) {
        const detalhe =
          Object.assign(
            {},
            contexto,
            {
              valorOriginal:
                bruto,
              modoVinculo:
                'NOME_NORMALIZADO_AMBIGUO',
              candidatos:
                candidatos.map(
                  function(c) {
                    return c.idReferencia;
                  }
                )
            }
          );

        s2610R6AFix1UsoAmbiguo_(
          ref,
          detalhe
        );

        return ref.idReferencia;
      });

    return {
      tipo:
        'AMBIGUO_NOME',
      ids:
        ids,
      valor:
        bruto
    };
  }

  return {
    tipo:
      'LEGADO_NAO_VINCULADO',
    valor:
      bruto
  };
}


function s2610R6AFix1Escanear_(
  ss,
  master
) {
  const dependencias = [];
  const naoVinculados = [];
  const ambiguos = [];
  const idsDesconhecidos = [];

  ss.getSheets().forEach(function(sh) {
    const nomeAba =
      sh.getName();

    if (
      nomeAba ===
        S2610R6A_FIX1.ABA_REFERENCIAS ||
      S2610R6A_FIX1.ABAS_TECNICAS_IGNORADAS
        .indexOf(nomeAba) >= 0
    ) {
      return;
    }

    const headers =
      s2610R6AFix1Headers_(sh);

    if (!headers.length) {
      return;
    }

    const colunas = [];

    headers.forEach(function(h, idx) {
      if (
        S2610R6A_FIX1
          .COLUNAS_DEPENDENCIA
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

    const resumo = {
      aba: nomeAba,
      colunas:
        colunas.map(function(c) {
          return c.nome;
        }),
      reconhecidosPorId: 0,
      reconhecidosPorNome: 0,
      ambiguosPorNome: 0,
      legadosNaoVinculados: 0,
      idsDesconhecidos: 0
    };

    if (sh.getLastRow() >= 2) {
      const valores =
        sh
          .getRange(
            2,
            1,
            sh.getLastRow() - 1,
            sh.getLastColumn()
          )
          .getValues();

      valores.forEach(function(row, i) {
        colunas.forEach(function(c) {
          const contexto = {
            aba:
              nomeAba,
            coluna:
              c.nome,
            linha:
              i + 2
          };

          const r =
            s2610R6AFix1ResolverValor_(
              master,
              row[c.index],
              contexto
            );

          switch (r.tipo) {
            case 'RECONHECIDO_ID':
              resumo.reconhecidosPorId++;
              break;

            case 'RECONHECIDO_NOME':
              resumo.reconhecidosPorNome++;
              break;

            case 'AMBIGUO_NOME':
              resumo.ambiguosPorNome++;

              ambiguos.push({
                aba:
                  nomeAba,
                coluna:
                  c.nome,
                linha:
                  i + 2,
                valor:
                  r.valor,
                candidatos:
                  r.ids
              });
              break;

            case 'ID_DESCONHECIDO':
              resumo.idsDesconhecidos++;

              idsDesconhecidos.push({
                aba:
                  nomeAba,
                coluna:
                  c.nome,
                linha:
                  i + 2,
                valor:
                  r.valor
              });
              break;

            case 'LEGADO_NAO_VINCULADO':
              resumo.legadosNaoVinculados++;

              naoVinculados.push({
                aba:
                  nomeAba,
                coluna:
                  c.nome,
                linha:
                  i + 2,
                valor:
                  r.valor
              });
              break;
          }
        });
      });
    }

    dependencias.push(resumo);
  });

  return {
    dependencias:
      dependencias,
    legadosNaoVinculados:
      naoVinculados,
    ambiguos:
      ambiguos,
    idsDesconhecidos:
      idsDesconhecidos
  };
}


function appAnalisarDependenciasReferenciasS2610R6AFix1() {
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
    s2610R6AFix1Config_(ss);

  if (
    cfg.APP_VERSAO !==
      S2610R6A_FIX1.BASELINE_VERSAO ||
    cfg.APP_FASE !==
      S2610R6A_FIX1.BASELINE_FASE
  ) {
    throw new Error(
      'Baseline inesperada para R6A FIX1: ' +
      (cfg.APP_VERSAO || 'sem versão') +
      ' / ' +
      (cfg.APP_FASE || 'sem fase')
    );
  }

  const master =
    s2610R6AFix1Master_(ss);

  const scan =
    s2610R6AFix1Escanear_(
      ss,
      master
    );

  const referencias =
    Object.keys(master.porId)
      .map(function(id) {
        const ref =
          master.porId[id];

        const bloqueada =
          (
            ref.totalUsosDiretos > 0 ||
            ref.totalUsosAmbiguos > 0
          );

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
          totalUsosDiretos:
            ref.totalUsosDiretos,
          totalUsosAmbiguos:
            ref.totalUsosAmbiguos,
          totalUsos:
            ref.totalUsosDiretos +
            ref.totalUsosAmbiguos,
          usosDiretos:
            ref.usosDiretos,
          usosAmbiguos:
            ref.usosAmbiguos,
          classificacao:
            bloqueada
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
      return (
        r.classificacao ===
        'BLOQUEADA_POR_DEPENDENCIA'
      );
    });

  const elegiveis =
    referencias.filter(function(r) {
      return (
        r.classificacao ===
        'ELEGIVEL_PARA_REMOCAO_FUTURA'
      );
    });

  const usosDiretosTotal =
    referencias.reduce(
      function(total, r) {
        return (
          total +
          r.totalUsosDiretos
        );
      },
      0
    );

  const usosAmbiguosTotal =
    scan.ambiguos.length;

  return {
    ok: true,
    fase:
      S2610R6A_FIX1.VERSAO,

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
      usosDiretos:
        usosDiretosTotal,
      usosAmbiguos:
        usosAmbiguosTotal,
      abasComDependencias:
        scan.dependencias.length,
      legadosNaoVinculados:
        scan.legadosNaoVinculados.length,
      idsDesconhecidos:
        scan.idsDesconhecidos.length
    },

    dependencias:
      scan.dependencias,

    ambiguos:
      scan.ambiguos,

    legadosNaoVinculados:
      scan.legadosNaoVinculados,

    idsDesconhecidos:
      scan.idsDesconhecidos,

    referencias:
      referencias,

    alterouDados:
      false
  };
}


function diagnosticoS2610R6AFix1() {
  const checks = [];

  function add(
    nome,
    ok,
    detalhe
  ) {
    checks.push({
      nome:
        nome,
      ok:
        !!ok,
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
    s2610R6AFix1Config_(ss);

  add(
    'BASELINE_VERSAO',
    cfg.APP_VERSAO ===
      S2610R6A_FIX1.BASELINE_VERSAO,
    cfg.APP_VERSAO || 'ausente'
  );

  add(
    'BASELINE_FASE',
    cfg.APP_FASE ===
      S2610R6A_FIX1.BASELINE_FASE,
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
    'NORMALIZADOR_NOME',
    typeof s2610R6AFix1NormalizarNome_ ===
      'function',
    'nome histórico → referência'
  );

  add(
    'SEM_API_REMOVER_FIX1',
    typeof appRemoverReferenciaS2610R6 ===
      'undefined' &&
    typeof appExcluirReferenciaS2610R6 ===
      'undefined',
    'somente leitura'
  );

  add(
    'LEDGER_REMOCOES_EXCLUIDO_DO_SCAN',
    S2610R6A_FIX1.ABAS_TECNICAS_IGNORADAS
      .indexOf('REFERENCIAS_REMOVIDAS') >= 0,
    'REFERENCIAS_REMOVIDAS é tombstone/rollback, não dependência operacional'
  );

  let analise = null;
  let erro = '';

  try {
    analise =
      appAnalisarDependenciasReferenciasS2610R6AFix1();
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
   * Gate de segurança: o log original já provou que REGISTROS.REFERENCIA
   * contém nomes humanos que coincidem com referências atuais.
   * O FIX1 deve reconhecer ao menos um desses usos; caso contrário,
   * continuamos inseguros e o R6B permanece bloqueado.
   */
  add(
    'DEPENDENCIA_POR_NOME_RECONHECIDA',
    !!(
      analise &&
      analise.inventario.usosDiretos > 0
    ),
    analise
      ? String(
          analise.inventario.usosDiretos
        )
      : 'não executado'
  );

  add(
    'LEGADOS_NAO_VINCULADOS_INVENTARIADOS',
    !!analise,
    analise
      ? String(
          analise.inventario
            .legadosNaoVinculados
        )
      : 'não executado'
  );

  add(
    'AMBIGUIDADES_INVENTARIADAS',
    !!analise,
    analise
      ? String(
          analise.inventario
            .usosAmbiguos
        )
      : 'não executado'
  );

  const falhas =
    checks.filter(function(c) {
      return !c.ok;
    });

  /*
   * Mesmo com checks técnicos aprovados, IDs técnicos desconhecidos
   * são inconsistência mais grave e impedem avançar.
   */
  const bloqueioPorIdDesconhecido =
    !!(
      analise &&
      analise.inventario
        .idsDesconhecidos > 0
    );

  const gateOk =
    (
      falhas.length === 0 &&
      !bloqueioPorIdDesconhecido
    );

  const out = {
    ok:
      gateOk,

    diagnostico:
      S2610R6A_FIX1.DIAGNOSTICO,

    fase:
      S2610R6A_FIX1.VERSAO,

    totalChecks:
      checks.length,

    falhas:
      falhas.length +
      (
        bloqueioPorIdDesconhecido
          ? 1
          : 0
      ),

    checks:
      checks,

    inventario:
      analise
        ? analise.inventario
        : null,

    bloqueioExtra:
      bloqueioPorIdDesconhecido
        ? 'ID_REFERENCIA_DESCONHECIDO'
        : '',

    alterouDados:
      false,

    gate:
      gateOk
        ? 'APTO_PARA_S26.10-R6B'
        : 'BLOQUEADO',

    proximaEtapa:
      'S26.10-R6B-POLITICA-REMOCAO-SEGURA'
  };

  console.log(
    '[S26.10-R6A-FIX2] ' +
    JSON.stringify(out)
  );

  if (analise) {
    console.log(
      '[S26.10-R6A-FIX2][DEPENDENCIAS] ' +
      JSON.stringify({
        inventario:
          analise.inventario,

        dependencias:
          analise.dependencias,

        bloqueadas:
          analise.referencias
            .filter(function(r) {
              return (
                r.classificacao ===
                'BLOQUEADA_POR_DEPENDENCIA'
              );
            })
            .map(function(r) {
              return {
                idReferencia:
                  r.idReferencia,
                nome:
                  r.nome,
                totalUsosDiretos:
                  r.totalUsosDiretos,
                totalUsosAmbiguos:
                  r.totalUsosAmbiguos,
                usosDiretos:
                  r.usosDiretos,
                usosAmbiguos:
                  r.usosAmbiguos
              };
            }),

        elegiveis:
          analise.referencias
            .filter(function(r) {
              return (
                r.classificacao ===
                'ELEGIVEL_PARA_REMOCAO_FUTURA'
              );
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
            }),

        ambiguos:
          analise.ambiguos,

        legadosNaoVinculados:
          analise.legadosNaoVinculados,

        idsDesconhecidos:
          analise.idsDesconhecidos
      })
    );
  }

  return out;
}

/**
 * Aliases S26.10-R6A-FIX2.
 * Nomes FIX1 são preservados por compatibilidade com R6B/R6C/R7.
 */
function appAnalisarDependenciasReferenciasS2610R6AFix2() {
  return appAnalisarDependenciasReferenciasS2610R6AFix1();
}

function diagnosticoS2610R6AFix2() {
  return diagnosticoS2610R6AFix1();
}
