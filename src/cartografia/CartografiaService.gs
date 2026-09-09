/**
 * FASE S1 — MIGRAÇÃO CARTOGRÁFICA INDEPENDENTE
 * A origem é somente leitura. O destino é sempre a planilha vinculada a este projeto.
 */

const CARTOGRAFIA_S1 = Object.freeze({
  ORIGEM_SPREADSHEET_ID: '1_AERvkENYaXqzs8YKfHOyiK9wqLJAs1_ArokW_jStXU',
  ABAS: [
    'PLANTAS',
    'SETORES',
    'MAPAS_SETORES',
    'CORREDORES',
    'CORREDOR_PONTOS',
    'SEGMENTOS_CORREDORES',
    'CRUZAMENTOS',
    'PONTOS_REFERENCIA',
    'LOJAS_MAPA',
    'LOJAS'
  ]
});

function setupS1() {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) throw new Error('Outro setup está em execução. Tente novamente.');

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('Projeto Apps Script não está vinculado à planilha de Sinalização.');

    garantirConfigS1_(ss);
    garantirAbaReadmeS1_(ss);
    PropertiesService.getDocumentProperties().setProperties({
      APP_ID: APP.ID,
      APP_VERSAO: APP.VERSAO,
      APP_FASE: APP.FASE,
      SPREADSHEET_ID: ss.getId(),
      CARTOGRAFIA_ORIGEM_SPREADSHEET_ID: CARTOGRAFIA_S1.ORIGEM_SPREADSHEET_ID
    }, false);

    SpreadsheetApp.flush();

    SpreadsheetApp.getUi().alert(
      'Setup S1 preparado',
      'A fundação foi atualizada para S1. Agora execute: Sinalização do Mall > Migrar cartografia.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    return { ok: true, fase: APP.FASE, versao: APP.VERSAO };
  } finally {
    lock.releaseLock();
  }
}

function migrarCartografiaS1() {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) throw new Error('Outra migração está em execução. Tente novamente.');

  try {
    const destino = SpreadsheetApp.getActiveSpreadsheet();
    const origem = SpreadsheetApp.openById(CARTOGRAFIA_S1.ORIGEM_SPREADSHEET_ID);

    if (destino.getId() === origem.getId()) {
      throw new Error('Origem e destino são a mesma planilha. Migração cancelada por segurança.');
    }

    const inicio = Date.now();
    const relatorio = [];

    CARTOGRAFIA_S1.ABAS.forEach(nome => {
      const src = origem.getSheetByName(nome);
      if (!src) throw new Error(`Aba ${nome} não encontrada na planilha de origem.`);

      let dst = destino.getSheetByName(nome);
      if (!dst) dst = destino.insertSheet(nome);

      const lastRow = src.getLastRow();
      const lastCol = src.getLastColumn();
      if (lastRow < 1 || lastCol < 1) throw new Error(`Aba ${nome} está vazia na origem.`);

      const valores = src.getRange(1, 1, lastRow, lastCol).getValues();
      garantirDimensoes_(dst, lastRow, lastCol);
      dst.clearContents();
      dst.getRange(1, 1, lastRow, lastCol).setValues(valores);
      formatarCabecalhoS1_(dst, lastCol);

      const hash = hashCartografia_(valores);
      relatorio.push({
        aba: nome,
        linhas: lastRow,
        registros: Math.max(0, lastRow - 1),
        colunas: lastCol,
        hash: hash
      });
    });

    const agora = Utilities.formatDate(new Date(), APP.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
    const cfg = destino.getSheetByName('CONFIG');
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', APP.FASE, 'Fase de implementação validada');
    setConfigValue_(cfg, 'CARTOGRAFIA_ORIGEM_SPREADSHEET_ID', CARTOGRAFIA_S1.ORIGEM_SPREADSHEET_ID, 'Planilha usada somente na migração S1');
    setConfigValue_(cfg, 'CARTOGRAFIA_MIGRADA_EM', agora, 'Data/hora da última migração cartográfica');
    setConfigValue_(cfg, 'S1_STATUS', 'MIGRADO', 'Estado da migração cartográfica independente');
    setConfigValue_(cfg, 'S1_MANIFEST_JSON', JSON.stringify(relatorio), 'Manifesto com contagens e hashes da migração S1');

    PropertiesService.getDocumentProperties().setProperty('S1_MANIFEST_JSON', JSON.stringify(relatorio));
    garantirAbaReadmeS1_(destino);
    SpreadsheetApp.flush();

    const diag = diagnosticoS1();
    const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

    SpreadsheetApp.getUi().alert(
      diag.ok ? 'Migração S1 concluída' : 'Migração concluída com pendências',
      diag.ok
        ? `Cartografia copiada para a planilha independente.\n10/10 tabelas validadas.\nTempo: ${segundos}s.\n\nA origem não foi alterada.`
        : `A cópia terminou, mas o diagnóstico encontrou ${diag.totalFalhas} falha(s). Execute o diagnóstico S1.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    return { ok: diag.ok, tempoSegundos: Number(segundos), relatorio, diagnostico: diag };
  } finally {
    lock.releaseLock();
  }
}

function diagnosticoS1() {
  const destino = SpreadsheetApp.getActiveSpreadsheet();
  const checks = [];
  const cfg = lerConfigComoObjeto_(destino);

  check_(checks, 'PLANILHA_DESTINO', !!destino.getId(), destino.getName());
  check_(checks, 'APP_ID', cfg.APP_ID === APP.ID, cfg.APP_ID || 'não configurado');
  check_(checks, 'APP_VERSAO', cfg.APP_VERSAO === APP.VERSAO, cfg.APP_VERSAO || 'não configurada');
  check_(checks, 'APP_FASE', cfg.APP_FASE === APP.FASE, cfg.APP_FASE || 'não configurada');
  check_(checks, 'MODO_DADOS', cfg.MODO_DADOS === APP.MODO_DADOS, cfg.MODO_DADOS || 'não configurado');
  check_(checks, 'ORIGEM_CONFIGURADA', cfg.CARTOGRAFIA_ORIGEM_SPREADSHEET_ID === CARTOGRAFIA_S1.ORIGEM_SPREADSHEET_ID, cfg.CARTOGRAFIA_ORIGEM_SPREADSHEET_ID || 'ausente');
  check_(checks, 'S1_STATUS', cfg.S1_STATUS === 'MIGRADO', cfg.S1_STATUS || 'não migrado');

  let origem = null;
  try {
    origem = SpreadsheetApp.openById(CARTOGRAFIA_S1.ORIGEM_SPREADSHEET_ID);
    check_(checks, 'ORIGEM_ACESSIVEL', true, origem.getName());
  } catch (e) {
    check_(checks, 'ORIGEM_ACESSIVEL', false, e.message);
  }

  if (origem) {
    CARTOGRAFIA_S1.ABAS.forEach(nome => {
      const src = origem.getSheetByName(nome);
      const dst = destino.getSheetByName(nome);
      if (!src || !dst) {
        check_(checks, `CARTO_${nome}`, false, !src ? 'Origem ausente' : 'Destino ausente');
        return;
      }

      const sr = src.getLastRow();
      const sc = src.getLastColumn();
      const dr = dst.getLastRow();
      const dc = dst.getLastColumn();
      const dimensoesOk = sr === dr && sc === dc && sr > 0 && sc > 0;

      let hashOk = false;
      let detalheHash = '';
      if (dimensoesOk) {
        const srcVals = src.getRange(1, 1, sr, sc).getValues();
        const dstVals = dst.getRange(1, 1, dr, dc).getValues();
        const hs = hashCartografia_(srcVals);
        const hd = hashCartografia_(dstVals);
        hashOk = hs === hd;
        detalheHash = `registros=${Math.max(0, dr - 1)} • colunas=${dc} • hash=${hd.slice(0, 12)}`;
      } else {
        detalheHash = `origem=${sr}x${sc} • destino=${dr}x${dc}`;
      }

      check_(checks, `CARTO_${nome}`, dimensoesOk && hashOk, detalheHash);
    });
  }

  checkPasta_(checks, 'PASTA_RAIZ', cfg.DRIVE_ROOT_FOLDER_ID);
  checkPasta_(checks, 'PASTA_FOTOS', cfg.FOTOS_REGISTROS_FOLDER_ID);

  const erros = checks.filter(x => !x.ok);
  return {
    ok: erros.length === 0,
    fase: APP.FASE,
    versao: APP.VERSAO,
    executadoEm: new Date().toISOString(),
    totalChecks: checks.length,
    totalFalhas: erros.length,
    checks
  };
}

function garantirConfigS1_(ss) {
  const sh = ss.getSheetByName('CONFIG');
  if (!sh) throw new Error('Aba CONFIG ausente. Execute primeiro a Fase S0.');

  setConfigValue_(sh, 'APP_ID', APP.ID, 'Identificador técnico da aplicação');
  setConfigValue_(sh, 'APP_NOME', APP.NOME, 'Nome público da aplicação');
  setConfigValue_(sh, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
  setConfigValue_(sh, 'APP_FASE', APP.FASE, 'Fase de implementação validada');
  setConfigValue_(sh, 'MODO_DADOS', APP.MODO_DADOS, 'Aplicação consulta somente a própria planilha');
  setConfigValue_(sh, 'TIMEZONE', APP.TIMEZONE, 'Fuso horário operacional');
  setConfigValue_(sh, 'CARTOGRAFIA_ORIGEM_SPREADSHEET_ID', CARTOGRAFIA_S1.ORIGEM_SPREADSHEET_ID, 'Planilha usada somente na migração S1');
  if (!lerConfigComoObjeto_(ss).S1_STATUS) setConfigValue_(sh, 'S1_STATUS', 'AGUARDANDO_MIGRACAO', 'Estado da migração cartográfica independente');
}

function garantirAbaReadmeS1_(ss) {
  let sh = ss.getSheetByName('README');
  if (!sh) sh = ss.insertSheet('README');
  sh.clear();

  const rows = [
    ['SINALIZAÇÃO DO MALL — FASE S1'],
    [''],
    ['VERSÃO'],
    [APP.VERSAO],
    [''],
    ['OBJETIVO'],
    ['Migrar a cartografia validada do Mapa Interativo do Mall para esta planilha independente.'],
    [''],
    ['REGRA ARQUITETURAL'],
    ['MODO_DADOS = LOCAL_INDEPENDENTE. Após a migração, o funcionamento da aplicação deverá usar somente as tabelas cartográficas desta própria planilha.'],
    ['A planilha de origem é usada somente como fonte da migração S1 e nunca é alterada por este código.'],
    [''],
    ['TABELAS MIGRADAS'],
    [CARTOGRAFIA_S1.ABAS.join(', ')],
    [''],
    ['ORIGEM DA MIGRAÇÃO'],
    [CARTOGRAFIA_S1.ORIGEM_SPREADSHEET_ID],
    [''],
    ['GATE S1'],
    ['1. Executar setupS1().'],
    ['2. Executar migrarCartografiaS1().'],
    ['3. Executar diagnosticoS1().'],
    ['4. Confirmar totalFalhas = 0.'],
    ['5. Confirmar 10/10 tabelas com mesma quantidade de linhas, colunas e SHA-256 da origem.'],
    ['6. Confirmar que PLANTAS/MAPAS_SETORES preservaram os IDs de arquivos das plantas.'],
    ['7. Não alterar a planilha de origem.'],
    [''],
    ['NÃO FAZ PARTE DE S1'],
    ['Mapa visual, zoom, pan, clique, cadastro de sinalização, offline e Outbox ainda não são implementados nesta fase.'],
    [''],
    ['PRÓXIMA FASE APÓS APROVAÇÃO'],
    ['S2 — Mapa e navegação.']
  ];

  sh.getRange(1, 1, rows.length, 1).setValues(rows);
  sh.getRange('A1').setFontWeight('bold').setFontSize(16).setFontColor('#171B68');
  sh.setColumnWidth(1, 900);
  sh.getRange('A:A').setWrap(true).setVerticalAlignment('top');
}

function garantirDimensoes_(sh, rows, cols) {
  if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
  if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
}

function formatarCabecalhoS1_(sh, ncols) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, ncols)
    .setFontWeight('bold')
    .setBackground('#171B68')
    .setFontColor('#FFFFFF')
    .setWrap(true);
}

function hashCartografia_(values) {
  const normalizado = values.map(row => row.map(normalizarValorHash_));
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(normalizado),
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}

function normalizarValorHash_(v) {
  if (v instanceof Date) return { __date__: v.toISOString() };
  if (v === null || typeof v === 'undefined') return '';
  return v;
}

function setConfigValue_(sh, key, value, descricao) {
  // R02 (auditoria S26.10) — invalida o cache de CONFIG em toda escrita.
  try { CacheService.getScriptCache().remove('MALL_CFG_V1'); } catch (_) {}
  const last = sh.getLastRow();
  const vals = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues().flat() : [];
  const idx = vals.findIndex(v => String(v || '').trim() === key);
  if (idx >= 0) {
    sh.getRange(idx + 2, 2).setValue(value);
    if (typeof descricao !== 'undefined') sh.getRange(idx + 2, 3).setValue(descricao);
  } else {
    sh.appendRow([key, value, descricao || '']);
  }
}
