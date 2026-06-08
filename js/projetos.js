/**
 * js/projetos.js — Project CRUD mixed into ControleHoras
 */
Object.assign(ControleHoras.prototype, {

    async cadastrarProjeto() {
        const clienteId  = document.getElementById('clienteProjeto').value;
        const nome       = document.getElementById('nomeProjeto').value.trim();
        const descricao  = document.getElementById('descricaoProjeto').value.trim();
        const valorHora  = parseFloat(document.getElementById('valorHoraProjeto').value) || 0;

        if (!clienteId || !nome) {
            this.mostrarToast('Selecione um cliente e informe o nome do projeto.', 'error'); return;
        }

        let projetoAtualizado = null;

        if (this.editandoProjeto) {
            if (this.projetos.some(p => p.clienteId === clienteId && p.nome.toLowerCase() === nome.toLowerCase() && p.id !== this.editandoProjeto.id)) {
                this.mostrarToast('Projeto com este nome já existe para o cliente.', 'error'); return;
            }
            projetoAtualizado = { ...this.editandoProjeto, clienteId, nome, descricao, valorHora, dataAtualizacao: new Date().toISOString() };
            
            try {
                const res = await fetch(`${this.apiBaseUrl}/projetos/${this.editandoProjeto.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                    body: JSON.stringify(projetoAtualizado)
                });
                if (!res.ok) throw new Error('Erro ao atualizar projeto no servidor.');

                const idx = this.projetos.findIndex(p => p.id === this.editandoProjeto.id);
                if (idx !== -1) this.projetos[idx] = projetoAtualizado;
                this.mostrarToast('Projeto atualizado com sucesso!', 'success');
            } catch (err) {
                this.mostrarToast(err.message, 'error');
                return;
            }
        } else {
            if (this.projetos.some(p => p.clienteId === clienteId && p.nome.toLowerCase() === nome.toLowerCase())) {
                this.mostrarToast('Projeto com este nome já existe para o cliente.', 'error'); return;
            }
            projetoAtualizado = { id: this.gerarId(), clienteId, nome, descricao, valorHora, dataCadastro: new Date().toISOString() };
            
            try {
                const res = await fetch(`${this.apiBaseUrl}/projetos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                    body: JSON.stringify(projetoAtualizado)
                });
                if (!res.ok) throw new Error('Erro ao cadastrar projeto no servidor.');

                this.projetos.push(projetoAtualizado);
                this.mostrarToast('Projeto cadastrado com sucesso!', 'success');
            } catch (err) {
                this.mostrarToast(err.message, 'error');
                return;
            }
        }

        this.salvarCacheLocal();
        this.carregarProjetos();
        this.atualizarSelectsProjetos();
        this.limparFormProjeto();
        this.atualizarDashboard();
    },

    carregarProjetos() {
        const container = document.getElementById('listaProjetos');
        if (this.projetos.length === 0) {
            container.innerHTML = '<p class="text-neutral-500 text-center py-10 text-sm">Nenhum projeto cadastrado</p>';
            return;
        }
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Projeto</th>
                        <th>Descrição</th>
                        <th>Valor/h</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.projetos.map(p => {
                        const cliente = this.clientes.find(c => c.id === p.clienteId);
                        return `
                            <tr>
                                <td style="font-size:0.8125rem;color:rgba(255,255,255,0.55);">${cliente ? cliente.nome : '—'}</td>
                                <td style="font-weight:500;">${p.nome}</td>
                                <td style="font-size:0.8125rem;color:rgba(255,255,255,0.5);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.descricao || '—'}</td>
                                <td style="font-size:0.8125rem;white-space:nowrap;color:#fb923c;">R$ ${p.valorHora.toFixed(2)}</td>
                                <td>
                                    <div class="action-cell">
                                        <button class="btn-warning-sm" onclick="controleHoras.editarProjeto('${p.id}')">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn-danger-sm" onclick="controleHoras.excluirProjeto('${p.id}')">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>`;
                    }).join('')}
                </tbody>
            </table>`;
    },

    editarProjeto(id) {
        const projeto = this.projetos.find(p => p.id === id);
        if (!projeto) { this.mostrarToast('Projeto não encontrado.', 'error'); return; }
        this.editandoProjeto = projeto;
        document.getElementById('clienteProjeto').value   = projeto.clienteId;
        document.getElementById('nomeProjeto').value      = projeto.nome;
        document.getElementById('descricaoProjeto').value = projeto.descricao || '';
        document.getElementById('valorHoraProjeto').value = projeto.valorHora;
        this.alternarModoEdicaoProjeto(true);
        document.getElementById('formProjeto').scrollIntoView({ behavior: 'smooth' });
        this.mostrarToast('Editando projeto. Modifique os campos e clique em "Atualizar".', 'info');
    },

    async excluirProjeto(id) {
        const ok = await Dialog.confirm({
            title: 'Excluir Projeto',
            message: 'Tem certeza que deseja excluir este projeto? Todos os lançamentos relacionados serão removidos permanentemente.',
            type: 'danger',
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });
        if (!ok) return;
        try {
            const res = await fetch(`${this.apiBaseUrl}/projetos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            if (!res.ok) throw new Error('Erro ao excluir projeto no servidor');
        } catch(e) { 
            console.error('Erro ao excluir projeto na API:', e); 
            this.mostrarToast('Erro ao excluir. Tente novamente.', 'error');
            return;
        }
        this.lancamentos = this.lancamentos.filter(l => l.projetoId !== id);
        this.projetos    = this.projetos.filter(p => p.id !== id);
        this.salvarCacheLocal();
        this.carregarDados();
        this.atualizarDashboard();
        this.mostrarToast('Projeto excluído com sucesso!', 'success');
    },

    limparFormProjeto() {
        document.getElementById('formProjeto').reset();
        this.editandoProjeto = null;
        this.alternarModoEdicaoProjeto(false);
    },

    alternarModoEdicaoProjeto(editando) {
        const header    = document.getElementById('cardHeaderProjetos');
        const btnSubmit = document.getElementById('btnSubmitProjeto');
        if (editando) {
            header.innerHTML = '<i class="bi bi-pencil mr-2" style="color:rgba(249,115,22,0.7)"></i>Editar Projeto';
            btnSubmit.querySelector('.btn-icon').className = 'bi bi-check-lg mr-1 btn-icon';
            btnSubmit.querySelector('.btn-label').textContent = 'Atualizar';
        } else {
            header.innerHTML = '<i class="bi bi-folder-plus mr-2" style="color:rgba(249,115,22,0.7)"></i>Cadastrar Projeto';
            btnSubmit.querySelector('.btn-icon').className = 'bi bi-check-lg mr-1 btn-icon';
            btnSubmit.querySelector('.btn-label').textContent = 'Cadastrar';
        }
    }

});
