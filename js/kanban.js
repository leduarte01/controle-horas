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
    currentKanbanView: 'board',
    backlogItems: [],
    backlogExpandedNodes: null,

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
            if (this.currentKanbanView === 'board' && this.kanbanProjetoAtual) {
                await this.carregarKanban(this.kanbanProjetoAtual.id, null);
            }
            this._updateButtonStates();
            return;
        }

        this.kanbanAtividadeAtual = this.kanbanAtividades.find(a => a.id === atividadeId);
        this._updateButtonStates();
        if (this.currentKanbanView === 'board') {
            await this.carregarKanban(this.kanbanProjetoAtual.id, atividadeId);
        }
    },

    _resetProjetoSelect() {
        const sel = document.getElementById('kanbanProjetoSelect');
        sel.innerHTML = '<option value="">Selecione um projeto</option>';
        sel.disabled = true;
        this.kanbanProjetoAtual = null;
    },

    _resetAtividadeSelect() {
        const sel = document.getElementById('kanbanAtividadeSelect');
        sel.innerHTML = '<option value="">Todas as atividades</option>';
        sel.disabled = true;
        this.kanbanAtividadeAtual = null;
        this.kanbanAtividades = [];
    },

    _resetKanbanBoard() {
        const kb = document.getElementById('kanbanBoard');
        if (kb) kb.innerHTML = '<p class="text-neutral-500 text-center py-16 text-sm">Selecione um cliente e projeto para visualizar o Board.</p>';
        const bt = document.getElementById('backlogTree');
        if (bt) bt.innerHTML = '<p class="text-neutral-500 text-center py-16 text-sm">Selecione um cliente e projeto para visualizar o Backlog.</p>';
    },

    _updateButtonStates() {
        const hasProjeto = !!this.kanbanProjetoAtual;
        const isBoardView = this.currentKanbanView === 'board';
        document.getElementById('btnNovaAtividade').disabled = !hasProjeto;

        const btnNovoEpico = document.getElementById('btnNovoEpico');
        if (btnNovoEpico) {
            btnNovoEpico.disabled = !hasProjeto;
            btnNovoEpico.style.display = isBoardView ? 'none' : 'inline-flex';
        }
        const btnEditarColunas = document.getElementById('btnEditarColunas');
        if (btnEditarColunas) {
            btnEditarColunas.disabled = !hasProjeto;
            btnEditarColunas.style.display = isBoardView ? 'inline-flex' : 'none';
        }
        const atividadeWrap = document.getElementById('kanbanAtividadeWrap');
        if (atividadeWrap) {
            atividadeWrap.style.display = isBoardView ? '' : 'none';
        }
    },

    // ─── Carregar Kanban de um projeto + atividade (atividade opcional) ───
    async carregarKanban(projetoId, atividadeId) {
        if (!projetoId) {
            this._resetKanbanBoard();
            return;
        }
        this.kanbanProjetoAtual = this.projetos.find(p => p.id === projetoId);
        if (!this.kanbanProjetoAtual) return;

        try {
            const url = atividadeId
                ? `${this.apiBaseUrl}/tarefas/${projetoId}?atividadeId=${atividadeId}`
                : `${this.apiBaseUrl}/tarefas/${projetoId}`;
            const resp = await fetch(url, {
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
        const projetoId = this.kanbanProjetoAtual?.id || null;

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
        let colunas = this.kanbanProjetoAtual?.colunasKanban;
        if (typeof colunas === 'string') { try { colunas = JSON.parse(colunas); } catch(e) { colunas = []; }}
        if (!Array.isArray(colunas)) colunas = ['Backlog', 'A Fazer', 'Em Andamento', 'Revisão', 'Concluído'];
        colunas.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c; opt.textContent = c;
            selColuna.appendChild(opt);
        });
        if (tarefaId) {
            const tCol = this.kanbanTarefas.find(x => x.id === tarefaId)
                       || (this.backlogItems || []).find(x => x.id === tarefaId);
            if (tCol) selColuna.value = tCol.coluna || 'Backlog';
        } else {
            selColuna.value = colunaDefault || 'Backlog';
        }

        // Popula select de atividade
        const selAtividadeModal = document.getElementById('tarefaAtividadeId');
        if (selAtividadeModal) {
            selAtividadeModal.innerHTML = '<option value="">Sem atividade</option>';
            (this.kanbanAtividades || []).forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id;
                opt.textContent = a.nome;
                selAtividadeModal.appendChild(opt);
            });
            if (tarefaId) {
                const tAtiv = this.kanbanTarefas.find(x => x.id === tarefaId)
                           || (this.backlogItems || []).find(x => x.id === tarefaId);
                selAtividadeModal.value = tAtiv?.atividadeId || '';
            } else {
                selAtividadeModal.value = this.kanbanAtividadeAtual?.id || '';
            }
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

        const projetoId = this.kanbanProjetoAtual?.id;
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
            atividadeId: document.getElementById('tarefaAtividadeId')?.value || null,
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
            if (this.kanbanProjetoAtual) {
                if (this.currentKanbanView === 'board') {
                    await this.carregarKanban(this.kanbanProjetoAtual.id, this.kanbanAtividadeAtual?.id || null);
                } else {
                    await this._carregarBacklogKanban();
                }
            }
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
            if (this.currentKanbanView === 'board') {
                await this.carregarKanban(this.kanbanProjetoAtual.id, this.kanbanAtividadeAtual?.id || null);
            } else {
                await this._carregarBacklogKanban();
            }
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
    },

    // ─── View Switcher: Board ↔ Backlog ───
    switchKanbanView(view) {
        this.currentKanbanView = view;
        const boardDiv   = document.getElementById('kanbanBoard');
        const backlogDiv = document.getElementById('backlogTree');
        const tabBoard   = document.getElementById('tabBoard');
        const tabBacklog = document.getElementById('tabBacklog');

        if (boardDiv)   boardDiv.style.display  = view === 'board'   ? '' : 'none';
        if (backlogDiv) backlogDiv.style.display = view === 'backlog' ? '' : 'none';

        if (tabBoard) {
            tabBoard.style.borderBottom = view === 'board' ? '2px solid #f97316' : '2px solid transparent';
            tabBoard.style.color        = view === 'board' ? '#f97316' : 'rgba(255,255,255,0.4)';
        }
        if (tabBacklog) {
            tabBacklog.style.borderBottom = view === 'backlog' ? '2px solid #f97316' : '2px solid transparent';
            tabBacklog.style.color        = view === 'backlog' ? '#f97316' : 'rgba(255,255,255,0.4)';
        }

        this._updateButtonStates();

        if (this.kanbanProjetoAtual) {
            if (view === 'backlog') {
                this._carregarBacklogKanban();
            } else {
                this.carregarKanban(this.kanbanProjetoAtual.id, this.kanbanAtividadeAtual?.id || null);
            }
        }
    },

    // ─── Backlog (merged from backlog.js) ───
    _initBacklogState() {
        if (!this.backlogExpandedNodes) {
            this.backlogExpandedNodes = new Set();
        }
    },

    async _carregarBacklogKanban() {
        this._initBacklogState();
        const projetoId = this.kanbanProjetoAtual?.id;
        if (!projetoId) return;

        const bt = document.getElementById('backlogTree');
        if (bt) bt.innerHTML = '<p class="text-neutral-500 text-center py-10 text-sm"><i class="bi bi-arrow-repeat mr-2"></i>Carregando backlog...</p>';
        this.backlogItems = [];
        this.backlogExpandedNodes.clear();

        try {
            const resp = await fetch(`${this.apiBaseUrl}/tarefas/${projetoId}`, {
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            this.backlogItems = await resp.json();
            this.backlogItems.filter(i => i.tipo === 'epic').forEach(i => this.backlogExpandedNodes.add(i.id));
        } catch (e) {
            this.backlogItems = [];
        }
        this.renderizarBacklog();
    },

    construirArvore(items) {
        const map = {};
        const roots = [];
        items.forEach(item => { map[item.id] = { ...item, children: [] }; });
        items.forEach(item => {
            if (item.parentId && map[item.parentId]) {
                map[item.parentId].children.push(map[item.id]);
            } else {
                roots.push(map[item.id]);
            }
        });
        const tipoOrdem = { epic: 0, feature: 1, userstory: 2, task: 3 };
        const sortNodes = nodes => {
            nodes.sort((a, b) => (tipoOrdem[a.tipo] || 3) - (tipoOrdem[b.tipo] || 3) || (a.titulo || '').localeCompare(b.titulo || ''));
            nodes.forEach(n => sortNodes(n.children));
        };
        sortNodes(roots);
        return roots;
    },

    renderizarBacklog() {
        this._initBacklogState();
        const container = document.getElementById('backlogTree');
        if (!container) return;

        if (!this.backlogItems.length) {
            container.innerHTML = `
                <div class="glass-card p-10 text-center">
                    <i class="bi bi-inbox text-neutral-600" style="font-size:2.5rem;display:block;margin-bottom:12px;"></i>
                    <p class="text-neutral-400 text-sm mb-4">Nenhum item no backlog.</p>
                    <button type="button" class="btn-primary" onclick="controleHoras.criarEpico()">
                        <i class="bi bi-plus-lg mr-1"></i>Criar primeiro Épico
                    </button>
                </div>`;
            return;
        }

        const arvore = this.construirArvore(this.backlogItems);
        const linhas = [];
        const renderNos = (nos, nivel) => {
            nos.forEach(no => {
                linhas.push(this.renderizarNoBacklog(no, nivel));
                if (this.backlogExpandedNodes.has(no.id) && no.children.length) {
                    renderNos(no.children, nivel + 1);
                }
            });
        };
        renderNos(arvore, 0);

        container.innerHTML = `
            <div class="glass-card" style="overflow:hidden;">
                <div style="display:grid;grid-template-columns:1fr auto auto auto;gap:0;border-bottom:1px solid rgba(255,255,255,0.06);padding:8px 16px;" class="text-xs text-neutral-500 font-semibold uppercase tracking-wider">
                    <span>Item</span><span class="text-center px-3">Status</span><span class="text-center px-3">Estimativa</span><span></span>
                </div>
                ${linhas.join('')}
            </div>`;
    },

    renderizarNoBacklog(item, nivel) {
        this._initBacklogState();
        const TIPO_CONFIG = {
            epic:      { icon: '👑', label: 'Épico',      color: '#f97316', childTipo: 'feature',   childLabel: 'Feature' },
            feature:   { icon: '🎯', label: 'Feature',    color: '#3b82f6', childTipo: 'userstory',  childLabel: 'User Story' },
            userstory: { icon: '📖', label: 'User Story', color: '#a855f7', childTipo: 'task',       childLabel: 'Task' },
            task:      { icon: '✅', label: 'Task',       color: '#22c55e', childTipo: null,         childLabel: null }
        };
        const STATUS_COLORS = {
            'Planejado':     'rgba(100,116,139,0.25)',
            'Em Andamento':  'rgba(249,115,22,0.25)',
            'Concluído':     'rgba(34,197,94,0.25)',
        };
        const config = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.task;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = this.backlogExpandedNodes.has(item.id);
        const indent = nivel * 28;
        const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS['Planejado'];
        const statusText = item.status || 'Planejado';

        let responsavelHtml = '';
        if (item.responsavelId && this.equipe) {
            const resp = this.equipe.find(u => u.id == item.responsavelId);
            if (resp) {
                const iniciais = (resp.nome || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                responsavelHtml = `<span title="${this.escapeHtml(resp.nome)}" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(249,115,22,0.2);color:#f97316;font-size:10px;font-weight:700;margin-left:4px;">${iniciais}</span>`;
            }
        }

        const estimativaHtml = item.estimativaHoras
            ? `<span style="font-size:0.75rem;color:#94a3b8;">${item.estimativaHoras}h</span>`
            : '<span style="color:rgba(255,255,255,0.15);font-size:0.75rem;">—</span>';

        const chevron = hasChildren
            ? `<button type="button" onclick="controleHoras.toggleNoBacklog('${item.id}')" style="background:none;border:none;cursor:pointer;color:#94a3b8;padding:0 4px;font-size:0.75rem;transition:.15s;">
                    <i class="bi bi-chevron-${isExpanded ? 'down' : 'right'}"></i>
               </button>`
            : '<span style="display:inline-block;width:24px;"></span>';

        const addFilhoBtn = config.childTipo
            ? `<button type="button" onclick="controleHoras.adicionarFilhoBacklog('${item.id}','${config.childTipo}')" title="Adicionar ${config.childLabel}" style="background:none;border:none;cursor:pointer;color:#94a3b8;padding:4px 6px;border-radius:4px;font-size:0.75rem;" class="hover:text-orange-400">
                    <i class="bi bi-plus-lg"></i> ${config.childLabel}
               </button>`
            : '';

        return `
        <div style="display:grid;grid-template-columns:1fr auto auto auto;align-items:center;gap:0;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,0.04);background:rgba(255,255,255,${nivel % 2 === 0 ? '0' : '0.015'});">
            <div style="display:flex;align-items:center;padding-left:${indent}px;gap:4px;min-width:0;">
                ${chevron}
                <span style="font-size:0.85rem;margin-right:4px;">${config.icon}</span>
                <span style="font-size:0.7rem;padding:1px 6px;border-radius:4px;background:rgba(${config.color.replace('#','').match(/.{2}/g).map(h=>parseInt(h,16)).join(',')},0.15);color:${config.color};margin-right:6px;white-space:nowrap;">${config.label}</span>
                <button type="button" onclick="controleHoras.editarTarefaById('${item.id}')" style="background:none;border:none;cursor:pointer;color:#e2e8f0;text-align:left;font-size:0.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:400px;" class="hover:text-orange-400" title="${this.escapeHtml(item.titulo)}">
                    ${this.escapeHtml(item.titulo)}
                </button>
                ${responsavelHtml}
            </div>
            <div class="px-3 text-center">
                <select onchange="controleHoras.atualizarStatusBacklog('${item.id}', this.value)" style="background:${statusColor};border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#e2e8f0;font-size:0.72rem;padding:2px 8px;cursor:pointer;">
                    <option value="Planejado"    ${statusText==='Planejado'   ?'selected':''}>Planejado</option>
                    <option value="Em Andamento" ${statusText==='Em Andamento'?'selected':''}>Em Andamento</option>
                    <option value="Concluído"    ${statusText==='Concluído'   ?'selected':''}>Concluído</option>
                </select>
            </div>
            <div class="px-3 text-center">${estimativaHtml}</div>
            <div style="display:flex;align-items:center;gap:4px;">${addFilhoBtn}</div>
        </div>`;
    },

    toggleNoBacklog(id) {
        this._initBacklogState();
        if (this.backlogExpandedNodes.has(id)) {
            this.backlogExpandedNodes.delete(id);
        } else {
            this.backlogExpandedNodes.add(id);
        }
        this.renderizarBacklog();
    },

    criarEpico() {
        if (!this.kanbanProjetoAtual) return;
        this.abrirModalTarefa(null, 'Backlog', 'epic', null);
    },

    adicionarFilhoBacklog(parentId, tipoFilho) {
        if (!this.kanbanProjetoAtual) return;
        this.abrirModalTarefa(null, 'Backlog', tipoFilho, parentId);
    },

    editarTarefaById(id) {
        this.abrirModalTarefa(id, null, null, null);
    },

    async atualizarStatusBacklog(id, novoStatus) {
        const item = this.backlogItems.find(i => i.id === id);
        if (!item) return;
        try {
            await fetch(`${this.apiBaseUrl}/tarefas/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                body: JSON.stringify({ ...item, status: novoStatus })
            });
            item.status = novoStatus;
            this.renderizarBacklog();
        } catch (e) {
            this.mostrarToast('Erro ao atualizar status.', 'error');
        }
    },

    async _refreshBacklogIfVisible() {
        if (this.currentKanbanView === 'backlog' && this.kanbanProjetoAtual) {
            await this._carregarBacklogKanban();
        }
    }
});
