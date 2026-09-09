/**
 * S26.8-E5 — Regressão integrada:
 * Setores históricos + Níveis 0/1/2/3
 *
 * SOMENTE LEITURA.
 *
 * Objetivos:
 * - preservar APIs históricas de Setores;
 * - preservar APIs de Níveis;
 * - garantir presença das quatro plantas 2025;
 * - garantir que N0 não alterou N1/N2/N3;
 * - validar fontes cartográficas históricas;
 * - manter compatibilidade offline;
 * - manter S26.8-E2/E3/E4 aprovados.
 */

const S268E5 = Object.freeze({
  VERSAO: 'S26.8-E5',

  CANDIDATO:
    'MVP-3.30.0-SINALIZACAO-S26.8',

  NIVEIS: Object.freeze([
    'PLA-CFF-N0-2025',
    'PLA-CFF-N1-2025',
    'PLA-CFF-N2-2025',
    'PLA-CFF-N3-2025'
  ]),

  NIVEL0:
    'PLA-CFF-N0-2025',

  NIVEL1:
    'PLA-CFF-N1-2025',

  NIVEL2:
    'PLA-CFF-N2-2025',

  NIVEL3:
    'PLA-CFF-N3-2025'
});


function s268E5AbaExiste_(nome) {
  try {
    return !!SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(nome);
  } catch (_) {
    return false;
  }
}


function s268E5LerTabela_(nome) {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const sh =
    ss.getSheetByName(nome);

  if (!sh) {
    return {
      ok: false,
      headers: [],
      rows: []
    };
  }

  const values =
    sh.getDataRange().getValues();

  if (!values.length) {
    return {
      ok: true,
      headers: [],
      rows: []
    };
  }

  const headers =
    values[0].map(function(h) {
      return String(h || '').trim();
    });

  const rows =
    values.slice(1).map(function(row) {

      const obj = {};

      headers.forEach(function(h, i) {
        obj[h] = row[i];
      });

      return obj;
    });

  return {
    ok: true,
    headers: headers,
    rows: rows
  };
}


function s268E5PrimeiroCampo_(obj, nomes) {

  if (!obj) return '';

  for (let i = 0; i < nomes.length; i++) {

    const k = nomes[i];

    if (
      Object.prototype.hasOwnProperty.call(obj, k) &&
      obj[k] !== '' &&
      obj[k] != null
    ) {
      return obj[k];
    }
  }

  return '';
}


function diagnosticoGateS268E5() {

  exigirPermissaoS14_('administrar');

  const checks = [];

  const add = function(nome, ok, detalhe) {

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
  };


  /*
   * =====================================================
   * 1. BASE S26.8
   * =====================================================
   */

  add(
    'BASE_E2',
    typeof diagnosticoGateS268E2 === 'function',
    'diagnosticoGateS268E2'
  );

  add(
    'BASE_E3',
    typeof diagnosticoGateS268E3 === 'function',
    'diagnosticoGateS268E3'
  );

  add(
    'BASE_E4',
    typeof diagnosticoGateS268E4 === 'function',
    'diagnosticoGateS268E4'
  );


  /*
   * =====================================================
   * 2. REGRESSÃO DOS GATES
   * =====================================================
   */

  let e2 = null;

  try {
    e2 = diagnosticoGateS268E2();
  } catch (e) {
    e2 = {
      ok: false,
      erro:
        String(
          e && e.message || e
        )
    };
  }

  add(
    'E2_APROVADO',
    !!(e2 && e2.ok),
    e2
      ? (
          String(e2.totalChecks || 0) +
          ' checks / ' +
          String(e2.falhas || 0) +
          ' falhas'
        )
      : 'sem resposta'
  );


  let e3 = null;

  try {
    e3 = diagnosticoGateS268E3();
  } catch (e) {
    e3 = {
      ok: false,
      erro:
        String(
          e && e.message || e
        )
    };
  }

  add(
    'E3_APROVADO',
    !!(e3 && e3.ok),
    e3
      ? (
          String(e3.totalChecks || 0) +
          ' checks / ' +
          String(e3.falhas || 0) +
          ' falhas'
        )
      : 'sem resposta'
  );


  let e4 = null;

  try {
    e4 = diagnosticoGateS268E4();
  } catch (e) {
    e4 = {
      ok: false,
      erro:
        String(
          e && e.message || e
        )
    };
  }

  add(
    'E4_ESTRUTURAL_APROVADO',
    !!(e4 && e4.ok),
    e4
      ? (
          String(e4.totalChecks || 0) +
          ' checks / ' +
          String(e4.falhas || 0) +
          ' falhas'
        )
      : 'sem resposta'
  );


  /*
   * =====================================================
   * 3. APIS HISTÓRICAS
   * =====================================================
   */

  add(
    'API_MAPA_SETOR',
    typeof appListarRegistrosMapaS4 === 'function',
    'appListarRegistrosMapaS4'
  );

  add(
    'API_MAPA_NIVEL',
    typeof appListarRegistrosNivelS242 === 'function',
    'appListarRegistrosNivelS242'
  );

  add(
    'API_OFFLINE_MANIFEST',
    typeof appObterManifestOfflineS5B === 'function',
    'appObterManifestOfflineS5B'
  );

  add(
    'API_OFFLINE_PACOTE',
    typeof appObterPacoteMapaOfflineS5B === 'function',
    'appObterPacoteMapaOfflineS5B'
  );

  add(
    'API_OFFLINE_LOCALIZACAO',
    typeof appObterDadosLocalizacaoOfflineS6 === 'function',
    'appObterDadosLocalizacaoOfflineS6'
  );

  add(
    'API_CAMADAS_NIVEL',
    typeof appObterCamadasNivelS267B1 === 'function',
    'appObterCamadasNivelS267B1'
  );

  add(
    'API_ENQUADRAMENTO_NIVEL',
    typeof appObterEnquadramentoNivelS267C === 'function',
    'appObterEnquadramentoNivelS267C'
  );


  /*
   * =====================================================
   * 4. ABAS CARTOGRÁFICAS
   * =====================================================
   */

  [
    'PLANTAS',
    'MAPAS_SETORES',
    'MAPA_TRANSFORMACOES',
    'MAPA_AREAS_NIVEL',
    'CARTOGRAFIA_HISTORICO',
    'CARTOGRAFIA_PUBLICACOES',
    'CARTOGRAFIA_AREAS_FISICAS'
  ].forEach(function(nome) {

    add(
      'ABA_' + nome,
      s268E5AbaExiste_(nome),
      nome
    );
  });


  /*
   * =====================================================
   * 5. QUATRO PLANTAS 2025
   * =====================================================
   */

  const plantas =
    s268E5LerTabela_('PLANTAS');

  add(
    'PLANTAS_LEITURA',
    plantas.ok,
    plantas.rows.length + ' registro(s)'
  );

  const plantasEncontradas = {};

  S268E5.NIVEIS.forEach(function(idNivel) {

    const encontrou =
      plantas.rows.some(function(r) {

        const id =
          String(
            s268E5PrimeiroCampo_(
              r,
              [
                'ID_PLANTA',
                'ID',
                'PLANTA_ID',
                'ID_NIVEL'
              ]
            ) || ''
          );

        return id === idNivel;
      });

    plantasEncontradas[idNivel] =
      encontrou;

    add(
      'PLANTA_' +
      idNivel.replace(/[^A-Za-z0-9]+/g, '_'),
      encontrou,
      idNivel
    );
  });


  /*
   * =====================================================
   * 6. MAPAS / SETORES HISTÓRICOS
   * =====================================================
   */

  const mapas =
    s268E5LerTabela_('MAPAS_SETORES');

  add(
    'MAPAS_SETORES_LEITURA',
    mapas.ok,
    mapas.rows.length + ' registro(s)'
  );

  const ativos =
    mapas.rows.filter(function(r) {

      const ativo =
        String(
          s268E5PrimeiroCampo_(
            r,
            [
              'ATIVO',
              'STATUS'
            ]
          ) || ''
        )
        .trim()
        .toUpperCase();

      /*
       * Quando não houver coluna ATIVO/STATUS,
       * não rejeitamos registros históricos.
       */
      return (
        !ativo ||
        ativo === 'SIM' ||
        ativo === 'TRUE' ||
        ativo === 'ATIVO' ||
        ativo === 'VALIDADA' ||
        ativo === 'VALIDADO'
      );
    });

  add(
    'MAPAS_SETORES_DISPONIVEIS',
    ativos.length > 0,
    ativos.length + ' registro(s) utilizáveis'
  );


  /*
   * =====================================================
   * 7. N0 OPERACIONAL NÃO SUBSTITUI OS SETORES
   * =====================================================
   */

  let opN0 = null;

  try {

    opN0 =
      appObterOperacaoNivel0S268D();

  } catch (e) {

    opN0 = {
      erro:
        String(
          e && e.message || e
        )
    };
  }

  add(
    'N0_CONTINUA_OPERAVEL',
    !!(
      opN0 &&
      opN0.operavel &&
      String(opN0.nivel) === S268E5.NIVEL0
    ),
    opN0 && opN0.nivel
  );

  add(
    'N0_AREAS_COMPOSTAS',
    !!(
      opN0 &&
      opN0.areasCompostas
    ),
    String(
      !!(
        opN0 &&
        opN0.areasCompostas
      )
    )
  );


  /*
   * =====================================================
   * 8. REGRESSÃO DOS ENQUADRAMENTOS N1/N2/N3
   * =====================================================
   */

  const envelopes = {};

  [
    S268E5.NIVEL1,
    S268E5.NIVEL2,
    S268E5.NIVEL3
  ].forEach(function(idNivel) {

    let env = null;

    try {

      env =
        appObterEnquadramentoNivelS267C(
          idNivel
        );

    } catch (e1) {

      try {

        env =
          appObterEnquadramentoNivelS267C({
            nivel: idNivel,
            idNivel: idNivel
          });

      } catch (e2) {

        env = null;
      }
    }

    envelopes[idNivel] = env;

    const bounds =
      env &&
      (
        env.bounds ||
        env.enquadramento ||
        env
      );

    const minX =
      Number(
        bounds &&
        bounds.minX
      );

    const minY =
      Number(
        bounds &&
        bounds.minY
      );

    const maxX =
      Number(
        bounds &&
        bounds.maxX
      );

    const maxY =
      Number(
        bounds &&
        bounds.maxY
      );

    const ok =
      Number.isFinite(minX) &&
      Number.isFinite(minY) &&
      Number.isFinite(maxX) &&
      Number.isFinite(maxY) &&
      minX >= 0 &&
      minY >= 0 &&
      maxX <= 1 &&
      maxY <= 1 &&
      maxX > minX &&
      maxY > minY;

    add(
      'ENQUADRAMENTO_' +
      idNivel.replace(/[^A-Za-z0-9]+/g, '_'),
      ok,
      ok
        ? (
            '[' +
            minX +
            ',' +
            minY +
            ']→[' +
            maxX +
            ',' +
            maxY +
            ']'
          )
        : 'enquadramento inválido/indisponível'
    );
  });


  /*
   * =====================================================
   * 9. N0 NÃO DEVE EXIGIR TRANSFORMAÇÃO DE N1
   * =====================================================
   */

  add(
    'N0_COORDENADA_NATIVA',
    !!(
      opN0 &&
      (
        opN0.coordenadaNativa === true ||
        opN0.semCalibracao === true ||
        opN0.modoCoordenada === 'NATIVA' ||
        opN0.modoCoordenadas === 'NATIVA' ||
        opN0.cartografiaAtiva === true
      )
    ),
    'N0 preserva geometria própria'
  );


  /*
   * =====================================================
   * 10. ÁREAS OPERACIONAIS
   * =====================================================
   */

  const areas =
    Array.isArray(
      opN0 &&
      opN0.areas
    )
      ? opN0.areas
      : [];

  const resolviveis =
    areas.filter(function(a) {

      return (
        a &&
        a.status === 'VALIDADA' &&
        Array.isArray(a.poligono) &&
        a.poligono.length >= 3 &&
        a.participaResolucao !== false
      );
    });

  add(
    'N0_24_AREAS_RESOLVIVEIS',
    resolviveis.length === 24,
    resolviveis.length + '/24'
  );


  /*
   * =====================================================
   * 11. E01
   * =====================================================
   */

  const e01 =
    areas.find(function(a) {
      return (
        String(a.id) ===
        'AREA-N0-EXTERNA'
      );
    }) || null;

  add(
    'N0_E01_FORA_RESOLVEDOR',
    !!(
      e01 &&
      e01.participaResolucao === false
    ),
    e01
      ? String(e01.modoGeometria || '')
      : 'ausente'
  );


  /*
   * =====================================================
   * 12. RESULTADO
   * =====================================================
   */

  const falhas =
    checks.filter(function(c) {
      return !c.ok;
    });

  const out = {

    ok:
      falhas.length === 0,

    candidato:
      S268E5.CANDIDATO,

    diagnostico:
      'S26.8-E5-REGRESSAO-SETORES-NIVEIS',

    totalChecks:
      checks.length,

    falhas:
      falhas.length,

    checks:
      checks,

    plantasEncontradas:
      plantasEncontradas,

    totalMapasSetores:
      mapas.rows.length,

    totalAreasN0:
      areas.length,

    totalAreasResolviveisN0:
      resolviveis.length,

    gateVisualObrigatorio:
      true,

    gateVisual:
      'S26.8-E5-B-VISUAL-SETORES-NIVEIS',

    somenteLeitura:
      true,

    versao:
      S268E5.VERSAO,

    proximoGate:
      'S26.8-E6-CADASTRO-FILA'
  };

  console.log(
    '[S26.8-E5] ' +
    JSON.stringify(out)
  );

  return out;
}