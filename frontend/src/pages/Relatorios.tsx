import { useEffect, useMemo, useState } from 'react'
import { getSupabase } from '../lib/supabase'

interface Agendamento { id: number; servico: string; data: string }

const startOfMonthISO = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}
const todayISO = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Relatorios() {
  const sb = useMemo(() => getSupabase(), [])
  const [error, setError] = useState<string | null>(null)
  const [periodoDe, setPeriodoDe] = useState(startOfMonthISO())
  const [periodoAte, setPeriodoAte] = useState(todayISO())

  const [pacientesCount, setPacientesCount] = useState<number>(0)
  const [agendamentosCount, setAgendamentosCount] = useState<number>(0)
  const [tratamentosCount, setTratamentosCount] = useState<number>(0)
  const [receitaTotal, setReceitaTotal] = useState<number>(0)
  const [topServicos, setTopServicos] = useState<Array<{ servico: string; total: number }>>([])
  const [loading, setLoading] = useState(false)
  const [receitaConcluida, setReceitaConcluida] = useState<number>(0)
  const [receitaEmAndamento, setReceitaEmAndamento] = useState<number>(0)
  const [porDentista, setPorDentista] = useState<Array<{ dentista: string; total: number; quantidade: number }>>([])
  const [porServico, setPorServico] = useState<Array<{ tipo: string; total: number; quantidade: number }>>([])

  const load = async () => {
    if (!sb) { setError('Supabase não configurado.'); return }
    setLoading(true)
    setError(null)
    try {
      const [p, a, t] = await Promise.all([
        sb.from('pacientes').select('id', { count: 'exact' }),
        sb.from('agendamentos').select('*', { count: 'exact' }).gte('data', periodoDe).lte('data', periodoAte),
        sb.from('odontograma_tratamentos').select('valor, concluido, data_tratamento, dentista, tipo_tratamento', { count: 'exact' }).gte('data_tratamento', periodoDe).lte('data_tratamento', periodoAte),
      ])
      if (p.error) throw p.error
      if (a.error) throw a.error
      if (t.error) throw t.error

      setPacientesCount(p.count ?? 0)
      setAgendamentosCount(a.count ?? 0)
      setTratamentosCount(t.count ?? 0)

      const ts: any[] = (t.data ?? [])
      const receita = ts.reduce((acc: number, it: any) => acc + (Number(it.valor) || 0), 0)
      setReceitaTotal(receita)

      // Receita por status
      const recConcluida = ts.filter(x => !!x.concluido).reduce((acc, x) => acc + (Number(x.valor) || 0), 0)
      const recEmAndamento = ts.filter(x => !x.concluido).reduce((acc, x) => acc + (Number(x.valor) || 0), 0)
      setReceitaConcluida(recConcluida)
      setReceitaEmAndamento(recEmAndamento)

      // Receita por dentista
      const mapDentista = new Map<string, { total: number; quantidade: number }>()
      ts.forEach(x => {
        const key = ((x.dentista || '').trim()) || '—'
        const val = Number(x.valor) || 0
        const curr = mapDentista.get(key) || { total: 0, quantidade: 0 }
        mapDentista.set(key, { total: curr.total + val, quantidade: curr.quantidade + 1 })
      })
      const arrDentista = Array.from(mapDentista.entries()).map(([dentista, { total, quantidade }]) => ({ dentista, total, quantidade }))
        .sort((a, b) => b.total - a.total)
      setPorDentista(arrDentista)

      // Receita por serviço (tipo_tratamento)
      const mapServico = new Map<string, { total: number; quantidade: number }>()
      ts.forEach(x => {
        const key = ((x.tipo_tratamento || '').trim()) || '—'
        const val = Number(x.valor) || 0
        const curr = mapServico.get(key) || { total: 0, quantidade: 0 }
        mapServico.set(key, { total: curr.total + val, quantidade: curr.quantidade + 1 })
      })
      const arrServico = Array.from(mapServico.entries()).map(([tipo, { total, quantidade }]) => ({ tipo, total, quantidade }))
        .sort((a, b) => b.total - a.total)
      setPorServico(arrServico)

      // Top serviços por agendamentos no período
      const ags: Agendamento[] = (a.data ?? []) as any
      const map = new Map<string, number>()
      ags.forEach((x) => {
        const key = (x.servico || '').trim() || '—'
        map.set(key, (map.get(key) ?? 0) + 1)
      })
      const tops = Array.from(map.entries()).map(([servico, total]) => ({ servico, total }))
        .sort((x, y) => y.total - x.total).slice(0, 5)
      setTopServicos(tops)
    } catch (e: any) {
      setError(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { load() }, [periodoDe, periodoAte])

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0"><i className="fas fa-chart-line me-2"></i>Relatórios</h2>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-sm-3">
              <label className="form-label">Período de</label>
              <input type="date" className="form-control" value={periodoDe} onChange={(e) => setPeriodoDe(e.target.value)} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Até</label>
              <input type="date" className="form-control" value={periodoAte} onChange={(e) => setPeriodoAte(e.target.value)} />
            </div>
            <div className="col-sm-6 text-sm-end">
              {loading && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="text-muted">Pacientes</div>
              <div className="h3 mb-0">{pacientesCount}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="text-muted">Agendamentos</div>
              <div className="h3 mb-0">{agendamentosCount}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="text-muted">Tratamentos</div>
              <div className="h3 mb-0">{tratamentosCount}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="text-muted">Receita (total)</div>
              <div className="h3 mb-0">{currency(receitaTotal)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Receita por status */}
      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="text-muted">Receita concluída</div>
              <div className="h4 mb-0">{currency(receitaConcluida)}</div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="text-muted">Receita em andamento</div>
              <div className="h4 mb-0">{currency(receitaEmAndamento)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Receita por dentista */}
      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h5 className="card-title">Receita por dentista</h5>
          {porDentista.length === 0 ? (
            <p className="text-muted">Sem dados no período selecionado.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-striped table-hover">
                <thead>
                  <tr>
                    <th>Dentista</th>
                    <th>Quantidade</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {porDentista.map(d => (
                    <tr key={d.dentista}>
                      <td>{d.dentista}</td>
                      <td>{d.quantidade}</td>
                      <td>{currency(d.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Receita por serviço */}
      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Receita por serviço</h5>
          {porServico.length === 0 ? (
            <p className="text-muted">Sem dados no período selecionado.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-striped table-hover">
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th>Quantidade</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {porServico.map(s => (
                    <tr key={s.tipo}>
                      <td>{s.tipo}</td>
                      <td>{s.quantidade}</td>
                      <td>{currency(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card shadow-sm mt-3">
        <div className="card-body">
          <h5 className="card-title">Top Serviços (por agendamento)</h5>
          {topServicos.length === 0 ? (
            <p className="text-muted">Sem dados no período selecionado.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-striped table-hover">
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topServicos.map(s => (
                    <tr key={s.servico}>
                      <td>{s.servico}</td>
                      <td>{s.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}