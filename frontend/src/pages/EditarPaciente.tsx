import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

const EditarPaciente: React.FC = () => {
  const supabase = useMemo(() => getSupabase(), []);
  const navigate = useNavigate();
  const { id } = useParams();

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!supabase || !id) { setLoading(false); return; }
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from('pacientes')
          .select('id, nome, cpf, telefone, email, data_nascimento')
          .eq('id', Number(id))
          .single();
        if (fetchErr) throw fetchErr;
        setNome(data?.nome ?? '');
        setCpf(data?.cpf ?? '');
        setTelefone(data?.telefone ?? '');
        setEmail(data?.email ?? '');
        setDataNascimento(data?.data_nascimento ?? '');
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase, id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !id) return;
    setSaving(true);
    setError(null);
    try {
      const { error: updErr } = await supabase
        .from('pacientes')
        .update({
          nome,
          cpf,
          telefone,
          email,
          data_nascimento: dataNascimento || null,
        })
        .eq('id', Number(id));
      if (updErr) throw updErr;
      navigate('/pacientes');
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container mt-4">Carregando...</div>;
  }

  return (
    <div className="container mt-4">
      <h2>Editar Paciente</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="form-group mb-3">
          <label>Nome</label>
          <input type="text" className="form-control" required value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label>CPF</label>
          <input type="text" className="form-control" required value={cpf} onChange={(e) => setCpf(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label>Telefone</label>
          <input type="text" className="form-control" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label>Email</label>
          <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label>Data de Nascimento</label>
          <input type="date" className="form-control" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-success" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
        <Link to="/pacientes" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
};

export default EditarPaciente;