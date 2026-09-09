/**
 * ============================================================
 * S26.10-R8-FIX5 — CATÁLOGO + CORES VIA ENDPOINT EXISTENTE
 * ============================================================
 *
 * Objetivo:
 * - permitir ADMIN adicionar, editar, ativar, desativar e remover
 *   Tipos/Subtipos usados em "Nova referência";
 * - vincular Subtipo a um Tipo pai;
 * - preservar valores históricos já usados em PONTOS_REFERENCIA;
 * - bloquear remoção física de item com uso;
 * - permitir renomear CÓDIGO apenas quando uso = 0;
 * - permitir editar RÓTULO/ORDEM a qualquer momento;
 * - manter APP_VERSAO / APP_FASE na baseline S26.9.
 *
 * Planilha nova:
 * REFERENCIAS_CATALOGO
 *
 * Campos:
 * ID_ITEM
 * NIVEL                TIPO | SUBTIPO
 * CODIGO               valor técnico salvo em PONTOS_REFERENCIA
 * ROTULO               texto amigável exibido na UI
 * CODIGO_TIPO_PAI      obrigatório para SUBTIPO
 * ORDEM
 * ATIVO
 * CRIADO_EM
 * ATUALIZADO_EM
 * CRIADO_POR
 * ATUALIZADO_POR
 */

const S2610R8 = Object.freeze({
  FASE: 'S26.10-R8',
  BASELINE_VERSAO: 'MVP-3.31.0-SINALIZACAO-S26.9',
  BASELINE_FASE: 'S26.9',
  ABA: 'REFERENCIAS_CATALOGO',
  ABA_REFERENCIAS: 'PONTOS_REFERENCIA',
  HEADERS: Object.freeze([
    'ID_ITEM',
    'NIVEL',
    'CODIGO',
    'ROTULO',
    'CODIGO_TIPO_PAI',
    'ORDEM',
    'ATIVO',
    'COR_HEX',
    'CRIADO_EM',
    'ATUALIZADO_EM',
    'CRIADO_POR',
    'ATUALIZADO_POR'
  ])
});


function s2610R8Texto_(v) {
  return String(v == null ? '' : v).trim();
}


function s2610R8Upper_(v) {
  return s2610R8Texto_(v).toUpperCase();
}


function s2610R8Codigo_(v, campo) {
  const normalizado = s2610R8Texto_(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);

  if (!normalizado) {
    throw new Error((campo || 'Código') + ' inválido.');
  }

  return normalizado;
}


function s2610R8Bool_(v, padrao) {
  if (v === true) return true;
  if (v === false) return false;

  const s = s2610R8Upper_(v);

  if (!s) return padrao !== false;

  return !(
    s === 'NAO' ||
    s === 'NÃO' ||
    s === 'FALSE' ||
    s === '0' ||
    s === 'INATIVO' ||
    s === 'INATIVA'
  );
}


function s2610R8CorHex_(valor, permitirVazio) {
  const bruto = s2610R8Texto_(valor);

  if (!bruto && permitirVazio) {
    return '';
  }

  const cor = (bruto || '#171B68').toUpperCase();

  if (!/^#[0-9A-F]{6}$/.test(cor)) {
    throw new Error(
      'Cor inválida. Use o formato hexadecimal #RRGGBB.'
    );
  }

  return cor;
}


function s2610R8Config_(ss) {
  const sh = ss.getSheetByName('CONFIG');
  const out = {};

  if (!sh || sh.getLastRow() < 2) return out;

  sh.getRange(2, 1, sh.getLastRow() - 1, 2)
    .getValues()
    .forEach(function(r) {
      const k = s2610R8Texto_(r[0]);
      if (k) out[k] = s2610R8Texto_(r[1]);
    });

  return out;
}


function s2610R8ValidarBaselineSetup_(ss) {
  const cfg = s2610R8Config_(ss);

  if (
    cfg.APP_VERSAO !== S2610R8.BASELINE_VERSAO ||
    cfg.APP_FASE !== S2610R8.BASELINE_FASE
  ) {
    throw new Error(
      'S26.10-R8 bloqueado: baseline inesperada. ' +
      (cfg.APP_VERSAO || 'sem versão') + ' / ' +
      (cfg.APP_FASE || 'sem fase')
    );
  }

  return cfg;
}


function s2610R8ValidarOperacao_(ss) {
  return s2610ValidarOperacao_(
    s2610R8Config_(ss),
    'S26.10-R8'
  );
}


function s2610R8Admin_() {
  if (typeof exigirPermissaoS14_ !== 'function') {
    throw new Error('S26.10-R8: permissão S14 indisponível.');
  }

  return exigirPermissaoS14_('administrar');
}


function s2610R8Usuario_(sessao) {
  sessao = sessao || {};
  let email = s2610R8Texto_(
    sessao.email || sessao.usuarioEmail || ''
  );

  if (!email) {
    try {
      email = s2610R8Texto_(Session.getActiveUser().getEmail());
    } catch (_) {}
  }

  return {
    email: email || 'APPS_SCRIPT',
    nome: s2610R8Texto_(sessao.nome || email || 'Administrador'),
    perfil: s2610R8Upper_(sessao.perfil || 'ADMIN')
  };
}


function s2610R8Headers_(sh) {
  if (!sh || sh.getLastColumn() < 1) return [];

  return sh.getRange(1, 1, 1, sh.getLastColumn())
    .getValues()[0]
    .map(function(v) {
      return s2610R8Texto_(v);
    });
}


function s2610R8ValidarHeaders_(sh) {
  const headers = s2610R8Headers_(sh);
  const ausentes = S2610R8.HEADERS.filter(function(h) {
    return headers.indexOf(h) < 0;
  });

  if (ausentes.length) {
    throw new Error(
      'Estrutura inválida em ' + S2610R8.ABA +
      ': faltam ' + ausentes.join(', ')
    );
  }

  return headers;
}


function s2610R8MigrarCores_(sh) {
  if (!sh) return false;

  let headers = s2610R8Headers_(sh);

  if (headers.indexOf('COR_HEX') >= 0) {
    return false;
  }

  const novaColuna = sh.getLastColumn() + 1;
  sh.getRange(1, novaColuna).setValue('COR_HEX');

  /*
   * Preserva o visual histórico:
   * - TIPO começa com o azul já usado pelos pins;
   * - SUBTIPO começa vazio = herda a cor do TIPO.
   */
  if (sh.getLastRow() >= 2) {
    const headersAntes = s2610R8Headers_(sh);
    const idxNivel = headersAntes.indexOf('NIVEL');

    if (idxNivel >= 0) {
      const niveis = sh
        .getRange(2, idxNivel + 1, sh.getLastRow() - 1, 1)
        .getValues();

      const cores = niveis.map(function(row) {
        return [
          s2610R8Upper_(row[0]) === 'TIPO'
            ? '#171B68'
            : ''
        ];
      });

      sh.getRange(2, novaColuna, cores.length, 1)
        .setValues(cores);
    }
  }

  SpreadsheetApp.flush();
  return true;
}


function s2610R8Rows_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];

  const headers = s2610R8ValidarHeaders_(sh);
  const values = sh
    .getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn())
    .getValues();

  return values.map(function(row, i) {
    const obj = { __linha: i + 2 };

    headers.forEach(function(h, j) {
      if (h) obj[h] = row[j];
    });

    return obj;
  });
}


function s2610R8Aba_(ss, criar) {
  let sh = ss.getSheetByName(S2610R8.ABA);

  if (!sh && criar) {
    sh = ss.insertSheet(S2610R8.ABA);

    sh.getRange(
      1, 1, 1, S2610R8.HEADERS.length
    ).setValues([
      Array.from(S2610R8.HEADERS)
    ]);

    sh.setFrozenRows(1);
  }

  if (sh) {
    s2610R8MigrarCores_(sh);
    s2610R8ValidarHeaders_(sh);
  }

  return sh;
}


function s2610R8Append_(sh, obj) {
  const headers = s2610R8Headers_(sh);
  sh.appendRow(
    headers.map(function(h) {
      return Object.prototype.hasOwnProperty.call(obj, h)
        ? obj[h]
        : '';
    })
  );
}


function s2610R8Atualizar_(sh, linha, campos) {
  const headers = s2610R8Headers_(sh);

  Object.keys(campos).forEach(function(campo) {
    const idx = headers.indexOf(campo);

    if (idx < 0) {
      throw new Error('Coluna inexistente: ' + campo);
    }

    sh.getRange(linha, idx + 1).setValue(campos[campo]);
  });
}


function s2610R8Auditar_(payload) {
  if (typeof registrarAuditoriaS15_ !== 'function') return;

  try {
    registrarAuditoriaS15_(payload);
  } catch (e) {
    console.warn('[S26.10-R8] auditoria não registrada', e);
  }
}


function s2610R8Referencias_(ss) {
  const sh = ss.getSheetByName(S2610R8.ABA_REFERENCIAS);

  if (!sh || sh.getLastRow() < 2) return [];

  const headers = s2610R8Headers_(sh);
  const idxTipo = headers.indexOf('TIPO');
  const idxSub = headers.indexOf('SUBTIPO');

  if (idxTipo < 0 || idxSub < 0) {
    throw new Error('PONTOS_REFERENCIA sem TIPO/SUBTIPO.');
  }

  return sh
    .getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn())
    .getValues()
    .map(function(row) {
      return {
        tipo: s2610R8Codigo_(row[idxTipo], 'Tipo'),
        subtipo: s2610R8Codigo_(row[idxSub], 'Subtipo')
      };
    });
}


function s2610R8Usos_(ss) {
  const usosTipo = {};
  const usosSub = {};

  s2610R8Referencias_(ss).forEach(function(r) {
    usosTipo[r.tipo] = (usosTipo[r.tipo] || 0) + 1;

    const key = r.tipo + '|' + r.subtipo;
    usosSub[key] = (usosSub[key] || 0) + 1;
  });

  return {
    tipos: usosTipo,
    subtipos: usosSub
  };
}


function s2610R8RotuloPadrao_(codigo) {
  return s2610R8Texto_(codigo)
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map(function(p) {
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' ');
}


function s2610R8NovoId_(nivel) {
  return (
    'RCAT-' +
    (nivel === 'TIPO' ? 'T' : 'S') +
    '-' +
    Utilities.getUuid()
      .replace(/-/g, '')
      .substring(0, 12)
      .toUpperCase()
  );
}


function s2610R8Localizar_(rows, idItem) {
  const id = s2610R8Texto_(idItem);

  const item = rows.find(function(r) {
    return s2610R8Texto_(r.ID_ITEM) === id;
  });

  if (!item) {
    throw new Error('Item de catálogo não encontrado: ' + id);
  }

  return item;
}


function s2610R8Serializar_(row, usos) {
  const nivel = s2610R8Upper_(row.NIVEL);
  const codigo = s2610R8Codigo_(row.CODIGO, 'Código');
  const pai = s2610R8Codigo_(
    row.CODIGO_TIPO_PAI || codigo,
    nivel === 'SUBTIPO' ? 'Tipo pai' : 'Código'
  );

  const uso =
    nivel === 'TIPO'
      ? Number(usos.tipos[codigo] || 0)
      : Number(usos.subtipos[pai + '|' + codigo] || 0);

  return {
    idItem: s2610R8Texto_(row.ID_ITEM),
    nivel: nivel,
    codigo: codigo,
    rotulo:
      s2610R8Texto_(row.ROTULO) ||
      s2610R8RotuloPadrao_(codigo),
    codigoTipoPai:
      nivel === 'SUBTIPO' ? pai : '',
    ordem: Number(row.ORDEM || 0),
    ativo: s2610R8Bool_(row.ATIVO, true),
    corHex:
      s2610R8CorHex_(
        row.COR_HEX,
        nivel === 'SUBTIPO'
      ),
    usos: uso
  };
}


function s2610R8Seed_(ss, sh, user) {
  const existentes = s2610R8Rows_(sh);

  if (existentes.length) {
    return {
      tiposCriados: 0,
      subtiposCriados: 0,
      jaExistia: true
    };
  }

  const refs = s2610R8Referencias_(ss);
  const tipos = {};
  const pares = {};

  refs.forEach(function(r) {
    tipos[r.tipo] = true;
    pares[r.tipo + '|' + r.subtipo] = {
      tipo: r.tipo,
      subtipo: r.subtipo
    };
  });

  const agora = new Date();
  let ordem = 10;

  Object.keys(tipos)
    .sort()
    .forEach(function(codigo) {
      s2610R8Append_(sh, {
        ID_ITEM: s2610R8NovoId_('TIPO'),
        NIVEL: 'TIPO',
        CODIGO: codigo,
        ROTULO: s2610R8RotuloPadrao_(codigo),
        CODIGO_TIPO_PAI: '',
        ORDEM: ordem,
        ATIVO: 'SIM',
        COR_HEX: '#171B68',
        CRIADO_EM: agora,
        ATUALIZADO_EM: agora,
        CRIADO_POR: user.email,
        ATUALIZADO_POR: user.email
      });

      ordem += 10;
    });

  let ordemSub = 10;

  Object.keys(pares)
    .sort()
    .forEach(function(k) {
      const p = pares[k];

      s2610R8Append_(sh, {
        ID_ITEM: s2610R8NovoId_('SUBTIPO'),
        NIVEL: 'SUBTIPO',
        CODIGO: p.subtipo,
        ROTULO: s2610R8RotuloPadrao_(p.subtipo),
        CODIGO_TIPO_PAI: p.tipo,
        ORDEM: ordemSub,
        ATIVO: 'SIM',
        COR_HEX: '',
        CRIADO_EM: agora,
        ATUALIZADO_EM: agora,
        CRIADO_POR: user.email,
        ATUALIZADO_POR: user.email
      });

      ordemSub += 10;
    });

  return {
    tiposCriados: Object.keys(tipos).length,
    subtiposCriados: Object.keys(pares).length,
    jaExistia: false
  };
}


function setupS2610R8() {
  const sessao = s2610R8Admin_();
  const ss = SpreadsheetApp.getActive();

  s2610R8ValidarBaselineSetup_(ss);

  const existia = !!ss.getSheetByName(S2610R8.ABA);
  const sh = s2610R8Aba_(ss, true);
  const user = s2610R8Usuario_(sessao);
  const seed = s2610R8Seed_(ss, sh, user);

  SpreadsheetApp.flush();

  const out = {
    ok: true,
    fase: S2610R8.FASE,
    aba: S2610R8.ABA,
    criadaAgora: !existia,
    seed: seed,
    alterouReferencias: false
  };

  console.log('[S26.10-R8][SETUP] ' + JSON.stringify(out));
  return out;
}


function appCatalogosReferenciaS2610R8(opcoes) {
  opcoes = opcoes || {};

  /*
   * S26.10-R8-FIX5
   * Modo mínimo de visualização das cores do mapa.
   * Não retorna dados administrativos e não altera registros.
   */
  if (
    opcoes.modoMapaCores === true
  ) {
    return appCoresReferenciasMapaS2610R8Fix2(
      opcoes.idMapaSetor
    );
  }

  s2610R8Admin_();

  const ss = SpreadsheetApp.getActive();
  s2610R8ValidarOperacao_(ss);

  const sh = s2610R8Aba_(ss, false);

  if (!sh) {
    throw new Error('Execute setupS2610R8() antes de usar os catálogos.');
  }

  const incluirInativos = !!opcoes?.incluirInativos;
  const usos = s2610R8Usos_(ss);

  const itens = s2610R8Rows_(sh)
    .map(function(r) {
      return s2610R8Serializar_(r, usos);
    });

  const tipos = itens
    .filter(function(i) {
      return (
        i.nivel === 'TIPO' &&
        (incluirInativos || i.ativo)
      );
    })
    .sort(function(a, b) {
      return (
        a.ordem - b.ordem ||
        a.rotulo.localeCompare(b.rotulo, 'pt-BR')
      );
    });

  const tipoAtivo = {};
  tipos.forEach(function(t) {
    if (t.ativo) tipoAtivo[t.codigo] = true;
  });

  const corPorTipo = {};

  tipos.forEach(function(t) {
    t.corResolvida =
      s2610R8CorHex_(t.corHex || '#171B68', false);

    corPorTipo[t.codigo] =
      t.corResolvida;
  });

  const subtipos = itens
    .filter(function(i) {
      return (
        i.nivel === 'SUBTIPO' &&
        (
          incluirInativos ||
          (
            i.ativo &&
            tipoAtivo[i.codigoTipoPai]
          )
        )
      );
    })
    .sort(function(a, b) {
      return (
        a.codigoTipoPai.localeCompare(b.codigoTipoPai, 'pt-BR') ||
        a.ordem - b.ordem ||
        a.rotulo.localeCompare(b.rotulo, 'pt-BR')
      );
    })
    .map(function(s) {
      s.corResolvida =
        s.corHex ||
        corPorTipo[s.codigoTipoPai] ||
        '#171B68';

      s.herdaCorTipo = !s.corHex;
      return s;
    });

  return {
    ok: true,
    fase: S2610R8.FASE,
    tipos: tipos,
    subtipos: subtipos,
    totais: {
      tipos: itens.filter(function(i) {
        return i.nivel === 'TIPO';
      }).length,
      subtipos: itens.filter(function(i) {
        return i.nivel === 'SUBTIPO';
      }).length,
      ativos: itens.filter(function(i) {
        return i.ativo;
      }).length,
      inativos: itens.filter(function(i) {
        return !i.ativo;
      }).length
    }
  };
}


function validarCatalogoReferenciaS2610R8_(tipo, subtipo, opcoes) {
  opcoes = opcoes || {};

  const ss = SpreadsheetApp.getActive();
  const sh = s2610R8Aba_(ss, false);

  if (!sh) {
    throw new Error(
      'Catálogo de referências S26.10-R8 ainda não foi preparado.'
    );
  }

  const t = s2610R8Codigo_(tipo, 'Tipo');
  const s = s2610R8Codigo_(subtipo, 'Subtipo');
  const usos = s2610R8Usos_(ss);
  const itens = s2610R8Rows_(sh)
    .map(function(r) {
      return s2610R8Serializar_(r, usos);
    });

  const atualTipo = opcoes.atualTipo
    ? s2610R8Codigo_(opcoes.atualTipo, 'Tipo atual')
    : '';

  const atualSubtipo = opcoes.atualSubtipo
    ? s2610R8Codigo_(opcoes.atualSubtipo, 'Subtipo atual')
    : '';

  const permiteAtualInativo =
    !!opcoes.permitirAtualInativo &&
    t === atualTipo &&
    s === atualSubtipo;

  const tipoItem = itens.find(function(i) {
    return i.nivel === 'TIPO' && i.codigo === t;
  });

  if (!tipoItem) {
    throw new Error('Tipo não cadastrado no catálogo: ' + t);
  }

  if (!tipoItem.ativo && !permiteAtualInativo) {
    throw new Error('Tipo inativo no catálogo: ' + t);
  }

  const subItem = itens.find(function(i) {
    return (
      i.nivel === 'SUBTIPO' &&
      i.codigoTipoPai === t &&
      i.codigo === s
    );
  });

  if (!subItem) {
    throw new Error(
      'Subtipo ' + s + ' não pertence ao tipo ' + t + '.'
    );
  }

  if (!subItem.ativo && !permiteAtualInativo) {
    throw new Error('Subtipo inativo no catálogo: ' + s);
  }

  return {
    ok: true,
    tipo: t,
    subtipo: s
  };
}


function appSalvarItemCatalogoReferenciaS2610R8(payload) {
  payload = payload || {};

  const sessao = s2610R8Admin_();
  const ss = SpreadsheetApp.getActive();

  s2610R8ValidarOperacao_(ss);

  const sh = s2610R8Aba_(ss, false);

  if (!sh) {
    throw new Error('Execute setupS2610R8() primeiro.');
  }

  const user = s2610R8Usuario_(sessao);
  const rows = s2610R8Rows_(sh);
  const usos = s2610R8Usos_(ss);

  const idItem = s2610R8Texto_(payload.idItem);
  const nivel = s2610R8Upper_(payload.nivel);

  if (['TIPO', 'SUBTIPO'].indexOf(nivel) < 0) {
    throw new Error('Nível inválido.');
  }

  const codigo = s2610R8Codigo_(
    payload.codigo || payload.rotulo,
    'Código'
  );

  const rotulo =
    s2610R8Texto_(payload.rotulo) ||
    s2610R8RotuloPadrao_(codigo);

  if (rotulo.length > 120) {
    throw new Error('Rótulo muito longo.');
  }

  const pai = nivel === 'SUBTIPO'
    ? s2610R8Codigo_(payload.codigoTipoPai, 'Tipo pai')
    : '';

  const ordem = Number(payload.ordem || 0);

  if (!Number.isFinite(ordem) || ordem < 0 || ordem > 9999) {
    throw new Error('Ordem inválida.');
  }

  const ativo = payload.ativo !== false;

  const corHex =
    nivel === 'TIPO'
      ? s2610R8CorHex_(
          payload.corHex || '#171B68',
          false
        )
      : s2610R8CorHex_(
          payload.herdarCorTipo
            ? ''
            : payload.corHex,
          true
        );

  const agora = new Date();

  if (nivel === 'SUBTIPO') {
    const tipoPai = rows.find(function(r) {
      return (
        s2610R8Upper_(r.NIVEL) === 'TIPO' &&
        s2610R8Codigo_(r.CODIGO, 'Tipo') === pai
      );
    });

    if (!tipoPai) {
      throw new Error('Tipo pai não encontrado: ' + pai);
    }
  }

  const duplicado = rows.find(function(r) {
    if (idItem && s2610R8Texto_(r.ID_ITEM) === idItem) return false;

    const rn = s2610R8Upper_(r.NIVEL);
    const rc = s2610R8Codigo_(r.CODIGO, 'Código');
    const rp = rn === 'SUBTIPO'
      ? s2610R8Codigo_(r.CODIGO_TIPO_PAI, 'Tipo pai')
      : '';

    return (
      rn === nivel &&
      rc === codigo &&
      rp === pai
    );
  });

  if (duplicado) {
    throw new Error('Já existe um item com esse código.');
  }

  if (payload.dryRun === true) {
    return {
      ok: true,
      dryRun: true,
      fase: S2610R8.FASE,
      normalizado: {
        nivel: nivel,
        codigo: codigo,
        rotulo: rotulo,
        codigoTipoPai: pai,
        ordem: ordem,
        ativo: ativo,
        corHex: corHex,
        herdarCorTipo:
          nivel === 'SUBTIPO' && !corHex
      }
    };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!idItem) {
      const novoId = s2610R8NovoId_(nivel);

      s2610R8Append_(sh, {
        ID_ITEM: novoId,
        NIVEL: nivel,
        CODIGO: codigo,
        ROTULO: rotulo,
        CODIGO_TIPO_PAI: pai,
        ORDEM: ordem,
        ATIVO: ativo ? 'SIM' : 'NAO',
        COR_HEX: corHex,
        CRIADO_EM: agora,
        ATUALIZADO_EM: agora,
        CRIADO_POR: user.email,
        ATUALIZADO_POR: user.email
      });

      s2610R8Auditar_({
        acao: 'REFERENCIA_CATALOGO_ITEM_CRIADO',
        entidade: 'REFERENCIA_CATALOGO',
        entidadeId: novoId,
        resultado: 'SUCESSO',
        origem: 'WEB_APP',
        usuarioEmail: user.email,
        usuarioNome: user.nome,
        perfil: user.perfil,
        valorNovo: {
          nivel: nivel,
          codigo: codigo,
          rotulo: rotulo,
          codigoTipoPai: pai,
          ativo: ativo,
          corHex: corHex,
          herdarCorTipo:
            nivel === 'SUBTIPO' && !corHex
        }
      });

      SpreadsheetApp.flush();

      return {
        ok: true,
        fase: S2610R8.FASE,
        idItem: novoId,
        criado: true
      };
    }

    const atual = s2610R8Localizar_(s2610R8Rows_(sh), idItem);
    const serial = s2610R8Serializar_(atual, usos);

    if (serial.nivel !== nivel) {
      throw new Error('Não é permitido trocar TIPO ↔ SUBTIPO.');
    }

    if (
      serial.codigo !== codigo &&
      serial.usos > 0
    ) {
      throw new Error(
        'O código não pode ser alterado porque já possui ' +
        serial.usos + ' uso(s). Edite apenas o rótulo ou desative.'
      );
    }

    if (
      nivel === 'SUBTIPO' &&
      serial.codigoTipoPai !== pai &&
      serial.usos > 0
    ) {
      throw new Error(
        'O tipo pai não pode ser alterado enquanto o subtipo possuir usos.'
      );
    }

    const antes = {
      nivel: serial.nivel,
      codigo: serial.codigo,
      rotulo: serial.rotulo,
      codigoTipoPai: serial.codigoTipoPai,
      ordem: serial.ordem,
      ativo: serial.ativo,
      corHex: serial.corHex,
      usos: serial.usos
    };

    s2610R8Atualizar_(sh, atual.__linha, {
      CODIGO: codigo,
      ROTULO: rotulo,
      CODIGO_TIPO_PAI: pai,
      ORDEM: ordem,
      ATIVO: ativo ? 'SIM' : 'NAO',
      COR_HEX: corHex,
      ATUALIZADO_EM: agora,
      ATUALIZADO_POR: user.email
    });

    /*
     * Se um TIPO sem uso tiver o código alterado, seus subtipos
     * também precisam apontar para o novo pai.
     */
    if (
      nivel === 'TIPO' &&
      serial.codigo !== codigo
    ) {
      s2610R8Rows_(sh).forEach(function(r) {
        if (
          s2610R8Upper_(r.NIVEL) === 'SUBTIPO' &&
          s2610R8Codigo_(r.CODIGO_TIPO_PAI, 'Tipo pai') === serial.codigo
        ) {
          s2610R8Atualizar_(sh, r.__linha, {
            CODIGO_TIPO_PAI: codigo,
            ATUALIZADO_EM: agora,
            ATUALIZADO_POR: user.email
          });
        }
      });
    }

    s2610R8Auditar_({
      acao: 'REFERENCIA_CATALOGO_ITEM_ATUALIZADO',
      entidade: 'REFERENCIA_CATALOGO',
      entidadeId: idItem,
      resultado: 'SUCESSO',
      origem: 'WEB_APP',
      usuarioEmail: user.email,
      usuarioNome: user.nome,
      perfil: user.perfil,
      valorAnterior: antes,
      valorNovo: {
        nivel: nivel,
        codigo: codigo,
        rotulo: rotulo,
        codigoTipoPai: pai,
        ordem: ordem,
        ativo: ativo,
        corHex: corHex,
        herdarCorTipo:
          nivel === 'SUBTIPO' && !corHex
      }
    });

    SpreadsheetApp.flush();

    return {
      ok: true,
      fase: S2610R8.FASE,
      idItem: idItem,
      atualizado: true
    };

  } finally {
    lock.releaseLock();
  }
}


function appAlterarAtivoCatalogoReferenciaS2610R8(idItem, ativo) {
  const sessao = s2610R8Admin_();
  const ss = SpreadsheetApp.getActive();

  s2610R8ValidarOperacao_(ss);

  const sh = s2610R8Aba_(ss, false);

  if (!sh) throw new Error('Catálogo R8 não preparado.');

  const user = s2610R8Usuario_(sessao);
  const rows = s2610R8Rows_(sh);
  const atual = s2610R8Localizar_(rows, idItem);
  const agora = new Date();

  s2610R8Atualizar_(sh, atual.__linha, {
    ATIVO: ativo ? 'SIM' : 'NAO',
    ATUALIZADO_EM: agora,
    ATUALIZADO_POR: user.email
  });

  s2610R8Auditar_({
    acao: ativo
      ? 'REFERENCIA_CATALOGO_ITEM_ATIVADO'
      : 'REFERENCIA_CATALOGO_ITEM_DESATIVADO',
    entidade: 'REFERENCIA_CATALOGO',
    entidadeId: idItem,
    resultado: 'SUCESSO',
    origem: 'WEB_APP',
    usuarioEmail: user.email,
    usuarioNome: user.nome,
    perfil: user.perfil
  });

  SpreadsheetApp.flush();

  return {
    ok: true,
    fase: S2610R8.FASE,
    idItem: idItem,
    ativo: !!ativo
  };
}


function appRemoverItemCatalogoReferenciaS2610R8(idItem) {
  const sessao = s2610R8Admin_();
  const ss = SpreadsheetApp.getActive();

  s2610R8ValidarOperacao_(ss);

  const sh = s2610R8Aba_(ss, false);

  if (!sh) throw new Error('Catálogo R8 não preparado.');

  const rows = s2610R8Rows_(sh);
  const usos = s2610R8Usos_(ss);
  const atual = s2610R8Localizar_(rows, idItem);
  const serial = s2610R8Serializar_(atual, usos);

  if (serial.usos > 0) {
    throw new Error(
      'Item possui ' + serial.usos +
      ' uso(s). Desative em vez de remover.'
    );
  }

  if (serial.nivel === 'TIPO') {
    const filhos = rows.filter(function(r) {
      return (
        s2610R8Upper_(r.NIVEL) === 'SUBTIPO' &&
        s2610R8Codigo_(r.CODIGO_TIPO_PAI, 'Tipo pai') === serial.codigo
      );
    });

    if (filhos.length) {
      throw new Error(
        'Remova primeiro os ' + filhos.length +
        ' subtipo(s) vinculados a este tipo.'
      );
    }
  }

  const user = s2610R8Usuario_(sessao);

  sh.deleteRow(atual.__linha);

  s2610R8Auditar_({
    acao: 'REFERENCIA_CATALOGO_ITEM_REMOVIDO',
    entidade: 'REFERENCIA_CATALOGO',
    entidadeId: idItem,
    resultado: 'SUCESSO',
    origem: 'WEB_APP',
    usuarioEmail: user.email,
    usuarioNome: user.nome,
    perfil: user.perfil,
    valorAnterior: serial
  });

  SpreadsheetApp.flush();

  return {
    ok: true,
    fase: S2610R8.FASE,
    idItem: idItem,
    removido: true
  };
}



/**
 * Endpoint de visualização.
 * Retorna somente metadados cartográficos necessários para colorir pins.
 * Não expõe descrição, usuário, auditoria ou dados administrativos.
 */
function appCoresReferenciasMapaS2610R8Fix2(idMapaSetor) {
  const ss = SpreadsheetApp.getActive();
  s2610R8ValidarOperacao_(ss);

  const idMapa = s2610R8Texto_(idMapaSetor);

  if (!idMapa) {
    throw new Error('Informe ID_MAPA_SETOR.');
  }

  const shCat = s2610R8Aba_(ss, false);

  if (!shCat) {
    return {
      ok: true,
      fase: 'S26.10-R8-FIX2',
      idMapaSetor: idMapa,
      referencias: []
    };
  }

  const usos = s2610R8Usos_(ss);
  const itens = s2610R8Rows_(shCat)
    .map(function(r) {
      return s2610R8Serializar_(r, usos);
    });

  const coresTipo = {};
  const coresSub = {};

  itens.forEach(function(i) {
    if (i.nivel === 'TIPO') {
      coresTipo[i.codigo] =
        i.corHex || '#171B68';
    }
  });

  itens.forEach(function(i) {
    if (i.nivel === 'SUBTIPO') {
      coresSub[
        i.codigoTipoPai + '|' + i.codigo
      ] =
        i.corHex ||
        coresTipo[i.codigoTipoPai] ||
        '#171B68';
    }
  });

  const shRef =
    ss.getSheetByName(S2610R8.ABA_REFERENCIAS);

  if (!shRef || shRef.getLastRow() < 2) {
    return {
      ok: true,
      fase: 'S26.10-R8-FIX2',
      idMapaSetor: idMapa,
      referencias: []
    };
  }

  const headers = s2610R8Headers_(shRef);
  const idx = {};

  [
    'ID_REFERENCIA',
    'ID_MAPA_SETOR',
    'NOME',
    'TIPO',
    'SUBTIPO',
    'X_NORMALIZADO',
    'Y_NORMALIZADO',
    'ATIVO'
  ].forEach(function(h) {
    idx[h] = headers.indexOf(h);
  });

  const referencias = shRef
    .getRange(
      2,
      1,
      shRef.getLastRow() - 1,
      shRef.getLastColumn()
    )
    .getValues()
    .filter(function(row) {
      return (
        s2610R8Texto_(row[idx.ID_MAPA_SETOR]) === idMapa &&
        s2610R8Bool_(row[idx.ATIVO], true)
      );
    })
    .map(function(row) {
      const tipo =
        s2610R8Codigo_(row[idx.TIPO], 'Tipo');

      const subtipo =
        s2610R8Codigo_(row[idx.SUBTIPO], 'Subtipo');

      return {
        idReferencia:
          s2610R8Texto_(row[idx.ID_REFERENCIA]),
        nome:
          s2610R8Texto_(row[idx.NOME]),
        tipo: tipo,
        subtipo: subtipo,
        x: Number(row[idx.X_NORMALIZADO]),
        y: Number(row[idx.Y_NORMALIZADO]),
        corHex:
          coresSub[tipo + '|' + subtipo] ||
          coresTipo[tipo] ||
          '#171B68'
      };
    });

  return {
    ok: true,
    fase: 'S26.10-R8-FIX2',
    idMapaSetor: idMapa,
    referencias: referencias
  };
}


function diagnosticoS2610R8() {
  const checks = [];

  function add(nome, ok, detalhe) {
    checks.push({
      nome: nome,
      ok: !!ok,
      detalhe: String(detalhe == null ? '' : detalhe)
    });
  }

  const ss = SpreadsheetApp.getActive();
  const cfg = s2610R8Config_(ss);

  add(
    'BASELINE_VERSAO',
    cfg.APP_VERSAO === S2610R8.BASELINE_VERSAO,
    cfg.APP_VERSAO || 'ausente'
  );

  add(
    'BASELINE_FASE',
    cfg.APP_FASE === S2610R8.BASELINE_FASE,
    cfg.APP_FASE || 'ausente'
  );

  add(
    'ABA_CATALOGO',
    !!ss.getSheetByName(S2610R8.ABA),
    S2610R8.ABA
  );

  add(
    'PERMISSAO_S14',
    typeof exigirPermissaoS14_ === 'function',
    'exigirPermissaoS14_'
  );

  add(
    'AUDITORIA_S15',
    typeof registrarAuditoriaS15_ === 'function',
    'registrarAuditoriaS15_'
  );

  add(
    'API_CATALOGOS',
    typeof appCatalogosReferenciaS2610R8 === 'function',
    'appCatalogosReferenciaS2610R8'
  );

  add(
    'API_SALVAR',
    typeof appSalvarItemCatalogoReferenciaS2610R8 === 'function',
    'appSalvarItemCatalogoReferenciaS2610R8'
  );

  add(
    'API_ATIVO',
    typeof appAlterarAtivoCatalogoReferenciaS2610R8 === 'function',
    'appAlterarAtivoCatalogoReferenciaS2610R8'
  );

  add(
    'API_REMOVER',
    typeof appRemoverItemCatalogoReferenciaS2610R8 === 'function',
    'appRemoverItemCatalogoReferenciaS2610R8'
  );

  let cat = null;
  let erro = '';

  try {
    cat = appCatalogosReferenciaS2610R8({
      incluirInativos: true
    });
  } catch (e) {
    erro = e.message || String(e);
  }

  add(
    'LEITURA_REAL',
    !!(
      cat &&
      cat.ok &&
      Array.isArray(cat.tipos) &&
      Array.isArray(cat.subtipos)
    ),
    cat
      ? (
          cat.tipos.length + ' tipo(s) / ' +
          cat.subtipos.length + ' subtipo(s)'
        )
      : erro
  );

  const refs = s2610R8Referencias_(ss);
  const paresCat = {};

  if (cat) {
    cat.subtipos.forEach(function(s) {
      paresCat[s.codigoTipoPai + '|' + s.codigo] = true;
    });
  }

  const faltantes = refs.filter(function(r) {
    return !paresCat[r.tipo + '|' + r.subtipo];
  });

  add(
    'TODOS_VALORES_ATUAIS_SEEDADOS',
    faltantes.length === 0,
    faltantes.length
      ? JSON.stringify(faltantes.slice(0, 5))
      : refs.length + ' referência(s) cobertas'
  );

  let dry = null;
  let erroDry = '';

  try {
    dry = appSalvarItemCatalogoReferenciaS2610R8({
      nivel: 'SUBTIPO',
      codigo: 'QA_SUBTIPO_R8',
      rotulo: 'QA Subtipo R8',
      codigoTipoPai: cat?.tipos?.[0]?.codigo || '',
      ordem: 999,
      ativo: true,
      dryRun: true
    });
  } catch (e) {
    erroDry = e.message || String(e);
  }

  add(
    'DRY_RUN_SALVAR',
    !!(dry && dry.ok && dry.dryRun),
    dry ? dry.normalizado.codigo : erroDry
  );

  add(
    'COLUNA_COR_HEX',
    s2610R8Headers_(
      ss.getSheetByName(S2610R8.ABA)
    ).indexOf('COR_HEX') >= 0,
    'COR_HEX'
  );

  add(
    'CORES_RESOLVIDAS',
    !!(
      cat &&
      cat.tipos.every(function(t) {
        return /^#[0-9A-F]{6}$/i.test(
          t.corResolvida || ''
        );
      }) &&
      cat.subtipos.every(function(s) {
        return /^#[0-9A-F]{6}$/i.test(
          s.corResolvida || ''
        );
      })
    ),
    cat
      ? 'tipo padrão + subtipo override/herança'
      : 'catálogo indisponível'
  );

  add(
    'API_CORES_MAPA',
    typeof appCoresReferenciasMapaS2610R8Fix2 ===
      'function',
    'appCoresReferenciasMapaS2610R8Fix2'
  );

  let provaModoMapa = null;
  let erroModoMapa = '';

  try {
    const shTeste =
      ss.getSheetByName(S2610R8.ABA_REFERENCIAS);

    if (shTeste && shTeste.getLastRow() >= 2) {
      const h =
        s2610R8Headers_(shTeste);

      const idxMapa =
        h.indexOf('ID_MAPA_SETOR');

      if (idxMapa >= 0) {
        const mapaTeste =
          s2610R8Texto_(
            shTeste.getRange(2, idxMapa + 1).getValue()
          );

        if (mapaTeste) {
          provaModoMapa =
            appCatalogosReferenciaS2610R8({
              modoMapaCores: true,
              idMapaSetor: mapaTeste
            });
        }
      }
    }
  } catch (e) {
    erroModoMapa =
      e && e.message
        ? e.message
        : String(e);
  }

  add(
    'API_CATALOGO_MODO_MAPA_CORES_FIX5',
    !!(
      provaModoMapa &&
      provaModoMapa.ok &&
      Array.isArray(provaModoMapa.referencias)
    ),
    provaModoMapa
      ? (
          provaModoMapa.idMapaSetor +
          ' • ' +
          provaModoMapa.referencias.length +
          ' referência(s)'
        )
      : (
          erroModoMapa ||
          'sem mapa de teste'
        )
  );

  const falhas = checks.filter(function(c) {
    return !c.ok;
  });

  const out = {
    ok: falhas.length === 0,
    diagnostico:
      'S26.10-R8-FIX5-CATALOGOS-CORES-VIA-ENDPOINT-EXISTENTE',
    fase: S2610R8.FASE,
    totalChecks: checks.length,
    falhas: falhas.length,
    checks: checks,
    catalogos: cat
      ? {
          tipos: cat.tipos.length,
          subtipos: cat.subtipos.length,
          ativos: cat.totais.ativos,
          inativos: cat.totais.inativos
        }
      : null,
    alterouReferencias: false,
    gate:
      falhas.length === 0
        ? 'APTO_PARA_FRONTEND_R8'
        : 'BLOQUEADO'
  };

  console.log(
    '[S26.10-R8] ' + JSON.stringify(out)
  );

  return out;
}
