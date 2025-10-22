import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'

interface Paciente { id: number; nome: string }
interface Tratamento { id: number; tipo_tratamento: string | null; data_tratamento: string | null; valor: number | null; concluido: boolean | null }

export default function CadastrarOrcamento() {
  const sb = useMemo(() => getSupabase(), [])
  const navigate = useNavigate()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [pacienteId, setPacienteId] = useState<number | null>(null)
  const [titulo, setTitulo] = useState('')
  const [data, setData] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [valorTotal, setValorTotal] = useState<number>(0)
  const [status, setStatus] = useState<string>('Em aberto')
  const [observacoes, setObservacoes] = useState('')
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([])
  const [selecionados, setSelecionados] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPacientes = async () => {
      if (!sb) return
      const { data, error } = await sb.from('pacientes').select('id, nome').order('nome', { ascending: true })
      if (error) { setError(error.message); return }
      setPacientes((data ?? []) as Paciente[])
    }
    loadPacientes()
  }, [sb])

  useEffect(() => {
    const loadTratamentos = async () => {
      if (!sb || !pacienteId) { setTratamentos([]); return }
      const { data, error } = await sb
        .from('odontograma_tratamentos')
        .select('id, tipo_tratamento, data_tratamento, valor, concluido')
        .eq('paciente_id', pacienteId)
        .is('orcamento_id', null)
        .order('data_tratamento', { ascending: false })
      if (error) { setError(error.message); return }
      const tt = (data ?? []) as Tratamento[]
      setTratamentos(tt)
      setSelecionados([])
    }
    loadTratamentos()
  }, [sb, pacienteId])

  useEffect(() => {
    const total = tratamentos.filter(t => selecionados.includes(t.id)).reduce((sum, t) => sum + (t.valor ?? 0), 0)
    setValorTotal(total)
  }, [selecionados, tratamentos])

  const salvar = async () => {
    if (!sb) return
    if (!pacienteId) { alert('Selecione o paciente'); return }
    setLoading(true)
    setError(null)
    try {
      const { data: inserted, error: insErr } = await sb.from('orcamentos').insert({
        paciente_id: pacienteId,
        titulo: titulo || null,
        data,
        valor_total: valorTotal,
        status,
        observacoes: observacoes || null,
      }).select('*').single()
      if (insErr) throw insErr
      const orcId = inserted.id as number
      if (selecionados.length > 0) {
        const { error: upErr } = await sb
          .from('odontograma_tratamentos')
          .update({ orcamento_id: orcId })
          .in('id', selecionados)
        if (upErr) throw upErr
      }
      navigate(`/orcamentos/${orcId}`)
    } catch (e: any) {
      setError(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-3"><i className="fas fa-file-invoice-dollar me-2"></i>Novo Orçamento</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Paciente</label>
              <select className="form-select" value={pacienteId ?? ''} onChange={(e) => setPacienteId(Number(e.target.value) || null)}>
                <option value="">Selecione...</option>
                {pacientes.map(p => (<option key={p.id} value={p.id}>{p.nome}</option>))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Título</label>
              <input className="form-control" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Data</label>
              <input type="date" className="form-control" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Status</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {['Em aberto','Aprovado','Reprovado','Em andamento','Concluído'].map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Valor Total</label>
              <input type="number" className="form-control" value={valorTotal} onChange={(e) => setValorTotal(Number(e.target.value) || 0)} />
            </div>
            <div className="col-12">
              <label className="form-label">Observações</label>
              <textarea className="form-control" rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mt-3">
        <div className="card-body">
          <h5 className="card-title">Vincular Tratamentos do Paciente</h5>
          {!pacienteId ? (
            <div className="text-muted">Selecione um paciente para listar os tratamentos disponíveis.</div>
          ) : tratamentos.length === 0 ? (
            <div className="text-muted">Nenhum tratamento disponível para vínculo.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-striped">
                <thead>
                  <tr>
                    <th></th>
                    <th>Data</th>
                    <th>Procedimento</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tratamentos.map(t => (
                    <tr key={t.id}>
                      <td>
                        <input type="checkbox" className="form-check-input" checked={selecionados.includes(t.id)} onChange={(e) => {
                          setSelecionados(prev => e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id))
                        }} />
                      </td>
                      <td>{t.data_tratamento ?? '-'}</td>
                      <td>{t.tipo_tratamento ?? '-'}</td>
                      <td>{(t.valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td>{t.concluido ? 'Concluído' : 'Pendente'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="text-end">
            <button className="btn btn-secondary me-2" onClick={() => navigate('/orcamentos')}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvar} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Orçamento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}