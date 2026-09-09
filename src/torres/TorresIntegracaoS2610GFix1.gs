/**
 * S26.10-G1 FIX1 — movimentação em plantas compostas sem mistura de coordenadas.
 *
 * Motivo:
 * - S18 permitia selecionar um ponto em uma área lógica do Nível 1;
 * - o <select> de mapas não continha o mapa lógico resolvido;
 * - X/Y da planta composta podiam ser persistidos junto a um ID_MAPA_SETOR antigo;
 * - a projeção do Nível 1 aplicava a transformação novamente e deslocava/sumia o pin.
 *
 * Este arquivo oferece diagnóstico e correção CONTROLADA. O histórico anterior não é
 * alterado: a correção registra um novo evento MOVIMENTACAO pela API oficial S18.
 */

const S2610G1_FIX1 = Object.freeze({
  FASE: 'S26.10-G1-FIX1.3',
  NIVEL_N1: 'PLA-CFF-N1-2025',
  PROTOCOLO_ALVO_PADRAO: 'SIG-20260824-0020'
});

function diagnosticoMovimentacaoNivelS2610G1Fix1(protocolo) {
  exigirPermissaoS14_('administrar');
  const ss = SpreadsheetApp.getActive();
  const p = String(protocolo || S2610G1_FIX1.PROTOCOLO_ALVO_PADRAO).trim();
  const shR = ss.getSheetByName('REGISTROS');
  const shC = ss.getSheetByName('CICLO_VIDA_ATIVO');
  if (!shR) throw new Error('REGISTROS ausente.');
  if (!shC) throw new Error('CICLO_VIDA_ATIVO ausente.');

  const regs = s240Objects_(shR);
  const reg = regs.find(function(r){ return String(r.PROTOCOLO || '').trim() === p; });
  if (!reg) throw new Error('Protocolo não encontrado: ' + p);

  const eventos = s240Objects_(shC).filter(function(e){
    return String(e.ID_REGISTRO || '') === String(reg.ID_REGISTRO || '') &&
      ['MOVIMENTACAO','REINSTALACAO'].includes(String(e.TIPO_EVENTO || '').toUpperCase());
  });
  const ev = eventos.length ? eventos[eventos.length - 1] : null;
  if (!ev) throw new Error('Nenhuma movimentação/reinstalação encontrada para ' + p + '.');

  const xBaseEvento = s2610G1Fix1Numero_(ev.X_NOVO);
  const yBaseEvento = s2610G1Fix1Numero_(ev.Y_NOVO);
  // FIX1.2 — campos de nível não existiam no histórico S18 legado.
  // Campo ausente/vazio NÃO pode virar zero: 0 é coordenada válida.
  const xNivelExplicito = s2610G1Fix1Numero_(ev.X_NIVEL_NOVO);
  const yNivelExplicito = s2610G1Fix1Numero_(ev.Y_NIVEL_NOVO);
  const xNivelEvento = Number.isFinite(xNivelExplicito) ? xNivelExplicito : xBaseEvento;
  const yNivelEvento = Number.isFinite(yNivelExplicito) ? yNivelExplicito : yBaseEvento;
  const fonteCoordenadaNivel = Number.isFinite(xNivelExplicito) && Number.isFinite(yNivelExplicito)
    ? 'CAMPOS_NIVEL_EXPLICITOS'
    : 'X_NOVO_Y_NOVO_LEGADO';
  if (!Number.isFinite(xNivelEvento) || !Number.isFinite(yNivelEvento)) {
    throw new Error('Último evento não possui coordenada de nível válida.');
  }

  const destino = s2610G1Fix1ResolverDestinoN1_(xNivelEvento, yNivelEvento);
  let noNivel = null;
  try {
    const lista = appListarRegistrosNivelS242(S2610G1_FIX1.NIVEL_N1) || [];
    noNivel = lista.find(function(r){
      return String(r.idRegistro || '') === String(reg.ID_REGISTRO || '') || String(r.protocolo || '') === p;
    }) || null;
  } catch (_) { noNivel = null; }

  const atual = {
    idRegistro: String(reg.ID_REGISTRO || ''),
    protocolo: p,
    idMapaSetor: String(reg.ID_MAPA_SETOR || ''),
    mapa: String(reg.MAPA || ''),
    piso: String(reg.PISO || ''),
    x: s2610G1Fix1Numero_(reg.X_NORMALIZADO),
    y: s2610G1Fix1Numero_(reg.Y_NORMALIZADO),
    rua: String(reg.RUA || ''),
    trecho: String(reg.TRECHO || ''),
    referencia: String(reg.REFERENCIA || ''),
    idPlantaNivel: String(reg.ID_PLANTA_NIVEL || ''),
    xNivel: s2610G1Fix1NumeroOuNull_(reg.X_NIVEL),
    yNivel: s2610G1Fix1NumeroOuNull_(reg.Y_NIVEL),
    idTorre: String(reg.ID_TORRE || ''),
    codigoTorre: String(reg.CODIGO_TORRE || ''),
    nomeTorre: String(reg.NOME_TORRE || '')
  };

  const ultimoEvento = {
    idEvento: String(ev.ID_EVENTO_CICLO || ''),
    dataHora: s243ValorRpcSeguro_(ev.DATA_HORA),
    tipo: String(ev.TIPO_EVENTO || ''),
    idMapaAnterior: String(ev.ID_MAPA_ANTERIOR || ''),
    xAnterior: s2610G1Fix1NumeroOuNull_(ev.X_ANTERIOR),
    yAnterior: s2610G1Fix1NumeroOuNull_(ev.Y_ANTERIOR),
    idMapaNovo: String(ev.ID_MAPA_NOVO || ''),
    mapaNovo: String(ev.MAPA_NOVO || ''),
    ruaNovo: String(ev.RUA_NOVO || ''),
    trechoNovo: String(ev.TRECHO_NOVO || ''),
    xNovo: xBaseEvento,
    yNovo: yBaseEvento,
    xNivelNovo: xNivelEvento,
    yNivelNovo: yNivelEvento,
    motivo: String(ev.MOTIVO || '')
  };

  const mismatchMapa = atual.idMapaSetor !== destino.idMapaSetor;
  const mismatchXY = !s2610G1Fix1QuaseIgual_(atual.x, destino.x) || !s2610G1Fix1QuaseIgual_(atual.y, destino.y);
  const mismatchNivel = atual.idPlantaNivel !== destino.idPlantaNivel ||
    !s2610G1Fix1QuaseIgual_(atual.xNivel, destino.xNivel) || !s2610G1Fix1QuaseIgual_(atual.yNivel, destino.yNivel);
  const mismatchTorre = String(atual.idTorre || '') !== String(destino.idTorre || '');

  // FIX1.3 — o gate deve refletir somente o ESTADO ATUAL.
  // O evento corretivo registra no MOTIVO a expressão "mistura de coordenadas" por auditoria;
  // isso é evidência histórica e não pode manter o registro eternamente bloqueado.
  const mismatchProjecao = !!noNivel && (
    !s2610G1Fix1QuaseIgual_(Number(noNivel.x), destino.xNivel) ||
    !s2610G1Fix1QuaseIgual_(Number(noNivel.y), destino.yNivel) ||
    String(noNivel.mapaOrigem || '') !== String(destino.idMapaSetor || '') ||
    String(noNivel.nivelDestino || '') !== String(destino.idPlantaNivel || '')
  );
  const correcaoNecessaria = mismatchMapa || mismatchXY || mismatchNivel || mismatchTorre || mismatchProjecao;
  const evidenciaHistoricaMisturaEspacos = /mistura de coordenadas|setor\/planta composta/i.test(String(ev.MOTIVO || ''));
  const misturaEspacosProvavel = correcaoNecessaria;

  const out = {
    ok: true,
    gate: correcaoNecessaria ? 'CORRECAO_CONTROLADA_NECESSARIA' : 'SEM_CORRECAO_NECESSARIA',
    fase: S2610G1_FIX1.FASE,
    atual: atual,
    ultimoEvento: ultimoEvento,
    destinoResolvido: destino,
    projecaoAtualNoNivel: noNivel ? {
      presente: true,
      x: Number(noNivel.x), y: Number(noNivel.y),
      mapaOrigem: String(noNivel.mapaOrigem || ''),
      nivelDestino: String(noNivel.nivelDestino || '')
    } : { presente: false },
    evidencias: {
      mismatchMapa: mismatchMapa,
      mismatchXY: mismatchXY,
      mismatchNivel: mismatchNivel,
      mismatchTorre: mismatchTorre,
      mismatchProjecao: mismatchProjecao,
      correcaoNecessaria: correcaoNecessaria,
      misturaEspacosProvavel: misturaEspacosProvavel,
      evidenciaHistoricaMisturaEspacos: evidenciaHistoricaMisturaEspacos
    },
    somenteLeitura: true
  };
  console.log('[S26.10-G1-FIX1][DIAGNOSTICO] ' + JSON.stringify(out));
  return out;
}

function mostrarDiagnosticoMovimentacaoNivelS2610G1Fix1() {
  const d = diagnosticoMovimentacaoNivelS2610G1Fix1(S2610G1_FIX1.PROTOCOLO_ALVO_PADRAO);
  console.log('[S26.10-G1-FIX1][RESULTADO] gate=' + d.gate + '; protocolo=' + d.atual.protocolo + '; mapaAtual=' + d.atual.idMapaSetor + '; mapaEsperado=' + d.destinoResolvido.idMapaSetor);
  return d;
}

/**
 * CORREÇÃO CONTROLADA.
 * Preserva o evento defeituoso e registra uma NOVA MOVIMENTAÇÃO pela API S18.
 * Exige confirmação literal CORRIGIR.
 */
function corrigirMovimentacaoNivelS2610G1Fix1(protocolo, confirmacao) {
  exigirPermissaoS14_('administrar');
  if (String(confirmacao || '').trim().toUpperCase() !== 'CORRIGIR') {
    throw new Error('Confirmação inválida. Informe CORRIGIR.');
  }

  const d = diagnosticoMovimentacaoNivelS2610G1Fix1(protocolo);
  if (d.gate === 'SEM_CORRECAO_NECESSARIA') {
    return { ok:true, idempotente:true, gate:'JA_CORRIGIDO', fase:S2610G1_FIX1.FASE, diagnostico:d };
  }

  const dest = d.destinoResolvido;
  if (!dest || !dest.ok) throw new Error('Destino de correção não resolvido.');

  const resp = appRegistrarEventoCicloS18({
    idRegistro: d.atual.idRegistro,
    tipoEvento: 'MOVIMENTACAO',
    idMapaSetor: dest.idMapaSetor,
    mapa: dest.mapa,
    piso: dest.piso,
    rua: dest.rua,
    trecho: dest.trecho,
    idCorredor: dest.idCorredor,
    idSegmento: dest.idSegmento,
    cruzamento: dest.cruzamento,
    referencia: dest.referencia,
    numeroLoja: dest.numeroLoja,
    luc: dest.luc,
    nomeLoja: dest.nomeLoja,
    x: dest.x,
    y: dest.y,
    idPlantaNivel: dest.idPlantaNivel,
    xNivel: dest.xNivel,
    yNivel: dest.yNivel,
    idTorre: dest.idTorre,
    codigoTorre: dest.codigoTorre,
    nomeTorre: dest.nomeTorre,
    idRepresentacaoTorre: dest.idRepresentacaoTorre,
    versaoGeometriaTorre: dest.versaoGeometriaTorre,
    origemTorre: dest.origemTorre,
    motivo: 'Correção técnica S26.10-G1 FIX1 — mistura de coordenadas setor/planta composta no evento ' + d.ultimoEvento.idEvento,
    observacao: 'Evento anterior preservado para auditoria. Coordenadas do Nível 1 reinterpretadas no mapa lógico/setor correto.',
    responsavel: '' + (d.atual.responsavel || ''),
    deviceId: 'S2610G1-FIX1'
  });

  SpreadsheetApp.flush();
  const depois = diagnosticoMovimentacaoNivelS2610G1Fix1(protocolo);
  const out = {
    ok: depois.gate === 'SEM_CORRECAO_NECESSARIA',
    gate: depois.gate === 'SEM_CORRECAO_NECESSARIA' ? 'APTO_PARA_APROVACAO' : 'BLOQUEADO',
    fase: S2610G1_FIX1.FASE,
    eventoCorrecao: resp,
    antes: d,
    depois: depois
  };
  console.log('[S26.10-G1-FIX1][CORRECAO] ' + JSON.stringify(out));
  return out;
}

function testeContratosMovimentacaoNivelS2610G1Fix1() {
  const checks = [];
  const add = function(nome,ok,detalhe){ checks.push({nome:nome,ok:!!ok,detalhe:String(detalhe||'')}); };
  const d = diagnosticoMovimentacaoNivelS2610G1Fix1(S2610G1_FIX1.PROTOCOLO_ALVO_PADRAO);
  add('S2610G1F1_REGISTRO_ENCONTRADO', !!d.atual.idRegistro, d.atual.idRegistro);
  add('S2610G1F1_EVENTO_ENCONTRADO', !!d.ultimoEvento.idEvento, d.ultimoEvento.idEvento);
  add('S2610G1F1_DESTINO_N1_RESOLVIDO', !!d.destinoResolvido.ok && d.destinoResolvido.idPlantaNivel===S2610G1_FIX1.NIVEL_N1, d.destinoResolvido.idMapaSetor);
  add('S2610G1F1_NAO_MUTA_DIAGNOSTICO', d.somenteLeitura===true, 'somente leitura');
  const falhas = checks.filter(function(c){return !c.ok;}).length;
  const out = {ok:falhas===0,gate:falhas===0?'APTO_PARA_CORRECAO_CONTROLADA':'BLOQUEADO',fase:S2610G1_FIX1.FASE,checks:checks,falhas:falhas,diagnostico:d};
  console.log('[S26.10-G1-FIX1][CONTRATOS] ' + JSON.stringify(out));
  return out;
}

function s2610G1Fix1ResolverDestinoN1_(xNivel, yNivel) {
  let r = null;
  let fonteResolver = 'APP_RESOLVER_PONTO_N1_S246';
  let erroResolverPrincipal = '';

  try {
    r = appResolverPontoNivel1S246({x:xNivel,y:yNivel});
  } catch (e) {
    erroResolverPrincipal = String(e && e.message || e || '');
    r = null;
  }

  // FIX1.1 — fallback geométrico estritamente controlado.
  // O S246 é o resolvedor preferencial. Porém, em dados legados/movimentações
  // já contaminadas, o ponto composto pode não ser reconhecido por ele mesmo
  // estando dentro de uma área VALIDADA em MAPA_AREAS_NIVEL.
  // Nesse caso consultamos diretamente as geometrias publicadas/validadas do N1,
  // sem gravar nada e sem escolher silenciosamente entre áreas de mesma prioridade.
  if (!r || !r.ok) {
    const fallback = s2610G1Fix1ResolverAreaDiretaN1_(xNivel, yNivel);
    if (fallback && fallback.ok) {
      r = fallback;
      fonteResolver = 'MAPA_AREAS_NIVEL_FALLBACK_GEOMETRIA';
    }
  }

  if (!r || !r.ok) {
    throw new Error(
      'O último ponto não é resolvido pela cartografia operacional N1. ' +
      'xNivel=' + xNivel + '; yNivel=' + yNivel +
      (erroResolverPrincipal ? '; erroS246=' + erroResolverPrincipal : '')
    );
  }

  let local = null;
  let xPersist = Number(r.xSetor);
  let yPersist = Number(r.ySetor);
  let mapaNome = '';
  let rua = '', trecho = '', referencia = '';
  let idCorredor='', idSegmento='', cruzamento='', numeroLoja='', luc='', nomeLoja='';

  if (r.tipo === 'SETOR_CALIBRADO') {
    try { local = appPrepararLocalizacaoS3({idMapaSetor:r.idMapaSetor,x:xPersist,y:yPersist}); } catch (_) { local=null; }
    mapaNome = local ? String(local.mapa || '') : s2610G1Fix1NomeMapa_(r.idMapaSetor);
    rua = local ? String(local.rua || '') : '';
    trecho = local ? String(local.trecho || '') : '';
    referencia = local ? String(local.referencia || '') : '';
    idCorredor = local ? String(local.idCorredor || '') : '';
    idSegmento = local ? String(local.idSegmento || '') : '';
    cruzamento = local ? String(local.cruzamento || '') : '';
    numeroLoja = local ? String(local.numeroLoja || '') : '';
    luc = local ? String(local.luc || '') : '';
    nomeLoja = local ? String(local.nomeLoja || '') : '';
  } else {
    mapaNome = String(r.areaNome || s2610G1Fix1NomeMapa_(r.idMapaSetor));
    rua = String(r.areaNome || 'Área do Nível 1');
    trecho = 'Nível 1';
    referencia = String(r.areaFisicaNome || r.subareaFisicaNome || r.areaNome || '');
    // Áreas nativas do nível persistem a própria coordenada da planta composta.
    xPersist = Number(xNivel);
    yPersist = Number(yNivel);
  }

  let torre = null;
  try { torre = appResolverTorreS2610D({idPlantaNivel:S2610G1_FIX1.NIVEL_N1,x:xNivel,y:yNivel}); } catch (_) { torre=null; }

  return {
    ok:true,
    tipoResolucao:String(r.tipo || ''),
    fonteResolver:fonteResolver,
    idMapaSetor:String(r.idMapaSetor || ''),
    mapa:mapaNome,
    piso:String(r.piso || '1'),
    x:xPersist,
    y:yPersist,
    rua:rua,
    trecho:trecho,
    idCorredor:idCorredor,
    idSegmento:idSegmento,
    cruzamento:cruzamento,
    referencia:referencia,
    numeroLoja:numeroLoja,
    luc:luc,
    nomeLoja:nomeLoja,
    idPlantaNivel:S2610G1_FIX1.NIVEL_N1,
    xNivel:Number(xNivel),
    yNivel:Number(yNivel),
    idTorre:torre && torre.resolvido && torre.torre ? String(torre.torre.idTorre || '') : '',
    codigoTorre:torre && torre.resolvido && torre.torre ? String(torre.torre.codigo || '') : '',
    nomeTorre:torre && torre.resolvido && torre.torre ? String(torre.torre.nome || '') : '',
    idRepresentacaoTorre:torre && torre.resolvido && torre.representacao ? String(torre.representacao.idRepresentacao || '') : '',
    versaoGeometriaTorre:torre && torre.resolvido && torre.representacao ? Number(torre.representacao.versaoGeometria || 0) : 0,
    origemTorre:torre && torre.resolvido ? 'SERVIDOR_PUBLICADO_CORRECAO' : '',
    areaId:String(r.areaId || ''),
    areaTipo:String(r.areaTipo || ''),
    areaNome:String(r.areaNome || ''),
    candidatosFallback:Array.isArray(r.candidatosFallback) ? r.candidatosFallback : []
  };
}

function s2610G1Fix1ResolverAreaDiretaN1_(xNivel, yNivel) {
  const x = Number(xNivel), y = Number(yNivel);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('MAPA_AREAS_NIVEL');
  if (!sh) return null;

  const prioridade = {
    HOTEL: 10,
    CENTRAL_DISTRIBUICAO: 20,
    AREA_EXTERNA_LATERAL_AZUL: 30,
    AREA_EXTERNA_LATERAL_VERDE: 30,
    AREA_EXTERNA_FRENTE: 30,
    AREA_EXTERNA_HOTEL_CDM: 30,
    AREA_EXTERNA: 90
  };

  const candidatos = [];
  s240Objects_(sh).forEach(function(row){
    if (String(row.ID_PLANTA_NIVEL || '') !== S2610G1_FIX1.NIVEL_N1) return;
    if (String(row.STATUS || '').toUpperCase() !== 'VALIDADA') return;

    let pol = [];
    try { pol = JSON.parse(String(row.POLIGONO_JSON || '[]')); } catch (_) { pol = []; }
    if (!Array.isArray(pol) || pol.length < 3) return;
    if (!s243PontoNoPoligono_(x, y, pol)) return;

    const tipo = String(row.TIPO_AREA || '').toUpperCase();
    candidatos.push({
      row: row,
      tipo: tipo,
      prioridade: Object.prototype.hasOwnProperty.call(prioridade, tipo) ? prioridade[tipo] : 70,
      areaPoligono: s2610G1Fix1AreaPoligono_(pol)
    });
  });

  if (!candidatos.length) return null;

  candidatos.sort(function(a,b){
    if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
    return a.areaPoligono - b.areaPoligono;
  });

  const melhor = candidatos[0];
  const empatados = candidatos.filter(function(c){ return c.prioridade === melhor.prioridade; });
  if (empatados.length > 1) {
    throw new Error(
      'Ambiguidade cartográfica N1 no fallback: ' +
      empatados.map(function(c){ return String(c.row.ID_AREA || ''); }).join(', ')
    );
  }

  const row = melhor.row;
  let fis = null;
  try {
    const idx = (typeof s268D2IndexRepresentacoes_ === 'function') ? s268D2IndexRepresentacoes_() : {};
    fis = idx[String(row.ID_AREA || '')] || null;
  } catch (_) { fis = null; }

  return {
    ok:true,
    tipo:'AREA_NATIVA_NIVEL_FALLBACK_GEOMETRIA',
    idNivel:S2610G1_FIX1.NIVEL_N1,
    idMapaSetor:String(row.ID_MAPA_NATIVO || ''),
    idSetor:String(row.ID_SETOR || ''),
    piso:'1',
    xNivel:x,
    yNivel:y,
    xSetor:x,
    ySetor:y,
    areaId:String(row.ID_AREA || ''),
    areaTipo:String(row.TIPO_AREA || ''),
    areaNome:String(row.NOME || ''),
    areaFisicaId:fis ? String(fis.areaFisicaId || '') : '',
    areaFisicaNome:fis ? String(fis.areaFisicaNome || '') : '',
    areaFisicaTipo:fis ? String(fis.areaFisicaTipo || '') : '',
    subareaFisicaId:fis ? String(fis.subareaFisicaId || '') : '',
    subareaFisicaNome:fis ? String(fis.subareaFisicaNome || '') : '',
    subareaFisicaTipo:fis ? String(fis.subareaFisicaTipo || '') : '',
    candidatosFallback:candidatos.map(function(c){
      return { idArea:String(c.row.ID_AREA || ''), tipo:c.tipo, prioridade:c.prioridade };
    })
  };
}

function s2610G1Fix1AreaPoligono_(pontos) {
  if (!Array.isArray(pontos) || pontos.length < 3) return Infinity;
  let soma = 0;
  for (let i=0, j=pontos.length-1; i<pontos.length; j=i++) {
    const xi=Number(pontos[i].x), yi=Number(pontos[i].y);
    const xj=Number(pontos[j].x), yj=Number(pontos[j].y);
    if (![xi,yi,xj,yj].every(Number.isFinite)) return Infinity;
    soma += (xj * yi) - (xi * yj);
  }
  return Math.abs(soma) / 2;
}

function s2610G1Fix1NomeMapa_(idMapa) {
  const ss=SpreadsheetApp.getActive();
  const sh=ss.getSheetByName('MAPAS_SETORES');
  if(!sh)return String(idMapa||'');
  const r=s240Objects_(sh).find(function(x){return String(x.ID_MAPA_SETOR||'')===String(idMapa||'');});
  return r ? String(r.NOME_MAPA || r.NOME || r.ID_MAPA_SETOR || idMapa) : String(idMapa||'');
}
function s2610G1Fix1Numero_(v){
  if(v===null || v===undefined) return NaN;
  const s=String(v).trim();
  if(!s) return NaN;
  const n=Number(s.replace(',','.'));
  return Number.isFinite(n)?n:NaN;
}
function s2610G1Fix1NumeroOuNull_(v){
  const n=s2610G1Fix1Numero_(v);return Number.isFinite(n)?n:null;
}
function s2610G1Fix1QuaseIgual_(a,b){
  if(a===null||a===undefined||b===null||b===undefined)return a===b;
  const x=Number(a),y=Number(b);return Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x-y)<=0.000001;
}
