/**
 * js/kanban.js — Kanban board engine mixed into ControleHoras
 * Drag & Drop nativo HTML5 + CRUD de tarefas
 */
Object.assign(ControleHoras.prototype, {

    kanbanProjetoAtual: null,
    kanbanTarefas: [],

    // ─── Inicialização do Kanban ───
    async inicializarKanban() {
        this.atualizarSelectKanban();
        const sel = document.getElementById('kanbanProjetoSelect');
        if (sel && sel.value) {
            await this.carregarKanban(sel.value);
        } else {
            document.getElementById('kanbanBoard').innerHTML =
                '<p class="text-neutral-500 text-center py-16 text-sm">Selecione um projeto para visualizar o Kanban.</p>';
        }
    },

    atualizarSelectKanban() {
        const sel = document.getElementById('kanbanProjetoSelect');
        if (!sel) return;
        const prev = sel.value;
        sel.innerHTML = '<option value="">Selecione um projeto</option>';
        this.projetos.forEach(p => {
            const c = this.clientes.find(cl => cl.id === p.clienteId);
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = (c ? c.nome + ' — ' : '') + p.nome;
            sel.appendChild(opt);
        });
        if (prev && this.projetos.some(p => p.id === prev)) sel.value = prev;
    },

    // ─── Carregar Kanban de um projeto ───
    async carregarKanban(projetoId) {
        if (!projetoId) {
            document.getElementById('kanbanBoard').innerHTML =
                '<p class="text-neutral-500 text-center py-16 text-sm">Selecione um projeto para visualizar o Kanban.</p>';
            return;
        }
        this.kanbanProjetoAtual = this.projetos.find(p => p.id === projetoId);
        if (!this.kanbanProjetoAtual) return;

        try {
            const resp = await fetch(`${this.apiBaseUrl}/tarefas/${projetoId}`, {
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            this.kanbanTarefas = await resp.json();
        } catch (e) {
            this.kanbanTarefas = [];
        }

        this.renderKanban();
    },

    // ─── Renderiza o quadro ───
    renderKanban() {
        const board = document.getElementById('kanbanBoard');
        if (!this.kanbanProjetoAtual) return;

        let colunas = this.kanbanProjetoAtual.colunasKanban;
        if (typeof colunas === 'string') {
            try { colunas = JSON.parse(colunas); } catch (e) { colunas = ['Backlog', 'A Fazer', 'Em Andamento', 'Revisão', 'Concluído']; }
        }
        if (!Array.isArray(colunas) || colunas.length === 0) {
            colunas = ['Backlog', 'A Fazer', 'Em Andamento', 'Revisão', 'Concluído'];
        }

        const colorMap = {
            'Backlog': { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)', dot: '#94a3b8' },
            'A Fazer': { bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)', dot: '#3b82f6' },
            'Em Andamento': { bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.25)', dot: '#f97316' },
            'Revisão': { bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.25)', dot: '#a855f7' },
            'Concluído': { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.25)', dot: '#22c55e' }
        };
        const defaultColor = { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', dot: '#f97316' };

        board.innerHTML = colunas.map(col => {
            const tarefasCol = this.kanbanTarefas
                .filter(t => t.coluna === col)
                .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

            const colors = colorMap[col] || defaultColor;
            const count = tarefasCol.length;

            return `
            <div class="kanban-column" data-coluna="${this.escapeHtml(col)}"
                 ondragover="event.preventDefault(); this.classList.add('kanban-column-over');"
                 ondragleave="this.classList.remove('kanban-column-over');"
                 ondrop="controleHoras.onDropKanban(event, '${this.escapeHtml(col)}'); this.classList.remove('kanban-column-over');">
                <div class="kanban-column-header">
                    <div class="kanban-column-title">
                        <span class="kanban-dot" style="background:${colors.dot};"></span>
                        ${this.escapeHtml(col)}
                        <span class="kanban-count">${count}</span>
                    </div>
                    <button class="kanban-add-btn" onclick="controleHoras.abrirModalTarefa(null, '${this.escapeHtml(col)}')" title="Adicionar tarefa">
                        <i class="bi bi-plus-lg"></i>
                    </button>
                </div>
                <div class="kanban-cards" data-coluna="${this.escapeHtml(col)}">
                    ${tarefasCol.map(t => this.renderKanbanCard(t, colors)).join('')}
                </div>
            </div>`;
        }).join('');
    },

    renderKanbanCard(tarefa, colors) {
        const isAtrasado = tarefa.dataPrevisao && !tarefa.dataEntrega && new Date(tarefa.dataPrevisao) < new Date();
        const badgeClass = isAtrasado ? 'kanban-badge-atrasado' : '';

        let datesHtml = '';
        if (tarefa.dataInicio || tarefa.dataPrevisao || tarefa.dataEntrega) {
            datesHtml = '<div class="kanban-card-dates">';
            if (tarefa.dataInicio)   datesHtml += `<span title="Início"><i class="bi bi-play-circle"></i> ${this.formatarData(tarefa.dataInicio)}</span>`;
            if (tarefa.dataPrevisao) datesHtml += `<span title="Previsão" class="${badgeClass}"><i class="bi bi-calendar-event"></i> ${this.formatarData(tarefa.dataPrevisao)}</span>`;
            if (tarefa.dataEntrega)  datesHtml += `<span title="Entregue" class="kanban-badge-entregue"><i class="bi bi-check-circle"></i> ${this.formatarData(tarefa.dataEntrega)}</span>`;
            datesHtml += '</div>';
        }

        return `
        <div class="kanban-card ${badgeClass ? 'kanban-card-atrasado' : ''}"
             draggable="true"
             data-id="${tarefa.id}"
             ondragstart="controleHoras.onDragStartKanban(event, '${tarefa.id}')"
             ondragend="this.classList.remove('dragging');"
             onclick="controleHoras.abrirModalTarefa('${tarefa.id}')">
            <div class="kanban-card-title">${this.escapeHtml(tarefa.titulo)}</div>
            ${tarefa.descricao ? `<div class="kanban-card-desc">${this.escapeHtml(tarefa.descricao).substring(0, 80)}${tarefa.descricao.length > 80 ? '…' : ''}</div>` : ''}
            ${datesHtml}
        </div>`;
    },

    // ─── Drag & Drop ───
    onDragStartKanban(event, tarefaId) {
        event.dataTransfer.setData('text/plain', tarefaId);
        event.target.classList.add('dragging');
    },

    async onDropKanban(event, colunaDestino) {
        event.preventDefault();
        const tarefaId = event.dataTransfer.getData('text/plain');
        const tarefa = this.kanbanTarefas.find(t => t.id === tarefaId);
        if (!tarefa) return;

        tarefa.coluna = colunaDestino;

        // Recalcular ordens na coluna destino
        const tarefasCol = this.kanbanTarefas
            .filter(t => t.coluna === colunaDestino)
            .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

        tarefasCol.forEach((t, i) => { t.ordem = i; });

        this.renderKanban();

        // Persistir reordenação
        try {
            await fetch(`${this.apiBaseUrl}/tarefas-reordenar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                body: JSON.stringify({ tarefas: this.kanbanTarefas.map(t => ({ id: t.id, coluna: t.coluna, ordem: t.ordem })) })
            });
        } catch (e) {
            console.error('Erro ao reordenar:', e);
        }
    },

    // ─── Modal de Tarefa (criar/editar) ───
    abrirModalTarefa(tarefaId, colunaDefault) {
        const modal = document.getElementById('modalTarefa');
        const form  = document.getElementById('formTarefa');
        form.reset();

        // Helper to set date via Flatpickr or native input
        const fp = window.fpInstances || {};
        const setDate = (id, val) => {
            if (fp[id]) {
                fp[id].setDate(val || '', true);
            } else {
                document.getElementById(id).value = val || '';
            }
        };

        if (tarefaId) {
            const t = this.kanbanTarefas.find(x => x.id === tarefaId);
            if (!t) return;
            document.getElementById('tarefaId').value = t.id;
            document.getElementById('tarefaTitulo').value = t.titulo;
            document.getElementById('tarefaDescricao').value = t.descricao || '';
            document.getElementById('tarefaColuna').value = t.coluna;
            setDate('tarefaDataInicio', t.dataInicio);
            setDate('tarefaDataPrevisao', t.dataPrevisao);
            setDate('tarefaDataEntrega', t.dataEntrega);
            document.getElementById('modalTarefaTitulo').textContent = 'Editar Tarefa';
            document.getElementById('btnExcluirTarefa').style.display = 'inline-flex';
        } else {
            document.getElementById('tarefaId').value = '';
            document.getElementById('tarefaColuna').value = colunaDefault || 'Backlog';
            setDate('tarefaDataInicio', '');
            setDate('tarefaDataPrevisao', '');
            setDate('tarefaDataEntrega', '');
            document.getElementById('modalTarefaTitulo').textContent = 'Nova Tarefa';
            document.getElementById('btnExcluirTarefa').style.display = 'none';
        }

        // Popula select de colunas do modal
        const selColuna = document.getElementById('tarefaColuna');
        selColuna.innerHTML = '';
        let colunas = this.kanbanProjetoAtual?.colunasKanban;
        if (typeof colunas === 'string') { try { colunas = JSON.parse(colunas); } catch(e) { colunas = []; }}
        if (!Array.isArray(colunas)) colunas = ['Backlog', 'A Fazer', 'Em Andamento', 'Revisão', 'Concluído'];
        colunas.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c; opt.textContent = c;
            selColuna.appendChild(opt);
        });
        if (tarefaId) {
            const t = this.kanbanTarefas.find(x => x.id === tarefaId);
            if (t) selColuna.value = t.coluna;
        } else {
            selColuna.value = colunaDefault || 'Backlog';
        }

        modal.classList.add('active');
    },

    fecharModalTarefa() {
        document.getElementById('modalTarefa').classList.remove('active');
    },

    async salvarTarefa() {
        const id = document.getElementById('tarefaId').value;
        const titulo = document.getElementById('tarefaTitulo').value.trim();
        if (!titulo) { this.mostrarToast('Informe o título da tarefa.', 'error'); return; }

        const dados = {
            titulo,
            descricao: document.getElementById('tarefaDescricao').value.trim(),
            coluna: document.getElementById('tarefaColuna').value,
            dataInicio: document.getElementById('tarefaDataInicio').value || null,
            dataPrevisao: document.getElementById('tarefaDataPrevisao').value || null,
            dataEntrega: document.getElementById('tarefaDataEntrega').value || null,
            projetoId: this.kanbanProjetoAtual.id
        };

        try {
            if (id) {
                // Editar
                const t = this.kanbanTarefas.find(x => x.id === id);
                dados.ordem = t ? t.ordem : 0;
                await fetch(`${this.apiBaseUrl}/tarefas/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                    body: JSON.stringify(dados)
                });
                this.mostrarToast('Tarefa atualizada!', 'success');
            } else {
                // Criar
                dados.id = this.gerarId();
                dados.ordem = this.kanbanTarefas.filter(t => t.coluna === dados.coluna).length;
                await fetch(`${this.apiBaseUrl}/tarefas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                    body: JSON.stringify(dados)
                });
                this.mostrarToast('Tarefa criada!', 'success');
            }

            this.fecharModalTarefa();
            await this.carregarKanban(this.kanbanProjetoAtual.id);
        } catch (e) {
            this.mostrarToast('Erro ao salvar tarefa.', 'error');
        }
    },

    async excluirTarefa() {
        const id = document.getElementById('tarefaId').value;
        if (!id) return;
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

        try {
            await fetch(`${this.apiBaseUrl}/tarefas/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            this.fecharModalTarefa();
            this.mostrarToast('Tarefa excluída!', 'success');
            await this.carregarKanban(this.kanbanProjetoAtual.id);
        } catch (e) {
            this.mostrarToast('Erro ao excluir tarefa.', 'error');
        }
    },

    // ─── Gerenciamento de Colunas ───
    _colunaDragItem: null,

    _criarColunaEditorItem(valor, placeholder) {
        const div = document.createElement('div');
        div.className = 'coluna-editor-item';
        div.setAttribute('draggable', 'true');
        div.innerHTML = `
            <span class="coluna-drag-handle"><i class="bi bi-grip-vertical"></i></span>
            <input type="text" class="form-control coluna-input" value="${valor ? this.escapeHtml(valor) : ''}" placeholder="${placeholder || ''}" style="flex:1;">
            <button type="button" class="btn-danger-sm" onclick="this.parentElement.remove();" title="Remover">
                <i class="bi bi-trash"></i>
            </button>`;

        // Drag only from handle
        const handle = div.querySelector('.coluna-drag-handle');
        div.addEventListener('dragstart', (e) => {
            if (!e.target.closest('.coluna-drag-handle') && e.target !== handle) {
                e.preventDefault();
                return;
            }
            this._colunaDragItem = div;
            div.classList.add('coluna-dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        div.addEventListener('dragend', () => {
            div.classList.remove('coluna-dragging');
            this._colunaDragItem = null;
            // Remove any remaining drag-over styles
            document.querySelectorAll('.coluna-editor-item.coluna-drag-over').forEach(el => el.classList.remove('coluna-drag-over'));
        });
        div.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (this._colunaDragItem && this._colunaDragItem !== div) {
                div.classList.add('coluna-drag-over');
            }
        });
        div.addEventListener('dragleave', () => {
            div.classList.remove('coluna-drag-over');
        });
        div.addEventListener('drop', (e) => {
            e.preventDefault();
            div.classList.remove('coluna-drag-over');
            if (!this._colunaDragItem || this._colunaDragItem === div) return;
            const container = document.getElementById('colunasEditor');
            const items = [...container.querySelectorAll('.coluna-editor-item')];
            const fromIdx = items.indexOf(this._colunaDragItem);
            const toIdx = items.indexOf(div);
            if (fromIdx < toIdx) {
                div.after(this._colunaDragItem);
            } else {
                div.before(this._colunaDragItem);
            }
        });

        // Prevent drag when clicking inside the input
        const input = div.querySelector('input');
        input.addEventListener('mousedown', () => { div.setAttribute('draggable', 'false'); });
        input.addEventListener('mouseup',   () => { div.setAttribute('draggable', 'true'); });
        input.addEventListener('blur',      () => { div.setAttribute('draggable', 'true'); });

        return div;
    },

    abrirModalColunas() {
        const modal = document.getElementById('modalColunas');
        const container = document.getElementById('colunasEditor');
        let colunas = this.kanbanProjetoAtual?.colunasKanban;
        if (typeof colunas === 'string') { try { colunas = JSON.parse(colunas); } catch(e) { colunas = []; }}
        if (!Array.isArray(colunas)) colunas = ['Backlog', 'A Fazer', 'Em Andamento', 'Revisão', 'Concluído'];

        container.innerHTML = '';
        colunas.forEach(col => {
            container.appendChild(this._criarColunaEditorItem(col));
        });

        modal.classList.add('active');
    },

    fecharModalColunas() {
        document.getElementById('modalColunas').classList.remove('active');
    },

    adicionarColunaKanban() {
        const container = document.getElementById('colunasEditor');
        const div = this._criarColunaEditorItem('', 'Nome da coluna');
        container.appendChild(div);
        div.querySelector('input').focus();
    },

    async salvarColunasKanban() {
        const inputs = document.querySelectorAll('#colunasEditor .coluna-input');
        const colunas = [];
        inputs.forEach(inp => {
            const val = inp.value.trim();
            if (val) colunas.push(val);
        });

        if (colunas.length === 0) {
            this.mostrarToast('Adicione pelo menos uma coluna.', 'error');
            return;
        }

        this.kanbanProjetoAtual.colunasKanban = colunas;

        // Salvar no servidor
        try {
            await fetch(`${this.apiBaseUrl}/projetos/${this.kanbanProjetoAtual.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                body: JSON.stringify({
                    clienteId: this.kanbanProjetoAtual.clienteId,
                    nome: this.kanbanProjetoAtual.nome,
                    descricao: this.kanbanProjetoAtual.descricao,
                    valorHora: this.kanbanProjetoAtual.valorHora,
                    dataAtualizacao: new Date().toISOString(),
                    colunasKanban: colunas
                })
            });

            // Atualizar no array local
            const idx = this.projetos.findIndex(p => p.id === this.kanbanProjetoAtual.id);
            if (idx !== -1) this.projetos[idx].colunasKanban = colunas;

            this.fecharModalColunas();
            this.renderKanban();
            this.mostrarToast('Colunas atualizadas!', 'success');
        } catch (e) {
            this.mostrarToast('Erro ao salvar colunas.', 'error');
        }
    }
});
