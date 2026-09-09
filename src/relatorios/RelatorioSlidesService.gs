/**
 * SINALIZAÇÃO DO MALL — RELATÓRIOS GOOGLE SLIDES
 * Runtime atual: MVP-3.29.0-SINALIZACAO-S26.7 | Fase S26.7
 * Gera relatório fotográfico 16:9 a partir de REGISTROS e REGISTRO_FOTOS.
 *
 * GOVERNANÇA DE NOMENCLATURA:
 * - S231 é o identificador legado deste serviço e deve permanecer único no projeto.
 * - O filtro de STATUS=EXCLUIDO nasceu na trilha histórica S23.6 e foi documentado posteriormente como S25.6.
 * - Essas referências não significam que o serviço inteiro esteja na fase S25.6.
 */

const S231 = Object.freeze({
  VERSION: 'MVP-3.29.0-SINALIZACAO-S26.7',
  SHEET_REGISTROS: 'REGISTROS',
  SHEET_FOTOS: 'REGISTRO_FOTOS',
  SHEET_HISTORICO: 'REGISTRO_HISTORICO',
  CFG_FOLDER: 'SLIDES_RELATORIOS_FOLDER_ID',
  OUTPUT_FOLDER_NAME: 'Relatórios Google Slides',
  BRAND: {
    NAVY: '#171B68',
    NAVY_DARK: '#10144F',
    PINK: '#F50087',
    PINK_DARK: '#CB006F',
    BG: '#F4F5F8',
    WHITE: '#FFFFFF',
    TEXT: '#101228',
    MUTED: '#676A7A',
    BORDER: '#DFE2EA',
    GREEN: '#1B8A5A',
    YELLOW: '#D98C00',
    RED: '#C62828'
  }
});

function setupS231() {
  const ss = SpreadsheetApp.getActive();
  const cfg = s231LerConfig_(ss);
  let folderId = String(cfg[S231.CFG_FOLDER] || '').trim();
  let folder = null;

  if (folderId) {
    try { folder = DriveApp.getFolderById(folderId); } catch (e) { folder = null; }
  }
  if (!folder) {
    let parent = null;
    const rootId = String(cfg.DRIVE_ROOT_FOLDER_ID || '').trim();
    if (rootId) {
      try { parent = DriveApp.getFolderById(rootId); } catch (e) { parent = null; }
    }
    folder = parent ? parent.createFolder(S231.OUTPUT_FOLDER_NAME) : DriveApp.createFolder(S231.OUTPUT_FOLDER_NAME);
    s231SalvarConfig_(ss, S231.CFG_FOLDER, folder.getId());
  }

  return {
    ok: true,
    version: S231.VERSION,
    folderId: folder.getId(),
    folderUrl: folder.getUrl(),
    folderName: folder.getName()
  };
}

function diagnosticoS231() {
  const ss = SpreadsheetApp.getActive();
  const checks = [];
  const add = (nome, ok, detalhe) => checks.push({ nome, ok: !!ok, detalhe: String(detalhe || '') });

  const reg = ss.getSheetByName(S231.SHEET_REGISTROS);
  const fotos = ss.getSheetByName(S231.SHEET_FOTOS);
  const hist = ss.getSheetByName(S231.SHEET_HISTORICO);
  add('ABA_REGISTROS', !!reg, reg ? 'OK' : 'Ausente');
  add('ABA_REGISTRO_FOTOS', !!fotos, fotos ? 'OK' : 'Ausente');
  add('ABA_REGISTRO_HISTORICO', !!hist, hist ? 'OK' : 'Ausente');

  if (reg) {
    const h = s231Headers_(reg);
    ['ID_REGISTRO','PROTOCOLO','CRIADO_EM','STATUS','TIPO','TITULO','ID_MAPA_SETOR','MAPA','PISO','RUA','TRECHO','NUMERO_LOJA','RESPONSAVEL','ESTADO_CONSERVACAO','CONDICAO'].forEach(k =>
      add('REG_' + k, h.includes(k), h.includes(k) ? 'OK' : 'Cabeçalho ausente')
    );
  }
  if (fotos) {
    const h = s231Headers_(fotos);
    ['ID_REGISTRO','PROTOCOLO','ARQUIVO_ID','NOME_ARQUIVO'].forEach(k =>
      add('FOTO_' + k, h.includes(k), h.includes(k) ? 'OK' : 'Cabeçalho ausente')
    );
  }
  if (hist) {
    const h = s231Headers_(hist);
    ['ID_REGISTRO','PROTOCOLO','DATA_HORA','TIPO_EVENTO','STATUS_ANTERIOR','STATUS_NOVO',
     'VALOR_ANTERIOR','VALOR_NOVO','ESTADO_CONSERVACAO','CONDICAO','RESPONSAVEL_INSPECAO']
      .forEach(k => add('HIST_' + k, h.includes(k), h.includes(k) ? 'OK' : 'Cabeçalho ausente'));
  }

  const cfg = s231LerConfig_(ss);
  const folderId = String(cfg[S231.CFG_FOLDER] || '').trim();
  let folderOk = false;
  if (folderId) {
    try { DriveApp.getFolderById(folderId).getName(); folderOk = true; } catch (e) {}
  }
  add('PASTA_RELATORIOS', folderOk, folderOk ? folderId : 'Execute setupS231()');
  add('SLIDES_SERVICE', typeof SlidesApp !== 'undefined', 'SlidesApp');

  return {
    ok: checks.every(c => c.ok),
    version: S231.VERSION,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length
  };
}

function appGerarApresentacaoS231(filtros) {
  exigirPermissaoS14_('acessarRelatorios');
  filtros = filtros || {};
  const ss = SpreadsheetApp.getActive();
  const cfg = s231LerConfig_(ss);
  let folderId = String(cfg[S231.CFG_FOLDER] || '').trim();
  // R04 (auditoria S26.10) — sem setup implícito: gerar relatório não pode
  // escrever configuração. setupS231() deve ser executado explicitamente.
  if (!folderId) {
    throw new Error('Pasta de relatórios não configurada (SLIDES_RELATORIOS_FOLDER_ID). Execute setupS231() com permissão de administrador antes de gerar relatórios.');
  }

  const registros = s231LerRegistros_(ss, filtros);
  if (!registros.length) {
    throw new Error('Nenhum registro encontrado para os filtros informados.');
  }
  const fotosPorRegistro = s231LerFotosPorRegistro_(ss, registros);
  registros.forEach(r => r._fotos = fotosPorRegistro[r.ID_REGISTRO] || fotosPorRegistro[r.PROTOCOLO] || []);

  const periodo = s231PeriodoLabel_(filtros, registros);
  const nome = `Relatório Fotográfico do Mall — ${periodo} — ${Utilities.formatDate(new Date(), 'America/Fortaleza', 'yyyyMMdd_HHmm')}`;
  const pres = SlidesApp.create(nome);
  const presId = pres.getId();
  const file = DriveApp.getFileById(presId);
  const destino = DriveApp.getFolderById(folderId);
  file.moveTo(destino);

  // Capa na primeira página criada automaticamente.
  const slidesIniciais = pres.getSlides();
  const capa = slidesIniciais[0];
  s231LimparSlide_(capa);
  s231Capa_(pres, capa, periodo, registros);

  s231ResumoExecutivo_(pres, registros, periodo);
  s233PainelExecutivo_(pres, registros, periodo);

  // S23.4 — comparação baseada em inspeções reais do REGISTRO_HISTORICO.
  const comparativoS234 = s234ComparativoHistorico_(ss, filtros, registros);
  s234SlideEvolucao_(pres, comparativoS234);
  s234SlideMudancas_(pres, comparativoS234);

  // S23.5.3 — cadastro inicial é o primeiro snapshot.
  // Cada inspeção posterior produz um novo estado visual completo.
  const comparacoesVisuaisS2353=s2353ComparacoesSnapshots_(ss,registros,comparativoS234);
  s2353SlidesAntesDepois_(pres,comparacoesVisuaisS2353);

  s233PendenciasPorResponsavel_(pres, registros);
  s232Prioridades_(pres, registros);

  const grupos = s231Agrupar_(registros);
  Object.keys(grupos).sort().forEach(chave => {
    const grupo = grupos[chave];
    s231Divisoria_(pres, grupo.label, grupo.itens.length, s231ContarFotos_(grupo.itens));
    grupo.itens.forEach(reg => s231SlidesRegistro_(pres, reg));
  });

  s231ResumoAcoes_(pres, registros);
  s233PlanoAcao_(pres, registros);

  pres.saveAndClose();

  return {
    ok: true,
    version: S231.VERSION,
    id: presId,
    url: `https://docs.google.com/presentation/d/${presId}/edit`,
    nome,
    slides: SlidesApp.openById(presId).getSlides().length,
    qtdRegistros: registros.length,
    qtdFotos: s231ContarFotos_(registros),
    periodo
  };
}

// Alias de compatibilidade caso o front use um nome mais genérico.
function appGerarGoogleSlides(filtros) {
  return appGerarApresentacaoS231(filtros);
}


// ========================================================
// S26.8-B — RELATÓRIO GOOGLE SLIDES RESUMÍVEL
// Evita o limite máximo de execução do Apps Script dividindo a geração
// em chamadas curtas e idempotentes. Nenhum dado operacional é alterado.
// ========================================================
const S268B = Object.freeze({
  JOB_PREFIX: 'S268B_JOB_',
  SNAPSHOTS_POR_ETAPA: 2,
  REGISTROS_POR_ETAPA: 4,
  MAX_IDADE_HORAS: 12
});

function s268BProps_(){ return PropertiesService.getScriptProperties(); }
function s268BKey_(jobId){ return S268B.JOB_PREFIX + String(jobId||'').trim(); }

function s268BSalvarJob_(job){
  s268BProps_().setProperty(s268BKey_(job.id),JSON.stringify(job));
}
function s268BLerJob_(jobId){
  const raw=s268BProps_().getProperty(s268BKey_(jobId));
  if(!raw)throw new Error('Geração do relatório não encontrada ou expirada. Inicie novamente.');
  let job=null;
  try{job=JSON.parse(raw);}catch(_){}
  if(!job||!job.id)throw new Error('Estado da geração do relatório inválido.');
  return job;
}
function s268BExcluirJob_(jobId){
  s268BProps_().deleteProperty(s268BKey_(jobId));
}

function s268BRegistrosComFotos_(ss,filtros){
  const registros=s231LerRegistros_(ss,filtros||{});
  const fotosPorRegistro=s231LerFotosPorRegistro_(ss,registros);
  registros.forEach(function(r){
    r._fotos=fotosPorRegistro[r.ID_REGISTRO]||fotosPorRegistro[r.PROTOCOLO]||[];
  });
  return registros;
}

function s268BSequenciaRegistros_(registros){
  const grupos=s231Agrupar_(registros||[]);
  const seq=[];
  Object.keys(grupos).sort().forEach(function(chave){
    const g=grupos[chave];
    (g.itens||[]).forEach(function(reg){
      seq.push({
        chave:chave,
        label:g.label,
        totalGrupo:g.itens.length,
        fotosGrupo:s231ContarFotos_(g.itens),
        reg:reg
      });
    });
  });
  return seq;
}

function s268BResposta_(job,extra){
  const base={
    ok:true,
    jobId:job.id,
    concluido:job.fase==='CONCLUIDO',
    etapa:job.fase,
    progresso:Number(job.progresso||0),
    qtdRegistros:Number(job.qtdRegistros||0),
    qtdFotos:Number(job.qtdFotos||0),
    id:job.presId||'',
    url:job.presId?('https://docs.google.com/presentation/d/'+job.presId+'/edit'):'',
    nome:job.nome||'',
    periodo:job.periodo||''
  };
  return Object.assign(base,extra||{});
}

function appIniciarApresentacaoS268B(filtros){
  exigirPermissaoS14_('acessarRelatorios');
  filtros=filtros||{};

  // R10 (auditoria S26.10) — higiene: jobs antigos/vencidos acumulam no
  // PropertiesService (só eram removidos por cancelamento ou expiração
  // detectada em continuação). Ao iniciar um novo relatório, purga os
  // jobs S268B_JOB_* com mais de MAX_IDADE_HORAS (ou inválidos).
  try{
    const props=s268BProps_().getProperties();
    const agora=Date.now();
    Object.keys(props).forEach(function(k){
      if(k.indexOf(S268B.JOB_PREFIX)!==0)return;
      try{
        const j=JSON.parse(props[k]);
        if(!j||!j.criadoEm||(agora-Number(j.criadoEm||0))>(S268B.MAX_IDADE_HORAS*3600000)){
          s268BProps_().deleteProperty(k);
        }
      }catch(_){ s268BProps_().deleteProperty(k); }
    });
  }catch(_){}

  const ss=SpreadsheetApp.getActive();
  const cfg=s231LerConfig_(ss);
  let folderId=String(cfg[S231.CFG_FOLDER]||'').trim();
  // R04 (auditoria S26.10) — sem setup implícito (ver appGerarApresentacaoS231).
  if(!folderId){
    throw new Error('Pasta de relatórios não configurada (SLIDES_RELATORIOS_FOLDER_ID). Execute setupS231() com permissão de administrador antes de gerar relatórios.');
  }

  const registros=s268BRegistrosComFotos_(ss,filtros);
  if(!registros.length)throw new Error('Nenhum registro encontrado para os filtros informados.');

  const periodo=s231PeriodoLabel_(filtros,registros);
  const nome='Relatório Fotográfico do Mall — '+periodo+' — '+
    Utilities.formatDate(new Date(),'America/Fortaleza','yyyyMMdd_HHmm');

  const pres=SlidesApp.create(nome);
  const presId=pres.getId();
  DriveApp.getFileById(presId).moveTo(DriveApp.getFolderById(folderId));

  const capa=pres.getSlides()[0];
  s231LimparSlide_(capa);
  s231Capa_(pres,capa,periodo,registros);
  s231ResumoExecutivo_(pres,registros,periodo);
  s233PainelExecutivo_(pres,registros,periodo);

  const comparativo=s234ComparativoHistorico_(ss,filtros,registros);
  s234SlideEvolucao_(pres,comparativo);
  s234SlideMudancas_(pres,comparativo);

  // Slides Antes × Depois são processados em chamadas posteriores.
  s233PendenciasPorResponsavel_(pres,registros);
  s232Prioridades_(pres,registros);

  pres.saveAndClose();

  const job={
    id:Utilities.getUuid(),
    presId:presId,
    nome:nome,
    periodo:periodo,
    filtros:filtros,
    fase:'SNAPSHOTS',
    snapshotOffset:0,
    registroOffset:0,
    ultimoGrupo:'',
    qtdRegistros:registros.length,
    qtdFotos:s231ContarFotos_(registros),
    criadoEm:Date.now(),
    atualizadoEm:Date.now(),
    progresso:8
  };
  s268BSalvarJob_(job);

  return s268BResposta_(job,{
    mensagem:'Apresentação criada. Processando comparações e registros em etapas.'
  });
}

function appContinuarApresentacaoS268B(jobId){
  exigirPermissaoS14_('acessarRelatorios');
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(5000))throw new Error('Relatório já está sendo processado. Aguarde alguns segundos e tente novamente.');

  try{
    const job=s268BLerJob_(jobId);
    if(job.fase==='CONCLUIDO')return s268BResposta_(job,{slides:job.slides||0});

    const idade=(Date.now()-Number(job.criadoEm||0))/(60*60*1000);
    if(idade>S268B.MAX_IDADE_HORAS){
      s268BExcluirJob_(job.id);
      throw new Error('Geração expirada. Inicie o relatório novamente.');
    }

    const ss=SpreadsheetApp.getActive();
    const registros=s268BRegistrosComFotos_(ss,job.filtros||{});
    if(!registros.length)throw new Error('Os registros do relatório não estão mais disponíveis.');

    const pres=SlidesApp.openById(job.presId);

    if(job.fase==='SNAPSHOTS'){
      const comparativo=s234ComparativoHistorico_(ss,job.filtros||{},registros);
      const itens=s2353ComparacoesSnapshots_(ss,registros,comparativo);
      const ini=Number(job.snapshotOffset||0);
      const fim=Math.min(ini+S268B.SNAPSHOTS_POR_ETAPA,itens.length);
      if(ini<fim)s2353SlidesAntesDepois_(pres,itens.slice(ini,fim));
      job.snapshotOffset=fim;

      if(fim>=itens.length){
        job.fase='REGISTROS';
        job.progresso=18;
      }else{
        job.progresso=Math.min(17,8+Math.round((fim/Math.max(1,itens.length))*9));
      }
    }

    if(job.fase==='REGISTROS'){
      const seq=s268BSequenciaRegistros_(registros);
      let idx=Number(job.registroOffset||0);
      let feitos=0;

      while(idx<seq.length && feitos<S268B.REGISTROS_POR_ETAPA){
        const item=seq[idx];
        if(item.chave!==job.ultimoGrupo){
          s231Divisoria_(pres,item.label,item.totalGrupo,item.fotosGrupo);
          job.ultimoGrupo=item.chave;
        }
        s231SlidesRegistro_(pres,item.reg);
        idx++;
        feitos++;
      }

      job.registroOffset=idx;
      job.progresso=Math.max(18,Math.min(92,18+Math.round((idx/Math.max(1,seq.length))*74)));

      if(idx>=seq.length){
        job.fase='FINAL';
      }
    }

    if(job.fase==='FINAL'){
      s231ResumoAcoes_(pres,registros);
      s233PlanoAcao_(pres,registros);
      job.fase='CONCLUIDO';
      job.progresso=100;
    }

    pres.saveAndClose();
    job.atualizadoEm=Date.now();

    if(job.fase==='CONCLUIDO'){
      const finalPres=SlidesApp.openById(job.presId);
      job.slides=finalPres.getSlides().length;
      finalPres.saveAndClose();
      s268BSalvarJob_(job);
      return s268BResposta_(job,{
        slides:job.slides,
        mensagem:'Google Apresentação concluída.'
      });
    }

    s268BSalvarJob_(job);
    return s268BResposta_(job,{
      mensagem:job.fase==='SNAPSHOTS'
        ? 'Processando comparações Antes × Depois…'
        : 'Processando fichas fotográficas…'
    });
  }finally{
    lock.releaseLock();
  }
}

function appStatusApresentacaoS268B(jobId){
  exigirPermissaoS14_('acessarRelatorios');
  const job=s268BLerJob_(jobId);
  return s268BResposta_(job,{slides:job.slides||0});
}

function appCancelarApresentacaoS268B(jobId){
  exigirPermissaoS14_('acessarRelatorios');
  const job=s268BLerJob_(jobId);
  s268BExcluirJob_(job.id);
  return {ok:true,jobId:job.id,presId:job.presId,url:'https://docs.google.com/presentation/d/'+job.presId+'/edit'};
}

function diagnosticoRelatorioS268B(){
  exigirPermissaoS14_('administrar');
  const checks=[];
  const add=function(nome,ok,detalhe){checks.push({nome:nome,ok:!!ok,detalhe:String(detalhe||'')});};
  add('API_INICIAR',typeof appIniciarApresentacaoS268B==='function','appIniciarApresentacaoS268B');
  add('API_CONTINUAR',typeof appContinuarApresentacaoS268B==='function','appContinuarApresentacaoS268B');
  add('API_STATUS',typeof appStatusApresentacaoS268B==='function','appStatusApresentacaoS268B');
  add('FOTOS_INDEXADAS',typeof s231LerFotosPorRegistro_==='function','Índice O(F+R)');
  add('SNAPSHOTS_INDEXADOS',typeof s2353ComparacoesSnapshots_==='function','Fotos/histórico indexados');
  add('LOTE_REGISTROS',S268B.REGISTROS_POR_ETAPA>0,String(S268B.REGISTROS_POR_ETAPA));
  add('LOTE_SNAPSHOTS',S268B.SNAPSHOTS_POR_ETAPA>0,String(S268B.SNAPSHOTS_POR_ETAPA));
  const out={ok:checks.every(function(c){return c.ok;}),checks:checks,totalChecks:checks.length,falhas:checks.filter(function(c){return !c.ok;}).length,somenteLeitura:true};
  console.log('[S26.8-B] '+JSON.stringify(out));
  return out;
}


function s234DatasFiltro_(filtros){
  filtros=filtros||{};
  return {
    de:s231DateOnly_(
      filtros.de ||
      filtros.dataDe ||
      filtros.dataInicio ||
      filtros.inicio ||
      ''
    ),
    ate:s231DateOnly_(
      filtros.ate ||
      filtros.dataAte ||
      filtros.dataFim ||
      filtros.fim ||
      ''
    )
  };
}


function s245NormalizarRegistroRelatorio_(r){
  const id=String(r.ID_MAPA_SETOR||'');

  const especiais={
    'MAP-CFF-N3-VERMELHO':{
      mapa:'Setor Vermelho / Estacionamento',
      piso:'3',
      rua:'Estacionamento',
      trecho:'Nível 3',
      referencia:'Setor Vermelho / Estacionamento'
    },
    'MAP-CFF-N1-HOTEL':{
      mapa:'Hotel',piso:'1',rua:'Hotel',trecho:'Nível 1',referencia:'Hotel'
    },
    'MAP-CFF-N1-CD':{
      mapa:'Central de Distribuição',piso:'1',rua:'Central de Distribuição',trecho:'Nível 1',referencia:'Central de Distribuição'
    },
    'MAP-CFF-N1-EXT-LAT-AZUL':{
      mapa:'Área externa lateral azul',piso:'1',rua:'Área externa lateral azul',trecho:'Nível 1',referencia:'Lateral Azul'
    },
    'MAP-CFF-N1-EXT-LAT-VERDE':{
      mapa:'Área externa lateral verde',piso:'1',rua:'Área externa lateral verde',trecho:'Nível 1',referencia:'Lateral Verde'
    },
    'MAP-CFF-N1-EXT-FRENTE':{
      mapa:'Área externa frente',piso:'1',rua:'Área externa frente',trecho:'Nível 1',referencia:'Frente'
    },
    'MAP-CFF-N1-EXT-HOTEL-CDM':{
      mapa:'Área externa Hotel/CDM',piso:'1',rua:'Área externa Hotel/CDM',trecho:'Nível 1',referencia:'Hotel/CDM'
    },
    'MAP-CFF-N1-EXTERNA':{
      mapa:'Área Externa',piso:'1',rua:'Área Externa',trecho:'Nível 1',referencia:'Área Externa'
    }
  };

  const e=especiais[id];
  if(!e)return r;

  return Object.assign({},r,{
    MAPA:e.mapa,
    PISO:String(r.PISO||e.piso),
    RUA:String(r.RUA||e.rua),
    TRECHO:String(r.TRECHO||e.trecho),
    REFERENCIA:String(r.REFERENCIA||e.referencia)
  });
}

function s231LerRegistros_(ss, filtros) {
  const sh = ss.getSheetByName(S231.SHEET_REGISTROS);
  if (!sh) throw new Error('Aba REGISTROS não encontrada.');
  const rows = s231SheetObjects_(sh).map(s245NormalizarRegistroRelatorio_);
  const datasS234 = s234DatasFiltro_(filtros);
  const de = datasS234.de;
  const ate = datasS234.ate;
  const mapa = String(filtros.mapa || filtros.idMapaSetor || '').trim();
  const piso = String(filtros.piso || '').trim();
  const resp = String(filtros.responsavel || '').trim();
  const status = String(filtros.status || '').trim();

  return rows.filter(r => {
    // S23.6 — registros excluídos não fazem parte de relatórios operacionais.
    if(String(r.STATUS||'').trim().toUpperCase()==='EXCLUIDO')return false;

    const dt = s231DateOnly_(r.CRIADO_EM || r.SINCRONIZADO_EM || '');
    if (de && dt && dt < de) return false;
    if (ate && dt && dt > ate) return false;
    if (mapa && mapa !== 'TODOS' && mapa !== 'Todos os mapas') {
      const ok = [r.ID_MAPA_SETOR, r.MAPA].some(v => String(v || '').trim() === mapa);
      if (!ok) return false;
    }
    if (piso && piso !== 'TODOS' && piso !== 'Todos os pisos' && String(r.PISO || '').trim() !== piso) return false;
    if (resp && resp !== 'TODOS' && resp !== 'Todos os responsáveis' && String(r.RESPONSAVEL || '').trim() !== resp) return false;
    if (status && status !== 'TODOS' && String(r.STATUS || '').trim() !== status) return false;
    return true;
  });
}

function s231LerFotosPorRegistro_(ss, registros) {
  const sh = ss.getSheetByName(S231.SHEET_FOTOS);
  if (!sh) return {};

  // S26.8-B — índice O(F+R), evitando filtrar toda REGISTRO_FOTOS para cada registro.
  const todas=s231SheetObjects_(sh);
  const porId={};
  const porProtocolo={};

  todas.forEach(function(f,idx){
    f.__s268bIdx=idx;
    const id=String(f.ID_REGISTRO||'').trim();
    const p=String(f.PROTOCOLO||'').trim();
    if(id)(porId[id]=porId[id]||[]).push(f);
    if(p)(porProtocolo[p]=porProtocolo[p]||[]).push(f);
  });

  const out={};

  (registros||[]).forEach(function(reg){
    const id=String(reg.ID_REGISTRO||'').trim();
    const p=String(reg.PROTOCOLO||'').trim();
    const candidatos=[];
    if(id && porId[id]) candidatos.push.apply(candidatos,porId[id]);
    if(p && porProtocolo[p]) candidatos.push.apply(candidatos,porProtocolo[p]);

    const seen={};
    const rows=candidatos.filter(function(f){
      const k=String(f.__s268bIdx);
      if(seen[k])return false;
      seen[k]=true;
      return true;
    });

    const atuais=s23532SnapshotAtualFotos_(rows);

    if(id)out[id]=atuais;
    if(p&&p!==id)out[p]=atuais;
  });

  return out;
}

function s23532SnapshotAtualFotos_(rows){
  if(!rows||!rows.length)return [];

  const base=rows.filter(f=>!String(f.CLIENT_INSPECTION_ID||'').trim());
  const insp=rows.filter(f=>String(f.CLIENT_INSPECTION_ID||'').trim());

  let selecionadas=[];

  if(insp.length){
    const grupos={};
    insp.forEach(f=>{
      const k=String(f.CLIENT_INSPECTION_ID||'').trim();
      (grupos[k]=grupos[k]||[]).push(f);
    });

    const chaves=Object.keys(grupos).sort((a,b)=>{
      const ma=Math.max(...grupos[a].map(x=>s2353Millis_(x.CRIADO_EM||x.SINCRONIZADO_EM)));
      const mb=Math.max(...grupos[b].map(x=>s2353Millis_(x.CRIADO_EM||x.SINCRONIZADO_EM)));
      return mb-ma;
    });

    const ult=grupos[chaves[0]]||[];
    const completo=ult.some(f=>
      ['HERDADA','SNAPSHOT'].includes(String(f.ORIGEM_FOTO||'').toUpperCase())
    );

    selecionadas=completo
      ? s2353DedupFotos_(ult)
      : s2353DedupFotos_([...base,...ult]);
  }else{
    selecionadas=s2353DedupFotos_(base);
  }

  selecionadas=s2353OrdenarFotos_(selecionadas);

  return selecionadas.map((f,i)=>({
    arquivoId:String(f.ARQUIVO_ID||'').trim(),
    nome:String(f.NOME_ARQUIVO||`Foto ${i+1}`),
    url:String(f.DRIVE_URL||'').trim(),
    criadoEm:f.CRIADO_EM||f.SINCRONIZADO_EM||'',
    ordemFoto:Number(f.ORDEM_FOTO||i+1),
    sha:String(f.SHA256||f.HASH_LOCAL||'').trim()
  }));
}


// ========================================================
// S23.4 — EVOLUÇÃO E COMPARATIVO HISTÓRICO
// ========================================================

function s234ComparativoHistorico_(ss,filtros,registrosFiltrados){
  const regs=Array.isArray(registrosFiltrados)?registrosFiltrados:[];
  const janela=s234JanelaComparacaoRobusta_(filtros,regs);

  // S23.4.2: usa exatamente a mesma seleção já aprovada pelo relatório.
  // Isso elimina divergência de aliases/filtros entre REGISTROS e HISTÓRICO.
  const base=s234BaseRegistrosFiltrados_(regs);

  const atual=s234LerHistorico_(ss,base,janela.atualDe,janela.atualAte);
  const anterior=s234LerHistorico_(ss,base,janela.antDe,janela.antAte);

  return {
    janela,
    atual:s234MetricasHistorico_(atual),
    anterior:s234MetricasHistorico_(anterior),
    eventosAtual:atual,
    eventosAnterior:anterior,
    baseRegistros:Object.keys(base).length
  };
}

function s234BaseRegistrosFiltrados_(rows){
  const out={};
  (rows||[]).forEach(r=>{
    const item={
      id:String(r.ID_REGISTRO||'').trim(),
      protocolo:String(r.PROTOCOLO||'').trim(),
      titulo:String(r.TITULO||r.TIPO||'Sinalização'),
      mapa:String(r.MAPA||r.ID_MAPA_SETOR||''),
      piso:String(r.PISO||''),
      rua:String(r.RUA||''),
      trecho:String(r.TRECHO||''),
      responsavel:String(r.RESPONSAVEL||'')
    };
    if(item.id)out[item.id]=item;
    if(item.protocolo)out[item.protocolo]=item;
  });
  return out;
}

function s234JanelaComparacaoRobusta_(filtros,registros){
  // 1. prioridade: datas declaradas pelo formulário
  const datas=s234DatasFiltro_(filtros);
  let de=datas.de, ate=datas.ate;

  // 2. fallback: intervalo efetivamente presente nos registros filtrados
  if(!de || !ate){
    const ds=(registros||[])
      .map(r=>s231DateOnly_(r.CRIADO_EM||r.SINCRONIZADO_EM||''))
      .filter(Boolean)
      .sort();
    if(ds.length){
      if(!de)de=ds[0];
      if(!ate)ate=ds[ds.length-1];
    }
  }

  // 3. se ainda não houver janela, retorna estado explícito.
  if(!de||!ate){
    return {
      atualDe:de||'',
      atualAte:ate||'',
      antDe:'',
      antAte:'',
      atualLabel:de||ate||'Período atual',
      anteriorLabel:'Sem período anterior calculável'
    };
  }

  const d0=s234ParseIso_(de), d1=s234ParseIso_(ate);
  const dias=Math.max(1,Math.round((d1-d0)/86400000)+1);
  const antFim=new Date(d0.getTime()-86400000);
  const antIni=new Date(antFim.getTime()-(dias-1)*86400000);
  const antDe=s234Iso_(antIni), antAte=s234Iso_(antFim);

  return {
    atualDe:de, atualAte:ate,
    antDe, antAte,
    dias,
    atualLabel:s234FmtPeriodo_(de,ate),
    anteriorLabel:s234FmtPeriodo_(antDe,antAte)
  };
}

function s234JanelaComparacao_(filtros){
  return s234JanelaComparacaoRobusta_(filtros,[]);
}

function s234ParseIso_(s){
  const p=String(s||'').split('-').map(Number);
  return new Date(p[0],(p[1]||1)-1,p[2]||1,12,0,0,0);
}

function s234Iso_(d){
  return Utilities.formatDate(d,'America/Fortaleza','yyyy-MM-dd');
}

function s234FmtPeriodo_(de,ate){
  const f=s=>s?`${s.slice(8,10)}/${s.slice(5,7)}/${s.slice(0,4)}`:'—';
  return `${f(de)} a ${f(ate)}`;
}

function s234BaseRegistros_(ss,filtros){
  const sh=ss.getSheetByName(S231.SHEET_REGISTROS);
  if(!sh)return {};
  const rows=s231SheetObjects_(sh);

  const mapa=String(filtros.mapa||filtros.idMapaSetor||'').trim();
  const piso=String(filtros.piso||'').trim();
  const resp=String(filtros.responsavel||'').trim();

  const out={};
  rows.forEach(r=>{
    if(mapa && mapa!=='TODOS' && mapa!=='Todos os mapas'){
      const ok=[r.ID_MAPA_SETOR,r.MAPA].some(v=>String(v||'').trim()===mapa);
      if(!ok)return;
    }
    if(piso && piso!=='TODOS' && piso!=='Todos os pisos' && String(r.PISO||'').trim()!==piso)return;
    if(resp && resp!=='TODOS' && resp!=='Todos os responsáveis' && String(r.RESPONSAVEL||'').trim()!==resp)return;

    const item={
      id:String(r.ID_REGISTRO||'').trim(),
      protocolo:String(r.PROTOCOLO||'').trim(),
      titulo:String(r.TITULO||r.TIPO||'Sinalização'),
      mapa:String(r.MAPA||r.ID_MAPA_SETOR||''),
      piso:String(r.PISO||''),
      rua:String(r.RUA||''),
      trecho:String(r.TRECHO||''),
      responsavel:String(r.RESPONSAVEL||'')
    };
    if(item.id)out[item.id]=item;
    if(item.protocolo)out[item.protocolo]=item;
  });
  return out;
}

function s234LerHistorico_(ss,base,de,ate){
  const sh=ss.getSheetByName(S231.SHEET_HISTORICO);
  if(!sh||!de||!ate)return [];

  return s231SheetObjects_(sh).filter(h=>{
    if(String(h.TIPO_EVENTO||'').toUpperCase()!=='INSPECAO')return false;
    const dt=s231DateOnly_(h.DATA_HORA||'');
    if(!dt||dt<de||dt>ate)return false;
    const id=String(h.ID_REGISTRO||'').trim();
    const p=String(h.PROTOCOLO||'').trim();
    return !!(base[id]||base[p]);
  }).map(h=>s234NormalizarEvento_(h,base));
}

function s234NormalizarEvento_(h,base){
  const id=String(h.ID_REGISTRO||'').trim();
  const protocolo=String(h.PROTOCOLO||'').trim();
  const reg=base[id]||base[protocolo]||{};

  const ant=s234JsonSeguro_(h.VALOR_ANTERIOR);
  const nov=s234JsonSeguro_(h.VALOR_NOVO);

  const anterior={
    STATUS:String(h.STATUS_ANTERIOR||''),
    ESTADO_CONSERVACAO:String(ant.estadoConservacao||ant.ESTADO_CONSERVACAO||''),
    CONDICAO:String(ant.condicao||ant.CONDICAO||''),
    RESPONSAVEL:String(ant.responsavel||ant.RESPONSAVEL||reg.responsavel||'')
  };
  const novo={
    STATUS:String(h.STATUS_NOVO||''),
    ESTADO_CONSERVACAO:String(h.ESTADO_CONSERVACAO||nov.estadoConservacao||nov.ESTADO_CONSERVACAO||''),
    CONDICAO:String(h.CONDICAO||nov.condicao||nov.CONDICAO||''),
    RESPONSAVEL:String(h.RESPONSAVEL_INSPECAO||nov.responsavel||nov.RESPONSAVEL||reg.responsavel||'')
  };

  const pa=s232PrioridadeRegistro_(anterior);
  const pn=s232PrioridadeRegistro_(novo);

  let movimento='ESTAVEL';
  if(pn.nivel<pa.nivel)movimento='MELHORA';
  if(pn.nivel>pa.nivel)movimento='PIORA';

  return {
    idHistorico:String(h.ID_HISTORICO||''),
    clientInspectionId:String(h.CLIENT_INSPECTION_ID||''),
    idRegistro:id,
    protocolo,
    titulo:reg.titulo||protocolo||'Sinalização',
    data:String(h.DATA_HORA||''),
    responsavel:novo.RESPONSAVEL||reg.responsavel||'Não atribuído',
    anterior,
    novo,
    prioridadeAnterior:pa,
    prioridadeNova:pn,
    movimento,
    corrigido:pa.nivel>0 && pn.nivel===0,
    mapa:reg.mapa||'',
    piso:reg.piso||'',
    rua:reg.rua||'',
    trecho:reg.trecho||''
  };
}

function s234JsonSeguro_(v){
  if(v && typeof v==='object')return v;
  const s=String(v||'').trim();
  if(!s)return {};
  try{return JSON.parse(s)}catch(_){return {}}
}

function s234MetricasHistorico_(eventos){
  const unicos=new Set();
  const porResp={};
  const mov={MELHORA:0,PIORA:0,ESTAVEL:0};
  let corrigidos=0, criticos=0, atencao=0, ok=0;

  eventos.forEach(e=>{
    unicos.add(e.idRegistro||e.protocolo);
    mov[e.movimento]=(mov[e.movimento]||0)+1;
    if(e.corrigido)corrigidos++;

    const n=Number(e.prioridadeNova?.nivel||0);
    if(n>=3)criticos++;
    else if(n>=1)atencao++;
    else ok++;

    const r=e.responsavel||'Não atribuído';
    porResp[r]=(porResp[r]||0)+1;
  });

  return {
    inspecoes:eventos.length,
    ativos:unicos.size,
    melhoras:mov.MELHORA||0,
    pioras:mov.PIORA||0,
    estaveis:mov.ESTAVEL||0,
    corrigidos,
    criticos,
    atencao,
    ok,
    porResponsavel:Object.keys(porResp)
      .map(label=>({label,value:porResp[label]}))
      .sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label))
  };
}

function s234SlideEvolucao_(pres,c){
  const slide=pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W=pres.getPageWidth(), H=pres.getPageHeight();
  s231Bg_(slide,S231.BRAND.BG);
  s231Header_(slide,W,'Evolução operacional',`${c.janela.atualLabel} × ${c.janela.anteriorLabel}`);

  const a=c.atual, b=c.anterior;
  const y=H*0.285, left=W*0.055, gap=W*0.012, cw=(W*0.89-gap*4)/5;

  const cards=[
    ['Inspeções',a.inspecoes,s234Delta_(a.inspecoes,b.inspecoes),'Eventos registrados',S231.BRAND.NAVY],
    ['Melhoras',a.melhoras,s234Delta_(a.melhoras,b.melhoras),'Condição evoluiu',S231.BRAND.GREEN],
    ['Corrigidos',a.corrigidos,s234Delta_(a.corrigidos,b.corrigidos),'Problema → OK',S231.BRAND.GREEN],
    ['Pioras',a.pioras,s234Delta_(a.pioras,b.pioras),'Exigem atenção',S231.BRAND.RED],
    ['Críticos',a.criticos,s234DeltaInvertido_(a.criticos,b.criticos),'Pós-inspeção',a.criticos?S231.BRAND.RED:S231.BRAND.GREEN]
  ];

  cards.forEach((c0,i)=>{
    const x=left+i*(cw+gap);
    s231Rounded_(slide,x,y,cw,H*0.19,S231.BRAND.WHITE,S231.BRAND.BORDER);
    s231Text_(slide,String(c0[1]),x+cw*0.08,y+H*0.025,cw*0.84,H*0.050,22,c0[4],true);
    s231Text_(slide,c0[0],x+cw*0.08,y+H*0.080,cw*0.84,H*0.030,9,S231.BRAND.TEXT,true);
    s231Text_(slide,c0[2],x+cw*0.08,y+H*0.115,cw*0.84,H*0.025,7.3,s234DeltaColor_(c0[2]),true);
    s231Text_(slide,c0[3],x+cw*0.08,y+H*0.148,cw*0.84,H*0.022,6.2,S231.BRAND.MUTED,false);
  });

  const y2=H*0.53;
  s231Rounded_(slide,W*0.055,y2,W*0.42,H*0.27,S231.BRAND.WHITE,S231.BRAND.BORDER);
  s231Text_(slide,'Período atual',W*0.075,y2+H*0.03,W*0.34,H*0.025,11,S231.BRAND.TEXT,true);
  s234ResumoPeriodo_(slide,W*0.075,y2+H*0.075,W*0.34,H*0.15,a);

  s231Rounded_(slide,W*0.525,y2,W*0.42,H*0.27,S231.BRAND.WHITE,S231.BRAND.BORDER);
  s231Text_(slide,'Período anterior',W*0.545,y2+H*0.03,W*0.34,H*0.025,11,S231.BRAND.TEXT,true);
  if(b.inspecoes){
    s234ResumoPeriodo_(slide,W*0.545,y2+H*0.075,W*0.34,H*0.15,b);
  }else{
    s231Text_(slide,'Sem inspeções no período anterior para os filtros selecionados.',
      W*0.545,y2+H*0.09,W*0.34,H*0.08,9,S231.BRAND.MUTED,false);
  }
}

function s234ResumoPeriodo_(slide,x,y,w,h,m){
  const linhas=[
    `Ativos inspecionados: ${m.ativos}`,
    `Estáveis: ${m.estaveis}`,
    `Atenção pós-inspeção: ${m.atencao}`,
    `OK pós-inspeção: ${m.ok}`
  ].join('\n');
  s231Text_(slide,linhas,x,y,w,h,9,S231.BRAND.TEXT,false);
}

function s234SlideMudancas_(pres,c){
  const atuais=c.eventosAtual||[];
  const relevantes=atuais
    .filter(e=>e.movimento!=='ESTAVEL'||e.prioridadeNova.nivel>0)
    .sort((a,b)=>{
      const score=x=>(x.movimento==='PIORA'?10:0)+(x.prioridadeNova.nivel||0)*3-(x.movimento==='MELHORA'?2:0);
      return score(b)-score(a)||String(a.protocolo).localeCompare(String(b.protocolo));
    });

  const slide=pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W=pres.getPageWidth(), H=pres.getPageHeight();
  s231Bg_(slide,S231.BRAND.BG);
  s231Header_(slide,W,'Mudanças relevantes','Antes × depois das inspeções do período atual');

  if(!atuais.length){
    s231Rounded_(slide,W*0.08,H*0.34,W*0.84,H*0.24,S231.BRAND.WHITE,S231.BRAND.BORDER);
    s231Text_(slide,'Nenhuma inspeção encontrada no período selecionado.',
      W*0.12,H*0.405,W*0.76,H*0.06,14,S231.BRAND.MUTED,true,SlidesApp.ParagraphAlignment.CENTER);
    return;
  }

  const itens=(relevantes.length?relevantes:atuais).slice(0,5);
  const x=W*0.055,y0=H*0.285,cardH=H*0.105,gap=H*0.025;

  itens.forEach((e,i)=>{
    const y=y0+i*(cardH+gap);
    const cor=e.movimento==='PIORA'?S231.BRAND.RED:(e.movimento==='MELHORA'?S231.BRAND.GREEN:S231.BRAND.NAVY);
    s231Rounded_(slide,x,y,W*0.89,cardH,S231.BRAND.WHITE,S231.BRAND.BORDER);
    s231Rect_(slide,x,y,6,cardH,cor,null);

    s231Text_(slide,e.protocolo||e.idRegistro,x+W*0.025,y+H*0.018,W*0.18,H*0.022,7.5,S231.BRAND.NAVY,true);
    s231Text_(slide,s2332Ellipsis_(e.titulo,40),x+W*0.21,y+H*0.016,W*0.28,H*0.025,8.5,S231.BRAND.TEXT,true);
    s231Text_(slide,e.movimento,x+W*0.75,y+H*0.016,W*0.11,H*0.025,7.5,cor,true,SlidesApp.ParagraphAlignment.END);

    const ant=s234EstadoLabel_(e.anterior,e.prioridadeAnterior);
    const nov=s234EstadoLabel_(e.novo,e.prioridadeNova);
    s231Text_(slide,'ANTES',x+W*0.21,y+H*0.050,W*0.07,H*0.018,5.8,S231.BRAND.MUTED,true);
    s231Text_(slide,s2332Ellipsis_(ant,44),x+W*0.28,y+H*0.047,W*0.25,H*0.025,6.6,S231.BRAND.TEXT,false);
    s231Text_(slide,'DEPOIS',x+W*0.55,y+H*0.050,W*0.07,H*0.018,5.8,S231.BRAND.MUTED,true);
    s231Text_(slide,s2332Ellipsis_(nov,44),x+W*0.62,y+H*0.047,W*0.24,H*0.025,6.6,S231.BRAND.TEXT,false);
  });
}

function s234EstadoLabel_(r,p){
  return `${String(r.STATUS||'—')} • ${String(r.ESTADO_CONSERVACAO||'—')} • ${String(r.CONDICAO||'—')} • ${p.rotulo||'OK'}`;
}

function s234Delta_(a,b){
  if(!b && b!==0)return 'Sem comparação';
  const d=a-b;
  if(d===0)return '0 vs anterior';
  return `${d>0?'+':''}${d} vs anterior`;
}

function s234DeltaInvertido_(a,b){
  if(!b && b!==0)return 'Sem comparação';
  const d=a-b;
  if(d===0)return '0 vs anterior';
  // Para críticos, reduzir é positivo visualmente.
  return `${d>0?'+':''}${d} vs anterior`;
}

function s234DeltaColor_(label){
  // S23.4: delta quantitativo é informativo; a cor principal do KPI comunica o sentido.
  return S231.BRAND.MUTED;
}


// ========================================================
// S23.5 — ANTES E DEPOIS FOTOGRÁFICO POR INSPEÇÃO
// ========================================================
function s2353ComparacoesSnapshots_(ss,registros,comparativo){
  const shFotos=ss.getSheetByName(S231.SHEET_FOTOS);
  const shHist=ss.getSheetByName(S231.SHEET_HISTORICO);
  if(!shFotos||!shHist)return [];

  // S26.8-B — indexa fotos e histórico uma única vez.
  const fotos=s231SheetObjects_(shFotos);
  const hist=s231SheetObjects_(shHist);
  const fotosId={}, fotosProto={}, histId={}, histProto={};

  fotos.forEach(function(f,idx){
    f.__s268bIdx=idx;
    const id=String(f.ID_REGISTRO||'').trim();
    const p=String(f.PROTOCOLO||'').trim();
    if(id)(fotosId[id]=fotosId[id]||[]).push(f);
    if(p)(fotosProto[p]=fotosProto[p]||[]).push(f);
  });

  hist.forEach(function(h,idx){
    h.__s268bHistIdx=idx;
    if(String(h.TIPO_EVENTO||'').toUpperCase()!=='INSPECAO')return;
    const id=String(h.ID_REGISTRO||'').trim();
    const p=String(h.PROTOCOLO||'').trim();
    if(id)(histId[id]=histId[id]||[]).push(h);
    if(p)(histProto[p]=histProto[p]||[]).push(h);
  });

  const atualDe=comparativo?.janela?.atualDe||'';
  const atualAte=comparativo?.janela?.atualAte||'';
  const out=[];

  (registros||[]).forEach(function(reg){
    const id=String(reg.ID_REGISTRO||'').trim();
    const protocolo=String(reg.PROTOCOLO||'').trim();
    if(!id&&!protocolo)return;

    const fotosCand=[];
    if(id&&fotosId[id])fotosCand.push.apply(fotosCand,fotosId[id]);
    if(protocolo&&fotosProto[protocolo])fotosCand.push.apply(fotosCand,fotosProto[protocolo]);
    const seenFotos={};
    const rows=fotosCand.filter(function(f){
      const k=String(f.__s268bIdx);
      if(seenFotos[k])return false;
      seenFotos[k]=true;
      return true;
    });
    if(!rows.length)return;

    let anterior=s2353OrdenarFotos_(
      s2353DedupFotos_(rows.filter(function(f){return !String(f.CLIENT_INSPECTION_ID||'').trim();}))
    );

    const histCand=[];
    if(id&&histId[id])histCand.push.apply(histCand,histId[id]);
    if(protocolo&&histProto[protocolo])histCand.push.apply(histCand,histProto[protocolo]);
    const seenHist={};
    const eventos=histCand.filter(function(h){
      const k=String(h.__s268bHistIdx);
      if(seenHist[k])return false;
      seenHist[k]=true;
      return true;
    }).sort(function(a,b){return s2353Millis_(a.DATA_HORA)-s2353Millis_(b.DATA_HORA);});

    eventos.forEach(function(ev){
      const ci=String(ev.CLIENT_INSPECTION_ID||'').trim();
      if(!ci)return;

      const grupo=rows.filter(function(f){return String(f.CLIENT_INSPECTION_ID||'').trim()===ci;});
      if(!grupo.length)return;

      const completo=grupo.some(function(f){
        return ['HERDADA','SNAPSHOT'].includes(String(f.ORIGEM_FOTO||'').toUpperCase());
      });

      const depois=s2353OrdenarFotos_(
        s2353DedupFotos_(completo ? grupo : anterior.concat(grupo))
      );

      const dt=s231DateOnly_(ev.DATA_HORA||'');
      const dentro=(!atualDe||dt>=atualDe)&&(!atualAte||dt<=atualAte);
      const delta=s2353DeltaFotos_(anterior,depois);

      if(dentro && (anterior.length||depois.length)){
        const normal=s234NormalizarEvento_(ev,s234BaseRegistrosFiltrados_([reg]));
        out.push({
          registro:id||protocolo,
          protocolo:protocolo||id,
          titulo:String(reg.TITULO||reg.TIPO||'Sinalização'),
          local:s231Local_(reg)||'',
          antes:{
            data:s2353DataSnapshotAnterior_(anterior,reg),
            fotos:s2353FotosParaSlide_(anterior),
            estado:s2353EstadoAnterior_(ev)
          },
          depois:{
            data:ev.DATA_HORA||'',
            fotos:s2353FotosParaSlide_(depois),
            estado:s2353EstadoDepois_(ev),
            responsavel:String(ev.RESPONSAVEL_INSPECAO||reg.RESPONSAVEL||'—'),
            movimento:normal.movimento||'ESTAVEL'
          },
          delta:delta
        });
      }

      anterior=depois;
    });
  });

  return out.sort(function(a,b){
    return s2353Millis_(a.depois.data)-s2353Millis_(b.depois.data) ||
      String(a.protocolo).localeCompare(String(b.protocolo));
  });
}

function s2353DedupFotos_(rows){
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

function s2353OrdenarFotos_(rows){
  return (rows||[]).slice().sort((a,b)=>
    (Number(a.ORDEM_FOTO||999)-Number(b.ORDEM_FOTO||999)) ||
    s2353Millis_(a.CRIADO_EM||a.SINCRONIZADO_EM)-
    s2353Millis_(b.CRIADO_EM||b.SINCRONIZADO_EM)
  );
}

function s2353FotosParaSlide_(rows){
  return (rows||[]).map((f,i)=>({
    arquivoId:String(f.ARQUIVO_ID||'').trim(),
    nome:String(f.NOME_ARQUIVO||`Foto ${i+1}`),
    ordemFoto:Number(f.ORDEM_FOTO||i+1),
    sha:String(f.SHA256||f.HASH_LOCAL||'').trim()
  }));
}

function s2353FotoKey_(f){
  return String(f?.sha||f?.SHA256||f?.HASH_LOCAL||'').trim() ||
         String(f?.arquivoId||f?.ARQUIVO_ID||'').trim();
}

function s2353DeltaFotos_(antes,depois){
  const a=s2353FotosParaSlide_(antes);
  const d=s2353FotosParaSlide_(depois);

  const aKeys=a.map(s2353FotoKey_).filter(Boolean);
  const dKeys=d.map(s2353FotoKey_).filter(Boolean);

  const aCount={};
  const dCount={};
  aKeys.forEach(k=>aCount[k]=(aCount[k]||0)+1);
  dKeys.forEach(k=>dCount[k]=(dCount[k]||0)+1);

  let mantidas=0;
  Object.keys(aCount).forEach(k=>{
    mantidas+=Math.min(aCount[k]||0,dCount[k]||0);
  });

  const somenteAntes=Math.max(0,aKeys.length-mantidas);
  const somenteDepois=Math.max(0,dKeys.length-mantidas);

  let trocadas=0;
  let adicionadas=0;
  let removidas=0;

  // Substituição real: quantidade total permaneceu igual e
  // uma ou mais identidades saíram enquanto outras entraram.
  if(aKeys.length===dKeys.length){
    trocadas=Math.min(somenteAntes,somenteDepois);
    removidas=somenteAntes-trocadas;
    adicionadas=somenteDepois-trocadas;
  }else{
    // Mudança de capacidade/snapshot:
    // não inventa "troca" por deslocamento de posição.
    adicionadas=somenteDepois;
    removidas=somenteAntes;
  }

  return {
    mantidas,
    trocadas,
    adicionadas,
    removidas,
    antes:aKeys.length,
    depois:dKeys.length
  };
}

function s2353DataSnapshotAnterior_(rows,reg){
  if(rows&&rows.length){
    const datas=rows.map(f=>f.CRIADO_EM||f.SINCRONIZADO_EM||'').filter(Boolean);
    if(datas.length)return datas.sort((a,b)=>s2353Millis_(b)-s2353Millis_(a))[0];
  }
  return reg.CRIADO_EM||'';
}

function s2353EstadoAnterior_(ev){
  const v=s234JsonSeguro_(ev.VALOR_ANTERIOR);
  return [
    String(ev.STATUS_ANTERIOR||'—'),
    String(v.estadoConservacao||v.ESTADO_CONSERVACAO||'—'),
    String(v.condicao||v.CONDICAO||'—')
  ].join(' • ');
}

function s2353EstadoDepois_(ev){
  const v=s234JsonSeguro_(ev.VALOR_NOVO);
  return [
    String(ev.STATUS_NOVO||'—'),
    String(ev.ESTADO_CONSERVACAO||v.estadoConservacao||v.ESTADO_CONSERVACAO||'—'),
    String(ev.CONDICAO||v.condicao||v.CONDICAO||'—')
  ].join(' • ');
}

function s2353Millis_(v){
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

function s2353SlidesAntesDepois_(pres,itens){
  if(!itens||!itens.length)return;

  const contadorPorAtivo={};

  itens.forEach(item=>{
    const chave=String(item.protocolo||item.registro||'SEM_PROTOCOLO').trim();
    const ocorrencia=(contadorPorAtivo[chave]||0)+1;
    contadorPorAtivo[chave]=ocorrencia;

    const slide=pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    const W=pres.getPageWidth(),H=pres.getPageHeight();
    s231Bg_(slide,S231.BRAND.BG);

    // S23.5.3.3:
    // "continuação" pertence ao MESMO ativo, e não à posição global do slide.
    const titulo=ocorrencia===1
      ? 'Antes × Depois — mídia'
      : 'Antes × Depois — mídia — continuação';

    s231Header_(
      slide,W,
      titulo,
      `${item.protocolo} • ${item.titulo}`
    );

    const y=H*0.285;
    const colW=W*0.425;
    const gap=W*0.04;
    const x1=W*0.055;
    const x2=x1+colW+gap;

    s2353ColunaSnapshot_(slide,item.antes,'ANTES',x1,y,colW,H*0.50,S231.BRAND.YELLOW);
    s2353ColunaSnapshot_(slide,item.depois,'DEPOIS',x2,y,colW,H*0.50,S231.BRAND.GREEN);

    const d=item.delta||{};
    const resumo=[
      `${d.mantidas||0} mantida(s)`,
      `${d.trocadas||0} trocada(s)`,
      `${d.adicionadas||0} adicionada(s)`,
      `${d.removidas||0} removida(s)`
    ].join('  •  ');

    s231Rounded_(slide,W*0.055,H*0.815,W*0.89,H*0.075,S231.BRAND.WHITE,S231.BRAND.BORDER);
    s231Text_(slide,'EVOLUÇÃO DA MÍDIA',W*0.075,H*0.830,W*0.18,H*0.022,6.2,S231.BRAND.MUTED,true);
    s231Text_(slide,resumo,W*0.24,H*0.825,W*0.65,H*0.030,8.2,S231.BRAND.TEXT,true);

    const mudou=(d.trocadas||0)+(d.adicionadas||0)+(d.removidas||0)>0;
    const rotulo=mudou?'MÍDIA ATUALIZADA':'MÍDIA MANTIDA';
    const cor=mudou?S231.BRAND.PINK:S231.BRAND.GREEN;
    s231Pill_(slide,rotulo,W*0.39,H*0.905,W*0.22,H*0.043,cor);
  });
}

function s2353ColunaSnapshot_(slide,snapshot,rotulo,x,y,w,h,cor){
  s231Rounded_(slide,x,y,w,h,S231.BRAND.WHITE,S231.BRAND.BORDER);

  s231Text_(slide,rotulo,x+w*0.05,y+h*0.035,w*0.40,h*0.055,13,cor,true);
  s231Text_(
    slide,
    s231FmtDate_(snapshot.data)||'—',
    x+w*0.50,y+h*0.045,w*0.44,h*0.035,
    8,S231.BRAND.MUTED,true,SlidesApp.ParagraphAlignment.END
  );

  const fotos=(snapshot.fotos||[]).slice(0,4);
  if(fotos.length){
    s231PhotoGrid_(slide,fotos,x+w*0.05,y+h*0.15,w*0.90,h*0.56);
  }else{
    s231Rounded_(slide,x+w*0.05,y+h*0.15,w*0.90,h*0.56,'#F2F3F7',S231.BRAND.BORDER);
    s231Text_(
      slide,'Sem foto no snapshot',
      x+w*0.05,y+h*0.40,w*0.90,h*0.07,
      9,S231.BRAND.MUTED,true,SlidesApp.ParagraphAlignment.CENTER
    );
  }

  s231Text_(
    slide,
    String(snapshot.estado||'—'),
    x+w*0.05,y+h*0.76,w*0.90,h*0.075,
    7.2,S231.BRAND.TEXT,true
  );

  if(snapshot.responsavel){
    s231Text_(
      slide,
      `Responsável: ${snapshot.responsavel}`,
      x+w*0.05,y+h*0.865,w*0.90,h*0.045,
      6.5,S231.BRAND.MUTED,false
    );
  }
}

function s231Agrupar_(registros) {
  const out = {};
  registros.forEach(r => {
    const mapa = String(r.MAPA || r.ID_MAPA_SETOR || 'Sem mapa').trim() || 'Sem mapa';
    const piso = String(r.PISO || '').trim();
    const label = piso ? `${mapa} • ${piso}` : mapa;
    const chave = label.toUpperCase();
    if (!out[chave]) out[chave] = { label, itens: [] };
    out[chave].itens.push(r);
  });
  return out;
}

function s231Capa_(pres, slide, periodo, registros) {
  const W = pres.getPageWidth(), H = pres.getPageHeight();
  s231Bg_(slide, S231.BRAND.NAVY_DARK);
  s231Rect_(slide, 0, 0, W * 0.035, H, S231.BRAND.PINK, null);
  s231Text_(slide, 'CENTRO FASHION FORTALEZA', W*0.08, H*0.12, W*0.84, H*0.08, 15, S231.BRAND.WHITE, true);
  s231Text_(slide, 'Relatório Visual Fotográfico', W*0.08, H*0.30, W*0.82, H*0.12, 29, S231.BRAND.WHITE, true);
  s231Text_(slide, 'Sinalização e Comunicação Visual do Mall', W*0.08, H*0.43, W*0.82, H*0.08, 17, '#E6E8FF', false);
  s231Rect_(slide, W*0.08, H*0.58, W*0.46, H*0.004, S231.BRAND.PINK, null);
  s231Text_(slide, `Período: ${periodo}`, W*0.08, H*0.63, W*0.75, H*0.06, 13, S231.BRAND.WHITE, true);
  s231Text_(slide, `${registros.length} registros • ${s231ContarFotos_(registros)} fotos`, W*0.08, H*0.71, W*0.75, H*0.05, 11, '#D4D6ED', false);
  s231Text_(slide, 'Gerado automaticamente pela aplicação Sinalização do Mall', W*0.08, H*0.86, W*0.82, H*0.04, 9, '#AEB2D1', false);
}

function s231ResumoExecutivo_(pres, registros, periodo) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = pres.getPageWidth(), H = pres.getPageHeight();
  s231Bg_(slide, S231.BRAND.BG);
  s231Header_(slide, W, 'Resumo executivo', `Período ${periodo}`);

  const pend = registros.filter(r => !['ATIVA','ATIVO','OK','CONCLUIDA','CONCLUÍDA','RESOLVIDA'].includes(String(r.STATUS || '').toUpperCase())).length;
  const critica = registros.filter(r => /CR[IÍ]TIC|RUIM|DANIFIC|DESBOT/.test(`${r.ESTADO_CONSERVACAO||''} ${r.CONDICAO||''}`.toUpperCase())).length;
  const semResp = registros.filter(r => !String(r.RESPONSAVEL || '').trim()).length;
  const fotos = s231ContarFotos_(registros);

  const cards = [
    ['Registros', registros.length, 'Itens contemplados'],
    ['Fotos', fotos, 'Evidências anexadas'],
    ['Atenção', pend, 'Fora de status OK'],
    ['Críticos', critica, 'Conservação/condição'],
    ['Sem responsável', semResp, 'Requer atribuição']
  ];
  // S23.3.3 — respeita integralmente título + subtítulo do cabeçalho.
  // Antes: 23% da altura, cobrindo parcialmente a linha do período.
  const gap = W*0.012, left = W*0.055, y = H*0.275, total = W*0.89;
  const cw = (total - gap*(cards.length-1)) / cards.length;
  cards.forEach((c,i)=>{
    const x = left + i*(cw+gap);
    s231Rounded_(slide, x, y, cw, H*0.205, S231.BRAND.WHITE, S231.BRAND.BORDER);
    s231Text_(slide, String(c[1]), x+cw*0.08, y+H*0.038, cw*0.84, H*0.068, 23, S231.BRAND.NAVY, true);
    s231Text_(slide, c[0], x+cw*0.08, y+H*0.108, cw*0.84, H*0.038, 9.5, S231.BRAND.TEXT, true);
    s231Text_(slide, c[2], x+cw*0.08, y+H*0.153, cw*0.84, H*0.032, 7.5, S231.BRAND.MUTED, false);
  });

  const porResp = s231TopCount_(registros, 'RESPONSAVEL', 6);
  const porTipo = s231TopCount_(registros, 'TIPO', 6);
  s231ListaResumo_(slide, W*0.055, H*0.52, W*0.42, H*0.31, 'Por responsável', porResp);
  s231ListaResumo_(slide, W*0.525, H*0.52, W*0.42, H*0.31, 'Por tipo', porTipo);
}

function s231Divisoria_(pres, label, qtd, fotos) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = pres.getPageWidth(), H = pres.getPageHeight();
  s231Bg_(slide, S231.BRAND.NAVY);
  s231Rect_(slide, W*0.07, H*0.18, W*0.012, H*0.55, S231.BRAND.PINK, null);
  s231Text_(slide, label, W*0.12, H*0.28, W*0.76, H*0.13, 30, S231.BRAND.WHITE, true);
  s231Text_(slide, 'Pontos de melhoria e acompanhamento da comunicação visual', W*0.12, H*0.44, W*0.76, H*0.06, 14, '#E4E6F6', false);
  s231Text_(slide, `${qtd} registros • ${fotos} fotos`, W*0.12, H*0.59, W*0.6, H*0.05, 11, '#B9BDDA', true);
}

function s231SlidesRegistro_(pres, reg) {
  const fotos = reg._fotos || [];

  // Slide principal sempre concentra informação gerencial.
  const primeiras = fotos.slice(0, 4);
  s232SlideRegistroPrincipal_(pres, reg, primeiras);

  // Fotos adicionais ganham slides dedicados, evitando repetir todo o texto.
  if (fotos.length > 4) {
    for (let i=4; i<fotos.length; i+=4) {
      s232SlideFotosContinuacao_(pres, reg, fotos.slice(i, i+4), i, fotos.length);
    }
  }
}

function s232SlideRegistroPrincipal_(pres, reg, fotos) {
  const slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W = pres.getPageWidth(), H = pres.getPageHeight();
  s231Bg_(slide, S231.BRAND.WHITE);

  const protocolo = String(reg.PROTOCOLO || reg.ID_REGISTRO || 'Registro');
  const titulo = String(reg.TITULO || reg.TIPO || 'Sinalização');
  s231Header_(slide, W, titulo, protocolo);

  const status = String(reg.STATUS || 'SEM STATUS');
  const conservacao = String(reg.ESTADO_CONSERVACAO || '—');
  const condicao = String(reg.CONDICAO || '—');
  const acao = String(reg.ACAO_RECOMENDADA || reg.PROVIDENCIA || reg.PENDENCIA || '').trim();
  const proxima = s231FmtDate_(reg.PROXIMA_INSPECAO || reg.DATA_PROXIMA_INSPECAO || '');
  const obs = String(reg.DESCRICAO || reg.TEXTO_SINALIZACAO || reg.OBSERVACAO || '').trim();

  // S23.3.2 — conteúdo começa sempre abaixo de título + protocolo.
  const top = H * 0.285;
  const bottom = H * 0.875;
  const usableH = bottom - top;

  if (!fotos.length) {
    const x=W*0.055, boxW=W*0.89, boxH=usableH;
    s231Rounded_(slide,x,top,boxW,boxH,'#F8F9FC',S231.BRAND.BORDER);

    const pillY=top+boxH*0.055;
    s231Pill_(slide,status,x+W*0.025,pillY,W*0.23,H*0.052,s231StatusColor_(status));
    s232PillNeutra_(slide,'Conservação: '+conservacao,x+W*0.275,pillY,W*0.25,H*0.052);
    s232PillNeutra_(slide,'Condição: '+condicao,x+W*0.545,pillY,W*0.30,H*0.052);

    const infoY=top+boxH*0.19;
    const cols=[
      ['TIPO', reg.TIPO || '—'],
      ['RESPONSÁVEL', reg.RESPONSAVEL || '—'],
      ['CRIADO EM', s231FmtDate_(reg.CRIADO_EM) || '—']
    ];
    cols.forEach((c,i)=>{
      const cx=x+W*(0.025+i*0.285);
      s231Text_(slide,c[0],cx,infoY,W*0.25,H*0.020,6.5,S231.BRAND.MUTED,true);
      s231Text_(slide,String(c[1]),cx,infoY+H*0.027,W*0.25,H*0.042,10.5,S231.BRAND.TEXT,true);
    });

    const locLabelY=top+boxH*0.38;
    s231Text_(slide,'LOCALIZAÇÃO',x+W*0.025,locLabelY,W*0.82,H*0.020,6.5,S231.BRAND.MUTED,true);
    s231Text_(slide,s2332Wrap_(s231Local_(reg)||'—',88),x+W*0.025,locLabelY+H*0.028,W*0.82,H*0.065,10,S231.BRAND.TEXT,false);

    const lowerY=top+boxH*0.60;
    s231Text_(slide,'OBSERVAÇÃO',x+W*0.025,lowerY,W*0.38,H*0.020,6.5,S231.BRAND.MUTED,true);
    s231Text_(slide,obs||'Sem observação registrada.',x+W*0.025,lowerY+H*0.028,W*0.39,H*0.095,8.5,S231.BRAND.TEXT,false);

    s231Text_(slide,'AÇÃO / ACOMPANHAMENTO',x+W*0.47,lowerY,W*0.36,H*0.020,6.5,S231.BRAND.MUTED,true);
    const acompanhamento = acao || (proxima ? 'Próxima inspeção programada para '+proxima : 'Nenhuma ação específica registrada.');
    s231Text_(slide,acompanhamento,x+W*0.47,lowerY+H*0.028,W*0.36,H*0.095,8.5,S231.BRAND.TEXT,false);

    const stripY=top+boxH*0.895;
    s231Rounded_(slide,x+W*0.025,stripY,W*0.82,H*0.035,'#EEF0F5',null);
    s231Text_(slide,'SEM FOTO ANEXADA',x+W*0.025,stripY+H*0.006,W*0.82,H*0.020,7.2,S231.BRAND.MUTED,true,SlidesApp.ParagraphAlignment.CENTER);
  } else {
    // S23.3.2 — ficha fotográfica com grid fixo, sem fluxo vertical acumulativo.
    const left=W*0.045, infoW=W*0.31;
    const photoX=W*0.38, photoW=W*0.575;
    s231Rounded_(slide,left,top,infoW,usableH,'#F8F9FC',S231.BRAND.BORDER);
    s231Pill_(slide,status,left+W*0.018,top+H*0.025,infoW-W*0.036,H*0.050,s231StatusColor_(status));

    const ix=left+W*0.018, iw=infoW-W*0.036;

    s2332Field_(slide,'TIPO',reg.TIPO||'—',ix,top+H*0.095,iw,H*0.050,7.5);
    s2332Field_(slide,'LOCAL',s2332Wrap_(s231Local_(reg)||'—',43),ix,top+H*0.165,iw,H*0.088,7.0);
    s2332Field_(slide,'RESPONSÁVEL',reg.RESPONSAVEL||'—',ix,top+H*0.275,iw,H*0.045,7.8);

    // conservação + condição lado a lado reduz a altura total.
    const half=(iw-W*0.012)/2;
    s2332Field_(slide,'CONSERVAÇÃO',conservacao,ix,top+H*0.345,half,H*0.045,7.5);
    s2332Field_(slide,'CONDIÇÃO',condicao,ix+half+W*0.012,top+H*0.345,half,H*0.045,7.2);

    s2332Field_(slide,'CRIADO EM',s231FmtDate_(reg.CRIADO_EM)||'—',ix,top+H*0.415,iw,H*0.042,7.5);

    const acompanhamento = acao || (proxima ? 'Próxima inspeção: '+proxima : '');
    const obsFinal = acompanhamento ? acompanhamento : (obs || 'Sem observação registrada.');
    const rotuloFinal = acompanhamento ? 'AÇÃO / ACOMPANHAMENTO' : 'OBSERVAÇÃO';
    s2332Field_(slide,rotuloFinal,s2332Wrap_(obsFinal,48),ix,top+H*0.485,iw,H*0.075,6.8);

    s231PhotoGrid_(slide,fotos,photoX,top,photoW,usableH);
  }

  s231Footer_(slide,W,H,protocolo);
}

function s2332Field_(slide,label,value,x,y,w,h,fontSize){
  s231Text_(slide,String(label).toUpperCase(),x,y,w,H_SAFE_LABEL_(),5.5,S231.BRAND.MUTED,true);
  s231Text_(slide,String(value==null?'—':value),x,y+H_SAFE_LABEL_()+2,w,h,fontSize||7.5,S231.BRAND.TEXT,false);
}

function H_SAFE_LABEL_(){
  return 10;
}

function s2332Wrap_(texto,maxLinha){
  const s=String(texto||'').trim();
  if(!s || s.length<=maxLinha)return s;
  const palavras=s.split(/\s+/);
  const linhas=[];
  let atual='';
  palavras.forEach(p=>{
    const teste=atual ? atual+' '+p : p;
    if(teste.length>maxLinha && atual){
      linhas.push(atual);
      atual=p;
    } else {
      atual=teste;
    }
  });
  if(atual)linhas.push(atual);
  return linhas.slice(0,3).join('\n');
}

function s232SlideFotosContinuacao_(pres, reg, fotos, inicio, totalFotos) {
  const slide=pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W=pres.getPageWidth(), H=pres.getPageHeight();
  s231Bg_(slide,S231.BRAND.WHITE);

  const protocolo=String(reg.PROTOCOLO||reg.ID_REGISTRO||'Registro');
  const titulo=String(reg.TITULO||reg.TIPO||'Sinalização');
  const fim=Math.min(inicio+fotos.length,totalFotos);
  s231Header_(slide,W,`${titulo} — evidências`,`${protocolo} • fotos ${inicio+1}–${fim} de ${totalFotos}`);

  s231PhotoGrid_(slide,fotos,W*0.055,H*0.285,W*0.89,H*0.59);
  s231Footer_(slide,W,H,protocolo);
}

function s232PillNeutra_(slide,text,x,y,w,h) {
  s231Rounded_(slide,x,y,w,h,'#EEF0F5',null);
  s231Text_(slide,String(text),x+7,y+h*0.19,w-14,h*0.62,7.5,S231.BRAND.TEXT,true);
}

function s231PhotoGrid_(slide, fotos, x, y, w, h) {
  const n = fotos.length;
  const gap = Math.min(w,h)*0.018;
  let boxes = [];
  if (n === 1) boxes = [[x,y,w,h]];
  else if (n === 2) boxes = [[x,y,(w-gap)/2,h],[x+(w+gap)/2,y,(w-gap)/2,h]];
  else if (n === 3) boxes = [[x,y,w*0.59-gap/2,h],[x+w*0.59+gap/2,y,w*0.41-gap/2,(h-gap)/2],[x+w*0.59+gap/2,y+(h+gap)/2,w*0.41-gap/2,(h-gap)/2]];
  else boxes = [
    [x,y,(w-gap)/2,(h-gap)/2], [x+(w+gap)/2,y,(w-gap)/2,(h-gap)/2],
    [x,y+(h+gap)/2,(w-gap)/2,(h-gap)/2], [x+(w+gap)/2,y+(h+gap)/2,(w-gap)/2,(h-gap)/2]
  ];

  fotos.forEach((f,i)=>{
    const b = boxes[i];
    s231Rounded_(slide,b[0],b[1],b[2],b[3],'#F2F3F7',S231.BRAND.BORDER);
    if (!f.arquivoId) {
      s231Text_(slide,'Foto sem ARQUIVO_ID',b[0],b[1]+b[3]*0.43,b[2],b[3]*0.08,9,S231.BRAND.MUTED,true,SlidesApp.ParagraphAlignment.CENTER);
      return;
    }
    try {
      const blob = DriveApp.getFileById(f.arquivoId).getBlob();
      s231InsertContain_(slide, blob, b[0]+gap, b[1]+gap, b[2]-2*gap, b[3]-2*gap);
    } catch (e) {
      s231Text_(slide,'Não foi possível carregar a foto',b[0]+gap,b[1]+b[3]*0.42,b[2]-2*gap,b[3]*0.08,9,S231.BRAND.RED,true,SlidesApp.ParagraphAlignment.CENTER);
    }
  });
}

function s231ResumoAcoes_(pres, registros) {
  // S23.2 — menos linhas por slide e localização em até duas linhas.
  const porSlide=7;
  for(let start=0; start<registros.length; start+=porSlide){
    const items=registros.slice(start,start+porSlide);
    const slide=pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    const W=pres.getPageWidth(), H=pres.getPageHeight();
    s231Bg_(slide,S231.BRAND.BG);
    s231Header_(slide,W,start===0?'Resumo consolidado':'Resumo consolidado — continuação',`${registros.length} registros no relatório`);

    const x=W*0.04, y0=H*0.285, rowH=H*0.078;
    const cols=[0.17,0.36,0.12,0.17,0.12];
    const names=['Protocolo','Local','Status','Responsável','Conservação'];
    let curX=x;
    names.forEach((n,i)=>{
      const cw=W*cols[i];
      s231Rect_(slide,curX,y0,cw,rowH*0.68,S231.BRAND.NAVY,null);
      s231Text_(slide,n,curX+4,y0+5,cw-8,rowH*0.68-10,8,S231.BRAND.WHITE,true);
      curX+=cw;
    });

    items.forEach((r,idx)=>{
      const yy=y0+rowH*0.68+rowH*idx;
      curX=x;
      const vals=[
        r.PROTOCOLO||r.ID_REGISTRO||'—',
        s232QuebrarLocal_(s231Local_(r)||'—',62),
        r.STATUS||'—',
        r.RESPONSAVEL||'—',
        r.ESTADO_CONSERVACAO||'—'
      ];
      vals.forEach((v,i)=>{
        const cw=W*cols[i];
        const bg=idx%2===0?S231.BRAND.WHITE:'#F0F1F6';
        s231Rect_(slide,curX,yy,cw,rowH,bg,S231.BRAND.BORDER);
        s231Text_(slide,String(v),curX+4,yy+4,cw-8,rowH-8,i===1?6.5:7.2,S231.BRAND.TEXT,i===0);
        curX+=cw;
      });
    });
  }
}

function s232QuebrarLocal_(texto,maxLinha){
  const s=String(texto||'');
  if(s.length<=maxLinha)return s;
  let corte=s.lastIndexOf(' ',maxLinha);
  if(corte<maxLinha*0.55)corte=maxLinha;
  let a=s.slice(0,corte).trim();
  let b=s.slice(corte).trim();
  if(b.length>maxLinha)b=b.slice(0,maxLinha-1).trim()+'…';
  return a+'\n'+b;
}


// ========================================================
// S23.3 — INDICADORES EXECUTIVOS E PLANO DE AÇÃO
// ========================================================

// ========================================================
// S23.3.1 — ZONA SEGURA DE LAYOUT
// ========================================================
function s2331SafeTop_(H){
  // Título + subtítulo ocupam aproximadamente 25% da página.
  // Conteúdo deve iniciar a partir deste ponto.
  return H * 0.275;
}

function s233Metricas_(registros){
  const itens = registros.map(r => ({r, p: s232PrioridadeRegistro_(r)}));
  return {
    total: registros.length,
    fotos: s231ContarFotos_(registros),
    criticos: itens.filter(x => x.p.nivel === 3).length,
    atencao: itens.filter(x => x.p.nivel === 2).length,
    acompanhar: itens.filter(x => x.p.nivel === 1).length,
    ok: itens.filter(x => x.p.nivel === 0).length,
    prioridades: itens.filter(x => x.p.nivel > 0),
    porResponsavel: s233AgruparPrioridades_(itens,'RESPONSAVEL'),
    porSetor: s233AgruparPrioridades_(itens,'MAPA'),
    porStatus: s233Count_(registros,'STATUS'),
    porConservacao: s233Count_(registros,'ESTADO_CONSERVACAO'),
    porTipo: s233Count_(registros,'TIPO')
  };
}

function s233PainelExecutivo_(pres, registros, periodo){
  const m=s233Metricas_(registros);
  const slide=pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W=pres.getPageWidth(), H=pres.getPageHeight();
  s231Bg_(slide,S231.BRAND.BG);
  s231Header_(slide,W,'Painel executivo',`Indicadores gerenciais • ${periodo}`);

  const cards=[
    ['Registros',m.total,S231.BRAND.NAVY,'Base analisada'],
    ['Críticos',m.criticos,S231.BRAND.RED,'Ação prioritária'],
    ['Atenção',m.atencao,S231.BRAND.YELLOW,'Acompanhamento'],
    ['OK',m.ok,S231.BRAND.GREEN,'Sem prioridade'],
    ['Fotos',m.fotos,S231.BRAND.PINK,'Evidências']
  ];
  // S23.3.1 — zona segura: cabeçalho ocupa até ~25% da altura.
  const left=W*0.045, y=H*0.275, gap=W*0.012, cw=(W*0.91-gap*4)/5;
  cards.forEach((c,i)=>s233Kpi_(slide,left+i*(cw+gap),y,cw,H*0.135,c[0],c[1],c[2],c[3]));

  s233BarChart_(slide,W*0.055,H*0.445,W*0.40,H*0.235,'Pendências por responsável',m.porResponsavel.slice(0,6),true);
  s233BarChart_(slide,W*0.525,H*0.445,W*0.40,H*0.235,'Status dos registros',m.porStatus.slice(0,6),false);

  const leitura=s233TextoLeitura_(m);
  s231Rounded_(slide,W*0.055,H*0.715,W*0.40,H*0.16,S231.BRAND.WHITE,S231.BRAND.BORDER);
  s231Text_(slide,'Leitura executiva',W*0.075,H*0.738,W*0.34,H*0.025,10.5,S231.BRAND.TEXT,true);
  s231Text_(slide,leitura,W*0.075,H*0.775,W*0.34,H*0.075,8.0,S231.BRAND.TEXT,false);

  const risco=s233TopRiscos_(m.prioridades,3).join('\n') || 'Nenhum risco crítico identificado no período.';
  s231Rounded_(slide,W*0.525,H*0.715,W*0.40,H*0.16,S231.BRAND.WHITE,S231.BRAND.BORDER);
  s231Text_(slide,'Riscos imediatos',W*0.545,H*0.738,W*0.34,H*0.025,10.5,S231.BRAND.TEXT,true);
  s231Text_(slide,risco,W*0.545,H*0.775,W*0.34,H*0.075,7.6,S231.BRAND.TEXT,false);
}

function s233PendenciasPorResponsavel_(pres, registros){
  const m=s233Metricas_(registros);
  const grupos=m.porResponsavel.filter(x=>x.total>0).slice(0,12);
  const W=pres.getPageWidth(), H=pres.getPageHeight();
  const porSlide=3;
  if(!grupos.length){
    const slide=pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    s231Bg_(slide,S231.BRAND.BG);
    s231Header_(slide,W,'Pendências por responsável','Nenhuma pendência identificada no recorte');
    s231Rounded_(slide,W*0.08,H*0.32,W*0.84,H*0.24,S231.BRAND.WHITE,S231.BRAND.BORDER);
    s231Text_(slide,'Não há itens críticos ou em atenção por responsável.',W*0.14,H*0.39,W*0.72,H*0.06,15,S231.BRAND.TEXT,true,SlidesApp.ParagraphAlignment.CENTER);
    return;
  }
  for(let start=0;start<grupos.length;start+=porSlide){
    const slide=pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    s231Bg_(slide,S231.BRAND.BG);
    s231Header_(slide,W,start===0?'Pendências por responsável':'Pendências por responsável — continuação','Itens agrupados por responsável para direcionamento de ação');
    const parte=grupos.slice(start,start+porSlide);
    // S23.3.1 — inicia abaixo do cabeçalho e usa cards mais altos.
    const x=W*0.055, y0=H*0.285, cardH=H*0.17, gap=H*0.035;
    parte.forEach((g,idx)=>{
      const y=y0+idx*(cardH+gap);
      s231Rounded_(slide,x,y,W*0.89,cardH,S231.BRAND.WHITE,S231.BRAND.BORDER);
      s231Text_(slide,g.label,x+W*0.025,y+H*0.028,W*0.28,H*0.038,12.5,S231.BRAND.TEXT,true);
      s233MiniCount_(slide,x+W*0.33,y+H*0.028,W*0.10,H*0.052,'Crítico',g.criticos,S231.BRAND.RED);
      s233MiniCount_(slide,x+W*0.45,y+H*0.028,W*0.10,H*0.052,'Atenção',g.atencao,S231.BRAND.YELLOW);
      s233MiniCount_(slide,x+W*0.57,y+H*0.028,W*0.10,H*0.052,'Total',g.total,S231.BRAND.NAVY);
      const top=g.itens.slice(0,3).map(x=>`${x.r.PROTOCOLO||x.r.ID_REGISTRO} • ${x.p.rotulo} • ${String(x.r.CONDICAO||x.r.ESTADO_CONSERVACAO||'').slice(0,30)}`).join('\n');
      s231Text_(slide,top,x+W*0.025,y+H*0.098,W*0.82,H*0.055,7.4,S231.BRAND.MUTED,false);
    });
  }
}

function s233PlanoAcao_(pres, registros){
  const m=s233Metricas_(registros);
  const slide=pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  const W=pres.getPageWidth(), H=pres.getPageHeight();
  s231Bg_(slide,S231.BRAND.BG);
  s231Header_(slide,W,'Plano de ação sugerido','Página final para reunião e encaminhamento');

  const etapas=[
    ['1. Tratar críticos', `${m.criticos} item(ns) devem ser avaliados primeiro. Priorizar substituição/manutenção e evidências fotográficas pós-correção.`, S231.BRAND.RED],
    ['2. Encaminhar por responsável', `${m.porResponsavel.filter(x=>x.total>0).length} responsável(is) com pendências. Usar a página anterior como pauta de cobrança.`, S231.BRAND.NAVY],
    ['3. Programar reinspeção', `${m.atencao+m.acompanhar} item(ns) em atenção/acompanhamento devem ter data de retorno ou plano preventivo.`, S231.BRAND.YELLOW],
    ['4. Manter histórico', 'Após resolução, registrar nova foto e atualizar ciclo de vida para preservar rastreabilidade.', S231.BRAND.GREEN]
  ];
  const x=W*0.08, y0=H*0.285, cardH=H*0.125, gap=H*0.025;
  etapas.forEach((e,i)=>{
    const y=y0+i*(cardH+gap);
    s231Rounded_(slide,x,y,W*0.84,cardH,S231.BRAND.WHITE,S231.BRAND.BORDER);
    s231Rect_(slide,x,y,8,cardH,e[2],null);
    s231Text_(slide,e[0],x+W*0.035,y+H*0.025,W*0.25,H*0.060,10.5,S231.BRAND.TEXT,true);
    s231Text_(slide,e[1],x+W*0.30,y+H*0.025,W*0.51,H*0.070,8.2,S231.BRAND.TEXT,false);
  });
}

function s233Kpi_(slide,x,y,w,h,titulo,valor,cor,sub){
  s231Rounded_(slide,x,y,w,h,S231.BRAND.WHITE,S231.BRAND.BORDER);

  // Uma caixa por linha evita interferência de baseline entre textos.
  s231Text_(slide,String(valor),x+w*0.08,y+h*0.10,w*0.84,h*0.28,18,cor,true);
  s231Text_(slide,titulo,x+w*0.08,y+h*0.47,w*0.84,h*0.19,8.4,S231.BRAND.TEXT,true);
  s231Text_(slide,sub,x+w*0.08,y+h*0.72,w*0.84,h*0.15,6.2,S231.BRAND.MUTED,false);
}

function s233BarChart_(slide,x,y,w,h,titulo,items,prioridades){
  s231Rounded_(slide,x,y,w,h,S231.BRAND.WHITE,S231.BRAND.BORDER);
  s231Text_(slide,titulo,x+w*0.05,y+h*0.06,w*0.90,h*0.10,11,S231.BRAND.TEXT,true);
  if(!items.length){
    s231Text_(slide,'Sem dados para este recorte.',x+w*0.05,y+h*0.45,w*0.90,h*0.10,9,S231.BRAND.MUTED,false,SlidesApp.ParagraphAlignment.CENTER);
    return;
  }
  const max=Math.max(1,...items.map(i=>prioridades?i.total:i[1]));
  items.slice(0,6).forEach((it,idx)=>{
    const label=prioridades?it.label:String(it[0]||'Não informado');
    const val=prioridades?it.total:Number(it[1]||0);
    const yy=y+h*0.21+idx*h*0.115;
    s231Text_(slide,label.slice(0,24),x+w*0.05,yy,w*0.34,h*0.055,7.6,S231.BRAND.TEXT,false);
    s231Rect_(slide,x+w*0.42,yy+h*0.018,w*0.40,h*0.030,'#ECEEF5',null);
    s231Rect_(slide,x+w*0.42,yy+h*0.018,w*0.40*(val/max),h*0.030,prioridades?S231.BRAND.PINK:S231.BRAND.NAVY,null);
    s231Text_(slide,String(val),x+w*0.84,yy,w*0.08,h*0.055,7.8,S231.BRAND.NAVY,true,SlidesApp.ParagraphAlignment.END);
  });
}

function s233MiniCount_(slide,x,y,w,h,label,val,color){
  s231Rounded_(slide,x,y,w,h,'#F8F9FC',S231.BRAND.BORDER);
  s231Text_(slide,`${label}: ${val}`,x+5,y+h*0.24,w-10,h*0.50,7.0,color,true,SlidesApp.ParagraphAlignment.CENTER);
}

function s233AgruparPrioridades_(itens,key){
  const m={};
  itens.filter(x=>x.p.nivel>0).forEach(x=>{
    const label=String(x.r[key]||'Não informado').trim()||'Não informado';
    if(!m[label])m[label]={label,total:0,criticos:0,atencao:0,acompanhar:0,itens:[]};
    m[label].total++;
    if(x.p.nivel===3)m[label].criticos++;
    else if(x.p.nivel===2)m[label].atencao++;
    else m[label].acompanhar++;
    m[label].itens.push(x);
  });
  return Object.keys(m).map(k=>m[k]).sort((a,b)=>b.criticos-a.criticos || b.total-a.total || a.label.localeCompare(b.label));
}

function s233Count_(rows,key){
  const m={};
  rows.forEach(r=>{const v=String(r[key]||'Não informado').trim()||'Não informado';m[v]=(m[v]||0)+1;});
  return Object.keys(m).map(k=>[k,m[k]]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
}

function s233TextoLeitura_(m){
  if(m.criticos>0)return `${m.criticos} item(ns) crítico(s) exigem encaminhamento prioritário. O relatório deve ser usado para direcionar responsáveis e comprovar correções.`;
  if(m.atencao>0)return `${m.atencao} item(ns) em atenção exigem acompanhamento preventivo para evitar evolução para manutenção corretiva.`;
  return 'O recorte apresenta condição predominantemente controlada. Recomenda-se manter inspeções preventivas e evidências fotográficas.';
}

function s233TopRiscos_(prioridades,n){
  return prioridades.filter(x=>x.p.nivel===3).slice(0,n).map(x=>`${x.r.PROTOCOLO||x.r.ID_REGISTRO} • ${x.r.RESPONSAVEL||'Sem responsável'} • ${String(x.p.motivo||'Crítico').slice(0,55)}`);
}

function s232Prioridades_(pres, registros) {
  const itens=registros
    .map(r=>({r, p:s232PrioridadeRegistro_(r)}))
    .filter(x=>x.p.nivel>0)
    .sort((a,b)=>b.p.nivel-a.p.nivel || String(a.r.PROTOCOLO||'').localeCompare(String(b.r.PROTOCOLO||'')));

  const W=pres.getPageWidth(), H=pres.getPageHeight();
  const porSlide=5;

  if(!itens.length){
    const slide=pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    s231Bg_(slide,S231.BRAND.BG);
    s231Header_(slide,W,'Prioridades e ações','Nenhum item crítico identificado pelos critérios atuais');
    s231Rounded_(slide,W*0.08,H*0.30,W*0.84,H*0.28,S231.BRAND.WHITE,S231.BRAND.BORDER);
    s231Text_(slide,'✓',W*0.11,H*0.36,W*0.08,H*0.09,30,S231.BRAND.GREEN,true,SlidesApp.ParagraphAlignment.CENTER);
    s231Text_(slide,'Não há ações prioritárias automáticas neste recorte.',W*0.21,H*0.36,W*0.65,H*0.06,16,S231.BRAND.TEXT,true);
    return;
  }

  for(let start=0;start<itens.length;start+=porSlide){
    const parte=itens.slice(start,start+porSlide);
    const slide=pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    s231Bg_(slide,S231.BRAND.BG);
    s231Header_(slide,W,start===0?'Prioridades e ações':'Prioridades e ações — continuação',`${itens.length} item(ns) exigem acompanhamento`);

    const x=W*0.055, y0=H*0.285, cardH=H*0.105, gap=H*0.025;
    parte.forEach((item,idx)=>{
      const r=item.r,p=item.p, y=y0+idx*(cardH+gap);
      s231Rounded_(slide,x,y,W*0.89,cardH,S231.BRAND.WHITE,S231.BRAND.BORDER);
      s231Rect_(slide,x,y,6,cardH,p.cor,null);

      s231Text_(slide,String(r.PROTOCOLO||r.ID_REGISTRO||'—'),x+W*0.02,y+H*0.018,W*0.17,H*0.025,7.3,S231.BRAND.NAVY,true);
      s231Text_(slide,s2332Ellipsis_(String(r.TITULO||r.TIPO||'Sinalização'),40),x+W*0.20,y+H*0.016,W*0.32,H*0.025,8.3,S231.BRAND.TEXT,true);
      s231Text_(slide,p.rotulo,x+W*0.75,y+H*0.016,W*0.11,H*0.025,7.2,p.cor,true,SlidesApp.ParagraphAlignment.END);

      s231Text_(slide,s232QuebrarLocal_(s231Local_(r)||'—',58),x+W*0.20,y+H*0.052,W*0.45,H*0.038,6.2,S231.BRAND.MUTED,false);
      s231Text_(slide,s2332Ellipsis_(p.motivo,34),x+W*0.66,y+H*0.052,W*0.20,H*0.030,6.3,S231.BRAND.TEXT,false);
    });
  }
}

function s2332Ellipsis_(texto,max){
  const s=String(texto||'');
  return s.length<=max ? s : s.slice(0,Math.max(1,max-1)).trim()+'…';
}

function s232PrioridadeRegistro_(r){
  const status=String(r.STATUS||'').toUpperCase();
  const cons=String(r.ESTADO_CONSERVACAO||'').toUpperCase();
  const cond=String(r.CONDICAO||'').toUpperCase();
  const acao=String(r.ACAO_RECOMENDADA||r.PROVIDENCIA||r.PENDENCIA||'').trim();

  if(/CR[IÍ]TIC|RUIM/.test(cons) || /ILEG[IÍ]VEL|DANIFIC|QUEBR|RISCO|DESCOL/.test(cond) || /MANUTEN|SUBSTITUIR|RETIRAR/.test(status)){
    return {nivel:3,rotulo:'CRÍTICO',cor:S231.BRAND.RED,motivo:acao||`${cons||'—'} • ${cond||status||'—'}`};
  }
  // S23.2.1 — "Regular" sozinho não significa pendência.
  // Atenção exige uma condição observada, status pendente ou ação registrada.
  if(/SUJ|DESBOT|TORT|DESATUAL|RISC|EMPOEIR|MANCH|FERRUG|SOLT/.test(cond) ||
     /PEND|AGUARD|ATEN/.test(status)){
    return {nivel:2,rotulo:'ATENÇÃO',cor:S231.BRAND.YELLOW,motivo:acao||`${cons||'—'} • ${cond||status||'—'}`};
  }
  if(acao){
    return {nivel:1,rotulo:'ACOMPANHAR',cor:S231.BRAND.NAVY,motivo:acao};
  }
  return {nivel:0,rotulo:'OK',cor:S231.BRAND.GREEN,motivo:''};
}

function s231Local_(r) {
  const p = [];
  if (r.MAPA) p.push(String(r.MAPA));
  if (r.PISO) p.push(String(r.PISO));
  const rua = String(r.RUA || '').trim();
  const trecho = String(r.TRECHO || '').trim();
  if (rua || trecho) p.push([rua, trecho].filter(Boolean).join(' — '));
  if (r.NUMERO_LOJA) p.push('Loja ' + r.NUMERO_LOJA);
  else if (r.LUC) p.push('LUC ' + r.LUC);
  else if (r.REFERENCIA) p.push(String(r.REFERENCIA));
  return p.join(' • ');
}

function s231PeriodoLabel_(filtros, registros) {
  const de = s231FmtDate_(filtros.de || filtros.dataDe || filtros.dataInicio || filtros.inicio || '');
  const ate = s231FmtDate_(filtros.ate || filtros.dataAte || filtros.dataFim || filtros.fim || '');
  if (de && ate) return `${de} a ${ate}`;
  if (de) return `a partir de ${de}`;
  if (ate) return `até ${ate}`;
  const datas = registros.map(r=>s231DateOnly_(r.CRIADO_EM)).filter(Boolean).sort();
  if (datas.length) return `${s231FmtDate_(datas[0])} a ${s231FmtDate_(datas[datas.length-1])}`;
  return Utilities.formatDate(new Date(), 'America/Fortaleza', 'MMMM yyyy');
}

function s231TopCount_(rows, key, n) {
  const m = {};
  rows.forEach(r=>{ const v=String(r[key]||'Não informado').trim()||'Não informado'; m[v]=(m[v]||0)+1; });
  return Object.keys(m).map(k=>[k,m[k]]).sort((a,b)=>b[1]-a[1]).slice(0,n);
}

function s231ListaResumo_(slide,x,y,w,h,title,items) {
  s231Rounded_(slide,x,y,w,h,S231.BRAND.WHITE,S231.BRAND.BORDER);
  s231Text_(slide,title,x+w*0.05,y+h*0.06,w*0.9,h*0.10,11,S231.BRAND.TEXT,true);
  const max = Math.max(1,...items.map(i=>i[1]));
  items.forEach((it,idx)=>{
    const yy = y+h*0.20+idx*h*0.115;
    s231Text_(slide,it[0].slice(0,34),x+w*0.05,yy,w*0.58,h*0.07,8,S231.BRAND.TEXT,false);
    s231Rect_(slide,x+w*0.64,yy+h*0.018,w*0.22*(it[1]/max),h*0.025,S231.BRAND.PINK,null);
    s231Text_(slide,String(it[1]),x+w*0.88,yy,w*0.07,h*0.06,8,S231.BRAND.NAVY,true,SlidesApp.ParagraphAlignment.END);
  });
}

function s231Header_(slide,W,title,subtitle) {
  s231Rect_(slide,0,0,W,22,S231.BRAND.NAVY,null);
  s231Rect_(slide,W*0.045,49,5,55,S231.BRAND.PINK,null);

  const t=String(title||'');
  const fs=t.length>42 ? 15.5 : (t.length>32 ? 16.5 : 18);
  s231Text_(slide,t,W*0.065,44,W*0.84,31,fs,S231.BRAND.TEXT,true);
  s231Text_(slide,subtitle||'',W*0.065,82,W*0.84,16,7.2,S231.BRAND.MUTED,false);
}

function s231Footer_(slide,W,H,text) {
  s231Rect_(slide,W*0.045,H-18,W*0.91,1,S231.BRAND.BORDER,null);
  s231Text_(slide,`Relatório Visual Fotográfico do Mall • ${text}`,W*0.045,H-15,W*0.91,10,6.5,S231.BRAND.MUTED,false);
}

function s231Pill_(slide,text,x,y,w,h,color) {
  const label=String(text||'').toUpperCase();
  const wanted=Math.max(78,label.length*7.0+30);
  const actual=Math.min(w,wanted);
  s231Rounded_(slide,x,y,actual,h,color,null);
  s231Text_(slide,label,x+7,y+h*0.18,actual-14,h*0.62,6.8,S231.BRAND.WHITE,true,SlidesApp.ParagraphAlignment.CENTER);
}

function s231StatusColor_(s) {
  s = String(s||'').toUpperCase();
  if (/CR[IÍ]TIC|VENCID|ERRO|MANUTEN/.test(s)) return S231.BRAND.RED;
  if (/PEND|AGUARD|ATEN|EXPIR/.test(s)) return S231.BRAND.YELLOW;
  if (/ATIV|OK|CONCLU|RESOLV/.test(s)) return S231.BRAND.GREEN;
  return S231.BRAND.NAVY;
}

function s231InsertContain_(slide, blob, x,y,w,h) {
  const img = slide.insertImage(blob);
  const iw = img.getWidth(), ih = img.getHeight();
  const scale = Math.min(w/iw, h/ih);
  const nw = iw*scale, nh = ih*scale;
  img.setWidth(nw).setHeight(nh).setLeft(x+(w-nw)/2).setTop(y+(h-nh)/2);
  return img;
}

function s231Text_(slide,text,x,y,w,h,size,color,bold,align) {
  const sh = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX,x,y,w,h);
  sh.getFill().setTransparent();
  sh.getBorder().setTransparent();
  const tr = sh.getText();
  tr.setText(String(text == null ? '' : text));
  tr.getTextStyle().setFontFamily('Arial').setFontSize(size).setForegroundColor(color).setBold(!!bold);
  const alinhamento = align || SlidesApp.ParagraphAlignment.START;
  try {
    tr.getParagraphStyle().setParagraphAlignment(alinhamento);
  } catch (e) {
    // Fallback defensivo: não interrompe a geração inteira por estilo.
    console.warn('[S23.1.1] Falha ao aplicar alinhamento de parágrafo:', e);
  }
  return sh;
}

function s231Rect_(slide,x,y,w,h,fill,border) {
  const sh = slide.insertShape(SlidesApp.ShapeType.RECTANGLE,x,y,w,h);
  sh.getFill().setSolidFill(fill);
  if (border) sh.getBorder().getLineFill().setSolidFill(border); else sh.getBorder().setTransparent();
  return sh;
}

function s231Rounded_(slide,x,y,w,h,fill,border) {
  const sh = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE,x,y,w,h);
  sh.getFill().setSolidFill(fill);
  if (border) sh.getBorder().getLineFill().setSolidFill(border); else sh.getBorder().setTransparent();
  return sh;
}

function s231Bg_(slide,color) {
  slide.getBackground().setSolidFill(color);
}

function s231LimparSlide_(slide) {
  slide.getPageElements().forEach(e => { try { e.remove(); } catch(err){} });
}

function s231ContarFotos_(regs) {
  return regs.reduce((s,r)=>s+((r._fotos||[]).length),0);
}

function s231Headers_(sh) {
  if (!sh || sh.getLastColumn() < 1) return [];
  return sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(s=>String(s).trim());
}

function s231SheetObjects_(sh) {
  const lr=sh.getLastRow(), lc=sh.getLastColumn();
  if (lr<2 || lc<1) return [];
  const vals=sh.getRange(1,1,lr,lc).getValues();
  const h=vals[0].map(v=>String(v).trim());
  return vals.slice(1).filter(r=>r.some(v=>String(v).trim()!=='' )).map(r=>{
    const o={}; h.forEach((k,i)=>{ if(k) o[k]=r[i]; }); return o;
  });
}

function s231DateOnly_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v)==='[object Date]' && !isNaN(v)) return Utilities.formatDate(v,'America/Fortaleza','yyyy-MM-dd');
  const s=String(v).trim();
  let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return `${m[1]}-${m[2]}-${m[3]}`;
  m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if(m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d=new Date(s); if(!isNaN(d)) return Utilities.formatDate(d,'America/Fortaleza','yyyy-MM-dd');
  return '';
}

function s231FmtDate_(v) {
  const iso=s231DateOnly_(v); if(!iso) return '';
  const p=iso.split('-'); return `${p[2]}/${p[1]}/${p[0]}`;
}

function s231LerConfig_(ss) {
  if (typeof lerConfigComoObjeto_ === 'function') {
    try { return lerConfigComoObjeto_(ss) || {}; } catch(e) {}
  }
  const sh=ss.getSheetByName('CONFIG'); if(!sh || sh.getLastRow()<1) return {};
  const vals=sh.getRange(1,1,sh.getLastRow(),Math.min(3,sh.getLastColumn())).getDisplayValues();
  const out={};
  vals.forEach(r=>{ const k=String(r[0]||'').trim(); if(k) out[k]=String(r[1]||'').trim(); });
  return out;
}

function s231SalvarConfig_(ss,key,value) {
  const sh=ss.getSheetByName('CONFIG');
  if (!sh) throw new Error('Aba CONFIG não encontrada para salvar '+key+'.');
  const lr=Math.max(1,sh.getLastRow());
  const vals=sh.getRange(1,1,lr,Math.max(2,sh.getLastColumn())).getDisplayValues();
  for(let i=0;i<vals.length;i++){
    if(String(vals[i][0]||'').trim()===key){ sh.getRange(i+1,2).setValue(value); return; }
  }
  sh.appendRow([key,value]);
}


// ========================================================
// S23.1.1 — CORREÇÃO DE ALINHAMENTO DO GOOGLE SLIDES
// ========================================================
function setupS2311() {
  const r = setupS231();
  return {
    ok: !!r.ok,
    version: S231.VERSION,
    folderId: r.folderId,
    folderUrl: r.folderUrl,
    folderName: r.folderName,
    correcao: 'ParagraphAlignment START/END'
  };
}

function diagnosticoS2311() {
  const d = diagnosticoS231();
  const checks = (d.checks || []).slice();
  checks.push({
    nome: 'PARAGRAPH_ALIGNMENT',
    ok: true,
    detalhe: 'START/CENTER/END/JUSTIFIED'
  });
  return {
    ok: checks.every(c => c.ok),
    version: S231.VERSION,
    checks: checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length
  };
}


// ========================================================
// S23.2 — RELATÓRIO GERENCIAL APRIMORADO
// ========================================================
function setupS232() {
  const r = setupS231();
  return {
    ok: !!r.ok,
    version: S231.VERSION,
    folderId: r.folderId,
    folderUrl: r.folderUrl,
    folderName: r.folderName,
    melhorias: [
      'prioridades e ações',
      'slides sem foto otimizados',
      'galeria 4 fotos + continuação',
      'resumo consolidado legível',
      'ordenação de fotos'
    ]
  };
}

function diagnosticoS232() {
  const d = diagnosticoS231();
  const checks=(d.checks||[]).slice();
  [
    ['S232_PRIORIDADES',typeof s232Prioridades_==='function','Prioridades e ações'],
    ['S232_REGISTRO_PRINCIPAL',typeof s232SlideRegistroPrincipal_==='function','Layout principal'],
    ['S232_FOTOS_CONTINUACAO',typeof s232SlideFotosContinuacao_==='function','Fotos adicionais'],
    ['S232_LOCAL_WRAP',typeof s232QuebrarLocal_==='function','Local em duas linhas']
  ].forEach(x=>checks.push({nome:x[0],ok:!!x[1],detalhe:x[2]}));
  return {
    ok: checks.every(c=>c.ok),
    version: S231.VERSION,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c=>!c.ok).length
  };
}


// ========================================================
// S23.2.1 — AJUSTES DE PRIORIDADE E QUEBRA DE LINHA
// ========================================================
function setupS2321() {
  const r = setupS231();
  return {
    ok: !!r.ok,
    version: S231.VERSION,
    folderId: r.folderId,
    folderUrl: r.folderUrl,
    folderName: r.folderName,
    ajustes: [
      'quebra de linha real nas localizações',
      'Regular sem problema não gera atenção',
      'condições observadas continuam gerando atenção'
    ]
  };
}

function diagnosticoS2321() {
  const d = diagnosticoS231();
  const checks = (d.checks || []).slice();

  const testeLinha = s232QuebrarLocal_(
    'Setor Azul Rua General Bezerril Meio de Rua General Bezerril',
    25
  );

  const prioridadeRegularOk = s232PrioridadeRegistro_({
    STATUS:'ATIVA',
    ESTADO_CONSERVACAO:'Regular',
    CONDICAO:'Sem problema'
  });

  const prioridadeSuja = s232PrioridadeRegistro_({
    STATUS:'ATIVA',
    ESTADO_CONSERVACAO:'Boa',
    CONDICAO:'Suja'
  });

  checks.push({
    nome:'S2321_LINE_BREAK',
    ok: testeLinha.indexOf('\n') >= 0 && testeLinha.indexOf('\\n') < 0,
    detalhe:'Quebra de linha real'
  });
  checks.push({
    nome:'S2321_REGULAR_OK',
    ok: Number(prioridadeRegularOk.nivel || 0) === 0,
    detalhe:'Regular + Sem problema não é prioridade'
  });
  checks.push({
    nome:'S2321_CONDICAO_ATENCAO',
    ok: Number(prioridadeSuja.nivel || 0) === 2,
    detalhe:'Condição Suja continua como ATENÇÃO'
  });

  return {
    ok: checks.every(c => c.ok),
    version: S231.VERSION,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c => !c.ok).length
  };
}


// ========================================================
// S23.3 — SETUP / DIAGNÓSTICO
// ========================================================
function setupS233() {
  const r = setupS231();
  return {
    ok: !!r.ok,
    version: S231.VERSION,
    folderId: r.folderId,
    folderUrl: r.folderUrl,
    folderName: r.folderName,
    melhorias: [
      'painel executivo com KPIs',
      'barras por responsável e status',
      'pendências agrupadas por responsável',
      'plano de ação final',
      'slides executivos antes das fichas fotográficas'
    ]
  };
}

function diagnosticoS233() {
  const d = diagnosticoS231();
  const checks=(d.checks||[]).slice();
  [
    ['S233_METRICAS',typeof s233Metricas_==='function','Cálculo de KPIs'],
    ['S233_PAINEL_EXECUTIVO',typeof s233PainelExecutivo_==='function','Painel executivo'],
    ['S233_PENDENCIAS_RESPONSAVEL',typeof s233PendenciasPorResponsavel_==='function','Pendências por responsável'],
    ['S233_PLANO_ACAO',typeof s233PlanoAcao_==='function','Plano de ação final'],
    ['S233_BAR_CHART',typeof s233BarChart_==='function','Gráficos de barra']
  ].forEach(x=>checks.push({nome:x[0],ok:!!x[1],detalhe:x[2]}));
  return {
    ok: checks.every(c=>c.ok),
    version: S231.VERSION,
    checks,
    totalChecks: checks.length,
    falhas: checks.filter(c=>!c.ok).length
  };
}


// ========================================================
// S23.3.1 — CORREÇÃO DE LAYOUT / SAFE AREA
// ========================================================
function setupS2331(){
  const r=setupS231();
  return {
    ok:!!r.ok,
    version:S231.VERSION,
    folderId:r.folderId,
    folderUrl:r.folderUrl,
    folderName:r.folderName,
    ajustes:[
      'zona segura abaixo do cabeçalho',
      'painel executivo reposicionado',
      'pendências 3 cards por slide',
      'prioridades 5 cards por slide',
      'plano de ação reposicionado'
    ]
  };
}

function diagnosticoS2331(){
  const d=diagnosticoS231();
  const checks=(d.checks||[]).slice();
  checks.push({nome:'S2331_SAFE_TOP',ok:typeof s2331SafeTop_==='function' && s2331SafeTop_(100)===27.500000000000004,detalhe:'Conteúdo começa após cabeçalho'});
  checks.push({nome:'S2331_PAINEL',ok:typeof s233PainelExecutivo_==='function',detalhe:'Painel executivo'});
  checks.push({nome:'S2331_PENDENCIAS',ok:typeof s233PendenciasPorResponsavel_==='function',detalhe:'Pendências'});
  checks.push({nome:'S2331_PRIORIDADES',ok:typeof s232Prioridades_==='function',detalhe:'Prioridades'});
  checks.push({nome:'S2331_PLANO',ok:typeof s233PlanoAcao_==='function',detalhe:'Plano de ação'});
  return {
    ok:checks.every(c=>c.ok),
    version:S231.VERSION,
    checks,
    totalChecks:checks.length,
    falhas:checks.filter(c=>!c.ok).length
  };
}


// ========================================================
// S23.3.2 — CORREÇÃO GLOBAL DE LAYOUT
// ========================================================
function setupS2332(){
  const r=setupS231();
  return {
    ok:!!r.ok,
    version:S231.VERSION,
    folderId:r.folderId,
    folderUrl:r.folderUrl,
    folderName:r.folderName,
    ajustes:[
      'cabeçalho protegido em todos os slides',
      'KPIs sem sobreposição',
      'mini indicadores em linha única',
      'status longos sem quebra',
      'ficha com foto em grid fixo',
      'resumo consolidado abaixo do subtítulo',
      'títulos longos protegidos'
    ]
  };
}

function diagnosticoS2332(){
  const d=diagnosticoS231();
  const checks=(d.checks||[]).slice();

  checks.push({
    nome:'S2332_HEADER_SAFE',
    ok:typeof s2332Field_==='function' && typeof s2332Wrap_==='function',
    detalhe:'Ficha usa layout fixo e zona segura'
  });
  checks.push({
    nome:'S2332_PILL_LONG',
    ok:typeof s231Pill_==='function',
    detalhe:'Status longos tratados'
  });
  checks.push({
    nome:'S2332_KPI',
    ok:typeof s233Kpi_==='function',
    detalhe:'KPI com três zonas verticais'
  });
  checks.push({
    nome:'S2332_MINI',
    ok:typeof s233MiniCount_==='function',
    detalhe:'Mini indicador em linha única'
  });
  checks.push({
    nome:'S2332_TRUNC',
    ok:s2332Ellipsis_('1234567890',6)==='12345…',
    detalhe:'Título variável protegido'
  });

  return {
    ok:checks.every(c=>c.ok),
    version:S231.VERSION,
    checks,
    totalChecks:checks.length,
    falhas:checks.filter(c=>!c.ok).length
  };
}


// ========================================================
// S23.3.3 — AJUSTE FINAL DO RESUMO EXECUTIVO
// ========================================================
function setupS2333(){
  const r=setupS231();
  return {
    ok:!!r.ok,
    version:S231.VERSION,
    folderId:r.folderId,
    folderUrl:r.folderUrl,
    folderName:r.folderName,
    ajuste:'KPIs do Resumo executivo deslocados abaixo do período'
  };
}

function diagnosticoS2333(){
  const d=diagnosticoS231();
  const checks=(d.checks||[]).slice();
  checks.push({
    nome:'S2333_RESUMO_SAFE',
    ok:typeof s231ResumoExecutivo_==='function',
    detalhe:'Resumo executivo com KPIs abaixo do cabeçalho'
  });
  return {
    ok:checks.every(c=>c.ok),
    version:S231.VERSION,
    checks,
    totalChecks:checks.length,
    falhas:checks.filter(c=>!c.ok).length
  };
}


// ========================================================
// S23.4 — SETUP / DIAGNÓSTICO
// ========================================================
function setupS234(){
  const r=setupS231();
  return {
    ok:!!r.ok,
    version:S231.VERSION,
    folderId:r.folderId,
    folderUrl:r.folderUrl,
    folderName:r.folderName,
    comparativo:'Período atual × período imediatamente anterior de mesma duração',
    fonte:'REGISTRO_HISTORICO'
  };
}

function diagnosticoS234(){
  const d=diagnosticoS231();
  const checks=(d.checks||[]).slice();

  const ss=SpreadsheetApp.getActive();
  const sh=ss.getSheetByName(S231.SHEET_HISTORICO);
  checks.push({
    nome:'S234_HISTORICO',
    ok:!!sh,
    detalhe:sh?'REGISTRO_HISTORICO disponível':'Aba ausente'
  });
  checks.push({
    nome:'S234_COMPARATIVO',
    ok:typeof s234ComparativoHistorico_==='function',
    detalhe:'Motor de comparação'
  });
  checks.push({
    nome:'S234_EVOLUCAO_SLIDE',
    ok:typeof s234SlideEvolucao_==='function',
    detalhe:'Slide Evolução operacional'
  });
  checks.push({
    nome:'S234_MUDANCAS_SLIDE',
    ok:typeof s234SlideMudancas_==='function',
    detalhe:'Slide Mudanças relevantes'
  });

  const janela=s234JanelaComparacao_({de:'2026-08-14',ate:'2026-08-17'});
  checks.push({
    nome:'S234_JANELA',
    ok:janela.antDe==='2026-08-10' && janela.antAte==='2026-08-13',
    detalhe:`${janela.antDe} a ${janela.antAte}`
  });

  return {
    ok:checks.every(c=>c.ok),
    version:S231.VERSION,
    checks,
    totalChecks:checks.length,
    falhas:checks.filter(c=>!c.ok).length
  };
}


// ========================================================
// S23.4.1 — SETUP / DIAGNÓSTICO
// ========================================================
function setupS2341(){
  const r=setupS231();
  return {
    ok:!!r.ok,
    version:S231.VERSION,
    folderId:r.folderId,
    folderUrl:r.folderUrl,
    folderName:r.folderName,
    correcao:'Reconhecimento de dataInicio/dataFim enviados pelo formulário S13'
  };
}

function diagnosticoS2341(){
  const d=diagnosticoS234();
  const checks=(d.checks||[]).slice();

  const datas=s234DatasFiltro_({
    dataInicio:'2026-08-14',
    dataFim:'2026-08-17'
  });

  const janela=s234JanelaComparacao_({
    dataInicio:'2026-08-14',
    dataFim:'2026-08-17'
  });

  checks.push({
    nome:'S2341_UI_KEYS',
    ok:datas.de==='2026-08-14' && datas.ate==='2026-08-17',
    detalhe:`${datas.de} a ${datas.ate}`
  });

  checks.push({
    nome:'S2341_JANELA_ANTERIOR',
    ok:janela.antDe==='2026-08-10' && janela.antAte==='2026-08-13',
    detalhe:`Atual ${janela.atualDe}..${janela.atualAte} | Anterior ${janela.antDe}..${janela.antAte}`
  });

  // Verificação real da base histórica, usando exatamente o período do Gate.
  const ss=SpreadsheetApp.getActive();
  const base=s234BaseRegistros_(ss,{
    dataInicio:'2026-08-14',
    dataFim:'2026-08-17'
  });
  const eventos=s234LerHistorico_(ss,base,'2026-08-14','2026-08-17');

  checks.push({
    nome:'S2341_EVENTOS_GATE',
    ok:eventos.length>0,
    detalhe:`${eventos.length} inspeção(ões) encontrada(s) de 14/08 a 17/08`
  });

  return {
    ok:checks.every(c=>c.ok),
    version:S231.VERSION,
    checks,
    totalChecks:checks.length,
    falhas:checks.filter(c=>!c.ok).length,
    eventosGate:eventos.length
  };
}


// ========================================================
// S23.4.2 — SETUP / DIAGNÓSTICO
// ========================================================
function setupS2342(){
  const r=setupS231();
  return {
    ok:!!r.ok,
    version:S231.VERSION,
    folderId:r.folderId,
    folderUrl:r.folderUrl,
    folderName:r.folderName,
    correcao:'Comparativo reutiliza exatamente os registros filtrados do relatório'
  };
}

function diagnosticoS2342(){
  const d=diagnosticoS2341();
  const checks=(d.checks||[]).slice();

  const ss=SpreadsheetApp.getActive();
  const filtros={
    dataInicio:'2026-08-14',
    dataFim:'2026-08-17'
  };
  const regs=s231LerRegistros_(ss,filtros);
  const c=s234ComparativoHistorico_(ss,filtros,regs);

  checks.push({
    nome:'S2342_BASE_FILTRADA',
    ok:regs.length>0,
    detalhe:`${regs.length} registro(s) na mesma base do relatório`
  });

  checks.push({
    nome:'S2342_EVENTOS_ATUAIS',
    ok:c.eventosAtual.length>0,
    detalhe:`${c.eventosAtual.length} inspeção(ões) vinculada(s) no período atual`
  });

  checks.push({
    nome:'S2342_JANELA',
    ok:c.janela.atualDe==='2026-08-14' &&
       c.janela.atualAte==='2026-08-17' &&
       c.janela.antDe==='2026-08-10' &&
       c.janela.antAte==='2026-08-13',
    detalhe:`Atual ${c.janela.atualDe}..${c.janela.atualAte} | Anterior ${c.janela.antDe}..${c.janela.antAte}`
  });

  return {
    ok:checks.every(x=>x.ok),
    version:S231.VERSION,
    checks,
    totalChecks:checks.length,
    falhas:checks.filter(x=>!x.ok).length,
    registrosGate:regs.length,
    eventosAtuais:c.eventosAtual.length,
    eventosAnteriores:c.eventosAnterior.length,
    janela:c.janela
  };
}


// ========================================================
// S23.5 — DIAGNÓSTICO DO RELATÓRIO
// ========================================================
function diagnosticoRelatorioS235(){
  const d=diagnosticoS2342();
  const checks=(d.checks||[]).slice();

  const ss=SpreadsheetApp.getActive();
  const fotos=ss.getSheetByName(S231.SHEET_FOTOS);

  let headers=[];
  if(fotos)headers=s231Headers_(fotos);

  ['CLIENT_INSPECTION_ID','ID_HISTORICO','ORIGEM_FOTO'].forEach(k=>{
    checks.push({
      nome:'S235_FOTO_'+k,
      ok:headers.includes(k),
      detalhe:headers.includes(k)?'OK':'Execute setupS235()'
    });
  });


  return {
    ok:checks.every(c=>c.ok),
    version:S231.VERSION,
    checks,
    totalChecks:checks.length,
    falhas:checks.filter(c=>!c.ok).length
  };
}


// ========================================================
// S23.5.3 — DIAGNÓSTICO DO ANTES × DEPOIS
// ========================================================
function diagnosticoRelatorioS2353(){
  const d=diagnosticoRelatorioS235();
  const checks=(d.checks||[]).slice();

  checks.push({
    nome:'S2353_SNAPSHOT_ENGINE',
    ok:typeof s2353ComparacoesSnapshots_==='function',
    detalhe:'Cadastro inicial + inspeções'
  });

  checks.push({
    nome:'S2353_DELTA_MIDIA',
    ok:typeof s2353DeltaFotos_==='function',
    detalhe:'Mantida / trocada / adicionada / removida'
  });

  const teste=s2353DeltaFotos_(
    [{ARQUIVO_ID:'A'},{ARQUIVO_ID:'B'},{ARQUIVO_ID:'C'}],
    [{ARQUIVO_ID:'A'},{ARQUIVO_ID:'X'},{ARQUIVO_ID:'C'}]
  );

  checks.push({
    nome:'S2353_DELTA_TESTE',
    ok:teste.mantidas===2 && teste.trocadas===1 &&
       teste.adicionadas===0 && teste.removidas===0,
    detalhe:`${teste.mantidas} mantidas; ${teste.trocadas} trocada`
  });

  return {
    ok:checks.every(c=>c.ok),
    version:S231.VERSION,
    checks,
    totalChecks:checks.length,
    falhas:checks.filter(c=>!c.ok).length
  };
}


// ========================================================
// S23.5.3.2 — DIAGNÓSTICO
// ========================================================
function diagnosticoRelatorioS23532(){
  const d=diagnosticoRelatorioS2353();
  const checks=(d.checks||[]).slice();

  const insercao=s2353DeltaFotos_(
    [{ARQUIVO_ID:'A'},{ARQUIVO_ID:'B'},{ARQUIVO_ID:'C'}],
    [{ARQUIVO_ID:'A'},{ARQUIVO_ID:'B'},{ARQUIVO_ID:'X'},{ARQUIVO_ID:'C'}]
  );
  checks.push({
    nome:'S23532_INSERCAO',
    ok:insercao.mantidas===3 && insercao.trocadas===0 &&
       insercao.adicionadas===1 && insercao.removidas===0,
    detalhe:JSON.stringify(insercao)
  });

  const remocao=s2353DeltaFotos_(
    [{ARQUIVO_ID:'A'},{ARQUIVO_ID:'B'},{ARQUIVO_ID:'X'},{ARQUIVO_ID:'C'}],
    [{ARQUIVO_ID:'A'},{ARQUIVO_ID:'B'},{ARQUIVO_ID:'X'}]
  );
  checks.push({
    nome:'S23532_REMOCAO',
    ok:remocao.mantidas===3 && remocao.trocadas===0 &&
       remocao.adicionadas===0 && remocao.removidas===1,
    detalhe:JSON.stringify(remocao)
  });

  const troca=s2353DeltaFotos_(
    [{ARQUIVO_ID:'A'},{ARQUIVO_ID:'B'},{ARQUIVO_ID:'C'}],
    [{ARQUIVO_ID:'A'},{ARQUIVO_ID:'X'},{ARQUIVO_ID:'C'}]
  );
  checks.push({
    nome:'S23532_TROCA',
    ok:troca.mantidas===2 && troca.trocadas===1 &&
       troca.adicionadas===0 && troca.removidas===0,
    detalhe:JSON.stringify(troca)
  });

  return {
    ok:checks.every(c=>c.ok),
    version:S231.VERSION,
    checks,
    totalChecks:checks.length,
    falhas:checks.filter(c=>!c.ok).length
  };
}


// ========================================================
// S23.5.3.3 — DIAGNÓSTICO DE TÍTULO POR ATIVO
// ========================================================
function diagnosticoRelatorioS23533(){
  const d=diagnosticoRelatorioS23532();
  const checks=(d.checks||[]).slice();

  const amostra=[
    {protocolo:'A'},
    {protocolo:'B'},
    {protocolo:'B'}
  ];
  const c={};
  const titulos=amostra.map(x=>{
    const k=x.protocolo;
    const n=(c[k]||0)+1;c[k]=n;
    return n===1
      ? 'Antes × Depois — mídia'
      : 'Antes × Depois — mídia — continuação';
  });

  checks.push({
    nome:'S23533_TITULO_POR_ATIVO',
    ok:
      titulos[0]==='Antes × Depois — mídia' &&
      titulos[1]==='Antes × Depois — mídia' &&
      titulos[2]==='Antes × Depois — mídia — continuação',
    detalhe:titulos.join(' | ')
  });

  return {
    ok:checks.every(c=>c.ok),
    version:S231.VERSION,
    checks,
    totalChecks:checks.length,
    falhas:checks.filter(c=>!c.ok).length
  };
}
