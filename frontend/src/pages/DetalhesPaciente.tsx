import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

interface Paciente { id: number; nome: string; cpf?: string | null; telefone?: string | null; email?: string | null; data_nascimento?: string | null; }
interface Tratamento { id: number; data_tratamento?: string | null; dente_numero?: number | null; dente_numeros?: number[] | null; tipo_tratamento?: string | null; valor?: number | null; concluido?: boolean | null; observacoes?: string | null; dentista?: string | null; orcamento_id?: number | null }
interface Lancamento { id: number; data_vencimento?: string | null; descricao?: string | null; valor?: number | null; status?: string | null; data_pagamento?: string | null; }
interface Agendamento { id: number; data?: string | null; hora?: string | null; servico?: string | null; status?: string | null; }

// Helpers locais para categorização de tratamento e paleta de cores
const tipoCategoriaLocal = (tipo?: string | null) => {
  const t = (tipo || '').toLowerCase();
  if (t.includes('rest')) return 'restauracao';
  if (t.includes('endo') || t.includes('canal')) return 'endodontia';
  if (t.includes('extran') || t.includes('extra')) return 'extracao';
  if (t.includes('coroa') || t.includes('prot') || t.includes('lente')) return 'protetico';
  if (t.includes('peri') || t.includes('geng')) return 'periodontal';
  return 'outros';
};
const corPorCategoriaLocal: Record<string, string> = {
  restauracao: '#60a5fa',
  endodontia: '#a78bfa',
  extracao: '#ef4444',
  protetico: '#f59e0b',
  periodontal: '#10b981',
  outros: '#6b7280',
};

const DetalhesPaciente: React.FC = () => {
  const { id } = useParams();
  const supabase = useMemo(() => getSupabase(), []);

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [financeiro, setFinanceiro] = useState<Lancamento[]>([]);
  const [agendamentosFuturos, setAgendamentosFuturos] = useState<Agendamento[]>([]);
  const [tab, setTab] = useState<'tratamentos'|'financeiro'|'agendamentos'>('tratamentos');
  const [error, setError] = useState<string | null>(null);
  const [, setLoading] = useState<boolean>(true);
  const [buscaTrat, setBuscaTrat] = useState('');
  const [statusTrat, setStatusTrat] = useState<string>('Todos');

  useEffect(() => {
    const load = async () => {
      if (!supabase || !id) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const pacienteId = Number(id);
        const { data: p, error: pErr } = await supabase
          .from('pacientes')
          .select('id, nome, cpf, telefone, email, data_nascimento')
          .eq('id', pacienteId)
          .single();
        if (pErr) throw pErr;
        setPaciente(p as Paciente);

        const { data: tData, error: tErr } = await supabase
          .from('odontograma_tratamentos')
          .select('id, data_tratamento, dente_numero, dente_numeros, tipo_tratamento, valor, concluido, observacoes, dentista, orcamento_id')
          .eq('paciente_id', pacienteId)
          .order('data_tratamento', { ascending: false });
        if (tErr) throw tErr;
        setTratamentos((tData ?? []) as Tratamento[]);

        const { data: fData, error: fErr } = await supabase
          .from('financeiro')
          .select('id, data_vencimento, descricao, valor, status, data_pagamento')
          .eq('paciente_id', pacienteId)
          .order('data_vencimento', { ascending: false });
        if (fErr) throw fErr;
        setFinanceiro((fData ?? []) as Lancamento[]);

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayISO = `${year}-${month}-${day}`;
        const { data: aData, error: aErr } = await supabase
          .from('agendamentos')
          .select('id, data, hora, servico, status')
          .eq('paciente_id', pacienteId)
          .gte('data', todayISO)
          .order('data', { ascending: true })
          .order('hora', { ascending: true });
        if (aErr) throw aErr;
        setAgendamentosFuturos((aData ?? []) as Agendamento[]);
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase, id]);

  const formatCurrency = (value: any) => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    try {
      return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } catch { return String(value); }
  };
  const tratamentosFiltrados = useMemo(() => {
    const term = (buscaTrat || '').toLowerCase();
    return tratamentos.filter(t => {
      const matchBusca = !term || (t.tipo_tratamento || '').toLowerCase().includes(term) || (t.observacoes || '').toLowerCase().includes(term);
      const matchStatus = statusTrat === 'Todos' || (statusTrat === 'Concluído' ? Boolean(t.concluido) : !t.concluido);
      return matchBusca && matchStatus;
    });
  }, [tratamentos, buscaTrat, statusTrat]);

  return (
    <div className="container mt-4">
      {error && <div className="alert alert-danger">{error}</div>}
      {!paciente ? (
        <h4>Carregando...</h4>
      ) : (
        <>
          <div className="card mb-4 shadow-sm">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0"><i className="fas fa-user me-2"></i>{paciente.nome}</h4>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>CPF:</strong> {paciente.cpf || 'Não informado'}</p>
                  <p><strong>Data de Nascimento:</strong> {paciente.data_nascimento || 'Não informada'}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Telefone:</strong> {paciente.telefone || 'Não informado'}</p>
                  <p><strong>Email:</strong> {paciente.email || 'Não informado'}</p>
                </div>
              </div>
              <div className="mt-3 border-top pt-3">
                <h5>Ações Rápidas:</h5>
                <Link to={`/odontograma/${paciente.id}`} className="btn btn-secondary me-2 mb-2">
                  <i className="fas fa-tooth me-1"></i> Ver Odontograma
                </Link>
                <Link to={`/pacientes/${paciente.id}/documentos`} className="btn btn-info me-2 mb-2">
                  <i className="fas fa-file-alt me-1"></i> Documentos
                </Link>
                <Link to={`/pacientes/${paciente.id}/editar`} className="btn btn-warning mb-2">
                  <i className="fas fa-edit me-1"></i> Editar Cadastro
                </Link>
              </div>
            </div>
          </div>

          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button className={`nav-link ${tab==='tratamentos'?'active':''}`} onClick={() => setTab('tratamentos')}>
                <i className="fas fa-notes-medical me-1"></i> Tratamentos Odontológicos
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${tab==='financeiro'?'active':''}`} onClick={() => setTab('financeiro')}>
                <i className="fas fa-dollar-sign me-1"></i> Histórico Financeiro
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${tab==='agendamentos'?'active':''}`} onClick={() => setTab('agendamentos')}>
                <i className="fas fa-calendar-alt me-1"></i> Próximos Agendamentos
              </button>
            </li>
          </ul>

          {tab === 'tratamentos' && (
            <div>
              <h5>Histórico de Tratamentos</h5>
              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <input className="form-control" placeholder="Buscar por procedimento ou observações" value={buscaTrat} onChange={(e) => setBuscaTrat(e.target.value)} />
                </div>
                <div className="col-md-3">
                  <select className="form-select" value={statusTrat} onChange={(e) => setStatusTrat(e.target.value)}>
                    <option>Todos</option>
                    <option>Concluído</option>
                    <option>Em andamento</option>
                  </select>
                </div>
              </div>
              {tratamentosFiltrados.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-striped table-hover">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Dente</th>
                        <th>Procedimento</th>
                        <th>Valor</th>
                        <th>Status</th>
                        <th>Observações</th>
                        <th>Dentista</th>
                        <th>Orçamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tratamentosFiltrados.map(t => (
                        <tr key={t.id}>
                          <td>{t.data_tratamento || '-'}</td>
                          <td>{t.dente_numero ?? (t.dente_numeros?.join(', ') || '-')}</td>
                          <td>{t.tipo_tratamento || '-'}</td>
                          <td>{formatCurrency(t.valor)}</td>
                          <td>{t.concluido ? 'Concluído' : 'Em andamento'}</td>
                          <td>{t.observacoes || '-'}</td>
                          <td>{t.dentista || '-'}</td>
                          <td>{t.orcamento_id ? (<Link to={`/orcamentos/${t.orcamento_id}`}>#{t.orcamento_id}</Link>) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">Nenhum tratamento encontrado para os filtros aplicados.</p>
              )}
            </div>
          )}

          {tab === 'financeiro' && (
            <div>
              <h5>Histórico Financeiro</h5>
              {financeiro.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-striped table-hover">
                    <thead>
                      <tr>
                        <th>Vencimento</th>
                        <th>Descrição</th>
                        <th>Valor (R$)</th>
                        <th>Status</th>
                        <th>Data Pagamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financeiro.map((f) => (
                        <tr key={f.id}>
                          <td>{f.data_vencimento ?? '-'}</td>
                          <td>{f.descricao ?? '-'}</td>
                          <td>{formatCurrency(f.valor)}</td>
                          <td>{f.status === 'pago' ? (
                            <span className="badge bg-success">Pago</span>
                          ) : (
                            <span className="badge bg-warning text-dark">Pendente</span>
                          )}</td>
                          <td>{f.data_pagamento ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">Nenhum lançamento financeiro encontrado.</p>
              )}
            </div>
          )}

          {tab === 'agendamentos' && (
            <div>
              <h5>Próximos Agendamentos</h5>
              {agendamentosFuturos.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-striped table-hover">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Hora</th>
                        <th>Serviço</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agendamentosFuturos.map((a) => (
                        <tr key={a.id}>
                          <td>{a.data ?? '-'}</td>
                          <td>{(a.hora ?? '').slice(0,5) || '-'}</td>
                          <td>{a.servico ?? '-'}</td>
                          <td>{a.status ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">Nenhum agendamento futuro encontrado.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DetalhesPaciente;