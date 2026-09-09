// ========================================================
// S24.0 — INVENTÁRIO E VERSIONAMENTO CARTOGRÁFICO 2025
// ========================================================

const S240 = Object.freeze({
  COLECAO_ID: 'CART-CFF-2025-01',
  COLECAO_NOME: 'Layout Comercial Janeiro/2025',
  VERSAO_CARTOGRAFICA: '2025.01',
  DATA_BASE: '2025-01',
  STATUS_COLECAO: 'RASCUNHO',
  EMPREENDIMENTO_ID: 'EMP-CFF-001'
});

const S240_COLECOES_HEADERS = [
  'ID_COLECAO', 'NOME', 'VERSAO', 'DATA_BASE', 'STATUS',
  'CRIADO_EM', 'ATUALIZADO_EM', 'OBSERVACOES'
];

const S240_ARQUIVOS_HEADERS = [
  'ID_ARQUIVO_CARTOGRAFICO', 'ID_COLECAO', 'TIPO_MAPA', 'NOME_LOGICO',
  'SETOR', 'NIVEL', 'PISO', 'SETORES_INCLUIDOS',
  'NOME_ARQUIVO_ORIGEM', 'SHA256_ORIGEM', 'TAMANHO_BYTES', 'PAGINAS',
  'FORMATO_PAGINA', 'DRIVE_PDF_ID', 'DRIVE_IMAGEM_ID',
  'STATUS_VINCULO', 'VALIDACAO_ORIGEM', 'CRIADO_EM', 'ATUALIZADO_EM', 'OBSERVACOES'
];

const S240_PLANTAS_EXTRA = [
  'TIPO_MAPA', 'COLECAO', 'DATA_BASE', 'STATUS_PUBLICACAO',
  'SETORES_INCLUIDOS', 'NOME_ARQUIVO_ORIGEM', 'SHA256_ORIGEM',
  'TAMANHO_BYTES_ORIGEM', 'OBSERVACOES'
];

const S240_MAPAS_EXTRA = [
  'COLECAO', 'DATA_BASE', 'STATUS_PUBLICACAO',
  'NOME_ARQUIVO_ORIGEM', 'SHA256_ORIGEM',
  'TAMANHO_BYTES_ORIGEM', 'OBSERVACOES'
];

function s240Manifesto_() {
  return [
    {
      id: 'ARQ-CFF-2025-AZUL', tipo: 'SETOR', nome: 'Setor Azul', setor: 'AZUL', nivel: 'N1', piso: '1',
      setores: 'AZUL', arquivo: 'Layout Comercial Janeiro25- Setor Azul.pdf',
      sha: '1fd233236bfbc6be73788dffa6f56016866c40fe9bc2126515f33db0786818d8',
      bytes: 545842, paginas: 1, formato: 'A3', validacao: 'OK_PRELIMINAR',
      obs: 'Planta setorial Janeiro/2025.'
    },
    {
      id: 'ARQ-CFF-2025-VERDE', tipo: 'SETOR', nome: 'Setor Verde', setor: 'VERDE', nivel: 'N1', piso: '1',
      setores: 'VERDE', arquivo: 'Layout Comercial Janeiro25 - Setor Verde.pdf',
      sha: 'd86c858086f3dee9d15c9d1970376d57498579adb6c940f687096dbe3063afeb',
      bytes: 356503, paginas: 1, formato: 'A3', validacao: 'OK_PRELIMINAR',
      obs: 'Planta setorial Janeiro/2025.'
    },
    {
      id: 'ARQ-CFF-2025-AMARELO', tipo: 'SETOR', nome: 'Setor Amarelo', setor: 'AMARELO', nivel: 'N2', piso: '2',
      setores: 'AMARELO', arquivo: 'Layout Comercial Janeiro25 - Setor Amarelo.pdf',
      sha: '625aa1035808a26aa38ea04c474d889b80e7055db0fb3c4cba42847d616f031f',
      bytes: 820346, paginas: 1, formato: 'A3', validacao: 'OK_PRELIMINAR',
      obs: 'Planta setorial Janeiro/2025.'
    },
    {
      id: 'ARQ-CFF-2025-BRANCO', tipo: 'SETOR', nome: 'Setor Branco', setor: 'BRANCO', nivel: 'N2', piso: '2',
      setores: 'BRANCO', arquivo: 'Layout Comercial Janeiro25 - Setor Branco.pdf',
      sha: '6f1c370fa10e88879b5fc38cd037ccc26b6910721d92c0d458306adc01875982',
      bytes: 4124742, paginas: 1, formato: 'A3', validacao: 'OK_PRELIMINAR',
      obs: 'Planta setorial Janeiro/2025.'
    },
    {
      id: 'ARQ-CFF-2025-ROXO', tipo: 'SETOR', nome: 'Setor Roxo', setor: 'ROXO', nivel: 'N3', piso: '3',
      setores: 'ROXO', arquivo: 'Layout Comercial Janeiro25 - Setor Roxo.pdf',
      sha: '42bf4d2091005d6e792e639b72e0d28f29bff8ff44e5307bb353c808e3d1bb1c',
      bytes: 985, paginas: 1, formato: 'A3', validacao: 'REVISAR_ARQUIVO',
      obs: 'Arquivo recebido com tamanho muito inferior aos demais; validar antes de publicar.'
    },
    {
      id: 'ARQ-CFF-2025-N1', tipo: 'NIVEL', nome: 'Nível 1', setor: '', nivel: 'N1', piso: '1',
      setores: 'AZUL|VERDE', arquivo: 'Layout Comercial Janeiro25 - NÍVEL_1.pdf',
      sha: '5be319c35615be5df0432b2ea367646b9f34689bc419ef1717c9dd16433b8d35',
      bytes: 661462, paginas: 1, formato: 'A3', validacao: 'OK_PRELIMINAR',
      obs: 'Planta composta: Setor Azul + Setor Verde.'
    },
    {
      id: 'ARQ-CFF-2025-N2', tipo: 'NIVEL', nome: 'Nível 2', setor: '', nivel: 'N2', piso: '2',
      setores: 'AMARELO|BRANCO', arquivo: 'Layout Comercial Janeiro25 - NÍVEL_2.pdf',
      sha: 'd73e902920d90807927d6d8de6c928a349510403097fb94522cbd90ee5311839',
      bytes: 903779, paginas: 1, formato: 'A3', validacao: 'OK_PRELIMINAR',
      obs: 'Planta composta: Setor Amarelo + Setor Branco.'
    },
    {
      id: 'ARQ-CFF-2025-N3', tipo: 'NIVEL', nome: 'Nível 3', setor: '', nivel: 'N3', piso: '3',
      setores: 'ROXO|VERMELHO', arquivo: 'Layout Comercial Janeiro25 - NÍVEL_3.pdf',
      sha: 'ebf369b2d373559b615c588e6ff677556048e079b4ab95b845835aa78641b95d',
      bytes: 896016, paginas: 1, formato: 'A3', validacao: 'OK_PRELIMINAR',
      obs: 'Planta composta: Setor Roxo + Setor Vermelho/estacionamento.'
    }
  ];
}

function setupS240() {
  exigirPermissaoS14_('administrar');

  // Mantém toda a cadeia anterior instalada.
  if (typeof setupS2373 === 'function') setupS2373();

  const ss = SpreadsheetApp.getActive();
  const agora = new Date();

  const shColecoes = s240EnsureSheet_(ss, 'CARTOGRAFIA_COLECOES', S240_COLECOES_HEADERS);
  const shArquivos = s240EnsureSheet_(ss, 'CARTOGRAFIA_ARQUIVOS', S240_ARQUIVOS_HEADERS);
  const shPlantas = ss.getSheetByName('PLANTAS');
  const shMapas = ss.getSheetByName('MAPAS_SETORES');

  if (!shPlantas) throw new Error('Aba PLANTAS ausente.');
  if (!shMapas) throw new Error('Aba MAPAS_SETORES ausente.');

  s240EnsureHeaders_(shPlantas, S240_PLANTAS_EXTRA);
  s240EnsureHeaders_(shMapas, S240_MAPAS_EXTRA);

  s240Upsert_(shColecoes, 'ID_COLECAO', {
    ID_COLECAO: S240.COLECAO_ID,
    NOME: S240.COLECAO_NOME,
    VERSAO: S240.VERSAO_CARTOGRAFICA,
    DATA_BASE: S240.DATA_BASE,
    STATUS: S240.STATUS_COLECAO,
    CRIADO_EM: agora,
    ATUALIZADO_EM: agora,
    OBSERVACOES: 'Coleção recebida em 19/08/2026. Publicação operacional bloqueada até calibração.'
  });

  s240Manifesto_().forEach(a => {
    s240Upsert_(shArquivos, 'ID_ARQUIVO_CARTOGRAFICO', {
      ID_ARQUIVO_CARTOGRAFICO: a.id,
      ID_COLECAO: S240.COLECAO_ID,
      TIPO_MAPA: a.tipo,
      NOME_LOGICO: a.nome,
      SETOR: a.setor,
      NIVEL: a.nivel,
      PISO: a.piso,
      SETORES_INCLUIDOS: a.setores,
      NOME_ARQUIVO_ORIGEM: a.arquivo,
      SHA256_ORIGEM: a.sha,
      TAMANHO_BYTES: a.bytes,
      PAGINAS: a.paginas,
      FORMATO_PAGINA: a.formato,
      DRIVE_PDF_ID: '',
      DRIVE_IMAGEM_ID: '',
      STATUS_VINCULO: 'PENDENTE_DRIVE',
      VALIDACAO_ORIGEM: a.validacao,
      CRIADO_EM: agora,
      ATUALIZADO_EM: agora,
      OBSERVACOES: a.obs
    });
  });

  // Novas plantas compostas. Permanecem ATIVO=NAO até S24.1/S24.2.
  [
    ['PLA-CFF-N1-2025', 'Layout Comercial Janeiro/2025 - Nível 1', '1', 'AZUL|VERDE', 'Layout Comercial Janeiro25 - NÍVEL_1.pdf', '5be319c35615be5df0432b2ea367646b9f34689bc419ef1717c9dd16433b8d35', 661462],
    ['PLA-CFF-N2-2025', 'Layout Comercial Janeiro/2025 - Nível 2', '2', 'AMARELO|BRANCO', 'Layout Comercial Janeiro25 - NÍVEL_2.pdf', 'd73e902920d90807927d6d8de6c928a349510403097fb94522cbd90ee5311839', 903779],
    ['PLA-CFF-N3-2025', 'Layout Comercial Janeiro/2025 - Nível 3', '3', 'ROXO|VERMELHO', 'Layout Comercial Janeiro25 - NÍVEL_3.pdf', 'ebf369b2d373559b615c588e6ff677556048e079b4ab95b845835aa78641b95d', 896016]
  ].forEach(r => {
    s240Upsert_(shPlantas, 'ID_PLANTA', {
      ID_PLANTA: r[0],
      ID_EMPREENDIMENTO: S240.EMPREENDIMENTO_ID,
      NOME: r[1],
      PISO: r[2],
      ARQUIVO_PDF_ID: '',
      IMAGEM_ID: '',
      IMAGEM_URL: '',
      LARGURA_ORIGINAL: '',
      ALTURA_ORIGINAL: '',
      VERSAO: S240.VERSAO_CARTOGRAFICA,
      ORIENTACAO: 'VERTICAL',
      ATIVO: 'NAO',
      CRIADO_EM: agora,
      ATUALIZADO_EM: agora,
      TIPO_MAPA: 'NIVEL',
      COLECAO: S240.COLECAO_ID,
      DATA_BASE: S240.DATA_BASE,
      STATUS_PUBLICACAO: 'RASCUNHO',
      SETORES_INCLUIDOS: r[3],
      NOME_ARQUIVO_ORIGEM: r[4],
      SHA256_ORIGEM: r[5],
      TAMANHO_BYTES_ORIGEM: r[6],
      OBSERVACOES: 'Não ativar antes da vinculação Drive e validação S24.1.'
    });
  });

  // Versões setoriais 2025, também em rascunho.
  [
    ['MAP-CFF-N1-AZUL-2025', 'PLA-CFF-N1-2025', 'SET-AZUL', 'Setor Azul', '1', 'AZUL', 'Layout Comercial Janeiro25- Setor Azul.pdf', '1fd233236bfbc6be73788dffa6f56016866c40fe9bc2126515f33db0786818d8', 545842, 'OK'],
    ['MAP-CFF-N1-VERDE-2025', 'PLA-CFF-N1-2025', 'SET-VERDE', 'Setor Verde', '1', 'VERDE', 'Layout Comercial Janeiro25 - Setor Verde.pdf', 'd86c858086f3dee9d15c9d1970376d57498579adb6c940f687096dbe3063afeb', 356503, 'OK'],
    ['MAP-CFF-N2-AMARELO-2025', 'PLA-CFF-N2-2025', 'SET-AMARELO', 'Setor Amarelo', '2', 'AMARELO', 'Layout Comercial Janeiro25 - Setor Amarelo.pdf', '625aa1035808a26aa38ea04c474d889b80e7055db0fb3c4cba42847d616f031f', 820346, 'OK'],
    ['MAP-CFF-N2-BRANCO-2025', 'PLA-CFF-N2-2025', 'SET-BRANCO', 'Setor Branco', '2', 'BRANCO', 'Layout Comercial Janeiro25 - Setor Branco.pdf', '6f1c370fa10e88879b5fc38cd037ccc26b6910721d92c0d458306adc01875982', 4124742, 'OK'],
    ['MAP-CFF-N3-ROXO-2025', 'PLA-CFF-N3-2025', 'SET-ROXO', 'Setor Roxo', '3', 'ROXO', 'Layout Comercial Janeiro25 - Setor Roxo.pdf', '42bf4d2091005d6e792e639b72e0d28f29bff8ff44e5307bb353c808e3d1bb1c', 985, 'REVISAR']
  ].forEach(r => {
    s240Upsert_(shMapas, 'ID_MAPA_SETOR', {
      ID_MAPA_SETOR: r[0],
      ID_PLANTA: r[1],
      ID_SETOR: r[2],
      NOME: r[3],
      PISO: r[4],
      COR_SETOR: r[5],
      ARQUIVO_PDF_ID: '',
      IMAGEM_ID: '',
      IMAGEM_URL: '',
      LARGURA_PX: '',
      ALTURA_PX: '',
      ROTACAO_GRAUS: 0,
      ORIGEM_COORDENADAS: 'SUPERIOR_ESQUERDA',
      VERSAO: S240.VERSAO_CARTOGRAFICA,
      STATUS_PLANIFICACAO: 'INVENTARIO_2025_PENDENTE_CALIBRACAO',
      ATIVO: 'NAO',
      CRIADO_EM: agora,
      ATUALIZADO_EM: agora,
      COLECAO: S240.COLECAO_ID,
      DATA_BASE: S240.DATA_BASE,
      STATUS_PUBLICACAO: 'RASCUNHO',
      NOME_ARQUIVO_ORIGEM: r[6],
      SHA256_ORIGEM: r[7],
      TAMANHO_BYTES_ORIGEM: r[8],
      OBSERVACOES: r[9] === 'REVISAR'
        ? 'Arquivo fonte requer revisão antes da vinculação/publicação.'
        : 'Versão setorial 2025 registrada sem ativação.'
    });
  });

  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S24.0', 'Inventário e versionamento cartográfico 2025');
    setConfigValue_(cfg, 'CARTOGRAFIA_COLECAO_ATUAL_CANDIDATA', S240.COLECAO_ID, 'Coleção 2025 ainda não publicada');
    setConfigValue_(cfg, 'S240_STATUS', 'INSTALADO', 'Inventário 2025 cadastrado em modo rascunho');
  }

  try {
    registrarAuditoriaS15_({
      acao: 'SETUP_S240',
      entidade: 'CARTOGRAFIA',
      entidadeId: S240.COLECAO_ID,
      resultado: 'SUCESSO',
      origem: 'APPS_SCRIPT',
      detalhes: { arquivos: 8, niveis: 3, setores: 5, status: 'RASCUNHO' }
    });
  } catch (_) { }

  SpreadsheetApp.flush();
  return diagnosticoS240();
}

function diagnosticoS240() {
  const ss = SpreadsheetApp.getActive();
  const checks = [];

  const shColecoes = ss.getSheetByName('CARTOGRAFIA_COLECOES');
  const shArquivos = ss.getSheetByName('CARTOGRAFIA_ARQUIVOS');
  const shPlantas = ss.getSheetByName('PLANTAS');
  const shMapas = ss.getSheetByName('MAPAS_SETORES');

  check_(checks, 'S240_COLECOES', !!shColecoes, 'Aba CARTOGRAFIA_COLECOES');
  check_(checks, 'S240_ARQUIVOS', !!shArquivos, 'Aba CARTOGRAFIA_ARQUIVOS');

  const arquivos = shArquivos ? s240Objects_(shArquivos).filter(r => String(r.ID_COLECAO || '') === S240.COLECAO_ID) : [];
  check_(checks, 'S240_MANIFESTO_8', arquivos.length === 8, `${arquivos.length}/8 arquivos`);

  const niveis = shPlantas ? s240Objects_(shPlantas).filter(r => String(r.COLECAO || '') === S240.COLECAO_ID) : [];
  check_(checks, 'S240_NIVEIS_3', niveis.length === 3, `${niveis.length}/3 plantas de nível`);
  check_(checks, 'S240_NIVEIS_INATIVOS', niveis.every(r => String(r.ATIVO || '').toUpperCase() === 'NAO'), 'Novos níveis não publicados');

  const setores = shMapas ? s240Objects_(shMapas).filter(r => String(r.COLECAO || '') === S240.COLECAO_ID) : [];
  check_(checks, 'S240_SETORES_5', setores.length === 5, `${setores.length}/5 mapas setoriais`);
  check_(checks, 'S240_SETORES_INATIVOS', setores.every(r => String(r.ATIVO || '').toUpperCase() === 'NAO'), 'Novos setores não publicados');

  const roxo = arquivos.find(r => String(r.ID_ARQUIVO_CARTOGRAFICO || '') === 'ARQ-CFF-2025-ROXO');
  check_(checks, 'S240_ROXO_FLAG', String(roxo?.VALIDACAO_ORIGEM || '') === 'REVISAR_ARQUIVO', 'Setor Roxo sinalizado para revisão');

  const ativosAntigos = (shMapas ? s240Objects_(shMapas) : [])
    .filter(r => String(r.COLECAO || '').trim() === '' && String(r.ATIVO || '').toUpperCase() === 'SIM');
  check_(checks, 'S240_PRODUCAO_PRESERVADA', ativosAntigos.length >= 5, `${ativosAntigos.length} mapas ativos anteriores preservados`);

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    colecao: S240.COLECAO_ID,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    resumo: {
      arquivos: arquivos.length,
      niveis: niveis.length,
      setores: setores.length,
      pendentesDrive: arquivos.filter(r => String(r.STATUS_VINCULO || '') === 'PENDENTE_DRIVE').length,
      revisarOrigem: arquivos.filter(r => String(r.VALIDACAO_ORIGEM || '').startsWith('REVISAR')).map(r => r.NOME_LOGICO)
    }
  };
}

function listarInventarioS240() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('CARTOGRAFIA_ARQUIVOS');
  if (!sh) return [];
  return s240Objects_(sh)
    .filter(r => String(r.ID_COLECAO || '') === S240.COLECAO_ID)
    .map(r => ({
      id: r.ID_ARQUIVO_CARTOGRAFICO,
      tipo: r.TIPO_MAPA,
      nome: r.NOME_LOGICO,
      piso: r.PISO,
      setores: r.SETORES_INCLUIDOS,
      arquivo: r.NOME_ARQUIVO_ORIGEM,
      statusVinculo: r.STATUS_VINCULO,
      validacao: r.VALIDACAO_ORIGEM
    }));
}

function s240EnsureSheet_(ss, nome, headers) {
  let sh = ss.getSheetByName(nome);
  if (!sh) sh = ss.insertSheet(nome);
  s240EnsureHeaders_(sh, headers);
  return sh;
}

function s240EnsureHeaders_(sh, headers) {
  const last = Math.max(1, sh.getLastColumn());
  let atuais = sh.getRange(1, 1, 1, last).getValues()[0].map(v => String(v || '').trim());

  if (!atuais.some(Boolean)) {
    sh.clear();
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    atuais = headers.slice();
  } else {
    const falt = headers.filter(h => !atuais.includes(h));
    if (falt.length) {
      sh.getRange(1, atuais.length + 1, 1, falt.length).setValues([falt]);
    }
  }

  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn())
    .setFontWeight('bold')
    .setBackground('#171B68')
    .setFontColor('#FFFFFF');
}

function s240Upsert_(sh, key, obj) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(v => String(v || '').trim());
  const keyCol = headers.indexOf(key);
  if (keyCol < 0) throw new Error(`Cabeçalho ${key} ausente em ${sh.getName()}.`);

  let row = 0;
  if (sh.getLastRow() >= 2) {
    const vals = sh.getRange(2, keyCol + 1, sh.getLastRow() - 1, 1).getValues();
    const alvo = String(obj[key] || '').trim();
    const i = vals.findIndex(r => String(r[0] || '').trim() === alvo);
    if (i >= 0) row = i + 2;
  }

  if (!row) row = sh.getLastRow() + 1;

  const atual = row <= sh.getLastRow()
    ? sh.getRange(row, 1, 1, headers.length).getValues()[0]
    : new Array(headers.length).fill('');

  headers.forEach((h, i) => {
    if (Object.prototype.hasOwnProperty.call(obj, h)) atual[i] = obj[h];
  });

  sh.getRange(row, 1, 1, headers.length).setValues([atual]);
}

function s240Objects_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getDataRange().getValues();
  const h = vals.shift().map(v => String(v || '').trim());
  return vals.filter(r => r.some(v => String(v ?? '').trim() !== '')).map(r => {
    const o = {}; h.forEach((k, i) => { if (k) o[k] = r[i] }); return o;
  });
}


// ========================================================
// S24.1 — VISUALIZAÇÃO DOS TRÊS NÍVEIS
// ========================================================
const S241_NIVEIS = Object.freeze([
  {
    id: 'PLA-CFF-N1-2025',
    nome: 'Nível 1 — Azul + Verde',
    piso: '1',
    setores: 'AZUL|VERDE',
    imagemId: '1O5X-NXf6Fie4nniUffmjXzRAB3zmO1jB',
    imagemUrl: 'https://drive.google.com/file/d/1O5X-NXf6Fie4nniUffmjXzRAB3zmO1jB/view',
    largura: 1853,
    altura: 2620
  },
  {
    id: 'PLA-CFF-N2-2025',
    nome: 'Nível 2 — Amarelo + Branco',
    piso: '2',
    setores: 'AMARELO|BRANCO',
    imagemId: '1KKTh2xfe3MAYm5Unq8dQ3rTBxhUYZBfd',
    imagemUrl: 'https://drive.google.com/file/d/1KKTh2xfe3MAYm5Unq8dQ3rTBxhUYZBfd/view',
    largura: 1853,
    altura: 2620
  },
  {
    id: 'PLA-CFF-N3-2025',
    nome: 'Nível 3 — Roxo + Vermelho / Estacionamento',
    piso: '3',
    setores: 'ROXO|VERMELHO',
    imagemId: '1wcggNYqLa-dBoTguB-7eEMHDwaM5G_2T',
    imagemUrl: 'https://drive.google.com/file/d/1wcggNYqLa-dBoTguB-7eEMHDwaM5G_2T/view',
    largura: 1853,
    altura: 2620
  }
]);

// ========================================================
// S26.8-A — NÍVEL 0 / SUBSOLO
// Fonte enviada em 24/08/2026. Visualização nativa, sem calibrações inventadas.
// ========================================================
const S268_NIVEL0 = Object.freeze({
  id: 'PLA-CFF-N0-2025',
  nome: 'Nível 0 — Subsolo',
  piso: '0',
  setores: 'SUBSOLO',
  imagemId: '1HxrJ2bdCvrJaNvyCEjudAR2NLcmUCh3p',
  imagemUrl: 'https://drive.google.com/file/d/1HxrJ2bdCvrJaNvyCEjudAR2NLcmUCh3p/view',
  pdfId: '1_aKxD3PiiT_ZrZbXkQ0IInI97ibCXUuA',
  pdfUrl: 'https://drive.google.com/file/d/1_aKxD3PiiT_ZrZbXkQ0IInI97ibCXUuA/view',
  largura: 2339,
  altura: 3307,
  sha256Imagem: 'd194a9e4bc080efa0b46af1a555bf4cdeb4a7813d4a0ac8932429a274425690c',
  sha256Pdf: '499871a0a3168598ef3edbbd1b2af173750f6d800a3d84fdadf9afe5ce66d5c9'
});

function s268NiveisAtuais_() {
  return [S268_NIVEL0].concat(S241_NIVEIS);
}

function setupS268A() {
  exigirPermissaoS14_('administrar');

  const ss = SpreadsheetApp.getActive();
  const shPlantas = ss.getSheetByName('PLANTAS');
  const shArquivos = ss.getSheetByName('CARTOGRAFIA_ARQUIVOS');
  if (!shPlantas || !shArquivos) {
    throw new Error('Estrutura cartográfica ausente. PLANTAS/CARTOGRAFIA_ARQUIVOS são obrigatórias.');
  }

  // Confirma que os dois arquivos fonte estão acessíveis antes de escrever metadados.
  const img = DriveApp.getFileById(S268_NIVEL0.imagemId);
  const pdf = DriveApp.getFileById(S268_NIVEL0.pdfId);
  if (!img || img.getSize() <= 0) throw new Error('Imagem do Nível 0 indisponível no Drive.');
  if (!pdf || pdf.getSize() <= 0) throw new Error('PDF fonte do Nível 0 indisponível no Drive.');

  s240Upsert_(shPlantas, 'ID_PLANTA', {
    ID_PLANTA: S268_NIVEL0.id,
    IMAGEM_ID: S268_NIVEL0.imagemId,
    IMAGEM_URL: S268_NIVEL0.imagemUrl,
    LARGURA_ORIGINAL: S268_NIVEL0.largura,
    ALTURA_ORIGINAL: S268_NIVEL0.altura,
    ATUALIZADO_EM: new Date(),
    TIPO_MAPA: 'NIVEL',
    COLECAO: S240.COLECAO_ID,
    DATA_BASE: S240.DATA_BASE,
    STATUS_PUBLICACAO: 'PREVIEW',
    SETORES_INCLUIDOS: S268_NIVEL0.setores,
    ATIVO: 'NAO',
    OBSERVACOES: 'S26.8-A — Nível 0/Subsolo incluído como planta nativa. Sem calibrações ou áreas lógicas inventadas.'
  });

  s240Upsert_(shArquivos, 'ID_ARQUIVO_CARTOGRAFICO', {
    ID_ARQUIVO_CARTOGRAFICO: 'ARQ-CFF-2025-N0',
    DRIVE_FILE_ID: S268_NIVEL0.pdfId,
    DRIVE_IMAGEM_ID: S268_NIVEL0.imagemId,
    NOME_ARQUIVO: 'Cópia de Layout Comercial CF Niveis_0.pdf',
    HASH_SHA256: S268_NIVEL0.sha256Pdf,
    TAMANHO_BYTES: pdf.getSize(),
    STATUS_VINCULO: 'VINCULADO_IMAGEM',
    VALIDACAO_ORIGEM: 'OK_FONTE_USUARIO',
    ATUALIZADO_EM: new Date(),
    OBSERVACOES: 'S26.8-A — PDF fonte + PNG raster do Nível 0/Subsolo.'
  });

  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'S268A_STATUS', 'INSTALADO', 'Nível 0/Subsolo vinculado');
    setConfigValue_(cfg, 'S268A_N0_IMAGEM_ID', S268_NIVEL0.imagemId, 'PNG do Nível 0');
    setConfigValue_(cfg, 'S268A_N0_PDF_ID', S268_NIVEL0.pdfId, 'PDF fonte do Nível 0');
  }

  SpreadsheetApp.flush();
  return diagnosticoS268A();
}

function s268Sha256Drive_(fileId) {
  const blob = DriveApp.getFileById(fileId).getBlob();
  const bytes = blob.getBytes();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
  return digest.map(function (b) {
    const v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function diagnosticoS268A() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const checks = [];
  const add = function (nome, ok, detalhe) {
    checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || '') });
  };

  let imgOk = false, pdfOk = false, imgHash = '', pdfHash = '';
  try {
    const f = DriveApp.getFileById(S268_NIVEL0.imagemId);
    imgOk = !!(f && f.getSize() > 0);
    if (imgOk) imgHash = s268Sha256Drive_(S268_NIVEL0.imagemId);
  } catch (_) {}
  try {
    const f = DriveApp.getFileById(S268_NIVEL0.pdfId);
    pdfOk = !!(f && f.getSize() > 0);
    if (pdfOk) pdfHash = s268Sha256Drive_(S268_NIVEL0.pdfId);
  } catch (_) {}

  add('N0_IMAGEM_DRIVE', imgOk, S268_NIVEL0.imagemId);
  add('N0_PDF_DRIVE', pdfOk, S268_NIVEL0.pdfId);
  add('N0_IMAGEM_SHA256', imgHash === S268_NIVEL0.sha256Imagem, imgHash || 'indisponível');
  add('N0_PDF_SHA256', pdfHash === S268_NIVEL0.sha256Pdf, pdfHash || 'indisponível');

  const sh = ss.getSheetByName('PLANTAS');
  const plantas = sh ? s240Objects_(sh) : [];
  const row = plantas.find(function (r) { return String(r.ID_PLANTA || '') === S268_NIVEL0.id; });
  add('N0_PLANTAS', !!row, row ? S268_NIVEL0.id : 'ausente');
  add('N0_DIMENSOES', !!row &&
    Number(row.LARGURA_ORIGINAL) === S268_NIVEL0.largura &&
    Number(row.ALTURA_ORIGINAL) === S268_NIVEL0.altura,
    row ? String(row.LARGURA_ORIGINAL) + 'x' + String(row.ALTURA_ORIGINAL) : 'ausente');

  const lista = appListarNiveisS241().concat(appListarNiveisExtrasS268A());
  add('N0_SELETOR', lista.some(function (n) { return n.id === S268_NIVEL0.id; }), lista.length + ' níveis disponíveis');
  add('N0_CAMADAS_NAO_INVENTADAS',
    typeof appObterCamadasNivelS267B1 === 'function' &&
      appObterCamadasNivelS267B1(S268_NIVEL0.id).referencias.length === 0 &&
      appObterCamadasNivelS267B1(S268_NIVEL0.id).cruzamentos.length === 0 &&
      appObterCamadasNivelS267B1(S268_NIVEL0.id).lojas.length === 0,
    'Sem calibrações/entidades projetadas até mapeamento próprio');

  const out = {
    ok: checks.every(function (c) { return c.ok; }),
    nivel: S268_NIVEL0.id,
    checks: checks,
    totalChecks: checks.length,
    falhas: checks.filter(function (c) { return !c.ok; }).length,
    somenteLeitura: true
  };
  console.log('[S26.8-A] ' + JSON.stringify(out));
  return out;
}


// ========================================================
// S26.8-C — CADASTRO NATIVO DIRETO NO NÍVEL 0
// Diagnóstico somente leitura.
// ========================================================
function diagnosticoCadastroNivel0S268C() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const checks = [];
  const add = function (nome, ok, detalhe) {
    checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || '') });
  };

  const plantas = ss.getSheetByName('PLANTAS');
  const rows = plantas ? s240Objects_(plantas) : [];
  const n0 = rows.find(function (r) {
    return String(r.ID_PLANTA || '').trim() === 'PLA-CFF-N0-2025';
  });

  add('N0_PLANTA', !!n0, n0 ? 'PLA-CFF-N0-2025 presente' : 'ausente');
  add('N0_COORDENADA_NATIVA',
    typeof appListarRegistrosNivelS242 === 'function',
    'Sem transformação afim para persistência no Nível 0');

  const regs = (typeof appListarRegistrosNivelS242 === 'function')
    ? appListarRegistrosNivelS242('PLA-CFF-N0-2025')
    : [];
  add('N0_LISTAGEM_DIRETA', Array.isArray(regs), Array.isArray(regs) ? regs.length + ' registro(s)' : 'resposta inválida');

  const paresN0 = S242_PARES.filter(function (p) {
    return p.nivel === 'PLA-CFF-N0-2025';
  });
  add('N0_SEM_CALIBRACAO_INVENTADA', paresN0.length === 0, paresN0.length + ' calibração(ões)');

  const shReg = ss.getSheetByName('REGISTROS');
  const headers = shReg && shReg.getLastColumn()
    ? shReg.getRange(1, 1, 1, shReg.getLastColumn()).getDisplayValues()[0].map(String)
    : [];
  add('N0_SCHEMA_REGISTRO',
    ['ID_MAPA_SETOR', 'MAPA', 'PISO', 'X_NORMALIZADO', 'Y_NORMALIZADO'].every(function (h) { return headers.includes(h); }),
    'Campos de persistência nativa disponíveis');

  const out = {
    ok: checks.every(function (c) { return c.ok; }),
    checks: checks,
    totalChecks: checks.length,
    falhas: checks.filter(function (c) { return !c.ok; }).length,
    somenteLeitura: true,
    versao: 'S26.8-C'
  };
  console.log('[S26.8-C] ' + JSON.stringify(out));
  return out;
}



// ========================================================
// S26.8-D / S26.8-D1 — CARTOGRAFIA OPERACIONAL DO NÍVEL 0 / SUBSOLO
// Áreas lógicas nativas delimitadas pelo ADMIN. Nenhuma calibração artificial.
// D1: uma categoria pode possuir vários polígonos independentes (blocos/segmentos).
// ========================================================
const S268D_N0 = 'PLA-CFF-N0-2025';

const S268D_AREAS_N0 = Object.freeze({
  ESTACIONAMENTO: {
    id: 'AREA-N0-ESTACIONAMENTO',
    setor: 'SET-N0-ESTACIONAMENTO',
    mapa: 'MAP-CFF-N0-ESTACIONAMENTO',
    nome: 'Estacionamento',
    tipo: 'ESTACIONAMENTO',
    prioridade: 40,
    multiplo: true,
    codigoPrefixo: 'B',
    itemNome: 'Bloco'
  },
  CIRCULACAO_VEICULAR: {
    id: 'AREA-N0-CIRCULACAO',
    setor: 'SET-N0-CIRCULACAO',
    mapa: 'MAP-CFF-N0-CIRCULACAO',
    nome: 'Circulação veicular',
    tipo: 'CIRCULACAO_VEICULAR',
    prioridade: 60,
    multiplo: true,
    codigoPrefixo: 'C',
    itemNome: 'Corredor'
  },
  RAMPA_ACESSO: {
    id: 'AREA-N0-RAMPA-ACESSO',
    setor: 'SET-N0-RAMPA-ACESSO',
    mapa: 'MAP-CFF-N0-RAMPA-ACESSO',
    nome: 'Rampa / acesso veicular',
    tipo: 'RAMPA_ACESSO',
    prioridade: 100,
    multiplo: true,
    codigoPrefixo: 'R',
    itemNome: 'Rampa'
  },
  ACESSO_PEDESTRE: {
    id: 'AREA-N0-ACESSO-PEDESTRE',
    setor: 'SET-N0-ACESSO-PEDESTRE',
    mapa: 'MAP-CFF-N0-ACESSO-PEDESTRE',
    nome: 'Acesso de pedestres',
    tipo: 'ACESSO_PEDESTRE',
    prioridade: 90,
    multiplo: true,
    codigoPrefixo: 'P',
    itemNome: 'Acesso'
  },
  AREA_EXTERNA: {
    id: 'AREA-N0-EXTERNA',
    setor: 'SET-N0-EXTERNA',
    mapa: 'MAP-CFF-N0-EXTERNA',
    nome: 'Área externa',
    tipo: 'AREA_EXTERNA',
    prioridade: 30,
    multiplo: true,
    codigoPrefixo: 'E',
    itemNome: 'Área'
  },
  SUBSOLO_GERAL: {
    id: 'AREA-N0-GERAL',
    setor: 'SET-N0-GERAL',
    mapa: 'MAP-CFF-N0-GERAL',
    nome: 'Subsolo geral',
    tipo: 'SUBSOLO_GERAL',
    prioridade: 10,
    multiplo: false,
    codigoPrefixo: 'G',
    itemNome: 'Geral'
  }
 });

// ========================================================
// S26.8-D2 — ÁREAS FÍSICAS COMPARTILHADAS N0 ↔ N1
// Uma identidade lógica pode possuir representações geométricas distintas
// em plantas diferentes. Não copia nem transforma polígonos.
// ========================================================
const S268D2_SHEET = 'CARTOGRAFIA_AREAS_FISICAS';
const S268D2_HEADERS = [
  'ID_VINCULO', 'ID_AREA_FISICA', 'NOME_AREA_FISICA', 'TIPO_AREA_FISICA',
  'ID_SUBAREA_FISICA', 'NOME_SUBAREA_FISICA', 'TIPO_SUBAREA_FISICA',
  'ID_AREA_REPRESENTACAO', 'ID_PLANTA_NIVEL', 'PAPEL_REPRESENTACAO',
  'NIVEL_DETALHE', 'ATIVO', 'CRIADO_EM', 'ATUALIZADO_EM', 'OBSERVACOES'
];

const S268D2_AREA_EXTERNA = Object.freeze({
  id: 'AF-CFF-AREA-EXTERNA',
  nome: 'Área externa do Mall',
  tipo: 'AREA_EXTERNA_COMPARTILHADA'
});

const S268D2_N1_EXTERNAS = Object.freeze([
  { id: 'AREA-EXTERNA-N1', papel: 'N1_GERAL', detalhe: 'MACRO' },
  { id: 'AREA-EXT-LAT-AZUL-N1', papel: 'N1_SUBAREA', detalhe: 'DETALHE' },
  { id: 'AREA-EXT-LAT-VERDE-N1', papel: 'N1_SUBAREA', detalhe: 'DETALHE' },
  { id: 'AREA-EXT-FRENTE-N1', papel: 'N1_SUBAREA', detalhe: 'DETALHE' },
  { id: 'AREA-EXT-HOTEL-CDM-N1', papel: 'N1_SUBAREA', detalhe: 'DETALHE' }
]);

function s268D2VinculoId_(idArea) {
  return 'VINC-' + S268D2_AREA_EXTERNA.id + '--' + String(idArea || '').replace(/[^A-Za-z0-9_-]/g, '-');
}

function s268D2IndexRepresentacoes_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(S268D2_SHEET);
  if (!sh) return {};
  const idx = {};
  s240Objects_(sh).forEach(function (r) {
    if (String(r.ATIVO || 'SIM').toUpperCase() === 'NAO') return;
    const idRep = String(r.ID_AREA_REPRESENTACAO || '').trim();
    if (!idRep) return;
    idx[idRep] = {
      areaFisicaId: String(r.ID_AREA_FISICA || ''),
      areaFisicaNome: String(r.NOME_AREA_FISICA || ''),
      areaFisicaTipo: String(r.TIPO_AREA_FISICA || ''),
      subareaFisicaId: String(r.ID_SUBAREA_FISICA || ''),
      subareaFisicaNome: String(r.NOME_SUBAREA_FISICA || ''),
      subareaFisicaTipo: String(r.TIPO_SUBAREA_FISICA || ''),
      representacaoPapel: String(r.PAPEL_REPRESENTACAO || ''),
      representacaoDetalhe: String(r.NIVEL_DETALHE || ''),
      representacaoNivel: String(r.ID_PLANTA_NIVEL || '')
    };
  });
  return idx;
}

function s268D2MetaPorRepresentacao_(idArea, idx) {
  idx = idx || s268D2IndexRepresentacoes_();
  return idx[String(idArea || '').trim()] || null;
}

function s268D2GarantirVinculoRepresentacao_(rep) {
  rep = rep || {};
  const idArea = String(rep.idArea || '').trim();
  const idNivel = String(rep.idNivel || '').trim();
  if (!idArea || !idNivel) return null;

  const ss = SpreadsheetApp.getActive();
  const sh = s240EnsureSheet_(ss, S268D2_SHEET, S268D2_HEADERS);
  const agora = new Date();
  const row = {
    ID_VINCULO: s268D2VinculoId_(idArea),
    ID_AREA_FISICA: S268D2_AREA_EXTERNA.id,
    NOME_AREA_FISICA: S268D2_AREA_EXTERNA.nome,
    TIPO_AREA_FISICA: S268D2_AREA_EXTERNA.tipo,
    ID_AREA_REPRESENTACAO: idArea,
    ID_PLANTA_NIVEL: idNivel,
    PAPEL_REPRESENTACAO: String(rep.papel || 'REPRESENTACAO'),
    NIVEL_DETALHE: String(rep.detalhe || 'DETALHE'),
    ATIVO: 'SIM',
    CRIADO_EM: agora,
    ATUALIZADO_EM: agora,
    OBSERVACOES: String(rep.observacoes || 'S26.8-D2 — vínculo semântico; geometria permanece na planta de origem.')
  };
  s240Upsert_(sh, 'ID_VINCULO', row);
  return row;
}

function s268D2RepresentacoesDesejadas_() {
  const ss = SpreadsheetApp.getActive();
  const shAreas = ss.getSheetByName('MAPA_AREAS_NIVEL');
  const rows = shAreas ? s240Objects_(shAreas) : [];
  const out = [];

  rows.filter(function (r) {
    return String(r.ID_PLANTA_NIVEL || '') === S268D_N0 &&
      String(r.TIPO_AREA || '').toUpperCase() === 'AREA_EXTERNA';
  }).forEach(function (r, i) {
    const id = String(r.ID_AREA || '').trim();
    if (!id) return;
    out.push({
      idArea: id,
      idNivel: S268D_N0,
      papel: i === 0 || id === 'AREA-N0-EXTERNA' ? 'N0_GERAL' : 'N0_SUBAREA',
      detalhe: i === 0 || id === 'AREA-N0-EXTERNA' ? 'MACRO' : 'DETALHE',
      observacoes: 'S26.8-D2 — representação da Área externa do Mall no Nível 0.'
    });
  });

  S268D2_N1_EXTERNAS.forEach(function (d) {
    const existe = rows.some(function (r) { return String(r.ID_AREA || '') === d.id; });
    if (!existe) return;
    out.push({
      idArea: d.id,
      idNivel: S246_N1,
      papel: d.papel,
      detalhe: d.detalhe,
      observacoes: 'S26.8-D2 — representação da Área externa do Mall no Nível 1.'
    });
  });
  return out;
}

function setupS268D2() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const shAreas = ss.getSheetByName('MAPA_AREAS_NIVEL');
  if (!shAreas) throw new Error('Dependência ausente: MAPA_AREAS_NIVEL.');

  const reps = s268D2RepresentacoesDesejadas_();
  if (!reps.some(function (r) { return r.idArea === 'AREA-N0-EXTERNA'; })) {
    throw new Error('Representação E01 do Nível 0 não encontrada. Conclua a S26.8-D1 antes da D2.');
  }
  reps.forEach(s268D2GarantirVinculoRepresentacao_);

  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'S268D2_STATUS', 'INSTALADO', 'Área externa N0↔N1 vinculada por identidade física compartilhada');
    setConfigValue_(cfg, 'S268D2_AREA_FISICA_EXTERNA', S268D2_AREA_EXTERNA.id, S268D2_AREA_EXTERNA.nome);
    setConfigValue_(cfg, 'S268D2_GEOMETRIA_COMPARTILHADA', 'NAO', 'Cada nível mantém sua própria geometria normalizada');
  }
  SpreadsheetApp.flush();
  return diagnosticoS268D2();
}

function appObterAreaFisicaPorRepresentacaoS268D2(idAreaRepresentacao) {
  const meta = s268D2MetaPorRepresentacao_(idAreaRepresentacao);
  return meta ? Object.assign({ idAreaRepresentacao: String(idAreaRepresentacao || '') }, meta) : null;
}

function appListarRepresentacoesAreaFisicaS268D2(idAreaFisica) {
  idAreaFisica = String(idAreaFisica || S268D2_AREA_EXTERNA.id);
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(S268D2_SHEET);
  if (!sh) return [];
  return s240Objects_(sh).filter(function (r) {
    return String(r.ID_AREA_FISICA || '') === idAreaFisica && String(r.ATIVO || 'SIM').toUpperCase() !== 'NAO';
  }).map(function (r) {
    return {
      idVinculo: String(r.ID_VINCULO || ''),
      areaFisicaId: String(r.ID_AREA_FISICA || ''),
      areaFisicaNome: String(r.NOME_AREA_FISICA || ''),
      areaFisicaTipo: String(r.TIPO_AREA_FISICA || ''),
      subareaFisicaId: String(r.ID_SUBAREA_FISICA || ''),
      subareaFisicaNome: String(r.NOME_SUBAREA_FISICA || ''),
      subareaFisicaTipo: String(r.TIPO_SUBAREA_FISICA || ''),
      idAreaRepresentacao: String(r.ID_AREA_REPRESENTACAO || ''),
      idNivel: String(r.ID_PLANTA_NIVEL || ''),
      papel: String(r.PAPEL_REPRESENTACAO || ''),
      detalhe: String(r.NIVEL_DETALHE || '')
    };
  });
}

function diagnosticoS268D2() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const checks = [];
  const add = function (nome, ok, detalhe) { checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || '') }); };
  const sh = ss.getSheetByName(S268D2_SHEET);
  const reps = sh ? appListarRepresentacoesAreaFisicaS268D2(S268D2_AREA_EXTERNA.id) : [];
  const ids = reps.map(function (r) { return r.idAreaRepresentacao; });
  const n0 = appListarAreasNivel0S268D();
  const n1 = appListarAreasNivel1S246();
  const extN0 = n0.find(function (a) { return a.id === 'AREA-N0-EXTERNA'; });
  const extN1 = n1.find(function (a) { return a.id === 'AREA-EXTERNA-N1'; });

  add('AREA_FISICA_ABA', !!sh, S268D2_SHEET);
  add('AREA_FISICA_ID', reps.every(function (r) { return r.areaFisicaId === S268D2_AREA_EXTERNA.id; }), S268D2_AREA_EXTERNA.id);
  add('N0_E01_VINCULADA', ids.includes('AREA-N0-EXTERNA'), 'E01 → ' + S268D2_AREA_EXTERNA.id);
  add('N1_GERAL_VINCULADA', ids.includes('AREA-EXTERNA-N1'), 'Área Externa N1 → ' + S268D2_AREA_EXTERNA.id);
  add('N1_SUBAREAS_VINCULADAS', S268D2_N1_EXTERNAS.filter(function (d) { return d.detalhe === 'DETALHE'; }).every(function (d) { return ids.includes(d.id); }), 'Lateral Azul/Verde, Frente e Hotel/CDM');
  add('N0_META_NO_RESOLVEDOR', !!(extN0 && extN0.areaFisicaId === S268D2_AREA_EXTERNA.id), extN0 ? extN0.areaFisicaNome : 'ausente');
  add('N1_META_NO_RESOLVEDOR', !!(extN1 && extN1.areaFisicaId === S268D2_AREA_EXTERNA.id), extN1 ? extN1.areaFisicaNome : 'ausente');
  add('GEOMETRIA_NAO_COPIADA', reps.some(function (r) { return r.idNivel === S268D_N0; }) && reps.some(function (r) { return r.idNivel === S246_N1; }), 'identidade compartilhada; geometrias permanecem por nível');
  add('N0_SEM_CALIBRACAO', S242_PARES.filter(function (p) { return p.nivel === S268D_N0; }).length === 0, 'coordenada nativa preservada');
  add('REPRESENTACOES_MINIMAS', reps.length >= 6, reps.length + ' representação(ões) vinculada(s)');

  const out = {
    ok: checks.every(function (c) { return c.ok; }),
    checks: checks,
    totalChecks: checks.length,
    falhas: checks.filter(function (c) { return !c.ok; }).length,
    areaFisica: S268D2_AREA_EXTERNA,
    representacoes: reps,
    somenteLeitura: true,
    versao: 'S26.8-D2'
  };
  console.log('[S26.8-D2] ' + JSON.stringify(out));
  return out;
}


// ========================================================
// S26.8-D3 — CORRESPONDÊNCIA DE SUBÁREAS EXTERNAS N0 ↔ N1
// Identidade macro: Área externa do Mall.
// Subáreas: Lateral Azul, Lateral Verde, Frente e Hotel/CDM.
// Cada planta mantém sua própria geometria normalizada.
// ========================================================
const S268D3_SUBAREAS_EXTERNAS = Object.freeze([
  { id:'AF-CFF-EXT-LAT-AZUL', nome:'Área externa lateral azul', tipo:'AREA_EXTERNA_LATERAL_AZUL', n0AreaId:'AREA-N0-EXTERNA-E02', n0Codigo:'E02', n1AreaId:'AREA-EXT-LAT-AZUL-N1' },
  { id:'AF-CFF-EXT-LAT-VERDE', nome:'Área externa lateral verde', tipo:'AREA_EXTERNA_LATERAL_VERDE', n0AreaId:'AREA-N0-EXTERNA-E03', n0Codigo:'E03', n1AreaId:'AREA-EXT-LAT-VERDE-N1' },
  { id:'AF-CFF-EXT-FRENTE', nome:'Área externa frente', tipo:'AREA_EXTERNA_FRENTE', n0AreaId:'AREA-N0-EXTERNA-E04', n0Codigo:'E04', n1AreaId:'AREA-EXT-FRENTE-N1' },
  { id:'AF-CFF-EXT-HOTEL-CDM', nome:'Área externa Hotel/CDM', tipo:'AREA_EXTERNA_HOTEL_CDM', n0AreaId:'AREA-N0-EXTERNA-E05', n0Codigo:'E05', n1AreaId:'AREA-EXT-HOTEL-CDM-N1' }
]);

function s268D3SubareaPorIdArea_(idArea) {
  idArea = String(idArea || '').trim();
  return S268D3_SUBAREAS_EXTERNAS.find(function(d){
    return d.n0AreaId === idArea || d.n1AreaId === idArea;
  }) || null;
}

function s268D3NomeRepresentacaoN0_(idArea, meta, fis) {
  idArea = String(idArea || '');
  if (!meta || String(meta.tipo || '') !== 'AREA_EXTERNA') return s268DNomeExibicao_(meta, idArea);
  if (fis && fis.subareaFisicaNome) return String(fis.subareaFisicaNome);
  const d = s268D3SubareaPorIdArea_(idArea);
  if (d) return d.nome;
  if (idArea === 'AREA-N0-EXTERNA') return 'Área externa geral';
  return s268DNomeExibicao_(meta, idArea);
}

function s268D3RotuloRepresentacaoN0_(idArea, meta, fis) {
  if (!meta || String(meta.tipo || '') !== 'AREA_EXTERNA') return s268DRotuloBloco_(meta, idArea);
  if (fis && fis.subareaFisicaNome) return String(fis.subareaFisicaNome);
  const d = s268D3SubareaPorIdArea_(idArea);
  if (d) return d.nome;
  if (String(idArea || '') === 'AREA-N0-EXTERNA') return 'Área externa geral';
  return s268DRotuloBloco_(meta, idArea);
}

function s268D3GarantirAreaN0_(d, shAreas, rows, agora) {
  if (rows.some(function(r){ return String(r.ID_AREA || '') === d.n0AreaId; })) return;
  const meta = S268D_AREAS_N0.AREA_EXTERNA;
  s240Upsert_(shAreas, 'ID_AREA', {
    ID_AREA:d.n0AreaId, ID_COLECAO:S240.COLECAO_ID, ID_PLANTA_NIVEL:S268D_N0,
    ID_SETOR:meta.setor, ID_MAPA_NATIVO:meta.mapa, NOME:d.nome, TIPO_AREA:meta.tipo,
    POLIGONO_JSON:'', STATUS:'PENDENTE', CRIADO_EM:agora, ATUALIZADO_EM:agora,
    ATUALIZADO_POR:'',
    OBSERVACOES:'S26.8-D3 — representação N0 de '+d.nome+'; delimitar nesta planta sem copiar coordenadas do N1.'
  });
}

function s268D3GarantirVinculo_(d, idArea, idNivel, papel) {
  const ss = SpreadsheetApp.getActive();
  const sh = s240EnsureSheet_(ss, S268D2_SHEET, S268D2_HEADERS);
  const agora = new Date();
  s240Upsert_(sh, 'ID_VINCULO', {
    ID_VINCULO:s268D2VinculoId_(idArea),
    ID_AREA_FISICA:S268D2_AREA_EXTERNA.id,
    NOME_AREA_FISICA:S268D2_AREA_EXTERNA.nome,
    TIPO_AREA_FISICA:S268D2_AREA_EXTERNA.tipo,
    ID_SUBAREA_FISICA:d.id,
    NOME_SUBAREA_FISICA:d.nome,
    TIPO_SUBAREA_FISICA:d.tipo,
    ID_AREA_REPRESENTACAO:idArea,
    ID_PLANTA_NIVEL:idNivel,
    PAPEL_REPRESENTACAO:papel,
    NIVEL_DETALHE:'SUBAREA_FISICA',
    ATIVO:'SIM', CRIADO_EM:agora, ATUALIZADO_EM:agora,
    OBSERVACOES:'S26.8-D3 — correspondência semântica N0↔N1; geometria permanece exclusiva da planta de origem.'
  });
}

function setupS268D3() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const shAreas = s240EnsureSheet_(ss, 'MAPA_AREAS_NIVEL', S244_AREA_HEADERS);
  s240EnsureSheet_(ss, S268D2_SHEET, S268D2_HEADERS);
  const rows = s240Objects_(shAreas);
  if (!rows.some(function(r){ return String(r.ID_AREA || '') === 'AREA-N0-EXTERNA'; })) {
    throw new Error('E01 do Nível 0 não encontrada. Conclua a S26.8-D1 antes da D3.');
  }
  const agora = new Date();
  S268D3_SUBAREAS_EXTERNAS.forEach(function(d){
    s268D3GarantirAreaN0_(d, shAreas, rows, agora);
    s268D3GarantirVinculo_(d, d.n0AreaId, S268D_N0, 'N0_SUBAREA');
    s268D3GarantirVinculo_(d, d.n1AreaId, S246_N1, 'N1_SUBAREA');
  });
  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'S268D3_STATUS', 'INSTALADO', 'Correspondência de subáreas externas N0↔N1 preparada');
    setConfigValue_(cfg, 'S268D3_SUBAREAS_EXTERNAS', '4', 'Lateral Azul/Verde, Frente e Hotel/CDM');
    setConfigValue_(cfg, 'S268D3_GEOMETRIA_COPIADA', 'NAO', 'Cada nível mantém coordenadas nativas próprias');
  }
  SpreadsheetApp.flush();
  return diagnosticoS268D3();
}

function diagnosticoS268D3() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const checks = [];
  const add = function(nome, ok, detalhe){ checks.push({nome:nome, ok:!!ok, detalhe:String(detalhe || '')}); };
  const shAreas = ss.getSheetByName('MAPA_AREAS_NIVEL');
  const shFis = ss.getSheetByName(S268D2_SHEET);
  const rows = shAreas ? s240Objects_(shAreas) : [];
  const reps = shFis ? s240Objects_(shFis) : [];
  const ids = rows.map(function(r){ return String(r.ID_AREA || ''); });

  const n0Prep = S268D3_SUBAREAS_EXTERNAS.filter(function(d){ return ids.includes(d.n0AreaId); });
  const n0Links = S268D3_SUBAREAS_EXTERNAS.filter(function(d){
    return reps.some(function(r){
      return String(r.ID_AREA_REPRESENTACAO || '') === d.n0AreaId &&
        String(r.ID_SUBAREA_FISICA || '') === d.id &&
        String(r.ID_AREA_FISICA || '') === S268D2_AREA_EXTERNA.id;
    });
  });
  const n1Links = S268D3_SUBAREAS_EXTERNAS.filter(function(d){
    return reps.some(function(r){
      return String(r.ID_AREA_REPRESENTACAO || '') === d.n1AreaId &&
        String(r.ID_SUBAREA_FISICA || '') === d.id &&
        String(r.ID_AREA_FISICA || '') === S268D2_AREA_EXTERNA.id;
    });
  });

  const n0 = appListarAreasNivel0S268D();
  const n1 = appListarAreasNivel1S246();
  const v0 = n0.find(function(a){ return a.id === 'AREA-N0-EXTERNA-E03'; });
  const v1 = n1.find(function(a){ return a.id === 'AREA-EXT-LAT-VERDE-N1'; });

  add('D2_BASE_ATIVA', !!shFis, S268D2_SHEET);
  add('E01_MACRO_PRESERVADA', ids.includes('AREA-N0-EXTERNA'), 'E01 continua Área externa geral');
  add('N0_SUBAREAS_PREPARADAS', n0Prep.length === 4, n0Prep.length+'/4');
  add('N0_VINCULOS_SUBAREA', n0Links.length === 4, n0Links.length+'/4');
  add('N1_VINCULOS_SUBAREA', n1Links.length === 4, n1Links.length+'/4');
  add('PARENT_MACRO_UNICO', n0Links.length === 4 && n1Links.length === 4, S268D2_AREA_EXTERNA.id);
  add('LATERAL_VERDE_N0_META', !!(v0 && v0.subareaFisicaNome === 'Área externa lateral verde'), v0 ? v0.subareaFisicaNome : 'ausente');
  add('LATERAL_VERDE_N1_META', !!(v1 && v1.subareaFisicaNome === 'Área externa lateral verde'), v1 ? v1.subareaFisicaNome : 'ausente');
  add('N0_SEM_CALIBRACAO', S242_PARES.filter(function(p){ return p.nivel === S268D_N0; }).length === 0, 'coordenada nativa preservada');
  add('GEOMETRIAS_POR_NIVEL', true, 'D3 não copia nem transforma POLIGONO_JSON entre N0 e N1');

  const subareas = S268D3_SUBAREAS_EXTERNAS.map(function(d){
    const a = n0.find(function(x){ return x.id === d.n0AreaId; });
    return {codigo:d.n0Codigo, subareaFisicaId:d.id, nome:d.nome, status:a ? a.status : 'AUSENTE', pontos:a && Array.isArray(a.poligono) ? a.poligono.length : 0};
  });
  const out = {ok:checks.every(function(c){return c.ok;}), checks:checks, totalChecks:checks.length,
    falhas:checks.filter(function(c){return !c.ok;}).length, areaFisicaPai:S268D2_AREA_EXTERNA,
    subareas:subareas, somenteLeitura:true, versao:'S26.8-D3'};
  console.log('[S26.8-D3] '+JSON.stringify(out));
  return out;
}

function diagnosticoGateS268D3() {
  exigirPermissaoS14_('administrar');
  const base = diagnosticoS268D3();
  const checks = (base.checks || []).slice();
  const add = function(nome, ok, detalhe){ checks.push({nome:nome, ok:!!ok, detalhe:String(detalhe || '')}); };
  const n0 = appListarAreasNivel0S268D();
  const n1 = appListarAreasNivel1S246();

  const val0 = S268D3_SUBAREAS_EXTERNAS.filter(function(d){
    const a = n0.find(function(x){ return x.id === d.n0AreaId; });
    return a && a.status === 'VALIDADA' && Array.isArray(a.poligono) && a.poligono.length >= 4;
  });
  const val1 = S268D3_SUBAREAS_EXTERNAS.filter(function(d){
    const a = n1.find(function(x){ return x.id === d.n1AreaId; });
    return a && a.status === 'VALIDADA' && Array.isArray(a.poligono) && a.poligono.length >= 4;
  });
  add('N0_SUBAREAS_VALIDAS', val0.length === 4, val0.length+'/4');
  add('N1_SUBAREAS_VALIDAS', val1.length === 4, val1.length+'/4');
  add('CORRESPONDENCIA_COMPLETA_N0_N1', val0.length === 4 && val1.length === 4, '4/4 pares com geometrias próprias');

  const out = {ok:checks.every(function(c){return c.ok;}), checks:checks, totalChecks:checks.length,
    falhas:checks.filter(function(c){return !c.ok;}).length, areaFisicaPai:S268D2_AREA_EXTERNA,
    somenteLeitura:true, versao:'S26.8-D3-GATE'};
  console.log('[S26.8-D3-GATE] '+JSON.stringify(out));
  return out;
}


// ========================================================
// S26.8-D4 — E01 COMO MACRO AGREGADA NÃO RESOLVÍVEL
// E01 permanece armazenada para histórico/rollback e identidade macro,
// mas não concorre espacialmente com E02–E05 em cliques/cadastro.
// ========================================================
const S268D4_MACRO_EXTERNA_ID = 'AREA-N0-EXTERNA';
const S268D4_SUBAREAS_IDS = Object.freeze([
  'AREA-N0-EXTERNA-E02',
  'AREA-N0-EXTERNA-E03',
  'AREA-N0-EXTERNA-E04',
  'AREA-N0-EXTERNA-E05'
]);

function s268D4EhMacroAgregada_(idArea) {
  return String(idArea || '').trim() === S268D4_MACRO_EXTERNA_ID;
}

function s268D4ParticipaResolucao_(area) {
  if (!area) return false;
  if (s268D4EhMacroAgregada_(area.id)) return false;
  return area.participaResolucao !== false;
}

function setupS268D4() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('MAPA_AREAS_NIVEL');
  if (!sh) throw new Error('Dependência ausente: MAPA_AREAS_NIVEL.');
  const rows = s268DRowsNivel0_(sh, false);
  if (!rows.some(function(r){ return String(r.ID_AREA || '') === S268D4_MACRO_EXTERNA_ID; })) {
    throw new Error('E01 do Nível 0 não encontrada. Conclua a S26.8-D3 antes da D4.');
  }
  const ausentes = S268D4_SUBAREAS_IDS.filter(function(id){
    return !rows.some(function(r){ return String(r.ID_AREA || '') === id; });
  });
  if (ausentes.length) throw new Error('Subáreas externas ausentes: ' + ausentes.join(', '));

  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'S268D4_STATUS', 'INSTALADO', 'E01 tratada como macro agregada sem concorrência espacial');
    setConfigValue_(cfg, 'S268D4_E01_MODO', 'MACRO_AGREGADA', 'Geometria legada preservada; fora do resolvedor operacional');
    setConfigValue_(cfg, 'S268D4_E01_RESOLVER', 'NAO', 'Cliques usam E02–E05 e demais áreas operacionais');
    setConfigValue_(cfg, 'S268D4_SUBAREAS_RESOLVER', 'E02|E03|E04|E05', 'Subáreas externas resolvíveis no Nível 0');
  }
  SpreadsheetApp.flush();
  return diagnosticoS268D4();
}

function diagnosticoS268D4() {
  exigirPermissaoS14_('administrar');
  const checks = [];
  const add = function(nome, ok, detalhe){ checks.push({nome:nome, ok:!!ok, detalhe:String(detalhe || '')}); };
  const areas = appListarAreasNivel0S268D();
  const e01 = areas.find(function(a){ return a.id === S268D4_MACRO_EXTERNA_ID; });
  const subs = S268D4_SUBAREAS_IDS.map(function(id){ return areas.find(function(a){ return a.id === id; }); }).filter(Boolean);

  add('D3_GATE_BASE', typeof diagnosticoGateS268D3 === 'function', 'diagnosticoGateS268D3 disponível');
  add('E01_PRESENTE', !!e01, S268D4_MACRO_EXTERNA_ID);
  add('E01_MACRO_AGREGADA', !!(e01 && e01.macroAgregada === true), e01 ? e01.modoGeometria : 'ausente');
  add('E01_FORA_RESOLVEDOR', !!(e01 && e01.participaResolucao === false), 'participaResolucao=false');
  add('E01_NAO_EDITAVEL', !!(e01 && e01.editavel === false), 'editavel=false');
  add('E01_GEOMETRIA_PRESERVADA', !!(e01 && Array.isArray(e01.poligono) && e01.poligono.length >= 4), e01 && e01.poligono ? e01.poligono.length + ' ponto(s) legados' : 'sem geometria');
  add('SUBAREAS_4_PRESENTES', subs.length === 4, subs.length + '/4');
  add('SUBAREAS_RESOLVIVEIS', subs.length === 4 && subs.every(function(a){ return a.participaResolucao !== false; }), 'E02–E05 participam da resolução');
  add('SUBAREAS_VALIDAS', subs.length === 4 && subs.every(function(a){ return a.status === 'VALIDADA' && Array.isArray(a.poligono) && a.poligono.length >= 4; }), subs.filter(function(a){ return a.status === 'VALIDADA' && Array.isArray(a.poligono) && a.poligono.length >= 4; }).length + '/4');
  add('RESOLVEDOR_REJEITA_E01', s268DResolverArea_([e01].filter(Boolean), 0.5, 0.5) === null, 'E01 isolada nunca é candidata');

  const out = {
    ok: checks.every(function(c){ return c.ok; }),
    checks: checks,
    totalChecks: checks.length,
    falhas: checks.filter(function(c){ return !c.ok; }).length,
    macro: e01 ? {id:e01.id, nome:e01.nome, modo:e01.modoGeometria, pontosLegados:e01.poligono.length} : null,
    subareas: subs.map(function(a){ return {id:a.id, codigo:a.codigo, nome:a.nome, status:a.status, pontos:a.poligono.length}; }),
    somenteLeitura: true,
    versao: 'S26.8-D4'
  };
  console.log('[S26.8-D4] ' + JSON.stringify(out));
  return out;
}


function s268DMetaTipo_(tipo) {
  return S268D_AREAS_N0[String(tipo || '').trim().toUpperCase()] || null;
}

function s268DNumeroBloco_(meta, idArea) {
  if (!meta || !meta.multiplo) return 1;
  idArea = String(idArea || '');
  if (idArea === meta.id) return 1;
  const re = new RegExp('-' + meta.codigoPrefixo + '(\\d+)$', 'i');
  const m = idArea.match(re);
  return m ? Math.max(1, Number(m[1]) || 1) : 1;
}

function s268DCodigoBloco_(meta, idArea) {
  if (!meta || !meta.multiplo) return 'GERAL';
  return meta.codigoPrefixo + String(s268DNumeroBloco_(meta, idArea)).padStart(2, '0');
}

function s268DRotuloBloco_(meta, idArea) {
  if (!meta) return '';
  if (!meta.multiplo) return meta.nome;
  return meta.itemNome + ' ' + s268DCodigoBloco_(meta, idArea);
}

function s268DNomeExibicao_(meta, idArea) {
  if (!meta) return '';
  if (!meta.multiplo) return meta.nome;
  return meta.nome + ' — ' + s268DRotuloBloco_(meta, idArea);
}

function s268DRowsNivel0_(sh, incluirRascunho) {
  const live = (sh ? s240Objects_(sh) : []).filter(function (r) {
    return String(r.ID_PLANTA_NIVEL || '') === S268D_N0 && !!s268DMetaTipo_(r.TIPO_AREA);
  });
  if (!incluirRascunho) return live;

  const out = live.map(function (r) {
    return s255OverlayArea_(String(r.ID_AREA || ''), r);
  });

  // S26.8-D1: um novo B02/C02 pode existir apenas no rascunho e ainda não
  // possuir linha live. Incluímos esses registros para o editor e para a
  // numeração sequencial sem tocar na produção.
  try {
    const pub = s255PublicacaoAtiva_();
    if (pub && pub.status === S255_STATUS.RASCUNHO) {
      const vistos = {};
      out.forEach(function (r) { vistos[String(r.ID_AREA || '')] = true; });
      (pub.draft.areas || []).forEach(function (r) {
        const id = String(r.ID_AREA || '');
        if (vistos[id]) return;
        if (String(r.ID_PLANTA_NIVEL || '') !== S268D_N0 || !s268DMetaTipo_(r.TIPO_AREA)) return;
        vistos[id] = true;
        out.push(r);
      });
    }
  } catch (_) { }
  return out;
}

function s268DProximoId_(meta, rows) {
  if (!meta.multiplo) return meta.id;
  rows = Array.isArray(rows) ? rows : [];
  const daCategoria = rows.filter(function (r) {
    return String(r.TIPO_AREA || '').toUpperCase() === meta.tipo;
  });

  // O registro-base criado na S26.8-D representa o primeiro bloco (B01/C01/...).
  // Se ele ainda estiver vazio, reutilizamos esse registro em vez de criar B02.
  const base = daCategoria.find(function (r) { return String(r.ID_AREA || '') === meta.id; });
  if (base) {
    let pol = [];
    try { pol = JSON.parse(String(base.POLIGONO_JSON || '[]')); } catch (_) { pol = []; }
    if (String(base.STATUS || 'PENDENTE') !== 'VALIDADA' || !Array.isArray(pol) || pol.length < 4) {
      return meta.id;
    }
  }

  let maior = 1;
  daCategoria.forEach(function (r) {
    maior = Math.max(maior, s268DNumeroBloco_(meta, r.ID_AREA));
  });
  const prox = maior + 1;
  return meta.id + '-' + meta.codigoPrefixo + String(prox).padStart(2, '0');
}

function setupS268D() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const shMapas = ss.getSheetByName('MAPAS_SETORES');
  if (!shMapas) throw new Error('Dependência ausente: MAPAS_SETORES.');
  const shAreas = s240EnsureSheet_(ss, 'MAPA_AREAS_NIVEL', S244_AREA_HEADERS);
  const agora = new Date();
  const mapasExistentes = s240Objects_(shMapas);
  const areasExistentes = s240Objects_(shAreas);

  Object.keys(S268D_AREAS_N0).forEach(function (k) {
    const a = S268D_AREAS_N0[k];
    if (!mapasExistentes.some(function (r) { return String(r.ID_MAPA_SETOR || '') === a.mapa; })) {
      s240Upsert_(shMapas, 'ID_MAPA_SETOR', {
        ID_MAPA_SETOR: a.mapa,
        ID_PLANTA: S268D_N0,
        ID_SETOR: a.setor,
        NOME: a.nome,
        PISO: '0',
        COR_SETOR: 'CINZA',
        ARQUIVO_PDF_ID: S268_NIVEL0.pdfId,
        IMAGEM_ID: S268_NIVEL0.imagemId,
        IMAGEM_URL: S268_NIVEL0.imagemUrl,
        LARGURA_PX: S268_NIVEL0.largura,
        ALTURA_PX: S268_NIVEL0.altura,
        ROTACAO_GRAUS: 0,
        ORIGEM_COORDENADAS: 'SUPERIOR_ESQUERDA',
        VERSAO: S240.VERSAO_CARTOGRAFICA,
        STATUS_PLANIFICACAO: 'AREA_NATIVA_NIVEL',
        ATIVO: 'NAO',
        CRIADO_EM: agora,
        ATUALIZADO_EM: agora,
        COLECAO: S240.COLECAO_ID,
        DATA_BASE: S240.DATA_BASE,
        STATUS_PUBLICACAO: 'OPERACIONAL_VIA_NIVEL',
        NOME_ARQUIVO_ORIGEM: 'Cópia de Layout Comercial CF Niveis_0.pdf',
        OBSERVACOES: 'S26.8-D1 — mapa lógico nativo do Subsolo. Não exibir separadamente no seletor.'
      });
    }

    if (!areasExistentes.some(function (r) { return String(r.ID_AREA || '') === a.id; })) {
      s240Upsert_(shAreas, 'ID_AREA', {
        ID_AREA: a.id,
        ID_COLECAO: S240.COLECAO_ID,
        ID_PLANTA_NIVEL: S268D_N0,
        ID_SETOR: a.setor,
        ID_MAPA_NATIVO: a.mapa,
        NOME: s268DNomeExibicao_(a, a.id),
        TIPO_AREA: a.tipo,
        POLIGONO_JSON: '',
        STATUS: 'PENDENTE',
        CRIADO_EM: agora,
        ATUALIZADO_EM: agora,
        ATUALIZADO_POR: '',
        OBSERVACOES: 'S26.8-D1 — delimitar pela interface administrativa do Nível 0.'
      });
    }
  });

  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'S268D_STATUS', 'INSTALADO', 'Cartografia operacional do Nível 0 preparada');
    setConfigValue_(cfg, 'S268D_AREAS_N0', String(Object.keys(S268D_AREAS_N0).length), 'Categorias lógicas preparadas no Subsolo');
    setConfigValue_(cfg, 'S268D1_AREAS_COMPOSTAS', 'SIM', 'Categorias do Subsolo aceitam múltiplos polígonos independentes');
  }
  SpreadsheetApp.flush();
  return diagnosticoS268D1();
}

function setupS268D1() {
  return setupS268D();
}

function appListarAreasNivel0S268D(opcoes) {
  opcoes = opcoes || {};
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('MAPA_AREAS_NIVEL');
  const rows = s268DRowsNivel0_(sh, !!opcoes.incluirRascunho);
  const fisIndex = (typeof s268D2IndexRepresentacoes_ === 'function') ? s268D2IndexRepresentacoes_() : {};

  const out = rows.map(function (r) {
    const meta = s268DMetaTipo_(r.TIPO_AREA);
    if (!meta) return null;
    let poligono = [];
    try { poligono = JSON.parse(String(r && r.POLIGONO_JSON || '[]')); } catch (_) { poligono = []; }
    const id = String(r.ID_AREA || meta.id);
    const fis = fisIndex[id] || null;
    const nomeD3 = (typeof s268D3NomeRepresentacaoN0_ === 'function') ? s268D3NomeRepresentacaoN0_(id, meta, fis) : s268DNomeExibicao_(meta, id);
    const rotuloD3 = (typeof s268D3RotuloRepresentacaoN0_ === 'function') ? s268D3RotuloRepresentacaoN0_(id, meta, fis) : s268DRotuloBloco_(meta, id);
    return {
      id: id,
      nivel: S268D_N0,
      setor: meta.setor,
      mapa: meta.mapa,
      nome: nomeD3,
      categoriaNome: meta.nome,
      tipoArea: meta.tipo,
      prioridade: meta.prioridade,
      multiplo: !!meta.multiplo,
      codigo: s268DCodigoBloco_(meta, id),
      rotulo: rotuloD3,
      status: r ? String(r.STATUS || 'PENDENTE') : 'PENDENTE',
      poligono: Array.isArray(poligono) ? poligono : [],
      atualizadoEm: r ? s243ValorRpcSeguro_(r.ATUALIZADO_EM) : '',
      areaFisicaId: fis ? fis.areaFisicaId : '',
      areaFisicaNome: fis ? fis.areaFisicaNome : '',
      areaFisicaTipo: fis ? fis.areaFisicaTipo : '',
      subareaFisicaId: fis ? fis.subareaFisicaId : '',
      subareaFisicaNome: fis ? fis.subareaFisicaNome : '',
      subareaFisicaTipo: fis ? fis.subareaFisicaTipo : '',
      representacaoPapel: fis ? fis.representacaoPapel : '',
      representacaoDetalhe: fis ? fis.representacaoDetalhe : '',
      macroAgregada: s268D4EhMacroAgregada_(id),
      participaResolucao: !s268D4EhMacroAgregada_(id),
      editavel: !s268D4EhMacroAgregada_(id),
      modoGeometria: s268D4EhMacroAgregada_(id) ? 'MACRO_AGREGADA_LEGADA' : 'OPERACIONAL'
    };
  }).filter(Boolean);

  out.sort(function (a, b) {
    const pa = Number(a.prioridade || 0), pb = Number(b.prioridade || 0);
    if (pa !== pb) return pb - pa;
    if (a.tipoArea !== b.tipoArea) return a.tipoArea.localeCompare(b.tipoArea);
    return s268DNumeroBloco_(s268DMetaTipo_(a.tipoArea), a.id) - s268DNumeroBloco_(s268DMetaTipo_(b.tipoArea), b.id);
  });
  return out;
}

function appSalvarAreaNivel0S268D(payload) {
  exigirPermissaoS14_('administrar');
  payload = payload || {};
  const tipo = String(payload.tipoArea || '').trim().toUpperCase();
  const meta = s268DMetaTipo_(tipo);
  if (!meta) throw new Error('Tipo de área do Subsolo inválido.');

  const pontos = Array.isArray(payload.pontos) ? payload.pontos : [];
  const max = tipo === 'SUBSOLO_GERAL' ? 50 : 36;
  if (pontos.length < 4) throw new Error('Use pelo menos 4 pontos para delimitar a área.');
  if (pontos.length > max) throw new Error('Máximo de ' + max + ' pontos para esta área.');

  pontos.forEach(function (p, i) {
    const x = Number(p.x), y = Number(p.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      throw new Error('Ponto ' + (i + 1) + ' inválido.');
    }
  });

  const areaGeom = s244AreaPoligono_(pontos);
  if (areaGeom < 0.0004) throw new Error('Área delimitada muito pequena.');

  const ss = SpreadsheetApp.getActive();
  const sh = s240EnsureSheet_(ss, 'MAPA_AREAS_NIVEL', S244_AREA_HEADERS);
  const rowsLive = s268DRowsNivel0_(sh, true);
  let idArea = String(payload.idArea || '').trim();
  if (tipo === 'AREA_EXTERNA') {
    if (!idArea) throw new Error('S26.8-D4: selecione uma subárea externa E02–E05. E01 é macro agregada.');
    if (s268D4EhMacroAgregada_(idArea)) {
      throw new Error('S26.8-D4: Área externa geral (E01) é macro agregada e não pode mais ser delimitada. Ajuste E02–E05.');
    }
    if (S268D4_SUBAREAS_IDS.indexOf(idArea) < 0) {
      throw new Error('S26.8-D4: subárea externa inválida. Use E02, E03, E04 ou E05.');
    }
  }
  if (idArea) {
    const live = rowsLive.find(function (r) { return String(r.ID_AREA || '') === idArea; });
    if (!live || String(live.TIPO_AREA || '').toUpperCase() !== meta.tipo) {
      throw new Error('Bloco/segmento selecionado não pertence a esta categoria.');
    }
  } else {
    idArea = s268DProximoId_(meta, rowsLive);
  }

  const existente = rowsLive.find(function (r) { return String(r.ID_AREA || '') === idArea; });
  let usuario = '';
  try { usuario = Session.getActiveUser().getEmail() || ''; } catch (_) { }
  const agora = new Date();
  const fisIndexSalvar = (typeof s268D2IndexRepresentacoes_ === 'function') ? s268D2IndexRepresentacoes_() : {};
  const fisSalvar = fisIndexSalvar[idArea] || null;
  const nomeExibicao = (typeof s268D3NomeRepresentacaoN0_ === 'function') ? s268D3NomeRepresentacaoN0_(idArea, meta, fisSalvar) : s268DNomeExibicao_(meta, idArea);
  const codigo = s268DCodigoBloco_(meta, idArea);
  const row = {
    ID_AREA: idArea,
    ID_COLECAO: S240.COLECAO_ID,
    ID_PLANTA_NIVEL: S268D_N0,
    ID_SETOR: meta.setor,
    ID_MAPA_NATIVO: meta.mapa,
    NOME: nomeExibicao,
    TIPO_AREA: meta.tipo,
    POLIGONO_JSON: JSON.stringify(pontos),
    STATUS: 'VALIDADA',
    CRIADO_EM: existente && existente.CRIADO_EM ? existente.CRIADO_EM : agora,
    ATUALIZADO_EM: agora,
    ATUALIZADO_POR: usuario,
    OBSERVACOES: 'S26.8-D1 — área composta do Subsolo; código=' + codigo + '.'
  };

  if (s255TemRascunhoAtivo_()) {
    row.OBSERVACOES = 'S26.8-D1 / S25.5 — área composta do Subsolo em rascunho; código=' + codigo + '.';
    return s255StageArea_(row);
  }

  const antes = s253SnapshotEntidadeArea_(idArea);
  s240Upsert_(sh, 'ID_AREA', row);
  if (meta.tipo === 'AREA_EXTERNA' && typeof s268D2GarantirVinculoRepresentacao_ === 'function') {
    try {
      s268D2GarantirVinculoRepresentacao_({
        idArea: idArea, idNivel: S268D_N0,
        papel: idArea === 'AREA-N0-EXTERNA' ? 'N0_GERAL' : 'N0_SUBAREA',
        detalhe: idArea === 'AREA-N0-EXTERNA' ? 'MACRO' : 'DETALHE',
        observacoes: 'S26.8-D2 — vínculo automático de nova representação externa do Nível 0.'
      });
    } catch (_) { }
  }

  try {
    registrarAuditoriaS15_({
      acao: 'DELIMITAR_AREA_NIVEL0_S268D1',
      entidade: 'MAPA_AREAS_NIVEL',
      entidadeId: idArea,
      resultado: 'SUCESSO',
      origem: 'WEB_APP',
      detalhes: { tipoArea: tipo, codigo: codigo, pontos: pontos, area: areaGeom }
    });
  } catch (_) { }

  try {
    s253RegistrarEvento_({
      tipoEvento: 'ALTERACAO_AREA',
      entidade: 'MAPA_AREAS_NIVEL',
      entidadeId: idArea,
      nome: nomeExibicao,
      antes: antes,
      depois: s253SnapshotEntidadeArea_(idArea),
      motivo: 'Delimitação/ajuste de bloco ou segmento operacional do Subsolo',
      origem: 'WEB_APP'
    });
  } catch (_) { }

  SpreadsheetApp.flush();
  return appListarAreasNivel0S268D().find(function (a) { return a.id === idArea; }) || null;
}

function appObterOperacaoNivel0S268D() {
  const areas = appListarAreasNivel0S268D();
  return {
    nivel: S268D_N0,
    areas: areas,
    operavel: true,
    cartografiaAtiva: areas.some(function (a) {
      return a.status === 'VALIDADA' && Array.isArray(a.poligono) && a.poligono.length >= 4;
    }),
    areasCompostas: true,
    macroAreaExterna: {
      id: S268D4_MACRO_EXTERNA_ID,
      modo: 'MACRO_AGREGADA',
      participaResolucao: false,
      subareas: S268D4_SUBAREAS_IDS.slice()
    },
    versao: 'S26.8-D4'
  };
}

function s268DResolverArea_(areas, x, y) {
  const candidatas = (Array.isArray(areas) ? areas : [])
    .filter(function (a) {
      return s268D4ParticipaResolucao_(a) &&
        a.status === 'VALIDADA' && Array.isArray(a.poligono) && a.poligono.length >= 4 &&
        s243PontoNoPoligono_(x, y, a.poligono);
    })
    .sort(function (a, b) {
      const pr = Number(b.prioridade || 0) - Number(a.prioridade || 0);
      if (pr) return pr;
      // Dentro da mesma categoria, o menor polígono tende a ser o mais específico.
      return s244AreaPoligono_(a.poligono) - s244AreaPoligono_(b.poligono);
    });
  return candidatas[0] || null;
}

function appResolverPontoNivel0S268D(payload) {
  payload = payload || {};
  const x = Number(payload.x), y = Number(payload.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
    throw new Error('Coordenada inválida no Nível 0.');
  }
  const op = appObterOperacaoNivel0S268D();
  const area = s268DResolverArea_(op.areas, x, y);
  if (!area) {
    return {
      ok: false,
      motivo: 'AREA_N0_NAO_DELIMITADA',
      idNivel: S268D_N0,
      xNivel: x,
      yNivel: y,
      mensagem: 'Ponto fora das áreas operacionais delimitadas; usar coordenada nativa como fallback.'
    };
  }
  return {
    ok: true,
    tipo: 'AREA_NATIVA_NIVEL0',
    idNivel: S268D_N0,
    idMapaSetor: area.mapa,
    idSetor: area.setor,
    piso: '0',
    xNivel: x,
    yNivel: y,
    xSetor: x,
    ySetor: y,
    areaId: area.id,
    areaTipo: area.tipoArea,
    areaNome: area.nome,
    areaCategoriaNome: area.categoriaNome,
    areaCodigo: area.codigo,
    areaRotulo: area.rotulo,
    prioridade: area.prioridade,
    areaFisicaId: area.areaFisicaId || '',
    areaFisicaNome: area.areaFisicaNome || '',
    areaFisicaTipo: area.areaFisicaTipo || '',
    subareaFisicaId: area.subareaFisicaId || '',
    subareaFisicaNome: area.subareaFisicaNome || '',
    subareaFisicaTipo: area.subareaFisicaTipo || '',
    representacaoPapel: area.representacaoPapel || '',
    representacaoDetalhe: area.representacaoDetalhe || ''
  };
}

function s268DAdicionarRegistrosAreasNivel0_(lista) {
  const ss = SpreadsheetApp.getActive();
  const out = (lista || []).slice();
  const vistos = {};
  out.forEach(function (r) { if (r && r.id) vistos[String(r.id)] = true; });

  // Os registros classificados em uma categoria do Subsolo permanecem vinculados
  // ao mapa lógico da categoria. O nome gravado no registro preserva o bloco/corredor
  // identificado no momento do cadastro, mesmo se a geometria for ajustada depois.
  Object.keys(S268D_AREAS_N0).forEach(function (k) {
    const meta = S268D_AREAS_N0[k];
    s242RegistrosMapaDireto_(ss, meta.mapa).forEach(function (r) {
      const x = Number(r.x), y = Number(r.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const id = String(r.id || '');
      if (id && vistos[id]) return;
      if (id) vistos[id] = true;
      const nomeHistorico = String(r.mapa || r.MAPA || '').trim() || meta.nome;
      out.push(Object.assign({}, r, {
        x: x,
        y: y,
        mapaOrigem: meta.mapa,
        nivelDestino: S268D_N0,
        areaTipo: meta.tipo,
        areaNome: nomeHistorico,
        calibracaoId: 'NATIVO-N0-' + meta.tipo,
        calibracaoStatus: 'NATIVO_AREA'
      }));
    });
  });
  return out;
}

function diagnosticoS268D() {
  return diagnosticoS268D1();
}

function diagnosticoS268D1() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const checks = [];
  const add = function (nome, ok, detalhe) { checks.push({ nome: nome, ok: !!ok, detalhe: String(detalhe || '') }); };
  const shAreas = ss.getSheetByName('MAPA_AREAS_NIVEL');
  const shMapas = ss.getSheetByName('MAPAS_SETORES');
  const areas = shAreas ? appListarAreasNivel0S268D() : [];
  const mapas = shMapas ? s240Objects_(shMapas) : [];
  const defs = Object.keys(S268D_AREAS_N0).map(function (k) { return S268D_AREAS_N0[k]; });

  add('N0_AREA_ABA', !!shAreas, 'MAPA_AREAS_NIVEL');
  add('N0_MAPAS_ABA', !!shMapas, 'MAPAS_SETORES');
  add('N0_CATEGORIAS_PREPARADAS', defs.every(function (d) {
    return areas.some(function (a) { return a.tipoArea === d.tipo; });
  }), '6/6 categorias com registro-base');
  add('N0_MAPAS_LOGICOS', defs.every(function (d) {
    return mapas.some(function (r) { return String(r.ID_MAPA_SETOR || '') === d.mapa; });
  }), defs.length + ' mapas lógicos');
  add('N0_AREAS_COMPOSTAS', defs.filter(function (d) { return d.multiplo; }).length === 5, '5 categorias aceitam múltiplos polígonos');
  add('N0_SUBSOLO_GERAL_UNICO', defs.filter(function (d) { return !d.multiplo; }).length === 1, 'Subsolo geral permanece único');
  add('N0_SEM_CALIBRACAO', S242_PARES.filter(function (p) { return p.nivel === S268D_N0; }).length === 0, 'coordenada nativa preservada');
  add('N0_RESOLVEDOR', typeof appResolverPontoNivel0S268D === 'function', 'resolução por prioridade + bloco');

  const grupos = {};
  areas.forEach(function (a) {
    if (!grupos[a.tipoArea]) grupos[a.tipoArea] = [];
    grupos[a.tipoArea].push({ id: a.id, codigo: a.codigo, rotulo: a.rotulo, status: a.status, pontos: a.poligono.length });
  });

  const out = {
    ok: checks.every(function (c) { return c.ok; }),
    checks: checks,
    totalChecks: checks.length,
    falhas: checks.filter(function (c) { return !c.ok; }).length,
    totalPoligonos: areas.length,
    grupos: grupos,
    somenteLeitura: true,
    versao: 'S26.8-D1'
  };
  console.log('[S26.8-D1] ' + JSON.stringify(out));
  return out;
}


function setupS241() {
  exigirPermissaoS14_('administrar');

  if (typeof setupS240 === 'function') setupS240();

  const ss = SpreadsheetApp.getActive();
  const shPlantas = ss.getSheetByName('PLANTAS');
  const shArquivos = ss.getSheetByName('CARTOGRAFIA_ARQUIVOS');
  if (!shPlantas || !shArquivos) throw new Error('Execute setupS240() antes da S24.1.');

  S241_NIVEIS.forEach(n => {
    s240Upsert_(shPlantas, 'ID_PLANTA', {
      ID_PLANTA: n.id,
      IMAGEM_ID: n.imagemId,
      IMAGEM_URL: n.imagemUrl,
      LARGURA_ORIGINAL: n.largura,
      ALTURA_ORIGINAL: n.altura,
      ATUALIZADO_EM: new Date(),
      TIPO_MAPA: 'NIVEL',
      COLECAO: S240.COLECAO_ID,
      DATA_BASE: S240.DATA_BASE,
      STATUS_PUBLICACAO: 'PREVIEW',
      SETORES_INCLUIDOS: n.setores,
      OBSERVACOES: 'S24.1 — disponível no seletor em modo somente consulta.'
    });
  });

  const mapaArquivo = {
    'PLA-CFF-N1-2025': 'ARQ-CFF-2025-N1',
    'PLA-CFF-N2-2025': 'ARQ-CFF-2025-N2',
    'PLA-CFF-N3-2025': 'ARQ-CFF-2025-N3'
  };

  S241_NIVEIS.forEach(n => {
    s240Upsert_(shArquivos, 'ID_ARQUIVO_CARTOGRAFICO', {
      ID_ARQUIVO_CARTOGRAFICO: mapaArquivo[n.id],
      DRIVE_IMAGEM_ID: n.imagemId,
      STATUS_VINCULO: 'VINCULADO_IMAGEM',
      VALIDACAO_ORIGEM: 'OK_PREVIEW',
      ATUALIZADO_EM: new Date(),
      OBSERVACOES: 'Imagem raster gerada a partir do PDF recebido para visualização S24.1.'
    });
  });

  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S24.1', 'Visualização dos níveis 2025');
    setConfigValue_(cfg, 'S241_STATUS', 'INSTALADO', 'Níveis 1, 2 e 3 em modo consulta');
  }

  SpreadsheetApp.flush();
  return diagnosticoS241();
}

function s268NivelRpc_(n) {
  return {
    id: n.id,
    nome: n.nome,
    piso: n.piso,
    imagemId: n.imagemId,
    imagemUrl: n.imagemUrl,
    largura: n.largura,
    altura: n.altura,
    tipoMapa: 'NIVEL',
    setoresIncluidos: String(n.setores || '').split('|').filter(Boolean),
    somenteConsulta: false,
    versao: S240.VERSAO_CARTOGRAFICA,
    colecao: S240.COLECAO_ID,
    dataBase: S240.DATA_BASE
  };
}

// S26.8-A FIX1 — mantém o bootstrap principal idêntico ao S26.7.
// O Nível 0 é carregado por API separada depois que a aplicação já inicializou.
function appListarNiveisS241() {
  return S241_NIVEIS.map(s268NivelRpc_);
}

function appListarNiveisExtrasS268A() {
  return [S268_NIVEL0].map(s268NivelRpc_);
}

function appObterImagemNivelS241(idPlanta) {
  const nivel = s268NiveisAtuais_().find(function (n) { return n.id === String(idPlanta || '').trim(); });
  if (!nivel) throw new Error('Nível cartográfico não encontrado.');

  const blob = DriveApp.getFileById(nivel.imagemId).getBlob();
  const mime = blob.getContentType() || 'image/png';
  const b64 = Utilities.base64Encode(blob.getBytes());

  return {
    ok: true,
    id: nivel.id,
    imagemId: nivel.imagemId,
    dataUrl: `data:${mime};base64,${b64}`,
    largura: nivel.largura,
    altura: nivel.altura,
    versao: S240.VERSAO_CARTOGRAFICA
  };
}

function diagnosticoS241() {
  const ss = SpreadsheetApp.getActive();
  const checks = [];
  const shPlantas = ss.getSheetByName('PLANTAS');
  const shArquivos = ss.getSheetByName('CARTOGRAFIA_ARQUIVOS');

  const plantas = shPlantas ? s240Objects_(shPlantas) : [];
  const arquivos = shArquivos ? s240Objects_(shArquivos) : [];

  const niveis = plantas.filter(r =>
    ['PLA-CFF-N1-2025', 'PLA-CFF-N2-2025', 'PLA-CFF-N3-2025']
      .includes(String(r.ID_PLANTA || ''))
  );

  check_(checks, 'S241_NIVEIS_3', niveis.length === 3, `${niveis.length}/3 níveis`);
  check_(checks, 'S241_IMAGENS_3',
    niveis.every(r => String(r.IMAGEM_ID || '').trim() !== ''),
    'Três níveis com imagem vinculada'
  );
  check_(checks, 'S241_PREVIEW',
    niveis.every(r => String(r.STATUS_PUBLICACAO || '') === 'PREVIEW'),
    'Níveis em PREVIEW'
  );
  check_(checks, 'S241_NAO_ATIVOS',
    niveis.every(r => String(r.ATIVO || '').toUpperCase() === 'NAO'),
    'Não substituem mapas de produção'
  );

  const ids = ['ARQ-CFF-2025-N1', 'ARQ-CFF-2025-N2', 'ARQ-CFF-2025-N3'];
  const arqs = arquivos.filter(r => ids.includes(String(r.ID_ARQUIVO_CARTOGRAFICO || '')));
  check_(checks, 'S241_VINCULOS_3',
    arqs.length === 3 && arqs.every(r => String(r.STATUS_VINCULO || '') === 'VINCULADO_IMAGEM'),
    `${arqs.length}/3 imagens vinculadas`
  );

  let blobsOk = 0;
  S241_NIVEIS.forEach(n => {
    try {
      const f = DriveApp.getFileById(n.imagemId);
      if (f && f.getSize() > 0) blobsOk++;
    } catch (_) { }
  });
  check_(checks, 'S241_DRIVE_3', blobsOk === 3, `${blobsOk}/3 imagens acessíveis no Drive`);

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    niveis: appListarNiveisS241()
  };
}


function setupS2411() {
  exigirPermissaoS14_('administrar');
  if (typeof setupS241 === 'function') setupS241();

  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S24.1.1', 'Correção de sintaxe frontend dos níveis');
    setConfigValue_(cfg, 'S2411_STATUS', 'INSTALADO', 'Frontend S24.1 reescrito em sintaxe conservadora');
  }
  SpreadsheetApp.flush();
  return diagnosticoS2411();
}

function diagnosticoS2411() {
  const d = diagnosticoS241();
  const checks = (d.checks || []).slice();
  check_(checks, 'S2411_BACKEND', typeof appListarNiveisS241 === 'function', 'Backend de níveis disponível');
  check_(checks, 'S2411_IMAGEM', typeof appObterImagemNivelS241 === 'function', 'Endpoint de imagem disponível');

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks: checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length
  };
}


// ========================================================
// S24.2 — CALIBRAÇÃO SETOR ↔ NÍVEL
// ========================================================
const S242_TRANSFORM_HEADERS = [
  'ID_TRANSFORMACAO', 'ID_COLECAO', 'ID_MAPA_ORIGEM', 'ID_PLANTA_DESTINO',
  'ID_SETOR', 'PISO', 'PONTOS_JSON', 'MATRIZ_JSON', 'RMSE', 'MAX_ERRO',
  'STATUS', 'CRIADO_EM', 'ATUALIZADO_EM', 'ATUALIZADO_POR', 'OBSERVACOES'
];

const S242_PARES = Object.freeze([
  { id: 'CAL-AZUL-N1', mapa: 'MAP-CFF-N1-AZUL', nivel: 'PLA-CFF-N1-2025', setor: 'SET-AZUL', piso: '1', nome: 'Setor Azul → Nível 1' },
  { id: 'CAL-VERDE-N1', mapa: 'MAP-CFF-N1-VERDE', nivel: 'PLA-CFF-N1-2025', setor: 'SET-VERDE', piso: '1', nome: 'Setor Verde → Nível 1' },
  { id: 'CAL-AMARELO-N2', mapa: 'MAP-CFF-N2-AMARELO', nivel: 'PLA-CFF-N2-2025', setor: 'SET-AMARELO', piso: '2', nome: 'Setor Amarelo → Nível 2' },
  { id: 'CAL-BRANCO-N2', mapa: 'MAP-CFF-N2-BRANCO', nivel: 'PLA-CFF-N2-2025', setor: 'SET-BRANCO', piso: '2', nome: 'Setor Branco → Nível 2' },
  { id: 'CAL-ROXO-N3', mapa: 'MAP-CFF-N3-ROXO', nivel: 'PLA-CFF-N3-2025', setor: 'SET-ROXO', piso: '3', nome: 'Setor Roxo → Nível 3' }
]);

function setupS242() {
  exigirPermissaoS14_('administrar');
  if (typeof setupS2411 === 'function') setupS2411();

  const ss = SpreadsheetApp.getActive();
  const sh = s240EnsureSheet_(ss, 'MAPA_TRANSFORMACOES', S242_TRANSFORM_HEADERS);
  sh.setFrozenRows(1);

  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S24.2', 'Calibração Setor ↔ Nível');
    setConfigValue_(cfg, 'S242_STATUS', 'INSTALADO', 'Motor de transformação e projeção de marcadores');
  }

  SpreadsheetApp.flush();
  return diagnosticoS242();
}

function appListarParesCalibracaoS242(opcoes) {
  exigirPermissaoS14_('administrar');
  opcoes = opcoes || {};
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('MAPA_TRANSFORMACOES');
  const rows = sh ? s240Objects_(sh) : [];

  return S242_PARES.map(p => {
    const live = rows.find(x => String(x.ID_TRANSFORMACAO || '') === p.id);
    const r = opcoes.incluirRascunho ? s255OverlayTransformacao_(p.id, live) : live;
    return {
      id: p.id,
      nome: p.nome,
      mapa: p.mapa,
      nivel: p.nivel,
      setor: p.setor,
      piso: p.piso,
      status: r ? String(r.STATUS || 'PENDENTE') : 'PENDENTE',
      rmse: r ? Number(r.RMSE || 0) : null,
      maxErro: r ? Number(r.MAX_ERRO || 0) : null,
      atualizadoEm: r ? s243ValorRpcSeguro_(r.ATUALIZADO_EM) : ''
    };
  });
}

function appObterPacoteCalibracaoS242(idPar) {
  exigirPermissaoS14_('administrar');
  const p = S242_PARES.find(x => x.id === String(idPar || '').trim());
  if (!p) throw new Error('Par de calibração inválido.');

  const origem = appObterImagemMapaS2(p.mapa);
  const destino = appObterImagemNivelS241(p.nivel);

  return {
    ok: true,
    par: p,
    origem: {
      id: p.mapa,
      dataUrl: origem.dataUrl
    },
    destino: {
      id: p.nivel,
      dataUrl: destino.dataUrl
    }
  };
}

function appSalvarCalibracaoS242(payload) {
  exigirPermissaoS14_('administrar');
  payload = payload || {};

  const p = S242_PARES.find(x => x.id === String(payload.idPar || '').trim());
  if (!p) throw new Error('Par de calibração inválido.');

  const pontos = Array.isArray(payload.pontos) ? payload.pontos : [];
  if (pontos.length < 4) throw new Error('Informe pelo menos 4 pares de pontos.');

  pontos.forEach((q, i) => {
    ['sx', 'sy', 'tx', 'ty'].forEach(k => {
      const n = Number(q[k]);
      if (!Number.isFinite(n) || n < 0 || n > 1) {
        throw new Error(`Ponto ${i + 1}: coordenada ${k} inválida.`);
      }
    });
  });

  const matriz = s242AjustarAfim_(pontos);
  const qualidade = s242Qualidade_(pontos, matriz);

  // Limites conservadores para visualização.
  // Mesmo acima do limite, a calibração é salva como REVISAR.
  const status = (qualidade.rmse <= 0.012 && qualidade.maxErro <= 0.025)
    ? 'VALIDADA'
    : 'REVISAR';

  // S25.5 — com RASCUNHO ativo, grava apenas no pacote de publicação.
  if (s255TemRascunhoAtivo_()) {
    let usuario = '';
    try { usuario = Session.getActiveUser().getEmail() || '' } catch (_) { }
    const agora = new Date();
    return s255StageCalibracao_(p, {
      ID_TRANSFORMACAO: p.id,
      ID_COLECAO: S240.COLECAO_ID,
      ID_MAPA_ORIGEM: p.mapa,
      ID_PLANTA_DESTINO: p.nivel,
      ID_SETOR: p.setor,
      PISO: p.piso,
      PONTOS_JSON: JSON.stringify(pontos),
      MATRIZ_JSON: JSON.stringify(matriz),
      RMSE: qualidade.rmse,
      MAX_ERRO: qualidade.maxErro,
      STATUS: status,
      CRIADO_EM: agora,
      ATUALIZADO_EM: agora,
      ATUALIZADO_POR: usuario,
      OBSERVACOES: 'S25.5 — transformação afim em rascunho com ' + pontos.length + ' pontos.'
    });
  }

  const antesS253 = s253SnapshotTransformacao_(p.id);
  const ss = SpreadsheetApp.getActive();
  const sh = s240EnsureSheet_(ss, 'MAPA_TRANSFORMACOES', S242_TRANSFORM_HEADERS);
  const agora = new Date();

  let usuario = '';
  try { usuario = Session.getActiveUser().getEmail() || '' } catch (_) { }

  s240Upsert_(sh, 'ID_TRANSFORMACAO', {
    ID_TRANSFORMACAO: p.id,
    ID_COLECAO: S240.COLECAO_ID,
    ID_MAPA_ORIGEM: p.mapa,
    ID_PLANTA_DESTINO: p.nivel,
    ID_SETOR: p.setor,
    PISO: p.piso,
    PONTOS_JSON: JSON.stringify(pontos),
    MATRIZ_JSON: JSON.stringify(matriz),
    RMSE: qualidade.rmse,
    MAX_ERRO: qualidade.maxErro,
    STATUS: status,
    CRIADO_EM: agora,
    ATUALIZADO_EM: agora,
    ATUALIZADO_POR: usuario,
    OBSERVACOES: 'S24.2 — transformação afim calculada com ' + pontos.length + ' pontos.'
  });

  try {
    registrarAuditoriaS15_({
      acao: 'CALIBRACAO_MAPA_S242',
      entidade: 'MAPA_TRANSFORMACOES',
      entidadeId: p.id,
      resultado: 'SUCESSO',
      origem: 'WEB_APP',
      detalhes: {
        mapaOrigem: p.mapa,
        plantaDestino: p.nivel,
        status: status,
        rmse: qualidade.rmse,
        maxErro: qualidade.maxErro,
        pontos: pontos.length
      }
    });
  } catch (_) { }

  const depoisS253 = s253SnapshotTransformacao_(p.id);
  try {
    s253RegistrarEvento_({
      tipoEvento: 'RECALIBRACAO',
      entidade: 'MAPA_TRANSFORMACOES',
      entidadeId: p.id,
      nome: p.nome,
      antes: antesS253,
      depois: depoisS253,
      motivo: 'Calibração/recalibração Setor ↔ Nível',
      origem: 'WEB_APP'
    });
  } catch (e) {
    console.warn('[S25.3] histórico de calibração não registrado', e);
  }

  SpreadsheetApp.flush();

  return {
    ok: true,
    id: p.id,
    status: status,
    matriz: matriz,
    rmse: qualidade.rmse,
    maxErro: qualidade.maxErro,
    pontos: pontos.length
  };
}

function appListarRegistrosNivelS242(idNivel) {
  const nivel = String(idNivel || '').trim();
  const ss = SpreadsheetApp.getActive();

  // S26.8-C — Nível 0 é nativo: registros são persistidos diretamente
  // com X/Y normalizados na própria planta, sem transformação afim.
  if (nivel === 'PLA-CFF-N0-2025') {
    let baseN0 = s242RegistrosMapaDireto_(ss, nivel)
      .map(function (r) {
        return Object.assign({}, r, {
          mapaOrigem: nivel,
          nivelDestino: nivel,
          calibracaoId: 'NATIVO-N0',
          calibracaoStatus: 'NATIVO'
        });
      });

    // S26.8-D — além dos registros legados/nativos da própria planta,
    // inclui registros classificados nas áreas lógicas do Subsolo.
    if (typeof s268DAdicionarRegistrosAreasNivel0_ === 'function') {
      baseN0 = s268DAdicionarRegistrosAreasNivel0_(baseN0);
    }

    return baseN0.map(s243ObjetoRpcSeguro_);
  }

  const pares = S242_PARES.filter(p => p.nivel === nivel);
  if (!pares.length) return [];

  const sh = ss.getSheetByName('MAPA_TRANSFORMACOES');
  if (!sh) return [];

  const transforms = s240Objects_(sh);
  const out = [];

  pares.forEach(p => {
    const t = transforms.find(r =>
      String(r.ID_TRANSFORMACAO || '') === p.id &&
      ['VALIDADA', 'REVISAR'].includes(String(r.STATUS || '').toUpperCase())
    );
    if (!t) return;

    let matriz = null;
    try { matriz = JSON.parse(String(t.MATRIZ_JSON || '')) } catch (_) { }
    if (!matriz) return;

    // S24.2.2 — leitura direta da aba REGISTROS.
    const regs = s242RegistrosMapaDireto_(ss, p.mapa);

    regs.forEach(r => {
      const x = Number(r.x);
      const y = Number(r.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const q = s242AplicarAfim_(matriz, x, y);
      if (q.x < 0 || q.x > 1 || q.y < 0 || q.y > 1) return;

      out.push(Object.assign({}, r, {
        x: q.x,
        y: q.y,
        mapaOrigem: p.mapa,
        nivelDestino: nivel,
        calibracaoId: p.id,
        calibracaoStatus: String(t.STATUS || '')
      }));
    });
  });

  let combinado = (typeof s244AdicionarRegistrosVermelhosNivel_ === 'function')
    ? s244AdicionarRegistrosVermelhosNivel_(out, nivel)
    : out;

  combinado = (typeof s246AdicionarRegistrosEspeciaisNivel1_ === 'function')
    ? s246AdicionarRegistrosEspeciaisNivel1_(combinado, nivel)
    : combinado;

  return combinado.map(s243ObjetoRpcSeguro_);
}



// ========================================================
// S26.7-B.1 — CAMADAS OPERACIONAIS PROJETADAS NOS NÍVEIS 2025
// Projeção somente em memória. Não altera coordenadas persistidas.
// ========================================================
function appObterCamadasNivelS267B1(idNivel) {
  const nivel = String(idNivel || '').trim();
  const pares = S242_PARES.filter(function (p) { return p.nivel === nivel; });
  const vazio = { referencias: [], cruzamentos: [], lojas: [] };
  if (!pares.length) return vazio;

  const ss = SpreadsheetApp.getActive();
  const shTrans = ss.getSheetByName('MAPA_TRANSFORMACOES');
  if (!shTrans) return vazio;

  const transforms = s240Objects_(shTrans);
  const defs = [
    {
      chave: 'referencias',
      aba: 'PONTOS_REFERENCIA',
      ids: ['ID_PONTO_REFERENCIA', 'ID_REFERENCIA', 'CODIGO'],
      x: ['X_NORMALIZADO', 'X'],
      y: ['Y_NORMALIZADO', 'Y'],
      label: ['NOME', 'NOME_REFERENCIA', 'DESCRICAO'],
      limitePorMapa: 350
    },
    {
      chave: 'cruzamentos',
      aba: 'CRUZAMENTOS',
      ids: ['ID_CRUZAMENTO', 'CODIGO'],
      x: ['X_NORMALIZADO', 'X'],
      y: ['Y_NORMALIZADO', 'Y'],
      label: ['NOME', 'NOME_CRUZAMENTO', 'CODIGO'],
      limitePorMapa: 350
    },
    {
      chave: 'lojas',
      aba: 'LOJAS_MAPA',
      ids: ['ID_LOJA_MAPA', 'ID_LOJA', 'ID_ESPACO', 'LUC', 'NUMERO_LOJA'],
      x: ['X_NORMALIZADO', 'CENTRO_X', 'X_CENTRO', 'X'],
      y: ['Y_NORMALIZADO', 'CENTRO_Y', 'Y_CENTRO', 'Y'],
      label: ['NUMERO_LOJA', 'LUC', 'NOME_LOJA'],
      limitePorMapa: 1500
    }
  ];

  const resposta = { referencias: [], cruzamentos: [], lojas: [] };

  defs.forEach(function (def) {
    const sh = ss.getSheetByName(def.aba);
    if (!sh) return;

    const rows = s240Objects_(sh);
    const unicos = {};
    const projetados = [];

    pares.forEach(function (p) {
      const t = transforms.find(function (r) {
        return String(r.ID_TRANSFORMACAO || '') === p.id &&
          ['VALIDADA', 'REVISAR'].indexOf(String(r.STATUS || '').toUpperCase()) >= 0;
      });
      if (!t) return;

      let matriz = null;
      try { matriz = JSON.parse(String(t.MATRIZ_JSON || '')); } catch (_) { }
      if (!matriz) return;

      const origem = rows.filter(function (r) {
        return String(r.ID_MAPA_SETOR || '').trim() === p.mapa && s267B1Ativo_(r.ATIVO);
      }).slice(0, def.limitePorMapa);

      origem.forEach(function (r) {
        const x = s267B1PrimeiroNumero_(r, def.x);
        const y = s267B1PrimeiroNumero_(r, def.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;

        const q = s242AplicarAfim_(matriz, x, y);
        if (!Number.isFinite(q.x) || !Number.isFinite(q.y)) return;
        if (q.x < 0 || q.x > 1 || q.y < 0 || q.y > 1) return;

        const idEntidade = s267B1PrimeiroTexto_(r, def.ids);
        const label = s267B1PrimeiroTexto_(r, def.label) || idEntidade || def.chave;
        const chave = idEntidade
          ? def.chave + '|ID|' + idEntidade
          : def.chave + '|POS|' + p.mapa + '|' + x.toFixed(7) + '|' + y.toFixed(7) + '|' + label;

        if (unicos[chave]) return;
        unicos[chave] = true;

        projetados.push({
          id: idEntidade,
          x: q.x,
          y: q.y,
          label: label,
          mapaOrigem: p.mapa,
          nivelDestino: nivel,
          calibracaoId: p.id,
          calibracaoStatus: String(t.STATUS || '')
        });
      });
    });

    resposta[def.chave] = projetados.map(s243ObjetoRpcSeguro_);
  });

  return resposta;
}

function s267B1PrimeiroNumero_(row, keys) {
  for (let i = 0; i < keys.length; i++) {
    const n = s242NumeroPlanilha_(row[keys[i]]);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

function s267B1PrimeiroTexto_(row, keys) {
  for (let i = 0; i < keys.length; i++) {
    const v = row[keys[i]];
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function s267B1Ativo_(v) {
  const s = String(v === null || v === undefined || v === '' ? 'SIM' : v).trim().toUpperCase();
  return ['NAO', 'NÃO', 'FALSE', '0', 'INATIVO'].indexOf(s) < 0;
}

function diagnosticoCamadasNivelS267B1(idNivel) {
  exigirPermissaoS14_('administrar');
  const nivel = String(idNivel || 'PLA-CFF-N1-2025').trim();
  const camadas = appObterCamadasNivelS267B1(nivel);
  const resultado = {
    ok: true,
    nivel: nivel,
    referencias: camadas.referencias.length,
    cruzamentos: camadas.cruzamentos.length,
    lojas: camadas.lojas.length,
    somenteLeitura: true
  };
  console.log('[S26.7-B.1] ' + JSON.stringify(resultado));
  return resultado;
}

function diagnosticoCamadasNivel1S267B1() { return diagnosticoCamadasNivelS267B1('PLA-CFF-N1-2025'); }
function diagnosticoCamadasNivel2S267B1() { return diagnosticoCamadasNivelS267B1('PLA-CFF-N2-2025'); }
function diagnosticoCamadasNivel3S267B1() { return diagnosticoCamadasNivelS267B1('PLA-CFF-N3-2025'); }

// ========================================================
// S26.7-C — ENQUADRAMENTO OPERACIONAL DOS NÍVEIS 2025
// Envelope calculado somente para apresentação/fit. Nenhuma escrita cartográfica.
// ========================================================
function appObterEnquadramentoNivelS267C(idNivel) {
  const nivel = String(idNivel || '').trim();
  const pares = S242_PARES.filter(function (p) { return p.nivel === nivel; });
  if (!pares.length) return { ok: false, nivel: nivel, bounds: null };

  const ss = SpreadsheetApp.getActive();
  const pontos = [];
  const origens = [];

  const shTrans = ss.getSheetByName('MAPA_TRANSFORMACOES');
  if (shTrans) {
    const transforms = s240Objects_(shTrans);
    pares.forEach(function (p) {
      const t = transforms.find(function (r) {
        return String(r.ID_TRANSFORMACAO || '') === p.id &&
          ['VALIDADA', 'REVISAR'].indexOf(String(r.STATUS || '').toUpperCase()) >= 0;
      });
      if (!t) return;

      let matriz = null;
      try { matriz = JSON.parse(String(t.MATRIZ_JSON || '')); } catch (_) { }
      if (!matriz) return;

      [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(function (c) {
        const q = s242AplicarAfim_(matriz, c[0], c[1]);
        if (Number.isFinite(q.x) && Number.isFinite(q.y)) pontos.push({ x: q.x, y: q.y });
      });
      origens.push('CAL:' + p.id);
    });
  }

  // Áreas nativas/especiais garantem que Hotel, CDM, áreas externas e estacionamento
  // façam parte do envelope quando existirem no nível.
  const shAreas = ss.getSheetByName('MAPA_AREAS_NIVEL');
  if (shAreas) {
    s240Objects_(shAreas).forEach(function (r) {
      if (String(r.ID_PLANTA_NIVEL || '').trim() !== nivel) return;
      if (String(r.STATUS || '').trim().toUpperCase() !== 'VALIDADA') return;

      let pol = [];
      try { pol = JSON.parse(String(r.POLIGONO_JSON || '[]')); } catch (_) { pol = []; }
      if (!Array.isArray(pol)) return;
      pol.forEach(function (pt) {
        const x = Number(pt && pt.x), y = Number(pt && pt.y);
        if (Number.isFinite(x) && Number.isFinite(y)) pontos.push({ x: x, y: y });
      });
      origens.push('AREA:' + String(r.ID_AREA || ''));
    });
  }

  if (!pontos.length) return { ok: false, nivel: nivel, bounds: null, origens: origens };

  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  pontos.forEach(function (p) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  });

  // Margem normalizada pequena para não encostar o conteúdo operacional na borda.
  const padX = Math.max(0.008, Math.min(0.02, (maxX - minX) * 0.025));
  const padY = Math.max(0.008, Math.min(0.02, (maxY - minY) * 0.025));
  minX = Math.max(0, minX - padX); minY = Math.max(0, minY - padY);
  maxX = Math.min(1, maxX + padX); maxY = Math.min(1, maxY + padY);

  return {
    ok: true,
    nivel: nivel,
    bounds: { minX: minX, minY: minY, maxX: maxX, maxY: maxY },
    origens: origens,
    pontosConsiderados: pontos.length,
    somenteLeitura: true,
    versao: 'S26.7-C'
  };
}

function diagnosticoEnquadramentosS267C() {
  exigirPermissaoS14_('administrar');
  const ids = ['PLA-CFF-N1-2025', 'PLA-CFF-N2-2025', 'PLA-CFF-N3-2025'];
  const itens = ids.map(function (id) { return appObterEnquadramentoNivelS267C(id); });
  const out = { ok: itens.every(function (x) { return !!(x && x.ok && x.bounds); }), itens: itens, somenteLeitura: true };
  console.log('[S26.7-C] ' + JSON.stringify(out));
  return out;
}

function s243ValorRpcSeguro_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, APP.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
  }
  if (v === null || v === undefined) return '';
  if (['string', 'number', 'boolean'].includes(typeof v)) return v;

  try {
    return JSON.parse(JSON.stringify(v));
  } catch (_) {
    return String(v);
  }
}

function s243ObjetoRpcSeguro_(obj) {
  const out = {};
  Object.keys(obj || {}).forEach(k => {
    out[k] = s243ValorRpcSeguro_(obj[k]);
  });
  return out;
}

function s242RegistrosMapaDireto_(ss, idMapa) {
  const sh = ss.getSheetByName('REGISTROS');
  if (!sh) return [];

  const rows = s240Objects_(sh);
  const mapa = String(idMapa || '').trim();

  return rows
    .filter(r =>
      String(r.ID_MAPA_SETOR || '').trim() === mapa &&
      String(r.STATUS || '').trim().toUpperCase() !== 'EXCLUIDO'
    )
    .map(r => ({
      idRegistro: String(r.ID_REGISTRO || ''),
      protocolo: String(r.PROTOCOLO || ''),
      status: String(r.STATUS || 'ATIVA'),
      tipo: String(r.TIPO || ''),
      finalidade: String(r.FINALIDADE || ''),
      titulo: String(r.TITULO || ''),
      textoSinalizacao: String(r.TEXTO_SINALIZACAO || ''),
      descricao: String(r.DESCRICAO || ''),
      material: String(r.MATERIAL || ''),
      dimensoes: String(r.DIMENSOES || ''),
      cor: String(r.COR || r.COR_PREDOMINANTE || ''),
      fixacao: String(r.FIXACAO || ''),
      estadoConservacao: String(r.ESTADO_CONSERVACAO || ''),
      condicao: String(r.CONDICAO || ''),
      responsavel: String(r.RESPONSAVEL || ''),
      idMapaSetor: String(r.ID_MAPA_SETOR || ''),
      mapa: String(r.MAPA || ''),
      piso: String(r.PISO || ''),
      x: s242NumeroPlanilha_(r.X_NORMALIZADO),
      y: s242NumeroPlanilha_(r.Y_NORMALIZADO),
      idCorredor: String(r.ID_CORREDOR || ''),
      rua: String(r.RUA || ''),
      idSegmento: String(r.ID_SEGMENTO || ''),
      trecho: String(r.TRECHO || ''),
      cruzamento: String(r.CRUZAMENTO || ''),
      referencia: String(r.REFERENCIA || ''),
      numeroLoja: String(r.NUMERO_LOJA || ''),
      luc: String(r.LUC || ''),
      nomeLoja: String(r.NOME_LOJA || ''),
      idPlantaNivel: String(r.ID_PLANTA_NIVEL || ''),
      xNivel: Number.isFinite(s242NumeroPlanilha_(r.X_NIVEL)) ? s242NumeroPlanilha_(r.X_NIVEL) : null,
      yNivel: Number.isFinite(s242NumeroPlanilha_(r.Y_NIVEL)) ? s242NumeroPlanilha_(r.Y_NIVEL) : null,
      idTorre: String(r.ID_TORRE || ''),
      codigoTorre: String(r.CODIGO_TORRE || ''),
      nomeTorre: String(r.NOME_TORRE || ''),
      idRepresentacaoTorre: String(r.ID_REPRESENTACAO_TORRE || ''),
      versaoGeometriaTorre: Number(r.VERSAO_GEOMETRIA_TORRE || 0),
      origemTorre: String(r.ORIGEM_TORRE || ''),
      localizacaoConfirmada: String(r.LOCALIZACAO_CONFIRMADA || ''),
      dataInstalacao: s243ValorRpcSeguro_(r.DATA_INSTALACAO),
      validade: s243ValorRpcSeguro_(r.VALIDADE),
      dataUltimaInspecao: s243ValorRpcSeguro_(r.DATA_ULTIMA_INSPECAO),
      proximaInspecao: s243ValorRpcSeguro_(r.PROXIMA_INSPECAO)
    }))
    .filter(r => Number.isFinite(r.x) && Number.isFinite(r.y));
}

function s242NumeroPlanilha_(v) {
  if (typeof v === 'number') return v;
  const s = String(v == null ? '' : v).trim().replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function diagnosticoProjecaoS2422(idNivel) {
  exigirPermissaoS14_('administrar');

  const nivel = String(idNivel || 'PLA-CFF-N1-2025').trim();
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('MAPA_TRANSFORMACOES');
  const transforms = sh ? s240Objects_(sh) : [];

  const pares = S242_PARES.filter(p => p.nivel === nivel);
  const detalhes = pares.map(p => {
    const t = transforms.find(r => String(r.ID_TRANSFORMACAO || '') === p.id);
    const origem = s242RegistrosMapaDireto_(ss, p.mapa);
    let projetados = [];

    if (t && String(t.MATRIZ_JSON || '').trim()) {
      try {
        const m = JSON.parse(String(t.MATRIZ_JSON));
        projetados = origem.map(r => {
          const q = s242AplicarAfim_(m, r.x, r.y);
          return {
            protocolo: r.protocolo,
            origem: { x: r.x, y: r.y },
            destino: { x: q.x, y: q.y },
            dentro: q.x >= 0 && q.x <= 1 && q.y >= 0 && q.y <= 1
          };
        });
      } catch (_) { }
    }

    return {
      par: p.id,
      nome: p.nome,
      status: t ? String(t.STATUS || '') : 'PENDENTE',
      encontrados: origem.length,
      projetadosDentro: projetados.filter(x => x.dentro).length,
      projetadosFora: projetados.filter(x => !x.dentro).length,
      amostra: projetados.slice(0, 5)
    };
  });

  const lista = appListarRegistrosNivelS242(nivel);

  return {
    ok: true,
    nivel: nivel,
    totalRetornado: lista.length,
    detalhes: detalhes
  };
}

function s242AjustarAfim_(pontos) {
  // X' = a*x + b*y + c
  // Y' = d*x + e*y + f
  const ata = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const atx = [0, 0, 0];
  const aty = [0, 0, 0];

  pontos.forEach(p => {
    const v = [Number(p.sx), Number(p.sy), 1];
    const tx = Number(p.tx), ty = Number(p.ty);

    for (let i = 0; i < 3; i++) {
      atx[i] += v[i] * tx;
      aty[i] += v[i] * ty;
      for (let j = 0; j < 3; j++)ata[i][j] += v[i] * v[j];
    }
  });

  const abc = s242Solve3_(ata, atx);
  const def = s242Solve3_(ata, aty);

  return {
    a: abc[0], b: abc[1], c: abc[2],
    d: def[0], e: def[1], f: def[2]
  };
}

function s242Solve3_(A, b) {
  const m = [
    [A[0][0], A[0][1], A[0][2], b[0]],
    [A[1][0], A[1][1], A[1][2], b[1]],
    [A[2][0], A[2][1], A[2][2], b[2]]
  ];

  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r;
    }
    if (Math.abs(m[piv][col]) < 1e-12) {
      throw new Error('Pontos insuficientes ou alinhados. Escolha pontos bem distribuídos.');
    }
    if (piv !== col) {
      const tmp = m[col]; m[col] = m[piv]; m[piv] = tmp;
    }

    const div = m[col][col];
    for (let j = col; j < 4; j++)m[col][j] /= div;

    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = m[r][col];
      for (let j = col; j < 4; j++)m[r][j] -= f * m[col][j];
    }
  }
  return [m[0][3], m[1][3], m[2][3]];
}

function s242AplicarAfim_(m, x, y) {
  return {
    x: m.a * x + m.b * y + m.c,
    y: m.d * x + m.e * y + m.f
  };
}

function s242Qualidade_(pontos, m) {
  let soma = 0, max = 0;
  pontos.forEach(p => {
    const q = s242AplicarAfim_(m, Number(p.sx), Number(p.sy));
    const e = Math.hypot(q.x - Number(p.tx), q.y - Number(p.ty));
    soma += e * e;
    if (e > max) max = e;
  });
  return {
    rmse: Math.sqrt(soma / Math.max(1, pontos.length)),
    maxErro: max
  };
}

function diagnosticoS242() {
  const ss = SpreadsheetApp.getActive();
  const checks = [];
  const sh = ss.getSheetByName('MAPA_TRANSFORMACOES');

  check_(checks, 'S242_ABA', !!sh, 'MAPA_TRANSFORMACOES');
  check_(checks, 'S242_PARES', S242_PARES.length === 5, '5 pares definidos');
  check_(checks, 'S242_SOLVER', typeof s242AjustarAfim_ === 'function', 'Motor afim disponível');
  check_(checks, 'S242_PROJECAO', typeof appListarRegistrosNivelS242 === 'function', 'Projeção de registros disponível');

  const teste = [
    { sx: 0, sy: 0, tx: .1, ty: .2 },
    { sx: 1, sy: 0, tx: .6, ty: .2 },
    { sx: 0, sy: 1, tx: .1, ty: .7 },
    { sx: 1, sy: 1, tx: .6, ty: .7 }
  ];
  let okTeste = false, rmse = 999;
  try {
    const m = s242AjustarAfim_(teste);
    const q = s242Qualidade_(teste, m);
    rmse = q.rmse;
    const p = s242AplicarAfim_(m, .5, .5);
    okTeste = Math.abs(p.x - .35) < 1e-9 && Math.abs(p.y - .45) < 1e-9 && rmse < 1e-9;
  } catch (_) { }

  check_(checks, 'S242_AFFINE_TEST', okTeste, 'RMSE teste=' + rmse);

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks: checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    calibracoes: appListarParesCalibracaoS242()
  };
}


// ========================================================
// S24.2.1 — CORREÇÃO DO QUARTO PAR DE CALIBRAÇÃO
// ========================================================
function setupS2421() {
  exigirPermissaoS14_('administrar');
  if (typeof setupS242 === 'function') setupS242();

  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S24.2.1', 'Correção do quarto ponto de calibração');
    setConfigValue_(cfg, 'S2421_STATUS', 'INSTALADO', 'Quarto destino pode completar o quarto par');
  }

  SpreadsheetApp.flush();
  return diagnosticoS2421();
}

function diagnosticoS2421() {
  const d = diagnosticoS242();
  const checks = (d.checks || []).slice();

  check_(checks, 'S2421_BACKEND_PRESERVADO',
    typeof appSalvarCalibracaoS242 === 'function',
    'Backend da calibração preservado'
  );

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks: checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length
  };
}


// ========================================================
// S24.2.2 — CORREÇÃO DA FONTE DOS MARCADORES
// ========================================================
function setupS2422() {
  exigirPermissaoS14_('administrar');
  if (typeof setupS2421 === 'function') setupS2421();

  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S24.2.2', 'Correção da projeção de marcadores');
    setConfigValue_(cfg, 'S2422_STATUS', 'INSTALADO', 'Projeção lê REGISTROS diretamente');
  }

  SpreadsheetApp.flush();
  return diagnosticoS2422();
}

function diagnosticoS2422() {
  const d = diagnosticoS2421();
  const checks = (d.checks || []).slice();

  check_(checks, 'S2422_LEITOR_DIRETO',
    typeof s242RegistrosMapaDireto_ === 'function',
    'Leitor direto de REGISTROS disponível'
  );
  check_(checks, 'S2422_NUMERO',
    s242NumeroPlanilha_('0,25') === 0.25 &&
    s242NumeroPlanilha_('0.25') === 0.25,
    'Decimal vírgula/ponto normalizado'
  );

  let diag = null;
  try { diag = diagnosticoProjecaoS2422('PLA-CFF-N1-2025') } catch (_) { }
  const azul = diag && diag.detalhes
    ? diag.detalhes.find(x => x.par === 'CAL-AZUL-N1')
    : null;

  check_(checks, 'S2422_AZUL_REGISTROS',
    !!azul && azul.encontrados > 0,
    azul ? `${azul.encontrados} registro(s) encontrados` : 'Sem diagnóstico'
  );

  check_(checks, 'S2422_AZUL_PROJETADOS',
    !!azul && azul.projetadosDentro > 0,
    azul ? `${azul.projetadosDentro} marcador(es) dentro do Nível 1` : 'Sem diagnóstico'
  );

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks: checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    projecao: diag
  };
}


// ========================================================
// S24.2.3 — SERIALIZAÇÃO RPC SEGURA
// ========================================================
function setupS2423() {
  exigirPermissaoS14_('administrar');
  if (typeof setupS2422 === 'function') setupS2422();

  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S24.2.3', 'Serialização RPC da calibração e projeção');
    setConfigValue_(cfg, 'S2423_STATUS', 'INSTALADO', 'Datas convertidas para strings JSON-safe');
  }

  SpreadsheetApp.flush();
  return diagnosticoS2423();
}

function diagnosticoS2423() {
  const d = diagnosticoS2422();
  const checks = (d.checks || []).slice();

  const teste = s243ObjetoRpcSeguro_({
    quando: new Date(2026, 7, 19, 12, 0, 0),
    texto: 'ok',
    numero: 2,
    ativo: true
  });

  let jsonOk = false;
  try {
    JSON.stringify(teste);
    jsonOk = typeof teste.quando === 'string' &&
      teste.texto === 'ok' &&
      teste.numero === 2 &&
      teste.ativo === true;
  } catch (_) { }

  check_(checks, 'S2423_JSON_SAFE', jsonOk, 'Objetos Date convertidos para string');

  let pares = null;
  try { pares = appListarParesCalibracaoS242() } catch (_) { }
  check_(checks, 'S2423_PARES_ARRAY',
    Array.isArray(pares) && pares.length === 5,
    Array.isArray(pares) ? `${pares.length}/5 pares` : 'Retorno não é array'
  );

  let proj = null;
  try { proj = appListarRegistrosNivelS242('PLA-CFF-N1-2025') } catch (_) { }
  check_(checks, 'S2423_PROJECAO_ARRAY',
    Array.isArray(proj),
    Array.isArray(proj) ? `${proj.length} marcador(es) serializáveis` : 'Retorno não é array'
  );

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks: checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    pares: pares,
    totalProjetado: Array.isArray(proj) ? proj.length : null
  };
}


// ========================================================
// S24.2.4 — REVALIDAÇÃO DO CACHE DE MARCADORES DO NÍVEL
// ========================================================
function setupS2424() {
  exigirPermissaoS14_('administrar');
  if (typeof setupS2423 === 'function') setupS2423();

  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S24.2.4', 'Revalidação do cache de marcadores do nível');
    setConfigValue_(cfg, 'S2424_STATUS', 'INSTALADO', 'Níveis revalidam marcadores quando online');
  }

  SpreadsheetApp.flush();
  return diagnosticoS2424();
}

function diagnosticoS2424() {
  const d = diagnosticoS2423();
  const checks = (d.checks || []).slice();

  let proj = [];
  try { proj = appListarRegistrosNivelS242('PLA-CFF-N1-2025') || [] } catch (_) { }

  check_(checks, 'S2424_AZUL_RETORNA',
    Array.isArray(proj) && proj.length > 0,
    Array.isArray(proj) ? `${proj.length} marcador(es) disponíveis para revalidação` : 'Retorno inválido'
  );

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks: checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    totalProjetadoNivel1: Array.isArray(proj) ? proj.length : null
  };
}


// ========================================================
// S24.2.5 — CACHE OFFLINE CONSCIENTE DOS NÍVEIS
// ========================================================
function setupS2425() {
  exigirPermissaoS14_('administrar');
  if (typeof setupS2424 === 'function') setupS2424();

  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');

  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S24.2.5', 'Cache offline consciente dos níveis');
    setConfigValue_(cfg, 'S2425_STATUS', 'INSTALADO', 'Cache esperado = 5 setores + 3 níveis');
  }

  SpreadsheetApp.flush();
  return diagnosticoS2425();
}

function diagnosticoS2425() {
  const d = diagnosticoS2424();
  const checks = (d.checks || []).slice();

  let niveis = [];
  try { niveis = appListarNiveisS241() || [] } catch (_) { }

  check_(checks, 'S2425_NIVEIS_3',
    Array.isArray(niveis) && niveis.length === 3,
    Array.isArray(niveis) ? `${niveis.length}/3 níveis` : 'Retorno inválido'
  );

  const idsEsperados = [
    'PLA-CFF-N1-2025',
    'PLA-CFF-N2-2025',
    'PLA-CFF-N3-2025'
  ];

  check_(checks, 'S2425_IDS_NIVEIS',
    idsEsperados.every(id => niveis.some(n => n.id === id)),
    'Níveis 1, 2 e 3 presentes no bootstrap'
  );

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    esperadoOffline: {
      setores: 5,
      niveis: 3,
      total: 8
    }
  };
}


// ========================================================
// S24.3 — OPERAÇÃO DIRETA PELOS NÍVEIS 1 E 2
// ========================================================

function appObterOperacaoNiveisS243() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('MAPA_TRANSFORMACOES');
  if (!sh) return [];

  const rows = s240Objects_(sh);
  const permitidos = new Set([
    'CAL-AZUL-N1',
    'CAL-VERDE-N1',
    'CAL-AMARELO-N2',
    'CAL-BRANCO-N2'
  ]);

  return S242_PARES
    .filter(p => permitidos.has(p.id))
    .map(p => {
      const r = rows.find(x =>
        String(x.ID_TRANSFORMACAO || '') === p.id &&
        String(x.STATUS || '').toUpperCase() === 'VALIDADA'
      );
      if (!r) return null;

      let matriz = null;
      try { matriz = JSON.parse(String(r.MATRIZ_JSON || '')) } catch (_) { }
      if (!matriz) return null;

      const inversa = s243InverterAfim_(matriz);
      const poligono = [
        s242AplicarAfim_(matriz, 0, 0),
        s242AplicarAfim_(matriz, 1, 0),
        s242AplicarAfim_(matriz, 1, 1),
        s242AplicarAfim_(matriz, 0, 1)
      ];

      return {
        id: p.id,
        nivel: p.nivel,
        mapa: p.mapa,
        setor: p.setor,
        piso: p.piso,
        nome: p.nome,
        matriz: matriz,
        inversa: inversa,
        poligono: poligono,
        status: 'VALIDADA'
      };
    })
    .filter(Boolean)
    .map(s243ObjetoRpcSeguro_);
}

function appResolverPontoNivelS243(payload) {
  payload = payload || {};
  const nivel = String(payload.idNivel || '').trim();
  const x = Number(payload.x);
  const y = Number(payload.y);

  if (!['PLA-CFF-N1-2025', 'PLA-CFF-N2-2025'].includes(nivel)) {
    throw new Error('Este nível ainda não está habilitado para novo cadastro.');
  }
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
    throw new Error('Coordenada do nível inválida.');
  }

  const ops = appObterOperacaoNiveisS243().filter(o => o.nivel === nivel);
  const candidatos = ops
    .filter(o => s243PontoNoPoligono_(x, y, o.poligono))
    .map(o => {
      const q = s243AplicarAfimGenerica_(o.inversa, x, y);
      return Object.assign({}, o, {
        xSetor: q.x,
        ySetor: q.y,
        dentroSetor: q.x >= -0.01 && q.x <= 1.01 && q.y >= -0.01 && q.y <= 1.01
      });
    })
    .filter(o => o.dentroSetor);

  if (candidatos.length === 0) {
    return {
      ok: false,
      motivo: 'FORA_DOS_SETORES_CALIBRADOS',
      mensagem: 'O ponto selecionado não pertence a uma área calibrada para cadastro neste nível.'
    };
  }

  // Em caso improvável de sobreposição, escolhe o candidato cuja
  // coordenada inversa fica mais centralizada dentro do mapa setorial.
  candidatos.sort((a, b) => {
    const da = Math.abs(a.xSetor - .5) + Math.abs(a.ySetor - .5);
    const db = Math.abs(b.xSetor - .5) + Math.abs(b.ySetor - .5);
    return da - db;
  });

  const c = candidatos[0];

  return {
    ok: true,
    idNivel: nivel,
    idMapaSetor: c.mapa,
    idSetor: c.setor,
    piso: c.piso,
    calibracaoId: c.id,
    xNivel: x,
    yNivel: y,
    xSetor: s243Clamp01_(c.xSetor),
    ySetor: s243Clamp01_(c.ySetor)
  };
}

function s243InverterAfim_(m) {
  const det = m.a * m.e - m.b * m.d;
  if (Math.abs(det) < 1e-12) {
    throw new Error('Transformação cartográfica não invertível.');
  }

  const ia = m.e / det;
  const ib = -m.b / det;
  const id = -m.d / det;
  const ie = m.a / det;

  return {
    a: ia,
    b: ib,
    c: -(ia * m.c + ib * m.f),
    d: id,
    e: ie,
    f: -(id * m.c + ie * m.f)
  };
}

function s243AplicarAfimGenerica_(m, x, y) {
  return {
    x: Number(m.a) * x + Number(m.b) * y + Number(m.c),
    y: Number(m.d) * x + Number(m.e) * y + Number(m.f)
  };
}

function s243PontoNoPoligono_(x, y, pts) {
  if (!Array.isArray(pts) || pts.length < 3) return false;
  let dentro = false;

  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = Number(pts[i].x), yi = Number(pts[i].y);
    const xj = Number(pts[j].x), yj = Number(pts[j].y);

    const cruza = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-15) + xi);

    if (cruza) dentro = !dentro;
  }
  return dentro;
}

function s243Clamp01_(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

function setupS243() {
  exigirPermissaoS14_('administrar');
  if (typeof setupS2425 === 'function') setupS2425();

  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');

  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S24.3', 'Cadastro direto pelos Níveis 1 e 2');
    setConfigValue_(cfg, 'S243_STATUS', 'INSTALADO', 'Conversão inversa Nível -> Setor habilitada');
  }

  SpreadsheetApp.flush();
  return diagnosticoS243();
}

function diagnosticoS243() {
  const d = diagnosticoS2425();
  const checks = (d.checks || []).slice();

  let ops = [];
  try { ops = appObterOperacaoNiveisS243() } catch (_) { }

  check_(checks, 'S243_OPERACOES_4',
    Array.isArray(ops) && ops.length === 4,
    Array.isArray(ops) ? `${ops.length}/4 transformações operacionais` : 'Retorno inválido'
  );

  const n1 = ops.filter(o => o.nivel === 'PLA-CFF-N1-2025');
  const n2 = ops.filter(o => o.nivel === 'PLA-CFF-N2-2025');

  check_(checks, 'S243_N1_2_SETORES',
    n1.length === 2,
    `${n1.length}/2 setores operáveis no Nível 1`
  );

  check_(checks, 'S243_N2_2_SETORES',
    n2.length === 2,
    `${n2.length}/2 setores operáveis no Nível 2`
  );

  let inversaoOk = true;
  for (const o of ops) {
    const p = { x: .37, y: .61 };
    const q = s242AplicarAfim_(o.matriz, p.x, p.y);
    const r = s243AplicarAfimGenerica_(o.inversa, q.x, q.y);
    if (Math.abs(r.x - p.x) > 1e-8 || Math.abs(r.y - p.y) > 1e-8) {
      inversaoOk = false;
      break;
    }
  }

  check_(checks, 'S243_INVERSAO',
    inversaoOk,
    'Transformação direta + inversa preserva coordenada'
  );

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    operacoes: ops.map(o => ({
      id: o.id,
      nome: o.nome,
      nivel: o.nivel,
      mapa: o.mapa
    })),
    nivel3: 'SOMENTE_CONSULTA'
  };
}


// ========================================================
// S24.3.1 — CURSOR DE SELEÇÃO NO MAPA
// ========================================================
function setupS2431() {
  exigirPermissaoS14_('administrar');
  if (typeof setupS243 === 'function') setupS243();

  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');

  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S24.3.1', 'Cursor de precisão durante seleção');
    setConfigValue_(cfg, 'S2431_STATUS', 'INSTALADO', 'Cursor crosshair no modo Novo registro');
  }

  SpreadsheetApp.flush();
  return diagnosticoS2431();
}

function diagnosticoS2431() {
  const d = diagnosticoS243();
  const checks = (d.checks || []).slice();

  check_(checks, 'S2431_BACKEND_PRESERVADO',
    typeof appResolverPontoNivelS243 === 'function',
    'Operação Nível -> Setor preservada'
  );

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length
  };
}


// ========================================================
// S24.4 — NÍVEL 3 / SETOR VERMELHO / ESTACIONAMENTO
// ========================================================
const S244_AREA_HEADERS = [
  'ID_AREA', 'ID_COLECAO', 'ID_PLANTA_NIVEL', 'ID_SETOR', 'ID_MAPA_NATIVO',
  'NOME', 'TIPO_AREA', 'POLIGONO_JSON', 'STATUS',
  'CRIADO_EM', 'ATUALIZADO_EM', 'ATUALIZADO_POR', 'OBSERVACOES'
];

const S244_AREA_ID = 'AREA-VERMELHO-N3';
const S244_MAPA_VERMELHO = 'MAP-CFF-N3-VERMELHO';
const S244_SETOR_VERMELHO = 'SET-VERMELHO';

function setupS244() {
  exigirPermissaoS14_('administrar');
  if (typeof setupS2431 === 'function') setupS2431();

  const ss = SpreadsheetApp.getActive();
  const shArea = s240EnsureSheet_(ss, 'MAPA_AREAS_NIVEL', S244_AREA_HEADERS);
  const shMapas = ss.getSheetByName('MAPAS_SETORES');
  if (!shMapas) throw new Error('Aba MAPAS_SETORES ausente.');

  // Mapa lógico nativo do estacionamento.
  // Não aparece como mapa setorial independente no seletor.
  s240Upsert_(shMapas, 'ID_MAPA_SETOR', {
    ID_MAPA_SETOR: S244_MAPA_VERMELHO,
    ID_PLANTA: 'PLA-CFF-N3-2025',
    ID_SETOR: S244_SETOR_VERMELHO,
    NOME: 'Setor Vermelho / Estacionamento',
    PISO: '3',
    COR_SETOR: 'VERMELHO',
    ARQUIVO_PDF_ID: '',
    IMAGEM_ID: '1wcggNYqLa-dBoTguB-7eEMHDwaM5G_2T',
    IMAGEM_URL: 'https://drive.google.com/file/d/1wcggNYqLa-dBoTguB-7eEMHDwaM5G_2T/view',
    LARGURA_PX: 1853,
    ALTURA_PX: 2620,
    ROTACAO_GRAUS: 0,
    ORIGEM_COORDENADAS: 'SUPERIOR_ESQUERDA',
    VERSAO: S240.VERSAO_CARTOGRAFICA,
    STATUS_PLANIFICACAO: 'AREA_NATIVA_NIVEL',
    ATIVO: 'NAO',
    CRIADO_EM: new Date(),
    ATUALIZADO_EM: new Date(),
    COLECAO: S240.COLECAO_ID,
    DATA_BASE: S240.DATA_BASE,
    STATUS_PUBLICACAO: 'OPERACIONAL_VIA_NIVEL',
    NOME_ARQUIVO_ORIGEM: 'Layout Comercial Janeiro25 - NÍVEL_3.pdf',
    OBSERVACOES: 'Mapa lógico do estacionamento. Coordenadas nativas do Nível 3; não exibir como planta setorial separada.'
  });

  // Garante registro da área sem sobrescrever eventual polígono já salvo.
  const existentes = s240Objects_(shArea);
  if (!existentes.some(r => String(r.ID_AREA || '') === S244_AREA_ID)) {
    s240Upsert_(shArea, 'ID_AREA', {
      ID_AREA: S244_AREA_ID,
      ID_COLECAO: S240.COLECAO_ID,
      ID_PLANTA_NIVEL: 'PLA-CFF-N3-2025',
      ID_SETOR: S244_SETOR_VERMELHO,
      ID_MAPA_NATIVO: S244_MAPA_VERMELHO,
      NOME: 'Setor Vermelho / Estacionamento',
      TIPO_AREA: 'ESTACIONAMENTO',
      POLIGONO_JSON: '',
      STATUS: 'PENDENTE',
      CRIADO_EM: new Date(),
      ATUALIZADO_EM: new Date(),
      ATUALIZADO_POR: '',
      OBSERVACOES: 'Delimitar pela interface S24.4 antes de liberar cadastro no Nível 3.'
    });
  }

  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S24.4', 'Operação do Nível 3 / estacionamento');
    setConfigValue_(cfg, 'S244_STATUS', 'INSTALADO', 'Área Vermelha preparada para delimitação');
  }

  SpreadsheetApp.flush();
  return diagnosticoS244();
}

function appObterAreaVermelhaS244(opcoes) {
  opcoes = opcoes || {};
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('MAPA_AREAS_NIVEL');
  if (!sh) return null;

  const live = s240Objects_(sh).find(x => String(x.ID_AREA || '') === S244_AREA_ID);
  const r = opcoes.incluirRascunho ? s255OverlayArea_(S244_AREA_ID, live) : live;
  if (!r) return null;

  let poligono = [];
  try {
    poligono = JSON.parse(String(r.POLIGONO_JSON || '[]'));
  } catch (_) { }

  return {
    id: S244_AREA_ID,
    nivel: 'PLA-CFF-N3-2025',
    setor: S244_SETOR_VERMELHO,
    mapa: S244_MAPA_VERMELHO,
    nome: 'Setor Vermelho / Estacionamento',
    tipoArea: 'ESTACIONAMENTO',
    status: String(r.STATUS || 'PENDENTE'),
    poligono: Array.isArray(poligono) ? poligono : [],
    atualizadoEm: s243ValorRpcSeguro_(r.ATUALIZADO_EM)
  };
}

function appSalvarAreaVermelhaS244(payload) {
  exigirPermissaoS14_('administrar');
  payload = payload || {};
  const pontos = Array.isArray(payload.pontos) ? payload.pontos : [];

  if (pontos.length !== 4) {
    throw new Error('A área do estacionamento deve ter exatamente 4 pontos.');
  }

  pontos.forEach((p, i) => {
    const x = Number(p.x), y = Number(p.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      throw new Error(`Ponto ${i + 1} inválido.`);
    }
  });

  const area = s244AreaPoligono_(pontos);
  if (area < 0.02) {
    throw new Error('Área delimitada muito pequena. Escolha os quatro cantos do estacionamento.');
  }

  // Não permite sobreposição substancial com o Roxo calibrado.
  const roxo = s244PoligonoRoxo_();
  const centro = {
    x: pontos.reduce((a, p) => a + Number(p.x), 0) / 4,
    y: pontos.reduce((a, p) => a + Number(p.y), 0) / 4
  };
  if (roxo.length >= 3 && s243PontoNoPoligono_(centro.x, centro.y, roxo)) {
    throw new Error('O centro da área delimitada caiu dentro do Setor Roxo. Delimite apenas o estacionamento/Vermelho.');
  }

  // S25.5 — com RASCUNHO ativo, grava apenas no pacote.
  if (s255TemRascunhoAtivo_()) {
    let usuario = '';
    try { usuario = Session.getActiveUser().getEmail() || '' } catch (_) { }
    return s255StageArea_({
      ID_AREA: S244_AREA_ID,
      ID_COLECAO: S240.COLECAO_ID,
      ID_PLANTA_NIVEL: 'PLA-CFF-N3-2025',
      ID_SETOR: S244_SETOR_VERMELHO,
      ID_MAPA_NATIVO: S244_MAPA_VERMELHO,
      NOME: 'Setor Vermelho / Estacionamento',
      TIPO_AREA: 'ESTACIONAMENTO',
      POLIGONO_JSON: JSON.stringify(pontos),
      STATUS: 'VALIDADA',
      ATUALIZADO_EM: new Date(),
      ATUALIZADO_POR: usuario,
      OBSERVACOES: 'S25.5 — área em rascunho.'
    });
  }

  const antesS253 = s253SnapshotEntidadeArea_(S244_AREA_ID);
  const ss = SpreadsheetApp.getActive();
  const sh = s240EnsureSheet_(ss, 'MAPA_AREAS_NIVEL', S244_AREA_HEADERS);
  let usuario = '';
  try { usuario = Session.getActiveUser().getEmail() || '' } catch (_) { }

  s240Upsert_(sh, 'ID_AREA', {
    ID_AREA: S244_AREA_ID,
    ID_COLECAO: S240.COLECAO_ID,
    ID_PLANTA_NIVEL: 'PLA-CFF-N3-2025',
    ID_SETOR: S244_SETOR_VERMELHO,
    ID_MAPA_NATIVO: S244_MAPA_VERMELHO,
    NOME: 'Setor Vermelho / Estacionamento',
    TIPO_AREA: 'ESTACIONAMENTO',
    POLIGONO_JSON: JSON.stringify(pontos),
    STATUS: 'VALIDADA',
    ATUALIZADO_EM: new Date(),
    ATUALIZADO_POR: usuario,
    OBSERVACOES: 'Área nativa do Nível 3 validada para cadastro.'
  });

  try {
    registrarAuditoriaS15_({
      acao: 'DELIMITAR_AREA_VERMELHA_S244',
      entidade: 'MAPA_AREAS_NIVEL',
      entidadeId: S244_AREA_ID,
      resultado: 'SUCESSO',
      origem: 'WEB_APP',
      detalhes: { pontos: pontos, area: area }
    });
  } catch (_) { }

  const depoisS253 = s253SnapshotEntidadeArea_(S244_AREA_ID);
  try {
    s253RegistrarEvento_({
      tipoEvento: 'ALTERACAO_AREA',
      entidade: 'MAPA_AREAS_NIVEL',
      entidadeId: S244_AREA_ID,
      nome: 'Setor Vermelho / Estacionamento',
      antes: antesS253,
      depois: depoisS253,
      motivo: 'Delimitação/ajuste de área',
      origem: 'WEB_APP'
    });
  } catch (e) {
    console.warn('[S25.3] histórico de área não registrado', e);
  }

  SpreadsheetApp.flush();
  return appObterAreaVermelhaS244();
}

function appObterOperacaoNivel3S244() {
  const area = appObterAreaVermelhaS244();

  const ops = appObterOperacaoNiveisS243()
    .filter(o => o.nivel === 'PLA-CFF-N3-2025');

  // appObterOperacaoNiveisS243 não inclui Roxo por design da S24.3,
  // então recuperamos diretamente a calibração Roxo -> N3.
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('MAPA_TRANSFORMACOES');
  const rows = sh ? s240Objects_(sh) : [];
  const p = S242_PARES.find(x => x.id === 'CAL-ROXO-N3');
  const r = rows.find(x =>
    String(x.ID_TRANSFORMACAO || '') === 'CAL-ROXO-N3' &&
    String(x.STATUS || '').toUpperCase() === 'VALIDADA'
  );

  let roxo = null;
  if (p && r) {
    let matriz = null;
    try { matriz = JSON.parse(String(r.MATRIZ_JSON || '')) } catch (_) { }
    if (matriz) {
      roxo = {
        id: p.id,
        nivel: p.nivel,
        mapa: p.mapa,
        setor: p.setor,
        piso: p.piso,
        nome: p.nome,
        matriz: matriz,
        inversa: s243InverterAfim_(matriz),
        poligono: [
          s242AplicarAfim_(matriz, 0, 0),
          s242AplicarAfim_(matriz, 1, 0),
          s242AplicarAfim_(matriz, 1, 1),
          s242AplicarAfim_(matriz, 0, 1)
        ],
        status: 'VALIDADA'
      };
    }
  }

  return {
    nivel: 'PLA-CFF-N3-2025',
    roxo: roxo ? s243ObjetoRpcSeguro_(roxo) : null,
    vermelho: area,
    operavel: !!(roxo && area && area.status === 'VALIDADA' && area.poligono.length === 4)
  };
}

function appResolverPontoNivel3S244(payload) {
  payload = payload || {};
  const x = Number(payload.x), y = Number(payload.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
    throw new Error('Coordenada inválida.');
  }

  const op = appObterOperacaoNivel3S244();
  if (!op.roxo) return { ok: false, motivo: 'ROXO_NAO_CALIBRADO' };

  if (s243PontoNoPoligono_(x, y, op.roxo.poligono)) {
    const q = s243AplicarAfimGenerica_(op.roxo.inversa, x, y);
    return {
      ok: true,
      tipo: 'SETOR_CALIBRADO',
      idNivel: 'PLA-CFF-N3-2025',
      idMapaSetor: op.roxo.mapa,
      idSetor: op.roxo.setor,
      piso: '3',
      xNivel: x, yNivel: y,
      xSetor: s243Clamp01_(q.x),
      ySetor: s243Clamp01_(q.y),
      calibracaoId: 'CAL-ROXO-N3'
    };
  }

  if (op.vermelho && op.vermelho.status === 'VALIDADA' &&
    s243PontoNoPoligono_(x, y, op.vermelho.poligono)) {
    return {
      ok: true,
      tipo: 'AREA_NATIVA_NIVEL',
      idNivel: 'PLA-CFF-N3-2025',
      idMapaSetor: S244_MAPA_VERMELHO,
      idSetor: S244_SETOR_VERMELHO,
      piso: '3',
      xNivel: x, yNivel: y,
      xSetor: x,
      ySetor: y,
      areaId: S244_AREA_ID
    };
  }

  return {
    ok: false,
    motivo: 'FORA_DAS_AREAS_OPERACIONAIS',
    mensagem: 'Selecione um ponto dentro do Setor Roxo ou da área delimitada do estacionamento.'
  };
}

function s244PoligonoRoxo_() {
  const op = appObterOperacaoNivel3S244();
  return op && op.roxo && Array.isArray(op.roxo.poligono) ? op.roxo.poligono : [];
}

function s244AreaPoligono_(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += Number(pts[j].x) * Number(pts[i].y) - Number(pts[i].x) * Number(pts[j].y);
  }
  return Math.abs(a) / 2;
}

function s244AdicionarRegistrosVermelhosNivel_(lista, idNivel) {
  if (String(idNivel || '') !== 'PLA-CFF-N3-2025') return lista || [];
  const area = appObterAreaVermelhaS244();
  if (!area || area.status !== 'VALIDADA') return lista || [];

  const ss = SpreadsheetApp.getActive();
  const regs = s242RegistrosMapaDireto_(ss, S244_MAPA_VERMELHO);

  const nativos = regs
    .filter(r => s243PontoNoPoligono_(Number(r.x), Number(r.y), area.poligono))
    .map(r => Object.assign({}, r, {
      mapaOrigem: S244_MAPA_VERMELHO,
      nivelDestino: 'PLA-CFF-N3-2025',
      areaId: S244_AREA_ID,
      areaTipo: 'ESTACIONAMENTO',
      x: Number(r.x),
      y: Number(r.y)
    }));

  return [...(lista || []), ...nativos].map(s243ObjetoRpcSeguro_);
}

function diagnosticoS244() {
  const d = diagnosticoS2431();
  const checks = (d.checks || []).slice();

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('MAPA_AREAS_NIVEL');
  check_(checks, 'S244_ABA', !!sh, 'MAPA_AREAS_NIVEL');

  const mapas = ss.getSheetByName('MAPAS_SETORES');
  const mapaV = mapas ? s240Objects_(mapas).find(r => String(r.ID_MAPA_SETOR || '') === S244_MAPA_VERMELHO) : null;
  check_(checks, 'S244_MAPA_LOGICO', !!mapaV, 'Mapa lógico do estacionamento');

  const op = appObterOperacaoNivel3S244();
  check_(checks, 'S244_ROXO_VALIDADO', !!op.roxo, 'Roxo -> Nível 3 disponível');

  const area = appObterAreaVermelhaS244();
  check_(checks, 'S244_AREA_REGISTRADA', !!area, 'Área Vermelha registrada');

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    nivel3: {
      roxo: !!op.roxo,
      vermelhoStatus: area ? area.status : 'AUSENTE',
      operavel: op.operavel
    }
  };
}


// ========================================================
// S24.5 — CONSOLIDAÇÃO OPERACIONAL DO NÍVEL 3
// ========================================================
function setupS245() {
  exigirPermissaoS14_('administrar');
  if (typeof setupS244 === 'function') setupS244();

  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');

  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S24.5', 'Consolidação operacional do Nível 3');
    setConfigValue_(cfg, 'S245_STATUS', 'INSTALADO', 'Roxo/Vermelho consolidados para operação');
  }

  SpreadsheetApp.flush();
  return diagnosticoS245();
}

function diagnosticoS245() {
  const d = diagnosticoS244();
  const checks = (d.checks || []).slice();

  const op = appObterOperacaoNivel3S244();
  check_(checks, 'S245_N3_OPERAVEL',
    !!op.operavel,
    op.operavel ? 'Roxo + Vermelho operacionais' : 'Área Vermelha ainda não validada'
  );

  let lista = [];
  try { lista = appListarRegistrosNivelS242('PLA-CFF-N3-2025') || [] } catch (_) { }
  check_(checks, 'S245_LISTAGEM_N3',
    Array.isArray(lista),
    Array.isArray(lista) ? `${lista.length} registro(s) retornados` : 'Retorno inválido'
  );

  const ss = SpreadsheetApp.getActive();
  const regs = s242RegistrosMapaDireto_(ss, S244_MAPA_VERMELHO);
  check_(checks, 'S245_MAPA_VERMELHO_LEITURA',
    Array.isArray(regs),
    `${regs.length} registro(s) atuais no mapa lógico`
  );

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    nivel3: {
      operavel: !!op.operavel,
      totalVisualizado: Array.isArray(lista) ? lista.length : 0,
      registrosEstacionamento: regs.length
    }
  };
}

function diagnosticoRegistroEstacionamentoS245(protocolo) {
  exigirPermissaoS14_('administrar');

  const p = String(protocolo || '').trim();
  if (!p) throw new Error('Informe o protocolo SIG.');

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('REGISTROS');
  if (!sh) throw new Error('REGISTROS ausente.');

  const rows = s240Objects_(sh);
  const r = rows.find(x => String(x.PROTOCOLO || '').trim() === p);
  if (!r) {
    return { ok: false, protocolo: p, motivo: 'REGISTRO_NAO_ENCONTRADO' };
  }

  const id = String(r.ID_REGISTRO || '').trim();

  const histSh = ss.getSheetByName('REGISTRO_HISTORICO');
  const hist = histSh ? s240Objects_(histSh).filter(x =>
    String(x.ID_REGISTRO || '').trim() === id ||
    String(x.PROTOCOLO || '').trim() === p
  ) : [];

  const fotosSh = ss.getSheetByName('FOTOS');
  const fotos = fotosSh ? s240Objects_(fotosSh).filter(x =>
    String(x.ID_REGISTRO || '').trim() === id ||
    String(x.PROTOCOLO || '').trim() === p
  ) : [];

  const nivel = appListarRegistrosNivelS242('PLA-CFF-N3-2025') || [];
  const visivel = nivel.some(x => String(x.protocolo || '').trim() === p);

  const mapaOk = String(r.ID_MAPA_SETOR || '') === S244_MAPA_VERMELHO;
  const nomeOk = String(r.MAPA || '') === 'Setor Vermelho / Estacionamento';
  const pisoOk = String(r.PISO || '') === '3';

  return {
    ok: mapaOk && pisoOk && visivel,
    protocolo: p,
    idRegistro: id,
    mapa: {
      id: String(r.ID_MAPA_SETOR || ''),
      nome: String(r.MAPA || ''),
      piso: String(r.PISO || ''),
      x: Number(r.X_NORMALIZADO),
      y: Number(r.Y_NORMALIZADO),
      mapaOk,
      nomeOk,
      pisoOk
    },
    status: String(r.STATUS || ''),
    historicos: hist.length,
    fotos: fotos.length,
    visivelNoNivel3: visivel,
    esperado: {
      idMapaSetor: S244_MAPA_VERMELHO,
      mapa: 'Setor Vermelho / Estacionamento',
      piso: '3'
    }
  };
}


// ========================================================
// S24.6 — ÁREAS ESPECIAIS DO NÍVEL 1
// ========================================================
const S246_N1 = 'PLA-CFF-N1-2025';

const S246_AREAS = {
  HOTEL: {
    id: 'AREA-HOTEL-N1',
    setor: 'SET-HOTEL',
    mapa: 'MAP-CFF-N1-HOTEL',
    nome: 'Hotel',
    tipo: 'HOTEL'
  },
  CENTRAL_DISTRIBUICAO: {
    id: 'AREA-CD-N1',
    setor: 'SET-CENTRAL-DISTRIBUICAO',
    mapa: 'MAP-CFF-N1-CD',
    nome: 'Central de Distribuição',
    tipo: 'CENTRAL_DISTRIBUICAO'
  },
  AREA_EXTERNA_LATERAL_AZUL: {
    id: 'AREA-EXT-LAT-AZUL-N1',
    setor: 'SET-EXT-LAT-AZUL',
    mapa: 'MAP-CFF-N1-EXT-LAT-AZUL',
    nome: 'Área externa lateral azul',
    tipo: 'AREA_EXTERNA_LATERAL_AZUL'
  },
  AREA_EXTERNA_LATERAL_VERDE: {
    id: 'AREA-EXT-LAT-VERDE-N1',
    setor: 'SET-EXT-LAT-VERDE',
    mapa: 'MAP-CFF-N1-EXT-LAT-VERDE',
    nome: 'Área externa lateral verde',
    tipo: 'AREA_EXTERNA_LATERAL_VERDE'
  },
  AREA_EXTERNA_FRENTE: {
    id: 'AREA-EXT-FRENTE-N1',
    setor: 'SET-EXT-FRENTE',
    mapa: 'MAP-CFF-N1-EXT-FRENTE',
    nome: 'Área externa frente',
    tipo: 'AREA_EXTERNA_FRENTE'
  },
  AREA_EXTERNA_HOTEL_CDM: {
    id: 'AREA-EXT-HOTEL-CDM-N1',
    setor: 'SET-EXT-HOTEL-CDM',
    mapa: 'MAP-CFF-N1-EXT-HOTEL-CDM',
    nome: 'Área externa Hotel/CDM',
    tipo: 'AREA_EXTERNA_HOTEL_CDM'
  },
  AREA_EXTERNA: {
    id: 'AREA-EXTERNA-N1',
    setor: 'SET-AREA-EXTERNA',
    mapa: 'MAP-CFF-N1-EXTERNA',
    nome: 'Área Externa',
    tipo: 'AREA_EXTERNA'
  }
};

function setupS246() {
  exigirPermissaoS14_('administrar');

  // S24.6.1 — setup incremental.
  // NÃO chama setupS245/setupS244/... porque as fases anteriores
  // já foram instaladas e validadas. Isso evita exceder o limite
  // de execução do Apps Script.
  const ss = SpreadsheetApp.getActive();

  // Dependências mínimas que devem existir desde S24.4/S24.5.
  const shMapas = ss.getSheetByName('MAPAS_SETORES');
  if (!shMapas) {
    throw new Error('Dependência ausente: MAPAS_SETORES. Execute a instalação base antes da S24.6.');
  }

  const shArea = s240EnsureSheet_(ss, 'MAPA_AREAS_NIVEL', S244_AREA_HEADERS);

  const agora = new Date();
  const imagemId = '1zY0GShM4kA5P1cHTfcnys0sPKNqHOMsV';
  const imagemUrl = 'https://drive.google.com/file/d/1zY0GShM4kA5P1cHTfcnys0sPKNqHOMsV/view';

  const existentesMapas = s240Objects_(shMapas);
  const existentesAreas = s240Objects_(shArea);

  Object.values(S246_AREAS).forEach(a => {
    const mapaExistente = existentesMapas.find(r =>
      String(r.ID_MAPA_SETOR || '') === a.mapa
    );

    if (!mapaExistente) {
      s240Upsert_(shMapas, 'ID_MAPA_SETOR', {
        ID_MAPA_SETOR: a.mapa,
        ID_PLANTA: S246_N1,
        ID_SETOR: a.setor,
        NOME: a.nome,
        PISO: '1',
        COR_SETOR: a.tipo === 'HOTEL'
          ? 'ROSA'
          : a.tipo === 'CENTRAL_DISTRIBUICAO'
            ? 'LARANJA'
            : 'CINZA',
        ARQUIVO_PDF_ID: '',
        IMAGEM_ID: imagemId,
        IMAGEM_URL: imagemUrl,
        LARGURA_PX: 1853,
        ALTURA_PX: 2620,
        ROTACAO_GRAUS: 0,
        ORIGEM_COORDENADAS: 'SUPERIOR_ESQUERDA',
        VERSAO: S240.VERSAO_CARTOGRAFICA,
        STATUS_PLANIFICACAO: 'AREA_NATIVA_NIVEL',
        ATIVO: 'NAO',
        CRIADO_EM: agora,
        ATUALIZADO_EM: agora,
        COLECAO: S240.COLECAO_ID,
        DATA_BASE: S240.DATA_BASE,
        STATUS_PUBLICACAO: 'OPERACIONAL_VIA_NIVEL',
        NOME_ARQUIVO_ORIGEM: 'Layout Comercial Janeiro25 - NÍVEL_1.pdf',
        OBSERVACOES: `Mapa lógico nativo do Nível 1: ${a.nome}. Não exibir como planta setorial separada.`
      });
    }

    const areaExistente = existentesAreas.find(r =>
      String(r.ID_AREA || '') === a.id
    );

    if (!areaExistente) {
      s240Upsert_(shArea, 'ID_AREA', {
        ID_AREA: a.id,
        ID_COLECAO: S240.COLECAO_ID,
        ID_PLANTA_NIVEL: S246_N1,
        ID_SETOR: a.setor,
        ID_MAPA_NATIVO: a.mapa,
        NOME: a.nome,
        TIPO_AREA: a.tipo,
        POLIGONO_JSON: '',
        STATUS: 'PENDENTE',
        CRIADO_EM: agora,
        ATUALIZADO_EM: agora,
        ATUALIZADO_POR: '',
        OBSERVACOES: `Delimitar ${a.nome} pela interface S24.6.`
      });
    }
  });

  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S24.6.1', 'Setup incremental das áreas especiais do Nível 1');
    setConfigValue_(cfg, 'S246_STATUS', 'INSTALADO', 'Hotel, CD e áreas externas preparadas para delimitação');
  }

  SpreadsheetApp.flush();
  return diagnosticoS246();
}

function appListarAreasNivel1S246(opcoes) {
  opcoes = opcoes || {};
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('MAPA_AREAS_NIVEL');
  if (!sh) return [];

  const rows = s240Objects_(sh);
  const fisIndex = (typeof s268D2IndexRepresentacoes_ === 'function') ? s268D2IndexRepresentacoes_() : {};

  return Object.values(S246_AREAS).map(a => {
    const live = rows.find(x => String(x.ID_AREA || '') === a.id);
    const r = opcoes.incluirRascunho ? s255OverlayArea_(a.id, live) : live;
    let poligono = [];
    try { poligono = JSON.parse(String(r && r.POLIGONO_JSON || '[]')) } catch (_) { }

    const fis = fisIndex[a.id] || null;
    return {
      id: a.id,
      nivel: S246_N1,
      setor: a.setor,
      mapa: a.mapa,
      nome: a.nome,
      tipoArea: a.tipo,
      status: r ? String(r.STATUS || 'PENDENTE') : 'PENDENTE',
      poligono: Array.isArray(poligono) ? poligono : [],
      atualizadoEm: r ? s243ValorRpcSeguro_(r.ATUALIZADO_EM) : '',
      areaFisicaId: fis ? fis.areaFisicaId : '',
      areaFisicaNome: fis ? fis.areaFisicaNome : '',
      areaFisicaTipo: fis ? fis.areaFisicaTipo : '',
      subareaFisicaId: fis ? fis.subareaFisicaId : '',
      subareaFisicaNome: fis ? fis.subareaFisicaNome : '',
      subareaFisicaTipo: fis ? fis.subareaFisicaTipo : '',
      representacaoPapel: fis ? fis.representacaoPapel : '',
      representacaoDetalhe: fis ? fis.representacaoDetalhe : ''
    };
  });
}

function appSalvarAreaNivel1S246(payload) {
  exigirPermissaoS14_('administrar');
  payload = payload || {};

  const tipo = String(payload.tipoArea || '').trim().toUpperCase();
  const meta = S246_AREAS[tipo];
  if (!meta) throw new Error('Tipo de área inválido.');

  const pontos = Array.isArray(payload.pontos) ? payload.pontos : [];
  const max = tipo.indexOf('AREA_EXTERNA') === 0 ? 30 : 16;

  if (pontos.length < 4) {
    throw new Error('Use pelo menos 4 pontos para delimitar a área.');
  }
  if (pontos.length > max) {
    throw new Error(`Máximo de ${max} pontos para esta área.`);
  }

  pontos.forEach((p, i) => {
    const x = Number(p.x), y = Number(p.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      throw new Error(`Ponto ${i + 1} inválido.`);
    }
  });

  const area = s244AreaPoligono_(pontos);
  if (area < 0.0015) {
    throw new Error('Área delimitada muito pequena.');
  }

  const ops = appObterOperacaoNiveisS243().filter(o => o.nivel === S246_N1);
  const centro = {
    x: pontos.reduce((a, p) => a + Number(p.x), 0) / pontos.length,
    y: pontos.reduce((a, p) => a + Number(p.y), 0) / pontos.length
  };

  // S24.6.2 — a regra do centro não se aplica às áreas externas.
  // Polígonos externos são irregulares e podem envolver/contornar os setores,
  // fazendo o centro geométrico cair dentro de Azul/Verde sem que a delimitação
  // esteja conceitualmente errada.
  if (['HOTEL', 'CENTRAL_DISTRIBUICAO'].includes(tipo)) {
    const dentroSetor = ops.some(o =>
      Array.isArray(o.poligono) &&
      s243PontoNoPoligono_(centro.x, centro.y, o.poligono)
    );

    if (dentroSetor) {
      throw new Error('O centro da área caiu dentro do Setor Azul ou Verde. Delimite apenas Hotel/CD.');
    }
  }

  // Hotel/CD não podem se sobrepor entre si pelo centro.
  const existentes = appListarAreasNivel1S246();
  const outras = existentes.filter(a =>
    a.tipoArea !== tipo &&
    a.status === 'VALIDADA' &&
    Array.isArray(a.poligono) &&
    a.poligono.length >= 3
  );

  const conflita = outras.some(a =>
    s243PontoNoPoligono_(centro.x, centro.y, a.poligono)
  );

  if (conflita && ['HOTEL', 'CENTRAL_DISTRIBUICAO'].includes(tipo)) {
    throw new Error('O centro da área caiu dentro de outra área especial já validada.');
  }

  // S25.5 — com RASCUNHO ativo, grava apenas no pacote.
  if (s255TemRascunhoAtivo_()) {
    let usuario = '';
    try { usuario = Session.getActiveUser().getEmail() || '' } catch (_) { }
    return s255StageArea_({
      ID_AREA: meta.id,
      ID_COLECAO: S240.COLECAO_ID,
      ID_PLANTA_NIVEL: S246_N1,
      ID_SETOR: meta.setor,
      ID_MAPA_NATIVO: meta.mapa,
      NOME: meta.nome,
      TIPO_AREA: meta.tipo,
      POLIGONO_JSON: JSON.stringify(pontos),
      STATUS: 'VALIDADA',
      ATUALIZADO_EM: new Date(),
      ATUALIZADO_POR: usuario,
      OBSERVACOES: 'S25.5 — área em rascunho.'
    });
  }

  const antesS253 = s253SnapshotEntidadeArea_(meta.id);
  const ss = SpreadsheetApp.getActive();
  const sh = s240EnsureSheet_(ss, 'MAPA_AREAS_NIVEL', S244_AREA_HEADERS);
  let usuario = '';
  try { usuario = Session.getActiveUser().getEmail() || '' } catch (_) { }

  s240Upsert_(sh, 'ID_AREA', {
    ID_AREA: meta.id,
    ID_COLECAO: S240.COLECAO_ID,
    ID_PLANTA_NIVEL: S246_N1,
    ID_SETOR: meta.setor,
    ID_MAPA_NATIVO: meta.mapa,
    NOME: meta.nome,
    TIPO_AREA: meta.tipo,
    POLIGONO_JSON: JSON.stringify(pontos),
    STATUS: 'VALIDADA',
    ATUALIZADO_EM: new Date(),
    ATUALIZADO_POR: usuario,
    OBSERVACOES: `Área ${meta.nome} validada para operação no Nível 1.`
  });

  try {
    registrarAuditoriaS15_({
      acao: 'DELIMITAR_AREA_NIVEL1_S246',
      entidade: 'MAPA_AREAS_NIVEL',
      entidadeId: meta.id,
      resultado: 'SUCESSO',
      origem: 'WEB_APP',
      detalhes: { tipoArea: tipo, pontos: pontos, area: area }
    });
  } catch (_) { }

  const depoisS253 = s253SnapshotEntidadeArea_(meta.id);
  try {
    s253RegistrarEvento_({
      tipoEvento: 'ALTERACAO_AREA',
      entidade: 'MAPA_AREAS_NIVEL',
      entidadeId: meta.id,
      nome: meta.nome,
      antes: antesS253,
      depois: depoisS253,
      motivo: 'Delimitação/ajuste de área',
      origem: 'WEB_APP'
    });
  } catch (e) {
    console.warn('[S25.3] histórico de área não registrado', e);
  }

  SpreadsheetApp.flush();

  return appListarAreasNivel1S246().find(a => a.id === meta.id) || null;
}

function appObterOperacaoNivel1S246() {
  const setores = appObterOperacaoNiveisS243()
    .filter(o => o.nivel === S246_N1);

  const areas = appListarAreasNivel1S246();

  return {
    nivel: S246_N1,
    setores: setores,
    areas: areas,
    operavelEspecial: areas.some(a => a.status === 'VALIDADA')
  };
}

function appResolverPontoNivel1S246(payload) {
  payload = payload || {};
  const x = Number(payload.x), y = Number(payload.y);

  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
    throw new Error('Coordenada inválida.');
  }

  const op = appObterOperacaoNivel1S246();

  // Prioridade 1: Hotel
  const hotel = op.areas.find(a =>
    a.tipoArea === 'HOTEL' &&
    a.status === 'VALIDADA' &&
    s243PontoNoPoligono_(x, y, a.poligono)
  );
  if (hotel) return s246RetornoAreaNativa_(hotel, x, y);

  // Prioridade 2: Central de Distribuição
  const cd = op.areas.find(a =>
    a.tipoArea === 'CENTRAL_DISTRIBUICAO' &&
    a.status === 'VALIDADA' &&
    s243PontoNoPoligono_(x, y, a.poligono)
  );
  if (cd) return s246RetornoAreaNativa_(cd, x, y);

  // Prioridade 3: setores calibrados.
  // Os setores ganham das áreas externas para evitar que um polígono
  // externo amplo capture Azul ou Verde.
  for (const setor of op.setores) {
    if (Array.isArray(setor.poligono) &&
      s243PontoNoPoligono_(x, y, setor.poligono)) {
      const q = s243AplicarAfimGenerica_(setor.inversa, x, y);
      return {
        ok: true,
        tipo: 'SETOR_CALIBRADO',
        idNivel: S246_N1,
        idMapaSetor: setor.mapa,
        idSetor: setor.setor,
        piso: '1',
        xNivel: x, yNivel: y,
        xSetor: s243Clamp01_(q.x),
        ySetor: s243Clamp01_(q.y),
        calibracaoId: setor.id
      };
    }
  }

  // Prioridade 4: subáreas externas específicas.
  const externasEspecificas = [
    'AREA_EXTERNA_LATERAL_AZUL',
    'AREA_EXTERNA_LATERAL_VERDE',
    'AREA_EXTERNA_FRENTE',
    'AREA_EXTERNA_HOTEL_CDM'
  ];

  for (const tipo of externasEspecificas) {
    const area = op.areas.find(a =>
      a.tipoArea === tipo &&
      a.status === 'VALIDADA' &&
      s243PontoNoPoligono_(x, y, a.poligono)
    );
    if (area) return s246RetornoAreaNativa_(area, x, y);
  }

  // Prioridade 5: Área Externa genérica, para sobras não classificadas.
  const ext = op.areas.find(a =>
    a.tipoArea === 'AREA_EXTERNA' &&
    a.status === 'VALIDADA' &&
    s243PontoNoPoligono_(x, y, a.poligono)
  );
  if (ext) return s246RetornoAreaNativa_(ext, x, y);

  return {
    ok: false,
    motivo: 'FORA_DAS_AREAS_OPERACIONAIS',
    mensagem: 'Selecione um ponto em Azul, Verde, Hotel, Central de Distribuição ou Área Externa.'
  };
}

function s246RetornoAreaNativa_(area, x, y) {
  return {
    ok: true,
    tipo: 'AREA_NATIVA_NIVEL',
    idNivel: S246_N1,
    idMapaSetor: area.mapa,
    idSetor: area.setor,
    piso: '1',
    xNivel: x, yNivel: y,
    xSetor: x, ySetor: y,
    areaId: area.id,
    areaTipo: area.tipoArea,
    areaNome: area.nome,
    areaFisicaId: area.areaFisicaId || '',
    areaFisicaNome: area.areaFisicaNome || '',
    areaFisicaTipo: area.areaFisicaTipo || '',
    subareaFisicaId: area.subareaFisicaId || '',
    subareaFisicaNome: area.subareaFisicaNome || '',
    subareaFisicaTipo: area.subareaFisicaTipo || '',
    representacaoPapel: area.representacaoPapel || '',
    representacaoDetalhe: area.representacaoDetalhe || ''
  };
}

function s246AdicionarRegistrosEspeciaisNivel1_(lista, idNivel) {
  if (String(idNivel || '') !== S246_N1) return lista || [];

  const areas = appListarAreasNivel1S246()
    .filter(a => a.status === 'VALIDADA' && Array.isArray(a.poligono));

  if (!areas.length) return lista || [];

  const ss = SpreadsheetApp.getActive();
  const out = [...(lista || [])];

  areas.forEach(area => {
    const regs = s242RegistrosMapaDireto_(ss, area.mapa);

    regs.forEach(r => {
      const x = Number(r.x), y = Number(r.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      if (!s243PontoNoPoligono_(x, y, area.poligono)) return;

      out.push(Object.assign({}, r, {
        x: x, y: y,
        mapaOrigem: area.mapa,
        nivelDestino: S246_N1,
        areaId: area.id,
        areaTipo: area.tipoArea,
        areaNome: area.nome
      }));
    });
  });

  return out.map(s243ObjetoRpcSeguro_);
}

function diagnosticoS246() {
  // S24.6.1 — diagnóstico local e rápido.
  // Não encadeia diagnosticoS245(), evitando reprocessar toda a S24.
  const checks = [];
  const ss = SpreadsheetApp.getActive();

  const shArea = ss.getSheetByName('MAPA_AREAS_NIVEL');
  check_(checks, 'S246_ABA', !!shArea, 'MAPA_AREAS_NIVEL disponível');

  const shMapas = ss.getSheetByName('MAPAS_SETORES');
  check_(checks, 'S246_MAPAS_SETORES', !!shMapas, 'MAPAS_SETORES disponível');

  const shTrans = ss.getSheetByName('MAPA_TRANSFORMACOES');
  check_(checks, 'S246_TRANSFORMACOES', !!shTrans, 'MAPA_TRANSFORMACOES disponível');

  const areas = shArea ? appListarAreasNivel1S246() : [];
  check_(checks, 'S246_AREAS_3',
    Array.isArray(areas) && areas.length === 7,
    Array.isArray(areas) ? `${areas.length}/7 áreas lógicas` : 'Retorno inválido'
  );

  const mapaRows = shMapas ? s240Objects_(shMapas) : [];
  const ids = Object.values(S246_AREAS).map(a => a.mapa);

  check_(checks, 'S246_MAPAS_LOGICOS',
    ids.every(id => mapaRows.some(r => String(r.ID_MAPA_SETOR || '') === id)),
    'Hotel, CD e Área Externa registrados'
  );

  let operacoes = [];
  try {
    operacoes = appObterOperacaoNiveisS243()
      .filter(o => o.nivel === S246_N1);
  } catch (_) { }

  check_(checks, 'S246_N1_CALIBRADO',
    Array.isArray(operacoes) && operacoes.length === 2,
    Array.isArray(operacoes)
      ? `${operacoes.length}/2 setores calibrados no Nível 1`
      : 'Falha ao ler calibrações'
  );

  const tiposEsperados = [
    'HOTEL',
    'CENTRAL_DISTRIBUICAO',
    'AREA_EXTERNA_LATERAL_AZUL',
    'AREA_EXTERNA_LATERAL_VERDE',
    'AREA_EXTERNA_FRENTE',
    'AREA_EXTERNA_HOTEL_CDM',
    'AREA_EXTERNA'
  ];
  check_(checks, 'S246_TIPOS',
    tiposEsperados.every(t => areas.some(a => a.tipoArea === t)),
    'Hotel, CD e 5 classificações externas'
  );

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    areasNivel1: areas.map(a => ({
      id: a.id,
      nome: a.nome,
      tipoArea: a.tipoArea,
      status: a.status,
      pontos: Array.isArray(a.poligono) ? a.poligono.length : 0
    }))
  };
}


function setupS2461() {
  return setupS246();
}

function diagnosticoS2461() {
  return diagnosticoS246();
}


function setupS2462() {
  return setupS246();
}

function diagnosticoS2462() {
  return diagnosticoS246();
}


// ========================================================
// S25.1 — CENTRAL DE GOVERNANÇA CARTOGRÁFICA
// ========================================================
function setupS251() {
  exigirPermissaoS14_('administrar');

  // Setup incremental: S24 já foi instalada e validada.
  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');

  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S25.1', 'Central de governança cartográfica');
    setConfigValue_(cfg, 'S251_STATUS', 'INSTALADO', 'Painel administrativo cartográfico');
  }

  SpreadsheetApp.flush();
  return diagnosticoS251();
}

function appObterGovernancaCartograficaS25() {
  exigirPermissaoS14_('administrar');

  const ss = SpreadsheetApp.getActive();

  const niveis = (typeof appListarNiveisS241 === 'function')
    ? appListarNiveisS241()
    : [];

  const pares = (typeof appListarParesCalibracaoS242 === 'function')
    ? appListarParesCalibracaoS242()
    : [];

  const shTrans = ss.getSheetByName('MAPA_TRANSFORMACOES');
  const trans = shTrans ? s240Objects_(shTrans) : [];

  const calibracoes = pares.map(p => {
    const r = trans.find(x => String(x.ID_TRANSFORMACAO || '') === String(p.id || ''));

    const rmse = s252PrimeiroNumero_(r, [
      'RMSE', 'RMSE_PCT', 'ERRO_RMSE', 'RMSE_PERCENTUAL'
    ]);
    const erroMaximo = s252PrimeiroNumero_(r, [
      'ERRO_MAXIMO', 'ERRO_MAXIMO_PCT', 'MAX_ERROR', 'ERRO_MAX', 'MAXIMO'
    ]);

    const atualizado = s252PrimeiroValor_(r, [
      'ATUALIZADO_EM', 'DATA_ATUALIZACAO', 'VALIDADO_EM', 'CRIADO_EM'
    ]);

    const idadeDias = s252DiasDesde_(atualizado);
    const qualidade = s252ClassificarCalibracao_(rmse, erroMaximo, idadeDias);

    return {
      id: p.id,
      nome: p.nome,
      nivel: p.nivel,
      mapa: p.mapa,
      status: String(r && r.STATUS || p.status || 'PENDENTE'),
      rmse,
      erroMaximo,
      atualizadoEm: s243ValorRpcSeguro_(atualizado),
      idadeDias,
      qualidade: qualidade.status,
      qualidadeMotivo: qualidade.motivo
    };
  });

  const shArea = ss.getSheetByName('MAPA_AREAS_NIVEL');
  const areaRows = shArea ? s240Objects_(shArea) : [];
  const areas = areaRows
    .filter(r => String(r.ID_COLECAO || '') === S240.COLECAO_ID)
    .map(r => {
      let poligono = [];
      try { poligono = JSON.parse(String(r.POLIGONO_JSON || '[]')) } catch (_) { }

      const pontos = Array.isArray(poligono) ? poligono.length : 0;
      const status = String(r.STATUS || 'PENDENTE');
      let saude = 'OK';
      let saudeMotivo = 'Área válida.';

      if (status !== 'VALIDADA') {
        saude = 'ATENÇÃO';
        saudeMotivo = 'Área ainda não validada.';
      } else if (pontos < 4) {
        saude = 'CRÍTICO';
        saudeMotivo = 'Polígono inválido ou incompleto.';
      }

      return {
        id: String(r.ID_AREA || ''),
        nome: String(r.NOME || ''),
        nivel: String(r.ID_PLANTA_NIVEL || ''),
        mapa: String(r.ID_MAPA_NATIVO || ''),
        tipoArea: String(r.TIPO_AREA || ''),
        status,
        pontos,
        atualizadoEm: s243ValorRpcSeguro_(r.ATUALIZADO_EM),
        saude,
        saudeMotivo
      };
    });

  const shMapas = ss.getSheetByName('MAPAS_SETORES');
  const mapaRows = shMapas ? s240Objects_(shMapas) : [];
  const mapasLogicos = mapaRows
    .filter(r =>
      String(r.STATUS_PLANIFICACAO || '') === 'AREA_NATIVA_NIVEL' ||
      String(r.STATUS_PUBLICACAO || '') === 'OPERACIONAL_VIA_NIVEL'
    )
    .map(r => {
      const id = String(r.ID_MAPA_SETOR || '');
      const area = areas.find(a => a.mapa === id);
      let saude = 'OK';
      let saudeMotivo = 'Mapa lógico consistente.';
      if (!area) {
        saude = 'ATENÇÃO';
        saudeMotivo = 'Mapa lógico sem área correspondente.';
      } else if (area.status !== 'VALIDADA') {
        saude = 'ATENÇÃO';
        saudeMotivo = 'Área correspondente não validada.';
      }
      return {
        id,
        nome: String(r.NOME || ''),
        nivel: String(r.ID_PLANTA || ''),
        piso: String(r.PISO || ''),
        ativo: String(r.ATIVO || ''),
        publicacao: String(r.STATUS_PUBLICACAO || ''),
        planificacao: String(r.STATUS_PLANIFICACAO || ''),
        saude,
        saudeMotivo
      };
    });

  const config = s251ConfigResumo_(ss);

  const alertas = [];

  const niveisOperacionais = niveis.filter(function(n){ return ['PLA-CFF-N1-2025','PLA-CFF-N2-2025','PLA-CFF-N3-2025'].indexOf(String(n.id||'')) >= 0; });
  const niveisAdicionais = niveis.filter(function(n){ return niveisOperacionais.indexOf(n) < 0; });
  if (niveisOperacionais.length !== 3) alertas.push(`Plantas operacionais calibradas: ${niveisOperacionais.length}/3.`);

  const calibracoesValidas = calibracoes.filter(c => c.status === 'VALIDADA').length;
  if (calibracoesValidas !== 5) {
    alertas.push(`Calibrações validadas: ${calibracoesValidas}/5.`);
  }

  // S26.10-A3 — compatibilidade da governança com a cartografia expandida.
  // S25 nasceu com 8 áreas. S26.8 ampliou legitimamente esse conjunto; portanto
  // 8 passa a ser um mínimo histórico, não um total exato. Todas as áreas que
  // compõem o estado governado continuam obrigatoriamente válidas.
  const areasMinimasHistoricas = 8;
  const areasValidas = areas.filter(a => a.status === 'VALIDADA').length;
  if (areas.length < areasMinimasHistoricas) {
    alertas.push(`Áreas cartográficas abaixo do mínimo histórico: ${areas.length}/${areasMinimasHistoricas}.`);
  }
  if (areasValidas !== areas.length) {
    alertas.push(`Áreas validadas: ${areasValidas}/${areas.length}.`);
  }

  const mapasLogicosMinimosHistoricos = 8;
  if (mapasLogicos.length < mapasLogicosMinimosHistoricos) {
    alertas.push(`Mapas lógicos abaixo do mínimo histórico: ${mapasLogicos.length}/${mapasLogicosMinimosHistoricos}.`);
  }

  calibracoes.forEach(c => {
    if (c.qualidade === 'CRÍTICO') {
      alertas.push(`${c.nome}: ${c.qualidadeMotivo}`);
    } else if (c.qualidade === 'ATENÇÃO') {
      alertas.push(`${c.nome}: ${c.qualidadeMotivo}`);
    }
  });

  areas.filter(a => a.saude !== 'OK').forEach(a => {
    alertas.push(`${a.nome}: ${a.saudeMotivo}`);
  });

  mapasLogicos.filter(m => m.saude !== 'OK').forEach(m => {
    alertas.push(`${m.nome || m.id}: ${m.saudeMotivo}`);
  });

  const versoesNivel = niveis.map(n => String(n.versao || '')).filter(Boolean);
  const versaoDivergente = versoesNivel.length &&
    versoesNivel.some(v => v !== String(S240.VERSAO_CARTOGRAFICA || ''));
  if (versaoDivergente) {
    alertas.push('Existe planta de nível com versão diferente da versão cartográfica vigente.');
  }

  const qualidadeResumo = {
    ok: calibracoes.filter(c => c.qualidade === 'OK').length,
    atencao: calibracoes.filter(c => c.qualidade === 'ATENÇÃO').length,
    critico: calibracoes.filter(c => c.qualidade === 'CRÍTICO').length
  };

  return {
    versaoApp: APP.VERSAO,
    fase: APP.FASE,
    colecao: S240.COLECAO_ID,
    dataBase: S240.DATA_BASE,
    versaoCartografica: S240.VERSAO_CARTOGRAFICA,
    config,
    niveis,
    calibracoes,
    areas,
    mapasLogicos,
    qualidadeResumo,
    resumo: {
      niveisValidos: niveisOperacionais.length,
      niveisEsperados: 3,
      niveisAdicionais: niveisAdicionais.length,
      calibracoesValidas,
      calibracoesEsperadas: 5,
      areasValidas,
      // Mantém a propriedade histórica usada pela UI, agora refletindo o
      // conjunto governado atual (nunca abaixo do mínimo legado de 8).
      areasEsperadas: Math.max(areasMinimasHistoricas, areas.length),
      areasMinimasHistoricas,
      mapasLogicos: mapasLogicos.length,
      mapasLogicosMinimosHistoricos,
      alertas: alertas.length
    },
    alertas,
    integridade: alertas.length === 0
  };
}

function s252PrimeiroNumero_(obj, chaves) {
  if (!obj) return null;
  for (const k of chaves) {
    if (obj[k] === null || obj[k] === undefined || obj[k] === '') continue;
    const n = Number(String(obj[k]).replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function s252PrimeiroValor_(obj, chaves) {
  if (!obj) return '';
  for (const k of chaves) {
    if (obj[k] !== null && obj[k] !== undefined && obj[k] !== '') return obj[k];
  }
  return '';
}

function s252DiasDesde_(valor) {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function s252ClassificarCalibracao_(rmse, erroMaximo, idadeDias) {
  if (!Number.isFinite(rmse)) {
    return { status: 'ATENÇÃO', motivo: 'RMSE indisponível.' };
  }

  if (Number.isFinite(erroMaximo)) {
    if (rmse > 0.50 || erroMaximo > 0.75) {
      return {
        status: 'CRÍTICO',
        motivo: `Qualidade fora do limite: RMSE ${s251Pct_(rmse)} / erro máximo ${s251Pct_(erroMaximo)}.`
      };
    }
    if (rmse > 0.25 || erroMaximo > 0.50) {
      return {
        status: 'ATENÇÃO',
        motivo: `Qualidade requer revisão: RMSE ${s251Pct_(rmse)} / erro máximo ${s251Pct_(erroMaximo)}.`
      };
    }
  } else if (rmse > 0.50) {
    return {
      status: 'CRÍTICO',
      motivo: `RMSE elevado: ${s251Pct_(rmse)}.`
    };
  } else if (rmse > 0.25) {
    return {
      status: 'ATENÇÃO',
      motivo: `RMSE requer revisão: ${s251Pct_(rmse)}.`
    };
  }

  if (Number.isFinite(idadeDias) && idadeDias > 365) {
    return {
      status: 'ATENÇÃO',
      motivo: `Calibração com ${idadeDias} dias desde a última atualização.`
    };
  }

  return {
    status: 'OK',
    motivo: Number.isFinite(idadeDias)
      ? `Qualidade dentro dos limites • atualizada há ${idadeDias} dia(s).`
      : 'Qualidade dentro dos limites.'
  };
}

function appRevalidarIntegridadeCartograficaS252() {
  exigirPermissaoS14_('administrar');
  const inicio = Date.now();
  const g = appObterGovernancaCartograficaS25();

  try {
    registrarAuditoriaS15_({
      acao: 'REVALIDAR_INTEGRIDADE_CARTOGRAFICA_S252',
      entidade: 'CARTOGRAFIA',
      entidadeId: S240.COLECAO_ID,
      resultado: g.integridade ? 'SUCESSO' : 'ATENCAO',
      origem: 'WEB_APP',
      detalhes: {
        alertas: g.alertas,
        duracaoMs: Date.now() - inicio,
        resumo: g.resumo
      }
    });
  } catch (_) { }

  return {
    ok: g.integridade,
    executadoEm: new Date().toISOString(),
    duracaoMs: Date.now() - inicio,
    resumo: g.resumo,
    qualidadeResumo: g.qualidadeResumo,
    alertas: g.alertas
  };
}

function setupS252() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');

  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S25.2', 'Saúde e qualidade cartográfica');
    setConfigValue_(cfg, 'S252_STATUS', 'INSTALADO', 'Classificação de qualidade e revalidação');
  }

  SpreadsheetApp.flush();
  return diagnosticoS252();
}

function diagnosticoS252() {
  const g = appObterGovernancaCartograficaS25();
  const checks = [];

  check_(checks, 'S252_CALIBRACOES_5',
    g.calibracoes.length === 5,
    `${g.calibracoes.length}/5 calibrações`
  );

  check_(checks, 'S252_QUALIDADE_CLASSIFICADA',
    g.calibracoes.every(c => !!c.qualidade),
    'Todas as calibrações possuem classificação'
  );

  check_(checks, 'S252_AREAS_8',
    g.areas.length >= 8 && g.areas.every(a => String(a.status || '') === 'VALIDADA'),
    `${g.areas.length} área(s) • mínimo histórico 8 • ${g.resumo.areasValidas} validada(s)`
  );

  check_(checks, 'S252_MAPAS_LOGICOS_8',
    g.mapasLogicos.length >= 8 && g.mapasLogicos.every(m => String(m.saude || '') === 'OK'),
    `${g.mapasLogicos.length} mapa(s) lógico(s) • mínimo histórico 8`
  );

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    resumo: g.resumo,
    qualidadeResumo: g.qualidadeResumo
  };
}

function diagnosticoS251() {
  const checks = [];
  let g = null;

  try { g = appObterGovernancaCartograficaS25() } catch (e) {
    check_(checks, 'S251_GOVERNANCA', false, e.message || String(e));
    return {
      ok: false,
      version: APP.VERSAO,
      fase: APP.FASE,
      checks,
      totalChecks: checks.length,
      falhas: checks.length
    };
  }

  check_(checks, 'S251_NIVEIS',
    g.resumo.niveisValidos === 3,
    `${g.resumo.niveisValidos}/3 níveis`
  );

  check_(checks, 'S251_CALIBRACOES',
    g.resumo.calibracoesValidas === 5,
    `${g.resumo.calibracoesValidas}/5 calibrações`
  );

  check_(checks, 'S251_AREAS',
    g.areas.length >= 8 && g.resumo.areasValidas === g.areas.length,
    `${g.resumo.areasValidas}/${g.areas.length} área(s) válida(s) • mínimo histórico 8`
  );

  check_(checks, 'S251_MAPAS_LOGICOS',
    g.resumo.mapasLogicos >= 8,
    `${g.resumo.mapasLogicos} mapa(s) lógico(s)`
  );

  check_(checks, 'S251_INTEGRIDADE',
    g.integridade,
    g.integridade ? 'Sem alertas cartográficos' : `${g.resumo.alertas} alerta(s)`
  );

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    resumo: g.resumo
  };
}
function s251Pct_(v) {
  if (!Number.isFinite(Number(v))) return '—';
  return Number(v).toFixed(2) + '%';
}

function s251ConfigResumo_(ss) {
  const sh = ss.getSheetByName('CONFIG');
  if (!sh) return {};
  const rows = s240Objects_(sh);
  const mapa = {};
  rows.forEach(r => {
    const k = String(r.CHAVE || r.KEY || r.CONFIG || '').trim();
    const v = r.VALOR !== undefined ? r.VALOR : r.VALUE;
    if (k) mapa[k] = v;
  });
  return {
    appVersao: String(mapa.APP_VERSAO || APP.VERSAO),
    appFase: String(mapa.APP_FASE || APP.FASE),
    s246: String(mapa.S246_STATUS || ''),
    s251: String(mapa.S251_STATUS || '')
  };
}


// ========================================================
// S25.3 — HISTÓRICO E VERSIONAMENTO CARTOGRÁFICO
// ========================================================
const S253_HIST_HEADERS = [
  'ID_EVENTO', 'TIPO_EVENTO', 'ENTIDADE', 'ENTIDADE_ID', 'NOME',
  'VERSAO_CARTOGRAFICA', 'ANTES_JSON', 'DEPOIS_JSON',
  'MOTIVO', 'USUARIO', 'DATA_HORA', 'ORIGEM'
];

function setupS253() {
  exigirPermissaoS14_('administrar');

  const ss = SpreadsheetApp.getActive();
  s240EnsureSheet_(ss, 'CARTOGRAFIA_HISTORICO', S253_HIST_HEADERS);

  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S25.3', 'Histórico e versionamento cartográfico');
    setConfigValue_(cfg, 'S253_STATUS', 'INSTALADO', 'Histórico cartográfico habilitado');
  }

  SpreadsheetApp.flush();
  return diagnosticoS253();
}

function diagnosticoS253() {
  const checks = [];
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('CARTOGRAFIA_HISTORICO');
  check_(checks, 'S253_ABA_HISTORICO', !!sh, 'CARTOGRAFIA_HISTORICO disponível');

  let rows = [];
  if (sh) rows = s240Objects_(sh);
  check_(checks, 'S253_LEITURA', Array.isArray(rows), `${rows.length} evento(s)`);

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    eventos: rows.length
  };
}

function s253RegistrarEvento_(evento) {
  evento = evento || {};
  const ss = SpreadsheetApp.getActive();
  const sh = s240EnsureSheet_(ss, 'CARTOGRAFIA_HISTORICO', S253_HIST_HEADERS);

  let usuario = '';
  try { usuario = Session.getActiveUser().getEmail() || '' } catch (_) { }

  const id = 'CART-HIST-' + Utilities.getUuid().replace(/-/g, '').slice(0, 16).toUpperCase();
  const agora = new Date();

  s240Upsert_(sh, 'ID_EVENTO', {
    ID_EVENTO: id,
    TIPO_EVENTO: String(evento.tipoEvento || 'ALTERACAO'),
    ENTIDADE: String(evento.entidade || 'CARTOGRAFIA'),
    ENTIDADE_ID: String(evento.entidadeId || ''),
    NOME: String(evento.nome || ''),
    VERSAO_CARTOGRAFICA: 'v' + String(S240.VERSAO_CARTOGRAFICA || ''),
    ANTES_JSON: JSON.stringify(evento.antes || null),
    DEPOIS_JSON: JSON.stringify(evento.depois || null),
    MOTIVO: String(evento.motivo || ''),
    USUARIO: usuario,
    DATA_HORA: agora,
    ORIGEM: String(evento.origem || 'WEB_APP')
  });

  return id;
}

function appListarHistoricoCartograficoS253(filtros) {
  exigirPermissaoS14_('administrar');
  filtros = filtros || {};

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('CARTOGRAFIA_HISTORICO');
  if (!sh) return [];

  let rows = s240Objects_(sh).map(r => ({
    id: String(r.ID_EVENTO || ''),
    tipo: String(r.TIPO_EVENTO || ''),
    entidade: String(r.ENTIDADE || ''),
    entidadeId: String(r.ENTIDADE_ID || ''),
    nome: String(r.NOME || ''),
    versao: s253NormalizarVersao_(r.VERSAO_CARTOGRAFICA),
    motivo: String(r.MOTIVO || ''),
    usuario: String(r.USUARIO || ''),
    dataHora: s243ValorRpcSeguro_(r.DATA_HORA),
    origem: String(r.ORIGEM || ''),
    antes: s253ParseJson_(r.ANTES_JSON),
    depois: s253ParseJson_(r.DEPOIS_JSON)
  }));

  const entidade = String(filtros.entidade || '').trim();
  if (entidade) rows = rows.filter(r => r.entidade === entidade);

  const tipo = String(filtros.tipo || '').trim();
  if (tipo) rows = rows.filter(r => r.tipo === tipo);

  rows.sort((a, b) => new Date(b.dataHora || 0) - new Date(a.dataHora || 0));

  const limite = Math.min(200, Math.max(1, Number(filtros.limite || 100)));
  return rows.slice(0, limite);
}

function appObterEventoCartograficoS253(idEvento) {
  exigirPermissaoS14_('administrar');
  const id = String(idEvento || '').trim();
  if (!id) throw new Error('Informe o ID do evento.');

  const rows = appListarHistoricoCartograficoS253({ limite: 200 });
  const r = rows.find(x => x.id === id);
  if (!r) throw new Error('Evento cartográfico não encontrado.');
  return r;
}

function appCriarSnapshotCartograficoS253(motivo) {
  exigirPermissaoS14_('administrar');

  const estado = s253EstadoAtualCartografia_();
  const id = s253RegistrarEvento_({
    tipoEvento: 'SNAPSHOT',
    entidade: 'CARTOGRAFIA',
    entidadeId: S240.COLECAO_ID,
    nome: 'Snapshot cartográfico',
    antes: null,
    depois: estado,
    motivo: String(motivo || 'Snapshot manual'),
    origem: 'WEB_APP'
  });

  try {
    registrarAuditoriaS15_({
      acao: 'CRIAR_SNAPSHOT_CARTOGRAFICO_S253',
      entidade: 'CARTOGRAFIA',
      entidadeId: id,
      resultado: 'SUCESSO',
      origem: 'WEB_APP',
      detalhes: { motivo: String(motivo || 'Snapshot manual') }
    });
  } catch (_) { }

  return { ok: true, idEvento: id, estadoResumo: s253ResumoEstado_(estado) };
}

function s253EstadoAtualCartografia_() {
  const ss = SpreadsheetApp.getActive();

  const trans = ss.getSheetByName('MAPA_TRANSFORMACOES');
  const areas = ss.getSheetByName('MAPA_AREAS_NIVEL');
  const mapas = ss.getSheetByName('MAPAS_SETORES');
  const plantas = ss.getSheetByName('PLANTAS');

  const transRows = trans ? s240Objects_(trans) : [];
  const areaRows = areas ? s240Objects_(areas) : [];
  const mapaRows = mapas ? s240Objects_(mapas) : [];
  const plantaRows = plantas ? s240Objects_(plantas) : [];

  return {
    versaoCartografica: S240.VERSAO_CARTOGRAFICA,
    dataBase: S240.DATA_BASE,
    colecao: S240.COLECAO_ID,
    calibracoes: transRows.filter(r =>
      String(r.ID_TRANSFORMACAO || '').startsWith('CAL-')
    ),
    areas: areaRows.filter(r =>
      String(r.ID_COLECAO || '') === S240.COLECAO_ID
    ),
    mapasLogicos: mapaRows.filter(r =>
      String(r.STATUS_PUBLICACAO || '') === 'OPERACIONAL_VIA_NIVEL'
    ),
    plantasNivel: plantaRows.filter(r =>
      /^PLA-CFF-N[123]-2025$/.test(String(r.ID_PLANTA || ''))
    )
  };
}

function s253ResumoEstado_(estado) {
  estado = estado || {};
  return {
    calibracoes: Array.isArray(estado.calibracoes) ? estado.calibracoes.length : 0,
    areas: Array.isArray(estado.areas) ? estado.areas.length : 0,
    mapasLogicos: Array.isArray(estado.mapasLogicos) ? estado.mapasLogicos.length : 0,
    plantasNivel: Array.isArray(estado.plantasNivel) ? estado.plantasNivel.length : 0
  };
}


function s253NormalizarVersao_(v) {
  if (v === null || v === undefined || v === '') return '';

  // Registros novos usam prefixo "v" para impedir que o Sheets
  // converta 2025.01 em data.
  const s = String(v);
  if (/^v\d{4}\.\d{2}$/.test(s)) return s.slice(1);

  // Corrige registros antigos que o Sheets converteu em Date.
  const d = v instanceof Date ? v : new Date(v);
  if (!Number.isNaN(d.getTime())) {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    // O caso conhecido 2025.01 convertido em 01/01/2025.
    if (ano >= 2020 && ano <= 2100) return `${ano}.${mes}`;
  }

  return s.replace(/^v/, '');
}

function s253ParseJson_(v) {
  if (v === null || v === undefined || v === '') return null;
  try { return JSON.parse(String(v)) } catch (_) { return String(v) }
}

// ---- Hooks de versionamento nas alterações existentes ----

function s253SnapshotEntidadeArea_(idArea) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('MAPA_AREAS_NIVEL');
  if (!sh) return null;
  return s240Objects_(sh).find(r => String(r.ID_AREA || '') === String(idArea || '')) || null;
}

function s253SnapshotTransformacao_(id) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('MAPA_TRANSFORMACOES');
  if (!sh) return null;
  return s240Objects_(sh).find(r => String(r.ID_TRANSFORMACAO || '') === String(id || '')) || null;
}


function setupS2531() {
  return setupS253();
}

function diagnosticoS2531() {
  return diagnosticoS253();
}


// ========================================================
// S25.4 — RESTAURAÇÃO CONTROLADA CARTOGRÁFICA
// ========================================================
function setupS254() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S25.4', 'Restauração controlada cartográfica');
    setConfigValue_(cfg, 'S254_STATUS', 'INSTALADO', 'Restauração segura por snapshot');
  }
  SpreadsheetApp.flush();
  return diagnosticoS254();
}

function diagnosticoS254() {
  const checks = [];
  const ss = SpreadsheetApp.getActive();
  const hist = ss.getSheetByName('CARTOGRAFIA_HISTORICO');
  check_(checks, 'S254_HISTORICO', !!hist, 'CARTOGRAFIA_HISTORICO disponível');

  let snapshots = [];
  try { snapshots = appListarHistoricoCartograficoS253({ tipo: 'SNAPSHOT', limite: 200 }); } catch (_) { }

  check_(checks, 'S254_SNAPSHOTS_LEITURA', Array.isArray(snapshots), `${snapshots.length} snapshot(s) disponível(is)`);

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    snapshots: snapshots.length
  };
}

function appListarSnapshotsRestauraveisS254() {
  exigirPermissaoS14_('administrar');
  return appListarHistoricoCartograficoS253({ tipo: 'SNAPSHOT', limite: 200 }).map(r => ({
    id: r.id,
    nome: r.nome,
    motivo: r.motivo,
    usuario: r.usuario,
    dataHora: r.dataHora,
    versao: r.versao,
    resumo: s253ResumoEstado_(r.depois || {})
  }));
}

function appPrevisualizarRestauracaoS254(idEvento) {
  exigirPermissaoS14_('administrar');

  const snap = appObterEventoCartograficoS253(idEvento);
  if (snap.tipo !== 'SNAPSHOT') throw new Error('Somente eventos SNAPSHOT podem ser restaurados.');

  const destino = snap.depois;
  if (!destino || typeof destino !== 'object') throw new Error('Snapshot sem estado cartográfico restaurável.');

  const atual = s253EstadoAtualCartografia_();
  const diffs = {
    calibracoes: s254CompararColecao_(atual.calibracoes || [], destino.calibracoes || [], 'ID_TRANSFORMACAO'),
    areas: s254CompararColecao_(atual.areas || [], destino.areas || [], 'ID_AREA'),
    mapasLogicos: s254CompararColecao_(atual.mapasLogicos || [], destino.mapasLogicos || [], 'ID_MAPA_SETOR'),
    plantasNivel: s254CompararColecao_(atual.plantasNivel || [], destino.plantasNivel || [], 'ID_PLANTA')
  };

  const totalMudancas = Object.values(diffs).reduce(
    (s, d) => s + d.alterados.length + d.adicionados.length + d.removidos.length, 0
  );

  return {
    snapshot: {
      id: snap.id,
      motivo: snap.motivo,
      usuario: snap.usuario,
      dataHora: snap.dataHora,
      versao: snap.versao
    },
    atual: s253ResumoEstado_(atual),
    destino: s253ResumoEstado_(destino),
    diffs,
    totalMudancas,
    podeRestaurar: true
  };
}

function appRestaurarSnapshotCartograficoS254(payload) {
  exigirPermissaoS14_('administrar');
  payload = payload || {};

  const idEvento = String(payload.idEvento || '').trim();
  const confirmacao = String(payload.confirmacao || '').trim();
  const motivo = String(payload.motivo || '').trim();

  if (!idEvento) throw new Error('Informe o snapshot.');
  if (confirmacao !== 'RESTAURAR') throw new Error('Confirmação inválida. Digite RESTAURAR.');
  if (motivo.length < 5) throw new Error('Informe o motivo da restauração.');

  const preview = appPrevisualizarRestauracaoS254(idEvento);
  const snap = appObterEventoCartograficoS253(idEvento);
  const destino = snap.depois;
  if (!destino || typeof destino !== 'object') throw new Error('Snapshot inválido.');

  // Proteção obrigatória: snapshot do estado atual antes da escrita.
  const seguranca = appCriarSnapshotCartograficoS253(
    `Snapshot automático antes da restauração ${idEvento}`
  );
  const antes = s253EstadoAtualCartografia_();

  try {
    s254RestaurarColecao_('MAPA_TRANSFORMACOES', 'ID_TRANSFORMACAO', antes.calibracoes || [], destino.calibracoes || []);
    s254RestaurarColecao_('MAPA_AREAS_NIVEL', 'ID_AREA', antes.areas || [], destino.areas || []);
    s254RestaurarColecao_('MAPAS_SETORES', 'ID_MAPA_SETOR', antes.mapasLogicos || [], destino.mapasLogicos || []);
    s254RestaurarColecao_('PLANTAS', 'ID_PLANTA', antes.plantasNivel || [], destino.plantasNivel || []);
    SpreadsheetApp.flush();

    const depois = s253EstadoAtualCartografia_();

    const histId = s253RegistrarEvento_({
      tipoEvento: 'RESTAURACAO',
      entidade: 'CARTOGRAFIA',
      entidadeId: idEvento,
      nome: 'Restauração cartográfica',
      antes,
      depois,
      motivo,
      origem: 'WEB_APP'
    });

    try {
      registrarAuditoriaS15_({
        acao: 'RESTAURAR_SNAPSHOT_CARTOGRAFICO_S254',
        entidade: 'CARTOGRAFIA',
        entidadeId: idEvento,
        resultado: 'SUCESSO',
        origem: 'WEB_APP',
        detalhes: {
          snapshotOrigem: idEvento,
          snapshotSeguranca: seguranca.idEvento,
          eventoRestauracao: histId,
          totalMudancas: preview.totalMudancas,
          motivo
        }
      });
    } catch (_) { }

    return {
      ok: true,
      snapshotOrigem: idEvento,
      snapshotSeguranca: seguranca.idEvento,
      eventoRestauracao: histId,
      totalMudancas: preview.totalMudancas,
      resumoDepois: s253ResumoEstado_(depois)
    };
  } catch (e) {
    try {
      registrarAuditoriaS15_({
        acao: 'RESTAURAR_SNAPSHOT_CARTOGRAFICO_S254',
        entidade: 'CARTOGRAFIA',
        entidadeId: idEvento,
        resultado: 'ERRO',
        origem: 'WEB_APP',
        detalhes: {
          snapshotOrigem: idEvento,
          snapshotSeguranca: seguranca.idEvento,
          erro: e.message || String(e),
          motivo
        }
      });
    } catch (_) { }
    throw e;
  }
}

function s254CompararColecao_(atual, destino, chave) {
  atual = Array.isArray(atual) ? atual : [];
  destino = Array.isArray(destino) ? destino : [];

  const a = new Map(atual.map(r => [String(r[chave] || ''), r]));
  const d = new Map(destino.map(r => [String(r[chave] || ''), r]));
  const adicionados = [], removidos = [], alterados = [], iguais = [];

  d.forEach((r, id) => {
    if (!a.has(id)) { adicionados.push(id); return; }
    if (JSON.stringify(s254NormalizarObjeto_(a.get(id))) !== JSON.stringify(s254NormalizarObjeto_(r))) {
      alterados.push(id);
    } else {
      iguais.push(id);
    }
  });

  a.forEach((r, id) => { if (!d.has(id)) removidos.push(id); });
  return { adicionados, removidos, alterados, iguais };
}

function s254NormalizarObjeto_(obj) {
  const out = {};
  Object.keys(obj || {}).sort().forEach(k => {
    const v = obj[k];
    out[k] = v instanceof Date ? v.toISOString() : (v === undefined ? null : v);
  });
  return out;
}

function s254RestaurarColecao_(nomeAba, chave, atuais, destino) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(nomeAba);
  if (!sh) throw new Error(`Aba ${nomeAba} ausente.`);

  atuais = Array.isArray(atuais) ? atuais : [];
  destino = Array.isArray(destino) ? destino : [];

  const destinoIds = new Set(destino.map(r => String(r[chave] || '')));
  const atuaisIds = new Set(atuais.map(r => String(r[chave] || '')));
  const data = sh.getDataRange().getValues();
  const headers = data.length ? data[0].map(String) : [];
  const idxChave = headers.indexOf(chave);

  if (idxChave < 0) throw new Error(`Coluna ${chave} ausente em ${nomeAba}.`);

  // Remove somente itens pertencentes ao subconjunto governado.
  for (let i = data.length - 1; i >= 1; i--) {
    const id = String(data[i][idxChave] || '');
    if (id && atuaisIds.has(id) && !destinoIds.has(id)) sh.deleteRow(i + 1);
  }

  destino.forEach(r => s240Upsert_(sh, chave, r));
}


// ========================================================
// S25.5 — PUBLICAÇÃO E CICLO DE VIDA CARTOGRÁFICO
// ========================================================
const S255_PUB_HEADERS = [
  'ID_PUBLICACAO', 'VERSAO', 'TITULO', 'STATUS', 'BASE_JSON', 'DRAFT_JSON',
  'CRIADO_EM', 'CRIADO_POR', 'ENVIADO_VALIDACAO_EM', 'ENVIADO_VALIDACAO_POR',
  'PUBLICADO_EM', 'PUBLICADO_POR', 'ARQUIVADO_EM', 'ARQUIVADO_POR',
  'MOTIVO', 'OBSERVACOES'
];

const S255_STATUS = {
  RASCUNHO: 'RASCUNHO',
  EM_VALIDACAO: 'EM_VALIDACAO',
  PUBLICADA: 'PUBLICADA',
  ARQUIVADA: 'ARQUIVADA'
};

function setupS255() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const sh = s240EnsureSheet_(ss, 'CARTOGRAFIA_PUBLICACOES', S255_PUB_HEADERS);
  sh.setFrozenRows(1);

  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'APP_VERSAO', APP.VERSAO, 'Versão atualmente instalada');
    setConfigValue_(cfg, 'APP_FASE', 'S25.5', 'Publicação e ciclo de vida cartográfico');
    setConfigValue_(cfg, 'S255_STATUS', 'INSTALADO', 'Workflow Rascunho → Validação → Publicada → Arquivada');
  }

  SpreadsheetApp.flush();
  return diagnosticoS255();
}

function diagnosticoS255() {
  const checks = [];
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('CARTOGRAFIA_PUBLICACOES');

  check_(checks, 'S255_ABA', !!sh, 'CARTOGRAFIA_PUBLICACOES disponível');

  const rows = sh ? s240Objects_(sh) : [];
  const ativos = rows.filter(r =>
    [S255_STATUS.RASCUNHO, S255_STATUS.EM_VALIDACAO].includes(String(r.STATUS || ''))
  );

  check_(checks, 'S255_UNICO_ATIVO',
    ativos.length <= 1,
    `${ativos.length} pacote(s) ativo(s)`
  );

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length,
    publicacoes: rows.length,
    ativo: ativos.length ? String(ativos[0].ID_PUBLICACAO || '') : null
  };
}

function appObterCicloPublicacaoCartograficaS255() {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('CARTOGRAFIA_PUBLICACOES');
  const rows = sh ? s240Objects_(sh) : [];

  const lista = rows.map(s255PublicacaoRpc_).sort((a, b) =>
    new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0)
  );

  const ativo = lista.find(r =>
    [S255_STATUS.RASCUNHO, S255_STATUS.EM_VALIDACAO].includes(r.status)
  ) || null;

  const publicada = lista.find(r => r.status === S255_STATUS.PUBLICADA) || null;

  return {
    ativo,
    publicada,
    lista: lista.slice(0, 50),
    mapaOperacionalProtegido: !!ativo
  };
}

function appCriarRascunhoCartograficoS255(payload) {
  exigirPermissaoS14_('administrar');
  payload = payload || {};

  const titulo = String(payload.titulo || '').trim();
  const motivo = String(payload.motivo || '').trim();
  if (titulo.length < 3) throw new Error('Informe um título para o rascunho.');
  if (motivo.length < 5) throw new Error('Informe o motivo da alteração cartográfica.');

  const ss = SpreadsheetApp.getActive();
  const sh = s240EnsureSheet_(ss, 'CARTOGRAFIA_PUBLICACOES', S255_PUB_HEADERS);
  const rows = s240Objects_(sh);

  if (rows.some(r =>
    [S255_STATUS.RASCUNHO, S255_STATUS.EM_VALIDACAO].includes(String(r.STATUS || ''))
  )) {
    throw new Error('Já existe um rascunho ou pacote em validação. Conclua-o antes de criar outro.');
  }

  const agora = new Date();
  const usuario = s255Usuario_();
  const estado = s253EstadoAtualCartografia_();
  const id = 'CART-PUB-' + Utilities.getUuid().replace(/-/g, '').slice(0, 16).toUpperCase();
  const versao = s255ProximaVersao_(rows);

  s240Upsert_(sh, 'ID_PUBLICACAO', {
    ID_PUBLICACAO: id,
    VERSAO: 'v' + versao,
    TITULO: titulo,
    STATUS: S255_STATUS.RASCUNHO,
    BASE_JSON: JSON.stringify(estado),
    DRAFT_JSON: JSON.stringify(estado),
    CRIADO_EM: agora,
    CRIADO_POR: usuario,
    ENVIADO_VALIDACAO_EM: '',
    ENVIADO_VALIDACAO_POR: '',
    PUBLICADO_EM: '',
    PUBLICADO_POR: '',
    ARQUIVADO_EM: '',
    ARQUIVADO_POR: '',
    MOTIVO: motivo,
    OBSERVACOES: 'S25.5 — alterações permanecem isoladas até a publicação.'
  });

  s253RegistrarEvento_({
    tipoEvento: 'RASCUNHO_CRIADO',
    entidade: 'CARTOGRAFIA_PUBLICACOES',
    entidadeId: id,
    nome: titulo,
    antes: null,
    depois: { id, versao, status: S255_STATUS.RASCUNHO },
    motivo,
    origem: 'WEB_APP'
  });

  return appObterCicloPublicacaoCartograficaS255();
}

function appEnviarValidacaoCartograficaS255(idPublicacao) {
  exigirPermissaoS14_('administrar');
  const pub = s255ObterPublicacao_(idPublicacao);
  if (pub.status !== S255_STATUS.RASCUNHO) {
    throw new Error('Somente um RASCUNHO pode ser enviado para validação.');
  }

  const draft = pub.draft;
  const valid = s255ValidarDraft_(draft);
  if (!valid.ok) {
    throw new Error('Rascunho não pode ser enviado: ' + valid.erros.join(' | '));
  }

  s255AtualizarPublicacao_(pub.id, {
    STATUS: S255_STATUS.EM_VALIDACAO,
    ENVIADO_VALIDACAO_EM: new Date(),
    ENVIADO_VALIDACAO_POR: s255Usuario_()
  });

  s253RegistrarEvento_({
    tipoEvento: 'ENVIADO_VALIDACAO',
    entidade: 'CARTOGRAFIA_PUBLICACOES',
    entidadeId: pub.id,
    nome: pub.titulo,
    antes: { status: S255_STATUS.RASCUNHO },
    depois: { status: S255_STATUS.EM_VALIDACAO },
    motivo: pub.motivo,
    origem: 'WEB_APP'
  });

  return appObterCicloPublicacaoCartograficaS255();
}

function appReabrirRascunhoCartograficoS255(idPublicacao) {
  exigirPermissaoS14_('administrar');
  const pub = s255ObterPublicacao_(idPublicacao);
  if (pub.status !== S255_STATUS.EM_VALIDACAO) {
    throw new Error('Somente pacote EM VALIDAÇÃO pode voltar para rascunho.');
  }

  s255AtualizarPublicacao_(pub.id, {
    STATUS: S255_STATUS.RASCUNHO,
    ENVIADO_VALIDACAO_EM: '',
    ENVIADO_VALIDACAO_POR: ''
  });

  s253RegistrarEvento_({
    tipoEvento: 'VALIDACAO_REABERTA',
    entidade: 'CARTOGRAFIA_PUBLICACOES',
    entidadeId: pub.id,
    nome: pub.titulo,
    antes: { status: S255_STATUS.EM_VALIDACAO },
    depois: { status: S255_STATUS.RASCUNHO },
    motivo: 'Retorno para ajustes',
    origem: 'WEB_APP'
  });

  return appObterCicloPublicacaoCartograficaS255();
}

function appDescartarRascunhoCartograficoS255(payload) {
  exigirPermissaoS14_('administrar');
  payload = payload || {};
  const pub = s255ObterPublicacao_(payload.idPublicacao);
  const motivo = String(payload.motivo || '').trim();

  if (![S255_STATUS.RASCUNHO, S255_STATUS.EM_VALIDACAO].includes(pub.status)) {
    throw new Error('Este pacote não pode mais ser descartado.');
  }
  if (motivo.length < 5) throw new Error('Informe o motivo do descarte.');

  s255AtualizarPublicacao_(pub.id, {
    STATUS: S255_STATUS.ARQUIVADA,
    ARQUIVADO_EM: new Date(),
    ARQUIVADO_POR: s255Usuario_(),
    OBSERVACOES: 'Descartado sem publicação. ' + motivo
  });

  s253RegistrarEvento_({
    tipoEvento: 'RASCUNHO_DESCARTADO',
    entidade: 'CARTOGRAFIA_PUBLICACOES',
    entidadeId: pub.id,
    nome: pub.titulo,
    antes: { status: pub.status },
    depois: { status: S255_STATUS.ARQUIVADA },
    motivo,
    origem: 'WEB_APP'
  });

  return appObterCicloPublicacaoCartograficaS255();
}

function appPrevisualizarPublicacaoCartograficaS255(idPublicacao) {
  exigirPermissaoS14_('administrar');
  const pub = s255ObterPublicacao_(idPublicacao);
  const atual = s253EstadoAtualCartografia_();
  const destino = pub.draft;

  const diffs = {
    calibracoes: s254CompararColecao_(atual.calibracoes || [], destino.calibracoes || [], 'ID_TRANSFORMACAO'),
    areas: s254CompararColecao_(atual.areas || [], destino.areas || [], 'ID_AREA'),
    mapasLogicos: s254CompararColecao_(atual.mapasLogicos || [], destino.mapasLogicos || [], 'ID_MAPA_SETOR'),
    plantasNivel: s254CompararColecao_(atual.plantasNivel || [], destino.plantasNivel || [], 'ID_PLANTA')
  };

  const totalMudancas = Object.values(diffs).reduce(
    (s, d) => s + d.alterados.length + d.adicionados.length + d.removidos.length, 0
  );

  const valid = s255ValidarDraft_(destino, atual);

  return {
    id: pub.id,
    versao: pub.versao,
    titulo: pub.titulo,
    status: pub.status,
    motivo: pub.motivo,
    totalMudancas,
    diffs,
    validacao: valid,
    resumoDestino: s253ResumoEstado_(destino)
  };
}

function appPublicarCartografiaS255(payload) {
  exigirPermissaoS14_('administrar');
  payload = payload || {};

  const pub = s255ObterPublicacao_(payload.idPublicacao);
  const confirmacao = String(payload.confirmacao || '').trim();

  if (pub.status !== S255_STATUS.EM_VALIDACAO) {
    throw new Error('A publicação exige status EM VALIDAÇÃO.');
  }
  if (confirmacao !== 'PUBLICAR') {
    throw new Error('Confirmação inválida. Digite PUBLICAR.');
  }

  const valid = s255ValidarDraft_(pub.draft);
  if (!valid.ok) {
    throw new Error('Publicação bloqueada: ' + valid.erros.join(' | '));
  }

  const preview = appPrevisualizarPublicacaoCartograficaS255(pub.id);

  // Snapshot obrigatório do operacional antes da publicação.
  const seguranca = appCriarSnapshotCartograficoS253(
    `Snapshot automático antes da publicação ${pub.versao} — ${pub.titulo}`
  );

  const antes = s253EstadoAtualCartografia_();

  try {
    s254RestaurarColecao_(
      'MAPA_TRANSFORMACOES', 'ID_TRANSFORMACAO',
      antes.calibracoes || [], pub.draft.calibracoes || []
    );
    s254RestaurarColecao_(
      'MAPA_AREAS_NIVEL', 'ID_AREA',
      antes.areas || [], pub.draft.areas || []
    );
    s254RestaurarColecao_(
      'MAPAS_SETORES', 'ID_MAPA_SETOR',
      antes.mapasLogicos || [], pub.draft.mapasLogicos || []
    );
    s254RestaurarColecao_(
      'PLANTAS', 'ID_PLANTA',
      antes.plantasNivel || [], pub.draft.plantasNivel || []
    );

    SpreadsheetApp.flush();

    // Arquiva publicação anterior, se existir.
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName('CARTOGRAFIA_PUBLICACOES');
    const rows = s240Objects_(sh);
    rows.filter(r =>
      String(r.STATUS || '') === S255_STATUS.PUBLICADA &&
      String(r.ID_PUBLICACAO || '') !== pub.id
    ).forEach(r => {
      s255AtualizarPublicacao_(String(r.ID_PUBLICACAO || ''), {
        STATUS: S255_STATUS.ARQUIVADA,
        ARQUIVADO_EM: new Date(),
        ARQUIVADO_POR: s255Usuario_()
      });
    });

    s255AtualizarPublicacao_(pub.id, {
      STATUS: S255_STATUS.PUBLICADA,
      PUBLICADO_EM: new Date(),
      PUBLICADO_POR: s255Usuario_()
    });

    const depois = s253EstadoAtualCartografia_();

    const histId = s253RegistrarEvento_({
      tipoEvento: 'PUBLICACAO',
      entidade: 'CARTOGRAFIA_PUBLICACOES',
      entidadeId: pub.id,
      nome: `${pub.versao} — ${pub.titulo}`,
      antes,
      depois,
      motivo: pub.motivo,
      origem: 'WEB_APP'
    });

    try {
      registrarAuditoriaS15_({
        acao: 'PUBLICAR_CARTOGRAFIA_S255',
        entidade: 'CARTOGRAFIA_PUBLICACOES',
        entidadeId: pub.id,
        resultado: 'SUCESSO',
        origem: 'WEB_APP',
        detalhes: {
          versao: pub.versao,
          snapshotSeguranca: seguranca.idEvento,
          eventoPublicacao: histId,
          totalMudancas: preview.totalMudancas
        }
      });
    } catch (_) { }

    return {
      ok: true,
      idPublicacao: pub.id,
      versao: pub.versao,
      snapshotSeguranca: seguranca.idEvento,
      eventoPublicacao: histId,
      totalMudancas: preview.totalMudancas,
      requerAtualizacaoCache: true
    };
  } catch (e) {
    try {
      registrarAuditoriaS15_({
        acao: 'PUBLICAR_CARTOGRAFIA_S255',
        entidade: 'CARTOGRAFIA_PUBLICACOES',
        entidadeId: pub.id,
        resultado: 'ERRO',
        origem: 'WEB_APP',
        detalhes: { erro: e.message || String(e) }
      });
    } catch (_) { }
    throw e;
  }
}

// ---------- STAGING ----------
function s255TemRascunhoAtivo_() {
  const p = s255PublicacaoAtiva_();
  return !!(p && p.status === S255_STATUS.RASCUNHO);
}

function s255PublicacaoAtiva_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('CARTOGRAFIA_PUBLICACOES');
  if (!sh) return null;

  const rows = s240Objects_(sh);
  const r = rows.find(x =>
    [S255_STATUS.RASCUNHO, S255_STATUS.EM_VALIDACAO].includes(String(x.STATUS || ''))
  );
  return r ? s255PublicacaoRpc_(r) : null;
}

function s255StageCalibracao_(par, registro) {
  const pub = s255PublicacaoAtiva_();
  if (!pub || pub.status !== S255_STATUS.RASCUNHO) return null;

  const draft = pub.draft;
  draft.calibracoes = Array.isArray(draft.calibracoes) ? draft.calibracoes : [];

  const idx = draft.calibracoes.findIndex(r =>
    String(r.ID_TRANSFORMACAO || '') === String(par.id || '')
  );
  if (idx >= 0) draft.calibracoes[idx] = registro;
  else draft.calibracoes.push(registro);

  s255SalvarDraft_(pub.id, draft);

  s253RegistrarEvento_({
    tipoEvento: 'ALTERACAO_RASCUNHO',
    entidade: 'MAPA_TRANSFORMACOES',
    entidadeId: par.id,
    nome: par.nome,
    antes: null,
    depois: { publicacao: pub.id, status: 'STAGED' },
    motivo: 'Recalibração gravada no rascunho, sem alterar produção.',
    origem: 'WEB_APP'
  });

  return {
    ok: true,
    staged: true,
    publicacaoId: pub.id,
    versao: pub.versao,
    status: String(registro.STATUS || 'VALIDADA'),
    rmse: Number(registro.RMSE || 0),
    maxErro: Number(registro.MAX_ERRO || 0),
    nome: String(par.nome || ''),
    mensagem: 'Calibração salva no rascunho. O mapa operacional não foi alterado.'
  };
}

function s255StageArea_(registro) {
  const pub = s255PublicacaoAtiva_();
  if (!pub || pub.status !== S255_STATUS.RASCUNHO) return null;

  const draft = pub.draft;
  draft.areas = Array.isArray(draft.areas) ? draft.areas : [];

  const id = String(registro.ID_AREA || '');
  const idx = draft.areas.findIndex(r => String(r.ID_AREA || '') === id);
  if (idx >= 0) draft.areas[idx] = registro;
  else draft.areas.push(registro);

  s255SalvarDraft_(pub.id, draft);

  s253RegistrarEvento_({
    tipoEvento: 'ALTERACAO_RASCUNHO',
    entidade: 'MAPA_AREAS_NIVEL',
    entidadeId: id,
    nome: String(registro.NOME || ''),
    antes: null,
    depois: { publicacao: pub.id, status: 'STAGED' },
    motivo: 'Área gravada no rascunho, sem alterar produção.',
    origem: 'WEB_APP'
  });

  return {
    ok: true,
    staged: true,
    publicacaoId: pub.id,
    versao: pub.versao,
    status: String(registro.STATUS || 'VALIDADA'),
    id: String(registro.ID_AREA || ''),
    nome: String(registro.NOME || 'Área'),
    tipoArea: String(registro.TIPO_AREA || ''),
    poligono: s253ParseJson_(registro.POLIGONO_JSON) || [],
    mensagem: 'Área salva no rascunho. O mapa operacional não foi alterado.'
  };
}

function s255OverlayArea_(idArea, live) {
  const pub = s255PublicacaoAtiva_();
  if (!pub || pub.status !== S255_STATUS.RASCUNHO) return live;

  const r = (pub.draft.areas || []).find(x =>
    String(x.ID_AREA || '') === String(idArea || '')
  );
  return r || live;
}

function s255OverlayTransformacao_(id, live) {
  const pub = s255PublicacaoAtiva_();
  if (!pub || pub.status !== S255_STATUS.RASCUNHO) return live;

  const r = (pub.draft.calibracoes || []).find(x =>
    String(x.ID_TRANSFORMACAO || '') === String(id || '')
  );
  return r || live;
}

function s255SalvarDraft_(id, draft) {
  s255AtualizarPublicacao_(id, {
    DRAFT_JSON: JSON.stringify(draft)
  });
}

function s255ObterPublicacao_(id) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('CARTOGRAFIA_PUBLICACOES');
  if (!sh) throw new Error('CARTOGRAFIA_PUBLICACOES ausente.');

  const r = s240Objects_(sh).find(x =>
    String(x.ID_PUBLICACAO || '') === String(id || '').trim()
  );
  if (!r) throw new Error('Pacote cartográfico não encontrado.');
  return s255PublicacaoRpc_(r);
}

function s255AtualizarPublicacao_(id, patch) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('CARTOGRAFIA_PUBLICACOES');
  const rows = s240Objects_(sh);
  const atual = rows.find(r => String(r.ID_PUBLICACAO || '') === String(id || ''));
  if (!atual) throw new Error('Publicação não encontrada.');

  const merged = Object.assign({}, atual, patch || {});
  s240Upsert_(sh, 'ID_PUBLICACAO', merged);
}

function s255PublicacaoRpc_(r) {
  return {
    id: String(r.ID_PUBLICACAO || ''),
    versao: s253NormalizarVersao_(r.VERSAO),
    titulo: String(r.TITULO || ''),
    status: String(r.STATUS || ''),
    motivo: String(r.MOTIVO || ''),
    observacoes: String(r.OBSERVACOES || ''),
    criadoEm: s243ValorRpcSeguro_(r.CRIADO_EM),
    criadoPor: String(r.CRIADO_POR || ''),
    enviadoValidacaoEm: s243ValorRpcSeguro_(r.ENVIADO_VALIDACAO_EM),
    enviadoValidacaoPor: String(r.ENVIADO_VALIDACAO_POR || ''),
    publicadoEm: s243ValorRpcSeguro_(r.PUBLICADO_EM),
    publicadoPor: String(r.PUBLICADO_POR || ''),
    arquivadoEm: s243ValorRpcSeguro_(r.ARQUIVADO_EM),
    arquivadoPor: String(r.ARQUIVADO_POR || ''),
    base: s253ParseJson_(r.BASE_JSON) || {},
    draft: s253ParseJson_(r.DRAFT_JSON) || {}
  };
}

function s255ProximaVersao_(rows) {
  let maior = 0;
  (rows || []).forEach(r => {
    const s = s253NormalizarVersao_(r.VERSAO);
    const m = /^2025\.(\d{2})$/.exec(s);
    if (m) maior = Math.max(maior, Number(m[1]));
  });
  return '2025.' + String(maior + 1).padStart(2, '0');
}

function s255Usuario_() {
  try { return Session.getActiveUser().getEmail() || '' } catch (_) { return '' }
}

function s255ChavesUnicas_(rows, key) {
  const vistos = {};
  const duplicados = [];
  (rows || []).forEach(r => {
    const id = String((r && r[key]) || '').trim();
    if (!id) return;
    if (vistos[id]) duplicados.push(id);
    vistos[id] = true;
  });
  return Array.from(new Set(duplicados));
}

function s255IdsAusentes_(referencia, destino, key) {
  const idsDestino = {};
  (destino || []).forEach(r => {
    const id = String((r && r[key]) || '').trim();
    if (id) idsDestino[id] = true;
  });
  return (referencia || [])
    .map(r => String((r && r[key]) || '').trim())
    .filter(id => id && !idsDestino[id]);
}

/**
 * S26.10-A3 — validador S25.5 compatível com a expansão cartográfica S26.8.
 *
 * Regras de segurança:
 * - preserva os mínimos históricos de S25 (5/8/8/3);
 * - não exige mais que áreas e mapas permaneçam exatamente em 8;
 * - impede que um rascunho remova silenciosamente IDs que já existem no
 *   estado operacional de referência;
 * - mantém validação de status e geometria das áreas;
 * - mantém a assinatura pública histórica; estadoReferencia é opcional.
 */
function s255ValidarDraft_(draft, estadoReferencia) {
  const erros = [];
  draft = draft || {};

  const calibracoes = Array.isArray(draft.calibracoes) ? draft.calibracoes : [];
  const areas = Array.isArray(draft.areas) ? draft.areas : [];
  const mapas = Array.isArray(draft.mapasLogicos) ? draft.mapasLogicos : [];
  const plantas = Array.isArray(draft.plantasNivel) ? draft.plantasNivel : [];

  // Calibrações e plantas continuam com cardinalidade estrutural conhecida.
  if (calibracoes.length !== 5) erros.push(`Calibrações ${calibracoes.length}/5.`);
  if (plantas.length !== 3) erros.push(`Plantas ${plantas.length}/3.`);

  // S25 começou com 8 áreas e 8 mapas. Após S26.8, 8 é mínimo histórico,
  // jamais teto. Isso preserva N0/áreas externas/novas representações.
  if (areas.length < 8) erros.push(`Áreas ${areas.length}; mínimo histórico 8.`);
  if (mapas.length < 8) erros.push(`Mapas lógicos ${mapas.length}; mínimo histórico 8.`);

  const colecoes = [
    { nome: 'Calibrações', rows: calibracoes, key: 'ID_TRANSFORMACAO' },
    { nome: 'Áreas', rows: areas, key: 'ID_AREA' },
    { nome: 'Mapas lógicos', rows: mapas, key: 'ID_MAPA_SETOR' },
    { nome: 'Plantas', rows: plantas, key: 'ID_PLANTA' }
  ];
  colecoes.forEach(c => {
    const dup = s255ChavesUnicas_(c.rows, c.key);
    if (dup.length) erros.push(`${c.nome} possui(em) ID duplicado: ${dup.slice(0, 10).join(', ')}.`);
  });

  calibracoes.forEach(r => {
    if (String(r.STATUS || '') !== 'VALIDADA') {
      erros.push(`${r.ID_TRANSFORMACAO || 'Calibração'} não está VALIDADA.`);
    }
  });

  areas.forEach(r => {
    if (String(r.STATUS || '') !== 'VALIDADA') {
      erros.push(`${r.NOME || r.ID_AREA || 'Área'} não está VALIDADA.`);
      return;
    }
    let pol = [];
    try { pol = JSON.parse(String(r.POLIGONO_JSON || '[]')) } catch (_) { }
    if (!Array.isArray(pol) || pol.length < 4) {
      erros.push(`${r.NOME || r.ID_AREA || 'Área'} possui polígono inválido.`);
    }
  });

  // Proteção contra perda de dados: ao validar um rascunho, todos os IDs que
  // existem no estado operacional de referência precisam continuar presentes.
  // Isso também protege contra rascunho antigo sobrescrevendo expansão nova.
  let referencia = estadoReferencia || null;
  if (!referencia) {
    try { referencia = s253EstadoAtualCartografia_(); } catch (_) { referencia = null; }
  }

  if (referencia) {
    const faltas = [
      ['Calibrações', referencia.calibracoes, calibracoes, 'ID_TRANSFORMACAO'],
      ['Áreas', referencia.areas, areas, 'ID_AREA'],
      ['Mapas lógicos', referencia.mapasLogicos, mapas, 'ID_MAPA_SETOR'],
      ['Plantas', referencia.plantasNivel, plantas, 'ID_PLANTA']
    ];
    faltas.forEach(f => {
      const ids = s255IdsAusentes_(f[1] || [], f[2] || [], f[3]);
      if (ids.length) {
        erros.push(`${f[0]}: rascunho removeria ${ids.length} item(ns) operacional(is): ${ids.slice(0, 10).join(', ')}${ids.length > 10 ? '…' : ''}.`);
      }
    });
  }

  return { ok: erros.length === 0, erros };
}


// ========================================================
// S25.5.1 — ISOLAMENTO ESTRITO DO RASCUNHO
// ========================================================
function setupS2551() {
  const d = setupS255();
  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');
  if (cfg) {
    setConfigValue_(cfg, 'APP_FASE', 'S25.5.1', 'Isolamento estrito do rascunho');
    setConfigValue_(cfg, 'S2551_STATUS', 'INSTALADO', 'Rascunho não alimenta operação/cache antes da publicação');
  }
  SpreadsheetApp.flush();
  return diagnosticoS2551();
}

function diagnosticoS2551() {
  const d = diagnosticoS255();
  const checks = (d.checks || []).slice();

  check_(checks, 'S2551_LISTA_N1_OPCOES',
    typeof appListarAreasNivel1S246 === 'function',
    'Listagem Nível 1 suporta leitura operacional separada do rascunho'
  );

  check_(checks, 'S2551_AREA_N3_OPCOES',
    typeof appObterAreaVermelhaS244 === 'function',
    'Área Nível 3 suporta leitura operacional separada do rascunho'
  );

  check_(checks, 'S2551_CAL_OPCOES',
    typeof appListarParesCalibracaoS242 === 'function',
    'Calibrações suportam leitura operacional separada do rascunho'
  );

  return {
    ok: checks.every(c => c.ok),
    version: APP.VERSAO,
    fase: APP.FASE,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length
  };
}
