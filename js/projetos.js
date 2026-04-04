/**
 * js/projetos.js — Project CRUD mixed into ControleHoras
 */
Object.assign(ControleHoras.prototype, {

    cadastrarProjeto() {
        const clienteId  = document.getElementById('clienteProjeto').value;
        const nome       = document.getElementById('nomeProjeto').value.trim();
        const descricao  = document.getElementById('descricaoProjeto').value.trim();
        const valorHora  = parseFloat(document.getElementById('valorHoraProjeto').value) || 0;

        if (!clienteId || !nome) {
            this.mostrarToast('Selecione um cliente e informe o nome do projeto.', 'error'); return;
        }

        if (this.editandoProjeto) {
            if (this.projetos.some(p => p.clienteId === clienteId && p.nome.toLowerCase() === nome.toLowerCase() && p.id !== this.editandoProjeto.id)) {
                this.mostrarToast('Projeto com este nome já existe para o cliente.', 'error'); return;
            }
            const idx = this.projetos.findIndex(p => p.id === this.editandoProjeto.id);
            if (idx !== -1) {
                this.projetos[idx] = { ...this.projetos[idx], clienteId, nome, descricao, valorHora, dataAtualizacao: new Date().toISOString() };
                this.mostrarToast('Projeto atualizado com sucesso!', 'success');
            }
        } else {
            if (this.projetos.some(p => p.clienteId === clienteId && p.nome.toLowerCase() === nome.toLowerCase())) {
                this.mostrarToast('Projeto com este nome já existe para o cliente.', 'error'); return;
            }
            this.projetos.push({ id: this.gerarId(), clienteId, nome, descricao, valorHora, dataCadastro: new Date().toISOString() });
            this.mostrarToast('Projeto cadastrado com sucesso!', 'success');
        }

        this.salvarDados();
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
                                        <button class="btn-info-sm" onclick="controleHoras.abrirAtividades('${p.id}', '${p.nome.replace(/'/g, "\\'")}'" title="Gerenciar atividades">
                                            <i class="bi bi-tag"></i>
                                        </button>
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
            await fetch(`${this.apiBaseUrl}/projetos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
        } catch(e) { console.error('Erro ao excluir projeto na API:', e); }
        this.lancamentos = this.lancamentos.filter(l => l.projetoId !== id);
        this.projetos    = this.projetos.filter(p => p.id !== id);
        this.salvarDados();
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
    },

    async abrirAtividades(projetoId, projetoNome) {
        this.projetoAtividadesAtivo = projetoId;
        document.getElementById('nomeProjetoAtividades').textContent = projetoNome;
        document.getElementById('nomeNovaAtividade').value = '';
        const panel = document.getElementById('panelAtividades');
        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        await this.carregarAtividadesProjeto(projetoId);
    },

    async carregarAtividadesProjeto(projetoId) {
        const lista = document.getElementById('listaAtividades');
        lista.innerHTML = '<p class="text-neutral-500 text-center py-4 text-sm">Carregando...</p>';
        try {
            const resp = await fetch(`${this.apiBaseUrl}/atividades/${projetoId}`, {
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            const atividades = await resp.json();
            if (atividades.length === 0) {
                lista.innerHTML = '<p class="text-neutral-500 text-center py-4 text-sm">Nenhuma atividade cadastrada para este projeto.</p>';
                return;
            }
            lista.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${atividades.map(a => `
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,0.04);border-radius:8px;border:1px solid rgba(255,255,255,0.07);">
                            <span style="font-size:0.875rem;font-weight:500;">${a.nome}</span>
                            <button class="btn-danger-sm" onclick="controleHoras.excluirAtividade('${a.id}')" title="Excluir atividade">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>`;
        } catch(e) {
            lista.innerHTML = '<p class="text-red-400 text-center py-4 text-sm">Erro ao carregar atividades.</p>';
        }
    },

    async criarAtividade() {
        const nome = document.getElementById('nomeNovaAtividade').value.trim();
        if (!nome) { this.mostrarToast('Informe o nome da atividade.', 'error'); return; }
        const projetoId = this.projetoAtividadesAtivo;
        if (!projetoId) return;
        try {
            const resp = await fetch(`${this.apiBaseUrl}/atividades`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                body: JSON.stringify({ projetoId, nome, descricao: '', cor: '#fb923c', responsavelId: null })
            });
            if (!resp.ok) throw new Error();
            document.getElementById('nomeNovaAtividade').value = '';
            await this.carregarAtividadesProjeto(projetoId);
            this.mostrarToast('Atividade criada com sucesso!', 'success');
        } catch(e) {
            this.mostrarToast('Erro ao criar atividade.', 'error');
        }
    },

    async excluirAtividade(id) {
        const ok = await Dialog.confirm({
            title: 'Excluir Atividade',
            message: 'Tem certeza que deseja excluir esta atividade? Lançamentos vinculados perderão o vínculo com a atividade.',
            type: 'danger',
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });
        if (!ok) return;
        try {
            await fetch(`${this.apiBaseUrl}/atividades/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            await this.carregarAtividadesProjeto(this.projetoAtividadesAtivo);
            this.mostrarToast('Atividade excluída.', 'success');
        } catch(e) {
            this.mostrarToast('Erro ao excluir atividade.', 'error');
        }
    }

});
