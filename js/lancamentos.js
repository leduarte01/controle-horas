/**
 * js/lancamentos.js — Time-entry CRUD mixed into ControleHoras
 */
Object.assign(ControleHoras.prototype, {

    lancarHoras() {
        const projetoId  = document.getElementById('projetoLancamento').value;
        const data       = document.getElementById('dataLancamento').value;
        const horaInicio = document.getElementById('horaInicio').value;
        const horaFim    = document.getElementById('horaFim').value;
        const atividade  = document.getElementById('atividadeLancamento').value.trim();
        const descricao  = document.getElementById('descricaoAtividade').value.trim();

        if (!projetoId || !data || !horaInicio || !horaFim || !atividade) {
            this.mostrarToast('Preencha todos os campos obrigatórios.', 'error'); return;
        }
        if (horaInicio >= horaFim) {
            this.mostrarToast('Hora de fim deve ser maior que hora de início.', 'error'); return;
        }

        const inicio = this.parseDateLocal(data);
        const [hi, hmi] = horaInicio.split(':').map(Number);
        inicio.setHours(hi, hmi, 0, 0);

        const fim = this.parseDateLocal(data);
        const [hf, hfm] = horaFim.split(':').map(Number);
        fim.setHours(hf, hfm, 0, 0);

        const duracao = (fim - inicio) / 3600000; // hours
        const projeto = this.projetos.find(p => p.id === projetoId);
        const valorTotal = duracao * (projeto ? projeto.valorHora : 0);

        if (this.editandoLancamento) {
            const idx = this.lancamentos.findIndex(l => l.id === this.editandoLancamento.id);
            if (idx !== -1) {
                this.lancamentos[idx] = {
                    ...this.lancamentos[idx],
                    projetoId, data, horaInicio, horaFim,
                    duracao:    parseFloat(duracao.toFixed(2)),
                    atividade,
                    descricao,
                    valorTotal: parseFloat(valorTotal.toFixed(2)),
                    dataAtualizacao: new Date().toISOString()
                };
                this.mostrarToast(`Lançamento atualizado! Duração: ${duracao.toFixed(2)}h`, 'success');
            }
        } else {
            this.lancamentos.push({
                id: this.gerarId(),
                projetoId, data, horaInicio, horaFim,
                duracao:     parseFloat(duracao.toFixed(2)),
                atividade,
                descricao,
                valorTotal:  parseFloat(valorTotal.toFixed(2)),
                dataLancamento: new Date().toISOString()
            });
            this.mostrarToast(`Lançamento realizado! Duração: ${duracao.toFixed(2)}h`, 'success');
        }

        this.salvarDados();
        this.limparFormLancamento();
        this.atualizarDashboard();
    },

    calcularTempo() {
        const horaInicio = document.getElementById('horaInicio').value;
        const horaFim    = document.getElementById('horaFim').value;
        const data       = document.getElementById('dataLancamento').value || new Date().toISOString().split('T')[0];
        const wrapper    = document.getElementById('tempoCalculado');
        const inner      = document.getElementById('tempoCalculadoInner');
        const texto      = document.getElementById('textoTempo');

        if (!horaInicio || !horaFim) { wrapper.style.display = 'none'; return; }

        if (horaInicio >= horaFim) {
            wrapper.style.display  = 'block';
            inner.className        = 'alert-error-glass';
            texto.textContent      = 'Hora de fim deve ser maior que hora de início.';
        } else {
            const inicio = this.parseDateLocal(data);
            const [hi, hmi] = horaInicio.split(':').map(Number);
            inicio.setHours(hi, hmi, 0, 0);

            const fim = this.parseDateLocal(data);
            const [hf, hfm] = horaFim.split(':').map(Number);
            fim.setHours(hf, hfm, 0, 0);

            const duracao = (fim - inicio) / 3600000;
            wrapper.style.display  = 'block';
            inner.className        = 'alert-info-glass';
            texto.textContent      = `Duração calculada: ${duracao.toFixed(2)} horas`;
        }
    },

    editarLancamento(id) {
        const lanc = this.lancamentos.find(l => l.id === id);
        if (!lanc) { this.mostrarToast('Lançamento não encontrado.', 'error'); return; }

        this.editandoLancamento = lanc;
        navegarPara('lancamento');

        setTimeout(() => {
            document.getElementById('projetoLancamento').value = lanc.projetoId;
            document.getElementById('projetoLancamento').dispatchEvent(new Event('change', { bubbles: true }));
            if (window.fpInstances && window.fpInstances['dataLancamento']) {
                window.fpInstances['dataLancamento'].setDate(lanc.data, true);
            } else {
                document.getElementById('dataLancamento').value = lanc.data;
            }
            document.getElementById('horaInicio').value          = lanc.horaInicio;
            document.getElementById('horaFim').value             = lanc.horaFim;
            document.getElementById('atividadeLancamento').value  = lanc.atividade || '';
            document.getElementById('descricaoAtividade').value   = lanc.descricao || '';
            this.alternarModoEdicaoLancamento(true);
            this.calcularTempo();
            document.getElementById('formLancamento').scrollIntoView({ behavior: 'smooth' });
            this.mostrarToast('Editando lançamento. Modifique os campos e clique em "Atualizar".', 'info');
        }, 60);
    },

    async excluirLancamento(id) {
        if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;
        try {
            await fetch(`${this.apiBaseUrl}/lancamentos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
        } catch(e) { console.error('Erro ao excluir lançamento na API:', e); }
        this.lancamentos = this.lancamentos.filter(l => l.id !== id);
        this.salvarDados();
        this.atualizarDashboard();
        // Refresh report view if visible
        if (this.dadosRelatorio) this.aplicarFiltros();
        this.mostrarToast('Lançamento excluído com sucesso!', 'success');
    },

    limparFormLancamento() {
        document.getElementById('formLancamento').reset();
        document.getElementById('tempoCalculado').style.display = 'none';
        this.editandoLancamento = null;
        this.alternarModoEdicaoLancamento(false);
        this.definirDataAtual();
    },

    alternarModoEdicaoLancamento(editando) {
        const header    = document.getElementById('cardHeaderLancamento');
        const btnSubmit = document.getElementById('btnSubmitLancamento');
        if (editando) {
            header.innerHTML = '<i class="bi bi-pencil mr-2" style="color:rgba(249,115,22,0.7)"></i>Editar Lançamento';
            btnSubmit.querySelector('.btn-icon').className = 'bi bi-check-lg mr-1 btn-icon';
            btnSubmit.querySelector('.btn-label').textContent = 'Atualizar';
        } else {
            header.innerHTML = '<i class="bi bi-plus-circle mr-2" style="color:rgba(249,115,22,0.7)"></i>Lançar Horas';
            btnSubmit.querySelector('.btn-icon').className = 'bi bi-check-lg mr-1 btn-icon';
            btnSubmit.querySelector('.btn-label').textContent = 'Lançar Horas';
        }
    }

});
