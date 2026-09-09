// ========================================================
// S26.9-A — DIAGNÓSTICO DOS CATÁLOGOS DE DOMÍNIO
// ========================================================
//
// IMPORTANTE:
// - SOMENTE LEITURA.
// - NÃO cria abas.
// - NÃO altera CONFIG.
// - NÃO altera REGISTROS.
// - NÃO altera APP_VERSAO / APP_FASE.
// - NÃO executa setup.
// - NÃO grava auditoria.
// - NÃO executa SpreadsheetApp.flush().
//
// Baseline esperada:
// MVP-3.30.0-SINALIZACAO-S26.8
// S26.8
//
// Candidato planejado:
// MVP-3.31.0-SINALIZACAO-S26.9-CANDIDATO
// ========================================================


function diagnosticoS269A() {
  var inicio = new Date();
  var checks = [];

  var CAMPOS = [
    'TIPO',
    'FINALIDADE',
    'MATERIAL',
    'FIXACAO',
    'ESTADO_CONSERVACAO',
    'CONDICAO',
    'RESPONSAVEL'
  ];

  var BOOTSTRAP_MAP = {
    TIPO: 'tipos',
    FINALIDADE: 'finalidades',
    MATERIAL: 'materiais',
    ESTADO_CONSERVACAO: 'estados',
    CONDICAO: 'condicoes',
    RESPONSAVEL: 'responsaveis'
  };

  var acesso;
  var ss;

  try {
    acesso = s269AObterPlanilha_();
    ss = acesso.planilha;

    s269ACheck_(
      checks,
      'PLANILHA_ACESSIVEL',
      Boolean(ss),
      acesso.fonte || 'Planilha obtida'
    );
  } catch (e) {
    s269ACheck_(
      checks,
      'PLANILHA_ACESSIVEL',
      false,
      e && e.message ? e.message : String(e)
    );

    var falhaInicial = {
      ok: false,
      faseDesenvolvimento: 'S26.9-A',
      candidato: 'MVP-3.31.0-SINALIZACAO-S26.9-CANDIDATO',
      producaoEsperada: 'MVP-3.30.0-SINALIZACAO-S26.8',
      faseProducaoEsperada: 'S26.8',
      diagnostico: 'S26.9-A-CATALOGOS-DOMINIO-DESCOBERTA',
      somenteLeitura: true,
      checks: checks,
      totalChecks: checks.length,
      falhas: checks.filter(function (c) {
        return !c.ok;
      }).length
    };

    console.log(
      '[S26.9-A] ' +
      JSON.stringify(falhaInicial)
    );

    return falhaInicial;
  }


  // ======================================================
  // 1. BASELINE
  // ======================================================

  var shConfig = ss.getSheetByName('CONFIG');

  s269ACheck_(
    checks,
    'ABA_CONFIG',
    Boolean(shConfig),
    shConfig ? 'CONFIG disponível' : 'CONFIG ausente'
  );

  var config = shConfig
    ? s269ALerConfig_(shConfig)
    : {};

  s269ACheck_(
    checks,
    'BASELINE_APP_VERSAO',
    config.APP_VERSAO ===
      'MVP-3.30.0-SINALIZACAO-S26.8',
    config.APP_VERSAO || 'ausente'
  );

  s269ACheck_(
    checks,
    'BASELINE_APP_FASE',
    config.APP_FASE === 'S26.8',
    config.APP_FASE || 'ausente'
  );

  s269ACheck_(
    checks,
    'MODO_DADOS_LOCAL_INDEPENDENTE',
    config.MODO_DADOS === 'LOCAL_INDEPENDENTE',
    config.MODO_DADOS || 'ausente'
  );


  // ======================================================
  // 2. REGISTROS / CONTRATO HISTÓRICO
  // ======================================================

  var shRegistros = ss.getSheetByName('REGISTROS');

  s269ACheck_(
    checks,
    'ABA_REGISTROS',
    Boolean(shRegistros),
    shRegistros ? 'REGISTROS disponível' : 'REGISTROS ausente'
  );

  var headersRegistros = shRegistros
    ? s269AHeaders_(shRegistros)
    : [];

  CAMPOS.forEach(function (campo) {
    s269ACheck_(
      checks,
      'REGISTROS_COLUNA_' + campo,
      headersRegistros.indexOf(campo) >= 0,
      headersRegistros.indexOf(campo) >= 0
        ? 'Coluna histórica preservada'
        : 'Coluna ausente'
    );
  });

  var historico = shRegistros
    ? s269AResumoHistorico_(
        shRegistros,
        CAMPOS
      )
    : {
        totalRegistros: 0,
        campos: {}
      };


  // ======================================================
  // 3. BOOTSTRAP ATUAL
  // ======================================================

  var bootstrap = null;
  var bootstrapErro = '';

  var bootstrapExiste =
    typeof appCarregarS5B === 'function';

  s269ACheck_(
    checks,
    'API_BOOTSTRAP_APP_CARREGAR_S5B',
    bootstrapExiste,
    bootstrapExiste
      ? 'appCarregarS5B disponível'
      : 'appCarregarS5B não encontrada'
  );

  if (bootstrapExiste) {
    try {
      bootstrap = appCarregarS5B() || {};
    } catch (e) {
      bootstrapErro =
        e && e.message
          ? e.message
          : String(e);
    }
  }

  s269ACheck_(
    checks,
    'BOOTSTRAP_EXECUTAVEL',
    Boolean(bootstrap) && !bootstrapErro,
    bootstrapErro || 'Bootstrap carregado'
  );


  // ======================================================
  // 4. FONTES ATUAIS DOS SEIS SELECTS
  // ======================================================

  var catalogosAtuais = {};

  Object.keys(BOOTSTRAP_MAP).forEach(function (campo) {
    var propriedade = BOOTSTRAP_MAP[campo];

    var lista = bootstrap
      ? s269AListaBootstrap_(
          bootstrap[propriedade]
        )
      : [];

    catalogosAtuais[campo] = {
      propriedadeBootstrap: propriedade,
      quantidade: lista.length,
      valores: lista
    };

    s269ACheck_(
      checks,
      'BOOTSTRAP_' + campo,
      Array.isArray(
        bootstrap &&
        bootstrap[propriedade]
      ),
      Array.isArray(
        bootstrap &&
        bootstrap[propriedade]
      )
        ? lista.length + ' opção(ões)'
        : propriedade + ' ausente ou não é array'
    );
  });


  // ======================================================
  // 5. FIXAÇÃO — ESTADO ATUAL
  // ======================================================

  var fixacoesBootstrap =
    bootstrap &&
    Array.isArray(bootstrap.fixacoes)
      ? s269AListaBootstrap_(bootstrap.fixacoes)
      : [];

  var fixacaoEhTextoLivre =
    !bootstrap ||
    !Array.isArray(bootstrap.fixacoes);

  s269ACheck_(
    checks,
    'FIXACAO_TEXTO_LIVRE_IDENTIFICADA',
    fixacaoEhTextoLivre,
    fixacaoEhTextoLivre
      ? 'Sem catálogo fixacoes no bootstrap atual'
      : 'Bootstrap já possui fixacoes: ' +
        fixacoesBootstrap.length
  );


  // ======================================================
  // 6. DIFERENÇAS ENTRE HISTÓRICO E FONTE ATUAL
  // ======================================================

  var compatibilidade = {};

  Object.keys(BOOTSTRAP_MAP).forEach(function (campo) {
    var atuais =
      catalogosAtuais[campo].valores || [];

    var setAtual = {};

    atuais.forEach(function (valor) {
      setAtual[String(valor)] = true;
    });

    var historicos =
      historico.campos[campo] &&
      historico.campos[campo].valores
        ? historico.campos[campo].valores
        : [];

    var fora = historicos
      .filter(function (item) {
        return !setAtual[
          String(item.valor)
        ];
      })
      .map(function (item) {
        return {
          valor: item.valor,
          usos: item.usos
        };
      });

    compatibilidade[campo] = {
      opcoesAtuais: atuais.length,
      valoresHistoricosDistintos:
        historicos.length,
      historicosForaDaListaAtual: fora
    };
  });

  compatibilidade.FIXACAO = {
    modoAtual: 'TEXTO_LIVRE',
    opcoesAtuais: 0,
    valoresHistoricosDistintos:
      historico.campos.FIXACAO
        ? historico.campos.FIXACAO
            .valores.length
        : 0,
    valoresHistoricos:
      historico.campos.FIXACAO
        ? historico.campos.FIXACAO.valores
        : []
  };


  // ======================================================
  // 7. PERMISSÕES
  // ======================================================

  var shPermissoes =
    ss.getSheetByName(
      'PERFIS_PERMISSOES'
    );

  s269ACheck_(
    checks,
    'ABA_PERFIS_PERMISSOES',
    Boolean(shPermissoes),
    shPermissoes
      ? 'PERFIS_PERMISSOES disponível'
      : 'PERFIS_PERMISSOES ausente'
  );

  var permissoes =
    shPermissoes
      ? s269APermissoes_(shPermissoes)
      : {};

  s269ACheck_(
    checks,
    'ADMIN_PODE_ADMINISTRAR',
    permissoes.ADMIN === true,
    String(permissoes.ADMIN)
  );

  s269ACheck_(
    checks,
    'GESTOR_NAO_ADMINISTRA',
    permissoes.GESTOR === false,
    String(permissoes.GESTOR)
  );

  s269ACheck_(
    checks,
    'OPERACIONAL_NAO_ADMINISTRA',
    permissoes.OPERACIONAL === false,
    String(permissoes.OPERACIONAL)
  );

  s269ACheck_(
    checks,
    'CONSULTA_NAO_ADMINISTRA',
    permissoes.CONSULTA === false,
    String(permissoes.CONSULTA)
  );


  // ======================================================
  // 8. AUDITORIA
  // ======================================================

  var shAuditoria =
    ss.getSheetByName('AUDITORIA');

  s269ACheck_(
    checks,
    'ABA_AUDITORIA',
    Boolean(shAuditoria),
    shAuditoria
      ? 'AUDITORIA disponível'
      : 'AUDITORIA ausente'
  );

  var auditHeaders =
    shAuditoria
      ? s269AHeaders_(shAuditoria)
      : [];

  [
    'DATA_HORA',
    'USUARIO_EMAIL',
    'PERFIL',
    'ACAO',
    'ENTIDADE',
    'ENTIDADE_ID',
    'RESULTADO',
    'DETALHES_JSON',
    'VALOR_ANTERIOR_JSON',
    'VALOR_NOVO_JSON',
    'VERSAO_APP'
  ].forEach(function (header) {
    s269ACheck_(
      checks,
      'AUDITORIA_' + header,
      auditHeaders.indexOf(header) >= 0,
      auditHeaders.indexOf(header) >= 0
        ? 'Disponível'
        : 'Ausente'
    );
  });


  // ======================================================
  // 9. RELATÓRIO S26.8-B
  // ======================================================

  var relatorioApis = {
    iniciar:
      typeof appIniciarApresentacaoS268B ===
      'function',

    continuar:
      typeof appContinuarApresentacaoS268B ===
      'function',

    status:
      typeof appStatusApresentacaoS268B ===
      'function',

    cancelar:
      typeof appCancelarApresentacaoS268B ===
      'function'
  };

  s269ACheck_(
    checks,
    'RELATORIO_S268B_INICIAR',
    relatorioApis.iniciar,
    String(relatorioApis.iniciar)
  );

  s269ACheck_(
    checks,
    'RELATORIO_S268B_CONTINUAR',
    relatorioApis.continuar,
    String(relatorioApis.continuar)
  );

  s269ACheck_(
    checks,
    'RELATORIO_S268B_STATUS',
    relatorioApis.status,
    String(relatorioApis.status)
  );


  // ======================================================
  // 10. DETECÇÃO DE COLISÃO COM ESTRUTURA FUTURA
  // ======================================================

  var abasCatalogoExistentes =
    ss.getSheets()
      .map(function (sheet) {
        return sheet.getName();
      })
      .filter(function (nome) {
        return /CATALOG/i.test(nome);
      });


  // ======================================================
  // 11. RESULTADO FINAL
  // ======================================================

  var falhas = checks.filter(function (c) {
    return !c.ok;
  });

  var resultado = {
    ok: falhas.length === 0,

    gate:
      falhas.length === 0
        ? 'APTO_PARA_APROVACAO'
        : 'BLOQUEADO',

    faseDesenvolvimento:
      'S26.9-A',

    candidato:
      'MVP-3.31.0-SINALIZACAO-S26.9-CANDIDATO',

    producaoEsperada:
      'MVP-3.30.0-SINALIZACAO-S26.8',

    faseProducaoEsperada:
      'S26.8',

    diagnostico:
      'S26.9-A-CATALOGOS-DOMINIO-DESCOBERTA',

    somenteLeitura: true,

    acessoPlanilha:
      acesso.fonte,

    config: {
      appVersao:
        config.APP_VERSAO || '',
      appFase:
        config.APP_FASE || '',
      modoDados:
        config.MODO_DADOS || '',
      timezone:
        config.TIMEZONE || ''
    },

    registros: {
      total:
        historico.totalRegistros,
      colunasCatalogaveis:
        CAMPOS,
      historico:
        historico.campos
    },

    fontesAtuais: {
      catalogos:
        catalogosAtuais,

      fixacao: {
        modo:
          fixacaoEhTextoLivre
            ? 'TEXTO_LIVRE'
            : 'LISTA_BOOTSTRAP',

        valoresBootstrap:
          fixacoesBootstrap,

        valoresHistoricos:
          historico.campos.FIXACAO
            ? historico.campos.FIXACAO.valores
            : []
      }
    },

    compatibilidadeHistorica:
      compatibilidade,

    permissoesAdministrar:
      permissoes,

    auditoria: {
      existe:
        Boolean(shAuditoria),
      headers:
        auditHeaders
    },

    relatorioS268B:
      relatorioApis,

    abasComNomeCatalogoJaExistentes:
      abasCatalogoExistentes,

    decisaoArquiteturalRecomendada: {
      mecanismo:
        'CATALOGOS_DE_DOMINIO_GENERICOS',

      persistenciaHistorica:
        'MANTER_VALOR_TEXTUAL_NO_REGISTRO',

      renomearHistorico:
        false,

      migracaoDestrutiva:
        false,

      administracaoOffline:
        false,

      consumoOffline:
        true,

      estrategiaOffline:
        'CATALOGOS_ATIVOS_NO_BOOTSTRAP_CACHEADO',

      exclusaoOpcaoUsada:
        'BLOQUEAR_E_DESATIVAR',

      fixacao:
        'CRIAR_CATALOGO_SEM_NORMALIZAR_REGISTROS_ANTIGOS'
    },

    checks:
      checks,

    totalChecks:
      checks.length,

    falhas:
      falhas.length,

    checksFalhos:
      falhas,

    executadoEm:
      Utilities.formatDate(
        new Date(),
        config.TIMEZONE ||
          'America/Fortaleza',
        "yyyy-MM-dd'T'HH:mm:ssXXX"
      ),

    duracaoMs:
      new Date().getTime() -
      inicio.getTime()
  };

  console.log(
    '[S26.9-A] ' +
    JSON.stringify(resultado)
  );

  return resultado;
}


// ========================================================
// HELPERS S26.9-A
// ========================================================


function s269AObterPlanilha_() {
  if (
    typeof ConfigService !== 'undefined' &&
    ConfigService &&
    typeof ConfigService.obterPlanilha ===
      'function'
  ) {
    var viaConfig =
      ConfigService.obterPlanilha();

    if (viaConfig) {
      return {
        planilha: viaConfig,
        fonte:
          'ConfigService.obterPlanilha'
      };
    }
  }

  var ativa =
    SpreadsheetApp.getActiveSpreadsheet();

  if (ativa) {
    return {
      planilha: ativa,
      fonte:
        'SpreadsheetApp.getActiveSpreadsheet'
    };
  }

  throw new Error(
    'Não foi possível obter a planilha operacional.'
  );
}


function s269ALerConfig_(sheet) {
  var out = {};

  if (!sheet) {
    return out;
  }

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return out;
  }

  var rows =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        2
      )
      .getDisplayValues();

  rows.forEach(function (row) {
    var chave =
      s269ATexto_(row[0]);

    if (!chave) {
      return;
    }

    out[chave] =
      s269ATexto_(row[1]);
  });

  return out;
}


function s269ACheck_(
  checks,
  nome,
  ok,
  detalhe
) {
  checks.push({
    nome: String(nome || ''),
    ok: Boolean(ok),
    detalhe: detalhe === null ||
      detalhe === undefined
        ? ''
        : String(detalhe)
  });
}


function s269AHeaders_(sheet) {
  if (!sheet) {
    return [];
  }

  var lastColumn =
    sheet.getLastColumn();

  if (lastColumn < 1) {
    return [];
  }

  return sheet
    .getRange(
      1,
      1,
      1,
      lastColumn
    )
    .getDisplayValues()[0]
    .map(function (v) {
      return s269ATexto_(v)
        .toUpperCase();
    });
}


function s269AResumoHistorico_(
  sheet,
  campos
) {
  var headers =
    s269AHeaders_(sheet);

  var lastRow =
    sheet.getLastRow();

  var resultado = {
    totalRegistros:
      Math.max(
        0,
        lastRow - 1
      ),
    campos: {}
  };

  campos.forEach(function (campo) {
    resultado.campos[campo] = {
      coluna:
        headers.indexOf(campo) + 1,

      distintos: 0,

      preenchidos: 0,

      vazios: 0,

      valores: []
    };
  });

  if (lastRow < 2) {
    return resultado;
  }

  var indices = {};

  campos.forEach(function (campo) {
    indices[campo] =
      headers.indexOf(campo);
  });

  var indicesValidos =
    campos
      .map(function (campo) {
        return indices[campo];
      })
      .filter(function (idx) {
        return idx >= 0;
      });

  if (!indicesValidos.length) {
    return resultado;
  }

  var maxIndex =
    Math.max.apply(
      null,
      indicesValidos
    );

  var rows =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        maxIndex + 1
      )
      .getDisplayValues();

  campos.forEach(function (campo) {
    var idx = indices[campo];

    if (idx < 0) {
      return;
    }

    var contagem = {};
    var preenchidos = 0;
    var vazios = 0;

    rows.forEach(function (row) {
      var valor =
        s269ATexto_(row[idx]);

      if (!valor) {
        vazios++;
        return;
      }

      preenchidos++;

      if (!contagem[valor]) {
        contagem[valor] = 0;
      }

      contagem[valor]++;
    });

    var valores =
      Object.keys(contagem)
        .map(function (valor) {
          return {
            valor: valor,
            usos: contagem[valor]
          };
        })
        .sort(function (a, b) {
          if (b.usos !== a.usos) {
            return b.usos - a.usos;
          }

          return String(a.valor)
            .localeCompare(
              String(b.valor),
              'pt-BR'
            );
        });

    resultado.campos[campo] = {
      coluna: idx + 1,
      distintos: valores.length,
      preenchidos: preenchidos,
      vazios: vazios,
      valores: valores
    };
  });

  return resultado;
}


function s269AListaBootstrap_(lista) {
  if (!Array.isArray(lista)) {
    return [];
  }

  return lista
    .map(function (item) {
      if (
        item === null ||
        item === undefined
      ) {
        return '';
      }

      if (
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean'
      ) {
        return s269ATexto_(item);
      }

      if (typeof item === 'object') {
        return s269ATexto_(
          item.rotulo ||
          item.label ||
          item.nome ||
          item.valor ||
          item.codigo ||
          item.id ||
          ''
        );
      }

      return s269ATexto_(item);
    })
    .filter(function (valor) {
      return Boolean(valor);
    });
}


function s269APermissoes_(sheet) {
  var resultado = {};

  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {
    return resultado;
  }

  var dados =
    sheet
      .getDataRange()
      .getDisplayValues();

  var headers =
    dados[0].map(function (v) {
      return s269ATexto_(v)
        .toUpperCase();
    });

  var idxPerfil =
    headers.indexOf('PERFIL');

  var idxAdministrar =
    headers.indexOf('ADMINISTRAR');

  if (
    idxPerfil < 0 ||
    idxAdministrar < 0
  ) {
    return resultado;
  }

  dados
    .slice(1)
    .forEach(function (row) {
      var perfil =
        s269ATexto_(
          row[idxPerfil]
        ).toUpperCase();

      if (!perfil) {
        return;
      }

      resultado[perfil] =
        s269ABool_(
          row[idxAdministrar]
        );
    });

  return resultado;
}


function s269ABool_(valor) {
  if (valor === true) {
    return true;
  }

  if (valor === false) {
    return false;
  }

  var texto =
    s269ATexto_(valor)
      .toUpperCase();

  return [
    'TRUE',
    'SIM',
    '1',
    'YES'
  ].indexOf(texto) >= 0;
}


function s269ATexto_(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return '';
  }

  return String(valor).trim();
}