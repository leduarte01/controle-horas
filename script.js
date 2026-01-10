// Classe principal do sistema de controle de horas
class ControleHoras {
    constructor() {
        this.clientes = JSON.parse(localStorage.getItem('clientes')) || [];
        this.projetos = JSON.parse(localStorage.getItem('projetos')) || [];
        this.lancamentos = JSON.parse(localStorage.getItem('lancamentos')) || [];
        this.editandoProjeto = null;
        this.editandoCliente = null;
        this.editandoLancamento = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.carregarDados();
        this.atualizarDashboard();
        this.definirDataAtual();
    }

    // Event Listeners
    setupEventListeners() {
        // Formulário de clientes
        document.getElementById('formCliente').addEventListener('submit', (e) => {
            e.preventDefault();
            this.cadastrarCliente();
        });

        // Formulário de projetos
        document.getElementById('formProjeto').addEventListener('submit', (e) => {
            e.preventDefault();
            this.cadastrarProjeto();
        });

        // Formulário de lançamento
        document.getElementById('formLancamento').addEventListener('submit', (e) => {
            e.preventDefault();
            this.lancarHoras();
        });

        // Cálculo automático de tempo
        document.getElementById('horaInicio').addEventListener('change', () => this.calcularTempo());
        document.getElementById('horaFim').addEventListener('change', () => this.calcularTempo());

        // Filtros de relatório
        document.getElementById('filtroCliente').addEventListener('change', () => this.atualizarFiltrosProjeto());
    }

    // Definir data atual no campo de lançamento
    definirDataAtual() {
        const hoje = new Date().toISOString().split('T')[0];
        document.getElementById('dataLancamento').value = hoje;
        
        // Definir datas do relatório para o mês atual
        const primeiroDia = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const ultimoDia = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
        
        document.getElementById('dataInicio').value = primeiroDia.toISOString().split('T')[0];
        document.getElementById('dataFim').value = ultimoDia.toISOString().split('T')[0];
    }

    // === GESTÃO DE CLIENTES ===
    cadastrarCliente() {
        const nome = document.getElementById('nomeCliente').value.trim();
        const email = document.getElementById('emailCliente').value.trim();
        const telefone = document.getElementById('telefoneCliente').value.trim();

        if (!nome) {
            this.mostrarToast('Por favor, informe o nome do cliente.', 'error');
            return;
        }

        if (this.editandoCliente) {
            // Modo edição
            const clienteExistente = this.clientes.find(c => c.nome.toLowerCase() === nome.toLowerCase() && c.id !== this.editandoCliente.id);
            if (clienteExistente) {
                this.mostrarToast('Cliente com este nome já existe.', 'error');
                return;
            }

            // Atualizar cliente existente
            const index = this.clientes.findIndex(c => c.id === this.editandoCliente.id);
            if (index !== -1) {
                this.clientes[index] = {
                    ...this.clientes[index],
                    nome,
                    email,
                    telefone,
                    dataAtualizacao: new Date().toISOString()
                };
                
                this.mostrarToast('Cliente atualizado com sucesso!', 'success');
            }
        } else {
            // Modo cadastro
            if (this.clientes.some(cliente => cliente.nome.toLowerCase() === nome.toLowerCase())) {
                this.mostrarToast('Cliente com este nome já existe.', 'error');
                return;
            }

            const cliente = {
                id: this.gerarId(),
                nome,
                email,
                telefone,
                dataCadastro: new Date().toISOString()
            };

            this.clientes.push(cliente);
            this.mostrarToast('Cliente cadastrado com sucesso!', 'success');
        }

        this.salvarDados();
        this.carregarClientes();
        this.atualizarSelectsClientes();
        this.limparFormCliente();
        this.atualizarDashboard();
    }

    carregarClientes() {
        const container = document.getElementById('listaClientes');
        
        if (this.clientes.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">Nenhum cliente cadastrado</p>';
            return;
        }

        const tabela = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Telefone</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.clientes.map(cliente => `
                        <tr>
                            <td>${cliente.nome}</td>
                            <td>${cliente.email || '-'}</td>
                            <td>${cliente.telefone || '-'}</td>
                            <td>
                                <button class="btn btn-sm btn-warning me-1" onclick="controleHoras.editarCliente('${cliente.id}')">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="controleHoras.excluirCliente('${cliente.id}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = tabela;
    }

    editarCliente(id) {
        const cliente = this.clientes.find(c => c.id === id);
        if (!cliente) {
            this.mostrarToast('Cliente não encontrado.', 'error');
            return;
        }

        this.editandoCliente = cliente;
        
        // Preencher formulário com dados do cliente
        document.getElementById('nomeCliente').value = cliente.nome;
        document.getElementById('emailCliente').value = cliente.email || '';
        document.getElementById('telefoneCliente').value = cliente.telefone || '';
        
        // Alterar interface para modo edição
        this.alternarModoEdicaoCliente(true);
        
        // Scroll para o formulário
        document.getElementById('formCliente').scrollIntoView({ behavior: 'smooth' });
        
        this.mostrarToast('Editando cliente. Modifique os campos e clique em "Atualizar".', 'info');
    }

    alternarModoEdicaoCliente(editando) {
        const titulo = document.querySelector('#clientes .card-header h5');
        const botaoCadastrar = document.querySelector('#formCliente button[type="submit"]');
        const botaoCancelar = document.querySelector('#formCliente .btn-secondary');
        
        if (editando) {
            titulo.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Cliente';
            botaoCadastrar.innerHTML = '<i class="bi bi-check-lg me-1"></i>Atualizar';
            botaoCadastrar.className = 'btn btn-warning';
            botaoCancelar.innerHTML = '<i class="bi bi-x-lg me-1"></i>Cancelar';
        } else {
            titulo.innerHTML = '<i class="bi bi-person-plus me-2"></i>Cadastrar Cliente';
            botaoCadastrar.innerHTML = '<i class="bi bi-check-lg me-1"></i>Cadastrar';
            botaoCadastrar.className = 'btn btn-primary';
            botaoCancelar.innerHTML = '<i class="bi bi-x-lg me-1"></i>Limpar';
        }
    }

    excluirCliente(id) {
        if (confirm('Tem certeza que deseja excluir este cliente? Esta ação também removerá todos os projetos e lançamentos relacionados.')) {
            // Remover projetos do cliente
            this.projetos = this.projetos.filter(projeto => projeto.clienteId !== id);
            
            // Remover lançamentos dos projetos do cliente
            const projetosCliente = this.projetos.filter(projeto => projeto.clienteId === id).map(p => p.id);
            this.lancamentos = this.lancamentos.filter(lancamento => !projetosCliente.includes(lancamento.projetoId));
            
            // Remover cliente
            this.clientes = this.clientes.filter(cliente => cliente.id !== id);
            
            this.salvarDados();
            this.carregarDados();
            this.atualizarDashboard();
            this.mostrarToast('Cliente excluído com sucesso!', 'success');
        }
    }

    limparFormCliente() {
        document.getElementById('formCliente').reset();
        this.editandoCliente = null;
        this.alternarModoEdicaoCliente(false);
    }

    // === GESTÃO DE PROJETOS ===
    cadastrarProjeto() {
        const clienteId = document.getElementById('clienteProjeto').value;
        const nome = document.getElementById('nomeProjeto').value.trim();
        const descricao = document.getElementById('descricaoProjeto').value.trim();
        const valorHora = parseFloat(document.getElementById('valorHoraProjeto').value) || 0;

        if (!clienteId || !nome) {
            this.mostrarToast('Por favor, selecione um cliente e informe o nome do projeto.', 'error');
            return;
        }

        if (this.editandoProjeto) {
            // Modo edição
            const projetoExistente = this.projetos.find(p => p.clienteId === clienteId && p.nome.toLowerCase() === nome.toLowerCase() && p.id !== this.editandoProjeto.id);
            if (projetoExistente) {
                this.mostrarToast('Projeto com este nome já existe para o cliente selecionado.', 'error');
                return;
            }

            // Atualizar projeto existente
            const index = this.projetos.findIndex(p => p.id === this.editandoProjeto.id);
            if (index !== -1) {
                this.projetos[index] = {
                    ...this.projetos[index],
                    clienteId,
                    nome,
                    descricao,
                    valorHora,
                    dataAtualizacao: new Date().toISOString()
                };
                
                this.mostrarToast('Projeto atualizado com sucesso!', 'success');
            }
        } else {
            // Modo cadastro
            if (this.projetos.some(projeto => projeto.clienteId === clienteId && projeto.nome.toLowerCase() === nome.toLowerCase())) {
                this.mostrarToast('Projeto com este nome já existe para o cliente selecionado.', 'error');
                return;
            }

            const projeto = {
                id: this.gerarId(),
                clienteId,
                nome,
                descricao,
                valorHora,
                dataCadastro: new Date().toISOString()
            };

            this.projetos.push(projeto);
            this.mostrarToast('Projeto cadastrado com sucesso!', 'success');
        }

        this.salvarDados();
        this.carregarProjetos();
        this.atualizarSelectsProjetos();
        this.limparFormProjeto();
        this.atualizarDashboard();
    }

    carregarProjetos() {
        const container = document.getElementById('listaProjetos');
        
        if (this.projetos.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">Nenhum projeto cadastrado</p>';
            return;
        }

        const tabela = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Projeto</th>
                        <th>Descrição</th>
                        <th>Valor/Hora</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.projetos.map(projeto => {
                        const cliente = this.clientes.find(c => c.id === projeto.clienteId);
                        return `
                            <tr>
                                <td>${cliente ? cliente.nome : 'Cliente não encontrado'}</td>
                                <td>${projeto.nome}</td>
                                <td>${projeto.descricao || '-'}</td>
                                <td>R$ ${projeto.valorHora.toFixed(2)}</td>
                                <td>
                                    <button class="btn btn-sm btn-warning me-1" onclick="controleHoras.editarProjeto('${projeto.id}')">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="controleHoras.excluirProjeto('${projeto.id}')">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = tabela;
    }

    editarProjeto(id) {
        const projeto = this.projetos.find(p => p.id === id);
        if (!projeto) {
            this.mostrarToast('Projeto não encontrado.', 'error');
            return;
        }

        this.editandoProjeto = projeto;
        
        // Preencher formulário com dados do projeto
        document.getElementById('clienteProjeto').value = projeto.clienteId;
        document.getElementById('nomeProjeto').value = projeto.nome;
        document.getElementById('descricaoProjeto').value = projeto.descricao || '';
        document.getElementById('valorHoraProjeto').value = projeto.valorHora;
        
        // Alterar interface para modo edição
        this.alternarModoEdicaoProjeto(true);
        
        // Scroll para o formulário
        document.getElementById('formProjeto').scrollIntoView({ behavior: 'smooth' });
        
        this.mostrarToast('Editando projeto. Modifique os campos e clique em "Atualizar".', 'info');
    }

    excluirProjeto(id) {
        if (confirm('Tem certeza que deseja excluir este projeto? Esta ação também removerá todos os lançamentos relacionados.')) {
            // Remover lançamentos do projeto
            this.lancamentos = this.lancamentos.filter(lancamento => lancamento.projetoId !== id);
            
            // Remover projeto
            this.projetos = this.projetos.filter(projeto => projeto.id !== id);
            
            this.salvarDados();
            this.carregarDados();
            this.atualizarDashboard();
            this.mostrarToast('Projeto excluído com sucesso!', 'success');
        }
    }

    alternarModoEdicaoProjeto(editando) {
        const titulo = document.querySelector('#projetos .card-header h5');
        const botaoCadastrar = document.querySelector('#formProjeto button[type="submit"]');
        const botaoCancelar = document.querySelector('#formProjeto .btn-secondary');
        
        if (editando) {
            titulo.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Projeto';
            botaoCadastrar.innerHTML = '<i class="bi bi-check-lg me-1"></i>Atualizar';
            botaoCadastrar.className = 'btn btn-warning';
            botaoCancelar.innerHTML = '<i class="bi bi-x-lg me-1"></i>Cancelar';
        } else {
            titulo.innerHTML = '<i class="bi bi-folder-plus me-2"></i>Cadastrar Projeto';
            botaoCadastrar.innerHTML = '<i class="bi bi-check-lg me-1"></i>Cadastrar';
            botaoCadastrar.className = 'btn btn-success';
            botaoCancelar.innerHTML = '<i class="bi bi-x-lg me-1"></i>Limpar';
        }
    }

    limparFormProjeto() {
        document.getElementById('formProjeto').reset();
        this.editandoProjeto = null;
        this.alternarModoEdicaoProjeto(false);
    }

    // === LANÇAMENTO DE HORAS ===
    lancarHoras() {
        const projetoId = document.getElementById('projetoLancamento').value;
        const data = document.getElementById('dataLancamento').value;
        const horaInicio = document.getElementById('horaInicio').value;
        const horaFim = document.getElementById('horaFim').value;
        const descricao = document.getElementById('descricaoAtividade').value.trim();

        if (!projetoId || !data || !horaInicio || !horaFim || !descricao) {
            this.mostrarToast('Por favor, preencha todos os campos.', 'error');
            return;
        }

        // Validar horários
        if (horaInicio >= horaFim) {
            this.mostrarToast('Hora de fim deve ser maior que hora de início.', 'error');
            return;
        }

        // Calcular duração em horas usando Date no timezone local
        const inicio = this.parseDateLocal(data);
        const [hi, hmi] = horaInicio.split(':').map(h => parseInt(h, 10));
        inicio.setHours(hi, hmi, 0, 0);

        const fim = this.parseDateLocal(data);
        const [hf, hfm] = horaFim.split(':').map(h => parseInt(h, 10));
        fim.setHours(hf, hfm, 0, 0);

        const duracao = (fim - inicio) / (1000 * 60 * 60); // em horas

        const projeto = this.projetos.find(p => p.id === projetoId);
        const valorTotal = duracao * (projeto.valorHora || 0);

        if (this.editandoLancamento) {
            // Modo edição
            const index = this.lancamentos.findIndex(l => l.id === this.editandoLancamento.id);
            if (index !== -1) {
                this.lancamentos[index] = {
                    ...this.lancamentos[index],
                    projetoId,
                    data,
                    horaInicio,
                    horaFim,
                    duracao: parseFloat(duracao.toFixed(2)),
                    descricao,
                    valorTotal: parseFloat(valorTotal.toFixed(2)),
                    dataAtualizacao: new Date().toISOString()
                };
                
                this.mostrarToast(`Lançamento atualizado com sucesso! Duração: ${duracao.toFixed(2)}h`, 'success');
            }
        } else {
            // Modo cadastro
            const lancamento = {
                id: this.gerarId(),
                projetoId,
                data,
                horaInicio,
                horaFim,
                duracao: parseFloat(duracao.toFixed(2)),
                descricao,
                valorTotal: parseFloat(valorTotal.toFixed(2)),
                dataLancamento: new Date().toISOString()
            };

            this.lancamentos.push(lancamento);
            this.mostrarToast(`Lançamento realizado com sucesso! Duração: ${duracao.toFixed(2)}h`, 'success');
        }

        this.salvarDados();
        this.limparFormLancamento();
        this.atualizarDashboard();
    }

    calcularTempo() {
        const horaInicio = document.getElementById('horaInicio').value;
        const horaFim = document.getElementById('horaFim').value;
        const data = document.getElementById('dataLancamento').value || new Date().toISOString().split('T')[0];
        const tempoElement = document.getElementById('tempoCalculado');
        const textoElement = document.getElementById('textoTempo');

        if (horaInicio && horaFim) {
            if (horaInicio >= horaFim) {
                tempoElement.style.display = 'block';
                textoElement.textContent = 'Hora de fim deve ser maior que hora de início.';
                tempoElement.className = 'alert alert-danger';
            } else {
                const inicio = this.parseDateLocal(data);
                const [hi, hmi] = horaInicio.split(':').map(h => parseInt(h, 10));
                inicio.setHours(hi, hmi, 0, 0);

                const fim = this.parseDateLocal(data);
                const [hf, hfm] = horaFim.split(':').map(h => parseInt(h, 10));
                fim.setHours(hf, hfm, 0, 0);

                const duracao = (fim - inicio) / (1000 * 60 * 60);
                
                tempoElement.style.display = 'block';
                textoElement.textContent = `Duração calculada: ${duracao.toFixed(2)} horas`;
                tempoElement.className = 'alert alert-info';
            }
        } else {
            tempoElement.style.display = 'none';
        }
    }

    editarLancamento(id) {
        const lancamento = this.lancamentos.find(l => l.id === id);
        if (!lancamento) {
            this.mostrarToast('Lançamento não encontrado.', 'error');
            return;
        }

        this.editandoLancamento = lancamento;
        
        // Ir para a aba de lançamento
        document.getElementById('lancamento-tab').click();
        
        // Aguardar a aba carregar antes de preencher o formulário
        setTimeout(() => {
            // Preencher formulário com dados do lançamento
            document.getElementById('projetoLancamento').value = lancamento.projetoId;
            document.getElementById('dataLancamento').value = lancamento.data;
            document.getElementById('horaInicio').value = lancamento.horaInicio;
            document.getElementById('horaFim').value = lancamento.horaFim;
            document.getElementById('descricaoAtividade').value = lancamento.descricao;
            
            // Alterar interface para modo edição
            this.alternarModoEdicaoLancamento(true);
            
            // Calcular tempo
            this.calcularTempo();
            
            // Scroll para o formulário
            document.getElementById('formLancamento').scrollIntoView({ behavior: 'smooth' });
            
            this.mostrarToast('Editando lançamento. Modifique os campos e clique em "Atualizar".', 'info');
        }, 100);
    }

    excluirLancamento(id) {
        if (confirm('Tem certeza que deseja excluir este lançamento?')) {
            this.lancamentos = this.lancamentos.filter(lancamento => lancamento.id !== id);
            this.salvarDados();
            this.atualizarDashboard();
            this.mostrarToast('Lançamento excluído com sucesso!', 'success');
        }
    }

    alternarModoEdicaoLancamento(editando) {
        const titulo = document.querySelector('#lancamento .card-header h5');
        const botaoLancar = document.querySelector('#formLancamento button[type="submit"]');
        const botaoCancelar = document.querySelector('#formLancamento .btn-secondary');
        
        if (editando) {
            titulo.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Lançamento';
            botaoLancar.innerHTML = '<i class="bi bi-check-lg me-1"></i>Atualizar';
            botaoLancar.className = 'btn btn-warning';
            botaoCancelar.innerHTML = '<i class="bi bi-x-lg me-1"></i>Cancelar';
        } else {
            titulo.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Lançar Horas';
            botaoLancar.innerHTML = '<i class="bi bi-check-lg me-1"></i>Lançar Horas';
            botaoLancar.className = 'btn btn-warning';
            botaoCancelar.innerHTML = '<i class="bi bi-x-lg me-1"></i>Limpar';
        }
    }

    limparFormLancamento() {
        document.getElementById('formLancamento').reset();
        document.getElementById('tempoCalculado').style.display = 'none';
        this.editandoLancamento = null;
        this.alternarModoEdicaoLancamento(false);
        this.definirDataAtual();
    }

    // === DASHBOARD ===
    atualizarDashboard() {
        // Contadores
        document.getElementById('totalClientes').textContent = this.clientes.length;
        document.getElementById('totalProjetos').textContent = this.projetos.length;

        // Horas do mês atual
        const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM
        const horasMes = this.lancamentos
            .filter(l => l.data.startsWith(mesAtual))
            .reduce((total, l) => total + l.duracao, 0);
        document.getElementById('horasMes').textContent = horasMes.toFixed(1);

        // Entradas de hoje
        const hoje = new Date().toISOString().split('T')[0];
        const entradasHoje = this.lancamentos.filter(l => l.data === hoje).length;
        document.getElementById('entradasHoje').textContent = entradasHoje;

        // Últimos lançamentos
        this.carregarUltimosLancamentos();
    }

    carregarUltimosLancamentos() {
        const container = document.getElementById('ultimosLancamentos');
        const ultimosLancamentos = this.lancamentos
            .sort((a, b) => new Date(b.dataLancamento) - new Date(a.dataLancamento))
            .slice(0, 5);

        if (ultimosLancamentos.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">Nenhum lançamento encontrado</p>';
            return;
        }

        const tabela = `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Projeto</th>
                        <th>Cliente</th>
                        <th>Duração</th>
                        <th>Valor</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${ultimosLancamentos.map(lancamento => {
                        const projeto = this.projetos.find(p => p.id === lancamento.projetoId);
                        const cliente = projeto ? this.clientes.find(c => c.id === projeto.clienteId) : null;
                        return `
                            <tr>
                                <td>${this.formatarData(lancamento.data)}</td>
                                <td>${projeto ? projeto.nome : 'Projeto não encontrado'}</td>
                                <td>${cliente ? cliente.nome : 'Cliente não encontrado'}</td>
                                <td>${lancamento.duracao}h</td>
                                <td>R$ ${lancamento.valorTotal.toFixed(2)}</td>
                                <td>
                                    <button class="btn btn-sm btn-warning me-1" onclick="controleHoras.editarLancamento('${lancamento.id}')" title="Editar">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="controleHoras.excluirLancamento('${lancamento.id}')" title="Excluir">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        container.innerHTML = tabela;
    }

    // === RELATÓRIOS ===
    agruparLancamentosPorClienteProjeto(lancamentos) {
        // Ordenar por data (mais recente primeiro)
        lancamentos.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        const clientesMap = new Map();
        
        lancamentos.forEach(lancamento => {
            const projeto = this.projetos.find(p => p.id === lancamento.projetoId);
            const cliente = projeto ? this.clientes.find(c => c.id === projeto.clienteId) : null;
            
            if (!cliente || !projeto) return;
            
            // Agrupar por cliente
            if (!clientesMap.has(cliente.id)) {
                clientesMap.set(cliente.id, {
                    nomeCliente: cliente.nome,
                    totalHoras: 0,
                    valorTotal: 0,
                    projetos: new Map()
                });
            }
            
            const clienteData = clientesMap.get(cliente.id);
            clienteData.totalHoras += lancamento.duracao;
            clienteData.valorTotal += lancamento.valorTotal;
            
            // Agrupar por projeto dentro do cliente
            if (!clienteData.projetos.has(projeto.id)) {
                clienteData.projetos.set(projeto.id, {
                    nomeProjeto: projeto.nome,
                    valorHora: projeto.valorHora,
                    totalHoras: 0,
                    valorTotal: 0,
                    lancamentos: []
                });
            }
            
            const projetoData = clienteData.projetos.get(projeto.id);
            projetoData.totalHoras += lancamento.duracao;
            projetoData.valorTotal += lancamento.valorTotal;
            projetoData.lancamentos.push(lancamento);
        });
        
        // Converter Maps para Arrays e ordenar
        const resultado = Array.from(clientesMap.values()).map(clienteData => {
            clienteData.projetos = Array.from(clienteData.projetos.values());
            // Ordenar projetos por valor total (maior primeiro)
            clienteData.projetos.sort((a, b) => b.valorTotal - a.valorTotal);
            return clienteData;
        });
        
        // Ordenar clientes por valor total (maior primeiro)
        resultado.sort((a, b) => b.valorTotal - a.valorTotal);
        
        return resultado;
    }

    aplicarFiltros() {
        const clienteId = document.getElementById('filtroCliente').value;
        const projetoId = document.getElementById('filtroProjeto').value;
        const dataInicio = document.getElementById('dataInicio').value;
        const dataFim = document.getElementById('dataFim').value;

        let lancamentosFiltrados = [...this.lancamentos];

        // Filtrar por projeto (que já inclui o cliente)
        if (projetoId) {
            lancamentosFiltrados = lancamentosFiltrados.filter(l => l.projetoId === projetoId);
        } else if (clienteId) {
            // Se apenas cliente selecionado, filtrar por todos os projetos do cliente
            const projetosCliente = this.projetos.filter(p => p.clienteId === clienteId).map(p => p.id);
            lancamentosFiltrados = lancamentosFiltrados.filter(l => projetosCliente.includes(l.projetoId));
        }

        // Filtrar por data
        if (dataInicio) {
            lancamentosFiltrados = lancamentosFiltrados.filter(l => l.data >= dataInicio);
        }
        if (dataFim) {
            lancamentosFiltrados = lancamentosFiltrados.filter(l => l.data <= dataFim);
        }

        this.exibirRelatorio(lancamentosFiltrados, dataInicio, dataFim);
    }

    exibirRelatorio(lancamentos, dataInicio, dataFim) {
        const container = document.getElementById('relatorioHoras');
        const resumo = document.getElementById('resumoRelatorio');

        if (lancamentos.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">Nenhum lançamento encontrado para os filtros aplicados</p>';
            resumo.style.display = 'none';
            return;
        }

        // Organizar por cliente e projeto
        const dadosAgrupados = this.agruparLancamentosPorClienteProjeto(lancamentos);
        
        let tabelaHTML = '<div class="relatorio-estruturado">';
        
        dadosAgrupados.forEach(clienteData => {
            tabelaHTML += `
                <div class="cliente-grupo mb-4">
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0">
                                <i class="bi bi-person-fill me-2"></i>
                                ${clienteData.nomeCliente}
                                <span class="badge bg-light text-dark ms-2">${clienteData.totalHoras.toFixed(1)}h</span>
                                <span class="badge bg-success ms-1">R$ ${clienteData.valorTotal.toFixed(2)}</span>
                            </h5>
                        </div>
                        <div class="card-body p-0">
            `;
            
            clienteData.projetos.forEach(projetoData => {
                tabelaHTML += `
                    <div class="projeto-grupo">
                        <div class="projeto-header bg-light p-3">
                            <h6 class="mb-0">
                                <i class="bi bi-folder-fill me-2 text-success"></i>
                                ${projetoData.nomeProjeto}
                                <span class="badge bg-info ms-2">${projetoData.totalHoras.toFixed(1)}h</span>
                                <span class="badge bg-warning text-dark ms-1">R$ ${projetoData.valorTotal.toFixed(2)}</span>
                                <small class="text-muted ms-2">(R$ ${projetoData.valorHora.toFixed(2)}/hora)</small>
                            </h6>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-sm table-hover mb-0">
                                <thead class="table-secondary">
                                    <tr>
                                        <th width="10%">Data</th>
                                        <th width="35%">Descrição</th>
                                        <th width="10%">Início</th>
                                        <th width="10%">Fim</th>
                                        <th width="10%">Duração</th>
                                        <th width="15%">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                
                projetoData.lancamentos.forEach(lancamento => {
                    tabelaHTML += `
                        <tr>
                            <td><small>${this.formatarData(lancamento.data)}</small></td>
                            <td><small>${lancamento.descricao}</small></td>
                            <td><small>${lancamento.horaInicio}</small></td>
                            <td><small>${lancamento.horaFim}</small></td>
                            <td><small><strong>${lancamento.duracao}h</strong></small></td>
                            <td><small><strong>R$ ${lancamento.valorTotal.toFixed(2)}</strong></small></td>
                        </tr>
                    `;
                });
                
                tabelaHTML += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            });
            
            tabelaHTML += `
                        </div>
                    </div>
                </div>
            `;
        });
        
        tabelaHTML += '</div>';
        container.innerHTML = tabelaHTML;

        // Calcular totais
        const totalHoras = lancamentos.reduce((total, l) => total + l.duracao, 0);
        const valorTotal = lancamentos.reduce((total, l) => total + l.valorTotal, 0);

        document.getElementById('totalHorasRelatorio').textContent = totalHoras.toFixed(1);
        document.getElementById('valorTotalRelatorio').textContent = valorTotal.toFixed(2);
        
        let periodo = 'Todos os períodos';
        if (dataInicio && dataFim) {
            periodo = `${this.formatarData(dataInicio)} a ${this.formatarData(dataFim)}`;
        } else if (dataInicio) {
            periodo = `A partir de ${this.formatarData(dataInicio)}`;
        } else if (dataFim) {
            periodo = `Até ${this.formatarData(dataFim)}`;
        }
        document.getElementById('periodoRelatorio').textContent = periodo;

        resumo.style.display = 'block';

        // Armazenar dados para exportação
        this.dadosRelatorio = {
            lancamentos,
            totalHoras,
            valorTotal,
            periodo
        };
    }

    // === EXPORTAÇÃO ===
    exportarExcel() {
        if (!this.dadosRelatorio || this.dadosRelatorio.lancamentos.length === 0) {
            this.mostrarToast('Gere um relatório primeiro antes de exportar.', 'error');
            return;
        }

        const wb = XLSX.utils.book_new();
        const dadosAgrupados = this.agruparLancamentosPorClienteProjeto(this.dadosRelatorio.lancamentos);
        
        // Planilha Simples (solicitada): Data, Cliente, Projeto, Descrição, Horas
        const dadosSimples = [];
        dadosSimples.push(['Data', 'Cliente', 'Projeto', 'Descrição', 'Horas (h)']);

        this.dadosRelatorio.lancamentos.forEach(lancamento => {
            const projeto = this.projetos.find(p => p.id === lancamento.projetoId);
            const cliente = projeto ? this.clientes.find(c => c.id === projeto.clienteId) : null;
            dadosSimples.push([
                this.formatarData(lancamento.data),
                cliente ? cliente.nome : 'N/A',
                projeto ? projeto.nome : 'N/A',
                lancamento.descricao,
                lancamento.duracao
            ]);
        });

        // Linha de totais ao final
        const totalHoras = this.dadosRelatorio.lancamentos.reduce((t, l) => t + l.duracao, 0);
        dadosSimples.push([]);
        dadosSimples.push(['TOTAIS', '', '', '', totalHoras.toFixed(1)]);

        const wsSimples = XLSX.utils.aoa_to_sheet(dadosSimples);
        XLSX.utils.book_append_sheet(wb, wsSimples, 'Relatório Simples');

        // Planilha Resumo
        const resumoData = [];
        resumoData.push(['RELATÓRIO DE HORAS TRABALHADAS']);
        resumoData.push(['Período:', this.dadosRelatorio.periodo]);
        resumoData.push(['Data Geração:', this.formatarData(new Date().toISOString().split('T')[0])]);
        resumoData.push([]);
        resumoData.push(['RESUMO POR CLIENTE']);
        resumoData.push(['Cliente', 'Total Horas', 'Valor Total (R$)']);
        
        dadosAgrupados.forEach(clienteData => {
            resumoData.push([clienteData.nomeCliente, clienteData.totalHoras.toFixed(1), clienteData.valorTotal.toFixed(2)]);
        });
        
        resumoData.push([]);
        resumoData.push(['TOTAIS GERAIS']);
        resumoData.push(['Total Horas:', this.dadosRelatorio.totalHoras.toFixed(1)]);
        resumoData.push(['Valor Total:', this.dadosRelatorio.valorTotal.toFixed(2)]);
        
        const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
        XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
        
        // Planilha Detalhada
        const dadosDetalhados = [];
        dadosDetalhados.push(['Data', 'Cliente', 'Projeto', 'Descrição', 'Hora Início', 'Hora Fim', 'Duração (h)', 'Valor/Hora (R$)', 'Valor Total (R$)']);
        
        dadosAgrupados.forEach(clienteData => {
            // Linha separadora do cliente
            dadosDetalhados.push([`=== ${clienteData.nomeCliente.toUpperCase()} ===`, '', '', '', '', '', clienteData.totalHoras.toFixed(1), '', clienteData.valorTotal.toFixed(2)]);
            
            clienteData.projetos.forEach(projetoData => {
                // Linha do projeto
                dadosDetalhados.push([`--- ${projetoData.nomeProjeto} ---`, '', '', '', '', '', projetoData.totalHoras.toFixed(1), projetoData.valorHora.toFixed(2), projetoData.valorTotal.toFixed(2)]);
                
                // Lançamentos do projeto
                projetoData.lancamentos.forEach(lancamento => {
                    dadosDetalhados.push([
                        this.formatarData(lancamento.data),
                        '',
                        '',
                        lancamento.descricao,
                        lancamento.horaInicio,
                        lancamento.horaFim,
                        lancamento.duracao,
                        '',
                        lancamento.valorTotal.toFixed(2)
                    ]);
                });
                
                dadosDetalhados.push(['']); // Linha em branco
            });
        });
        
        const wsDetalhado = XLSX.utils.aoa_to_sheet(dadosDetalhados);
        XLSX.utils.book_append_sheet(wb, wsDetalhado, 'Detalhado');
        
        // Planilha por Cliente (separada)
        dadosAgrupados.forEach(clienteData => {
            const clienteSheet = [];
            clienteSheet.push([`RELATÓRIO - ${clienteData.nomeCliente.toUpperCase()}`]);
            clienteSheet.push(['Período:', this.dadosRelatorio.periodo]);
            clienteSheet.push([]);
            clienteSheet.push(['Projeto', 'Data', 'Descrição', 'Início', 'Fim', 'Duração', 'Valor/Hora', 'Total']);
            
            clienteData.projetos.forEach(projetoData => {
                projetoData.lancamentos.forEach(lancamento => {
                    clienteSheet.push([
                        projetoData.nomeProjeto,
                        this.formatarData(lancamento.data),
                        lancamento.descricao,
                        lancamento.horaInicio,
                        lancamento.horaFim,
                        lancamento.duracao,
                        projetoData.valorHora.toFixed(2),
                        lancamento.valorTotal.toFixed(2)
                    ]);
                });
            });
            
            clienteSheet.push([]);
            clienteSheet.push(['TOTAL:', '', '', '', '', clienteData.totalHoras.toFixed(1), '', clienteData.valorTotal.toFixed(2)]);
            
            const wsCliente = XLSX.utils.aoa_to_sheet(clienteSheet);
            const nomeAba = clienteData.nomeCliente.substring(0, 31); // Limite do Excel
            XLSX.utils.book_append_sheet(wb, wsCliente, nomeAba);
        });

        const nomeArquivo = `relatorio-horas-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, nomeArquivo);

        this.mostrarToast('Relatório exportado com sucesso! Múltiplas abas criadas.', 'success');
    }

    exportarPDF() {
        if (!this.dadosRelatorio || this.dadosRelatorio.lancamentos.length === 0) {
            this.mostrarToast('Gere um relatório primeiro antes de exportar.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Título
        doc.setFontSize(18);
        doc.text('Relatório de Horas Trabalhadas', 20, 20);

        // Período
        doc.setFontSize(12);
        doc.text(`Período: ${this.dadosRelatorio.periodo}`, 20, 35);

        // Resumo
        doc.text(`Total de Horas: ${this.dadosRelatorio.totalHoras.toFixed(1)}h`, 20, 45);
        doc.text(`Valor Total: R$ ${this.dadosRelatorio.valorTotal.toFixed(2)}`, 20, 55);

        // Dados detalhados
        let y = 75;
        doc.setFontSize(10);

        this.dadosRelatorio.lancamentos.forEach(lancamento => {
            if (y > 250) {
                doc.addPage();
                y = 20;
            }

            const projeto = this.projetos.find(p => p.id === lancamento.projetoId);
            const cliente = projeto ? this.clientes.find(c => c.id === projeto.clienteId) : null;

            doc.text(`${this.formatarData(lancamento.data)} - ${cliente ? cliente.nome : 'N/A'}`, 20, y);
            doc.text(`${projeto ? projeto.nome : 'N/A'} (${lancamento.duracao}h)`, 20, y + 7);
            doc.text(`${lancamento.descricao}`, 20, y + 14);
            doc.text(`R$ ${lancamento.valorTotal.toFixed(2)}`, 150, y);
            
            y += 25;
        });

        const nomeArquivo = `relatorio-horas-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(nomeArquivo);

        this.mostrarToast('Relatório exportado com sucesso!', 'success');
    }

    exportarRelatorio() {
        // Aplicar filtros atuais e exportar como Excel
        this.aplicarFiltros();
        setTimeout(() => this.exportarExcel(), 500);
    }

    // === UTILITÁRIOS ===
    gerarId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Cria um objeto Date no timezone local a partir de uma string YYYY-MM-DD
    parseDateLocal(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return new Date(dateStr);
        const [y, m, d] = parts.map(p => parseInt(p, 10));
        return new Date(y, m - 1, d);
    }

    formatarData(data) {
        if (!data) return '';
        // Se for no formato YYYY-MM-DD, parse usando parseDateLocal para evitar offset de timezone
        if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
            return this.parseDateLocal(data).toLocaleDateString('pt-BR');
        }
        return new Date(data).toLocaleDateString('pt-BR');
    }

    salvarDados() {
        localStorage.setItem('clientes', JSON.stringify(this.clientes));
        localStorage.setItem('projetos', JSON.stringify(this.projetos));
        localStorage.setItem('lancamentos', JSON.stringify(this.lancamentos));
    }

    carregarDados() {
        this.carregarClientes();
        this.carregarProjetos();
        this.atualizarSelectsClientes();
        this.atualizarSelectsProjetos();
        this.atualizarFiltrosRelatorio();
    }

    atualizarSelectsClientes() {
        const selects = ['clienteProjeto', 'filtroCliente'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            const valorAtual = select.value;
            
            // Limpar e adicionar opção padrão
            select.innerHTML = selectId === 'filtroCliente' ? 
                '<option value="">Todos os clientes</option>' : 
                '<option value="">Selecione um cliente</option>';
            
            // Adicionar clientes
            this.clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id;
                option.textContent = cliente.nome;
                select.appendChild(option);
            });
            
            // Restaurar valor se ainda existir
            if (valorAtual && this.clientes.some(c => c.id === valorAtual)) {
                select.value = valorAtual;
            }
        });
    }

    atualizarSelectsProjetos() {
        const selects = ['projetoLancamento'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            const valorAtual = select.value;
            
            select.innerHTML = '<option value="">Selecione um projeto</option>';
            
            this.projetos.forEach(projeto => {
                const cliente = this.clientes.find(c => c.id === projeto.clienteId);
                const option = document.createElement('option');
                option.value = projeto.id;
                option.textContent = `${cliente ? cliente.nome : 'Cliente não encontrado'} - ${projeto.nome}`;
                select.appendChild(option);
            });
            
            if (valorAtual && this.projetos.some(p => p.id === valorAtual)) {
                select.value = valorAtual;
            }
        });
    }

    atualizarFiltrosRelatorio() {
        this.atualizarSelectsClientes();
        
        // Atualizar select de projetos do filtro
        const select = document.getElementById('filtroProjeto');
        const valorAtual = select.value;
        
        select.innerHTML = '<option value="">Todos os projetos</option>';
        
        this.projetos.forEach(projeto => {
            const cliente = this.clientes.find(c => c.id === projeto.clienteId);
            const option = document.createElement('option');
            option.value = projeto.id;
            option.textContent = `${cliente ? cliente.nome : 'Cliente não encontrado'} - ${projeto.nome}`;
            select.appendChild(option);
        });
        
        if (valorAtual && this.projetos.some(p => p.id === valorAtual)) {
            select.value = valorAtual;
        }
    }

    atualizarFiltrosProjeto() {
        const clienteSelecionado = document.getElementById('filtroCliente').value;
        const selectProjeto = document.getElementById('filtroProjeto');
        
        selectProjeto.innerHTML = '<option value="">Todos os projetos</option>';
        
        let projetosFiltrados = this.projetos;
        if (clienteSelecionado) {
            projetosFiltrados = this.projetos.filter(p => p.clienteId === clienteSelecionado);
        }
        
        projetosFiltrados.forEach(projeto => {
            const cliente = this.clientes.find(c => c.id === projeto.clienteId);
            const option = document.createElement('option');
            option.value = projeto.id;
            option.textContent = `${cliente ? cliente.nome : 'Cliente não encontrado'} - ${projeto.nome}`;
            selectProjeto.appendChild(option);
        });
    }

    mostrarToast(mensagem, tipo = 'info') {
        // Criar toast temporário (simulação)
        const toastContainer = document.createElement('div');
        toastContainer.className = `alert alert-${tipo === 'error' ? 'danger' : tipo} alert-dismissible fade show position-fixed`;
        toastContainer.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toastContainer.innerHTML = `
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(toastContainer);
        
        setTimeout(() => {
            if (toastContainer.parentNode) {
                toastContainer.parentNode.removeChild(toastContainer);
            }
        }, 5000);
    }
}

// Funções globais para compatibilidade com onClick
let controleHoras;

function limparFormCliente() {
    controleHoras.limparFormCliente();
}

function editarCliente(id) {
    controleHoras.editarCliente(id);
}

function editarLancamento(id) {
    controleHoras.editarLancamento(id);
}

function excluirLancamento(id) {
    controleHoras.excluirLancamento(id);
}

function limparFormProjeto() {
    controleHoras.limparFormProjeto();
}

function editarProjeto(id) {
    controleHoras.editarProjeto(id);
}

function limparFormLancamento() {
    controleHoras.limparFormLancamento();
}

function aplicarFiltros() {
    controleHoras.aplicarFiltros();
}

function exportarExcel() {
    controleHoras.exportarExcel();
}

function exportarPDF() {
    controleHoras.exportarPDF();
}

function exportarRelatorio() {
    controleHoras.exportarRelatorio();
}

// Inicializar aplicação quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    controleHoras = new ControleHoras();
});