/**
 * js/main.js — Navigation, global compatibility functions, app initialization.
 * This file is loaded LAST so all prototype extensions are already in place.
 */

// ── Sidebar group collapse ──
function toggleNavGroup(groupId) {
    const group   = document.getElementById(groupId);
    const chevron = document.getElementById('chevron-' + groupId);
    if (!group) return;
    const isCollapsed = group.classList.toggle('collapsed');
    if (chevron) chevron.style.transform = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
}

// ── Section navigation ──
function navegarPara(secao) {
    // Permission check for non-admins
    if (controleHoras && controleHoras.usuario && controleHoras.usuario.role !== 'admin') {
        const perm = controleHoras.grupoPermissoes;
        if (perm && secao !== 'permissoes' && !perm.includes(secao)) {
            if (controleHoras.mostrarToast) controleHoras.mostrarToast('Acesso não autorizado.', 'error');
            return;
        }
    }
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
    
    // Carregar Atividades quando acessar a aba
    if (secao === 'atividades' && controleHoras && controleHoras.carregarAtividades) {
        controleHoras.carregarAtividades();
    }

    // Carregar Equipe quando acessar a aba
    if (secao === 'equipe' && controleHoras && controleHoras.carregarEquipe) {
        controleHoras.carregarEquipe();
    }

    // Carregar Permissões quando acessar a aba
    if (secao === 'permissoes' && controleHoras && controleHoras.carregarGrupos) {
        controleHoras.carregarGrupos();
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

function aplicarPermissoes() {
    if (!controleHoras) return;
    const usuario = controleHoras.usuario;
    if (!usuario || usuario.role === 'admin') return; // admin vê tudo

    const permissoes = controleHoras.grupoPermissoes || [];

    // Mostrar/ocultar itens do sidebar
    document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
        const secao = btn.dataset.section;
        if (secao === 'permissoes') { btn.style.display = 'none'; return; }
        btn.style.display = permissoes.includes(secao) ? '' : 'none';
    });

    // Mostrar/ocultar itens do nav mobile
    document.querySelectorAll('.mobile-nav-item[data-section]').forEach(btn => {
        const secao = btn.dataset.section;
        if (secao === 'permissoes') { btn.style.display = 'none'; return; }
        btn.style.display = permissoes.includes(secao) ? '' : 'none';
    });

    // Ocultar grupos do sidebar cujos itens estão todos ocultos
    ['group-operacional', 'group-cadastros', 'group-ferramentas'].forEach(groupId => {
        const group = document.getElementById(groupId);
        if (!group) return;
        const visible = group.querySelectorAll('.nav-item:not([style*="display: none"])');
        const header = group.previousElementSibling;
        if (visible.length === 0) {
            group.style.display = 'none';
            if (header) header.style.display = 'none';
        } else {
            group.style.display = '';
            if (header) header.style.display = '';
        }
    });

    // Redirecionar se a seção atual não é permitida
    const activeSection = document.querySelector('.page-section.active-section');
    if (activeSection) {
        const currentId = activeSection.id.replace('section-', '');
        if (currentId !== 'permissoes' && !permissoes.includes(currentId)) {
            const first = permissoes[0];
            if (first) navegarPara(first);
        }
    }
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
