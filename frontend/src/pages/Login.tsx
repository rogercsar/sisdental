import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const sb = getSupabase()
    sb?.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/dashboard')
    }).catch(() => {})
  }, [])
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const sb = getSupabase()
    if (!sb) { setError('Supabase não configurado.'); setLoading(false); return }
    const { error } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <>
      <Link to="/portal/login" className="btn btn-outline-primary btn-sm position-fixed top-0 end-0 m-3 z-3 btn-lift" title="Acesso do Paciente">Acesso do Paciente</Link>
      <div className="container py-5 min-vh-100 d-flex align-items-center">
      <div className="row justify-content-center w-100">
        <div className="col-sm-10 col-md-8 col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <div className="text-center mb-3">
                <img src="/logo-sisdental.png" alt="Sisdental Odonto" height={180} />
                <p className="text-muted small mt-2">Acesse o painel administrativo</p>
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={onSubmit} className="needs-validation" noValidate>
                <div className="form-floating mb-3">
                  <input id="email" className="form-control" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <label htmlFor="email">Email</label>
                </div>
                <div className="input-group mb-3">
                  <div className="form-floating flex-grow-1">
                    <input id="password" className="form-control" type={showPassword ? 'text' : 'password'} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <label htmlFor="password">Senha</label>
                  </div>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPassword((s) => !s)} title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {loading ? (<><span className="spinner-border spinner-border-sm me-2"></span>Entrando...</>) : 'Entrar'}
                </button>
              </form>
              <div className="mt-3 text-center">
                <small className="text-muted">Não tem conta?</small>
                <div><Link to="/cadastro">Cadastre-se</Link></div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}