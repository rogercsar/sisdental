import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'

interface Agendamento {
  id: number
  paciente_id: number
  data: string
  hora?: string | null
  status?: string | null
  status_pagamento?: string | null
  valor_previsto?: number | null
  observacoes?: string | null
  servico?: string | null
}

interface PacienteRef {
  id: number
  nome?: string | null
  telefone?: string | null
}

function todayISO(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatHour(h: number) {
  return `${`${h}`.padStart(2, '0')}:00`
}

function formatCurrency(n?: number | null) {
  if (typeof n !== 'number') return '-'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function statusBadgeClass(s?: string | null) {
  const st = (s || '').toLowerCase()
  if (st.includes('confirm')) return 'bg-info'
  if (st.includes('concl') || st.includes('realiz')) return 'bg-success'
  if (st.includes('cancel')) return 'bg-danger'
  if (st.includes('pend')) return 'bg-warning'
  return 'bg-secondary'
}
function statusBorderClass(s?: string | null) {
  const st = (s || '').toLowerCase()
  if (st.includes('confirm')) return 'border-info'
  if (st.includes('concl') || st.includes('realiz')) return 'border-success'
  if (st.includes('cancel')) return 'border-danger'
  if (st.includes('pend')) return 'border-warning'
  return 'border-secondary'
}

const AgendamentosDia: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const [date, setDate] = useState<string>(todayISO())
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<string>('Todos')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pacientesMap, setPacientesMap] = useState<Record<number, PacienteRef>>({})
  const [loading, setLoading] = useState(false)
  const [servicoFiltro, setServicoFiltro] = useState<string>('Todos')

  const horasDia = useMemo(() => {
    const start = 7
    const end = 21
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [])

  async function load() {
    setLoading(true)
    try {
      const sb = getSupabase()
      if (!sb) { console.error('Supabase não está configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'); setLoading(false); return }
      const { data: ags, error } = await sb
        .from('agendamentos')
        .select('id, paciente_id, data, hora, status, status_pagamento, valor_previsto, observacoes, servico')
        .eq('data', date)
        .order('hora', { ascending: true })
      if (error) throw error
      setAgendamentos(ags || [])

      const pacienteIds = Array.from(new Set((ags || []).map(a => a.paciente_id)))
      if (pacienteIds.length) {
        const { data: pacs, error: errP } = await sb
          .from('pacientes')
          .select('id, nome, telefone')
          .in('id', pacienteIds)
        if (errP) throw errP
        const map: Record<number, PacienteRef> = {}
        ;(pacs || []).forEach(p => { map[p.id] = p })
        setPacientesMap(map)
      } else {
        setPacientesMap({})
      }
    } catch (e) {
      console.error('Erro ao carregar agendamentos do dia', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Inicializar a data a partir do query param ?data=YYYY-MM-DD, se presente
    const params = new URLSearchParams(location.search)
    const d = params.get('data')
    if (d) setDate(d)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const servicos = useMemo(() => {
    const set = new Set<string>()
    agendamentos.forEach(a => { const s = (a.servico || '').trim(); if (s) set.add(s) })
    return Array.from(set).sort((a,b) => a.localeCompare(b))
  }, [agendamentos])

  const agsFiltrados = useMemo(() => {
    const term = busca.trim().toLowerCase()
    return agendamentos.filter(a => {
      const pac = pacientesMap[a.paciente_id]
      const nome = (pac?.nome || '').toLowerCase()
      const matchBusca = !term || nome.includes(term) || (a.observacoes || '').toLowerCase().includes(term)
      const matchStatus = statusFiltro === 'Todos' || (a.status || '') === statusFiltro
      const matchServico = servicoFiltro === 'Todos' || (a.servico || '') === servicoFiltro
      return matchBusca && matchStatus && matchServico
    })
  }, [agendamentos, pacientesMap, busca, statusFiltro, servicoFiltro])

  const resumo = useMemo(() => {
    const total = agsFiltrados.length
    let agendado = 0, confirmado = 0, concluido = 0, cancelado = 0
    agsFiltrados.forEach(a => {
      const s = (a.status || '').toLowerCase()
      if (s.includes('cancel')) cancelado++
      else if (s.includes('concl') || s.includes('realiz')) concluido++
      else if (s.includes('confirm')) confirmado++
      else agendado++
    })
    return { total, agendado, confirmado, concluido, cancelado }
  }, [agsFiltrados])

  function shareWhatsApp(a: Agendamento) {
    const pac = pacientesMap[a.paciente_id]
    const nome = pac?.nome || 'Paciente'
    const dia = new Date(a.data + 'T00:00:00')
    const hora = a.hora || ''
    const texto = `Olá ${nome}, lembrando do seu agendamento em ${dia.toLocaleDateString('pt-BR')} às ${hora}.` + (a.observacoes ? ` Observações: ${a.observacoes}` : '')
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  async function excluir(a: Agendamento) {
    if (!confirm('Deseja realmente excluir este agendamento?')) return
    const sb = getSupabase()
    if (!sb) { alert('Supabase não está configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'); return }
    const { error } = await sb.from('agendamentos').delete().eq('id', a.id)
    if (error) {
      alert('Erro ao excluir: ' + error.message)
    } else {
      await load()
    }
  }

  return (
    <div className="container mt-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="mb-0">Agendamentos do Dia</h2>
        <div className="btn-group">
          <button onClick={() => navigate('/dashboard')} className="btn btn-light"><i className="fas fa-arrow-left me-1"></i> Voltar ao Dashboard</button>
          <Link to="/agendamentos" className="btn btn-outline-secondary"><i className="fas fa-list me-1"></i> Ver lista</Link>
        </div>
      </div>

      <div className="card mb-3 shadow-sm">
        <div className="card-body">
          <div className="row row-cols-1 row-cols-md-5 g-3">
            <div className="col">
              <label className="form-label small text-muted">Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-control" />
            </div>
            <div className="col">
              <label className="form-label small text-muted">Buscar</label>
              <div className="input-group">
                <span className="input-group-text"><i className="fas fa-search"></i></span>
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome ou observações" className="form-control" />
              </div>
            </div>
            <div className="col">
              <label className="form-label small text-muted">Status</label>
              <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} className="form-select">
                <option>Todos</option>
                <option>Agendado</option>
                <option>Confirmado</option>
                <option>Concluído</option>
                <option>Cancelado</option>
              </select>
            </div>
            <div className="col">
              <label className="form-label small text-muted">Serviço</label>
              <select value={servicoFiltro} onChange={e => setServicoFiltro(e.target.value)} className="form-select">
                <option>Todos</option>
                {servicos.map(s => (<option key={s}>{s}</option>))}
              </select>
            </div>
            <div className="col d-flex align-items-end">
              <button onClick={load} className="btn btn-primary w-100"><i className="fas fa-sync me-1"></i> Atualizar</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <span className="badge bg-dark">Total: {resumo.total}</span>
            <span className="badge bg-secondary">Agendado: {resumo.agendado}</span>
            <span className="badge bg-info">Confirmado: {resumo.confirmado}</span>
            <span className="badge bg-success">Concluído: {resumo.concluido}</span>
            <span className="badge bg-danger">Cancelado: {resumo.cancelado}</span>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          {loading ? (
            <div className="text-muted">Carregando...</div>
          ) : (
            <div className="d-flex flex-column gap-4">
              {horasDia.map(h => {
                const label = formatHour(h)
                const items = agsFiltrados.filter(a => (a.hora || '').slice(0, 2) === `${h}`.padStart(2, '0'))
                return (
                  <div key={h}>
                    <div className="d-flex align-items-center gap-3 mb-2">
                      <div className={`text-muted fw-semibold`} style={{ width: '80px' }}>{label}</div>
                      <div className="flex-grow-1 border-top" />
                    </div>
                    {items.length === 0 ? (
                      <div className="ms-5 small text-muted fst-italic">Sem agendamentos neste horário</div>
                    ) : (
                      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
                        {items.map(a => {
                          const pac = pacientesMap[a.paciente_id]
                          const borderCls = statusBorderClass(a.status)
                          const badgeCls = statusBadgeClass(a.status)
                          return (
                            <div key={a.id} className="col">
                              <div className={`card h-100 shadow-sm border-0 border-start ${borderCls} border-5`}>
                                <div className="card-body d-flex flex-column">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <div className="d-flex align-items-center">
                                      <span className="display-6 fw-bold me-2">{(a.hora || '').slice(0,5)}</span>
                                      <span className={`badge ${badgeCls}`}>{a.status || 'Agendado'}</span>
                                    </div>
                                    <div className="text-end">
                                      <div className="fw-semibold">{pac?.nome || 'Paciente'}</div>
                                      <div className="small text-muted">{a.servico || '-'} • {formatCurrency(a.valor_previsto)}</div>
                                    </div>
                                  </div>
                                  {a.observacoes && <div className="small text-muted mb-2"><i className="fas fa-sticky-note me-1"></i>{a.observacoes}</div>}
                                  <div className="d-flex justify-content-end gap-2 mt-auto">
                                    <button onClick={() => shareWhatsApp(a)} className="btn btn-outline-success btn-sm"><i className="fab fa-whatsapp me-1"></i> WhatsApp</button>
                                    <button onClick={() => navigate(`/agendamentos/${a.id}/editar`)} className="btn btn-outline-secondary btn-sm"><i className="fas fa-edit me-1"></i> Editar</button>
                                    <button onClick={() => navigate(`/consulta/${a.id}`)} className="btn btn-outline-primary btn-sm"><i className="fas fa-play me-1"></i> Consulta</button>
                                    <button onClick={() => excluir(a)} className="btn btn-outline-danger btn-sm"><i className="fas fa-trash me-1"></i> Excluir</button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AgendamentosDia