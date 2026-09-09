/**
 * ============================================================
 * S26.10-R5 — REPOSICIONAR REFERÊNCIA EXISTENTE
 * ============================================================
 *
 * Baseline oficial preservada:
 * APP_VERSAO = MVP-3.31.0-SINALIZACAO-S26.9
 * APP_FASE   = S26.9
 *
 * ESCOPO:
 * - reposicionar uma referência existente no MESMO mapa/setor;
 * - preservar ID_REFERENCIA;
 * - preservar ID_MAPA_SETOR;
 * - preservar nome/tipo/subtipo/descrição/ícone/status/ativo;
 * - alterar somente X_NORMALIZADO, Y_NORMALIZADO e ATUALIZADO_EM;
 * - registrar auditoria S15;
 * - suportar dryRun para Gate;
 * - NÃO remover;
 * - NÃO transferir entre mapas;
 * - NÃO reescrever REGISTROS.REFERENCIA.
 */

var ReferenciaCentralServiceS2610R5 = (function () {

  var ABA_REFERENCIAS = 'PONTOS_REFERENCIA';
  var BASELINE_VERSAO = 'MVP-3.31.0-SINALIZACAO-S26.9';
  var BASELINE_FASE = 'S26.9';


  function texto_(valor) {
    return String(valor == null ? '' : valor).trim();
  }


  function numero_(valor) {
    if (valor === '' || valor == null) return NaN;

    return Number(
      String(valor)
        .trim()
        .replace(',', '.')
    );
  }


  function config_(ss) {
    var sh = ss.getSheetByName('CONFIG');
    var out = {};

    if (!sh || sh.getLastRow() < 2) return out;

    sh.getRange(
      2,
      1,
      sh.getLastRow() - 1,
      2
    )
      .getValues()
      .forEach(function (r) {
        var k = texto_(r[0]);
        if (k) out[k] = texto_(r[1]);
      });

    return out;
  }


  function validarOperacao_(ss) {
    return s2610ValidarOperacao_(
      config_(ss),
      'S26.10-R5'
    );
  }


  function exigirAdmin_() {
    if (typeof exigirPermissaoS14_ !== 'function') {
      throw new Error(
        'S26.10-R5: mecanismo de permissão S14 indisponível.'
      );
    }

    return exigirPermissaoS14_('administrar');
  }


  function exigirAuditoria_() {
    if (typeof registrarAuditoriaS15_ !== 'function') {
      throw new Error(
        'S26.10-R5: auditoria S15 indisponível.'
      );
    }
  }


  function usuario_(sessao) {
    sessao = sessao || {};

    var email = texto_(
      sessao.email ||
      sessao.usuarioEmail ||
      ''
    );

    if (!email) {
      try {
        email = texto_(
          Session.getActiveUser().getEmail()
        );
      } catch (_) {}
    }

    if (!email) {
      try {
        email = texto_(
          Session.getEffectiveUser().getEmail()
        );
      } catch (_) {}
    }

    return {
      email: email || 'APPS_SCRIPT',
      nome: texto_(
        sessao.nome ||
        email ||
        'Administrador'
      ),
      perfil: texto_(
        sessao.perfil ||
        'ADMIN'
      ).toUpperCase()
    };
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


  function localizar_(sh, idReferencia) {
    var id = texto_(idReferencia);

    if (!id) {
      throw new Error(
        'ID da referência não informado.'
      );
    }

    var headers = sh
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

    var idxId = headers.indexOf('ID_REFERENCIA');

    if (idxId < 0) {
      throw new Error(
        'Coluna ID_REFERENCIA ausente.'
      );
    }

    if (sh.getLastRow() < 2) {
      throw new Error(
        'Ponto de referência não encontrado.'
      );
    }

    var rows = sh
      .getRange(
        2,
        1,
        sh.getLastRow() - 1,
        sh.getLastColumn()
      )
      .getValues();

    for (var i = 0; i < rows.length; i++) {
      if (texto_(rows[i][idxId]) === id) {
        var obj = {};

        headers.forEach(function (h, j) {
          if (h) obj[h] = rows[i][j];
        });

        return {
          linha: i + 2,
          headers: headers,
          objeto: obj
        };
      }
    }

    throw new Error(
      'Ponto de referência não encontrado: ' +
      id
    );
  }


  function coluna_(headers, nome) {
    var idx = headers.indexOf(nome);

    if (idx < 0) {
      throw new Error(
        'Coluna obrigatória ausente: ' +
        nome
      );
    }

    return idx + 1;
  }


  function snapshot_(obj) {
    return {
      idReferencia:
        texto_(obj.ID_REFERENCIA),

      idMapaSetor:
        texto_(obj.ID_MAPA_SETOR),

      nome:
        texto_(obj.NOME),

      x:
        numero_(obj.X_NORMALIZADO),

      y:
        numero_(obj.Y_NORMALIZADO),

      ativo:
        texto_(obj.ATIVO),

      status:
        texto_(obj.STATUS),

      confirmado:
        texto_(obj.CONFIRMADO),

      atualizadoEm:
        obj.ATUALIZADO_EM || ''
    };
  }


  function reposicionar_(payload) {
    payload = payload || {};

    var sessao = exigirAdmin_();
    exigirAuditoria_();

    var ss = SpreadsheetApp.getActive();
    validarOperacao_(ss);

    var sh = ss.getSheetByName(
      ABA_REFERENCIAS
    );

    if (!sh) {
      throw new Error(
        'Aba PONTOS_REFERENCIA não encontrada.'
      );
    }

    var idReferencia =
      texto_(payload.idReferencia);

    var x =
      validarCoordenada_(
        payload.x,
        'Coordenada X'
      );

    var y =
      validarCoordenada_(
        payload.y,
        'Coordenada Y'
      );

    var local =
      localizar_(
        sh,
        idReferencia
      );

    var idMapaAtual =
      texto_(
        local.objeto.ID_MAPA_SETOR
      );

    /*
     * R5 é deliberadamente restrita ao mesmo mapa.
     * Uma eventual transferência entre mapas deverá
     * ter fluxo e Gate próprios.
     */
    if (
      payload.idMapaSetor &&
      texto_(payload.idMapaSetor) !==
        idMapaAtual
    ) {
      throw new Error(
        'S26.10-R5 não transfere referência entre mapas. ' +
        'Mapa atual: ' +
        idMapaAtual
      );
    }

    var antes =
      snapshot_(
        local.objeto
      );

    if (payload.dryRun === true) {
      return {
        ok: true,
        dryRun: true,
        fase: 'S26.10-R5',
        validacao:
          'REPOSICIONAR_REFERENCIA',
        idReferencia:
          idReferencia,
        idMapaSetor:
          idMapaAtual,
        preservaId:
          true,
        preservaMapa:
          true,
        posicaoAnterior: {
          x: antes.x,
          y: antes.y
        },
        posicaoNova: {
          x: x,
          y: y
        }
      };
    }

    var lock =
      LockService.getScriptLock();

    lock.waitLock(30000);

    try {
      /*
       * Relocaliza sob lock para impedir escrita
       * em uma linha alterada por concorrência.
       */
      local =
        localizar_(
          sh,
          idReferencia
        );

      idMapaAtual =
        texto_(
          local.objeto.ID_MAPA_SETOR
        );

      if (
        payload.idMapaSetor &&
        texto_(payload.idMapaSetor) !==
          idMapaAtual
      ) {
        throw new Error(
          'O mapa da referência mudou durante a operação.'
        );
      }

      antes =
        snapshot_(
          local.objeto
        );

      var agora = new Date();

      sh
        .getRange(
          local.linha,
          coluna_(
            local.headers,
            'X_NORMALIZADO'
          )
        )
        .setValue(x);

      sh
        .getRange(
          local.linha,
          coluna_(
            local.headers,
            'Y_NORMALIZADO'
          )
        )
        .setValue(y);

      sh
        .getRange(
          local.linha,
          coluna_(
            local.headers,
            'ATUALIZADO_EM'
          )
        )
        .setValue(agora);

      var depois = {
        idReferencia:
          antes.idReferencia,

        idMapaSetor:
          antes.idMapaSetor,

        nome:
          antes.nome,

        x:
          x,

        y:
          y,

        ativo:
          antes.ativo,

        status:
          antes.status,

        confirmado:
          antes.confirmado,

        atualizadoEm:
          agora
      };

      var user =
        usuario_(sessao);

      registrarAuditoriaS15_({
        acao:
          'REFERENCIA_CENTRAL_REPOSICIONADA',

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
            'S26.10-R5',
          mapaPreservado:
            true,
          idPreservado:
            true,
          registrosHistoricosReescritos:
            false
        }
      });

      SpreadsheetApp.flush();

      return {
        ok: true,
        fase: 'S26.10-R5',
        idReferencia:
          idReferencia,
        idMapaSetor:
          idMapaAtual,
        preservouId:
          true,
        preservouMapa:
          true,
        posicaoAnterior: {
          x: antes.x,
          y: antes.y
        },
        posicaoNova: {
          x: x,
          y: y
        }
      };

    } catch (e) {
      try {
        registrarAuditoriaS15_({
          acao:
            'REFERENCIA_CENTRAL_REPOSICIONAR',

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
              'S26.10-R5'
          }
        });
      } catch (_) {}

      throw e;

    } finally {
      lock.releaseLock();
    }
  }


  return {
    reposicionar:
      reposicionar_
  };

})();


function appReposicionarReferenciaS2610R5(
  payload
) {
  return ReferenciaCentralServiceS2610R5
    .reposicionar(
      payload || {}
    );
}


/**
 * ============================================================
 * GATE AUTOMÁTICO R5
 * ============================================================
 *
 * SOMENTE LEITURA: usa dryRun.
 */
function diagnosticoS2610R5() {
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
    shCfg
      .getRange(
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
    cfg.APP_VERSAO || 'ausente'
  );

  add(
    'BASELINE_FASE',
    cfg.APP_FASE === 'S26.9',
    cfg.APP_FASE || 'ausente'
  );

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
    'API_REPOSICIONAR_R5',
    typeof appReposicionarReferenciaS2610R5 ===
      'function',
    'appReposicionarReferenciaS2610R5'
  );

  add(
    'SEM_TRANSFERENCIA_ENTRE_MAPAS_R5',
    true,
    'mesmo ID_MAPA_SETOR'
  );

  add(
    'SEM_REMOCAO_R5',
    typeof appRemoverReferenciaS2610R5 ===
      'undefined' &&
    typeof appExcluirReferenciaS2610R5 ===
      'undefined',
    'R6'
  );


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
    'LISTA_R2_DISPONIVEL',
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

  var dry = null;
  var erroDry = '';

  if (primeira) {
    try {
      var xTeste =
        Math.min(
          1,
          Math.max(
            0,
            Number(primeira.x) +
              0.000001
          )
        );

      var yTeste =
        Math.min(
          1,
          Math.max(
            0,
            Number(primeira.y) +
              0.000001
          )
        );

      dry =
        appReposicionarReferenciaS2610R5({
          idReferencia:
            primeira.idReferencia,

          idMapaSetor:
            primeira.idMapaSetor,

          x:
            xTeste,

          y:
            yTeste,

          dryRun:
            true
        });

    } catch (e2) {
      erroDry =
        e2.message ||
        String(e2);
    }
  }


  add(
    'REPOSICIONAR_DRY_RUN',
    !!(
      dry &&
      dry.ok &&
      dry.dryRun
    ),
    dry
      ? dry.idReferencia
      : (
          erroDry ||
          'sem referência'
        )
  );

  add(
    'DRY_RUN_PRESERVA_ID',
    !!(
      dry &&
      dry.preservaId
    ),
    dry
      ? String(
          dry.idReferencia
        )
      : 'não executado'
  );

  add(
    'DRY_RUN_PRESERVA_MAPA',
    !!(
      dry &&
      dry.preservaMapa &&
      dry.idMapaSetor ===
        primeira.idMapaSetor
    ),
    dry
      ? String(
          dry.idMapaSetor
        )
      : 'não executado'
  );


  var detalheDepois = null;
  var erroDepois = '';

  if (primeira) {
    try {
      detalheDepois =
        appObterReferenciaS2610R2(
          primeira.idReferencia
        );
    } catch (e3) {
      erroDepois =
        e3.message ||
        String(e3);
    }
  }


  add(
    'DRY_RUN_NAO_ALTEROU_COORDENADAS',
    !!(
      detalheDepois &&
      detalheDepois.ok &&
      Number(
        detalheDepois
          .referencia.x
      ) === Number(
        primeira.x
      ) &&
      Number(
        detalheDepois
          .referencia.y
      ) === Number(
        primeira.y
      )
    ),
    detalheDepois
      ? (
          'X ' +
          detalheDepois.referencia.x +
          ' / Y ' +
          detalheDepois.referencia.y
        )
      : erroDepois
  );


  var falhas =
    checks.filter(function (c) {
      return !c.ok;
    });


  var out = {
    ok:
      falhas.length === 0,

    diagnostico:
      'S26.10-R5-REPOSICIONAR-REFERENCIA',

    fase:
      'S26.10-R5',

    totalChecks:
      checks.length,

    falhas:
      falhas.length,

    checks:
      checks,

    contrato: {
      reposicionar: true,
      mesmoMapa: true,
      preservarId: true,
      preservarHistorico: true,
      auditoria: true,
      transferirMapa: false,
      remover: false
    },

    alterouDadosNoGate:
      false,

    gate:
      falhas.length === 0
        ? 'APTO_PARA_FRONTEND_R5'
        : 'BLOQUEADO',

    proximaEtapa:
      'S26.10-R5-FRONTEND-REPOSICIONAMENTO'
  };


  console.log(
    '[S26.10-R5] ' +
    JSON.stringify(out)
  );

  return out;
}
