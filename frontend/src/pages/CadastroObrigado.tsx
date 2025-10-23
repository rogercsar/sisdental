import { Link } from 'react-router-dom'

export default function CadastroObrigado() {
  return (
    <div className="d-flex flex-column min-vh-100 pt-nav">
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

      <main className="container py-5 flex-grow-1">
        <div className="row justify-content-center w-100">
          <div className="col-sm-10 col-md-8 col-lg-6">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4 text-center">
                <i className="fas fa-check-circle text-success fa-2x mb-2"></i>
                <h4 className="mb-3">Cadastro concluído!</h4>
                <div className="alert alert-info">Pagamento aprovado e sua conta foi criada.</div>
                <div className="d-flex gap-2 justify-content-center mt-2">
                  <Link to="/login" className="btn btn-primary btn-lift">Ir para Login</Link>
                  <Link to="/cadastro" className="btn btn-outline-secondary btn-lift">Voltar aos Planos</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="site-footer py-5 mt-auto">
        <div className="container">
          <div className="row g-3 align-items-center">
            <div className="col-md-4">
              <div className="d-flex align-items-center gap-2">
                <img src="/logo-sisdental.png" alt="Sisdental Odonto" height={120} />
              </div>
              <div className="small text-white-50 mt-2">© {new Date().getFullYear()} Sisdental — Todos os direitos reservados.</div>
            </div>
            <div className="col-md-8 d-flex justify-content-end gap-2">
              <Link to="/login" className="btn btn-sm btn-outline-light">Entrar</Link>
              <Link to="/cadastro" className="btn btn-sm btn-outline-light">Planos</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}