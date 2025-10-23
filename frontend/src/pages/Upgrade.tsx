import { Link } from 'react-router-dom'

export default function Upgrade() {
  document.title = 'Sisdental | Seu teste expirou'
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

      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4 text-center">
              <i className="fas fa-lock fa-2x text-warning"></i>
              <h1 className="h4 mt-2">Seu período de teste expirou</h1>
              <p className="text-muted">Para continuar usando o Sisdental, escolha um plano.</p>
              <div className="d-flex justify-content-center gap-2 mt-2">
                <a href="/cadastro#planos" className="btn btn-outline-primary btn-lift">Ver planos</a>
                <Link to="/cadastro/profissional" className="btn btn-primary btn-lift text-white">Assinar Profissional</Link>
              </div>
              <div className="mt-3">
                <Link to="/login" className="small text-decoration-none">Já sou assinante</Link>
              </div>
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