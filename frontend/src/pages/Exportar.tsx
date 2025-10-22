import { useState } from 'react'
import { getSupabase } from '../lib/supabase'

const toCSV = (rows: any[]): string => {
  if (!rows || rows.length === 0) return ''
  const headers: string[] = Array.from(new Set(rows.flatMap((r: any) => Object.keys(r))))
  const esc = (val: any) => {
    if (val === null || val === undefined) return ''
    const s = String(val).replace(/"/g, '""')
    return `"${s}"`
  }
  const lines = [
    headers.join(','),
    ...rows.map((r: any) => headers.map(h => esc(r[h])).join(',')),
  ]
  return lines.join('\r\n')
}

const downloadCSV = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function Exportar() {
  const [loadingPac, setLoadingPac] = useState(false)
  const [loadingAg, setLoadingAg] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportPacientes = async () => {
    const sb = getSupabase()
    if (!sb) { setError('Supabase não configurado.'); return }
    setLoadingPac(true)
    setError(null)
    try {
      const { data, error } = await sb.from('pacientes').select('*').order('nome', { ascending: true })
      if (error) throw error
      const csv = toCSV(data || [])
      downloadCSV(`pacientes_${new Date().toISOString().slice(0,10)}.csv`, csv)
    } catch (e: any) {
      setError(e.message ?? String(e))
    } finally { setLoadingPac(false) }
  }

  const exportAgendamentos = async () => {
    const sb = getSupabase()
    if (!sb) { setError('Supabase não configurado.'); return }
    setLoadingAg(true)
    setError(null)
    try {
      const { data, error } = await sb.from('agendamentos').select('*').order('data', { ascending: true }).order('hora', { ascending: true })
      if (error) throw error
      const csv = toCSV(data || [])
      downloadCSV(`agendamentos_${new Date().toISOString().slice(0,10)}.csv`, csv)
    } catch (e: any) {
      setError(e.message ?? String(e))
    } finally { setLoadingAg(false) }
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0"><i className="fas fa-file-export me-2"></i>Exportar</h2>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title">Exportar Pacientes</h5>
              <p className="text-muted">Gera um arquivo CSV com os dados dos pacientes.</p>
              <div className="mt-auto">
                <button className="btn btn-primary" onClick={exportPacientes} disabled={loadingPac}>
                  {loadingPac ? (<span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>) : (<i className="fas fa-file-download me-2"></i>)}
                  Exportar CSV
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title">Exportar Agendamentos</h5>
              <p className="text-muted">Gera um arquivo CSV com os dados dos agendamentos.</p>
              <div className="mt-auto">
                <button className="btn btn-success" onClick={exportAgendamentos} disabled={loadingAg}>
                  {loadingAg ? (<span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>) : (<i className="fas fa-file-download me-2"></i>)}
                  Exportar CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}