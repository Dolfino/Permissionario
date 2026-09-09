/**
 * ============================================================
 * S26.10-R1-FIX3 — Gate autossuficiente da Central de Referências
 * ============================================================
 *
 * SOMENTE LEITURA.
 *
 * Correção:
 * - incorpora os helpers usados pelo diagnóstico;
 * - não depende dos diagnósticos R1/FIX1 anteriores;
 * - não depende de CRUD administrativo legado;
 * - não altera PONTOS_REFERENCIA, REGISTROS ou CONFIG;
 * - formaliza a estratégia do R2 sobre a entidade existente.
 *
 * Baseline esperada:
 * MVP-3.31.0-SINALIZACAO-S26.9
 * S26.9
 */

const S2610R1_FIX3 = Object.freeze({
  VERSAO: 'S26.10-R1-FIX3',
  DIAGNOSTICO: 'S26.10-R1-FIX3-DESCOBERTA',
  BASELINE_VERSAO: 'MVP-3.31.0-SINALIZACAO-S26.9',
  BASELINE_FASE: 'S26.9',
  ABA_REFERENCIAS: 'PONTOS_REFERENCIA',
  ABA_REGISTROS: 'REGISTROS'
});


function s2610R1Fix3Check_(checks, nome, ok, detalhe) {
  checks.push({
    nome: String(nome || ''),
    ok: !!ok,
    detalhe: String(detalhe == null ? '' : detalhe)
  });
}


function s2610R1Fix3LerConfig_(ss, chave) {
  const aba = ss.getSheetByName('CONFIG');

  if (!aba || aba.getLastRow() < 2) {
    return '';
  }

  const lastRow = aba.getLastRow();
  const lastCol = Math.max(2, Math.min(3, aba.getLastColumn()));

  const valores = aba
    .getRange(2, 1, lastRow - 1, lastCol)
    .getValues();

  const chaveEsperada = String(chave || '').trim();

  for (let i = 0; i < valores.length; i++) {
    if (String(valores[i][0] || '').trim() === chaveEsperada) {
      return String(valores[i][1] || '').trim();
    }
  }

  return '';
}


function s2610R1Fix3Tabela_(ss, nome) {
  const aba = ss.getSheetByName(nome);

  if (!aba) {
    return {
      ok: false,
      aba: null,
      headers: [],
      rows: []
    };
  }

  const lastRow = aba.getLastRow();
  const lastCol = aba.getLastColumn();

  if (!lastRow || !lastCol) {
    return {
      ok: true,
      aba: aba,
      headers: [],
      rows: []
    };
  }

  const valores = aba
    .getRange(1, 1, lastRow, lastCol)
    .getValues();

  if (!valores.length) {
    return {
      ok: true,
      aba: aba,
      headers: [],
      rows: []
    };
  }

  const headers = valores[0].map(function(v) {
    return String(v || '').trim();
  });

  const rows = valores
    .slice(1)
    .filter(function(row) {
      return row.some(function(v) {
        return String(v == null ? '' : v).trim() !== '';
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

  return {
    ok: true,
    aba: aba,
    headers: headers,
    rows: rows
  };
}


function s2610R1Fix3Numero_(valor) {
  if (valor === '' || valor == null) {
    return NaN;
  }

  return Number(
    String(valor)
      .trim()
      .replace(',', '.')
  );
}


/**
 * ============================================================
 * GATE PRINCIPAL
 * ============================================================
 */
function diagnosticoS2610R1Fix3() {
  const ss = SpreadsheetApp.getActive();
  const checks = [];

  const versao = s2610R1Fix3LerConfig_(ss, 'APP_VERSAO');
  const fase = s2610R1Fix3LerConfig_(ss, 'APP_FASE');

  s2610R1Fix3Check_(
    checks,
    'BASELINE_VERSAO',
    versao === S2610R1_FIX3.BASELINE_VERSAO,
    versao || 'ausente'
  );

  s2610R1Fix3Check_(
    checks,
    'BASELINE_FASE',
    fase === S2610R1_FIX3.BASELINE_FASE,
    fase || 'ausente'
  );


  /*
   * ----------------------------------------------------------
   * PONTOS_REFERENCIA
   * ----------------------------------------------------------
   */

  const refs = s2610R1Fix3Tabela_(
    ss,
    S2610R1_FIX3.ABA_REFERENCIAS
  );

  s2610R1Fix3Check_(
    checks,
    'PONTOS_REFERENCIA',
    refs.ok,
    refs.ok
      ? refs.rows.length + ' registro(s)'
      : 'aba ausente'
  );

  const colunasObrigatorias = [
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

  const colunasAusentes = colunasObrigatorias.filter(function(campo) {
    return refs.headers.indexOf(campo) < 0;
  });

  s2610R1Fix3Check_(
    checks,
    'ESTRUTURA_REFERENCIAS',
    colunasAusentes.length === 0,
    colunasAusentes.length
      ? 'ausentes: ' + colunasAusentes.join(', ')
      : colunasObrigatorias.length + ' coluna(s) esperada(s)'
  );


  /*
   * ----------------------------------------------------------
   * Integridade básica
   * ----------------------------------------------------------
   */

  const ids = new Set();
  let semId = 0;
  let duplicados = 0;
  let coordsInvalidas = 0;
  let ativoInvalido = 0;

  const tipos = {};
  let ativas = 0;
  let inativas = 0;

  refs.rows.forEach(function(r) {
    const id = String(r.ID_REFERENCIA || '').trim();

    if (!id) {
      semId++;
    } else {
      if (ids.has(id)) {
        duplicados++;
      }

      ids.add(id);
    }

    const x = s2610R1Fix3Numero_(r.X_NORMALIZADO);
    const y = s2610R1Fix3Numero_(r.Y_NORMALIZADO);

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > 1 ||
      y < 0 ||
      y > 1
    ) {
      coordsInvalidas++;
    }

    const ativo = String(r.ATIVO || 'SIM')
      .trim()
      .toUpperCase();

    if (ativo === 'SIM') {
      ativas++;
    } else if (ativo === 'NAO') {
      inativas++;
    } else {
      ativoInvalido++;
    }

    const tipo = String(r.TIPO || '')
      .trim()
      .toUpperCase();

    if (tipo) {
      tipos[tipo] = (tipos[tipo] || 0) + 1;
    }
  });

  s2610R1Fix3Check_(
    checks,
    'IDS_PRESENTES',
    semId === 0,
    semId
  );

  s2610R1Fix3Check_(
    checks,
    'IDS_UNICOS',
    duplicados === 0,
    ids.size + ' ID(s) único(s)'
  );

  s2610R1Fix3Check_(
    checks,
    'COORDENADAS_VALIDAS',
    coordsInvalidas === 0,
    coordsInvalidas
  );

  s2610R1Fix3Check_(
    checks,
    'ATIVO_VALIDO',
    ativoInvalido === 0,
    ativas + ' ativa(s) / ' + inativas + ' inativa(s)'
  );


  /*
   * ----------------------------------------------------------
   * REGISTROS históricos
   * ----------------------------------------------------------
   */

  const registros = s2610R1Fix3Tabela_(
    ss,
    S2610R1_FIX3.ABA_REGISTROS
  );

  s2610R1Fix3Check_(
    checks,
    'REGISTROS',
    registros.ok,
    registros.ok
      ? registros.rows.length + ' registro(s)'
      : 'aba ausente'
  );

  s2610R1Fix3Check_(
    checks,
    'REGISTROS_REFERENCIA',
    registros.headers.indexOf('REFERENCIA') >= 0,
    'REGISTROS.REFERENCIA'
  );


  /*
   * ----------------------------------------------------------
   * Estruturas de governança disponíveis
   * ----------------------------------------------------------
   */

  s2610R1Fix3Check_(
    checks,
    'AUDITORIA',
    !!ss.getSheetByName('AUDITORIA'),
    'AUDITORIA'
  );

  s2610R1Fix3Check_(
    checks,
    'CATALOGOS_DOMINIO',
    !!ss.getSheetByName('CATALOGOS_DOMINIO'),
    'CATALOGOS_DOMINIO'
  );

  s2610R1Fix3Check_(
    checks,
    'CATALOGOS_DOMINIO_OPCOES',
    !!ss.getSheetByName('CATALOGOS_DOMINIO_OPCOES'),
    'CATALOGOS_DOMINIO_OPCOES'
  );


  /*
   * ----------------------------------------------------------
   * Contrato arquitetural R2
   * ----------------------------------------------------------
   *
   * Estas verificações não fingem descobrir APIs inexistentes.
   * Elas formalizam as decisões derivadas da descoberta R1.
   */

  s2610R1Fix3Check_(
    checks,
    'CONTRATO_BACKEND_R2',
    true,
    'CRIAR_BACKEND_NATIVO_S26.10'
  );

  s2610R1Fix3Check_(
    checks,
    'REUTILIZAR_ENTIDADE_EXISTENTE',
    true,
    'PONTOS_REFERENCIA'
  );

  s2610R1Fix3Check_(
    checks,
    'NAO_REINTRODUZIR_CRUD_LEGADO',
    true,
    'não copiar serviço antigo'
  );

  s2610R1Fix3Check_(
    checks,
    'PRESERVAR_REGISTROS_HISTORICOS',
    true,
    'REGISTROS.REFERENCIA não será reescrito'
  );

  s2610R1Fix3Check_(
    checks,
    'REMOCAO_POSTERGADA_R6',
    true,
    'sem exclusão física em R2'
  );


  /*
   * ----------------------------------------------------------
   * Resultado
   * ----------------------------------------------------------
   */

  const falhas = checks.filter(function(c) {
    return !c.ok;
  });

  const out = {
    ok: falhas.length === 0,

    diagnostico: S2610R1_FIX3.DIAGNOSTICO,
    versao: S2610R1_FIX3.VERSAO,

    baseline: {
      appVersao: versao,
      appFase: fase
    },

    totalChecks: checks.length,
    falhas: falhas.length,
    checks: checks,

    inventario: {
      referencias: refs.rows.length,
      ativas: ativas,
      inativas: inativas,
      tipos: tipos,
      registrosHistoricos: registros.rows.length
    },

    descoberta: {
      entidadeFonte: 'PONTOS_REFERENCIA',
      estrategia: 'NOVO_BACKEND_S26.10_SOBRE_PONTOS_REFERENCIA',
      copiarServiceLegado: false,
      criarCrudParalelo: false,
      alterarEstruturaDadosAgora: false,
      removerFisicamenteAgora: false
    },

    contratoR2: {
      listar: true,
      obter: true,
      criar: true,
      editar: true,
      ativar: true,
      desativar: true,
      reposicionar: 'ETAPA_MAPA',
      remover: 'S26.10-R6',
      auditoria: true,
      offline: 'PRESERVAR'
    },

    alterouDados: false,

    gate: falhas.length === 0
      ? 'APTO_PARA_S26.10-R2'
      : 'BLOQUEADO',

    proximaEtapa:
      'S26.10-R2-BACKEND-CENTRAL-REFERENCIAS'
  };

  console.log(
    '[S26.10-R1-FIX3] ' +
    JSON.stringify(out)
  );

  return out;
}
