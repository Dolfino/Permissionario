# TEMPLATE DE PROMPT — NOVO SETOR / NOVAS IMPLEMENTAÇÕES
> Copie e cole este prompt no início de um novo chat no Antigravity quando for iniciar implementações para um setor específico.

---

### [COPIAR A PARTIR DAQUI]

```markdown
Olá Antigravity!

Estamos utilizando a base consolidada do projeto Sinalização do Mall (versão MVP-3.32.0-SINALIZACAO-S26.10), que já está testada e aprovada em produção. O repositório segue a estrutura modular dentro da pasta `src/` e possui as diretrizes registradas no arquivo AGENTS.md.

O objetivo deste chat é adaptar/evoluir esta aplicação para o setor:
👉 [NOME DO SETOR: Ex. Almoxarifado / Estacionamento / Operações]

STATUS ATUAL:
- A base limpa de pastas no Drive e a planilha já foram provisionadas via ClonarBaseSetor.gs.
- Link da Planilha deste setor: [INSERIR_LINK_DA_PLANILHA_AQUI_SE_HOUVER]
- Link da Pasta no Drive deste setor: [INSERIR_LINK_DA_PASTA_AQUI_SE_HOUVER]

DEMANDAS ESPECÍFICAS PARA ESTE SETOR:
1. [Descreva aqui a demanda 1 - Ex: Ajustar os tipos no catálogo de domínio para X, Y e Z]
2. [Descreva aqui a demanda 2 - Ex: Adicionar o campo "Código do Patrimônio" no formulário de cadastro]
3. [Descreva aqui a demanda 3 - Ex: Ocultar o módulo de Torres verticais ou renomear para Galpões]

REGRAS OBRIGATÓRIAS:
- Não recrie a aplicação do zero nem altere os módulos consolidados que não fazem parte do escopo.
- Mantenha o código 100% compatível com a engine V8 do Google Apps Script.
- Ao final, valide a sintaxe dos arquivos alterados em src/ antes de concluir.

Apresente um plano sucinto com os arquivos que serão alterados e aguarde minha confirmação para prosseguir.
```

---

### Dicas para o Desenvolvedor:
1. **Antes de iniciar um novo setor**:
   - Vá na planilha base e execute **Sinalização do Mall ➔ Provisionar novo setor (Clonar base limpa)**.
   - Guarde os links da nova planilha e nova pasta geradas.
2. **Ao abrir o novo chat**:
   - Preencha os campos entre colchetes no prompt acima e envie para o Antigravity.
   - O agente saberá exatamente onde mexer sem quebrar a base.
