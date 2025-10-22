import { Link } from 'react-router-dom'

export default function Cadastro() {
  return (
    <div className="container py-5">
      <div className="row justify-content-center w-100">
        <div className="col-lg-10">
          <div className="position-relative bg-primary bg-gradient text-white rounded-4 p-4 p-md-5 shadow-sm mb-5">
            <div className="row align-items-center">
              <div className="col-lg-7">
                <h1 className="h2 fw-bold mb-2">Sisdental</h1>
                <p className="lead mb-4">Simplifique a gestão da sua clínica: agenda, pacientes, financeiro e comunicação no mesmo lugar.</p>
                <div className="d-flex gap-2 flex-wrap">
                  <Link to="/cadastro#planos" className="btn btn-light text-primary fw-semibold">
                    Ver Planos
                  </Link>
                  <Link to="/login" className="btn btn-outline-light">
                    Entrar
                  </Link>
                </div>
              </div>
              <div className="col-lg-5 d-none d-lg-block">
                <div className="text-center">
                  <i className="fas fa-tooth fa-7x opacity-75"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <div className="card h-100 shadow-sm border-0 rounded-4">
                <div className="card-body">
                  <h5 className="card-title">O que é o Sisdental?</h5>
                  <p className="text-muted">Plataforma completa de gestão para clínicas odontológicas que centraliza agenda, pacientes, financeiro e comunicação em um só lugar.</p>
                  <ul className="list-unstyled mb-0">
                    <li><i className="fas fa-check text-success me-2"></i> Agenda diária com confirmações</li>
                    <li><i className="fas fa-check text-success me-2"></i> Histórico completo do paciente</li>
                    <li><i className="fas fa-check text-success me-2"></i> Financeiro com relatórios</li>
                    <li><i className="fas fa-check text-success me-2"></i> Portal do Paciente</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="card h-100 shadow-sm border-0 rounded-4">
                <div className="card-body">
                  <h5 className="card-title">Problemas que resolvemos</h5>
                  <ul className="list-unstyled">
                    <li><i className="fas fa-exclamation-triangle text-warning me-2"></i> Faltas por falta de confirmação</li>
                    <li><i className="fas fa-exclamation-triangle text-warning me-2"></i> Agenda confusa e retrabalho</li>
                    <li><i className="fas fa-exclamation-triangle text-warning me-2"></i> Perda de histórico clínico</li>
                    <li><i className="fas fa-exclamation-triangle text-warning me-2"></i> Dificuldade no controle financeiro</li>
                  </ul>
                  <h6 className="mt-3">Por que assinar?</h6>
                  <ul className="list-unstyled mb-0">
                    <li><i className="fas fa-star text-primary me-2"></i> Eficiência e organização</li>
                    <li><i className="fas fa-star text-primary me-2"></i> Redução de faltas</li>
                    <li><i className="fas fa-star text-primary me-2"></i> Insights financeiros</li>
                    <li><i className="fas fa-star text-primary me-2"></i> Melhor experiência para o paciente</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="row g-3 text-center mb-5">
            <div className="col-6 col-md-3">
              <div className="p-3 bg-white border rounded-4 shadow-sm h-100">
                <div className="fw-bold fs-4 text-primary">+200</div>
                <div className="small text-muted">Clínicas</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-3 bg-white border rounded-4 shadow-sm h-100">
                <div className="fw-bold fs-4 text-primary">+10k</div>
                <div className="small text-muted">Agendamentos</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-3 bg-white border rounded-4 shadow-sm h-100">
                <div className="fw-bold fs-4 text-primary">99,9%</div>
                <div className="small text-muted">Disponibilidade</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-3 bg-white border rounded-4 shadow-sm h-100">
                <div className="fw-bold fs-4 text-primary">4,8/5</div>
                <div className="small text-muted">Satisfação</div>
              </div>
            </div>
          </div>
          <div className="text-center mb-4">
            <Link to="/cadastro#planos" className="btn btn-outline-primary btn-lg">Ver Planos</Link>
          </div>
          <div id="planos" className="row g-4">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm border-0 rounded-4">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title mb-0">Plano Básico</h5>
                  </div>
                  <div className="mb-2">
                    <span className="display-6 fw-bold text-success">R$ 49</span>
                    <span className="text-muted">/mês</span>
                  </div>
                  <p className="text-muted">Ideal para começar. Gestão de pacientes e agenda simples.</p>
                  <ul className="mb-3">
                    <li>Agenda diária e mensal</li>
                    <li>Cadastro de pacientes</li>
                    <li>Registro de consultas</li>
                    <li>Suporte por e-mail</li>
                  </ul>
                  <div className="mt-auto">
                    <Link to="/cadastro/basico" className="btn btn-outline-primary w-100">
                      Cadastrar no Básico
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card h-100 shadow-sm border-0 rounded-4">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title mb-0">Plano Profissional</h5>
                    <span className="badge bg-primary">Mais Popular</span>
                  </div>
                  <div className="mb-2">
                    <span className="display-6 fw-bold text-primary">R$ 99</span>
                    <span className="text-muted">/mês</span>
                  </div>
                  <p className="text-muted">Recursos avançados para clínicas em crescimento.</p>
                  <ul className="mb-3">
                    <li>Tudo do Básico + confirmações automáticas</li>
                    <li>Financeiro com relatórios</li>
                    <li>Portal do Paciente</li>
                    <li>Suporte prioritário</li>
                  </ul>
                  <div className="mt-auto">
                    <Link to="/cadastro/profissional" className="btn btn-primary w-100">
                      Cadastrar no Profissional
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h5 className="mb-3 text-center">Comparativo de Recursos</h5>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Recurso</th>
                    <th className="text-center">Básico</th>
                    <th className="text-center">Profissional</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Agenda diária e mensal</td>
                    <td className="text-center"><i className="fas fa-check text-success"></i></td>
                    <td className="text-center"><i className="fas fa-check text-success"></i></td>
                  </tr>
                  <tr>
                    <td>Cadastro e histórico do paciente</td>
                    <td className="text-center"><i className="fas fa-check text-success"></i></td>
                    <td className="text-center"><i className="fas fa-check text-success"></i></td>
                  </tr>
                  <tr>
                    <td>Confirmações automáticas</td>
                    <td className="text-center"><i className="fas fa-minus text-muted"></i></td>
                    <td className="text-center"><i className="fas fa-check text-success"></i></td>
                  </tr>
                  <tr>
                    <td>Financeiro e relatórios</td>
                    <td className="text-center"><i className="fas fa-minus text-muted"></i></td>
                    <td className="text-center"><i className="fas fa-check text-success"></i></td>
                  </tr>
                  <tr>
                    <td>Portal do Paciente</td>
                    <td className="text-center"><i className="fas fa-minus text-muted"></i></td>
                    <td className="text-center"><i className="fas fa-check text-success"></i></td>
                  </tr>
                  <tr>
                    <td>Suporte prioritário</td>
                    <td className="text-center"><i className="fas fa-minus text-muted"></i></td>
                    <td className="text-center"><i className="fas fa-check text-success"></i></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5">
            <h5 className="mb-3 text-center">Depoimentos</h5>
            <div className="row g-3">
              <div className="col-md-4">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body">
                    <p className="mb-2">“O Sisdental nos ajudou a organizar a agenda e reduzir faltas.”</p>
                    <div className="small text-muted">Clínica Sorriso — São Paulo</div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body">
                    <p className="mb-2">“Facilitou o acompanhamento do histórico do paciente e do financeiro.”</p>
                    <div className="small text-muted">Odonto Vida — Belo Horizonte</div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body">
                    <p className="mb-2">“Equipe de suporte atenciosa e plataforma simples de usar.”</p>
                    <div className="small text-muted">Clínica Bem-Estar — Curitiba</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <Link to="/login">Voltar ao Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}