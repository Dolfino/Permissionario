// ========================================================
// S26.11-A4 — ADMINISTRAÇÃO DE ACESSOS E DISPOSITIVOS
// Extensão da Administração e Governança existente (S14).
// Lista sessões/dispositivos sem expor TOKEN_HASH, permite revogar
// um dispositivo específico ou todas as sessões de um usuário.
// Não promove APP_VERSAO / APP_FASE.
// ========================================================
const S2611A4 = Object.freeze({
  FASE: 'S26.11-A4',
  STATUS: 'INSTALADO',
  ORIGEM_CONFIAVEL: 'PIN_DISPOSITIVO_CONFIAVEL',
  SESSION_EXTRA_HEADERS: ['DEVICE_LABEL']
});

function setupS2611A4(){
  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');
  const usuarios = ss.getSheetByName('USUARIOS');
  const sessoes = ss.getSheetByName('SESSOES_USUARIO');
  if(!cfg) throw new Error('CONFIG ausente.');
  if(!usuarios) throw new Error('USUARIOS ausente.');
  if(!sessoes) throw new Error('SESSOES_USUARIO ausente. Execute setupS223() antes.');

  s2611A4GarantirCabecalhosSessao_(sessoes);

  setConfigValue_(cfg,'S2611A4_STATUS',S2611A4.STATUS,'Administração de acessos e dispositivos');
  setConfigValue_(cfg,'S2611A4_INSTALADO_EM',
    Utilities.formatDate(new Date(),APP.TIMEZONE,"yyyy-MM-dd'T'HH:mm:ssXXX"),
    'Data/hora da instalação S26.11-A4'
  );

  try{
    registrarAuditoriaS15_({
      acao:'SETUP_S2611A4',entidade:'SISTEMA',entidadeId:S2611A4.FASE,
      resultado:'SUCESSO',origem:'APPS_SCRIPT'
    });
  }catch(_){}

  SpreadsheetApp.flush();
  return diagnosticoS2611A4();
}

function s2611A4GarantirCabecalhosSessao_(sh){
  const atuais = sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(String);
  const falt = S2611A4.SESSION_EXTRA_HEADERS.filter(h=>!atuais.includes(h));
  if(falt.length) sh.getRange(1,atuais.length+1,1,falt.length).setValues([falt]);
  return falt;
}

function s2611A4DataIso_(v){
  if(!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return (d instanceof Date && !isNaN(d)) ? d.toISOString() : '';
}

function s2611A4DataMs_(v){
  if(!v) return 0;
  const d = v instanceof Date ? v : new Date(v);
  return (d instanceof Date && !isNaN(d)) ? d.getTime() : 0;
}

function s2611A4DeviceRef_(deviceId){
  const id = String(deviceId||'').trim();
  if(!id) return 'SEM-ID';
  return sha256HexS223_('DEVICE|'+id+'|'+APP.ID).slice(0,10).toUpperCase();
}

function s2611A4StatusEfetivo_(status,expiraEm,usuarioAtivo){
  const s = String(status||'').trim().toUpperCase() || 'DESCONHECIDA';
  if(s !== 'ATIVA') return s;
  if(!usuarioAtivo) return 'USUARIO_INATIVO';
  const exp = s2611A4DataMs_(expiraEm);
  if(exp && exp <= Date.now()) return 'EXPIRADA';
  return 'ATIVA';
}

function s2611A4UsuariosMap_(){
  const sh = SpreadsheetApp.getActive().getSheetByName('USUARIOS');
  const out = {};
  if(!sh || sh.getLastRow()<2) return out;
  const vals = sh.getDataRange().getValues();
  const h = vals.shift().map(String), idx={}; h.forEach((x,i)=>idx[x]=i);
  vals.forEach(r=>{
    const email = normalizarEmailS14_(r[idx.EMAIL]);
    if(!email) return;
    out[email] = {
      email: email,
      nome: String(r[idx.NOME]||email),
      perfil: String(r[idx.PERFIL]||'CONSULTA').toUpperCase(),
      ativo: boolS20_(r[idx.ATIVO]),
      ultimoAcesso: s2611A4DataIso_(r[idx.ULTIMO_ACESSO])
    };
  });
  return out;
}

function appListarAcessosDispositivosS2611A4(filtros){
  exigirPermissaoS15_('administrar',{
    acao:'LISTAR_ACESSOS_DISPOSITIVOS',entidade:'SESSOES_USUARIO'
  });

  filtros = filtros || {};
  const texto = String(filtros.texto||'').trim().toLowerCase();
  const statusFiltro = String(filtros.status||'').trim().toUpperCase();
  const tipoFiltro = String(filtros.tipo||'').trim().toUpperCase();

  const sh = SpreadsheetApp.getActive().getSheetByName('SESSOES_USUARIO');
  if(!sh || sh.getLastRow()<2){
    return {
      ok:true,fase:S2611A4.FASE,itens:[],
      resumo:{usuarios:0,dispositivosConfiaveisAtivos:0,sessoesAtivas:0,expiram24h:0,total:0}
    };
  }

  s2611A4GarantirCabecalhosSessao_(sh);
  const vals = sh.getDataRange().getValues();
  const h = vals.shift().map(String), idx={}; h.forEach((x,i)=>idx[x]=i);
  const usuarios = s2611A4UsuariosMap_();
  const agora = Date.now();
  const em24h = agora + 24*3600000;

  let itens = vals.map((r,offset)=>{
    const email = normalizarEmailS14_(r[idx.EMAIL]);
    const u = usuarios[email] || {email:email,nome:email||'Usuário removido',perfil:'—',ativo:false,ultimoAcesso:''};
    const origem = String(r[idx.ORIGEM]||'PIN');
    const deviceId = String(r[idx.DEVICE_ID]||'');
    const expiraEm = r[idx.EXPIRA_EM];
    const statusOriginal = String(r[idx.STATUS]||'').toUpperCase();
    const statusEfetivo = s2611A4StatusEfetivo_(statusOriginal,expiraEm,u.ativo);
    const confiavel = origem === S2611A4.ORIGEM_CONFIAVEL;
    const deviceLabel = idx.DEVICE_LABEL >= 0 ? String(r[idx.DEVICE_LABEL]||'') : '';

    return {
      idSessao:String(r[idx.ID_SESSAO]||''),
      email:email,
      nome:u.nome,
      perfil:u.perfil,
      usuarioAtivo:!!u.ativo,
      usuarioUltimoAcesso:u.ultimoAcesso,
      deviceRef:s2611A4DeviceRef_(deviceId),
      deviceLabel:deviceLabel || (deviceId ? 'Dispositivo identificado' : 'Dispositivo não identificado'),
      criadoEm:s2611A4DataIso_(r[idx.CRIADO_EM]),
      expiraEm:s2611A4DataIso_(expiraEm),
      ultimoUso:s2611A4DataIso_(r[idx.ULTIMO_USO]),
      encerradoEm:s2611A4DataIso_(r[idx.ENCERRADO_EM]),
      statusOriginal:statusOriginal || '—',
      status:statusEfetivo,
      origem:origem,
      confiavel:confiavel,
      versaoApp:String(r[idx.VERSAO_APP]||''),
      _expiraMs:s2611A4DataMs_(expiraEm),
      _ultimoUsoMs:s2611A4DataMs_(r[idx.ULTIMO_USO]),
      _row:offset+2
    };
  });

  const todos = itens.slice();

  if(texto){
    itens = itens.filter(x=>[
      x.nome,x.email,x.perfil,x.deviceRef,x.deviceLabel,x.origem,x.status
    ].join(' ').toLowerCase().includes(texto));
  }
  if(statusFiltro) itens = itens.filter(x=>x.status === statusFiltro);
  if(tipoFiltro === 'CONFIAVEL') itens = itens.filter(x=>x.confiavel);
  if(tipoFiltro === 'TEMPORARIA') itens = itens.filter(x=>!x.confiavel);

  itens.sort((a,b)=>(b._ultimoUsoMs||0)-(a._ultimoUsoMs||0));

  const emails = new Set();
  const devices = new Set();
  let confiaveisAtivos=0, sessoesAtivas=0, expiram24h=0;
  todos.forEach(x=>{
    if(x.email) emails.add(x.email);
    if(x.status === 'ATIVA'){
      sessoesAtivas++;
      if(x.confiavel){
        confiaveisAtivos++;
        devices.add(x.email+'|'+x.deviceRef);
      }
      if(x._expiraMs > agora && x._expiraMs <= em24h) expiram24h++;
    }
  });

  const saida = itens.map(x=>{
    const o = Object.assign({},x);
    delete o._expiraMs; delete o._ultimoUsoMs; delete o._row;
    return o;
  });

  return {
    ok:true,
    fase:S2611A4.FASE,
    geradoEm:new Date().toISOString(),
    itens:saida,
    resumo:{
      usuarios:emails.size,
      dispositivosConfiaveisAtivos:devices.size,
      sessoesAtivas:sessoesAtivas,
      expiram24h:expiram24h,
      total:todos.length,
      filtrados:saida.length
    }
  };
}

function appRevogarDispositivoS2611A4(idSessao){
  idSessao = String(idSessao||'').trim();
  exigirPermissaoS15_('administrar',{
    acao:'REVOGAR_DISPOSITIVO',entidade:'SESSOES_USUARIO',entidadeId:idSessao
  });
  if(!idSessao) throw new Error('Sessão de referência obrigatória.');

  const sh = SpreadsheetApp.getActive().getSheetByName('SESSOES_USUARIO');
  if(!sh || sh.getLastRow()<2) throw new Error('SESSOES_USUARIO indisponível.');
  s2611A4GarantirCabecalhosSessao_(sh);

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try{
    const vals = sh.getDataRange().getValues();
    const h=vals[0].map(String), idx={}; h.forEach((x,i)=>idx[x]=i);
    let ref = null;
    for(let i=1;i<vals.length;i++){
      if(String(vals[i][idx.ID_SESSAO]||'') === idSessao){
        ref = {email:normalizarEmailS14_(vals[i][idx.EMAIL]),deviceId:String(vals[i][idx.DEVICE_ID]||'')};
        break;
      }
    }
    if(!ref) throw new Error('Sessão não encontrada.');

    let n=0;
    const agora = new Date();
    for(let i=1;i<vals.length;i++){
      if(normalizarEmailS14_(vals[i][idx.EMAIL]) !== ref.email) continue;
      // Sessões antigas podem não ter DEVICE_ID. Nesse caso revoga somente
      // a sessão escolhida, evitando encerrar várias sessões sem identificação.
      if(ref.deviceId){
        if(String(vals[i][idx.DEVICE_ID]||'') !== ref.deviceId) continue;
      }else{
        if(String(vals[i][idx.ID_SESSAO]||'') !== idSessao) continue;
      }
      if(String(vals[i][idx.STATUS]||'').toUpperCase() !== 'ATIVA') continue;
      sh.getRange(i+1,idx.STATUS+1).setValue('REVOGADA_ADMIN');
      sh.getRange(i+1,idx.ENCERRADO_EM+1).setValue(agora);
      n++;
    }

    registrarAuditoriaS15_({
      acao:'DISPOSITIVO_REVOGADO',entidade:'USUARIO',entidadeId:ref.email,
      resultado:'SUCESSO',origem:'WEB_APP',
      detalhes:{deviceRef:s2611A4DeviceRef_(ref.deviceId),quantidadeSessoes:n}
    });

    SpreadsheetApp.flush();
    return {ok:true,fase:S2611A4.FASE,email:ref.email,deviceRef:s2611A4DeviceRef_(ref.deviceId),quantidade:n};
  }finally{
    lock.releaseLock();
  }
}

function appRevogarTodasSessoesUsuarioS2611A4(email){
  email = normalizarEmailS14_(email);
  exigirPermissaoS15_('administrar',{
    acao:'REVOGAR_TODAS_SESSOES_USUARIO',entidade:'USUARIO',entidadeId:email
  });
  if(!email) throw new Error('E-mail obrigatório.');

  const sh = SpreadsheetApp.getActive().getSheetByName('SESSOES_USUARIO');
  if(!sh || sh.getLastRow()<2) return {ok:true,fase:S2611A4.FASE,email:email,quantidade:0};
  s2611A4GarantirCabecalhosSessao_(sh);

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try{
    const vals = sh.getDataRange().getValues();
    const h=vals[0].map(String), idx={}; h.forEach((x,i)=>idx[x]=i);
    let n=0;
    const agora = new Date();
    for(let i=1;i<vals.length;i++){
      if(normalizarEmailS14_(vals[i][idx.EMAIL]) !== email) continue;
      if(String(vals[i][idx.STATUS]||'').toUpperCase() !== 'ATIVA') continue;
      sh.getRange(i+1,idx.STATUS+1).setValue('REVOGADA_ADMIN_USUARIO');
      sh.getRange(i+1,idx.ENCERRADO_EM+1).setValue(agora);
      n++;
    }

    registrarAuditoriaS15_({
      acao:'TODAS_SESSOES_USUARIO_REVOGADAS',entidade:'USUARIO',entidadeId:email,
      resultado:'SUCESSO',origem:'WEB_APP',detalhes:{quantidade:n}
    });

    SpreadsheetApp.flush();
    return {ok:true,fase:S2611A4.FASE,email:email,quantidade:n};
  }finally{
    lock.releaseLock();
  }
}

function diagnosticoS2611A4(){
  const ss = SpreadsheetApp.getActive();
  const cfg = lerConfigComoObjeto_(ss);
  const sh = ss.getSheetByName('SESSOES_USUARIO');
  const checks=[];
  const add=(nome,ok,detalhe)=>checks.push({nome:nome,ok:!!ok,detalhe:String(detalhe||'')});

  let hasDeviceLabel=false;
  if(sh){
    const h=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(String);
    hasDeviceLabel=h.includes('DEVICE_LABEL');
  }

  add('S2611A4_CONFIG_STATUS',cfg.S2611A4_STATUS===S2611A4.STATUS,cfg.S2611A4_STATUS||'ausente');
  add('S2611A4_ABA_SESSOES',!!sh,'SESSOES_USUARIO');
  add('S2611A4_DEVICE_LABEL',hasDeviceLabel,hasDeviceLabel?'DEVICE_LABEL':'ausente');
  add('S2611A4_LISTAR',typeof appListarAcessosDispositivosS2611A4==='function','appListarAcessosDispositivosS2611A4');
  add('S2611A4_REVOGAR_DISPOSITIVO',typeof appRevogarDispositivoS2611A4==='function','appRevogarDispositivoS2611A4');
  add('S2611A4_REVOGAR_USUARIO',typeof appRevogarTodasSessoesUsuarioS2611A4==='function','appRevogarTodasSessoesUsuarioS2611A4');
  add('S2611A4_BASE_A2',typeof appValidarSessaoMallS2611A2==='function','S26.11-A2');
  add('S2611A4_BASE_S14',typeof appListarUsuariosS14==='function' && typeof exigirPermissaoS15_==='function','S14/S15');

  const falhas=checks.filter(x=>!x.ok).length;
  return {
    ok:falhas===0,
    gate:falhas===0?'APTO_PARA_TESTE_UI':'BLOQUEADO',
    fase:S2611A4.FASE,
    checks:checks,
    falhas:falhas
  };
}

function testeContratosAcessosDispositivosS2611A4(){
  const d=diagnosticoS2611A4();
  console.log('[S26.11-A4][CONTRATOS] '+JSON.stringify(d));
  return d;
}


function testeLeituraAcessosDispositivosS2611A4(){
  const r=appListarAcessosDispositivosS2611A4({});
  const amostra=(r.itens||[])[0]||{};
  const checks=[];
  const add=(nome,ok,detalhe)=>checks.push({nome:nome,ok:!!ok,detalhe:String(detalhe||'')});
  add('S2611A4_LEITURA_OK',r&&r.ok===true,`itens=${(r.itens||[]).length}`);
  add('S2611A4_NAO_EXPOE_TOKEN_HASH',!Object.prototype.hasOwnProperty.call(amostra,'TOKEN_HASH')&&!Object.prototype.hasOwnProperty.call(amostra,'tokenHash'),'sem TOKEN_HASH');
  add('S2611A4_NAO_EXPOE_DEVICE_ID',!Object.prototype.hasOwnProperty.call(amostra,'DEVICE_ID')&&!Object.prototype.hasOwnProperty.call(amostra,'deviceId'),'somente deviceRef');
  add('S2611A4_RESUMO',!!r.resumo,JSON.stringify(r.resumo||{}));
  const falhas=checks.filter(x=>!x.ok).length;
  const out={ok:falhas===0,gate:falhas===0?'APTO_PARA_TESTE_UI':'BLOQUEADO',fase:S2611A4.FASE,checks:checks,falhas:falhas,resumo:r.resumo||{}};
  console.log('[S26.11-A4][LEITURA] '+JSON.stringify(out));
  return out;
}

function mostrarDiagnosticoS2611A4(){
  const d=diagnosticoS2611A4();
  SpreadsheetApp.getUi().alert(
    'Diagnóstico S26.11-A4',
    `${d.ok?'APTO PARA TESTE UI':'BLOQUEADO'}\n\n`+
    d.checks.map(c=>`${c.ok?'✅':'❌'} ${c.nome}: ${c.detalhe}`).join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return d;
}
