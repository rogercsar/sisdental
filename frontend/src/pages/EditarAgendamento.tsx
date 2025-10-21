import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

interface Paciente { id: number; nome: string }
interface Servico { id: number; nome: string; preco_padrao?: number | null; ativo?: boolean | null }

const statusLista = ['Agendado', 'Confirmado', 'Realizado', 'Cancelado', 'Não Compareceu'];

const EditarAgendamento: React.FC = () => {
  const supabase = useMemo(() => getSupabase(), []);
  const navigate = useNavigate();
  const { id } = useParams();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState<number | ''>('' as any);
  const [servico, setServico] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [status, setStatus] = useState('Agendado');
  const [observacoes, setObservacoes] = useState('');
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoId, setServicoId] = useState<number | 'manual' | ''>('');
  const [precoSugerido, setPrecoSugerido] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPacientes = async () => {
      if (!supabase) return;
      const { data, error } = await supabase.from('pacientes').select('id, nome').order('nome');
      if (error) { setError(error.message); return; }
      setPacientes(data as Paciente[]);
    };
    loadPacientes();
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('servicos')
      .select('id, nome, preco_padrao, ativo')
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Erro ao carregar serviços:', error);
        } else {
          setServicos((data || []) as Servico[]);
        }
      });
  }, [supabase]);

  useEffect(() => {
    const loadAgendamento = async () => {
      if (!supabase || !id) { setLoading(false); return; }
      setError(null);
      try {
        const { data: ag, error: agErr } = await supabase
          .from('agendamentos')
          .select('id, paciente_id, servico, data, hora, status, observacoes')
          .eq('id', Number(id))
          .single();
        if (agErr) throw agErr;
        setPacienteId(ag?.paciente_id ?? '');
        setServico(ag?.servico ?? '');
        setData(ag?.data ?? '');
        setHora((ag?.hora ?? '').slice(0,5)); // HH:MM
        setStatus(ag?.status ?? 'Agendado');
        setObservacoes(ag?.observacoes ?? '');
        // Pré-seleciona dropdown se o nome do serviço bater com catálogo
        const match = (ag?.servico ?? '').trim();
        if (match) {
          const s = (servicos || []).find(x => x.nome === match);
          if (s) {
            setServicoId(s.id);
            setPrecoSugerido(s.preco_padrao ?? null);
          } else {
            setServicoId('manual');
            setPrecoSugerido(null);
          }
        }
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    loadAgendamento();
  }, [supabase, id, servicos]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !id || !pacienteId) return;
    setSaving(true);
    setError(null);
    try {
      const { error: updErr } = await supabase
        .from('agendamentos')
        .update({
          paciente_id: Number(pacienteId),
          servico,
          data,
          hora: hora ? `${hora}:00` : null,
          status,
          observacoes: observacoes || null,
        })
        .eq('id', Number(id));
      if (updErr) throw updErr;
      navigate('/agendamentos');
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="container mt-4">Carregando...</div>;

  return (
    <div className="container mt-4">
      <h2>Editar Agendamento</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={onSubmit} className="card p-4 shadow-sm">
        <div className="mb-3">
          <label className="form-label">Paciente *</label>
          <select className="form-select" value={pacienteId} onChange={(e) => setPacienteId(Number(e.target.value))} required>
            <option value="">Selecione o paciente...</option>
            {pacientes.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Serviço *</label>
          <select
            className="form-select"
            value={servicoId}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') {
                setServicoId('');
                setServico('');
                setPrecoSugerido(null);
              } else if (v === 'manual') {
                setServicoId('manual');
                setServico('');
                setPrecoSugerido(null);
              } else {
                const idNum = Number(v);
                setServicoId(idNum);
                const s = servicos.find(x => x.id === idNum);
                setServico(s?.nome ?? '');
                setPrecoSugerido(s?.preco_padrao ?? null);
              }
            }}
            required
          >
            <option value="">Selecione o serviço...</option>
            {servicos.map(s => (<option key={s.id} value={s.id}>{s.nome}</option>))}
            <option value="manual">Outro (digitar)</option>
          </select>
          {servicoId === 'manual' && (
            <input
              type="text"
              className="form-control mt-2"
              placeholder="Descreva o serviço"
              value={servico}
              onChange={(e) => setServico(e.target.value)}
            />
          )}
          {precoSugerido != null && (
            <div className="form-text">Preço padrão: {precoSugerido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          )}
        </div>
        <div className="row">
          <div className="col-md-4 mb-3">
            <label className="form-label">Data *</label>
            <input type="date" className="form-control" required value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="col-md-4 mb-3">
            <label className="form-label">Hora *</label>
            <input type="time" className="form-control" required value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="col-md-4 mb-3">
            <label className="form-label">Status *</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              {statusLista.map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label">Observações</label>
          <textarea className="form-control" rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>
        <div className="d-flex justify-content-end">
          <Link to="/agendamentos" className="btn btn-secondary me-2">Cancelar</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Alterações'}</button>
        </div>
      </form>
    </div>
  );
};

export default EditarAgendamento;