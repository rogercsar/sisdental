import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

interface Paciente { id: number; nome: string }

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
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    loadAgendamento();
  }, [supabase, id]);

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
          <input type="text" className="form-control" required value={servico} onChange={(e) => setServico(e.target.value)} />
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