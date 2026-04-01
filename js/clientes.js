/**
 * js/clientes.js — Client CRUD mixed into ControleHoras
 */
Object.assign(ControleHoras.prototype, {

    cadastrarCliente() {
        const nome     = document.getElementById('nomeCliente').value.trim();
        const email    = document.getElementById('emailCliente').value.trim();
        const telefone = document.getElementById('telefoneCliente').value.trim();

        if (!nome) { this.mostrarToast('Informe o nome do cliente.', 'error'); return; }

        if (this.editandoCliente) {
            if (this.clientes.some(c => c.nome.toLowerCase() === nome.toLowerCase() && c.id !== this.editandoCliente.id)) {
                this.mostrarToast('Cliente com este nome já existe.', 'error'); return;
            }
            const idx = this.clientes.findIndex(c => c.id === this.editandoCliente.id);
            if (idx !== -1) {
                this.clientes[idx] = { ...this.clientes[idx], nome, email, telefone, dataAtualizacao: new Date().toISOString() };
                this.mostrarToast('Cliente atualizado com sucesso!', 'success');
            }
        } else {
            if (this.clientes.some(c => c.nome.toLowerCase() === nome.toLowerCase())) {
                this.mostrarToast('Cliente com este nome já existe.', 'error'); return;
            }
            this.clientes.push({ id: this.gerarId(), nome, email, telefone, dataCadastro: new Date().toISOString() });
            this.mostrarToast('Cliente cadastrado com sucesso!', 'success');
        }

        this.salvarDados();
        this.carregarClientes();
        this.atualizarSelectsClientes();
        this.limparFormCliente();
        this.atualizarDashboard();
    },

    carregarClientes() {
        const container = document.getElementById('listaClientes');
        if (this.clientes.length === 0) {
            container.innerHTML = '<p class="text-neutral-500 text-center py-10 text-sm">Nenhum cliente cadastrado</p>';
            return;
        }
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Telefone</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.clientes.map(c => `
                        <tr>
                            <td style="font-weight:500;">${c.nome}</td>
                            <td style="color:rgba(255,255,255,0.5);font-size:0.8125rem;">${c.email || '—'}</td>
                            <td style="color:rgba(255,255,255,0.5);font-size:0.8125rem;">${c.telefone || '—'}</td>
                            <td>
                                <div class="action-cell">
                                    <button class="btn-info-sm" onclick="controleHoras.copiarLinkDashboard('${c.id}')" title="Copiar link do dashboard público">
                                        <i class="bi bi-link-45deg"></i>
                                    </button>
                                    <button class="btn-warning-sm" onclick="controleHoras.editarCliente('${c.id}')">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn-danger-sm" onclick="controleHoras.excluirCliente('${c.id}')">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    },

    editarCliente(id) {
        const cliente = this.clientes.find(c => c.id === id);
        if (!cliente) { this.mostrarToast('Cliente não encontrado.', 'error'); return; }
        this.editandoCliente = cliente;
        document.getElementById('nomeCliente').value     = cliente.nome;
        document.getElementById('emailCliente').value    = cliente.email    || '';
        document.getElementById('telefoneCliente').value = cliente.telefone || '';
        this.alternarModoEdicaoCliente(true);
        document.getElementById('formCliente').scrollIntoView({ behavior: 'smooth' });
        this.mostrarToast('Editando cliente. Modifique os campos e clique em "Atualizar".', 'info');
    },

    excluirCliente(id) {
        if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação removerá todos os projetos e lançamentos relacionados.')) return;
        const projetosDoCliente = this.projetos.filter(p => p.clienteId === id).map(p => p.id);
        this.lancamentos = this.lancamentos.filter(l => !projetosDoCliente.includes(l.projetoId));
        this.projetos    = this.projetos.filter(p => p.clienteId !== id);
        this.clientes    = this.clientes.filter(c => c.id !== id);
        this.salvarDados();
        this.carregarDados();
        this.atualizarDashboard();
        this.mostrarToast('Cliente excluído com sucesso!', 'success');
    },

    limparFormCliente() {
        document.getElementById('formCliente').reset();
        this.editandoCliente = null;
        this.alternarModoEdicaoCliente(false);
    },

    alternarModoEdicaoCliente(editando) {
        const header    = document.getElementById('cardHeaderClientes');
        const btnSubmit = document.getElementById('btnSubmitCliente');
        if (editando) {
            header.innerHTML = '<i class="bi bi-pencil mr-2" style="color:rgba(249,115,22,0.7)"></i>Editar Cliente';
            btnSubmit.querySelector('.btn-icon').className = 'bi bi-check-lg mr-1 btn-icon';
            btnSubmit.querySelector('.btn-label').textContent = 'Atualizar';
        } else {
            header.innerHTML = '<i class="bi bi-person-plus mr-2" style="color:rgba(249,115,22,0.7)"></i>Cadastrar Cliente';
            btnSubmit.querySelector('.btn-icon').className = 'bi bi-check-lg mr-1 btn-icon';
            btnSubmit.querySelector('.btn-label').textContent = 'Cadastrar';
        }
    },

    copiarLinkDashboard(id) {
        const url = `${window.location.origin}/dashboard-publico.html?cliente=${id}`;
        navigator.clipboard.writeText(url).then(() => {
            this.mostrarToast('Link do dashboard copiado!', 'success');
        }).catch(() => {
            // Fallback para navegadores sem clipboard API
            const input = document.createElement('input');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            this.mostrarToast('Link do dashboard copiado!', 'success');
        });
    }

});
