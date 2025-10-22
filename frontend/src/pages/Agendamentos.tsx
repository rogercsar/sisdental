import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import EmptyState from '../components/EmptyState'

interface Agendamento {
  id: number
  paciente_id: number
  servico: string
  data: string
  hora: string
  status: string | null
  observacoes: string | null
  status_pagamento?: string | null
  valor_previsto?: number | null
}

interface Paciente { id: number; nome: string }

export default function Agendamentos() {
  const sb = getSupabase()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const statusLista = ['Agendado', 'Confirmado', 'Realizado', 'Cancelado', 'Não Compareceu']
  const [filtroStatus, setFiltroStatus] = useState<string>('Todos')

  const load = async () => {
    if (!sb) { setError('Supabase não configurado.'); return }
    setLoading(true)
    try {
      const [a, p] = await Promise.all([
        sb.from('agendamentos').select('*').order('data', { ascending: false }).order('hora', { ascending: true }),
        sb.from('pacientes').select('id, nome').order('nome', { ascending: true }),
      ])
      if (a.error) setError(a.error.message); else setAgendamentos(a.data as Agendamento[])
      if (p.error) setError(p.error.message); else setPacientes(p.data as Paciente[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const nomePaciente = (id: number) => pacientes.find(p => p.id === id)?.nome ?? `#${id}`

  const filtradosBase = agendamentos.filter(a => {
    const t = (busca || '').toLowerCase()
    return a.servico.toLowerCase().includes(t) || nomePaciente(a.paciente_id).toLowerCase().includes(t)
  })
  const filtrados = filtradosBase.filter(a => filtroStatus === 'Todos' || (a.status ?? '') === filtroStatus)
  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize))
  const start = (page - 1) * pageSize
  const pageItems = filtrados.slice(start, start + pageSize)

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0"><i className="fas fa-calendar-alt me-2"></i>Agendamentos</h2>
        <Link to="/agendamentos/cadastrar" className="btn btn-success">
          <i className="fas fa-calendar-plus me-1"></i> Novo Agendamento
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Buscar por paciente ou serviço"
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={filtroStatus} onChange={(e) => { setFiltroStatus(e.target.value); setPage(1); }}>
                <option value="Todos">Todos os status</option>
                {statusLista.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div className="col-md-3 text-md-end">
              <span className="text-muted">Total: {agendamentos.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4"><div className="spinner-border" role="status"><span className="visually-hidden">Carregando...</span></div></div>
          ) : filtrados.length === 0 ? (
            <EmptyState icon="fas fa-calendar-alt" message="Nenhum agendamento encontrado." />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-sm table-striped table-hover">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Hora</th>
                      <th>Paciente</th>
                      <th>Serviço</th>
                      <th>Status</th>
                      <th>Pagamento</th>
                      <th>Observações</th>
                      <th className="text-end">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map(a => (
                      <tr key={a.id}>
                        <td>{a.data}</td>
                        <td>{(a.hora || '').slice(0,5)}</td>
                        <td>
                          <Link to={`/pacientes/${a.paciente_id}/detalhes`} className="text-decoration-none">
                            {nomePaciente(a.paciente_id)}
                          </Link>
                        </td>
                        <td>{a.servico}</td>
                        <td>{a.status ?? '-'}</td>
                        <td>{a.status_pagamento ?? '-'}</td>
                        <td>{a.observacoes ?? '-'}</td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm" role="group">
                            <Link to={`/agendamentos/${a.id}/editar`} className="btn btn-outline-secondary" title="Visualizar"><i className="fas fa-eye"></i></Link>
                            <Link to={`/agendamentos/${a.id}/editar`} className="btn btn-outline-primary" title="Editar"><i className="fas fa-edit"></i></Link>
                            <Link to={`/consulta/${a.id}`} className="btn btn-outline-success" title="Consulta"><i className="fas fa-notes-medical"></i></Link>
                            <button className="btn btn-outline-success" onClick={() => { const texto = `Agendamento #${a.id}\\nPaciente: ${nomePaciente(a.paciente_id)}\\nServiço: ${a.servico}\\nData: ${a.data} ${(a.hora || '').slice(0,5)}\\nStatus: ${a.status ?? '-'}\\nPagamento: ${a.status_pagamento ?? '-'}`; window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank') }} title="Compartilhar WhatsApp"><i className="fab fa-whatsapp"></i></button>
                            <button className="btn btn-outline-info" onClick={() => { const html = `<!doctype html><html><head><meta charset=\\"utf-8\\"/><title>Agendamento #${a.id}</title><link rel=\\"stylesheet\\" href=\\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css\\" /></head><body class=\\"p-4\\"><h3>Agendamento #${a.id}</h3><p><strong>Paciente:</strong> ${nomePaciente(a.paciente_id)}</p><p><strong>Data/Hora:</strong> ${a.data} ${(a.hora || '').slice(0,5)}</p><p><strong>Serviço:</strong> ${a.servico}</p><p><strong>Status:</strong> ${a.status ?? '-'}</p><p><strong>Pagamento:</strong> ${a.status_pagamento ?? '-'}</p><p><strong>Observações:</strong> ${a.observacoes ?? '-'}</p><script>window.onload = () => { window.print(); }</script></body></html>`; const w = window.open('', '_blank'); if (w) { w.document.open(); w.document.write(html); w.document.close(); } }} title="Compartilhar PDF"><i className="fas fa-file-pdf"></i></button>
                            <button className="btn btn-outline-danger" onClick={async () => { if (!sb) return; if (!confirm(`Excluir agendamento #${a.id}?`)) return; const { error } = await sb.from('agendamentos').delete().eq('id', a.id); if (error) { alert(error.message); return } ; setAgendamentos(prev => prev.filter(x => x.id !== a.id)) }} title="Excluir"><i className="fas fa-trash"></i></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted">Itens por página:</span>
                  <select className="form-select form-select-sm" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(Math.max(1, page - 1))}>Anterior</button>
                  </li>
                  <li className="page-item disabled"><span className="page-link">{page} / {totalPages}</span></li>
                  <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(Math.min(totalPages, page + 1))}>Próxima</button>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}