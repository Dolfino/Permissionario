/**
 * ============================================================
 * S26.10-F2-FIX1 — COMPATIBILIDADE OPERACIONAL PÓS-PROMOÇÃO
 * ============================================================
 *
 * Setups e migrações continuam responsáveis por validar suas próprias
 * baselines. Este contrato é exclusivo para endpoints operacionais que
 * precisam funcionar na release S26.10 e no rollback suportado S26.9.
 */

var S2610_ESTADOS_OPERACIONAIS = Object.freeze([
  Object.freeze({
    versao: 'MVP-3.31.0-SINALIZACAO-S26.9',
    fase: 'S26.9',
    estado: 'ROLLBACK_S26.9'
  }),
  Object.freeze({
    versao: 'MVP-3.32.0-SINALIZACAO-S26.10',
    fase: 'S26.10',
    estado: 'RELEASE_S26.10'
  })
]);


function s2610TextoVersao_(valor) {
  return String(valor == null ? '' : valor).trim();
}


function s2610EstadoOperacional_(versao, fase) {
  var versaoNormalizada = s2610TextoVersao_(versao);
  var faseNormalizada = s2610TextoVersao_(fase);
  var encontrado = S2610_ESTADOS_OPERACIONAIS.find(function(item) {
    return (
      item.versao === versaoNormalizada &&
      item.fase === faseNormalizada
    );
  });

  return {
    ok: !!encontrado,
    estado: encontrado ? encontrado.estado : 'INCOMPATIVEL',
    appVersao: versaoNormalizada,
    appFase: faseNormalizada
  };
}


function s2610EstadosOperacionaisTexto_() {
  return S2610_ESTADOS_OPERACIONAIS
    .map(function(item) {
      return '[' + item.versao + ' / ' + item.fase + ']';
    })
    .join(' ou ');
}


function s2610ValidarOperacao_(config, contexto) {
  var cfg = config || {};
  var rotulo = s2610TextoVersao_(contexto) || 'S26.10';
  var estadoConfig = s2610EstadoOperacional_(
    cfg.APP_VERSAO,
    cfg.APP_FASE
  );

  if (!estadoConfig.ok) {
    throw new Error(
      rotulo + ' bloqueado: estado operacional incompatível. ' +
      'Permitidos=' + s2610EstadosOperacionaisTexto_() +
      ' atual=[' + estadoConfig.appVersao + ' / ' +
      estadoConfig.appFase + ']'
    );
  }

  if (typeof APP !== 'undefined') {
    var estadoRuntime = s2610EstadoOperacional_(
      APP.VERSAO,
      APP.FASE
    );

    if (!estadoRuntime.ok) {
      throw new Error(
        rotulo + ' bloqueado: runtime APP incompatível. ' +
        'Atual=[' + estadoRuntime.appVersao + ' / ' +
        estadoRuntime.appFase + ']'
      );
    }

    if (
      estadoRuntime.appVersao !== estadoConfig.appVersao ||
      estadoRuntime.appFase !== estadoConfig.appFase
    ) {
      throw new Error(
        rotulo + ' bloqueado: runtime APP e CONFIG divergentes. ' +
        'runtime=[' + estadoRuntime.appVersao + ' / ' +
        estadoRuntime.appFase + '] config=[' +
        estadoConfig.appVersao + ' / ' + estadoConfig.appFase + ']'
      );
    }
  }

  return cfg;
}
