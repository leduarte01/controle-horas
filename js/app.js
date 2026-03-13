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
        const hoje = new Date().toISOString().split('T')[0];
        document.getElementById('dataLancamento').value = hoje;

        const primeiroDia = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const ultimoDia   = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

        document.getElementById('dataInicio').value = primeiroDia.toISOString().split('T')[0];
        document.getElementById('dataFim').value    = ultimoDia.toISOString().split('T')[0];
    }
}
