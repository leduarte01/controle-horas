/**
 * js/kanban.js — Kanban board engine mixed into ControleHoras
 * Cascading filter: Cliente → Projeto → Atividade → Tasks
 * Drag & Drop nativo HTML5 + CRUD de tarefas + CRUD de atividades
 */

// Pre-defined activity suggestions
const ATIVIDADES_SUGERIDAS = [
    { nome: 'Desenvolvimento',         descricao: 'Codificação, implementação de funcionalidades', cor: '#3b82f6' },
    { nome: 'Suporte',                  descricao: 'Atendimento, resolução de chamados',           cor: '#22c55e' },
    { nome: 'Reunião',                  descricao: 'Alinhamentos, dailies, retrospectivas',        cor: '#a855f7' },
    { nome: 'Documentação',             descricao: 'Manuais, especificações técnicas',             cor: '#06b6d4' },
    { nome: 'Testes / QA',              descricao: 'Testes funcionais, validação de qualidade',    cor: '#eab308' },
    { nome: 'Deploy / Infraestrutura',  descricao: 'Publicações, configurações de servidor',       cor: '#ef4444' },
    { nome: 'Design / UX',              descricao: 'Protótipos, wireframes, interfaces',           cor: '#ec4899' },
    { nome: 'Análise / Levantamento',   descricao: 'Levantamento de requisitos, análise de negócio', cor: '#14b8a6' },
    { nome: 'Treinamento',              descricao: 'Capacitação de equipe ou cliente',             cor: '#f97316' },
    { nome: 'Correção de Bugs',         descricao: 'Correção de erros e falhas',                   cor: '#dc2626' },
    { nome: 'Consultoria',              descricao: 'Consultoria estratégica, assessoria técnica',  cor: '#8b5cf6' },
    { nome: 'Automação',                descricao: 'Robôs, scripts, workflows automatizados',      cor: '#10b981' },
];

Object.assign(ControleHoras.prototype, {

    kanbanProjetoAtual: null,
    kanbanAtividadeAtual: null,
    kanbanTarefas: [],
    kanbanAtividades: [],

    // ─── Inicialização do Kanban ───
    async inicializarKanban() {
        this.atualizarSelectKanbanClientes();
    },

    // ─── Cascata: Popula selects ───
    atualizarSelectKanbanClientes() {
        const sel = document.getElementById('kanbanClienteSelect');
        if (!sel) return;
        const prev = sel.value;
        sel.innerHTML = '<option value="">Selecione um cliente</option>';
        this.clientes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id; opt.textContent = c.nome;
            sel.appendChild(opt);
        });
        if (prev && this.clientes.some(c => c.id === prev)) {
            sel.value = prev;
        }
        // Reset downstream
        this._resetProjetoSelect();
        this._resetAtividadeSelect();
        this._resetKanbanBoard();
        this._updateButtonStates();
    },

    onKanbanClienteChange(clienteId) {
        this._resetAtividadeSelect();
        this._resetKanbanBoard();
        const selProjeto = document.getElementById('kanbanProjetoSelect');
        selProjeto.innerHTML = '<option value="">Selecione um projeto</option>';

        if (!clienteId) {
            selProjeto.disabled = true;
            this._updateButtonStates();
            return;
        }

        const projetosFiltrados = this.projetos.filter(p => p.clienteId === clienteId);
        projetosFiltrados.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id; opt.textContent = p.nome;
            selProjeto.appendChild(opt);
        });
        selProjeto.disabled = false;
        this._updateButtonStates();
    },

    async onKanbanProjetoChange(projetoId) {
        this._resetKanbanBoard();
        const selAtividade = document.getElementById('kanbanAtividadeSelect');
        selAtividade.innerHTML = '<option value="">Selecione uma atividade</option>';

        if (!projetoId) {
            selAtividade.disabled = true;
            this.kanbanProjetoAtual = null;
            this._updateButtonStates();
            return;
        }

        this.kanbanProjetoAtual = this.projetos.find(p => p.id === projetoId);

        // Fetch atividades from API
        try {
            const resp = await fetch(`${this.apiBaseUrl}/atividades/${projetoId}`, {
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            this.kanbanAtividades = await resp.json();
        } catch (e) {
            this.kanbanAtividades = [];
        }

        this.kanbanAtividades.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = a.nome;
            selAtividade.appendChild(opt);
        });
        selAtividade.disabled = false;
        this._updateButtonStates();
    },

    async onKanbanAtividadeChange(atividadeId) {
        if (!atividadeId) {
            this.kanbanAtividadeAtual = null;
            this._resetKanbanBoard();
            this._updateButtonStates();
            return;
        }

        this.kanbanAtividadeAtual = this.kanbanAtividades.find(a => a.id === atividadeId);
        this._updateButtonStates();
        await this.carregarKanban(this.kanbanProjetoAtual.id, atividadeId);
    },

    _resetProjetoSelect() {
        const sel = document.getElementById('kanbanProjetoSelect');
        sel.innerHTML = '<option value="">Selecione um projeto</option>';
        sel.disabled = true;
        this.kanbanProjetoAtual = null;
    },

    _resetAtividadeSelect() {
        const sel = document.getElementById('kanbanAtividadeSelect');
        sel.innerHTML = '<option value="">Selecione uma atividade</option>';
        sel.disabled = true;
        this.kanbanAtividadeAtual = null;
        this.kanbanAtividades = [];
    },

    _resetKanbanBoard() {
        document.getElementById('kanbanBoard').innerHTML =
            '<p class="text-neutral-500 text-center py-16 text-sm">Selecione um cliente, projeto e atividade para visualizar o Kanban.</p>';
    },

    _updateButtonStates() {
        const hasProjeto = !!this.kanbanProjetoAtual;
        // const hasAtividade = !!this.kanbanAtividadeAtual;
        document.getElementById('btnNovaAtividade').disabled = !hasProjeto;
        // As colunas são vinculadas ao projeto, então basta ter o projeto selecionado
        document.getElementById('btnEditarColunas').disabled = !hasProjeto;
    },

    // ─── Carregar Kanban de um projeto + atividade ───
    async carregarKanban(projetoId, atividadeId) {
        if (!projetoId || !atividadeId) {
            this._resetKanbanBoard();
            return;
        }
        this.kanbanProjetoAtual = this.projetos.find(p => p.id === projetoId);
        if (!this.kanbanProjetoAtual) return;

        try {
            const resp = await fetch(`${this.apiBaseUrl}/tarefas/${projetoId}?atividadeId=${atividadeId}`, {
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

        let responsavelHtml = '';
        if (tarefa.responsavelId && this.equipe) {
            const resp = this.equipe.find(u => u.id == tarefa.responsavelId);
            if (resp) {
                const init = resp.nome.charAt(0).toUpperCase();
                responsavelHtml = `
                <div class="flex items-center gap-1 mt-2 text-xs text-neutral-400" title="Responsável: ${resp.nome}">
                    <div class="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-[10px]">
                        ${init}
                    </div>
                    <span class="truncate pr-1">${resp.nome.split(' ')[0]}</span>
                </div>`;
            }
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
            ${responsavelHtml}
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

        const tarefasCol = this.kanbanTarefas
            .filter(t => t.coluna === colunaDestino)
            .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
        tarefasCol.forEach((t, i) => { t.ordem = i; });

        this.renderKanban();

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
    // tipo: 'task'|'userstory'|'feature'|'epic'  parentId: id string or null
    abrirModalTarefa(tarefaId, colunaDefault, tipoDefault, parentIdDefault) {
        // Ensure responsável select is populated
        this.atualizarSelectResponsavelKanban();

        const modal = document.getElementById('modalTarefa');
        const form  = document.getElementById('formTarefa');
        form.reset();

        // Reset tags UI
        this._setTagsUI([]);

        const fp = window.fpInstances || {};
        const setDate = (id, val) => {
            if (fp[id]) { fp[id].setDate(val || '', true); }
            else { document.getElementById(id).value = val || ''; }
        };

        // Determine project for parent select population
        const projetoId = this.kanbanProjetoAtual?.id || this.backlogProjeto?.id || null;

        if (tarefaId) {
            // Try kanban list first, then backlog items
            const t = this.kanbanTarefas.find(x => x.id === tarefaId)
                   || (this.backlogItems || []).find(x => x.id === tarefaId);
            if (!t) return;
            document.getElementById('tarefaId').value         = t.id;
            document.getElementById('tarefaTipo').value       = t.tipo || 'task';
            document.getElementById('tarefaParentId').value   = t.parentId || '';
            document.getElementById('tarefaTitulo').value      = t.titulo;
            document.getElementById('tarefaDescricao').value  = t.descricao || '';
            document.getElementById('tarefaColuna').value     = t.coluna || 'Backlog';
            document.getElementById('tarefaResponsavel').value = t.responsavelId || '';
            document.getElementById('tarefaPrioridade').value  = t.prioridade || 3;
            document.getElementById('tarefaEstimativaHoras').value = t.estimativaHoras || '';
            this._setTagsUI(t.tags ? (typeof t.tags === 'string' ? JSON.parse(t.tags) : t.tags) : []);
            setDate('tarefaDataInicio', t.dataInicio);
            setDate('tarefaDataPrevisao', t.dataPrevisao);
            setDate('tarefaDataEntrega', t.dataEntrega);
            document.getElementById('modalTarefaTitulo').textContent = 'Editar Tarefa';
            document.getElementById('btnExcluirTarefa').style.display = 'inline-flex';
            document.getElementById('comentariosSection').style.display = 'block';
            document.getElementById('novoComentarioTexto').value = '';
            this.carregarComentarios(t.id);
        } else {
            document.getElementById('tarefaId').value = '';
            document.getElementById('tarefaTipo').value       = tipoDefault || 'task';
            document.getElementById('tarefaParentId').value   = parentIdDefault || '';
            document.getElementById('tarefaColuna').value     = colunaDefault || 'Backlog';
            document.getElementById('tarefaResponsavel').value = '';
            document.getElementById('tarefaPrioridade').value  = 3;
            document.getElementById('tarefaEstimativaHoras').value = '';
            setDate('tarefaDataInicio', '');
            setDate('tarefaDataPrevisao', '');
            setDate('tarefaDataEntrega', '');
            document.getElementById('modalTarefaTitulo').textContent = 'Nova Tarefa';
            document.getElementById('btnExcluirTarefa').style.display = 'none';
            document.getElementById('comentariosSection').style.display = 'none';
        }

        // Popula select de colunas
        const selColuna = document.getElementById('tarefaColuna');
        selColuna.innerHTML = '';
        let colunas = this.kanbanProjetoAtual?.colunasKanban || this.backlogProjeto?.colunasKanban;
        if (typeof colunas === 'string') { try { colunas = JSON.parse(colunas); } catch(e) { colunas = []; }}
        if (!Array.isArray(colunas)) colunas = ['Backlog', 'A Fazer', 'Em Andamento', 'Revisão', 'Concluído'];
        colunas.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c; opt.textContent = c;
            selColuna.appendChild(opt);
        });
        if (tarefaId) {
            const t = this.kanbanTarefas.find(x => x.id === tarefaId)
                   || (this.backlogItems || []).find(x => x.id === tarefaId);
            if (t) selColuna.value = t.coluna || 'Backlog';
        } else {
            selColuna.value = colunaDefault || 'Backlog';
        }

        // Populate parent select based on tipo
        this.onTarefaTipoChange(document.getElementById('tarefaTipo').value, parentIdDefault);

        modal.classList.add('active');
    },

    fecharModalTarefa() {
        document.getElementById('modalTarefa').classList.remove('active');
    },

    async salvarTarefa() {
        const id = document.getElementById('tarefaId').value;
        const titulo = document.getElementById('tarefaTitulo').value.trim();
        if (!titulo) { this.mostrarToast('Informe o título da tarefa.', 'error'); return; }

        const projetoId = this.kanbanProjetoAtual?.id || this.backlogProjeto?.id;
        if (!projetoId) { this.mostrarToast('Nenhum projeto selecionado.', 'error'); return; }

        const tagsRaw = document.getElementById('tarefaTagsValue').value;
        const dados = {
            titulo,
            descricao: document.getElementById('tarefaDescricao').value.trim(),
            coluna: document.getElementById('tarefaColuna').value,
            responsavelId: document.getElementById('tarefaResponsavel').value || null,
            dataInicio: document.getElementById('tarefaDataInicio').value || null,
            dataPrevisao: document.getElementById('tarefaDataPrevisao').value || null,
            dataEntrega: document.getElementById('tarefaDataEntrega').value || null,
            projetoId,
            atividadeId: this.kanbanAtividadeAtual?.id || null,
            tipo: document.getElementById('tarefaTipo').value || 'task',
            parentId: document.getElementById('tarefaParentId').value || null,
            prioridade: parseInt(document.getElementById('tarefaPrioridade').value) || 3,
            estimativaHoras: parseFloat(document.getElementById('tarefaEstimativaHoras').value) || null,
            tags: tagsRaw || null
        };

        try {
            if (id) {
                const t = this.kanbanTarefas.find(x => x.id === id)
                       || (this.backlogItems || []).find(x => x.id === id);
                dados.ordem = t ? t.ordem : 0;
                await fetch(`${this.apiBaseUrl}/tarefas/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                    body: JSON.stringify(dados)
                });
                this.mostrarToast('Tarefa atualizada!', 'success');
            } else {
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
            if (this.kanbanAtividadeAtual && this.kanbanProjetoAtual) {
                await this.carregarKanban(this.kanbanProjetoAtual.id, this.kanbanAtividadeAtual.id);
            }
            await this._refreshBacklogIfVisible();
        } catch (e) {
            this.mostrarToast('Erro ao salvar tarefa.', 'error');
        }
    },

    async excluirTarefa() {
        const id = document.getElementById('tarefaId').value;
        if (!id) return;
        const ok = await Dialog.confirm({
            title: 'Excluir Tarefa',
            message: 'Tem certeza que deseja excluir esta tarefa do Kanban?',
            type: 'danger',
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });
        if (!ok) return;

        try {
            await fetch(`${this.apiBaseUrl}/tarefas/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            this.fecharModalTarefa();
            this.mostrarToast('Tarefa excluída!', 'success');
            await this.carregarKanban(this.kanbanProjetoAtual.id, this.kanbanAtividadeAtual?.id);
        } catch (e) {
            this.mostrarToast('Erro ao excluir tarefa.', 'error');
        }
    },

    // ─── CRUD de Atividades ───
    abrirModalAtividade(atividadeId) {
        this.popularSelectResponsavelAtividade();

        const modal = document.getElementById('modalAtividade');
        document.getElementById('formAtividade').reset();

        if (atividadeId) {
            const a = this.kanbanAtividades.find(x => x.id === atividadeId);
            if (!a) return;
            document.getElementById('atividadeId').value = a.id;
            document.getElementById('atividadeNome').value = a.nome;
            document.getElementById('atividadeDescricao').value = a.descricao || '';
            document.getElementById('atividadeCor').value = a.cor || '#f97316';
            document.getElementById('atividadeResponsavel').value = a.responsavelId || '';
            document.getElementById('modalAtividadeTitulo').textContent = 'Editar Atividade';
            document.getElementById('btnExcluirAtividade').style.display = 'inline-flex';
            document.getElementById('importarAtividadesSection').style.display = 'none';
        } else {
            document.getElementById('atividadeId').value = '';
            document.getElementById('atividadeCor').value = '#f97316';
            document.getElementById('atividadeResponsavel').value = '';
            document.getElementById('modalAtividadeTitulo').textContent = 'Nova Atividade';
            document.getElementById('btnExcluirAtividade').style.display = 'none';
            document.getElementById('importarAtividadesSection').style.display = 'block';
        }

        modal.classList.add('active');
    },

    fecharModalAtividade() {
        document.getElementById('modalAtividade').classList.remove('active');
    },

    async salvarAtividade() {
        const id = document.getElementById('atividadeId').value;
        const nome = document.getElementById('atividadeNome').value.trim();
        if (!nome) { this.mostrarToast('Informe o nome da atividade.', 'error'); return; }

        const dados = {
            nome,
            descricao: document.getElementById('atividadeDescricao').value.trim(),
            cor: document.getElementById('atividadeCor').value,
            projetoId: this.kanbanProjetoAtual.id,
            responsavelId: document.getElementById('atividadeResponsavel').value || null
        };

        try {
            if (id) {
                await fetch(`${this.apiBaseUrl}/atividades/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                    body: JSON.stringify(dados)
                });
                this.mostrarToast('Atividade atualizada!', 'success');
            } else {
                dados.id = this.gerarId();
                await fetch(`${this.apiBaseUrl}/atividades`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                    body: JSON.stringify(dados)
                });
                this.mostrarToast('Atividade criada!', 'success');
            }

            this.fecharModalAtividade();
            // Refresh atividades select
            await this.onKanbanProjetoChange(this.kanbanProjetoAtual.id);
        } catch (e) {
            this.mostrarToast('Erro ao salvar atividade.', 'error');
        }
    },

    async excluirAtividade() {
        const id = document.getElementById('atividadeId').value;
        if (!id) return;
        const ok = await Dialog.confirm({
            title: 'Excluir Atividade',
            message: 'Excluir esta atividade removerá também todas as tarefas vinculadas. Deseja continuar?',
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
            this.fecharModalAtividade();
            this.mostrarToast('Atividade excluída!', 'success');
            this.kanbanAtividadeAtual = null;
            await this.onKanbanProjetoChange(this.kanbanProjetoAtual.id);
            this._resetKanbanBoard();
        } catch (e) {
            this.mostrarToast('Erro ao excluir atividade.', 'error');
        }
    },

    // ─── Importar Atividades Sugeridas ───
    abrirImportarAtividades() {
        this.fecharModalAtividade();
        const modal = document.getElementById('modalImportarAtividades');
        const container = document.getElementById('checklistAtividades');

        // Filter out already existing activities
        const existentes = this.kanbanAtividades.map(a => a.nome.toLowerCase());

        container.innerHTML = ATIVIDADES_SUGERIDAS.map((a, i) => {
            const jaExiste = existentes.includes(a.nome.toLowerCase());
            return `
            <label class="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-white/[0.04] transition-colors ${jaExiste ? 'opacity-40' : ''}"
                   style="border:1px solid rgba(255,255,255,0.06);">
                <input type="checkbox" class="atividade-check" data-index="${i}" ${jaExiste ? 'disabled' : 'checked'}
                       style="accent-color:#f97316;width:18px;height:18px;">
                <span class="flex-1">
                    <span class="font-medium text-sm" style="color:${a.cor};">${this.escapeHtml(a.nome)}</span>
                    <span class="text-xs text-neutral-500 block">${this.escapeHtml(a.descricao)}</span>
                </span>
                ${jaExiste ? '<span class="text-xs text-neutral-500">Já existe</span>' : ''}
            </label>`;
        }).join('');

        modal.classList.add('active');
    },

    fecharImportarAtividades() {
        document.getElementById('modalImportarAtividades').classList.remove('active');
    },

    toggleAllAtividades() {
        const checks = document.querySelectorAll('.atividade-check:not(:disabled)');
        const allChecked = [...checks].every(c => c.checked);
        checks.forEach(c => { c.checked = !allChecked; });
    },

    async importarAtividadesSelecionadas() {
        const checks = document.querySelectorAll('.atividade-check:checked:not(:disabled)');
        if (checks.length === 0) {
            this.mostrarToast('Selecione pelo menos uma atividade.', 'error');
            return;
        }

        try {
            for (const check of checks) {
                const idx = parseInt(check.dataset.index);
                const sugestao = ATIVIDADES_SUGERIDAS[idx];
                await fetch(`${this.apiBaseUrl}/atividades`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                    body: JSON.stringify({
                        id: this.gerarId(),
                        projetoId: this.kanbanProjetoAtual.id,
                        nome: sugestao.nome,
                        descricao: sugestao.descricao,
                        cor: sugestao.cor
                    })
                });
            }

            this.fecharImportarAtividades();
            this.mostrarToast(`${checks.length} atividade(s) importada(s)!`, 'success');
            await this.onKanbanProjetoChange(this.kanbanProjetoAtual.id);
        } catch (e) {
            this.mostrarToast('Erro ao importar atividades.', 'error');
        }
    },

    // ─── Gerenciamento de Colunas ───
    _colunaDragItem: null,

    _criarColunaEditorItem(valor, placeholder) {
        const self = this;
        const div = document.createElement('div');
        div.className = 'coluna-editor-item';
        div.innerHTML = `
            <span class="coluna-drag-handle"><i class="bi bi-grip-vertical"></i></span>
            <input type="text" class="form-control coluna-input" value="${valor ? this.escapeHtml(valor) : ''}" placeholder="${placeholder || ''}" style="flex:1;">
            <button type="button" class="btn-danger-sm" onclick="this.parentElement.remove();" title="Remover">
                <i class="bi bi-trash"></i>
            </button>`;

        const handle = div.querySelector('.coluna-drag-handle');

        handle.addEventListener('mousedown', () => {
            div.setAttribute('draggable', 'true');
        });
        document.addEventListener('mouseup', function onUp() {
            div.setAttribute('draggable', 'false');
        });

        div.addEventListener('dragstart', (e) => {
            self._colunaDragItem = div;
            div.classList.add('coluna-dragging');
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => { div.style.opacity = '0.4'; }, 0);
        });
        div.addEventListener('dragend', () => {
            div.classList.remove('coluna-dragging');
            div.style.opacity = '';
            div.setAttribute('draggable', 'false');
            self._colunaDragItem = null;
            document.querySelectorAll('.coluna-editor-item.coluna-drag-over')
                .forEach(el => el.classList.remove('coluna-drag-over'));
        });
        div.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (self._colunaDragItem && self._colunaDragItem !== div) {
                div.classList.add('coluna-drag-over');
            }
        });
        div.addEventListener('dragleave', () => {
            div.classList.remove('coluna-drag-over');
        });
        div.addEventListener('drop', (e) => {
            e.preventDefault();
            div.classList.remove('coluna-drag-over');
            if (!self._colunaDragItem || self._colunaDragItem === div) return;
            const container = document.getElementById('colunasEditor');
            const items = [...container.querySelectorAll('.coluna-editor-item')];
            const fromIdx = items.indexOf(self._colunaDragItem);
            const toIdx = items.indexOf(div);
            if (fromIdx < toIdx) {
                div.after(self._colunaDragItem);
            } else {
                div.before(self._colunaDragItem);
            }
        });

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

    // ─── Responsável Atividade ───
    popularSelectResponsavelAtividade() {
        const select = document.getElementById('atividadeResponsavel');
        if (!select) return;
        let html = '<option value="">Nenhum</option>';
        if (this.equipe) {
            this.equipe.forEach(u => {
                html += `<option value="${u.id}">${this.escapeHtml(u.nome)}</option>`;
            });
        }
        select.innerHTML = html;
    },

    // ─── Tags ───
    _currentTags: [],

    _setTagsUI(tags) {
        this._currentTags = Array.isArray(tags) ? [...tags] : [];
        this._renderTagChips();
    },

    _renderTagChips() {
        const container = document.getElementById('tarefaTagsContainer');
        if (!container) return;
        // Remove existing chips
        container.querySelectorAll('.tag-chip').forEach(el => el.remove());
        // Insert chips before input
        const input = document.getElementById('tarefaTagsInput');
        this._currentTags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'tag-chip';
            span.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;background:rgba(249,115,22,0.2);color:#f97316;font-size:0.75rem;cursor:default;';
            span.innerHTML = `${this.escapeHtml(tag)} <button type="button" onclick="controleHoras.removeTag('${this.escapeHtml(tag)}')" style="background:none;border:none;cursor:pointer;color:inherit;padding:0;font-size:0.8rem;line-height:1;">&times;</button>`;
            container.insertBefore(span, input);
        });
        document.getElementById('tarefaTagsValue').value = this._currentTags.length ? JSON.stringify(this._currentTags) : '';
    },

    addTag(tag) {
        const clean = tag.trim().replace(/,/g, '').substring(0, 30);
        if (!clean || this._currentTags.includes(clean)) return;
        this._currentTags.push(clean);
        this._renderTagChips();
    },

    removeTag(tag) {
        this._currentTags = this._currentTags.filter(t => t !== tag);
        this._renderTagChips();
    },

    onTagKeydown(event) {
        const input = event.target;
        if (event.key === 'Enter') {
            event.preventDefault();
            this.addTag(input.value);
            input.value = '';
        } else if (event.key === 'Backspace' && !input.value && this._currentTags.length) {
            this._currentTags.pop();
            this._renderTagChips();
        }
    },

    // ─── Tipo da Tarefa → habilita/popula select pai ───
    onTarefaTipoChange(tipo, forceParentId) {
        const selParent = document.getElementById('tarefaParentSelect');
        if (!selParent) return;
        const PARENT_TIPO = { task: 'userstory', userstory: 'feature', feature: 'epic', epic: null };
        const parentTipo = PARENT_TIPO[tipo];
        selParent.innerHTML = '<option value="">Sem pai</option>';

        if (!parentTipo) {
            selParent.disabled = true;
            document.getElementById('tarefaParentId').value = '';
            return;
        }

        const allItems = [...(this.kanbanTarefas || []), ...(this.backlogItems || [])];
        const potentials = allItems.filter(i => i.tipo === parentTipo);
        potentials.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.titulo;
            selParent.appendChild(opt);
        });
        selParent.disabled = potentials.length === 0;

        const currentParentId = forceParentId || document.getElementById('tarefaParentId').value;
        if (currentParentId) {
            selParent.value = currentParentId;
            document.getElementById('tarefaParentId').value = selParent.value;
        }

        // Sync hidden field on change
        selParent.onchange = () => {
            document.getElementById('tarefaParentId').value = selParent.value;
        };
    },

    // ─── Comentários ───
    async carregarComentarios(tarefaId) {
        const lista = document.getElementById('listaComentarios');
        if (!lista) return;
        lista.innerHTML = '<p class="text-xs text-neutral-500">Carregando...</p>';
        try {
            const resp = await fetch(`${this.apiBaseUrl}/tarefas/${tarefaId}/comentarios`, {
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            const comentarios = await resp.json();
            if (!comentarios.length) {
                lista.innerHTML = '<p class="text-xs text-neutral-500 italic">Nenhum comentário ainda.</p>';
                return;
            }
            lista.innerHTML = comentarios.map(c => {
                const data = new Date(c.dataCriacao).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
                const isAuthor = this.usuario && (c.usuarioId == this.usuario.id || this.usuario.role === 'admin');
                return `
                <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:10px 12px;border:1px solid rgba(255,255,255,0.06);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:0.8rem;font-weight:600;color:#f97316;">${this.escapeHtml(c.autorNome || 'Usuário')}</span>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:0.7rem;color:#64748b;">${data}</span>
                            ${isAuthor ? `<button type="button" onclick="controleHoras.excluirComentario('${c.id}')" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:0.75rem;padding:0;"><i class="bi bi-trash"></i></button>` : ''}
                        </div>
                    </div>
                    <p style="font-size:0.875rem;color:#cbd5e1;margin:0;white-space:pre-wrap;">${this.escapeHtml(c.texto)}</p>
                </div>`;
            }).join('');
        } catch(e) {
            lista.innerHTML = '<p class="text-xs text-red-400">Erro ao carregar comentários.</p>';
        }
    },

    async adicionarComentario() {
        const tarefaId = document.getElementById('tarefaId').value;
        const texto = document.getElementById('novoComentarioTexto').value.trim();
        if (!tarefaId || !texto) { this.mostrarToast('Digite um comentário.', 'error'); return; }
        try {
            await fetch(`${this.apiBaseUrl}/tarefas/${tarefaId}/comentarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                body: JSON.stringify({ texto })
            });
            document.getElementById('novoComentarioTexto').value = '';
            await this.carregarComentarios(tarefaId);
        } catch(e) {
            this.mostrarToast('Erro ao comentar.', 'error');
        }
    },

    async excluirComentario(comentarioId) {
        const tarefaId = document.getElementById('tarefaId').value;
        const ok = await Dialog.confirm({
            title: 'Excluir Comentário',
            message: 'Deseja remover este comentário?',
            type: 'danger',
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });
        if (!ok) return;
        try {
            await fetch(`${this.apiBaseUrl}/comentarios/${comentarioId}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            await this.carregarComentarios(tarefaId);
        } catch(e) {
            this.mostrarToast('Erro ao excluir comentário.', 'error');
        }
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
