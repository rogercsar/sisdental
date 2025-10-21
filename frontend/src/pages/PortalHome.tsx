import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

interface Paciente { id: number; nome: string; cpf?: string | null; email?: string | null; telefone?: string | null }
interface Tratamento { id: number; data_tratamento?: string | null; dente_numero?: number | null; tipo_tratamento?: string | null; valor?: number | null; concluido?: boolean | null; observacoes?: string | null }
interface Lancamento { id: number; descricao?: string | null; valor?: number | null; status?: string | null; data_vencimento?: string | null; data_pagamento?: string | null }
interface Agendamento { id: number; data?: string | null; hora?: string | null; servico?: string | null; status?: string | null }
interface Documento { id: number; tipo_documento?: string | null; data_geracao?: string | null; nome_arquivo?: string | null; storage_path?: string | null; descricao?: string | null }

const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const formatCurrency = (value: any) => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  try { return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); } catch { return String(value); }
};

const PortalHome: React.FC = () => {
  const supabase = useMemo(() => getSupabase(), []);
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [financeiro, setFinanceiro] = useState<Lancamento[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, setLoading] = useState<boolean>(true);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [docsLoading, setDocsLoading] = useState<boolean>(false);

  useEffect(() => {
    const idStr = localStorage.getItem('portalPacienteId');
    if (!idStr) { navigate('/portal/login'); return; }
    const id = Number(idStr);

    const load = async () => {
      if (!supabase) { setError('Supabase não configurado.'); setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const { data: p, error: pErr } = await supabase
          .from('pacientes')
          .select('id, nome, cpf, email, telefone')
          .eq('id', id)
          .single();
        if (pErr) throw pErr;
        setPaciente(p as Paciente);

        const { data: tData, error: tErr } = await supabase
          .from('odontograma_tratamentos')
          .select('id, data_tratamento, dente_numero, tipo_tratamento, valor, concluido, observacoes')
          .eq('paciente_id', id)
          .order('data_tratamento', { ascending: false });
        if (tErr) throw tErr;
        setTratamentos((tData ?? []) as Tratamento[]);

        const { data: fData, error: fErr } = await supabase
          .from('financeiro')
          .select('id, descricao, valor, status, data_vencimento, data_pagamento')
          .eq('paciente_id', id)
          .order('data_vencimento', { ascending: false });
        if (fErr) throw fErr;
        setFinanceiro((fData ?? []) as Lancamento[]);

        const { data: aData, error: aErr } = await supabase
          .from('agendamentos')
          .select('id, data, hora, servico, status')
          .eq('paciente_id', id)
          .gte('data', todayISO())
          .order('data', { ascending: true })
          .order('hora', { ascending: true });
        if (aErr) throw aErr;
        setAgendamentos((aData ?? []) as Agendamento[]);

        // Documentos do paciente
        setDocsLoading(true);
        const { data: dData, error: dErr } = await supabase
          .from('documentos_paciente')
          .select('id, tipo_documento, data_geracao, nome_arquivo, storage_path, descricao')
          .eq('paciente_id', id)
          .order('data_geracao', { ascending: false });
        if (dErr) throw dErr;
        setDocumentos((dData ?? []) as Documento[]);
        setDocsLoading(false);
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase, navigate]);

  const logout = () => {
    localStorage.removeItem('portalPacienteId');
    navigate('/portal/login');
  };

  const visualizarDocumento = async (doc: Documento) => {
    if (!supabase || !doc.storage_path) return;
    try {
      const { data } = supabase.storage
        .from('documentos')
        .getPublicUrl(doc.storage_path);
      if (data?.publicUrl) window.open(data.publicUrl, '_blank');
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0"><i className="fas fa-home me-2"></i>Portal do Paciente</h3>
        <button className="btn btn-outline-secondary" onClick={logout}>Sair</button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {!paciente ? (
        <p>Carregando...</p>
      ) : (
        <>
          <div className="card mb-4 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Bem-vindo, {paciente.nome}</h5>
              <p className="text-muted">CPF: {paciente.cpf || '-'} | Email: {paciente.email || '-'} | Telefone: {paciente.telefone || '-'}</p>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title"><i className="fas fa-tooth me-2"></i>Tratamentos</h5>
                  {tratamentos.length === 0 ? (
                    <p className="text-muted">Você não possui tratamentos registrados.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-striped table-hover">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Dente</th>
                            <th>Tratamento</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tratamentos.slice(0, 8).map(t => (
                            <tr key={t.id}>
                              <td>{t.data_tratamento ?? '-'}</td>
                              <td>{t.dente_numero ?? '-'}</td>
                              <td>{t.tipo_tratamento ?? '-'}</td>
                              <td>{t.concluido ? (<span className="badge bg-success">Concluído</span>) : (<span className="badge bg-warning text-dark">Em andamento</span>)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title"><i className="fas fa-dollar-sign me-2"></i>Financeiro</h5>
                  <div className="mb-2">
                    <span className="badge text-bg-warning me-2">Pendente: {formatCurrency(financeiro.filter(f => (f.status ?? 'pendente') === 'pendente').reduce((sum, f) => sum + (Number(f.valor) || 0), 0))}</span>
                    <span className="badge text-bg-success">Pago: {formatCurrency(financeiro.filter(f => f.status === 'pago').reduce((sum, f) => sum + (Number(f.valor) || 0), 0))}</span>
                  </div>
                  {financeiro.length === 0 ? (
                    <p className="text-muted">Você não possui lançamentos financeiros.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-striped table-hover">
                        <thead>
                          <tr>
                            <th>Vencimento</th>
                            <th>Descrição</th>
                            <th>Valor</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financeiro.slice(0, 8).map(f => (
                            <tr key={f.id}>
                              <td>{f.data_vencimento ?? '-'}</td>
                              <td>{f.descricao ?? '-'}</td>
                              <td>{formatCurrency(f.valor)}</td>
                              <td>{f.status === 'pago' ? (<span className="badge bg-success">Pago</span>) : (<span className="badge bg-warning text-dark">Pendente</span>)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title"><i className="fas fa-calendar-alt me-2"></i>Próximos Agendamentos</h5>
                  {agendamentos.length === 0 ? (
                    <p className="text-muted">Você não possui agendamentos futuros.</p>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {agendamentos.slice(0, 8).map(a => (
                        <li key={a.id} className="list-group-item d-flex justify-content-between align-items-center">
                          <span><strong>{a.data ?? '-'}</strong> às {((a.hora ?? '').slice(0,5)) || '-'} — {a.servico ?? '-'}</span>
                          <span className="badge text-bg-primary">{a.status ?? '-'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h5 className="card-title"><i className="fas fa-file-alt me-2"></i>Documentos</h5>
                  {docsLoading ? (
                    <p>Carregando documentos...</p>
                  ) : documentos.length === 0 ? (
                    <p className="text-muted">Você não possui documentos registrados.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-striped table-hover">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Arquivo</th>
                            <th style={{ width: 120 }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documentos.slice(0, 8).map(d => (
                            <tr key={d.id}>
                              <td>{d.data_geracao ?? '-'}</td>
                              <td>{d.tipo_documento ?? '-'}</td>
                              <td>{d.nome_arquivo ?? '-'}</td>
                              <td>
                                <button className="btn btn-outline-primary btn-sm" onClick={() => visualizarDocumento(d)} title="Ver documento">
                                  <i className="fas fa-eye"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-muted small mt-2">Apenas visualização. Upload e exclusão são feitos pela clínica.</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PortalHome;