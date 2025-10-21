import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

const CadastrarPaciente: React.FC = () => {
  const supabase = useMemo(() => getSupabase(), []);
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase não configurado.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: insertErr } = await supabase
        .from('pacientes')
        .insert({
          nome,
          cpf,
          telefone,
          email,
          data_nascimento: dataNascimento || null,
        });
      if (insertErr) throw insertErr;
      navigate('/pacientes');
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Cadastrar Paciente</h2>
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
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </button>
        <Link to="/pacientes" className="btn btn-secondary ms-2">Cancelar</Link>
      </form>
    </div>
  );
};

export default CadastrarPaciente;