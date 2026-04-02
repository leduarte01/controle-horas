/**
 * js/kanban.js — Kanban board engine mixed into ControleHoras
 * Board always visible, cross-project, filtered via filters bar
 * Drag & Drop HTML5 nativo + CRUD de tarefas + Backlog tree
 */

const DEFAULT_COLUNAS = ['Backlog', 'A Fazer', 'Em Andamento', 'Revisão', 'Concluído'];

Object.assign(ControleHoras.prototype, {

    kanbanProjetoAtual: null,
    kanbanAtividadeAtual: null,
    kanbanAtividades: [],
    kanbanTarefas: [],
    currentKanbanView: 'board',
    backlogItems: [],
    backlogExpandedNodes: null,
    kanbanFiltros: { clienteId: '', projetoId: '', epicoId: '', responsavelId: '', prioridade: '', search: '' },
    _searchDebounceTimer: null,

    // ─── Inicialização ───
    async inicializarKanban() {
        this._renderFiltrosBar();
        await this.carregarKanbanBoard();
    },

    // Popula os selects estáticos da barra de filtros
    _renderFiltrosBar() {
        const selCliente = document.getElementById('kanbanFiltroCliente');
        if (selCliente) {
            const prev = selCliente.value;
            selCliente.innerHTML = '<option value="">Todos</option>';
            (this.clientes || []).forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id; opt.textContent = c.nome;
                selCliente.appendChild(opt);
            });
            if (prev) selCliente.value = prev;
        }
        const selProj = document.getElementById('kanbanFiltroProjeto');
        if (selProj) {
            const prev = selProj.value;
            selProj.innerHTML = '<option value="">Todos</option>';
            (this.projetos || []).forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id; opt.textContent = p.nome;
                selProj.appendChild(opt);
            });
            if (prev) selProj.value = prev;
        }
        const selResp = document.getElementById('kanbanFiltroResponsavel');
        if (selResp) {
            selResp.innerHTML = '<option value="">Todos</option>';
            (this.equipe || []).forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id; opt.textContent = u.nome;
                selResp.appendChild(opt);
            });
        }
    },

    // ─── Handler de filtros ───
    async onFiltroChange(campo, valor) {
        this.kanbanFiltros[campo] = valor;

        // Cascata: mudar cliente → reset projeto/épico, repopular projetos
        if (campo === 'clienteId') {
            this.kanbanFiltros.projetoId = '';
            this.kanbanFiltros.epicoId = '';
            this.kanbanProjetoAtual = null;
            const selProj = document.getElementById('kanbanFiltroProjeto');
            if (selProj) {
                selProj.innerHTML = '<option value="">Todos</option>';
                const lista = valor ? (this.projetos || []).filter(p => p.clienteId === valor) : (this.projetos || []);
                lista.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id; opt.textContent = p.nome;
                    selProj.appendChild(opt);
                });
                selProj.value = '';
            }
            const selEp = document.getElementById('kanbanFiltroEpico');
            if (selEp) { selEp.innerHTML = '<option value="">Todos</option>'; selEp.value = ''; }
        }

        // Cascata: mudar projeto → carregar épicos do projeto
        if (campo === 'projetoId') {
            this.kanbanFiltros.epicoId = '';
            this.kanbanProjetoAtual = valor ? ((this.projetos || []).find(p => p.id === valor) || null) : null;
            const selEp = document.getElementById('kanbanFiltroEpico');
            if (selEp) {
                selEp.innerHTML = '<option value="">Todos</option>';
                if (valor) {
                    try {
                        const resp = await fetch(`${this.apiBaseUrl}/epicos/${valor}`, {
                            headers: { 'Authorization': 'Bearer ' + this.token }
                        });
                        const epicos = await resp.json();
                        epicos.forEach(e => {
                            const opt = document.createElement('option');
                            opt.value = e.id; opt.textContent = e.titulo;
                            selEp.appendChild(opt);
                        });
                    } catch (_) {}
                }
                selEp.value = '';
            }
        }

        this._atualizarBtnEditarColunas();

        if (this.currentKanbanView === 'board') {
            await this.carregarKanbanBoard();
        } else {
            if (this.kanbanProjetoAtual) {
                await this._carregarBacklogKanban();
            } else {
                const bt = document.getElementById('backlogTree');
                if (bt) bt.innerHTML = '<div class="glass-card p-10 text-center"><p class="text-neutral-400 text-sm">Selecione um projeto no filtro acima para ver o Backlog.</p></div>';
            }
        }
    },

    // Busca textual com debounce de 300ms
    onFiltroSearch(value) {
        clearTimeout(this._searchDebounceTimer);
        this._searchDebounceTimer = setTimeout(async () => {
            this.kanbanFiltros.search = value;
            if (this.currentKanbanView === 'board') await this.carregarKanbanBoard();
        }, 300);
    },

    _atualizarBtnEditarColunas() {
        const btn = document.getElementById('btnEditarColunas');
        if (btn) btn.disabled = !this.kanbanProjetoAtual;
        const btnEpico = document.getElementById('btnNovoEpico');
        if (btnEpico) btnEpico.style.display = (this.currentKanbanView === 'backlog' && this.kanbanProjetoAtual) ? 'inline-flex' : 'none';
    },

    // ─── Carregar board cross-project ───
    async carregarKanbanBoard() {
        const f = this.kanbanFiltros;
        const params = new URLSearchParams();
        if (f.clienteId)     params.append('clienteId', f.clienteId);
        if (f.projetoId)     params.append('projetoId', f.projetoId);
        if (f.epicoId)       params.append('epicoId', f.epicoId);
        if (f.responsavelId) params.append('responsavelId', f.responsavelId);
        if (f.prioridade)    params.append('prioridade', f.prioridade);
        if (f.search)        params.append('search', f.search);

        const board = document.getElementById('kanbanBoard');
        if (board) board.innerHTML = '<p class="text-neutral-500 text-center py-16 text-sm w-full"><i class="bi bi-arrow-repeat mr-2"></i>Carregando...</p>';

        try {
            const resp = await fetch(`${this.apiBaseUrl}/tarefas-board?${params}`, {
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            this.kanbanTarefas = await resp.json();
        } catch (_) {
            this.kanbanTarefas = [];
        }
        this.renderKanban();
    },

    // ─── Renderiza o quadro ───
    renderKanban() {
        const board = document.getElementById('kanbanBoard');
        if (!board) return;

        let colunas = this.kanbanProjetoAtual?.colunasKanban;
        if (typeof colunas === 'string') {
            try { colunas = JSON.parse(colunas); } catch (e) { colunas = null; }
        }
        if (!Array.isArray(colunas) || colunas.length === 0) {
            colunas = DEFAULT_COLUNAS;
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
                    <button class="kanban-add-btn" onclick="controleHoras.abrirModalCriarTarefa('${this.escapeHtml(col)}')" title="Adicionar tarefa">
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

        // #número
        const numHtml = tarefa.numero
            ? `<span class="kanban-card-number">#${tarefa.numero}</span>`
            : '';

        // Caminho: Projeto / Épico
        const pathParts = [];
        if (tarefa.projetoNome) pathParts.push(this.escapeHtml(tarefa.projetoNome));
        if (tarefa.epicoTitulo) pathParts.push(this.escapeHtml(tarefa.epicoTitulo));
        const pathHtml = pathParts.length
            ? `<div class="kanban-card-path">${pathParts.join(' / ')}</div>`
            : '';

        // Tags como badges coloridos
        let tagsHtml = '';
        if (tarefa.tags) {
            try {
                const tags = typeof tarefa.tags === 'string' ? JSON.parse(tarefa.tags) : tarefa.tags;
                if (Array.isArray(tags) && tags.length) {
                    tagsHtml = `<div class="kanban-card-tags">${tags.map((t, i) => {
                        const hue = (t.charCodeAt(0) * 37 + i * 73) % 360;
                        return `<span class="kanban-tag-badge" style="background:hsla(${hue},60%,55%,0.18);color:hsl(${hue},70%,70%);">${this.escapeHtml(t)}</span>`;
                    }).join('')}</div>`;
                }
            } catch (_) {}
        }

        // Datas
        let datesHtml = '';
        if (tarefa.dataPrevisao || tarefa.dataEntrega) {
            datesHtml = '<div class="kanban-card-dates">';
            if (tarefa.dataPrevisao) {
                const cls = isAtrasado ? 'kanban-badge-atrasado' : '';
                datesHtml += `<span title="Previsão" class="${cls}"><i class="bi bi-calendar-event"></i> ${this.formatarData(tarefa.dataPrevisao)}</span>`;
            }
            if (tarefa.dataEntrega) datesHtml += `<span title="Entregue" class="kanban-badge-entregue"><i class="bi bi-check-circle"></i> ${this.formatarData(tarefa.dataEntrega)}</span>`;
            datesHtml += '</div>';
        }

        // Footer: estimativa + responsável
        let footerHtml = '';
        const parts = [];
        if (tarefa.estimativaHoras) parts.push(`<span style="font-size:0.68rem;color:rgba(255,255,255,0.3);">Est: ${tarefa.estimativaHoras}h</span>`);
        if (tarefa.responsavelNome || (tarefa.responsavelId && this.equipe)) {
            const nome = tarefa.responsavelNome || (this.equipe || []).find(u => u.id == tarefa.responsavelId)?.nome;
            if (nome) {
                const initials = nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                parts.push(`<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:rgba(249,115,22,0.2);color:#f97316;font-size:9px;font-weight:700;" title="${this.escapeHtml(nome)}">${initials}</span>`);
            }
        }
        if (parts.length) footerHtml = `<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:6px;">${parts.join('')}</div>`;

        return `
        <div class="kanban-card${isAtrasado ? ' kanban-card-atrasado' : ''}"
             draggable="true"
             data-id="${tarefa.id}"
             ondragstart="controleHoras.onDragStartKanban(event, '${tarefa.id}')"
             ondragend="this.classList.remove('dragging');"
             onclick="controleHoras.abrirModalTarefa('${tarefa.id}')">
            <div style="display:flex;align-items:baseline;gap:5px;margin-bottom:3px;">
                ${numHtml}
                <span class="kanban-card-title" style="flex:1;">${this.escapeHtml(tarefa.titulo)}</span>
            </div>
            ${pathHtml}
            ${tagsHtml}
            ${datesHtml}
            ${footerHtml}
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

    // ─── Modal de Tarefa (editar / criar via backlog) ───
    abrirModalTarefa(tarefaId, colunaDefault, tipoDefault, parentIdDefault) {
        this.atualizarSelectResponsavelKanban();

        const modal = document.getElementById('modalTarefa');
        const form  = document.getElementById('formTarefa');
        form.reset();
        this._setTagsUI([]);

        const fp = window.fpInstances || {};
        const setDate = (id, val) => {
            if (fp[id]) { fp[id].setDate(val || '', true); }
            else { const el = document.getElementById(id); if (el) el.value = val || ''; }
        };

        let projetoId = this.kanbanProjetoAtual?.id || null;

        if (tarefaId) {
            const t = this.kanbanTarefas.find(x => x.id === tarefaId)
                   || (this.backlogItems || []).find(x => x.id === tarefaId);
            if (!t) return;
            projetoId = t.projetoId || projetoId;
            document.getElementById('tarefaId').value              = t.id;
            document.getElementById('tarefaProjetoId').value       = projetoId || '';
            document.getElementById('tarefaTipo').value            = t.tipo || 'task';
            document.getElementById('tarefaParentId').value        = t.parentId || '';
            document.getElementById('tarefaTitulo').value          = t.titulo;
            document.getElementById('tarefaDescricao').value       = t.descricao || '';
            document.getElementById('tarefaResponsavel').value     = t.responsavelId || '';
            document.getElementById('tarefaPrioridade').value      = t.prioridade || 3;
            document.getElementById('tarefaEstimativaHoras').value = t.estimativaHoras || '';
            this._setTagsUI(t.tags ? (typeof t.tags === 'string' ? JSON.parse(t.tags) : t.tags) : []);
            setDate('tarefaDataInicio',   t.dataInicio);
            setDate('tarefaDataPrevisao', t.dataPrevisao);
            setDate('tarefaDataEntrega',  t.dataEntrega);
            document.getElementById('modalTarefaTitulo').textContent = 'Editar Tarefa';
            document.getElementById('btnExcluirTarefa').style.display = 'inline-flex';
            document.getElementById('comentariosSection').style.display = 'block';
            document.getElementById('novoComentarioTexto').value = '';
            this.carregarComentarios(t.id);
        } else {
            document.getElementById('tarefaId').value              = '';
            document.getElementById('tarefaProjetoId').value       = projetoId || '';
            document.getElementById('tarefaTipo').value            = tipoDefault || 'task';
            document.getElementById('tarefaParentId').value        = parentIdDefault || '';
            document.getElementById('tarefaResponsavel').value     = '';
            document.getElementById('tarefaPrioridade').value      = 3;
            document.getElementById('tarefaEstimativaHoras').value = '';
            setDate('tarefaDataInicio',   '');
            setDate('tarefaDataPrevisao', '');
            setDate('tarefaDataEntrega',  '');
            document.getElementById('modalTarefaTitulo').textContent = 'Nova Tarefa';
            document.getElementById('btnExcluirTarefa').style.display = 'none';
            document.getElementById('comentariosSection').style.display = 'none';
        }

        // Colunas do projeto da tarefa (ou projeto do filtro, ou default)
        const selColuna = document.getElementById('tarefaColuna');
        selColuna.innerHTML = '';
        const proj = (this.projetos || []).find(p => p.id === projetoId);
        let colunas = proj?.colunasKanban;
        if (typeof colunas === 'string') { try { colunas = JSON.parse(colunas); } catch (_) { colunas = null; } }
        if (!Array.isArray(colunas) || colunas.length === 0) colunas = DEFAULT_COLUNAS;
        colunas.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c; opt.textContent = c;
            selColuna.appendChild(opt);
        });
        const colVal = tarefaId
            ? (this.kanbanTarefas.find(x => x.id === tarefaId) || (this.backlogItems || []).find(x => x.id === tarefaId))?.coluna
            : (colunaDefault || 'Backlog');
        selColuna.value = colVal || 'Backlog';

        // Clear atividade select (kept in HTML for compatibility with lancamentos)
        const selAtiv = document.getElementById('tarefaAtividadeId');
        if (selAtiv) selAtiv.innerHTML = '<option value="">Sem atividade</option>';

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

        const projetoId = document.getElementById('tarefaProjetoId').value || this.kanbanProjetoAtual?.id;
        if (!projetoId) { this.mostrarToast('Tarefa sem projeto associado.', 'error'); return; }

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
            atividadeId: null,
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
            if (this.currentKanbanView === 'board') {
                await this.carregarKanbanBoard();
            } else {
                await this._carregarBacklogKanban();
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
            message: 'Tem certeza que deseja excluir esta tarefa?',
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
                await this.carregarKanbanBoard();
            } else {
                await this._carregarBacklogKanban();
            }
        } catch (e) {
            this.mostrarToast('Erro ao excluir tarefa.', 'error');
        }
    },

    // ─── Modal Criar Tarefa ───
    abrirModalCriarTarefa(colunaDefault) {
        const modal = document.getElementById('modalCriarTarefa');
        if (!modal) return;

        // Populate clientes select
        const selCliente = document.getElementById('criarTarefaCliente');
        selCliente.innerHTML = '<option value="">Selecione...</option>';
        (this.clientes || []).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id; opt.textContent = c.nome;
            selCliente.appendChild(opt);
        });
        selCliente.value = '';

        document.getElementById('criarTarefaProjeto').value     = '';
        document.getElementById('criarTarefaProjeto').innerHTML = '<option value="">Selecione um cliente primeiro</option>';
        document.getElementById('criarTarefaEpico').value       = '';
        document.getElementById('criarTarefaEpico').innerHTML   = '<option value="">Sem épico</option>';
        document.getElementById('criarTarefaTitulo').value      = '';
        document.getElementById('criarTarefaDescricao').value   = '';
        document.getElementById('criarTarefaPrioridade').value  = '3';
        document.getElementById('criarTarefaColuna').innerHTML  = DEFAULT_COLUNAS.map(c => `<option value="${c}">${c}</option>`).join('');
        document.getElementById('criarTarefaColuna').value      = colunaDefault || 'A Fazer';
        document.getElementById('criarTarefaEstimativa').value  = '';

        // Populate responsável for create modal
        const selResp = document.getElementById('criarTarefaResponsavel');
        if (selResp) {
            selResp.innerHTML = '<option value="">Nenhum</option>';
            (this.equipe || []).forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id; opt.textContent = u.nome;
                selResp.appendChild(opt);
            });
        }
        this.atualizarSelectResponsavelKanban();

        // Pre-fill from current filters
        const fCliente = document.getElementById('kanbanFiltroCliente');
        const fProjeto = document.getElementById('kanbanFiltroProjeto');
        if (fCliente?.value) {
            document.getElementById('criarTarefaCliente').value = fCliente.value;
            this.onCriarTarefaClienteChange(fCliente.value);
        }
        if (fProjeto?.value) {
            document.getElementById('criarTarefaProjeto').value = fProjeto.value;
            this.onCriarTarefaProjetoChange(fProjeto.value);
        }

        modal.classList.add('active');
    },

    fecharModalCriarTarefa() {
        const modal = document.getElementById('modalCriarTarefa');
        if (modal) modal.classList.remove('active');
    },

    onCriarTarefaClienteChange(clienteId) {
        const selProjeto = document.getElementById('criarTarefaProjeto');
        selProjeto.innerHTML = '<option value="">Selecione um projeto</option>';
        const projetos = (this.projetos || []).filter(p => !clienteId || String(p.clienteId) === String(clienteId));
        projetos.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id; opt.textContent = p.nome;
            selProjeto.appendChild(opt);
        });
        // Reset épico e desabilita botão
        document.getElementById('criarTarefaEpico').innerHTML = '<option value="">Sem épico</option>';
        document.getElementById('criarTarefaEpico').disabled = true;
        const btnEpico = document.getElementById('btnCriarEpicoInline');
        if (btnEpico) btnEpico.disabled = true;
        // Reset feature
        document.getElementById('criarTarefaFeature').innerHTML = '<option value="">Selecione o épico</option>';
        document.getElementById('criarTarefaFeature').disabled = true;
        const btnFeature = document.getElementById('btnCriarFeatureInline');
        if (btnFeature) btnFeature.disabled = true;
    },

    async onCriarTarefaProjetoChange(projetoId) {
        const selEpico  = document.getElementById('criarTarefaEpico');
        const selColuna = document.getElementById('criarTarefaColuna');
        const btnEpico  = document.getElementById('btnCriarEpicoInline');
        selEpico.innerHTML = '<option value="">Sem épico</option>';
        selEpico.disabled = !projetoId;
        if (btnEpico) btnEpico.disabled = !projetoId;
        // Reset feature
        document.getElementById('criarTarefaFeature').innerHTML = '<option value="">Selecione o épico</option>';
        document.getElementById('criarTarefaFeature').disabled = true;
        const btnFeature = document.getElementById('btnCriarFeatureInline');
        if (btnFeature) btnFeature.disabled = true;

        if (!projetoId) return;

        // Load epics
        try {
            const r = await fetch(`${this.apiBaseUrl}/epicos/${projetoId}`, {
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            const epicos = await r.json();
            epicos.forEach(ep => {
                const opt = document.createElement('option');
                opt.value = ep.id; opt.textContent = ep.titulo;
                selEpico.appendChild(opt);
            });
        } catch (_) {}

        // Update colunas from project
        const proj = (this.projetos || []).find(p => String(p.id) === String(projetoId));
        let colunas = proj?.colunasKanban;
        if (typeof colunas === 'string') { try { colunas = JSON.parse(colunas); } catch (_) { colunas = null; } }
        if (!Array.isArray(colunas) || colunas.length === 0) colunas = DEFAULT_COLUNAS;
        selColuna.innerHTML = colunas.map(c => `<option value="${c}">${c}</option>`).join('');
        selColuna.value = 'A Fazer';
    },

    async onCriarTarefaEpicoChange(epicoId) {
        const selFeature = document.getElementById('criarTarefaFeature');
        const btnFeature = document.getElementById('btnCriarFeatureInline');
        selFeature.innerHTML = '<option value="">Sem feature</option>';
        selFeature.disabled = !epicoId;
        if (btnFeature) btnFeature.disabled = !epicoId;
        if (!epicoId) return;

        try {
            const r = await fetch(`${this.apiBaseUrl}/features/${epicoId}`, {
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            const features = await r.json();
            features.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id; opt.textContent = f.titulo;
                selFeature.appendChild(opt);
            });
        } catch (_) {}
    },

    async criarEpicoInline() {
        const projetoId = document.getElementById('criarTarefaProjeto').value;
        if (!projetoId) { this.mostrarToast('Selecione um projeto primeiro.', 'error'); return; }
        const titulo = await Dialog.prompt({ title: 'Novo Épico', placeholder: 'Ex: Sprint 1, MVP, Fase 2…', confirmText: 'Criar Épico' });
        if (!titulo) return;
        try {
            const r = await fetch(`${this.apiBaseUrl}/tarefas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                body: JSON.stringify({ id: this.gerarId(), projetoId, titulo: titulo.trim(), tipo: 'epic', coluna: 'Backlog', prioridade: 3, ordem: 0 })
            });
            if (!r.ok) throw new Error();
            const criado = await r.json();
            const selEpico = document.getElementById('criarTarefaEpico');
            const opt = document.createElement('option');
            opt.value = criado.id; opt.textContent = titulo.trim();
            selEpico.appendChild(opt);
            selEpico.value = opt.value;
            // Reset feature after new epic
            await this.onCriarTarefaEpicoChange(criado.id);
            this.mostrarToast('Épico criado!', 'success');
        } catch (_) {
            this.mostrarToast('Erro ao criar épico.', 'error');
        }
    },

    async criarFeatureInline() {
        const epicoId   = document.getElementById('criarTarefaEpico').value;
        const projetoId = document.getElementById('criarTarefaProjeto').value;
        if (!epicoId) { this.mostrarToast('Selecione um épico primeiro.', 'error'); return; }
        const titulo = await Dialog.prompt({ title: 'Nova Feature', placeholder: 'Ex: Autenticação, Relatórios…', confirmText: 'Criar Feature' });
        if (!titulo) return;
        try {
            const r = await fetch(`${this.apiBaseUrl}/tarefas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                body: JSON.stringify({ id: this.gerarId(), projetoId, parentId: epicoId, titulo, tipo: 'feature', coluna: 'Backlog', prioridade: 3, ordem: 0 })
            });
            if (!r.ok) throw new Error();
            const criado = await r.json();
            const sel = document.getElementById('criarTarefaFeature');
            const opt = document.createElement('option');
            opt.value = criado.id; opt.textContent = titulo;
            sel.appendChild(opt);
            sel.value = opt.value;
            this.mostrarToast('Feature criada!', 'success');
        } catch (_) {
            this.mostrarToast('Erro ao criar feature.', 'error');
        }
    },

    async salvarTarefaNova() {
        const titulo = document.getElementById('criarTarefaTitulo').value.trim();
        if (!titulo) { this.mostrarToast('Informe o título da tarefa.', 'error'); return; }
        const projetoId = document.getElementById('criarTarefaProjeto').value;
        if (!projetoId) { this.mostrarToast('Selecione um projeto.', 'error'); return; }

        const dados = {
            id: this.gerarId(),
            titulo,
            descricao: document.getElementById('criarTarefaDescricao').value.trim(),
            projetoId,
            parentId: document.getElementById('criarTarefaFeature').value
                   || document.getElementById('criarTarefaEpico').value
                   || null,
            tipo: 'task',
            coluna: document.getElementById('criarTarefaColuna').value || 'A Fazer',
            prioridade: parseInt(document.getElementById('criarTarefaPrioridade').value) || 3,
            responsavelId: document.getElementById('criarTarefaResponsavel').value || null,
            estimativaHoras: parseFloat(document.getElementById('criarTarefaEstimativa').value) || null,
            ordem: 0
        };

        try {
            const r = await fetch(`${this.apiBaseUrl}/tarefas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token },
                body: JSON.stringify(dados)
            });
            if (!r.ok) throw new Error();
            this.fecharModalCriarTarefa();
            this.mostrarToast('Tarefa criada!', 'success');
            await this.carregarKanbanBoard();
        } catch (_) {
            this.mostrarToast('Erro ao criar tarefa.', 'error');
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
        const PARENT_TIPO = { task: 'feature', userstory: 'feature', feature: 'epic', epic: null };
        const allItems = [...(this.kanbanTarefas || []), ...(this.backlogItems || [])];

        const currentParentId = forceParentId || document.getElementById('tarefaParentId').value;

        // Se já existe um pai salvo, usa o tipo real dele para popular o select corretamente
        let parentTipo = PARENT_TIPO[tipo];
        if (currentParentId) {
            const actualParent = allItems.find(i => i.id === currentParentId);
            if (actualParent) parentTipo = actualParent.tipo;
        }

        selParent.innerHTML = '<option value="">Sem pai</option>';

        if (!parentTipo) {
            selParent.disabled = true;
            document.getElementById('tarefaParentId').value = '';
            return;
        }

        const potentials = allItems.filter(i => i.tipo === parentTipo);
        potentials.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.titulo;
            selParent.appendChild(opt);
        });
        selParent.disabled = potentials.length === 0;

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
            this.mostrarToast('Colunas atualizadas!', 'success');
            await this.carregarKanbanBoard();
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

        this._atualizarBtnEditarColunas();

        if (view === 'backlog') {
            this._carregarBacklogKanban();
        } else {
            this.carregarKanbanBoard();
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
        const projetoId = this.kanbanFiltros?.projeto
                       || document.getElementById('kanbanFiltroProjeto')?.value
                       || this.kanbanProjetoAtual?.id;

        const bt = document.getElementById('backlogTree');
        if (!projetoId) {
            if (bt) bt.innerHTML = '<p class="text-neutral-400 text-center py-10 text-sm">Selecione um projeto no filtro acima para ver o backlog.</p>';
            return;
        }

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
