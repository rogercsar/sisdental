import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'

interface Agendamento { id: number; paciente_id: number; servico: string | null; data: string; hora: string | null; status: string | null; observacoes: string | null; status_pagamento?: string | null; valor_previsto?: number | null }
interface Paciente { id: number; nome: string }

export default function ConsultaPaciente() {
  const { id } = useParams()
  const agId = Number(id)
  const sb = useMemo(() => getSupabase(), [])
  const navigate = useNavigate()

  const [ag, setAg] = useState<Agendamento | null>(null)
  const [pac, setPac] = useState<Paciente | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const statusLista = ['Agendado', 'Confirmado', 'Realizado', 'Cancelado', 'Não Compareceu']
  const statusPagamentoLista = ['Em aberto', 'Pago', 'Parcial']

  useEffect(() => {
    const load = async () => {
      if (!sb || !agId) return
      try {
        const { data: a, error: aErr } = await sb.from('agendamentos').select('*').eq('id', agId).single()
        if (aErr) throw aErr
        setAg(a as Agendamento)
        const { data: p, error: pErr } = await sb.from('pacientes').select('id, nome').eq('id', (a as any).paciente_id).single()
        if (pErr) throw pErr
        setPac(p as Paciente)
      } catch (e: any) {
        setError(e.message ?? String(e))
      }
    }
    load()
  }, [sb, agId])

  const salvar = async () => {
    if (!sb || !ag) return
    setLoading(true)
    try {
      const { error } = await sb.from('agendamentos').update({
        status: ag.status,
        observacoes: ag.observacoes,
        status_pagamento: ag.status_pagamento ?? null,
        valor_previsto: ag.valor_previsto ?? null,
      }).eq('id', ag.id)
      if (error) throw error
      navigate('/agendamentos')
    } catch (e: any) {
      setError(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  if (!ag || !pac) return (
    <div className="container mt-4">{error ? <div className="alert alert-danger">{error}</div> : 'Carregando...'}</div>
  )

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Consulta do Paciente</h2>
        <Link to={`/pacientes/${ag.paciente_id}/detalhes`} className="btn btn-outline-secondary btn-sm">Abrir Paciente</Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4"><strong>Paciente:</strong> {pac.nome}</div>
            <div className="col-md-3"><strong>Data:</strong> {ag.data}</div>
            <div className="col-md-2"><strong>Hora:</strong> {(ag.hora || '').slice(0,5)}</div>
            <div className="col-md-3"><strong>Serviço:</strong> {ag.servico ?? '-'}</div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Status</label>
              <select className="form-select" value={ag.status ?? ''} onChange={(e) => setAg({ ...ag, status: e.target.value })}>
                {statusLista.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Status Pagamento</label>
              <select className="form-select" value={ag.status_pagamento ?? ''} onChange={(e) => setAg({ ...ag, status_pagamento: e.target.value })}>
                {statusPagamentoLista.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Valor Previsto</label>
              <input type="number" className="form-control" value={ag.valor_previsto ?? 0} onChange={(e) => setAg({ ...ag, valor_previsto: Number(e.target.value) || 0 })} />
            </div>
            <div className="col-12">
              <label className="form-label">Observações da Consulta</label>
              <textarea className="form-control" rows={4} value={ag.observacoes ?? ''} onChange={(e) => setAg({ ...ag, observacoes: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      <div className="text-end">
        <button className="btn btn-secondary me-2" onClick={() => navigate('/agendamentos')}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Consulta'}</button>
      </div>
    </div>
  )
}