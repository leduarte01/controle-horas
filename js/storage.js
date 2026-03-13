/**
 * js/storage.js — Data persistence + select update methods
 */
Object.assign(ControleHoras.prototype, {

    salvarDados() {
        localStorage.setItem('clientes',    JSON.stringify(this.clientes));
        localStorage.setItem('projetos',    JSON.stringify(this.projetos));
        localStorage.setItem('lancamentos', JSON.stringify(this.lancamentos));
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
