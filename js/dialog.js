/**
 * js/dialog.js — Custom premium dialog system (replaces native confirm/alert)
 * Returns a Promise so it works with async/await
 */

const Dialog = {
    /**
     * Show a confirm dialog
     * @param {Object} opts
     * @param {string} opts.title - Dialog title
     * @param {string} opts.message - Dialog message
     * @param {string} [opts.type='danger'] - Icon type: 'danger', 'warning', 'info', 'success'
     * @param {string} [opts.confirmText='Confirmar'] - Confirm button text
     * @param {string} [opts.cancelText='Cancelar'] - Cancel button text
     * @returns {Promise<boolean>}
     */
    confirm({ title = 'Confirmar', message, type = 'danger', confirmText = 'Confirmar', cancelText = 'Cancelar' }) {
        return new Promise(resolve => {
            const iconMap = {
                danger:  'bi-exclamation-triangle-fill',
                warning: 'bi-exclamation-circle-fill',
                info:    'bi-info-circle-fill',
                success: 'bi-check-circle-fill'
            };
            const btnClass = type === 'danger' ? 'confirm-danger' : 'confirm-primary';

            const overlay = document.createElement('div');
            overlay.className = 'custom-dialog-overlay';
            overlay.innerHTML = `
                <div class="custom-dialog">
                    <div class="custom-dialog-shimmer"></div>
                    <div class="custom-dialog-icon">
                        <div class="icon-circle ${type}">
                            <i class="bi ${iconMap[type] || iconMap.danger}"></i>
                        </div>
                    </div>
                    <div class="custom-dialog-body">
                        <div class="custom-dialog-title">${title}</div>
                        <div class="custom-dialog-message">${message}</div>
                    </div>
                    <div class="custom-dialog-actions">
                        <button class="custom-dialog-btn cancel" data-action="cancel">${cancelText}</button>
                        <button class="custom-dialog-btn ${btnClass}" data-action="confirm">
                            <i class="bi ${type === 'danger' ? 'bi-trash' : 'bi-check-lg'}" style="margin-right:4px;"></i>${confirmText}
                        </button>
                    </div>
                </div>`;

            document.body.appendChild(overlay);
            // Trigger animation
            requestAnimationFrame(() => overlay.classList.add('active'));

            const close = (result) => {
                overlay.classList.remove('active');
                setTimeout(() => { overlay.remove(); resolve(result); }, 200);
            };

            overlay.querySelector('[data-action="cancel"]').onclick = () => close(false);
            overlay.querySelector('[data-action="confirm"]').onclick = () => close(true);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });

            // ESC to cancel
            const onKey = (e) => {
                if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(false); }
                if (e.key === 'Enter')  { document.removeEventListener('keydown', onKey); close(true); }
            };
            document.addEventListener('keydown', onKey);
        });
    },

    /**
     * Show an alert dialog (just OK button)
     * @param {Object} opts
     * @param {string} opts.title - Dialog title
     * @param {string} opts.message - Dialog message
     * @param {string} [opts.type='info'] - Icon type
     * @param {string} [opts.okText='Entendi'] - OK button text
     * @returns {Promise<void>}
     */
    alert({ title = 'Aviso', message, type = 'info', okText = 'Entendi' }) {
        return new Promise(resolve => {
            const iconMap = {
                danger:  'bi-exclamation-triangle-fill',
                warning: 'bi-exclamation-circle-fill',
                info:    'bi-info-circle-fill',
                success: 'bi-check-circle-fill'
            };

            const overlay = document.createElement('div');
            overlay.className = 'custom-dialog-overlay';
            overlay.innerHTML = `
                <div class="custom-dialog">
                    <div class="custom-dialog-shimmer"></div>
                    <div class="custom-dialog-icon">
                        <div class="icon-circle ${type}">
                            <i class="bi ${iconMap[type] || iconMap.info}"></i>
                        </div>
                    </div>
                    <div class="custom-dialog-body">
                        <div class="custom-dialog-title">${title}</div>
                        <div class="custom-dialog-message">${message}</div>
                    </div>
                    <div class="custom-dialog-actions">
                        <button class="custom-dialog-btn ok-btn" data-action="ok">${okText}</button>
                    </div>
                </div>`;

            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('active'));

            const close = () => {
                overlay.classList.remove('active');
                setTimeout(() => { overlay.remove(); resolve(); }, 200);
            };

            overlay.querySelector('[data-action="ok"]').onclick = close;
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

            const onKey = (e) => {
                if (e.key === 'Escape' || e.key === 'Enter') {
                    document.removeEventListener('keydown', onKey);
                    close();
                }
            };
            document.addEventListener('keydown', onKey);
        });
    }
};
