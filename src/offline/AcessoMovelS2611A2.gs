// ========================================================
// S26.11-A2 — ACESSO MÓVEL / DISPOSITIVO CONFIÁVEL
// Sessão PIN persistente, vinculada ao DEVICE_ID, sem armazenar PIN.
// Não promove APP_VERSAO / APP_FASE.
// ========================================================
const S2611A2 = Object.freeze({
  FASE: 'S26.11-A2',
  STATUS: 'INSTALADO',
  DIAS_DISPOSITIVO_CONFIAVEL: 7,
  MAX_SESSOES_CONFIAVEIS_USUARIO: 3,
  ORIGEM: 'PIN_DISPOSITIVO_CONFIAVEL'
});

function setupS2611A2(){
  const ss = SpreadsheetApp.getActive();
  const cfg = ss.getSheetByName('CONFIG');
  const usuarios = ss.getSheetByName('USUARIOS');
  const sessoes = ss.getSheetByName('SESSOES_USUARIO');
  if(!cfg) throw new Error('CONFIG ausente.');
  if(!usuarios) throw new Error('USUARIOS ausente.');
  if(!sessoes) throw new Error('SESSOES_USUARIO ausente. Execute setupS223() antes.');

  setConfigValue_(cfg,'S2611A2_STATUS',S2611A2.STATUS,'Acesso móvel com dispositivo confiável');
  setConfigValue_(cfg,'S2611A2_TRUSTED_DAYS',S2611A2.DIAS_DISPOSITIVO_CONFIAVEL,'Validade máxima da sessão persistente em dias');
  setConfigValue_(cfg,'S2611A2_MAX_TRUSTED_SESSIONS',S2611A2.MAX_SESSOES_CONFIAVEIS_USUARIO,'Máximo de dispositivos confiáveis por usuário');
  setConfigValue_(cfg,'S2611A2_INSTALADO_EM',
    Utilities.formatDate(new Date(), APP.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    'Data/hora da instalação S26.11-A2'
  );

  try{
    registrarAuditoriaS15_({
      acao:'SETUP_S2611A2',entidade:'SISTEMA',entidadeId:S2611A2.FASE,
      resultado:'SUCESSO',origem:'APPS_SCRIPT',
      detalhes:{dias:S2611A2.DIAS_DISPOSITIVO_CONFIAVEL,maxDispositivos:S2611A2.MAX_SESSOES_CONFIAVEIS_USUARIO}
    });
  }catch(_){}

  SpreadsheetApp.flush();
  return diagnosticoS2611A2();
}

function appLoginMallS2611A2(payload){
  payload = payload || {};
  const confiar = payload.confiarDispositivo === true || String(payload.confiarDispositivo).toLowerCase() === 'true';
  const deviceId = String(payload.deviceId || '').trim().slice(0,150);

  if(confiar && !deviceId){
    throw new Error('Não foi possível identificar este dispositivo. Desmarque “Manter acesso” e tente novamente.');
  }

  // Reutiliza integralmente as validações S22.3: usuário ativo, PIN hash/salt,
  // bloqueio por tentativas, auditoria e token criptograficamente aleatório.
  const resp = appLoginMallS223({
    email: payload.email,
    pin: payload.pin,
    deviceId: deviceId
  });

  if(!confiar){
    return Object.assign({}, resp, {persistente:false, fase:S2611A2.FASE});
  }

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('SESSOES_USUARIO');
  if(!sh || sh.getLastRow() < 2) throw new Error('SESSOES_USUARIO indisponível.');

  const vals = sh.getDataRange().getValues();
  const h = vals[0].map(String), idx = {};
  h.forEach((x,i)=>idx[x]=i);
  const hash = hashTokenS223_(resp.token);
  const agora = new Date();
  const expira = new Date(agora.getTime() + S2611A2.DIAS_DISPOSITIVO_CONFIAVEL * 86400000);
  let rowAtual = 0;

  for(let i=1;i<vals.length;i++){
    if(String(vals[i][idx.TOKEN_HASH] || '') === hash){
      rowAtual = i + 1;
      break;
    }
  }
  if(!rowAtual) throw new Error('Sessão criada, mas não localizada para persistência.');

  sh.getRange(rowAtual, idx.EXPIRA_EM + 1).setValue(expira);
  sh.getRange(rowAtual, idx.ULTIMO_USO + 1).setValue(agora);
  sh.getRange(rowAtual, idx.ORIGEM + 1).setValue(S2611A2.ORIGEM);
  if(idx.DEVICE_LABEL >= 0){
    sh.getRange(rowAtual, idx.DEVICE_LABEL + 1).setValue(String(payload.deviceLabel || '').trim().slice(0,120));
  }

  // Evita acumular sessões antigas do mesmo dispositivo.
  for(let i=1;i<vals.length;i++){
    const row = i + 1;
    if(row === rowAtual) continue;
    if(normalizarEmailS14_(vals[i][idx.EMAIL]) !== normalizarEmailS14_(resp.usuario.email)) continue;
    if(String(vals[i][idx.STATUS] || '') !== 'ATIVA') continue;
    if(String(vals[i][idx.DEVICE_ID] || '') !== deviceId) continue;
    if(String(vals[i][idx.ORIGEM] || '') !== S2611A2.ORIGEM) continue;
    sh.getRange(row, idx.STATUS + 1).setValue('REVOGADA');
    sh.getRange(row, idx.ENCERRADO_EM + 1).setValue(agora);
  }

  limitarSessoesConfiaveisS2611A2_(resp.usuario.email, rowAtual);

  try{
    registrarAuditoriaS15_({
      acao:'DISPOSITIVO_CONFIAVEL_AUTORIZADO',entidade:'USUARIO',entidadeId:resp.usuario.email,
      resultado:'SUCESSO',origem:'WEB_APP',deviceId:deviceId,
      detalhes:{expiraEm:expira.toISOString(),dias:S2611A2.DIAS_DISPOSITIVO_CONFIAVEL}
    });
  }catch(_){}

  SpreadsheetApp.flush();
  return Object.assign({}, resp, {
    expiraEm: expira.toISOString(),
    persistente: true,
    dispositivoConfiavel: true,
    fase: S2611A2.FASE
  });
}

function limitarSessoesConfiaveisS2611A2_(email, preservarRow){
  const sh = SpreadsheetApp.getActive().getSheetByName('SESSOES_USUARIO');
  if(!sh || sh.getLastRow() < 2) return 0;
  const vals = sh.getDataRange().getValues();
  const h = vals[0].map(String), idx = {};
  h.forEach((x,i)=>idx[x]=i);
  const alvo = normalizarEmailS14_(email);
  const ativas = [];

  for(let i=1;i<vals.length;i++){
    if(normalizarEmailS14_(vals[i][idx.EMAIL]) !== alvo) continue;
    if(String(vals[i][idx.STATUS] || '') !== 'ATIVA') continue;
    if(String(vals[i][idx.ORIGEM] || '') !== S2611A2.ORIGEM) continue;
    const criado = vals[i][idx.CRIADO_EM] instanceof Date ? vals[i][idx.CRIADO_EM] : new Date(vals[i][idx.CRIADO_EM] || 0);
    ativas.push({row:i+1, criado:isNaN(criado)?new Date(0):criado});
  }

  ativas.sort((a,b)=>b.criado-a.criado);
  const manter = new Set(ativas.slice(0,S2611A2.MAX_SESSOES_CONFIAVEIS_USUARIO).map(x=>x.row));
  if(preservarRow) manter.add(Number(preservarRow));
  let revogadas = 0;
  const agora = new Date();
  ativas.forEach(x=>{
    if(manter.has(x.row)) return;
    sh.getRange(x.row, idx.STATUS + 1).setValue('REVOGADA_LIMITE');
    sh.getRange(x.row, idx.ENCERRADO_EM + 1).setValue(agora);
    revogadas++;
  });
  return revogadas;
}

function appValidarSessaoMallS2611A2(payload){
  payload = payload || {};
  const token = String(payload.token || '');
  const deviceId = String(payload.deviceId || '').slice(0,150);
  const v = validarSessaoMallS223_(token, deviceId);
  if(!v) return {ok:false, fase:S2611A2.FASE};

  let persistente = false, origem = 'PIN';
  try{
    const sh = SpreadsheetApp.getActive().getSheetByName('SESSOES_USUARIO');
    const vals = sh.getDataRange().getValues();
    const h = vals[0].map(String), idx = {};
    h.forEach((x,i)=>idx[x]=i);
    const hash = hashTokenS223_(token);
    for(let i=1;i<vals.length;i++){
      if(String(vals[i][idx.TOKEN_HASH] || '') !== hash) continue;
      origem = String(vals[i][idx.ORIGEM] || 'PIN');
      persistente = origem === S2611A2.ORIGEM;
      if(idx.DEVICE_LABEL >= 0 && payload.deviceLabel){
        sh.getRange(i + 1, idx.DEVICE_LABEL + 1).setValue(String(payload.deviceLabel || '').trim().slice(0,120));
      }
      break;
    }
  }catch(_){}

  return {
    ok:true,
    usuario:v.usuario,
    expiraEm:v.expiraEm,
    persistente:persistente,
    dispositivoConfiavel:persistente,
    origem:origem,
    fase:S2611A2.FASE
  };
}

function diagnosticoS2611A2(){
  const ss = SpreadsheetApp.getActive();
  const cfg = lerConfigComoObjeto_(ss);
  const checks = [];
  const add=(nome,ok,detalhe)=>checks.push({nome,ok:!!ok,detalhe:String(detalhe||'')});

  add('S2611A2_CONFIG_STATUS', cfg.S2611A2_STATUS === S2611A2.STATUS, cfg.S2611A2_STATUS || 'ausente');
  add('S2611A2_ABA_USUARIOS', !!ss.getSheetByName('USUARIOS'), 'USUARIOS');
  add('S2611A2_ABA_SESSOES', !!ss.getSheetByName('SESSOES_USUARIO'), 'SESSOES_USUARIO');
  add('S2611A2_LOGIN', typeof appLoginMallS2611A2 === 'function', 'appLoginMallS2611A2');
  add('S2611A2_VALIDAR', typeof appValidarSessaoMallS2611A2 === 'function', 'appValidarSessaoMallS2611A2');
  add('S2611A2_BASE_S223', typeof appLoginMallS223 === 'function' && typeof validarSessaoMallS223_ === 'function', 'S22.3');

  const falhas = checks.filter(x=>!x.ok).length;
  return {
    ok: falhas === 0,
    gate: falhas === 0 ? 'APTO_PARA_TESTE_UI' : 'BLOQUEADO',
    fase: S2611A2.FASE,
    persistenciaDias: S2611A2.DIAS_DISPOSITIVO_CONFIAVEL,
    maxDispositivos: S2611A2.MAX_SESSOES_CONFIAVEIS_USUARIO,
    checks: checks,
    falhas: falhas
  };
}

function testeContratosAcessoMovelS2611A2(){
  const d = diagnosticoS2611A2();
  console.log('[S26.11-A2][CONTRATOS] ' + JSON.stringify(d));
  return d;
}

function mostrarDiagnosticoS2611A2(){
  const d = diagnosticoS2611A2();
  SpreadsheetApp.getUi().alert(
    'Diagnóstico S26.11-A2',
    `${d.ok ? 'APTO PARA TESTE UI' : 'BLOQUEADO'}\n\n` +
    d.checks.map(c=>`${c.ok?'✅':'❌'} ${c.nome}: ${c.detalhe}`).join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  return d;
}
