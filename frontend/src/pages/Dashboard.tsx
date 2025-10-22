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
    return hora as string;
  }
}

function statusClasses(status: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'confirmado') return { border: 'border-success', badge: 'bg-success' };
  if (s === 'agendado') return { border: 'border-primary', badge: 'bg-primary' };
  if (s === 'realizado') return { border: 'border-secondary', badge: 'bg-secondary' };
  if (s === 'cancelado') return { border: 'border-danger', badge: 'bg-danger' };
  if (s === 'chegou') return { border: 'border-info', badge: 'bg-info text-dark' };
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

// Destaque por proximidade
function parseDateTimeISO(dateISO: string, hora: string | null): Date {
  const base = `${dateISO}T${(hora || '00:00').slice(0,5)}:00`;
  return new Date(base);
}
function timingCategory(a: AgendamentoHojeItem): 'distante'|'proxima'|'atraso'|'normal' {
  const now = new Date();
  const dt = parseDateTimeISO(a.data, a.hora);
  const diffMin = Math.round((dt.getTime() - now.getTime()) / 60000);
  const s = (a.status || '').toLowerCase();
  const isConcluido = s === 'realizado' || s === 'cancelado';
  if (isConcluido) return 'normal';
  if (diffMin >= 45) return 'distante';
  if (diffMin >= 0 && diffMin < 45) return 'proxima';
  if (diffMin < 0 && (s === 'agendado' || s === 'confirmado')) return 'atraso';
  return 'normal';
}
function timingBadge(t: 'distante'|'proxima'|'atraso'|'normal') {
  if (t === 'distante') return <span className="badge bg-info text-dark ms-2">Distante</span>;
  if (t === 'proxima') return <span className="badge bg-warning text-dark ms-2">Próxima</span>;
  if (t === 'atraso') return <span className="badge bg-danger ms-2">Atraso</span>;
  return null;
}
function mergeStatusWithTiming(status: string | null, t: 'distante'|'proxima'|'atraso'|'normal') {
  const base = statusClasses(status);
  if (t === 'atraso') return { border: 'border-danger', badge: base.badge };
  if (t === 'proxima') return { border: 'border-warning', badge: base.badge };
  if (t === 'distante') return { border: 'border-info', badge: base.badge };
  return base;
}

const Dashboard: React.FC = () => {
  const [totalPacientes, setTotalPacientes] = useState<number | null>(null);
  const [totalAgendamentos, setTotalAgendamentos] = useState<number | null>(null);
  const [consultasHoje, setConsultasHoje] = useState<number | null>(null);
  const [agendamentosHojeLista, setAgendamentosHojeLista] = useState<AgendamentoHojeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'agenda' | 'cards' | 'calendario'>('calendario');
  const horasDia = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 8), []);
  const [checkinMsg, setCheckinMsg] = useState<string | null>(null);

  // Calendário
  const now = new Date();
  const [calYear, setCalYear] = useState<number>(now.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(now.getMonth()); // 0-11
  const [calDataMap, setCalDataMap] = useState<Map<string, AgendamentoHojeItem[]>>(new Map());
  const [calSelectedDate, setCalSelectedDate] = useState<string | null>(todayISO());

  const supabase = useMemo(() => getSupabase(), []);

  // Ação: marcar chegada (check-in)
  const marcarChegada = async (ag: AgendamentoHojeItem) => {
    try {
      if (!supabase) return;
      const { error: updErr } = await supabase
        .from('agendamentos')
        .update({ status: 'chegou' })
        .eq('id', ag.id);
      if (updErr) throw updErr;
      setAgendamentosHojeLista(prev => prev.map(x => x.id === ag.id ? { ...x, status: 'chegou' } : x));
      setCheckinMsg(`${ag.nome ?? 'Paciente'} indicou chegada • ${formatHora(ag.hora)}`);
      setTimeout(() => setCheckinMsg(null), 4000);
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  };

  // Navegação do calendário
  const changeMonth = (delta: number) => {
    let y = calYear;
    let m = calMonth + delta;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCalYear(y);
    setCalMonth(m);
  };

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

        // Contagem de agend
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

  // Carregar dados do mês para o calendário
  useEffect(() => {
    const loadMonth = async () => {
      try {
        if (!supabase) return;
        const startISO = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
        const endDay = new Date(calYear, calMonth + 1, 0).getDate();
        const endISO = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

        const { data: agMes, error: agMesErr } = await supabase
          .from('agendamentos')
          .select('id, paciente_id, servico, data, hora, status, observacoes')
          .gte('data', startISO)
          .lte('data', endISO)
          .order('data', { ascending: true })
          .order('hora', { ascending: true });
        if (agMesErr) throw agMesErr;

        let listaMes: AgendamentoHojeItem[] = (agMes ?? []) as AgendamentoHojeItem[];
        const idsMes = Array.from(new Set(listaMes.map((a) => a.paciente_id).filter(Boolean))) as number[];
        if (idsMes.length > 0) {
          const { data: pacientesDataMes } = await supabase
            .from('pacientes')
            .select('id, nome')
            .in('id', idsMes);
          const nomeMap = new Map<number, string>();
          (pacientesDataMes ?? []).forEach((p: any) => nomeMap.set(p.id, p.nome));
          listaMes = listaMes.map((a) => ({ ...a, nome: nomeMap.get(a.paciente_id) }));
        }

        const m = new Map<string, AgendamentoHojeItem[]>();
        for (const a of listaMes) {
          const key = a.data;
          const arr = m.get(key) ?? [];
          arr.push(a);
          m.set(key, arr);
        }
        setCalDataMap(m);
      } catch (e: any) {
        // Silenciar erros do calendário para não afetar o restante
        console.warn('Calendário: erro ao carregar mês', e);
      }
    };
    loadMonth();
  }, [supabase, calYear, calMonth]);

  const renderCalendario = () => {
    const firstWeekday = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const leading = Array(firstWeekday).fill(null) as (number | null)[];
    const dayNums = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const cells = [...leading, ...dayNums];
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const calCells = Array.from({ length: totalCells }, (_, idx) => cells[idx] ?? null) as (number | null)[];

    return (
      <div>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => changeMonth(-1)}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <h6 className="mb-0">
            {new Date(calYear, calMonth, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </h6>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => changeMonth(1)}>
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
        <div className="row row-cols-7 g-2">
          {Array.from({ length: Math.ceil(calCells.length / 7) }, (_, row) => (
            <React.Fragment key={row}>
              {calCells.slice(row * 7, row * 7 + 7).map((dayNum, idx) => {
                const dateKey = dayNum ? `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}` : `empty-${row}-${idx}`;
                const count = dayNum ? (calDataMap.get(dateKey)?.length ?? 0) : 0;
                const selected = dayNum ? (calSelectedDate === dateKey) : false;
                return (
                  <div key={dateKey} className="col">
                    {dayNum ? (
                      <button
                        className={`w-100 btn btn-sm ${selected ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setCalSelectedDate(dateKey)}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <span>{dayNum}</span>
                          <span className="badge bg-secondary">{count}</span>
                        </div>
                      </button>
                    ) : (
                      <div className="w-100 btn btn-sm btn-light" style={{ visibility: 'hidden' }}>0</div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        {calSelectedDate && (
          <div className="mt-3">
            <h6 className="mb-2">Agendamentos em {new Date(calSelectedDate).toLocaleDateString('pt-BR')}</h6>
            {((calDataMap.get(calSelectedDate) ?? []).length) === 0 ? (
              <div className="text-muted">Nenhum agendamento.</div>
            ) : (
              <ul className="list-group">
                {(calDataMap.get(calSelectedDate) ?? []).map((ag) => (
                  <li key={ag.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <span className="fw-bold me-2">{formatHora(ag.hora)}</span>
                      <span className="me-2">{ag.nome ?? 'Paciente'}</span>
                      <span className="text-muted">{ag.servico ?? '-'}</span>
                    </div>
                    <div className="d-flex gap-2">
                      <button onClick={() => marcarChegada(ag)} className="btn btn-outline-info btn-sm">
                        <i className="fas fa-walking me-1"></i> Cheguei
                      </button>
                      <Link to={`/consulta/${ag.id}`} className="btn btn-outline-success btn-sm">
                        <i className="fas fa-play me-1"></i> Abrir
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Dashboard - SisDental</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {checkinMsg && <div className="alert alert-success">{checkinMsg}</div>}

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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title mb-0">Agendamentos de Hoje</h5>
            <div className="btn-group btn-group-sm" role="group" aria-label="Modo de visualização">
              <button className={`btn btn-outline-primary ${viewMode === 'agenda' ? 'active' : ''}`} onClick={() => setViewMode('agenda')}>
                <i className="fas fa-clock me-1"></i> Agenda
              </button>
              <button className={`btn btn-outline-primary ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')}>
                <i className="fas fa-th-large me-1"></i> Cards
              </button>
              <button className={`btn btn-outline-primary ${viewMode === 'calendario' ? 'active' : ''}`} onClick={() => setViewMode('calendario')}>
                <i className="fas fa-calendar me-1"></i> Calendário
              </button>
            </div>
          </div>

          {agendamentosHojeLista.length === 0 ? (
            <div className="text-center text-muted fst-italic">Nenhum agendamento para hoje.</div>
          ) : viewMode === 'agenda' ? (
            <div className="list-group">
              {horasDia.map((h) => {
                const items = agendamentosHojeLista.filter(a => (a.hora ?? '').slice(0,2) === String(h).padStart(2, '0'));
                return (
                  <div key={h} className="list-group-item">
                    <div className="d-flex">
                      <div className="text-muted me-3" style={{ width: '64px' }}>
                        <strong>{String(h).padStart(2, '0')}:00</strong>
                      </div>
                      <div className="flex-grow-1">
                        {items.length === 0 ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <div className="d-flex flex-column gap-2">
                            {items.map(ag => {
                              const tCat = timingCategory(ag);
                              const cls = mergeStatusWithTiming(ag.status, tCat);
                              return (
                                <div key={ag.id} className={`p-2 border rounded ${cls.border.replace('border-', 'border border-')}`}>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                      <span className="badge bg-light text-dark me-2">{formatHora(ag.hora)}</span>
                                      <strong>{ag.nome ?? 'Paciente'}</strong> — <span className="text-muted">{ag.servico ?? '-'}</span>
                                      {timingBadge(tCat)}
                                    </div>
                                    <span className={`badge ${cls.badge}`}>{ag.status ?? 'Sem status'}</span>
                                  </div>
                                  {ag.observacoes && <div className="small text-muted mt-1"><i className="fas fa-sticky-note me-1"></i>{ag.observacoes}</div>}
                                  <div className="d-flex justify-content-end gap-2 mt-2">
                                    <button onClick={() => marcarChegada(ag)} className="btn btn-outline-info btn-sm">
                                      <i className="fas fa-walking me-1"></i> Cheguei
                                    </button>
                                    <Link to={`/consulta/${ag.id}`} className="btn btn-outline-success btn-sm"><i className="fas fa-play me-1"></i> Iniciar Consulta</Link>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'calendario' ? (
            renderCalendario()
          ) : (
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
              {agendamentosHojeLista.map((ag) => {
                const tCat = timingCategory(ag);
                const cls = mergeStatusWithTiming(ag.status, tCat);
                return (
                  <div className="col" key={ag.id}>
                    <div className={`card h-100 shadow-sm border-0 border-start ${cls.border} border-5`}>
                      <div className="card-body d-flex flex-column">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="d-flex align-items-center">
                            <span className="display-6 fw-bold">{formatHora(ag.hora)}</span>
                            {timingBadge(tCat)}
                          </div>
                          <span className={`badge ${cls.badge}`}>{ag.status ?? 'Sem status'}</span>
                        </div>
                        <div className="mb-1">
                          <i className="fas fa-user text-muted me-2"></i>
                          <Link to={`/pacientes/${ag.paciente_id}/detalhes`} className="text-decoration-none">{ag.nome ?? 'Paciente'}</Link>
                        </div>
                        <div className="text-muted mb-2">{ag.servico ?? '-'}</div>
                        {ag.observacoes && <div className="small text-muted"><i className="fas fa-sticky-note me-1"></i>{ag.observacoes}</div>}
                        <div className="mt-auto d-flex justify-content-end gap-2">
                          <button onClick={() => marcarChegada(ag)} className="btn btn-outline-info btn-sm">
                            <i className="fas fa-walking me-1"></i> Cheguei
                          </button>
                          <Link to={`/consulta/${ag.id}`} className="btn btn-outline-success btn-sm">
                            <i className="fas fa-play me-1"></i> Iniciar Consulta
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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