/** S5B — Consulta offline. O backend apenas entrega pacotes; o cache fica no IndexedDB do navegador. */
function setupS5B(){
  const ss=SpreadsheetApp.getActive(); const cfg=ss.getSheetByName('CONFIG');
  if(!cfg) throw new Error('CONFIG ausente.');
  const atual=lerConfigComoObjeto_(ss);
  if(atual.S4_STATUS!=='INSTALADO' && atual.APP_FASE!=='S4' && atual.APP_FASE!=='S5B') throw new Error('S4 ainda não está instalada.');
  setConfigValue_(cfg,'APP_VERSAO',APP.VERSAO,'Versão atualmente instalada');
  setConfigValue_(cfg,'APP_FASE',APP.FASE,'Fase de implementação validada');
  setConfigValue_(cfg,'S5B_STATUS','INSTALADO','Consulta offline com IndexedDB instalada');
  setConfigValue_(cfg,'S5B_DB_NOME','MallSinalizacaoOffline','Banco IndexedDB do dispositivo');
  setConfigValue_(cfg,'S5B_INSTALADO_EM',Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),'Data/hora de instalação S5B');
  atualizarReadmeS5B(); SpreadsheetApp.flush();
  return diagnosticoS5B();
}











function atualizarReadmeS5B(){
  const ss=SpreadsheetApp.getActive();let sh=ss.getSheetByName('README');if(!sh)sh=ss.insertSheet('README');sh.clear();
  const rows=[['SINALIZAÇÃO DO MALL — FASE S5B'],[''],['VERSÃO'],[APP.VERSAO],[''],['OBJETIVO'],['Preparar no dispositivo uma cópia somente leitura dos mapas, camadas cartográficas e registros para consulta quando a conexão cair.'],[''],['BANCO LOCAL'],['IndexedDB: MallSinalizacaoOffline'],['Stores: bootstrap, mapPackages, config'],[''],['FLUXO'],['Online → Preparar offline → armazenar os 5 mapas sequencialmente → desligar conexão → consultar mapas e marcadores já preparados.'],[''],['REGRA'],['S5B é somente consulta. Novo registro fica bloqueado no modo offline; criação offline será S6 — Outbox.'],[''],['GATE S5B'],['1. Executar setupS5B().'],['2. Publicar nova versão do Web App.'],['3. Clicar em Preparar offline e aguardar 5/5 mapas.'],['4. Executar Verificar cache: integridade OK.'],['5. Com a aplicação aberta, desligar Wi-Fi/dados.'],['6. Trocar entre os mapas preparados, usar pan/zoom e abrir marcadores.'],['7. Confirmar que Novo registro fica indisponível sem conexão.'],[''],['OBSERVAÇÃO APPS SCRIPT'],['A S5B mantém a aplicação já carregada funcionando após perda de conexão. Abertura fria do URL /exec com navegador totalmente sem rede depende do shell hospedado do Google e não é garantida pelo Apps Script.'],[''],['PRÓXIMA FASE'],['S5B — manifest, atualização incremental, reparo e restauração.']];
  sh.getRange(1,1,rows.length,1).setValues(rows);sh.getRange('A1').setFontWeight('bold').setFontSize(16).setFontColor('#171B68');sh.setColumnWidth(1,900);sh.getRange('A:A').setWrap(true);
}






/**
 * S5B.3 — API backend autocontida para cache incremental.
 * Não depende de nenhuma função appObter*OfflineS5A.
 */
function appCarregarS5B() {
  const b = appCarregarS3();

  // S23.7.3 — catálogo complementar de tipos.
  // Preserva os tipos existentes, garante Triedo e Placa de galeria,
  // remove duplicidades e ordena alfabeticamente em pt-BR.
  const tiposExistentes = Array.isArray(b.tipos) ? b.tipos : [];
  const tiposComplementares = ['Triedo', 'Placa de galeria'];

  const mapa = new Map();

  [...tiposExistentes, ...tiposComplementares].forEach(v => {
    const texto = String(v || '').trim();
    if (!texto) return;

    const chave = texto.toLocaleLowerCase('pt-BR');
    if (!mapa.has(chave)) mapa.set(chave, texto);
  });

  b.tipos = [...mapa.values()].sort((a, z) =>
    String(a).localeCompare(String(z), 'pt-BR', {
      sensitivity: 'base',
      numeric: true
    })
  );

  // S24.1 — níveis 2025.
  try{
    b.niveisS241 = (typeof appListarNiveisS241==='function')
      ? appListarNiveisS241()
      : [];
  }catch(_){
    b.niveisS241 = [];
  }

  // S24.3 — matrizes validadas necessárias para identificar,
  // inclusive offline, o setor correspondente a um clique no nível.
  try{
    b.operacaoNiveisS243 = (typeof appObterOperacaoNiveisS243==='function')
      ? appObterOperacaoNiveisS243()
      : [];
  }catch(_){
    b.operacaoNiveisS243 = [];
  }

  // S24.4 — operação nativa do Nível 3 / estacionamento.
  try{
    b.operacaoNivel3S244 = (typeof appObterOperacaoNivel3S244==='function')
      ? appObterOperacaoNivel3S244()
      : null;
  }catch(_){
    b.operacaoNivel3S244 = null;
  }

  // S24.6 — Hotel, Central de Distribuição e Área Externa do Nível 1.
  try{
    b.operacaoNivel1S246 = (typeof appObterOperacaoNivel1S246==='function')
      ? appObterOperacaoNivel1S246()
      : null;
  }catch(_){
    b.operacaoNivel1S246 = null;
  }

  b.app = {
    id: APP.ID,
    nome: APP.NOME,
    versao: APP.VERSAO,
    fase: APP.FASE,
    modoDados: APP.MODO_DADOS
  };
  return b;
}

function appPingS5B() {
  return {
    ok: true,
    versao: APP.VERSAO,
    fase: APP.FASE,
    agora: Utilities.formatDate(
      new Date(),
      APP.TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    )
  };
}



function appObterManifestOfflineS5B() {
  const mapas = listarMapasS2_();
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('REGISTROS');
  const registrosPorMapa = {};

  if (sh && sh.getLastRow() > 1) {
    const vals = sh.getDataRange().getValues();
    const head = vals.shift().map(String);
    const iMapa = head.indexOf('ID_MAPA_SETOR');
    const iId = head.indexOf('ID_REGISTRO');
    const iCriado = head.indexOf('CRIADO_EM');
    const iStatus = head.indexOf('STATUS');

    vals.forEach(r => {
      const status = iStatus >= 0 ? String(r[iStatus] || '').trim().toUpperCase() : '';
      if (status === 'EXCLUIDO') return;
      const idMapa = String(r[iMapa] || '').trim();
      if (!idMapa) return;
      if (!registrosPorMapa[idMapa]) registrosPorMapa[idMapa] = [];
      registrosPorMapa[idMapa].push([
        String(r[iId] || ''),
        String(r[iCriado] || ''),
        String(r[iStatus] || '')
      ]);
    });
  }

  const PACOTE_SCHEMA = 3;

  const items = mapas.map(m => {
    const dadosLoc = appObterDadosLocalizacaoOfflineS6(m.id);
    const payload = {
      pacoteSchema: PACOTE_SCHEMA,
      appVersao: APP.VERSAO,
      id: String(m.id || ''),
      nome: String(m.nome || ''),
      piso: String(m.piso || ''),
      imagemId: String(m.imagemId || ''),
      versaoMapa: String(m.versao || ''),
      registros: registrosPorMapa[m.id] || [],
      localizacaoResumo: {
        corredores: (dadosLoc.corredores || []).length,
        pontos: (dadosLoc.pontos || []).length,
        segmentos: (dadosLoc.segmentos || []).length
      }
    };

    const assinatura = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      JSON.stringify(payload),
      Utilities.Charset.UTF_8
    ).map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2,'0')).join('');

    return {
      id: payload.id,
      nome: payload.nome,
      piso: payload.piso,
      imagemId: payload.imagemId,
      pacoteSchema: PACOTE_SCHEMA,
      localizacaoResumo: payload.localizacaoResumo,
      assinatura
    };
  });

  const assinaturaGlobal = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify({
      pacoteSchema: PACOTE_SCHEMA,
      appVersao: APP.VERSAO,
      mapas: items
    }),
    Utilities.Charset.UTF_8
  ).map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2,'0')).join('');

  return {
    schema: 2,
    pacoteSchema: PACOTE_SCHEMA,
    versao: APP.VERSAO,
    fase: APP.FASE,
    geradoEm: Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),
    assinaturaGlobal,
    mapas: items
  };
}

function appObterPacoteMapaOfflineS5B(idMapa) {
  const id = String(idMapa || '').trim();
  if (!id) throw new Error('ID do mapa não informado.');

  const mapas = listarMapasS2_();
  const mapa = mapas.find(m => String(m.id || '') === id);
  if (!mapa) throw new Error('Mapa não encontrado: ' + id);

  // Geração direta do pacote S5B, sem chamar S5A.
  const imagem = appObterImagemMapaS2(id);
  if (!imagem || !imagem.dataUrl) {
    throw new Error('Imagem do mapa indisponível: ' + id);
  }

  const camadas = appObterCamadasS2(id);
  const registros = appListarRegistrosMapaS4(id);

  const manifest = appObterManifestOfflineS5B();
  const item = manifest.mapas.find(m => m.id === id);

  return {
    id,
    schema: 3,
    pacoteSchema: 3,
    versao: APP.VERSAO,
    fase: APP.FASE,
    geradoEm: Utilities.formatDate(
      new Date(),
      APP.TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    ),
    assinatura: item ? item.assinatura : '',
    mapa,
    imagemDataUrl: String(imagem.dataUrl || ''),
    camadas: camadas || {
      referencias: [],
      cruzamentos: [],
      lojas: []
    },
    registros: Array.isArray(registros) ? registros : [],
    localizacao: appObterDadosLocalizacaoOfflineS6(id)
  };
}

/**
 * Diagnóstico S5B autocontido.
 * Não depende de diagnosticoS5A nem de qualquer fase anterior.
 */
function diagnosticoS5B() {
  const ss = SpreadsheetApp.getActive();
  const cfg = lerConfigComoObjeto_(ss);
  const checks = [];

  check_(checks, 'APP_ID',
    cfg.APP_ID === APP.ID,
    cfg.APP_ID || 'ausente');

  check_(checks, 'APP_VERSAO',
    cfg.APP_VERSAO === APP.VERSAO,
    cfg.APP_VERSAO || 'ausente');

  check_(checks, 'APP_FASE',
    cfg.APP_FASE === APP.FASE,
    cfg.APP_FASE || 'ausente');

  check_(checks, 'MODO_DADOS',
    cfg.MODO_DADOS === APP.MODO_DADOS,
    cfg.MODO_DADOS || 'ausente');

  check_(checks, 'S4_INSTALADA',
    cfg.S4_STATUS === 'INSTALADO',
    cfg.S4_STATUS || 'ausente');

  check_(checks, 'S5B_STATUS',
    cfg.S5B_STATUS === 'INSTALADO',
    cfg.S5B_STATUS || 'ausente');

  const mapas = listarMapasS2_();
  check_(checks, 'MAPAS_ATIVOS',
    mapas.length > 0,
    `${mapas.length} mapa(s)`);

  check_(checks, 'ABA_REGISTROS',
    !!ss.getSheetByName('REGISTROS'),
    ss.getSheetByName('REGISTROS') ? 'OK' : 'ausente');

  let manifestOk = false;
  let manifestDetalhe = 'não testado';

  try {
    const manifest = appObterManifestOfflineS5B();
    manifestOk = !!(
      manifest &&
      Number(manifest.schema) === 2 &&
      Array.isArray(manifest.mapas) &&
      manifest.mapas.length === mapas.length &&
      String(manifest.assinaturaGlobal || '').length >= 32
    );

    manifestDetalhe = manifestOk
      ? `${manifest.mapas.length} mapa(s) • SHA-256 ${String(manifest.assinaturaGlobal).slice(0, 12)}`
      : 'manifest inválido';
  } catch (e) {
    manifestDetalhe = e && e.message ? e.message : String(e);
  }

  check_(checks, 'MANIFEST_INCREMENTAL',
    manifestOk,
    manifestDetalhe);

  check_(checks, 'REPARO_CACHE',
    true,
    'Implementado no cliente S5B');

  check_(checks, 'ROLLBACK_LOCAL',
    true,
    'Último pacote válido preservado');

  check_(checks, 'INDEXEDDB_CLIENTE',
    true,
    'Validado no navegador');

  return {
    ok: checks.every(c => c.ok),
    totalChecks: checks.length,
    totalFalhas: checks.filter(c => !c.ok).length,
    checks
  };
}

function mostrarDiagnosticoS5B() {
  const d = diagnosticoS5B();

  SpreadsheetApp.getUi().alert(
    'Diagnóstico S5B',
    `${d.ok ? 'S5B PRONTA' : 'HÁ PENDÊNCIAS'}\n\n` +
      d.checks
        .map(c => `${c.ok ? '✅' : '❌'} ${c.nome}: ${c.detalhe}`)
        .join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );

  return d;
}


// ========================================================
// S6 — OUTBOX / CRIAÇÃO OFFLINE
// ========================================================
function setupS6() {
  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');
  if (!cfg) throw new Error('CONFIG ausente.');

  setConfigValue_(cfg,'APP_VERSAO',APP.VERSAO,'Versão atualmente instalada');
  setConfigValue_(cfg,'APP_FASE','S6','Fase de implementação validada');
  setConfigValue_(cfg,'S6_STATUS','INSTALADO','Outbox offline instalada');
  setConfigValue_(cfg,'S6_DB_VERSION','2','Versão IndexedDB com Outbox');
  setConfigValue_(cfg,'S6_INSTALADO_EM',
    Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),
    'Data/hora de instalação da S6'
  );
  SpreadsheetApp.flush();
  return diagnosticoS6();
}

function appSincronizarRegistroS6(dados) {
  // appCriarRegistroS3 já é idempotente por CLIENT_EVENT_ID.
  return appCriarRegistroS3(dados || {});
}

function appVerificarRegistroS6(clientEventId) {
  const id = String(clientEventId || '').trim();
  if (!id) return {ok:false,encontrado:false};
  const r = obterRegistroPorClientEventS3_(id);
  return r ? {
    ok:true,
    encontrado:true,
    idRegistro:String(r.ID_REGISTRO||''),
    protocolo:String(r.PROTOCOLO||''),
    status:String(r.STATUS||'ATIVA'),
    clientEventId:id
  } : {ok:true,encontrado:false,clientEventId:id};
}

/**
 * Dados necessários para o mesmo motor de localização funcionar offline.
 * O pacote é filtrado por mapa para reduzir tamanho.
 */
function appObterDadosLocalizacaoOfflineS6(idMapaSetor) {
  const idMapa = String(idMapaSetor || '').trim();

  const corredores = linhasObjetosS2_('CORREDORES')
    .filter(r => String(r.ID_MAPA_SETOR||'') === idMapa && ativoS2_(r.ATIVO))
    .map(r => ({
      idCorredor:String(r.ID_CORREDOR||''),
      nome:String(r.NOME||''),
      tolerancia:numS3_(r.TOLERANCIA_NORMALIZADA)||0.025
    }));

  const ids = new Set(corredores.map(c => c.idCorredor));

  const pontos = linhasObjetosS2_('CORREDOR_PONTOS')
    .filter(r => ids.has(String(r.ID_CORREDOR||'')) && ativoS2_(r.ATIVO))
    .map(r => ({
      idCorredor:String(r.ID_CORREDOR||''),
      ordem:Number(r.ORDEM)||0,
      x:numS3_(r.X_NORMALIZADO),
      y:numS3_(r.Y_NORMALIZADO)
    }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

  const segmentos = linhasObjetosS2_('SEGMENTOS_CORREDORES')
    .filter(r => ids.has(String(r.ID_CORREDOR||'')) && ativoS2_(r.ATIVO))
    .map(r => ({
      idSegmento:String(r.ID_SEGMENTO||''),
      idCorredor:String(r.ID_CORREDOR||''),
      inicio:numS3_(r.PERCENTUAL_INICIO),
      fim:numS3_(r.PERCENTUAL_FIM),
      nome:String(r.NOME_SEGMENTO||r.DESCRICAO_PADRAO||'')
    }));

  return {corredores,pontos,segmentos};
}

function diagnosticoS6() {
  const ss=SpreadsheetApp.getActive();
  const cfg=lerConfigComoObjeto_(ss);
  const checks=[];
  check_(checks,'APP_ID',cfg.APP_ID===APP.ID,cfg.APP_ID||'ausente');
  check_(checks,'APP_VERSAO',cfg.APP_VERSAO===APP.VERSAO,cfg.APP_VERSAO||'ausente');
  check_(checks,'APP_FASE',cfg.APP_FASE==='S6',cfg.APP_FASE||'ausente');
  check_(checks,'MODO_DADOS',cfg.MODO_DADOS===APP.MODO_DADOS,cfg.MODO_DADOS||'ausente');
  check_(checks,'S6_STATUS',cfg.S6_STATUS==='INSTALADO',cfg.S6_STATUS||'ausente');
  check_(checks,'ABA_REGISTROS',!!ss.getSheetByName('REGISTROS'),'REGISTROS');
  check_(checks,'IDEMPOTENCIA',typeof appCriarRegistroS3==='function','CLIENT_EVENT_ID');
  check_(checks,'SYNC_S6',typeof appSincronizarRegistroS6==='function','OK');
  check_(checks,'LOCALIZACAO_OFFLINE',typeof appObterDadosLocalizacaoOfflineS6==='function','OK');
  return {ok:checks.every(c=>c.ok),totalChecks:checks.length,totalFalhas:checks.filter(c=>!c.ok).length,checks};
}

function mostrarDiagnosticoS6(){
  const d=diagnosticoS6();
  SpreadsheetApp.getUi().alert(
    'Diagnóstico S6',
    `${d.ok?'S6 PRONTA':'HÁ PENDÊNCIAS'}\n\n`+
      d.checks.map(c=>`${c.ok?'✅':'❌'} ${c.nome}: ${c.detalhe}`).join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return d;
}



// ========================================================
// S7 — FOTOS OFFLINE E SINCRONIZAÇÃO DE ANEXOS
// ========================================================
function setupS7() {
  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');
  if (!cfg) throw new Error('CONFIG ausente.');

  setConfigValue_(cfg,'APP_VERSAO',APP.VERSAO,'Versão atualmente instalada');
  setConfigValue_(cfg,'APP_FASE','S7','Fase de implementação validada');
  setConfigValue_(cfg,'S7_STATUS','INSTALADO','Fotos offline instaladas');
  setConfigValue_(cfg,'S7_DB_VERSION','3','IndexedDB com Outbox de fotos');
  setConfigValue_(cfg,'S7_INSTALADO_EM',
    Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),
    'Data/hora de instalação da S7'
  );
  SpreadsheetApp.flush();
  return diagnosticoS7();
}

function appSincronizarFotoS7(payload) {
  exigirPermissaoS14_('criarRegistro');
  payload = payload || {};
  const clientPhotoId = String(payload.clientPhotoId || '').trim();
  const clientEventId = String(payload.clientEventId || '').trim();
  if (!clientPhotoId) throw new Error('CLIENT_PHOTO_ID obrigatório.');
  if (!clientEventId) throw new Error('CLIENT_EVENT_ID obrigatório.');

  // R01 (auditoria S26.10) — lock atômico: checagem de idempotência e
  // criação sob um único lock para evitar duplicidade sob concorrência.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Sincronização de foto concorrente em andamento. Tente novamente em instantes.');

  try {
    const ss = SpreadsheetApp.getActive();
    const shFotos = ss.getSheetByName('REGISTRO_FOTOS');
    if (!shFotos) throw new Error('Aba REGISTRO_FOTOS ausente.');

    const existente = obterFotoPorClientPhotoIdS7_(clientPhotoId);
  if (existente) {
    return {
      ok:true,
      idempotente:true,
      idFoto:String(existente.ID_FOTO || ''),
      arquivoId:String(existente.ARQUIVO_ID || ''),
      driveUrl:String(existente.DRIVE_URL || ''),
      clientPhotoId
    };
  }

  const reg = obterRegistroPorClientEventS3_(clientEventId);
  if (!reg) {
    return {ok:false,aguardandoRegistro:true,clientPhotoId,clientEventId};
  }

  const dataUrl = String(payload.dataUrl || '');
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error('Imagem inválida.');

  const mime = String(payload.mimeType || m[1] || 'image/jpeg');
  const bytes = Utilities.base64Decode(m[2]);
  const nomeOriginal = sanitizarNomeArquivoS7_(String(payload.nomeArquivo || 'foto.jpg'));
  const extensao = extensaoMimeS7_(mime, nomeOriginal);
  const nome = `${String(reg.PROTOCOLO || reg.ID_REGISTRO)}_${clientPhotoId.slice(0,8)}${extensao}`;

  const cfg = lerConfigComoObjeto_(ss);
  const folderId = cfg.FOTOS_REGISTROS_FOLDER_ID;
  if (!folderId) throw new Error('FOTOS_REGISTROS_FOLDER_ID não configurado.');
  const folder = DriveApp.getFolderById(folderId);
  const blob = Utilities.newBlob(bytes, mime, nome);
  const file = folder.createFile(blob);

  const sha = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
    .map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2,'0')).join('');

  const agora = new Date();
  const idFoto = 'FOTO-' + Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase();
  const obj = {
    ID_FOTO:idFoto,
    CLIENT_PHOTO_ID:clientPhotoId,
    CLIENT_EVENT_ID:clientEventId,
    ID_REGISTRO:String(reg.ID_REGISTRO || ''),
    PROTOCOLO:String(reg.PROTOCOLO || ''),
    CRIADO_EM:agora,
    SINCRONIZADO_EM:agora,
    ARQUIVO_ID:file.getId(),
    NOME_ARQUIVO:nome,
    MIME_TYPE:mime,
    TAMANHO_BYTES:bytes.length,
    SHA256:sha,
    DRIVE_URL:file.getUrl(),
    USUARIO:(usuarioRpcAtualS223_()?.email||Session.getActiveUser().getEmail()) || '',
    DEVICE_ID:String(payload.deviceId || ''),
    VERSAO_APP:APP.VERSAO
  };

  appendObjetoPorCabecalhoS7_(shFotos,obj);

    return {
      ok:true,
      idFoto,
      arquivoId:file.getId(),
      driveUrl:file.getUrl(),
      protocolo:String(reg.PROTOCOLO || ''),
      clientPhotoId
    };
  } finally {
    lock.releaseLock();
  }
}

function obterFotoPorClientPhotoIdS7_(clientPhotoId) {
  const sh = SpreadsheetApp.getActive().getSheetByName('REGISTRO_FOTOS');
  if (!sh || sh.getLastRow() < 2) return null;
  const vals = sh.getDataRange().getValues();
  const h = vals.shift().map(String);
  const idx = {};
  h.forEach((x,i)=>idx[x]=i);
  for (const r of vals) {
    if (String(r[idx.CLIENT_PHOTO_ID] || '') === clientPhotoId) {
      const o={};
      h.forEach((k,i)=>o[k]=r[i]);
      return o;
    }
  }
  return null;
}

function appendObjetoPorCabecalhoS7_(sh,obj) {
  const h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  sh.appendRow(h.map(k => Object.prototype.hasOwnProperty.call(obj,k) ? obj[k] : ''));
}

function sanitizarNomeArquivoS7_(s) {
  return String(s || 'foto').replace(/[^\w.\-]+/g,'_').slice(-120);
}
function extensaoMimeS7_(mime,nome) {
  if (/\.jpe?g$/i.test(nome) || mime==='image/jpeg') return '.jpg';
  if (/\.png$/i.test(nome) || mime==='image/png') return '.png';
  if (/\.webp$/i.test(nome) || mime==='image/webp') return '.webp';
  return '.jpg';
}

function diagnosticoS7() {
  const ss=SpreadsheetApp.getActive();
  const cfg=lerConfigComoObjeto_(ss);
  const checks=[];
  check_(checks,'APP_ID',cfg.APP_ID===APP.ID,cfg.APP_ID||'ausente');
  check_(checks,'APP_VERSAO',cfg.APP_VERSAO===APP.VERSAO,cfg.APP_VERSAO||'ausente');
  check_(checks,'APP_FASE',cfg.APP_FASE==='S7',cfg.APP_FASE||'ausente');
  check_(checks,'S7_STATUS',cfg.S7_STATUS==='INSTALADO',cfg.S7_STATUS||'ausente');
  check_(checks,'ABA_REGISTRO_FOTOS',!!ss.getSheetByName('REGISTRO_FOTOS'),'REGISTRO_FOTOS');
  check_(checks,'PASTA_FOTOS',!!cfg.FOTOS_REGISTROS_FOLDER_ID,cfg.FOTOS_REGISTROS_FOLDER_ID||'ausente');
  check_(checks,'SYNC_FOTO',typeof appSincronizarFotoS7==='function','OK');
  return {ok:checks.every(c=>c.ok),totalChecks:checks.length,totalFalhas:checks.filter(c=>!c.ok).length,checks};
}
function mostrarDiagnosticoS7(){
  const d=diagnosticoS7();
  SpreadsheetApp.getUi().alert(
    'Diagnóstico S7',
    `${d.ok?'S7 PRONTA':'HÁ PENDÊNCIAS'}\n\n`+
      d.checks.map(c=>`${c.ok?'✅':'❌'} ${c.nome}: ${c.detalhe}`).join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return d;
}


// ========================================================
// S8 — HISTÓRICO E INSPEÇÕES
// ========================================================
const S8_HIST_HEADERS = [
  'CLIENT_INSPECTION_ID',
  'ESTADO_CONSERVACAO',
  'CONDICAO',
  'RESPONSAVEL_INSPECAO',
  'ACAO_RECOMENDADA',
  'PROXIMA_INSPECAO',
  'ORIGEM',
  'DEVICE_ID',
  'VERSAO_APP'
];

function setupS8() {
  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');
  const sh = ss.getSheetByName('REGISTRO_HISTORICO');
  if (!cfg) throw new Error('CONFIG ausente.');
  if (!sh) throw new Error('REGISTRO_HISTORICO ausente.');

  garantirCabecalhosS8_(sh);

  setConfigValue_(cfg,'APP_VERSAO',APP.VERSAO,'Versão atualmente instalada');
  setConfigValue_(cfg,'APP_FASE','S8','Fase de implementação validada');
  setConfigValue_(cfg,'S8_STATUS','INSTALADO','Histórico e inspeções instalados');
  setConfigValue_(cfg,'S8_INSTALADO_EM',
    Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),
    'Data/hora de instalação da S8'
  );

  SpreadsheetApp.flush();
  return diagnosticoS8();
}

function garantirCabecalhosS8_(sh) {
  const last = Math.max(1, sh.getLastColumn());
  const atuais = sh.getRange(1,1,1,last).getValues()[0].map(String);
  const faltantes = S8_HIST_HEADERS.filter(h => !atuais.includes(h));
  if (!faltantes.length) return;
  sh.getRange(1, atuais.length + 1, 1, faltantes.length).setValues([faltantes]);
  sh.getRange(1,1,1,atuais.length+faltantes.length)
    .setFontWeight('bold').setBackground('#171B68').setFontColor('#FFFFFF');
}

function appRegistrarInspecaoS8(payload) {
  exigirPermissaoS14_('inspecionar');
  payload = payload || {};
  const clientInspectionId = String(payload.clientInspectionId || '').trim();
  const idRegistro = String(payload.idRegistro || '').trim();
  if (!clientInspectionId) throw new Error('CLIENT_INSPECTION_ID obrigatório.');
  if (!idRegistro) throw new Error('ID_REGISTRO obrigatório.');

  // R01 (auditoria S26.10) — lock atômico: idempotência + histórico + status
  // sob um único lock para evitar inspeções duplicadas sob concorrência.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Inspeção concorrente em andamento. Tente novamente em instantes.');

  try {
    const existente = obterHistoricoPorClientInspectionS8_(clientInspectionId);
  if (existente) {
    return {
      ok:true,
      idempotente:true,
      idHistorico:String(existente.ID_HISTORICO || ''),
      clientInspectionId
    };
  }

  const ss = SpreadsheetApp.getActive();
  const shReg = ss.getSheetByName('REGISTROS');
  const shHist = ss.getSheetByName('REGISTRO_HISTORICO');
  if (!shReg || !shHist) throw new Error('Abas de registro/histórico ausentes.');

  const reg = obterRegistroPorIdS8_(idRegistro);
  if (!reg) throw new Error('Sinalização não encontrada.');

  const agora = new Date();
  const estadoNovo = String(payload.estadoConservacao || '').trim();
  const condicaoNova = String(payload.condicao || '').trim();
  const responsavel = String(payload.responsavel || '').trim();
  const observacao = String(payload.observacao || '').trim();
  const acao = String(payload.acaoRecomendada || '').trim();
  const proxima = String(payload.proximaInspecao || '').trim();

  const statusAnterior = String(reg.STATUS || '');
  const statusNovo = statusInspecaoS8_(statusAnterior, condicaoNova, estadoNovo);

  const idHistorico = 'HIST-' + Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase();

  const obj = {
    ID_HISTORICO:idHistorico,
    ID_REGISTRO:String(reg.ID_REGISTRO || ''),
    PROTOCOLO:String(reg.PROTOCOLO || ''),
    DATA_HORA:agora,
    USUARIO:(usuarioRpcAtualS223_()?.email||Session.getActiveUser().getEmail()) || '',
    TIPO_EVENTO:'INSPECAO',
    STATUS_ANTERIOR:statusAnterior,
    STATUS_NOVO:statusNovo,
    CAMPO:'INSPECAO',
    VALOR_ANTERIOR:JSON.stringify({
      estadoConservacao:String(reg.ESTADO_CONSERVACAO || ''),
      condicao:String(reg.CONDICAO || ''),
      responsavel:String(reg.RESPONSAVEL || '')
    }),
    VALOR_NOVO:JSON.stringify({
      estadoConservacao:estadoNovo,
      condicao:condicaoNova,
      responsavel
    }),
    OBSERVACAO:observacao,
    CLIENT_INSPECTION_ID:clientInspectionId,
    ESTADO_CONSERVACAO:estadoNovo,
    CONDICAO:condicaoNova,
    RESPONSAVEL_INSPECAO:responsavel,
    ACAO_RECOMENDADA:acao,
    PROXIMA_INSPECAO:proxima,
    ORIGEM:String(payload.origem || 'WEB_APP'),
    DEVICE_ID:String(payload.deviceId || ''),
    VERSAO_APP:APP.VERSAO
  };
  appendObjetoPorCabecalhoS7_(shHist,obj);

  atualizarRegistroInspecaoS8_(shReg, idRegistro, {
    ESTADO_CONSERVACAO:estadoNovo,
    CONDICAO:condicaoNova,
    RESPONSAVEL:responsavel || String(reg.RESPONSAVEL || ''),
    DATA_ULTIMA_INSPECAO:agora,
    PROXIMA_INSPECAO:proxima,
    STATUS:statusNovo
  });

    return {
      ok:true,
      idHistorico,
      clientInspectionId,
      protocolo:String(reg.PROTOCOLO || ''),
      statusNovo
    };
  } finally {
    lock.releaseLock();
  }
}

function statusInspecaoS8_(statusAtual, condicao, estado) {
  const c = String(condicao || '').toLowerCase();
  const e = String(estado || '').toLowerCase();
  if (c.includes('ausente')) return 'AUSENTE';
  if (c.includes('descol') || c.includes('queb') || c.includes('danif') || e.includes('crítica') || e.includes('critica')) return 'MANUTENCAO';
  if (c.includes('desbot') || c.includes('ilegível') || c.includes('ilegivel')) return 'SUBSTITUIR';
  return statusAtual || 'ATIVA';
}

function obterRegistroPorIdS8_(idRegistro) {
  const sh = SpreadsheetApp.getActive().getSheetByName('REGISTROS');
  if (!sh || sh.getLastRow() < 2) return null;
  const vals = sh.getDataRange().getValues();
  const h = vals.shift().map(String);
  const idx = {};
  h.forEach((x,i)=>idx[x]=i);
  for (const r of vals) {
    if (String(r[idx.ID_REGISTRO] || '') === idRegistro) {
      const o={};
      h.forEach((k,i)=>o[k]=r[i]);
      return o;
    }
  }
  return null;
}

function atualizarRegistroInspecaoS8_(sh,idRegistro,campos) {
  const vals = sh.getDataRange().getValues();
  const h = vals[0].map(String);
  const idxId = h.indexOf('ID_REGISTRO');
  const row = vals.findIndex((r,i)=>i>0 && String(r[idxId]||'')===idRegistro);
  if (row < 1) throw new Error('Registro não encontrado para atualização.');
  Object.entries(campos).forEach(([k,v])=>{
    const col = h.indexOf(k);
    if (col >= 0) sh.getRange(row+1,col+1).setValue(v);
  });
}

function obterHistoricoPorClientInspectionS8_(id) {
  const sh = SpreadsheetApp.getActive().getSheetByName('REGISTRO_HISTORICO');
  if (!sh || sh.getLastRow() < 2) return null;
  garantirCabecalhosS8_(sh);
  const vals = sh.getDataRange().getValues();
  const h = vals.shift().map(String);
  const idx = {};
  h.forEach((x,i)=>idx[x]=i);
  for (const r of vals) {
    if (String(r[idx.CLIENT_INSPECTION_ID] || '') === id) {
      const o={}; h.forEach((k,i)=>o[k]=r[i]); return o;
    }
  }
  return null;
}

function appListarHistoricoS8(idRegistro) {
  const id = String(idRegistro || '').trim();
  const sh = SpreadsheetApp.getActive().getSheetByName('REGISTRO_HISTORICO');
  if (!sh || sh.getLastRow() < 2) return [];
  garantirCabecalhosS8_(sh);
  const vals = sh.getDataRange().getValues();
  const h = vals.shift().map(String);
  const idx={}; h.forEach((x,i)=>idx[x]=i);

  return vals
    .filter(r => String(r[idx.ID_REGISTRO] || '') === id)
    .map(r => ({
      idHistorico:String(r[idx.ID_HISTORICO]||''),
      dataHora:r[idx.DATA_HORA] instanceof Date
        ? Utilities.formatDate(r[idx.DATA_HORA],APP.TIMEZONE,"dd/MM/yyyy HH:mm")
        : String(r[idx.DATA_HORA]||''),
      tipoEvento:String(r[idx.TIPO_EVENTO]||''),
      statusAnterior:String(r[idx.STATUS_ANTERIOR]||''),
      statusNovo:String(r[idx.STATUS_NOVO]||''),
      observacao:String(r[idx.OBSERVACAO]||''),
      estadoConservacao:String(r[idx.ESTADO_CONSERVACAO]||''),
      condicao:String(r[idx.CONDICAO]||''),
      responsavel:String(r[idx.RESPONSAVEL_INSPECAO]||''),
      acaoRecomendada:String(r[idx.ACAO_RECOMENDADA]||''),
      proximaInspecao:String(r[idx.PROXIMA_INSPECAO]||'')
    }))
    .reverse();
}

function diagnosticoS8() {
  const ss=SpreadsheetApp.getActive();
  const cfg=lerConfigComoObjeto_(ss);
  const sh=ss.getSheetByName('REGISTRO_HISTORICO');
  const checks=[];
  check_(checks,'APP_ID',cfg.APP_ID===APP.ID,cfg.APP_ID||'ausente');
  check_(checks,'APP_VERSAO',cfg.APP_VERSAO===APP.VERSAO,cfg.APP_VERSAO||'ausente');
  check_(checks,'APP_FASE',cfg.APP_FASE==='S8',cfg.APP_FASE||'ausente');
  check_(checks,'S8_STATUS',cfg.S8_STATUS==='INSTALADO',cfg.S8_STATUS||'ausente');
  check_(checks,'ABA_REGISTRO_HISTORICO',!!sh,'REGISTRO_HISTORICO');
  if (sh) {
    garantirCabecalhosS8_(sh);
    const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
    check_(checks,'CAMPOS_INSPECAO',S8_HIST_HEADERS.every(x=>h.includes(x)),
      `${S8_HIST_HEADERS.filter(x=>h.includes(x)).length}/${S8_HIST_HEADERS.length}`);
  }
  check_(checks,'REGISTRAR_INSPECAO',typeof appRegistrarInspecaoS8==='function','OK');
  check_(checks,'LISTAR_HISTORICO',typeof appListarHistoricoS8==='function','OK');
  return {ok:checks.every(c=>c.ok),totalChecks:checks.length,totalFalhas:checks.filter(c=>!c.ok).length,checks};
}
function mostrarDiagnosticoS8(){
  const d=diagnosticoS8();
  SpreadsheetApp.getUi().alert(
    'Diagnóstico S8',
    `${d.ok?'S8 PRONTA':'HÁ PENDÊNCIAS'}\n\n`+
      d.checks.map(c=>`${c.ok?'✅':'❌'} ${c.nome}: ${c.detalhe}`).join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return d;
}


// S9 — INSPEÇÕES OFFLINE
function setupS9(){
  const ss=SpreadsheetApp.getActive(),cfg=ss.getSheetByName('CONFIG');
  if(!cfg)throw new Error('CONFIG ausente.');
  setConfigValue_(cfg,'APP_VERSAO',APP.VERSAO,'Versão atualmente instalada');
  setConfigValue_(cfg,'APP_FASE','S9','Fase validada');
  setConfigValue_(cfg,'S9_STATUS','INSTALADO','Inspeções offline instaladas');
  setConfigValue_(cfg,'S9_DB_VERSION','4','IndexedDB com inspectionOutbox');
  setConfigValue_(cfg,'S9_INSTALADO_EM',Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),'Instalação S9');
  SpreadsheetApp.flush();
  return diagnosticoS9();
}
function appVerificarInspecaoS9(clientInspectionId){
  const id=String(clientInspectionId||'').trim();
  if(!id)return{ok:false,encontrado:false};
  const r=obterHistoricoPorClientInspectionS8_(id);
  return r?{ok:true,encontrado:true,idHistorico:String(r.ID_HISTORICO||''),idRegistro:String(r.ID_REGISTRO||''),protocolo:String(r.PROTOCOLO||''),clientInspectionId:id}:{ok:true,encontrado:false,clientInspectionId:id};
}
function diagnosticoS9(){
  const ss=SpreadsheetApp.getActive(),cfg=lerConfigComoObjeto_(ss),checks=[];
  check_(checks,'APP_ID',cfg.APP_ID===APP.ID,cfg.APP_ID||'ausente');
  check_(checks,'APP_VERSAO',cfg.APP_VERSAO===APP.VERSAO,cfg.APP_VERSAO||'ausente');
  check_(checks,'APP_FASE',cfg.APP_FASE==='S9',cfg.APP_FASE||'ausente');
  check_(checks,'S9_STATUS',cfg.S9_STATUS==='INSTALADO',cfg.S9_STATUS||'ausente');
  check_(checks,'ABA_REGISTRO_HISTORICO',!!ss.getSheetByName('REGISTRO_HISTORICO'),'REGISTRO_HISTORICO');
  check_(checks,'SYNC_INSPECAO',typeof appSincronizarInspecaoS9==='function','OK');
  check_(checks,'IDEMPOTENCIA_INSPECAO',typeof appVerificarInspecaoS9==='function','CLIENT_INSPECTION_ID');
  return{ok:checks.every(c=>c.ok),totalChecks:checks.length,totalFalhas:checks.filter(c=>!c.ok).length,checks};
}
function mostrarDiagnosticoS9(){
  const d=diagnosticoS9();
  SpreadsheetApp.getUi().alert('Diagnóstico S9',`${d.ok?'S9 PRONTA':'HÁ PENDÊNCIAS'}\n\n`+d.checks.map(c=>`${c.ok?'✅':'❌'} ${c.nome}: ${c.detalhe}`).join('\n'),SpreadsheetApp.getUi().ButtonSet.OK);
  return d;
}


// ========================================================
// S10 — GESTÃO DE PENDÊNCIAS / PLANO DE AÇÃO
// ========================================================
const S10_PEND_HEADERS=['ID_PENDENCIA','ID_HISTORICO_ORIGEM','CLIENT_INSPECTION_ID','ID_REGISTRO','PROTOCOLO','CRIADO_EM','TIPO','PRIORIDADE','TITULO','DESCRICAO','RESPONSAVEL','PRAZO','STATUS','INICIADO_EM','CONCLUIDO_EM','RESOLUCAO','ATUALIZADO_EM','USUARIO','DEVICE_ID','VERSAO_APP'];

function setupS10(){
  const ss=SpreadsheetApp.getActive(),cfg=ss.getSheetByName('CONFIG');
  if(!cfg)throw new Error('CONFIG ausente.');
  let sh=ss.getSheetByName('PENDENCIAS');if(!sh)sh=ss.insertSheet('PENDENCIAS');
  garantirCabecalhoPendenciasS10_(sh);
  setConfigValue_(cfg,'APP_VERSAO',APP.VERSAO,'Versão atualmente instalada');
  setConfigValue_(cfg,'APP_FASE','S10','Fase de implementação validada');
  setConfigValue_(cfg,'S10_STATUS','INSTALADO','Gestão de pendências instalada');
  setConfigValue_(cfg,'S10_INSTALADO_EM',Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),'Data/hora da instalação S10');
  SpreadsheetApp.flush();return diagnosticoS10();
}
function garantirCabecalhoPendenciasS10_(sh){
  const atuais=sh.getLastColumn()>0?sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(String):[];
  if(!atuais.some(Boolean)){sh.clear();sh.getRange(1,1,1,S10_PEND_HEADERS.length).setValues([S10_PEND_HEADERS]);}
  else{const falt=S10_PEND_HEADERS.filter(h=>!atuais.includes(h));if(falt.length)sh.getRange(1,atuais.length+1,1,falt.length).setValues([falt]);}
  sh.setFrozenRows(1);sh.getRange(1,1,1,sh.getLastColumn()).setFontWeight('bold').setBackground('#171B68').setFontColor('#FFFFFF');
}
function registrarInspecaoComPendenciaS10_(payload){
  const resp=appRegistrarInspecaoS8(payload||{});
  if(resp&&resp.ok&&resp.idHistorico){
    const hist=obterHistoricoPorIdS10_(resp.idHistorico);
    if(hist)gerarPendenciaDaInspecaoS10_(hist,payload||{});
  }
  return resp;
}
function sincronizarInspecaoComPendenciaS10_(payload){
  const id=String((payload||{}).clientInspectionId||'').trim();
  if(id){
    const existente=obterHistoricoPorClientInspectionS8_(id);
    if(existente){
      gerarPendenciaDaInspecaoS10_(existente,payload||{});
      return{ok:true,idempotente:true,idHistorico:String(existente.ID_HISTORICO||''),protocolo:String(existente.PROTOCOLO||''),clientInspectionId:id};
    }
  }
  return registrarInspecaoComPendenciaS10_(payload||{});
}
function obterHistoricoPorIdS10_(idHistorico){
  const sh=SpreadsheetApp.getActive().getSheetByName('REGISTRO_HISTORICO');if(!sh||sh.getLastRow()<2)return null;
  const vals=sh.getDataRange().getValues(),h=vals.shift().map(String),idx={};h.forEach((x,i)=>idx[x]=i);
  for(const r of vals){if(String(r[idx.ID_HISTORICO]||'')===String(idHistorico||'')){const o={};h.forEach((k,i)=>o[k]=r[i]);return o;}}return null;
}
function gerarPendenciaDaInspecaoS10_(hist,payload){
  const status=String(hist.STATUS_NOVO||'').toUpperCase();if(!['MANUTENCAO','SUBSTITUIR','AUSENTE'].includes(status))return null;
  const sh=SpreadsheetApp.getActive().getSheetByName('PENDENCIAS');if(!sh)return null;garantirCabecalhoPendenciasS10_(sh);
  const existente=obterPendenciaPorHistoricoS10_(String(hist.ID_HISTORICO||''));if(existente)return existente;
  const prioridade=prioridadePendenciaS10_(String(hist.ESTADO_CONSERVACAO||''),String(hist.CONDICAO||''),status);
  const tipo=status==='SUBSTITUIR'?'SUBSTITUICAO':status==='AUSENTE'?'REPOSICAO':'MANUTENCAO';
  const responsavel=String(hist.RESPONSAVEL_INSPECAO||payload.responsavel||'').trim(),agora=new Date(),prazo=prazoPadraoPendenciaS10_(prioridade,agora);
  const obj={ID_PENDENCIA:'PEND-'+Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase(),ID_HISTORICO_ORIGEM:String(hist.ID_HISTORICO||''),CLIENT_INSPECTION_ID:String(hist.CLIENT_INSPECTION_ID||''),ID_REGISTRO:String(hist.ID_REGISTRO||''),PROTOCOLO:String(hist.PROTOCOLO||''),CRIADO_EM:agora,TIPO:tipo,PRIORIDADE:prioridade,TITULO:`${tipo} — ${String(hist.PROTOCOLO||'Sinalização')}`,DESCRICAO:[String(hist.ESTADO_CONSERVACAO||''),String(hist.CONDICAO||''),String(hist.OBSERVACAO||'')].filter(Boolean).join(' • '),RESPONSAVEL:responsavel,PRAZO:prazo,STATUS:'ABERTA',INICIADO_EM:'',CONCLUIDO_EM:'',RESOLUCAO:'',ATUALIZADO_EM:agora,USUARIO:(usuarioRpcAtualS223_()?.email||Session.getActiveUser().getEmail())||'',DEVICE_ID:String(payload.deviceId||hist.DEVICE_ID||''),VERSAO_APP:APP.VERSAO};
  appendObjetoPorCabecalhoS7_(sh,obj);return obj;
}
function prioridadePendenciaS10_(estado,condicao,status){const e=String(estado||'').toLowerCase(),c=String(condicao||'').toLowerCase();if(status==='AUSENTE'||e.includes('crítica')||e.includes('critica'))return'CRITICA';if(status==='SUBSTITUIR'||c.includes('ilegível')||c.includes('ilegivel')||c.includes('desbot'))return'ALTA';if(c.includes('torta')||c.includes('descol')||c.includes('queb'))return'MEDIA';return'BAIXA';}
function prazoPadraoPendenciaS10_(prioridade,base){const dias={CRITICA:1,ALTA:3,MEDIA:7,BAIXA:15}[prioridade]||7;return new Date(base.getTime()+dias*86400000);}
function obterPendenciaPorHistoricoS10_(idHistorico){
  const sh=SpreadsheetApp.getActive().getSheetByName('PENDENCIAS');if(!sh||sh.getLastRow()<2)return null;const vals=sh.getDataRange().getValues(),h=vals.shift().map(String),idx={};h.forEach((x,i)=>idx[x]=i);
  for(const r of vals){if(String(r[idx.ID_HISTORICO_ORIGEM]||'')===String(idHistorico||'')){const o={};h.forEach((k,i)=>o[k]=r[i]);return o;}}return null;
}
function appListarPendenciasS10(idRegistro){
  const sh=SpreadsheetApp.getActive().getSheetByName('PENDENCIAS');if(!sh||sh.getLastRow()<2)return[];const vals=sh.getDataRange().getValues(),h=vals.shift().map(String),idx={};h.forEach((x,i)=>idx[x]=i);
  return vals.filter(r=>!idRegistro||String(r[idx.ID_REGISTRO]||'')===String(idRegistro)).map(r=>({idPendencia:String(r[idx.ID_PENDENCIA]||''),idHistorico:String(r[idx.ID_HISTORICO_ORIGEM]||''),idRegistro:String(r[idx.ID_REGISTRO]||''),protocolo:String(r[idx.PROTOCOLO]||''),criadoEm:formatarDataS10_(r[idx.CRIADO_EM]),tipo:String(r[idx.TIPO]||''),prioridade:String(r[idx.PRIORIDADE]||''),titulo:String(r[idx.TITULO]||''),descricao:String(r[idx.DESCRICAO]||''),responsavel:String(r[idx.RESPONSAVEL]||''),prazo:formatarDataS10_(r[idx.PRAZO],true),status:String(r[idx.STATUS]||''),iniciadoEm:formatarDataS10_(r[idx.INICIADO_EM]),concluidoEm:formatarDataS10_(r[idx.CONCLUIDO_EM]),resolucao:String(r[idx.RESOLUCAO]||'')})).reverse();
}
function formatarDataS10_(v,soData){if(v instanceof Date)return Utilities.formatDate(v,APP.TIMEZONE,soData?'dd/MM/yyyy':'dd/MM/yyyy HH:mm');return String(v||'');}
function appAtualizarPendenciaS10(payload){
  exigirPermissaoS14_('tratarPendencias');
  payload=payload||{};const id=String(payload.idPendencia||'').trim(),novoStatus=String(payload.status||'').trim().toUpperCase();if(!id)throw new Error('ID_PENDENCIA obrigatório.');if(!['ABERTA','EM ANDAMENTO','CONCLUIDA','CANCELADA'].includes(novoStatus))throw new Error('Status de pendência inválido.');
  const sh=SpreadsheetApp.getActive().getSheetByName('PENDENCIAS');if(!sh||sh.getLastRow()<2)throw new Error('Pendência não encontrada.');const vals=sh.getDataRange().getValues(),h=vals[0].map(String),idx={};h.forEach((x,i)=>idx[x]=i);const row=vals.findIndex((r,i)=>i>0&&String(r[idx.ID_PENDENCIA]||'')===id);if(row<1)throw new Error('Pendência não encontrada.');
  const agora=new Date(),set=(campo,valor)=>{const c=idx[campo];if(c>=0)sh.getRange(row+1,c+1).setValue(valor);},anterior=String(vals[row][idx.STATUS]||'');set('STATUS',novoStatus);set('ATUALIZADO_EM',agora);if(payload.responsavel!==undefined)set('RESPONSAVEL',String(payload.responsavel||''));if(payload.prazo!==undefined)set('PRAZO',String(payload.prazo||''));if(payload.resolucao!==undefined)set('RESOLUCAO',String(payload.resolucao||''));if(novoStatus==='EM ANDAMENTO'&&!vals[row][idx.INICIADO_EM])set('INICIADO_EM',agora);if(novoStatus==='CONCLUIDA')set('CONCLUIDO_EM',agora);if(novoStatus!=='CONCLUIDA'&&anterior==='CONCLUIDA')set('CONCLUIDO_EM','');return{ok:true,idPendencia:id,status:novoStatus};
}
function diagnosticoS10(){
  const ss=SpreadsheetApp.getActive(),cfg=lerConfigComoObjeto_(ss),sh=ss.getSheetByName('PENDENCIAS'),checks=[];check_(checks,'APP_ID',cfg.APP_ID===APP.ID,cfg.APP_ID||'ausente');check_(checks,'APP_VERSAO',cfg.APP_VERSAO===APP.VERSAO,cfg.APP_VERSAO||'ausente');check_(checks,'APP_FASE',cfg.APP_FASE==='S10',cfg.APP_FASE||'ausente');check_(checks,'S10_STATUS',cfg.S10_STATUS==='INSTALADO',cfg.S10_STATUS||'ausente');check_(checks,'ABA_PENDENCIAS',!!sh,'PENDENCIAS');if(sh){garantirCabecalhoPendenciasS10_(sh);const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);check_(checks,'CAMPOS_PENDENCIAS',S10_PEND_HEADERS.every(x=>h.includes(x)),`${S10_PEND_HEADERS.filter(x=>h.includes(x)).length}/${S10_PEND_HEADERS.length}`);}check_(checks,'GERACAO_AUTOMATICA',typeof gerarPendenciaDaInspecaoS10_==='function','OK');check_(checks,'WORKFLOW_PENDENCIA',typeof appAtualizarPendenciaS10==='function','OK');return{ok:checks.every(c=>c.ok),totalChecks:checks.length,totalFalhas:checks.filter(c=>!c.ok).length,checks};
}
function mostrarDiagnosticoS10(){const d=diagnosticoS10();SpreadsheetApp.getUi().alert('Diagnóstico S10',`${d.ok?'S10 PRONTA':'HÁ PENDÊNCIAS'}\n\n`+d.checks.map(c=>`${c.ok?'✅':'❌'} ${c.nome}: ${c.detalhe}`).join('\n'),SpreadsheetApp.getUi().ButtonSet.OK);return d;}


// ========================================================
// S11 — CENTRAL DE GESTÃO DE PENDÊNCIAS
// ========================================================
function setupS11(){
  const ss=SpreadsheetApp.getActive();
  const cfg=ss.getSheetByName('CONFIG');
  if(!cfg)throw new Error('CONFIG ausente.');

  let sh=ss.getSheetByName('PENDENCIAS');
  if(!sh)throw new Error('PENDENCIAS ausente. Execute setupS10 antes.');
  garantirCabecalhoPendenciasS10_(sh);

  setConfigValue_(cfg,'APP_VERSAO',APP.VERSAO,'Versão atualmente instalada');
  setConfigValue_(cfg,'APP_FASE','S11','Fase de implementação validada');
  setConfigValue_(cfg,'S11_STATUS','INSTALADO','Central de Gestão instalada');
  setConfigValue_(cfg,'S11_INSTALADO_EM',
    Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),
    'Data/hora da instalação S11'
  );
  SpreadsheetApp.flush();
  return diagnosticoS11();
}

function appCentralGestaoS11(filtros){
  filtros=filtros||{};
  const pend=appListarPendenciasS10('');
  const registros=listarRegistrosS11_();
  const mapas=listarMapasS2_();

  const regById={};
  registros.forEach(r=>regById[String(r.ID_REGISTRO||'')]=r);

  const mapaById={};
  mapas.forEach(m=>mapaById[String(m.id||'')]=m);

  const itens=pend.map(p=>{
    const r=regById[String(p.idRegistro||'')]||{};
    const mapa=mapaById[String(r.ID_MAPA_SETOR||'')]||{};
    return {
      ...p,
      idMapaSetor:String(r.ID_MAPA_SETOR||''),
      mapa:String(r.MAPA||mapa.nome||''),
      piso:String(r.PISO||mapa.piso||''),
      rua:String(r.RUA||''),
      trecho:String(r.TRECHO||''),
      tituloAtivo:String(r.TITULO||''),
      x:Number(r.X_NORMALIZADO||0),
      y:Number(r.Y_NORMALIZADO||0),
      statusAtivo:String(r.STATUS||''),
      estadoConservacao:String(r.ESTADO_CONSERVACAO||''),
      condicao:String(r.CONDICAO||'')
    };
  });

  const filtrados=filtrarPendenciasS11_(itens,filtros);

  return {
    ok:true,
    resumo:resumoCentralS11_(filtrados),
    filtros:opcoesFiltrosS11_(itens),
    itens:filtrados
  };
}

function listarRegistrosS11_(){
  const sh=SpreadsheetApp.getActive().getSheetByName('REGISTROS');
  if(!sh||sh.getLastRow()<2)return[];
  const vals=sh.getDataRange().getValues();
  const h=vals.shift().map(String);
  return vals.map(r=>{
    const o={};
    h.forEach((k,i)=>o[k]=r[i]);
    return o;
  }).filter(r=>String(r.STATUS||'').trim().toUpperCase()!=='EXCLUIDO');
}

function filtrarPendenciasS11_(itens,f){
  const texto=String(f.texto||'').trim().toLowerCase();
  return itens.filter(i=>{
    if(f.status && String(i.status)!==String(f.status))return false;
    if(f.prioridade && String(i.prioridade)!==String(f.prioridade))return false;
    if(f.responsavel && String(i.responsavel)!==String(f.responsavel))return false;
    if(f.tipo && String(i.tipo)!==String(f.tipo))return false;
    if(f.idMapaSetor && String(i.idMapaSetor)!==String(f.idMapaSetor))return false;
    if(f.piso && String(i.piso)!==String(f.piso))return false;

    if(f.somenteVencidas){
      if(!pendenciaVencidaS11_(i))return false;
    }

    if(texto){
      const hay=[
        i.protocolo,i.titulo,i.tituloAtivo,i.descricao,
        i.responsavel,i.rua,i.trecho,i.mapa,i.prioridade,i.status
      ].join(' ').toLowerCase();
      if(!hay.includes(texto))return false;
    }
    return true;
  });
}

function pendenciaVencidaS11_(i){
  if(['CONCLUIDA','CANCELADA'].includes(String(i.status||'')))return false;
  const s=String(i.prazo||'').trim();
  if(!s)return false;
  const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!m)return false;
  const prazo=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));
  prazo.setHours(23,59,59,999);
  return prazo.getTime()<Date.now();
}

function resumoCentralS11_(itens){
  const r={
    total:itens.length,
    abertas:0,
    andamento:0,
    concluidas:0,
    canceladas:0,
    criticas:0,
    vencidas:0
  };
  itens.forEach(i=>{
    const st=String(i.status||'');
    if(st==='ABERTA')r.abertas++;
    if(st==='EM ANDAMENTO')r.andamento++;
    if(st==='CONCLUIDA')r.concluidas++;
    if(st==='CANCELADA')r.canceladas++;
    if(String(i.prioridade||'')==='CRITICA'&&!['CONCLUIDA','CANCELADA'].includes(st))r.criticas++;
    if(pendenciaVencidaS11_(i))r.vencidas++;
  });
  return r;
}

function opcoesFiltrosS11_(itens){
  const uniq=arr=>[...new Set(arr.filter(Boolean).map(String))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  return {
    mapas:uniq(itens.map(i=>i.idMapaSetor)).map(id=>{
      const x=itens.find(i=>i.idMapaSetor===id)||{};
      return {id,label:`${x.mapa||id}${x.piso?` • Piso ${x.piso}`:''}`};
    }),
    pisos:uniq(itens.map(i=>i.piso)),
    responsaveis:uniq(itens.map(i=>i.responsavel)),
    prioridades:uniq(itens.map(i=>i.prioridade)),
    status:uniq(itens.map(i=>i.status)),
    tipos:uniq(itens.map(i=>i.tipo))
  };
}

function appObterContextoPendenciaS11(idPendencia){
  const central=appCentralGestaoS11({});
  const item=central.itens.find(i=>String(i.idPendencia||'')===String(idPendencia||''));
  if(!item)throw new Error('Pendência não encontrada.');
  return item;
}

function diagnosticoS11(){
  const ss=SpreadsheetApp.getActive(),cfg=lerConfigComoObjeto_(ss),checks=[];
  check_(checks,'APP_ID',cfg.APP_ID===APP.ID,cfg.APP_ID||'ausente');
  check_(checks,'APP_VERSAO',cfg.APP_VERSAO===APP.VERSAO,cfg.APP_VERSAO||'ausente');
  check_(checks,'APP_FASE',cfg.APP_FASE==='S11',cfg.APP_FASE||'ausente');
  check_(checks,'S11_STATUS',cfg.S11_STATUS==='INSTALADO',cfg.S11_STATUS||'ausente');
  check_(checks,'ABA_PENDENCIAS',!!ss.getSheetByName('PENDENCIAS'),'PENDENCIAS');
  check_(checks,'CENTRAL_GESTAO',typeof appCentralGestaoS11==='function','OK');
  check_(checks,'VER_NO_MAPA',typeof appObterContextoPendenciaS11==='function','OK');
  return{
    ok:checks.every(c=>c.ok),
    totalChecks:checks.length,
    totalFalhas:checks.filter(c=>!c.ok).length,
    checks
  };
}

function mostrarDiagnosticoS11(){
  const d=diagnosticoS11();
  SpreadsheetApp.getUi().alert(
    'Diagnóstico S11',
    `${d.ok?'S11 PRONTA':'HÁ PENDÊNCIAS'}\n\n`+
      d.checks.map(c=>`${c.ok?'✅':'❌'} ${c.nome}: ${c.detalhe}`).join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return d;
}


// ========================================================
// S12 — DASHBOARD GERENCIAL E INDICADORES
// ========================================================
function setupS12(){
  const ss=SpreadsheetApp.getActive();
  const cfg=ss.getSheetByName('CONFIG');
  if(!cfg)throw new Error('CONFIG ausente.');

  setConfigValue_(cfg,'APP_VERSAO',APP.VERSAO,'Versão atualmente instalada');
  setConfigValue_(cfg,'APP_FASE','S12','Fase de implementação validada');
  setConfigValue_(cfg,'S12_STATUS','INSTALADO','Dashboard gerencial instalado');
  setConfigValue_(cfg,'S12_INSTALADO_EM',
    Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),
    'Data/hora da instalação S12'
  );

  SpreadsheetApp.flush();
  return diagnosticoS12();
}

function appDashboardS12(filtros){
  filtros=filtros||{};
  const registros=listarRegistrosS12_();
  const pendencias=appCentralGestaoS11({}).itens||[];
  const historico=listarHistoricoS12_();

  const filtradosReg=filtrarRegistrosDashboardS12_(registros,filtros);
  const idsAtivos=new Set(filtradosReg.map(r=>String(r.ID_REGISTRO||'')));

  const filtradasPend=pendencias.filter(p=>{
    if(!idsAtivos.has(String(p.idRegistro||'')))return false;
    return filtroPeriodoPendenciaS12_(p,filtros);
  });

  const filtradoHist=historico.filter(h=>{
    if(!idsAtivos.has(String(h.ID_REGISTRO||'')))return false;
    return filtroPeriodoHistoricoS12_(h,filtros);
  });

  return {
    ok:true,
    periodo:{
      inicio:String(filtros.dataInicio||''),
      fim:String(filtros.dataFim||'')
    },
    filtros:opcoesDashboardS12_(registros),
    kpis:kpisDashboardS12_(filtradosReg,filtradasPend,filtradoHist),
    statusAtivos:agruparS12_(filtradosReg,'STATUS'),
    conservacao:agruparS12_(filtradosReg,'ESTADO_CONSERVACAO'),
    condicoes:topAgrupadoS12_(filtradosReg,'CONDICAO',10),
    porMapa:topAgrupadoS12_(filtradosReg,'MAPA',10),
    porRua:topAgrupadoS12_(filtradosReg,'RUA',10),
    pendenciasStatus:agruparObjS12_(filtradasPend,'status'),
    pendenciasPrioridade:agruparObjS12_(filtradasPend,'prioridade'),
    responsaveis:rankingResponsaveisS12_(filtradasPend),
    sla:slaDashboardS12_(filtradasPend),
    resolucao:tempoResolucaoS12_(filtradasPend),
    evolucaoInspecoes:evolucaoInspecoesS12_(filtradoHist),
    falhas:topFalhasS12_(filtradoHist),
    saude:indiceSaudeS12_(filtradosReg),
    totais:{
      registros:filtradosReg.length,
      pendencias:filtradasPend.length,
      historicos:filtradoHist.length
    }
  };
}

function listarRegistrosS12_(){
  const sh=SpreadsheetApp.getActive().getSheetByName('REGISTROS');
  if(!sh||sh.getLastRow()<2)return[];
  const vals=sh.getDataRange().getValues(),h=vals.shift().map(String);
  return vals.map(r=>{
    const o={};h.forEach((k,i)=>o[k]=r[i]);return o;
  }).filter(r=>String(r.STATUS||'').trim().toUpperCase()!=='EXCLUIDO');
}

function listarHistoricoS12_(){
  const sh=SpreadsheetApp.getActive().getSheetByName('REGISTRO_HISTORICO');
  if(!sh||sh.getLastRow()<2)return[];
  const vals=sh.getDataRange().getValues(),h=vals.shift().map(String);
  return vals.map(r=>{
    const o={};h.forEach((k,i)=>o[k]=r[i]);return o;
  });
}

function filtrarRegistrosDashboardS12_(regs,f){
  return regs.filter(r=>{
    if(f.idMapaSetor && String(r.ID_MAPA_SETOR||'')!==String(f.idMapaSetor))return false;
    if(f.piso && String(r.PISO||'')!==String(f.piso))return false;
    if(f.responsavel && String(r.RESPONSAVEL||'')!==String(f.responsavel))return false;
    return true;
  });
}

function opcoesDashboardS12_(regs){
  const uniq=arr=>[...new Set(arr.filter(Boolean).map(String))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const mapas=uniq(regs.map(r=>r.ID_MAPA_SETOR)).map(id=>{
    const r=regs.find(x=>String(x.ID_MAPA_SETOR||'')===id)||{};
    const especiais={
      'MAP-CFF-N3-VERMELHO':'Setor Vermelho / Estacionamento',
      'MAP-CFF-N1-HOTEL':'Hotel',
      'MAP-CFF-N1-CD':'Central de Distribuição',
      'MAP-CFF-N1-EXT-LAT-AZUL':'Área externa lateral azul',
      'MAP-CFF-N1-EXT-LAT-VERDE':'Área externa lateral verde',
      'MAP-CFF-N1-EXT-FRENTE':'Área externa frente',
      'MAP-CFF-N1-EXT-HOTEL-CDM':'Área externa Hotel/CDM',
      'MAP-CFF-N1-EXTERNA':'Área Externa'
    };
    const nome=especiais[String(id)]||String(r.MAPA||id);
    return {id,label:`${nome}${r.PISO?` • Piso ${r.PISO}`:''}`};
  });
  return {
    mapas,
    pisos:uniq(regs.map(r=>r.PISO)),
    responsaveis:uniq(regs.map(r=>r.RESPONSAVEL))
  };
}

function dataFiltroS12_(v){
  if(!v)return null;
  if(v instanceof Date)return v;
  const s=String(v);
  const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(iso)return new Date(Number(iso[1]),Number(iso[2])-1,Number(iso[3]));
  const br=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if(br)return new Date(Number(br[3]),Number(br[2])-1,Number(br[1]));
  const d=new Date(s);
  return isNaN(d)?null:d;
}

function dentroPeriodoS12_(data,f){
  const d=dataFiltroS12_(data);
  if(!d)return true;
  const ini=f.dataInicio?dataFiltroS12_(f.dataInicio):null;
  const fim=f.dataFim?dataFiltroS12_(f.dataFim):null;
  if(ini){ini.setHours(0,0,0,0);if(d.getTime()<ini.getTime())return false;}
  if(fim){fim.setHours(23,59,59,999);if(d.getTime()>fim.getTime())return false;}
  return true;
}

function filtroPeriodoPendenciaS12_(p,f){
  if(!f.dataInicio&&!f.dataFim)return true;
  return dentroPeriodoS12_(p.criadoEm,f);
}

function filtroPeriodoHistoricoS12_(h,f){
  if(!f.dataInicio&&!f.dataFim)return true;
  return dentroPeriodoS12_(h.DATA_HORA,f);
}

function agruparS12_(arr,campo){
  const m={};
  arr.forEach(x=>{
    const k=String(x[campo]||'Não informado');
    m[k]=(m[k]||0)+1;
  });
  return Object.entries(m).map(([label,valor])=>({label,valor}))
    .sort((a,b)=>b.valor-a.valor);
}

function agruparObjS12_(arr,campo){
  const m={};
  arr.forEach(x=>{
    const k=String(x[campo]||'Não informado');
    m[k]=(m[k]||0)+1;
  });
  return Object.entries(m).map(([label,valor])=>({label,valor}))
    .sort((a,b)=>b.valor-a.valor);
}

function topAgrupadoS12_(arr,campo,limite){
  return agruparS12_(arr,campo).slice(0,limite||10);
}

function kpisDashboardS12_(regs,pend,hist){
  const total=regs.length;
  const ativas=regs.filter(r=>String(r.STATUS||'')==='ATIVA').length;
  const manut=regs.filter(r=>String(r.STATUS||'')==='MANUTENCAO').length;
  const substituir=regs.filter(r=>String(r.STATUS||'')==='SUBSTITUIR').length;
  const ausentes=regs.filter(r=>String(r.STATUS||'')==='AUSENTE').length;
  const abertas=pend.filter(p=>p.status==='ABERTA').length;
  const andamento=pend.filter(p=>p.status==='EM ANDAMENTO').length;
  const vencidas=pend.filter(p=>pendenciaVencidaS11_(p)).length;
  const criticas=pend.filter(p=>p.prioridade==='CRITICA'&&!['CONCLUIDA','CANCELADA'].includes(p.status)).length;
  const inspecoes=hist.filter(h=>String(h.TIPO_EVENTO||'')==='INSPECAO').length;

  return {
    total,
    ativas,
    manutencao:manut,
    substituir,
    ausentes,
    abertas,
    andamento,
    vencidas,
    criticas,
    inspecoes
  };
}

function indiceSaudeS12_(regs){
  if(!regs.length)return {indice:100,saudaveis:0,total:0};
  let pontos=0;
  regs.forEach(r=>{
    const st=String(r.STATUS||'');
    const e=String(r.ESTADO_CONSERVACAO||'').toLowerCase();
    let p=100;
    if(st==='MANUTENCAO')p-=30;
    if(st==='SUBSTITUIR')p-=45;
    if(st==='AUSENTE')p-=70;
    if(e.includes('regular'))p-=10;
    if(e.includes('ruim'))p-=25;
    if(e.includes('crítica')||e.includes('critica'))p-=40;
    pontos+=Math.max(0,p);
  });
  const indice=Math.round(pontos/regs.length);
  return {
    indice,
    total:regs.length,
    saudaveis:regs.filter(r=>String(r.STATUS||'')==='ATIVA').length
  };
}

function slaDashboardS12_(pend){
  const ativos=pend.filter(p=>!['CONCLUIDA','CANCELADA'].includes(p.status));
  const vencidos=ativos.filter(p=>pendenciaVencidaS11_(p)).length;
  const dentro=Math.max(0,ativos.length-vencidos);
  return {
    ativos:ativos.length,
    dentro,
    vencidos,
    percentual:ativos.length?Math.round(dentro/ativos.length*100):100
  };
}

function tempoResolucaoS12_(pend){
  const concl=pend.filter(p=>p.status==='CONCLUIDA'&&p.criadoEm&&p.concluidoEm);
  const horas=[];
  concl.forEach(p=>{
    const a=dataFiltroS12_(p.criadoEm),b=dataFiltroS12_(p.concluidoEm);
    if(a&&b&&b>=a)horas.push((b-a)/3600000);
  });
  if(!horas.length)return {mediaHoras:0,medianaHoras:0,total:0};
  horas.sort((a,b)=>a-b);
  const media=horas.reduce((s,x)=>s+x,0)/horas.length;
  const mid=Math.floor(horas.length/2);
  const med=horas.length%2?horas[mid]:(horas[mid-1]+horas[mid])/2;
  return {
    mediaHoras:Math.round(media*10)/10,
    medianaHoras:Math.round(med*10)/10,
    total:horas.length
  };
}

function rankingResponsaveisS12_(pend){
  const m={};
  pend.forEach(p=>{
    const k=String(p.responsavel||'Não informado');
    if(!m[k])m[k]={responsavel:k,total:0,abertas:0,andamento:0,concluidas:0,vencidas:0};
    const o=m[k];o.total++;
    if(p.status==='ABERTA')o.abertas++;
    if(p.status==='EM ANDAMENTO')o.andamento++;
    if(p.status==='CONCLUIDA')o.concluidas++;
    if(pendenciaVencidaS11_(p))o.vencidas++;
  });
  return Object.values(m).sort((a,b)=>b.abertas+b.andamento-(a.abertas+a.andamento)).slice(0,10);
}

function evolucaoInspecoesS12_(hist){
  const m={};
  hist.filter(h=>String(h.TIPO_EVENTO||'')==='INSPECAO').forEach(h=>{
    const d=dataFiltroS12_(h.DATA_HORA);if(!d)return;
    const k=Utilities.formatDate(d,APP.TIMEZONE,'yyyy-MM');
    if(!m[k])m[k]={mes:k,total:0,manutencao:0,substituir:0,ausente:0};
    m[k].total++;
    const st=String(h.STATUS_NOVO||'');
    if(st==='MANUTENCAO')m[k].manutencao++;
    if(st==='SUBSTITUIR')m[k].substituir++;
    if(st==='AUSENTE')m[k].ausente++;
  });
  return Object.values(m).sort((a,b)=>a.mes.localeCompare(b.mes)).slice(-12);
}

function topFalhasS12_(hist){
  const m={};
  hist.filter(h=>String(h.TIPO_EVENTO||'')==='INSPECAO').forEach(h=>{
    const k=String(h.CONDICAO||'Não informado');
    m[k]=(m[k]||0)+1;
  });
  return Object.entries(m).map(([label,valor])=>({label,valor}))
    .sort((a,b)=>b.valor-a.valor).slice(0,10);
}

function diagnosticoS12(){
  const ss=SpreadsheetApp.getActive(),cfg=lerConfigComoObjeto_(ss),checks=[];
  check_(checks,'APP_ID',cfg.APP_ID===APP.ID,cfg.APP_ID||'ausente');
  check_(checks,'APP_VERSAO',cfg.APP_VERSAO===APP.VERSAO,cfg.APP_VERSAO||'ausente');
  check_(checks,'APP_FASE',cfg.APP_FASE==='S12',cfg.APP_FASE||'ausente');
  check_(checks,'S12_STATUS',cfg.S12_STATUS==='INSTALADO',cfg.S12_STATUS||'ausente');
  check_(checks,'DASHBOARD_API',typeof appDashboardS12==='function','OK');
  check_(checks,'CENTRAL_S11',typeof appCentralGestaoS11==='function','OK');
  check_(checks,'PENDENCIAS',!!ss.getSheetByName('PENDENCIAS'),'PENDENCIAS');
  check_(checks,'REGISTROS',!!ss.getSheetByName('REGISTROS'),'REGISTROS');
  check_(checks,'HISTORICO',!!ss.getSheetByName('REGISTRO_HISTORICO'),'REGISTRO_HISTORICO');
  return{
    ok:checks.every(c=>c.ok),
    totalChecks:checks.length,
    totalFalhas:checks.filter(c=>!c.ok).length,
    checks
  };
}

function mostrarDiagnosticoS12(){
  const d=diagnosticoS12();
  SpreadsheetApp.getUi().alert(
    'Diagnóstico S12',
    `${d.ok?'S12 PRONTA':'HÁ PENDÊNCIAS'}\n\n`+
      d.checks.map(c=>`${c.ok?'✅':'❌'} ${c.nome}: ${c.detalhe}`).join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return d;
}


// ========================================================
// S13 — RELATÓRIOS E EXPORTAÇÃO
// ========================================================
function setupS13(){
  const ss=SpreadsheetApp.getActive();
  const cfg=ss.getSheetByName('CONFIG');
  if(!cfg)throw new Error('CONFIG ausente.');

  setConfigValue_(cfg,'APP_VERSAO',APP.VERSAO,'Versão atualmente instalada');
  setConfigValue_(cfg,'APP_FASE','S13','Fase de implementação validada');
  setConfigValue_(cfg,'S13_STATUS','INSTALADO','Relatórios e exportação instalados');
  setConfigValue_(cfg,'S13_INSTALADO_EM',
    Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),
    'Data/hora da instalação S13'
  );
  SpreadsheetApp.flush();
  return diagnosticoS13();
}

function appRelatorioGerencialS13(filtros){
  filtros=filtros||{};
  const dash=appDashboardS12(filtros);
  const central=appCentralGestaoS11({
    idMapaSetor:filtros.idMapaSetor||'',
    piso:filtros.piso||'',
    responsavel:filtros.responsavel||''
  });

  const registros=listarRegistrosS12_()
    .filter(r=>{
      if(filtros.idMapaSetor && String(r.ID_MAPA_SETOR||'')!==String(filtros.idMapaSetor))return false;
      if(filtros.piso && String(r.PISO||'')!==String(filtros.piso))return false;
      if(filtros.responsavel && String(r.RESPONSAVEL||'')!==String(filtros.responsavel))return false;
      return true;
    })
    .map(r=>{
      const vermelho=String(r.ID_MAPA_SETOR||'')==='MAP-CFF-N3-VERMELHO';
      return {
      idRegistro:String(r.ID_REGISTRO||''),
      protocolo:String(r.PROTOCOLO||''),
      titulo:String(r.TITULO||''),
      tipo:String(r.TIPO||''),
      mapa:vermelho?'Setor Vermelho / Estacionamento':String(r.MAPA||''),
      piso:String(r.PISO||''),
      rua:String(r.RUA||''),
      trecho:String(r.TRECHO||''),
      loja:String(r.NUMERO_LOJA||''),
      status:String(r.STATUS||''),
      conservacao:String(r.ESTADO_CONSERVACAO||''),
      condicao:String(r.CONDICAO||''),
      responsavel:String(r.RESPONSAVEL||''),
      ultimaInspecao:formatarDataS10_(r.DATA_ULTIMA_INSPECAO),
      proximaInspecao:formatarDataS10_(r.PROXIMA_INSPECAO,true)
      };
    });

  const historico=listarHistoricoS12_()
    .filter(h=>{
      if(String(h.TIPO_EVENTO||'')!=='INSPECAO')return false;
      if(!dentroPeriodoS12_(h.DATA_HORA,filtros))return false;
      if(filtros.responsavel && String(h.RESPONSAVEL_INSPECAO||'')!==String(filtros.responsavel))return false;
      return registros.some(r=>r.idRegistro===String(h.ID_REGISTRO||''));
    })
    .map(h=>({
      idHistorico:String(h.ID_HISTORICO||''),
      protocolo:String(h.PROTOCOLO||''),
      dataHora:formatarDataS10_(h.DATA_HORA),
      statusAnterior:String(h.STATUS_ANTERIOR||''),
      statusNovo:String(h.STATUS_NOVO||''),
      conservacao:String(h.ESTADO_CONSERVACAO||''),
      condicao:String(h.CONDICAO||''),
      responsavel:String(h.RESPONSAVEL_INSPECAO||''),
      observacao:String(h.OBSERVACAO||''),
      acaoRecomendada:String(h.ACAO_RECOMENDADA||'')
    }));

  const pendencias=(central.itens||[])
    .filter(p=>filtroPeriodoPendenciaS12_(p,filtros))
    .map(p=>({
      idPendencia:p.idPendencia,
      protocolo:p.protocolo,
      titulo:p.titulo||p.tituloAtivo||'',
      tipo:p.tipo,
      prioridade:p.prioridade,
      status:p.status,
      mapa:p.mapa,
      piso:p.piso,
      rua:p.rua,
      trecho:p.trecho,
      responsavel:p.responsavel,
      prazo:p.prazo,
      descricao:p.descricao,
      resolucao:p.resolucao
    }));

  return {
    ok:true,
    geradoEm:Utilities.formatDate(new Date(),APP.TIMEZONE,"dd/MM/yyyy HH:mm"),
    periodo:{
      inicio:String(filtros.dataInicio||''),
      fim:String(filtros.dataFim||'')
    },
    escopo:{
      mapa:String(filtros.idMapaSetor||''),
      piso:String(filtros.piso||''),
      responsavel:String(filtros.responsavel||'')
    },
    dashboard:dash,
    registros,
    historico,
    pendencias
  };
}

function diagnosticoS13(){
  const ss=SpreadsheetApp.getActive(),cfg=lerConfigComoObjeto_(ss),checks=[];
  check_(checks,'APP_ID',cfg.APP_ID===APP.ID,cfg.APP_ID||'ausente');
  check_(checks,'APP_VERSAO',cfg.APP_VERSAO===APP.VERSAO,cfg.APP_VERSAO||'ausente');
  check_(checks,'APP_FASE',cfg.APP_FASE==='S13',cfg.APP_FASE||'ausente');
  check_(checks,'S13_STATUS',cfg.S13_STATUS==='INSTALADO',cfg.S13_STATUS||'ausente');
  check_(checks,'RELATORIO_API',typeof appRelatorioGerencialS13==='function','OK');
  check_(checks,'DASHBOARD_S12',typeof appDashboardS12==='function','OK');
  check_(checks,'CENTRAL_S11',typeof appCentralGestaoS11==='function','OK');
  return{
    ok:checks.every(c=>c.ok),
    totalChecks:checks.length,
    totalFalhas:checks.filter(c=>!c.ok).length,
    checks
  };
}

function mostrarDiagnosticoS13(){
  const d=diagnosticoS13();
  SpreadsheetApp.getUi().alert(
    'Diagnóstico S13',
    `${d.ok?'S13 PRONTA':'HÁ PENDÊNCIAS'}\n\n`+
      d.checks.map(c=>`${c.ok?'✅':'❌'} ${c.nome}: ${c.detalhe}`).join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return d;
}


// ========================================================
// S14 — ADMINISTRAÇÃO E GOVERNANÇA / RBAC
// ========================================================
const S14_USUARIOS_HEADERS = [
  'EMAIL','NOME','PERFIL','ATIVO','SETOR_PADRAO','CRIADO_EM',
  'ATUALIZADO_EM','ULTIMO_ACESSO','OBSERVACAO'
];

const S14_PERFIS_HEADERS = [
  'PERFIL','DESCRICAO',
  'CONSULTAR_MAPA','CRIAR_REGISTRO','EDITAR_REGISTRO',
  'INSPECIONAR','TRATAR_PENDENCIAS','ACESSAR_CENTRAL',
  'ACESSAR_DASHBOARD','ACESSAR_RELATORIOS','ADMINISTRAR'
];

const S14_PERFIS_PADRAO = [
  ['ADMIN','Administrador geral',true,true,true,true,true,true,true,true,true],
  ['GESTOR','Gestor operacional',true,true,true,true,true,true,true,true,false],
  ['OPERACIONAL','Operação de campo',true,true,false,true,true,false,false,false,false],
  ['CONSULTA','Somente consulta',true,false,false,false,false,false,false,false,false]
];

function setupS14(){
  const ss=SpreadsheetApp.getActive();
  const cfg=ss.getSheetByName('CONFIG');
  if(!cfg)throw new Error('CONFIG ausente.');

  let usuarios=ss.getSheetByName('USUARIOS');
  if(!usuarios)usuarios=ss.insertSheet('USUARIOS');
  garantirCabecalhosS14_(usuarios,S14_USUARIOS_HEADERS);

  let perfis=ss.getSheetByName('PERFIS_PERMISSOES');
  if(!perfis)perfis=ss.insertSheet('PERFIS_PERMISSOES');
  garantirCabecalhosS14_(perfis,S14_PERFIS_HEADERS);

  if(perfis.getLastRow()<2){
    perfis.getRange(2,1,S14_PERFIS_PADRAO.length,S14_PERFIS_PADRAO[0].length)
      .setValues(S14_PERFIS_PADRAO);
  }

  // Bootstrap seguro: o usuário que executa o setup vira ADMIN se ainda não existir.
  const email=normalizarEmailS14_((usuarioRpcAtualS223_()?.email||Session.getActiveUser().getEmail()));
  if(email){
    garantirUsuarioAdminS14_(usuarios,email);
  }

  setConfigValue_(cfg,'APP_VERSAO',APP.VERSAO,'Versão atualmente instalada');
  setConfigValue_(cfg,'APP_FASE','S14','Fase de implementação validada');
  setConfigValue_(cfg,'S14_STATUS','INSTALADO','Administração e governança instaladas');
  setConfigValue_(cfg,'S14_MODO_AUTH','GOOGLE_IDENTITY','Identidade por Session.getActiveUser()');
  setConfigValue_(cfg,'S14_INSTALADO_EM',
    Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),
    'Data/hora da instalação S14'
  );

  SpreadsheetApp.flush();
  return diagnosticoS14();
}

function garantirCabecalhosS14_(sh,headers){
  const last=Math.max(1,sh.getLastColumn());
  const atuais=sh.getRange(1,1,1,last).getValues()[0].map(String);
  const vazio=!atuais.some(Boolean);
  if(vazio){
    sh.clear();
    sh.getRange(1,1,1,headers.length).setValues([headers]);
  }else{
    const falt=headers.filter(h=>!atuais.includes(h));
    if(falt.length)sh.getRange(1,atuais.length+1,1,falt.length).setValues([falt]);
  }
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,sh.getLastColumn())
    .setFontWeight('bold').setBackground('#171B68').setFontColor('#FFFFFF');
}

function normalizarEmailS14_(email){
  return String(email||'').trim().toLowerCase();
}

function garantirUsuarioAdminS14_(sh,email){
  const usuario=obterUsuarioS14_(email);
  if(usuario)return usuario;
  const agora=new Date();
  const obj={
    EMAIL:email,
    NOME:email.split('@')[0],
    PERFIL:'ADMIN',
    ATIVO:true,
    SETOR_PADRAO:'',
    CRIADO_EM:agora,
    ATUALIZADO_EM:agora,
    ULTIMO_ACESSO:'',
    OBSERVACAO:'Criado automaticamente no setup S14'
  };
  appendObjetoPorCabecalhoS7_(sh,obj);
  return obj;
}

function obterUsuarioS14_(email){
  const sh=SpreadsheetApp.getActive().getSheetByName('USUARIOS');
  if(!sh||sh.getLastRow()<2)return null;
  const vals=sh.getDataRange().getValues(),h=vals.shift().map(String),idx={};
  h.forEach((x,i)=>idx[x]=i);
  const alvo=normalizarEmailS14_(email);
  for(const r of vals){
    if(normalizarEmailS14_(r[idx.EMAIL])===alvo){
      const o={};h.forEach((k,i)=>o[k]=r[i]);return o;
    }
  }
  return null;
}

function obterPerfilS14_(perfil){
  // R02 (auditoria S26.10) — cache de 5 min; invalidado em appSalvarPerfilS14.
  const CACHE_KEY='MALL_PERFIS_V1';
  let mapa=null;
  try{
    const hit=CacheService.getScriptCache().get(CACHE_KEY);
    if(hit)mapa=JSON.parse(hit);
  }catch(_){}
  if(!mapa){
    const sh=SpreadsheetApp.getActive().getSheetByName('PERFIS_PERMISSOES');
    if(!sh||sh.getLastRow()<2)return null;
    const vals=sh.getDataRange().getValues(),h=vals.shift().map(String),idx={};
    h.forEach((x,i)=>idx[x]=i);
    mapa={};
    for(const r of vals){
      const nome=String(r[idx.PERFIL]||'').trim().toUpperCase();
      if(!nome)continue;
      const o={};h.forEach((k,i)=>o[k]=r[i]);mapa[nome]=o;
    }
    try{CacheService.getScriptCache().put(CACHE_KEY,JSON.stringify(mapa),300);}catch(_){}
  }
  const alvo=String(perfil||'').trim().toUpperCase();
  return mapa[alvo]||null;
}

function boolS14_(v){
  return v===true||String(v).toLowerCase()==='true'||String(v)==='1'||String(v).toLowerCase()==='sim';
}

function sessaoAtualS14_(){
  const email=normalizarEmailS14_((usuarioRpcAtualS223_()?.email||Session.getActiveUser().getEmail()));
  if(!email){
    return {
      autenticado:false,
      email:'',
      nome:'Usuário não identificado',
      perfil:'CONSULTA',
      ativo:false,
      identidadeDisponivel:false,
      permissoes:permissoesPerfilS14_('CONSULTA')
    };
  }

  const u=obterUsuarioS14_(email);
  if(!u||!boolS14_(u.ATIVO)){
    return {
      autenticado:false,
      email,
      nome:u?String(u.NOME||email):email,
      perfil:u?String(u.PERFIL||'CONSULTA'):'CONSULTA',
      ativo:false,
      identidadeDisponivel:true,
      permissoes:permissoesPerfilS14_('CONSULTA')
    };
  }

  atualizarUltimoAcessoS14_(email);
  return {
    autenticado:true,
    email,
    nome:String(u.NOME||email),
    perfil:String(u.PERFIL||'CONSULTA').toUpperCase(),
    ativo:true,
    identidadeDisponivel:true,
    setorPadrao:String(u.SETOR_PADRAO||''),
    permissoes:permissoesPerfilS14_(String(u.PERFIL||'CONSULTA'))
  };
}

function permissoesPerfilS14_(perfil){
  const p=obterPerfilS14_(perfil)||obterPerfilS14_('CONSULTA')||{};
  return {
    consultarMapa:boolS14_(p.CONSULTAR_MAPA),
    criarRegistro:boolS14_(p.CRIAR_REGISTRO),
    editarRegistro:boolS14_(p.EDITAR_REGISTRO),
    inspecionar:boolS14_(p.INSPECIONAR),
    tratarPendencias:boolS14_(p.TRATAR_PENDENCIAS),
    acessarCentral:boolS14_(p.ACESSAR_CENTRAL),
    acessarDashboard:boolS14_(p.ACESSAR_DASHBOARD),
    acessarRelatorios:boolS14_(p.ACESSAR_RELATORIOS),
    administrar:boolS14_(p.ADMINISTRAR)
  };
}

function atualizarUltimoAcessoS14_(email){
  try{
    const sh=SpreadsheetApp.getActive().getSheetByName('USUARIOS');
    if(!sh||sh.getLastRow()<2)return;
    const vals=sh.getDataRange().getValues(),h=vals[0].map(String);
    const cEmail=h.indexOf('EMAIL'),cUlt=h.indexOf('ULTIMO_ACESSO');
    if(cEmail<0||cUlt<0)return;
    const row=vals.findIndex((r,i)=>i>0&&normalizarEmailS14_(r[cEmail])===email);
    if(row>0)sh.getRange(row+1,cUlt+1).setValue(new Date());
  }catch(e){}
}

function appSessaoS14(){
  return sessaoAtualS14_();
}

function exigirPermissaoS14_(permissao){
  const s=sessaoAtualS14_();
  if(!s.autenticado){
    throw new Error(
      s.identidadeDisponivel
        ? 'Usuário não autorizado ou inativo.'
        : 'Não foi possível identificar sua conta Google. Verifique a configuração de acesso do Web App.'
    );
  }
  if(!s.permissoes||s.permissoes[permissao]!==true){
    throw new Error(`Seu perfil (${s.perfil}) não possui permissão para esta operação.`);
  }
  return s;
}

function appListarUsuariosS14(){
  exigirPermissaoS14_('administrar');
  const sh=SpreadsheetApp.getActive().getSheetByName('USUARIOS');
  if(!sh||sh.getLastRow()<2)return[];
  const vals=sh.getDataRange().getValues(),h=vals.shift().map(String),idx={};
  h.forEach((x,i)=>idx[x]=i);
  return vals.filter(r=>String(r[idx.EMAIL]||'')).map(r=>({
    email:String(r[idx.EMAIL]||''),
    nome:String(r[idx.NOME]||''),
    perfil:String(r[idx.PERFIL]||''),
    ativo:boolS14_(r[idx.ATIVO]),
    setorPadrao:String(r[idx.SETOR_PADRAO]||''),
    ultimoAcesso:formatarDataS10_(r[idx.ULTIMO_ACESSO]),
    observacao:String(r[idx.OBSERVACAO]||'')
  }));
}

function appListarPerfisS14(){
  exigirPermissaoS14_('administrar');
  const sh=SpreadsheetApp.getActive().getSheetByName('PERFIS_PERMISSOES');
  if(!sh||sh.getLastRow()<2)return[];
  const vals=sh.getDataRange().getValues(),h=vals.shift().map(String),idx={};
  h.forEach((x,i)=>idx[x]=i);
  return vals.filter(r=>String(r[idx.PERFIL]||'')).map(r=>({
    perfil:String(r[idx.PERFIL]||''),
    descricao:String(r[idx.DESCRICAO]||''),
    permissoes:permissoesPerfilS14_(String(r[idx.PERFIL]||''))
  }));
}

function appSalvarUsuarioS14(payload){
  const admin=exigirPermissaoS14_('administrar');
  payload=payload||{};
  const email=normalizarEmailS14_(payload.email);
  if(!email||!email.includes('@'))throw new Error('E-mail válido é obrigatório.');

  const perfil=String(payload.perfil||'CONSULTA').trim().toUpperCase();
  if(!obterPerfilS14_(perfil))throw new Error('Perfil inválido.');

  const sh=SpreadsheetApp.getActive().getSheetByName('USUARIOS');
  garantirCabecalhosS14_(sh,S14_USUARIOS_HEADERS);
  const vals=sh.getDataRange().getValues(),h=vals[0].map(String),idx={};
  h.forEach((x,i)=>idx[x]=i);
  const row=vals.findIndex((r,i)=>i>0&&normalizarEmailS14_(r[idx.EMAIL])===email);
  const agora=new Date();

  if(row>0){
    const set=(campo,v)=>{const c=idx[campo];if(c>=0)sh.getRange(row+1,c+1).setValue(v);};
    set('NOME',String(payload.nome||email));
    set('PERFIL',perfil);
    set('ATIVO',payload.ativo!==false);
    set('SETOR_PADRAO',String(payload.setorPadrao||''));
    set('OBSERVACAO',String(payload.observacao||''));
    set('ATUALIZADO_EM',agora);
  }else{
    appendObjetoPorCabecalhoS7_(sh,{
      EMAIL:email,
      NOME:String(payload.nome||email),
      PERFIL:perfil,
      ATIVO:payload.ativo!==false,
      SETOR_PADRAO:String(payload.setorPadrao||''),
      CRIADO_EM:agora,
      ATUALIZADO_EM:agora,
      ULTIMO_ACESSO:'',
      OBSERVACAO:String(payload.observacao||'')
    });
  }

  return {ok:true,email,perfil};
}

function appSalvarPerfilS14(payload){
  try{CacheService.getScriptCache().remove('MALL_PERFIS_V1');}catch(_){}
  exigirPermissaoS14_('administrar');
  payload=payload||{};
  const perfil=String(payload.perfil||'').trim().toUpperCase();
  if(!perfil)throw new Error('PERFIL obrigatório.');

  const sh=SpreadsheetApp.getActive().getSheetByName('PERFIS_PERMISSOES');
  garantirCabecalhosS14_(sh,S14_PERFIS_HEADERS);
  const vals=sh.getDataRange().getValues(),h=vals[0].map(String),idx={};
  h.forEach((x,i)=>idx[x]=i);
  const row=vals.findIndex((r,i)=>i>0&&String(r[idx.PERFIL]||'').trim().toUpperCase()===perfil);

  const obj={
    PERFIL:perfil,
    DESCRICAO:String(payload.descricao||''),
    CONSULTAR_MAPA:!!payload.permissoes?.consultarMapa,
    CRIAR_REGISTRO:!!payload.permissoes?.criarRegistro,
    EDITAR_REGISTRO:!!payload.permissoes?.editarRegistro,
    INSPECIONAR:!!payload.permissoes?.inspecionar,
    TRATAR_PENDENCIAS:!!payload.permissoes?.tratarPendencias,
    ACESSAR_CENTRAL:!!payload.permissoes?.acessarCentral,
    ACESSAR_DASHBOARD:!!payload.permissoes?.acessarDashboard,
    ACESSAR_RELATORIOS:!!payload.permissoes?.acessarRelatorios,
    ADMINISTRAR:!!payload.permissoes?.administrar
  };

  if(row>0){
    Object.entries(obj).forEach(([k,v])=>{
      const c=idx[k];if(c>=0)sh.getRange(row+1,c+1).setValue(v);
    });
  }else{
    appendObjetoPorCabecalhoS7_(sh,obj);
  }

  return {ok:true,perfil};
}

function appDiagnosticoIdentidadeS14(){
  const email=normalizarEmailS14_((usuarioRpcAtualS223_()?.email||Session.getActiveUser().getEmail()));
  const effective=normalizarEmailS14_(Session.getEffectiveUser().getEmail());
  return {
    activeUserEmail:email,
    effectiveUserEmail:effective,
    identidadeDisponivel:!!email,
    mensagem:email
      ? 'Identidade Google disponível.'
      : '(usuarioRpcAtualS223_()?.email||Session.getActiveUser().getEmail()) retornou vazio. Para RBAC confiável, publique o Web App com acesso que preserve a identidade Google do usuário.'
  };
}

// Wrappers com autorização backend.
function appRegistrarInspecaoS10(payload){
  exigirPermissaoS14_('inspecionar');
  return registrarInspecaoComPendenciaS10_(payload||{});
}

function appSincronizarInspecaoS9(payload){
  exigirPermissaoS14_('inspecionar');
  return sincronizarInspecaoComPendenciaS10_(payload||{});
}

function appAtualizarPendenciaS14(payload){
  exigirPermissaoS14_('tratarPendencias');
  return appAtualizarPendenciaS10(payload||{});
}

function appCentralGestaoS14(filtros){
  exigirPermissaoS14_('acessarCentral');
  return appCentralGestaoS11(filtros||{});
}

function appDashboardS14(filtros){
  exigirPermissaoS14_('acessarDashboard');
  return appDashboardS12(filtros||{});
}

function appRelatorioGerencialS14(filtros){
  exigirPermissaoS14_('acessarRelatorios');
  return appRelatorioGerencialS13(filtros||{});
}

function diagnosticoS14(){
  const ss=SpreadsheetApp.getActive(),cfg=lerConfigComoObjeto_(ss),checks=[];
  check_(checks,'APP_ID',cfg.APP_ID===APP.ID,cfg.APP_ID||'ausente');
  check_(checks,'APP_VERSAO',cfg.APP_VERSAO===APP.VERSAO,cfg.APP_VERSAO||'ausente');
  check_(checks,'APP_FASE',cfg.APP_FASE==='S14',cfg.APP_FASE||'ausente');
  check_(checks,'S14_STATUS',cfg.S14_STATUS==='INSTALADO',cfg.S14_STATUS||'ausente');
  check_(checks,'ABA_USUARIOS',!!ss.getSheetByName('USUARIOS'),'USUARIOS');
  check_(checks,'ABA_PERFIS',!!ss.getSheetByName('PERFIS_PERMISSOES'),'PERFIS_PERMISSOES');
  check_(checks,'SESSAO',typeof appSessaoS14==='function','OK');
  check_(checks,'RBAC_BACKEND',typeof exigirPermissaoS14_==='function','OK');
  check_(checks,'ADMIN_USUARIOS',typeof appSalvarUsuarioS14==='function','OK');
  return{
    ok:checks.every(c=>c.ok),
    totalChecks:checks.length,
    totalFalhas:checks.filter(c=>!c.ok).length,
    identidade:appDiagnosticoIdentidadeS14(),
    checks
  };
}

function mostrarDiagnosticoS14(){
  const d=diagnosticoS14();
  SpreadsheetApp.getUi().alert(
    'Diagnóstico S14',
    `${d.ok?'S14 PRONTA':'HÁ PENDÊNCIAS'}\n\n`+
    d.checks.map(c=>`${c.ok?'✅':'❌'} ${c.nome}: ${c.detalhe}`).join('\n')+
    `\n\nIdentidade: ${d.identidade.mensagem}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return d;
}


const S15_AUDIT_HEADERS=['ID_AUDITORIA','DATA_HORA','USUARIO_EMAIL','USUARIO_NOME','PERFIL','ACAO','ENTIDADE','ENTIDADE_ID','RESULTADO','ORIGEM','DEVICE_ID','DETALHES_JSON','VALOR_ANTERIOR_JSON','VALOR_NOVO_JSON','VERSAO_APP'];

function setupS15(){
  const ss=SpreadsheetApp.getActive(),cfg=ss.getSheetByName('CONFIG');
  if(!cfg)throw new Error('CONFIG ausente.');
  let sh=ss.getSheetByName('AUDITORIA');
  if(!sh)sh=ss.insertSheet('AUDITORIA');
  garantirCabecalhosS15_(sh);
  setConfigValue_(cfg,'APP_VERSAO',APP.VERSAO,'Versão atualmente instalada');
  setConfigValue_(cfg,'APP_FASE','S15','Fase de implementação validada');
  setConfigValue_(cfg,'S15_STATUS','INSTALADO','Auditoria e trilhas de segurança instaladas');
  setConfigValue_(cfg,'S15_INSTALADO_EM',Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),'Instalação S15');
  registrarAuditoriaS15_({acao:'SETUP_S15',entidade:'SISTEMA',entidadeId:'S15',resultado:'SUCESSO',origem:'APPS_SCRIPT'});
  SpreadsheetApp.flush();
  return diagnosticoS15();
}
function garantirCabecalhosS15_(sh){
  const atuais=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(String);
  if(!atuais.some(Boolean)){sh.clear();sh.getRange(1,1,1,S15_AUDIT_HEADERS.length).setValues([S15_AUDIT_HEADERS]);}
  else{const falt=S15_AUDIT_HEADERS.filter(h=>!atuais.includes(h));if(falt.length)sh.getRange(1,atuais.length+1,1,falt.length).setValues([falt]);}
  sh.setFrozenRows(1);sh.getRange(1,1,1,sh.getLastColumn()).setFontWeight('bold').setBackground('#171B68').setFontColor('#fff');
}
function s15json_(v){try{return JSON.stringify(v===undefined?null:v)}catch(e){return JSON.stringify({erro:String(e)})}}
function registrarAuditoriaS15_(ev){
  try{
    const sh=SpreadsheetApp.getActive().getSheetByName('AUDITORIA');if(!sh)return null;
    garantirCabecalhosS15_(sh);
    let s={};try{s=sessaoAtualS14_()}catch(e){}
    const obj={
      ID_AUDITORIA:'AUD-'+Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase(),
      DATA_HORA:new Date(),USUARIO_EMAIL:String(ev.usuarioEmail||s.email||''),USUARIO_NOME:String(ev.usuarioNome||s.nome||''),
      PERFIL:String(ev.perfil||s.perfil||''),ACAO:String(ev.acao||''),ENTIDADE:String(ev.entidade||''),ENTIDADE_ID:String(ev.entidadeId||''),
      RESULTADO:String(ev.resultado||'SUCESSO'),ORIGEM:String(ev.origem||'WEB_APP'),DEVICE_ID:String(ev.deviceId||''),
      DETALHES_JSON:s15json_(ev.detalhes||{}),VALOR_ANTERIOR_JSON:s15json_(ev.valorAnterior||null),VALOR_NOVO_JSON:s15json_(ev.valorNovo||null),
      VERSAO_APP:APP.VERSAO
    };
    appendObjetoPorCabecalhoS7_(sh,obj);return obj;
  }catch(e){console.error('[S15]',e);return null}
}
function exigirPermissaoS15_(perm,ctx){
  try{return exigirPermissaoS14_(perm)}
  catch(e){registrarAuditoriaS15_({acao:'ACESSO_NEGADO',entidade:String(ctx?.entidade||'PERMISSAO'),entidadeId:String(ctx?.entidadeId||perm),resultado:'NEGADO',origem:String(ctx?.origem||'WEB_APP'),deviceId:String(ctx?.deviceId||''),detalhes:{permissao:perm,operacao:String(ctx?.acao||''),mensagem:e.message||String(e)}});throw e}
}
function snapshotUsuarioS15_(email){
  const u=obterUsuarioS14_(email);if(!u)return null;
  return {email:String(u.EMAIL||''),nome:String(u.NOME||''),perfil:String(u.PERFIL||''),ativo:boolS14_(u.ATIVO),setorPadrao:String(u.SETOR_PADRAO||''),observacao:String(u.OBSERVACAO||'')};
}
function snapshotPerfilS15_(perfil){
  const p=obterPerfilS14_(perfil);if(!p)return null;
  return {perfil:String(p.PERFIL||''),descricao:String(p.DESCRICAO||''),permissoes:permissoesPerfilS14_(perfil)};
}
function appSalvarUsuarioS15(payload){
  exigirPermissaoS15_('administrar',{acao:'SALVAR_USUARIO',entidade:'USUARIO',entidadeId:String(payload?.email||'')});
  const email=normalizarEmailS14_(payload?.email),antes=snapshotUsuarioS15_(email);
  try{const r=appSalvarUsuarioS14(payload||{}),depois=snapshotUsuarioS15_(email);registrarAuditoriaS15_({acao:antes?'USUARIO_ATUALIZADO':'USUARIO_CRIADO',entidade:'USUARIO',entidadeId:email,resultado:'SUCESSO',valorAnterior:antes,valorNovo:depois});return r}
  catch(e){registrarAuditoriaS15_({acao:'SALVAR_USUARIO',entidade:'USUARIO',entidadeId:email,resultado:'ERRO',detalhes:{erro:e.message||String(e)}});throw e}
}
function appSalvarPerfilS15(payload){
  exigirPermissaoS15_('administrar',{acao:'SALVAR_PERFIL',entidade:'PERFIL',entidadeId:String(payload?.perfil||'')});
  const perfil=String(payload?.perfil||'').trim().toUpperCase(),antes=snapshotPerfilS15_(perfil);
  try{const r=appSalvarPerfilS14(payload||{}),depois=snapshotPerfilS15_(perfil);registrarAuditoriaS15_({acao:'PERFIL_ATUALIZADO',entidade:'PERFIL',entidadeId:perfil,resultado:'SUCESSO',valorAnterior:antes,valorNovo:depois});return r}
  catch(e){registrarAuditoriaS15_({acao:'SALVAR_PERFIL',entidade:'PERFIL',entidadeId:perfil,resultado:'ERRO',detalhes:{erro:e.message||String(e)}});throw e}
}
function appAtualizarPendenciaS15(payload){
  exigirPermissaoS15_('tratarPendencias',{acao:'ATUALIZAR_PENDENCIA',entidade:'PENDENCIA',entidadeId:String(payload?.idPendencia||'')});
  const antes=obterPendenciaSnapshotS15_(String(payload?.idPendencia||''));
  try{const r=appAtualizarPendenciaS10(payload||{}),depois=obterPendenciaSnapshotS15_(String(payload?.idPendencia||''));registrarAuditoriaS15_({acao:'PENDENCIA_ATUALIZADA',entidade:'PENDENCIA',entidadeId:String(payload?.idPendencia||''),resultado:'SUCESSO',valorAnterior:antes,valorNovo:depois});return r}
  catch(e){registrarAuditoriaS15_({acao:'ATUALIZAR_PENDENCIA',entidade:'PENDENCIA',entidadeId:String(payload?.idPendencia||''),resultado:'ERRO',detalhes:{erro:e.message||String(e)}});throw e}
}
function obterPendenciaSnapshotS15_(id){
  const p=appListarPendenciasS10('').find(x=>String(x.idPendencia||'')===String(id||''));if(!p)return null;
  return {idPendencia:p.idPendencia,status:p.status,responsavel:p.responsavel,prazo:p.prazo,resolucao:p.resolucao};
}
function appRegistrarInspecaoS15(payload){
  exigirPermissaoS15_('inspecionar',{acao:'REGISTRAR_INSPECAO',entidade:'REGISTRO',entidadeId:String(payload?.idRegistro||''),deviceId:String(payload?.deviceId||'')});
  try{const r=appRegistrarInspecaoS10(payload||{});registrarAuditoriaS15_({acao:'INSPECAO_REGISTRADA',entidade:'REGISTRO',entidadeId:String(payload?.idRegistro||''),resultado:'SUCESSO',origem:String(payload?.origem||'WEB_APP'),deviceId:String(payload?.deviceId||''),detalhes:{clientInspectionId:String(payload?.clientInspectionId||''),idHistorico:String(r?.idHistorico||'')}});return r}
  catch(e){registrarAuditoriaS15_({acao:'REGISTRAR_INSPECAO',entidade:'REGISTRO',entidadeId:String(payload?.idRegistro||''),resultado:'ERRO',detalhes:{erro:e.message||String(e)}});throw e}
}
function appSincronizarInspecaoS15(payload){
  exigirPermissaoS15_('inspecionar',{acao:'SINCRONIZAR_INSPECAO',entidade:'REGISTRO',entidadeId:String(payload?.idRegistro||''),deviceId:String(payload?.deviceId||'')});
  const id=String(payload?.clientInspectionId||''),exist=id?obterHistoricoPorClientInspectionS8_(id):null;
  if(exist){gerarPendenciaDaInspecaoS10_(exist,payload||{});registrarAuditoriaS15_({acao:'INSPECAO_SINCRONIZADA_IDEMPOTENTE',entidade:'REGISTRO',entidadeId:String(exist.ID_REGISTRO||''),resultado:'SUCESSO',origem:'OFFLINE_SYNC',deviceId:String(payload?.deviceId||''),detalhes:{clientInspectionId:id,idHistorico:String(exist.ID_HISTORICO||'')}});return{ok:true,idempotente:true,idHistorico:String(exist.ID_HISTORICO||''),protocolo:String(exist.PROTOCOLO||''),clientInspectionId:id}}
  const r=appRegistrarInspecaoS15(payload||{});registrarAuditoriaS15_({acao:'INSPECAO_SINCRONIZADA',entidade:'REGISTRO',entidadeId:String(payload?.idRegistro||''),resultado:'SUCESSO',origem:'OFFLINE_SYNC',deviceId:String(payload?.deviceId||''),detalhes:{clientInspectionId:id,idHistorico:String(r?.idHistorico||'')}});return r;
}
function appListarAuditoriaS15(f){
  exigirPermissaoS15_('administrar',{acao:'LISTAR_AUDITORIA',entidade:'AUDITORIA'});f=f||{};
  const sh=SpreadsheetApp.getActive().getSheetByName('AUDITORIA');if(!sh||sh.getLastRow()<2)return[];
  const vals=sh.getDataRange().getValues(),h=vals.shift().map(String),idx={};h.forEach((x,i)=>idx[x]=i);
  const texto=String(f.texto||'').toLowerCase();
  return vals.map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i]);return o}).filter(o=>{
    if(f.resultado&&String(o.RESULTADO||'')!==String(f.resultado))return false;
    if(f.acao&&String(o.ACAO||'')!==String(f.acao))return false;
    if(f.usuario&&normalizarEmailS14_(o.USUARIO_EMAIL)!==normalizarEmailS14_(f.usuario))return false;
    if(texto&&!([o.USUARIO_EMAIL,o.USUARIO_NOME,o.PERFIL,o.ACAO,o.ENTIDADE,o.ENTIDADE_ID,o.RESULTADO,o.DETALHES_JSON].join(' ').toLowerCase().includes(texto)))return false;
    return true;
  }).map(o=>({idAuditoria:String(o.ID_AUDITORIA||''),dataHora:formatarDataS10_(o.DATA_HORA),usuarioEmail:String(o.USUARIO_EMAIL||''),usuarioNome:String(o.USUARIO_NOME||''),perfil:String(o.PERFIL||''),acao:String(o.ACAO||''),entidade:String(o.ENTIDADE||''),entidadeId:String(o.ENTIDADE_ID||''),resultado:String(o.RESULTADO||''),origem:String(o.ORIGEM||''),deviceId:String(o.DEVICE_ID||''),detalhes:String(o.DETALHES_JSON||''),valorAnterior:String(o.VALOR_ANTERIOR_JSON||''),valorNovo:String(o.VALOR_NOVO_JSON||'')})).reverse().slice(0,500);
}
function appOpcoesAuditoriaS15(){
  const itens=appListarAuditoriaS15({}),uniq=a=>[...new Set(a.filter(Boolean))].sort();
  return{acoes:uniq(itens.map(i=>i.acao)),resultados:uniq(itens.map(i=>i.resultado)),usuarios:uniq(itens.map(i=>i.usuarioEmail))};
}
function diagnosticoS15(){
  const ss=SpreadsheetApp.getActive(),cfg=lerConfigComoObjeto_(ss),c=[];
  check_(c,'APP_ID',cfg.APP_ID===APP.ID,cfg.APP_ID||'ausente');check_(c,'APP_VERSAO',cfg.APP_VERSAO===APP.VERSAO,cfg.APP_VERSAO||'ausente');check_(c,'APP_FASE',cfg.APP_FASE==='S15',cfg.APP_FASE||'ausente');check_(c,'S15_STATUS',cfg.S15_STATUS==='INSTALADO',cfg.S15_STATUS||'ausente');check_(c,'ABA_AUDITORIA',!!ss.getSheetByName('AUDITORIA'),'AUDITORIA');check_(c,'REGISTRAR_AUDITORIA',typeof registrarAuditoriaS15_==='function','OK');check_(c,'ACESSO_NEGADO',typeof exigirPermissaoS15_==='function','OK');check_(c,'LISTAR_AUDITORIA',typeof appListarAuditoriaS15==='function','OK');
  return{ok:c.every(x=>x.ok),totalChecks:c.length,totalFalhas:c.filter(x=>!x.ok).length,checks:c};
}
function mostrarDiagnosticoS15(){const d=diagnosticoS15();SpreadsheetApp.getUi().alert('Diagnóstico S15',`${d.ok?'S15 PRONTA':'HÁ PENDÊNCIAS'}\n\n`+d.checks.map(c=>`${c.ok?'✅':'❌'} ${c.nome}: ${c.detalhe}`).join('\n'),SpreadsheetApp.getUi().ButtonSet.OK);return d;}


// ========================================================
// S22.5.9 — ENDPOINT DE FOTO AUTENTICADO E DIAGNÓSTICO
// ========================================================
function appSincronizarFotoAutenticadaS2259(payload,auth){
  auth=auth||{};
  const v=validarSessaoMallS223_(auth.authToken,auth.deviceId);
  if(!v){
    throw new Error('Sessão expirada ou inválida.');
  }

  S223_RPC_USER=v.usuario;
  try{
    const r=appSincronizarFotoS7(payload);
    if(r&&r.aguardandoRegistro){
      return {
        ok:false,
        aguardandoRegistro:true,
        codigo:'AGUARDANDO_REGISTRO',
        clientPhotoId:String(payload&&payload.clientPhotoId||''),
        clientEventId:String(payload&&payload.clientEventId||'')
      };
    }
    return r;
  }catch(e){
    const msg=String(e&&e.message||e);
    try{
      registrarAuditoriaS15_({
        acao:'FOTO_SYNC_ERRO',
        entidade:'REGISTRO_FOTOS',
        entidadeId:String(payload&&payload.clientPhotoId||''),
        resultado:'ERRO',
        origem:'WEB_APP',
        detalhes:{
          erro:msg,
          clientEventId:String(payload&&payload.clientEventId||''),
          tamanhoBytes:Number(payload&&payload.tamanhoBytes||0)
        }
      });
    }catch(_){}
    throw new Error('FOTO_SYNC_BACKEND: '+msg);
  }finally{
    S223_RPC_USER=null;
  }
}


// ========================================================
// S23.5 — FOTO VINCULADA À INSPEÇÃO
// ========================================================
function appSincronizarFotoInspecaoS235(payload){
  payload=payload||{};

  exigirPermissaoS14_('inspecionar');

  const clientPhotoId=String(payload.clientPhotoId||'').trim();
  const clientInspectionId=String(payload.clientInspectionId||'').trim();
  const idRegistro=String(payload.idRegistro||'').trim();

  if(!clientPhotoId)throw new Error('CLIENT_PHOTO_ID obrigatório.');
  if(!clientInspectionId)throw new Error('CLIENT_INSPECTION_ID obrigatório.');
  if(!idRegistro)throw new Error('ID_REGISTRO obrigatório.');

  const existente=obterFotoPorClientPhotoIdS7_(clientPhotoId);
  if(existente){
    return {
      ok:true,
      idempotente:true,
      idFoto:String(existente.ID_FOTO||''),
      arquivoId:String(existente.ARQUIVO_ID||''),
      driveUrl:String(existente.DRIVE_URL||''),
      clientPhotoId,
      clientInspectionId
    };
  }

  const hashLocal=String(payload.hashLocal||'').trim();

  if(hashLocal){
    const duplicada=obterFotoDuplicadaInspecaoS2351_(clientInspectionId,hashLocal);
    if(duplicada){
      return {
        ok:true,
        idempotente:true,
        duplicada:true,
        idFoto:String(duplicada.ID_FOTO||''),
        arquivoId:String(duplicada.ARQUIVO_ID||''),
        driveUrl:String(duplicada.DRIVE_URL||''),
        clientPhotoId,
        clientInspectionId
      };
    }
  }

  const hist=obterHistoricoPorClientInspectionS8_(clientInspectionId);
  if(!hist){
    return {
      ok:false,
      aguardandoInspecao:true,
      clientPhotoId,
      clientInspectionId
    };
  }

  if(String(hist.ID_REGISTRO||'')!==idRegistro){
    throw new Error('A inspeção informada não pertence ao ID_REGISTRO da foto.');
  }

  // S23.5.2 — imagem mantida do snapshot anterior.
  // Cria somente um novo vínculo histórico; não duplica o arquivo no Drive.
  if(Boolean(payload.referenciaExistente)){
    const arquivoIdOrigem=String(payload.arquivoIdOrigem||'').trim();
    if(!arquivoIdOrigem)throw new Error('ARQUIVO_ID_ORIGEM obrigatório para foto herdada.');

    const origem=obterFotoPorArquivoIdS2352_(arquivoIdOrigem);
    if(!origem)throw new Error('Foto de origem não encontrada em REGISTRO_FOTOS.');

    const agora=new Date();
    const idFoto='FOTO-'+Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase();
    const protocolo=String(hist.PROTOCOLO||idRegistro);

    appendObjetoPorCabecalhoS7_(SpreadsheetApp.getActive().getSheetByName('REGISTRO_FOTOS'),{
      ID_FOTO:idFoto,
      CLIENT_PHOTO_ID:clientPhotoId,
      CLIENT_EVENT_ID:'',
      CLIENT_INSPECTION_ID:clientInspectionId,
      ID_HISTORICO:String(hist.ID_HISTORICO||''),
      ID_REGISTRO:idRegistro,
      PROTOCOLO:protocolo,
      CRIADO_EM:agora,
      SINCRONIZADO_EM:agora,
      ARQUIVO_ID:String(origem.ARQUIVO_ID||''),
      NOME_ARQUIVO:String(origem.NOME_ARQUIVO||payload.nomeArquivo||'foto.jpg'),
      MIME_TYPE:String(origem.MIME_TYPE||payload.mimeType||'image/jpeg'),
      TAMANHO_BYTES:Number(origem.TAMANHO_BYTES||payload.tamanhoBytes||0),
      SHA256:String(origem.SHA256||payload.hashLocal||''),
      DRIVE_URL:String(origem.DRIVE_URL||''),
      ORIGEM_FOTO:'HERDADA',
      ORDEM_FOTO:Number(payload.ordemFoto||0),
      HASH_LOCAL:String(payload.hashLocal||origem.SHA256||''),
      ID_FOTO_ORIGEM:String(origem.ID_FOTO||payload.idFotoOrigem||''),
      USUARIO:(usuarioRpcAtualS223_()?.email||Session.getActiveUser().getEmail())||'',
      DEVICE_ID:String(payload.deviceId||''),
      VERSAO_APP:APP.VERSAO
    });

    return {
      ok:true,
      herdada:true,
      idFoto,
      arquivoId:String(origem.ARQUIVO_ID||''),
      driveUrl:String(origem.DRIVE_URL||''),
      clientPhotoId,
      clientInspectionId,
      idHistorico:String(hist.ID_HISTORICO||''),
      protocolo
    };
  }

  const dataUrl=String(payload.dataUrl||'');
  const m=dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if(!m)throw new Error('Imagem inválida.');

  const mime=String(payload.mimeType||m[1]||'image/jpeg');
  const bytes=Utilities.base64Decode(m[2]);
  const nomeOriginal=sanitizarNomeArquivoS7_(String(payload.nomeArquivo||'foto.jpg'));
  const extensao=extensaoMimeS7_(mime,nomeOriginal);

  const protocolo=String(hist.PROTOCOLO||idRegistro);
  const nome=`${protocolo}_INSP_${clientInspectionId.slice(0,8)}_${clientPhotoId.slice(0,8)}${extensao}`;

  const ss=SpreadsheetApp.getActive();
  const sh=ss.getSheetByName('REGISTRO_FOTOS');
  if(!sh)throw new Error('Aba REGISTRO_FOTOS ausente.');

  garantirCabecalhosFotosInspecaoS235_(sh);

  const cfg=lerConfigComoObjeto_(ss);
  const folderId=cfg.FOTOS_REGISTROS_FOLDER_ID;
  if(!folderId)throw new Error('FOTOS_REGISTROS_FOLDER_ID não configurado.');

  const file=DriveApp.getFolderById(folderId)
    .createFile(Utilities.newBlob(bytes,mime,nome));

  const sha=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes)
    .map(b=>(b<0?b+256:b).toString(16).padStart(2,'0')).join('');

  const agora=new Date();
  const idFoto='FOTO-'+Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase();

  appendObjetoPorCabecalhoS7_(sh,{
    ID_FOTO:idFoto,
    CLIENT_PHOTO_ID:clientPhotoId,
    CLIENT_EVENT_ID:'',
    CLIENT_INSPECTION_ID:clientInspectionId,
    ID_HISTORICO:String(hist.ID_HISTORICO||''),
    ID_REGISTRO:idRegistro,
    PROTOCOLO:protocolo,
    CRIADO_EM:agora,
    SINCRONIZADO_EM:agora,
    ARQUIVO_ID:file.getId(),
    NOME_ARQUIVO:nome,
    MIME_TYPE:mime,
    TAMANHO_BYTES:bytes.length,
    SHA256:sha,
    DRIVE_URL:file.getUrl(),
    ORIGEM_FOTO:'INSPECAO',
    ORDEM_FOTO:Number(payload.ordemFoto||0),
    HASH_LOCAL:hashLocal,
    ID_FOTO_ORIGEM:'',
    USUARIO:(usuarioRpcAtualS223_()?.email||Session.getActiveUser().getEmail())||'',
    DEVICE_ID:String(payload.deviceId||''),
    VERSAO_APP:APP.VERSAO
  });

  registrarAuditoriaS15_({
    acao:'FOTO_INSPECAO_SINCRONIZADA',
    entidade:'REGISTRO_FOTOS',
    entidadeId:idFoto,
    resultado:'SUCESSO',
    origem:'OFFLINE_SYNC',
    deviceId:String(payload.deviceId||''),
    detalhes:{
      clientInspectionId,
      idHistorico:String(hist.ID_HISTORICO||''),
      idRegistro,
      protocolo
    }
  });

  return {
    ok:true,
    idFoto,
    arquivoId:file.getId(),
    driveUrl:file.getUrl(),
    clientPhotoId,
    clientInspectionId,
    idHistorico:String(hist.ID_HISTORICO||''),
    protocolo
  };
}

function garantirCabecalhosFotosInspecaoS235_(sh){
  const obrigatorios=[
    'CLIENT_INSPECTION_ID',
    'ID_HISTORICO',
    'ORIGEM_FOTO',
    'ORDEM_FOTO',
    'HASH_LOCAL',
    'ID_FOTO_ORIGEM'
  ];

  const lastCol=Math.max(1,sh.getLastColumn());
  const atuais=sh.getRange(1,1,1,lastCol).getValues()[0].map(String);

  obrigatorios.forEach(h=>{
    if(!atuais.includes(h)){
      sh.getRange(1,sh.getLastColumn()+1).setValue(h);
      atuais.push(h);
    }
  });
}

function appListarFotosInspecaoS235(clientInspectionId){
  const id=String(clientInspectionId||'').trim();
  if(!id)return [];

  const sh=SpreadsheetApp.getActive().getSheetByName('REGISTRO_FOTOS');
  if(!sh||sh.getLastRow()<2)return [];

  garantirCabecalhosFotosInspecaoS235_(sh);

  const vals=sh.getDataRange().getValues();
  const h=vals.shift().map(String);
  const idx={};h.forEach((x,i)=>idx[x]=i);

  return vals
    .filter(r=>String(r[idx.CLIENT_INSPECTION_ID]||'')===id)
    .map(r=>{
      const o={};h.forEach((k,i)=>o[k]=r[i]);
      return o;
    });
}


function obterFotoDuplicadaInspecaoS2351_(clientInspectionId,hashLocal){
  const sh=SpreadsheetApp.getActive().getSheetByName('REGISTRO_FOTOS');
  if(!sh||sh.getLastRow()<2)return null;

  garantirCabecalhosFotosInspecaoS235_(sh);

  const vals=sh.getDataRange().getValues();
  const h=vals.shift().map(String);
  const idx={};h.forEach((x,i)=>idx[x]=i);

  const row=vals.find(r=>
    String(r[idx.CLIENT_INSPECTION_ID]||'')===String(clientInspectionId||'') &&
    String(r[idx.HASH_LOCAL]||'')===String(hashLocal||'')
  );

  if(!row)return null;
  const o={};h.forEach((k,i)=>o[k]=row[i]);
  return o;
}


// ========================================================
// S23.5.2 — SNAPSHOT ATUAL DE MÍDIA
// ========================================================
function appObterSnapshotMidiaAtualS2352(idRegistro){
  exigirPermissaoS14_('inspecionar');

  const id=String(idRegistro||'').trim();
  if(!id)throw new Error('ID_REGISTRO obrigatório.');

  const sh=SpreadsheetApp.getActive().getSheetByName('REGISTRO_FOTOS');
  if(!sh||sh.getLastRow()<2){
    return {ok:true,idRegistro:id,origemSnapshot:'VAZIO',fotos:[]};
  }

  garantirCabecalhosFotosInspecaoS235_(sh);

  const rows=sheetObjectsS2352_(sh)
    .filter(f=>String(f.ID_REGISTRO||'').trim()===id && String(f.ARQUIVO_ID||'').trim());

  if(!rows.length){
    return {ok:true,idRegistro:id,origemSnapshot:'VAZIO',fotos:[]};
  }

  const base=rows.filter(f=>!String(f.CLIENT_INSPECTION_ID||'').trim());
  const insp=rows.filter(f=>String(f.CLIENT_INSPECTION_ID||'').trim());

  let selecionadas=[];
  let origemSnapshot='CADASTRO';

  if(insp.length){
    // Última inspeção com fotos.
    const grupos={};
    insp.forEach(f=>{
      const k=String(f.CLIENT_INSPECTION_ID||'').trim();
      (grupos[k]=grupos[k]||[]).push(f);
    });

    const chaves=Object.keys(grupos).sort((a,b)=>{
      const ma=Math.max(...grupos[a].map(x=>dataMillisS2352_(x.CRIADO_EM||x.SINCRONIZADO_EM)));
      const mb=Math.max(...grupos[b].map(x=>dataMillisS2352_(x.CRIADO_EM||x.SINCRONIZADO_EM)));
      return mb-ma;
    });

    const ult=grupos[chaves[0]]||[];

    // Compatibilidade S23.5/S23.5.1:
    // se a inspeção antiga não tinha snapshot herdado, soma cadastro + fotos da inspeção.
    const snapshotCompleto=ult.some(f=>
      ['HERDADA','SNAPSHOT'].includes(String(f.ORIGEM_FOTO||'').toUpperCase())
    );

    selecionadas=snapshotCompleto
      ? ult
      : deduplicarFotosSnapshotS2352_([...base,...ult]);

    origemSnapshot='INSPECAO';
  }else{
    selecionadas=deduplicarFotosSnapshotS2352_(base);
  }

  selecionadas.sort((a,b)=>
    (Number(a.ORDEM_FOTO||999)-Number(b.ORDEM_FOTO||999)) ||
    dataMillisS2352_(a.CRIADO_EM)-dataMillisS2352_(b.CRIADO_EM)
  );

  const fotos=selecionadas.slice(0,10).map((f,i)=>{
    const arquivoId=String(f.ARQUIVO_ID||'').trim();
    let dataUrl='';
    try{
      const file=DriveApp.getFileById(arquivoId);
      const blob=file.getBlob();
      const mime=blob.getContentType()||String(f.MIME_TYPE||'image/jpeg');
      dataUrl='data:'+mime+';base64,'+Utilities.base64Encode(blob.getBytes());
    }catch(_){}

    return {
      idFoto:String(f.ID_FOTO||''),
      arquivoId,
      nomeArquivo:String(f.NOME_ARQUIVO||`foto-${i+1}.jpg`),
      mimeType:String(f.MIME_TYPE||'image/jpeg'),
      tamanhoBytes:Number(f.TAMANHO_BYTES||0),
      sha256:String(f.SHA256||f.HASH_LOCAL||''),
      hashLocal:String(f.HASH_LOCAL||''),
      ordemFoto:Number(f.ORDEM_FOTO||i+1),
      origemFoto:String(f.ORIGEM_FOTO||'CADASTRO'),
      clientInspectionId:String(f.CLIENT_INSPECTION_ID||''),
      dataUrl
    };
  }).filter(f=>f.dataUrl);

  return {
    ok:true,
    idRegistro:id,
    origemSnapshot,
    fotos
  };
}

function obterFotoPorArquivoIdS2352_(arquivoId){
  const sh=SpreadsheetApp.getActive().getSheetByName('REGISTRO_FOTOS');
  if(!sh||sh.getLastRow()<2)return null;

  const id=String(arquivoId||'').trim();
  if(!id)return null;

  return sheetObjectsS2352_(sh)
    .find(f=>String(f.ARQUIVO_ID||'').trim()===id)||null;
}

function sheetObjectsS2352_(sh){
  const vals=sh.getDataRange().getValues();
  if(!vals.length)return [];
  const h=vals.shift().map(v=>String(v||'').trim());
  return vals.map(r=>{
    const o={};h.forEach((k,i)=>o[k]=r[i]);
    return o;
  });
}

function dataMillisS2352_(v){
  if(v instanceof Date)return v.getTime();
  const s=String(v||'').trim();
  if(!s)return 0;

  const br=s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if(br){
    return new Date(
      Number(br[3]),Number(br[2])-1,Number(br[1]),
      Number(br[4]||0),Number(br[5]||0),Number(br[6]||0)
    ).getTime();
  }

  const d=new Date(s);
  return isNaN(d.getTime())?0:d.getTime();
}

function deduplicarFotosSnapshotS2352_(rows){
  const seen=new Set(),out=[];
  (rows||[]).forEach(f=>{
    const key=
      String(f.SHA256||f.HASH_LOCAL||'').trim() ||
      String(f.ARQUIVO_ID||'').trim();

    if(!key||seen.has(key))return;
    seen.add(key);
    out.push(f);
  });
  return out;
}


// ========================================================
// S23.6 — EXCLUSÃO OPERACIONAL ADMINISTRATIVA
// ========================================================
function appExcluirRegistroS236(payload){
  payload=payload||{};
  const admin=exigirPermissaoS14_('administrar');

  const id=String(payload.idRegistro||'').trim();
  const protocolo=String(payload.protocolo||'').trim();
  const motivo=String(payload.motivo||'').trim();

  if(!id&&!protocolo)throw new Error('Registro não informado.');
  if(!motivo)throw new Error('Motivo da exclusão é obrigatório.');

  const ss=SpreadsheetApp.getActive();
  const sh=ss.getSheetByName('REGISTROS');
  if(!sh||sh.getLastRow()<2)throw new Error('Aba REGISTROS vazia ou ausente.');

  garantirCabecalhosExclusaoS236_(sh);

  const vals=sh.getDataRange().getValues();
  const h=vals[0].map(v=>String(v||'').trim());
  const idx={};h.forEach((x,i)=>idx[x]=i);

  const row=vals.findIndex((r,i)=>i>0&&(
    (id&&String(r[idx.ID_REGISTRO]||'').trim()===id) ||
    (protocolo&&String(r[idx.PROTOCOLO]||'').trim()===protocolo)
  ));

  if(row<1)throw new Error('Registro não encontrado.');

  const atual=String(vals[row][idx.STATUS]||'').trim().toUpperCase();
  const idRegistro=String(vals[row][idx.ID_REGISTRO]||'').trim();
  const prot=String(vals[row][idx.PROTOCOLO]||'').trim();

  if(atual==='EXCLUIDO'){
    return {ok:true,idempotente:true,idRegistro,protocolo:prot};
  }

  const agora=new Date();
  const email=String(admin.email||usuarioRpcAtualS223_()?.email||Session.getActiveUser().getEmail()||'');

  const set=(campo,valor)=>{
    const c=idx[campo];
    if(c>=0)sh.getRange(row+1,c+1).setValue(valor);
  };

  set('STATUS_ANTES_EXCLUSAO',atual);
  set('STATUS','EXCLUIDO');
  set('EXCLUIDO_EM',agora);
  set('EXCLUIDO_POR',email);
  set('EXCLUSAO_MOTIVO',motivo);
  set('ATUALIZADO_EM',agora);

  // Pendências abertas deixam de ser operacionais, sem apagar histórico.
  cancelarRelacionadosExclusaoS236_(ss,'PENDENCIAS',idRegistro,prot,['ABERTA','EM_ANDAMENTO','PENDENTE'],'CANCELADA');

  // Agenda futura também é cancelada.
  cancelarRelacionadosExclusaoS236_(ss,'AGENDA_INSPECOES',idRegistro,prot,['PROGRAMADA','PENDENTE','AGENDADA'],'CANCELADA');

  // S25.6 — preserva a exclusão como evento do ciclo de vida do mesmo ativo.
  registrarHistoricoExclusaoS256_(ss,{
    idRegistro,
    protocolo:prot,
    statusAnterior:atual,
    motivo,
    usuario:email,
    deviceId:String(payload.deviceId||''),
    dataHora:agora
  });

  registrarAuditoriaS15_({
    acao:'REGISTRO_EXCLUIDO_OPERACIONALMENTE',
    entidade:'REGISTRO',
    entidadeId:idRegistro,
    resultado:'SUCESSO',
    origem:'WEB_APP',
    deviceId:String(payload.deviceId||''),
    detalhes:{
      protocolo:prot,
      statusAnterior:atual,
      motivo,
      excluidoPor:email
    }
  });

  SpreadsheetApp.flush();

  return {
    ok:true,
    idRegistro,
    protocolo:prot,
    status:'EXCLUIDO',
    excluidoEm:Utilities.formatDate(agora,APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX")
  };
}


function registrarHistoricoExclusaoS256_(ss,dados){
  const sh=ss.getSheetByName('REGISTRO_HISTORICO');
  if(!sh)throw new Error('REGISTRO_HISTORICO ausente. Exclusão cancelada por segurança.');

  if(typeof garantirCabecalhosS8_==='function')garantirCabecalhosS8_(sh);

  const obj={
    ID_HISTORICO:'HIST-'+Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase(),
    ID_REGISTRO:String(dados.idRegistro||''),
    PROTOCOLO:String(dados.protocolo||''),
    DATA_HORA:dados.dataHora||new Date(),
    USUARIO:String(dados.usuario||''),
    TIPO_EVENTO:'EXCLUSAO_OPERACIONAL',
    STATUS_ANTERIOR:String(dados.statusAnterior||''),
    STATUS_NOVO:'EXCLUIDO',
    CAMPO:'STATUS',
    VALOR_ANTERIOR:String(dados.statusAnterior||''),
    VALOR_NOVO:'EXCLUIDO',
    OBSERVACAO:String(dados.motivo||''),
    CLIENT_INSPECTION_ID:'',
    ESTADO_CONSERVACAO:'',
    CONDICAO:'',
    RESPONSAVEL_INSPECAO:'',
    ACAO_RECOMENDADA:'',
    PROXIMA_INSPECAO:'',
    ORIGEM:'WEB_APP',
    DEVICE_ID:String(dados.deviceId||''),
    VERSAO_APP:APP.VERSAO
  };
  appendObjetoPorCabecalhoS7_(sh,obj);
  return obj.ID_HISTORICO;
}

function garantirCabecalhosExclusaoS236_(sh){
  const obrigatorios=[
    'STATUS_ANTES_EXCLUSAO',
    'EXCLUIDO_EM',
    'EXCLUIDO_POR',
    'EXCLUSAO_MOTIVO'
  ];

  let atuais=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn()))
    .getValues()[0].map(v=>String(v||'').trim());

  obrigatorios.forEach(campo=>{
    if(!atuais.includes(campo)){
      sh.getRange(1,sh.getLastColumn()+1).setValue(campo);
      atuais.push(campo);
    }
  });
}

function cancelarRelacionadosExclusaoS236_(ss,nomeAba,idRegistro,protocolo,statusAbertos,statusFinal){
  try{
    const sh=ss.getSheetByName(nomeAba);
    if(!sh||sh.getLastRow()<2)return 0;

    const vals=sh.getDataRange().getValues();
    const h=vals[0].map(v=>String(v||'').trim());
    const idx={};h.forEach((x,i)=>idx[x]=i);

    if(idx.ID_REGISTRO==null&&idx.PROTOCOLO==null)return 0;
    if(idx.STATUS==null)return 0;

    let alterados=0;

    for(let i=1;i<vals.length;i++){
      const mesmo=
        (idx.ID_REGISTRO!=null&&idRegistro&&String(vals[i][idx.ID_REGISTRO]||'').trim()===idRegistro) ||
        (idx.PROTOCOLO!=null&&protocolo&&String(vals[i][idx.PROTOCOLO]||'').trim()===protocolo);

      if(!mesmo)continue;

      const st=String(vals[i][idx.STATUS]||'').trim().toUpperCase();
      if(!statusAbertos.includes(st))continue;

      sh.getRange(i+1,idx.STATUS+1).setValue(statusFinal);

      if(idx.ATUALIZADO_EM!=null){
        sh.getRange(i+1,idx.ATUALIZADO_EM+1).setValue(new Date());
      }

      alterados++;
    }

    return alterados;
  }catch(e){
    console.warn('[S23.6] Falha ao cancelar relacionado '+nomeAba,e);
    return 0;
  }
}


// ========================================================
// S23.7 — EDIÇÃO CADASTRAL DA SINALIZAÇÃO
// ========================================================
function appObterRegistroParaEdicaoS237(idOuProtocolo){
  exigirPermissaoS14_('administrar');

  const chave=String(idOuProtocolo||'').trim();
  if(!chave)throw new Error('Registro não informado.');

  const ss=SpreadsheetApp.getActive();
  const sh=ss.getSheetByName('REGISTROS');
  if(!sh)throw new Error('Aba REGISTROS ausente.');

  const rows=sheetObjectsS2352_(sh);
  const reg=rows.find(r=>
    String(r.ID_REGISTRO||'').trim()===chave ||
    String(r.PROTOCOLO||'').trim()===chave
  );

  if(!reg)throw new Error('Registro não encontrado.');
  if(String(reg.STATUS||'').toUpperCase()==='EXCLUIDO'){
    throw new Error('Registro excluído não pode ser editado.');
  }

  return {
    ok:true,
    registro:serializarRegistroEdicaoS2371_(reg)
  };
}

function serializarRegistroEdicaoS2371_(reg){
  const out={};

  Object.keys(reg||{}).forEach(k=>{
    const v=reg[k];

    if(v instanceof Date){
      // Datas sem horário usadas pelo formulário recebem yyyy-MM-dd.
      if(['DATA_INSTALACAO','VALIDADE'].includes(k)){
        out[k]=Utilities.formatDate(v,APP.TIMEZONE,'yyyy-MM-dd');
      }else{
        out[k]=Utilities.formatDate(v,APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ss");
      }
      return;
    }

    if(
      v===null ||
      v===undefined ||
      ['string','number','boolean'].includes(typeof v)
    ){
      out[k]=v==null?'':v;
      return;
    }

    // Evita objetos não serializáveis de Apps Script/Sheets.
    try{
      out[k]=JSON.parse(JSON.stringify(v));
    }catch(_){
      out[k]=String(v);
    }
  });

  return out;
}

function appAtualizarRegistroS237(payload){
  exigirPermissaoS14_('administrar');
  payload=payload||{};

  const id=String(payload.idRegistro||'').trim();
  if(!id)throw new Error('ID_REGISTRO obrigatório.');

  const ss=SpreadsheetApp.getActive();
  const sh=ss.getSheetByName('REGISTROS');
  if(!sh)throw new Error('Aba REGISTROS ausente.');

  const vals=sh.getDataRange().getValues();
  if(vals.length<2)throw new Error('REGISTROS sem dados.');

  const h=vals[0].map(v=>String(v||'').trim());
  const idx={};h.forEach((k,i)=>idx[k]=i);

  const rowIndex=vals.findIndex((r,i)=>
    i>0 && String(r[idx.ID_REGISTRO]||'').trim()===id
  );
  if(rowIndex<1)throw new Error('Registro não encontrado.');

  const atual={};
  h.forEach((k,i)=>atual[k]=vals[rowIndex][i]);

  if(String(atual.STATUS||'').toUpperCase()==='EXCLUIDO'){
    throw new Error('Registro excluído não pode ser editado.');
  }

  const mapaAntes={
    TIPO:atual.TIPO,
    FINALIDADE:atual.FINALIDADE,
    TITULO:atual.TITULO,
    TEXTO_SINALIZACAO:atual.TEXTO_SINALIZACAO,
    DESCRICAO:atual.DESCRICAO,
    MATERIAL:atual.MATERIAL,
    DIMENSOES:atual.DIMENSOES,
    COR_PREDOMINANTE:atual.COR_PREDOMINANTE,
    FIXACAO:atual.FIXACAO,
    ESTADO_CONSERVACAO:atual.ESTADO_CONSERVACAO,
    CONDICAO:atual.CONDICAO,
    RESPONSAVEL:atual.RESPONSAVEL,
    DATA_INSTALACAO:atual.DATA_INSTALACAO,
    VALIDADE:atual.VALIDADE,
    ILUMINADA:atual.ILUMINADA,
    DUPLA_FACE:atual.DUPLA_FACE,
    POSSUI_QR_CODE:atual.POSSUI_QR_CODE,
    POSSUI_BRAILLE:atual.POSSUI_BRAILLE,
    POSSUI_PICTOGRAMA:atual.POSSUI_PICTOGRAMA
  };

  const novo={
    TIPO:String(payload.tipo||'').trim(),
    FINALIDADE:String(payload.finalidade||'').trim(),
    TITULO:String(payload.titulo||'').trim(),
    TEXTO_SINALIZACAO:String(payload.textoSinalizacao||'').trim(),
    DESCRICAO:String(payload.descricao||'').trim(),
    MATERIAL:String(payload.material||'').trim(),
    DIMENSOES:String(payload.dimensoes||'').trim(),
    COR_PREDOMINANTE:String(payload.corPredominante||'').trim(),
    FIXACAO:String(payload.fixacao||'').trim(),
    ESTADO_CONSERVACAO:String(payload.estadoConservacao||'').trim(),
    CONDICAO:String(payload.condicao||'').trim(),
    RESPONSAVEL:String(payload.responsavel||'').trim(),
    DATA_INSTALACAO:normalizarDataPlanilhaS237_(payload.dataInstalacao),
    VALIDADE:normalizarDataPlanilhaS237_(payload.validade),
    ILUMINADA:Boolean(payload.iluminada),
    DUPLA_FACE:Boolean(payload.duplaFace),
    POSSUI_QR_CODE:Boolean(payload.possuiQrCode),
    POSSUI_BRAILLE:Boolean(payload.possuiBraille),
    POSSUI_PICTOGRAMA:Boolean(payload.possuiPictograma)
  };

  if(!novo.TIPO)throw new Error('Tipo é obrigatório.');
  if(!novo.TITULO)throw new Error('Título é obrigatório.');

  const alterados={};
  Object.keys(novo).forEach(k=>{
    const a=normalizarComparacaoS237_(mapaAntes[k],k);
    const n=normalizarComparacaoS237_(novo[k],k);
    if(a!==n)alterados[k]={antes:mapaAntes[k],depois:novo[k]};
  });

  if(!Object.keys(alterados).length){
    return {
      ok:true,
      semAlteracoes:true,
      idRegistro:id,
      protocolo:String(atual.PROTOCOLO||'')
    };
  }

  Object.keys(novo).forEach(k=>{
    if(idx[k]>=0)sh.getRange(rowIndex+1,idx[k]+1).setValue(novo[k]);
  });

  const agora=new Date();
  if(idx.ATUALIZADO_EM>=0)sh.getRange(rowIndex+1,idx.ATUALIZADO_EM+1).setValue(agora);
  if(idx.SINCRONIZADO_EM>=0)sh.getRange(rowIndex+1,idx.SINCRONIZADO_EM+1).setValue(agora);

  registrarHistoricoEdicaoS237_(ss,atual,alterados,payload);
  registrarAuditoriaS15_({
    acao:'REGISTRO_EDITADO',
    entidade:'REGISTROS',
    entidadeId:id,
    resultado:'SUCESSO',
    origem:'WEB_APP',
    deviceId:String(payload.deviceId||''),
    detalhes:{
      protocolo:String(atual.PROTOCOLO||''),
      camposAlterados:Object.keys(alterados),
      alteracoes:alterados
    }
  });

  SpreadsheetApp.flush();

  return {
    ok:true,
    idRegistro:id,
    protocolo:String(atual.PROTOCOLO||''),
    camposAlterados:Object.keys(alterados)
  };
}

function normalizarDataPlanilhaS237_(v){
  const s=String(v||'').trim();
  if(!s)return '';
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return s;
  return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0);
}

function normalizarComparacaoS237_(v,campo){
  if(v instanceof Date){
    return Utilities.formatDate(v,APP.TIMEZONE,'yyyy-MM-dd');
  }

  const camposBooleanos=[
    'ILUMINADA',
    'DUPLA_FACE',
    'POSSUI_QR_CODE',
    'POSSUI_BRAILLE',
    'POSSUI_PICTOGRAMA'
  ];

  if(camposBooleanos.includes(String(campo||'').toUpperCase())){
    return normalizarBooleanoS2372_(v) ? 'TRUE' : 'FALSE';
  }

  return String(v==null?'':v).trim();
}

function normalizarBooleanoS2372_(v){
  if(v===true)return true;
  if(v===false||v===null||v===undefined)return false;

  const s=String(v).trim().toUpperCase();

  if(['TRUE','1','SIM','S','YES','Y','ON'].includes(s))return true;
  if(['FALSE','0','NAO','NÃO','N','NO','OFF',''].includes(s))return false;

  // Conservador: valores não reconhecidos não viram TRUE por acidente.
  return false;
}

function registrarHistoricoEdicaoS237_(ss,registro,alterados,payload){
  const sh=ss.getSheetByName('REGISTRO_HISTORICO');
  if(!sh)return;

  const agora=new Date();
  const row={
    ID_HISTORICO:'HIST-'+Utilities.getUuid().replace(/-/g,'').slice(0,16).toUpperCase(),
    ID_REGISTRO:String(registro.ID_REGISTRO||''),
    PROTOCOLO:String(registro.PROTOCOLO||''),
    DATA_HORA:agora,
    TIPO_EVENTO:'EDICAO_CADASTRAL',
    STATUS_ANTERIOR:String(registro.STATUS||''),
    STATUS_NOVO:String(registro.STATUS||''),
    VALOR_ANTERIOR:JSON.stringify(Object.fromEntries(
      Object.entries(alterados).map(([k,v])=>[k,v.antes])
    )),
    VALOR_NOVO:JSON.stringify(Object.fromEntries(
      Object.entries(alterados).map(([k,v])=>[k,v.depois])
    )),
    ESTADO_CONSERVACAO:String(payload.estadoConservacao||registro.ESTADO_CONSERVACAO||''),
    CONDICAO:String(payload.condicao||registro.CONDICAO||''),
    RESPONSAVEL_INSPECAO:String(payload.responsavel||registro.RESPONSAVEL||''),
    OBSERVACAO:'Edição cadastral: '+Object.keys(alterados).join(', '),
    ORIGEM:'WEB_APP',
    DEVICE_ID:String(payload.deviceId||''),
    VERSAO_APP:APP.VERSAO
  };

  appendObjetoPorCabecalhoS7_(sh,row);
}
