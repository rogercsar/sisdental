import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

interface Paciente { id: number; nome: string }
interface Servico { id: number; nome: string; preco_padrao?: number | null; ativo?: boolean | null }

const statusLista = ['Agendado', 'Confirmado', 'Realizado', 'Cancelado', 'Não Compareceu'];

const CadastrarAgendamento: React.FC = () => {
  const supabase = useMemo(() => getSupabase(), []);
  const navigate = useNavigate();

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

  const [loading, setLoading] = useState(false);
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !pacienteId) { setError('Selecione um paciente.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { error: insertErr } = await supabase
        .from('agendamentos')
        .insert({
          paciente_id: Number(pacienteId),
          servico,
          data,
          hora: hora ? `${hora}:00` : null, // Vite/time input -> HH:MM
          status,
          observacoes: observacoes || null,
        });
      if (insertErr) throw insertErr;
      navigate('/agendamentos');
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Cadastrar Agendamento</h2>
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
                const id = Number(v);
                setServicoId(id);
                const s = servicos.find(x => x.id === id);
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
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Salvando...' : 'Cadastrar'}</button>
        </div>
      </form>
    </div>
  );
};

export default CadastrarAgendamento;