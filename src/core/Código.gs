/**
 * SINALIZAÇÃO DO MALL
 * Runtime atual: MVP-3.32.0-SINALIZACAO-S26.10 | Fase S26.10
 *
 * GOVERNANÇA DE NOMENCLATURA — NÃO RENOMEAR APIs LEGADAS SEM MIGRAÇÃO:
 * - S5A/S5B em nomes de funções identificam a trilha histórica do offline e permanecem por compatibilidade.
 * - S23.6 identifica a origem histórica da exclusão operacional/soft delete.
 * - Referências posteriores a S25.6 em histórico/relatórios documentam a mesma regra de preservação do ativo;
 *   não devem ser confundidas com a antiga UI experimental de gestão de versões cartográficas, removida na S26.6.2-A.
 * - S25.5 continua sendo a publicação cartográfica controlada RASCUNHO -> VALIDAÇÃO -> PUBLICADA.
 * - S231 é o identificador legado e único do serviço de Google Slides; preservar uma única declaração global.
 */
const APP = Object.freeze({
  ID: 'SINALIZACAO_MALL', NOME: 'Sinalização do Mall',
  VERSAO: 'MVP-3.32.0-SINALIZACAO-S26.10', FASE: 'S26.10',
  TIMEZONE: 'America/Fortaleza', MODO_DADOS: 'LOCAL_INDEPENDENTE'
});

function doGet() {
  // Auditoria S26.10 — remover ALLOWALL: impede embedding/clickjacking.
  // Comportamento padrão do Apps Script (X-Frame-Options) passa a valer.
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle(APP.NOME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1');
}
function include(nome) { return HtmlService.createHtmlOutputFromFile(nome).getContent(); }

function onOpen() {
  // Auditoria S26.10 — menu atualizado: itens S26.7 encerrados removidos;
  // 'setupAtual' (setupS267) não representa mais a fase corrente.
  SpreadsheetApp.getUi().createMenu('Sinalização do Mall')
    .addItem('Diagnóstico da release S26.10', 'diagnosticoS2610F2')
    .addSeparator()
    .addItem('Provisionar novo setor (Clonar base limpa)', 'menuProvisionarNovoSetor')
    .addItem('Sincronizar Cartografia do Mall', 'menuSincronizarCartografia')
    .addItem('Abrir pasta raiz no Drive', 'abrirPastaRaizS0')
    .addToUi();
}

function lerConfigComoObjeto_(ss) {
  // R02 (auditoria S26.10) — cache de 60s; invalidado em setConfigValue_().
  try {
    const hit = CacheService.getScriptCache().get('MALL_CFG_V1');
    if (hit) return JSON.parse(hit);
  } catch (_) {}
  const sh = ss.getSheetByName('CONFIG'); if (!sh || sh.getLastRow() < 2) return {};
  const cfg = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().reduce((a, r) => { const k = String(r[0] || '').trim(); if (k) a[k] = String(r[1] ?? '').trim(); return a; }, {});
  try { CacheService.getScriptCache().put('MALL_CFG_V1', JSON.stringify(cfg), 60); } catch (_) {}
  return cfg;
}
function check_(arr, nome, ok, detalhe) { arr.push({ nome, ok: !!ok, detalhe: String(detalhe || '') }); }
function abrirPastaRaizS0() { const cfg = lerConfigComoObjeto_(SpreadsheetApp.getActive()); if (!cfg.DRIVE_ROOT_FOLDER_ID) return SpreadsheetApp.getUi().alert('Pasta raiz não configurada.'); const u = `https://drive.google.com/drive/folders/${cfg.DRIVE_ROOT_FOLDER_ID}`; SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(`<a href="${u}" target="_blank">Abrir pasta</a>`).setWidth(360).setHeight(90), 'Pasta raiz'); }
