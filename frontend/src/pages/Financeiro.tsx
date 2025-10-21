import React, { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '../lib/supabase';

interface Paciente { id: number; nome: string }
interface Lancamento {
  id: number;
  paciente_id: number;
  descricao: string | null;
  valor: number | null;
  status: 'pago' | 'pendente' | string | null;
  data_vencimento: string | null; // YYYY-MM-DD
  data_pagamento: string | null; // YYYY-MM-DD | null
}

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const formatCurrency = (value: any) => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  try { return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  catch { return String(value); }
};

const Financeiro: React.FC = () => {
  const supabase = useMemo(() => getSupabase(), []);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, setLoading] = useState<boolean>(true);

  // filtros
  const [pacienteIdFiltro, setPacienteIdFiltro] = useState<number | ''>('' as any);
  const [statusFiltro, setStatusFiltro] = useState<string>('');

  // novo lançamento
  const [showNovo, setShowNovo] = useState(false);
  const [novoPacienteId, setNovoPacienteId] = useState<number | ''>('' as any);
  const [novoDescricao, setNovoDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novoVencimento, setNovoVencimento] = useState(todayISO());
  const [novoStatus, setNovoStatus] = useState<'pago'|'pendente'>('pendente');
  const [novoPagamento, setNovoPagamento] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!supabase) { setError('Supabase não configurado.'); setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const { data: pData, error: pErr } = await supabase
          .from('pacientes')
          .select('id, nome')
          .order('nome');
        if (pErr) throw pErr;
        setPacientes((pData ?? []) as Paciente[]);

        const { data: lData, error: lErr } = await supabase
          .from('financeiro')
          .select('id, paciente_id, descricao, valor, status, data_vencimento, data_pagamento')
          .order('data_vencimento', { ascending: false });
        if (lErr) throw lErr;
        setLancamentos((lData ?? []) as Lancamento[]);
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase]);

  const filtrados = lancamentos.filter(l => {
    const byPaciente = pacienteIdFiltro ? l.paciente_id === Number(pacienteIdFiltro) : true;
    const byStatus = statusFiltro ? (l.status === statusFiltro) : true;
    return byPaciente && byStatus;
  });

  const totals = {
    pendente: filtrados.filter(l => (l.status ?? 'pendente') === 'pendente').reduce((sum, l) => sum + (Number(l.valor) || 0), 0),
    pago: filtrados.filter(l => l.status === 'pago').reduce((sum, l) => sum + (Number(l.valor) || 0), 0),
  };

  const nomePaciente = (id: number) => pacientes.find(p => p.id === id)?.nome || 'Paciente';

  const criarLancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { setError('Supabase não configurado'); return; }
    if (!novoPacienteId) { setError('Selecione o paciente'); return; }
    setSalvando(true);
    setError(null);
    try {
      const payload = {
        paciente_id: Number(novoPacienteId),
        descricao: novoDescricao || null,
        valor: novoValor ? parseFloat(novoValor) : null,
        status: novoStatus,
        data_vencimento: novoVencimento || todayISO(),
        data_pagamento: novoStatus === 'pago' ? (novoPagamento || todayISO()) : null,
      };
      const { data, error: insErr } = await supabase
        .from('financeiro')
        .insert(payload)
        .select();
      if (insErr) throw insErr;
      setLancamentos([...(data ?? []) as Lancamento[], ...lancamentos]);
      setShowNovo(false);
      setNovoPacienteId('' as any);
      setNovoDescricao('');
      setNovoValor('');
      setNovoVencimento(todayISO());
      setNovoStatus('pendente');
      setNovoPagamento('');
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setSalvando(false);
    }
  };

  const marcarPago = async (l: Lancamento) => {
    if (!supabase) return;
    try {
      const { error: updErr } = await supabase
        .from('financeiro')
        .update({ status: 'pago', data_pagamento: todayISO() })
        .eq('id', l.id);
      if (updErr) throw updErr;
      setLancamentos(lancamentos.map(x => x.id === l.id ? { ...x, status: 'pago', data_pagamento: todayISO() } : x));
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-3">Financeiro</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filtros e totais */}
      <div className="card mb-3 shadow-sm">
        <div className="card-body">
          <div className="row align-items-end">
            <div className="col-md-4 mb-3">
              <label className="form-label">Paciente</label>
              <select className="form-select" value={pacienteIdFiltro} onChange={(e) => setPacienteIdFiltro(Number(e.target.value)||'' as any)}>
                <option value="">Todos</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Status</label>
              <select className="form-select" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </div>
            <div className="col-md-4 mb-3 text-end">
              <div>
                <span className="badge text-bg-warning me-2">Pendente: {formatCurrency(totals.pendente)}</span>
                <span className="badge text-bg-success">Pago: {formatCurrency(totals.pago)}</span>
              </div>
            </div>
          </div>
          <button className="btn btn-outline-success" onClick={() => setShowNovo(s => !s)}>
            {showNovo ? 'Fechar' : 'Novo Lançamento'}
          </button>
        </div>
      </div>

      {/* Form novo lançamento */}
      {showNovo && (
        <div className="card mb-4 shadow-sm">
          <div className="card-body">
            <h5 className="card-title">Novo Lançamento</h5>
            <form onSubmit={criarLancamento}>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Paciente *</label>
                  <select className="form-select" value={novoPacienteId} onChange={(e) => setNovoPacienteId(Number(e.target.value))} required>
                    <option value="">Selecione...</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Vencimento *</label>
                  <input type="date" className="form-control" value={novoVencimento} onChange={(e) => setNovoVencimento(e.target.value)} required />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Valor *</label>
                  <input type="number" step="0.01" className="form-control" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} required />
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Descrição</label>
                  <input type="text" className="form-control" value={novoDescricao} onChange={(e) => setNovoDescricao(e.target.value)} />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Status *</label>
                  <select className="form-select" value={novoStatus} onChange={(e) => setNovoStatus(e.target.value as 'pago'|'pendente')} required>
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Data de Pagamento</label>
                  <input type="date" className="form-control" value={novoPagamento} onChange={(e) => setNovoPagamento(e.target.value)} disabled={novoStatus !== 'pago'} />
                </div>
              </div>
              <button type="submit" className="btn btn-success" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Lista de lançamentos */}
      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Lançamentos</h5>
          <div className="table-responsive">
            <table className="table table-sm table-striped table-hover">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Pagamento</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(l => (
                  <tr key={l.id}>
                    <td>{nomePaciente(l.paciente_id)}</td>
                    <td>{l.descricao ?? '-'}</td>
                    <td>{l.data_vencimento ?? '-'}</td>
                    <td>{formatCurrency(l.valor)}</td>
                    <td>{l.status === 'pago' ? (<span className="badge bg-success">Pago</span>) : (<span className="badge bg-warning text-dark">Pendente</span>)}</td>
                    <td>{l.data_pagamento ?? '-'}</td>
                    <td>
                      {l.status !== 'pago' && (
                        <button className="btn btn-sm btn-outline-success" onClick={() => marcarPago(l)}>
                          Marcar como Pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted fst-italic">Nenhum lançamento encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Financeiro;