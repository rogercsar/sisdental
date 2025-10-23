import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function CadastroBasico() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [info] = useState<string | null>(null)

  // Pagamento (simulado)
  const [paymentMethod, setPaymentMethod] = useState<'cartao' | 'pix'>('cartao')
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  useEffect(() => {
    const SITE_URL = 'https://sisdental.com.br';
    const PAGE_URL = `${SITE_URL}/cadastro/basico`;
    const TITLE = 'Sisdental | Cadastro Plano Básico';
    const DESCRIPTION = 'Cadastre-se no Plano Básico do Sisdental e comece em minutos.';

    const nodes: HTMLElement[] = [];
    const add = (tag: keyof HTMLElementTagNameMap, attrs: Record<string, string>) => {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
      nodes.push(el);
      return el;
    };

    document.title = TITLE;
    add('meta', { id: 'meta-desc-cadastro-basico', name: 'description', content: DESCRIPTION });
    add('link', { id: 'link-canonical-cadastro-basico', rel: 'canonical', href: PAGE_URL });

    add('meta', { id: 'og-title-cadastro-basico', property: 'og:title', content: TITLE });
    add('meta', { id: 'og:description-cadastro-basico', property: 'og:description', content: DESCRIPTION });
    add('meta', { id: 'og:url-cadastro-basico', property: 'og:url', content: PAGE_URL });

    add('meta', { id: 'tw-card-cadastro-basico', name: 'twitter:card', content: 'summary' });

    return () => { nodes.forEach((n) => n.parentNode && n.parentNode.removeChild(n)); };
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!nome || !email || !password) {
      setLoading(false)
      setError('Preencha nome, e-mail e senha.')
      return
    }
    if (!acceptTerms) {
      setLoading(false)
      setError('É necessário aceitar os termos de uso para continuar.')
      return
    }

    try {
      // Salva dados de cadastro localmente para uso após retorno do pagamento
      localStorage.setItem('pendingSignup', JSON.stringify({
        plano: 'basico',
        nome,
        email,
        password,
      }))

      const origin = window.location.origin
      const resp = await fetch('/api/checkout/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Sisdental - Plano Básico',
          quantity: 1,
          unit_price: 49.0,
          currency_id: 'BRL',
          external_reference: email,
          back_urls: {
            success: `${origin}/cadastro/retorno`,
            failure: `${origin}/cadastro/retorno`,
            pending: `${origin}/cadastro/retorno`,
          },
          metadata: { plano: 'basico', nome },
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
    <div className="container py-5 pt-nav">
      <header className="glass-nav mb-4">
        <div className="container d-flex align-items-center justify-content-between py-2">
          <Link to="/" className="d-flex align-items-center text-decoration-none">
            <i className="fas fa-tooth text-primary me-2"></i>
            <span className="fw-semibold text-dark">Sisdental</span>
          </Link>
          <nav className="d-none d-md-flex align-items-center gap-3">
            <a href="/cadastro#planos" className="text-decoration-none text-dark">Planos</a>
            <a href="/cadastro#comparativo" className="text-decoration-none text-dark">Comparativo</a>
            <a href="/cadastro#depoimentos" className="text-decoration-none text-dark">Depoimentos</a>
          </nav>
          <div className="d-flex align-items-center gap-2">
            <Link to="/login" className="btn btn-outline-primary btn-sm btn-lift">Entrar</Link>
            <Link to="/cadastro#planos" className="btn btn-primary btn-sm btn-lift">Teste grátis</Link>
          </div>
        </div>
      </header>
      <div className="row justify-content-center w-100">
        <div className="col-sm-10 col-md-8 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <div className="text-center mb-3">
                <i className="fas fa-user-plus fa-2x text-primary"></i>
                <h4 className="mt-2 mb-0">Cadastro (Plano Básico)</h4>
                <p className="text-muted small">Informe seus dados e efetue o pagamento</p>
              </div>
              {error && <div className="alert alert-danger">{error}</div>}
              {info && <div className="alert alert-success">{info}</div>}
              <form onSubmit={onSubmit} className="needs-validation" noValidate>
                {/* Dados da conta */}
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

                {/* Resumo e pagamento */}
                <div className="border rounded-3 p-3 mb-3 bg-light">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>Plano Básico</strong>
                    <span className="text-success fw-bold">R$ 49/mês</span>
                  </div>
                  <div className="small text-muted mb-2">Inclui agenda, cadastro de pacientes, registro de consultas e suporte por e-mail.</div>
                  <div className="mb-2">
                    <div className="form-check form-check-inline">
                      <input className="form-check-input" type="radio" name="payment" id="p1" checked={paymentMethod==='cartao'} onChange={() => setPaymentMethod('cartao')} />
                      <label className="form-check-label" htmlFor="p1">Cartão de crédito</label>
                    </div>
                    <div className="form-check form-check-inline">
                      <input className="form-check-input" type="radio" name="payment" id="p2" checked={paymentMethod==='pix'} onChange={() => setPaymentMethod('pix')} />
                      <label className="form-check-label" htmlFor="p2">Pix</label>
                    </div>
                  </div>

                  {paymentMethod === 'cartao' ? (
                    <div className="row g-2">
                      <div className="col-12">
                        <div className="form-floating">
                          <input id="cardNumber" className="form-control" placeholder="Número do cartão" value={cardNumber} onChange={e=>setCardNumber(e.target.value)} />
                          <label htmlFor="cardNumber">Número do cartão</label>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="form-floating">
                          <input id="cardName" className="form-control" placeholder="Nome impresso no cartão" value={cardName} onChange={e=>setCardName(e.target.value)} />
                          <label htmlFor="cardName">Nome impresso no cartão</label>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="form-floating">
                          <input id="cardExpiry" className="form-control" placeholder="MM/AA" value={cardExpiry} onChange={e=>setCardExpiry(e.target.value)} />
                          <label htmlFor="cardExpiry">Validade (MM/AA)</label>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="form-floating">
                          <input id="cardCvv" className="form-control" placeholder="CVV" value={cardCvv} onChange={e=>setCardCvv(e.target.value)} />
                          <label htmlFor="cardCvv">CVV</label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="alert alert-info mb-0">
                      Ao continuar, um QR Code Pix será gerado para pagamento.
                    </div>
                  )}
                  <div className="trust-badges mt-3">
                    <span className="badge bg-white border text-dark"><i className="fas fa-rotate-left text-success me-1"></i> Garantia 7 dias</span>
                    <span className="badge bg-white border text-dark"><i className="fas fa-ban text-primary me-1"></i> Sem fidelidade</span>
                    <span className="badge bg-white border text-dark"><i className="fas fa-lock text-success me-1"></i> Pagamento seguro</span>
                  </div>
                </div>

                <div className="form-check mb-3">
                  <input className="form-check-input" type="checkbox" id="terms" checked={acceptTerms} onChange={e=>setAcceptTerms(e.target.checked)} />
                  <label className="form-check-label" htmlFor="terms">Aceito os termos de uso e política de privacidade</label>
                </div>

                <button type="submit" className="btn btn-success w-100 btn-lift" disabled={loading}>
                  {loading ? (<><span className="spinner-border spinner-border-sm me-2"></span>Processando...</>) : 'Pagar e Cadastrar'}
                </button>
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
              </form>
              <div className="d-flex justify-content-center gap-2 mt-3">
                <Link to="/cadastro" className="btn btn-outline-secondary btn-lift">Voltar aos Planos</Link>
                <Link to="/login" className="btn btn-primary btn-lift">Entrar</Link>
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
              <i className="fas fa-tooth text-primary"></i>
              <strong className="mb-0">Sisdental</strong>
            </div>
            <div className="small text-white-50 mt-2">© {new Date().getFullYear()} Sisdental — Todos os direitos reservados.</div>
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
              <li><Link to="/cadastro#planos" className="link-light text-decoration-none">Teste grátis</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
    </div>
  )
}