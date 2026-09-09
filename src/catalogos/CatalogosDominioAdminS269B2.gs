// ========================================================
// S26.9-B2.1 — ADMINISTRAÇÃO DOS CATÁLOGOS DE DOMÍNIO
// ========================================================
//
// DEPENDE DE:
// - S26.9-B1 aprovado
// - CATALOGOS_DOMINIO
// - CATALOGOS_DOMINIO_OPCOES
//
// ESTADOS DE VERSÃO COMPATÍVEIS:
//
// PRÉ-PROMOÇÃO / ROLLBACK:
// APP_VERSAO = MVP-3.30.0-SINALIZACAO-S26.8
// APP_FASE   = S26.8
//
// RELEASE S26.9:
// APP_VERSAO = MVP-3.31.0-SINALIZACAO-S26.9
// APP_FASE   = S26.9
//
// O serviço aceita somente esses dois pares exatos.
// Estados mistos (ex.: versão S26.9 com fase S26.8)
// permanecem bloqueados.
//
// NÃO ALTERA:
// - APP_VERSAO
// - APP_FASE
// - REGISTROS históricos
// - IndexedDB
// - Outbox
// - cartografia
// - bootstrap S26.8
// - formulário Novo registro
//
// Administração:
// - somente ADMIN;
// - autorização pelo mecanismo S14 existente;
// - somente servidor/online;
// - auditoria obrigatória;
// - renomear opção NÃO renomeia registros históricos;
// - opção publicada/usada NÃO pode ser apagada fisicamente.
//
// ========================================================


var CatalogosDominioAdminServiceS269 = (function () {

  var ABA_CATALOGOS =
    'CATALOGOS_DOMINIO';

  var ABA_OPCOES =
    'CATALOGOS_DOMINIO_OPCOES';

  var ABA_REGISTROS =
    'REGISTROS';

  var ABA_AUDITORIA =
    'AUDITORIA';


  var BASELINE_VERSAO =
    'MVP-3.30.0-SINALIZACAO-S26.8';

  var BASELINE_FASE =
    'S26.8';


  var RELEASE_VERSAO =
    'MVP-3.31.0-SINALIZACAO-S26.9';

  var RELEASE_FASE =
    'S26.9';


  var RELEASE_ATUAL_VERSAO =
    'MVP-3.32.0-SINALIZACAO-S26.10';

  var RELEASE_ATUAL_FASE =
    'S26.10';


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
  // AUTORIZAÇÃO
  // ======================================================

  function exigirAdmin_() {

    if (
      typeof exigirPermissaoS14_ !==
      'function'
    ) {

      throw new Error(
        'S26.9-B2: exigirPermissaoS14_ indisponível.'
      );
    }


    // Usa a mesma barreira administrativa
    // já existente na aplicação.
    exigirPermissaoS14_(
      'administrar'
    );


    // A autorização ocorreu acima.
    // A sessão abaixo serve para identidade e auditoria.
    return obterSessaoAtualS269_();
  }


  // ======================================================
  // SESSÃO / IDENTIDADE
  // ======================================================

  function obterSessaoAtualS269_() {

    // ====================================================
    // 1. CONTRATO OFICIAL S14
    // ====================================================

    if (
      typeof appSessaoS14 ===
      'function'
    ) {

      try {

        var sessao =
          appSessaoS14();


        if (sessao) {

          return sessao;
        }

      } catch (e) {

        // A autorização não depende deste fallback.
        // exigirPermissaoS14_() já foi executada
        // antes desta função.
      }
    }


    // ====================================================
    // 2. FALLBACK DE IDENTIDADE
    // ====================================================
    //
    // IMPORTANTE:
    //
    // Este fallback NÃO concede permissão.
    //
    // Ele serve somente para:
    // - CRIADO_POR
    // - ATUALIZADO_POR
    // - AUDITORIA
    //
    // ====================================================

    var email = '';


    try {

      email =
        String(
          Session
            .getActiveUser()
            .getEmail() ||
          ''
        ).trim();

    } catch (e1) {}


    if (!email) {

      try {

        email =
          String(
            Session
              .getEffectiveUser()
              .getEmail() ||
            ''
          ).trim();

      } catch (e2) {}
    }


    var fallback = {

      autenticado:
        Boolean(email),

      email:
        email,

      nome:
        '',

      perfil:
        '',

      ativo:
        Boolean(email),

      setorPadrao:
        '',

      permissoes: {
        administrar:
          true
      },

      origem:
        'APPS_SCRIPT'
    };


    if (!email) {

      return fallback;
    }


    try {

      var ss =
        planilha_();


      var aba =
        ss.getSheetByName(
          'USUARIOS'
        );


      if (
        !aba ||
        aba.getLastRow() < 2
      ) {

        return fallback;
      }


      var usuarios =
        linhas_(aba);


      var usuario =
        usuarios.find(
          function (item) {

            return (
              texto_(
                item.EMAIL
              ).toLowerCase() ===
              email.toLowerCase()
            );
          }
        );


      if (!usuario) {

        return fallback;
      }


      return {

        autenticado:
          true,

        email:
          texto_(
            usuario.EMAIL
          ),

        nome:
          texto_(
            usuario.NOME
          ),

        perfil:
          texto_(
            usuario.PERFIL
          ).toUpperCase(),

        ativo:
          sim_(
            usuario.ATIVO
          ),

        setorPadrao:
          texto_(
            usuario.SETOR_PADRAO
          ),

        permissoes: {

          administrar:
            texto_(
              usuario.PERFIL
            ).toUpperCase() ===
            'ADMIN'
        },

        origem:
          'APPS_SCRIPT'
      };


    } catch (e3) {

      return fallback;
    }
  }


  function usuario_(sessao) {

    sessao =
      sessao || {};


    var email =
      texto_(
        sessao.email ||
        sessao.EMAIL ||
        sessao.usuarioEmail ||
        ''
      );


    if (!email) {

      try {

        email =
          texto_(
            Session
              .getActiveUser()
              .getEmail()
          );

      } catch (e1) {}
    }


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


    return {

      email:
        email ||
        'APPS_SCRIPT',

      nome:
        texto_(
          sessao.nome ||
          sessao.NOME ||
          email ||
          'Administrador'
        ),

      perfil:
        texto_(
          sessao.perfil ||
          sessao.PERFIL ||
          'ADMIN'
        ).toUpperCase()
    };
  }


  // ======================================================
  // CARREGAMENTO ADMINISTRATIVO
  // ======================================================

  function carregar_() {

    var sessao =
      exigirAdmin_();


    var ss =
      planilha_();


    validarBaseline_(ss);


    var shCatalogos =
      abaObrigatoria_(
        ss,
        ABA_CATALOGOS
      );


    var shOpcoes =
      abaObrigatoria_(
        ss,
        ABA_OPCOES
      );


    validarHeaders_(
      shCatalogos,
      HEADERS_CATALOGOS
    );


    validarHeaders_(
      shOpcoes,
      HEADERS_OPCOES
    );


    var catalogos =
      linhas_(shCatalogos);


    var opcoes =
      linhas_(shOpcoes);


    var usos =
      usosAtuais_(ss);


    var porCatalogo = {};


    opcoes.forEach(
      function (opcao) {

        var idCatalogo =
          texto_(
            opcao.ID_CATALOGO
          );


        if (
          !porCatalogo[idCatalogo]
        ) {

          porCatalogo[idCatalogo] =
            [];
        }


        porCatalogo[idCatalogo]
          .push(opcao);
      }
    );


    var resultadoCatalogos =
      catalogos
        .sort(
          function (a, b) {

            return (
              numero_(a.ORDEM) -
              numero_(b.ORDEM)
            );
          }
        )
        .map(
          function (catalogo) {

            var idCatalogo =
              texto_(
                catalogo.ID_CATALOGO
              );


            var campo =
              texto_(
                catalogo.CAMPO_REGISTRO
              );


            var lista =
              porCatalogo[
                idCatalogo
              ] || [];


            lista.sort(
              function (a, b) {

                var oa =
                  numero_(
                    a.ORDEM
                  );


                var ob =
                  numero_(
                    b.ORDEM
                  );


                if (oa !== ob) {

                  return oa - ob;
                }


                return texto_(
                  a.ROTULO
                ).localeCompare(
                  texto_(
                    b.ROTULO
                  ),
                  'pt-BR'
                );
              }
            );


            return {

              id:
                idCatalogo,

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
                campo,

              ordem:
                numero_(
                  catalogo.ORDEM
                ),

              ativo:
                sim_(
                  catalogo.ATIVO
                ),

              revisao:
                numero_(
                  catalogo.REVISAO
                ) || 1,

              opcoes:
                lista.map(
                  function (opcao) {

                    var rotulo =
                      texto_(
                        opcao.ROTULO
                      );


                    var usosAtuais =
                      usos[campo] &&
                      usos[campo][rotulo]
                        ? usos[campo][rotulo]
                        : 0;


                    var usosRegistrados =
                      numero_(
                        opcao.USOS_HISTORICOS
                      );


                    var ativo =
                      sim_(
                        opcao.ATIVO
                      );


                    var publicada =
                      sim_(
                        opcao.PUBLICADA
                      );


                    var podeRemover =
                      !ativo &&
                      !publicada &&
                      usosAtuais === 0 &&
                      usosRegistrados === 0;


                    return {

                      id:
                        texto_(
                          opcao.ID_OPCAO
                        ),

                      codigo:
                        texto_(
                          opcao.CODIGO_OPCAO
                        ),

                      rotulo:
                        rotulo,

                      chaveNormalizada:
                        texto_(
                          opcao.CHAVE_NORMALIZADA
                        ),

                      descricao:
                        texto_(
                          opcao.DESCRICAO
                        ),

                      ordem:
                        numero_(
                          opcao.ORDEM
                        ),

                      ativo:
                        ativo,

                      publicada:
                        publicada,

                      origem:
                        texto_(
                          opcao.ORIGEM
                        ),

                      usosHistoricosRegistrados:
                        usosRegistrados,

                      usosValorAtual:
                        usosAtuais,

                      versao:
                        numero_(
                          opcao.VERSAO
                        ) || 1,

                      podeRemover:
                        podeRemover
                    };
                  }
                )
            };
          }
        );


    return {

      ok:
        true,

      fase:
        'S26.9-B2.1',

      podeAdministrar:
        true,

      usuario:
        usuario_(sessao),

      catalogos:
        resultadoCatalogos
    };
  }


  // ======================================================
  // CRIAR OPÇÃO
  // ======================================================

  function criarOpcao_(dados) {

    return criarOpcaoComOrigem_(
      dados,
      'ADMIN_S26_9_B2'
    );
  }


  function criarOpcaoComOrigem_(
    dados,
    origem
  ) {

    dados =
      dados || {};


    var lock =
      LockService
        .getScriptLock();


    lock.waitLock(
      30000
    );


    try {

      var sessao =
        exigirAdmin_();


      var user =
        usuario_(sessao);


      var ss =
        planilha_();


      validarBaseline_(ss);


      var catalogo =
        localizarCatalogo_(
          ss,
          dados.codigoCatalogo
        );


      var rotulo =
        validarRotulo_(
          dados.rotulo
        );


      var descricao =
        validarDescricao_(
          dados.descricao
        );


      var shOpcoes =
        abaObrigatoria_(
          ss,
          ABA_OPCOES
        );


      var opcoes =
        linhas_(
          shOpcoes
        );


      validarDuplicidade_(
        opcoes,
        catalogo.ID_CATALOGO,
        rotulo,
        ''
      );


      var ordem =
        proximaOrdem_(
          opcoes,
          catalogo.ID_CATALOGO
        );


      var ativo =
        boolEntrada_(
          dados.ativo,
          false
        );


      var agora =
        new Date();


      var uuid =
        Utilities
          .getUuid()
          .replace(
            /-/g,
            ''
          )
          .toUpperCase();


      var idOpcao =
        'OPT-' +
        texto_(
          catalogo.CODIGO
        ) +
        '-' +
        uuid.substring(
          0,
          12
        );


      var chave =
        normalizarChave_(
          rotulo
        );


      var codigoOpcao =
        (
          chave.substring(
            0,
            70
          ) +
          '_' +
          uuid.substring(
            0,
            6
          )
        ).substring(
          0,
          100
        );


      var nova = {

        ID_OPCAO:
          idOpcao,

        ID_CATALOGO:
          catalogo.ID_CATALOGO,

        CODIGO_OPCAO:
          codigoOpcao,

        ROTULO:
          rotulo,

        CHAVE_NORMALIZADA:
          chave,

        DESCRICAO:
          descricao,

        ORDEM:
          ordem,

        ATIVO:
          ativo
            ? 'SIM'
            : 'NAO',

        PUBLICADA:
          ativo
            ? 'SIM'
            : 'NAO',

        ORIGEM:
          origem,

        USOS_HISTORICOS:
          0,

        VERSAO:
          1,

        CRIADO_EM:
          agora,

        CRIADO_POR:
          user.email,

        ATUALIZADO_EM:
          agora,

        ATUALIZADO_POR:
          user.email
      };


      appendObjeto_(
        shOpcoes,
        HEADERS_OPCOES,
        nova
      );


      incrementarRevisaoCatalogo_(
        ss,
        catalogo.ID_CATALOGO,
        user
      );


      auditar_(
        ss,
        {

          usuario:
            user,

          acao:
            'CATALOGO_OPCAO_CRIADA',

          entidade:
            'CATALOGO_DOMINIO_OPCAO',

          entidadeId:
            idOpcao,

          resultado:
            'SUCESSO',

          detalhes: {

            catalogo:
              catalogo.CODIGO,

            origem:
              origem
          },

          anterior:
            null,

          novo:
            serializar_(nova)
        }
      );


      SpreadsheetApp.flush();


      return {

        ok:
          true,

        idOpcao:
          idOpcao,

        codigoCatalogo:
          catalogo.CODIGO,

        rotulo:
          rotulo,

        ativo:
          ativo,

        publicada:
          ativo
      };


    } finally {

      lock.releaseLock();
    }
  }


  // ======================================================
  // EDITAR OPÇÃO
  // ======================================================

  function editarOpcao_(dados) {

    dados =
      dados || {};


    var lock =
      LockService
        .getScriptLock();


    lock.waitLock(
      30000
    );


    try {

      var sessao =
        exigirAdmin_();


      var user =
        usuario_(sessao);


      var ss =
        planilha_();


      validarBaseline_(ss);


      var shOpcoes =
        abaObrigatoria_(
          ss,
          ABA_OPCOES
        );


      var opcao =
        localizarOpcao_(
          shOpcoes,
          dados.idOpcao
        );


      var catalogo =
        localizarCatalogoPorId_(
          ss,
          opcao.ID_CATALOGO
        );


      var anterior =
        serializar_(
          opcao
        );


      var novoRotulo =
        Object.prototype
          .hasOwnProperty.call(
            dados,
            'rotulo'
          )
            ? validarRotulo_(
                dados.rotulo
              )
            : texto_(
                opcao.ROTULO
              );


      var novaDescricao =
        Object.prototype
          .hasOwnProperty.call(
            dados,
            'descricao'
          )
            ? validarDescricao_(
                dados.descricao
              )
            : texto_(
                opcao.DESCRICAO
              );


      if (
        novoRotulo !==
        texto_(
          opcao.ROTULO
        )
      ) {

        validarDuplicidade_(
          linhas_(
            shOpcoes
          ),
          opcao.ID_CATALOGO,
          novoRotulo,
          opcao.ID_OPCAO
        );
      }


      var mudou =
        novoRotulo !==
          texto_(
            opcao.ROTULO
          ) ||
        novaDescricao !==
          texto_(
            opcao.DESCRICAO
          );


      if (!mudou) {

        return {

          ok:
            true,

          alterado:
            false,

          idOpcao:
            opcao.ID_OPCAO
        };
      }


      var agora =
        new Date();


      atualizarLinha_(
        shOpcoes,
        opcao.__row,
        HEADERS_OPCOES,
        {

          ROTULO:
            novoRotulo,

          CHAVE_NORMALIZADA:
            normalizarChave_(
              novoRotulo
            ),

          DESCRICAO:
            novaDescricao,

          VERSAO:
            numero_(
              opcao.VERSAO
            ) + 1,

          ATUALIZADO_EM:
            agora,

          ATUALIZADO_POR:
            user.email
        }
      );


      incrementarRevisaoCatalogo_(
        ss,
        opcao.ID_CATALOGO,
        user
      );


      var depois =
        localizarOpcao_(
          shOpcoes,
          opcao.ID_OPCAO
        );


      auditar_(
        ss,
        {

          usuario:
            user,

          acao:
            'CATALOGO_OPCAO_EDITADA',

          entidade:
            'CATALOGO_DOMINIO_OPCAO',

          entidadeId:
            opcao.ID_OPCAO,

          resultado:
            'SUCESSO',

          detalhes: {

            catalogo:
              catalogo.CODIGO,

            renomeada:
              novoRotulo !==
              texto_(
                opcao.ROTULO
              ),

            historicoAlterado:
              false
          },

          anterior:
            anterior,

          novo:
            serializar_(
              depois
            )
        }
      );


      return {

        ok:
          true,

        alterado:
          true,

        idOpcao:
          opcao.ID_OPCAO,

        rotulo:
          novoRotulo,

        historicoAlterado:
          false
      };


    } finally {

      lock.releaseLock();
    }
  }


  // ======================================================
  // ATIVAR / DESATIVAR
  // ======================================================

  function definirAtivo_(dados) {

    dados =
      dados || {};


    var lock =
      LockService
        .getScriptLock();


    lock.waitLock(
      30000
    );


    try {

      var sessao =
        exigirAdmin_();


      var user =
        usuario_(sessao);


      var ss =
        planilha_();


      validarBaseline_(ss);


      var shOpcoes =
        abaObrigatoria_(
          ss,
          ABA_OPCOES
        );


      var opcao =
        localizarOpcao_(
          shOpcoes,
          dados.idOpcao
        );


      var ativoNovo =
        boolEntradaObrigatoria_(
          dados.ativo
        );


      var ativoAtual =
        sim_(
          opcao.ATIVO
        );


      if (
        ativoAtual ===
        ativoNovo
      ) {

        return {

          ok:
            true,

          alterado:
            false,

          idOpcao:
            opcao.ID_OPCAO,

          ativo:
            ativoAtual
        };
      }


      var anterior =
        serializar_(
          opcao
        );


      var agora =
        new Date();


      // PUBLICADA funciona como memória histórica:
      //
      // uma vez que a opção tenha sido disponibilizada
      // operacionalmente, ela permanece PUBLICADA=SIM
      // mesmo quando for posteriormente desativada.
      var publicadaNova =
        ativoNovo
          ? 'SIM'
          : texto_(
              opcao.PUBLICADA
            );


      atualizarLinha_(
        shOpcoes,
        opcao.__row,
        HEADERS_OPCOES,
        {

          ATIVO:
            ativoNovo
              ? 'SIM'
              : 'NAO',

          PUBLICADA:
            publicadaNova,

          VERSAO:
            numero_(
              opcao.VERSAO
            ) + 1,

          ATUALIZADO_EM:
            agora,

          ATUALIZADO_POR:
            user.email
        }
      );


      incrementarRevisaoCatalogo_(
        ss,
        opcao.ID_CATALOGO,
        user
      );


      var depois =
        localizarOpcao_(
          shOpcoes,
          opcao.ID_OPCAO
        );


      auditar_(
        ss,
        {

          usuario:
            user,

          acao:
            ativoNovo
              ? 'CATALOGO_OPCAO_ATIVADA'
              : 'CATALOGO_OPCAO_DESATIVADA',

          entidade:
            'CATALOGO_DOMINIO_OPCAO',

          entidadeId:
            opcao.ID_OPCAO,

          resultado:
            'SUCESSO',

          detalhes: {

            catalogo:
              opcao.ID_CATALOGO,

            publicadaPermanente:
              sim_(
                depois.PUBLICADA
              )
          },

          anterior:
            anterior,

          novo:
            serializar_(
              depois
            )
        }
      );


      return {

        ok:
          true,

        alterado:
          true,

        idOpcao:
          opcao.ID_OPCAO,

        ativo:
          ativoNovo,

        publicada:
          sim_(
            depois.PUBLICADA
          )
      };


    } finally {

      lock.releaseLock();
    }
  }


  // ======================================================
  // REORDENAÇÃO
  // ======================================================
  //
  // Entrada:
  //
  // {
  //   codigoCatalogo: "MATERIAL",
  //   itens: [
  //     {
  //       idOpcao: "...",
  //       ordem: 1
  //     },
  //     {
  //       idOpcao: "...",
  //       ordem: 2
  //     }
  //   ]
  // }
  //
  // ======================================================

  function reordenar_(dados) {

    dados =
      dados || {};


    var itens =
      Array.isArray(
        dados.itens
      )
        ? dados.itens
        : [];


    if (!itens.length) {

      throw new Error(
        'Informe as opções e suas novas ordens.'
      );
    }


    var lock =
      LockService
        .getScriptLock();


    lock.waitLock(
      30000
    );


    try {

      var sessao =
        exigirAdmin_();


      var user =
        usuario_(sessao);


      var ss =
        planilha_();


      validarBaseline_(ss);


      var catalogo =
        localizarCatalogo_(
          ss,
          dados.codigoCatalogo
        );


      var shOpcoes =
        abaObrigatoria_(
          ss,
          ABA_OPCOES
        );


      var todos =
        linhas_(
          shOpcoes
        );


      var idsVistos = {};


      var antes = [];
      var depois = [];


      var agora =
        new Date();


      itens.forEach(
        function (item) {

          var idOpcao =
            texto_(
              item.idOpcao
            );


          if (!idOpcao) {

            throw new Error(
              'ID de opção inválido na ordenação.'
            );
          }


          if (
            idsVistos[idOpcao]
          ) {

            throw new Error(
              'Opção repetida na ordenação: ' +
              idOpcao
            );
          }


          idsVistos[idOpcao] =
            true;


          var ordemNova =
            parseInt(
              item.ordem,
              10
            );


          if (
            !isFinite(
              ordemNova
            ) ||
            ordemNova < 1
          ) {

            throw new Error(
              'Ordem inválida para ' +
              idOpcao
            );
          }


          var opcao =
            todos.find(
              function (x) {

                return (
                  texto_(
                    x.ID_OPCAO
                  ) ===
                  idOpcao
                );
              }
            );


          if (!opcao) {

            throw new Error(
              'Opção não encontrada: ' +
              idOpcao
            );
          }


          if (
            texto_(
              opcao.ID_CATALOGO
            ) !==
            texto_(
              catalogo.ID_CATALOGO
            )
          ) {

            throw new Error(
              'A opção ' +
              idOpcao +
              ' não pertence ao catálogo ' +
              catalogo.CODIGO +
              '.'
            );
          }


          antes.push({

            idOpcao:
              idOpcao,

            ordem:
              numero_(
                opcao.ORDEM
              )
          });


          if (
            numero_(
              opcao.ORDEM
            ) !==
            ordemNova
          ) {

            atualizarLinha_(
              shOpcoes,
              opcao.__row,
              HEADERS_OPCOES,
              {

                ORDEM:
                  ordemNova,

                VERSAO:
                  numero_(
                    opcao.VERSAO
                  ) + 1,

                ATUALIZADO_EM:
                  agora,

                ATUALIZADO_POR:
                  user.email
              }
            );
          }


          depois.push({

            idOpcao:
              idOpcao,

            ordem:
              ordemNova
          });
        }
      );


      var houveMudanca =
        antes.some(
          function (
            item,
            index
          ) {

            return (
              item.ordem !==
              depois[index].ordem
            );
          }
        );


      if (!houveMudanca) {

        return {

          ok:
            true,

          alterado:
            false
        };
      }


      incrementarRevisaoCatalogo_(
        ss,
        catalogo.ID_CATALOGO,
        user
      );


      auditar_(
        ss,
        {

          usuario:
            user,

          acao:
            'CATALOGO_OPCOES_REORDENADAS',

          entidade:
            'CATALOGO_DOMINIO',

          entidadeId:
            catalogo.ID_CATALOGO,

          resultado:
            'SUCESSO',

          detalhes: {

            catalogo:
              catalogo.CODIGO,

            quantidade:
              itens.length
          },

          anterior:
            antes,

          novo:
            depois
        }
      );


      return {

        ok:
          true,

        alterado:
          true,

        codigoCatalogo:
          catalogo.CODIGO,

        quantidade:
          itens.length
      };


    } finally {

      lock.releaseLock();
    }
  }


  // ======================================================
  // REMOÇÃO FÍSICA SEGURA
  // ======================================================

  function removerOpcao_(dados) {

    dados =
      dados || {};


    var lock =
      LockService
        .getScriptLock();


    lock.waitLock(
      30000
    );


    try {

      var sessao =
        exigirAdmin_();


      var user =
        usuario_(sessao);


      var ss =
        planilha_();


      validarBaseline_(ss);


      var shOpcoes =
        abaObrigatoria_(
          ss,
          ABA_OPCOES
        );


      var opcao =
        localizarOpcao_(
          shOpcoes,
          dados.idOpcao
        );


      var catalogo =
        localizarCatalogoPorId_(
          ss,
          opcao.ID_CATALOGO
        );


      var dependencia =
        dependenciasOpcao_(
          ss,
          catalogo,
          opcao
        );


      if (
        dependencia
          .motivos
          .length
      ) {

        auditar_(
          ss,
          {

            usuario:
              user,

            acao:
              'CATALOGO_OPCAO_REMOCAO_BLOQUEADA',

            entidade:
              'CATALOGO_DOMINIO_OPCAO',

            entidadeId:
              opcao.ID_OPCAO,

            resultado:
              'BLOQUEADO',

            detalhes:
              dependencia,

            anterior:
              serializar_(
                opcao
              ),

            novo:
              null
          }
        );


        return {

          ok:
            false,

          bloqueado:
            true,

          idOpcao:
            opcao.ID_OPCAO,

          rotulo:
            opcao.ROTULO,

          motivos:
            dependencia.motivos,

          usosHistoricos:
            dependencia
              .usosHistoricos,

          usosValorAtual:
            dependencia
              .usosValorAtual,

          recomendacao:
            'DESATIVAR'
        };
      }


      var anterior =
        serializar_(
          opcao
        );


      shOpcoes.deleteRow(
        opcao.__row
      );


      incrementarRevisaoCatalogo_(
        ss,
        catalogo.ID_CATALOGO,
        user
      );


      auditar_(
        ss,
        {

          usuario:
            user,

          acao:
            'CATALOGO_OPCAO_REMOVIDA',

          entidade:
            'CATALOGO_DOMINIO_OPCAO',

          entidadeId:
            opcao.ID_OPCAO,

          resultado:
            'SUCESSO',

          detalhes: {

            catalogo:
              catalogo.CODIGO,

            remocaoFisica:
              true,

            historicoAlterado:
              false
          },

          anterior:
            anterior,

          novo:
            null
        }
      );


      return {

        ok:
          true,

        removida:
          true,

        idOpcao:
          opcao.ID_OPCAO
      };


    } finally {

      lock.releaseLock();
    }
  }


  // ======================================================
  // DEPENDÊNCIAS
  // ======================================================

  function dependenciasOpcao_(
    ss,
    catalogo,
    opcao
  ) {

    var motivos =
      [];


    var ativo =
      sim_(
        opcao.ATIVO
      );


    var publicada =
      sim_(
        opcao.PUBLICADA
      );


    var usosHistoricos =
      numero_(
        opcao.USOS_HISTORICOS
      );


    var usosValorAtual =
      contarValorRegistros_(
        ss,
        catalogo.CAMPO_REGISTRO,
        opcao.ROTULO
      );


    if (ativo) {

      motivos.push(
        'OPCAO_ATIVA'
      );
    }


    if (publicada) {

      motivos.push(
        'OPCAO_JA_PUBLICADA'
      );
    }


    if (
      usosHistoricos > 0
    ) {

      motivos.push(
        'USOS_HISTORICOS_REGISTRADOS'
      );
    }


    if (
      usosValorAtual > 0
    ) {

      motivos.push(
        'VALOR_ENCONTRADO_EM_REGISTROS'
      );
    }


    return {

      motivos:
        motivos,

      ativo:
        ativo,

      publicada:
        publicada,

      usosHistoricos:
        usosHistoricos,

      usosValorAtual:
        usosValorAtual
    };
  }


  // ======================================================
  // HISTÓRICO ADMINISTRATIVO
  // ======================================================

  function historico_(
    idOpcao,
    limite
  ) {

    exigirAdmin_();


    idOpcao =
      texto_(
        idOpcao
      );


    if (!idOpcao) {

      throw new Error(
        'Informe a opção.'
      );
    }


    limite =
      Math.min(
        Math.max(
          parseInt(
            limite,
            10
          ) || 50,
          1
        ),
        200
      );


    var ss =
      planilha_();


    validarBaseline_(ss);


    var aba =
      abaObrigatoria_(
        ss,
        ABA_AUDITORIA
      );


    var dados =
      linhas_(aba)
        .filter(
          function (item) {

            return (
              texto_(
                item.ENTIDADE
              ) ===
              'CATALOGO_DOMINIO_OPCAO' &&

              texto_(
                item.ENTIDADE_ID
              ) ===
              idOpcao
            );
          }
        )
        .reverse()
        .slice(
          0,
          limite
        )
        .map(
          function (item) {

            return {

              id:
                texto_(
                  item.ID_AUDITORIA
                ),

              dataHora:
                serializar_(
                  item.DATA_HORA
                ),

              usuarioEmail:
                texto_(
                  item.USUARIO_EMAIL
                ),

              usuarioNome:
                texto_(
                  item.USUARIO_NOME
                ),

              perfil:
                texto_(
                  item.PERFIL
                ),

              acao:
                texto_(
                  item.ACAO
                ),

              resultado:
                texto_(
                  item.RESULTADO
                ),

              detalhes:
                jsonSeguro_(
                  item.DETALHES_JSON
                ),

              anterior:
                jsonSeguro_(
                  item.VALOR_ANTERIOR_JSON
                ),

              novo:
                jsonSeguro_(
                  item.VALOR_NOVO_JSON
                )
            };
          }
        );


    return {

      ok:
        true,

      idOpcao:
        idOpcao,

      historico:
        dados
    };
  }


  // ======================================================
  // DIAGNÓSTICO B2.1
  // ======================================================

  function diagnosticar_() {

    var checks =
      [];


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
          detalhe === undefined ||
          detalhe === null
            ? ''
            : String(
                detalhe
              )
      });
    }


    var ss =
      planilha_();


    var config =
      lerConfig_(ss);


    // ====================================================
    // BASELINE
    // ====================================================

    var estadoVersao =
      estadoVersaoPermitido_(
        config
      );


    // Mantemos os nomes históricos dos checks B2
    // para não quebrar consumidores/diagnósticos existentes.
    //
    // A validação, porém, passa a aceitar:
    // - S26.8 durante pré-promoção/rollback;
    // - S26.9 depois da promoção oficial.
    //
    // Pares mistos continuam bloqueados.
    check(
      'BASELINE_APP_VERSAO',
      estadoVersao.ok,
      config.APP_VERSAO +
      ' • ' +
      estadoVersao.estado
    );


    check(
      'BASELINE_APP_FASE',
      estadoVersao.ok,
      config.APP_FASE +
      ' • ' +
      estadoVersao.estado
    );


    // ====================================================
    // AUTENTICAÇÃO / AUTORIZAÇÃO REAL DA APLICAÇÃO
    // ====================================================

    check(
      'PERMISSAO_HELPER_S14',
      typeof exigirPermissaoS14_ ===
        'function',
      'exigirPermissaoS14_'
    );


    check(
      'SESSAO_API_S14',
      typeof appSessaoS14 ===
        'function',
      'appSessaoS14'
    );


    check(
      'AUTH_RPC_PIN_S223',
      typeof appRpcS223 ===
        'function',
      'appRpcS223'
    );


    var adminAtual =
      false;


    var perfilAtual =
      '';


    var detalheSessao =
      '';


    try {

      // Mesma autorização dos módulos
      // administrativos existentes.
      exigirPermissaoS14_(
        'administrar'
      );


      adminAtual =
        true;


      var sessaoAtual =
        obterSessaoAtualS269_();


      perfilAtual =
        texto_(
          sessaoAtual &&
          (
            sessaoAtual.perfil ||
            sessaoAtual.PERFIL
          )
        ).toUpperCase();


      detalheSessao =
        texto_(
          sessaoAtual &&
          (
            sessaoAtual.email ||
            sessaoAtual.EMAIL
          )
        );


    } catch (e) {

      adminAtual =
        false;


      detalheSessao =
        e && e.message
          ? e.message
          : String(e);
    }


    check(
      'SESSAO_ATUAL_ADMIN',
      adminAtual,
      (
        perfilAtual ||
        detalheSessao ||
        'não autorizada'
      )
    );


    // ====================================================
    // ESTRUTURAS
    // ====================================================

    var shCatalogos =
      ss.getSheetByName(
        ABA_CATALOGOS
      );


    var shOpcoes =
      ss.getSheetByName(
        ABA_OPCOES
      );


    check(
      'ABA_CATALOGOS',
      Boolean(
        shCatalogos
      ),
      ABA_CATALOGOS
    );


    check(
      'ABA_OPCOES',
      Boolean(
        shOpcoes
      ),
      ABA_OPCOES
    );


    if (shCatalogos) {

      check(
        'HEADERS_CATALOGOS',
        headersIguais_(
          shCatalogos,
          HEADERS_CATALOGOS
        ),
        shCatalogos
          .getLastColumn()
      );
    }


    if (shOpcoes) {

      check(
        'HEADERS_OPCOES',
        headersIguais_(
          shOpcoes,
          HEADERS_OPCOES
        ),
        shOpcoes
          .getLastColumn()
      );
    }


    var catalogos =
      shCatalogos
        ? linhas_(
            shCatalogos
          )
        : [];


    var opcoes =
      shOpcoes
        ? linhas_(
            shOpcoes
          )
        : [];


    check(
      'TOTAL_CATALOGOS_7',
      catalogos.length === 7,
      catalogos.length
    );


    check(
      'TOTAL_OPCOES_MINIMO_82',
      opcoes.length >= 82,
      opcoes.length
    );


    // ====================================================
    // DUPLICIDADE DE IDS
    // ====================================================

    var ids = {};


    var duplicados =
      [];


    opcoes.forEach(
      function (item) {

        var id =
          texto_(
            item.ID_OPCAO
          );


        if (
          id &&
          ids[id]
        ) {

          duplicados.push(
            id
          );
        }


        if (id) {

          ids[id] =
            true;
        }
      }
    );


    check(
      'IDS_SEM_DUPLICIDADE',
      duplicados.length === 0,
      duplicados.length
    );


    // ====================================================
    // OPÇÕES ÓRFÃS
    // ====================================================

    var catalogosIds = {};


    catalogos.forEach(
      function (item) {

        catalogosIds[
          texto_(
            item.ID_CATALOGO
          )
        ] = true;
      }
    );


    var orfas =
      opcoes.filter(
        function (item) {

          return !catalogosIds[
            texto_(
              item.ID_CATALOGO
            )
          ];
        }
      );


    check(
      'OPCOES_SEM_CATALOGO_ORFA',
      orfas.length === 0,
      orfas.length
    );


    // ====================================================
    // REGISTROS
    // ====================================================

    var shRegistros =
      ss.getSheetByName(
        ABA_REGISTROS
      );


    check(
      'REGISTROS_PRESERVADA',
      Boolean(
        shRegistros
      ),
      shRegistros
        ? Math.max(
            0,
            shRegistros
              .getLastRow() -
            1
          )
        : 0
    );


    // ====================================================
    // AUDITORIA
    // ====================================================

    var shAuditoria =
      ss.getSheetByName(
        ABA_AUDITORIA
      );


    check(
      'AUDITORIA_DISPONIVEL',
      Boolean(
        shAuditoria
      ),
      ABA_AUDITORIA
    );


    // ====================================================
    // PERFIS
    // ====================================================

    var permissao =
      permissaoAdministrar_(
        ss
      );


    check(
      'PERMISSAO_ADMIN',
      permissao.ADMIN ===
        true,
      permissao.ADMIN
    );


    check(
      'PERMISSAO_GESTOR',
      permissao.GESTOR ===
        false,
      permissao.GESTOR
    );


    check(
      'PERMISSAO_OPERACIONAL',
      permissao.OPERACIONAL ===
        false,
      permissao.OPERACIONAL
    );


    check(
      'PERMISSAO_CONSULTA',
      permissao.CONSULTA ===
        false,
      permissao.CONSULTA
    );


    // ====================================================
    // APIs PÚBLICAS B2
    // ====================================================

    check(
      'API_CARREGAR',
      typeof appCatalogosAdminCarregar ===
        'function',
      typeof appCatalogosAdminCarregar
    );


    check(
      'API_CRIAR',
      typeof appCatalogosAdminCriarOpcao ===
        'function',
      typeof appCatalogosAdminCriarOpcao
    );


    check(
      'API_EDITAR',
      typeof appCatalogosAdminEditarOpcao ===
        'function',
      typeof appCatalogosAdminEditarOpcao
    );


    check(
      'API_ATIVO',
      typeof appCatalogosAdminDefinirAtivo ===
        'function',
      typeof appCatalogosAdminDefinirAtivo
    );


    check(
      'API_REORDENAR',
      typeof appCatalogosAdminReordenar ===
        'function',
      typeof appCatalogosAdminReordenar
    );


    check(
      'API_REMOVER',
      typeof appCatalogosAdminRemoverOpcao ===
        'function',
      typeof appCatalogosAdminRemoverOpcao
    );


    check(
      'API_HISTORICO',
      typeof appCatalogosAdminHistorico ===
        'function',
      typeof appCatalogosAdminHistorico
    );


    // ====================================================
    // RESULTADO
    // ====================================================

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
          ? 'APTO_PARA_TESTE_MUTACAO'
          : 'BLOQUEADO',

      fase:
        'S26.9-B2.1',

      producao: {

        appVersao:
          config.APP_VERSAO,

        appFase:
          config.APP_FASE
      },

      resumo: {

        catalogos:
          catalogos.length,

        opcoes:
          opcoes.length,

        registros:
          shRegistros
            ? Math.max(
                0,
                shRegistros
                  .getLastRow() -
                1
              )
            : 0,

        perfilAtual:
          perfilAtual
      },

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
      '[S26.9-B2-DIAG] ' +
      JSON.stringify(
        resultado
      )
    );


    return resultado;
  }


  // ======================================================
  // TESTE CONTROLADO B2
  // ======================================================
  //
  // O teste:
  //
  // 1. cria uma opção temporária INATIVA;
  // 2. edita;
  // 3. reordena;
  // 4. ativa;
  // 5. confirma PUBLICADA=SIM;
  // 6. desativa;
  // 7. verifica que PUBLICADA continua SIM;
  // 8. tenta excluir;
  // 9. confirma bloqueio da exclusão;
  // 10. faz limpeza técnica exclusiva da opção de teste.
  //
  // Nenhuma opção real é alterada.
  //
  // ======================================================

  function testar_() {

    exigirAdmin_();


    var testes =
      [];


    var idTeste =
      '';


    var prefixo =
      '__TESTE_S269_B2_' +
      Utilities.formatDate(
        new Date(),
        'America/Fortaleza',
        'yyyyMMddHHmmss'
      );


    function teste(
      nome,
      fn
    ) {

      try {

        var detalhe =
          fn();


        testes.push({

          nome:
            nome,

          ok:
            true,

          detalhe:
            detalhe === undefined
              ? 'OK'
              : detalhe
        });


      } catch (e) {

        testes.push({

          nome:
            nome,

          ok:
            false,

          detalhe:
            e && e.message
              ? e.message
              : String(e)
        });
      }
    }


    try {

      // ==================================================
      // 1. CRIAR INATIVA
      // ==================================================

      teste(
        'CRIAR_INATIVA',
        function () {

          var r =
            criarOpcaoComOrigem_(
              {

                codigoCatalogo:
                  'FIXACAO',

                rotulo:
                  prefixo,

                descricao:
                  'Teste controlado S26.9-B2',

                ativo:
                  false
              },

              'TESTE_S26_9_B2'
            );


          if (!r.ok) {

            throw new Error(
              'Criação não retornou OK.'
            );
          }


          if (r.ativo) {

            throw new Error(
              'Teste foi criado ativo.'
            );
          }


          idTeste =
            r.idOpcao;


          return idTeste;
        }
      );


      // ==================================================
      // 2. EDITAR
      // ==================================================

      teste(
        'EDITAR_SEM_ALTERAR_HISTORICO',
        function () {

          if (!idTeste) {

            throw new Error(
              'ID de teste ausente.'
            );
          }


          var r =
            editarOpcao_(
              {

                idOpcao:
                  idTeste,

                rotulo:
                  prefixo +
                  '_EDITADO',

                descricao:
                  'Descrição editada no teste B2'
              }
            );


          if (
            !r.ok ||
            !r.alterado
          ) {

            throw new Error(
              'Edição não confirmada.'
            );
          }


          if (
            r.historicoAlterado !==
            false
          ) {

            throw new Error(
              'Contrato histórico inválido.'
            );
          }


          return r.rotulo;
        }
      );


      // ==================================================
      // 3. REORDENAR
      // ==================================================

      teste(
        'REORDENAR_TESTE',
        function () {

          var r =
            reordenar_(
              {

                codigoCatalogo:
                  'FIXACAO',

                itens: [
                  {

                    idOpcao:
                      idTeste,

                    ordem:
                      9999
                  }
                ]
              }
            );


          if (!r.ok) {

            throw new Error(
              'Falha na ordenação.'
            );
          }


          return r.alterado;
        }
      );


      // ==================================================
      // 4. ATIVAR
      // ==================================================

      teste(
        'ATIVAR_PUBLICA',
        function () {

          var r =
            definirAtivo_(
              {

                idOpcao:
                  idTeste,

                ativo:
                  true
              }
            );


          if (
            !r.ok ||
            !r.ativo ||
            !r.publicada
          ) {

            throw new Error(
              'Ativação/publicação inválida.'
            );
          }


          return 'ATIVA/PUBLICADA';
        }
      );


      // ==================================================
      // 5. DESATIVAR
      // ==================================================

      teste(
        'DESATIVAR_PRESERVA_PUBLICADA',
        function () {

          var r =
            definirAtivo_(
              {

                idOpcao:
                  idTeste,

                ativo:
                  false
              }
            );


          if (
            !r.ok ||
            r.ativo ||
            !r.publicada
          ) {

            throw new Error(
              'Desativação perdeu marca PUBLICADA.'
            );
          }


          return 'INATIVA/PUBLICADA';
        }
      );


      // ==================================================
      // 6. REMOÇÃO DEVE SER BLOQUEADA
      // ==================================================

      teste(
        'REMOCAO_PUBLICADA_BLOQUEADA',
        function () {

          var r =
            removerOpcao_(
              {

                idOpcao:
                  idTeste
              }
            );


          if (
            r.ok ||
            !r.bloqueado
          ) {

            throw new Error(
              'Remoção deveria ter sido bloqueada.'
            );
          }


          if (
            r.motivos.indexOf(
              'OPCAO_JA_PUBLICADA'
            ) < 0
          ) {

            throw new Error(
              'Motivo OPCAO_JA_PUBLICADA não encontrado.'
            );
          }


          return r.motivos;
        }
      );


    } finally {

      // ==================================================
      // 7. LIMPEZA TÉCNICA CONTROLADA
      // ==================================================

      if (idTeste) {

        teste(
          'LIMPEZA_CONTROLADA_TESTE',
          function () {

            limparOpcaoTeste_(
              idTeste
            );


            return 'REMOVIDA';
          }
        );
      }
    }


    var falhas =
      testes.filter(
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
        'S26.9-B2.1',

      testes:
        testes,

      total:
        testes.length,

      falhas:
        falhas.length,

      testesFalhos:
        falhas
    };


    console.log(
      '[S26.9-B2-TESTE] ' +
      JSON.stringify(
        resultado
      )
    );


    return resultado;
  }


  // ======================================================
  // LIMPEZA EXCLUSIVA DO TESTE AUTOMÁTICO
  // ======================================================
  //
  // Esta função NÃO faz parte da API pública.
  //
  // Ela pode remover fisicamente apenas uma opção criada
  // pelo próprio teste B2, mesmo que tenha sido marcada
  // PUBLICADA durante o teste.
  //
  // ======================================================

  function limparOpcaoTeste_(
    idOpcao
  ) {

    var sessao =
      exigirAdmin_();


    var user =
      usuario_(sessao);


    var ss =
      planilha_();


    validarBaseline_(ss);


    var shOpcoes =
      abaObrigatoria_(
        ss,
        ABA_OPCOES
      );


    var opcao =
      localizarOpcao_(
        shOpcoes,
        idOpcao
      );


    if (
      texto_(
        opcao.ORIGEM
      ) !==
      'TESTE_S26_9_B2'
    ) {

      throw new Error(
        'Limpeza negada: origem não é de teste.'
      );
    }


    if (
      texto_(
        opcao.ROTULO
      ).indexOf(
        '__TESTE_S269_B2_'
      ) !== 0
    ) {

      throw new Error(
        'Limpeza negada: rótulo não é de teste.'
      );
    }


    var catalogo =
      localizarCatalogoPorId_(
        ss,
        opcao.ID_CATALOGO
      );


    var usos =
      contarValorRegistros_(
        ss,
        catalogo.CAMPO_REGISTRO,
        opcao.ROTULO
      );


    if (
      usos > 0
    ) {

      throw new Error(
        'Limpeza negada: opção de teste possui uso real.'
      );
    }


    var anterior =
      serializar_(
        opcao
      );


    shOpcoes.deleteRow(
      opcao.__row
    );


    incrementarRevisaoCatalogo_(
      ss,
      catalogo.ID_CATALOGO,
      user
    );


    auditar_(
      ss,
      {

        usuario:
          user,

        acao:
          'TESTE_S269_B2_LIMPEZA',

        entidade:
          'CATALOGO_DOMINIO_OPCAO',

        entidadeId:
          idOpcao,

        resultado:
          'SUCESSO',

        detalhes: {

          testeControlado:
            true
        },

        anterior:
          anterior,

        novo:
          null
      }
    );
  }


  // ======================================================
  // LOCALIZAR CATÁLOGO
  // ======================================================

  function localizarCatalogo_(
    ss,
    codigo
  ) {

    codigo =
      texto_(
        codigo
      ).toUpperCase();


    if (!codigo) {

      throw new Error(
        'Informe o catálogo.'
      );
    }


    var aba =
      abaObrigatoria_(
        ss,
        ABA_CATALOGOS
      );


    var item =
      linhas_(aba)
        .find(
          function (x) {

            return (
              texto_(
                x.CODIGO
              ).toUpperCase() ===
              codigo
            );
          }
        );


    if (!item) {

      throw new Error(
        'Catálogo não encontrado: ' +
        codigo
      );
    }


    if (
      !sim_(
        item.ATIVO
      )
    ) {

      throw new Error(
        'Catálogo inativo: ' +
        codigo
      );
    }


    return item;
  }


  function localizarCatalogoPorId_(
    ss,
    id
  ) {

    var aba =
      abaObrigatoria_(
        ss,
        ABA_CATALOGOS
      );


    var item =
      linhas_(aba)
        .find(
          function (x) {

            return (
              texto_(
                x.ID_CATALOGO
              ) ===
              texto_(id)
            );
          }
        );


    if (!item) {

      throw new Error(
        'Catálogo não encontrado: ' +
        id
      );
    }


    return item;
  }


  // ======================================================
  // LOCALIZAR OPÇÃO
  // ======================================================

  function localizarOpcao_(
    aba,
    idOpcao
  ) {

    idOpcao =
      texto_(
        idOpcao
      );


    if (!idOpcao) {

      throw new Error(
        'Informe a opção.'
      );
    }


    var item =
      linhas_(aba)
        .find(
          function (x) {

            return (
              texto_(
                x.ID_OPCAO
              ) ===
              idOpcao
            );
          }
        );


    if (!item) {

      throw new Error(
        'Opção não encontrada: ' +
        idOpcao
      );
    }


    return item;
  }


  // ======================================================
  // DUPLICIDADE
  // ======================================================

  function validarDuplicidade_(
    opcoes,
    idCatalogo,
    rotulo,
    ignorarId
  ) {

    var chave =
      normalizarChave_(
        rotulo
      );


    var duplicada =
      opcoes.find(
        function (item) {

          return (
            texto_(
              item.ID_CATALOGO
            ) ===
            texto_(
              idCatalogo
            ) &&

            texto_(
              item.ID_OPCAO
            ) !==
            texto_(
              ignorarId
            ) &&

            texto_(
              item.CHAVE_NORMALIZADA
            ) ===
            chave
          );
        }
      );


    if (duplicada) {

      throw new Error(
        'Já existe uma opção equivalente neste catálogo: "' +
        texto_(
          duplicada.ROTULO
        ) +
        '".'
      );
    }
  }


  // ======================================================
  // ORDEM
  // ======================================================

  function proximaOrdem_(
    opcoes,
    idCatalogo
  ) {

    var ordens =
      opcoes
        .filter(
          function (item) {

            return (
              texto_(
                item.ID_CATALOGO
              ) ===
              texto_(
                idCatalogo
              )
            );
          }
        )
        .map(
          function (item) {

            return numero_(
              item.ORDEM
            );
          }
        );


    if (!ordens.length) {

      return 1;
    }


    return (
      Math.max.apply(
        null,
        ordens
      ) + 1
    );
  }


  // ======================================================
  // REVISÃO DO CATÁLOGO
  // ======================================================

  function incrementarRevisaoCatalogo_(
    ss,
    idCatalogo,
    user
  ) {

    var aba =
      abaObrigatoria_(
        ss,
        ABA_CATALOGOS
      );


    var catalogo =
      localizarCatalogoPorId_(
        ss,
        idCatalogo
      );


    var revisao =
      numero_(
        catalogo.REVISAO
      ) || 1;


    atualizarLinha_(
      aba,
      catalogo.__row,
      HEADERS_CATALOGOS,
      {

        REVISAO:
          revisao + 1,

        ATUALIZADO_EM:
          new Date(),

        ATUALIZADO_POR:
          user.email
      }
    );


    return (
      revisao + 1
    );
  }


  // ======================================================
  // USOS NOS REGISTROS
  // ======================================================

  function usosAtuais_(ss) {

    var campos = [
      'TIPO',
      'FINALIDADE',
      'MATERIAL',
      'FIXACAO',
      'ESTADO_CONSERVACAO',
      'CONDICAO',
      'RESPONSAVEL'
    ];


    var out = {};


    campos.forEach(
      function (campo) {

        out[campo] =
          {};
      }
    );


    var aba =
      abaObrigatoria_(
        ss,
        ABA_REGISTROS
      );


    var headers =
      headers_(aba);


    var indices = {};


    campos.forEach(
      function (campo) {

        indices[campo] =
          headers.indexOf(
            campo
          );
      }
    );


    if (
      aba.getLastRow() < 2
    ) {

      return out;
    }


    var dados =
      aba
        .getRange(
          2,
          1,
          aba.getLastRow() - 1,
          aba.getLastColumn()
        )
        .getDisplayValues();


    dados.forEach(
      function (row) {

        campos.forEach(
          function (campo) {

            var idx =
              indices[campo];


            if (
              idx < 0
            ) {

              return;
            }


            var valor =
              texto_(
                row[idx]
              );


            if (!valor) {

              return;
            }


            if (
              !out[campo][valor]
            ) {

              out[campo][valor] =
                0;
            }


            out[campo][valor]++;
          }
        );
      }
    );


    return out;
  }


  function contarValorRegistros_(
    ss,
    campo,
    valor
  ) {

    var aba =
      abaObrigatoria_(
        ss,
        ABA_REGISTROS
      );


    var headers =
      headers_(aba);


    var idx =
      headers.indexOf(
        texto_(
          campo
        ).toUpperCase()
      );


    if (
      idx < 0
    ) {

      throw new Error(
        'Coluna histórica não encontrada: ' +
        campo
      );
    }


    if (
      aba.getLastRow() < 2
    ) {

      return 0;
    }


    var dados =
      aba
        .getRange(
          2,
          idx + 1,
          aba.getLastRow() - 1,
          1
        )
        .getDisplayValues();


    var esperado =
      texto_(
        valor
      );


    return dados.reduce(
      function (
        total,
        row
      ) {

        return (
          total +
          (
            texto_(
              row[0]
            ) ===
            esperado
              ? 1
              : 0
          )
        );
      },
      0
    );
  }


  // ======================================================
  // AUDITORIA
  // ======================================================

  function auditar_(
    ss,
    dados
  ) {

    var aba =
      abaObrigatoria_(
        ss,
        ABA_AUDITORIA
      );


    var headers =
      headers_(aba);


    var config =
      lerConfig_(ss);


    var objeto = {

      ID_AUDITORIA:
        'AUD-S269B2-' +
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
        'WEB_APP',

      DEVICE_ID:
        '',

      DETALHES_JSON:
        JSON.stringify(
          dados.detalhes ||
          {}
        ),

      VALOR_ANTERIOR_JSON:
        dados.anterior === null
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
        config.APP_VERSAO
    };


    appendObjeto_(
      aba,
      headers,
      objeto
    );
  }


  // ======================================================
  // PERFIS / PERMISSÕES
  // ======================================================

  function permissaoAdministrar_(
    ss
  ) {

    var resultado =
      {};


    var aba =
      ss.getSheetByName(
        'PERFIS_PERMISSOES'
      );


    if (
      !aba ||
      aba.getLastRow() < 2
    ) {

      return resultado;
    }


    var dados =
      aba
        .getDataRange()
        .getDisplayValues();


    var headers =
      dados[0]
        .map(
          function (v) {

            return texto_(
              v
            ).toUpperCase();
          }
        );


    var idxPerfil =
      headers.indexOf(
        'PERFIL'
      );


    var idxAdmin =
      headers.indexOf(
        'ADMINISTRAR'
      );


    if (
      idxPerfil < 0 ||
      idxAdmin < 0
    ) {

      return resultado;
    }


    dados
      .slice(1)
      .forEach(
        function (row) {

          var perfil =
            texto_(
              row[
                idxPerfil
              ]
            ).toUpperCase();


          if (perfil) {

            resultado[
              perfil
            ] =
              sim_(
                row[
                  idxAdmin
                ]
              );
          }
        }
      );


    return resultado;
  }


  // ======================================================
  // PLANILHA
  // ======================================================

  function planilha_() {

    if (
      typeof ConfigService !==
        'undefined' &&
      ConfigService &&
      typeof ConfigService
        .obterPlanilha ===
        'function'
    ) {

      var ss =
        ConfigService
          .obterPlanilha();


      if (ss) {

        return ss;
      }
    }


    var ativa =
      SpreadsheetApp
        .getActiveSpreadsheet();


    if (ativa) {

      return ativa;
    }


    throw new Error(
      'S26.9-B2: planilha operacional indisponível.'
    );
  }


  // ======================================================
  // BASELINE
  // ======================================================

  function estadoVersaoPermitido_(config) {

    config =
      config || {};


    var versaoAtual =
      texto_(
        config.APP_VERSAO
      );


    var faseAtual =
      texto_(
        config.APP_FASE
      );


    var prePromocao =
      versaoAtual ===
        BASELINE_VERSAO &&
      faseAtual ===
        BASELINE_FASE;


    var release =
      versaoAtual ===
        RELEASE_VERSAO &&
      faseAtual ===
        RELEASE_FASE;


    var releaseAtual =
      versaoAtual ===
        RELEASE_ATUAL_VERSAO &&
      faseAtual ===
        RELEASE_ATUAL_FASE;


    return {

      ok:
        prePromocao ||
        release ||
        releaseAtual,

      estado:
        prePromocao
          ? 'PRE_PROMOCAO_OU_ROLLBACK'
          : (
              release
                ? 'RELEASE_S26_9'
                : (
                    releaseAtual
                      ? 'RELEASE_S26_10'
                      : 'INCOMPATIVEL'
                  )
            ),

      appVersao:
        versaoAtual,

      appFase:
        faseAtual
    };
  }


  function validarBaseline_(ss) {

    var config =
      lerConfig_(ss);


    var estado =
      estadoVersaoPermitido_(
        config
      );


    if (!estado.ok) {

      throw new Error(
        'S26.9-B2 bloqueada: estado de versão incompatível. ' +
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
        estado.appVersao +
        ' / ' +
        estado.appFase +
        ']'
      );
    }


    return config;
  }


  function lerConfig_(ss) {

    var aba =
      abaObrigatoria_(
        ss,
        'CONFIG'
      );


    var out =
      {};


    if (
      aba.getLastRow() < 2
    ) {

      return out;
    }


    aba
      .getRange(
        2,
        1,
        aba.getLastRow() - 1,
        2
      )
      .getDisplayValues()
      .forEach(
        function (row) {

          var chave =
            texto_(
              row[0]
            );


          if (chave) {

            out[chave] =
              texto_(
                row[1]
              );
          }
        }
      );


    return out;
  }


  // ======================================================
  // SHEETS HELPERS
  // ======================================================

  function abaObrigatoria_(
    ss,
    nome
  ) {

    var aba =
      ss.getSheetByName(
        nome
      );


    if (!aba) {

      throw new Error(
        'Aba não encontrada: ' +
        nome
      );
    }


    return aba;
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
      .map(
        function (v) {

          return texto_(
            v
          ).toUpperCase();
        }
      );
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
      headers_(aba);


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
        'Cabeçalho divergente em ' +
        aba.getName() +
        '.'
      );
    }
  }


  function linhas_(aba) {

    if (
      !aba ||
      aba.getLastRow() < 2
    ) {

      return [];
    }


    var headers =
      headers_(aba);


    var valores =
      aba
        .getRange(
          2,
          1,
          aba.getLastRow() - 1,
          headers.length
        )
        .getValues();


    return valores
      .map(
        function (
          row,
          index
        ) {

          var obj = {

            __row:
              index + 2
          };


          headers.forEach(
            function (
              header,
              col
            ) {

              obj[header] =
                row[col];
            }
          );


          return obj;
        }
      )
      .filter(
        function (obj) {

          return headers.some(
            function (header) {

              return Boolean(
                texto_(
                  obj[header]
                )
              );
            }
          );
        }
      );
  }


  function appendObjeto_(
    aba,
    headers,
    objeto
  ) {

    var row =
      headers.map(
        function (header) {

          return Object.prototype
            .hasOwnProperty.call(
              objeto,
              header
            )
              ? objeto[header]
              : '';
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


  function atualizarLinha_(
    aba,
    rowNumber,
    headers,
    alteracoes
  ) {

    var range =
      aba.getRange(
        rowNumber,
        1,
        1,
        headers.length
      );


    var row =
      range
        .getValues()[0];


    Object.keys(
      alteracoes
    ).forEach(
      function (campo) {

        var idx =
          headers.indexOf(
            campo
          );


        if (
          idx < 0
        ) {

          throw new Error(
            'Campo inexistente em ' +
            aba.getName() +
            ': ' +
            campo
          );
        }


        row[idx] =
          alteracoes[campo];
      }
    );


    range.setValues([
      row
    ]);
  }


  // ======================================================
  // VALIDAÇÃO DE ENTRADA
  // ======================================================

  function validarRotulo_(valor) {

    var rotulo =
      texto_(
        valor
      );


    if (!rotulo) {

      throw new Error(
        'Informe o nome da opção.'
      );
    }


    if (
      rotulo.length > 120
    ) {

      throw new Error(
        'O nome da opção deve possuir no máximo 120 caracteres.'
      );
    }


    return rotulo;
  }


  function validarDescricao_(valor) {

    var descricao =
      texto_(
        valor
      );


    if (
      descricao.length > 1000
    ) {

      throw new Error(
        'A descrição deve possuir no máximo 1000 caracteres.'
      );
    }


    return descricao;
  }


  function normalizarChave_(valor) {

    var v =
      texto_(
        valor
      ).toUpperCase();


    try {

      v =
        v
          .normalize(
            'NFD'
          )
          .replace(
            /[\u0300-\u036f]/g,
            ''
          );

    } catch (e) {}


    return v
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
        ).replace(
          ',',
          '.'
        )
      );


    return isFinite(n)
      ? n
      : 0;
  }


  function sim_(valor) {

    if (
      valor === true
    ) {

      return true;
    }


    if (
      valor === false
    ) {

      return false;
    }


    var v =
      texto_(
        valor
      ).toUpperCase();


    return [
      'SIM',
      'TRUE',
      '1',
      'YES'
    ].indexOf(
      v
    ) >= 0;
  }


  function boolEntrada_(
    valor,
    padrao
  ) {

    if (
      valor === undefined ||
      valor === null ||
      valor === ''
    ) {

      return Boolean(
        padrao
      );
    }


    return sim_(
      valor
    );
  }


  function boolEntradaObrigatoria_(valor) {

    if (
      typeof valor ===
      'boolean'
    ) {

      return valor;
    }


    var v =
      texto_(
        valor
      ).toUpperCase();


    if (
      [
        'SIM',
        'TRUE',
        '1',
        'YES'
      ].indexOf(
        v
      ) >= 0
    ) {

      return true;
    }


    if (
      [
        'NAO',
        'NÃO',
        'FALSE',
        '0',
        'NO'
      ].indexOf(
        v
      ) >= 0
    ) {

      return false;
    }


    throw new Error(
      'Informe ativo=true ou ativo=false.'
    );
  }


  function serializar_(valor) {

    if (
      valor instanceof
      Date
    ) {

      return Utilities
        .formatDate(
          valor,
          'America/Fortaleza',
          "yyyy-MM-dd'T'HH:mm:ssXXX"
        );
    }


    if (
      Array.isArray(
        valor
      )
    ) {

      return valor.map(
        serializar_
      );
    }


    if (
      valor &&
      typeof valor ===
        'object'
    ) {

      var obj = {};


      Object.keys(
        valor
      ).forEach(
        function (chave) {

          // __row é metadado técnico interno
          // e não deve entrar na auditoria.
          if (
            chave ===
            '__row'
          ) {

            return;
          }


          obj[chave] =
            serializar_(
              valor[chave]
            );
        }
      );


      return obj;
    }


    return valor;
  }


  function jsonSeguro_(valor) {

    var t =
      texto_(
        valor
      );


    if (!t) {

      return null;
    }


    try {

      return JSON.parse(
        t
      );

    } catch (e) {

      return t;
    }
  }


  // ======================================================
  // API INTERNA
  // ======================================================

  return {

    carregar:
      carregar_,

    criarOpcao:
      criarOpcao_,

    editarOpcao:
      editarOpcao_,

    definirAtivo:
      definirAtivo_,

    reordenar:
      reordenar_,

    removerOpcao:
      removerOpcao_,

    historico:
      historico_,

    diagnosticar:
      diagnosticar_,

    testar:
      testar_
  };

})();


// ========================================================
// WRAPPERS PÚBLICOS
// ========================================================


function appCatalogosAdminCarregar() {

  return CatalogosDominioAdminServiceS269
    .carregar();
}


function appCatalogosAdminCriarOpcao(
  dados
) {

  return CatalogosDominioAdminServiceS269
    .criarOpcao(
      dados || {}
    );
}


function appCatalogosAdminEditarOpcao(
  dados
) {

  return CatalogosDominioAdminServiceS269
    .editarOpcao(
      dados || {}
    );
}


function appCatalogosAdminDefinirAtivo(
  dados
) {

  return CatalogosDominioAdminServiceS269
    .definirAtivo(
      dados || {}
    );
}


function appCatalogosAdminReordenar(
  dados
) {

  return CatalogosDominioAdminServiceS269
    .reordenar(
      dados || {}
    );
}


function appCatalogosAdminRemoverOpcao(
  dados
) {

  return CatalogosDominioAdminServiceS269
    .removerOpcao(
      dados || {}
    );
}


function appCatalogosAdminHistorico(
  idOpcao,
  limite
) {

  return CatalogosDominioAdminServiceS269
    .historico(
      idOpcao,
      limite
    );
}


function diagnosticoS269B2() {

  return CatalogosDominioAdminServiceS269
    .diagnosticar();
}


function testeS269B2() {

  return CatalogosDominioAdminServiceS269
    .testar();
}
