/**
 * ============================================================
 * S26.10-R2 — BACKEND NATIVO DA CENTRAL DE REFERÊNCIAS
 * ============================================================
 *
 * Baseline oficial preservada:
 * APP_VERSAO = MVP-3.31.0-SINALIZACAO-S26.9
 * APP_FASE   = S26.9
 *
 * OBJETIVOS:
 * - administrar a entidade existente PONTOS_REFERENCIA;
 * - listar / pesquisar / filtrar;
 * - obter detalhe;
 * - criar referência;
 * - editar cadastro sem alterar posição;
 * - ativar / desativar;
 * - auditar mutações;
 * - NÃO reintroduzir o CRUD legado;
 * - NÃO criar tabela paralela;
 * - NÃO remover fisicamente nesta etapa;
 * - NÃO reposicionar nesta etapa;
 * - NÃO alterar APP_VERSAO / APP_FASE.
 *
 * Observação:
 * - R4 tratará a experiência de criação/posicionamento no mapa.
 * - R5 tratará reposicionamento.
 * - R6 tratará remoção segura após análise de dependências.
 * - R7 tratará atualização/invalidação do cache offline.
 * ============================================================
 */

var ReferenciaCentralServiceS2610R2 = (function () {

  var ABA_REFERENCIAS = 'PONTOS_REFERENCIA';
  var ABA_MAPAS = 'MAPAS_SETORES';

  var BASELINE_VERSAO = 'MVP-3.31.0-SINALIZACAO-S26.9';
  var BASELINE_FASE = 'S26.9';

  var HEADERS_REFERENCIAS = [
    'ID_REFERENCIA',
    'ID_MAPA_SETOR',
    'NOME',
    'TIPO',
    'SUBTIPO',
    'X_NORMALIZADO',
    'Y_NORMALIZADO',
    'RAIO_PROXIMIDADE',
    'DESCRICAO',
    'PRIORIDADE_DESCRICAO',
    'STATUS',
    'CONFIRMADO',
    'ATIVO',
    'CRIADO_EM',
    'ATUALIZADO_EM',
    'OBSERVACAO',
    'ICONE_TIPO',
    'ICONE_CHAVE',
    'ICONE_FILE_ID',
    'ICONE_URL'
  ];


  // ==========================================================
  // INFRAESTRUTURA
  // ==========================================================

  function planilha_() {
    return SpreadsheetApp.getActive();
  }


  function texto_(valor) {
    return String(
      valor == null ? '' : valor
    ).trim();
  }


  function upper_(valor) {
    return texto_(valor).toUpperCase();
  }


  function numero_(valor) {
    if (valor === '' || valor == null) {
      return NaN;
    }

    return Number(
      String(valor)
        .trim()
        .replace(',', '.')
    );
  }


  function sim_(valor) {
    var v = upper_(valor || 'SIM');

    return (
      v === 'SIM' ||
      v === 'TRUE' ||
      v === '1' ||
      v === 'ATIVO' ||
      v === 'ATIVA'
    );
  }


  function dataRpc_(valor) {
    if (
      Object.prototype.toString.call(valor) ===
      '[object Date]'
    ) {
      if (isNaN(valor.getTime())) {
        return '';
      }

      return Utilities.formatDate(
        valor,
        APP.TIMEZONE || 'America/Fortaleza',
        "yyyy-MM-dd'T'HH:mm:ssXXX"
      );
    }

    return valor == null
      ? ''
      : String(valor);
  }


  function configObj_(ss) {
    var sh = ss.getSheetByName('CONFIG');
    var out = {};

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
      .forEach(function (row) {
        var k = texto_(row[0]);

        if (k) {
          out[k] = texto_(row[1]);
        }
      });

    return out;
  }


  function validarOperacao_(ss) {
    return s2610ValidarOperacao_(
      configObj_(ss),
      'S26.10-R2'
    );
  }


  function exigirAdmin_() {
    if (
      typeof exigirPermissaoS14_ !==
      'function'
    ) {
      throw new Error(
        'S26.10-R2: mecanismo de permissão S14 indisponível.'
      );
    }

    return exigirPermissaoS14_(
      'administrar'
    );
  }


  function exigirAuditoria_() {
    if (
      typeof registrarAuditoriaS15_ !==
      'function'
    ) {
      throw new Error(
        'S26.10-R2: auditoria S15 indisponível.'
      );
    }
  }


  function usuario_(sessao) {
    sessao = sessao || {};

    var email =
      texto_(
        sessao.email ||
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
        email || 'APPS_SCRIPT',

      nome:
        texto_(
          sessao.nome ||
          email ||
          'Administrador'
        ),

      perfil:
        upper_(
          sessao.perfil ||
          'ADMIN'
        )
    };
  }


  function abaObrigatoria_(ss, nome) {
    var sh = ss.getSheetByName(nome);

    if (!sh) {
      throw new Error(
        'Aba ' + nome + ' não encontrada.'
      );
    }

    return sh;
  }


  function headers_(sh) {
    if (sh.getLastColumn() < 1) {
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
      .map(function (v) {
        return texto_(v);
      });
  }


  function validarHeaders_(sh, esperados) {
    var atuais = headers_(sh);

    var faltantes =
      esperados.filter(function (h) {
        return atuais.indexOf(h) < 0;
      });

    if (faltantes.length) {
      throw new Error(
        'Estrutura de ' +
        sh.getName() +
        ' incompleta. Faltando: ' +
        faltantes.join(', ')
      );
    }

    return atuais;
  }


  function linhas_(sh) {
    if (sh.getLastRow() < 2) {
      return [];
    }

    var valores =
      sh.getDataRange().getValues();

    var h =
      valores.shift().map(function (v) {
        return texto_(v);
      });

    return valores
      .filter(function (row) {
        return row.some(function (v) {
          return texto_(v) !== '';
        });
      })
      .map(function (row) {
        var obj = {};

        h.forEach(function (campo, i) {
          if (campo) {
            obj[campo] = row[i];
          }
        });

        return obj;
      });
  }


  function localizar_(sh, idReferencia) {
    var id = texto_(idReferencia);

    if (!id) {
      throw new Error(
        'ID da referência não informado.'
      );
    }

    var h = headers_(sh);
    var colunaId =
      h.indexOf('ID_REFERENCIA');

    if (colunaId < 0) {
      throw new Error(
        'Coluna ID_REFERENCIA não encontrada.'
      );
    }

    if (sh.getLastRow() < 2) {
      throw new Error(
        'Ponto de referência não encontrado.'
      );
    }

    var valores =
      sh
        .getRange(
          2,
          1,
          sh.getLastRow() - 1,
          sh.getLastColumn()
        )
        .getValues();

    for (
      var i = 0;
      i < valores.length;
      i++
    ) {
      if (
        texto_(valores[i][colunaId]) ===
        id
      ) {
        var obj = {};

        h.forEach(function (campo, j) {
          if (campo) {
            obj[campo] = valores[i][j];
          }
        });

        return {
          sh: sh,
          headers: h,
          linha: i + 2,
          objeto: obj
        };
      }
    }

    throw new Error(
      'Ponto de referência não encontrado: ' +
      id
    );
  }


  function atualizarCampos_(local, campos) {
    var idx = {};

    local.headers.forEach(function (h, i) {
      idx[h] = i + 1;
    });

    Object.keys(campos).forEach(
      function (campo) {
        if (!idx[campo]) {
          return;
        }

        local.sh
          .getRange(
            local.linha,
            idx[campo]
          )
          .setValue(campos[campo]);

        local.objeto[campo] =
          campos[campo];
      }
    );
  }


  function appendObjeto_(sh, objeto) {
    var h = headers_(sh);

    var linha =
      h.map(function (campo) {
        return Object.prototype
          .hasOwnProperty
          .call(objeto, campo)
          ? objeto[campo]
          : '';
      });

    sh.getRange(
      sh.getLastRow() + 1,
      1,
      1,
      h.length
    ).setValues([linha]);
  }


  function mapaMapas_(ss) {
    var sh =
      abaObrigatoria_(ss, ABA_MAPAS);

    var out = {};

    linhas_(sh).forEach(function (r) {
      var id =
        texto_(r.ID_MAPA_SETOR);

      if (!id) {
        return;
      }

      out[id] = {
        idMapaSetor: id,
        nome:
          texto_(
            r.NOME ||
            r.MAPA ||
            id
          ),
        piso:
          texto_(r.PISO),
        ativo:
          sim_(r.ATIVO),
        idPlanta:
          texto_(r.ID_PLANTA),
        idSetor:
          texto_(r.ID_SETOR)
      };
    });

    return out;
  }


  function validarMapa_(mapas, idMapaSetor) {
    var id =
      texto_(idMapaSetor);

    if (!id) {
      throw new Error(
        'Mapa/setor é obrigatório.'
      );
    }

    var mapa = mapas[id];

    if (!mapa) {
      throw new Error(
        'Mapa/setor não encontrado: ' +
        id
      );
    }

    if (!mapa.ativo) {
      throw new Error(
        'Mapa/setor está inativo: ' +
        id
      );
    }

    return mapa;
  }


  // ==========================================================
  // VALIDAÇÃO
  // ==========================================================

  function normalizarCodigo_(valor, campo) {
    var v =
      upper_(valor)
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

    if (!v) {
      throw new Error(
        campo + ' é obrigatório.'
      );
    }

    if (v.length > 60) {
      throw new Error(
        campo + ' deve ter no máximo 60 caracteres.'
      );
    }

    return v;
  }


  function validarNome_(valor) {
    var v = texto_(valor);

    if (v.length < 2) {
      throw new Error(
        'Nome da referência é obrigatório.'
      );
    }

    if (v.length > 160) {
      throw new Error(
        'Nome da referência deve ter no máximo 160 caracteres.'
      );
    }

    return v;
  }


  function validarDescricao_(valor) {
    var v = texto_(valor);

    if (!v) {
      throw new Error(
        'Descrição é obrigatória.'
      );
    }

    if (v.length > 500) {
      throw new Error(
        'Descrição deve ter no máximo 500 caracteres.'
      );
    }

    return v;
  }


  function validarCoordenada_(valor, campo) {
    var n = numero_(valor);

    if (
      !Number.isFinite(n) ||
      n < 0 ||
      n > 1
    ) {
      throw new Error(
        campo + ' deve estar entre 0 e 1.'
      );
    }

    return n;
  }


  function validarRaio_(valor) {
    if (
      valor === '' ||
      valor == null
    ) {
      return 0.03;
    }

    var n = numero_(valor);

    /*
     * Compatibilidade:
     * existem referências históricas com raio 0.
     */
    if (
      !Number.isFinite(n) ||
      n < 0 ||
      n > 0.25
    ) {
      throw new Error(
        'Raio de proximidade deve estar entre 0 e 0,25.'
      );
    }

    return n;
  }


  function validarPrioridade_(valor) {
    if (
      valor === '' ||
      valor == null
    ) {
      return 80;
    }

    var n = numero_(valor);

    if (
      !Number.isFinite(n) ||
      n < 0 ||
      n > 100
    ) {
      throw new Error(
        'Prioridade deve estar entre 0 e 100.'
      );
    }

    return Math.round(n);
  }


  function normalizarIcone_(dados, atual) {
    dados = dados || {};
    atual = atual || {};

    var recebeuAlgumCampo =
      Object.prototype.hasOwnProperty.call(
        dados,
        'iconeTipo'
      ) ||
      Object.prototype.hasOwnProperty.call(
        dados,
        'iconeChave'
      ) ||
      Object.prototype.hasOwnProperty.call(
        dados,
        'iconeFileId'
      ) ||
      Object.prototype.hasOwnProperty.call(
        dados,
        'iconeUrl'
      );

    if (!recebeuAlgumCampo) {
      return {
        tipo:
          upper_(
            atual.ICONE_TIPO ||
            'AUTO'
          ) || 'AUTO',

        chave:
          upper_(
            atual.ICONE_CHAVE
          ),

        fileId:
          texto_(
            atual.ICONE_FILE_ID
          ),

        url:
          texto_(
            atual.ICONE_URL
          )
      };
    }

    var tipo =
      upper_(
        dados.iconeTipo ||
        'AUTO'
      );

    if (
      [
        'AUTO',
        'SISTEMA',
        'PERSONALIZADO'
      ].indexOf(tipo) < 0
    ) {
      throw new Error(
        'Tipo de ícone inválido.'
      );
    }

    var chave =
      upper_(dados.iconeChave)
        .replace(/[^A-Z0-9_]/g, '')
        .slice(0, 60);

    var fileId =
      texto_(dados.iconeFileId);

    var url =
      texto_(dados.iconeUrl);

    if (
      tipo === 'SISTEMA' &&
      !chave
    ) {
      throw new Error(
        'Informe a chave do ícone do sistema.'
      );
    }

    if (
      tipo === 'PERSONALIZADO' &&
      !fileId
    ) {
      throw new Error(
        'Informe o arquivo do ícone personalizado.'
      );
    }

    if (tipo === 'AUTO') {
      chave = '';
      fileId = '';
      url = '';
    }

    if (tipo === 'SISTEMA') {
      fileId = '';
      url = '';
    }

    return {
      tipo: tipo,
      chave: chave,
      fileId: fileId,
      url: url
    };
  }


  function normalizarEntradaCadastro_(
    dados,
    atual,
    exigirPosicao
  ) {
    dados = dados || {};
    atual = atual || {};

    var out = {
      nome:
        validarNome_(
          Object.prototype
            .hasOwnProperty
            .call(dados, 'nome')
            ? dados.nome
            : atual.NOME
        ),

      tipo:
        normalizarCodigo_(
          Object.prototype
            .hasOwnProperty
            .call(dados, 'tipo')
            ? dados.tipo
            : atual.TIPO,
          'Tipo'
        ),

      subtipo:
        normalizarCodigo_(
          Object.prototype
            .hasOwnProperty
            .call(dados, 'subtipo')
            ? dados.subtipo
            : atual.SUBTIPO,
          'Subtipo'
        ),

      descricao:
        validarDescricao_(
          Object.prototype
            .hasOwnProperty
            .call(dados, 'descricao')
            ? dados.descricao
            : atual.DESCRICAO
        ),

      raio:
        validarRaio_(
          Object.prototype
            .hasOwnProperty
            .call(
              dados,
              'raioProximidade'
            )
            ? dados.raioProximidade
            : atual.RAIO_PROXIMIDADE
        ),

      prioridade:
        validarPrioridade_(
          Object.prototype
            .hasOwnProperty
            .call(
              dados,
              'prioridadeDescricao'
            )
            ? dados.prioridadeDescricao
            : atual.PRIORIDADE_DESCRICAO
        ),

      icone:
        normalizarIcone_(
          dados,
          atual
        )
    };

    /*
     * S26.10-R8 — quando o catálogo administrável estiver instalado,
     * criação/edição também é validada no backend.
     *
     * Edição de referência antiga com item posteriormente inativado
     * pode manter o valor atual; troca para item inativo é bloqueada.
     */
    if (
      typeof validarCatalogoReferenciaS2610R8_ === 'function'
    ) {
      validarCatalogoReferenciaS2610R8_(
        out.tipo,
        out.subtipo,
        {
          permitirAtualInativo: !exigirPosicao,
          atualTipo: atual.TIPO || '',
          atualSubtipo: atual.SUBTIPO || ''
        }
      );
    }

    if (exigirPosicao) {
      out.idMapaSetor =
        texto_(dados.idMapaSetor);

      out.x =
        validarCoordenada_(
          dados.x,
          'Coordenada X'
        );

      out.y =
        validarCoordenada_(
          dados.y,
          'Coordenada Y'
        );
    }

    return out;
  }


  function chaveNome_(valor) {
    return texto_(valor)
      .toLocaleLowerCase('pt-BR')
      .replace(/\s+/g, ' ');
  }


  function validarDuplicidadeCriacao_(
    rows,
    dados
  ) {
    var nome =
      chaveNome_(dados.nome);

    var limite =
      0.000001;

    var duplicado =
      rows.find(function (r) {
        if (
          texto_(r.ID_MAPA_SETOR) !==
          dados.idMapaSetor
        ) {
          return false;
        }

        if (
          chaveNome_(r.NOME) !== nome
        ) {
          return false;
        }

        var x =
          numero_(r.X_NORMALIZADO);

        var y =
          numero_(r.Y_NORMALIZADO);

        return (
          Number.isFinite(x) &&
          Number.isFinite(y) &&
          Math.abs(x - dados.x) <=
            limite &&
          Math.abs(y - dados.y) <=
            limite
        );
      });

    if (duplicado) {
      throw new Error(
        'Já existe uma referência com este nome na mesma posição: ' +
        texto_(duplicado.ID_REFERENCIA)
      );
    }
  }


  // ==========================================================
  // SERIALIZAÇÃO
  // ==========================================================

  function resumoRpc_(r, mapas) {
    var mapa =
      mapas[
        texto_(r.ID_MAPA_SETOR)
      ] || {};

    return {
      idReferencia:
        texto_(r.ID_REFERENCIA),

      idMapaSetor:
        texto_(r.ID_MAPA_SETOR),

      mapa:
        texto_(
          mapa.nome ||
          r.ID_MAPA_SETOR
        ),

      piso:
        texto_(mapa.piso),

      nome:
        texto_(r.NOME),

      tipo:
        upper_(r.TIPO),

      subtipo:
        upper_(r.SUBTIPO),

      x:
        numero_(r.X_NORMALIZADO),

      y:
        numero_(r.Y_NORMALIZADO),

      raioProximidade:
        numero_(r.RAIO_PROXIMIDADE),

      descricao:
        texto_(r.DESCRICAO),

      prioridadeDescricao:
        numero_(
          r.PRIORIDADE_DESCRICAO
        ),

      statusCadastro:
        upper_(r.STATUS),

      confirmado:
        sim_(r.CONFIRMADO),

      ativo:
        sim_(r.ATIVO),

      iconeTipo:
        upper_(
          r.ICONE_TIPO ||
          'AUTO'
        ) || 'AUTO',

      iconeChave:
        upper_(r.ICONE_CHAVE),

      iconeFileId:
        texto_(r.ICONE_FILE_ID),

      iconeUrl:
        texto_(r.ICONE_URL),

      criadoEm:
        dataRpc_(r.CRIADO_EM),

      atualizadoEm:
        dataRpc_(r.ATUALIZADO_EM)
    };
  }


  function detalheRpc_(r, mapas) {
    var base =
      resumoRpc_(r, mapas);

    base.observacao =
      texto_(r.OBSERVACAO);

    return base;
  }


  // ==========================================================
  // LEITURA
  // ==========================================================

  function catalogos_(sessao) {
    var ss = planilha_();

    validarOperacao_(ss);

    var shRefs =
      abaObrigatoria_(
        ss,
        ABA_REFERENCIAS
      );

    validarHeaders_(
      shRefs,
      HEADERS_REFERENCIAS
    );

    var rows = linhas_(shRefs);
    var mapas = mapaMapas_(ss);

    var tipos = {};
    var subtipos = {};

    rows.forEach(function (r) {
      var tipo = upper_(r.TIPO);
      var subtipo = upper_(r.SUBTIPO);

      if (tipo) {
        tipos[tipo] =
          (tipos[tipo] || 0) + 1;
      }

      if (subtipo) {
        subtipos[subtipo] =
          (subtipos[subtipo] || 0) + 1;
      }
    });

    return {
      ok: true,
      fase: 'S26.10-R2',

      podeAdministrar: true,

      mapas:
        Object.keys(mapas)
          .map(function (id) {
            return mapas[id];
          })
          .filter(function (m) {
            return m.ativo;
          })
          .sort(function (a, b) {
            return (
              texto_(a.piso)
                .localeCompare(
                  texto_(b.piso),
                  'pt-BR'
                ) ||
              texto_(a.nome)
                .localeCompare(
                  texto_(b.nome),
                  'pt-BR'
                )
            );
          }),

      tipos:
        Object.keys(tipos)
          .sort(function (a, b) {
            return a.localeCompare(
              b,
              'pt-BR'
            );
          })
          .map(function (codigo) {
            return {
              codigo: codigo,
              usos: tipos[codigo]
            };
          }),

      subtipos:
        Object.keys(subtipos)
          .sort(function (a, b) {
            return a.localeCompare(
              b,
              'pt-BR'
            );
          })
          .map(function (codigo) {
            return {
              codigo: codigo,
              usos: subtipos[codigo]
            };
          }),

      usuario:
        usuario_(sessao)
    };
  }


  function listar_(filtros) {
    var sessao = exigirAdmin_();

    var ss = planilha_();
    validarOperacao_(ss);

    var sh =
      abaObrigatoria_(
        ss,
        ABA_REFERENCIAS
      );

    validarHeaders_(
      sh,
      HEADERS_REFERENCIAS
    );

    var rows = linhas_(sh);
    var mapas = mapaMapas_(ss);

    filtros = filtros || {};

    var busca =
      texto_(filtros.busca)
        .toLocaleLowerCase('pt-BR');

    var idMapa =
      texto_(
        filtros.idMapaSetor ||
        filtros.mapa
      );

    var tipo =
      upper_(filtros.tipo);

    var subtipo =
      upper_(filtros.subtipo);

    var status =
      upper_(
        filtros.status ||
        'ATIVAS'
      );

    var confirmacao =
      upper_(
        filtros.confirmacao ||
        'TODAS'
      );

    var filtrados =
      rows.filter(function (r) {

        if (
          idMapa &&
          texto_(r.ID_MAPA_SETOR) !==
            idMapa
        ) {
          return false;
        }

        if (
          tipo &&
          upper_(r.TIPO) !== tipo
        ) {
          return false;
        }

        if (
          subtipo &&
          upper_(r.SUBTIPO) !==
            subtipo
        ) {
          return false;
        }

        var ativo =
          sim_(r.ATIVO);

        if (
          status === 'ATIVAS' &&
          !ativo
        ) {
          return false;
        }

        if (
          status === 'INATIVAS' &&
          ativo
        ) {
          return false;
        }

        var confirmado =
          sim_(r.CONFIRMADO);

        if (
          confirmacao ===
            'CONFIRMADAS' &&
          !confirmado
        ) {
          return false;
        }

        if (
          (
            confirmacao ===
              'NAO_CONFIRMADAS' ||
            confirmacao ===
              'NÃO_CONFIRMADAS'
          ) &&
          confirmado
        ) {
          return false;
        }

        if (busca) {
          var haystack = [
            r.ID_REFERENCIA,
            r.NOME,
            r.TIPO,
            r.SUBTIPO,
            r.DESCRICAO,
            r.OBSERVACAO,
            r.ID_MAPA_SETOR
          ]
            .map(function (v) {
              return texto_(v)
                .toLocaleLowerCase(
                  'pt-BR'
                );
            })
            .join(' | ');

          if (
            haystack.indexOf(
              busca
            ) < 0
          ) {
            return false;
          }
        }

        return true;
      });


    filtrados.sort(function (a, b) {
      var mapaA =
        mapas[
          texto_(a.ID_MAPA_SETOR)
        ] || {};

      var mapaB =
        mapas[
          texto_(b.ID_MAPA_SETOR)
        ] || {};

      return (
        texto_(mapaA.piso)
          .localeCompare(
            texto_(mapaB.piso),
            'pt-BR'
          ) ||
        texto_(mapaA.nome)
          .localeCompare(
            texto_(mapaB.nome),
            'pt-BR'
          ) ||
        texto_(a.NOME)
          .localeCompare(
            texto_(b.NOME),
            'pt-BR'
          )
      );
    });


    return {
      ok: true,
      fase: 'S26.10-R2',

      usuario:
        usuario_(sessao),

      filtros: {
        busca: busca,
        idMapaSetor: idMapa,
        tipo: tipo,
        subtipo: subtipo,
        status: status,
        confirmacao: confirmacao
      },

      total:
        filtrados.length,

      totais: {
        todas: rows.length,

        ativas:
          rows.filter(function (r) {
            return sim_(r.ATIVO);
          }).length,

        inativas:
          rows.filter(function (r) {
            return !sim_(r.ATIVO);
          }).length,

        confirmadas:
          rows.filter(function (r) {
            return sim_(
              r.CONFIRMADO
            );
          }).length
      },

      referencias:
        filtrados.map(
          function (r) {
            return resumoRpc_(
              r,
              mapas
            );
          }
        )
    };
  }


  function obter_(idReferencia) {
    var sessao = exigirAdmin_();

    var ss = planilha_();
    validarOperacao_(ss);

    var sh =
      abaObrigatoria_(
        ss,
        ABA_REFERENCIAS
      );

    validarHeaders_(
      sh,
      HEADERS_REFERENCIAS
    );

    var local =
      localizar_(
        sh,
        idReferencia
      );

    return {
      ok: true,
      fase: 'S26.10-R2',
      usuario: usuario_(sessao),
      referencia:
        detalheRpc_(
          local.objeto,
          mapaMapas_(ss)
        )
    };
  }


  // ==========================================================
  // CRIAÇÃO
  // ==========================================================

  function criar_(payload) {
    payload = payload || {};

    var sessao = exigirAdmin_();
    exigirAuditoria_();

    var ss = planilha_();
    validarOperacao_(ss);

    var sh =
      abaObrigatoria_(
        ss,
        ABA_REFERENCIAS
      );

    validarHeaders_(
      sh,
      HEADERS_REFERENCIAS
    );

    var mapas =
      mapaMapas_(ss);

    var dados =
      normalizarEntradaCadastro_(
        payload,
        {},
        true
      );

    validarMapa_(
      mapas,
      dados.idMapaSetor
    );

    var rows =
      linhas_(sh);

    validarDuplicidadeCriacao_(
      rows,
      dados
    );

    var dryRun =
      payload.dryRun === true;

    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        fase: 'S26.10-R2',
        validacao: 'CRIAR_REFERENCIA',
        normalizado: {
          idMapaSetor:
            dados.idMapaSetor,
          nome:
            dados.nome,
          tipo:
            dados.tipo,
          subtipo:
            dados.subtipo,
          x:
            dados.x,
          y:
            dados.y,
          raioProximidade:
            dados.raio,
          prioridadeDescricao:
            dados.prioridade,
          iconeTipo:
            dados.icone.tipo
        }
      };
    }

    var lock =
      LockService.getScriptLock();

    lock.waitLock(30000);

    try {
      /*
       * Revalida sob lock para reduzir
       * risco de duplicidade concorrente.
       */
      rows = linhas_(sh);

      validarDuplicidadeCriacao_(
        rows,
        dados
      );

      var user =
        usuario_(sessao);

      var agora =
        new Date();

      var idReferencia =
        'REF-' +
        Utilities.formatDate(
          agora,
          APP.TIMEZONE ||
            'America/Fortaleza',
          'yyyyMMddHHmmss'
        ) +
        '-' +
        Utilities
          .getUuid()
          .replace(/-/g, '')
          .substring(0, 8)
          .toUpperCase();

      var nova = {
        ID_REFERENCIA:
          idReferencia,

        ID_MAPA_SETOR:
          dados.idMapaSetor,

        NOME:
          dados.nome,

        TIPO:
          dados.tipo,

        SUBTIPO:
          dados.subtipo,

        X_NORMALIZADO:
          dados.x,

        Y_NORMALIZADO:
          dados.y,

        RAIO_PROXIMIDADE:
          dados.raio,

        DESCRICAO:
          dados.descricao,

        PRIORIDADE_DESCRICAO:
          dados.prioridade,

        STATUS:
          'VALIDADO',

        CONFIRMADO:
          'SIM',

        ATIVO:
          payload.ativo === false
            ? 'NAO'
            : 'SIM',

        CRIADO_EM:
          agora,

        ATUALIZADO_EM:
          agora,

        OBSERVACAO:
          'Criado pela Central de Referências S26.10-R2 por ' +
          user.email +
          '.',

        ICONE_TIPO:
          dados.icone.tipo,

        ICONE_CHAVE:
          dados.icone.chave,

        ICONE_FILE_ID:
          dados.icone.fileId,

        ICONE_URL:
          dados.icone.url
      };

      appendObjeto_(
        sh,
        nova
      );

      var auditoria =
        registrarAuditoriaS15_({
          acao:
            'REFERENCIA_CENTRAL_CRIADA',

          entidade:
            'PONTO_REFERENCIA',

          entidadeId:
            idReferencia,

          resultado:
            'SUCESSO',

          origem:
            'WEB_APP',

          usuarioEmail:
            user.email,

          usuarioNome:
            user.nome,

          perfil:
            user.perfil,

          valorNovo:
            nova,

          detalhes: {
            fase:
              'S26.10-R2'
          }
        });

      if (!auditoria) {
        console.warn(
          '[S26.10-R2] Auditoria não retornou objeto para criação ' +
          idReferencia
        );
      }

      SpreadsheetApp.flush();

      return {
        ok: true,
        fase: 'S26.10-R2',
        idReferencia:
          idReferencia,
        referencia:
          detalheRpc_(
            nova,
            mapas
          )
      };

    } catch (e) {
      try {
        registrarAuditoriaS15_({
          acao:
            'REFERENCIA_CENTRAL_CRIAR',

          entidade:
            'PONTO_REFERENCIA',

          entidadeId:
            '',

          resultado:
            'ERRO',

          origem:
            'WEB_APP',

          detalhes: {
            erro:
              e.message ||
              String(e),
            fase:
              'S26.10-R2'
          }
        });
      } catch (_) {}

      throw e;

    } finally {
      lock.releaseLock();
    }
  }


  // ==========================================================
  // EDIÇÃO CADASTRAL
  // ==========================================================

  function atualizar_(payload) {
    payload = payload || {};

    var idReferencia =
      texto_(
        payload.idReferencia
      );

    var sessao = exigirAdmin_();
    exigirAuditoria_();

    var ss = planilha_();
    validarOperacao_(ss);

    var sh =
      abaObrigatoria_(
        ss,
        ABA_REFERENCIAS
      );

    validarHeaders_(
      sh,
      HEADERS_REFERENCIAS
    );

    var local =
      localizar_(
        sh,
        idReferencia
      );

    var dados =
      normalizarEntradaCadastro_(
        payload,
        local.objeto,
        false
      );

    var antes =
      detalheRpc_(
        local.objeto,
        mapaMapas_(ss)
      );

    var dryRun =
      payload.dryRun === true;

    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        fase: 'S26.10-R2',
        validacao:
          'ATUALIZAR_REFERENCIA',
        idReferencia:
          idReferencia,
        preservaPosicao: true,
        normalizado: {
          nome:
            dados.nome,
          tipo:
            dados.tipo,
          subtipo:
            dados.subtipo,
          descricao:
            dados.descricao,
          raioProximidade:
            dados.raio,
          prioridadeDescricao:
            dados.prioridade,
          iconeTipo:
            dados.icone.tipo
        }
      };
    }

    var lock =
      LockService.getScriptLock();

    lock.waitLock(30000);

    try {
      /*
       * Relocaliza sob lock.
       */
      local =
        localizar_(
          sh,
          idReferencia
        );

      var user =
        usuario_(sessao);

      var agora =
        new Date();

      atualizarCampos_(
        local,
        {
          NOME:
            dados.nome,

          TIPO:
            dados.tipo,

          SUBTIPO:
            dados.subtipo,

          DESCRICAO:
            dados.descricao,

          RAIO_PROXIMIDADE:
            dados.raio,

          PRIORIDADE_DESCRICAO:
            dados.prioridade,

          ICONE_TIPO:
            dados.icone.tipo,

          ICONE_CHAVE:
            dados.icone.chave,

          ICONE_FILE_ID:
            dados.icone.fileId,

          ICONE_URL:
            dados.icone.url,

          ATUALIZADO_EM:
            agora
        }
      );

      var depois =
        detalheRpc_(
          local.objeto,
          mapaMapas_(ss)
        );

      registrarAuditoriaS15_({
        acao:
          'REFERENCIA_CENTRAL_ATUALIZADA',

        entidade:
          'PONTO_REFERENCIA',

        entidadeId:
          idReferencia,

        resultado:
          'SUCESSO',

        origem:
          'WEB_APP',

        usuarioEmail:
          user.email,

        usuarioNome:
          user.nome,

        perfil:
          user.perfil,

        valorAnterior:
          antes,

        valorNovo:
          depois,

        detalhes: {
          fase:
            'S26.10-R2',
          posicaoAlterada:
            false
        }
      });

      SpreadsheetApp.flush();

      return {
        ok: true,
        fase: 'S26.10-R2',
        idReferencia:
          idReferencia,
        preservouPosicao:
          true,
        referencia:
          depois
      };

    } catch (e) {
      try {
        registrarAuditoriaS15_({
          acao:
            'REFERENCIA_CENTRAL_ATUALIZAR',

          entidade:
            'PONTO_REFERENCIA',

          entidadeId:
            idReferencia,

          resultado:
            'ERRO',

          origem:
            'WEB_APP',

          detalhes: {
            erro:
              e.message ||
              String(e),
            fase:
              'S26.10-R2'
          }
        });
      } catch (_) {}

      throw e;

    } finally {
      lock.releaseLock();
    }
  }


  // ==========================================================
  // ATIVAR / DESATIVAR
  // ==========================================================

  function definirAtivo_(
    idReferencia,
    ativo,
    opcoes
  ) {
    opcoes = opcoes || {};

    var id =
      texto_(idReferencia);

    var sessao = exigirAdmin_();
    exigirAuditoria_();

    var ss = planilha_();
    validarOperacao_(ss);

    var sh =
      abaObrigatoria_(
        ss,
        ABA_REFERENCIAS
      );

    validarHeaders_(
      sh,
      HEADERS_REFERENCIAS
    );

    var local =
      localizar_(
        sh,
        id
      );

    var antes =
      detalheRpc_(
        local.objeto,
        mapaMapas_(ss)
      );

    if (
      opcoes.dryRun === true
    ) {
      return {
        ok: true,
        dryRun: true,
        fase: 'S26.10-R2',
        idReferencia: id,
        ativoAtual:
          sim_(local.objeto.ATIVO),
        ativoNovo:
          !!ativo
      };
    }

    var lock =
      LockService.getScriptLock();

    lock.waitLock(30000);

    try {
      local =
        localizar_(
          sh,
          id
        );

      var user =
        usuario_(sessao);

      atualizarCampos_(
        local,
        {
          ATIVO:
            ativo
              ? 'SIM'
              : 'NAO',

          ATUALIZADO_EM:
            new Date()
        }
      );

      var depois =
        detalheRpc_(
          local.objeto,
          mapaMapas_(ss)
        );

      registrarAuditoriaS15_({
        acao:
          ativo
            ? 'REFERENCIA_CENTRAL_ATIVADA'
            : 'REFERENCIA_CENTRAL_DESATIVADA',

        entidade:
          'PONTO_REFERENCIA',

        entidadeId:
          id,

        resultado:
          'SUCESSO',

        origem:
          'WEB_APP',

        usuarioEmail:
          user.email,

        usuarioNome:
          user.nome,

        perfil:
          user.perfil,

        valorAnterior:
          antes,

        valorNovo:
          depois,

        detalhes: {
          fase:
            'S26.10-R2'
        }
      });

      SpreadsheetApp.flush();

      return {
        ok: true,
        fase: 'S26.10-R2',
        idReferencia: id,
        ativo: !!ativo,
        referencia: depois
      };

    } catch (e) {
      try {
        registrarAuditoriaS15_({
          acao:
            ativo
              ? 'REFERENCIA_CENTRAL_ATIVAR'
              : 'REFERENCIA_CENTRAL_DESATIVAR',

          entidade:
            'PONTO_REFERENCIA',

          entidadeId:
            id,

          resultado:
            'ERRO',

          origem:
            'WEB_APP',

          detalhes: {
            erro:
              e.message ||
              String(e),
            fase:
              'S26.10-R2'
          }
        });
      } catch (_) {}

      throw e;

    } finally {
      lock.releaseLock();
    }
  }


  // ==========================================================
  // API INTERNA DO SERVICE
  // ==========================================================

  return {
    catalogos:
      catalogos_,

    listar:
      listar_,

    obter:
      obter_,

    criar:
      criar_,

    atualizar:
      atualizar_,

    ativar:
      function (
        idReferencia,
        opcoes
      ) {
        return definirAtivo_(
          idReferencia,
          true,
          opcoes
        );
      },

    desativar:
      function (
        idReferencia,
        opcoes
      ) {
        return definirAtivo_(
          idReferencia,
          false,
          opcoes
        );
      }
  };

})();


// ============================================================
// APIs PÚBLICAS S26.10-R2
// ============================================================

function appCatalogosReferenciasS2610R2() {
  var sessao =
    exigirPermissaoS14_(
      'administrar'
    );

  return ReferenciaCentralServiceS2610R2
    .catalogos(sessao);
}


function appListarReferenciasS2610R2(
  filtros
) {
  return ReferenciaCentralServiceS2610R2
    .listar(
      filtros || {}
    );
}


function appObterReferenciaS2610R2(
  idReferencia
) {
  return ReferenciaCentralServiceS2610R2
    .obter(
      idReferencia
    );
}


function appCriarReferenciaS2610R2(
  payload
) {
  return ReferenciaCentralServiceS2610R2
    .criar(
      payload || {}
    );
}


function appAtualizarReferenciaS2610R2(
  payload
) {
  return ReferenciaCentralServiceS2610R2
    .atualizar(
      payload || {}
    );
}


function appAtivarReferenciaS2610R2(
  idReferencia,
  opcoes
) {
  return ReferenciaCentralServiceS2610R2
    .ativar(
      idReferencia,
      opcoes || {}
    );
}


function appDesativarReferenciaS2610R2(
  idReferencia,
  opcoes
) {
  return ReferenciaCentralServiceS2610R2
    .desativar(
      idReferencia,
      opcoes || {}
    );
}


// ============================================================
// DIAGNÓSTICO / GATE S26.10-R2
// ============================================================

function diagnosticoS2610R2() {
  exigirPermissaoS14_(
    'administrar'
  );

  var ss =
    SpreadsheetApp.getActive();

  var checks = [];

  function add(
    nome,
    ok,
    detalhe
  ) {
    checks.push({
      nome: nome,
      ok: !!ok,
      detalhe: String(
        detalhe == null
          ? ''
          : detalhe
      )
    });
  }


  var cfg = {};

  var shCfg =
    ss.getSheetByName('CONFIG');

  if (
    shCfg &&
    shCfg.getLastRow() >= 2
  ) {
    shCfg.getRange(
      2,
      1,
      shCfg.getLastRow() - 1,
      2
    )
      .getValues()
      .forEach(function (r) {
        var k =
          String(
            r[0] || ''
          ).trim();

        if (k) {
          cfg[k] =
            String(
              r[1] == null
                ? ''
                : r[1]
            ).trim();
        }
      });
  }


  add(
    'BASELINE_VERSAO',
    cfg.APP_VERSAO ===
      'MVP-3.31.0-SINALIZACAO-S26.9',
    cfg.APP_VERSAO ||
      'ausente'
  );


  add(
    'BASELINE_FASE',
    cfg.APP_FASE ===
      'S26.9',
    cfg.APP_FASE ||
      'ausente'
  );


  var shRefs =
    ss.getSheetByName(
      'PONTOS_REFERENCIA'
    );

  add(
    'ABA_PONTOS_REFERENCIA',
    !!shRefs,
    'PONTOS_REFERENCIA'
  );


  var totalAntes =
    shRefs
      ? Math.max(
          0,
          shRefs.getLastRow() - 1
        )
      : 0;


  add(
    'DEP_PERMISSAO_S14',
    typeof exigirPermissaoS14_ ===
      'function',
    'exigirPermissaoS14_'
  );


  add(
    'DEP_AUDITORIA_S15',
    typeof registrarAuditoriaS15_ ===
      'function',
    'registrarAuditoriaS15_'
  );


  add(
    'API_CATALOGOS',
    typeof appCatalogosReferenciasS2610R2 ===
      'function',
    'appCatalogosReferenciasS2610R2'
  );


  add(
    'API_LISTAR',
    typeof appListarReferenciasS2610R2 ===
      'function',
    'appListarReferenciasS2610R2'
  );


  add(
    'API_OBTER',
    typeof appObterReferenciaS2610R2 ===
      'function',
    'appObterReferenciaS2610R2'
  );


  add(
    'API_CRIAR',
    typeof appCriarReferenciaS2610R2 ===
      'function',
    'appCriarReferenciaS2610R2'
  );


  add(
    'API_ATUALIZAR',
    typeof appAtualizarReferenciaS2610R2 ===
      'function',
    'appAtualizarReferenciaS2610R2'
  );


  add(
    'API_ATIVAR',
    typeof appAtivarReferenciaS2610R2 ===
      'function',
    'appAtivarReferenciaS2610R2'
  );


  add(
    'API_DESATIVAR',
    typeof appDesativarReferenciaS2610R2 ===
      'function',
    'appDesativarReferenciaS2610R2'
  );


  add(
    'SEM_API_REMOVER_R2',
    typeof appRemoverReferenciaS2610R2 ===
      'undefined' &&
    typeof appExcluirReferenciaS2610R2 ===
      'undefined',
    'remoção reservada para R6'
  );


  add(
    'SEM_API_REPOSICIONAR_R2',
    typeof appReposicionarReferenciaS2610R2 ===
      'undefined',
    'reposicionamento reservado para R5'
  );


  /*
   * ----------------------------------------------------------
   * Prova real de leitura
   * ----------------------------------------------------------
   */

  var lista = null;
  var erroLista = '';

  try {
    lista =
      appListarReferenciasS2610R2({
        status: 'TODAS'
      });
  } catch (e1) {
    erroLista =
      e1.message ||
      String(e1);
  }


  add(
    'LISTAR_EXECUCAO_REAL',
    !!(
      lista &&
      lista.ok &&
      Array.isArray(
        lista.referencias
      )
    ),
    lista
      ? String(lista.total) +
        ' referência(s)'
      : erroLista
  );


  var primeira =
    lista &&
    Array.isArray(
      lista.referencias
    ) &&
    lista.referencias.length
      ? lista.referencias[0]
      : null;


  var detalhe = null;
  var erroObter = '';

  if (primeira) {
    try {
      detalhe =
        appObterReferenciaS2610R2(
          primeira.idReferencia
        );
    } catch (e2) {
      erroObter =
        e2.message ||
        String(e2);
    }
  }


  add(
    'OBTER_EXECUCAO_REAL',
    !!(
      detalhe &&
      detalhe.ok &&
      detalhe.referencia &&
      detalhe.referencia.idReferencia
    ),
    detalhe
      ? detalhe.referencia.idReferencia
      : (
          erroObter ||
          'sem referência para teste'
        )
  );


  /*
   * ----------------------------------------------------------
   * Catálogos/filtros
   * ----------------------------------------------------------
   */

  var catalogos = null;
  var erroCatalogos = '';

  try {
    catalogos =
      appCatalogosReferenciasS2610R2();
  } catch (e3) {
    erroCatalogos =
      e3.message ||
      String(e3);
  }


  add(
    'CATALOGOS_EXECUCAO_REAL',
    !!(
      catalogos &&
      catalogos.ok &&
      Array.isArray(
        catalogos.mapas
      ) &&
      Array.isArray(
        catalogos.tipos
      ) &&
      Array.isArray(
        catalogos.subtipos
      )
    ),
    catalogos
      ? (
          catalogos.mapas.length +
          ' mapa(s) / ' +
          catalogos.tipos.length +
          ' tipo(s) / ' +
          catalogos.subtipos.length +
          ' subtipo(s)'
        )
      : erroCatalogos
  );


  /*
   * ----------------------------------------------------------
   * Dry-run das mutações
   * ----------------------------------------------------------
   */

  var mapaTeste =
    primeira
      ? primeira.idMapaSetor
      : (
          catalogos &&
          catalogos.mapas &&
          catalogos.mapas.length
            ? catalogos.mapas[0]
                .idMapaSetor
            : ''
        );


  var criarDry = null;
  var erroCriarDry = '';

  if (mapaTeste) {
    try {
      criarDry =
        appCriarReferenciaS2610R2({
          idMapaSetor:
            mapaTeste,

          nome:
            '__GATE S26.10-R2__',

          tipo:
            'SERVICO',

          subtipo:
            'OUTRO',

          x:
            0.5,

          y:
            0.5,

          raioProximidade:
            0.03,

          descricao:
            'Validação somente leitura do backend S26.10-R2.',

          prioridadeDescricao:
            80,

          iconeTipo:
            'AUTO',

          dryRun:
            true
        });
    } catch (e4) {
      erroCriarDry =
        e4.message ||
        String(e4);
    }
  }


  add(
    'CRIAR_DRY_RUN',
    !!(
      criarDry &&
      criarDry.ok &&
      criarDry.dryRun
    ),
    criarDry
      ? criarDry.validacao
      : (
          erroCriarDry ||
          'sem mapa para teste'
        )
  );


  var updateDry = null;
  var erroUpdateDry = '';

  if (primeira) {
    try {
      updateDry =
        appAtualizarReferenciaS2610R2({
          idReferencia:
            primeira.idReferencia,

          nome:
            primeira.nome,

          tipo:
            primeira.tipo,

          subtipo:
            primeira.subtipo,

          descricao:
            primeira.descricao,

          raioProximidade:
            primeira.raioProximidade,

          prioridadeDescricao:
            primeira.prioridadeDescricao,

          dryRun:
            true
        });
    } catch (e5) {
      erroUpdateDry =
        e5.message ||
        String(e5);
    }
  }


  add(
    'ATUALIZAR_DRY_RUN',
    !!(
      updateDry &&
      updateDry.ok &&
      updateDry.dryRun &&
      updateDry.preservaPosicao
    ),
    updateDry
      ? updateDry.validacao
      : (
          erroUpdateDry ||
          'sem referência para teste'
        )
  );


  var ativarDry = null;
  var desativarDry = null;
  var erroStatusDry = '';

  if (primeira) {
    try {
      ativarDry =
        appAtivarReferenciaS2610R2(
          primeira.idReferencia,
          { dryRun: true }
        );

      desativarDry =
        appDesativarReferenciaS2610R2(
          primeira.idReferencia,
          { dryRun: true }
        );
    } catch (e6) {
      erroStatusDry =
        e6.message ||
        String(e6);
    }
  }


  add(
    'ATIVAR_DRY_RUN',
    !!(
      ativarDry &&
      ativarDry.ok &&
      ativarDry.dryRun &&
      ativarDry.ativoNovo === true
    ),
    ativarDry
      ? primeira.idReferencia
      : erroStatusDry
  );


  add(
    'DESATIVAR_DRY_RUN',
    !!(
      desativarDry &&
      desativarDry.ok &&
      desativarDry.dryRun &&
      desativarDry.ativoNovo === false
    ),
    desativarDry
      ? primeira.idReferencia
      : erroStatusDry
  );


  /*
   * ----------------------------------------------------------
   * Prova de não mutação do Gate
   * ----------------------------------------------------------
   */

  var totalDepois =
    shRefs
      ? Math.max(
          0,
          shRefs.getLastRow() - 1
        )
      : 0;


  add(
    'GATE_NAO_CRIou_REFERENCIA',
    totalAntes === totalDepois,
    totalAntes +
      ' → ' +
      totalDepois
  );


  /*
   * ----------------------------------------------------------
   * Resultado
   * ----------------------------------------------------------
   */

  var falhas =
    checks.filter(function (c) {
      return !c.ok;
    });


  var out = {
    ok:
      falhas.length === 0,

    diagnostico:
      'S26.10-R2-BACKEND-CENTRAL-REFERENCIAS',

    fase:
      'S26.10-R2',

    baseline: {
      appVersao:
        cfg.APP_VERSAO || '',
      appFase:
        cfg.APP_FASE || ''
    },

    totalChecks:
      checks.length,

    falhas:
      falhas.length,

    checks:
      checks,

    inventario: {
      referencias:
        lista &&
        lista.totais
          ? lista.totais.todas
          : totalDepois,

      ativas:
        lista &&
        lista.totais
          ? lista.totais.ativas
          : null,

      inativas:
        lista &&
        lista.totais
          ? lista.totais.inativas
          : null
    },

    capacidades: {
      listar: true,
      pesquisar: true,
      filtrar: true,
      obter: true,
      criar: true,
      editar: true,
      ativar: true,
      desativar: true,
      reposicionar: false,
      remover: false,
      auditoria: true
    },

    alterouDadosNoGate:
      totalAntes !== totalDepois,

    gate:
      falhas.length === 0
        ? 'APTO_PARA_S26.10-R3'
        : 'BLOQUEADO',

    proximaEtapa:
      'S26.10-R3-FRONTEND-CENTRAL-REFERENCIAS'
  };


  console.log(
    '[S26.10-R2] ' +
    JSON.stringify(out)
  );


  return out;
}


function mostrarDiagnosticoS2610R2() {
  var r =
    diagnosticoS2610R2();

  console.log(
    '[S26.10-R2][RESULTADO] ' +
    JSON.stringify(r)
  );

  return r;
}
