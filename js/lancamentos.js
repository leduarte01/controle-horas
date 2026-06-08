/**
 * js/lancamentos.js — Time-entry CRUD mixed into ControleHoras
 */
Object.assign(ControleHoras.prototype, {

    // Popula o select de atividades (catálogo global, filtradas por ativo=true)
    async onProjetoLancamentoChange(projetoId) {
        const sel  = document.getElementById('atividadeLancamento');
        const hint = document.getElementById('semAtividadesHint');
        if (!sel) return;
        sel.innerHTML = '<option value="">Selecione uma atividade...</option>';
        if (!projetoId) {
            if (hint) hint.style.display = 'none';
            return;
        }
        try {
            const resp = await fetch(`${this.apiBaseUrl}/atividades?ativo=true`, {
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            const atividades = await resp.json();
            atividades.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id;
                opt.textContent = a.nome;
                sel.appendChild(opt);
            });
            if (hint) hint.style.display = atividades.length === 0 ? 'block' : 'none';
        } catch(e) {
            if (hint) hint.style.display = 'none';
        }
    },

    async lancarHoras() {
        const projetoId  = document.getElementById('projetoLancamento').value;
        const datasStr   = document.getElementById('dataLancamento').value;
        const horaInicio = document.getElementById('horaInicio').value;
        const horaFim    = document.getElementById('horaFim').value;
        const selAtiv    = document.getElementById('atividadeLancamento');
        const atividadeId = selAtiv.value || null;
        const atividade   = atividadeId
            ? (selAtiv.options[selAtiv.selectedIndex]?.text || '')
            : '';
        const descricao  = document.getElementById('descricaoAtividade').value.trim();

        if (!projetoId || !datasStr || !horaInicio || !horaFim) {
            this.mostrarToast('Preencha todos os campos obrigatórios.', 'error'); return;
        }
        if (horaInicio >= horaFim) {
            this.mostrarToast('Hora de fim deve ser maior que hora de início.', 'error'); return;
        }

        const datas = datasStr.split(',').map(d => d.trim()).filter(d => d);
        
        // Use a primeira data para calcular a duração, ela será a mesma para todas
        const data = datas[0];
        const inicio = this.parseDateLocal(data);
        const [hi, hmi] = horaInicio.split(':').map(Number);
        inicio.setHours(hi, hmi, 0, 0);

        const fim = this.parseDateLocal(data);
        const [hf, hfm] = horaFim.split(':').map(Number);
        fim.setHours(hf, hfm, 0, 0);

        const duracao = (fim - inicio) / 3600000; // hours
        const projeto = this.projetos.find(p => p.id === projetoId);
        const valorTotal = duracao * (projeto ? projeto.valorHora : 0);

        // Desabilita o botão enquanto salva
        const btnSubmit = document.getElementById('btnSubmitLancamento');
        if (btnSubmit) btnSubmit.disabled = true;

        try {
            if (this.editandoLancamento) {
                const lancamentoAtualizado = {
                    ...this.editandoLancamento,
                    projetoId, data, horaInicio, horaFim, // Quando edita, salva apenas na primeira data
                    duracao:    parseFloat(duracao.toFixed(2)),
                    atividade,
                    atividadeId,
                    descricao,
                    valorTotal: parseFloat(valorTotal.toFixed(2)),
                    dataAtualizacao: new Date().toISOString()
                };

                const res = await fetch(`${this.apiBaseUrl}/lancamentos/${this.editandoLancamento.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                    body: JSON.stringify(lancamentoAtualizado)
                });
                if (!res.ok) throw new Error('Erro ao atualizar lançamento no servidor.');

                const idx = this.lancamentos.findIndex(l => l.id === this.editandoLancamento.id);
                if (idx !== -1) this.lancamentos[idx] = lancamentoAtualizado;
                
                this.mostrarToast(`Lançamento atualizado! Duração: ${duracao.toFixed(2)}h`, 'success');
            } else {
                const requests = datas.map(d => {
                    const novoLancamento = {
                        id: this.gerarId(),
                        projetoId, data: d, horaInicio, horaFim,
                        duracao:     parseFloat(duracao.toFixed(2)),
                        atividade,
                        atividadeId,
                        descricao,
                        valorTotal:  parseFloat(valorTotal.toFixed(2)),
                        dataLancamento: new Date().toISOString()
                    };
                    return fetch(`${this.apiBaseUrl}/lancamentos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                        body: JSON.stringify(novoLancamento)
                    }).then(r => {
                        if (!r.ok) throw new Error(`Falha no dia ${d}`);
                        return novoLancamento;
                    });
                });

                const lancamentosSalvos = await Promise.all(requests);
                this.lancamentos.push(...lancamentosSalvos);
                this.mostrarToast(`${datas.length > 1 ? datas.length + ' lançamentos realizados' : 'Lançamento realizado'}! Duração total registrada: ${(duracao * datas.length).toFixed(2)}h`, 'success');
            }

            this.salvarCacheLocal();
            this.limparFormLancamento();
            this.atualizarDashboard();
        } catch (err) {
            console.error(err);
            this.mostrarToast(err.message, 'error');
        } finally {
            if (btnSubmit) btnSubmit.disabled = false;
        }
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

        setTimeout(async () => {
            // Pré-seleciona cliente e filtra projetos antes de setar o projeto
            const projeto = this.projetos.find(p => p.id === lanc.projetoId);
            if (projeto) {
                document.getElementById('clienteLancamento').value = projeto.clienteId;
                this.filtrarProjetosLancamento(projeto.clienteId);
            }
            document.getElementById('projetoLancamento').value = lanc.projetoId;
            // Populate atividades for this project, then set value
            await this.onProjetoLancamentoChange(lanc.projetoId);
            const selAtiv = document.getElementById('atividadeLancamento');
            if (lanc.atividadeId) {
                selAtiv.value = lanc.atividadeId;
            }
            if (window.fpInstances && window.fpInstances['dataLancamento']) {
                window.fpInstances['dataLancamento'].setDate(lanc.data, true);
            } else {
                document.getElementById('dataLancamento').value = lanc.data;
            }
            document.getElementById('horaInicio').value         = lanc.horaInicio;
            document.getElementById('horaFim').value            = lanc.horaFim;
            document.getElementById('descricaoAtividade').value = lanc.descricao || '';
            this.alternarModoEdicaoLancamento(true);
            this.calcularTempo();
            document.getElementById('formLancamento').scrollIntoView({ behavior: 'smooth' });
            this.mostrarToast('Editando lançamento. Modifique os campos e clique em "Atualizar".', 'info');
        }, 60);
    },

    async excluirLancamento(id) {
        const ok = await Dialog.confirm({
            title: 'Excluir Lançamento',
            message: 'Tem certeza que deseja excluir este lançamento de horas?',
            type: 'danger',
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });
        if (!ok) return;
        try {
            const res = await fetch(`${this.apiBaseUrl}/lancamentos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + this.token }
            });
            if (!res.ok) throw new Error('Erro ao excluir lançamento no servidor');
        } catch(e) { 
            console.error('Erro ao excluir lançamento na API:', e); 
            this.mostrarToast('Erro ao excluir. Tente novamente.', 'error');
            return;
        }
        this.lancamentos = this.lancamentos.filter(l => l.id !== id);
        this.salvarCacheLocal();
        this.atualizarDashboard();
        // Refresh report view if visible
        if (this.dadosRelatorio) this.aplicarFiltros();
        this.mostrarToast('Lançamento excluído com sucesso!', 'success');
    },

    limparFormLancamento() {
        document.getElementById('formLancamento').reset();
        document.getElementById('tempoCalculado').style.display = 'none';
        // restaura select de projetos com todos os projetos (sem filtro de cliente)
        this.filtrarProjetosLancamento('');
        const hint = document.getElementById('semAtividadesHint');
        if (hint) hint.style.display = 'none';
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
            if (window.fpInstances && window.fpInstances['dataLancamento']) {
                window.fpInstances['dataLancamento'].set('mode', 'single');
            }
        } else {
            header.innerHTML = '<i class="bi bi-plus-circle mr-2" style="color:rgba(249,115,22,0.7)"></i>Lançar Horas';
            btnSubmit.querySelector('.btn-icon').className = 'bi bi-check-lg mr-1 btn-icon';
            btnSubmit.querySelector('.btn-label').textContent = 'Lançar Horas';
            if (window.fpInstances && window.fpInstances['dataLancamento']) {
                window.fpInstances['dataLancamento'].set('mode', 'multiple');
            }
        }
    },

    abrirModalReplicarLancamento(id) {
        document.getElementById('replicarLancamentoId').value = id;
        if (window.fpInstances && window.fpInstances['replicarDatas']) {
            window.fpInstances['replicarDatas'].clear();
        } else {
            document.getElementById('replicarDatas').value = '';
        }
        document.getElementById('modalReplicarLancamento').style.display = 'flex';
    },

    fecharModalReplicarLancamento() {
        document.getElementById('modalReplicarLancamento').style.display = 'none';
        document.getElementById('replicarLancamentoId').value = '';
    },

    async confirmarReplicacao() {
        const id = document.getElementById('replicarLancamentoId').value;
        const datasStr = document.getElementById('replicarDatas').value;
        
        if (!datasStr) {
            this.mostrarToast('Selecione pelo menos uma data.', 'error'); return;
        }
        
        const original = this.lancamentos.find(l => l.id === id);
        if (!original) {
            this.mostrarToast('Lançamento original não encontrado.', 'error'); return;
        }
        
        const datas = datasStr.split(',').map(d => d.trim()).filter(d => d);
        
        try {
            const requests = datas.map(data => {
                const novoLancamento = {
                    ...original,
                    id: this.gerarId(),
                    data: data,
                    dataLancamento: new Date().toISOString()
                };
                return fetch(`${this.apiBaseUrl}/lancamentos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                    body: JSON.stringify(novoLancamento)
                }).then(r => {
                    if (!r.ok) throw new Error(`Falha ao replicar no dia ${data}`);
                    return novoLancamento;
                });
            });

            const lancamentosSalvos = await Promise.all(requests);
            this.lancamentos.push(...lancamentosSalvos);
            
            this.salvarCacheLocal();
            this.atualizarDashboard();
            if (this.dadosRelatorio) this.aplicarFiltros();
            
            this.fecharModalReplicarLancamento();
            this.mostrarToast(`${datas.length} lançamento(s) replicado(s) com sucesso!`, 'success');
        } catch (err) {
            console.error(err);
            this.mostrarToast(err.message, 'error');
        }
    }

});
