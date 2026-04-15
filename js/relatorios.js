/**
 * js/relatorios.js — Reports display and Excel/PDF export
 */
Object.assign(ControleHoras.prototype, {

    agruparLancamentosPorClienteProjeto(lancamentos) {
        // Sort globally by date ascending
        lancamentos.sort((a, b) => this.parseDateLocal(a.data) - this.parseDateLocal(b.data));

        const clientesMap = new Map();
        lancamentos.forEach(l => {
            const projeto = this.projetos.find(p => p.id === l.projetoId);
            const cliente = projeto ? this.clientes.find(c => c.id === projeto.clienteId) : null;
            if (!cliente || !projeto) return;

            if (!clientesMap.has(cliente.id)) {
                clientesMap.set(cliente.id, { nomeCliente: cliente.nome, totalHoras: 0, valorTotal: 0, projetos: new Map() });
            }
            const cd = clientesMap.get(cliente.id);
            cd.totalHoras += l.duracao;
            cd.valorTotal += l.valorTotal;

            if (!cd.projetos.has(projeto.id)) {
                cd.projetos.set(projeto.id, { nomeProjeto: projeto.nome, valorHora: projeto.valorHora, totalHoras: 0, valorTotal: 0, lancamentos: [] });
            }
            const pd = cd.projetos.get(projeto.id);
            pd.totalHoras += l.duracao;
            pd.valorTotal += l.valorTotal;
            pd.lancamentos.push(l);
        });

        return Array.from(clientesMap.values()).map(cd => {
            cd.projetos = Array.from(cd.projetos.values()).map(pd => {
                pd.lancamentos.sort((a, b) => this.parseDateLocal(a.data) - this.parseDateLocal(b.data));
                return pd;
            });
            cd.projetos.sort((a, b) => b.valorTotal - a.valorTotal);
            return cd;
        }).sort((a, b) => b.valorTotal - a.valorTotal);
    },

    getClienteFilters() {
        const cbTodos = document.getElementById('cbClienteTodos');
        if (cbTodos && cbTodos.checked) return []; // Retorna vazio indicando que são "Todos"
        
        const listaCb = document.getElementById('filtroClienteLista');
        if (!listaCb) return [];
        return Array.from(listaCb.querySelectorAll('.cb-filtro-cliente:checked')).map(cb => cb.value);
    },

    onCbClienteTodosChange(checkbox) {
        const listaCb = document.getElementById('filtroClienteLista');
        if (listaCb) {
            Array.from(listaCb.querySelectorAll('.cb-filtro-cliente')).forEach(cb => {
                cb.checked = false; // "Todos" desmarca os individuais
            });
        }
        this.atualizarTextoFiltroCliente();
        this.atualizarFiltrosProjeto();
    },

    onCbClienteIndividualChange() {
        const cbTodos = document.getElementById('cbClienteTodos');
        const listaCb = document.getElementById('filtroClienteLista');
        if (cbTodos && listaCb) {
            const anyChecked = Array.from(listaCb.querySelectorAll('.cb-filtro-cliente')).some(cb => cb.checked);
            if (anyChecked) {
                cbTodos.checked = false;
            } else {
                cbTodos.checked = true; // Se desmarcar todos, volta para "Todos"
            }
        }
        this.atualizarTextoFiltroCliente();
        this.atualizarFiltrosProjeto();
    },

    atualizarTextoFiltroCliente() {
        const cbTodos = document.getElementById('cbClienteTodos');
        const triggerTexto = document.getElementById('filtroClienteTexto');
        if (!triggerTexto) return;
        
        if (cbTodos && cbTodos.checked) {
            triggerTexto.textContent = 'Todos os clientes';
            return;
        }
        
        const listaCb = document.getElementById('filtroClienteLista');
        if (listaCb) {
            const checkedBoxes = Array.from(listaCb.querySelectorAll('.cb-filtro-cliente:checked'));
            if (checkedBoxes.length === 0) {
                triggerTexto.textContent = 'Todos os clientes';
                if (cbTodos) cbTodos.checked = true;
            } else if (checkedBoxes.length === 1) {
                const nome = checkedBoxes[0].nextElementSibling.textContent;
                triggerTexto.textContent = nome;
            } else {
                triggerTexto.textContent = `${checkedBoxes.length} empresas selecionadas`;
            }
        }
    },

    aplicarFiltros() {
        const clientesSelecionados = this.getClienteFilters();
        const projetoId = document.getElementById('filtroProjeto').value;
        const inicio    = document.getElementById('dataInicio').value;
        const fim       = document.getElementById('dataFim').value;

        let lista = [...this.lancamentos];

        if (projetoId) {
            lista = lista.filter(l => l.projetoId === projetoId);
        } else if (clientesSelecionados.length > 0) {
            const ids = this.projetos.filter(p => clientesSelecionados.includes(p.clienteId)).map(p => p.id);
            lista = lista.filter(l => ids.includes(l.projetoId));
        }
        if (inicio) lista = lista.filter(l => l.data >= inicio);
        if (fim)    lista = lista.filter(l => l.data <= fim);

        this.exibirRelatorio(lista, inicio, fim);
    },

    exibirRelatorio(lancamentos, dataInicio, dataFim) {
        const container = document.getElementById('relatorioHoras');
        const resumo    = document.getElementById('resumoRelatorio');
        const botoes    = document.getElementById('botoesExportacao');

        if (lancamentos.length === 0) {
            container.innerHTML = '<p class="text-neutral-500 text-center py-10 text-sm">Nenhum lançamento encontrado para os filtros aplicados</p>';
            resumo.style.display = 'none';
            if (botoes) botoes.style.display = 'none';
            return;
        }

        const grupos = this.agruparLancamentosPorClienteProjeto(lancamentos);
        let html = '<div class="space-y-4">';

        grupos.forEach(cd => {
            html += `
                <div class="glass-card overflow-hidden">
                    <div class="cliente-grupo-header">
                        <i class="bi bi-person-fill"></i>
                        <span>${cd.nomeCliente}</span>
                        <span class="badge badge-orange">${cd.totalHoras.toFixed(1)}h</span>
                        <span class="badge badge-green">R$ ${cd.valorTotal.toFixed(2)}</span>
                    </div>`;

            cd.projetos.forEach(pd => {
                html += `
                    <div class="projeto-grupo">
                        <div class="projeto-grupo-header">
                            <i class="bi bi-folder-fill" style="color:#f97316;font-size:0.75rem;"></i>
                            <span>${pd.nomeProjeto}</span>
                            <span class="badge badge-blue">${pd.totalHoras.toFixed(1)}h</span>
                            <span class="badge badge-orange">R$ ${pd.valorTotal.toFixed(2)}</span>
                            <span style="font-size:0.6875rem;color:#525252;margin-left:4px;">R$ ${pd.valorHora.toFixed(2)}/h</span>
                        </div>
                        <div style="overflow-x:auto;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Atividade</th>
                                        <th>Descrição</th>
                                        <th>Início</th>
                                        <th>Fim</th>
                                        <th>Duração</th>
                                        <th>Valor</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pd.lancamentos.map(l => `
                                        <tr>
                                            <td style="white-space:nowrap;font-size:0.8125rem;">${this.formatarData(l.data)}</td>
                                            <td style="font-size:0.8125rem;font-weight:500;">${l.atividade || '—'}</td>
                                            <td style="font-size:0.8125rem;">${l.descricao || '—'}</td>
                                            <td style="font-size:0.8125rem;">${l.horaInicio}</td>
                                            <td style="font-size:0.8125rem;">${l.horaFim}</td>
                                            <td style="font-weight:700;color:#fb923c;white-space:nowrap;">${l.duracao}h</td>
                                            <td style="font-size:0.8125rem;white-space:nowrap;">R$ ${l.valorTotal.toFixed(2)}</td>
                                            <td>
                                                <div class="action-cell">
                                                    <button class="btn-warning-sm" onclick="controleHoras.editarLancamento('${l.id}')"><i class="bi bi-pencil"></i></button>
                                                    <button class="btn-danger-sm"  onclick="controleHoras.excluirLancamento('${l.id}')"><i class="bi bi-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>`;
            });

            html += '</div>';
        });

        html += '</div>';
        container.innerHTML = html;

        const totalHoras = lancamentos.reduce((s, l) => s + l.duracao, 0);
        const valorTotal = lancamentos.reduce((s, l) => s + l.valorTotal, 0);

        document.getElementById('totalHorasRelatorio').textContent = totalHoras.toFixed(1);
        document.getElementById('valorTotalRelatorio').textContent = valorTotal.toFixed(2);

        let periodo = 'Todos os períodos';
        if (dataInicio && dataFim)  periodo = `${this.formatarData(dataInicio)} a ${this.formatarData(dataFim)}`;
        else if (dataInicio)         periodo = `A partir de ${this.formatarData(dataInicio)}`;
        else if (dataFim)            periodo = `Até ${this.formatarData(dataFim)}`;
        document.getElementById('periodoRelatorio').textContent = periodo;

        resumo.style.display = 'block';
        if (botoes) botoes.style.display = 'flex';

        lancamentos.sort((a, b) => this.parseDateLocal(a.data) - this.parseDateLocal(b.data));
        this.dadosRelatorio = { lancamentos, totalHoras, valorTotal, periodo };
    },

    // ── Excel export ──
    exportarExcel() {
        if (!this.dadosRelatorio || !this.dadosRelatorio.lancamentos.length) {
            this.mostrarToast('Gere um relatório primeiro antes de exportar.', 'error'); return;
        }

        const wb      = XLSX.utils.book_new();
        const grupos  = this.agruparLancamentosPorClienteProjeto(this.dadosRelatorio.lancamentos);

        // ─ Resumo sheet ─
        const resumoRows = [
            ['RELATÓRIO DE HORAS TRABALHADAS'],
            ['Período:', this.dadosRelatorio.periodo],
            ['Data Geração:', this.formatarData(new Date().toISOString().split('T')[0])],
            [],
            ['RESUMO POR CLIENTE'],
            ['Cliente', 'Total Horas', 'Valor Total (R$)'],
        ];
        grupos.forEach(cd => resumoRows.push([cd.nomeCliente, cd.totalHoras.toFixed(1), cd.valorTotal.toFixed(2)]));
        resumoRows.push([], ['TOTAIS GERAIS'], ['Total Horas:', this.dadosRelatorio.totalHoras.toFixed(1)], ['Valor Total:', this.dadosRelatorio.valorTotal.toFixed(2)]);
        const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows);
        this.setSheetAlignmentCenter(wsResumo);
        XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

        // ─ Detalhado (por cliente/projeto) sheet ─
        const detRows = [['Data', 'Cliente', 'Projeto', 'Atividade', 'Descrição', 'Hora Início', 'Hora Fim', 'Duração (h)']];
        grupos.forEach(cd => {
            detRows.push(['', `=== ${cd.nomeCliente.toUpperCase()} ===`, '', '', '', '', cd.totalHoras.toFixed(1)]);
            cd.projetos.forEach(pd => {
                detRows.push(['', '', `--- ${pd.nomeProjeto} ---`, '', '', '', pd.totalHoras.toFixed(1)]);
                pd.lancamentos.forEach(l => detRows.push([
                    this.formatarData(l.data), cd.nomeCliente, pd.nomeProjeto,
                    l.atividade || '', l.descricao, l.horaInicio, l.horaFim, l.duracao
                ]));
                detRows.push([]);
            });
        });
        const totalH = this.dadosRelatorio.lancamentos.reduce((s, l) => s + l.duracao, 0);
        detRows.push(['', '', '', '', '', 'TOTAL HORAS', totalH.toFixed(1)]);
        const wsDet = XLSX.utils.aoa_to_sheet(detRows);
        this.setSheetAlignmentCenter(wsDet);
        this.formatDurationColumn(wsDet);
        XLSX.utils.book_append_sheet(wb, wsDet, 'Detalhado');

        // ─ Detalhado por Data (flat, date-sorted) sheet ─
        const porDataRows = [['Data', 'Cliente', 'Projeto', 'Atividade', 'Descrição', 'Hora Início', 'Hora Fim', 'Duração (h)']];
        this.dadosRelatorio.lancamentos.forEach(l => {
            const projeto = this.projetos.find(p => p.id === l.projetoId);
            const cliente = projeto ? this.clientes.find(c => c.id === projeto.clienteId) : null;
            porDataRows.push([
                this.formatarData(l.data),
                cliente ? cliente.nome : 'N/A',
                projeto ? projeto.nome : 'N/A',
                l.atividade || '', l.descricao, l.horaInicio, l.horaFim, l.duracao
            ]);
        });
        const totalPD = this.dadosRelatorio.lancamentos.reduce((s, l) => s + l.duracao, 0);
        porDataRows.push([], ['', '', '', '', 'TOTAL HORAS', '', totalPD.toFixed(1)]);
        const wsPorData = XLSX.utils.aoa_to_sheet(porDataRows);
        this.setSheetAlignmentCenter(wsPorData);
        this.formatDurationColumn(wsPorData);
        XLSX.utils.book_append_sheet(wb, wsPorData, 'Detalhado - Por Data');

        // ─ Per-client sheets ─
        grupos.forEach(cd => {
            const rows = [
                [`RELATÓRIO — ${cd.nomeCliente.toUpperCase()}`],
                ['Período:', this.dadosRelatorio.periodo],
                [],
                ['Projeto', 'Data', 'Atividade', 'Descrição', 'Início', 'Fim', 'Duração']
            ];
            cd.projetos.forEach(pd => {
                pd.lancamentos.forEach(l => {
                    rows.push([pd.nomeProjeto, this.formatarData(l.data), l.atividade || '', l.descricao, l.horaInicio, l.horaFim, l.duracao]);
                });
            });
            rows.push([], ['TOTAL:', '', '', '', '', cd.totalHoras.toFixed(1)]);
            const ws = XLSX.utils.aoa_to_sheet(rows);
            this.setSheetAlignmentCenter(ws);
            this.formatDurationColumn(ws);
            XLSX.utils.book_append_sheet(wb, ws, cd.nomeCliente.substring(0, 31));
        });

        XLSX.writeFile(wb, `relatorio-horas-${new Date().toISOString().split('T')[0]}.xlsx`);
        this.mostrarToast('Excel exportado com sucesso!', 'success');
    },

    // ── PDF export ──
    exportarPDF() {
        if (!this.dadosRelatorio || !this.dadosRelatorio.lancamentos.length) {
            this.mostrarToast('Gere um relatório primeiro antes de exportar.', 'error'); return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text('Relatório de Horas Trabalhadas', 20, 20);
        doc.setFontSize(11);
        doc.text(`Período: ${this.dadosRelatorio.periodo}`, 20, 32);
        doc.text(`Total de Horas: ${this.dadosRelatorio.totalHoras.toFixed(1)}h`, 20, 40);
        doc.text(`Valor Total: R$ ${this.dadosRelatorio.valorTotal.toFixed(2)}`, 20, 48);

        let y = 64;
        doc.setFontSize(9);

        this.dadosRelatorio.lancamentos.forEach(l => {
            if (y > 260) { doc.addPage(); y = 20; }
            const projeto = this.projetos.find(p => p.id === l.projetoId);
            const cliente = projeto ? this.clientes.find(c => c.id === projeto.clienteId) : null;
            doc.text(`${this.formatarData(l.data)}  ${cliente ? cliente.nome : 'N/A'}  /  ${projeto ? projeto.nome : 'N/A'}`, 20, y);
            doc.text(`${l.horaInicio}–${l.horaFim}  (${l.duracao}h)  R$ ${l.valorTotal.toFixed(2)}`, 20, y + 6);
            if (l.atividade) {
                doc.setFont(undefined, 'bold');
                doc.text(`Atividade: ${l.atividade}`, 20, y + 12);
                doc.setFont(undefined, 'normal');
                const lines = doc.splitTextToSize(l.descricao || '', 170);
                doc.text(lines, 20, y + 18);
                y += 20 + (lines.length - 1) * 5 + 6;
            } else {
                const lines = doc.splitTextToSize(l.descricao || '', 170);
                doc.text(lines, 20, y + 12);
                y += 14 + (lines.length - 1) * 5 + 6;
            }
        });

        doc.save(`relatorio-horas-${new Date().toISOString().split('T')[0]}.pdf`);
        this.mostrarToast('PDF exportado com sucesso!', 'success');
    },

    exportarRelatorio() {
        this.aplicarFiltros();
        setTimeout(() => this.exportarExcel(), 500);
    }

});
