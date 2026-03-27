/**
 * js/app.js — ControleHoras: class definition + core setup
 * Other module files (utils, storage, clientes, etc.) extend this prototype.
 */
class ControleHoras {
    constructor() {
        // Usa rota relativa para o sistema oficial rodando no EasyPanel
        this.apiBaseUrl = '/api';
        this.token = localStorage.getItem('token');
        this.clientes    = [];
        this.projetos    = [];
        this.lancamentos = [];

        this.editandoCliente    = null;
        this.editandoProjeto    = null;
        this.editandoLancamento = null;
        this.dadosRelatorio     = null;

        this.init();
    }

    async init() {
        this.setupEventListeners();
        if (this.token) {
            document.getElementById('loginOverlay').style.display = 'none';
            await this.iniciarSistema();
        } else {
            document.getElementById('loginOverlay').style.display = 'flex';
        }
    }

    async iniciarSistema() {
        if(this.carregarDadosAPI) {
            await this.carregarDadosAPI();
        }
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
        // Periodo vigente: Dia 18 ao dia 17. Se já passou do dia 17, pula para o próximo ciclo de faturamento.
        const offset  = hoje2.getDate() > 17 ? 1 : 0;
        
        const inicio  = new Date(hoje2.getFullYear(), hoje2.getMonth() - 1 + offset, 18);
        const fim     = new Date(hoje2.getFullYear(), hoje2.getMonth() + offset,     17);
        
        set('dataInicio',         inicio.toISOString().split('T')[0]);
        set('dataFim',            fim.toISOString().split('T')[0]);
        set('dataInicioDashboard', inicio.toISOString().split('T')[0]);
        set('dataFimDashboard',    fim.toISOString().split('T')[0]);
    }
}
