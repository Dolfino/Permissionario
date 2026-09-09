# DIRETRIZES DE ARQUITETURA E DESENVOLVIMENTO — SINALIZAÇÃO DO MALL
> Documento de orientação automática para agentes de IA (Antigravity) e engenheiros de software.

---

## 1. Baseline Oficial e Estado Atual do Sistema

- **Versão Consolidada**: `MVP-3.32.0-SINALIZACAO-S26.10`
- **Fase**: `S26.10`
- **Ambiente de Execução**: Google Apps Script (V8 Engine) + Google Sheets + Google Drive + HTML5/Vanilla CSS/JavaScript (Offline-first IndexedDB).
- **Repositório Git**: `git@github.com:Dolfino/sinalizacao_mall_BASE.git` (Branch `main`).
- **Status Operacional**: 100% funcional, testado e aprovado em produção por 4 semanas.

---

## 2. Estrutura Modular do Repositório

Todo o código-fonte da aplicação reside exclusivamente em `src/`, mapeado pelo `.clasp.json`:

```
src/
├── appsscript.json              # Manifesto oficial do Google Apps Script
├── index.html                   # Casca HTML principal (Single Page Application)
├── styles.html                  # Design System e folhas de estilo (Vanilla CSS)
├── scripts.html                 # Frontend client-side SPA, IndexedDB e eventos
│
├── core/                        # Núcleo da aplicação
│   ├── Código.gs                # doGet, menus nativos da planilha e roteamento
│   ├── SetupService.gs          # Setup cumulativo e rotinas de inicialização
│   ├── ReleaseS2610F2.gs        # Diagnóstico e gates da versão S26.10
│   ├── CompatibilidadeVersaoS2610.gs # Validações de compatibilidade de runtime
│   └── ClonarBaseSetor.gs       # Serviço de provisionamento/clonagem para novos setores
│
├── torres/                      # Módulo de Torres e Núcleos Verticais (S26.10)
│   ├── TorresDiagnosticoS2610A.gs  # Diagnóstico e integridade física de torres
│   ├── TorresEditorS2610C.gs       # Editor e cadastro de torres e componentes
│   ├── TorresGovernancaS2610F.gs   # Governança, snapshots e publicações
│   ├── TorresIntegracaoS2610G.gs   # Resolução de localização cruzada (Torres x REGISTROS)
│   ├── TorresIntegracaoS2610GFix1.gs
│   ├── TorresOfflineS2610E.gs      # Cache local e resolução offline de torres
│   └── TorresResolverS2610D.gs     # Resolvedor de ponto geométrico em torres
│
├── catalogos/                   # Catálogos de Domínio e Taxonomias (S26.9)
│   ├── CatalogosDominioServiceS269B1.gs  # CRUD e schema de catálogos
│   ├── CatalogosDominioAdminS269B2.gs    # Administração de catálogos e opções
│   ├── CatalogosDominioDiagnosticoS269A.gs # Verificações de integridade
│   └── ReleaseS269F2.gs                  # Governança de promoção da fase S26.9
│
├── cartografia/                 # Motor Cartográfico e Mapas
│   ├── CartografiaService.gs    # Gerenciamento de plantas e áreas do mall
│   ├── Cartografia2025Service.gs # Suporte a Níveis Compostos (N0 a N3)
│   ├── MapService.gs            # Geometrias vetoriais, calibração e SIG
│   └── PresetsCamadasService.gs # Gestão de camadas visuais do mapa
│
├── referencias/                 # Pontos de Referência Centralizados (S26.10-R)
│   ├── ReferenciaCentralS2610R2.gs ... ReferenciaCentralS2610R6C.gs
│   ├── ReferenciaCatalogosS2610R8.gs
│   └── GateS2610R1ReferenciasService.gs / GateS2610R7ReferenciasService.gs
│
├── offline/                     # Sincronização Local-First e IndexedDB
│   ├── OfflineService.gs        # Sincronização de filas (Outbox), fotos e auditoria
│   ├── AcessoMovelS2611A2.gs    # Detecção e responsividade para dispositivos móveis
│   ├── AcessosDispositivosS2611A4.gs # Auditoria de dispositivos conectados
│   └── CompatS269F2S2610E.gs    # Camada de compatibilidade de cache
│
├── relatorios/                  # Geração de Apresentações e Relatórios
│   └── RelatorioSlidesService.gs # Exportação em lotes para Google Slides
│
├── backup/                      # Sistema de Backup e Integridade
│   └── BackupService.gs         # Backups automáticos, hashes SHA-256 e restauração
│
└── gates_legados/               # Trilha histórica de migração (S26.7 / S26.8)
    ├── GateS268E2Service.gs ... GateS268E5Service.gs
    └── ReleaseS268Service.gs
```

---

## 3. Regras Inegociáveis de Governança

1. **NÃO REINVENTAR OU REIMPLEMENTAR MÓDULOS EXISTENTES**:
   - Os módulos de **Sinalização**, **Cartografia**, **Subsolo**, **Catálogos de Domínio**, **Torres Verticais**, **Sincronização Offline** e **Backups** já estão implementados e consolidados.
   - Qualquer nova solicitação deve **estender** ou **configurar** esses serviços, nunca recriá-los do zero.

2. **PRESERVAÇÃO DA BASELINE DE PRODUÇÃO**:
   - Não rebaixar versões ou fases (`APP_VERSAO` / `APP_FASE`).
   - Não renomear APIs legadas marcadas com sufixos históricos (ex: `S5A`, `S14`, `S16`, `S23.6`, `S2610`), pois a UI client-side e os bancos locais IndexedDB dependem desses nomes.

3. **PADRÃO PARA NOVOS SETORES DA EMPRESA**:
   - Para criar instâncias do sistema para outros setores, utilizar sempre o serviço oficial de provisionamento em `src/core/ClonarBaseSetor.gs` via `clonarBaseParaNovoSetor(nomeSetor)`.
   - Isso garante pastas limpas no Drive, planilha sanitizada (sem dados antigos) e configuração automática dos IDs na aba `CONFIG`.

4. **COMPATIBILIDADE COM GOOGLE APPS SCRIPT V8**:
   - Arquivos `.gs` compartilham o escopo global. Usar funções com sufixos privados `_` ou namespaces em IIFE para evitar colisão de variáveis de mesmo nome.
   - Não utilizar sintaxes não suportadas pelo Apps Script (ex: módulos ES `import/export`, `require`, `fs`).

5. **INTEGRIDADE DO VERSIONAMENTO**:
   - Manter a raiz sincronizada com o GitHub (`origin/main`).
   - Todos os arquivos editados devem passar no teste de sintaxe V8 antes de qualquer commit.
