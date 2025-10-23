import { useState, useEffect } from 'react'
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

  useEffect(() => {
    const SITE_URL = 'https://sisdental.com.br';
    const PAGE_URL = `${SITE_URL}/cadastro/profissional`;
    const TITLE = 'Sisdental | Cadastro Plano Profissional';
    const DESCRIPTION = 'Cadastre-se no Plano Profissional do Sisdental e tenha recursos avançados.';

    const nodes: HTMLElement[] = [];
    const add = (tag: keyof HTMLElementTagNameMap, attrs: Record<string, string>) => {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
      nodes.push(el);
      return el;
    };

    document.title = TITLE;
    add('meta', { id: 'meta-desc-cadastro-profissional', name: 'description', content: DESCRIPTION });
    add('link', { id: 'link-canonical-cadastro-profissional', rel: 'canonical', href: PAGE_URL });

    add('meta', { id: 'og-title-cadastro-profissional', property: 'og:title', content: TITLE });
    add('meta', { id: 'og:description-cadastro-profissional', property: 'og:description', content: DESCRIPTION });
    add('meta', { id: 'og:url-cadastro-profissional', property: 'og:url', content: PAGE_URL });

    add('meta', { id: 'tw-card-cadastro-profissional', name: 'twitter:card', content: 'summary' });

    return () => { nodes.forEach((n) => n.parentNode && n.parentNode.removeChild(n)); };
  }, [])

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
    <>
      <div className="container py-5 pt-nav">
      <header className="glass-nav mb-4">
        <div className="container d-flex align-items-center justify-content-between py-2">
          <Link to="/" className="d-flex align-items-center text-decoration-none">
            <img src="/logo-sisdental.png" alt="Sisdental Odonto" height={28} />
          </Link>
          <nav className="d-none d-md-flex align-items-center gap-3">
            <a href="/cadastro#planos" className="text-decoration-none text-dark">Planos</a>
            <a href="/cadastro#comparativo" className="text-decoration-none text-dark">Comparativo</a>
            <a href="/cadastro#depoimentos" className="text-decoration-none text-dark">Depoimentos</a>
          </nav>
          <div className="d-flex align-items-center gap-2">
            <Link to="/login" className="btn btn-outline-primary btn-sm btn-lift">Entrar</Link>
            <Link to="/cadastro/teste" className="btn btn-primary btn-sm btn-lift text-white">Teste grátis</Link>
          </div>
        </div>
      </header>
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
              <div className="d-flex justify-content-center gap-2 mt-3">
                <Link to="/cadastro" className="btn btn-outline-secondary btn-lift">Voltar aos Planos</Link>
                <Link to="/login" className="btn btn-primary btn-lift">Entrar</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      <footer className="site-footer py-5 mt-5">
        <div className="container">
          <div className="row g-3 align-items-center">
            <div className="col-md-4">
              <div className="d-flex align-items-center gap-2">
                <img src="/logo-sisdental.png" alt="Sisdental Odonto" height={120} />
              </div>
              <div className="small text-white-50 mt-2">© {new Date().getFullYear()} Sisdental — Todos os direitos reservados.</div>
              <div className="d-flex gap-2 mt-3">
                <a href="#" className="btn btn-sm btn-outline-light rounded-circle" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
                <a href="#" className="btn btn-sm btn-outline-light rounded-circle" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
                <a href="#" className="btn btn-sm btn-outline-light rounded-circle" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
                <a href="#" className="btn btn-sm btn-outline-light rounded-circle" aria-label="X"><i className="fab fa-x-twitter"></i></a>
              </div>
            </div>
            <div className="col-md-4">
              <ul className="list-unstyled small mb-0">
                <li><a href="/cadastro#planos" className="link-light text-decoration-none">Planos</a></li>
                <li><a href="/cadastro#comparativo" className="link-light text-decoration-none">Comparativo</a></li>
                <li><a href="/cadastro#depoimentos" className="link-light text-decoration-none">Depoimentos</a></li>
              </ul>
            </div>
            <div className="col-md-4">
              <div className="small text-uppercase text-white-50">Acesso</div>
              <ul className="list-unstyled small mb-0">
                <li><Link to="/login" className="link-light text-decoration-none">Entrar</Link></li>
                <li><Link to="/cadastro/teste" className="link-light text-decoration-none">Teste grátis</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
     </>
  )
}