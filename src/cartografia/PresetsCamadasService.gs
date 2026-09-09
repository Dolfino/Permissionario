// ========================================================
// S26.6 — PRESETS CORPORATIVOS / PADRÕES POR PERFIL
// ========================================================
const S266_SHEET = 'CAMADAS_PRESETS_CORPORATIVOS';
const S266_HEADERS = [
  'ID_PRESET', 'NOME', 'ESCOPO', 'PERFIL_ALVO', 'VISAO_JSON', 'ATIVO', 'PADRAO',
  'CRIADO_EM', 'CRIADO_POR', 'ATUALIZADO_EM', 'ATUALIZADO_POR', 'VERSAO_APP'
];

function garantirCabecalhosS266_(sh) {
  const last = Math.max(1, sh.getLastColumn());
  const atuais = sh.getRange(1, 1, 1, last).getValues()[0].map(v => String(v || '').trim());
  if (!atuais.some(Boolean)) {
    sh.clear();
    sh.getRange(1, 1, 1, S266_HEADERS.length).setValues([S266_HEADERS]);
  } else {
    const falt = S266_HEADERS.filter(h => !atuais.includes(h));
    if (falt.length) sh.getRange(1, atuais.length + 1, 1, falt.length).setValues([falt]);
  }
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#171B68').setFontColor('#fff');
}

function s266Sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(S266_SHEET);
  if (!sh) sh = ss.insertSheet(S266_SHEET);
  garantirCabecalhosS266_(sh);
  return sh;
}

function s266Bool_(v) {
  if (v === true || v === 1) return true;
  const s = String(v || '').trim().toUpperCase();
  return ['TRUE', 'VERDADEIRO', 'SIM', '1', 'ATIVO'].includes(s);
}

function s266SanitizarVisao_(visao) {
  if (typeof visao === 'string') {
    try { visao = JSON.parse(visao) } catch (_) { visao = {} }
  }
  visao = visao && typeof visao === 'object' ? visao : {};
  const layerKeys = ['sinalizacoes', 'referencias', 'cruzamentos', 'lojas'];
  const filterKeys = ['tipo', 'finalidade', 'responsavel', 'status', 'estadoConservacao', 'condicao'];
  const modes = ['status', 'tipo', 'finalidade', 'responsavel', 'estadoConservacao', 'condicao', 'unica'];
  const camadas = {}; layerKeys.forEach(k => camadas[k] = visao.camadas?.[k] !== false);
  const filtros = {}; filterKeys.forEach(k => filtros[k] = String(visao.filtros?.[k] || '').slice(0, 160));
  const modo = modes.includes(String(visao.simbologia?.modo || '')) ? String(visao.simbologia.modo) : 'status';
  const corUnica = /^#[0-9a-f]{6}$/i.test(String(visao.simbologia?.corUnica || '')) ? String(visao.simbologia.corUnica).toLowerCase() : '#f50087';
  const cores = {};
  const src = visao.simbologia?.cores;
  if (src && typeof src === 'object' && !Array.isArray(src)) {
    Object.keys(src).slice(0, 300).forEach(m => {
      if (!modes.includes(m) || typeof src[m] !== 'object' || Array.isArray(src[m])) return;
      cores[m] = {};
      Object.keys(src[m]).slice(0, 300).forEach(k => {
        const c = String(src[m][k] || '');
        if (/^#[0-9a-f]{6}$/i.test(c)) cores[m][String(k).slice(0, 180)] = c.toLowerCase();
      });
    });
  }
  return { camadas, busca: String(visao.busca || '').slice(0, 300), filtros, simbologia: { modo, corUnica, cores } };
}

function s266Rows_() {
  const sh = s266Sheet_();
  if (sh.getLastRow() < 2) return { sh, headers: S266_HEADERS.slice(), rows: [] };
  const vals = sh.getDataRange().getValues();
  const headers = vals.shift().map(String), idx = {}; headers.forEach((h, i) => idx[h] = i);
  return { sh, headers, idx, rows: vals };
}

function s266RowToObj_(r, idx) {
  let visao = {}; try { visao = s266SanitizarVisao_(JSON.parse(String(r[idx.VISAO_JSON] || '{}'))) } catch (_) { visao = s266SanitizarVisao_({}) }
  return {
    id: String(r[idx.ID_PRESET] || ''), nome: String(r[idx.NOME] || ''), escopo: String(r[idx.ESCOPO] || 'GLOBAL').toUpperCase(),
    perfilAlvo: String(r[idx.PERFIL_ALVO] || '').toUpperCase(), visao, ativo: s266Bool_(r[idx.ATIVO]), padrao: s266Bool_(r[idx.PADRAO]),
    criadoEm: r[idx.CRIADO_EM] instanceof Date ? r[idx.CRIADO_EM].toISOString() : String(r[idx.CRIADO_EM] || ''), criadoPor: String(r[idx.CRIADO_POR] || ''),
    atualizadoEm: r[idx.ATUALIZADO_EM] instanceof Date ? r[idx.ATUALIZADO_EM].toISOString() : String(r[idx.ATUALIZADO_EM] || ''), atualizadoPor: String(r[idx.ATUALIZADO_POR] || ''),
    versao: String(r[idx.VERSAO_APP] || '')
  };
}

function appListarPresetsCorporativosS266() {
  const sessao = sessaoAtualS14_();
  if (!sessao.autenticado) throw new Error('Usuário não autorizado.');
  const { idx, rows } = s266Rows_();
  const admin = !!sessao.permissoes?.administrar;
  const perfil = String(sessao.perfil || 'CONSULTA').toUpperCase();
  const itens = rows.map(r => s266RowToObj_(r, idx)).filter(p => p.id && p.ativo).filter(p => admin || p.escopo === 'GLOBAL' || (p.escopo === 'PERFIL' && p.perfilAlvo === perfil));
  return { ok: true, perfil, admin, itens };
}

function appSalvarPresetCorporativoS266(payload) {
  const admin = exigirPermissaoS15_('administrar', { acao: 'SALVAR_PRESET_CORPORATIVO', entidade: 'PRESET_CAMADAS' });
  payload = payload || {};
  const nome = String(payload.nome || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!nome) throw new Error('Nome da visualização é obrigatório.');
  const escopo = String(payload.escopo || 'GLOBAL').toUpperCase();
  if (!['GLOBAL', 'PERFIL'].includes(escopo)) throw new Error('Escopo inválido.');
  const perfilAlvo = escopo === 'PERFIL' ? String(payload.perfilAlvo || '').trim().toUpperCase() : '';
  if (escopo === 'PERFIL' && !perfilAlvo) throw new Error('Selecione o perfil alvo.');
  const visao = s266SanitizarVisao_(payload.visao || {});
  const visaoJson = JSON.stringify(visao);
  if (visaoJson.length > 50000) throw new Error('Visualização excede o limite permitido.');
  const { sh, idx, rows } = s266Rows_();
  const id = String(payload.id || '').trim() || ('CORP-' + Utilities.getUuid().replace(/-/g, '').slice(0, 16).toUpperCase());
  let rowIndex = -1, antes = null;
  rows.forEach((r, i) => { if (String(r[idx.ID_PRESET] || '') === id) { rowIndex = i + 2; antes = s266RowToObj_(r, idx) } });
  const agora = new Date();
  const obj = {
    ID_PRESET: id, NOME: nome, ESCOPO: escopo, PERFIL_ALVO: perfilAlvo, VISAO_JSON: visaoJson, ATIVO: true,
    PADRAO: antes?.padrao === true, CRIADO_EM: antes?.criadoEm ? new Date(antes.criadoEm) : agora, CRIADO_POR: antes?.criadoPor || admin.email,
    ATUALIZADO_EM: agora, ATUALIZADO_POR: admin.email, VERSAO_APP: APP.VERSAO
  };
  if (rowIndex > 0) {
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    sh.getRange(rowIndex, 1, 1, headers.length).setValues([headers.map(h => obj[h] !== undefined ? obj[h] : '')]);
  } else appendObjetoPorCabecalhoS7_(sh, obj);
  registrarAuditoriaS15_({ acao: antes ? 'PRESET_CORPORATIVO_ATUALIZADO' : 'PRESET_CORPORATIVO_CRIADO', entidade: 'PRESET_CAMADAS', entidadeId: id, resultado: 'SUCESSO', valorAnterior: antes, valorNovo: { id, nome, escopo, perfilAlvo, padrao: obj.PADRAO } });
  return { ok: true, id };
}

function appDefinirPadraoPresetCorporativoS266(id, valor) {
  const admin = exigirPermissaoS15_('administrar', { acao: 'DEFINIR_PADRAO_PRESET_CORPORATIVO', entidade: 'PRESET_CAMADAS', entidadeId: String(id || '') });
  const { sh, idx, rows } = s266Rows_();
  let alvo = null, rowAlvo = -1;
  rows.forEach((r, i) => { const o = s266RowToObj_(r, idx); if (o.id === String(id || '')) { alvo = o; rowAlvo = i + 2 } });
  if (!alvo || !alvo.ativo) throw new Error('Preset corporativo não encontrado.');
  const novo = !!valor;
  const cPadrao = idx.PADRAO + 1, cAtualizado = idx.ATUALIZADO_EM + 1, cPor = idx.ATUALIZADO_POR + 1;
  if (novo) {
    rows.forEach((r, i) => {
      const o = s266RowToObj_(r, idx);
      if (o.id !== alvo.id && o.ativo && o.escopo === alvo.escopo && (alvo.escopo === 'GLOBAL' || o.perfilAlvo === alvo.perfilAlvo) && o.padrao) {
        sh.getRange(i + 2, cPadrao).setValue(false); sh.getRange(i + 2, cAtualizado).setValue(new Date()); sh.getRange(i + 2, cPor).setValue(admin.email);
      }
    });
  }
  sh.getRange(rowAlvo, cPadrao).setValue(novo); sh.getRange(rowAlvo, cAtualizado).setValue(new Date()); sh.getRange(rowAlvo, cPor).setValue(admin.email);
  registrarAuditoriaS15_({ acao: novo ? 'PRESET_CORPORATIVO_PADRAO_DEFINIDO' : 'PRESET_CORPORATIVO_PADRAO_REMOVIDO', entidade: 'PRESET_CAMADAS', entidadeId: alvo.id, resultado: 'SUCESSO', detalhes: { nome: alvo.nome, escopo: alvo.escopo, perfilAlvo: alvo.perfilAlvo } });
  return { ok: true };
}

function appExcluirPresetCorporativoS266(id) {
  const admin = exigirPermissaoS15_('administrar', { acao: 'EXCLUIR_PRESET_CORPORATIVO', entidade: 'PRESET_CAMADAS', entidadeId: String(id || '') });
  const { sh, idx, rows } = s266Rows_();
  let alvo = null, rowAlvo = -1;
  rows.forEach((r, i) => { const o = s266RowToObj_(r, idx); if (o.id === String(id || '')) { alvo = o; rowAlvo = i + 2 } });
  if (!alvo) throw new Error('Preset corporativo não encontrado.');
  sh.getRange(rowAlvo, idx.ATIVO + 1).setValue(false);
  sh.getRange(rowAlvo, idx.PADRAO + 1).setValue(false);
  sh.getRange(rowAlvo, idx.ATUALIZADO_EM + 1).setValue(new Date());
  sh.getRange(rowAlvo, idx.ATUALIZADO_POR + 1).setValue(admin.email);
  registrarAuditoriaS15_({ acao: 'PRESET_CORPORATIVO_EXCLUIDO', entidade: 'PRESET_CAMADAS', entidadeId: alvo.id, resultado: 'SUCESSO', valorAnterior: alvo, valorNovo: { ativo: false, padrao: false } });
  return { ok: true };
}
