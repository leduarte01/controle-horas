# Sistema de Controle de Horas (Full-Stack)

Um painel web moderno, responsivo e seguro para gestão empresarial, faturamento de clientes, apontamento de atividades e controle financeiro de projetos.

## 🚀 O que há de novo na versão atual?
Esta aplicação evoluiu de um projeto LocalStorage para uma infraestrutura **Full-Stack SaaS-ready**, totalmente integrada a provedores na nuvem como o Easy Panel.

### 🌟 Destaques Arquiteturais
*   **Back-End Isolado (Node.js):** Toda a API, roteamento e comunicação com o banco de dados rodam protegidas em uma camada invisível do usuário final (Express.js).
*   **Banco de Dados PostgreSQL:** Abandono do LocalStorage. Segurança e relacionalidade garantida usando chaves-estrangeiras com exclusão `CASCADE`. 
*   **Auth de Login Proprietário:** Uma tela de bloqueio com Glassmorphism protege a entrada, usando tokens JWT-Like (Sessão Criptografada `Bearer Token`).
*   **Estética Premium (Dark Theme):** Transição de paletas claras para um UI robusto "Dark/Glass" usando TailwindCSS, focado em menor fadiga visual em rotinas longas de horas administrativas.

---

## 🛠 Funcionalidades do Sistema

### 📊 Dashboard
*   Resumo ágil com totais financeiros em R$.
*   Total de clientes e projetos ativos.
*   Gráficos ou contadores estéticos.
*   **Faturamento Inteligente:** O sistema calcula o período de faturamento "vigente" de forma autônoma. Todo dia 18 o ciclo vira para o próximo mês de pagamento.

### 👥 Gestão de Clientes e Projetos
*   Ligação Restrita: Não existe projeto sem dono. Se um cliente for excluído, o banco de dados limpa automaticamente todos os projetos vinculados para manter a casa limpa e não quebrar relatórios.
*   Campos completos e editáveis.

### ⏰ Lançamento de Horas
*   Cálculo cruzado automático de "Duração" X "Valor/Hora" pago no projeto.
*   Integração nativa com o painel para exportar e auditar tarefas.

### 📈 Exportações (Relatórios Empresariais)
*   **Filtros Cirúrgicos:** Recorte por janela de dias, por cliente e por projeto.
*   Exportação para PDF pronta para assinar ou enviar via WhatsApp.
*   Planilha Excel (.xlsx) com múltiplas formatações matemáticas separadas por abas.

---

## 💻 Tech Stack (Tecnologias Usadas)

*   **Front-End:** Modular Vanilla Architecture (HTML5, Javascript separado em módulos lógicos, Custom Selects).
*   **Estilização:** Vanilla CSS interligado com propriedades utilitárias de Tailwind CSS.
*   **Back-End Engine:** Node.js com Express.
*   **Database:** PostgreSQL (`pg` driver nativo com proteção Anti-SQL Injection).
*   **Apoio Tático:** SheetJS (Excel) e jsPDF (PDF).

---

## 🔧 Configurando na Nuvem (Ex: Easy Panel / Nixpacks)

Este projeto foi desenhado sob medida para dar "Um-Clique Deploy":

1.  Hospede este código no **GitHub**.
2.  No provedor (ex: Easy Panel), conecte o Repositório e crie um **App Node.js**.
3.  Inclua as seguintes Variáveis de Ambiente (`Environment`):
    *   `DATABASE_URL` (String de conexão URI do seu banco de dados Postgres hospedado)
    *   `ADMIN_USER` (Seu usuário escolhido para a tela de login)
    *   `ADMIN_PASS` (Sua senha secreta de tela de login)
4.  Dê **Deploy**. 

O script de inicialização (`npm start`) cuidará de preparar o servidor, disparar a auto-criação das tabelas SQL, e iniciar a API rodando segura e escondida.

---

**Desenvolvido sob rígido rigor técnico. Pronto para o mundo corporativo.**