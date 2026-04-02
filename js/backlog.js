/**
 * js/backlog.js — Backlog hierárquico Epic→Feature→UserStory→Task
 */
Object.assign(ControleHoras.prototype, {

    backlogItems: [],
    backlogProjeto: null,
    backlogExpandedNodes: null, // Set inicializado no primeiro uso

    _initBacklogState() {
        if (!this.backlogExpandedNodes) {
            this.backlogExpandedNodes = new Set();
        }
    },

    // ─── Cascade Cliente → Projeto ───
    inicializarBacklog() {
        this._initBacklogState();
        const selCliente = document.getElementById('backlogClienteSelect');
        if (!selCliente) return;
        selCliente.innerHTML = '<option value="">Selecione um cliente</option>';
        this.clientes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nome;
            selCliente.appendChild(opt);
        });
    },

    onBacklogClienteChange(clienteId) {
        const selProjeto = document.getElementById('backlogProjetoSelect');
        selProjeto.innerHTML = '<option value="">Selecione um projeto</option>';
        selProjeto.disabled = !clienteId;
        document.getElementById('btnNovoEpico').disabled = true;
        this.backlogProjeto = null;
        this.backlogItems = [];
        document.getElementById('backlogTree').innerHTML =
            '<p class="text-neutral-500 text-center py-16 text-sm">Selecione um projeto para visualizar o backlog.</p>';

        if (!clienteId) return;
        const projetosFiltrados = this.projetos.filter(p => p.clienteId === clienteId);
        projetosFiltrados.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.nome;
            selProjeto.appendChild(opt);
        });
    },

    async onBacklogProjetoChange(projetoId) {
        this._initBacklogState();
        document.getElementById('btnNovoEpico').disabled = !projetoId;
        this.backlogProjeto = this.projetos.find(p => p.id === projetoId) || null;
        this.backlogItems = [];
        this.backlogExpandedNodes.clear();

        if (!projetoId) {
            document.getElementById('backlogTree').innerHTML =
                '<p class="text-neutral-500 text-center py-16 text-sm">Selecione um projeto para visualizar o backlog.</p>';
            return;
        }

        document.getElementById('backlogTree').innerHTML =
            '<p class="text-neutral-500 text-center py-10 text-sm"><i class="bi bi-arrow-repeat mr-2"></i>Carregando backlog...</p>';

        try {
            const resp = await fetch(`${this.apiBaseUrl}/tarefas/${projetoId}`, {
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            this.backlogItems = await resp.json();
            // Expand epics by default
            this.backlogItems.filter(i => i.tipo === 'epic').forEach(i => this.backlogExpandedNodes.add(i.id));
        } catch (e) {
            this.backlogItems = [];
        }
        this.renderizarBacklog();
    },

    // ─── Constrói árvore a partir de array flat ───
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
        // Ordem: epic → feature → userstory → task
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

        // Responsible initials
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
        if (!this.backlogProjeto) return;
        this.abrirModalTarefa(null, 'Backlog', 'epic', null);
    },

    adicionarFilhoBacklog(parentId, tipoFilho) {
        if (!this.backlogProjeto) return;
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

    // Refreshes backlog if it's visible after a task save
    async _refreshBacklogIfVisible() {
        const section = document.getElementById('section-backlog');
        if (section && section.classList.contains('active') && this.backlogProjeto) {
            await this.onBacklogProjetoChange(this.backlogProjeto.id);
        }
    }
});
