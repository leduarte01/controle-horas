/**
 * js/main.js — Navigation, global compatibility functions, app initialization.
 * This file is loaded LAST so all prototype extensions are already in place.
 */

// ── Section navigation ──
function navegarPara(secao) {
    // Hide all page sections
    document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));

    // Show target section
    const target = document.getElementById(`section-${secao}`);
    if (target) target.classList.remove('hidden');

    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === secao);
    });

    // Update mobile bottom nav active state
    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === secao);
    });
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
            else alert('Usuário ou senha inválidos!');
            btn.innerHTML = oriHTML;
            btn.disabled = false;
            return;
        }
        
        const data = await res.json();
        localStorage.setItem('token', data.token);
        controleHoras.token = data.token;
        document.getElementById('loginOverlay').style.display = 'none';
        
        if (controleHoras.mostrarToast) controleHoras.mostrarToast('Login realizado com sucesso!', 'success');
        await controleHoras.iniciarSistema();
    } catch(err) {
        if (controleHoras && controleHoras.mostrarToast) controleHoras.mostrarToast('Erro ao acessar o servidor.', 'error');
        else alert('Erro ao acessar o servidor!');
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

// ── Initialize application ──
document.addEventListener('DOMContentLoaded', () => {
    controleHoras = new ControleHoras();
    // Activate the default section (dashboard)
    navegarPara('dashboard');
});
