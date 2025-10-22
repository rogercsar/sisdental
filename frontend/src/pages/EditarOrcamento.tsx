import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'

interface Orcamento { id: number; paciente_id: number; titulo: string | null; data: string | null; valor_total: number | null; status: string | null; observacoes: string | null }
interface Paciente { id: number; nome: string }
interface Tratamento { id: number; tipo_tratamento: string | null; data_tratamento: string | null; valor: number | null; concluido: boolean | null; orcamento_id?: number | null }

export default function EditarOrcamento() {
  const { id } = useParams()
  const orcId = Number(id)
  const sb = useMemo(() => getSupabase(), [])
  const navigate = useNavigate()

  const [orcamento, setOrcamento] = useState<Orcamento | null>(null)
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([])
  const [selecionados, setSelecionados] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!sb || !orcId) return
      setLoading(true)
      try {
        const { data: orc, error: orcErr } = await sb.from('orcamentos').select('*').eq('id', orcId).single()
        if (orcErr) throw orcErr
        setOrcamento(orc as Orcamento)
        const { data: pac, error: pacErr } = await sb.from('pacientes').select('id, nome').eq('id', (orc as any).paciente_id).single()
        if (pacErr) throw pacErr
        setPaciente(pac as Paciente)
        const { data: trats, error: trErr } = await sb
          .from('odontograma_tratamentos')
          .select('id, tipo_tratamento, data_tratamento, valor, concluido, orcamento_id')
          .eq('paciente_id', (orc as any).paciente_id)
          .order('data_tratamento', { ascending: false })
        if (trErr) throw trErr
        const tt = (trats ?? []) as Tratamento[]
        setTratamentos(tt)
        setSelecionados(tt.filter(t => (t.orcamento_id ?? null) === orcId).map(t => t.id))
      } catch (e: any) {
        setError(e.message ?? String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sb, orcId])

  const salvar = async () => {
    if (!sb || !orcamento) return
    setLoading(true)
    setError(null)
    try {
      const { error: upErr } = await sb.from('orcamentos').update({
        titulo: orcamento.titulo,
        data: orcamento.data,
        valor_total: orcamento.valor_total,
        status: orcamento.status,
        observacoes: orcamento.observacoes,
      }).eq('id', orcId)
      if (upErr) throw upErr

      // Vincular selecionados a este orçamento
      if (selecionados.length > 0) {
        const { error: linkErr } = await sb.from('odontograma_tratamentos').update({ orcamento_id: orcId }).in('id', selecionados)
        if (linkErr) throw linkErr
      }
      // Desvincular os que estavam no orçamento mas foram desmarcados
      const idsQueEstavam = tratamentos.filter(t => (t.orcamento_id ?? null) === orcId).map(t => t.id)
      const idsParaDesvincular = idsQueEstavam.filter(id => !selecionados.includes(id))
      if (idsParaDesvincular.length > 0) {
        const { error: unlinkErr } = await sb.from('odontograma_tratamentos').update({ orcamento_id: null }).in('id', idsParaDesvincular)
        if (unlinkErr) throw unlinkErr
      }

      navigate(`/orcamentos/${orcId}`)
    } catch (e: any) {
      setError(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  if (!orcamento || !paciente) return (
    <div className="container mt-4">{error ? <div className="alert alert-danger">{error}</div> : 'Carregando...'}</div>
  )

  return (
    <div className="container mt-4">
      <h2 className="mb-3"><i className="fas fa-file-invoice-dollar me-2"></i>Editar Orçamento #{orcamento.id}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Paciente</label>
              <input className="form-control" value={paciente.nome} disabled />
            </div>
            <div className="col-md-6">
              <label className="form-label">Título</label>
              <input className="form-control" value={orcamento.titulo ?? ''} onChange={(e) => setOrcamento({ ...orcamento, titulo: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Data</label>
              <input type="date" className="form-control" value={orcamento.data ?? ''} onChange={(e) => setOrcamento({ ...orcamento, data: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Status</label>
              <select className="form-select" value={orcamento.status ?? 'Em aberto'} onChange={(e) => setOrcamento({ ...orcamento, status: e.target.value })}>
                {['Em aberto','Aprovado','Reprovado','Em andamento','Concluído'].map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Valor Total</label>
              <input type="number" className="form-control" value={orcamento.valor_total ?? 0} onChange={(e) => setOrcamento({ ...orcamento, valor_total: Number(e.target.value) || 0 })} />
            </div>
            <div className="col-12">
              <label className="form-label">Observações</label>
              <textarea className="form-control" rows={3} value={orcamento.observacoes ?? ''} onChange={(e) => setOrcamento({ ...orcamento, observacoes: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Tratamentos vinculados/selecionáveis</h5>
          <div className="table-responsive">
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  <th></th>
                  <th>Data</th>
                  <th>Procedimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Vinculado</th>
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
                    <td>{(t.orcamento_id ?? null) === orcId ? 'Sim' : (t.orcamento_id ? `#${t.orcamento_id}` : 'Não')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-end">
            <button className="btn btn-secondary me-2" onClick={() => navigate(`/orcamentos/${orcId}`)}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvar} disabled={loading}>{loading ? 'Salvando...' : 'Salvar alterações'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}