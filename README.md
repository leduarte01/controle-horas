# Sistema de Controle de Horas

Um aplicativo web moderno e responsivo para controle de horas trabalhadas em projetos de clientes.

## 🚀 Funcionalidades

### 📊 Dashboard
- Visão geral com estatísticas em tempo real
- Total de clientes cadastrados
- Total de projetos ativos
- Horas trabalhadas no mês atual
- Número de lançamentos do dia
- Lista dos últimos lançamentos realizados

### 👥 Gestão de Clientes
- Cadastro de novos clientes
- Campos: nome, e-mail, telefone
- Listagem de todos os clientes
- Exclusão de clientes (com confirmação)

### 📁 Gestão de Projetos
- Cadastro de projetos vinculados a clientes
- Campos: cliente, nome do projeto, descrição, valor por hora
- Listagem de todos os projetos com informações do cliente
- Exclusão de projetos (com confirmação)

### ⏰ Lançamento de Horas
- Seleção de projeto
- Data, hora de início e fim
- Cálculo automático da duração
- Descrição da atividade realizada
- Cálculo automático do valor baseado na duração e valor/hora do projeto

### 📈 Relatórios
- Filtros avançados por:
  - Cliente
  - Projeto
  - Período (data início e fim)
- Relatório detalhado com todos os lançamentos
- Resumo com total de horas e valor
- Exportação em Excel (.xlsx)
- Exportação em PDF

## 💻 Como Usar

1. **Primeiro Acesso**
   - Abra o arquivo `index.html` em seu navegador
   - O sistema iniciará com dados vazios

2. **Cadastrar Clientes**
   - Acesse a aba "Clientes"
   - Preencha o formulário com nome (obrigatório), e-mail e telefone
   - Clique em "Cadastrar"

3. **Cadastrar Projetos**
   - Acesse a aba "Projetos"
   - Selecione um cliente existente
   - Preencha nome do projeto (obrigatório), descrição e valor/hora
   - Clique em "Cadastrar"

4. **Lançar Horas**
   - Acesse a aba "Lançar Horas"
   - Selecione um projeto existente
   - Defina a data (padrão: hoje)
   - Informe hora de início e fim
   - O sistema calculará automaticamente a duração
   - Descreva a atividade realizada
   - Clique em "Lançar Horas"

5. **Visualizar Relatórios**
   - Acesse a aba "Relatórios"
   - Use os filtros para refinar os dados (opcional)
   - Clique em "Filtrar" para visualizar o relatório
   - Use os botões "Excel" ou "PDF" para exportar

## 🔧 Tecnologias Utilizadas

- **HTML5** - Estrutura semântica
- **CSS3** - Estilização moderna com gradientes e animações
- **JavaScript ES6+** - Lógica da aplicação
- **Bootstrap 5.3** - Framework CSS responsivo
- **Bootstrap Icons** - Iconografia
- **LocalStorage** - Persistência de dados no navegador
- **SheetJS** - Exportação para Excel
- **jsPDF** - Exportação para PDF

## 📱 Responsividade

O sistema é totalmente responsivo e funciona em:
- 💻 Desktop
- 📱 Tablet
- 📱 Smartphone

## 💾 Armazenamento de Dados

Os dados são armazenados localmente no navegador usando LocalStorage. Isso significa que:
- ✅ Os dados persistem mesmo após fechar o navegador
- ✅ Não há necessidade de servidor ou banco de dados
- ⚠️ Os dados são específicos do navegador/computador utilizado
- ⚠️ Limpar dados do navegador apagará todas as informações

## 🎨 Interface

- Design **leve e arejado** com paleta clara (fundo off-white) e destaques em **teal/azul** para ações importantes
- Navbar clara para máxima legibilidade e botões de ação com cor contrastante (teal) para destaque
- Layout centralizado e responsivo com cards, sombras sutis e transições suaves
- Componentes interativos (botões, abas, tabelas) têm alto contraste e foco visual para acessibilidade

## ✏️ Edição

- É possível **editar** Clientes, Projetos e Lançamentos diretamente pela interface
- Ao editar, o formulário é preenchido automaticamente e os botões mudam para o modo "Atualizar"
- Validações mantidas em modo de edição (nomes duplicados, horários válidos, confirmação para exclusões)

## 📈 Relatórios Avançados

- Relatório visual reorganizado por **Cliente → Projeto → Lançamentos** (na tela)
- Exportação em **Excel** com múltiplas abas:
  - **Resumo** (totais por cliente)
  - **Detalhado** (lista completa com separadores por cliente/projeto)
  - **Aba individual para cada cliente** (pronto para envio mensal)
- Exportação em **PDF** com cabeçalho, período e resumo de totais

## 🔐 Validações

O sistema inclui validações para:
- Campos obrigatórios
- Horários (fim deve ser maior que início)
- Duplicação de nomes (clientes e projetos)
- Confirmações para exclusões

## 📊 Exportação

### Excel
- Planilha com todos os dados do relatório filtrado
- Colunas organizadas e formatadas
- Linha de totais automática

### PDF
- Relatório formatado para impressão
- Cabeçalho com título e período
- Resumo dos totais
- Lista detalhada dos lançamentos

## 🆘 Suporte

Para usar o sistema:
1. Certifique-se de que seu navegador suporta JavaScript
2. Recomendado: Chrome, Firefox, Safari ou Edge (versões recentes)
3. Conexão com internet (apenas para carregar bibliotecas externas)

## 🔄 Backup dos Dados

Para fazer backup manual dos dados:
1. Abra as Ferramentas de Desenvolvedor (F12)
2. Vá para a aba "Application" ou "Armazenamento"
3. Acesse "Local Storage" → "file://" (ou o domínio se estiver em servidor)
4. Copie os valores de `clientes`, `projetos` e `lancamentos`
5. Salve em arquivo de texto para restauração futura

---

## 🧾 Publicar e versionar (git)

Siga estes passos para criar uma branch, commitar e publicar no remoto:

```bash
# criar branch e alternar para ela
git checkout -b feature/readme-update

# adicionar alterações
git add .

# commitar com mensagem clara
git commit -m "docs: atualizar README com UI clara, edição de lançamentos e exportes aprimorados"

# publicar no remoto
git push -u origin feature/readme-update
```

- Depois de publicar, crie um Pull Request (PR) na plataforma do seu repositório (GitHub, GitLab, etc.) descrevendo as mudanças.
- Sugestão de título do PR: "feat(ui): paleta clara, centralização do layout, edição de lançamentos e exportes aprimorados"

---

**Desenvolvido para controle eficiente de horas e projetos! 🚀**