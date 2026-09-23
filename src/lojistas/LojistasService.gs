/**
 * SINALIZAÇÃO DO MALL / CEOP — MÓDULO DE GESTÃO DE LOJISTAS E ESPAÇOS
 * Arquitetura Desacoplada (Hub & Spoke / Base Mestre Dedicada)
 * 
 * Conecta-se a uma Planilha Mestre dedicada no Google Drive (configurada via LOJISTAS_SPREADSHEET_ID na aba CONFIG),
 * isolando o volume de lojistas (~6.000 unidades) da planilha de operações da CEOP.
 */

const LOJISTAS_COLUNAS_CANONICAS = Object.freeze([
  'LUC',
  'SETOR',
  'RUA',
  'TIPO',
  'SUBTIPO',
  'CONTRATO',
  'NOME_FANTASIA',
  'LOJISTA',
  'DISPONIBILIDADE',
  'STATUS',
  'AREA',
  'MIX',
  'VALOR_ADESAO',
  'VALOR_MANUTENCAO',
  'DATA_CRIACAO',
  'ROTA',
  'ATUALIZADO_EM',
  'ATUALIZADO_POR'
]);

const DICIONARIO_NOMES_COMPLETOS_RUAS = Object.freeze({
  // SETOR AZUL / GERAL
  'ADMMN': 'Avenida Dom Manuel',
  'R2DMR': 'Rua 25 de Março',
  'RCRFR': 'Rua Coronel Ferraz',
  'RSJS': 'Rua São José',
  'RGVSM': 'Rua Governador Sampaio',
  'RCNDD': 'Rua Conde d\'Eu',
  'RGNBZ': 'Rua General Bezerril',
  'RFLPX': 'Rua Floriano Peixoto',
  'RMJFC': 'Rua Major Facundo',
  'RBDRB': 'Rua Barão do Rio Branco',
  'RBRDB': 'Rua Barão do Rio Branco',
  'RSNPM': 'Rua Senador Pompeu',
  'RGNSM': 'Rua General Sampaio',
  'R24DM': 'Rua 24 de Maio',
  'RTRGN': 'Rua Tristão Gonçalves',
  'AVIMP': 'Avenida do Imperador',
  'RPRIS': 'Rua Princesa Isabel',
  'AVALN': 'Avenida Alberto Nepomuceno',
  'AVCRP': 'Avenida Carapinima',
  'RJSA': 'Rua José Avelino',

  // SETOR VERDE & BRANCO & ROXO
  'RANPM': 'Rua Antônio Pompeu',
  'RMDAL': 'Rua Meton de Alencar',
  'RCDQR': 'Rua Clarindo de Queiroz',
  'ADDCX': 'Avenida Duque de Caxias',
  'RDPDI': 'Rua Dom Pedro I',
  'RPDPR': 'Rua Pedro Pereira',
  'RLBBR': 'Rua Liberato Barroso',
  'RGLRC': 'Rua Guilherme Rocha',
  'RSPL': 'Rua São Paulo',
  'RSNAL': 'Rua Senador Alencar',
  'RCESL': 'Rua Castro e Silva',
  'RDRJM': 'Rua Doutor João Moreira',
  'RSNJG': 'Rua Senador Jaguaribe',
  'APCBR': 'Avenida Presidente Castelo Branco',

  // BRANCO / OUTROS
  'AVDMO': 'Avenida Domingos Olímpio',
  'AVMTB': 'Avenida Monsenhor Tabosa',
  'TVBTR': 'Travessa Baturité',
  'TVPR': 'Travessa Pará',
  'A13DM': 'Avenida 13 de Maio',

  // ROXO / VERMELHO / SERVIÇOS / PRAÇAS / DOCAS
  'ESTVT': 'Estacionamento Visitantes',
  'COSM': 'Corredor Cosméticos',
  'SLBLZ': 'Corredor Salão de Beleza',
  'AVMNT': 'Avenida Monte',
  'PSTPL': 'Posto Policial',
  'CXLNC': 'Caixa Eletrônico',
  'LJDTS': 'Loja Design',
  'PR': 'Praça',
  'PRALM': 'Praça de Alimentação',
  'PRARE': 'Praça de Alimentação Recreativa',
  'PRACMM': 'Praça Central',
  'DOCAV': 'Doca Verde',
  'DOCAH': 'Doca H',
  'DOCAM': 'Doca Amarela',
  'DOCAF': 'Doca F',
  'DOCAC': 'Doca C',
  'BRMALL': 'Mall Branco',
  'RXMALL': 'Mall Roxo',
  'CORS': 'Corredor de Serviços'
});

const PREFIXOS_RUAS_ORDENADOS_ = Object.keys(DICIONARIO_NOMES_COMPLETOS_RUAS).sort((a, b) => b.length - a.length);

function normalizarTextoSemAcento_(str) {
  return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

function resolverNomeCompletoRua(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (!s) return '';

  const sSemCorredor = s.replace(/^Corredor\s+/i, '').trim();
  const norm = normalizarTextoSemAcento_(sSemCorredor);

  // Se já for a sigla exata (ex: AVALN)
  if (DICIONARIO_NOMES_COMPLETOS_RUAS[norm]) {
    return DICIONARIO_NOMES_COMPLETOS_RUAS[norm];
  }

  // Se for código de corredor (ex: COR-AM-AVALN)
  const mCor = norm.match(/^COR-[A-Z0-9]+-([A-Z0-9]+)$/);
  if (mCor && DICIONARIO_NOMES_COMPLETOS_RUAS[mCor[1]]) {
    return DICIONARIO_NOMES_COMPLETOS_RUAS[mCor[1]];
  }

  // Se for um sinônimo ou nome antigo/parcial registrado em extrairSiglaRuaS3_
  if (typeof extrairSiglaRuaS3_ === 'function') {
    const sigla = extrairSiglaRuaS3_(sSemCorredor);
    if (sigla && DICIONARIO_NOMES_COMPLETOS_RUAS[sigla]) {
      return DICIONARIO_NOMES_COMPLETOS_RUAS[sigla];
    }
  }

  for (let i = 0; i < PREFIXOS_RUAS_ORDENADOS_.length; i++) {
    const p = PREFIXOS_RUAS_ORDENADOS_[i];
    if (norm.startsWith(p)) {
      return DICIONARIO_NOMES_COMPLETOS_RUAS[p];
    }
  }

  for (let i = 0; i < PREFIXOS_RUAS_ORDENADOS_.length; i++) {
    const p = PREFIXOS_RUAS_ORDENADOS_[i];
    const nomeCompleto = DICIONARIO_NOMES_COMPLETOS_RUAS[p];
    const nomeSemLogradouro = normalizarTextoSemAcento_(
      nomeCompleto.replace(/^(Rua|Avenida|Travessa|Praça|Corredor)\s+/i, '')
    );
    if (norm.includes(nomeSemLogradouro)) {
      return nomeCompleto;
    }
  }

  return s;
}

function garantirColunaRuaPlanilhaLojistas_(sh) {
  if (!sh) return;
  try {
    const lastCol = sh.getLastColumn();
    if (lastCol < 1) return;
    const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim().toUpperCase());
    const idxRua = headers.indexOf('RUA');
    
    if (idxRua === -1) {
      const idxSetor = headers.indexOf('SETOR');
      const colInserir = idxSetor >= 0 ? (idxSetor + 2) : (lastCol + 1);
      sh.insertColumnBefore(colInserir);
      sh.getRange(1, colInserir).setValue('RUA')
        .setFontWeight('bold')
        .setBackground('#171B68')
        .setFontColor('#FFFFFF');

      const lastRow = sh.getLastRow();
      if (lastRow > 1) {
        const novosHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h || '').trim().toUpperCase());
        const idxLuc = novosHeaders.indexOf('LUC');
        const colLuc = idxLuc >= 0 ? (idxLuc + 1) : 1;
        const lucs = sh.getRange(2, colLuc, lastRow - 1, 1).getValues();
        const ruas = lucs.map(r => [resolverNomeCompletoRua(r[0])]);
        sh.getRange(2, colInserir, ruas.length, 1).setValues(ruas);
        console.log(`[LOJISTAS] Coluna RUA criada e preenchida para ${ruas.length} registros.`);
      }
    }
  } catch (err) {
    console.warn('[LOJISTAS] Aviso ao garantir coluna RUA na planilha:', err);
  }
}


/**
 * Retorna ou provisiona a Planilha Mestre de Lojistas no Drive.
 * Se LOJISTAS_SPREADSHEET_ID não estiver na aba CONFIG, pesquisa por nome ou cria automaticamente.
 */
function obterContextoPlanilhaLojistasMestre_() {
  const ssAtiva = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = lerConfigComoObjeto_(ssAtiva);
  let idMestre = String(cfg.LOJISTAS_SPREADSHEET_ID || '').trim();

  let ssMestre = null;
  let recemCriada = false;

  if (idMestre) {
    try {
      ssMestre = SpreadsheetApp.openById(idMestre);
    } catch (err) {
      console.warn('[LOJISTAS] Falha ao abrir planilha mestre configurada ' + idMestre + ':', err);
      idMestre = '';
    }
  }

  // Se não encontrou por ID, verifica se a aba LOJISTAS existe na própria planilha ativa
  if (!ssMestre) {
    if (ssAtiva.getSheetByName('LOJISTAS')) {
      ssMestre = ssAtiva;
      idMestre = ssAtiva.getId();
    }
  }

  // Se ainda não encontrou, tenta localizar na pasta raiz do setor no Drive (sem varrer o Drive inteiro)
  if (!ssMestre) {
    const nomePadrao = 'CENTRO_FASHION_BASE_MESTRE_LOJISTAS';
    const idPastaRaiz = cfg.DRIVE_ROOT_FOLDER_ID;
    let pasta = null;

    if (idPastaRaiz) {
      try { pasta = DriveApp.getFolderById(idPastaRaiz); } catch (_) {}
    }

    if (pasta) {
      try {
        const arquivos = pasta.getFilesByName(nomePadrao);
        if (arquivos.hasNext()) {
          const arq = arquivos.next();
          idMestre = arq.getId();
          ssMestre = SpreadsheetApp.openById(idMestre);
        }
      } catch (eDrive) {
        console.warn('[LOJISTAS] Aviso ao consultar pasta do setor:', eDrive);
      }
    }

    // Se ainda não tem planilha externa, utiliza a planilha ativa como base segura e rápida
    if (!ssMestre) {
      ssMestre = ssAtiva;
      idMestre = ssAtiva.getId();
    }

    // Salva o ID na aba CONFIG da planilha do CEOP
    try {
      const shConfig = ssAtiva.getSheetByName('CONFIG');
      if (shConfig) {
        if (typeof setConfigValue_ === 'function') {
          setConfigValue_(shConfig, 'LOJISTAS_SPREADSHEET_ID', idMestre, 'ID da planilha mestre dedicada de Lojistas e Espaços');
        } else {
          shConfig.appendRow(['LOJISTAS_SPREADSHEET_ID', idMestre, 'ID da planilha mestre dedicada de Lojistas e Espaços']);
        }
      }
    } catch (cfgErr) {
      console.warn('[LOJISTAS] Não foi possível gravar na CONFIG:', cfgErr);
    }
  }

  // Garante aba LOJISTAS com cabeçalhos na planilha mestre
  let shLojistas = ssMestre.getSheetByName('LOJISTAS');
  if (!shLojistas) {
    shLojistas = ssMestre.insertSheet('LOJISTAS');
    // Remove aba padrão Sheet1 se houver mais de uma
    const outras = ssMestre.getSheets();
    if (outras.length > 1) {
      for (const s of outras) {
        if (s.getName() !== 'LOJISTAS') {
          try { ssMestre.deleteSheet(s); } catch (_) {}
          break;
        }
      }
    }
    shLojistas.getRange(1, 1, 1, LOJISTAS_COLUNAS_CANONICAS.length)
      .setValues([LOJISTAS_COLUNAS_CANONICAS])
      .setFontWeight('bold')
      .setBackground('#171B68')
      .setFontColor('#FFFFFF');
    shLojistas.setFrozenRows(1);
  } else {
    garantirColunaRuaPlanilhaLojistas_(shLojistas);
  }

  return {
    id: idMestre,
    ss: ssMestre,
    sh: shLojistas,
    url: ssMestre.getUrl(),
    recemCriada: recemCriada
  };
}

/**
 * Consulta status e conexão da Base Mestre de Lojistas.
 */
function appStatusBaseLojistas() {
  exigirPermissaoS14_('administrar');
  const ctx = obterContextoPlanilhaLojistasMestre_();
  const lastRow = ctx.sh.getLastRow();
  return {
    ok: true,
    spreadsheetId: ctx.id,
    url: ctx.url,
    totalLinhas: Math.max(0, lastRow - 1),
    recemCriada: ctx.recemCriada
  };
}

/**
 * Retorna os dados normalizados de lojistas com filtros, paginação e resumo de KPIs.
 */
function appListarLojistas(filtros) {
  exigirPermissaoS14_('administrar');
  const f = filtros || {};
  const busca = String(f.busca || '').trim().toLowerCase();
  const setorFiltro = String(f.setor || '').trim().toUpperCase();
  const tipoFiltro = String(f.tipo || '').trim().toUpperCase();
  const dispFiltro = String(f.disponibilidade || '').trim().toUpperCase();
  const statusFiltro = String(f.status || '').trim().toUpperCase();
  const pagina = Math.max(1, parseInt(f.pagina, 10) || 1);
  const limite = Math.max(10, Math.min(200, parseInt(f.limite, 10) || 50));

  const ctx = obterContextoPlanilhaLojistasMestre_();
  const sh = ctx.sh;
  const lastRow = sh.getLastRow();

  if (lastRow < 2) {
    return {
      ok: true,
      spreadsheetId: ctx.id,
      url: ctx.url,
      total: 0,
      totalFiltrados: 0,
      pagina: 1,
      totalPaginas: 1,
      kpis: { total: 0, ocupadas: 0, disponiveis: 0, bloqueadas: 0, reservadas: 0, taxaOcupacao: '0.0%' },
      itens: [],
      setores: [],
      tipos: []
    };
  }

  // Leitura em bloco dos valores da planilha mestre
  const rawValues = sh.getRange(1, 1, lastRow, sh.getLastColumn()).getDisplayValues();
  const headers = rawValues[0].map(h => String(h || '').trim());
  const idx = {};
  LOJISTAS_COLUNAS_CANONICAS.forEach(c => {
    idx[c] = headers.indexOf(c);
  });

  let kpiTotal = 0;
  let kpiOcupadas = 0;
  let kpiDisponiveis = 0;
  let kpiBloqueadas = 0;
  let kpiReservadas = 0;

  const setoresSet = new Set();
  const tiposSet = new Set();

  const filtrados = [];

  for (let i = 1; i < rawValues.length; i++) {
    const row = rawValues[i];
    const luc = String(idx.LUC >= 0 ? row[idx.LUC] : row[0] || '').trim();
    if (!luc) continue;

    const setor = String(idx.SETOR >= 0 ? row[idx.SETOR] : '').trim();
    const rua = resolverNomeCompletoRua(String(idx.RUA >= 0 ? row[idx.RUA] : '').trim() || luc);
    const tipo = String(idx.TIPO >= 0 ? row[idx.TIPO] : '').trim();
    const subtipo = String(idx.SUBTIPO >= 0 ? row[idx.SUBTIPO] : '').trim();
    const contrato = String(idx.CONTRATO >= 0 ? row[idx.CONTRATO] : '').trim();
    const nomeFantasia = String(idx.NOME_FANTASIA >= 0 ? row[idx.NOME_FANTASIA] : '').trim();
    const lojista = String(idx.LOJISTA >= 0 ? row[idx.LOJISTA] : '').trim();
    const rawDisp = String(idx.DISPONIBILIDADE >= 0 ? row[idx.DISPONIBILIDADE] : '').trim();
    const status = String(idx.STATUS >= 0 ? row[idx.STATUS] : 'Ativa').trim();
    const area = String(idx.AREA >= 0 ? row[idx.AREA] : '').trim();
    const mix = String(idx.MIX >= 0 ? row[idx.MIX] : '').trim();
    const valorAdesao = String(idx.VALOR_ADESAO >= 0 ? row[idx.VALOR_ADESAO] : '').trim();
    const valorManutencao = String(idx.VALOR_MANUTENCAO >= 0 ? row[idx.VALOR_MANUTENCAO] : '').trim();
    const dataCriacao = String(idx.DATA_CRIACAO >= 0 ? row[idx.DATA_CRIACAO] : '').trim();
    const rota = String(idx.ROTA >= 0 ? row[idx.ROTA] : '').trim();

    if (setor) setoresSet.add(setor);
    if (tipo) tiposSet.add(tipo);

    // Normalização da disponibilidade
    let dispNorm = 'Disponível';
    const dispUpper = rawDisp.toUpperCase();
    if (dispUpper.includes('OCUP')) dispNorm = 'Ocupada';
    else if (dispUpper.includes('BLOQ')) dispNorm = 'Bloqueada';
    else if (dispUpper.includes('RESERV')) dispNorm = 'Reservada';
    else if (dispUpper.includes('DISP')) dispNorm = 'Disponível';

    kpiTotal++;
    if (dispNorm === 'Ocupada') kpiOcupadas++;
    else if (dispNorm === 'Disponível') kpiDisponiveis++;
    else if (dispNorm === 'Bloqueada') kpiBloqueadas++;
    else if (dispNorm === 'Reservada') kpiReservadas++;

    // Aplicação de filtros
    if (setorFiltro && setor.toUpperCase() !== setorFiltro) continue;
    if (tipoFiltro && tipo.toUpperCase() !== tipoFiltro) continue;
    if (dispFiltro) {
      if (dispFiltro === 'OCUPADA' && dispNorm !== 'Ocupada') continue;
      if (dispFiltro === 'DISPONIVEL' && dispNorm !== 'Disponível') continue;
      if (dispFiltro === 'BLOQUEADA' && dispNorm !== 'Bloqueada') continue;
      if (dispFiltro === 'RESERVADA' && dispNorm !== 'Reservada') continue;
    }
    if (statusFiltro && status.toUpperCase() !== statusFiltro) continue;

    if (busca) {
      const match = luc.toLowerCase().includes(busca) ||
                    rua.toLowerCase().includes(busca) ||
                    lojista.toLowerCase().includes(busca) ||
                    nomeFantasia.toLowerCase().includes(busca) ||
                    contrato.toLowerCase().includes(busca) ||
                    mix.toLowerCase().includes(busca) ||
                    rota.toLowerCase().includes(busca);
      if (!match) continue;
    }

    filtrados.push({
      LUC: luc,
      SETOR: setor,
      RUA: rua,
      rua: rua,
      TIPO: tipo,
      SUBTIPO: subtipo,
      CONTRATO: contrato,
      NOME_FANTASIA: nomeFantasia,
      LOJISTA: lojista,
      DISPONIBILIDADE: dispNorm,
      STATUS: status,
      AREA: area,
      MIX: mix,
      VALOR_ADESAO: valorAdesao,
      VALOR_MANUTENCAO: valorManutencao,
      DATA_CRIACAO: dataCriacao,
      ROTA: rota,
      linhaPlanilha: i + 1
    });
  }

  const taxaOcupacao = kpiTotal > 0 ? ((kpiOcupadas / kpiTotal) * 100).toFixed(1) + '%' : '0.0%';
  const totalFiltrados = filtrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrados / limite));
  const inicio = (pagina - 1) * limite;
  const itensPaginados = filtrados.slice(inicio, inicio + limite);

  return {
    ok: true,
    spreadsheetId: ctx.id,
    url: ctx.url,
    total: kpiTotal,
    totalFiltrados: totalFiltrados,
    pagina: pagina,
    totalPaginas: totalPaginas,
    limite: limite,
    kpis: {
      total: kpiTotal,
      ocupadas: kpiOcupadas,
      disponiveis: kpiDisponiveis,
      bloqueadas: kpiBloqueadas,
      reservadas: kpiReservadas,
      taxaOcupacao: taxaOcupacao
    },
    itens: itensPaginados,
    setores: Array.from(setoresSet).sort(),
    tipos: Array.from(tiposSet).sort()
  };
}

/**
 * Permissão de leitura de lojista: autenticação válida.
 */
function exigirPermissaoLeituraLojistaS14_() {
  const s = sessaoAtualS14_();
  if (!s || !s.autenticado) {
    throw new Error('Usuário não autenticado.');
  }
  return s;
}

/**
 * Obtém detalhes de um único lojista pelo código LUC.
 */
function appObterLojista(luc) {
  exigirPermissaoLeituraLojistaS14_();
  const lucBuscado = String(luc || '').trim().toUpperCase();
  if (!lucBuscado) throw new Error('Código LUC é obrigatório.');

  const ctx = obterContextoPlanilhaLojistasMestre_();
  const sh = ctx.sh;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: false, encontrado: false };

  const rawValues = sh.getRange(1, 1, lastRow, sh.getLastColumn()).getDisplayValues();
  const headers = rawValues[0].map(h => String(h || '').trim());
  const idxLUC = headers.indexOf('LUC');

  for (let i = 1; i < rawValues.length; i++) {
    const row = rawValues[i];
    const itemLuc = String(idxLUC >= 0 ? row[idxLUC] : row[0] || '').trim().toUpperCase();
    if (itemLuc === lucBuscado) {
      const obj = {};
      headers.forEach((h, col) => {
        obj[h] = row[col] || '';
      });
      const ruaResolvida = resolverNomeCompletoRua(obj.RUA || lucBuscado);
      obj.RUA = ruaResolvida;
      obj.rua = ruaResolvida;
      obj.linhaPlanilha = i + 1;
      return { ok: true, encontrado: true, lojista: obj };
    }
  }

  return { ok: true, encontrado: false };
}

/**
 * Salva (cria ou atualiza) um registro de Lojista/Espaço na Planilha Mestre.
 */
function appSalvarLojista(dados) {
  exigirPermissaoS14_('administrar');
  const d = dados || {};
  const luc = String(d.LUC || '').trim().toUpperCase();
  if (!luc) throw new Error('Código LUC é obrigatório.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ctx = obterContextoPlanilhaLojistasMestre_();
    const sh = ctx.sh;
    const lastRow = sh.getLastRow();
    const usuario = (usuarioRpcAtualS223_()?.email || Session.getActiveUser().getEmail()) || 'WEB_APP';
    const agora = new Date().toISOString();

    const rawValues = sh.getRange(1, 1, Math.max(1, lastRow), sh.getLastColumn()).getDisplayValues();
    const headers = rawValues[0].map(h => String(h || '').trim());
    const idxLUC = headers.indexOf('LUC');

    let linhaAlvo = -1;
    for (let i = 1; i < rawValues.length; i++) {
      const itemLuc = String(idxLUC >= 0 ? rawValues[i][idxLUC] : rawValues[i][0] || '').trim().toUpperCase();
      if (itemLuc === luc) {
        linhaAlvo = i + 1;
        break;
      }
    }

    const ruaInput = String(d.RUA || d.rua || '').trim();
    const ruaResolvida = resolverNomeCompletoRua(ruaInput || luc);

    const payloadObj = {
      LUC: luc,
      SETOR: String(d.SETOR || d.setor || '').trim(),
      RUA: ruaResolvida,
      TIPO: String(d.TIPO || d.tipo || '').trim(),
      SUBTIPO: String(d.SUBTIPO || '').trim(),
      CONTRATO: String(d.CONTRATO || '').trim(),
      NOME_FANTASIA: String(d.NOME_FANTASIA || '').trim(),
      LOJISTA: String(d.LOJISTA || '').trim(),
      DISPONIBILIDADE: String(d.DISPONIBILIDADE || 'Ocupada').trim(),
      STATUS: String(d.STATUS || 'Ativa').trim(),
      AREA: String(d.AREA || '').trim(),
      MIX: String(d.MIX || '').trim(),
      VALOR_ADESAO: String(d.VALOR_ADESAO || '').trim(),
      VALOR_MANUTENCAO: String(d.VALOR_MANUTENCAO || '').trim(),
      DATA_CRIACAO: String(d.DATA_CRIACAO || '').trim(),
      ROTA: String(d.ROTA || '').trim(),
      ATUALIZADO_EM: agora,
      ATUALIZADO_POR: usuario
    };

    const linhaArray = headers.map(h => payloadObj[h] != null ? payloadObj[h] : '');

    if (linhaAlvo > 0) {
      sh.getRange(linhaAlvo, 1, 1, headers.length).setValues([linhaArray]);
      console.log(JSON.stringify({ evento: 'LOJISTA_ATUALIZADO', luc, usuario, ts: agora }));
      return { ok: true, acao: 'ATUALIZADO', luc: luc };
    } else {
      sh.appendRow(linhaArray);
      console.log(JSON.stringify({ evento: 'LOJISTA_CRIADO', luc, usuario, ts: agora }));
      return { ok: true, acao: 'CRIADO', luc: luc };
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Exclui ou inativa um lojista.
 */
function appExcluirLojista(luc, hardDelete) {
  exigirPermissaoS14_('administrar');
  const lucBuscado = String(luc || '').trim().toUpperCase();
  if (!lucBuscado) throw new Error('Código LUC é obrigatório.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ctx = obterContextoPlanilhaLojistasMestre_();
    const sh = ctx.sh;
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return { ok: false, mensagem: 'Base vazia.' };

    const rawValues = sh.getRange(1, 1, lastRow, sh.getLastColumn()).getDisplayValues();
    const headers = rawValues[0].map(h => String(h || '').trim());
    const idxLUC = headers.indexOf('LUC');
    const idxStatus = headers.indexOf('STATUS');
    const idxDisp = headers.indexOf('DISPONIBILIDADE');
    const idxAtualizadoEm = headers.indexOf('ATUALIZADO_EM');
    const idxAtualizadoPor = headers.indexOf('ATUALIZADO_POR');

    let linhaAlvo = -1;
    for (let i = 1; i < rawValues.length; i++) {
      const itemLuc = String(idxLUC >= 0 ? rawValues[i][idxLUC] : rawValues[i][0] || '').trim().toUpperCase();
      if (itemLuc === lucBuscado) {
        linhaAlvo = i + 1;
        break;
      }
    }

    if (linhaAlvo < 2) {
      return { ok: false, mensagem: 'Lojista não encontrado com o LUC: ' + lucBuscado };
    }

    const usuario = (usuarioRpcAtualS223_()?.email || Session.getActiveUser().getEmail()) || 'WEB_APP';
    const agora = new Date().toISOString();

    if (hardDelete === true) {
      sh.deleteRow(linhaAlvo);
      console.log(JSON.stringify({ evento: 'LOJISTA_EXCLUIDO_FISICO', luc: lucBuscado, usuario, ts: agora }));
      return { ok: true, acao: 'EXCLUIDO', luc: lucBuscado };
    } else {
      // Exclusão suave (Soft Delete / Inativação)
      if (idxStatus >= 0) sh.getRange(linhaAlvo, idxStatus + 1).setValue('Inativa');
      if (idxDisp >= 0) sh.getRange(linhaAlvo, idxDisp + 1).setValue('Bloqueada');
      if (idxAtualizadoEm >= 0) sh.getRange(linhaAlvo, idxAtualizadoEm + 1).setValue(agora);
      if (idxAtualizadoPor >= 0) sh.getRange(linhaAlvo, idxAtualizadoPor + 1).setValue(usuario);
      console.log(JSON.stringify({ evento: 'LOJISTA_INATIVADO', luc: lucBuscado, usuario, ts: agora }));
      return { ok: true, acao: 'INATIVADO', luc: lucBuscado };
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Importa registros em lote para a planilha mestre (otimização de batch).
 */
function appImportarLojistasLote(registros, sobrescrever) {
  exigirPermissaoS14_('administrar');
  const lista = Array.isArray(registros) ? registros : [];
  if (!lista.length) throw new Error('Nenhum registro informado para importação.');

  const lock = LockService.getScriptLock();
  lock.waitLock(60000);

  try {
    const ctx = obterContextoPlanilhaLojistasMestre_();
    const sh = ctx.sh;
    const usuario = (usuarioRpcAtualS223_()?.email || Session.getActiveUser().getEmail()) || 'WEB_APP';
    const agora = new Date().toISOString();

    // Se sobrescrever for verdadeiro e a planilha já tiver dados, limpa antes
    if (sobrescrever === true && sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
    }

    const lastRow = sh.getLastRow();
    const headers = LOJISTAS_COLUNAS_CANONICAS;

    const linhasMatriz = lista.map(item => {
      const d = item || {};
      return headers.map(col => {
        if (col === 'ATUALIZADO_EM') return agora;
        if (col === 'ATUALIZADO_POR') return usuario;
        return String(d[col] != null ? d[col] : '').trim();
      });
    });

    // Grava tudo em um único bloco de setValues
    if (linhasMatriz.length > 0) {
      sh.getRange(lastRow + 1, 1, linhasMatriz.length, headers.length).setValues(linhasMatriz);
    }

    console.log(JSON.stringify({ evento: 'LOJISTAS_IMPORTACAO_LOTE', total: linhasMatriz.length, usuario, ts: agora }));
    return {
      ok: true,
      totalImportados: linhasMatriz.length,
      spreadsheetId: ctx.id
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Consulta ultrarrápida do Lojista a partir do LUC (usada no mapa e no formulário de AS).
 */
function appResolverLojistaPorLuc(luc) {
  const lucBuscado = String(luc || '').trim().toUpperCase();
  if (!lucBuscado) return { encontrado: false };

  try {
    const ctx = obterContextoPlanilhaLojistasMestre_();
    const sh = ctx.sh;
    const lastRow = sh.getLastRow();
    if (lastRow < 2) return { encontrado: false };

    const rawValues = sh.getRange(1, 1, lastRow, Math.min(16, sh.getLastColumn())).getDisplayValues();
    const headers = rawValues[0].map(h => String(h || '').trim());
    const idxLUC = headers.indexOf('LUC');
    const idxLojista = headers.indexOf('LOJISTA');
    const idxFantasia = headers.indexOf('NOME_FANTASIA');
    const idxSetor = headers.indexOf('SETOR');
    const idxRua = headers.indexOf('RUA');
    const idxContrato = headers.indexOf('CONTRATO');
    const idxMix = headers.indexOf('MIX');

    for (let i = 1; i < rawValues.length; i++) {
      const row = rawValues[i];
      const itemLuc = String(idxLUC >= 0 ? row[idxLUC] : row[0] || '').trim().toUpperCase();
      if (itemLuc === lucBuscado) {
        const ruaResolvida = resolverNomeCompletoRua((idxRua >= 0 && row[idxRua]) ? row[idxRua] : lucBuscado);
        return {
          encontrado: true,
          luc: lucBuscado,
          lojista: idxLojista >= 0 ? row[idxLojista] : '',
          nomeFantasia: idxFantasia >= 0 ? row[idxFantasia] : '',
          setor: idxSetor >= 0 ? row[idxSetor] : '',
          rua: ruaResolvida,
          RUA: ruaResolvida,
          contrato: idxContrato >= 0 ? row[idxContrato] : '',
          mix: idxMix >= 0 ? row[idxMix] : ''
        };
      }
    }
  } catch (err) {
    console.warn('[LOJISTAS] Falha ao resolver LUC ' + lucBuscado + ':', err);
  }

  return { encontrado: false };
}

/**
 * Resolve e retorna as informações completas do Lojista a partir de um ponto clicado no mapa
 * ou a partir de seu código LUC / número de loja / coordenadas.
 */
function appResolverLojistaDoPonto(payload) {
  exigirPermissaoLeituraLojistaS14_();
  const p = payload || {};
  const idMapa = String(p.idMapa || '').trim();
  const x = Number(p.x);
  const y = Number(p.y);
  const label = String(p.label || '').trim();
  let luc = String(p.luc || '').trim().toUpperCase();
  let numero = String(p.numeroLoja || p.numero || '').trim();

  // 1. Se já veio um LUC completo e bem formado, tenta resolver diretamente
  if (luc && luc.length >= 4) {
    const res = appObterLojista(luc);
    if (res && res.encontrado && res.lojista) {
      return { ok: true, encontrado: true, lojista: res.lojista };
    }
  }

  // 2. Se o label já for um LUC completo (ex: RCRFR1196, PR2002, ADMMN1111)
  if (label && label.length >= 4 && /[A-Za-z]/.test(label) && /\d/.test(label)) {
    const resLabel = appObterLojista(label.toUpperCase());
    if (resLabel && resLabel.encontrado && resLabel.lojista) {
      return { ok: true, encontrado: true, lojista: resLabel.lojista };
    }
  }

  // 3. Extrai o número do espaço/box (ex: 1196 a partir de '1196' ou 'Loja 1196')
  if (!numero) {
    const matchNum = label.match(/\d{3,5}/);
    if (matchNum) numero = matchNum[0];
  }

  // 4. Se temos coordenadas no mapa ou dados da entidade, tenta identificar o corredor/rua cartográfico
  let prefixoCorredor = String(p.idCorredor || '').trim();
  let nomeRua = String(p.corredor || p.rua || '').trim();
  let sigla = String(p.siglaRua || '').trim().toUpperCase();

  if (!nomeRua && Number.isFinite(x) && Number.isFinite(y) && idMapa && typeof localizarCorredorS3_ === 'function') {
    try {
      const corr = localizarCorredorS3_(idMapa, x, y);
      if (corr) {
        nomeRua = String(corr.nome || '');
        prefixoCorredor = String(corr.idCorredor || '');
      }
    } catch (errCorr) {
      console.warn('[LOJISTAS] Falha ao localizar corredor:', errCorr);
    }
  }

  // Mapeamento canônico de siglas de ruas do Centro Fashion para prefixos de LUC
  const MAPA_SIGLAS_RUAS = {
    // SETOR AZUL / GERAL
    'DOM MANUEL': 'ADMMN', 'ADMMN': 'ADMMN',
    '25 DE MARÇO': 'R2DMR', '25 DE MARCO': 'R2DMR', 'R2DMR': 'R2DMR',
    'CORONEL FERRAZ': 'RCRFR', 'RCRFR': 'RCRFR',
    'SÃO JOSÉ': 'RSJS', 'SAO JOSE': 'RSJS', 'RSJS': 'RSJS',
    'GOVERNADOR SAMPAIO': 'RGVSM', 'RGVSM': 'RGVSM',
    'CONDE D\'EU': 'RCNDD', 'CONDE DEU': 'RCNDD', 'RCNDD': 'RCNDD',
    'GENERAL BEZERRIL': 'RGNBZ', 'RGNBZ': 'RGNBZ',
    'FLORIANO PEIXOTO': 'RFLPX', 'RFLPX': 'RFLPX',
    'MAJOR FACUNDO': 'RMJFC', 'RMJFC': 'RMJFC',
    'BARÃO DO RIO BRANCO': 'RBDRB', 'BARAO DO RIO BRANCO': 'RBDRB', 'RBDRB': 'RBDRB', 'RBRDB': 'RBDRB',
    'SENADOR POMPEU': 'RSNPM', 'RSNPM': 'RSNPM',
    'GENERAL SAMPAIO': 'RGNSM', 'RGNSM': 'RGNSM',
    '24 DE MAIO': 'R24DM', 'R24DM': 'R24DM',
    'TRISTÃO GONÇALVES': 'RTRGN', 'TRISTAO GONCALVES': 'RTRGN', 'RTRGN': 'RTRGN',
    'IMPERADOR': 'AVIMP', 'AVENIDA DO IMPERADOR': 'AVIMP', 'DO IMPERADOR': 'AVIMP', 'AVIMP': 'AVIMP',
    'PRINCESA ISABEL': 'RPRIS', 'RPRIS': 'RPRIS',
    'ALBERTO NEPOMUCENO': 'AVALN', 'NEPOMUCENO': 'AVALN', 'ALENCASTRO': 'AVALN', 'AVALN': 'AVALN',
    'CARAPINIMA': 'AVCRP', 'CELSO ROSSI': 'AVCRP', 'AVCRP': 'AVCRP',
    'JOSE AVELINO': 'RJSA', 'JOSÉ AVELINO': 'RJSA', 'RJSA': 'RJSA',

    // SETOR VERDE & BRANCO & ROXO
    'ANTONIO POMPEU': 'RANPM', 'ANTÔNIO POMPEU': 'RANPM', 'RANPM': 'RANPM',
    'METON DE ALENCAR': 'RMDAL', 'METON': 'RMDAL', 'NETON DE ALENCAR': 'RMDAL', 'NEWTON DE ALENCAR': 'RMDAL', 'RNDAL': 'RMDAL', 'RMDAL': 'RMDAL',
    'CLARINDO DE QUEIROZ': 'RCDQR', 'RCDQR': 'RCDQR',
    'DUQUE DE CAXIAS': 'ADDCX', 'ADQCX': 'ADDCX', 'ADDCX': 'ADDCX',
    'DOM PEDRO': 'RDPDI', 'DOM PEDRO I': 'RDPDI', 'RDPD1': 'RDPDI', 'RDPDI': 'RDPDI',
    'PEDRO PEREIRA': 'RPDPR', 'RPDPR': 'RPDPR',
    'LIBERATO BARROSO': 'RLBBR', 'RLBBR': 'RLBBR',
    'GUILHERME ROCHA': 'RGLRC', 'RGLRC': 'RGLRC', 'RGLC': 'RGLRC',
    'SÃO PAULO': 'RSPL', 'SAO PAULO': 'RSPL', 'SALDANHA MARINHO': 'RSPL', 'RSDMR': 'RSPL', 'RSPL': 'RSPL',
    'SENADOR ALENCAR': 'RSNAL', 'RSNAL': 'RSNAL',
    'CASTRO E SILVA': 'RCESL', 'CASTRO SILVA': 'RCESL', 'SILVA JARDIM': 'RCESL', 'GENERAL SILVA JARDIM': 'RCESL', 'RGSJR': 'RCESL', 'RCESL': 'RCESL', 'RCESJ': 'RCESL',
    'DOUTOR JOÃO MOREIRA': 'RDRJM', 'DR. JOÃO MOREIRA': 'RDRJM', 'JOÃO MOREIRA': 'RDRJM', 'JOAO MOREIRA': 'RDRJM', 'RDJMR': 'RDRJM', 'RDRJM': 'RDRJM',
    'SENADOR JAGUARIBE': 'RSNJG', 'JAGUARIBE': 'RSNJG', 'RSNGB': 'RSNJG', 'RSNJG': 'RSNJG',
    'CASTELO BRANCO': 'APCBR', 'PRES. CASTELO BRANCO': 'APCBR', 'APCRB': 'APCBR', 'APCBR': 'APCBR',

    // BRANCO / OUTROS
    'DOMINGOS OLÍMPIO': 'AVDMO', 'DOMINGOS OLIMPIO': 'AVDMO', 'MONTE ALVERNE': 'AVDMO', 'AVDMO': 'AVDMO',
    'MONSENHOR TABOSA': 'AVMTB', 'AVMTB': 'AVMTB',
    'BATURITÉ': 'TVBTR', 'BATURITE': 'TVBTR', 'BENTOS': 'TVBTR', 'TRAVESSA BENTOS': 'TVBTR', 'TVBTR': 'TVBTR',
    'PARÁ': 'TVPR', 'PARA': 'TVPR', 'PARAIBA': 'TVPR', 'TRAVESSA PARAIBA': 'TVPR', 'TVPR': 'TVPR',
    '13 DE MAIO': 'A13DM', 'A13DM': 'A13DM',

    // ROXO / VERMELHO / SERVIÇOS
    'ESTAC. VIS': 'ESTVT', 'ESTVT': 'ESTVT',
    'COSMETICOS': 'COSM', 'COSM': 'COSM',
    'SALÃO': 'SLBLZ', 'SALAO': 'SLBLZ', 'SLBLZ': 'SLBLZ',
    'MONTE': 'AVMNT', 'AVMNT': 'AVMNT',
    'POSTO POLICIAL': 'PSTPL', 'PSTPL': 'PSTPL',
    'CAIXA ELETRONICO': 'CXLNC', 'CXLNC': 'CXLNC',
    'LOJA DESIGN': 'LJDTS', 'LJDTS': 'LJDTS',
    'PRACA': 'PR', 'PRAÇA': 'PR', 'PR': 'PR',
    'PRACA ALIMENTACAO': 'PRALM', 'PRAÇA ALIMENTAÇÃO': 'PRALM', 'PRALM': 'PRALM',
    'PRACA DE ALIMENTACAO': 'PRALM', 'PRAÇA DE ALIMENTAÇÃO': 'PRALM',
    'PRARE': 'PRARE', 'PRACMM': 'PRACMM',
    'DOCAV': 'DOCAV', 'DOCAH': 'DOCAH', 'DOCAM': 'DOCAM', 'DOCAF': 'DOCAF', 'DOCAC': 'DOCAC',
    'BRMALL': 'BRMALL', 'RXMALL': 'RXMALL', 'CORS': 'CORS'
  };

  // Tenta encontrar a sigla a partir do corredor identificado se ainda não veio
  if (!sigla) {
    if (prefixoCorredor && MAPA_SIGLAS_RUAS[prefixoCorredor.toUpperCase()]) {
      sigla = MAPA_SIGLAS_RUAS[prefixoCorredor.toUpperCase()];
    } else if (nomeRua) {
      const upperRua = nomeRua.toUpperCase();
      const mParentese = upperRua.match(/\(([A-Z0-9]+)\)/);
      if (mParentese && MAPA_SIGLAS_RUAS[mParentese[1]]) {
        sigla = MAPA_SIGLAS_RUAS[mParentese[1]];
      } else {
        for (const [chave, cod] of Object.entries(MAPA_SIGLAS_RUAS)) {
          if (upperRua.includes(chave)) {
            sigla = cod;
            break;
          }
        }
      }
    }
  }

  // 5. Se encontrou a sigla da rua e o número da loja, constrói os LUCs candidatos
  if (sigla && numero) {
    const cands = [
      (sigla + numero).toUpperCase(),
      (sigla + '1' + numero).toUpperCase(),
      (sigla + '2' + numero).toUpperCase(),
      (sigla + '3' + numero).toUpperCase()
    ];
    if (numero.length === 4) {
      cands.push((sigla + numero.slice(1)).toUpperCase());
    }
    for (const cand of cands) {
      const resCandidato = appObterLojista(cand);
      if (resCandidato && resCandidato.encontrado && resCandidato.lojista) {
        return { ok: true, encontrado: true, lojista: resCandidato.lojista, rua: nomeRua || sigla };
      }
    }
  }

  // 6. Se ainda não encontrou, busca na base mestre pelo número da loja ou término do LUC
  if (numero) {
    try {
      const ctx = obterContextoPlanilhaLojistasMestre_();
      const sh = ctx.sh;
      const lastRow = sh.getLastRow();
      if (lastRow > 1) {
        const rawValues = sh.getRange(1, 1, lastRow, sh.getLastColumn()).getDisplayValues();
        const headers = rawValues[0].map(h => String(h || '').trim());
        const idxLUC = headers.indexOf('LUC');
        const idxSetor = headers.indexOf('SETOR');

        // Determina o setor do mapa atual para filtrar
        let setorFiltro = '';
        const idUpper = idMapa.toUpperCase();
        if (idUpper.includes('AZUL')) setorFiltro = 'SETOR AZUL';
        else if (idUpper.includes('AMARELO')) setorFiltro = 'SETOR AMARELO';
        else if (idUpper.includes('VERDE')) setorFiltro = 'SETOR VERDE';
        else if (idUpper.includes('BRANCO')) setorFiltro = 'SETOR BRANCO';
        else if (idUpper.includes('ROXO')) setorFiltro = 'SETOR ROXO';
        else if (idUpper.includes('VERMELHO')) setorFiltro = 'SETOR VERMELHO';

        // Busca exata por LUC terminando com o número no setor e na MESMA rua
        const candidatosSetor = [];
        for (let i = 1; i < rawValues.length; i++) {
          const row = rawValues[i];
          const itemLuc = String(idxLUC >= 0 ? row[idxLUC] : row[0] || '').trim().toUpperCase();
          const itemSetor = String(idxSetor >= 0 ? row[idxSetor] : '').trim().toUpperCase();

          if (setorFiltro && itemSetor && itemSetor !== setorFiltro) continue;

          if (itemLuc.endsWith(numero) || itemLuc === numero) {
            const obj = {};
            headers.forEach((h, col) => obj[h] = row[col] || '');
            obj.linhaPlanilha = i + 1;

            if (sigla && itemLuc.startsWith(sigla)) {
              return { ok: true, encontrado: true, lojista: obj, rua: nomeRua || sigla };
            }
            candidatosSetor.push(obj);
          }
        }

        // Se a sigla direta da rua não casou (ex: box associado indevidamente à avenida perimetral AVALN/AVCRP,
        // mas que pertence à galeria da rua vertical):
        if (candidatosSetor.length > 0) {
          if (candidatosSetor.length === 1) {
            return { ok: true, encontrado: true, lojista: candidatosSetor[0], rua: candidatosSetor[0].RUA || nomeRua };
          }
          // Mais de um candidato (ex: múltiplos boxes 1106 em diferentes ruas/galerias do mesmo setor):
          // Desempata utilizando a proximidade geográfica (X, Y) do ponto aos eixos de corredor do mapa
          if (Number.isFinite(x) && Number.isFinite(y)) {
            const matchEspacial = localizarCorredorMaisProximoPorPonto_(idMapa, x, y, candidatosSetor);
            if (matchEspacial && matchEspacial.lojista) {
              return { ok: true, encontrado: true, lojista: matchEspacial.lojista, rua: matchEspacial.rua || matchEspacial.lojista.RUA || nomeRua };
            }
          }
          return { ok: true, encontrado: true, lojista: candidatosSetor[0], rua: candidatosSetor[0].RUA || nomeRua };
        }
      }
    } catch (errBusca) {
      console.warn('[LOJISTAS] Falha na busca por sufixo de número:', errBusca);
    }
  }

  // Não encontrado: retorna informações para permitir cadastro ou aviso amigável
  return {
    ok: true,
    encontrado: false,
    lucSugerido: sigla && numero ? (sigla + numero) : (numero || label),
    numero: numero || label,
    rua: nomeRua,
    setor: idMapa.toUpperCase().includes('AZUL') ? 'SETOR AZUL' : ''
  };
}

/**
 * Desempata múltiplos lojistas candidatos com o mesmo número de box (ex: 1106, 2106)
 * calculando a proximidade espacial entre o ponto (x, y) e as polylines de cada rua/corredor.
 */
function localizarCorredorMaisProximoPorPonto_(idMapa, x, y, candidatos) {
  if (!candidatos || !candidatos.length) return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  try {
    // Suporte para o eixo de Avenida Dom Manuel em todos os pisos (x < 0.18 na borda esquerda do mall):
    const candDomManuel = candidatos.find(cand => String(cand.LUC || '').toUpperCase().startsWith('ADMMN'));
    if (candDomManuel && x < 0.18) {
      return { lojista: candDomManuel, rua: candDomManuel.RUA || 'Avenida Dom Manuel', distancia: 0.01 };
    }

    const corredores = typeof linhasObjetosS2_ === 'function'
      ? linhasObjetosS2_('CORREDORES').filter(r => (!idMapa || String(r.ID_MAPA_SETOR || '') === idMapa) && String(r.ATIVO || 'SIM').toUpperCase() !== 'NAO' && !/AVALN|AVCRP|RJSA|A13DM|TVBTR|AVDMO|TVPR|AVMTB/i.test(String(r.ID_CORREDOR || '')))
      : [];
    const pts = typeof linhasObjetosS2_ === 'function'
      ? linhasObjetosS2_('CORREDOR_PONTOS').filter(r => String(r.ATIVO || 'SIM').toUpperCase() !== 'NAO')
      : [];

    if (!corredores.length || !pts.length) return null;

    const distPorCorredor = new Map();
    corredores.forEach(c => {
      const cId = String(c.ID_CORREDOR || '').trim();
      const pList = pts
        .filter(q => String(q.ID_CORREDOR || '').trim() === cId)
        .sort((a, b) => Number(a.ORDEM) - Number(b.ORDEM))
        .map(q => ({
          x: parseFloat(String(q.X_NORMALIZADO || '').replace(',', '.')),
          y: parseFloat(String(q.Y_NORMALIZADO || '').replace(',', '.'))
        }))
        .filter(q => Number.isFinite(q.x) && Number.isFinite(q.y));

      if (pList.length >= 2 && typeof distPolylineS3_ === 'function') {
        const r = distPolylineS3_(x, y, pList);
        distPorCorredor.set(cId, { dist: r.dist, nome: String(c.NOME || ''), codigo: String(c.CODIGO || '') });
      }
    });

    let melhorCandidato = null;
    let menorDist = Infinity;
    let melhorRua = '';

    candidatos.forEach(cand => {
      const candLuc = String(cand.LUC || '').toUpperCase();
      const candRua = normalizarTextoSemAcento_(String(cand.RUA || ''));

      for (const [cId, info] of distPorCorredor.entries()) {
        const cNomeNorm = normalizarTextoSemAcento_(info.nome);
        const cCod = info.codigo ? info.codigo.toUpperCase() : '';
        const match = (cCod && candLuc.startsWith(cCod)) ||
                      (candRua && (cNomeNorm.includes(candRua) || candRua.includes(cNomeNorm)));

        if (match && info.dist < menorDist) {
          menorDist = info.dist;
          melhorCandidato = cand;
          melhorRua = info.nome || cand.RUA;
        }
      }
    });

    if (melhorCandidato) {
      return { lojista: melhorCandidato, rua: melhorRua, distancia: menorDist };
    }
  } catch (err) {
    console.warn('[LOJISTAS] Falha no desempate espacial por corredor:', err);
  }
  return null;
}

/**
 * Busca rápida para o Localizador da toolbar do mapa (com permissão de leitura).
 */
function appBuscarLojistasParaLocalizador(payload) {
  exigirPermissaoLeituraLojistaS14_();
  const termo = String((typeof payload === 'object' ? payload?.busca : payload) || '').trim().toLowerCase();
  const limite = Math.min(20, Math.max(1, parseInt(payload?.limite, 10) || 8));
  if (!termo) return { ok: true, itens: [] };

  const ctx = obterContextoPlanilhaLojistasMestre_();
  const sh = ctx.sh;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: true, itens: [] };

  const rawHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const cabecalhos = rawHeaders.map(h => String(h || '').trim().toUpperCase());
  const idxLuc = cabecalhos.findIndex(h => h === 'LUC' || h.includes('LUC'));
  const idxSetor = cabecalhos.findIndex(h => h.includes('SETOR'));
  const idxTipo = cabecalhos.findIndex(h => h.includes('TIPO'));
  const idxContrato = cabecalhos.findIndex(h => h.includes('CONTRATO'));
  const idxTitular = cabecalhos.findIndex(h => h.includes('TITULAR') || h.includes('LOJISTA') || h.includes('RESPONSAVEL'));
  const idxFantasia = cabecalhos.findIndex(h => h.includes('FANTASIA') || h.includes('NOME'));

  const valores = sh.getRange(2, 1, lastRow - 1, cabecalhos.length).getValues();
  const encontrados = [];

  for (let i = 0; i < valores.length; i++) {
    const row = valores[i];
    const luc = String(idxLuc >= 0 ? row[idxLuc] : row[0] || '').trim();
    const titular = String(idxTitular >= 0 ? row[idxTitular] : '').trim();
    const fantasia = String(idxFantasia >= 0 ? row[idxFantasia] : '').trim();
    const contrato = String(idxContrato >= 0 ? row[idxContrato] : '').trim();

    if (luc.toLowerCase().includes(termo) ||
        titular.toLowerCase().includes(termo) ||
        fantasia.toLowerCase().includes(termo) ||
        contrato.toLowerCase().includes(termo)) {
      encontrados.push({
        LUC: luc,
        SETOR: String(idxSetor >= 0 ? row[idxSetor] : ''),
        TIPO: String(idxTipo >= 0 ? row[idxTipo] : 'BOX'),
        NUMERO_CONTRATO: contrato,
        TITULAR: titular,
        NOME_FANTASIA: fantasia
      });
      if (encontrados.length >= limite) break;
    }
  }

  return { ok: true, itens: encontrados };
}

/**
 * Obtém o mapa de status/disponibilidade dos lojistas para a Camada Visual Temática.
 * Retorna dicionário indexado por LUC e número do box + KPIs agregados.
 */
function appObterMapaOcupacaoLojistas(setor) {
  exigirPermissaoLeituraLojistaS14_();
  const setorBuscado = String(setor || '').trim().toUpperCase();

  const ctx = obterContextoPlanilhaLojistasMestre_();
  const sh = ctx.sh;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) {
    return {
      ok: true,
      mapa: {},
      kpis: { total: 0, ocupadas: 0, disponiveis: 0, bloqueadas: 0, reservadas: 0, taxa: '0%' }
    };
  }

  const rawHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const cabecalhos = rawHeaders.map(h => String(h || '').trim().toUpperCase());
  const idxLuc = cabecalhos.findIndex(h => h === 'LUC' || h.includes('LUC'));
  const idxSetor = cabecalhos.findIndex(h => h.includes('SETOR'));
  const idxDisp = cabecalhos.findIndex(h => h.includes('DISP'));
  const idxStatus = cabecalhos.findIndex(h => h.includes('STATUS'));

  const valores = sh.getRange(2, 1, lastRow - 1, cabecalhos.length).getValues();
  const mapa = {};
  let total = 0, ocupadas = 0, disponiveis = 0, bloqueadas = 0, reservadas = 0;

  for (let i = 0; i < valores.length; i++) {
    const row = valores[i];
    const setorRow = String(idxSetor >= 0 ? row[idxSetor] : '').trim().toUpperCase();

    // Filtra pelo setor se especificado
    if (setorBuscado && setorRow && !setorRow.includes(setorBuscado) && !setorBuscado.includes(setorRow)) {
      continue;
    }

    const luc = String(idxLuc >= 0 ? row[idxLuc] : row[0] || '').trim().toUpperCase();
    if (!luc) continue;

    const disp = String(idxDisp >= 0 ? row[idxDisp] : 'Disponível').trim();
    const status = String(idxStatus >= 0 ? row[idxStatus] : 'Ativa').trim();

    let categoria = 'Disponível';
    const dispUpper = disp.toUpperCase();
    const statusUpper = status.toUpperCase();

    if (statusUpper === 'INATIVA' || dispUpper.includes('BLOQ')) {
      categoria = 'Bloqueada';
      bloqueadas++;
    } else if (dispUpper.includes('RES')) {
      categoria = 'Reservada';
      reservadas++;
    } else if (dispUpper.includes('OCUP')) {
      categoria = 'Ocupada';
      ocupadas++;
    } else {
      categoria = 'Disponível';
      disponiveis++;
    }
    total++;

    mapa[luc] = categoria;

    // Indexa por chaves compostas por rua/sigla para resolução exata e segura (sem colisão entre ruas)
    const matchPrefixNum = luc.match(/^([A-Z0-9]*[A-Z])(\d+)$/);
    if (matchPrefixNum) {
      const sigla = matchPrefixNum[1];
      const numCompleto = matchPrefixNum[2];

      const MAPA_ALIAS_SIGLAS_REVERSO = {
        'ADDCX': ['ADQCX'],
        'RDPDI': ['RDPD1', 'RDPD'],
        'RMDAL': ['RNDAL'],
        'RSPL': ['RSDMR'],
        'RCESL': ['RGSJR', 'RCESJ'],
        'RDRJM': ['RDJMR'],
        'RSNJG': ['RSNGB'],
        'APCBR': ['APCRB'],
        'RGLRC': ['RGLC'],
        'RBDRB': ['RBRDB']
      };

      const todasSiglas = [sigla, ...(MAPA_ALIAS_SIGLAS_REVERSO[sigla] || [])];

      for (let sIdx = 0; sIdx < todasSiglas.length; sIdx++) {
        const s = todasSiglas[sIdx];
        mapa[s + '_' + numCompleto] = categoria;
        mapa[s + numCompleto] = categoria;

        // Se tiver 4 dígitos (ex: 1102 = Piso 1 + Box 102, 2102 = Piso 2 + Box 102, 3102 = Piso 3 + Box 102)
        if (numCompleto.length === 4) {
          const numSemPiso = numCompleto.slice(1);
          mapa[s + numSemPiso] = categoria;
          mapa[s + '_' + numSemPiso] = categoria;
          const numTrim = String(parseInt(numSemPiso, 10));
          if (numTrim !== numSemPiso) {
            mapa[s + numTrim] = categoria;
            mapa[s + '_' + numTrim] = categoria;
          }
        }
      }
    }
  }

  const taxa = total > 0 ? ((ocupadas / total) * 100).toFixed(1) + '%' : '0%';

  return {
    ok: true,
    setor: setorBuscado,
    mapa: mapa,
    kpis: {
      total: total,
      ocupadas: ocupadas,
      disponiveis: disponiveis,
      bloqueadas: bloqueadas,
      reservadas: reservadas,
      taxa: taxa
    }
  };
}

/**
 * Retorna o histórico de Autorizações de Serviço (AS) e Ocorrências / Ativos
 * vinculados ao espaço comercial (por LUC ou número do Box).
 */
function appObterHistoricoLojista(payload) {
  exigirPermissaoLeituraLojistaS14_();
  const p = typeof payload === 'object' && payload !== null ? payload : { luc: String(payload || '') };
  const lucAlvo = String(p.luc || '').trim().toUpperCase();
  const numAlvo = String(p.numeroLoja || p.numero || '').trim();
  const numLimpo = lucAlvo.replace(/[^0-9]/g, '');

  if (!lucAlvo && !numAlvo) {
    return { ok: true, total: 0, totalAS: 0, totalOcorrencias: 0, itens: [] };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('REGISTROS');
  if (!sh) {
    return { ok: true, total: 0, totalAS: 0, totalOcorrencias: 0, itens: [] };
  }

  const lastRow = sh.getLastRow();
  if (lastRow < 2) {
    return { ok: true, total: 0, totalAS: 0, totalOcorrencias: 0, itens: [] };
  }

  const lastCol = Math.min(sh.getLastColumn(), 45);
  let values = null;
  let ultimoErro = null;

  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      values = sh.getRange(1, 1, lastRow, lastCol).getValues();
      break;
    } catch (e) {
      ultimoErro = e;
      Utilities.sleep(400 * tentativa);
    }
  }

  if (!values && ultimoErro) {
    // Fallback defensivo com menos colunas para evitar DEADLINE_EXCEEDED
    try {
      values = sh.getRange(1, 1, lastRow, Math.min(lastCol, 38)).getValues();
    } catch (eFallback) {
      console.warn('[LOJISTAS] Falha na leitura de histórico:', eFallback);
      return {
        ok: false,
        mensagem: 'Servidor ocupado durante leitura de registros. Tente novamente.',
        itens: []
      };
    }
  }

  const head = values.shift().map(String);
  const idx = {};
  head.forEach((h, i) => idx[h] = i);

  const itens = [];

  for (let i = 0; i < values.length; i++) {
    const r = values[i];
    const status = String(r[idx.STATUS] || '').trim().toUpperCase();
    if (['EXCLUIDO', 'DELETADO'].includes(status)) continue;

    const rowLuc = String(r[idx.LUC] || '').trim().toUpperCase();
    const rowNum = String(r[idx.NUMERO_LOJA] || '').trim();
    const rowPat = String(r[idx.CODIGO_PATRIMONIO] || '').trim().toUpperCase();
    const rowBox = String(r[idx.NUMERO_LOJA] || '').replace(/[^0-9]/g, '');

    let match = false;
    if (lucAlvo) {
      if (rowLuc === lucAlvo) match = true;
      else if (rowPat === lucAlvo) match = true;
      else if (numLimpo && (rowBox === numLimpo || rowNum === numLimpo)) match = true;
    }
    if (!match && numAlvo) {
      if (rowNum === numAlvo || rowBox === numAlvo.replace(/[^0-9]/g, '')) match = true;
    }

    if (match) {
      const criadoEm = r[idx.CRIADO_EM];
      let dataFormatada = '';
      if (criadoEm instanceof Date && !isNaN(criadoEm)) {
        dataFormatada = Utilities.formatDate(criadoEm, APP.TIMEZONE || 'America/Fortaleza', "dd/MM/yyyy HH:mm");
      } else {
        dataFormatada = String(criadoEm || '');
      }

      const ehAS = String(r[idx.CATEGORIA_REGISTRO] || '').toUpperCase() === 'AUTORIZACAO_SERVICO' ||
                   String(r[idx.TIPO] || '').startsWith('AS — ') ||
                   String(r[idx.FINALIDADE] || '') === 'Autorização de Serviço';

      itens.push({
        idRegistro: String(r[idx.ID_REGISTRO] || ''),
        protocolo: String(r[idx.PROTOCOLO] || ''),
        categoria: ehAS ? 'AUTORIZACAO_SERVICO' : 'ATIVO',
        tipo: String(r[idx.TIPO] || (ehAS ? 'Autorização de Serviço' : 'Ocorrência')),
        finalidade: String(r[idx.FINALIDADE] || ''),
        titulo: String(r[idx.TITULO] || ''),
        descricao: String(r[idx.DESCRICAO] || ''),
        status: String(r[idx.STATUS] || (ehAS ? 'AUTORIZADO' : 'ATIVA')),
        estadoConservacao: String(r[idx.ESTADO_CONSERVACAO] || ''),
        condicao: String(r[idx.CONDICAO] || ''),
        responsavel: String(r[idx.RESPONSAVEL] || r[idx.PRESTADOR_NOME] || ''),
        solicitante: String(r[idx.SOLICITANTE_NOME] || r[idx.NOME_LOJA] || ''),
        prestador: String(r[idx.PRESTADOR_NOME] || ''),
        dataInicio: String(r[idx.DATA_INICIO_SERVICO] || r[idx.DATA_INSTALACAO] || ''),
        dataFim: String(r[idx.DATA_FIM_SERVICO] || r[idx.VALIDADE] || ''),
        horario: String(r[idx.HORARIO_SERVICO] || ''),
        tipoSolicitacao: String(r[idx.TIPO_SOLICITACAO] || ''),
        criadoEm: dataFormatada,
        rawTs: (criadoEm instanceof Date && !isNaN(criadoEm)) ? criadoEm.getTime() : 0,
        mapa: String(r[idx.MAPA] || ''),
        piso: String(r[idx.PISO] || ''),
        x: Number(r[idx.X_NORMALIZADO]) || 0,
        y: Number(r[idx.Y_NORMALIZADO]) || 0
      });
    }
  }

  // Ordena pelo mais recente
  itens.sort((a, b) => b.rawTs - a.rawTs);

  return {
    ok: true,
    luc: lucAlvo,
    total: itens.length,
    totalAS: itens.filter(it => it.categoria === 'AUTORIZACAO_SERVICO').length,
    totalOcorrencias: itens.filter(it => it.categoria !== 'AUTORIZACAO_SERVICO').length,
    itens: itens
  };
}

/**
 * Sincronização / reparação em lote dos nomes das ruas na Planilha Mestre de Lojistas.
 */
function appSincronizarRuasPlanilhaLojistas() {
  exigirPermissaoS14_('administrar');
  return executarSincronizacaoRuasPlanilhaLojistas_();
}

function executarSincronizacaoRuasPlanilhaLojistas_() {
  const ctx = obterContextoPlanilhaLojistasMestre_();
  const sh = ctx.sh;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { ok: true, totalLinhas: 0, totalAtualizados: 0 };

  garantirColunaRuaPlanilhaLojistas_(sh);

  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h || '').trim().toUpperCase());
  const idxLuc = headers.indexOf('LUC');
  const idxRua = headers.indexOf('RUA');
  if (idxLuc === -1 || idxRua === -1) {
    throw new Error('Colunas LUC ou RUA não encontradas na planilha LOJISTAS.');
  }

  const colLuc = idxLuc + 1;
  const colRua = idxRua + 1;

  const lucs = sh.getRange(2, colLuc, lastRow - 1, 1).getValues();
  const ruasAtuais = sh.getRange(2, colRua, lastRow - 1, 1).getValues();
  let alterados = 0;

  const novosValores = lucs.map((r, i) => {
    const luc = String(r[0] || '').trim();
    const ruaAtual = String(ruasAtuais[i][0] || '').trim();
    const resolvida = resolverNomeCompletoRua(ruaAtual || luc) || resolverNomeCompletoRua(luc);
    if (!ruaAtual || ruaAtual !== resolvida) {
      alterados++;
    }
    return [resolvida || ruaAtual];
  });

  if (novosValores.length > 0) {
    sh.getRange(2, colRua, novosValores.length, 1).setValues(novosValores);
  }

  console.log(`[LOJISTAS] Sincronização de ruas concluída: ${alterados} atualizadas de ${novosValores.length}.`);
  return {
    ok: true,
    totalLinhas: novosValores.length,
    totalAtualizados: alterados
  };
}

/**
 * Saneamento em lote dos caracteres corrompidos (U+FFFD / ) por problemas de encoding na importação da Planilha Mestre de Lojistas.
 */
function appSanearCaracteresPlanilhaLojistas() {
  exigirPermissaoS14_('administrar');
  return executarSaneamentoCaracteresLojistas_();
}

function executarSaneamentoCaracteresLojistas_() {
  const ctx = obterContextoPlanilhaLojistasMestre_();
  const sh = ctx.sh;
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) {
    return { ok: true, totalLinhas: 0, celulasCorrigidas: 0, linhasComCorrecao: 0 };
  }

  const range = sh.getRange(2, 1, lastRow - 1, lastCol);
  const values = range.getValues();

  const substringReplacements = [
    // Palavras e categorias frequentes
    ['Dispon\uFFFDvel', 'Disponível'],
    ['confec\uFFFD\uFFFDes\uFFFD', 'confecções'],
    ['confec\uFFFD\uFFFDes', 'confecções'],
    ['CONFEC\uFFFD\uFFFDES', 'CONFECÇÕES'],
    ['Sat\uFFFDlite', 'Satélite'],
    ['Cl\uFFFDssico', 'Clássico'],
    ['Acess\uFFFDrios', 'Acessórios'],
    ['vestu\uFFFDrio', 'vestuário'],
    ['\uFFFDntima', 'Íntima'],
    ['\uFFFDntimas', 'Íntimas'],
    ['Servi\uFFFDos', 'Serviços'],
    ['servi\uFFFDos', 'serviços'],
    ['Cal\uFFFDados', 'Calçados'],
    ['Contempor\uFFFDneo', 'Contemporâneo'],
    ['Alimenta\uFFFD\uFFFDo', 'Alimentação'],
    ['Dram\uFFFDtico', 'Dramático'],
    ['eletr\uFFFDnicos', 'eletrônicos'],
    ['Cosm\uFFFDticos', 'Cosméticos'],
    ['Cl\uFFFDnica', 'Clínica'],
    ['J\uFFFDias', 'Jóias'],
    ['Rom\uFFFDntico', 'Romântico'],
    ['\uFFFDtica', 'Ótica'],
    ['P\uFFFDgina', 'Página'],

    // Nomes próprios em NOME_FANTASIA / LOJISTA
    ['MENDON\uFFFD\uFFFDA', 'MENDONÇA'],
    ['MENDON\uFFFDA', 'MENDONÇA'],
    ['ROQUE\uFFFD', 'ROQUE'],
    ['SA\uFFFD', 'SÁ'],
    ['GRA\uFFFDAS', 'GRAÇAS'],
    ['ELIDIANA\uFFFD', 'ELIDIANA'],
    ['GON\uFFFDALVES', 'GONÇALVES'],
    ['GONA\uFFFDALVES', 'GONÇALVES'],
    ['LOUREN\uFFFDO', 'LOURENÇO'],
    ['ANDR\uFFFD', 'ANDRÉ'],
    ['MAGALH\uFFFD\uFFFDES', 'MAGALHÃES'],
    ['MAGALH\uFFFDES', 'MAGALHÃES'],
    ['AUR\uFFFD\uFFFDIO', 'AURÉLIO'],
    ['AUR\uFFFDIO', 'AURÉLIO'],
    ['JUCA\uFFFD', 'JUCÁ'],
    ['LE\uFFFD\uFFFD\uFFFD', 'LEÃO'],
    ['LE\uFFFD\uFFFD', 'LEÃO'],
    ['LE\uFFFDA', 'LEÃO'],
    ['MARLI\uFFFD', 'MARLI'],
    ['ADELAIDE\uFFFD', 'ADELAIDE'],
    ['ALAN\uFFFD', 'ALAN'],
    ['FA\uFFFDTIMA', 'FÁTIMA'],
    ['LUCIA\uFFFD', 'LÚCIA'],
    ['NILTON CESAR\uFFFD', 'NILTON CÉSAR'],
    ['KATLEN EVELLYN\uFFFD', 'KATLEN EVELLYN'],
    ['OLGA GABRIELA\uFFFD', 'OLGA GABRIELA'],
    ['DOCAV1\uFFFD', 'DOCAV1']
  ];

  let celulasCorrigidas = 0;
  let linhasComCorrecao = 0;

  for (let r = 0; r < values.length; r++) {
    let linhaAlterada = false;
    for (let c = 0; c < lastCol; c++) {
      const val = values[r][c];
      if (typeof val === 'string' && val.indexOf('\uFFFD') !== -1) {
        let s = val;
        for (let i = 0; i < substringReplacements.length; i++) {
          const de = substringReplacements[i][0];
          const para = substringReplacements[i][1];
          if (s.indexOf(de) !== -1) {
            s = s.split(de).join(para);
          }
        }
        if (s.indexOf('\uFFFD') !== -1) {
          s = s.replace(/\uFFFD+/g, '');
        }
        s = s.trim();
        if (s !== val) {
          values[r][c] = s;
          celulasCorrigidas++;
          linhaAlterada = true;
        }
      }
    }
    if (linhaAlterada) {
      linhasComCorrecao++;
    }
  }

  if (celulasCorrigidas > 0) {
    range.setValues(values);
  }

  // Remove linha espúria "Página 1 de 1" se estiver na última linha
  if (lastRow > 2) {
    const ultLuc = String(sh.getRange(lastRow, 1).getValue() || '').trim();
    if (ultLuc.indexOf('Página 1 de 1') !== -1 || ultLuc.indexOf('P\uFFFDgina 1 de 1') !== -1) {
      sh.deleteRow(lastRow);
    }
  }

  console.log(`[LOJISTAS] Saneamento de encoding concluído: ${celulasCorrigidas} células corrigidas em ${linhasComCorrecao} linhas.`);
  return {
    ok: true,
    totalLinhas: values.length,
    celulasCorrigidas: celulasCorrigidas,
    linhasComCorrecao: linhasComCorrecao
  };
}


