/**
 * S26.8-E3 — Gate de correspondência física N0 ↔ N1
 *
 * SOMENTE LEITURA.
 *
 * Objetivos:
 * - validar a identidade física compartilhada entre N0 e N1;
 * - confirmar E02–E05 nos dois níveis;
 * - garantir que cada representação possui geometria própria;
 * - impedir dependência de igualdade de coordenadas entre plantas;
 * - garantir que E01 continua sendo macro legado e não uma quinta subárea.
 */

const S268E3 = Object.freeze({
  VERSAO: 'S26.8-E3',

  N0: 'PLA-CFF-N0-2025',
  N1: 'PLA-CFF-N1-2025',

  AREA_FISICA_PAI: 'AF-CFF-AREA-EXTERNA',

  SUBAREAS: Object.freeze([
    {
      codigo: 'E02',
      fisicaId: 'AF-CFF-EXT-LAT-AZUL',
      nome: 'Área externa lateral azul',
      n0: 'AREA-N0-EXTERNA-E02',
      n1: 'AREA-EXT-LAT-AZUL-N1'
    },
    {
      codigo: 'E03',
      fisicaId: 'AF-CFF-EXT-LAT-VERDE',
      nome: 'Área externa lateral verde',
      n0: 'AREA-N0-EXTERNA-E03',
      n1: 'AREA-EXT-LAT-VERDE-N1'
    },
    {
      codigo: 'E04',
      fisicaId: 'AF-CFF-EXT-FRENTE',
      nome: 'Área externa frente',
      n0: 'AREA-N0-EXTERNA-E04',
      n1: 'AREA-EXT-FRENTE-N1'
    },
    {
      codigo: 'E05',
      fisicaId: 'AF-CFF-EXT-HOTEL-CDM',
      nome: 'Área externa Hotel/CDM',
      n0: 'AREA-N0-EXTERNA-E05',
      n1: 'AREA-EXT-HOTEL-CDM-N1'
    }
  ])
});


function s268E3Json_(v, fallback) {
  if (Array.isArray(v) || (v && typeof v === 'object')) return v;

  const txt = String(v == null ? '' : v).trim();
  if (!txt) return fallback;

  try {
    return JSON.parse(txt);
  } catch (_) {
    return fallback;
  }
}


function s268E3NormalizarHeader_(v) {
  return String(v == null ? '' : v)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}


function s268E3Tabela_(nomeAba) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(nomeAba);

  if (!sh) {
    return {
      ok: false,
      headers: [],
      rows: [],
      erro: 'Aba ausente: ' + nomeAba
    };
  }

  const values = sh.getDataRange().getValues();

  if (!values.length) {
    return {
      ok: true,
      headers: [],
      rows: []
    };
  }

  const headers = values[0].map(s268E3NormalizarHeader_);

  const rows = values.slice(1).map(function(row, index) {
    const obj = {
      __linha: index + 2
    };

    headers.forEach(function(h, i) {
      if (h) obj[h] = row[i];
    });

    return obj;
  });

  return {
    ok: true,
    headers: headers,
    rows: rows
  };
}


function s268E3Campo_(row, candidatos) {
  if (!row) return '';

  for (let i = 0; i < candidatos.length; i++) {
    const k = s268E3NormalizarHeader_(candidatos[i]);

    if (
      Object.prototype.hasOwnProperty.call(row, k) &&
      row[k] !== '' &&
      row[k] != null
    ) {
      return row[k];
    }
  }

  return '';
}


function s268E3Bool_(v, padrao) {
  if (typeof v === 'boolean') return v;

  const s = String(v == null ? '' : v)
    .trim()
    .toUpperCase();

  if (!s) return padrao;

  if (
    s === 'TRUE' ||
    s === 'SIM' ||
    s === '1' ||
    s === 'ATIVO'
  ) return true;

  if (
    s === 'FALSE' ||
    s === 'NAO' ||
    s === 'NÃO' ||
    s === '0' ||
    s === 'INATIVO'
  ) return false;

  return padrao;
}


function s268E3Poligono_(row) {
  const raw = s268E3Campo_(row, [
    'POLIGONO_JSON',
    'POLYGON_JSON',
    'GEOMETRIA_JSON',
    'PONTOS_JSON'
  ]);

  const p = s268E3Json_(raw, []);

  return Array.isArray(p) ? p : [];
}


function s268E3AreaId_(row) {
  return String(s268E3Campo_(row, [
    'ID_AREA',
    'AREA_ID',
    'ID'
  ]) || '').trim();
}


function s268E3Status_(row) {
  return String(s268E3Campo_(row, [
    'STATUS'
  ]) || '').trim().toUpperCase();
}


function s268E3EncontrarArea_(rows, id) {
  return rows.find(function(r) {
    return s268E3AreaId_(r) === String(id);
  }) || null;
}


function s268E3AreaFisicaId_(row) {
  return String(s268E3Campo_(row, [
    'AREA_FISICA_ID',
    'ID_AREA_FISICA'
  ]) || '').trim();
}


function s268E3SubareaFisicaId_(row) {
  return String(s268E3Campo_(row, [
    'SUBAREA_FISICA_ID',
    'ID_SUBAREA_FISICA'
  ]) || '').trim();
}

function s268E3Nome_(row) {
  return String(s268E3Campo_(row, [
    'NOME',
    'ROTULO',
    'NOME_AREA'
  ]) || '').trim();
}


function s268E3AssinaturaPoligono_(pol) {
  if (!Array.isArray(pol)) return '';

  return pol.map(function(p) {
    return Number(p.x).toFixed(8) + ',' +
           Number(p.y).toFixed(8);
  }).join('|');
}


/**
 * Lê a correspondência física.
 *
 * A D2/D3 criou CARTOGRAFIA_AREAS_FISICAS.
 * Como a estrutura poderá receber novos campos no futuro,
 * o gate trabalha por aliases de cabeçalho.
 */
function s268E3RepresentacoesFisicas_() {
  const tab = s268E3Tabela_('CARTOGRAFIA_AREAS_FISICAS');

  if (!tab.ok) return tab;

  return {
    ok: true,
    headers: tab.headers,
    rows: tab.rows
  };
}


function diagnosticoGateS268E3() {
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
   * 1. Infraestrutura
   * -------------------------------------------------------
   */

  add(
    'BASE_E2_DISPONIVEL',
    typeof diagnosticoGateS268E2 === 'function',
    'diagnosticoGateS268E2'
  );

  add(
    'BASE_D3_GATE_DISPONIVEL',
    typeof diagnosticoGateS268D3 === 'function',
    'diagnosticoGateS268D3'
  );

  add(
    'BASE_D4_DISPONIVEL',
    typeof diagnosticoS268D4 === 'function',
    'diagnosticoS268D4'
  );


  /*
   * -------------------------------------------------------
   * 2. Reexecuta os gates-base
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


  let d3 = null;

  try {
    d3 = diagnosticoGateS268D3();
  } catch (e) {
    d3 = {
      ok: false,
      erro: String(e && e.message || e)
    };
  }

  add(
    'D3_CONTINUA_APROVADO',
    !!(d3 && d3.ok),
    d3
      ? String(d3.totalChecks || 0) +
        ' checks / ' +
        String(d3.falhas || 0) +
        ' falhas'
      : 'sem resposta'
  );


  /*
   * -------------------------------------------------------
   * 3. Geometrias N0/N1
   * -------------------------------------------------------
   */

  const tabAreas = s268E3Tabela_('MAPA_AREAS_NIVEL');

  add(
    'MAPA_AREAS_NIVEL',
    !!tabAreas.ok,
    tabAreas.ok
      ? String(tabAreas.rows.length) + ' registro(s)'
      : tabAreas.erro
  );

  const areas = tabAreas.ok ? tabAreas.rows : [];


  /*
   * -------------------------------------------------------
   * 4. Identidade física
   * -------------------------------------------------------
   */

  const fisicas = s268E3RepresentacoesFisicas_();

  add(
    'CARTOGRAFIA_AREAS_FISICAS',
    !!fisicas.ok,
    fisicas.ok
      ? String(fisicas.rows.length) + ' registro(s)'
      : fisicas.erro
  );


  /*
   * -------------------------------------------------------
   * 5. Validação dos quatro pares
   * -------------------------------------------------------
   */

  const pares = [];

  S268E3.SUBAREAS.forEach(function(def) {

    const n0 = s268E3EncontrarArea_(areas, def.n0);
    const n1 = s268E3EncontrarArea_(areas, def.n1);

    const pol0 = s268E3Poligono_(n0);
    const pol1 = s268E3Poligono_(n1);

    const st0 = s268E3Status_(n0);
    const st1 = s268E3Status_(n1);


    add(
      def.codigo + '_N0_PRESENTE',
      !!n0,
      def.n0
    );

    add(
      def.codigo + '_N1_PRESENTE',
      !!n1,
      def.n1
    );


    add(
      def.codigo + '_N0_VALIDADA',
      !!n0 && st0 === 'VALIDADA',
      st0 || 'ausente'
    );

    add(
      def.codigo + '_N1_VALIDADA',
      !!n1 && st1 === 'VALIDADA',
      st1 || 'ausente'
    );


    add(
      def.codigo + '_N0_GEOMETRIA',
      pol0.length >= 3,
      pol0.length + ' ponto(s)'
    );

    add(
      def.codigo + '_N1_GEOMETRIA',
      pol1.length >= 3,
      pol1.length + ' ponto(s)'
    );


    /*
     * É desejável que as geometrias sejam diferentes:
     * as plantas não compartilham sistema cartesiano nativo.
     *
     * Não estamos exigindo distância ou transformação;
     * apenas impedindo cópia literal acidental.
     */
    const sig0 = s268E3AssinaturaPoligono_(pol0);
    const sig1 = s268E3AssinaturaPoligono_(pol1);

    add(
      def.codigo + '_GEOMETRIA_PROPRIA_POR_NIVEL',
      !!sig0 && !!sig1 && sig0 !== sig1,
      sig0 === sig1
        ? 'geometrias literalmente iguais — investigar'
        : 'N0/N1 independentes'
    );


    /*
     * Procura vínculo físico explícito.
     */
    const vinculos = fisicas.ok
      ? fisicas.rows.filter(function(r) {

          const areaFisica =
            String(
              s268E3Campo_(r, [
                'AREA_FISICA_ID',
                'ID_AREA_FISICA'
              ]) || ''
            ).trim();

          const subareaFisica =
            String(
              s268E3Campo_(r, [
                'SUBAREA_FISICA_ID',
                'ID_SUBAREA_FISICA'
              ]) || ''
            ).trim();

          const areaRepresentacao =
            String(
              s268E3Campo_(r, [
                'ID_AREA_REPRESENTACAO',
                'AREA_REPRESENTACAO_ID',
                'ID_AREA',
                'AREA_ID'
              ]) || ''
            ).trim();

          return (
            areaFisica === S268E3.AREA_FISICA_PAI &&
            subareaFisica === def.fisicaId &&
            (
              areaRepresentacao === def.n0 ||
              areaRepresentacao === def.n1
            )
          );
        })
      : [];


    /*
     * Dependendo da implementação D2/D3, cada representação
     * pode estar em linha própria ou consolidada.
     *
     * Também aceitamos o vínculo gravado diretamente
     * em MAPA_AREAS_NIVEL.
     */
    const metaN0Ok =
      s268E3AreaFisicaId_(n0) === S268E3.AREA_FISICA_PAI &&
      s268E3SubareaFisicaId_(n0) === def.fisicaId;

    const metaN1Ok =
      s268E3AreaFisicaId_(n1) === S268E3.AREA_FISICA_PAI &&
      s268E3SubareaFisicaId_(n1) === def.fisicaId;


    const fisicaOk =
      (metaN0Ok && metaN1Ok) ||
      vinculos.length >= 2;


    add(
      def.codigo + '_IDENTIDADE_FISICA',
      fisicaOk,
      def.fisicaId +
      ' | vínculos=' + vinculos.length +
      ' | metaN0=' + metaN0Ok +
      ' | metaN1=' + metaN1Ok
    );


    /*
     * Mesmo nome lógico nos dois níveis.
     */
    const nome0 = s268E3Nome_(n0);
    const nome1 = s268E3Nome_(n1);

    const nomeOk =
      (
        !nome0 ||
        nome0.toLowerCase().indexOf(
          def.nome.toLowerCase()
        ) >= 0
      ) &&
      (
        !nome1 ||
        nome1.toLowerCase().indexOf(
          def.nome.toLowerCase()
        ) >= 0
      );

    add(
      def.codigo + '_SEMANTICA',
      nomeOk,
      def.nome
    );


    pares.push({
      codigo: def.codigo,
      nome: def.nome,
      subareaFisicaId: def.fisicaId,

      n0: {
        id: def.n0,
        status: st0,
        pontos: pol0.length
      },

      n1: {
        id: def.n1,
        status: st1,
        pontos: pol1.length
      },

      geometriaIndependente:
        !!sig0 && !!sig1 && sig0 !== sig1,

      identidadeFisica:
        fisicaOk
    });
  });


  /*
   * -------------------------------------------------------
   * 6. Macro E01
   * -------------------------------------------------------
   */

  const e01 = s268E3EncontrarArea_(
    areas,
    'AREA-N0-EXTERNA'
  );

  add(
    'E01_MACRO_PRESENTE',
    !!e01,
    'AREA-N0-EXTERNA'
  );

  if (e01) {
    const participa =
      s268E3Bool_(
        s268E3Campo_(e01, [
          'PARTICIPA_RESOLUCAO',
          'RESOLVIVEL'
        ]),
        false
      );

    add(
      'E01_NAO_E_SUBAREA',
      S268E3.SUBAREAS.every(function(s) {
        return s.n0 !== s268E3AreaId_(e01);
      }),
      'macro agregada'
    );

    add(
      'E01_FORA_RESOLVEDOR',
      participa === false,
      String(participa)
    );
  }


  /*
   * -------------------------------------------------------
   * Resultado
   * -------------------------------------------------------
   */

  const out = {
    ok: checks.every(function(c) {
      return c.ok;
    }),

    candidato:
      'MVP-3.30.0-SINALIZACAO-S26.8',

    diagnostico:
      'S26.8-E3-CORRESPONDENCIA-N0-N1',

    totalChecks:
      checks.length,

    falhas:
      checks.filter(function(c) {
        return !c.ok;
      }).length,

    checks:
      checks,

    areaFisicaPai: {
      id: S268E3.AREA_FISICA_PAI,
      nome: 'Área externa do Mall'
    },

    correspondencias:
      pares,

    regraGeometrica:
      'IDENTIDADE_FISICA_COMPARTILHADA_COM_GEOMETRIA_PROPRIA_POR_NIVEL',

    coordenadasComparadas:
      false,

    somenteLeitura:
      true,

    versao:
      S268E3.VERSAO,

    proximoGate:
      'S26.8-E4-OFFLINE-DEGRADADO'
  };

  console.log(
    '[S26.8-E3] ' +
    JSON.stringify(out)
  );

  return out;
}