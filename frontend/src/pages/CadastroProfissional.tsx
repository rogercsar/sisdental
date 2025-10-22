import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function CadastroProfissional() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [clinica, setClinica] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [info] = useState<string | null>(null)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!nome || !clinica || !email || !password) {
      setLoading(false)
      setError('Preencha nome, clínica, e-mail e senha.')
      return
    }
    if (!acceptTerms) {
      setLoading(false)
      setError('É necessário aceitar os termos de uso para continuar.')
      return
    }

    try {
      // Salva os dados de cadastro temporariamente para concluir após o retorno do pagamento
      localStorage.setItem('pendingSignup', JSON.stringify({
        plano: 'profissional',
        nome,
        clinica,
        email,
        password,
      }))

      const origin = window.location.origin
      const resp = await fetch('/api/checkout/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Sisdental - Plano Profissional',
          quantity: 1,
          unit_price: 99.0,
          currency_id: 'BRL',
          external_reference: email,
          back_urls: {
            success: `${origin}/cadastro/retorno`,
            failure: `${origin}/cadastro/retorno`,
            pending: `${origin}/cadastro/retorno`,
          },
          metadata: { plano: 'profissional', nome, clinica },
        }),
      })

      const data = await resp.json()
      if (!resp.ok) {
        throw new Error(data?.error || 'Falha ao iniciar pagamento.')
      }

      const initPoint = data?.init_point || data?.sandbox_init_point
      if (!initPoint) {
        throw new Error('Resposta inválida do provedor de pagamento.')
      }

      window.location.href = initPoint
    } catch (e: any) {
      setError(e.message ?? String(e))
      setLoading(false)
    }
  }

  return (
    <div className="container py-5 min-vh-100 d-flex align-items-center">
      <div className="row justify-content-center w-100">
        <div className="col-sm-10 col-md-8 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <div className="text-center mb-3">
                <i className="fas fa-user-tie fa-2x text-primary"></i>
                <h4 className="mt-2 mb-0">Cadastro (Plano Profissional)</h4>
                <p className="text-muted small">Recursos avançados para sua clínica</p>
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              {info && <div className="alert alert-success">{info}</div>}
              <form onSubmit={onSubmit} className="needs-validation" noValidate>
                <div className="form-floating mb-3">
                  <input id="nome" className="form-control" type="text" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
                  <label htmlFor="nome">Nome</label>
                </div>
                <div className="form-floating mb-3">
                  <input id="clinica" className="form-control" type="text" placeholder="Nome da clínica" value={clinica} onChange={(e) => setClinica(e.target.value)} required />
                  <label htmlFor="clinica">Clínica</label>
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
                <div className="form-check mb-3">
                  <input className="form-check-input" type="checkbox" id="terms" checked={acceptTerms} onChange={e=>setAcceptTerms(e.target.checked)} />
                  <label className="form-check-label" htmlFor="terms">Aceito os termos de uso e política de privacidade</label>
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {loading ? (<><span className="spinner-border spinner-border-sm me-2"></span>Processando...</>) : 'Pagar e Cadastrar'}
                </button>
                <div className="text-muted small mt-2">Ao continuar, você será redirecionado ao Mercado Pago.</div>
              </form>
              <div className="trust-badges mt-3">
                <span className="badge bg-white border text-dark"><i className="fas fa-rotate-left text-success me-1"></i> Garantia 7 dias</span>
                <span className="badge bg-white border text-dark"><i className="fas fa-ban text-primary me-1"></i> Sem fidelidade</span>
                <span className="badge bg-white border text-dark"><i className="fas fa-lock text-success me-1"></i> Pagamento seguro</span>
              </div>
              <div className="faq-box mt-4">
                <h6 className="mb-2">Dúvidas frequentes</h6>
                <div className="small">
                  <details className="mb-2">
                    <summary className="fw-semibold d-flex align-items-center justify-content-between">
                      <span>Como funciona a cobrança?</span>
                      <i className="fas fa-chevron-down text-muted small"></i>
                    </summary>
                    <div className="text-muted mt-2">Mensal via Mercado Pago. Cancele quando quiser.</div>
                  </details>
                  <details className="mb-2">
                    <summary className="fw-semibold d-flex align-items-center justify-content-between">
                      <span>Existe fidelidade?</span>
                      <i className="fas fa-chevron-down text-muted small"></i>
                    </summary>
                    <div className="text-muted mt-2">Não. Sem multa de cancelamento.</div>
                  </details>
                  <details>
                    <summary className="fw-semibold d-flex align-items-center justify-content-between">
                      <span>Posso pedir reembolso?</span>
                      <i className="fas fa-chevron-down text-muted small"></i>
                    </summary>
                    <div className="text-muted mt-2">Sim, garantia de 7 dias.</div>
                  </details>
                </div>
              </div>
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