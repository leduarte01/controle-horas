/**
 * js/main.js — Navigation, global compatibility functions, app initialization.
 * This file is loaded LAST so all prototype extensions are already in place.
 */

// ── Section navigation ──
function navegarPara(secao) {
    // Hide all page sections (remove active-section)
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active-section'));

    // Show target section
    const target = document.getElementById(`section-${secao}`);
    if (target) target.classList.add('active-section');

    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === secao);
    });

    // Update mobile bottom nav active state
    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === secao);
    });

    // Inicializar Kanban quando acessar a aba
    if (secao === 'kanban' && controleHoras && controleHoras.inicializarKanban) {
        controleHoras.inicializarKanban();
    }

    // Inicializar Backlog quando acessar a aba
    if (secao === 'backlog' && controleHoras && controleHoras.inicializarBacklog) {
        controleHoras.inicializarBacklog();
    }
    
    // Carregar Equipe quando acessar a aba
    if (secao === 'equipe' && controleHoras && controleHoras.carregarEquipe) {
        controleHoras.carregarEquipe();
    }
}

// ── Global compatibility wrappers (called from inline onclick in HTML) ──
let controleHoras;

async function realizarLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('btnAcessarLogin');
    if (!btn) return;
    const oriHTML = btn.innerHTML;
    btn.innerHTML = 'Acessando...';
    btn.disabled = true;

    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    
    try {
        const res = await fetch(`${controleHoras.apiBaseUrl}/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: user, password: pass})
        });
        
        if (!res.ok) {
            if (controleHoras && controleHoras.mostrarToast) controleHoras.mostrarToast('Usuário ou senha inválidos!', 'error');
            else Dialog.alert({ title: 'Falha no Login', message: 'Usuário ou senha inválidos!', type: 'danger' });
            btn.innerHTML = oriHTML;
            btn.disabled = false;
            return;
        }
        
        const data = await res.json();
        localStorage.setItem('token', data.token);
        controleHoras.token = data.token;
        controleHoras.usuario = controleHoras.parseJwt(data.token);
        document.getElementById('loginOverlay').style.display = 'none';
        if (controleHoras.usuario && controleHoras.usuario.empresaNome) {
             const userDisplayName = document.getElementById('userDisplayName');
             if (userDisplayName) userDisplayName.innerText = controleHoras.usuario.empresaNome;
        }
        
        if (controleHoras.mostrarToast) controleHoras.mostrarToast('Login realizado com sucesso!', 'success');
        await controleHoras.iniciarSistema();
    } catch(err) {
        if (controleHoras && controleHoras.mostrarToast) controleHoras.mostrarToast('Erro ao acessar o servidor.', 'error');
        else Dialog.alert({ title: 'Erro de Conexão', message: 'Não foi possível conectar ao servidor. Verifique sua conexão.', type: 'danger' });
        btn.innerHTML = oriHTML;
        btn.disabled = false;
    }
}

async function realizarRegistro(e) {
    e.preventDefault();
    const btn = document.getElementById('btnCriarConta');
    if (!btn) return;
    const oriHTML = btn.innerHTML;
    btn.innerHTML = 'Criando Conta...';
    btn.disabled = true;

    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    
    if(!user || !pass) {
        if (controleHoras && controleHoras.mostrarToast) controleHoras.mostrarToast('Digite um usuário e senha para cadastrar!', 'error');
        btn.innerHTML = oriHTML;
        btn.disabled = false;
        return;
    }

    try {
        const res = await fetch(`${controleHoras.apiBaseUrl}/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: user, password: pass})
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            if (controleHoras && controleHoras.mostrarToast) controleHoras.mostrarToast(data.error || 'Erro ao criar conta!', 'error');
            btn.innerHTML = oriHTML;
            btn.disabled = false;
            return;
        }
        
        localStorage.setItem('token', data.token);
        controleHoras.token = data.token;
        controleHoras.usuario = controleHoras.parseJwt(data.token);
        document.getElementById('loginOverlay').style.display = 'none';
        
        if (controleHoras.usuario && controleHoras.usuario.empresaNome) {
             const userDisplayName = document.getElementById('userDisplayName');
             if (userDisplayName) userDisplayName.innerText = controleHoras.usuario.empresaNome;
        }

        if (controleHoras.mostrarToast) controleHoras.mostrarToast(`Bem-vindo, ${data.username}! Conta ativa.`, 'success');
        await controleHoras.iniciarSistema();
    } catch(err) {
        if (controleHoras && controleHoras.mostrarToast) controleHoras.mostrarToast('Erro ao contatar o servidor.', 'error');
        btn.innerHTML = oriHTML;
        btn.disabled = false;
    }
}

function realizarLogout() {
    controleHoras.logout();
}

function limparFormCliente()  { controleHoras.limparFormCliente(); }
function limparFormProjeto()  { controleHoras.limparFormProjeto(); }
function limparFormLancamento() { controleHoras.limparFormLancamento(); }
function aplicarFiltros()     { controleHoras.aplicarFiltros(); }
function exportarExcel()      { controleHoras.exportarExcel(); }
function exportarPDF()        { controleHoras.exportarPDF(); }
function exportarRelatorio()  { controleHoras.exportarRelatorio(); }

// Backlog global wrappers
function criarEpico()                          { controleHoras.criarEpico(); }
function adicionarFilhoBacklog(pId, tipo)      { controleHoras.adicionarFilhoBacklog(pId, tipo); }
function toggleNoBacklog(id)                   { controleHoras.toggleNoBacklog(id); }
function atualizarStatusBacklog(id, status)    { controleHoras.atualizarStatusBacklog(id, status); }

// ── Initialize application ──
document.addEventListener('DOMContentLoaded', () => {
    controleHoras = new ControleHoras();
    // Activate the default section (dashboard)
    navegarPara('dashboard');
});
