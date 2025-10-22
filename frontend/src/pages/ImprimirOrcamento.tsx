import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'

interface Orcamento {
  id: number
  paciente_id: number
  status?: string | null
  valor_total?: number | null
  observacoes?: string | null
  created_at?: string | null
}

interface Paciente { id: number; nome?: string | null; telefone?: string | null }

interface Tratamento { id: number; tipo_tratamento?: string | null; valor?: number | null; dente_numero?: number | null; dente_numeros?: number[] | null; observacoes?: string | null; concluido?: boolean | null }

function formatCurrency(n?: number | null) {
  if (typeof n !== 'number') return '-'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateISO(d?: string | null): string {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('pt-BR')
}

const ImprimirOrcamento: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const clinicName = import.meta.env.VITE_CLINIC_NAME ?? 'Sisdental Clínica Odontológica'
  const clinicCnpj = import.meta.env.VITE_CLINIC_CNPJ ?? ''
  const clinicPhone = import.meta.env.VITE_CLINIC_PHONE ?? ''
  const clinicAddress = import.meta.env.VITE_CLINIC_ADDRESS ?? ''
  const clinicLogoUrl = import.meta.env.VITE_CLINIC_LOGO_URL ?? ''

  const [clinicCfg, setClinicCfg] = useState<{ nome?: string | null; cnpj?: string | null; telefone?: string | null; endereco?: string | null; logo_url?: string | null } | null>(null)

  const [orcamento, setOrcamento] = useState<Orcamento | null>(null)
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([])
  const [loading, setLoading] = useState(true)

  const total = useMemo(() => {
    if (!tratamentos.length) return orcamento?.valor_total || 0
    return tratamentos.reduce((acc, t) => acc + (t.valor || 0), 0)
  }, [tratamentos, orcamento])

  async function load() {
    setLoading(true)
    try {
      if (!id) {
        alert('ID do orçamento inválido.')
        setLoading(false)
        return
      }
      const sb = getSupabase()
      if (!sb) {
        alert('Supabase não está configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
        setLoading(false)
        return
      }
      const { data: o, error } = await sb
        .from('orcamentos')
        .select('id, paciente_id, status, valor_total, observacoes, created_at')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!o) throw new Error('Orçamento não encontrado')
      setOrcamento(o)

      const { data: p, error: errP } = await sb
        .from('pacientes')
        .select('id, nome, telefone')
        .eq('id', o.paciente_id)
        .maybeSingle()
      if (errP) throw errP
      setPaciente(p || null)

      const { data: ts, error: errT } = await sb
        .from('tratamentos')
        .select('id, tipo_tratamento, valor, dente_numero, dente_numeros, observacoes, concluido, orcamento_id')
        .eq('orcamento_id', o.id)
      if (errT) throw errT
      setTratamentos(ts || [])

      // Carregar configuração da clínica (opcional)
      try {
        const { data: cfg } = await sb
          .from('clinica_config')
          .select('nome, cnpj, telefone, endereco, logo_url')
          .limit(1)
          .maybeSingle()
        setClinicCfg(cfg || null)
      } catch {
        // ignora erro de tabela inexistente
      }
    } catch (e) {
      console.error('Erro ao carregar orçamento para impressão', e)
      alert('Erro ao carregar orçamento para impressão.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Após carregar, aguarda um pouco e aciona a impressão automaticamente
  }, [])

  useEffect(() => {
    if (!loading && orcamento) {
      const t = setTimeout(() => {
        try { window.print() } catch {}
      }, 500)
      return () => clearTimeout(t)
    }
  }, [loading, orcamento])

  const cName = clinicCfg?.nome ?? clinicName
  const cCnpj = clinicCfg?.cnpj ?? clinicCnpj
  const cPhone = clinicCfg?.telefone ?? clinicPhone
  const cAddress = clinicCfg?.endereco ?? clinicAddress
  const cLogo = clinicCfg?.logo_url ?? clinicLogoUrl

  return (
    <div className="p-6 print:p-0">
      <style>
        {`
        @page { margin: 16mm; }
        @media print {
          .no-print { display: none !important; }
          .print-container { box-shadow: none !important; border: none !important; margin: 0 !important; }
          .print-header, .print-footer { position: fixed; left: 0; right: 0; }
          .print-header { top: 0; }
          .print-footer { bottom: 0; }
          .print-body { margin-top: 100px; margin-bottom: 60px; }
          .page-number::after { content: counter(page) ' / ' counter(pages); }
        }
        .print-table th, .print-table td { border: 1px solid #e5e7eb; }
        `}
      </style>

      <div className="no-print mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to={`/orcamentos/${id}`} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded">Voltar</Link>
          <button onClick={() => window.print()} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Imprimir</button>
        </div>
        <div>
          <Link to="/orcamentos" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded">Lista de Orçamentos</Link>
        </div>
      </div>

      <div className="print-header bg-white p-4 border-b">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {cLogo ? (
              <img src={cLogo} alt="Logo da clínica" className="h-12 w-auto" />
            ) : (
              <div className="text-2xl font-bold">{cName}</div>
            )}
          </div>
          <div className="text-right text-xs text-gray-600">
            {cAddress && <div>{cAddress}</div>}
            {cPhone && <div>Telefone: {cPhone}</div>}
            {cCnpj && <div>CNPJ: {cCnpj}</div>}
          </div>
        </div>
      </div>

      <div className="print-body">
        <div className="print-container bg-white rounded shadow p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-xl font-semibold">Orçamento Nº {orcamento?.id}</div>
              <div className="text-sm text-gray-500">Data: {formatDateISO(orcamento?.created_at)}</div>
              {orcamento?.status && (
                <div className="mt-1 text-sm">Status: {orcamento.status}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-medium">Paciente</div>
              <div>{paciente?.nome || '-'}</div>
              {paciente?.telefone && <div className="text-sm text-gray-500">{paciente.telefone}</div>}
            </div>
          </div>

          <table className="w-full text-sm print-table border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left">Procedimento</th>
                <th className="p-2 text-left">Dente</th>
                <th className="p-2 text-left">Observações</th>
                <th className="p-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-3" colSpan={4}>Carregando...</td></tr>
              ) : (
                tratamentos.length ? (
                  tratamentos.map(t => (
                    <tr key={t.id}>
                      <td className="p-2">{t.tipo_tratamento || '-'}</td>
                      <td className="p-2">{t.dente_numero ? `#${t.dente_numero}` : (t.dente_numeros?.length ? t.dente_numeros.join(', ') : '-')}</td>
                      <td className="p-2">{t.observacoes || '-'}</td>
                      <td className="p-2 text-right">{formatCurrency(t.valor)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td className="p-3" colSpan={4}>Nenhum tratamento vinculado a este orçamento.</td></tr>
                )
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="p-2" colSpan={3}><strong>Total</strong></td>
                <td className="p-2 text-right"><strong>{formatCurrency(total)}</strong></td>
              </tr>
            </tfoot>
          </table>

          {orcamento?.observacoes && (
            <div className="mt-6">
              <div className="text-sm font-medium mb-1">Observações</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{orcamento.observacoes}</div>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-600">Validade deste orçamento</div>
              <div className="mt-2 h-10 border rounded" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Assinatura do paciente</div>
              <div className="mt-2 h-10 border rounded" />
            </div>
          </div>
        </div>
      </div>

      <div className="print-footer bg-white p-3 border-t text-xs text-gray-500">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>Este documento é uma estimativa baseada nos tratamentos listados. Valores podem variar conforme avaliação clínica.</div>
          <div className="page-number">Página</div>
        </div>
      </div>
    </div>
  )
}

export default ImprimirOrcamento