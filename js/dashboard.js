/**
 * js/dashboard.js — Dashboard stats (only stat cards, no reports)
 * Reports/charts live in the Relatórios section and the public dashboard.
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
    }

});
