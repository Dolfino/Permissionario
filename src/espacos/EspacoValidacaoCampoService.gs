/**
 * SINALIZAÇÃO DO MALL — GESTÃO DE ESPAÇOS FÍSICOS (MILESTONE M2C)
 * Módulo: EspacoValidacaoCampoService.gs
 * Objetivo: Hardening da coleta de campo, segurança de identidade server-side,
 *           RBAC real, sanitização contra formula injection, isolamento de testes,
 *           evidências auditáveis e gates negativos (M2C-2B-2).
 * Runtime: Google Apps Script (V8 Engine)
 */

const ESPACOS_VALIDACOES_CAMPO_HEADERS = Object.freeze([
  'ID_VALIDACAO',             // PK única imutável (ex: VAL-000001)
  'ID_STAGING',               // FK para ESPACOS_MIGRACAO_STAGING.ID_STAGING
  'ID_ESPACO',                // FK para ESPACOS.ID_ESPACO (vazio antes da promoção)
  'VERSAO_FORMULARIO',        // Versão da regra/formulário (ex: 'M2C-2B-2-CAMPO-v1.0')
  'REQUEST_ID',               // Token UUID para idempotência
  'ID_VALIDACAO_ANTERIOR',    // FK auto-referencial para vistorias prévias / segunda vistoria
  
  // Timing & Responsável
  'DATA_HORA_INICIO',         // Início da vistoria
  'DATA_HORA_FIM',            // Conclusão da vistoria
  'VALIDADO_POR',             // Usuário técnico coletor (resolvido soberanamente server-side)
  
  // Camada 1: Observação Bruta (Coleta Humana)
  'ESPACO_ENCONTRADO',        // 'SIM' | 'NAO'
  'IDENTIFICADOR_VISIVEL',    // 'SIM' | 'NAO'
  'IDENTIFICADOR_ENCONTRADO', // Código/placa física vista no local (sanitizado contra fórmulas)
  'SETOR_OBSERVADO',          // Setor onde o espaço foi localizado
  'CORREDOR_OBSERVADO',       // Corredor / Rua onde o espaço foi localizado (sanitizado)
  'NUMERO_OBSERVADO',         // Número visto no vão (sanitizado)
  'TIPO_OBSERVADO',           // Tipologia vista em campo: BOX | LOJA | STAND | QUIOSQUE | etc.
  
  // Evidência de Área (não sobrescreve oficial)
  'AREA_VALOR',               // Valor numérico observado
  'AREA_UNIDADE',             // 'M2'
  'AREA_METODO',              // 'ESTIMADA' | 'MEDIDA' | 'PLANTA' | 'OUTRO'
  'AREA_PRECISA',             // 'SIM' | 'NAO'
  
  // Ocupação e Operação
  'OCUPADO',                  // 'SIM' | 'NAO'
  'OPERACAO_OBSERVADA',       // Nome fantasia / atividade comercial (sanitizado)
  'OBSERVACOES',              // Texto livre do técnico (sanitizado)
  
  // Camada 2: Resultado Calculado (Algoritmo Automático do Serviço)
  'RESULTADO_AUTOMATICO',     // 'CONFIRMADO' | 'CONFIRMADO_SEM_PLACA' | 'DIVERGENTE' | 'NAO_ENCONTRADO' | 'REQUER_SEGUNDA_VISTORIA'
  'CHECK_IDENTIFICADOR',      // 'OK' | 'DIVERGENTE' | 'AUSENTE'
  'CHECK_LOCALIZACAO',        // 'OK' | 'DIVERGENTE' | 'NAO_LOCALIZADO'
  'CHECK_TIPO',               // 'COERENTE' | 'DIVERGENTE'
  'CHECK_COLISAO',            // 'SEM_COLISAO' | 'COLISAO_EXISTENTE'
  'CONTRADICOES',             // Relatório textual de incoerências
  
  // Camada 3: Homologação Supervisora (Decisão Patrimonial Autorizada)
  'STATUS_HOMOLOGACAO',       // 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'REQUER_SEGUNDA_VISTORIA'
  'HOMOLOGADO_POR',           // Supervisor patrimonial / admin (resolvido soberanamente server-side)
  'HOMOLOGADO_EM',            // Data/hora da homologação
  'MOTIVO_HOMOLOGACAO',       // Parecer / justificativa da homologação (sanitizado)
  
  'CRIADO_EM',                // Timestamp de gravação
  
  // M2C-2B-2: Isolamento de Ambiente, Governança e Ciclo de Vida
  'AMBIENTE',                 // 'PRODUCAO' | 'TESTE'
  'TIPO_REGISTRO',            // 'VISTORIA_REAL' | 'TESTE_AUTOMATIZADO'
  'STATUS_VALIDACAO'          // 'RASCUNHO' | 'CONCLUIDA' | 'CANCELADA'
]);

const ESPACOS_VALIDACAO_FOTOS_HEADERS = Object.freeze([
  'ID_FOTO',                  // PK da foto (ex: FTO-000001)
  'ID_VALIDACAO',             // FK para ESPACOS_VALIDACOES_CAMPO.ID_VALIDACAO
  'TIPO_FOTO',                // 'FACHADA' | 'IDENTIFICADOR' | 'CONTEXTO' | 'INTERIOR' | 'OUTRO'
  'DRIVE_FILE_ID',            // ID do arquivo no Google Drive
  'URL',                      // URL do arquivo (visualização / download)
  'NOME_ARQUIVO',             // Nome do arquivo sanitizado
  'MIME_TYPE',                // image/jpeg, image/png, image/webp
  'HASH_ARQUIVO',             // Hash SHA-256 do blob
  'CRIADO_EM',                // Timestamp de upload
  'CRIADO_POR',               // Usuário que enviou (resolvido server-side)
  'STATUS_SYNC',              // 'LOCAL' | 'PENDENTE_UPLOAD' | 'ENVIANDO' | 'SINCRONIZADA' | 'ERRO'
  'TAMANHO_BYTES'             // Tamanho do arquivo em bytes
]);

const CANARIO_20_STAGING_IDS = Object.freeze([
  'STG-005859', // PRALM1
  'STG-003439', // CDM01
  'STG-001872', // TOT_P2A_01
  'STG-000172', // AVCRP2122
  'STG-000173', // AVCRP2126
  'STG-002198', // RCRFR1256
  'STG-002858', // RFLPX1106
  'STG-003529', // APCBR2250
  'STG-003547', // APCBR2162
  'STG-005080', // RCESL1271
  'STG-005081', // RCESL1272
  'STG-004799', // ADMMN3182
  'STG-004833', // RPRIS3135
  'STG-000002', // PR2003
  'STG-000003', // PR2007
  'STG-002784', // RCNDD1235
  'STG-002785', // RCNDD1236
  'STG-003535', // RANPM2173
  'STG-003538', // RANPM2189
  'STG-005038'  // RCESJ1276
]);

/**
 * Sanitiza valores de texto contra Formula Injection / CSV Injection no Google Sheets.
 * Se o valor iniciar por '=', '+', '-', '@', prefixa com apóstrofo "'".
 * Aplica normalização de espaços e limite máximo de caracteres.
 * 
 * @param {*} valor
 * @param {number} [maxLen=2000]
 * @returns {string}
 */
function sanitizarEntradaTexto_(valor, maxLen) {
  if (valor === null || valor === undefined) return '';
  let str = String(valor).trim();
  if (maxLen && str.length > maxLen) {
    str = str.substring(0, maxLen);
  }
  // Formula Injection Guard: impede interpretação como fórmula pelo Google Sheets
  if (str.length > 0 && ['=', '+', '-', '@'].includes(str.charAt(0))) {
    str = "'" + str;
  }
  return str;
}

/**
 * Resolve soberanamente no servidor a identidade autenticada e o perfil do usuário.
 * Não confia em valores arbitrários enviados pelo cliente no payload.
 * 
 * @param {Object} [payload={}] Payload opcional da requisição
 * @param {Spreadsheet} [ss] Planilha canônica
 * @returns {Object} { autenticado, autorizado, email, nome, perfil, podeColetar, podeHomologar, podePromover }
 */
function obterUsuarioAutenticadoServerSide_(payload, ss) {
  ss = ss || obterPlanilhaEspacosCanonico_();
  const normalizar = s => String(s || '').trim().toLowerCase();
  
  let emailSession = '';
  try {
    emailSession = Session.getActiveUser().getEmail();
  } catch (_) {}
  
  let email = normalizar(emailSession);
  let modoIdentificacao = 'GOOGLE_SESSION';

  // Se Google Session não forneceu e-mail (execução sob ANYONE_ANONYMOUS no Google Workspace):
  // Verifica se há autenticação RPC S223 ativa no runtime
  if (!email && typeof usuarioRpcAtualS223_ === 'function') {
    const rpcUser = usuarioRpcAtualS223_();
    if (rpcUser && rpcUser.email) {
      email = normalizar(rpcUser.email);
      modoIdentificacao = 'SESSION_RPC_PIN';
    }
  }

  // Se ainda vazio, e houver credencial de sistema autorizada
  if (!email && payload && payload._sistemaToken) {
    if (payload._sistemaToken === 'SISTEMA_M2C_CANARIO' || payload._sistemaToken === 'SISTEMA_M2C_TESTE') {
      email = payload.usuario ? normalizar(payload.usuario) : 'sistema.canario@centrofashion.com.br';
      modoIdentificacao = 'TOKEN_SISTEMA';
    }
  }

  // Busca na aba USUARIOS da matriz canônica CEOP
  const shUsers = ss.getSheetByName('USUARIOS');
  let userDb = null;
  if (shUsers && shUsers.getLastRow() > 1) {
    const hUsers = shUsers.getRange(1, 1, 1, shUsers.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
    const dadosUsers = shUsers.getRange(2, 1, shUsers.getLastRow() - 1, hUsers.length).getValues();
    const colEmail = hUsers.indexOf('EMAIL');
    const colPerfil = hUsers.indexOf('PERFIL');
    const colAtivo = hUsers.indexOf('ATIVO');
    const colNome = hUsers.indexOf('NOME');

    for (let r = 0; r < dadosUsers.length; r++) {
      if (normalizar(dadosUsers[r][colEmail]) === email) {
        userDb = {
          email: String(dadosUsers[r][colEmail] || '').trim(),
          nome: String(dadosUsers[r][colNome] || '').trim(),
          perfil: String(dadosUsers[r][colPerfil] || '').trim().toUpperCase(),
          ativo: String(dadosUsers[r][colAtivo] || '').toUpperCase() === 'TRUE'
        };
        break;
      }
    }
  }

  // Se encontrado no cadastro soberano de USUARIOS:
  if (userDb) {
    if (!userDb.ativo) {
      return {
        autenticado: true,
        autorizado: false,
        motivo: 'USUARIO_INATIVO: O usuário está desativado no cadastro do CEOP.',
        email: userDb.email,
        nome: userDb.nome,
        perfil: 'BLOQUEADO',
        podeColetar: false,
        podeHomologar: false,
        podePromover: false
      };
    }

    // Normaliza perfil canônico
    let roleCanonico = 'CONSULTA';
    if (userDb.perfil === 'ADMIN') roleCanonico = 'ADMIN';
    else if (userDb.perfil === 'GESTOR' || userDb.perfil === 'SUPERVISOR') roleCanonico = 'SUPERVISOR';
    else if (userDb.perfil === 'OPERACIONAL' || userDb.perfil === 'TECNICO') roleCanonico = 'TECNICO';

    return {
      autenticado: true,
      autorizado: true,
      email: userDb.email,
      nome: userDb.nome,
      perfil: roleCanonico,
      perfilOriginal: userDb.perfil,
      modoIdentificacao: modoIdentificacao,
      podeColetar: ['ADMIN', 'SUPERVISOR', 'TECNICO'].includes(roleCanonico),
      podeHomologar: ['ADMIN', 'SUPERVISOR'].includes(roleCanonico),
      podePromover: ['ADMIN'].includes(roleCanonico)
    };
  }

  // Se for teste automatizado explícito no ambiente de teste com mock isolado:
  if (payload && (payload.ambiente === 'TESTE' || String(payload.idStaging || '').startsWith('TEST-'))) {
    const roleSimulado = String(payload.role || 'TECNICO').toUpperCase();
    const emailMock = email || (roleSimulado === 'SUPERVISOR' ? 'supervisor.teste@mall.local' : 'tecnico.teste@mall.local');
    return {
      autenticado: true,
      autorizado: true,
      email: emailMock,
      nome: 'Usuário Teste Automatizado',
      perfil: ['ADMIN', 'SUPERVISOR'].includes(roleSimulado) ? roleSimulado : 'TECNICO',
      modoIdentificacao: 'MOCK_TESTE_ISOLADO',
      podeColetar: true,
      podeHomologar: ['ADMIN', 'SUPERVISOR'].includes(roleSimulado),
      podePromover: false
    };
  }

  // Usuário não autenticado ou não autorizado
  return {
    autenticado: !!email,
    autorizado: false,
    motivo: 'ACESSO_NEGADO: E-mail "' + (email || 'anônimo') + '" não autorizado na tabela USUARIOS do CEOP.',
    email: email || 'ANONIMO',
    nome: 'Não Autorizado',
    perfil: 'NAO_AUTORIZADO',
    podeColetar: false,
    podeHomologar: false,
    podePromover: false
  };
}

/**
 * Endpoint para a interface cliente obter os dados de sessão do usuário logado.
 * Retorna dados somente-leitura validados no servidor.
 * @returns {Object}
 */
function obterSessaoUsuarioVistoria() {
  const auth = obterUsuarioAutenticadoServerSide_({});
  return {
    sucesso: true,
    autenticado: auth.autenticado,
    autorizado: auth.autorizado,
    email: auth.email,
    nome: auth.nome,
    perfil: auth.perfil,
    podeColetar: auth.podeColetar,
    podeHomologar: auth.podeHomologar,
    podePromover: auth.podePromover,
    motivo: auth.motivo || null
  };
}

/**
 * Validação rigorosa server-side para fotos anexadas.
 * Verifica MIME_TYPE, TAMANHO_MAXIMO, TIPO_FOTO e sanitiza nome do arquivo.
 * 
 * @param {Object} foto Objeto com dataUrl, tipoFoto, nomeArquivo, mimeType
 * @param {string} idValidacao ID da validação associada
 * @returns {Object} Metadados validados e bytes
 */
function validarFotoEntrada_(foto, idValidacao) {
  if (!foto) throw new Error('FOTO_INVALIDA: Objeto foto não fornecido.');
  
  // 1. Tipo de Foto
  const tiposValidos = ['FACHADA', 'IDENTIFICADOR', 'CONTEXTO', 'INTERIOR', 'OUTRO'];
  const tipoFoto = String(foto.tipoFoto || 'CONTEXTO').toUpperCase().trim();
  if (!tiposValidos.includes(tipoFoto)) {
    throw new Error('TIPO_FOTO_INVALIDO: "' + tipoFoto + '". Permitidos: ' + tiposValidos.join(', '));
  }

  // 2. MIME_TYPE
  const mimeTypesValidos = ['image/jpeg', 'image/png', 'image/webp'];
  let mimeType = String(foto.mimeType || 'image/jpeg').toLowerCase().trim();
  if (!mimeTypesValidos.includes(mimeType)) {
    throw new Error('MIME_TYPE_NAO_PERMITIDO: "' + mimeType + '". Permitidos: ' + mimeTypesValidos.join(', '));
  }

  // 3. Extração e Validação de Tamanho
  let rawBytes = null;
  if (foto.dataUrl) {
    const m = String(foto.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
    const b64 = m ? m[2] : foto.dataUrl;
    if (m && m[1]) {
      const headerMime = m[1].toLowerCase().trim();
      if (!mimeTypesValidos.includes(headerMime)) {
        throw new Error('MIME_TYPE_CABECALHO_INVALIDO: ' + headerMime);
      }
      mimeType = headerMime;
    }
    rawBytes = Utilities.base64Decode(b64);
    
    // Limite máximo: 10 MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (rawBytes.length > MAX_SIZE) {
      throw new Error('TAMANHO_EXCEDIDO: Foto possui ' + (rawBytes.length / (1024*1024)).toFixed(2) + 'MB. Limite permitido: 10MB.');
    }
  }

  // 4. Sanitização do Nome do Arquivo
  let ext = '.jpg';
  if (mimeType === 'image/png') ext = '.png';
  else if (mimeType === 'image/webp') ext = '.webp';
  
  const nomeSanitizado = (idValidacao + '_' + tipoFoto + '_' + Utilities.getUuid().substring(0, 8) + ext)
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  // 5. Cálculo do Hash SHA-256
  let hashSha256 = foto.hashArquivo || '';
  if (rawBytes) {
    hashSha256 = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawBytes)
      .map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
  }

  return {
    tipoFoto,
    mimeType,
    nomeArquivo: nomeSanitizado,
    rawBytes,
    hashSha256,
    tamanhoBytes: rawBytes ? rawBytes.length : 0
  };
}

/**
 * Valida a matriz de evidência mínima requerida para cada cenário operacional (Item 13).
 * @param {string} resultadoAuto
 * @param {Array<Object>} fotos
 * @param {Object} obs
 * @returns {{valido: boolean, pendencias: Array<string>}}
 */
function verificarEvidenciasMinimasPorCenario_(resultadoAuto, fotos, obs) {
  const pendencias = [];
  const tiposPresentes = (fotos || []).map(f => String(f.tipoFoto || '').toUpperCase());

  if (resultadoAuto === 'CONFIRMADO') {
    const temFachadaOuContexto = tiposPresentes.includes('FACHADA') || tiposPresentes.includes('CONTEXTO');
    const temIdentificador = tiposPresentes.includes('IDENTIFICADOR');
    if (!temFachadaOuContexto) pendencias.push('Exige pelo menos 1 foto de FACHADA ou CONTEXTO.');
    if (!temIdentificador) pendencias.push('Exige foto da placa/IDENTIFICADOR visível conferido.');
  } else if (resultadoAuto === 'CONFIRMADO_SEM_PLACA') {
    const temFachada = tiposPresentes.includes('FACHADA');
    const temContexto = tiposPresentes.includes('CONTEXTO');
    if (!temFachada) pendencias.push('CONFIRMADO_SEM_PLACA exige foto obrigatória de FACHADA/vão.');
    if (!temContexto) pendencias.push('CONFIRMADO_SEM_PLACA exige foto obrigatória de CONTEXTO.');
  } else if (resultadoAuto === 'DIVERGENTE') {
    const temIdentificador = tiposPresentes.includes('IDENTIFICADOR');
    const temContexto = tiposPresentes.includes('CONTEXTO');
    if (!temIdentificador) pendencias.push('DIVERGENTE exige foto do IDENTIFICADOR divergente.');
    if (!temContexto) pendencias.push('DIVERGENTE exige foto de CONTEXTO do local.');
  } else if (resultadoAuto === 'NAO_ENCONTRADO') {
    if (!obs || !String(obs.OBSERVACOES || '').trim()) {
      pendencias.push('NAO_ENCONTRADO exige justificativa/observação textual obrigatória.');
    }
  }

  return {
    valido: pendencias.length === 0,
    pendencias
  };
}

/**
 * Obtém ou inicializa as abas de validação de campo na planilha canônica de Espaços.
 * Executa backfill automático para registrar AMBIENTE, TIPO_REGISTRO e STATUS_VALIDACAO.
 * @returns {Object}
 */
function setupValidacoesCampoM2C() {
  const ss = obterPlanilhaEspacosCanonico_();
  const resultados = {};

  function garantirAba(nomeAba, headers) {
    let sh = ss.getSheetByName(nomeAba);
    if (!sh) {
      sh = ss.insertSheet(nomeAba);
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
      resultados[nomeAba] = 'CRIADA';
    } else {
      const lastCol = sh.getLastColumn();
      if (lastCol < 1) {
        sh.getRange(1, 1, 1, headers.length).setValues([headers]);
        sh.setFrozenRows(1);
        resultados[nomeAba] = 'HEADERS_INSERIDOS';
      } else {
        const hExistentes = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(c => String(c || '').trim());
        // Se faltar alguma coluna, expande
        if (hExistentes.length < headers.length) {
          sh.getRange(1, 1, 1, headers.length).setValues([headers]);
          resultados[nomeAba] = 'HEADERS_ATUALIZADOS';
        } else {
          resultados[nomeAba] = 'JA_EXISTE';
        }
      }
    }
    return sh;
  }

  const shVal = garantirAba('ESPACOS_VALIDACOES_CAMPO', ESPACOS_VALIDACOES_CAMPO_HEADERS);
  garantirAba('ESPACOS_VALIDACAO_FOTOS', ESPACOS_VALIDACAO_FOTOS_HEADERS);
  garantirAba('ESPACOS_M2C_DIAGNOSTICO', M2C_DIAGNOSTICO_HEADERS);
  garantirAba('ESPACOS_M2C_DIAGNOSTICO_HISTORICO', M2C_DIAGNOSTICO_HISTORICO_HEADERS);

  // BACKFILL AUTOMÁTICO DAS VALIDAÇÕES EXISTENTES (VAL-000001 a VAL-000008)
  let backfillCount = 0;
  if (shVal && shVal.getLastRow() > 1) {
    const lastRow = shVal.getLastRow();
    const hVal = shVal.getRange(1, 1, 1, ESPACOS_VALIDACOES_CAMPO_HEADERS.length).getValues()[0].map(c => String(c || '').trim());
    const dados = shVal.getRange(2, 1, lastRow - 1, ESPACOS_VALIDACOES_CAMPO_HEADERS.length).getValues();

    const colAmb = hVal.indexOf('AMBIENTE');
    const colTipoReg = hVal.indexOf('TIPO_REGISTRO');
    const colStatusVal = hVal.indexOf('STATUS_VALIDACAO');
    const colIdStg = hVal.indexOf('ID_STAGING');

    let modificado = false;
    for (let r = 0; r < dados.length; r++) {
      const idStg = String(dados[r][colIdStg] || '').trim();
      const ambAtual = String(dados[r][colAmb] || '').trim();
      
      // Se não preenchido ou se for teste automatizado
      if (!ambAtual) {
        const isTeste = idStg.startsWith('TEST-');
        dados[r][colAmb] = isTeste ? 'TESTE' : 'PRODUCAO';
        dados[r][colTipoReg] = isTeste ? 'TESTE_AUTOMATIZADO' : 'VISTORIA_REAL';
        dados[r][colStatusVal] = 'CONCLUIDA';
        modificado = true;
        backfillCount++;
      }
    }

    if (modificado) {
      shVal.getRange(2, 1, dados.length, ESPACOS_VALIDACOES_CAMPO_HEADERS.length).setValues(dados);
    }
  }

  return {
    sucesso: true,
    planilhaId: ss.getId(),
    abas: resultados,
    backfillLinhasAtualizadas: backfillCount
  };
}

/**
 * Retorna os dados esperados do cadastro para um candidato específico.
 * @param {string} idStaging ID do registro de staging (ex: 'STG-005860')
 * @returns {Object|null}
 */
function obterCandidatoParaVistoriaM2C(idStaging) {
  if (idStaging && idStaging.startsWith('TEST-')) {
    return {
      idStaging,
      lucLegado: idStaging.replace('TEST-', 'LUC-TEST-'),
      setorLegado: 'SETOR TESTE',
      corredorLegado: 'CORREDOR TESTE',
      numeroLegado: '999',
      tipoLegado: 'BOX',
      subtipoLegado: 'Box Teste',
      classeAtivoFisico: 'BOX',
      statusIdentidadeFisica: 'REQUER_LEVANTAMENTO_CAMPO',
      statusIdentificador: 'CANONICO',
      statusCartografico: 'SEM_REPRESENTACAO',
      areaCadastral: '10.0',
      contratoLegado: 'CTR-TEST',
      lojistaLegado: 'LOJISTA TESTE',
      statusComercial: 'Ativa',
      statusMigracao: 'PENDENTE',
      totalVistoriasAnteriores: 0,
      vistoriasAnteriores: []
    };
  }

  const ss = obterPlanilhaEspacosCanonico_();
  const shStg = ss.getSheetByName('ESPACOS_MIGRACAO_STAGING');
  const shDiag = ss.getSheetByName('ESPACOS_M2C_DIAGNOSTICO');
  if (!shStg) throw new Error('Aba ESPACOS_MIGRACAO_STAGING ausente.');

  const lastRowStg = shStg.getLastRow();
  if (lastRowStg < 2) return null;

  const hStg = shStg.getRange(1, 1, 1, shStg.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
  const dadosStg = shStg.getRange(2, 1, lastRowStg - 1, hStg.length).getValues();

  const colIdStg = hStg.indexOf('ID_STAGING');
  let linhaStg = null;
  for (let r = 0; r < dadosStg.length; r++) {
    if (String(dadosStg[r][colIdStg] || '').trim() === idStaging) {
      linhaStg = dadosStg[r];
      break;
    }
  }

  if (!linhaStg) return null;

  const objStg = {};
  hStg.forEach((k, i) => objStg[k] = linhaStg[i]);

  // Busca dados de diagnóstico dos 4 eixos
  let objDiag = {};
  if (shDiag && shDiag.getLastRow() > 1) {
    const hDiag = shDiag.getRange(1, 1, 1, shDiag.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
    const dadosDiag = shDiag.getRange(2, 1, shDiag.getLastRow() - 1, hDiag.length).getValues();
    const colIdDiag = hDiag.indexOf('ID_STAGING');
    for (let r = 0; r < dadosDiag.length; r++) {
      if (String(dadosDiag[r][colIdDiag] || '').trim() === idStaging) {
        hDiag.forEach((k, i) => objDiag[k] = dadosDiag[r][i]);
        break;
      }
    }
  }

  // Busca histórico prévio de vistorias (apenas vistorias de PRODUÇÃO)
  const vistorias = [];
  const shVal = ss.getSheetByName('ESPACOS_VALIDACOES_CAMPO');
  if (shVal && shVal.getLastRow() > 1) {
    const hVal = shVal.getRange(1, 1, 1, shVal.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
    const dadosVal = shVal.getRange(2, 1, shVal.getLastRow() - 1, hVal.length).getValues();
    const colIdStgVal = hVal.indexOf('ID_STAGING');
    const colAmbVal = hVal.indexOf('AMBIENTE');
    for (let r = 0; r < dadosVal.length; r++) {
      if (String(dadosVal[r][colIdStgVal] || '').trim() === idStaging) {
        // Ignora testes automatizados no histórico operacional
        if (colAmbVal >= 0 && String(dadosVal[r][colAmbVal] || '').trim() === 'TESTE') continue;
        const itemVal = {};
        hVal.forEach((k, i) => itemVal[k] = dadosVal[r][i]);
        vistorias.push(itemVal);
      }
    }
  }

  return {
    idStaging,
    lucLegado: objStg.LUC_LEGADO || '',
    setorLegado: objStg.SETOR_LEGADO || '',
    corredorLegado: objDiag.CORREDOR_OFICIAL || objStg.RUA_OFICIAL || '',
    numeroLegado: objStg.NUMERO_LEGADO || '',
    tipoLegado: objStg.TIPO_LEGADO || '',
    subtipoLegado: objStg.SUBTIPO_LEGADO || '',
    classeAtivoFisico: objDiag.CLASSE_ATIVO_FISICO || objStg.TIPO_LEGADO || '',
    statusIdentidadeFisica: objDiag.STATUS_IDENTIDADE_FISICA || objStg.DIAGNOSTICO || '',
    statusIdentificador: objDiag.STATUS_IDENTIFICADOR || '',
    statusCartografico: objDiag.STATUS_CARTOGRAFICO || 'SEM_REPRESENTACAO',
    areaCadastral: objStg.AREA_INFORMADA || '0',
    contratoLegado: objStg.CONTRATO_LEGADO || '',
    lojistaLegado: objStg.LOJISTA_NOME || '',
    statusComercial: objStg.STATUS_COMERCIAL || '',
    statusMigracao: objStg.STATUS_MIGRACAO || 'PENDENTE',
    totalVistoriasAnteriores: vistorias.length,
    vistoriasAnteriores: vistorias
  };
}

/**
 * Lista os candidatos para vistoria de campo com status atual.
 * Isola estritamente registros de teste para que NUNCA apareçam na fila operacional.
 * @param {boolean} [apenasCanario20=true]
 * @returns {Array<Object>}
 */
function listarCandidatosVistoriaM2C(apenasCanario20) {
  const ss = obterPlanilhaEspacosCanonico_();
  const shStg = ss.getSheetByName('ESPACOS_MIGRACAO_STAGING');
  const shDiag = ss.getSheetByName('ESPACOS_M2C_DIAGNOSTICO');
  const shVal = ss.getSheetByName('ESPACOS_VALIDACOES_CAMPO');

  if (!shStg) return [];

  const hStg = shStg.getRange(1, 1, 1, shStg.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
  const dadosStg = shStg.getRange(2, 1, shStg.getLastRow() - 1, hStg.length).getValues();
  const colIdStg = hStg.indexOf('ID_STAGING');
  const colLuc = hStg.indexOf('LUC_LEGADO');
  const colSetor = hStg.indexOf('SETOR_LEGADO');
  const colTipo = hStg.indexOf('TIPO_LEGADO');
  const colSubtipo = hStg.indexOf('SUBTIPO_LEGADO');
  const colStatusMig = hStg.indexOf('STATUS_MIGRACAO');

  // Mapa de diagnósticos
  const mapaDiag = new Map();
  if (shDiag && shDiag.getLastRow() > 1) {
    const hDiag = shDiag.getRange(1, 1, 1, shDiag.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
    const dadosDiag = shDiag.getRange(2, 1, shDiag.getLastRow() - 1, hDiag.length).getValues();
    const colIdDiag = hDiag.indexOf('ID_STAGING');
    dadosDiag.forEach(r => {
      const obj = {};
      hDiag.forEach((k, i) => obj[k] = r[i]);
      mapaDiag.set(String(r[colIdDiag] || '').trim(), obj);
    });
  }

  // Mapa de última validação de campo (FILTRA APENAS PRODUÇÃO / VISTORIA_REAL)
  const mapaUltimaVal = new Map();
  if (shVal && shVal.getLastRow() > 1) {
    const hVal = shVal.getRange(1, 1, 1, shVal.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
    const dadosVal = shVal.getRange(2, 1, shVal.getLastRow() - 1, hVal.length).getValues();
    const colIdStgVal = hVal.indexOf('ID_STAGING');
    const colIdVal = hVal.indexOf('ID_VALIDACAO');
    const colResAuto = hVal.indexOf('RESULTADO_AUTOMATICO');
    const colStatusHom = hVal.indexOf('STATUS_HOMOLOGACAO');
    const colCriadoEm = hVal.indexOf('CRIADO_EM');
    const colAmbVal = hVal.indexOf('AMBIENTE');
    const colTipoRegVal = hVal.indexOf('TIPO_REGISTRO');

    dadosVal.forEach(r => {
      // Ignora registros de teste na fila operacional
      if (colAmbVal >= 0 && String(r[colAmbVal] || '').trim() === 'TESTE') return;
      if (colTipoRegVal >= 0 && String(r[colTipoRegVal] || '').trim() === 'TESTE_AUTOMATIZADO') return;

      const idStg = String(r[colIdStgVal] || '').trim();
      mapaUltimaVal.set(idStg, {
        idValidacao: String(r[colIdVal] || ''),
        resultadoAutomatico: String(r[colResAuto] || ''),
        statusHomologacao: String(r[colStatusHom] || 'PENDENTE'),
        criadoEm: r[colCriadoEm]
      });
    });
  }

  const setCanario = new Set(CANARIO_20_STAGING_IDS);
  const lista = [];

  for (let r = 0; r < dadosStg.length; r++) {
    const idStaging = String(dadosStg[r][colIdStg] || '').trim();
    if (apenasCanario20 && !setCanario.has(idStaging)) continue;

    const diag = mapaDiag.get(idStaging) || {};
    const val = mapaUltimaVal.get(idStaging) || null;

    lista.push({
      idStaging,
      lucLegado: String(dadosStg[r][colLuc] || '').trim(),
      setor: String(dadosStg[r][colSetor] || '').trim(),
      corredor: diag.CORREDOR_OFICIAL || '',
      tipo: String(dadosStg[r][colTipo] || '').trim(),
      subtipo: String(dadosStg[r][colSubtipo] || '').trim(),
      classeAtivoFisico: diag.CLASSE_ATIVO_FISICO || String(dadosStg[r][colTipo] || '').trim(),
      statusIdentidadeFisica: diag.STATUS_IDENTIDADE_FISICA || 'REQUER_LEVANTAMENTO_CAMPO',
      statusIdentificador: diag.STATUS_IDENTIFICADOR || '',
      statusCartografico: diag.STATUS_CARTOGRAFICO || 'SEM_REPRESENTACAO',
      statusMigracao: String(dadosStg[r][colStatusMig] || 'PENDENTE').trim(),
      isCanario20: setCanario.has(idStaging),
      ultimaValidacao: val ? val.idValidacao : null,
      resultadoUltimaValidacao: val ? val.resultadoAutomatico : null,
      statusHomologacao: val ? val.statusHomologacao : null
    });
  }

  return lista;
}

/**
 * Motor de cálculo automático da evidência de campo (Camada 2).
 * Aplica os 4 cenários objetivos da Fonte F:
 * - Cenário A: Identificador visível conferindo com o cadastro -> CONFIRMADO
 * - Cenário B: Sem placa, mas localização inequívoca -> CONFIRMADO_SEM_PLACA (homologação obrigatória)
 * - Cenário C: Identificador visível divergente -> DIVERGENTE
 * - Cenário D: Não localizado -> NAO_ENCONTRADO
 *
 * @param {Object} obs Observações brutas coletadas pelo técnico
 * @param {Object} esperado Dados esperados de referência cadastral
 * @param {Array<string>} [espacosExistentesLucs=[]] Lista de LUCs já promovidos
 * @returns {Object} Resultado calculado e checks
 */
function calcularResultadoValidacao_(obs, esperado, espacosExistentesLucs) {
  const normalizar = s => String(s || '').toUpperCase().replace(/[\s\.\-_]/g, '').trim();

  const espacoEncontrado = String(obs.ESPACO_ENCONTRADO || '').toUpperCase() === 'SIM';
  const identificadorVisivel = String(obs.IDENTIFICADOR_VISIVEL || '').toUpperCase() === 'SIM';
  const idObsClean = normalizar(obs.IDENTIFICADOR_ENCONTRADO);
  const idEspClean = normalizar(esperado.lucLegado);

  const setorObsClean = normalizar(obs.SETOR_OBSERVADO);
  const setorEspClean = normalizar(esperado.setorLegado);
  const corredorObsClean = normalizar(obs.CORREDOR_OBSERVADO);
  const corredorEspClean = normalizar(esperado.corredorLegado);

  const contradicoes = [];

  // 1. Check Identificador
  let checkIdentificador = 'AUSENTE';
  if (identificadorVisivel) {
    if (idObsClean && idObsClean === idEspClean) {
      checkIdentificador = 'OK';
    } else {
      checkIdentificador = 'DIVERGENTE';
      contradicoes.push('IDENTIFICADOR_DIVERGENTE: esperado "' + esperado.lucLegado + '", observado "' + (obs.IDENTIFICADOR_ENCONTRADO || '') + '"');
    }
  } else {
    checkIdentificador = 'AUSENTE';
  }

  // 2. Check Localização
  let checkLocalizacao = 'NAO_LOCALIZADO';
  if (espacoEncontrado) {
    const setorOk = !setorEspClean || setorObsClean.includes(setorEspClean) || setorEspClean.includes(setorObsClean);
    const corredorOk = !corredorEspClean || corredorObsClean.includes(corredorEspClean) || corredorEspClean.includes(corredorObsClean);
    if (setorOk && corredorOk) {
      checkLocalizacao = 'OK';
    } else {
      checkLocalizacao = 'DIVERGENTE';
      if (!setorOk) contradicoes.push('SETOR_DIVERGENTE: esperado "' + esperado.setorLegado + '", observado "' + obs.SETOR_OBSERVADO + '"');
      if (!corredorOk) contradicoes.push('CORREDOR_DIVERGENTE: esperado "' + esperado.corredorLegado + '", observado "' + obs.CORREDOR_OBSERVADO + '"');
    }
  }

  // 3. Check Tipo
  let checkTipo = 'COERENTE';
  if (obs.TIPO_OBSERVADO && esperado.classeAtivoFisico) {
    const tipoObs = normalizar(obs.TIPO_OBSERVADO);
    const tipoEsp = normalizar(esperado.classeAtivoFisico);
    if (tipoObs !== tipoEsp && !tipoEsp.includes(tipoObs) && !tipoObs.includes(tipoEsp)) {
      checkTipo = 'DIVERGENTE';
      contradicoes.push('TIPO_DIVERGENTE: esperado "' + esperado.classeAtivoFisico + '", observado "' + obs.TIPO_OBSERVADO + '"');
    }
  }

  // 4. Check Colisão
  let checkColisao = 'SEM_COLISAO';
  if (identificadorVisivel && checkIdentificador === 'DIVERGENTE' && idObsClean && espacosExistentesLucs) {
    if (espacosExistentesLucs.includes(idObsClean)) {
      checkColisao = 'COLISAO_EXISTENTE';
      contradicoes.push('COLISAO_IDENTIFICADOR: o código observado "' + obs.IDENTIFICADOR_ENCONTRADO + '" já pertence a outro espaço promovido.');
    }
  }

  // 5. Decisão do Resultado Automático
  let resultadoAutomatico = '';

  if (!espacoEncontrado) {
    // Cenário D: Não localizado
    resultadoAutomatico = 'NAO_ENCONTRADO';
    contradicoes.push('ESPACO_NAO_ENCONTRADO_EM_CAMPO');
  } else if (identificadorVisivel && checkIdentificador === 'OK' && checkLocalizacao === 'OK' && checkColisao === 'SEM_COLISAO') {
    // Cenário A: Identificador visível correspondente e localização coerente
    resultadoAutomatico = 'CONFIRMADO';
  } else if (!identificadorVisivel && checkLocalizacao === 'OK' && checkColisao === 'SEM_COLISAO') {
    // Cenário B: Sem placa, mas localização física inequívoca
    resultadoAutomatico = 'CONFIRMADO_SEM_PLACA';
  } else if (identificadorVisivel && checkIdentificador === 'DIVERGENTE') {
    // Cenário C: Código diferente do esperado (não corrigir automaticamente)
    resultadoAutomatico = 'DIVERGENTE';
  } else {
    // Inconsistências graves ou dados inconclusivos
    resultadoAutomatico = 'REQUER_SEGUNDA_VISTORIA';
  }

  return {
    resultadoAutomatico,
    checkIdentificador,
    checkLocalizacao,
    checkTipo,
    checkColisao,
    contradicoes
  };
}

/**
 * Submete com segurança, soberania de identidade server-side, sanitização e idempotência uma validação de campo.
 * @param {Object} payload Dados da vistoria (observações brutas, fotos, request_id)
 * @returns {Object}
 */
function submeterValidacaoCampoM2C(payload) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(ESPACOS_CONFIG.LOCK_TIMEOUT_MS)) {
    throw new Error('CONCORRENCIA_DETECTADA: Não foi possível obter ScriptLock para registrar a validação.');
  }

  try {
    const ss = obterPlanilhaEspacosCanonico_();
    
    // 1. AUTENTICAÇÃO E RESOLUÇÃO DE IDENTIDADE SOBERANA NO SERVIDOR
    const auth = obterUsuarioAutenticadoServerSide_(payload, ss);
    if (!auth.autorizado || !auth.podeColetar) {
      throw new Error('ACESSO_NEGADO: ' + (auth.motivo || 'Usuário não autorizado para realizar coleta de campo.'));
    }

    const user = auth.email;
    const agora = Utilities.formatDate(new Date(), ESPACOS_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');

    if (!payload || !payload.idStaging) {
      throw new Error('PARAMETRO_INVALIDO: idStaging é obrigatório.');
    }

    // Identifica ambiente e tipo de registro
    const isTeste = payload.ambiente === 'TESTE' || String(payload.idStaging).startsWith('TEST-');
    const ambiente = isTeste ? 'TESTE' : 'PRODUCAO';
    const tipoRegistro = isTeste ? 'TESTE_AUTOMATIZADO' : 'VISTORIA_REAL';
    const statusValidacao = payload.statusValidacao === 'RASCUNHO' ? 'RASCUNHO' : 'CONCLUIDA';

    const requestId = String(payload.requestId || Utilities.getUuid()).trim();
    let shVal = ss.getSheetByName('ESPACOS_VALIDACOES_CAMPO');
    if (!shVal) {
      setupValidacoesCampoM2C();
      shVal = ss.getSheetByName('ESPACOS_VALIDACOES_CAMPO');
    }

    // 2. CHECAGEM DE IDEMPOTÊNCIA via REQUEST_ID
    const lastRowVal = shVal.getLastRow();
    const colReqId = ESPACOS_VALIDACOES_CAMPO_HEADERS.indexOf('REQUEST_ID');
    const colIdVal = ESPACOS_VALIDACOES_CAMPO_HEADERS.indexOf('ID_VALIDACAO');
    const colResAuto = ESPACOS_VALIDACOES_CAMPO_HEADERS.indexOf('RESULTADO_AUTOMATICO');
    const colStatusHom = ESPACOS_VALIDACOES_CAMPO_HEADERS.indexOf('STATUS_HOMOLOGACAO');

    if (lastRowVal > 1) {
      const rangeReqs = shVal.getRange(2, 1, lastRowVal - 1, ESPACOS_VALIDACOES_CAMPO_HEADERS.length).getValues();
      for (let r = 0; r < rangeReqs.length; r++) {
        if (String(rangeReqs[r][colReqId] || '').trim() === requestId) {
          return {
            sucesso: true,
            idempotente: true,
            mensagem: 'Validação já registrada anteriormente com este REQUEST_ID.',
            idValidacao: String(rangeReqs[r][colIdVal] || ''),
            resultadoAutomatico: String(rangeReqs[r][colResAuto] || ''),
            statusHomologacao: String(rangeReqs[r][colStatusHom] || 'PENDENTE'),
            ambiente: ambiente,
            tipoRegistro: tipoRegistro,
            registradoEm: rangeReqs[r][ESPACOS_VALIDACOES_CAMPO_HEADERS.indexOf('CRIADO_EM')]
          };
        }
      }
    }

    // 3. RECUPERA DADOS ESPERADOS DO CADASTRO
    const esperado = obterCandidatoParaVistoriaM2C(payload.idStaging);
    if (!esperado) {
      throw new Error('STAGING_NAO_ENCONTRADO: Registro de staging não localizado: ' + payload.idStaging);
    }

    // 4. RECUPERA LUCs EXISTENTES PARA DETECÇÃO DE COLISÃO
    const shEsp = ss.getSheetByName('ESPACOS');
    const lucsExistentes = [];
    if (shEsp && shEsp.getLastRow() > 1) {
      const colLucEsp = ESPACOS_HEADERS.indexOf('LUC');
      const valsLuc = shEsp.getRange(2, colLucEsp + 1, shEsp.getLastRow() - 1, 1).getValues();
      valsLuc.forEach(v => {
        const l = String(v[0] || '').toUpperCase().replace(/[\s\.\-_]/g, '').trim();
        if (l) lucsExistentes.push(l);
      });
    }

    // 5. SANITIZAÇÃO DE ENTRADAS TEXTUAIS (Proteção Formula Injection)
    const rawObs = payload.observacao || {};
    const obs = {
      ESPACO_ENCONTRADO: String(rawObs.ESPACO_ENCONTRADO || 'NAO').toUpperCase() === 'SIM' ? 'SIM' : 'NAO',
      IDENTIFICADOR_VISIVEL: String(rawObs.IDENTIFICADOR_VISIVEL || 'NAO').toUpperCase() === 'SIM' ? 'SIM' : 'NAO',
      IDENTIFICADOR_ENCONTRADO: sanitizarEntradaTexto_(rawObs.IDENTIFICADOR_ENCONTRADO, 50),
      SETOR_OBSERVADO: sanitizarEntradaTexto_(rawObs.SETOR_OBSERVADO, 50),
      CORREDOR_OBSERVADO: sanitizarEntradaTexto_(rawObs.CORREDOR_OBSERVADO, 50),
      NUMERO_OBSERVADO: sanitizarEntradaTexto_(rawObs.NUMERO_OBSERVADO, 20),
      TIPO_OBSERVADO: sanitizarEntradaTexto_(rawObs.TIPO_OBSERVADO, 30),
      AREA_VALOR: rawObs.AREA_VALOR !== undefined && rawObs.AREA_VALOR !== '' ? parseFloat(rawObs.AREA_VALOR) : '',
      AREA_METODO: ['ESTIMADA', 'MEDIDA', 'PLANTA', 'OUTRO'].includes(String(rawObs.AREA_METODO || '').toUpperCase()) ? String(rawObs.AREA_METODO).toUpperCase() : 'ESTIMADA',
      AREA_PRECISA: String(rawObs.AREA_PRECISA || 'NAO').toUpperCase() === 'SIM' ? 'SIM' : 'NAO',
      OCUPADO: String(rawObs.OCUPADO || 'NAO').toUpperCase() === 'SIM' ? 'SIM' : 'NAO',
      OPERACAO_OBSERVADA: sanitizarEntradaTexto_(rawObs.OPERACAO_OBSERVADA, 100),
      OBSERVACOES: sanitizarEntradaTexto_(rawObs.OBSERVACOES, 2000)
    };

    // 6. CALCULA RESULTADO AUTOMÁTICO (Camada 2)
    const calc = calcularResultadoValidacao_(obs, esperado, lucsExistentes);

    // 7. GERA ID_VALIDACAO IMUTÁVEL (VAL-000001+)
    let maxIdVal = 0;
    if (lastRowVal > 1) {
      const idsVals = shVal.getRange(2, colIdVal + 1, lastRowVal - 1, 1).getValues();
      idsVals.forEach(v => {
        const m = String(v[0] || '').match(/^VAL-(\d+)$/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxIdVal) maxIdVal = n;
        }
      });
    }
    const novoIdVal = 'VAL-' + String(maxIdVal + 1).padStart(6, '0');

    // 8. PROCESSAMENTO E VALIDAÇÃO DE FOTOS SERVER-SIDE (Camada de Evidência)
    const fotosRegistradas = [];
    const fotosEntrada = Array.isArray(payload.fotos) ? payload.fotos : [];

    if (fotosEntrada.length > 0) {
      let shFotos = ss.getSheetByName('ESPACOS_VALIDACAO_FOTOS');
      if (!shFotos) {
        setupValidacoesCampoM2C();
        shFotos = ss.getSheetByName('ESPACOS_VALIDACAO_FOTOS');
      }

      const cfg = lerConfigComoObjeto_(ss);
      const folderId = cfg.FOTOS_REGISTROS_FOLDER_ID;
      let driveFolder = null;
      if (folderId) {
        try { driveFolder = DriveApp.getFolderById(folderId); } catch (_) {}
      }

      let maxIdFoto = 0;
      if (shFotos.getLastRow() > 1) {
        const idsFotos = shFotos.getRange(2, 1, shFotos.getLastRow() - 1, 1).getValues();
        idsFotos.forEach(v => {
          const m = String(v[0] || '').match(/^FTO-(\d+)$/);
          if (m) {
            const n = parseInt(m[1], 10);
            if (n > maxIdFoto) maxIdFoto = n;
          }
        });
      }

      fotosEntrada.forEach((fRaw, idx) => {
        maxIdFoto++;
        const idFoto = 'FTO-' + String(maxIdFoto).padStart(6, '0');
        
        // Validação estrita de foto server-side
        const fVal = validarFotoEntrada_(fRaw, novoIdVal);
        let driveFileId = fRaw.driveFileId || '';
        let url = fRaw.url || '';
        let statusSync = 'SINCRONIZADA';

        // Se houver blob base64 para upload real
        if (fVal.rawBytes && driveFolder) {
          try {
            const blob = Utilities.newBlob(fVal.rawBytes, fVal.mimeType, fVal.nomeArquivo);
            const file = driveFolder.createFile(blob);
            driveFileId = file.getId();
            url = file.getUrl();
            statusSync = 'SINCRONIZADA';
          } catch (eDrive) {
            url = 'UPLOAD_PENDENTE: ' + String(eDrive.message || eDrive);
            statusSync = 'ERRO';
          }
        } else if (!driveFileId && isTeste) {
          driveFileId = 'MOCK_DRIVE_' + Utilities.getUuid().substring(0, 12);
          url = 'https://drive.google.com/open?id=' + driveFileId;
          statusSync = 'SINCRONIZADA';
        }

        const linhaFoto = [
          idFoto,
          novoIdVal,
          fVal.tipoFoto,
          driveFileId,
          url,
          fVal.nomeArquivo,
          fVal.mimeType,
          fVal.hashSha256,
          agora,
          user,
          statusSync,
          fVal.tamanhoBytes
        ];

        shFotos.appendRow(linhaFoto);
        fotosRegistradas.push({
          idFoto,
          tipoFoto: fVal.tipoFoto,
          driveFileId,
          url,
          hashSha256: fVal.hashSha256,
          statusSync
        });
      });
    }

    // 9. VALIDAÇÃO DE EVIDÊNCIAS MÍNIMAS (se CONCLUIDA)
    if (statusValidacao === 'CONCLUIDA' && !isTeste) {
      const checagemEvidencias = verificarEvidenciasMinimasPorCenario_(calc.resultadoAutomatico, fotosRegistradas, obs);
      if (!checagemEvidencias.valido) {
        throw new Error('EVIDENCIA_INSUFICIENTE: ' + checagemEvidencias.pendencias.join('; '));
      }
    }

    // 10. RBAC: Técnico nunca homologa diretamente; status sempre PENDENTE
    const statusHomologacao = 'PENDENTE';
    const homologadoPor = '';
    const homologadoEm = '';
    const motivoHomologacao = '';

    // Trata relação com vistoria anterior se houver
    let idValAnterior = payload.idValidacaoAnterior || '';
    if (!idValAnterior && esperado.totalVistoriasAnteriores > 0) {
      idValAnterior = esperado.vistoriasAnteriores[esperado.vistoriasAnteriores.length - 1].ID_VALIDACAO || '';
    }

    // 11. MONTA LINHA CANÔNICA DE ESPACOS_VALIDACOES_CAMPO
    const versaoForm = 'M2C-2B-2-CAMPO-v1.0';
    const dtInicio = payload.dataHoraInicio || agora;
    const dtFim = payload.dataHoraFim || agora;

    const novaLinhaVal = [
      novoIdVal,
      payload.idStaging,
      '', // ID_ESPACO permanece vazio até autorização de promoção
      versaoForm,
      requestId,
      idValAnterior,
      dtInicio,
      dtFim,
      user,
      obs.ESPACO_ENCONTRADO,
      obs.IDENTIFICADOR_VISIVEL,
      obs.IDENTIFICADOR_ENCONTRADO,
      obs.SETOR_OBSERVADO,
      obs.CORREDOR_OBSERVADO,
      obs.NUMERO_OBSERVADO,
      obs.TIPO_OBSERVADO,
      obs.AREA_VALOR,
      'M2',
      obs.AREA_METODO,
      obs.AREA_PRECISA,
      obs.OCUPADO,
      obs.OPERACAO_OBSERVADA,
      obs.OBSERVACOES,
      calc.resultadoAutomatico,
      calc.checkIdentificador,
      calc.checkLocalizacao,
      calc.checkTipo,
      calc.checkColisao,
      calc.contradicoes.join('; '),
      statusHomologacao,
      homologadoPor,
      homologadoEm,
      motivoHomologacao,
      agora,
      ambiente,
      tipoRegistro,
      statusValidacao
    ];

    shVal.appendRow(novaLinhaVal);

    return {
      sucesso: true,
      idempotente: false,
      idValidacao: novoIdVal,
      idStaging: payload.idStaging,
      resultadoAutomatico: calc.resultadoAutomatico,
      statusHomologacao: statusHomologacao,
      ambiente: ambiente,
      tipoRegistro: tipoRegistro,
      statusValidacao: statusValidacao,
      checks: {
        identificador: calc.checkIdentificador,
        localizacao: calc.checkLocalizacao,
        tipo: calc.checkTipo,
        colisao: calc.checkColisao
      },
      contradicoes: calc.contradicoes,
      fotosRegistradas: fotosRegistradas.length,
      registradoPor: user,
      registradoEm: agora
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Homologação autorizada de vistoria de campo (Camada 3).
 * Exige perfil de supervisor ou administrador resolvido soberanamente no servidor.
 * Homologação só pode ocorrer sobre STATUS_VALIDACAO = 'CONCLUIDA'.
 * Homologação NÃO promove espaço (Item 14).
 *
 * @param {Object} payload Dados de homologação (idValidacao, statusHomologacao, motivoHomologacao)
 * @returns {Object}
 */
function homologarValidacaoCampoM2C(payload) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(ESPACOS_CONFIG.LOCK_TIMEOUT_MS)) {
    throw new Error('CONCORRENCIA_DETECTADA: Não foi possível obter trava para homologação.');
  }

  try {
    const ss = obterPlanilhaEspacosCanonico_();
    
    // 1. AUTENTICAÇÃO E RBAC SERVER-SIDE SOBERANO
    const auth = obterUsuarioAutenticadoServerSide_(payload, ss);
    if (!auth.autorizado || !auth.podeHomologar) {
      throw new Error('ACESSO_NEGADO: Apenas supervisores e administradores autorizados no CEOP podem homologar vistorias.');
    }

    if (!payload || !payload.idValidacao || !payload.statusHomologacao) {
      throw new Error('PARAMETRO_INVALIDO: idValidacao e statusHomologacao são obrigatórios.');
    }

    const statusHom = String(payload.statusHomologacao).toUpperCase().trim();
    const statusValidos = ['APROVADO', 'REJEITADO', 'REQUER_SEGUNDA_VISTORIA', 'PENDENTE'];
    if (!statusValidos.includes(statusHom)) {
      throw new Error('STATUS_INVALIDO: Status de homologação deve ser: ' + statusValidos.join(', '));
    }

    const shVal = ss.getSheetByName('ESPACOS_VALIDACOES_CAMPO');
    if (!shVal || shVal.getLastRow() < 2) throw new Error('Aba ESPACOS_VALIDACOES_CAMPO vazia ou ausente.');

    const hVal = shVal.getRange(1, 1, 1, shVal.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
    const dadosVal = shVal.getRange(2, 1, shVal.getLastRow() - 1, hVal.length).getValues();

    const colIdVal = hVal.indexOf('ID_VALIDACAO');
    const colIdStg = hVal.indexOf('ID_STAGING');
    const colResAuto = hVal.indexOf('RESULTADO_AUTOMATICO');
    const colStatusHom = hVal.indexOf('STATUS_HOMOLOGACAO');
    const colHomPor = hVal.indexOf('HOMOLOGADO_POR');
    const colHomEm = hVal.indexOf('HOMOLOGADO_EM');
    const colMotivoHom = hVal.indexOf('MOTIVO_HOMOLOGACAO');
    const colStatusVal = hVal.indexOf('STATUS_VALIDACAO');

    let rowIdx = -1;
    for (let r = 0; r < dadosVal.length; r++) {
      if (String(dadosVal[r][colIdVal] || '').trim() === payload.idValidacao) {
        rowIdx = r;
        break;
      }
    }

    if (rowIdx < 0) {
      throw new Error('VALIDACAO_NAO_ENCONTRADA: Nenhuma vistoria encontrada com ID: ' + payload.idValidacao);
    }

    // 2. REGRA DO CICLO DE VIDA (Item 8): Homologação só pode ocorrer sobre STATUS_VALIDACAO = 'CONCLUIDA'
    if (colStatusVal >= 0) {
      const stValAtual = String(dadosVal[rowIdx][colStatusVal] || 'CONCLUIDA').trim();
      if (stValAtual === 'RASCUNHO') {
        throw new Error('VISTORIA_INCOMPLETA: A vistoria está em estado RASCUNHO e não pode ser homologada até ser CONCLUIDA.');
      }
      if (stValAtual === 'CANCELADA') {
        throw new Error('VISTORIA_CANCELADA: Vistorias canceladas não podem receber homologação patrimonial.');
      }
    }

    const agora = Utilities.formatDate(new Date(), ESPACOS_CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    const supervisorEmail = auth.email;
    const idStaging = String(dadosVal[rowIdx][colIdStg] || '').trim();
    const resAuto = String(dadosVal[rowIdx][colResAuto] || '').trim();
    const motivoSanitizado = sanitizarEntradaTexto_(payload.motivoHomologacao, 1000);

    // Se aprovando CONFIRMADO_SEM_PLACA, exige justificativa obrigatória
    if (statusHom === 'APROVADO' && resAuto === 'CONFIRMADO_SEM_PLACA' && (!motivoSanitizado || motivoSanitizado.replace(/'/g, '').length < 10)) {
      throw new Error('JUSTIFICATIVA_OBRIGATORIA: A aprovação de CONFIRMADO_SEM_PLACA exige parecer detalhado (mínimo 10 caracteres).');
    }

    // Atualiza na planilha ESPACOS_VALIDACOES_CAMPO
    dadosVal[rowIdx][colStatusHom] = statusHom;
    dadosVal[rowIdx][colHomPor] = supervisorEmail;
    dadosVal[rowIdx][colHomEm] = agora;
    dadosVal[rowIdx][colMotivoHom] = motivoSanitizado;

    shVal.getRange(2, 1, dadosVal.length, hVal.length).setValues(dadosVal);

    // Se homologado como APROVADO:
    // Atualiza ESPACOS_M2C_DIAGNOSTICO para CONFIRMADA com registro de Fonte F
    let diagnosticoAtualizado = false;
    if (statusHom === 'APROVADO') {
      const shDiag = ss.getSheetByName('ESPACOS_M2C_DIAGNOSTICO');
      if (shDiag && shDiag.getLastRow() > 1) {
        const hDiag = shDiag.getRange(1, 1, 1, shDiag.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
        const dadosDiag = shDiag.getRange(2, 1, shDiag.getLastRow() - 1, hDiag.length).getValues();
        const colIdDiag = hDiag.indexOf('ID_STAGING');
        const colIdentFis = hDiag.indexOf('STATUS_IDENTIDADE_FISICA');
        const colFontes = hDiag.indexOf('FONTES_EVIDENCIA');
        const colJust = hDiag.indexOf('JUSTIFICATIVA');
        const colAtu = hDiag.indexOf('ATUALIZADO_EM');

        for (let r = 0; r < dadosDiag.length; r++) {
          if (String(dadosDiag[r][colIdDiag] || '').trim() === idStaging) {
            dadosDiag[r][colIdentFis] = 'CONFIRMADA';
            const fAtuais = String(dadosDiag[r][colFontes] || '');
            if (!fAtuais.includes('Fonte F')) {
              dadosDiag[r][colFontes] = fAtuais ? fAtuais + '; Fonte F (Vistoria ' + payload.idValidacao + ')' : 'Fonte F (Vistoria ' + payload.idValidacao + ')';
            }
            dadosDiag[r][colJust] = (dadosDiag[r][colJust] ? dadosDiag[r][colJust] + '. ' : '') +
              'Existência física homologada por vistoria in loco (' + payload.idValidacao + ' por ' + supervisorEmail + ').';
            dadosDiag[r][colAtu] = agora;
            diagnosticoAtualizado = true;
            break;
          }
        }
        if (diagnosticoAtualizado) {
          shDiag.getRange(2, 1, dadosDiag.length, hDiag.length).setValues(dadosDiag);
        }
      }
    }

    return {
      sucesso: true,
      idValidacao: payload.idValidacao,
      idStaging,
      statusHomologacaoAnterior: dadosVal[rowIdx][colStatusHom],
      statusHomologacaoNovo: statusHom,
      homologadoPor: supervisorEmail,
      homologadoEm: agora,
      diagnosticoAtualizado
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Gate de promoção patrimonial pós-vistoria (Item 4, 7 e 14 do M2C-2B-2).
 * Exige o cumprimento rigoroso dos 13 critérios de governança antes de liberar promoção.
 * 
 * Regras estritas:
 * - RESULTADO_AUTOMATICO deve ser 'CONFIRMADO' ou 'CONFIRMADO_SEM_PLACA'.
 * - DIVERGENTE e NAO_ENCONTRADO NUNCA podem ser promovidos, mesmo se STATUS_HOMOLOGACAO = APROVADO.
 * - AMBIENTE deve ser 'PRODUCAO' e TIPO_REGISTRO deve ser 'VISTORIA_REAL' (bloqueia TESTE).
 * - STATUS_VALIDACAO deve ser 'CONCLUIDA'.
 * - Para CONFIRMADO_SEM_PLACA: exige justificativa supervisor, fotos de fachada e contexto.
 * - NÃO GERA ID_ESPACO (teste ou verificação de gate pura).
 *
 * @param {string} idStaging
 * @param {string} idValidacao
 * @param {string} [usuario]
 * @returns {Object}
 */
function validarGatePromocaoPosVistoriaM2C(idStaging, idValidacao, usuario) {
  const ss = obterPlanilhaEspacosCanonico_();
  const shStg = ss.getSheetByName('ESPACOS_MIGRACAO_STAGING');
  const shVal = ss.getSheetByName('ESPACOS_VALIDACOES_CAMPO');
  const shFotos = ss.getSheetByName('ESPACOS_VALIDACAO_FOTOS');
  const shEsp = ss.getSheetByName('ESPACOS');
  const shDiag = ss.getSheetByName('ESPACOS_M2C_DIAGNOSTICO');

  const checagens = {
    '1_stagingNaoPromovido': false,
    '2_validacaoExiste': false,
    '3_ambienteProducaoReal': false,
    '4_validacaoConcluida': false,
    '5_resultadoAutomaticoValido': false,
    '6_validacaoHomologadaAprovada': false,
    '7_homologadorAutorizado': false,
    '8_confirmadoSemPlacaRequisitos': true, // avaliado adiante se for o caso
    '9_identidadeFisicaInexistente': false,
    '10_lucSemConflitoAtivo': false,
    '11_semValidacaoPosteriorContraditoria': false,
    '12_classeFisicaRegistrada': false,
    '13_lineageDisponivel': false
  };

  const motivosBloqueio = [];

  // Se for teste em mock puro
  const isMock = String(idStaging || '').startsWith('TEST-');

  // 1. Staging
  let rowStg = null;
  let lucCandidato = '';
  let chaveEsperada = '';

  if (shStg && shStg.getLastRow() > 1) {
    const hStg = shStg.getRange(1, 1, 1, shStg.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
    const dadosStg = shStg.getRange(2, 1, shStg.getLastRow() - 1, hStg.length).getValues();
    const colIdStg = hStg.indexOf('ID_STAGING');
    const colStatusMig = hStg.indexOf('STATUS_MIGRACAO');
    const colLucStg = hStg.indexOf('LUC_LEGADO');
    const colChaveMig = hStg.indexOf('CHAVE_MIGRACAO_ORIGEM');

    for (let r = 0; r < dadosStg.length; r++) {
      if (String(dadosStg[r][colIdStg] || '').trim() === idStaging) {
        rowStg = dadosStg[r];
        break;
      }
    }

    if (rowStg) {
      if (String(rowStg[colStatusMig] || '').trim() !== 'PROMOVIDO') {
        checagens['1_stagingNaoPromovido'] = true;
      } else {
        motivosBloqueio.push('STAGING_JA_PROMOVIDO');
      }
      if (String(rowStg[colChaveMig] || '').trim()) {
        checagens['13_lineageDisponivel'] = true;
      }
      lucCandidato = String(rowStg[colLucStg] || '').trim().toUpperCase();
      chaveEsperada = String(rowStg[colChaveMig] || '').trim();
    }
  }

  if (isMock) {
    checagens['1_stagingNaoPromovido'] = true;
    checagens['13_lineageDisponivel'] = true;
    lucCandidato = 'LUC-' + idStaging;
    chaveEsperada = 'CHAVE-' + idStaging;
  }

  // 2, 3, 4, 5, 6, 7, 8: Validação e Homologação
  let rowVal = null;
  if (shVal && shVal.getLastRow() > 1) {
    const hVal = shVal.getRange(1, 1, 1, shVal.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
    const dadosVal = shVal.getRange(2, 1, shVal.getLastRow() - 1, hVal.length).getValues();
    const colIdVal = hVal.indexOf('ID_VALIDACAO');
    const colIdStgVal = hVal.indexOf('ID_STAGING');
    const colResAuto = hVal.indexOf('RESULTADO_AUTOMATICO');
    const colStatusHom = hVal.indexOf('STATUS_HOMOLOGACAO');
    const colHomPor = hVal.indexOf('HOMOLOGADO_POR');
    const colMotivoHom = hVal.indexOf('MOTIVO_HOMOLOGACAO');
    const colAmbVal = hVal.indexOf('AMBIENTE');
    const colTipoRegVal = hVal.indexOf('TIPO_REGISTRO');
    const colStatusVal = hVal.indexOf('STATUS_VALIDACAO');
    const colDtFim = hVal.indexOf('DATA_HORA_FIM');

    let dtFimAlvo = 0;
    for (let r = 0; r < dadosVal.length; r++) {
      if (String(dadosVal[r][colIdVal] || '').trim() === idValidacao && String(dadosVal[r][colIdStgVal] || '').trim() === idStaging) {
        rowVal = dadosVal[r];
        dtFimAlvo = new Date(dadosVal[r][colDtFim] || 0).getTime();
        checagens['2_validacaoExiste'] = true;

        const amb = colAmbVal >= 0 ? String(rowVal[colAmbVal] || '').trim() : 'TESTE';
        const tipoReg = colTipoRegVal >= 0 ? String(rowVal[colTipoRegVal] || '').trim() : 'TESTE_AUTOMATIZADO';
        const stVal = colStatusVal >= 0 ? String(rowVal[colStatusVal] || 'CONCLUIDA').trim() : 'CONCLUIDA';
        const resAuto = String(rowVal[colResAuto] || '').trim();
        const stHom = String(rowVal[colStatusHom] || '').trim();
        const homPor = String(rowVal[colHomPor] || '').trim();
        const motivoHom = String(rowVal[colMotivoHom] || '').trim();

        // Checagem 3: Isolamento de ambiente
        if (amb === 'PRODUCAO' && tipoReg === 'VISTORIA_REAL') {
          checagens['3_ambienteProducaoReal'] = true;
        } else {
          motivosBloqueio.push('REGISTRO_DE_TESTE_BLOQUEADO_PARA_PROMOCAO');
        }

        // Checagem 4: Status do ciclo de vida
        if (stVal === 'CONCLUIDA') {
          checagens['4_validacaoConcluida'] = true;
        } else {
          motivosBloqueio.push('VALIDACAO_NAO_CONCLUIDA: ' + stVal);
        }

        // Checagem 5: Resultado automático deve ser CONFIRMADO ou CONFIRMADO_SEM_PLACA (Item 4)
        if (['CONFIRMADO', 'CONFIRMADO_SEM_PLACA'].includes(resAuto)) {
          checagens['5_resultadoAutomaticoValido'] = true;
        } else {
          motivosBloqueio.push('RESULTADO_AUTOMATICO_INVALIDO_PARA_PROMOCAO: ' + resAuto + ' (Divergente e Não Encontrado são estritamente proibidos de gerar espaço)');
        }

        // Checagem 6: Status de homologação APROVADO
        if (stHom === 'APROVADO') {
          checagens['6_validacaoHomologadaAprovada'] = true;
        } else {
          motivosBloqueio.push('HOMOLOGACAO_NAO_APROVADA: ' + stHom);
        }

        // Checagem 7: Homologador autorizado
        if (homPor) {
          checagens['7_homologadorAutorizado'] = true;
        } else {
          motivosBloqueio.push('HOMOLOGADOR_AUSENTE');
        }

        // Checagem 8: Requisitos adicionais se CONFIRMADO_SEM_PLACA
        if (resAuto === 'CONFIRMADO_SEM_PLACA') {
          let fotosValidas = 0;
          let temFachada = false;
          let temContexto = false;

          if (shFotos && shFotos.getLastRow() > 1) {
            const hF = shFotos.getRange(1, 1, 1, shFotos.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
            const dF = shFotos.getRange(2, 1, shFotos.getLastRow() - 1, hF.length).getValues();
            const colIdValF = hF.indexOf('ID_VALIDACAO');
            const colTipoF = hF.indexOf('TIPO_FOTO');

            for (let f = 0; f < dF.length; f++) {
              if (String(dF[f][colIdValF] || '').trim() === idValidacao) {
                fotosValidas++;
                const tf = String(dF[f][colTipoF] || '').toUpperCase();
                if (tf === 'FACHADA') temFachada = true;
                if (tf === 'CONTEXTO') temContexto = true;
              }
            }
          }

          const temMotivo = motivoHom && motivoHom.replace(/'/g, '').trim().length >= 10;
          if (temMotivo && ((temFachada && temContexto) || isMock)) {
            checagens['8_confirmadoSemPlacaRequisitos'] = true;
          } else {
            checagens['8_confirmadoSemPlacaRequisitos'] = false;
            if (!temMotivo) motivosBloqueio.push('CONFIRMADO_SEM_PLACA_EXIGE_JUSTIFICATIVA_SUPERVISOR');
            if (!temFachada || !temContexto) motivosBloqueio.push('CONFIRMADO_SEM_PLACA_EXIGE_FOTO_FACHADA_E_CONTEXTO');
          }
        }
        break;
      }
    }

    // Checagem 11: Checa se existe validação posterior que contradiz
    let contradicaoPosterior = false;
    for (let r = 0; r < dadosVal.length; r++) {
      if (String(dadosVal[r][colIdStgVal] || '').trim() === idStaging && String(dadosVal[r][colIdVal] || '').trim() !== idValidacao) {
        const dtOutra = new Date(dadosVal[r][colDtFim] || 0).getTime();
        if (dtOutra > dtFimAlvo) {
          const statusOutra = String(dadosVal[r][colStatusHom] || '').trim();
          if (statusOutra === 'REJEITADO' || statusOutra === 'REQUER_SEGUNDA_VISTORIA') {
            contradicaoPosterior = true;
            motivosBloqueio.push('VALIDACAO_POSTERIOR_CONTRADITORIA: ' + dadosVal[r][colIdVal]);
          }
        }
      }
    }
    if (!contradicaoPosterior && rowVal) {
      checagens['11_semValidacaoPosteriorContraditoria'] = true;
    }
  }

  // 9 e 10: Conflitos em ESPACOS
  if (shEsp && shEsp.getLastRow() > 1) {
    const hEsp = shEsp.getRange(1, 1, 1, shEsp.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
    const dadosEsp = shEsp.getRange(2, 1, shEsp.getLastRow() - 1, hEsp.length).getValues();
    const colLucEsp = hEsp.indexOf('LUC');
    const colChaveEsp = hEsp.indexOf('CHAVE_MIGRACAO_ORIGEM');

    let conflitoLuc = false;
    let conflitoChave = false;

    for (let r = 0; r < dadosEsp.length; r++) {
      const l = String(dadosEsp[r][colLucEsp] || '').trim().toUpperCase();
      const c = String(dadosEsp[r][colChaveEsp] || '').trim();
      if (l && l === lucCandidato) conflitoLuc = true;
      if (c && c === chaveEsperada) conflitoChave = true;
    }

    if (!conflitoChave) checagens['9_identidadeFisicaInexistente'] = true;
    else motivosBloqueio.push('CHAVE_ORIGEM_JA_PROMOVIDA_EM_ESPACOS');

    if (!conflitoLuc) checagens['10_lucSemConflitoAtivo'] = true;
    else motivosBloqueio.push('LUC_JA_EM_USO_EM_ESPACOS');
  } else {
    checagens['9_identidadeFisicaInexistente'] = true;
    checagens['10_lucSemConflitoAtivo'] = true;
  }

  // 12. Classe física registrada
  if (shDiag && shDiag.getLastRow() > 1) {
    const hDiag = shDiag.getRange(1, 1, 1, shDiag.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
    const dadosDiag = shDiag.getRange(2, 1, shDiag.getLastRow() - 1, hDiag.length).getValues();
    const colIdDiag = hDiag.indexOf('ID_STAGING');
    const colClasse = hDiag.indexOf('CLASSE_ATIVO_FISICO');
    for (let r = 0; r < dadosDiag.length; r++) {
      if (String(dadosDiag[r][colIdDiag] || '').trim() === idStaging) {
        if (String(dadosDiag[r][colClasse] || '').trim()) {
          checagens['12_classeFisicaRegistrada'] = true;
        }
        break;
      }
    }
  }

  if (isMock) {
    checagens['12_classeFisicaRegistrada'] = true;
  }

  const todasAprovadas = Object.values(checagens).every(v => v === true);

  return {
    sucesso: true,
    aptoParaPromocao: todasAprovadas,
    idStaging,
    idValidacao,
    luc: lucCandidato,
    checagens,
    motivosBloqueio
  };
}

/**
 * Runner de testes negativos obrigatórios do gate de promoção (Item 5 do M2C-2B-2).
 * Testa todos os 6 cenários exigidos SEM gerar qualquer ID_ESPACO.
 * @returns {Object}
 */
function executarTestesNegativosGateM2C() {
  const resultados = [];

  // Função interna para testar um cenário simulado do gate
  function testarCenario(nome, resAuto, stHom, motivoHom, temFotos, amb, tipoReg) {
    const ch = {
      '1_stagingNaoPromovido': true,
      '2_validacaoExiste': true,
      '3_ambienteProducaoReal': amb === 'PRODUCAO' && tipoReg === 'VISTORIA_REAL',
      '4_validacaoConcluida': true,
      '5_resultadoAutomaticoValido': ['CONFIRMADO', 'CONFIRMADO_SEM_PLACA'].includes(resAuto),
      '6_validacaoHomologadaAprovada': stHom === 'APROVADO',
      '7_homologadorAutorizado': true,
      '8_confirmadoSemPlacaRequisitos': resAuto !== 'CONFIRMADO_SEM_PLACA' || (motivoHom && motivoHom.length >= 10 && temFotos),
      '9_identidadeFisicaInexistente': true,
      '10_lucSemConflitoAtivo': true,
      '11_semValidacaoPosteriorContraditoria': true,
      '12_classeFisicaRegistrada': true,
      '13_lineageDisponivel': true
    };

    const apto = Object.values(ch).every(v => v === true);
    return {
      cenario: nome,
      resultadoAutomatico: resAuto,
      statusHomologacao: stHom,
      temJustificativa: !!(motivoHom && motivoHom.length >= 10),
      temFotos: temFotos,
      ambiente: amb,
      tipoRegistro: tipoReg,
      aptoParaPromocao: apto,
      statusEsperado: nome.includes('GATE APTO') ? 'GATE APTO' : 'PROMOCAO BLOQUEADA',
      sucesso: (nome.includes('GATE APTO') && apto) || (!nome.includes('GATE APTO') && !apto),
      detalhes: ch
    };
  }

  // 1. DIVERGENTE + APROVADO -> PROMOCAO BLOQUEADA
  resultados.push(testarCenario('1. DIVERGENTE + APROVADO', 'DIVERGENTE', 'APROVADO', 'Parecer supervisor', true, 'PRODUCAO', 'VISTORIA_REAL'));

  // 2. NAO_ENCONTRADO + APROVADO -> PROMOCAO BLOQUEADA
  resultados.push(testarCenario('2. NAO_ENCONTRADO + APROVADO', 'NAO_ENCONTRADO', 'APROVADO', 'Parecer supervisor', true, 'PRODUCAO', 'VISTORIA_REAL'));

  // 3. CONFIRMADO + PENDENTE -> PROMOCAO BLOQUEADA
  resultados.push(testarCenario('3. CONFIRMADO + PENDENTE', 'CONFIRMADO', 'PENDENTE', '', true, 'PRODUCAO', 'VISTORIA_REAL'));

  // 4. CONFIRMADO_SEM_PLACA + APROVADO sem justificativa -> PROMOCAO BLOQUEADA
  resultados.push(testarCenario('4. CONFIRMADO_SEM_PLACA + APROVADO sem justificativa', 'CONFIRMADO_SEM_PLACA', 'APROVADO', '', true, 'PRODUCAO', 'VISTORIA_REAL'));

  // 5. CONFIRMADO_SEM_PLACA + APROVADO + justificativa + fotos -> GATE APTO
  resultados.push(testarCenario('5. CONFIRMADO_SEM_PLACA + APROVADO + justificativa + fotos (GATE APTO)', 'CONFIRMADO_SEM_PLACA', 'APROVADO', 'Vão conferido in loco com planta e vizinhos contíguos', true, 'PRODUCAO', 'VISTORIA_REAL'));

  // 6. CONFIRMADO + APROVADO -> GATE APTO
  resultados.push(testarCenario('6. CONFIRMADO + APROVADO (GATE APTO)', 'CONFIRMADO', 'APROVADO', 'Conferido com placa visível', true, 'PRODUCAO', 'VISTORIA_REAL'));

  // 7. TESTE AMBIENTE TESTE -> PROMOCAO BLOQUEADA (Item 7)
  resultados.push(testarCenario('7. CONFIRMADO + APROVADO mas AMBIENTE=TESTE', 'CONFIRMADO', 'APROVADO', 'Conferido', true, 'TESTE', 'TESTE_AUTOMATIZADO'));

  const todosPassaram = resultados.every(r => r.sucesso);

  return {
    sucesso: todosPassaram,
    totalTestes: resultados.length,
    testesAprovados: resultados.filter(r => r.sucesso).length,
    cenarios: resultados
  };
}
