// ========================================================
// S26.9-B1 — CATÁLOGOS DE DOMÍNIO
// Modelo genérico + seed não destrutivo + leitura
// ========================================================
//
// BASELINE DE PRODUÇÃO PRESERVADA:
//
// APP_VERSAO = MVP-3.30.0-SINALIZACAO-S26.8
// APP_FASE   = S26.8
//
// ESTA ETAPA:
//
// - cria somente estruturas novas;
// - NÃO altera REGISTROS;
// - NÃO altera APP_VERSAO;
// - NÃO altera APP_FASE;
// - NÃO altera bootstrap;
// - NÃO altera formulário Novo registro;
// - NÃO altera IndexedDB;
// - NÃO altera Outbox;
// - NÃO altera cartografia;
// - NÃO altera relatórios.
//
// ========================================================


var CatalogosDominioServiceS269 = (function () {

  var ABA_CATALOGOS = 'CATALOGOS_DOMINIO';
  var ABA_OPCOES = 'CATALOGOS_DOMINIO_OPCOES';

  var BASELINE_VERSAO =
    'MVP-3.30.0-SINALIZACAO-S26.8';

  var BASELINE_FASE = 'S26.8';

  // O setup B1 continua preso à baseline S26.8. APIs operacionais somente
  // leitura permanecem disponíveis nas releases S26.9 e S26.10.
  var RELEASE_VERSAO =
    'MVP-3.31.0-SINALIZACAO-S26.9';

  var RELEASE_FASE = 'S26.9';

  var RELEASE_ATUAL_VERSAO =
    'MVP-3.32.0-SINALIZACAO-S26.10';

  var RELEASE_ATUAL_FASE = 'S26.10';


  // ======================================================
  // SCHEMA
  // ======================================================

  var HEADERS_CATALOGOS = [
    'ID_CATALOGO',
    'CODIGO',
    'NOME',
    'DESCRICAO',
    'CAMPO_REGISTRO',
    'ORDEM',
    'ATIVO',
    'REVISAO',
    'ORIGEM',
    'CRIADO_EM',
    'CRIADO_POR',
    'ATUALIZADO_EM',
    'ATUALIZADO_POR'
  ];


  var HEADERS_OPCOES = [
    'ID_OPCAO',
    'ID_CATALOGO',
    'CODIGO_OPCAO',
    'ROTULO',
    'CHAVE_NORMALIZADA',
    'DESCRICAO',
    'ORDEM',
    'ATIVO',
    'PUBLICADA',
    'ORIGEM',
    'USOS_HISTORICOS',
    'VERSAO',
    'CRIADO_EM',
    'CRIADO_POR',
    'ATUALIZADO_EM',
    'ATUALIZADO_POR'
  ];


  // ======================================================
  // CATÁLOGOS INICIAIS
  // ======================================================

  function definicoesCatalogos_() {
    return [
      {
        codigo: 'TIPO',
        nome: 'Tipo',
        campoRegistro: 'TIPO',
        bootstrap: 'tipos',
        ordem: 1,
        descricao:
          'Classificação do tipo de ativo ou subsistema operacional.'
      },
      {
        codigo: 'FINALIDADE',
        nome: 'Finalidade',
        campoRegistro: 'FINALIDADE',
        bootstrap: 'finalidades',
        ordem: 2,
        descricao:
          'Frente operacional ou área de atendimento do CEOP.'
      },
      {
        codigo: 'MATERIAL',
        nome: 'Material',
        campoRegistro: 'MATERIAL',
        bootstrap: 'materiais',
        ordem: 3,
        descricao:
          'Material ou tecnologia predominante do ativo.'
      },
      {
        codigo: 'FIXACAO',
        nome: 'Fixação',
        campoRegistro: 'FIXACAO',
        bootstrap: null,
        ordem: 4,
        descricao:
          'Forma de montagem ou suporte técnico do equipamento.'
      },
      {
        codigo: 'ESTADO_CONSERVACAO',
        nome: 'Estado de conservação',
        campoRegistro: 'ESTADO_CONSERVACAO',
        bootstrap: 'estados',
        ordem: 5,
        descricao:
          'Classificação geral do estado de conservação.'
      },
      {
        codigo: 'CONDICAO',
        nome: 'Condição',
        campoRegistro: 'CONDICAO',
        bootstrap: 'condicoes',
        ordem: 6,
        descricao:
          'Condição de funcionamento ou anomalia operacional observada.'
      },
      {
        codigo: 'RESPONSAVEL',
        nome: 'Responsável',
        campoRegistro: 'RESPONSAVEL',
        bootstrap: 'responsaveis',
        ordem: 7,
        descricao:
          'Equipe ou setor responsável pelo ativo/atendimento.'
      }
    ];
  }


  // ======================================================
  // SETUP B1
  // ======================================================

  function instalarB1_() {
    var lock = LockService.getScriptLock();

    lock.waitLock(30000);

    try {
      var ss = obterPlanilha_();
      var config = validarBaseline_(ss);

      // Carregar fontes ANTES de criar qualquer dado.
      // Se o bootstrap atual não puder ser obtido,
      // o setup é interrompido.
      var bootstrap = obterBootstrapAtual_();

      var usosHistoricos =
        obterUsosHistoricos_(ss);

      var usuario = obterUsuarioExecucao_(ss);

      var abaCatalogos =
        garantirAba_(
          ss,
          ABA_CATALOGOS,
          HEADERS_CATALOGOS
        );

      var abaOpcoes =
        garantirAba_(
          ss,
          ABA_OPCOES,
          HEADERS_OPCOES
        );

      var catalogosExistentes =
        linhasComoObjetos_(
          abaCatalogos
        );

      var opcoesExistentes =
        linhasComoObjetos_(
          abaOpcoes
        );

      var catalogosPorCodigo = {};

      catalogosExistentes.forEach(
        function (item) {
          var codigo =
            texto_(item.CODIGO)
              .toUpperCase();

          if (codigo) {
            catalogosPorCodigo[codigo] =
              item;
          }
        }
      );


      var opcoesPorChaveExata = {};

      opcoesExistentes.forEach(
        function (item) {
          var idCatalogo =
            texto_(item.ID_CATALOGO);

          var rotulo =
            texto_(item.ROTULO);

          if (
            idCatalogo &&
            rotulo
          ) {
            opcoesPorChaveExata[
              idCatalogo +
              '|' +
              rotulo
            ] = item;
          }
        }
      );


      var agora = new Date();

      var alteracoes = {
        catalogosCriados: 0,
        opcoesCriadas: 0,
        opcoesAtivasCriadas: 0,
        opcoesHistoricasInativasCriadas: 0
      };


      // ==================================================
      // 1. CATÁLOGOS
      // ==================================================

      definicoesCatalogos_()
        .forEach(function (def) {

          var codigo =
            def.codigo;

          var existente =
            catalogosPorCodigo[
              codigo
            ];

          if (existente) {
            validarCatalogoExistente_(
              existente,
              def
            );

            return;
          }

          var novo = {
            ID_CATALOGO:
              idCatalogo_(codigo),

            CODIGO:
              codigo,

            NOME:
              def.nome,

            DESCRICAO:
              def.descricao,

            CAMPO_REGISTRO:
              def.campoRegistro,

            ORDEM:
              def.ordem,

            ATIVO:
              'SIM',

            REVISAO:
              1,

            ORIGEM:
              'SEED_S26_9_B1',

            CRIADO_EM:
              agora,

            CRIADO_POR:
              usuario.email,

            ATUALIZADO_EM:
              agora,

            ATUALIZADO_POR:
              usuario.email
          };

          appendObjeto_(
            abaCatalogos,
            HEADERS_CATALOGOS,
            novo
          );

          catalogosPorCodigo[
            codigo
          ] = novo;

          alteracoes
            .catalogosCriados++;
        });


      // ==================================================
      // 2. SEED DAS LISTAS OFICIAIS DA S26.8
      // ==================================================

      definicoesCatalogos_()
        .filter(function (def) {
          return Boolean(
            def.bootstrap
          );
        })
        .forEach(function (def) {

          var lista =
            normalizarListaBootstrap_(
              bootstrap[
                def.bootstrap
              ]
            );

          var idCatalogo =
            idCatalogo_(
              def.codigo
            );

          lista.forEach(
            function (
              rotulo,
              index
            ) {

              var chaveExata =
                idCatalogo +
                '|' +
                rotulo;

              if (
                opcoesPorChaveExata[
                  chaveExata
                ]
              ) {
                return;
              }

              var usos =
                usosHistoricos[
                  def.campoRegistro
                ] &&
                usosHistoricos[
                  def.campoRegistro
                ][rotulo]
                  ? usosHistoricos[
                      def.campoRegistro
                    ][rotulo]
                  : 0;

              var opcao =
                criarOpcaoSeed_({
                  catalogo:
                    def.codigo,

                  rotulo:
                    rotulo,

                  ordem:
                    index + 1,

                  ativo:
                    true,

                  publicada:
                    true,

                  origem:
                    'BOOTSTRAP_S26_8',

                  usosHistoricos:
                    usos,

                  usuario:
                    usuario.email,

                  data:
                    agora
                });

              appendObjeto_(
                abaOpcoes,
                HEADERS_OPCOES,
                opcao
              );

              opcoesPorChaveExata[
                chaveExata
              ] = opcao;

              alteracoes
                .opcoesCriadas++;

              alteracoes
                .opcoesAtivasCriadas++;
            }
          );
        });


      // ==================================================
      // 3. FIXAÇÃO — IMPORTAÇÃO HISTÓRICA INATIVA
      // ==================================================
      //
      // Não existe catálogo oficial de Fixação na S26.8.
      //
      // Portanto:
      //
      // - os valores históricos são conhecidos;
      // - NÃO são ativados;
      // - NÃO são publicados;
      // - NÃO são normalizados;
      // - NÃO substituem os textos já gravados.
      //
      // ==================================================

      var historicoFixacao =
        usosHistoricos.FIXACAO || {};

      var fixacoes =
        Object.keys(
          historicoFixacao
        )
        .map(function (rotulo) {
          return {
            rotulo: rotulo,
            usos:
              historicoFixacao[
                rotulo
              ] || 0
          };
        })
        .sort(function (a, b) {

          if (
            b.usos !== a.usos
          ) {
            return (
              b.usos -
              a.usos
            );
          }

          return String(
            a.rotulo
          ).localeCompare(
            String(
              b.rotulo
            ),
            'pt-BR'
          );
        });


      var idCatalogoFixacao =
        idCatalogo_(
          'FIXACAO'
        );


      fixacoes.forEach(
        function (item, index) {

          var chaveExata =
            idCatalogoFixacao +
            '|' +
            item.rotulo;

          if (
            opcoesPorChaveExata[
              chaveExata
            ]
          ) {
            return;
          }

          var opcao =
            criarOpcaoSeed_({
              catalogo:
                'FIXACAO',

              rotulo:
                item.rotulo,

              ordem:
                index + 1,

              ativo:
                false,

              publicada:
                false,

              origem:
                'HISTORICO_REGISTROS',

              usosHistoricos:
                item.usos,

              usuario:
                usuario.email,

              data:
                agora
            });

          appendObjeto_(
            abaOpcoes,
            HEADERS_OPCOES,
            opcao
          );

          opcoesPorChaveExata[
            chaveExata
          ] = opcao;

          alteracoes
            .opcoesCriadas++;

          alteracoes
            .opcoesHistoricasInativasCriadas++;
        });


      // ==================================================
      // 4. AUDITORIA DO SETUP
      // ==================================================

      var houveAlteracao =
        alteracoes
          .catalogosCriados > 0 ||
        alteracoes
          .opcoesCriadas > 0;


      if (houveAlteracao) {
        registrarAuditoria_(
          ss,
          {
            acao:
              'SETUP_S269_B1',

            entidade:
              'CATALOGOS_DOMINIO',

            entidadeId:
              'S26.9-B1',

            resultado:
              'SUCESSO',

            detalhes: {
              somenteEstruturaNova:
                true,

              registrosAlterados:
                false,

              appVersaoAlterada:
                false,

              appFaseAlterada:
                false,

              alteracoes:
                alteracoes
            },

            anterior:
              null,

            novo: {
              abas: [
                ABA_CATALOGOS,
                ABA_OPCOES
              ],

              catalogos:
                7,

              estrategiaFixacao:
                'HISTORICO_INATIVO'
            },

            usuario:
              usuario,

            versaoApp:
              config.APP_VERSAO
          }
        );
      }


      SpreadsheetApp.flush();


      var diagnostico =
        diagnosticarB1_();

      return {
        ok:
          diagnostico.ok,

        fase:
          'S26.9-B1',

        producaoMantida: {
          appVersao:
            config.APP_VERSAO,

          appFase:
            config.APP_FASE
        },

        alteracoes:
          alteracoes,

        diagnostico:
          diagnostico
      };

    } finally {
      lock.releaseLock();
    }
  }


  // ======================================================
  // SNAPSHOT OPERACIONAL
  // ======================================================

  function snapshotAtivos_() {
    var ss =
      obterPlanilha_();

    // Snapshot é contrato operacional de LEITURA. Ele deve funcionar
    // tanto antes quanto depois da promoção S26.9. O setup/mutação B1
    // permanece protegido por validarBaseline_().
    validarLeituraOperacional_(ss);

    var abaCatalogos =
      obterAbaObrigatoria_(
        ss,
        ABA_CATALOGOS
      );

    var abaOpcoes =
      obterAbaObrigatoria_(
        ss,
        ABA_OPCOES
      );

    validarHeaders_(
      abaCatalogos,
      HEADERS_CATALOGOS
    );

    validarHeaders_(
      abaOpcoes,
      HEADERS_OPCOES
    );

    var catalogos =
      linhasComoObjetos_(
        abaCatalogos
      )
      .filter(function (item) {
        return sim_(
          item.ATIVO
        );
      })
      .sort(function (a, b) {
        return numero_(
          a.ORDEM
        ) -
        numero_(
          b.ORDEM
        );
      });


    var opcoes =
      linhasComoObjetos_(
        abaOpcoes
      )
      .filter(function (item) {
        return sim_(
          item.ATIVO
        );
      });


    var opcoesPorCatalogo = {};

    opcoes.forEach(
      function (item) {

        var id =
          texto_(
            item.ID_CATALOGO
          );

        if (
          !opcoesPorCatalogo[id]
        ) {
          opcoesPorCatalogo[id] =
            [];
        }

        opcoesPorCatalogo[id]
          .push({
            id:
              texto_(
                item.ID_OPCAO
              ),

            codigo:
              texto_(
                item.CODIGO_OPCAO
              ),

            rotulo:
              texto_(
                item.ROTULO
              ),

            descricao:
              texto_(
                item.DESCRICAO
              ),

            ordem:
              numero_(
                item.ORDEM
              ),

            versao:
              numero_(
                item.VERSAO
              ) || 1
          });
      }
    );


    Object.keys(
      opcoesPorCatalogo
    ).forEach(
      function (id) {

        opcoesPorCatalogo[id]
          .sort(function (a, b) {

            if (
              a.ordem !== b.ordem
            ) {
              return (
                a.ordem -
                b.ordem
              );
            }

            return String(
              a.rotulo
            ).localeCompare(
              String(
                b.rotulo
              ),
              'pt-BR'
            );
          });
      }
    );


    var saida = catalogos.map(
      function (catalogo) {

        var id =
          texto_(
            catalogo.ID_CATALOGO
          );

        return {
          id:
            id,

          codigo:
            texto_(
              catalogo.CODIGO
            ),

          nome:
            texto_(
              catalogo.NOME
            ),

          descricao:
            texto_(
              catalogo.DESCRICAO
            ),

          campoRegistro:
            texto_(
              catalogo.CAMPO_REGISTRO
            ),

          ordem:
            numero_(
              catalogo.ORDEM
            ),

          revisao:
            numero_(
              catalogo.REVISAO
            ) || 1,

          opcoes:
            opcoesPorCatalogo[id] ||
            []
        };
      }
    );


    var revisaoFonte =
      saida
        .map(function (catalogo) {

          return [
            catalogo.codigo,
            catalogo.revisao,

            catalogo.opcoes
              .map(function (opcao) {
                return [
                  opcao.id,
                  opcao.rotulo,
                  opcao.ordem,
                  opcao.versao
                ].join(':');
              })
              .join(',')
          ].join('|');
        })
        .join('||');


    return {
      ok: true,

      contrato:
        'CATALOGOS_DOMINIO_S26_9',

      faseEstrutura:
        'S26.9-B1',

      revisaoGlobal:
        hashHex_(
          revisaoFonte
        ).substring(
          0,
          16
        ),

      geradoEm:
        new Date()
          .toISOString(),

      catalogos:
        saida
    };
  }


  // ======================================================
  // DIAGNÓSTICO B1
  // ======================================================

  function diagnosticarB1_() {
    var checks = [];

    function check(
      nome,
      ok,
      detalhe
    ) {
      checks.push({
        nome:
          nome,

        ok:
          Boolean(ok),

        detalhe:
          detalhe === null ||
          detalhe === undefined
            ? ''
            : String(
                detalhe
              )
      });
    }


    var ss =
      obterPlanilha_();

    var config =
      lerConfig_(ss);


    check(
      'BASELINE_APP_VERSAO',
      config.APP_VERSAO ===
        BASELINE_VERSAO,
      config.APP_VERSAO
    );


    check(
      'BASELINE_APP_FASE',
      config.APP_FASE ===
        BASELINE_FASE,
      config.APP_FASE
    );


    var abaCatalogos =
      ss.getSheetByName(
        ABA_CATALOGOS
      );

    var abaOpcoes =
      ss.getSheetByName(
        ABA_OPCOES
      );


    check(
      'ABA_CATALOGOS_DOMINIO',
      Boolean(
        abaCatalogos
      ),
      abaCatalogos
        ? 'OK'
        : 'AUSENTE'
    );


    check(
      'ABA_CATALOGOS_DOMINIO_OPCOES',
      Boolean(
        abaOpcoes
      ),
      abaOpcoes
        ? 'OK'
        : 'AUSENTE'
    );


    if (
      !abaCatalogos ||
      !abaOpcoes
    ) {
      return finalizarDiagnostico_(
        checks,
        {
          catalogos: 0,
          opcoes: 0
        }
      );
    }


    var headersCatalogosOk =
      headersIguais_(
        abaCatalogos,
        HEADERS_CATALOGOS
      );


    var headersOpcoesOk =
      headersIguais_(
        abaOpcoes,
        HEADERS_OPCOES
      );


    check(
      'HEADERS_CATALOGOS',
      headersCatalogosOk,
      headersCatalogosOk
        ? 'OK'
        : 'DIVERGENTE'
    );


    check(
      'HEADERS_OPCOES',
      headersOpcoesOk,
      headersOpcoesOk
        ? 'OK'
        : 'DIVERGENTE'
    );


    var catalogos =
      linhasComoObjetos_(
        abaCatalogos
      );


    var opcoes =
      linhasComoObjetos_(
        abaOpcoes
      );


    check(
      'TOTAL_CATALOGOS_7',
      catalogos.length === 7,
      catalogos.length
    );


    var catalogosPorCodigo = {};

    catalogos.forEach(
      function (item) {
        catalogosPorCodigo[
          texto_(
            item.CODIGO
          ).toUpperCase()
        ] = item;
      }
    );


    definicoesCatalogos_()
      .forEach(
        function (def) {

          var item =
            catalogosPorCodigo[
              def.codigo
            ];

          check(
            'CATALOGO_' +
              def.codigo,

            Boolean(item),

            item
              ? item.NOME
              : 'AUSENTE'
          );


          if (item) {
            check(
              'CATALOGO_' +
                def.codigo +
                '_ATIVO',

              sim_(
                item.ATIVO
              ),

              item.ATIVO
            );


            check(
              'CATALOGO_' +
                def.codigo +
                '_CAMPO',

              texto_(
                item.CAMPO_REGISTRO
              ) ===
                def.campoRegistro,

              item.CAMPO_REGISTRO
            );
          }
        }
      );


    // ====================================================
    // Verificação contra bootstrap S26.8
    // ====================================================

    var bootstrap =
      obterBootstrapAtual_();


    var resumoAtivos = {};


    definicoesCatalogos_()
      .filter(function (def) {
        return Boolean(
          def.bootstrap
        );
      })
      .forEach(
        function (def) {

          var esperado =
            normalizarListaBootstrap_(
              bootstrap[
                def.bootstrap
              ]
            ).length;


          var id =
            idCatalogo_(
              def.codigo
            );


          var atual =
            opcoes.filter(
              function (item) {

                return (
                  texto_(
                    item.ID_CATALOGO
                  ) === id &&
                  sim_(
                    item.ATIVO
                  )
                );
              }
            ).length;


          resumoAtivos[
            def.codigo
          ] = atual;


          check(
            'ATIVOS_' +
              def.codigo,

            atual === esperado,

            atual +
              '/' +
              esperado
          );
        }
      );


    // ====================================================
    // FIXAÇÃO
    // ====================================================

    var usosHistoricos =
      obterUsosHistoricos_(ss);


    var fixacoesHistoricas =
      Object.keys(
        usosHistoricos.FIXACAO ||
        {}
      );


    var opcoesFixacao =
      opcoes.filter(
        function (item) {

          return (
            texto_(
              item.ID_CATALOGO
            ) ===
            idCatalogo_(
              'FIXACAO'
            )
          );
        }
      );


    var fixacoesAtivas =
      opcoesFixacao
        .filter(function (item) {
          return sim_(
            item.ATIVO
          );
        });


    check(
      'FIXACAO_SEM_ATIVOS_AUTOMATICOS',
      fixacoesAtivas.length === 0,
      fixacoesAtivas.length
    );


    check(
      'FIXACAO_HISTORICO_IMPORTADO',
      opcoesFixacao.length ===
        fixacoesHistoricas.length,
      opcoesFixacao.length +
        '/' +
        fixacoesHistoricas.length
    );


    var fixacoesPublicadas =
      opcoesFixacao
        .filter(function (item) {
          return sim_(
            item.PUBLICADA
          );
        });


    check(
      'FIXACAO_HISTORICA_NAO_PUBLICADA',
      fixacoesPublicadas.length === 0,
      fixacoesPublicadas.length
    );


    // ====================================================
    // DUPLICIDADE DE IDs
    // ====================================================

    var ids = {};
    var idsDuplicados = [];


    opcoes.forEach(
      function (item) {

        var id =
          texto_(
            item.ID_OPCAO
          );

        if (!id) {
          return;
        }

        if (ids[id]) {
          idsDuplicados.push(
            id
          );
        }

        ids[id] = true;
      }
    );


    check(
      'IDS_OPCAO_SEM_DUPLICIDADE',
      idsDuplicados.length === 0,
      idsDuplicados.length
    );


    // ====================================================
    // REGISTROS HISTÓRICOS
    // ====================================================

    var abaRegistros =
      ss.getSheetByName(
        'REGISTROS'
      );


    check(
      'REGISTROS_PRESERVADA',
      Boolean(
        abaRegistros
      ),
      abaRegistros
        ? 'OK'
        : 'AUSENTE'
    );


    var camposHistoricos = [
      'TIPO',
      'FINALIDADE',
      'MATERIAL',
      'FIXACAO',
      'ESTADO_CONSERVACAO',
      'CONDICAO',
      'RESPONSAVEL'
    ];


    if (abaRegistros) {
      var headersRegistros =
        headers_(
          abaRegistros
        );

      camposHistoricos
        .forEach(
          function (campo) {

            check(
              'REGISTROS_' +
                campo,

              headersRegistros
                .indexOf(
                  campo
                ) >= 0,

              headersRegistros
                .indexOf(
                  campo
                ) >= 0
                ? 'PRESERVADO'
                : 'AUSENTE'
            );
          }
        );
    }


    // ====================================================
    // SNAPSHOT
    // ====================================================

    var snapshot =
      snapshotAtivos_();


    check(
      'SNAPSHOT_OK',
      snapshot.ok === true,
      snapshot.revisaoGlobal
    );


    check(
      'SNAPSHOT_7_CATALOGOS',
      snapshot.catalogos.length ===
        7,
      snapshot.catalogos.length
    );


    var totalAtivas =
      opcoes.filter(
        function (item) {
          return sim_(
            item.ATIVO
          );
        }
      ).length;


    var totalSnapshot =
      snapshot.catalogos.reduce(
        function (total, item) {

          return (
            total +
            item.opcoes.length
          );
        },
        0
      );


    check(
      'SNAPSHOT_SOMENTE_ATIVOS',
      totalSnapshot ===
        totalAtivas,
      totalSnapshot +
        '/' +
        totalAtivas
    );


    return finalizarDiagnostico_(
      checks,
      {
        catalogos:
          catalogos.length,

        opcoes:
          opcoes.length,

        opcoesAtivas:
          totalAtivas,

        fixacoesHistoricas:
          opcoesFixacao.length,

        fixacoesAtivas:
          fixacoesAtivas.length,

        registros:
          abaRegistros
            ? Math.max(
                0,
                abaRegistros
                  .getLastRow() -
                1
              )
            : 0,

        resumoAtivos:
          resumoAtivos,

        revisaoGlobal:
          snapshot.revisaoGlobal
      }
    );
  }


  // ======================================================
  // FINALIZAR DIAGNÓSTICO
  // ======================================================

  function finalizarDiagnostico_(
    checks,
    resumo
  ) {
    var falhas =
      checks.filter(
        function (item) {
          return !item.ok;
        }
      );


    var resultado = {
      ok:
        falhas.length === 0,

      gate:
        falhas.length === 0
          ? 'APTO_PARA_APROVACAO'
          : 'BLOQUEADO',

      fase:
        'S26.9-B1',

      producaoEsperada: {
        appVersao:
          BASELINE_VERSAO,

        appFase:
          BASELINE_FASE
      },

      somenteEstruturasNovas:
        true,

      resumo:
        resumo,

      totalChecks:
        checks.length,

      falhas:
        falhas.length,

      checksFalhos:
        falhas,

      checks:
        checks
    };


    console.log(
      '[S26.9-B1] ' +
      JSON.stringify(
        resultado
      )
    );


    return resultado;
  }


  // ======================================================
  // BOOTSTRAP ATUAL S26.8
  // ======================================================

  function obterBootstrapAtual_() {
    if (
      typeof appCarregarS5B !==
      'function'
    ) {
      throw new Error(
        'S26.9-B1: appCarregarS5B não encontrada. ' +
        'Seed interrompido para evitar inventar listas.'
      );
    }


    var bootstrap =
      appCarregarS5B() || {};


    var propriedades = [
      'tipos',
      'finalidades',
      'materiais',
      'estados',
      'condicoes',
      'responsaveis'
    ];


    propriedades.forEach(
      function (nome) {

        if (
          !Array.isArray(
            bootstrap[nome]
          )
        ) {
          throw new Error(
            'S26.9-B1: bootstrap.' +
            nome +
            ' ausente ou inválido.'
          );
        }
      }
    );


    return bootstrap;
  }


  // ======================================================
  // HISTÓRICO DE USO
  // ======================================================

  function obterUsosHistoricos_(ss) {
    var campos = [
      'TIPO',
      'FINALIDADE',
      'MATERIAL',
      'FIXACAO',
      'ESTADO_CONSERVACAO',
      'CONDICAO',
      'RESPONSAVEL'
    ];


    var resultado = {};

    campos.forEach(
      function (campo) {
        resultado[campo] = {};
      }
    );


    var aba =
      ss.getSheetByName(
        'REGISTROS'
      );


    if (!aba) {
      throw new Error(
        'S26.9-B1: aba REGISTROS não encontrada.'
      );
    }


    var cabecalhos =
      headers_(aba);


    var indices = {};


    campos.forEach(
      function (campo) {

        var index =
          cabecalhos.indexOf(
            campo
          );

        if (index < 0) {
          throw new Error(
            'S26.9-B1: coluna histórica ausente: ' +
            campo
          );
        }

        indices[campo] =
          index;
      }
    );


    var lastRow =
      aba.getLastRow();


    if (lastRow < 2) {
      return resultado;
    }


    var maxIndex =
      Math.max.apply(
        null,
        campos.map(
          function (campo) {
            return indices[campo];
          }
        )
      );


    var dados =
      aba
        .getRange(
          2,
          1,
          lastRow - 1,
          maxIndex + 1
        )
        .getDisplayValues();


    dados.forEach(
      function (row) {

        campos.forEach(
          function (campo) {

            var valor =
              texto_(
                row[
                  indices[campo]
                ]
              );

            if (!valor) {
              return;
            }


            if (
              !resultado[campo][
                valor
              ]
            ) {
              resultado[campo][
                valor
              ] = 0;
            }


            resultado[campo][
              valor
            ]++;
          }
        );
      }
    );


    return resultado;
  }


  // ======================================================
  // CRIAÇÃO DE OPÇÃO DE SEED
  // ======================================================

  function criarOpcaoSeed_(dados) {
    var hash =
      hashHex_(
        dados.catalogo +
        '|' +
        dados.rotulo
      );


    var chaveNormalizada =
      normalizarChave_(
        dados.rotulo
      );


    var codigoBase =
      chaveNormalizada ||
      'OPCAO';


    var codigoOpcao =
      (
        codigoBase +
        '_' +
        hash.substring(
          0,
          6
        )
      ).substring(
        0,
        100
      );


    return {
      ID_OPCAO:
        'OPT-' +
        dados.catalogo +
        '-' +
        hash.substring(
          0,
          12
        ).toUpperCase(),

      ID_CATALOGO:
        idCatalogo_(
          dados.catalogo
        ),

      CODIGO_OPCAO:
        codigoOpcao,

      ROTULO:
        dados.rotulo,

      CHAVE_NORMALIZADA:
        chaveNormalizada,

      DESCRICAO:
        '',

      ORDEM:
        dados.ordem,

      ATIVO:
        dados.ativo
          ? 'SIM'
          : 'NAO',

      PUBLICADA:
        dados.publicada
          ? 'SIM'
          : 'NAO',

      ORIGEM:
        dados.origem,

      USOS_HISTORICOS:
        Number(
          dados.usosHistoricos ||
          0
        ),

      VERSAO:
        1,

      CRIADO_EM:
        dados.data,

      CRIADO_POR:
        dados.usuario,

      ATUALIZADO_EM:
        dados.data,

      ATUALIZADO_POR:
        dados.usuario
    };
  }


  // ======================================================
  // AUDITORIA
  // ======================================================

  function registrarAuditoria_(
    ss,
    dados
  ) {
    var aba =
      ss.getSheetByName(
        'AUDITORIA'
      );


    if (!aba) {
      throw new Error(
        'S26.9-B1: aba AUDITORIA não encontrada.'
      );
    }


    var headers =
      headers_(aba);


    var necessario = [
      'ID_AUDITORIA',
      'DATA_HORA',
      'USUARIO_EMAIL',
      'USUARIO_NOME',
      'PERFIL',
      'ACAO',
      'ENTIDADE',
      'ENTIDADE_ID',
      'RESULTADO',
      'ORIGEM',
      'DEVICE_ID',
      'DETALHES_JSON',
      'VALOR_ANTERIOR_JSON',
      'VALOR_NOVO_JSON',
      'VERSAO_APP'
    ];


    necessario.forEach(
      function (campo) {
        if (
          headers.indexOf(
            campo
          ) < 0
        ) {
          throw new Error(
            'S26.9-B1: AUDITORIA sem coluna ' +
            campo
          );
        }
      }
    );


    var objeto = {
      ID_AUDITORIA:
        'AUD-S269B1-' +
        Utilities
          .getUuid()
          .replace(
            /-/g,
            ''
          )
          .substring(
            0,
            16
          )
          .toUpperCase(),

      DATA_HORA:
        new Date(),

      USUARIO_EMAIL:
        dados.usuario.email,

      USUARIO_NOME:
        dados.usuario.nome,

      PERFIL:
        dados.usuario.perfil,

      ACAO:
        dados.acao,

      ENTIDADE:
        dados.entidade,

      ENTIDADE_ID:
        dados.entidadeId,

      RESULTADO:
        dados.resultado,

      ORIGEM:
        'APPS_SCRIPT',

      DEVICE_ID:
        '',

      DETALHES_JSON:
        JSON.stringify(
          dados.detalhes || {}
        ),

      VALOR_ANTERIOR_JSON:
        dados.anterior ===
          null
          ? 'null'
          : JSON.stringify(
              dados.anterior
            ),

      VALOR_NOVO_JSON:
        dados.novo === null
          ? 'null'
          : JSON.stringify(
              dados.novo
            ),

      VERSAO_APP:
        dados.versaoApp
    };


    appendObjeto_(
      aba,
      headers,
      objeto
    );
  }


  // ======================================================
  // USUÁRIO DE EXECUÇÃO
  // ======================================================

  function obterUsuarioExecucao_(ss) {
    var email = '';


    try {
      email =
        texto_(
          Session
            .getActiveUser()
            .getEmail()
        );
    } catch (e) {}


    if (!email) {
      try {
        email =
          texto_(
            Session
              .getEffectiveUser()
              .getEmail()
          );
      } catch (e2) {}
    }


    var usuario = {
      email:
        email ||
        'APPS_SCRIPT',

      nome:
        '',

      perfil:
        ''
    };


    var aba =
      ss.getSheetByName(
        'USUARIOS'
      );


    if (
      !aba ||
      !email ||
      aba.getLastRow() < 2
    ) {
      return usuario;
    }


    var dados =
      linhasComoObjetos_(
        aba
      );


    var encontrado =
      dados.find(
        function (item) {
          return (
            texto_(
              item.EMAIL
            ).toLowerCase() ===
            email.toLowerCase()
          );
        }
      );


    if (encontrado) {
      usuario.nome =
        texto_(
          encontrado.NOME
        );

      usuario.perfil =
        texto_(
          encontrado.PERFIL
        );
    }


    return usuario;
  }


  // ======================================================
  // PLANILHA / BASELINE
  // ======================================================

  function obterPlanilha_() {
    if (
      typeof ConfigService !==
        'undefined' &&
      ConfigService &&
      typeof ConfigService
        .obterPlanilha ===
        'function'
    ) {
      var viaConfig =
        ConfigService
          .obterPlanilha();

      if (viaConfig) {
        return viaConfig;
      }
    }


    var ativa =
      SpreadsheetApp
        .getActiveSpreadsheet();


    if (ativa) {
      return ativa;
    }


    throw new Error(
      'S26.9-B1: não foi possível obter a planilha operacional.'
    );
  }


  function validarLeituraOperacional_(ss) {
    var config =
      lerConfig_(ss);


    var versaoAtual =
      texto_(
        config.APP_VERSAO
      );


    var faseAtual =
      texto_(
        config.APP_FASE
      );


    var prePromocao =
      versaoAtual === BASELINE_VERSAO &&
      faseAtual === BASELINE_FASE;


    var release =
      versaoAtual === RELEASE_VERSAO &&
      faseAtual === RELEASE_FASE;


    var releaseAtual =
      versaoAtual === RELEASE_ATUAL_VERSAO &&
      faseAtual === RELEASE_ATUAL_FASE;


    if (!prePromocao && !release && !releaseAtual) {
      throw new Error(
        'S26.9-B1 snapshot bloqueado: estado de versão incompatível. ' +
        'Permitidos=[' +
        BASELINE_VERSAO +
        ' / ' +
        BASELINE_FASE +
        '] ou [' +
        RELEASE_VERSAO +
        ' / ' +
        RELEASE_FASE +
        '] ou [' +
        RELEASE_ATUAL_VERSAO +
        ' / ' +
        RELEASE_ATUAL_FASE +
        '] atual=[' +
        versaoAtual +
        ' / ' +
        faseAtual +
        ']'
      );
    }


    return config;
  }


  function validarBaseline_(ss) {
    var config =
      lerConfig_(ss);


    if (
      config.APP_VERSAO !==
      BASELINE_VERSAO
    ) {
      throw new Error(
        'S26.9-B1 bloqueada: APP_VERSAO inesperada. ' +
        'Esperada=' +
        BASELINE_VERSAO +
        ' atual=' +
        texto_(
          config.APP_VERSAO
        )
      );
    }


    if (
      config.APP_FASE !==
      BASELINE_FASE
    ) {
      throw new Error(
        'S26.9-B1 bloqueada: APP_FASE inesperada. ' +
        'Esperada=' +
        BASELINE_FASE +
        ' atual=' +
        texto_(
          config.APP_FASE
        )
      );
    }


    return config;
  }


  function lerConfig_(ss) {
    var aba =
      ss.getSheetByName(
        'CONFIG'
      );


    if (!aba) {
      throw new Error(
        'S26.9-B1: aba CONFIG não encontrada.'
      );
    }


    var resultado = {};


    if (
      aba.getLastRow() < 2
    ) {
      return resultado;
    }


    var dados =
      aba
        .getRange(
          2,
          1,
          aba.getLastRow() - 1,
          2
        )
        .getDisplayValues();


    dados.forEach(
      function (row) {

        var chave =
          texto_(
            row[0]
          );

        if (chave) {
          resultado[chave] =
            texto_(
              row[1]
            );
        }
      }
    );


    return resultado;
  }


  // ======================================================
  // ABAS
  // ======================================================

  function garantirAba_(
    ss,
    nome,
    headersEsperados
  ) {
    var aba =
      ss.getSheetByName(
        nome
      );


    if (!aba) {
      aba =
        ss.insertSheet(
          nome
        );

      aba
        .getRange(
          1,
          1,
          1,
          headersEsperados.length
        )
        .setValues([
          headersEsperados
        ]);

      aba.setFrozenRows(1);

      aba
        .getRange(
          1,
          1,
          1,
          headersEsperados.length
        )
        .setFontWeight(
          'bold'
        );

      return aba;
    }


    if (
      aba.getLastRow() === 0
    ) {
      aba
        .getRange(
          1,
          1,
          1,
          headersEsperados.length
        )
        .setValues([
          headersEsperados
        ]);

      aba.setFrozenRows(1);

      return aba;
    }


    validarHeaders_(
      aba,
      headersEsperados
    );


    return aba;
  }


  function obterAbaObrigatoria_(
    ss,
    nome
  ) {
    var aba =
      ss.getSheetByName(
        nome
      );


    if (!aba) {
      throw new Error(
        'S26.9: aba ' +
        nome +
        ' não encontrada.'
      );
    }


    return aba;
  }


  function validarHeaders_(
    aba,
    esperados
  ) {
    if (
      !headersIguais_(
        aba,
        esperados
      )
    ) {
      throw new Error(
        'S26.9-B1: cabeçalho divergente em ' +
        aba.getName() +
        '. Nenhuma correção automática foi executada.'
      );
    }
  }


  function headersIguais_(
    aba,
    esperados
  ) {
    if (
      aba.getLastColumn() !==
      esperados.length
    ) {
      return false;
    }


    var atuais =
      aba
        .getRange(
          1,
          1,
          1,
          esperados.length
        )
        .getDisplayValues()[0]
        .map(function (item) {
          return texto_(item)
            .toUpperCase();
        });


    for (
      var i = 0;
      i < esperados.length;
      i++
    ) {
      if (
        atuais[i] !==
        esperados[i]
      ) {
        return false;
      }
    }


    return true;
  }


  function headers_(aba) {
    if (
      !aba ||
      aba.getLastColumn() < 1
    ) {
      return [];
    }


    return aba
      .getRange(
        1,
        1,
        1,
        aba.getLastColumn()
      )
      .getDisplayValues()[0]
      .map(function (item) {
        return texto_(item)
          .toUpperCase();
      });
  }


  // ======================================================
  // OBJETOS / SHEETS
  // ======================================================

  function linhasComoObjetos_(aba) {
    if (
      !aba ||
      aba.getLastRow() < 2
    ) {
      return [];
    }


    var headers =
      headers_(aba);


    var dados =
      aba
        .getRange(
          2,
          1,
          aba.getLastRow() - 1,
          headers.length
        )
        .getDisplayValues();


    return dados
      .filter(function (row) {

        return row.some(
          function (valor) {
            return Boolean(
              texto_(valor)
            );
          }
        );
      })
      .map(function (row) {

        var obj = {};

        headers.forEach(
          function (
            header,
            index
          ) {
            obj[header] =
              row[index];
          }
        );

        return obj;
      });
  }


  function appendObjeto_(
    aba,
    headers,
    objeto
  ) {
    var row =
      headers.map(
        function (header) {

          if (
            Object.prototype
              .hasOwnProperty.call(
                objeto,
                header
              )
          ) {
            return objeto[
              header
            ];
          }

          return '';
        }
      );


    aba
      .getRange(
        aba.getLastRow() + 1,
        1,
        1,
        headers.length
      )
      .setValues([
        row
      ]);
  }


  // ======================================================
  // VALIDAÇÃO DE CATÁLOGO EXISTENTE
  // ======================================================

  function validarCatalogoExistente_(
    existente,
    def
  ) {
    if (
      texto_(
        existente.CAMPO_REGISTRO
      ) !==
      def.campoRegistro
    ) {
      throw new Error(
        'S26.9-B1: catálogo ' +
        def.codigo +
        ' já existe com CAMPO_REGISTRO divergente.'
      );
    }
  }


  // ======================================================
  // LISTAS
  // ======================================================

  function normalizarListaBootstrap_(
    lista
  ) {
    if (
      !Array.isArray(
        lista
      )
    ) {
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
          typeof item ===
            'string' ||
          typeof item ===
            'number' ||
          typeof item ===
            'boolean'
        ) {
          return texto_(
            item
          );
        }


        if (
          typeof item ===
          'object'
        ) {
          return texto_(
            item.rotulo ||
            item.label ||
            item.nome ||
            item.valor ||
            item.codigo ||
            item.id ||
            ''
          );
        }


        return texto_(item);
      })
      .filter(function (item) {
        return Boolean(item);
      });
  }


  // ======================================================
  // IDENTIFICADORES
  // ======================================================

  function idCatalogo_(codigo) {
    return (
      'CAT-' +
      texto_(
        codigo
      )
      .toUpperCase()
    );
  }


  function hashHex_(texto) {
    var digest =
      Utilities.computeDigest(
        Utilities
          .DigestAlgorithm
          .SHA_256,

        String(
          texto || ''
        ),

        Utilities
          .Charset
          .UTF_8
      );


    return digest
      .map(function (byte) {

        var valor =
          byte < 0
            ? byte + 256
            : byte;


        var hex =
          valor.toString(
            16
          );


        return hex.length === 1
          ? '0' + hex
          : hex;
      })
      .join('');
  }


  function normalizarChave_(
    valor
  ) {
    var texto =
      texto_(valor)
        .toUpperCase();


    try {
      texto =
        texto
          .normalize('NFD')
          .replace(
            /[\u0300-\u036f]/g,
            ''
          );
    } catch (e) {}


    return texto
      .replace(
        /[^A-Z0-9]+/g,
        '_'
      )
      .replace(
        /^_+|_+$/g,
        ''
      )
      .replace(
        /_+/g,
        '_'
      );
  }


  // ======================================================
  // UTILITÁRIOS
  // ======================================================

  function texto_(valor) {
    if (
      valor === null ||
      valor === undefined
    ) {
      return '';
    }

    return String(
      valor
    ).trim();
  }


  function numero_(valor) {
    var n =
      Number(
        String(
          valor === null ||
          valor === undefined
            ? ''
            : valor
        )
        .replace(
          ',',
          '.'
        )
      );

    return isFinite(n)
      ? n
      : 0;
  }


  function sim_(valor) {
    if (valor === true) {
      return true;
    }

    if (valor === false) {
      return false;
    }

    var v =
      texto_(valor)
        .toUpperCase();

    return (
      v === 'SIM' ||
      v === 'TRUE' ||
      v === '1' ||
      v === 'YES'
    );
  }


  // ======================================================
  // API DO SERVICE
  // ======================================================

  return {
    instalarB1:
      instalarB1_,

    diagnosticarB1:
      diagnosticarB1_,

    snapshotAtivos:
      snapshotAtivos_
  };

})();


// ========================================================
// WRAPPERS PÚBLICOS
// ========================================================


function setupS269B1() {
  return CatalogosDominioServiceS269
    .instalarB1();
}


function diagnosticoS269B1() {
  return CatalogosDominioServiceS269
    .diagnosticarB1();
}


function appCatalogosDominioSnapshot() {
  return CatalogosDominioServiceS269
    .snapshotAtivos();
}
