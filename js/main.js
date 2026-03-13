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
