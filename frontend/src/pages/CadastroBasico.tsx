import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'

export default function CadastroBasico() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const sb = getSupabase()
    if (!sb) { setError('Supabase não configurado.'); setLoading(false); return }
    try {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { plano: 'basico', nome } }
      })
      if (error) throw error
      if (data?.session) {
        setInfo('Cadastro realizado! Você já pode fazer login.')
        setTimeout(() => navigate('/login'), 1200)
      } else {
        setInfo('Cadastro realizado! Verifique seu e-mail para confirmar sua conta.')
      }
    } catch (e: any) {
      setError(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-5 min-vh-100 d-flex align-items-center">
      <div className="row justify-content-center w-100">
        <div className="col-sm-10 col-md-8 col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <div className="text-center mb-3">
                <i className="fas fa-user-plus fa-2x text-primary"></i>
                <h4 className="mt-2 mb-0">Cadastro (Plano Básico)</h4>
                <p className="text-muted small">Crie sua conta para começar</p>
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              {info && <div className="alert alert-success">{info}</div>}
              <form onSubmit={onSubmit} className="needs-validation" noValidate>
                <div className="form-floating mb-3">
                  <input id="nome" className="form-control" type="text" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
                  <label htmlFor="nome">Nome</label>
                </div>
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
                <button type="submit" className="btn btn-success w-100" disabled={loading}>
                  {loading ? (<><span className="spinner-border spinner-border-sm me-2"></span>Cadastrando...</>) : 'Cadastrar'}
                </button>
              </form>
              <div className="mt-3 text-center">
                <Link to="/cadastro">Voltar aos Planos</Link>
              </div>
              <div className="mt-2 text-center">
                <small className="text-muted">Já tem conta?</small>
                <div><Link to="/login">Entrar</Link></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}