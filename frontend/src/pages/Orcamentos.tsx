import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import EmptyState from '../components/EmptyState'

interface Orcamento {
  id: number
  paciente_id: number
  titulo: string | null
  data: string | null
  valor_total: number | null
  status: string | null
  observacoes: string | null
}

interface Paciente { id: number; nome: string }

export default function Orcamentos() {
  const sb = useMemo(() => getSupabase(), [])
  const navigate = useNavigate()
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<string>('Todos')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const statusList = ['Em aberto', 'Aprovado', 'Reprovado', 'Em andamento', 'Concluído']

  const formatCurrency = (value?: number | null) => {
    try { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) } catch { return String(value ?? '-') }
  }

  useEffect(() => {
    const load = async () => {
      if (!sb) { setError('Supabase não configurado'); return }
      setLoading(true)
      try {
        const [o, p] = await Promise.all([
          sb.from('orcamentos').select('*').order('data', { ascending: false }).order('id', { ascending: false }),
          sb.from('pacientes').select('id, nome').order('nome', { ascending: true }),
        ])
        if (o.error) throw o.error
        if (p.error) throw p.error
        setOrcamentos((o.data ?? []) as Orcamento[])
        setPacientes((p.data ?? []) as Paciente[])
      } catch (e: any) {
        setError(e.message ?? String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sb])

  const nomePaciente = (id: number) => pacientes.find(p => p.id === id)?.nome ?? `#${id}`

  const filtradosBase = orcamentos.filter(o => {
    const t = (busca || '').toLowerCase()
    return (o.titulo ?? '').toLowerCase().includes(t) || nomePaciente(o.paciente_id).toLowerCase().includes(t)
  })
  const filtrados = filtradosBase.filter(o => statusFiltro === 'Todos' || (o.status ?? 'Em aberto') === statusFiltro)

  const resumo = useMemo(() => {
    const base = filtradosBase
    const totalGeral = base.reduce((sum, o) => sum + (o.valor_total ?? 0), 0)
    const porStatus: Record<string, { count: number; total: number }> = {}
    statusList.forEach(s => { porStatus[s] = { count: 0, total: 0 } })
    base.forEach(o => {
      const st = o.status ?? 'Em aberto'
      if (!porStatus[st]) porStatus[st] = { count: 0, total: 0 }
      porStatus[st].count += 1
      porStatus[st].total += (o.valor_total ?? 0)
    })
    return { totalGeral, porStatus }
  }, [filtradosBase])

  const shareWhatsApp = (o: Orcamento) => {
    const texto = `Orçamento #${o.id}\nPaciente: ${nomePaciente(o.paciente_id)}\nTítulo: ${o.titulo ?? '-'}\nValor: R$ ${(o.valor_total ?? 0).toFixed(2)}\nStatus: ${o.status ?? 'Em aberto'}\nData: ${o.data ?? ''}`
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  const sharePDF = (o: Orcamento) => {
    navigate(`/orcamentos/${o.id}/imprimir`)
  }

  const excluir = async (o: Orcamento) => {
    if (!sb) return
    if (!confirm(`Excluir orçamento #${o.id}?`)) return
    const { error } = await sb.from('orcamentos').delete().eq('id', o.id)
    if (error) { alert(error.message); return }
    setOrcamentos(prev => prev.filter(x => x.id !== o.id))
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0"><i className="fas fa-file-invoice-dollar me-2"></i>Orçamentos</h2>
        <Link to="/orcamentos/cadastrar" className="btn btn-primary">
          <i className="fas fa-plus me-1"></i> Novo Orçamento
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-6">
              <input className="form-control" placeholder="Buscar por título ou paciente" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
                <option value="Todos">Todos</option>
                {statusList.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div className="col-md-3 text-md-end">
              <span className="text-muted">Total: {orcamentos.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo por status */}
      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-3">
              <div className="fw-semibold">Total geral</div>
              <div>{formatCurrency(resumo.totalGeral)}</div>
            </div>
            {statusList.map(s => (
              <div className="col-md-3" key={s}>
                <div className="fw-semibold">{s}</div>
                <div>{resumo.porStatus[s]?.count ?? 0} itens • {formatCurrency(resumo.porStatus[s]?.total ?? 0)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4"><div className="spinner-border" role="status"><span className="visually-hidden">Carregando...</span></div></div>
          ) : filtrados.length === 0 ? (
            <EmptyState icon="fas fa-file-invoice" message="Nenhum orçamento encontrado." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-striped table-hover">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Paciente</th>
                    <th>Título</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th className="text-end">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(o => (
                    <tr key={o.id}>
                      <td>{o.data ?? '-'}</td>
                      <td>
                        <Link to={`/pacientes/${o.paciente_id}/detalhes`} className="text-decoration-none">
                          {nomePaciente(o.paciente_id)}
                        </Link>
                      </td>
                      <td>{o.titulo ?? '-'}</td>
                      <td>{(o.valor_total ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td>{o.status ?? 'Em aberto'}</td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm" role="group">
                          <Link to={`/orcamentos/${o.id}`} className="btn btn-outline-secondary" title="Visualizar"><i className="fas fa-eye"></i></Link>
                          <Link to={`/orcamentos/${o.id}/editar`} className="btn btn-outline-primary" title="Editar"><i className="fas fa-edit"></i></Link>
                          <button className="btn btn-outline-success" onClick={() => shareWhatsApp(o)} title="Compartilhar WhatsApp"><i className="fab fa-whatsapp"></i></button>
                          <button className="btn btn-outline-info" onClick={() => sharePDF(o)} title="Compartilhar PDF"><i className="fas fa-file-pdf"></i></button>
                          <button className="btn btn-outline-danger" onClick={() => excluir(o)} title="Excluir"><i className="fas fa-trash"></i></button>
                        </div>
                      </td>
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