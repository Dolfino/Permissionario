/**
 * S26.8-E4-A — Pré-gate estrutural Offline/Degradado
 *
 * SOMENTE LEITURA.
 *
 * Este gate NÃO afirma sozinho que o navegador funciona offline.
 * Ele comprova que:
 * - E2 e E3 continuam aprovados;
 * - a cartografia N0 necessária ao resolvedor local está íntegra;
 * - E01 permanece fora da resolução;
 * - as APIs históricas de offline continuam disponíveis;
 * - existem 24 geometrias operacionais resolvíveis no N0.
 *
 * A aprovação final do E4 exige também o Gate Manual E4-B.
 */

const S268E4 = Object.freeze({
  VERSAO: 'S26.8-E4',
  NIVEL: 'PLA-CFF-N0-2025',
  TOTAL_RESOLVIVEL: 24,

  ESPERADO: Object.freeze({
    ESTACIONAMENTO: 6,
    CIRCULACAO_VEICULAR: 10,
    RAMPA_ACESSO: 2,
    ACESSO_PEDESTRE: 1,
    AREA_EXTERNA: 4,
    SUBSOLO_GERAL: 1
  }),

  E01: 'AREA-N0-EXTERNA'
});


function diagnosticoGateS268E4() {
  exigirPermissaoS14_('administrar');

  const checks = [];

  const add = function(nome, ok, detalhe) {
    checks.push({
      nome: nome,
      ok: !!ok,
      detalhe: String(detalhe == null ? '' : detalhe)
    });
  };


  /*
   * -------------------------------------------------------
   * 1. Dependências
   * -------------------------------------------------------
   */

  add(
    'BASE_E2_DISPONIVEL',
    typeof diagnosticoGateS268E2 === 'function',
    'diagnosticoGateS268E2'
  );

  add(
    'BASE_E3_DISPONIVEL',
    typeof diagnosticoGateS268E3 === 'function',
    'diagnosticoGateS268E3'
  );

  add(
    'API_OPERACAO_N0',
    typeof appObterOperacaoNivel0S268D === 'function',
    'appObterOperacaoNivel0S268D'
  );

  add(
    'OFFLINE_MANIFEST',
    typeof appObterManifestOfflineS5B === 'function',
    'appObterManifestOfflineS5B'
  );

  add(
    'OFFLINE_PACOTE_MAPA',
    typeof appObterPacoteMapaOfflineS5B === 'function',
    'appObterPacoteMapaOfflineS5B'
  );

  add(
    'OFFLINE_LOCALIZACAO',
    typeof appObterDadosLocalizacaoOfflineS6 === 'function',
    'appObterDadosLocalizacaoOfflineS6'
  );


  /*
   * -------------------------------------------------------
   * 2. Regressão dos gates anteriores
   * -------------------------------------------------------
   */

  let e2 = null;

  try {
    e2 = diagnosticoGateS268E2();
  } catch (e) {
    e2 = {
      ok: false,
      erro: String(e && e.message || e)
    };
  }

  add(
    'E2_CONTINUA_APROVADO',
    !!(e2 && e2.ok),
    e2
      ? String(e2.totalChecks || 0) +
        ' checks / ' +
        String(e2.falhas || 0) +
        ' falhas'
      : 'sem resposta'
  );


  let e3 = null;

  try {
    e3 = diagnosticoGateS268E3();
  } catch (e) {
    e3 = {
      ok: false,
      erro: String(e && e.message || e)
    };
  }

  add(
    'E3_CONTINUA_APROVADO',
    !!(e3 && e3.ok),
    e3
      ? String(e3.totalChecks || 0) +
        ' checks / ' +
        String(e3.falhas || 0) +
        ' falhas'
      : 'sem resposta'
  );


  /*
   * -------------------------------------------------------
   * 3. Operação completa do N0
   * -------------------------------------------------------
   */

  let op = null;

  try {
    op = appObterOperacaoNivel0S268D();
  } catch (e) {
    op = {
      ok: false,
      erro: String(e && e.message || e)
    };
  }

  const areas =
    Array.isArray(op && op.areas)
      ? op.areas
      : [];

  const validas = areas.filter(function(a) {
    return (
      a &&
      a.status === 'VALIDADA' &&
      Array.isArray(a.poligono) &&
      a.poligono.length >= 3
    );
  });

  const resolviveis = validas.filter(function(a) {
    return a.participaResolucao !== false;
  });


  add(
    'N0_CORRETO',
    String(op && op.nivel) === S268E4.NIVEL,
    op && op.nivel
  );

  add(
    'N0_OPERAVEL',
    !!(op && op.operavel),
    String(!!(op && op.operavel))
  );

  add(
    'N0_CARTOGRAFIA_ATIVA',
    !!(op && op.cartografiaAtiva),
    String(!!(op && op.cartografiaAtiva))
  );

  add(
    'TOTAL_RESOLVIVEL',
    resolviveis.length === S268E4.TOTAL_RESOLVIVEL,
    resolviveis.length + '/' + S268E4.TOTAL_RESOLVIVEL
  );


  /*
   * -------------------------------------------------------
   * 4. Quantidades por categoria
   * -------------------------------------------------------
   */

  Object.keys(S268E4.ESPERADO).forEach(function(tipo) {

    const qtd = resolviveis.filter(function(a) {
      return String(a.tipoArea) === tipo;
    }).length;

    add(
      'QTD_' + tipo,
      qtd === S268E4.ESPERADO[tipo],
      qtd + '/' + S268E4.ESPERADO[tipo]
    );
  });


  /*
   * -------------------------------------------------------
   * 5. E01 continua estritamente fora do resolvedor
   * -------------------------------------------------------
   */

  const e01 = areas.find(function(a) {
    return String(a.id) === S268E4.E01;
  }) || null;

  add(
    'E01_PRESENTE',
    !!e01,
    S268E4.E01
  );

  add(
    'E01_FORA_RESOLUCAO',
    !!(e01 && e01.participaResolucao === false),
    e01
      ? String(e01.participaResolucao)
      : 'ausente'
  );


  /*
   * -------------------------------------------------------
   * 6. Todos os polígonos têm coordenadas locais válidas
   * -------------------------------------------------------
   */

  const areasInvalidas = [];

  resolviveis.forEach(function(area) {

    const pol = Array.isArray(area.poligono)
      ? area.poligono
      : [];

    const coordsOk =
      pol.length >= 3 &&
      pol.every(function(p) {
        const x = Number(p.x);
        const y = Number(p.y);

        return (
          Number.isFinite(x) &&
          Number.isFinite(y) &&
          x >= 0 &&
          x <= 1 &&
          y >= 0 &&
          y <= 1
        );
      });

    if (!coordsOk) {
      areasInvalidas.push(
        String(area.codigo || area.id)
      );
    }
  });

  add(
    'COORDENADAS_OFFLINE_VALIDAS',
    areasInvalidas.length === 0,
    areasInvalidas.length
      ? areasInvalidas.join(', ')
      : resolviveis.length + ' áreas aptas ao resolvedor local'
  );


  /*
   * -------------------------------------------------------
   * 7. E02–E05 mantêm identidade física
   * -------------------------------------------------------
   */

  const externas =
    ['E02', 'E03', 'E04', 'E05'];

  externas.forEach(function(codigo) {

    const a = resolviveis.find(function(area) {
      return String(area.codigo) === codigo;
    });

    add(
      'OFFLINE_' + codigo + '_PRESENTE',
      !!a,
      a ? String(a.nome || a.id) : 'ausente'
    );

    add(
      'OFFLINE_' + codigo + '_IDENTIDADE_FISICA',
      !!(
        a &&
        a.areaFisicaId === 'AF-CFF-AREA-EXTERNA' &&
        a.subareaFisicaId
      ),
      a
        ? (
            String(a.areaFisicaId || '') +
            ' / ' +
            String(a.subareaFisicaId || '')
          )
        : 'ausente'
    );
  });


  /*
   * -------------------------------------------------------
   * Resultado automático
   * -------------------------------------------------------
   */

  const out = {

    ok:
      checks.every(function(c) {
        return c.ok;
      }),

    candidato:
      'MVP-3.30.0-SINALIZACAO-S26.8',

    diagnostico:
      'S26.8-E4-A-OFFLINE-ESTRUTURAL',

    totalChecks:
      checks.length,

    falhas:
      checks.filter(function(c) {
        return !c.ok;
      }).length,

    checks:
      checks,

    nivel:
      S268E4.NIVEL,

    totalAreasValidas:
      validas.length,

    totalAreasResolviveis:
      resolviveis.length,

    gateManualObrigatorio:
      true,

    gateManual:
      'S26.8-E4-B-OFFLINE-NAVEGADOR',

    somenteLeitura:
      true,

    versao:
      S268E4.VERSAO,

    proximoGateAposE4:
      'S26.8-E5-REGRESSAO-SETORES-NIVEIS'
  };

  console.log(
    '[S26.8-E4-A] ' +
    JSON.stringify(out)
  );

  return out;
}