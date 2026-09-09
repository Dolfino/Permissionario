// SETUP ATUAL — S26.7
// setupAtual() é o único ponto de entrada recomendado para setup corrente.
// Os setupS25x/setupS26x anteriores permanecem como migrações históricas e não devem ser renomeados.
function setupAtual(){ return setupS267(); }

// S26.6.2-D — Proteção de metadados contra execução acidental de setup histórico.
// Os setups anteriores continuam disponíveis para rastreabilidade/migração, mas
// não podem rebaixar APP_VERSAO/APP_FASE quando CONFIG já está em fase posterior.
function s266NumeroFaseSetup_(fase){
  const m=String(fase||'').trim().match(/^S(\d+)(?:\.(\d+))?/i);
  if(!m)return null;
  return (Number(m[1]) * 1000) + Number(m[2] || 0);
}

function s266LerValorConfigSetup_(cfg,chave){
  if(!cfg || cfg.getLastRow()<2)return '';
  const vals=cfg.getRange(2,1,cfg.getLastRow()-1,2).getValues();
  for(let i=0;i<vals.length;i++){
    if(String(vals[i][0]||'').trim()===String(chave||'').trim())return String(vals[i][1]||'').trim();
  }
  return '';
}

function s266GravarVersaoFaseProtegida_(cfg,versaoAlvo,faseAlvo,descricaoFase){
  const faseAtual=s266LerValorConfigSetup_(cfg,'APP_FASE');
  const nAtual=s266NumeroFaseSetup_(faseAtual);
  const nAlvo=s266NumeroFaseSetup_(faseAlvo);
  const preservar=nAtual!==null && nAlvo!==null && nAtual>nAlvo;
  if(preservar){
    return {
      protegido:true,
      faseAtual:faseAtual,
      versaoAtual:s266LerValorConfigSetup_(cfg,'APP_VERSAO'),
      faseSolicitada:String(faseAlvo||''),
      versaoSolicitada:String(versaoAlvo||'')
    };
  }
  setConfigValue_(cfg,'APP_VERSAO',versaoAlvo,'Versão atualmente instalada');
  setConfigValue_(cfg,'APP_FASE',faseAlvo,descricaoFase||'Fase atualmente instalada');
  return {
    protegido:false,
    faseAtual:String(faseAlvo||''),
    versaoAtual:String(versaoAlvo||''),
    faseSolicitada:String(faseAlvo||''),
    versaoSolicitada:String(versaoAlvo||'')
  };
}

function setupS257(){
  exigirPermissaoS14_('administrar');

  // S25.7 é autossuficiente: não depende de setupS256()/setupS2551(), pois
  // SetupService.gs é substituído durante a implantação e os setups anteriores
  // podem não estar mais presentes no projeto. Apenas garante estruturas já
  // validadas, sem recriar dados nem reprocessar grandes volumes.
  const ss=SpreadsheetApp.getActive();
  const cfg=ss.getSheetByName('CONFIG');
  const reg=ss.getSheetByName('REGISTROS');
  const hist=ss.getSheetByName('REGISTRO_HISTORICO');
  if(!cfg)throw new Error('CONFIG ausente.');
  if(!reg)throw new Error('REGISTROS ausente.');
  if(!hist)throw new Error('REGISTRO_HISTORICO ausente.');

  if(typeof garantirCabecalhosExclusaoS236_!=='function')
    throw new Error('Helper garantirCabecalhosExclusaoS236_ indisponível.');
  garantirCabecalhosExclusaoS236_(reg);

  if(typeof garantirCabecalhosS8_==='function')
    garantirCabecalhosS8_(hist);

  s266GravarVersaoFaseProtegida_(cfg,APP.VERSAO,'S25.7','Encerramento / Hardening');
  setConfigValue_(cfg,'S257_STATUS','INSTALADO','Hardening conservador e diagnóstico consolidado');
  setConfigValue_(cfg,'S257_DUPLICIDADES_PUBLICAS','SANITIZADAS','Wrappers públicos de inspeção consolidados');
  setConfigValue_(cfg,'S257_SETUP_AUTOSSUFICIENTE','SIM','Hotfix 3.22.1: setup sem dependência de fases anteriores');
  setConfigValue_(cfg,'S257_INSTALADO_EM',Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),'Data/hora da instalação S25.7');
  SpreadsheetApp.flush();
  return diagnosticoS257();
}

function diagnosticoS257(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=lerConfigComoObjeto_(ss);
  const checks=[];

  check_(checks,'APP_ID',APP.ID==='SINALIZACAO_MALL',APP.ID);
  check_(checks,'APP_VERSAO',cfg.APP_VERSAO===APP.VERSAO,cfg.APP_VERSAO||'ausente');
  check_(checks,'APP_FASE',cfg.APP_FASE==='S25.7',cfg.APP_FASE||'ausente');
  check_(checks,'S257_STATUS',cfg.S257_STATUS==='INSTALADO',cfg.S257_STATUS||'ausente');
  check_(checks,'S257_SETUP_AUTOSSUFICIENTE',cfg.S257_SETUP_AUTOSSUFICIENTE==='SIM',cfg.S257_SETUP_AUTOSSUFICIENTE||'ausente');
  check_(checks,'TIMEZONE',APP.TIMEZONE==='America/Fortaleza',APP.TIMEZONE);
  check_(checks,'MODO_DADOS',APP.MODO_DADOS==='LOCAL_INDEPENDENTE',APP.MODO_DADOS);

  const abasObrigatorias=[
    'CONFIG','REGISTROS','REGISTRO_FOTOS','REGISTRO_HISTORICO','USUARIOS',
    'MAPAS_SETORES','PLANTAS','MAPA_TRANSFORMACOES','MAPA_AREAS_NIVEL',
    'CARTOGRAFIA_HISTORICO','CARTOGRAFIA_PUBLICACOES'
  ];
  abasObrigatorias.forEach(nome=>check_(checks,'ABA_'+nome,!!ss.getSheetByName(nome),nome));

  const reg=ss.getSheetByName('REGISTROS');
  const hist=ss.getSheetByName('REGISTRO_HISTORICO');
  const fotos=ss.getSheetByName('REGISTRO_FOTOS');
  const pubs=ss.getSheetByName('CARTOGRAFIA_PUBLICACOES');

  if(reg){
    const h=cabecalhosS257_(reg);
    ['ID_REGISTRO','PROTOCOLO','STATUS','MAPA_ID','X','Y','STATUS_ANTES_EXCLUSAO','EXCLUIDO_EM','EXCLUIDO_POR','EXCLUSAO_MOTIVO']
      .forEach(k=>check_(checks,'REG_'+k,h.includes(k),h.includes(k)?'OK':'ausente'));
  }
  if(hist){
    const h=cabecalhosS257_(hist);
    ['ID_HISTORICO','ID_REGISTRO','PROTOCOLO','TIPO_EVENTO']
      .forEach(k=>check_(checks,'HIST_'+k,h.includes(k),h.includes(k)?'OK':'ausente'));
  }
  if(fotos){
    const h=cabecalhosS257_(fotos);
    check_(checks,'FOTOS_ID_REGISTRO',h.includes('ID_REGISTRO'),'ID_REGISTRO');
  }

  // APIs críticas. Não executa operações pesadas; apenas confirma disponibilidade.
  [
    ['API_MAPA',typeof appListarRegistrosMapaS4==='function','appListarRegistrosMapaS4'],
    ['API_EXCLUSAO',typeof appExcluirRegistroS236==='function','appExcluirRegistroS236'],
    ['API_INSPECAO',typeof appRegistrarInspecaoS10==='function','appRegistrarInspecaoS10'],
    ['API_SYNC_INSPECAO',typeof appSincronizarInspecaoS9==='function','appSincronizarInspecaoS9'],
    ['INSPECAO_CORE',typeof registrarInspecaoComPendenciaS10_==='function','registrarInspecaoComPendenciaS10_'],
    ['SYNC_CORE',typeof sincronizarInspecaoComPendenciaS10_==='function','sincronizarInspecaoComPendenciaS10_'],
    ['API_SNAPSHOT',typeof appCriarSnapshotCartograficoS253==='function','appCriarSnapshotCartograficoS253'],
    ['API_RESTAURACAO',typeof appRestaurarSnapshotCartograficoS254==='function','appRestaurarSnapshotCartograficoS254'],
    ['API_RASCUNHO',typeof appCriarRascunhoCartograficoS255==='function','appCriarRascunhoCartograficoS255'],
    ['API_VALIDACAO',typeof appEnviarValidacaoCartograficaS255==='function','appEnviarValidacaoCartograficaS255'],
    ['API_PUBLICACAO',typeof appPublicarCartografiaS255==='function','appPublicarCartografiaS255'],
    ['API_BACKUP',typeof appCriarBackupS16==='function','appCriarBackupS16'],
    ['RELATORIO_SLIDES',typeof s231LerRegistros_==='function','s231LerRegistros_'],
    ['S231_CARREGADO',typeof S231!=='undefined','const S231']
  ].forEach(c=>check_(checks,c[0],c[1],c[2]));

  const metricas={
    registros:contarLinhasDadosS257_(reg),
    fotos:contarLinhasDadosS257_(fotos),
    historico:contarLinhasDadosS257_(hist),
    excluidos:contarValorColunaS257_(reg,'STATUS','EXCLUIDO'),
    exclusoesHistorico:contarValorColunaS257_(hist,'TIPO_EVENTO','EXCLUSAO_OPERACIONAL'),
    publicacoes:contarLinhasDadosS257_(pubs)
  };

  return {
    ok:checks.every(c=>c.ok),
    version:APP.VERSAO,
    fase:APP.FASE,
    totalChecks:checks.length,
    falhas:checks.filter(c=>!c.ok).length,
    checks,
    metricas,
    observacoes:[
      'Diagnóstico S25.7 é deliberadamente leve e não executa restauração, publicação, backup ou snapshot.',
      'Snapshot final e backup final possuem funções separadas para reduzir risco de timeout.'
    ]
  };
}

function mostrarDiagnosticoS257(){
  const d=diagnosticoS257();
  SpreadsheetApp.getUi().alert(
    'Diagnóstico S25.7',
    `${d.ok?'S25.7 PRONTA PARA GATE':'HÁ PENDÊNCIAS'}\n\n`+
    `Versão: ${d.version}\nChecks: ${d.totalChecks}\nFalhas: ${d.falhas}\n`+
    `Registros: ${d.metricas.registros}\nExcluídos: ${d.metricas.excluidos}\n`+
    `Exclusões no histórico: ${d.metricas.exclusoesHistorico}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return d;
}

function criarSnapshotFinalS257(motivo){
  exigirPermissaoS14_('administrar');
  if(typeof appCriarSnapshotCartograficoS253!=='function')throw new Error('API de snapshot cartográfico indisponível.');
  return appCriarSnapshotCartograficoS253(String(motivo||'S25.7 — snapshot final da release estável'));
}

function criarBackupFinalS257(observacao){
  exigirPermissaoS14_('administrar');
  if(typeof appCriarBackupS16!=='function')throw new Error('API de backup S16 indisponível.');
  return appCriarBackupS16(String(observacao||'S25.7 — backup final da release estável'));
}

function cabecalhosS257_(sh){
  if(!sh||sh.getLastColumn()<1)return[];
  return sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(v=>String(v||'').trim());
}

function contarLinhasDadosS257_(sh){
  return !sh?0:Math.max(0,sh.getLastRow()-1);
}

function contarValorColunaS257_(sh,cabecalho,valor){
  if(!sh||sh.getLastRow()<2)return 0;
  const h=cabecalhosS257_(sh);
  const col=h.indexOf(cabecalho);
  if(col<0)return 0;
  const alvo=String(valor||'').trim().toUpperCase();
  return sh.getRange(2,col+1,sh.getLastRow()-1,1).getValues()
    .reduce((n,r)=>n+(String(r[0]||'').trim().toUpperCase()===alvo?1:0),0);
}


// ========================================================
// S26.1 — CENTRAL DE CAMADAS BASE
// ========================================================
function setupS261(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=ss.getSheetByName('CONFIG');
  const reg=ss.getSheetByName('REGISTROS');
  if(!cfg)throw new Error('CONFIG ausente.');
  if(!reg)throw new Error('REGISTROS ausente.');

  // S26.1 não cria tabela nem altera dados operacionais. Registra apenas
  // o checkpoint da nova camada de apresentação.
  s266GravarVersaoFaseProtegida_(cfg,APP.VERSAO,'S26.1','Central de Camadas Base');
  setConfigValue_(cfg,'S261_STATUS','INSTALADO','Central de Camadas Base instalada');
  setConfigValue_(cfg,'S261_MODO','FRONTEND_LOCAL','Visibilidade e contadores processados no navegador');
  setConfigValue_(cfg,'S261_ALTERA_REGISTROS','NAO','S26.1 não altera REGISTROS ao ligar/desligar camadas');
  setConfigValue_(cfg,'S261_INSTALADO_EM',Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),'Data/hora da instalação S26.1');
  SpreadsheetApp.flush();
  return diagnosticoS261();
}

function diagnosticoS261(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=lerConfigComoObjeto_(ss);
  const checks=[];

  check_(checks,'APP_VERSAO',APP.VERSAO==='MVP-3.23.1-SINALIZACAO-S26.1.1',APP.VERSAO);
  check_(checks,'APP_FASE',APP.FASE==='S26.1',APP.FASE);
  check_(checks,'CONFIG_APP_VERSAO',cfg.APP_VERSAO===APP.VERSAO,cfg.APP_VERSAO||'ausente');
  check_(checks,'CONFIG_APP_FASE',cfg.APP_FASE==='S26.1',cfg.APP_FASE||'ausente');
  check_(checks,'S261_STATUS',cfg.S261_STATUS==='INSTALADO',cfg.S261_STATUS||'ausente');
  check_(checks,'S261_MODO',cfg.S261_MODO==='FRONTEND_LOCAL',cfg.S261_MODO||'ausente');
  check_(checks,'S261_NAO_ALTERA_REGISTROS',cfg.S261_ALTERA_REGISTROS==='NAO',cfg.S261_ALTERA_REGISTROS||'ausente');
  check_(checks,'MODO_DADOS',APP.MODO_DADOS==='LOCAL_INDEPENDENTE',APP.MODO_DADOS);
  check_(checks,'TIMEZONE',APP.TIMEZONE==='America/Fortaleza',APP.TIMEZONE);

  ['REGISTROS','MAPAS_SETORES','PLANTAS','CONFIG'].forEach(nome=>
    check_(checks,'ABA_'+nome,!!ss.getSheetByName(nome),nome)
  );

  [
    ['API_CAMADAS',typeof appObterCamadasS2==='function','appObterCamadasS2'],
    ['API_SIG_MAPA',typeof appListarRegistrosMapaS4==='function','appListarRegistrosMapaS4'],
    ['API_SIG_NIVEL',typeof appListarRegistrosNivelS242==='function','appListarRegistrosNivelS242'],
    ['API_EXCLUSAO',typeof appExcluirRegistroS236==='function','appExcluirRegistroS236']
  ].forEach(c=>check_(checks,c[0],c[1],c[2]));

  return {
    ok:checks.every(c=>c.ok),
    version:APP.VERSAO,
    fase:APP.FASE,
    totalChecks:checks.length,
    falhas:checks.filter(c=>!c.ok).length,
    checks,
    gate:[
      'Painel rápido continua ligando/desligando as quatro camadas.',
      'Gerenciar camadas abre a Central e mantém estados sincronizados.',
      'Contadores refletem os itens carregados no mapa atual.',
      'Restaurar padrão reativa todas as camadas.',
      'Operação offline continua disponível sem chamada adicional para alternar camadas.'
    ]
  };
}

function mostrarDiagnosticoS261(){
  const d=diagnosticoS261();
  SpreadsheetApp.getUi().alert(
    'Diagnóstico S26.1',
    `${d.ok?'S26.1 PRONTA PARA GATE':'HÁ PENDÊNCIAS'}\n\n`+
    `Versão: ${d.version}\nChecks: ${d.totalChecks}\nFalhas: ${d.falhas}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return d;
}


// ========================================================
// S26.2 — PESQUISA E FILTROS DE SINALIZAÇÕES
// ========================================================
function setupS262(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=ss.getSheetByName('CONFIG');
  const reg=ss.getSheetByName('REGISTROS');
  const VERSION='MVP-3.24.0-SINALIZACAO-S26.2';
  const PHASE='S26.2';
  const TIMEZONE='America/Fortaleza';
  if(!cfg)throw new Error('CONFIG ausente.');
  if(!reg)throw new Error('REGISTROS ausente.');

  // S26.2 é exclusivamente uma camada de visualização no navegador.
  // O setup é autossuficiente e não depende do objeto global APP.
  // Não cria colunas, não altera REGISTROS e não toca na cartografia publicada.
  s266GravarVersaoFaseProtegida_(cfg,VERSION,PHASE,'Pesquisa e Filtros de Sinalizações');
  setConfigValue_(cfg,'S262_STATUS','INSTALADO','Pesquisa e filtros de sinalizações instalados');
  setConfigValue_(cfg,'S262_MODO','FRONTEND_LOCAL','Busca e filtros processados no navegador/IndexedDB');
  setConfigValue_(cfg,'S262_ALTERA_REGISTROS','NAO','Filtros não alteram REGISTROS');
  setConfigValue_(cfg,'S262_CHAMADA_POR_FILTRO','NAO','Aplicar filtros não chama Apps Script');
  setConfigValue_(cfg,'S262_INSTALADO_EM',Utilities.formatDate(new Date(),TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),'Data/hora da instalação S26.2');
  SpreadsheetApp.flush();
  return diagnosticoS262();
}

function s262LerConfigDireto_(ss){
  const sh=ss.getSheetByName('CONFIG');
  if(!sh || sh.getLastRow()<2) return {};
  return sh.getRange(2,1,sh.getLastRow()-1,2).getValues().reduce((acc,row)=>{
    const key=String(row[0]||'').trim();
    if(key) acc[key]=String(row[1]??'').trim();
    return acc;
  },{});
}

function s262Check_(arr,nome,ok,detalhe){
  arr.push({nome:nome,ok:!!ok,detalhe:String(detalhe||'')});
}

function diagnosticoS262(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=s262LerConfigDireto_(ss);
  const checks=[];
  const VERSION='MVP-3.24.0-SINALIZACAO-S26.2';
  const PHASE='S26.2';
  const TIMEZONE='America/Fortaleza';
  const MODO_DADOS='LOCAL_INDEPENDENTE';

  // Diagnóstico deliberadamente independente do objeto global APP.
  s262Check_(checks,'CONFIG_APP_VERSAO',cfg.APP_VERSAO===VERSION,cfg.APP_VERSAO||'ausente');
  s262Check_(checks,'CONFIG_APP_FASE',cfg.APP_FASE===PHASE,cfg.APP_FASE||'ausente');
  s262Check_(checks,'S262_STATUS',cfg.S262_STATUS==='INSTALADO',cfg.S262_STATUS||'ausente');
  s262Check_(checks,'S262_MODO',cfg.S262_MODO==='FRONTEND_LOCAL',cfg.S262_MODO||'ausente');
  s262Check_(checks,'S262_NAO_ALTERA_REGISTROS',cfg.S262_ALTERA_REGISTROS==='NAO',cfg.S262_ALTERA_REGISTROS||'ausente');
  s262Check_(checks,'S262_SEM_CHAMADA_POR_FILTRO',cfg.S262_CHAMADA_POR_FILTRO==='NAO',cfg.S262_CHAMADA_POR_FILTRO||'ausente');
  s262Check_(checks,'MODO_DADOS',cfg.MODO_DADOS===MODO_DADOS,cfg.MODO_DADOS||'ausente');
  const tz=String(ss.getSpreadsheetTimeZone?ss.getSpreadsheetTimeZone():'');
  s262Check_(checks,'TIMEZONE',tz===TIMEZONE,tz||'ausente');

  ['REGISTROS','MAPAS_SETORES','PLANTAS','CONFIG'].forEach(nome=>
    s262Check_(checks,'ABA_'+nome,!!ss.getSheetByName(nome),nome)
  );

  [
    ['API_CAMADAS',typeof appObterCamadasS2==='function','appObterCamadasS2'],
    ['API_SIG_MAPA',typeof appListarRegistrosMapaS4==='function','appListarRegistrosMapaS4'],
    ['API_SIG_NIVEL',typeof appListarRegistrosNivelS242==='function','appListarRegistrosNivelS242'],
    ['API_EXCLUSAO',typeof appExcluirRegistroS236==='function','appExcluirRegistroS236']
  ].forEach(c=>s262Check_(checks,c[0],c[1],c[2]));

  return {
    ok:checks.every(c=>c.ok),
    version:VERSION,
    fase:PHASE,
    totalChecks:checks.length,
    falhas:checks.filter(c=>!c.ok).length,
    checks,
    gate:[
      'Pesquisa livre filtra os SIGs do mapa sem alterar dados.',
      'Filtros de Tipo, Finalidade, Responsável, Status, Estado e Condição podem ser combinados.',
      'Contador informa quantos SIGs atendem à visão corrente.',
      'Limpar filtros restaura imediatamente todos os SIGs do mapa.',
      'Busca e filtros funcionam offline usando os registros já carregados.',
      'SIGs com STATUS=EXCLUIDO continuam ausentes.'
    ]
  };
}

function mostrarDiagnosticoS262(){
  const d=diagnosticoS262();
  SpreadsheetApp.getUi().alert(
    'Diagnóstico S26.2',
    `${d.ok?'S26.2 PRONTA PARA GATE':'HÁ PENDÊNCIAS'}\n\n`+
    `Versão: ${d.version}\nChecks: ${d.totalChecks}\nFalhas: ${d.falhas}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return d;
}


// ========================================================
// S26.3 — SIMBOLOGIA DINÂMICA E GERENCIAMENTO DE CORES
// ========================================================
function setupS263(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=ss.getSheetByName('CONFIG');
  const VERSION='MVP-3.25.0-SINALIZACAO-S26.3';
  const PHASE='S26.3';
  const TIMEZONE='America/Fortaleza';
  if(!cfg)throw new Error('CONFIG ausente.');
  if(!ss.getSheetByName('REGISTROS'))throw new Error('REGISTROS ausente.');
  s266GravarVersaoFaseProtegida_(cfg,VERSION,PHASE,'Simbologia dinâmica e gerenciamento de cores');
  setConfigValue_(cfg,'S263_STATUS','INSTALADO','Simbologia dinâmica instalada');
  setConfigValue_(cfg,'S263_MODO','FRONTEND_LOCAL','Simbologia processada localmente no navegador');
  setConfigValue_(cfg,'S263_ALTERA_COR_FISICA','NAO','Cores temáticas não alteram REGISTROS.COR');
  setConfigValue_(cfg,'S263_PERSISTENCIA','LOCALSTORAGE','Preferências visuais armazenadas localmente no navegador');
  setConfigValue_(cfg,'S263_INSTALADO_EM',Utilities.formatDate(new Date(),TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),'Data/hora da instalação S26.3');
  SpreadsheetApp.flush();
  return diagnosticoS263();
}
function diagnosticoS263(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=s262LerConfigDireto_(ss);const checks=[];
  const VERSION='MVP-3.25.0-SINALIZACAO-S26.3';const PHASE='S26.3';
  s262Check_(checks,'CONFIG_APP_VERSAO',cfg.APP_VERSAO===VERSION,cfg.APP_VERSAO||'ausente');
  s262Check_(checks,'CONFIG_APP_FASE',cfg.APP_FASE===PHASE,cfg.APP_FASE||'ausente');
  s262Check_(checks,'S263_STATUS',cfg.S263_STATUS==='INSTALADO',cfg.S263_STATUS||'ausente');
  s262Check_(checks,'S263_MODO',cfg.S263_MODO==='FRONTEND_LOCAL',cfg.S263_MODO||'ausente');
  s262Check_(checks,'S263_NAO_ALTERA_COR_FISICA',cfg.S263_ALTERA_COR_FISICA==='NAO',cfg.S263_ALTERA_COR_FISICA||'ausente');
  s262Check_(checks,'S263_PERSISTENCIA',cfg.S263_PERSISTENCIA==='LOCALSTORAGE',cfg.S263_PERSISTENCIA||'ausente');
  ['REGISTROS','MAPAS_SETORES','PLANTAS','CONFIG'].forEach(nome=>s262Check_(checks,'ABA_'+nome,!!ss.getSheetByName(nome),nome));
  return {ok:checks.every(c=>c.ok),version:VERSION,fase:PHASE,totalChecks:checks.length,falhas:checks.filter(c=>!c.ok).length,checks,
    gate:['Modo padrão Status preserva a leitura visual existente.','Tipo, Finalidade, Responsável, Estado e Condição podem colorir os pins.','Cor única funciona sem alterar REGISTROS.COR.','Legenda mostra categorias e contagens da visão filtrada.','Editor de cor atualiza pins e legenda localmente.','Preferências continuam disponíveis offline neste navegador.']};
}
function mostrarDiagnosticoS263(){
  const d=diagnosticoS263();SpreadsheetApp.getUi().alert('Diagnóstico S26.3',`${d.ok?'S26.3 PRONTA PARA GATE':'HÁ PENDÊNCIAS'}\n\nVersão: ${d.version}\nChecks: ${d.totalChecks}\nFalhas: ${d.falhas}`,SpreadsheetApp.getUi().ButtonSet.OK);return d;
}

// ========================================================
// S26.4 — PRESETS DE VISUALIZAÇÃO
// ========================================================
function setupS264(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=ss.getSheetByName('CONFIG');
  const VERSION='MVP-3.26.1-SINALIZACAO-S26.4.1';
  const PHASE='S26.4';
  const TIMEZONE='America/Fortaleza';
  if(!cfg)throw new Error('CONFIG ausente.');
  if(!ss.getSheetByName('REGISTROS'))throw new Error('REGISTROS ausente.');
  s266GravarVersaoFaseProtegida_(cfg,VERSION,PHASE,'Presets de Visualização');
  setConfigValue_(cfg,'S264_STATUS','INSTALADO','Presets de visualização instalados');
  setConfigValue_(cfg,'S264_MODO','FRONTEND_LOCAL','Presets processados localmente no navegador');
  setConfigValue_(cfg,'S264_PERSISTENCIA','LOCALSTORAGE','Presets armazenados localmente por navegador');
  setConfigValue_(cfg,'S264_ALTERA_REGISTROS','NAO','Presets não alteram REGISTROS');
  setConfigValue_(cfg,'S264_OFFLINE','SIM','Presets disponíveis offline após salvos neste navegador');
  setConfigValue_(cfg,'S264_INSTALADO_EM',Utilities.formatDate(new Date(),TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),'Data/hora da instalação S26.4');
  SpreadsheetApp.flush();
  return diagnosticoS264();
}

function diagnosticoS264(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=s262LerConfigDireto_(ss);const checks=[];
  const VERSION='MVP-3.26.1-SINALIZACAO-S26.4.1';const PHASE='S26.4';
  s262Check_(checks,'CONFIG_APP_VERSAO',cfg.APP_VERSAO===VERSION,cfg.APP_VERSAO||'ausente');
  s262Check_(checks,'CONFIG_APP_FASE',cfg.APP_FASE===PHASE,cfg.APP_FASE||'ausente');
  s262Check_(checks,'S264_STATUS',cfg.S264_STATUS==='INSTALADO',cfg.S264_STATUS||'ausente');
  s262Check_(checks,'S264_MODO',cfg.S264_MODO==='FRONTEND_LOCAL',cfg.S264_MODO||'ausente');
  s262Check_(checks,'S264_PERSISTENCIA',cfg.S264_PERSISTENCIA==='LOCALSTORAGE',cfg.S264_PERSISTENCIA||'ausente');
  s262Check_(checks,'S264_NAO_ALTERA_REGISTROS',cfg.S264_ALTERA_REGISTROS==='NAO',cfg.S264_ALTERA_REGISTROS||'ausente');
  s262Check_(checks,'S264_OFFLINE',cfg.S264_OFFLINE==='SIM',cfg.S264_OFFLINE||'ausente');
  ['REGISTROS','MAPAS_SETORES','PLANTAS','CONFIG'].forEach(nome=>s262Check_(checks,'ABA_'+nome,!!ss.getSheetByName(nome),nome));
  return {ok:checks.every(c=>c.ok),version:VERSION,fase:PHASE,totalChecks:checks.length,falhas:checks.filter(c=>!c.ok).length,checks,
    gate:['Salvar visualização captura camadas, pesquisa, filtros, simbologia e cores.','Aplicar preset restaura toda a visão sem alterar dados dos SIGs.','Renomear, atualizar e excluir funcionam localmente.','Preset padrão pode ser marcado e aplicado automaticamente neste navegador.','Presets continuam disponíveis offline no mesmo navegador.','Restaurar padrão desvincula o preset ativo e retorna à visão operacional.']};
}
function mostrarDiagnosticoS264(){
  const d=diagnosticoS264();SpreadsheetApp.getUi().alert('Diagnóstico S26.4',`${d.ok?'S26.4 PRONTA PARA GATE':'HÁ PENDÊNCIAS'}\n\nVersão: ${d.version}\nChecks: ${d.totalChecks}\nFalhas: ${d.falhas}`,SpreadsheetApp.getUi().ButtonSet.OK);return d;
}


// ========================================================
// S26.5 — OFFLINE, PERFORMANCE E HARDENING DA CENTRAL
// ========================================================
function setupS265(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=ss.getSheetByName('CONFIG');
  const VERSION='MVP-3.27.0-SINALIZACAO-S26.5';
  const PHASE='S26.5';
  const TIMEZONE='America/Fortaleza';
  if(!cfg)throw new Error('CONFIG ausente.');
  if(!ss.getSheetByName('REGISTROS'))throw new Error('REGISTROS ausente.');

  // Hardening somente: não cria colunas, não reprocessa cartografia e não
  // altera dados operacionais. Registra apenas o checkpoint da fase.
  s266GravarVersaoFaseProtegida_(cfg,VERSION,PHASE,'Offline, Performance e Hardening da Central de Camadas');
  setConfigValue_(cfg,'S265_STATUS','INSTALADO','Hardening da Central de Camadas instalado');
  setConfigValue_(cfg,'S265_FILTRO_CACHE_LOCAL','SIM','Resultado da visão filtrada reutilizado durante o mesmo estado');
  setConfigValue_(cfg,'S265_RENDER_FRAGMENT','SIM','Pins renderizados em DocumentFragment antes da inserção no DOM');
  setConfigValue_(cfg,'S265_STORAGE_RECOVERY','SIM','Simbologia e presets inválidos são descartados com fallback seguro');
  setConfigValue_(cfg,'S265_SERVER_CALL_POR_FILTRO','NAO','Pesquisa, filtro, simbologia e preset não chamam Apps Script');
  setConfigValue_(cfg,'S265_OFFLINE','SIM','Central continua operando com dados já carregados no navegador');
  setConfigValue_(cfg,'S265_PRESET_LIMIT','20','Limite defensivo de presets locais');
  setConfigValue_(cfg,'S265_INSTALADO_EM',Utilities.formatDate(new Date(),TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),'Data/hora da instalação S26.5');
  SpreadsheetApp.flush();
  return diagnosticoS265();
}

function diagnosticoS265(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=s262LerConfigDireto_(ss);const checks=[];
  const VERSION='MVP-3.27.0-SINALIZACAO-S26.5';const PHASE='S26.5';
  const TIMEZONE='America/Fortaleza';

  s262Check_(checks,'CONFIG_APP_VERSAO',cfg.APP_VERSAO===VERSION,cfg.APP_VERSAO||'ausente');
  s262Check_(checks,'CONFIG_APP_FASE',cfg.APP_FASE===PHASE,cfg.APP_FASE||'ausente');
  s262Check_(checks,'S265_STATUS',cfg.S265_STATUS==='INSTALADO',cfg.S265_STATUS||'ausente');
  s262Check_(checks,'CACHE_LOCAL',cfg.S265_FILTRO_CACHE_LOCAL==='SIM',cfg.S265_FILTRO_CACHE_LOCAL||'ausente');
  s262Check_(checks,'RENDER_FRAGMENT',cfg.S265_RENDER_FRAGMENT==='SIM',cfg.S265_RENDER_FRAGMENT||'ausente');
  s262Check_(checks,'STORAGE_RECOVERY',cfg.S265_STORAGE_RECOVERY==='SIM',cfg.S265_STORAGE_RECOVERY||'ausente');
  s262Check_(checks,'SEM_SERVER_CALL_FILTRO',cfg.S265_SERVER_CALL_POR_FILTRO==='NAO',cfg.S265_SERVER_CALL_POR_FILTRO||'ausente');
  s262Check_(checks,'OFFLINE',cfg.S265_OFFLINE==='SIM',cfg.S265_OFFLINE||'ausente');
  s262Check_(checks,'PRESET_LIMIT',String(cfg.S265_PRESET_LIMIT)==='20',cfg.S265_PRESET_LIMIT||'ausente');
  s262Check_(checks,'MODO_DADOS',cfg.MODO_DADOS==='LOCAL_INDEPENDENTE',cfg.MODO_DADOS||'ausente');
  const tz=String(ss.getSpreadsheetTimeZone?ss.getSpreadsheetTimeZone():'');
  s262Check_(checks,'TIMEZONE',tz===TIMEZONE,tz||'ausente');

  ['REGISTROS','MAPAS_SETORES','PLANTAS','CONFIG'].forEach(nome=>s262Check_(checks,'ABA_'+nome,!!ss.getSheetByName(nome),nome));
  [
    ['API_CAMADAS',typeof appObterCamadasS2==='function','appObterCamadasS2'],
    ['API_SIG_MAPA',typeof appListarRegistrosMapaS4==='function','appListarRegistrosMapaS4'],
    ['API_SIG_NIVEL',typeof appListarRegistrosNivelS242==='function','appListarRegistrosNivelS242'],
    ['API_EXCLUSAO',typeof appExcluirRegistroS236==='function','appExcluirRegistroS236']
  ].forEach(c=>s262Check_(checks,c[0],c[1],c[2]));

  return {
    ok:checks.every(c=>c.ok),version:VERSION,fase:PHASE,totalChecks:checks.length,
    falhas:checks.filter(c=>!c.ok).length,checks,
    gate:[
      'Pesquisa e filtros continuam instantâneos e não disparam chamadas ao servidor.',
      'Trocar simbologia/cores não recarrega dados do mapa.',
      'Preset padrão inicia corretamente online e offline.',
      'localStorage inválido ou indisponível não impede a abertura da aplicação.',
      'Limite de 20 presets continua respeitado.',
      'Troca Setor ↔ Nível 2025 preserva filtros, simbologia e preset quando aplicável.',
      'SIGs EXCLUIDO permanecem ausentes em todas as visões.',
      'Central continua responsiva em desktop, notebook e mobile.'
    ]
  };
}

function mostrarDiagnosticoS265(){
  const d=diagnosticoS265();
  SpreadsheetApp.getUi().alert(
    'Diagnóstico S26.5',
    `${d.ok?'S26.5 PRONTA PARA GATE':'HÁ PENDÊNCIAS'}\n\nVersão: ${d.version}\nChecks: ${d.totalChecks}\nFalhas: ${d.falhas}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return d;
}


// ========================================================
// S26.6 — PRESETS CORPORATIVOS / PADRÕES POR PERFIL
// ========================================================
function setupS266(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=ss.getSheetByName('CONFIG');
  const VERSION='MVP-3.28.2-SINALIZACAO-S26.6.2-HARDENING';
  const PHASE='S26.6';
  const TIMEZONE='America/Fortaleza';
  if(!cfg)throw new Error('CONFIG ausente.');
  const sh=s266Sheet_();
  garantirCabecalhosS266_(sh);
  s266GravarVersaoFaseProtegida_(cfg,VERSION,PHASE,'Fase de implementação validada');
  setConfigValue_(cfg,'S266_STATUS','INSTALADO','Presets corporativos e padrões por perfil instalados');
  setConfigValue_(cfg,'S266_PRESETS_PESSOAIS','LOCAL','Presets pessoais continuam no navegador/localStorage');
  setConfigValue_(cfg,'S266_PRESETS_CORPORATIVOS','SHEETS','Presets corporativos persistidos em CAMADAS_PRESETS_CORPORATIVOS');
  setConfigValue_(cfg,'S266_PADRAO_PRECEDENCIA','PERFIL>GLOBAL>LOCAL','Padrão corporativo por perfil precede global e padrão pessoal local');
  setConfigValue_(cfg,'S266_OFFLINE_CACHE','SIM','Últimos presets corporativos recebidos ficam em cache local para uso offline');
  setConfigValue_(cfg,'S266_INSTALADO_EM',Utilities.formatDate(new Date(),TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),'Data/hora da instalação S26.6');
  registrarAuditoriaS15_({acao:'SETUP_S266',entidade:'SISTEMA',entidadeId:'S26.6',resultado:'SUCESSO',origem:'APPS_SCRIPT'});
  SpreadsheetApp.flush();
  return diagnosticoS266();
}


// ========================================================
// S26.6.2 — CHECKPOINT FINAL DE HARDENING
// Não cria funcionalidade nova. Consolida metadados da versão já aprovada
// no Gate Geral de Regressão e mantém o soft delete fora deste checkpoint.
// ========================================================
function setupS2662(){
  setupS266();
  return finalizarHardeningS2662();
}

function finalizarHardeningS2662(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=ss.getSheetByName('CONFIG');
  if(!cfg)throw new Error('CONFIG ausente.');

  const FINAL_VERSION='MVP-3.28.2-SINALIZACAO-S26.6.2-HARDENING';
  const OLD_VERSION='MVP-3.28.1-SINALIZACAO-S26.6.1';
  const PHASE='S26.6';
  const versaoAtual=s266LerValorConfigSetup_(cfg,'APP_VERSAO');
  const faseAtual=s266LerValorConfigSetup_(cfg,'APP_FASE');
  const timezone=String(ss.getSpreadsheetTimeZone?ss.getSpreadsheetTimeZone():'');

  if(faseAtual!==PHASE)throw new Error('APP_FASE inesperada para fechamento: '+(faseAtual||'ausente')+'.');
  if(versaoAtual!==OLD_VERSION && versaoAtual!==FINAL_VERSION)
    throw new Error('APP_VERSAO inesperada para fechamento: '+(versaoAtual||'ausente')+'.');
  if(timezone!==APP.TIMEZONE)
    throw new Error('Fuso horário da planilha deve ser '+APP.TIMEZONE+' antes do fechamento. Atual: '+(timezone||'ausente')+'.');
  if(s266LerValorConfigSetup_(cfg,'S266_STATUS')!=='INSTALADO')
    throw new Error('S26.6 não está marcada como INSTALADO em CONFIG.');
  if(typeof registrarAuditoriaS15_!=='function')
    throw new Error('Serviço de auditoria indisponível para registrar o checkpoint final.');

  setConfigValue_(cfg,'APP_VERSAO',FINAL_VERSION,'Versão atualmente instalada');
  setConfigValue_(cfg,'APP_FASE',PHASE,'Fase funcional atualmente instalada');
  setConfigValue_(cfg,'S2662_STATUS','APROVADO','Checkpoint S26.6.2 de hardening aprovado');
  setConfigValue_(cfg,'S2662_GATE_REGRESSAO','APROVADO','Gate Geral de Regressão confirmado');
  setConfigValue_(cfg,'S2662_CHECKS_ESTRUTURAIS','62/62','Diagnóstico consolidado S26.6.2-F aprovado antes do fechamento');
  setConfigValue_(cfg,'S2662_SOFT_DELETE','FORA_ESCOPO','Gate de soft delete permanece fora deste checkpoint');
  setConfigValue_(cfg,'S2662_APROVADO_EM',Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),'Data/hora do fechamento S26.6.2');

  registrarAuditoriaS15_({
    acao:'CHECKPOINT_S2662_HARDENING',
    entidade:'SISTEMA',
    entidadeId:'S26.6.2',
    resultado:'SUCESSO',
    origem:'APPS_SCRIPT'
  });
  SpreadsheetApp.flush();
  return diagnosticoFinalS2662();
}

function diagnosticoS266(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=s262LerConfigDireto_(ss);
  const checks=[];
  const VERSION='MVP-3.28.2-SINALIZACAO-S26.6.2-HARDENING',PHASE='S26.6';
  s262Check_(checks,'CONFIG_APP_VERSAO',cfg.APP_VERSAO===VERSION,cfg.APP_VERSAO||'ausente');
  s262Check_(checks,'CONFIG_APP_FASE',cfg.APP_FASE===PHASE,cfg.APP_FASE||'ausente');
  s262Check_(checks,'S266_STATUS',cfg.S266_STATUS==='INSTALADO',cfg.S266_STATUS||'ausente');
  s262Check_(checks,'PROTECAO_SETUP_HISTORICO',typeof s266GravarVersaoFaseProtegida_==='function','APP_VERSAO/APP_FASE protegidos contra setup anterior');
  const sh=ss.getSheetByName('CAMADAS_PRESETS_CORPORATIVOS');
  s262Check_(checks,'ABA_PRESETS_CORPORATIVOS',!!sh,sh?'presente':'ausente');
  if(sh){
    const h=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(String);
    S266_HEADERS.forEach(x=>s262Check_(checks,'HEADER_'+x,h.includes(x),x));
    const headersOk=S266_HEADERS.every(x=>h.includes(x));
    if(headersOk){
      const idx={}; h.forEach((x,i)=>idx[x]=i);
      const vals=sh.getLastRow()>=2?sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues():[];
      const itens=vals.map(r=>s266RowToObj_(r,idx)).filter(p=>p.id);
      const gruposPadrao={};
      let totalPadroes=0;
      let padroesInvalidos=0;
      itens.forEach(p=>{
        if(!p.ativo||!p.padrao)return;
        let chave='';
        if(p.escopo==='GLOBAL')chave='GLOBAL';
        else if(p.escopo==='PERFIL'&&p.perfilAlvo)chave='PERFIL:'+p.perfilAlvo;
        if(!chave){padroesInvalidos++;return;}
        totalPadroes++;
        gruposPadrao[chave]=(gruposPadrao[chave]||0)+1;
      });
      const duplicadosPadrao=Object.keys(gruposPadrao).filter(chave=>gruposPadrao[chave]>1);
      const padraoUnicoOk=duplicadosPadrao.length===0&&padroesInvalidos===0;
      const detalhePadrao=padraoUnicoOk
        ? `${totalPadroes} padrão(ões) em ${Object.keys(gruposPadrao).length} escopo(s)/perfil(is)`
        : `${duplicadosPadrao.length} duplicidade(s); ${padroesInvalidos} padrão(ões) inválido(s)`;
      s262Check_(checks,'PADRAO_UNICO_POR_ESCOPO',padraoUnicoOk,detalhePadrao);
    }
  }
  s262Check_(checks,'PRECEDENCIA',cfg.S266_PADRAO_PRECEDENCIA==='PERFIL>GLOBAL>LOCAL',cfg.S266_PADRAO_PRECEDENCIA||'ausente');
  s262Check_(checks,'OFFLINE_CACHE',cfg.S266_OFFLINE_CACHE==='SIM',cfg.S266_OFFLINE_CACHE||'ausente');
  const falhas=checks.filter(c=>!c.ok).length;
  return {ok:falhas===0,version:VERSION,fase:PHASE,totalChecks:checks.length,falhas,checks,gate:[
    'ADMIN publica preset corporativo global e usuários autorizados o visualizam.',
    'Preset por perfil aparece apenas para o perfil alvo (ADMIN pode gerenciar todos).',
    'Padrão por perfil tem precedência sobre padrão global; corporativo precede padrão pessoal local.',
    'Usuários não ADMIN podem aplicar, mas não publicar, atualizar, definir padrão ou excluir presets corporativos.',
    'Última lista corporativa válida permanece disponível offline após ao menos uma sincronização online.'
  ]};
}

function mostrarDiagnosticoS266(){
  const d=diagnosticoS266();
  const status=d.ok?'S26.6 PRONTA PARA GATE':'HÁ PENDÊNCIAS';
  const resumo=[
    status,
    'Versão: '+d.version,
    'Fase: '+d.fase,
    'Checks: '+d.totalChecks,
    'Falhas: '+d.falhas
  ].join('\n');
  console.log(resumo);
  d.checks.forEach(function(c){
    console.log((c.ok?'OK':'FALHA')+' | '+c.nome+' | '+c.detalhe);
  });
  return d;
}

// ========================================================
// S26.6.2-F — DIAGNÓSTICO CONSOLIDADO DE HARDENING
// Somente leitura. Não executa setup, não altera dados e não testa soft delete.
// ========================================================
function diagnosticoFinalS2662(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=s262LerConfigDireto_(ss);
  const checks=[];
  const base=diagnosticoS266();

  // Mantém todos os checks já aprovados da S26.6.
  base.checks.forEach(function(c){
    s262Check_(checks,'S266_'+c.nome,c.ok,c.detalhe);
  });

  // Runtime e metadados fundamentais.
  s262Check_(checks,'APP_ID',APP.ID==='SINALIZACAO_MALL',APP.ID||'ausente');
  s262Check_(checks,'APP_VERSAO_RUNTIME_CONFIG',APP.VERSAO===cfg.APP_VERSAO,'runtime='+APP.VERSAO+' | config='+(cfg.APP_VERSAO||'ausente'));
  s262Check_(checks,'APP_FASE_RUNTIME_CONFIG',APP.FASE===cfg.APP_FASE,'runtime='+APP.FASE+' | config='+(cfg.APP_FASE||'ausente'));
  s262Check_(checks,'TIMEZONE_RUNTIME',APP.TIMEZONE==='America/Fortaleza',APP.TIMEZONE||'ausente');
  s262Check_(checks,'MODO_DADOS_RUNTIME',APP.MODO_DADOS==='LOCAL_INDEPENDENTE',APP.MODO_DADOS||'ausente');
  const tz=String(ss.getSpreadsheetTimeZone?ss.getSpreadsheetTimeZone():'');
  s262Check_(checks,'TIMEZONE_PLANILHA',tz==='America/Fortaleza',tz||'ausente');
  s262Check_(checks,'S2662_STATUS',cfg.S2662_STATUS==='APROVADO',cfg.S2662_STATUS||'ausente');
  s262Check_(checks,'S2662_GATE_REGRESSAO',cfg.S2662_GATE_REGRESSAO==='APROVADO',cfg.S2662_GATE_REGRESSAO||'ausente');
  s262Check_(checks,'S2662_CHECKS_ESTRUTURAIS',cfg.S2662_CHECKS_ESTRUTURAIS==='62/62',cfg.S2662_CHECKS_ESTRUTURAIS||'ausente');
  s262Check_(checks,'S2662_SOFT_DELETE',cfg.S2662_SOFT_DELETE==='FORA_ESCOPO',cfg.S2662_SOFT_DELETE||'ausente');

  // Estruturas essenciais — somente existência, sem varrer grandes ranges.
  const abasObrigatorias=[
    'CONFIG','REGISTROS','REGISTRO_FOTOS','REGISTRO_HISTORICO','USUARIOS',
    'MAPAS_SETORES','PLANTAS','MAPA_TRANSFORMACOES','MAPA_AREAS_NIVEL',
    'CARTOGRAFIA_HISTORICO','CARTOGRAFIA_PUBLICACOES','CAMADAS_PRESETS_CORPORATIVOS'
  ];
  abasObrigatorias.forEach(function(nome){
    s262Check_(checks,'ABA_'+nome,!!ss.getSheetByName(nome),nome);
  });

  // APIs críticas preservadas. Não executa nenhuma delas.
  const apisCriticas=[
    ['AUTH_LOGIN_PIN',typeof appLoginMallS223==='function','appLoginMallS223'],
    ['AUTH_RPC_PIN',typeof appRpcS223==='function','appRpcS223'],
    ['MAPA_SIG_SETOR',typeof appListarRegistrosMapaS4==='function','appListarRegistrosMapaS4'],
    ['MAPA_SIG_NIVEL',typeof appListarRegistrosNivelS242==='function','appListarRegistrosNivelS242'],
    ['OFFLINE_MANIFEST',typeof appObterManifestOfflineS5B==='function','appObterManifestOfflineS5B'],
    ['OFFLINE_PACOTE_MAPA',typeof appObterPacoteMapaOfflineS5B==='function','appObterPacoteMapaOfflineS5B'],
    ['OFFLINE_LOCALIZACAO',typeof appObterDadosLocalizacaoOfflineS6==='function','appObterDadosLocalizacaoOfflineS6'],
    ['CART_RASCUNHO_CRIAR',typeof appCriarRascunhoCartograficoS255==='function','appCriarRascunhoCartograficoS255'],
    ['CART_RASCUNHO_VALIDAR',typeof appEnviarValidacaoCartograficaS255==='function','appEnviarValidacaoCartograficaS255'],
    ['CART_PUBLICAR',typeof appPublicarCartografiaS255==='function','appPublicarCartografiaS255'],
    ['CART_RASCUNHO_REABRIR',typeof appReabrirRascunhoCartograficoS255==='function','appReabrirRascunhoCartograficoS255'],
    ['CART_RASCUNHO_DESCARTAR',typeof appDescartarRascunhoCartograficoS255==='function','appDescartarRascunhoCartograficoS255'],
    ['CART_PUBLICACAO_PREVIEW',typeof appPrevisualizarPublicacaoCartograficaS255==='function','appPrevisualizarPublicacaoCartograficaS255'],
    ['CART_SNAPSHOT_CRIAR',typeof appCriarSnapshotCartograficoS253==='function','appCriarSnapshotCartograficoS253'],
    ['CART_SNAPSHOT_LISTAR',typeof appListarSnapshotsRestauraveisS254==='function','appListarSnapshotsRestauraveisS254'],
    ['CART_RESTAURACAO_PREVIEW',typeof appPrevisualizarRestauracaoS254==='function','appPrevisualizarRestauracaoS254'],
    ['CART_RESTAURAR',typeof appRestaurarSnapshotCartograficoS254==='function','appRestaurarSnapshotCartograficoS254'],
    ['PRESET_LISTAR',typeof appListarPresetsCorporativosS266==='function','appListarPresetsCorporativosS266'],
    ['PRESET_SALVAR',typeof appSalvarPresetCorporativoS266==='function','appSalvarPresetCorporativoS266'],
    ['PRESET_PADRAO',typeof appDefinirPadraoPresetCorporativoS266==='function','appDefinirPadraoPresetCorporativoS266'],
    ['PRESET_EXCLUIR',typeof appExcluirPresetCorporativoS266==='function','appExcluirPresetCorporativoS266'],
    ['RELATORIO_GERENCIAL',typeof appRelatorioGerencialS14==='function','appRelatorioGerencialS14']
  ];
  apisCriticas.forEach(function(c){
    s262Check_(checks,'API_'+c[0],c[1],c[2]);
  });

  // Serviço Slides: S231 deve existir uma única vez no código para o projeto compilar;
  // aqui verificamos apenas a presença runtime, sem gerar relatório.
  s262Check_(checks,'S231_RUNTIME',typeof S231!=='undefined' && !!S231,'const S231 disponível');

  // Proteção dos setups históricos: valida o comparador sem escrever em CONFIG.
  const faseAtualNum=s266NumeroFaseSetup_('S26.6');
  const faseAntigaNum=s266NumeroFaseSetup_('S26.2');
  s262Check_(checks,'SETUP_HISTORICO_COMPARADOR',faseAtualNum!==null && faseAntigaNum!==null && faseAtualNum>faseAntigaNum,'S26.6 > S26.2');

  const falhas=checks.filter(function(c){return !c.ok;}).length;
  return {
    ok:falhas===0,
    version:APP.VERSAO,
    fase:APP.FASE,
    diagnostico:'S26.6.2-RELEASE-HARDENING',
    totalChecks:checks.length,
    falhas:falhas,
    checks:checks,
    observacoes:[
      'Diagnóstico somente leitura; nenhuma escrita operacional é executada.',
      'Soft delete permanece fora do escopo deste Gate por decisão de projeto.',
      'RASCUNHO cartográfico não é publicado nem alterado por este diagnóstico.',
      'Gate geral de regressão foi aprovado antes da emissão deste checkpoint final.'
    ]
  };
}

function mostrarDiagnosticoFinalS2662(){
  const d=diagnosticoFinalS2662();
  const status=d.ok?'S26.6.2 HARDENING APROVADO':'S26.6.2 HARDENING COM PENDÊNCIAS';
  console.log([
    status,
    'Versão: '+d.version,
    'Fase: '+d.fase,
    'Diagnóstico: '+d.diagnostico,
    'Checks: '+d.totalChecks,
    'Falhas: '+d.falhas
  ].join('\n'));
  d.checks.forEach(function(c){
    console.log((c.ok?'OK':'FALHA')+' | '+c.nome+' | '+c.detalhe);
  });
  d.observacoes.forEach(function(o){
    console.log('INFO | '+o);
  });
  return d;
}

// ========================================================
// S26.7-D — REGRESSÃO CARTOGRÁFICA INTEGRADA / RELEASE CANDIDATE
// Somente leitura. Não altera CONFIG, cartografia, cache ou dados operacionais.
// A promoção para MVP-3.29.0-SINALIZACAO-S26.7 ocorre somente após este Gate.
// ========================================================
function diagnosticoRegressaoS267D(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const checks=[];

  // Herdamos o checkpoint S26.6.2 aprovado: auth, offline, publicação, presets,
  // relatórios, timezone, estruturas essenciais e proteção de setup histórico.
  const base=diagnosticoFinalS2662();
  base.checks.forEach(function(c){
    s262Check_(checks,'BASE_'+c.nome,c.ok,c.detalhe);
  });

  // APIs novas da trilha S26.7.
  const apis=[
    ['CAMADAS_NIVEL',typeof appObterCamadasNivelS267B1==='function','appObterCamadasNivelS267B1'],
    ['DIAG_CAMADAS_NIVEL',typeof diagnosticoCamadasNivelS267B1==='function','diagnosticoCamadasNivelS267B1'],
    ['ENQUADRAMENTO_NIVEL',typeof appObterEnquadramentoNivelS267C==='function','appObterEnquadramentoNivelS267C'],
    ['DIAG_ENQUADRAMENTOS',typeof diagnosticoEnquadramentosS267C==='function','diagnosticoEnquadramentosS267C']
  ];
  apis.forEach(function(c){ s262Check_(checks,'API_S267_'+c[0],c[1],c[2]); });

  // Cinco calibrações oficiais Setor -> Nível devem continuar válidas.
  const esperadas=['CAL-AZUL-N1','CAL-VERDE-N1','CAL-AMARELO-N2','CAL-BRANCO-N2','CAL-ROXO-N3'];
  const shT=ss.getSheetByName('MAPA_TRANSFORMACOES');
  if(!shT){
    s262Check_(checks,'S267_CALIBRACOES_5',false,'MAPA_TRANSFORMACOES ausente');
  }else{
    const rowsT=s240Objects_(shT);
    esperadas.forEach(function(id){
      const r=rowsT.find(function(x){ return String(x.ID_TRANSFORMACAO||'')===id; });
      const status=String(r&&r.STATUS||'').toUpperCase();
      let matrizOk=false;
      if(r){
        try{
          const m=JSON.parse(String(r.MATRIZ_JSON||''));
          matrizOk=['a','b','c','d','e','f'].every(function(k){ return Number.isFinite(Number(m&&m[k])); });
        }catch(_){ matrizOk=false; }
      }
      s262Check_(checks,'S267_CAL_'+id,!!r && ['VALIDADA','REVISAR'].indexOf(status)>=0 && matrizOk,(r?status:'ausente')+' | matriz='+(matrizOk?'OK':'INVÁLIDA'));
    });
  }

  // As oito áreas especiais/nativas usadas na operação devem continuar válidas.
  const areasEsperadas=[
    'AREA-VERMELHO-N3','AREA-HOTEL-N1','AREA-CD-N1','AREA-EXTERNA-N1',
    'AREA-EXT-LAT-AZUL-N1','AREA-EXT-LAT-VERDE-N1','AREA-EXT-FRENTE-N1','AREA-EXT-HOTEL-CDM-N1'
  ];
  const shA=ss.getSheetByName('MAPA_AREAS_NIVEL');
  if(!shA){
    s262Check_(checks,'S267_AREAS_8',false,'MAPA_AREAS_NIVEL ausente');
  }else{
    const rowsA=s240Objects_(shA);
    areasEsperadas.forEach(function(id){
      const r=rowsA.find(function(x){ return String(x.ID_AREA||'')===id; });
      const status=String(r&&r.STATUS||'').toUpperCase();
      let polOk=false, pts=0;
      if(r){
        try{
          const p=JSON.parse(String(r.POLIGONO_JSON||'[]'));
          pts=Array.isArray(p)?p.length:0;
          polOk=Array.isArray(p) && p.length>=3 && p.every(function(pt){
            const x=Number(pt&&pt.x), y=Number(pt&&pt.y);
            return Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=1&&y>=0&&y<=1;
          });
        }catch(_){ polOk=false; }
      }
      s262Check_(checks,'S267_AREA_'+id,!!r && status==='VALIDADA' && polOk,(r?status:'ausente')+' | pontos='+pts);
    });
  }

  // Projeção real das três camadas auxiliares nos três níveis.
  const niveis=['PLA-CFF-N1-2025','PLA-CFF-N2-2025','PLA-CFF-N3-2025'];
  niveis.forEach(function(nivel){
    let cam=null;
    try{ cam=appObterCamadasNivelS267B1(nivel); }catch(e){ cam=null; }
    ['referencias','cruzamentos','lojas'].forEach(function(chave){
      const arr=cam&&Array.isArray(cam[chave])?cam[chave]:[];
      const coordsOk=arr.length>0 && arr.every(function(p){
        const x=Number(p&&p.x), y=Number(p&&p.y);
        return Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=1&&y>=0&&y<=1;
      });
      s262Check_(checks,'S267_'+nivel+'_'+chave.toUpperCase(),coordsOk,'total='+arr.length+' | coordenadas='+(coordsOk?'OK':'REVISAR'));
    });
  });

  // Envelopes operacionais dos três níveis: bounds válidos e dentro da planta.
  let env=null;
  try{ env=diagnosticoEnquadramentosS267C(); }catch(e){ env=null; }
  niveis.forEach(function(nivel){
    const item=env&&Array.isArray(env.itens)?env.itens.find(function(x){return x&&x.nivel===nivel;}):null;
    const b=item&&item.bounds;
    const ok=!!(item&&item.ok&&b) &&
      Number.isFinite(Number(b.minX))&&Number.isFinite(Number(b.minY))&&
      Number.isFinite(Number(b.maxX))&&Number.isFinite(Number(b.maxY))&&
      Number(b.minX)>=0&&Number(b.minY)>=0&&Number(b.maxX)<=1&&Number(b.maxY)<=1&&
      Number(b.minX)<Number(b.maxX)&&Number(b.minY)<Number(b.maxY);
    s262Check_(checks,'S267_ENVELOPE_'+nivel,ok,ok?('['+b.minX+','+b.minY+']→['+b.maxX+','+b.maxY+']'):'inválido/ausente');
  });

  // Garantias de não migração: os dados fonte continuam nas tabelas históricas.
  s262Check_(checks,'S267_SETORES_PRESERVADOS',!!ss.getSheetByName('MAPAS_SETORES'),'MAPAS_SETORES');
  s262Check_(checks,'S267_REFERENCIAS_FONTE',!!ss.getSheetByName('PONTOS_REFERENCIA'),'PONTOS_REFERENCIA');
  s262Check_(checks,'S267_CRUZAMENTOS_FONTE',!!ss.getSheetByName('CRUZAMENTOS'),'CRUZAMENTOS');
  s262Check_(checks,'S267_LOJAS_FONTE',!!ss.getSheetByName('LOJAS_MAPA'),'LOJAS_MAPA');

  const falhas=checks.filter(function(c){return !c.ok;}).length;
  return {
    ok:falhas===0,
    versionAtual:APP.VERSAO,
    faseAtual:APP.FASE,
    candidato:'MVP-3.29.0-SINALIZACAO-S26.7',
    diagnostico:'S26.7-D-REGRESSAO-CANDIDATO',
    totalChecks:checks.length,
    falhas:falhas,
    checks:checks,
    observacoes:[
      'Somente leitura: nenhuma escrita em CONFIG, REGISTROS, cartografia ou cache.',
      'S26.7-A: Níveis 2025 tratados como visualizações operacionais; permissões de usuário permanecem independentes.',
      'S26.7-B/B.1: Central de Camadas e projeções permanecem somente em memória/cache; coordenadas fonte não são migradas.',
      'S26.7-C: envelope operacional é exclusivo dos Níveis; Setores devem manter o fit histórico e são validados visualmente no Gate.',
      'Soft delete permanece fora do escopo por decisão de projeto.',
      'A promoção para MVP-3.29.0-SINALIZACAO-S26.7 só deve ocorrer após regressão visual/offline aprovada.'
    ]
  };
}

function mostrarDiagnosticoRegressaoS267D(){
  const d=diagnosticoRegressaoS267D();
  const status=d.ok?'S26.7-D ESTRUTURAL PRONTO PARA GATE':'S26.7-D COM PENDÊNCIAS';
  console.log([
    status,
    'Versão atual: '+d.versionAtual,
    'Fase atual: '+d.faseAtual,
    'Candidato: '+d.candidato,
    'Diagnóstico: '+d.diagnostico,
    'Checks: '+d.totalChecks,
    'Falhas: '+d.falhas
  ].join('\n'));
  d.checks.forEach(function(c){
    console.log((c.ok?'OK':'FALHA')+' | '+c.nome+' | '+c.detalhe);
  });
  d.observacoes.forEach(function(o){ console.log('INFO | '+o); });
  return d;
}


// ========================================================
// S26.7 — RELEASE FINAL / NÍVEIS 2025 OPERACIONAIS
// Promoção formal somente após Gate estrutural 99/99 e regressão operacional aprovada.
// Não migra coordenadas fonte, não altera SIGs/fotos e mantém soft delete fora do escopo.
// ========================================================
function setupS267(){
  return finalizarS267();
}

function finalizarS267(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=ss.getSheetByName('CONFIG');
  if(!cfg)throw new Error('CONFIG ausente.');

  const FINAL_VERSION='MVP-3.29.0-SINALIZACAO-S26.7';
  const FINAL_PHASE='S26.7';
  const BASE_VERSION='MVP-3.28.2-SINALIZACAO-S26.6.2-HARDENING';
  const BASE_PHASE='S26.6';
  const versaoAtual=s266LerValorConfigSetup_(cfg,'APP_VERSAO');
  const faseAtual=s266LerValorConfigSetup_(cfg,'APP_FASE');
  const timezone=String(ss.getSpreadsheetTimeZone?ss.getSpreadsheetTimeZone():'');

  if(versaoAtual!==BASE_VERSION && versaoAtual!==FINAL_VERSION)
    throw new Error('APP_VERSAO inesperada para promoção S26.7: '+(versaoAtual||'ausente')+'.');
  if(faseAtual!==BASE_PHASE && faseAtual!==FINAL_PHASE)
    throw new Error('APP_FASE inesperada para promoção S26.7: '+(faseAtual||'ausente')+'.');
  if(timezone!==APP.TIMEZONE)
    throw new Error('Fuso horário da planilha deve ser '+APP.TIMEZONE+'. Atual: '+(timezone||'ausente')+'.');
  if(s266LerValorConfigSetup_(cfg,'S2662_STATUS')!=='APROVADO')
    throw new Error('Checkpoint S26.6.2 não está aprovado em CONFIG.');
  if(s266LerValorConfigSetup_(cfg,'S2662_GATE_REGRESSAO')!=='APROVADO')
    throw new Error('Gate de regressão S26.6.2 não está aprovado em CONFIG.');
  if(typeof registrarAuditoriaS15_!=='function')
    throw new Error('Serviço de auditoria indisponível para registrar S26.7.');

  // Revalida a estrutura S26.7 antes de escrever metadados da release.
  const gate=diagnosticoEstruturalS267Final_();
  if(!gate.ok || gate.falhas!==0)
    throw new Error('S26.7 não pode ser promovida: diagnóstico estrutural com '+gate.falhas+' falha(s).');

  setConfigValue_(cfg,'APP_VERSAO',FINAL_VERSION,'Versão atualmente instalada');
  setConfigValue_(cfg,'APP_FASE',FINAL_PHASE,'Fase funcional atualmente instalada');
  setConfigValue_(cfg,'S267_STATUS','APROVADO','Níveis 2025 operacionais como visualizações de primeira classe');
  setConfigValue_(cfg,'S267_GATE_ESTRUTURAL','99/99','Gate estrutural S26.7-D aprovado');
  setConfigValue_(cfg,'S267_GATE_OPERACIONAL','APROVADO','Regressão operacional/visual/offline confirmada');
  setConfigValue_(cfg,'S267_NIVEIS_OPERACIONAIS','SIM','Níveis 2025 não são mais classificados como somente consulta');
  setConfigValue_(cfg,'S267_CAMADAS_NIVEIS','SIM','Central de Camadas habilitada nos Níveis 2025');
  setConfigValue_(cfg,'S267_PROJECAO_CAMADAS','SIM','Referências, Cruzamentos e Lojas projetados em memória/cache');
  setConfigValue_(cfg,'S267_ENQUADRAMENTO_OPERACIONAL','SIM','Centralizar dos Níveis usa envelope operacional; Setores preservam fit histórico');
  setConfigValue_(cfg,'S267_SOFT_DELETE','FORA_ESCOPO','Soft delete permanece fora desta release por decisão de projeto');
  setConfigValue_(cfg,'S267_APROVADO_EM',Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),'Data/hora do fechamento S26.7');

  registrarAuditoriaS15_({
    acao:'RELEASE_S267_APROVADA',
    entidade:'SISTEMA',
    entidadeId:'S26.7',
    resultado:'SUCESSO',
    origem:'APPS_SCRIPT',
    detalhes:{versao:FINAL_VERSION,gateEstrutural:'99/99',gateOperacional:'APROVADO',softDelete:'FORA_ESCOPO'}
  });
  SpreadsheetApp.flush();
  return diagnosticoFinalS267();
}

// Núcleo estrutural da S26.7 que independe de APP_VERSAO/APP_FASE atuais.
// Mantém os mesmos 33 checks específicos que complementaram os 66 checks da base.
function diagnosticoEstruturalS267Final_(){
  const ss=SpreadsheetApp.getActive();
  const checks=[];
  const apis=[
    ['CAMADAS_NIVEL',typeof appObterCamadasNivelS267B1==='function','appObterCamadasNivelS267B1'],
    ['DIAG_CAMADAS_NIVEL',typeof diagnosticoCamadasNivelS267B1==='function','diagnosticoCamadasNivelS267B1'],
    ['ENQUADRAMENTO_NIVEL',typeof appObterEnquadramentoNivelS267C==='function','appObterEnquadramentoNivelS267C'],
    ['DIAG_ENQUADRAMENTOS',typeof diagnosticoEnquadramentosS267C==='function','diagnosticoEnquadramentosS267C']
  ];
  apis.forEach(function(c){s262Check_(checks,'API_S267_'+c[0],c[1],c[2]);});

  const esperadas=['CAL-AZUL-N1','CAL-VERDE-N1','CAL-AMARELO-N2','CAL-BRANCO-N2','CAL-ROXO-N3'];
  const shT=ss.getSheetByName('MAPA_TRANSFORMACOES');
  if(!shT){
    esperadas.forEach(function(id){s262Check_(checks,'S267_CAL_'+id,false,'MAPA_TRANSFORMACOES ausente');});
  }else{
    const rowsT=s240Objects_(shT);
    esperadas.forEach(function(id){
      const r=rowsT.find(function(x){return String(x.ID_TRANSFORMACAO||'')===id;});
      const status=String(r&&r.STATUS||'').toUpperCase();
      let matrizOk=false;
      if(r){
        try{
          const m=JSON.parse(String(r.MATRIZ_JSON||''));
          matrizOk=['a','b','c','d','e','f'].every(function(k){return Number.isFinite(Number(m&&m[k]));});
        }catch(_){matrizOk=false;}
      }
      s262Check_(checks,'S267_CAL_'+id,!!r&&['VALIDADA','REVISAR'].indexOf(status)>=0&&matrizOk,(r?status:'ausente')+' | matriz='+(matrizOk?'OK':'INVÁLIDA'));
    });
  }

  const areasEsperadas=[
    'AREA-VERMELHO-N3','AREA-HOTEL-N1','AREA-CD-N1','AREA-EXTERNA-N1',
    'AREA-EXT-LAT-AZUL-N1','AREA-EXT-LAT-VERDE-N1','AREA-EXT-FRENTE-N1','AREA-EXT-HOTEL-CDM-N1'
  ];
  const shA=ss.getSheetByName('MAPA_AREAS_NIVEL');
  if(!shA){
    areasEsperadas.forEach(function(id){s262Check_(checks,'S267_AREA_'+id,false,'MAPA_AREAS_NIVEL ausente');});
  }else{
    const rowsA=s240Objects_(shA);
    areasEsperadas.forEach(function(id){
      const r=rowsA.find(function(x){return String(x.ID_AREA||'')===id;});
      const status=String(r&&r.STATUS||'').toUpperCase();
      let polOk=false,pts=0;
      if(r){
        try{
          const p=JSON.parse(String(r.POLIGONO_JSON||'[]'));
          pts=Array.isArray(p)?p.length:0;
          polOk=Array.isArray(p)&&p.length>=3&&p.every(function(pt){
            const x=Number(pt&&pt.x),y=Number(pt&&pt.y);
            return Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=1&&y>=0&&y<=1;
          });
        }catch(_){polOk=false;}
      }
      s262Check_(checks,'S267_AREA_'+id,!!r&&status==='VALIDADA'&&polOk,(r?status:'ausente')+' | pontos='+pts);
    });
  }

  const niveis=['PLA-CFF-N1-2025','PLA-CFF-N2-2025','PLA-CFF-N3-2025'];
  niveis.forEach(function(nivel){
    let cam=null;
    try{cam=appObterCamadasNivelS267B1(nivel);}catch(e){cam=null;}
    ['referencias','cruzamentos','lojas'].forEach(function(chave){
      const arr=cam&&Array.isArray(cam[chave])?cam[chave]:[];
      const coordsOk=arr.length>0&&arr.every(function(p){
        const x=Number(p&&p.x),y=Number(p&&p.y);
        return Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=1&&y>=0&&y<=1;
      });
      s262Check_(checks,'S267_'+nivel+'_'+chave.toUpperCase(),coordsOk,'total='+arr.length+' | coordenadas='+(coordsOk?'OK':'REVISAR'));
    });
  });

  let env=null;
  try{env=diagnosticoEnquadramentosS267C();}catch(e){env=null;}
  niveis.forEach(function(nivel){
    const item=env&&Array.isArray(env.itens)?env.itens.find(function(x){return x&&x.nivel===nivel;}):null;
    const b=item&&item.bounds;
    const ok=!!(item&&item.ok&&b)&&
      Number.isFinite(Number(b.minX))&&Number.isFinite(Number(b.minY))&&
      Number.isFinite(Number(b.maxX))&&Number.isFinite(Number(b.maxY))&&
      Number(b.minX)>=0&&Number(b.minY)>=0&&Number(b.maxX)<=1&&Number(b.maxY)<=1&&
      Number(b.minX)<Number(b.maxX)&&Number(b.minY)<Number(b.maxY);
    s262Check_(checks,'S267_ENVELOPE_'+nivel,ok,ok?('['+b.minX+','+b.minY+']→['+b.maxX+','+b.maxY+']'):'inválido/ausente');
  });

  s262Check_(checks,'S267_SETORES_PRESERVADOS',!!ss.getSheetByName('MAPAS_SETORES'),'MAPAS_SETORES');
  s262Check_(checks,'S267_REFERENCIAS_FONTE',!!ss.getSheetByName('PONTOS_REFERENCIA'),'PONTOS_REFERENCIA');
  s262Check_(checks,'S267_CRUZAMENTOS_FONTE',!!ss.getSheetByName('CRUZAMENTOS'),'CRUZAMENTOS');
  s262Check_(checks,'S267_LOJAS_FONTE',!!ss.getSheetByName('LOJAS_MAPA'),'LOJAS_MAPA');

  const falhas=checks.filter(function(c){return !c.ok;}).length;
  return {ok:falhas===0,totalChecks:checks.length,falhas:falhas,checks:checks};
}

function diagnosticoFinalS267(){
  exigirPermissaoS14_('administrar');
  const ss=SpreadsheetApp.getActive();
  const cfg=s262LerConfigDireto_(ss);
  const checks=[];

  // Metadados correntes da release.
  s262Check_(checks,'APP_ID',APP.ID==='SINALIZACAO_MALL',APP.ID||'ausente');
  s262Check_(checks,'APP_VERSAO_RUNTIME_CONFIG',APP.VERSAO==='MVP-3.29.0-SINALIZACAO-S26.7'&&cfg.APP_VERSAO===APP.VERSAO,'runtime='+APP.VERSAO+' | config='+(cfg.APP_VERSAO||'ausente'));
  s262Check_(checks,'APP_FASE_RUNTIME_CONFIG',APP.FASE==='S26.7'&&cfg.APP_FASE==='S26.7','runtime='+APP.FASE+' | config='+(cfg.APP_FASE||'ausente'));
  s262Check_(checks,'TIMEZONE_RUNTIME',APP.TIMEZONE==='America/Fortaleza',APP.TIMEZONE||'ausente');
  s262Check_(checks,'TIMEZONE_PLANILHA',String(ss.getSpreadsheetTimeZone?ss.getSpreadsheetTimeZone():'')==='America/Fortaleza',String(ss.getSpreadsheetTimeZone?ss.getSpreadsheetTimeZone():'')||'ausente');
  s262Check_(checks,'MODO_DADOS_RUNTIME',APP.MODO_DADOS==='LOCAL_INDEPENDENTE',APP.MODO_DADOS||'ausente');

  // Checkpoint anterior deve permanecer registrado como histórico aprovado.
  s262Check_(checks,'BASE_S2662_STATUS',cfg.S2662_STATUS==='APROVADO',cfg.S2662_STATUS||'ausente');
  s262Check_(checks,'BASE_S2662_GATE_REGRESSAO',cfg.S2662_GATE_REGRESSAO==='APROVADO',cfg.S2662_GATE_REGRESSAO||'ausente');
  s262Check_(checks,'BASE_S2662_CHECKS',cfg.S2662_CHECKS_ESTRUTURAIS==='62/62',cfg.S2662_CHECKS_ESTRUTURAIS||'ausente');
  s262Check_(checks,'BASE_S2662_SOFT_DELETE',cfg.S2662_SOFT_DELETE==='FORA_ESCOPO',cfg.S2662_SOFT_DELETE||'ausente');

  // Marcadores formais da S26.7.
  s262Check_(checks,'S267_STATUS',cfg.S267_STATUS==='APROVADO',cfg.S267_STATUS||'ausente');
  s262Check_(checks,'S267_GATE_ESTRUTURAL',cfg.S267_GATE_ESTRUTURAL==='99/99',cfg.S267_GATE_ESTRUTURAL||'ausente');
  s262Check_(checks,'S267_GATE_OPERACIONAL',cfg.S267_GATE_OPERACIONAL==='APROVADO',cfg.S267_GATE_OPERACIONAL||'ausente');
  s262Check_(checks,'S267_NIVEIS_OPERACIONAIS',cfg.S267_NIVEIS_OPERACIONAIS==='SIM',cfg.S267_NIVEIS_OPERACIONAIS||'ausente');
  s262Check_(checks,'S267_CAMADAS_NIVEIS',cfg.S267_CAMADAS_NIVEIS==='SIM',cfg.S267_CAMADAS_NIVEIS||'ausente');
  s262Check_(checks,'S267_PROJECAO_CAMADAS',cfg.S267_PROJECAO_CAMADAS==='SIM',cfg.S267_PROJECAO_CAMADAS||'ausente');
  s262Check_(checks,'S267_ENQUADRAMENTO_OPERACIONAL',cfg.S267_ENQUADRAMENTO_OPERACIONAL==='SIM',cfg.S267_ENQUADRAMENTO_OPERACIONAL||'ausente');
  s262Check_(checks,'S267_SOFT_DELETE',cfg.S267_SOFT_DELETE==='FORA_ESCOPO',cfg.S267_SOFT_DELETE||'ausente');

  // Estruturas e APIs essenciais preservadas.
  ['CONFIG','REGISTROS','REGISTRO_FOTOS','REGISTRO_HISTORICO','USUARIOS','MAPAS_SETORES','PLANTAS','MAPA_TRANSFORMACOES','MAPA_AREAS_NIVEL','CARTOGRAFIA_HISTORICO','CARTOGRAFIA_PUBLICACOES','CAMADAS_PRESETS_CORPORATIVOS']
    .forEach(function(nome){s262Check_(checks,'ABA_'+nome,!!ss.getSheetByName(nome),nome);});
  const apisCriticas=[
    ['AUTH_LOGIN_PIN',typeof appLoginMallS223==='function','appLoginMallS223'],
    ['AUTH_RPC_PIN',typeof appRpcS223==='function','appRpcS223'],
    ['MAPA_SIG_SETOR',typeof appListarRegistrosMapaS4==='function','appListarRegistrosMapaS4'],
    ['MAPA_SIG_NIVEL',typeof appListarRegistrosNivelS242==='function','appListarRegistrosNivelS242'],
    ['OFFLINE_MANIFEST',typeof appObterManifestOfflineS5B==='function','appObterManifestOfflineS5B'],
    ['OFFLINE_PACOTE_MAPA',typeof appObterPacoteMapaOfflineS5B==='function','appObterPacoteMapaOfflineS5B'],
    ['OFFLINE_LOCALIZACAO',typeof appObterDadosLocalizacaoOfflineS6==='function','appObterDadosLocalizacaoOfflineS6'],
    ['CART_PUBLICAR',typeof appPublicarCartografiaS255==='function','appPublicarCartografiaS255'],
    ['CART_SNAPSHOT_CRIAR',typeof appCriarSnapshotCartograficoS253==='function','appCriarSnapshotCartograficoS253'],
    ['CART_RESTAURAR',typeof appRestaurarSnapshotCartograficoS254==='function','appRestaurarSnapshotCartograficoS254'],
    ['PRESET_LISTAR',typeof appListarPresetsCorporativosS266==='function','appListarPresetsCorporativosS266'],
    ['PRESET_SALVAR',typeof appSalvarPresetCorporativoS266==='function','appSalvarPresetCorporativoS266'],
    ['PRESET_PADRAO',typeof appDefinirPadraoPresetCorporativoS266==='function','appDefinirPadraoPresetCorporativoS266'],
    ['RELATORIO_GERENCIAL',typeof appRelatorioGerencialS14==='function','appRelatorioGerencialS14']
  ];
  apisCriticas.forEach(function(c){s262Check_(checks,'API_'+c[0],c[1],c[2]);});
  s262Check_(checks,'S231_RUNTIME',typeof S231!=='undefined'&&!!S231,'const S231 disponível');
  const nAtual=s266NumeroFaseSetup_('S26.7'),nAntiga=s266NumeroFaseSetup_('S26.6');
  s262Check_(checks,'SETUP_HISTORICO_COMPARADOR',nAtual!==null&&nAntiga!==null&&nAtual>nAntiga,'S26.7 > S26.6');

  const estrutural=diagnosticoEstruturalS267Final_();
  estrutural.checks.forEach(function(c){s262Check_(checks,c.nome,c.ok,c.detalhe);});

  const falhas=checks.filter(function(c){return !c.ok;}).length;
  return {
    ok:falhas===0,
    version:APP.VERSAO,
    fase:APP.FASE,
    diagnostico:'S26.7-RELEASE-FINAL',
    totalChecks:checks.length,
    falhas:falhas,
    checks:checks,
    observacoes:[
      'S26.7-A/B/B.1/C/D consolidadas e regressão operacional confirmada.',
      'Níveis 2025 são visualizações operacionais de primeira classe; permissões continuam independentes.',
      'Projeções de Referências/Cruzamentos/Lojas são derivadas em memória/cache; dados fonte permanecem nos Setores.',
      'Setores preservam o fit histórico; envelope operacional aplica-se somente aos Níveis 2025.',
      'Soft delete permanece fora do escopo desta release.'
    ]
  };
}

function mostrarDiagnosticoFinalS267(){
  const d=diagnosticoFinalS267();
  const status=d.ok?'S26.7 APROVADA':'S26.7 COM PENDÊNCIAS';
  console.log([
    status,
    'Versão: '+d.version,
    'Fase: '+d.fase,
    'Diagnóstico: '+d.diagnostico,
    'Checks: '+d.totalChecks,
    'Falhas: '+d.falhas
  ].join('\n'));
  d.checks.forEach(function(c){console.log((c.ok?'OK':'FALHA')+' | '+c.nome+' | '+c.detalhe);});
  d.observacoes.forEach(function(o){console.log('INFO | '+o);});
  return d;
}

/* ============================================================
 * S26.8-E1 — GATE INTEGRADO FINAL / PRÉ-REGRESSÃO
 * Somente leitura.
 * Candidato: MVP-3.30.0-SINALIZACAO-S26.8
 * ============================================================ */

function diagnosticoS268E1() {
  const CANDIDATO = 'MVP-3.30.0-SINALIZACAO-S26.8';
  const DIAGNOSTICO = 'S26.8-E1-PRE-REGRESSAO-INTEGRADA';
  const checks = [];

  function check(nome, ok, detalhe) {
    const item = {
      nome: String(nome || ''),
      ok: !!ok,
      detalhe: String(detalhe == null ? '' : detalhe)
    };
    checks.push(item);

    Logger.log(
      (item.ok ? 'OK' : 'FALHA') +
      ' | ' + item.nome +
      ' | ' + item.detalhe
    );

    return item.ok;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

/* ----------------------------------------------------------
 * 1. BASE ATUAL — CONFIG é a fonte de verdade
 * S26.8-E1 FIX1
 * ---------------------------------------------------------- */

function s268E1ValorConfig_(chave) {
  const sh = ss.getSheetByName('CONFIG');
  if (!sh) return '';

  const dados = sh.getDataRange().getDisplayValues();
  const alvo = String(chave || '').trim().toUpperCase();

  for (let r = 0; r < dados.length; r++) {
    for (let c = 0; c < dados[r].length; c++) {
      const atual = String(dados[r][c] || '').trim().toUpperCase();

      if (atual !== alvo) continue;

      // Padrão mais comum: CHAVE | VALOR
      if (c + 1 < dados[r].length) {
        const direita = String(dados[r][c + 1] || '').trim();
        if (direita) return direita;
      }

      // Fallback para estruturas verticais.
      if (r + 1 < dados.length) {
        const abaixo = String(dados[r + 1][c] || '').trim();
        if (abaixo) return abaixo;
      }
    }
  }

  return '';
}

const versaoConfig = s268E1ValorConfig_('APP_VERSAO');
const faseConfig = s268E1ValorConfig_('APP_FASE');

check(
  'BASE_APP_VERSAO',
  versaoConfig === 'MVP-3.29.0-SINALIZACAO-S26.7',
  versaoConfig || 'APP_VERSAO ausente em CONFIG'
);

check(
  'BASE_APP_FASE',
  faseConfig === 'S26.7',
  faseConfig || 'APP_FASE ausente em CONFIG'
);

  /* ----------------------------------------------------------
   * 2. ABAS CRÍTICAS
   * ---------------------------------------------------------- */

  [
    'CONFIG',
    'REGISTROS',
    'REGISTRO_FOTOS',
    'REGISTRO_HISTORICO',
    'USUARIOS',

    'PLANTAS',
    'MAPAS_SETORES',
    'MAPA_TRANSFORMACOES',
    'MAPA_AREAS_NIVEL',

    'CARTOGRAFIA_HISTORICO',
    'CARTOGRAFIA_PUBLICACOES',
    'CARTOGRAFIA_AREAS_FISICAS',

    'CAMADAS_PRESETS_CORPORATIVOS'
  ].forEach(function(nome) {
    check(
      'ABA_' + nome,
      !!ss.getSheetByName(nome),
      nome
    );
  });

  /* ----------------------------------------------------------
   * 3. PLANTAS OPERACIONAIS
   * ---------------------------------------------------------- */

  const shPlantas = ss.getSheetByName('PLANTAS');

  if (shPlantas) {
    const valores = shPlantas.getDataRange().getDisplayValues();
    const texto = valores.map(function(r) {
      return r.join('|');
    }).join('\n');

    [
      'PLA-CFF-N0-2025',
      'PLA-CFF-N1-2025',
      'PLA-CFF-N2-2025',
      'PLA-CFF-N3-2025'
    ].forEach(function(id) {
      check(
        'PLANTA_' + id,
        texto.indexOf(id) >= 0,
        id
      );
    });
  }

  /* ----------------------------------------------------------
   * 4. APIs ESSENCIAIS
   * ---------------------------------------------------------- */

  check(
    'API_AUTH_LOGIN',
    typeof appLoginMallS223 === 'function',
    'appLoginMallS223'
  );

  check(
    'API_AUTH_RPC',
    typeof appRpcS223 === 'function',
    'appRpcS223'
  );

  check(
    'API_MAPA_SETOR',
    typeof appListarRegistrosMapaS4 === 'function',
    'appListarRegistrosMapaS4'
  );

  check(
    'API_MAPA_NIVEL',
    typeof appListarRegistrosNivelS242 === 'function',
    'appListarRegistrosNivelS242'
  );

  /* ----------------------------------------------------------
   * 5. OFFLINE-FIRST
   * ---------------------------------------------------------- */

  check(
    'API_OFFLINE_MANIFEST',
    typeof appObterManifestOfflineS5B === 'function',
    'appObterManifestOfflineS5B'
  );

  check(
    'API_OFFLINE_PACOTE',
    typeof appObterPacoteMapaOfflineS5B === 'function',
    'appObterPacoteMapaOfflineS5B'
  );

  check(
    'API_OFFLINE_LOCALIZACAO',
    typeof appObterDadosLocalizacaoOfflineS6 === 'function',
    'appObterDadosLocalizacaoOfflineS6'
  );

  /* ----------------------------------------------------------
   * 6. NÍVEIS 2025 / S26.7
   * ---------------------------------------------------------- */

  check(
    'API_CAMADAS_NIVEL',
    typeof appObterCamadasNivelS267B1 === 'function',
    'appObterCamadasNivelS267B1'
  );

  check(
    'API_ENQUADRAMENTO_NIVEL',
    typeof appObterEnquadramentoNivelS267C === 'function',
    'appObterEnquadramentoNivelS267C'
  );

  /* ----------------------------------------------------------
   * 7. RELATÓRIO EM LOTES / S26.8-B
   * ---------------------------------------------------------- */

  check(
    'RELATORIO_LOTES_INICIAR',
    typeof appIniciarApresentacaoS268B === 'function',
    'appIniciarApresentacaoS268B'
  );

  check(
    'RELATORIO_LOTES_CONTINUAR',
    typeof appContinuarApresentacaoS268B === 'function',
    'appContinuarApresentacaoS268B'
  );

  check(
    'RELATORIO_LOTES_STATUS',
    typeof appStatusApresentacaoS268B === 'function',
    'appStatusApresentacaoS268B'
  );

  /* ----------------------------------------------------------
   * 8. CARTOGRAFIA N0 / D1-D3
   * ---------------------------------------------------------- */

  check(
    'DIAG_D1',
    typeof diagnosticoS268D1 === 'function',
    'diagnosticoS268D1'
  );

  check(
    'DIAG_D2',
    typeof diagnosticoS268D2 === 'function',
    'diagnosticoS268D2'
  );

  check(
    'DIAG_D3',
    typeof diagnosticoS268D3 === 'function',
    'diagnosticoS268D3'
  );

  check(
    'GATE_D3',
    typeof diagnosticoGateS268D3 === 'function',
    'diagnosticoGateS268D3'
  );

  /* Executa novamente o Gate D3, somente leitura. */

  let d3 = null;

  if (typeof diagnosticoGateS268D3 === 'function') {
    try {
      d3 = diagnosticoGateS268D3();

      check(
        'D3_GATE_APROVADO',
        !!(d3 && d3.ok && Number(d3.falhas || 0) === 0),
        d3
          ? String(d3.totalChecks || 0) +
            ' checks / ' +
            String(d3.falhas || 0) +
            ' falhas'
          : 'sem retorno'
      );
    } catch (e) {
      check(
        'D3_GATE_APROVADO',
        false,
        e && e.message ? e.message : String(e)
      );
    }
  }

  /* ----------------------------------------------------------
   * 9. PRESETS / CENTRAL DE CAMADAS
   * ---------------------------------------------------------- */

  check(
    'API_PRESET_LISTAR',
    typeof appListarPresetsCorporativosS266 === 'function',
    'appListarPresetsCorporativosS266'
  );

  check(
    'API_PRESET_SALVAR',
    typeof appSalvarPresetCorporativoS266 === 'function',
    'appSalvarPresetCorporativoS266'
  );

  /* ----------------------------------------------------------
   * RESULTADO
   * ---------------------------------------------------------- */

  const falhas = checks.filter(function(c) {
    return !c.ok;
  });

  const resultado = {
    ok: falhas.length === 0,
    candidato: CANDIDATO,
    diagnostico: DIAGNOSTICO,
    totalChecks: checks.length,
    falhas: falhas.length,
    checks: checks,
    proximosGates: [
      'E2_N0_ONLINE',
      'E3_CORRESPONDENCIA_N0_N1',
      'E4_OFFLINE_DEGRADADO',
      'E5_REGRESSAO_SETORES_NIVEIS',
      'E6_CADASTRO_FILA',
      'E7_RELATORIO_GOOGLE_SLIDES'
    ],
    somenteLeitura: true
  };

  Logger.log(
    'S26.8-E1 ' +
    (resultado.ok
      ? 'PRONTA PARA REGRESSÃO'
      : 'COM PENDÊNCIAS') +
    ' | Candidato: ' + CANDIDATO +
    ' | Checks: ' + resultado.totalChecks +
    ' | Falhas: ' + resultado.falhas
  );

  Logger.log('[S26.8-E1] ' + JSON.stringify(resultado));

  Logger.log(
    'INFO | Diagnóstico somente leitura; nenhuma escrita operacional executada.'
  );

  Logger.log(
    'INFO | APP_VERSAO e APP_FASE ainda não devem ser promovidos para S26.8.'
  );

  Logger.log(
    'INFO | Soft delete continua fora do escopo por decisão do projeto.'
  );

  return resultado;
}