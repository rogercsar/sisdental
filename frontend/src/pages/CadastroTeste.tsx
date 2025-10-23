import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { startTrial, getTrialInfo } from '../lib/trial'

export default function CadastroTeste() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const TITLE = 'Sisdental | Teste grátis por 15 dias'
    const DESCRIPTION = 'Ative seu período de teste gratuito por 15 dias para conhecer o Sisdental.'
    document.title = TITLE
    const meta = document.createElement('meta')
    meta.name = 'description'
    meta.content = DESCRIPTION
    document.head.appendChild(meta)
    return () => { meta.parentNode && meta.parentNode.removeChild(meta) }
  }, [])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTrial(nome, email, 15)
    setSubmitted(true)
  }

  const info = getTrialInfo()

  return (
    <div className="container py-5 pt-nav">
      <header className="glass-nav mb-4">
        <div className="container d-flex align-items-center justify-content-between py-2">
          <Link to="/" className="d-flex align-items-center text-decoration-none">
            <i className="fas fa-tooth text-primary me-2 fa-lg"></i>
            <span className="fw-semibold text-dark fs-5">Sisdental</span>
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
          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-body p-4">
              <div className="text-center mb-3">
                <i className="fas fa-rocket fa-2x text-primary"></i>
                <h1 className="h4 mt-2">Ative seu Teste Gratuito</h1>
                <p className="text-muted mb-0">15 dias para explorar todos os recursos.</p>
              </div>

              {!submitted ? (
                <form onSubmit={onSubmit} className="needs-validation" noValidate>
                  <div className="mb-3">
                    <label className="form-label">Nome</label>
                    <input type="text" className="form-control" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">E-mail</label>
                    <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
                    <div className="form-text">Opcional. Usaremos apenas para contato sobre sua avaliação.</div>
                  </div>
                  <button type="submit" className="btn btn-primary w-100 btn-lift">Começar teste de 15 dias</button>
                </form>
              ) : (
                <div className="text-center">
                  <div className="alert alert-success rounded-3">
                    <i className="fas fa-check-circle me-1"></i>
                    Seu teste gratuito foi iniciado.
                  </div>
                  {info.expires && (
                    <p className="text-muted">Expira em {new Date(info.expires).toLocaleDateString()}</p>
                  )}
                  <div className="d-flex gap-2 justify-content-center mt-3">
                    <a href="/cadastro#planos" className="btn btn-outline-primary btn-lift">Ver planos</a>
                    <Link to="/login" className="btn btn-primary btn-lift text-white">Entrar</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-5 border-top pt-3">
        <div className="d-flex justify-content-center gap-3">
          <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-muted"><i className="fab fa-instagram"></i></a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-muted"><i className="fab fa-facebook"></i></a>
          <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="text-muted"><i className="fab fa-linkedin"></i></a>
          <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-muted"><i className="fab fa-x-twitter"></i></a>
        </div>
      </footer>
    </div>
  )
}