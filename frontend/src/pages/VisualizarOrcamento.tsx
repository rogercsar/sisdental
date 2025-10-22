import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'

interface Orcamento { id: number; paciente_id: number; titulo: string | null; data: string | null; valor_total: number | null; status: string | null; observacoes: string | null }
interface Paciente { id: number; nome: string }
interface Tratamento { id: number; tipo_tratamento: string | null; data_tratamento: string | null; valor: number | null; concluido: boolean | null }

export default function VisualizarOrcamento() {
  const { id } = useParams()
  const orcId = Number(id)
  const sb = useMemo(() => getSupabase(), [])
  const navigate = useNavigate()
  const location = useLocation()

  const [orcamento, setOrcamento] = useState<Orcamento | null>(null)
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!sb || !orcId) return
      try {
        const { data: orc, error: orcErr } = await sb.from('orcamentos').select('*').eq('id', orcId).single()
        if (orcErr) throw orcErr
        setOrcamento(orc as Orcamento)
        const { data: pac, error: pacErr } = await sb.from('pacientes').select('id, nome').eq('id', (orc as any).paciente_id).single()
        if (pacErr) throw pacErr
        setPaciente(pac as Paciente)
        const { data: trats, error: trErr } = await sb
          .from('odontograma_tratamentos')
          .select('id, tipo_tratamento, data_tratamento, valor, concluido')
          .eq('orcamento_id', orcId)
          .order('data_tratamento', { ascending: false })
        if (trErr) throw trErr
        setTratamentos((trats ?? []) as Tratamento[])
      } catch (e: any) {
        setError(e.message ?? String(e))
      }
    }
    load()
  }, [sb, orcId])

  useEffect(() => {
    const qs = new URLSearchParams(location.search)
    if (qs.get('print') === '1') {
      setTimeout(() => window.print(), 300)
    }
  }, [location.search])

  const shareWhatsApp = () => {
    if (!orcamento || !paciente) return
    const texto = `Orçamento #${orcamento.id} - ${paciente.nome}\nTítulo: ${orcamento.titulo ?? '-'}\nValor: R$ ${(orcamento.valor_total ?? 0).toFixed(2)}\nStatus: ${orcamento.status ?? 'Em aberto'}\nItens: ${tratamentos.length}`
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  const excluir = async () => {
    if (!sb || !orcamento) return
    if (!confirm(`Excluir orçamento #${orcamento.id}?`)) return
    const { error } = await sb.from('orcamentos').delete().eq('id', orcamento.id)
    if (error) { alert(error.message); return }
    navigate('/orcamentos')
  }

  if (!orcamento || !paciente) return (
    <div className="container mt-4">{error ? <div className="alert alert-danger">{error}</div> : 'Carregando...'}</div>
  )

  const totalItens = tratamentos.reduce((sum, t) => sum + (t.valor ?? 0), 0)

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Orçamento #{orcamento.id}</h2>
        <div className="btn-group">
          <Link to={`/orcamentos/${orcamento.id}/editar`} className="btn btn-outline-primary"><i className="fas fa-edit"></i> Editar</Link>
          <button className="btn btn-outline-success" onClick={shareWhatsApp}><i className="fab fa-whatsapp"></i> WhatsApp</button>
          <button className="btn btn-outline-info" onClick={() => window.print()}><i className="fas fa-file-pdf"></i> Imprimir/PDF</button>
          <button className="btn btn-outline-danger" onClick={excluir}><i className="fas fa-trash"></i> Excluir</button>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4"><strong>Paciente:</strong> {paciente.nome}</div>
            <div className="col-md-3"><strong>Data:</strong> {orcamento.data ?? '-'}</div>
            <div className="col-md-3"><strong>Status:</strong> {orcamento.status ?? 'Em aberto'}</div>
            <div className="col-md-2"><strong>Valor:</strong> {(orcamento.valor_total ?? totalItens).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          </div>
          {orcamento.titulo && <div className="mt-2"><strong>Título:</strong> {orcamento.titulo}</div>}
          {orcamento.observacoes && <div className="mt-2"><strong>Observações:</strong> {orcamento.observacoes}</div>}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Tratamentos Vinculados ({tratamentos.length})</h5>
          <div className="table-responsive">
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Procedimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tratamentos.map(t => (
                  <tr key={t.id}>
                    <td>{t.data_tratamento ?? '-'}</td>
                    <td>{t.tipo_tratamento ?? '-'}</td>
                    <td>{(t.valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td>{t.concluido ? 'Concluído' : 'Pendente'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="text-end"><strong>Total</strong></td>
                  <td colSpan={2}><strong>{totalItens.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}