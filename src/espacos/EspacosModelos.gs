/**
 * SINALIZAÇÃO DO MALL — GESTÃO DE ESPAÇOS FÍSICOS (M2B-0 / M2B)
 * Módulo: EspacosModelos.gs
 * Objetivo: Modelos de dados, schemas canônicos, enums controlados e contratos de interface.
 * Runtime: Google Apps Script (V8 Engine)
 *
 * REGRA DE SOBERANIA ARQUITETURAL:
 * Este projeto/serviço canônico é o ÚNICO escritor e alocador autorizado de ID_ESPACO em todo o ecossistema.
 * Nenhum outro módulo (ex.: Gestão de Lojistas, Cartografia, AppSheet) possui autorização para gerar
 * ID_ESPACO de forma independente; qualquer nova entidade física imobiliária deve ser solicitada e criada
 * exclusivamente através deste serviço canônico.
 */

const ESPACOS_CONFIG = Object.freeze({
  SHEET_ESPACOS: 'ESPACOS',
  SHEET_INFRAESTRUTURA: 'ESPACO_INFRAESTRUTURA',
  SHEET_BLOQUEIOS: 'BLOQUEIOS_ESPACO',
  SHEET_IDENTIFICADORES: 'ESPACO_IDENTIFICADORES',
  SHEET_STAGING: 'ESPACOS_MIGRACAO_STAGING',
  SHEET_LEDGER: 'ESPACOS_MIGRACAO_LEDGER',
  SHEET_LOJAS_MAPA: 'LOJAS_MAPA',

  PREFIXO_ID_ESPACO: 'ESP-',
  PREFIXO_ID_BLOQUEIO: 'BLQ-',
  PREFIXO_ID_IDENTIFICADOR: 'IDE-',
  PREFIXO_ID_STAGING: 'STG-',
  PAD_DIGITOS_ID: 6,

  // Chaves de Propriedades de Script (ScriptProperties - soberania global do projeto)
  CHAVE_PROP_SEQUENCIAL_ESPACO: 'M2_SEQUENCIAL_ESPACO',
  CHAVE_PROP_SEQUENCIAL_BLOQUEIO: 'M2_SEQUENCIAL_BLOQUEIO',
  CHAVE_PROP_SEQUENCIAL_IDENTIFICADOR: 'M2_SEQUENCIAL_IDENTIFICADOR',
  CHAVE_PROP_SEQUENCIAL_STAGING: 'M2_SEQUENCIAL_STAGING',
  CHAVE_PROP_CHECKPOINT_MIGRACAO: 'M2_CHECKPOINT_MIGRACAO',

  // Configuração Soberana de Topologia Canônica
  SPREADSHEET_ID_CANONICO_ESPACOS: '1j5bYY-0JpbLd95FyV19lyRPSG6j9kpoM8UCCWZjKchs',
  SPREADSHEET_ID_CANONICO_CARTOGRAFIA: '1j5bYY-0JpbLd95FyV19lyRPSG6j9kpoM8UCCWZjKchs',
  CHAVE_PROP_SPREADSHEET_ID_ESPACOS: 'M2_SPREADSHEET_ID_ESPACOS',
  CHAVE_PROP_SPREADSHEET_ID_CARTOGRAFIA: 'M2_SPREADSHEET_ID_CARTOGRAFIA',

  LOCK_TIMEOUT_MS: 30000,
  VERSAO_MIGRACAO: 'M2B-2026-09-24',
  VERSAO_RECONCILIADOR: 'REC-2026-09-24-V1',
  SNAPSHOT_ORIGEM_PADRAO: 'SNAP-LOJISTAS-20260924-E8F9A1B2',
  TIMEZONE: 'America/Fortaleza',
  TAMANHO_LOTE_PADRAO: 200,
  MAX_TEMPO_EXECUCAO_MS: 240000 // 4 minutos de teto para respeitar limite de 6 min do Apps Script
});

/**
 * Resolver explícito da Planilha Canônica de Espaços (Domínio Físico / CEOP).
 * NUNCA utiliza SpreadsheetApp.getActive() como decisão cega de destino.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function obterPlanilhaEspacosCanonico_() {
  const props = PropertiesService.getScriptProperties();
  const idConfigurado = props.getProperty(ESPACOS_CONFIG.CHAVE_PROP_SPREADSHEET_ID_ESPACOS) || ESPACOS_CONFIG.SPREADSHEET_ID_CANONICO_ESPACOS;
  if (!idConfigurado) throw new Error('SPREADSHEET_ID_ESPACOS_NAO_CONFIGURADO: ID da planilha canônica de espaços não definido.');

  try {
    const ativa = SpreadsheetApp.getActive();
    if (ativa && ativa.getId() === idConfigurado) return ativa;
  } catch (_) {}

  return SpreadsheetApp.openById(idConfigurado);
}

/**
 * Resolver explícito da Planilha Canônica de Cartografia (LOJAS_MAPA / CEOP).
 * NUNCA utiliza SpreadsheetApp.getActive() como decisão cega de destino.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function obterPlanilhaCartografiaCanonico_() {
  const props = PropertiesService.getScriptProperties();
  const idConfigurado = props.getProperty(ESPACOS_CONFIG.CHAVE_PROP_SPREADSHEET_ID_CARTOGRAFIA) || ESPACOS_CONFIG.SPREADSHEET_ID_CANONICO_CARTOGRAFIA;
  if (!idConfigurado) throw new Error('SPREADSHEET_ID_CARTOGRAFIA_NAO_CONFIGURADO: ID da planilha de cartografia não definido.');

  try {
    const ativa = SpreadsheetApp.getActive();
    if (ativa && ativa.getId() === idConfigurado) return ativa;
  } catch (_) {}

  return SpreadsheetApp.openById(idConfigurado);
}

/**
 * Schemas Canônicos das Abas
 */
const ESPACOS_HEADERS = Object.freeze([
  'ID_ESPACO',              // PK imutável independente de LUC (ex: 'ESP-000001')
  'LUC',                    // Cache/referência comercial atual (nullable)
  'SETOR',                  // Setor físico/mall (ex: 'SETOR AMARELO')
  'RUA',                    // Corredor / Rua física
  'NUMERO',                 // Número cadastral da unidade física
  'CLASSE_ESPACO',          // Função/natureza física: COMERCIAL | TECNICO | OPERACIONAL | CIRCULACAO | MIDIA | AREA_EVENTO | EVENTO | APOIO_LOGISTICO | OUTRO
  'ELEGIVEL_RESERVA',       // Regra comercial de elegibilidade: 'SIM' | 'NAO'
  'TIPO_ESPACO_FISICO',     // Tipologia arquitetural normalizada: BOX | MINIBOX | LOJA | MEGALOJA | QUIOSQUE | STAND_MALL | AREA_ABERTA | PONTO_PROMOCIONAL | DOCA | SHAFT_TECNICO | OUTRO
  'SUBTIPO_ESPACO_FISICO',  // Subtipo arquitetural normalizado
  'TIPO_LEGADO',            // Preservação do valor original legado
  'SUBTIPO_LEGADO',         // Preservação do valor original legado
  'ESTADO_CADASTRAL',       // Ciclo de vida patrimonial: ATIVO | INATIVO | DESATIVADO
  'ORIGEM_DADOS',           // Proveniência: MIGRACAO_LEGADO_2026 | LEVANTAMENTO_CAMPO_CEOP | MANUAL
  'CONFIANCA_CADASTRO',     // Grau de certeza geral: DETERMINISTICO | ALTA_CONFIANCA | ESTIMADO | DECLARADO
  'CONFIANCA_IDENTIDADE',   // Certeza da existência física do ativo: DETERMINISTICO | ALTA_CONFIANCA | REQUER_REVISAO | NAO_MIGRAR
  'CONFIANCA_ATRIBUTOS',    // Certeza das medições/atributos técnicos: DETERMINISTICO | ESTIMADO | DECLARADO | REQUER_REVISAO
  'CONFIANCA_TIPOLOGIA',    // Certeza da classificação arquitetural: NORMALIZADO | ORIGINAL_PRESERVADO | REQUER_REVISAO
  'CHAVE_MIGRACAO_ORIGEM',  // Chave de idempotência de migração para sobrevivência a falhas intermediárias (ex: 'SNAP-...::REG-...')
  'CRIADO_EM',              // Data ISO de criação do registro no novo sistema
  'DATA_ORIGEM_ATIVO',      // Data física original histórica (se conhecida, nullable)
  'ATUALIZADO_EM',          // Timestamp ISO da última alteração
  'ATUALIZADO_POR',         // Usuário responsável pela alteração
  'OBSERVACOES'             // Observações gerais
]);

const ESPACO_IDENTIFICADORES_HEADERS = Object.freeze([
  'ID_IDENTIFICADOR',       // PK única da identificação (ex: 'IDE-000001')
  'ID_ESPACO',              // FK para ESPACOS.ID_ESPACO
  'TIPO_IDENTIFICADOR',     // 'LUC' | 'NUMERO_ANTERIOR' | 'CODIGO_PROJETO' | 'ALVARA' | 'IPTU' | 'OUTRO'
  'VALOR',                  // Valor do identificador (ex: 'AVALN2121')
  'VALIDO_DESDE',           // Início da vigência deste código
  'VALIDO_ATE',             // Fim da vigência (nullable se atual)
  'ATUAL',                  // 'SIM' | 'NAO' (pode haver mais de um 'SIM' em casos de unificação/fusão legítima)
  'PRINCIPAL',              // 'SIM' | 'NAO' (exatamente um identificador principal por espaço)
  'ORIGEM',                 // Origem da atribuição (ex: 'BASE_MESTRE_LOJISTAS', 'RENUMERACAO_2026', 'FUSAO_BOXES')
  'CRIADO_EM',              // Data de registro
  'CRIADO_POR',             // Usuário responsável
  'OBSERVACOES'             // Notas sobre fusão, desmembramento ou renumeração
]);

const ESPACO_INFRAESTRUTURA_HEADERS = Object.freeze([
  'ID_ESPACO',              // PK e FK 1:1 para ESPACOS.ID_ESPACO
  'AREA_M2',                // Área útil em metros quadrados (Float, m²)
  'LARGURA_M',              // Largura da frente em metros (Float, m)
  'PROFUNDIDADE_M',         // Profundidade em metros (Float, m)
  'PE_DIREITO_M',           // Pé-direito livre em metros (Float, m)
  'TESTEIRA_M',             // Fachada/testeira em metros (Float, m)
  'ALTURA_PORTA_M',         // Altura útil de porta/vão em metros (Float, m)
  'CARGA_PISO_KGF_M2',      // Capacidade de carga do piso em kgf/m² (Float)
  'VOLTAGEM_V',             // Tensão nominal em Volts (Int: 127, 220, 380 ou null)
  'POTENCIA_KVA',           // Potência máxima instalada em kVA (Float)
  'DISJUNTOR_A',            // Corrente do disjuntor em Ampères (Int, A)
  'PONTOS_ELETRICOS_QTD',   // Quantidade de tomadas/pontos elétricos (Int)
  'AGUA_POTAVEL',           // Ponto de água: 'SIM' | 'NAO' | 'NAO_VERIFICADO'
  'ESGOTO',                 // Ponto de esgoto: 'SIM' | 'NAO' | 'NAO_VERIFICADO'
  'CAIXA_GORDURA',          // Caixa de gordura conectada: 'SIM' | 'NAO' | 'NAO_VERIFICADO'
  'PONTO_FIBRA',            // Ponto de fibra/dados: 'SIM' | 'NAO' | 'NAO_VERIFICADO'
  'CLIMATIZACAO',           // 'CENTRAL' | 'SPLIT' | 'VENTILACAO_NATURAL' | 'NENHUMA' | 'NAO_VERIFICADO'
  'SISTEMA_EXAUSTAO',       // Sistema mecânico de exaustão: 'SIM' | 'NAO' | 'NAO_VERIFICADO'
  'DETECTORES_INCENDIO',    // Sprinklers / detectores: 'SIM' | 'NAO' | 'NAO_VERIFICADO'
  'ORIGEM_DADOS',           // 'MIGRACAO_LEGADO' | 'LEVANTAMENTO_CAMPO_CEOP' | 'PROJETO_ARQUITETURA'
  'DATA_LEVANTAMENTO',      // Data da vistoria física (ISO)
  'RESPONSAVEL_TECNICO',    // Engenheiro/técnico que realizou medição
  'ATUALIZADO_EM',          // Timestamp ISO da atualização
  'OBSERVACOES_TECNICAS'    // Detalhes técnicos e restrições estruturais
]);

const BLOQUEIOS_ESPACO_HEADERS = Object.freeze([
  'ID_BLOQUEIO',            // PK única do bloqueio (ex: 'BLQ-000001')
  'ID_ESPACO',              // FK para ESPACOS.ID_ESPACO
  'TIPO_BLOQUEIO',          // Natureza técnica do impedimento
  'DATA_HORA_INICIO',       // Início do bloqueio (ISO Datetime)
  'DATA_HORA_FIM',          // Previsão de término ou conclusão (ISO Datetime)
  'BLOQUEIA_RESERVA',       // 'SIM' | 'NAO' (impede novas intenções)
  'BLOQUEIA_OCUPACAO',      // 'SIM' | 'NAO' (impede funcionamento da loja)
  'BLOQUEIA_MONTAGEM',      // 'SIM' | 'NAO' (impede montagem e prestadores)
  'SEVERIDADE',             // 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  'STATUS',                 // 'PROGRAMADO' | 'VIGENTE' | 'CONCLUIDO' | 'CANCELADO'
  'MOTIVO',                 // Descrição objetiva da causa
  'ORIGEM_BLOQUEIO',        // 'CEOP_OPERACIONAL' | 'ORDEM_SERVICO' | 'MANUTENCAO' | 'DIRETORIA' | 'EXTERNO'
  'ID_REGISTRO_CEOP',       // FK opcional para REGISTROS (ex: 'SIG-...')
  'NUMERO_AS',              // Número da Autorização de Serviço vinculada
  'RESPONSAVEL',            // Técnico ou encarregado responsável
  'CRIADO_EM',              // Data de abertura do bloqueio
  'CRIADO_POR',             // E-mail do criador
  'CONCLUIDO_EM',           // Data real de liberação/conclusão
  'CONCLUIDO_POR',          // E-mail de quem encerrou o bloqueio
  'OBSERVACOES'             // Notas de acompanhamento
]);

const ESPACOS_STAGING_HEADERS = Object.freeze([
  'ID_STAGING',             // PK de staging (ex: 'STG-000001')
  'ID_SNAPSHOT_ORIGEM',     // ID imutável do snapshot (ex: 'SNAP-LOJISTAS-20260924-E8F9A1B2')
  'ID_REGISTRO_ORIGEM',     // Chave determinística estável do registro na origem (ex: 'REG-3B9A7F1C82D4E5A0')
  'FONTE_ORIGEM',           // Ex: 'BASE_LOJISTAS_CENTRO_FASHION'
  'CHAVE_ORIGEM',           // Identificador de negócio ou fallback estável
  'CHAVE_MIGRACAO_ORIGEM',  // Chave composta para idempotência: `${ID_SNAPSHOT_ORIGEM}::${ID_REGISTRO_ORIGEM}`
  'LINHA_ORIGEM',           // Número da linha física na planilha/CSV fonte (metadado não-identificador)
  'HASH_ORIGEM',            // SHA-256 do conteúdo canônico bruto para detecção de alteração/idempotência
  'LUC_LEGADO',             // LUC original
  'SETOR_LEGADO',           // Setor original
  'RUA_LEGADA',             // Rua original
  'NUMERO_LEGADO',          // Número extraído/original
  'TIPO_LEGADO',            // Tipo original
  'SUBTIPO_LEGADO',         // Subtipo original
  'STATUS_LEGADO',          // Status original (ex: 'Ativa')
  'DISPONIBILIDADE_LEGADA', // Disponibilidade original (ex: 'Ocupada')
  'DIAGNOSTICO',            // 'CRIAR_ESPACO' | 'VINCULAR_EXISTENTE' | 'DUPLICADO' | 'COMPOSTO' | 'NAO_FISICO' | 'AREA_TECNICA' | 'REQUER_REVISAO' | 'ERRO_REFERENCIAL'
  'GRAU_CONFIANCA',         // Grau resumo: 'DETERMINISTICO' | 'ALTA_CONFIANCA' | 'REQUER_REVISAO' | 'NAO_MIGRAR'
  'CONFIANCA_IDENTIDADE',   // Certeza da existência física do ativo
  'CONFIANCA_ATRIBUTOS',    // Certeza das medições/atributos técnicos
  'CONFIANCA_TIPOLOGIA',    // Certeza da classificação arquitetural
  'ID_LOJA_MAPA',           // ID do pino cartográfico conciliado (nullable)
  'ID_ESPACO_GERADO',       // ID_ESPACO atribuído após promoção (nullable)
  'STATUS_MIGRACAO',        // 'PENDENTE' | 'CLASSIFICADO' | 'VALIDADO' | 'PROMOVIDO' | 'VINCULADO_MAPA' | 'CONCLUIDO' | 'FALHA' | 'IGNORADO'
  'VERSAO_MIGRACAO',        // Versão da regra de migração executada
  'PROCESSADO_EM',          // Data/hora da execução do lote
  'PROCESSADO_POR',         // Usuário ou processo responsável
  'OBSERVACAO_REVISAO'      // Justificativa e alertas
]);

const ESPACOS_LEDGER_HEADERS = Object.freeze([
  'ID_SNAPSHOT_ORIGEM',     // ID imutável do snapshot de origem (ex: 'SNAP-LOJISTAS-20260924-E8F9A1B2')
  'ID_REGISTRO_ORIGEM',     // Chave determinística do registro dentro do snapshot
  'CHAVE_MIGRACAO_ORIGEM',  // `${ID_SNAPSHOT_ORIGEM}::${ID_REGISTRO_ORIGEM}`
  'ID_STAGING',             // FK para ESPACOS_MIGRACAO_STAGING
  'ID_ESPACO',              // FK e identidade soberana para ESPACOS
  'LUC',                    // LUC principal no momento da promoção
  'SETOR',                  // Setor físico
  'HASH_ORIGEM',            // SHA-256 do conteúdo bruto no momento do snapshot
  'VERSAO_REGRA',           // Versão da regra / reconciliador (ex: 'M2B-2026-09-24')
  'PROMOVIDO_EM',           // Timestamp ISO da promoção
  'PROMOVIDO_POR'           // Usuário ou processo que realizou a promoção
]);

/**
 * Enums e Domínios Controlados
 */
const ESPACOS_ENUMS = Object.freeze({
  CLASSE_ESPACO: Object.freeze([
    'COMERCIAL',            // Espaço destinado à exploração de comércio/serviços
    'TECNICO',              // Shafts, subestações, barramentos, reservatórios
    'OPERACIONAL',          // Apoio de limpeza, segurança, salas operacionais
    'CIRCULACAO',           // Corredores, halls, rampas, escadas, calçadas
    'MIDIA',                // Totens, painéis de led, empenas publicitárias
    'AREA_EVENTO',          // Praças e áreas arquitetônicas permanentes de eventos
    'EVENTO',               // Sinônimo canônico de área física de evento (desacoplado de reserva/ocupação temporária)
    'APOIO_LOGISTICO',      // Docas de carga/descarga, triagem de mercadorias
    'OUTRO'                 // Outras classes não cobertas
  ]),

  ELEGIVEL_RESERVA: Object.freeze([
    'SIM',                  // Pode ser reservado/comercializado no motor de reservas
    'NAO'                   // Bloqueado para comercialização (ex: área técnica/circulação)
  ]),

  TIPO_ESPACO_FISICO: Object.freeze([
    'BOX',                  // Box comercial padrão com porta de enrolar
    'MINIBOX',              // Unidade compacta de pequeno porte
    'LOJA',                 // Loja comercial convencional com vitrine
    'MEGALOJA',             // Âncora ou semi-âncora de grande porte
    'QUIOSQUE',             // Estrutura modular em corredor de circulação
    'STAND_MALL',           // Stand promocional temporário ou ilha comercial
    'AREA_ABERTA',          // Espaço aberto delimitado sem fechamento rígido
    'PONTO_PROMOCIONAL',    // Ponto fixo para panfletagem ou display
    'DOCA',                 // Posição de carga e descarga de caminhões
    'SHAFT_TECNICO',        // Passagem vertical ou compartimento de utilidades
    'OUTRO'                 // Tipologia específica fora do catálogo base
  ]),

  ESTADO_CADASTRAL: Object.freeze([
    'ATIVO',                // Ativo imobiliário cadastrado e funcional
    'INATIVO',              // Desativado administrativamente temporariamente
    'DESATIVADO'            // Desincorporado do patrimônio, demolido ou fundido
  ]),

  TIPO_IDENTIFICADOR: Object.freeze([
    'LUC',                  // Localização de Unidade Comercial
    'NUMERO_ANTERIOR',      // Número histórico antes de renumeração
    'CODIGO_PROJETO',       // Código em planta arquitetônica DWG/BIM
    'ALVARA',               // Inscrição municipal / alvará
    'IPTU',                 // Inscrição imobiliária
    'OUTRO'                 // Identificador externo
  ]),

  TIPO_BLOQUEIO_TECNICO: Object.freeze([
    'MANUTENCAO_PREVENTIVA',
    'MANUTENCAO_CORRETIVA',
    'INTERDICAO_DEFESA_CIVIL_BOMBEIROS',
    'OBRA_REFORMA_ESTRUTURAL',
    'SINISTRO_VAZAMENTO_INCENDIO',
    'RISCO_ELETRICO_ESTRUTURAL',
    'BLOQUEIO_OPERACIONAL_LOGISTICO',
    'VISTORIA_TECNICA'
  ]),

  SEVERIDADE_BLOQUEIO: Object.freeze([
    'BAIXA',
    'MEDIA',
    'ALTA',
    'CRITICA'
  ]),

  STATUS_BLOQUEIO: Object.freeze([
    'PROGRAMADO',
    'VIGENTE',
    'CONCLUIDO',
    'CANCELADO'
  ]),

  STATUS_TECNICO_CALCULADO: Object.freeze([
    'LIBERADO',
    'MANUTENCAO',
    'INTERDITADO',
    'EM_REFORMA'
  ]),

  PAPEL_REPRESENTACAO_CARTOGRAFICA: Object.freeze([
    'PRIMARIA',
    'SECUNDARIA',
    'HISTORICA',
    'SIMBOLICA'
  ]),

  DIAGNOSTICO_STAGING: Object.freeze([
    'CRIAR_ESPACO',
    'VINCULAR_EXISTENTE',
    'DUPLICADO',
    'COMPOSTO',
    'NAO_FISICO',
    'AREA_TECNICA',
    'REQUER_REVISAO',
    'ERRO_REFERENCIAL'
  ]),

  GRAU_CONFIANCA_MIGRACAO: Object.freeze([
    'DETERMINISTICO',
    'ALTA_CONFIANCA',
    'REQUER_REVISAO',
    'NAO_MIGRAR'
  ]),

  CONFIANCA_IDENTIDADE: Object.freeze([
    'DETERMINISTICO',       // Existência física incontestável (LUC único / ativo canônico)
    'ALTA_CONFIANCA',       // Ativo real válido, pendente de conciliação cartográfica
    'REQUER_REVISAO',       // Duplicidade, ambiguidade ou inconsistência de chave
    'NAO_MIGRAR'            // Linha puramente virtual, sem correspondente patrimonial
  ]),

  CONFIANCA_ATRIBUTOS: Object.freeze([
    'DETERMINISTICO',       // Medição confirmada por engenharia / projeto executivo
    'ESTIMADO',             // Valor deduzido ou herdado de padrões do setor
    'DECLARADO',            // Dado informado pelo lojista ou planilha cadastral
    'REQUER_REVISAO'        // Divergência grosseira ou ausência de dados básicos
  ]),

  CONFIANCA_TIPOLOGIA: Object.freeze([
    'NORMALIZADO',          // Tipologia física mapeada deterministicamente no enum oficial
    'ORIGINAL_PRESERVADO',  // Tipologia legada preservada sem correspondência exata
    'REQUER_REVISAO'        // Classificação indefinida aguardando vistoria CEOP
  ]),

  STATUS_MIGRACAO: Object.freeze([
    'PENDENTE',
    'CLASSIFICADO',
    'VALIDADO',
    'PROMOVIDO',
    'VINCULADO_MAPA',
    'CONCLUIDO',
    'FALHA',
    'IGNORADO'
  ]),

  RESPOSTA_UTILIDADE: Object.freeze([
    'SIM',
    'NAO',
    'NAO_VERIFICADO'
  ]),

  ORIGEM_DADOS: Object.freeze([
    'MIGRACAO_LEGADO_2026',
    'LEVANTAMENTO_CAMPO_CEOP',
    'PROJETO_ARQUITETURA',
    'MEDICAO_ENGENHARIA',
    'MANUAL'
  ]),

  CONFIANCA_CADASTRO: Object.freeze([
    'DETERMINISTICO',
    'ALTA_CONFIANCA',
    'ESTIMADO',
    'DECLARADO'
  ])
});
