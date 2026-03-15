/**
 * js/app.js — ControleHoras: class definition + core setup
 * Other module files (utils, storage, clientes, etc.) extend this prototype.
 */
class ControleHoras {
    constructor() {
        this.clientes    = JSON.parse(localStorage.getItem('clientes'))    || [];
        this.projetos    = JSON.parse(localStorage.getItem('projetos'))    || [];
        this.lancamentos = JSON.parse(localStorage.getItem('lancamentos')) || [];

        this.editandoCliente    = null;
        this.editandoProjeto    = null;
        this.editandoLancamento = null;
        this.dadosRelatorio     = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.carregarDados();
        this.atualizarDashboard();
        this.definirDataAtual();
    }

    setupEventListeners() {
        document.getElementById('formCliente').addEventListener('submit', (e) => {
            e.preventDefault();
            this.cadastrarCliente();
        });

        document.getElementById('formProjeto').addEventListener('submit', (e) => {
            e.preventDefault();
            this.cadastrarProjeto();
        });

        document.getElementById('formLancamento').addEventListener('submit', (e) => {
            e.preventDefault();
            this.lancarHoras();
        });

        document.getElementById('horaInicio').addEventListener('change', () => this.calcularTempo());
        document.getElementById('horaFim').addEventListener('change',    () => this.calcularTempo());

        document.getElementById('filtroCliente').addEventListener('change',
            () => this.atualizarFiltrosProjeto());
        document.getElementById('filtroClienteDashboard').addEventListener('change',
            () => this.atualizarFiltrosProjetoDashboard());
    }

    definirDataAtual() {
        const fp  = window.fpInstances || {};
        const set = (id, val) => fp[id] ? fp[id].setDate(val, true) : (document.getElementById(id).value = val);

        const hoje = new Date().toISOString().split('T')[0];
        set('dataLancamento', hoje);

        const hoje2   = new Date();
        // Period: 18th of previous month → 17th of current month
        const inicio  = new Date(hoje2.getFullYear(), hoje2.getMonth() - 1, 18);
        const fim     = new Date(hoje2.getFullYear(), hoje2.getMonth(),     17);
        set('dataInicio',         inicio.toISOString().split('T')[0]);
        set('dataFim',            fim.toISOString().split('T')[0]);
        set('dataInicioDashboard', inicio.toISOString().split('T')[0]);
        set('dataFimDashboard',    fim.toISOString().split('T')[0]);
    }
}
