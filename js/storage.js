/**
 * js/storage.js — Data persistence + select update methods
 */
Object.assign(ControleHoras.prototype, {

    async apiSync() {
        if (!this.token) return;
        try {
            const resposta = await fetch(`${this.apiBaseUrl}/migrar`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    clientes: this.clientes,
                    projetos: this.projetos,
                    lancamentos: this.lancamentos
                })
            });
            if (resposta.status === 401) {
                this.logout();
                return;
            }
        } catch(e) {
            console.error('Erro ao sincronizar com banco', e);
        }
    },

    salvarDados() {
        localStorage.setItem('clientes',    JSON.stringify(this.clientes));
        localStorage.setItem('projetos',    JSON.stringify(this.projetos));
        localStorage.setItem('lancamentos', JSON.stringify(this.lancamentos));
        
        // Sincroniza via Upsert pro BD PostgeSQL secretamente
        this.apiSync();
    },

    async carregarDadosAPI() {
        try {
            const headers = { 'Authorization': `Bearer ${this.token}` };
            const [resClientes, resProjetos, resLancamentos] = await Promise.all([
                fetch(`${this.apiBaseUrl}/clientes`, { headers }),
                fetch(`${this.apiBaseUrl}/projetos`, { headers }),
                fetch(`${this.apiBaseUrl}/lancamentos`, { headers })
            ]);
            
            if (resClientes.status === 401 || resProjetos.status === 401 || resLancamentos.status === 401) {
                this.logout();
                return;
            }
            
            if(resClientes.ok) this.clientes = await resClientes.json();
            if(resProjetos.ok) this.projetos = await resProjetos.json();
            if(resLancamentos.ok) this.lancamentos = await resLancamentos.json();
            
            // Migração invisível se JSON vazio na API mas localStorage tem dados (Apenas na 1x)
            const cLocal = JSON.parse(localStorage.getItem('clientes')) || [];
            if (this.clientes.length === 0 && cLocal.length > 0) {
                this.clientes = cLocal;
                this.projetos = JSON.parse(localStorage.getItem('projetos')) || [];
                this.lancamentos = JSON.parse(localStorage.getItem('lancamentos')) || [];
                this.apiSync();
            }

        } catch(e) {
            console.error('API Error, using localStorage:', e);
            this.clientes    = JSON.parse(localStorage.getItem('clientes'))    || [];
            this.projetos    = JSON.parse(localStorage.getItem('projetos'))    || [];
            this.lancamentos = JSON.parse(localStorage.getItem('lancamentos')) || [];
        }
    },

    logout() {
        localStorage.removeItem('token');
        window.location.reload();
    },

    carregarDados() {
        this.carregarClientes();
        this.carregarProjetos();
        this.atualizarSelectsClientes();
        this.atualizarSelectsProjetos();
        this.atualizarFiltrosRelatorio();
    },

    atualizarSelectsClientes() {
        const selects = ['clienteProjeto', 'clienteLancamento'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            const current = select.value;
            select.innerHTML = id === 'clienteLancamento'
                ? '<option value="">Todos os clientes</option>'
                : '<option value="">Selecione um cliente</option>';
            this.clientes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.nome;
                select.appendChild(opt);
            });
            if (current && this.clientes.some(c => c.id === current)) select.value = current;
        });

        // Atualiza filtro customizado de Clientes (Multi-select)
        const listaCb = document.getElementById('filtroClienteLista');
        if (listaCb) {
            const selectedBoxes = Array.from(listaCb.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
            
            listaCb.innerHTML = '';
            this.clientes.forEach(c => {
                listaCb.innerHTML += `
                    <label class="flex items-center gap-3 p-3 hover:bg-orange-500/10 cursor-pointer transition-colors text-sm text-white/80">
                        <input type="checkbox" value="${c.id}" class="cb-filtro-cliente accent-orange-500 w-4 h-4 cursor-pointer" onchange="controleHoras.onCbClienteIndividualChange()">
                        <span>${c.nome}</span>
                    </label>
                `;
            });
            
            const checkboxes = Array.from(listaCb.querySelectorAll('.cb-filtro-cliente'));
            let anyRestored = false;
            checkboxes.forEach(cb => {
                if (selectedBoxes.includes(cb.value)) {
                    cb.checked = true;
                    anyRestored = true;
                }
            });
            
            if (!anyRestored && checkboxes.length > 0) {
                const cbTodos = document.getElementById('cbClienteTodos');
                if (cbTodos && cbTodos.checked) {
                    // Mantém estado de 'Todos'
                }
            }
            if(this.atualizarTextoFiltroCliente) this.atualizarTextoFiltroCliente();
        }
    },

    atualizarSelectsProjetos() {
        const clienteId = document.getElementById('clienteLancamento')?.value || '';
        this.filtrarProjetosLancamento(clienteId);
    },

    filtrarProjetosLancamento(clienteId) {
        const select = document.getElementById('projetoLancamento');
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">Selecione um projeto</option>';
        const lista = clienteId
            ? this.projetos.filter(p => p.clienteId === clienteId)
            : this.projetos;
        lista.forEach(p => {
            const cliente = this.clientes.find(c => c.id === p.clienteId);
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = clienteId ? p.nome : `${cliente ? cliente.nome : '—'} — ${p.nome}`;
            select.appendChild(opt);
        });
        if (current && lista.some(p => p.id === current)) select.value = current;
    },

    atualizarFiltrosRelatorio() {
        this.atualizarSelectsClientes();
        const select = document.getElementById('filtroProjeto');
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">Todos os projetos</option>';
        this.projetos.forEach(p => {
            const cliente = this.clientes.find(c => c.id === p.clienteId);
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${cliente ? cliente.nome : '—'} — ${p.nome}`;
            select.appendChild(opt);
        });
        if (current && this.projetos.some(p => p.id === current)) select.value = current;
    },

    atualizarFiltrosProjeto() {
        const clientesSelecionados = this.getClienteFilters ? this.getClienteFilters() : [];
        const select = document.getElementById('filtroProjeto');
        if (!select) return;
        select.innerHTML = '<option value="">Todos os projetos</option>';
        
        let lista = this.projetos;
        if (clientesSelecionados.length > 0) {
            lista = this.projetos.filter(p => clientesSelecionados.includes(p.clienteId));
        }
            
        // Atualiza as datas com o dia_fechamento do cliente selecionado (se houver exatamente 1 selecionado)
        let diaF = 17;
        if (clientesSelecionados.length === 1) {
            const clienteAtual = this.clientes.find(c => c.id === clientesSelecionados[0]);
            if (clienteAtual) diaF = clienteAtual.diaFechamento || 17;
        }
        const periodo = this.calcularPeriodoVigente(diaF);
        const fp = window.fpInstances || {};
        const set = (id, val) => fp[id] ? fp[id].setDate(val, true) : (document.getElementById(id).value = val);
        set('dataInicio', periodo.inicio);
        set('dataFim', periodo.fim);

        lista.forEach(p => {
            const cliente = this.clientes.find(c => c.id === p.clienteId);
            const opt = document.createElement('option');
            opt.value = p.id;
            // Se filtrou por exatamente 1 cliente, remove o nome do cliente do projeto para ficar mais enxuto
            opt.textContent = (clientesSelecionados.length === 1) ? p.nome : `${cliente ? cliente.nome : '—'} — ${p.nome}`;
            select.appendChild(opt);
        });
    }

});
