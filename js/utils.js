/**
 * js/utils.js — Utility methods mixed into ControleHoras
 */
Object.assign(ControleHoras.prototype, {

    gerarId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /** Parse YYYY-MM-DD safely in local timezone (avoids UTC offset shifts). */
    parseDateLocal(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return new Date(dateStr);
        const [y, m, d] = parts.map(p => parseInt(p, 10));
        return new Date(y, m - 1, d);
    },

    formatarData(data) {
        if (!data) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
            return this.parseDateLocal(data).toLocaleDateString('pt-BR');
        }
        return new Date(data).toLocaleDateString('pt-BR');
    },

    mostrarToast(mensagem, tipo = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        const cssType = tipo === 'error' ? 'error' : tipo; // 'success' | 'error' | 'info'
        toast.className = `toast toast-${cssType}`;

        const icon = cssType === 'success' ? 'bi-check-circle-fill'
                   : cssType === 'error'   ? 'bi-exclamation-circle-fill'
                   : 'bi-info-circle-fill';

        toast.innerHTML = `<i class="bi ${icon}"></i><span>${mensagem}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = 'opacity 0.3s, transform 0.3s';
            setTimeout(() => toast.remove(), 320);
        }, 4500);
    },

    /** Apply center alignment to all cells in a SheetJS worksheet. */
    setSheetAlignmentCenter(ws) {
        try {
            if (!ws || !ws['!ref']) return;
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const ref  = XLSX.utils.encode_cell({ c: C, r: R });
                    const cell = ws[ref];
                    if (!cell) continue;
                    cell.s = cell.s || {};
                    cell.s.alignment = { vertical: 'center', horizontal: 'center', wrapText: true };
                }
            }
        } catch (e) {
            console.warn('Não foi possível aplicar alinhamento.', e);
        }
    },

    /** Format the duration column (decimal hours) to Excel [h]:mm time format. */
    formatDurationColumn(ws) {
        try {
            if (!ws || !ws['!ref']) return;
            const range = XLSX.utils.decode_range(ws['!ref']);
            let durCol = -1;
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const headerRef = XLSX.utils.encode_cell({ c: C, r: range.s.r });
                const headerCell = ws[headerRef];
                const val = headerCell && headerCell.v ? String(headerCell.v).trim().toLowerCase() : '';
                if (/dura/.test(val)) { durCol = C; break; }
            }
            if (durCol === -1) return;
            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                const ref  = XLSX.utils.encode_cell({ c: durCol, r: R });
                const cell = ws[ref];
                if (!cell) continue;
                const num = parseFloat(cell.v);
                if (isFinite(num)) {
                    cell.v = num / 24;
                    cell.t = 'n';
                    cell.z = '[h]:mm';
                }
            }
        } catch (e) {
            console.warn('Não foi possível formatar coluna de duração.', e);
        }
    }

});
