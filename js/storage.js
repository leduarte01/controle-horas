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
        const selects = ['clienteProjeto', 'filtroCliente'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            const current = select.value;
            select.innerHTML = id === 'filtroCliente'
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
    },

    atualizarSelectsProjetos() {
        const select = document.getElementById('projetoLancamento');
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">Selecione um projeto</option>';
        this.projetos.forEach(p => {
            const cliente = this.clientes.find(c => c.id === p.clienteId);
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${cliente ? cliente.nome : 'Cliente não encontrado'} — ${p.nome}`;
            select.appendChild(opt);
        });
        if (current && this.projetos.some(p => p.id === current)) select.value = current;
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
        const clienteId = document.getElementById('filtroCliente').value;
        const select = document.getElementById('filtroProjeto');
        select.innerHTML = '<option value="">Todos os projetos</option>';
        const lista = clienteId
            ? this.projetos.filter(p => p.clienteId === clienteId)
            : this.projetos;
        lista.forEach(p => {
            const cliente = this.clientes.find(c => c.id === p.clienteId);
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${cliente ? cliente.nome : '—'} — ${p.nome}`;
            select.appendChild(opt);
        });
    }

});
