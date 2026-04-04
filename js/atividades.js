/**
 * js/atividades.js — Catálogo global de atividades da empresa
 */
Object.assign(ControleHoras.prototype, {

    async carregarAtividades() {
        const container = document.getElementById('listaAtividadesGlobal');
        if (!container) return;
        container.innerHTML = '<p class="text-neutral-500 text-center py-8 text-sm">Carregando...</p>';
        try {
            const resp = await fetch(`${this.apiBaseUrl}/atividades`, {
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            const atividades = await resp.json();
            this._renderAtividades(atividades, container);
        } catch(e) {
            container.innerHTML = '<p class="text-red-400 text-center py-8 text-sm">Erro ao carregar atividades.</p>';
        }
    },

    _renderAtividades(atividades, container) {
        if (atividades.length === 0) {
            container.innerHTML = '<p class="text-neutral-500 text-center py-8 text-sm">Nenhuma atividade cadastrada.</p>';
            return;
        }
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${atividades.map(a => `
                        <tr style="opacity:${a.ativo ? '1' : '0.5'}">
                            <td style="font-weight:500;">${a.nome}</td>
                            <td>
                                <span style="display:inline-flex;align-items:center;gap:5px;font-size:0.75rem;font-weight:600;padding:2px 10px;border-radius:99px;
                                    background:${a.ativo ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)'};
                                    color:${a.ativo ? '#4ade80' : 'rgba(255,255,255,0.35)'};">
                                    <span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block;"></span>
                                    ${a.ativo ? 'Ativa' : 'Inativa'}
                                </span>
                            </td>
                            <td>
                                <div class="action-cell">
                                    <button class="btn-warning-sm" title="Editar nome"
                                        onclick="controleHoras.editarAtividadeGlobal('${a.id}', '${a.nome.replace(/'/g, "\\'")}')">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn-info-sm" title="${a.ativo ? 'Desativar' : 'Ativar'}"
                                        onclick="controleHoras.toggleAtividadeGlobal('${a.id}', ${!a.ativo})">
                                        <i class="bi bi-${a.ativo ? 'pause-circle' : 'play-circle'}"></i>
                                    </button>
                                    <button class="btn-danger-sm" title="Excluir"
                                        onclick="controleHoras.excluirAtividadeGlobal('${a.id}', '${a.nome.replace(/'/g, "\\'")}')">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    },

    async criarAtividadeGlobal() {
        const nomeEl = document.getElementById('nomeAtividadeGlobal');
        const nome = nomeEl.value.trim();
        if (!nome) { this.mostrarToast('Informe o nome da atividade.', 'error'); return; }

        try {
            const resp = await fetch(`${this.apiBaseUrl}/atividades`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                body: JSON.stringify({ nome, descricao: '', cor: '#fb923c' })
            });
            if (!resp.ok) throw new Error();
            nomeEl.value = '';
            await this.carregarAtividades();
            this.mostrarToast('Atividade criada com sucesso!', 'success');
        } catch(e) {
            this.mostrarToast('Erro ao criar atividade.', 'error');
        }
    },

    async editarAtividadeGlobal(id, nomeAtual) {
        const novoNome = prompt('Novo nome para a atividade:', nomeAtual);
        if (!novoNome || novoNome.trim() === nomeAtual) return;
        try {
            const resp = await fetch(`${this.apiBaseUrl}/atividades/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                body: JSON.stringify({ nome: novoNome.trim(), descricao: '', cor: '#fb923c' })
            });
            if (!resp.ok) throw new Error();
            await this.carregarAtividades();
            this.mostrarToast('Atividade atualizada.', 'success');
        } catch(e) {
            this.mostrarToast('Erro ao atualizar atividade.', 'error');
        }
    },

    async toggleAtividadeGlobal(id, novoAtivo) {
        try {
            const resp = await fetch(`${this.apiBaseUrl}/atividades/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                body: JSON.stringify({ ativo: novoAtivo })
            });
            if (!resp.ok) throw new Error();
            await this.carregarAtividades();
            this.mostrarToast(`Atividade ${novoAtivo ? 'ativada' : 'desativada'}.`, 'success');
        } catch(e) {
            this.mostrarToast('Erro ao alterar status.', 'error');
        }
    },

    async excluirAtividadeGlobal(id, nome) {
        const ok = await Dialog.confirm({
            title: 'Excluir Atividade',
            message: `Deseja excluir "${nome}"? Se houver lançamentos vinculados, a exclusão será bloqueada — use Desativar nesse caso.`,
            type: 'danger',
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });
        if (!ok) return;
        try {
            const resp = await fetch(`${this.apiBaseUrl}/atividades/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            if (resp.status === 409) {
                const data = await resp.json();
                this.mostrarToast(data.error, 'error');
                return;
            }
            if (!resp.ok) throw new Error();
            await this.carregarAtividades();
            this.mostrarToast('Atividade excluída.', 'success');
        } catch(e) {
            this.mostrarToast('Erro ao excluir atividade.', 'error');
        }
    }

});
