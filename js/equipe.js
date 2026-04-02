/**
 * js/equipe.js — SaaS Team Management (Gestão Multi-Tenant)
 */
Object.assign(ControleHoras.prototype, {

    async carregarEquipe() {
        if (!this.usuario) return; // public view auth fallback
        try {
            const res = await fetch(`${this.apiBaseUrl}/usuarios-empresa`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!res.ok) throw new Error('Falha ao carregar equipe');
            this.equipe = await res.json();
            this.renderizarEquipe();
            this.atualizarSelectResponsavelKanban();
        } catch (error) {
            console.error('Erro ao carregar equipe:', error);
        }
    },

    renderizarEquipe() {
        const container = document.getElementById('listaEquipe');
        if (!container) return;
        
        if (!this.equipe || this.equipe.length === 0) {
            container.innerHTML = '<div class="p-5 text-center text-sm text-neutral-500">Nenhum membro cadastrado.</div>';
            return;
        }

        const meuId = this.usuario ? this.usuario.id : null;
        const isAdmin = this.usuario && this.usuario.role === 'admin';

        container.innerHTML = this.equipe.map(u => `
            <div class="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold shadow-lg">
                        ${u.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="font-medium text-white text-sm flex gap-2 items-center">
                            ${u.nome}
                            ${u.id === meuId ? '<span class="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-neutral-300 uppercase tracking-wider">Você</span>' : ''}
                        </div>
                        <div class="text-xs text-neutral-400"><i class="bi bi-envelope mr-1"></i>${u.username} &bull; <span class="${u.role === 'admin' ? 'text-orange-400' : 'text-neutral-500'}">${u.role === 'admin' ? 'Administrador' : 'Membro'}</span></div>
                    </div>
                </div>
                ${isAdmin ? `
                <div class="flex gap-2">
                    <button class="btn-ghost" style="padding:6px;min-width:32px;" onclick="controleHoras.editarMembroEquipe(${u.id})" title="Editar Permissões">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${u.id !== meuId ? `
                    <button class="btn-ghost" style="padding:6px;min-width:32px;color:#ef4444;" onclick="controleHoras.excluirMembroEquipe(${u.id})" title="Excluir Acesso">
                        <i class="bi bi-person-x"></i>
                    </button>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        `).join('');
    },

    limparFormEquipe() {
        if (this.usuario && this.usuario.role !== 'admin') {
            if (this.mostrarToast) this.mostrarToast('Somente administradores podem gerenciar a equipe.', 'error');
            return;
        }
        document.getElementById('equipeId').value = '';
        document.getElementById('equipeNome').value = '';
        document.getElementById('equipeUser').value = '';
        document.getElementById('equipeUser').disabled = false;
        document.getElementById('equipePass').value = '';
        document.getElementById('equipeRole').value = 'membro';
    },

    editarMembroEquipe(id) {
        if (this.usuario && this.usuario.role !== 'admin') {
            if (this.mostrarToast) this.mostrarToast('Somente administradores podem editar a equipe.', 'error');
            return;
        }
        const u = this.equipe.find(x => x.id === id);
        if(!u) return;

        // Populate fields
        document.getElementById('equipeId').value = u.id;
        document.getElementById('equipeNome').value = u.nome || '';
        document.getElementById('equipeUser').value = u.username;
        document.getElementById('equipeUser').disabled = true; // username cannot be changed
        document.getElementById('equipePass').value = ''; // left blank -> keep existing
        document.getElementById('equipeRole').value = u.role || 'membro';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    async salvarMembroEquipe() {
        if (this.usuario && this.usuario.role !== 'admin') {
            if (this.mostrarToast) this.mostrarToast('Permissão negada.', 'error');
            return;
        }
        const id = document.getElementById('equipeId').value;
        const payload = {
            nome: document.getElementById('equipeNome').value,
            username: document.getElementById('equipeUser').value,
            password: document.getElementById('equipePass').value,
            role: document.getElementById('equipeRole').value
        };

        try {
            const url = id ? `${this.apiBaseUrl}/usuarios-empresa/${id}` : `${this.apiBaseUrl}/usuarios-empresa`;
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Erro ao salvar membro da equipe');
            }

            if (this.mostrarToast) this.mostrarToast('Membro salvo com sucesso!', 'success');
            this.limparFormEquipe();
            await this.carregarEquipe();

        } catch(error) {
            if (this.mostrarToast) this.mostrarToast(error.message, 'error');
        }
    },

    async excluirMembroEquipe(id) {
        if (this.usuario && this.usuario.role !== 'admin') {
            return;
        }
        const ok = await Dialog.confirm({
            title: 'Revogar Acesso',
            message: 'Tem certeza que deseja apagar este usuário? Ele não terá mais acesso aos projetos da empresa.',
            type: 'danger',
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });
        if (!ok) return;

        try {
            const res = await fetch(`${this.apiBaseUrl}/usuarios-empresa/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Erro ao excluir membro');
            }

            if (this.mostrarToast) this.mostrarToast('Membro excluído!', 'success');
            await this.carregarEquipe();
        } catch(error) {
            if (this.mostrarToast) this.mostrarToast(error.message, 'error');
        }
    },

    // Injetar os usuários no Select do Kanban Modal
    atualizarSelectResponsavelKanban() {
        const select = document.getElementById('tarefaResponsavel');
        if (!select) return;
        
        let html = '<option value="">Nenhum</option>';
        if (this.equipe) {
            this.equipe.forEach(u => {
                html += `<option value="${u.id}">${u.nome}</option>`;
            });
        }
        select.innerHTML = html;
    }

});
