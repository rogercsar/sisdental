import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

const PortalLogin: React.FC = () => {
  const supabase = useMemo(() => getSupabase(), []);
  const navigate = useNavigate();

  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const pid = localStorage.getItem('portalPacienteId');
    if (pid) navigate('/portal/home');
  }, []);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabase) { setError('Supabase não configurado.'); return; }
    if (!cpf) { setError('Informe o CPF.'); return; }
    setLoading(true);
    try {
      // DEMO: autenticação baseada apenas no CPF.
      const { data, error: pErr } = await supabase
        .from('pacientes')
        .select('id, nome, cpf')
        .eq('cpf', cpf)
        .single();
      if (pErr) throw pErr;
      if (!data) { setError('Paciente não encontrado.'); return; }
      localStorage.setItem('portalPacienteId', String(data.id));
      navigate('/portal/home');
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 min-vh-100 d-flex align-items-center">
      <div className="row justify-content-center w-100">
        <div className="col-sm-10 col-md-8 col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <div className="text-center mb-3">
                <i className="fas fa-user-circle fa-2x text-primary"></i>
                <h4 className="mt-2 mb-0">Portal do Paciente</h4>
                <p className="text-muted small">Acompanhe consultas e documentos</p>
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={onSubmit} className="needs-validation" noValidate>
                <div className="form-floating mb-3">
                  <input id="cpf" type="text" className="form-control" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} required />
                  <label htmlFor="cpf">CPF</label>
                </div>
                <div className="input-group mb-3">
                  <div className="form-floating flex-grow-1">
                    <input id="senha" type={showPassword ? 'text' : 'password'} className="form-control" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
                    <label htmlFor="senha">Senha</label>
                  </div>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPassword((s) => !s)} title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                <small className="text-muted d-block mb-2">Demo: apenas o CPF é validado nesta etapa.</small>
                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {loading ? (<><span className="spinner-border spinner-border-sm me-2"></span>Entrando...</>) : 'Entrar'}
                </button>
              </form>
              <div className="mt-3 text-center">
                <Link to="/dashboard">Voltar ao Dashboard</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalLogin;