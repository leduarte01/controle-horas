/**
 * js/dashboard.js — Dashboard stats, filters and lançamentos list
 */
Object.assign(ControleHoras.prototype, {

    atualizarDashboard() {
        document.getElementById('totalClientes').textContent = this.clientes.length;
        document.getElementById('totalProjetos').textContent = this.projetos.length;

        const mesAtual = new Date().toISOString().slice(0, 7);
        const horasMes = this.lancamentos
            .filter(l => l.data.startsWith(mesAtual))
            .reduce((s, l) => s + l.duracao, 0);
        document.getElementById('horasMes').textContent = horasMes.toFixed(1);

        const hoje = new Date().toISOString().split('T')[0];
        document.getElementById('entradasHoje').textContent =
            this.lancamentos.filter(l => l.data === hoje).length;

        this.carregarLancamentosFiltrados();
        this.atualizarSelectsFiltrosDashboard();
    },

    carregarLancamentosFiltrados(lancamentos = null) {
        const container = document.getElementById('ultimosLancamentos');
        const contador  = document.getElementById('contadorLancamentos');

        const lista = lancamentos ||
            [...this.lancamentos].sort((a, b) => new Date(b.dataLancamento) - new Date(a.dataLancamento));

        const n = lista.length;
        contador.textContent = `(${n} ${n === 1 ? 'registro' : 'registros'})`;

        if (n === 0) {
            container.innerHTML = '<p class="text-neutral-500 text-center py-10 text-sm">Nenhum lançamento encontrado</p>';
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Projeto</th>
                        <th>Cliente</th>
                        <th>Atividade</th>
                        <th>Descrição</th>
                        <th>Duração</th>
                        <th>Valor</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${lista.map(l => {
                        const projeto = this.projetos.find(p => p.id === l.projetoId);
                        const cliente = projeto ? this.clientes.find(c => c.id === projeto.clienteId) : null;
                        return `
                            <tr>
                                <td style="white-space:nowrap;font-size:0.8125rem;">${this.formatarData(l.data)}</td>
                                <td style="font-weight:500;">${projeto ? projeto.nome : '—'}</td>
                                <td style="font-size:0.8125rem;color:rgba(255,255,255,0.55);">${cliente ? cliente.nome : '—'}</td>
                                <td style="font-size:0.8125rem;font-weight:500;">${l.atividade || '—'}</td>
                                <td style="font-size:0.8125rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.descricao || '—'}</td>
                                <td style="white-space:nowrap;font-weight:600;color:#fb923c;">${l.duracao}h</td>
                                <td style="white-space:nowrap;font-size:0.8125rem;">R$ ${l.valorTotal.toFixed(2)}</td>
                                <td>
                                    <div class="action-cell">
                                        <button class="btn-warning-sm" onclick="controleHoras.editarLancamento('${l.id}')" title="Editar">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn-danger-sm" onclick="controleHoras.excluirLancamento('${l.id}')" title="Excluir">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>`;
                    }).join('')}
                </tbody>
            </table>`;
    },

    aplicarFiltrosDashboard() {
        const clienteId = document.getElementById('filtroClienteDashboard').value;
        const projetoId = document.getElementById('filtroProjetoDashboard').value;
        const inicio    = document.getElementById('dataInicioDashboard').value;
        const fim       = document.getElementById('dataFimDashboard').value;

        let lista = [...this.lancamentos];

        if (projetoId) {
            lista = lista.filter(l => l.projetoId === projetoId);
        } else if (clienteId) {
            const ids = this.projetos.filter(p => p.clienteId === clienteId).map(p => p.id);
            lista = lista.filter(l => ids.includes(l.projetoId));
        }
        if (inicio) lista = lista.filter(l => l.data >= inicio);
        if (fim)    lista = lista.filter(l => l.data <= fim);

        lista.sort((a, b) => new Date(b.dataLancamento) - new Date(a.dataLancamento));
        this.carregarLancamentosFiltrados(lista);
    },

    limparFiltrosDashboard() {
        document.getElementById('filtroClienteDashboard').value = '';
        document.getElementById('filtroProjetoDashboard').value = '';
        document.getElementById('dataInicioDashboard').value    = '';
        document.getElementById('dataFimDashboard').value       = '';
        document.getElementById('filtroProjetoDashboard').innerHTML = '<option value="">Todos os projetos</option>';
        this.carregarLancamentosFiltrados();
    },

    atualizarFiltrosProjetoDashboard() {
        const clienteId = document.getElementById('filtroClienteDashboard').value;
        const select    = document.getElementById('filtroProjetoDashboard');
        select.innerHTML = '<option value="">Todos os projetos</option>';

        const lista = clienteId
            ? this.projetos.filter(p => p.clienteId === clienteId)
            : this.projetos;

        // Atualiza as datas com o dia_fechamento do cliente selecionado (se houver)
        let diaF = 17;
        if (clienteId) {
            const clienteAtual = this.clientes.find(c => c.id === clienteId);
            if (clienteAtual) diaF = clienteAtual.diaFechamento || 17;
        }
        const periodo = this.calcularPeriodoVigente(diaF);
        const fp = window.fpInstances || {};
        const set = (id, val) => fp[id] ? fp[id].setDate(val, true) : (document.getElementById(id).value = val);
        set('dataInicioDashboard', periodo.inicio);
        set('dataFimDashboard', periodo.fim);

        lista.forEach(p => {
            const cliente = this.clientes.find(c => c.id === p.clienteId);
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = clienteId ? p.nome : `${p.nome} (${cliente ? cliente.nome : '—'})`;
            select.appendChild(opt);
        });
    },

    atualizarSelectsFiltrosDashboard() {
        ['filtroClienteDashboard', 'filtroProjetoDashboard'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const isCliente = id === 'filtroClienteDashboard';
            el.innerHTML = `<option value="">${isCliente ? 'Todos os clientes' : 'Todos os projetos'}</option>`;
            if (isCliente) {
                this.clientes.forEach(c => {
                    const o = document.createElement('option'); o.value = c.id; o.textContent = c.nome; el.appendChild(o);
                });
            } else {
                this.projetos.forEach(p => {
                    const cliente = this.clientes.find(c => c.id === p.clienteId);
                    const o = document.createElement('option');
                    o.value = p.id;
                    o.textContent = `${p.nome} (${cliente ? cliente.nome : '—'})`;
                    el.appendChild(o);
                });
            }
        });
    }

});
