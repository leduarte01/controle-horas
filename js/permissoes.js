/**
 * js/permissoes.js — Grupos de Permissão (admin only)
 */
const SECOES_LABELS = {
    dashboard:   'Dashboard',
    lancamento:  'Lançar Horas',
    relatorios:  'Relatórios',
    clientes:    'Clientes',
    projetos:    'Projetos',
    atividades:  'Atividades',
    kanban:      'Kanban',
    equipe:      'Minha Equipe',
};

Object.assign(ControleHoras.prototype, {

    async carregarGrupos() {
        if (!this.usuario || this.usuario.role !== 'admin') return;
        try {
            const res = await fetch(`${this.apiBaseUrl}/grupos`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!res.ok) return;
            this.grupos = await res.json();
            this._renderGrupos();
            this._popularSelectGrupos();
        } catch (e) { console.error('Erro ao carregar grupos:', e); }
    },

    _renderGrupos() {
        const container = document.getElementById('listaGrupos');
        if (!container) return;
        if (!this.grupos || this.grupos.length === 0) {
            container.innerHTML = '<div class="p-5 text-center text-sm text-neutral-500">Nenhum grupo criado.</div>';
            return;
        }
        container.innerHTML = this.grupos.map(g => {
            const secoes = g.secoes || [];
            const labels = secoes.length
                ? secoes.map(s => SECOES_LABELS[s] || s).join(' · ')
                : '<span style="color:#ef4444;">Sem acesso</span>';
            return `
            <div class="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                <div>
                    <div class="font-medium text-white text-sm flex items-center gap-2">
                        <i class="bi bi-shield text-orange-400"></i>${g.nome}
                    </div>
                    <div class="text-xs text-neutral-400 mt-0.5">${labels}</div>
                </div>
                <div class="flex gap-2">
                    <button class="btn-ghost" style="padding:6px;min-width:32px;" onclick="controleHoras.editarGrupo(${g.id})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-ghost" style="padding:6px;min-width:32px;color:#ef4444;" onclick="controleHoras.excluirGrupo(${g.id}, '${(g.nome || '').replace(/'/g, "\\'")}')" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>`;
        }).join('');
    },

    _popularSelectGrupos() {
        const select = document.getElementById('equipeGrupo');
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">Sem grupo (acesso total do cargo)</option>';
        (this.grupos || []).forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.nome;
            select.appendChild(opt);
        });
        if (current) select.value = current;
    },

    editarGrupo(id) {
        const g = (this.grupos || []).find(x => x.id === id);
        if (!g) return;
        document.getElementById('grupoId').value = g.id;
        document.getElementById('grupoNome').value = g.nome;
        const secoes = g.secoes || [];
        document.querySelectorAll('.cb-secao').forEach(cb => {
            cb.checked = secoes.includes(cb.value);
        });
        document.getElementById('grupoNome').focus();
    },

    limparFormGrupo() {
        document.getElementById('grupoId').value = '';
        document.getElementById('grupoNome').value = '';
        document.querySelectorAll('.cb-secao').forEach(cb => cb.checked = false);
    },

    async salvarGrupo() {
        const id   = document.getElementById('grupoId').value;
        const nome = document.getElementById('grupoNome').value.trim();
        if (!nome) { this.mostrarToast('Informe o nome do grupo.', 'error'); return; }
        const secoes = Array.from(document.querySelectorAll('.cb-secao:checked')).map(cb => cb.value);
        try {
            const url    = id ? `${this.apiBaseUrl}/grupos/${id}` : `${this.apiBaseUrl}/grupos`;
            const method = id ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                body: JSON.stringify({ nome, secoes })
            });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
            this.mostrarToast('Grupo salvo com sucesso!', 'success');
            this.limparFormGrupo();
            await this.carregarGrupos();
        } catch (e) {
            this.mostrarToast(e.message || 'Erro ao salvar grupo.', 'error');
        }
    },

    async excluirGrupo(id, nome) {
        const ok = await Dialog.confirm({
            title: 'Excluir Grupo',
            message: `Excluir o grupo "${nome}"? Os membros vinculados perderão as restrições de acesso.`,
            type: 'danger', confirmText: 'Excluir', cancelText: 'Cancelar'
        });
        if (!ok) return;
        try {
            const res = await fetch(`${this.apiBaseUrl}/grupos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
            this.mostrarToast('Grupo excluído!', 'success');
            await this.carregarGrupos();
        } catch (e) {
            this.mostrarToast(e.message || 'Erro ao excluir grupo.', 'error');
        }
    },

    async carregarPermissoesMembro() {
        if (!this.usuario || this.usuario.role === 'admin') {
            this.grupoPermissoes = null; // admin = acesso total
            return;
        }
        try {
            const res = await fetch(`${this.apiBaseUrl}/grupos/me`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = res.ok ? await res.json() : null;
            this.grupoPermissoes = data ? (data.secoes || []) : ['lancamento'];
        } catch (e) {
            this.grupoPermissoes = ['lancamento'];
        }
        aplicarPermissoes();
    }
});
