import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import EmptyState from '../components/EmptyState'

interface Paciente {
  id: number
  nome: string
  cpf: string | null
  telefone: string | null
  email: string | null
  data_nascimento: string | null
}

export default function Pacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const load = async () => {
    const sb = getSupabase()
    if (!sb) { setError('Supabase não configurado.'); return }
    setLoading(true)
    try {
      const { data, error } = await sb.from('pacientes').select('*').order('nome', { ascending: true })
      if (error) setError(error.message)
      else setPacientes(data as Paciente[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const pacientesFiltrados = pacientes.filter(p => {
    const t = (busca || '').toLowerCase()
    return p.nome.toLowerCase().includes(t) || (p.cpf || '').toLowerCase().includes(t)
  })
  const totalPages = Math.max(1, Math.ceil(pacientesFiltrados.length / pageSize))
  const start = (page - 1) * pageSize
  const pageItems = pacientesFiltrados.slice(start, start + pageSize)

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0"><i className="fas fa-users me-2"></i>Pacientes</h2>
        <Link to="/pacientes/cadastrar" className="btn btn-primary">
          <i className="fas fa-user-plus me-1"></i> Cadastrar
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-sm-8">
              <input
                className="form-control"
                placeholder="Buscar por nome ou CPF"
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-sm-4 text-sm-end">
              <span className="text-muted">Total: {pacientes.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4"><div className="spinner-border" role="status"><span className="visually-hidden">Carregando...</span></div></div>
          ) : pacientesFiltrados.length === 0 ? (
            <EmptyState icon="fas fa-users" message="Nenhum paciente encontrado." />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-sm table-striped table-hover">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>CPF</th>
                      <th>Telefone</th>
                      <th>Email</th>
                      <th>Nascimento</th>
                      <th style={{ width: 160 }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map(p => (
                      <tr key={p.id}>
                        <td>{p.nome}</td>
                        <td>{p.cpf ?? '-'}</td>
                        <td>{p.telefone ?? '-'}</td>
                        <td>{p.email ?? '-'}</td>
                        <td>{p.data_nascimento ?? '-'}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Link to={`/pacientes/${p.id}/detalhes`} className="btn btn-outline-secondary btn-sm" title="Detalhes">
                              <i className="fas fa-eye"></i>
                            </Link>
                            <Link to={`/pacientes/${p.id}/editar`} className="btn btn-outline-primary btn-sm" title="Editar">
                              <i className="fas fa-edit"></i>
                            </Link>
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