# 📘 GUIA COMPLETO PASSO A PASSO (DO ZERO)
## Como Criar e Colocar no Ar o Aplicativo para um Novo Setor

> **Para quem é este manual?**  
> Este guia foi feito para qualquer pessoa da empresa, **mesmo sem nenhum conhecimento técnico ou de programação**, conseguir criar um sistema novinho e independente para qualquer setor (ex: *Almoxarifado*, *Operações*, *Segurança*, *Estacionamento*).

---

## 🧭 O que acontece nesse processo?

Quando você segue este passo a passo, o sistema cria automaticamente:
1. **Uma pasta nova e organizada no Google Drive** exclusiva para o novo setor (com pastas para Fotos, Backups e Relatórios).
2. **Uma planilha nova, limpa e configurada** (sem os dados de outros setores, mas com todas as telas e regras prontas).
3. **Um link do aplicativo (Web App)** para os colaboradores usarem no celular ou no computador, inclusive sem internet (offline).

---

## 📋 Pré-requisito Único

- Estar logado no navegador (Chrome recomendado) com a sua **conta Google da empresa** que tem acesso à planilha base.

---

# ETAPA 1: Gerar a Base Limpa (2 Cliques)

### 1.1. Abra a Planilha Base Matriz
Clique no link oficial da planilha modelo:  
👉 **[Abrir Planilha Base Matriz](https://docs.google.com/spreadsheets/d/1j5bYY-0JpbLd95FyV19lyRPSG6j9kpoM8UCCWZjKchs/edit)**

---

### 1.2. Clique no Menu do Sistema
Na barra de menus superior da planilha (onde fica *Arquivo*, *Editar*, *Ver*...), você verá um menu chamado:  
👉 **Sinalização do Mall**

1. Clique em **Sinalização do Mall**.
2. Clique na opção: **`Provisionar novo setor (Clonar base limpa)`**.

---

### ⚠️ ATENÇÃO: Se for sua primeira vez (Autorização do Google)
O Google pode exibir uma janela dizendo: *"Autorização necessária: Este script precisa de permissão para ser executado"*. **Isso é perfeitamente normal!** Faça o seguinte:
1. Clique em **Continuar**.
2. Escolha o seu e-mail do Google.
3. Se aparecer a tela *"O Google não verificou este app"*, clique na palavra pequena embaixo: **Avançado**.
4. Depois clique no link que aparece: **Acessar Sinalização do Mall (não seguro)**.
5. Na última tela, role para baixo e clique em **Permitir**.
6. *Agora clique novamente no menu **Sinalização do Mall ➔ Provisionar novo setor (Clonar base limpa)**.*

---

### 1.3. Digite o Nome do Novo Setor
1. Uma caixinha azul vai abrir perguntando o nome do setor.
2. Digite o nome desejado (Exemplos: `Almoxarifado`, `Estacionamento`, `Operações Central`).
3. Clique em **OK**.
4. Uma janela de confirmação vai aparecer. Clique em **Sim**.

---

### 1.4. Guarde os Links Gerados
Aguarde de 5 a 15 segundos. Uma tela verde com um **✅ Sucesso** vai se abrir exibindo dois links:
- 📊 **Nova Planilha**: A planilha limpa exclusiva deste setor.
- 📁 **Nova Pasta no Google Drive**: A pasta onde ficarão todas as fotos e relatórios.

> 💡 **Dica de ouro**: Clique nos dois links e salve-os nos seus favoritos do navegador!

---

# ETAPA 2: Colocar o Aplicativo no Ar (Publicar o Web App)

Agora que você tem a nova planilha do setor, vamos gerar o link do aplicativo que vai para o celular da equipe:

### 2.1. Abra o Editor de Código da Nova Planilha
1. Abra a **Nova Planilha** que acabou de ser criada na Etapa 1.
2. No menu superior da planilha, clique em:  
   👉 **Extensões** ➔ **Apps Script**.
3. Uma nova aba vai se abrir com a tela do Google Apps Script.

---

### 2.2. Iniciar a Nova Implantação
1. No canto superior direito da tela, clique no botão azul: **Implantar** (ou *Deploy*).
2. No menu que se abre, clique em: **Nova implantação** (ou *New deployment*).

---

### 2.3. Preencher as Configurações de Acesso
Uma janela vai se abrir no meio da tela:
1. Ao lado esquerdo de *"Selecionar tipo"*, se houver um ícone de engrenagem ⚙️, clique nele e selecione **Aplicativo da Web** (*Web app*).
2. Preencha os 3 campos:
   - **Descrição**: Digite `Versão Inicial do Setor`.
   - **Executar como**: Deixe marcado **`Eu (seu.email@empresa.com)`**.
   - **Quem tem acesso**: Selecione **`Qualquer pessoa`** (ou *Qualquer pessoa com conta Google*).
3. Clique no botão azul **Implantar** (*Deploy*).

---

### 2.4. Copiar o Link do Aplicativo
Ao final, o Google vai exibir a tela de sucesso com o link:
- Em **Aplicativo da Web** (*Web app URL*), clique no botão **Copiar**.

🎉 **PRONTO! Esse link copiado é o aplicativo oficial do novo setor!**  
Você já pode abrir no navegador do seu celular ou do seu computador para testar.

---

# ETAPA 3: Cadastrar Pessoas da Equipe (Usuários)

Para que outros colegas possam acessar o sistema:

1. Abra a **Nova Planilha** do setor.
2. Procure a aba chamada **`USUARIOS`** (na parte inferior da planilha).
3. Você verá que o seu e-mail já está cadastrado na linha 2 como `ADMIN`.
4. Para cadastrar um novo colega, adicione uma linha logo abaixo preenchendo:
   - **EMAIL**: O e-mail Google da pessoa (ex: `joao.silva@empresa.com`).
   - **NOME**: O nome completo da pessoa (ex: `João Silva`).
   - **PERFIL**:
     - `ADMIN`: Pode cadastrar, editar, ver relatórios e gerenciar outros usuários.
     - `OPERADOR`: Pode cadastrar e editar sinalizações/itens no mapa.
     - `CONSULTA`: Apenas visualiza o mapa e as informações.
   - **ATIVO**: Escreva `TRUE`.
   - **SETOR_PADRAO**: O nome do setor (ex: `Almoxarifado`).

---

# 📱 Como Usar no Celular (Criar Ícone na Tela Inicial)

Para os operadores no campo, o sistema funciona como um aplicativo instalado:

### No Android (Google Chrome):
1. Abra o link do Web App no Chrome.
2. Toque nos 3 pontinhos no canto superior direito.
3. Toque em **"Adicionar à tela inicial"** ou **"Instalar aplicativo"**.
4. O ícone aparecerá junto aos seus outros aplicativos.

### No iPhone (Safari):
1. Abra o link do Web App no Safari.
2. Toque no botão de **Compartilhar** (quadradinho com uma seta para cima).
3. Role para baixo e toque em **"Adicionar à Tela de Início"**.
4. Toque em **Adicionar**.

---

# ❓ Perguntas Frequentes (Tira Dúvidas)

#### 1. Os dados de um setor podem vazar ou se misturar com outro?
**Não!** Cada setor tem sua própria pasta isolada no Google Drive e sua própria planilha com identificadores exclusivos.

#### 2. E se a internet cair enquanto o operador estiver no subsolo ou em área sem sinal?
O sistema foi construído na arquitetura **Offline-First**. O operador pode continuar visualizando os mapas, marcando pontos e tirando fotos normalmente. Assim que o aparelho reconectar à internet, os dados são sincronizados automaticamente em segundo plano.

#### 3. Posso apagar ou renomear as abas da planilha?
**Não renomeie nem apague nenhuma aba.** O aplicativo depende dos nomes exatos das abas para funcionar corretamente.

#### 4. Quantos setores posso criar?
Quantos forem necessários. O processo é ilimitado e leva menos de 3 minutos para cada novo setor da empresa.
