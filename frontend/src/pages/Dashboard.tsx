import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

interface AgendamentoHojeItem {
  id: number;
  paciente_id: number;
  servico: string | null;
  data: string; // ISO date (YYYY-MM-DD)
  hora: string | null; // HH:MM:SS or null
  status: string | null;
  observacoes: string | null;
  nome?: string; // paciente nome resolved
}

function formatHora(hora: string | null): string {
  if (!hora) return 'N/A';
  try {
    const [h, m] = hora.split(':');
    return `${h}:${m}`;
  } catch {
    return hora;
  }
}

function statusClasses(status: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'confirmado') return { border: 'border-success', badge: 'bg-success' };
  if (s === 'agendado') return { border: 'border-primary', badge: 'bg-primary' };
  if (s === 'realizado') return { border: 'border-secondary', badge: 'bg-secondary' };
  if (s === 'cancelado') return { border: 'border-danger', badge: 'bg-danger' };
  if (s === 'não compareceu' || s === 'nao compareceu') return { border: 'border-warning', badge: 'bg-warning text-dark' };
  return { border: 'border-info', badge: 'bg-info text-dark' };
}

function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const Dashboard: React.FC = () => {
  const [totalPacientes, setTotalPacientes] = useState<number | null>(null);
  const [totalAgendamentos, setTotalAgendamentos] = useState<number | null>(null);
  const [consultasHoje, setConsultasHoje] = useState<number | null>(null);
  const [agendamentosHojeLista, setAgendamentosHojeLista] = useState<AgendamentoHojeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const supabase = useMemo(() => getSupabase(), []);

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setError('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const today = todayISO();

        // Contagem de pacientes
        const { count: pacientesCount, error: pacientesErr } = await supabase
          .from('pacientes')
          .select('*', { count: 'exact', head: true });
        if (pacientesErr) throw pacientesErr;
        setTotalPacientes(pacientesCount ?? 0);

        // Contagem de agendamentos
        const { count: agendamentosCount, error: agendamentosErr } = await supabase
          .from('agendamentos')
          .select('*', { count: 'exact', head: true });
        if (agendamentosErr) throw agendamentosErr;
        setTotalAgendamentos(agendamentosCount ?? 0);

        // Agendamentos de hoje
        const { data: agHoje, error: agHojeErr } = await supabase
          .from('agendamentos')
          .select('id, paciente_id, servico, data, hora, status, observacoes')
          .eq('data', today)
          .order('hora', { ascending: true });
        if (agHojeErr) throw agHojeErr;
        setConsultasHoje(agHoje?.length ?? 0);

        let lista: AgendamentoHojeItem[] = (agHoje ?? []) as AgendamentoHojeItem[];
        // Resolver nomes dos pacientes
        const ids = Array.from(new Set(lista.map((a) => a.paciente_id).filter(Boolean))) as number[];
        if (ids.length > 0) {
          const { data: pacientesData, error: pacientesDataErr } = await supabase
            .from('pacientes')
            .select('id, nome')
            .in('id', ids);
          if (pacientesDataErr) throw pacientesDataErr;
          const map = new Map<number, string>();
          (pacientesData ?? []).forEach((p: any) => map.set(p.id, p.nome));
          lista = lista.map((a) => ({ ...a, nome: map.get(a.paciente_id) }));
        }
        setAgendamentosHojeLista(lista);
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase]);

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Dashboard - SisDental</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="card h-100 p-3 shadow">
            <div className="d-flex align-items-center">
              <div className="me-3"><i className="fas fa-users fa-2x text-primary"></i></div>
              <div>
                <h5>Total de Pacientes</h5>
                <h3>{loading ? '...' : (totalPacientes ?? 'N/A')}</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card h-100 p-3 shadow">
            <div className="d-flex align-items-center">
              <div className="me-3"><i className="fas fa-calendar-day fa-2x text-success"></i></div>
              <div>
                <h5>Consultas do Dia</h5>
                <h3>{loading ? '...' : (consultasHoje ?? 'N/A')}</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card h-100 p-3 shadow">
            <div className="d-flex align-items-center">
              <div className="me-3"><i className="fas fa-clock fa-2x text-warning"></i></div>
              <div>
                <h5>Total de Agendamentos</h5>
                <h3>{loading ? '...' : (totalAgendamentos ?? 'N/A')}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4 shadow">
        <div className="card-body">
          <h5 className="card-title mb-3">Agendamentos de Hoje</h5>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
            {agendamentosHojeLista.length === 0 ? (
              <div className="col">
                <div className="text-center text-muted fst-italic">Nenhum agendamento para hoje.</div>
              </div>
            ) : (
              agendamentosHojeLista.map((ag) => {
                const cls = statusClasses(ag.status);
                return (
                  <div className="col" key={ag.id}>
                    <div className={`card h-100 shadow-sm border-0 border-start ${cls.border} border-5`}>
                      <div className="card-body d-flex flex-column">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="display-6 fw-bold">{formatHora(ag.hora)}</span>
                          <span className={`badge ${cls.badge}`}>{ag.status ?? 'Sem status'}</span>
                        </div>
                        <div className="mb-1">
                          <i className="fas fa-user text-muted me-2"></i>
                          <Link to={`/pacientes/${ag.paciente_id}/detalhes`} className="text-decoration-none">{ag.nome ?? 'Paciente'}</Link>
                        </div>
                        <div className="text-muted mb-2">{ag.servico ?? '-'}</div>
                        {ag.observacoes && <div className="small text-muted"><i className="fas fa-sticky-note me-1"></i>{ag.observacoes}</div>}
                        <div className="mt-auto text-end">
                          <Link to={`/pacientes/${ag.paciente_id}/detalhes`} className="btn btn-outline-success btn-sm">
                            <i className="fas fa-play me-1"></i> Iniciar Consulta
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="text-center mt-3">
            <Link to="/agendamentos">Ver todos os agendamentos</Link>
          </div>
        </div>
      </div>

      <div className="card shadow">
        <div className="card-body">
          <h5 className="card-title mb-3">Ações Rápidas</h5>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/pacientes" className="btn btn-outline-primary">
              <i className="fas fa-user-plus"></i> Pacientes
            </Link>
            <Link to="/agendamentos/cadastrar" className="btn btn-outline-success">
              <i className="fas fa-calendar-plus"></i> Nova Consulta
            </Link>
            <Link to="/register" className="btn btn-outline-info">
              <i className="fas fa-user-plus"></i> Novo Usuário
            </Link>
            <Link to="/financeiro" className="btn btn-outline-warning">
              <i className="fas fa-calendar-alt"></i> Financeiro
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;