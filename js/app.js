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
        this.grupos             = [];
        this.grupoPermissoes    = null;
        this.usuario            = null;
        this.equipe             = [];

        this.init();
    }

    parseJwt(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    }

    async init() {
        if (this.token) {
            this.usuario = this.parseJwt(this.token);
        }
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
        if(this.carregarEquipe) {
            await this.carregarEquipe();
        }
        if(this.carregarPermissoesMembro) {
            await this.carregarPermissoesMembro();
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

        document.getElementById('projetoLancamento').addEventListener('change', e => {
            this.onProjetoLancamentoChange(e.target.value);
        });

        document.getElementById('clienteLancamento').addEventListener('change', e => {
            this.filtrarProjetosLancamento(e.target.value);
            // limpa projeto e atividades ao trocar cliente
            document.getElementById('projetoLancamento').value = '';
            this.onProjetoLancamentoChange('');
        });

        document.getElementById('filtroCliente').addEventListener('change',
            () => this.atualizarFiltrosProjeto());
    }
    calcularPeriodoVigente(diaFechamento) {
        let dia = parseInt(diaFechamento) || 17;
        const hoje = new Date();
        const offset = hoje.getDate() > dia ? 1 : 0;
        
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1 + offset, dia + 1);
        const fim = new Date(hoje.getFullYear(), hoje.getMonth() + offset, dia);
        
        return {
            inicio: inicio.toISOString().split('T')[0],
            fim: fim.toISOString().split('T')[0]
        };
    }

    definirDataAtual() {
        const fp  = window.fpInstances || {};
        const set = (id, val) => fp[id] ? fp[id].setDate(val, true) : (document.getElementById(id).value = val);

        const hoje = new Date().toISOString().split('T')[0];
        set('dataLancamento', hoje);

        // Ao abrir pela primeira vez (sem filtro), usa 17 como default
        const periodo = this.calcularPeriodoVigente(17);
        
        set('dataInicio',         periodo.inicio);
        set('dataFim',            periodo.fim);
    }
}
