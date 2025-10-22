import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

const PortalLogin: React.FC = () => {
  const supabase = useMemo(() => getSupabase(), []);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (data?.session) navigate('/portal/home');
    };
    check();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supabase) { setError('Supabase não configurado.'); return; }
    if (!email || !senha) { setError('Informe email e senha.'); return; }
    setLoading(true);
    try {
      const { data: signInData, error: signErr } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (signErr) throw signErr;
      if (!signInData.session?.user) throw new Error('Sessão inválida.');
      const userId = signInData.session.user.id;

      // Buscar vínculo do perfil com paciente
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('paciente_id, role')
        .eq('id', userId)
        .single();
      if (profErr) throw profErr;
      if (!prof || prof.role !== 'paciente' || !prof.paciente_id) {
        throw new Error('Sua conta não está vinculada a um paciente. Entre em contato com a clínica.');
      }

      localStorage.setItem('portalPacienteId', String(prof.paciente_id));
      navigate('/portal/home');
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Link to="/login" className="btn btn-outline-primary btn-sm position-fixed top-0 end-0 m-3 z-3 btn-lift" title="Acesso Clínico">Acesso Clínico</Link>
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
                  <input id="email" type="email" className="form-control" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <label htmlFor="email">Email</label>
                </div>
                <div className="input-group mb-3">
                  <div className="form-floating flex-grow-1">
                    <input id="senha" type={showPassword ? 'text' : 'password'} className="form-control" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required />
                    <label htmlFor="senha">Senha</label>
                  </div>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPassword((s) => !s)} title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {loading ? (<><span className="spinner-border spinner-border-sm me-2"></span>Entrando...</>) : 'Entrar'}
                </button>
              </form>

            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default PortalLogin;