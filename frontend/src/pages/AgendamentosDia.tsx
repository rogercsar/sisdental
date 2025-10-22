import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'

interface Agendamento {
  id: number
  paciente_id: number
  data: string
  hora?: string | null
  status?: string | null
  status_pagamento?: string | null
  valor_previsto?: number | null
  observacoes?: string | null
  servico?: string | null
}

interface PacienteRef {
  id: number
  nome?: string | null
  telefone?: string | null
}

function todayISO(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatHour(h: number) {
  return `${`${h}`.padStart(2, '0')}:00`
}

function formatCurrency(n?: number | null) {
  if (typeof n !== 'number') return '-'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const AgendamentosDia: React.FC = () => {
  const supabase = getSupabase()
  const navigate = useNavigate()

  const [date, setDate] = useState<string>(todayISO())
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<string>('Todos')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pacientesMap, setPacientesMap] = useState<Record<number, PacienteRef>>({})
  const [loading, setLoading] = useState(false)
  const [servicoFiltro, setServicoFiltro] = useState<string>('Todos')

  const horasDia = useMemo(() => {
    const start = 7
    const end = 21
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [])

  async function load() {
    setLoading(true)
    try {
      const { data: ags, error } = await supabase
        .from('agendamentos')
        .select('id, paciente_id, data, hora, status, status_pagamento, valor_previsto, observacoes, servico')
        .eq('data', date)
        .order('hora', { ascending: true })
      if (error) throw error
      setAgendamentos(ags || [])

      const pacienteIds = Array.from(new Set((ags || []).map(a => a.paciente_id)))
      if (pacienteIds.length) {
        const { data: pacs, error: errP } = await supabase
          .from('pacientes')
          .select('id, nome, telefone')
          .in('id', pacienteIds)
        if (errP) throw errP
        const map: Record<number, PacienteRef> = {}
        ;(pacs || []).forEach(p => { map[p.id] = p })
        setPacientesMap(map)
      } else {
        setPacientesMap({})
      }
    } catch (e) {
      console.error('Erro ao carregar agendamentos do dia', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const servicos = useMemo(() => {
    const set = new Set<string>()
    agendamentos.forEach(a => { const s = (a.servico || '').trim(); if (s) set.add(s) })
    return Array.from(set).sort((a,b) => a.localeCompare(b))
  }, [agendamentos])

  const agsFiltrados = useMemo(() => {
    const term = busca.trim().toLowerCase()
    return agendamentos.filter(a => {
      const pac = pacientesMap[a.paciente_id]
      const nome = (pac?.nome || '').toLowerCase()
      const matchBusca = !term || nome.includes(term) || (a.observacoes || '').toLowerCase().includes(term)
      const matchStatus = statusFiltro === 'Todos' || (a.status || '') === statusFiltro
      const matchServico = servicoFiltro === 'Todos' || (a.servico || '') === servicoFiltro
      return matchBusca && matchStatus && matchServico
    })
  }, [agendamentos, pacientesMap, busca, statusFiltro])

  function shareWhatsApp(a: Agendamento) {
    const pac = pacientesMap[a.paciente_id]
    const nome = pac?.nome || 'Paciente'
    const dia = new Date(a.data + 'T00:00:00')
    const hora = a.hora || ''
    const texto = `Olá ${nome}, lembrando do seu agendamento em ${dia.toLocaleDateString('pt-BR')} às ${hora}.` + (a.observacoes ? ` Observações: ${a.observacoes}` : '')
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  async function excluir(a: Agendamento) {
    if (!confirm('Deseja realmente excluir este agendamento?')) return
    const { error } = await supabase.from('agendamentos').delete().eq('id', a.id)
    if (error) {
      alert('Erro ao excluir: ' + error.message)
    } else {
      await load()
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Agendamentos do Dia</h1>
        <div className="flex gap-2">
          <Link to="/agendamentos" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded">Ver lista</Link>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm text-gray-600">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Buscar por nome ou observações</label>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Digite para filtrar" className="mt-1 w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Status</label>
            <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} className="mt-1 w-full border rounded px-2 py-1">
              <option>Todos</option>
              <option>Agendado</option>
              <option>Confirmado</option>
              <option>Concluído</option>
              <option>Cancelado</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Serviço</label>
            <select value={servicoFiltro} onChange={e => setServicoFiltro(e.target.value)} className="mt-1 w-full border rounded px-2 py-1">
              <option>Todos</option>
              {servicos.map(s => (<option key={s}>{s}</option>))}
            </select>
          </div>
          <div className="flex items-end"><button onClick={load} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Atualizar</button></div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        {loading ? (
          <div className="text-gray-500">Carregando...</div>
        ) : (
          <div className="space-y-6">
            {horasDia.map(h => {
               const label = formatHour(h)
               const items = agsFiltrados.filter(a => (a.hora || '').slice(0, 2) === `${h}`.padStart(2, '0'))
               return (
                 <div key={h}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-20 text-right font-medium ${items.length ? 'text-blue-600' : 'text-gray-600'}`}>{label}</div>
                    <div className="h-px bg-gray-200 flex-1" />
                   </div>
                  {items.length === 0 ? (
                    <div className="ml-24 text-sm text-gray-400">Sem agendamentos neste horário</div>
                  ) : (
                    <div className="ml-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {items.map(a => {
                        const pac = pacientesMap[a.paciente_id]
                        return (
                          <div key={a.id} className="border rounded p-3 hover:shadow-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{pac?.nome || 'Paciente'}</div>
                                <div className="text-xs text-gray-500">{a.status || 'Agendado'} • {a.hora || ''} • {formatCurrency(a.valor_previsto)}</div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => navigate(`/consulta/${a.id}`)} className="px-2 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded">Consulta</button>
                                <button onClick={() => navigate(`/agendamentos/${a.id}/editar`)} className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Editar</button>
                              </div>
                            </div>
                            {a.observacoes && <div className="mt-2 text-sm text-gray-600">{a.observacoes}</div>}
                            <div className="mt-3 flex gap-2">
                              <button onClick={() => shareWhatsApp(a)} className="px-2 py-1 text-sm bg-emerald-100 hover:bg-emerald-200 rounded">WhatsApp</button>
                              <button onClick={() => excluir(a)} className="px-2 py-1 text-sm bg-red-100 hover:bg-red-200 rounded">Excluir</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default AgendamentosDia