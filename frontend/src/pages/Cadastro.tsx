import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function Cadastro() {
  useEffect(() => {
    const SITE_URL = 'https://sisdental.com.br';
    const PAGE_URL = `${SITE_URL}/cadastro`;
    const TITLE = 'Sisdental | Planos e Assinatura';
    const DESCRIPTION = 'Simplifique a gestão da sua clínica: agenda, pacientes, financeiro e comunicação no mesmo lugar.';

    const nodes: HTMLElement[] = [];
    const add = (tag: keyof HTMLElementTagNameMap, attrs: Record<string, string>) => {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
      nodes.push(el);
      return el;
    };

    document.title = TITLE;
    add('meta', { id: 'meta-desc-cadastro', name: 'description', content: DESCRIPTION });
    add('link', { id: 'link-canonical-cadastro', rel: 'canonical', href: PAGE_URL });

    add('meta', { id: 'og-locale-cadastro', property: 'og:locale', content: 'pt_BR' });
    add('meta', { id: 'og-type-cadastro', property: 'og:type', content: 'website' });
    add('meta', { id: 'og-title-cadastro', property: 'og:title', content: TITLE });
    add('meta', { id: 'og-desc-cadastro', property: 'og:description', content: DESCRIPTION });
    add('meta', { id: 'og-url-cadastro', property: 'og:url', content: PAGE_URL });
    add('meta', { id: 'og-site-cadastro', property: 'og:site_name', content: 'Sisdental' });
    add('meta', { id: 'og-image-cadastro', property: 'og:image', content: 'https://images.unsplash.com/photo-1629904853696-f86d4b6cc8d1?q=80&w=1200&auto=format&fit=crop' });

    add('meta', { id: 'tw-card-cadastro', name: 'twitter:card', content: 'summary_large_image' });
    add('meta', { id: 'tw-title-cadastro', name: 'twitter:title', content: TITLE });
    add('meta', { id: 'tw-desc-cadastro', name: 'twitter:description', content: DESCRIPTION });
    add('meta', { id: 'tw-image-cadastro', name: 'twitter:image', content: 'https://images.unsplash.com/photo-1629904853696-f86d4b6cc8d1?q=80&w=1200&auto=format&fit=crop' });

    const orgJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Sisdental',
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.svg`,
      sameAs: [] as string[],
    };
    const org = document.createElement('script');
    org.type = 'application/ld+json';
    org.id = 'org-jsonld-cadastro';
    org.text = JSON.stringify(orgJsonLd);
    document.head.appendChild(org);
    nodes.push(org);

    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Como funciona a cobrança?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A cobrança é mensal via Mercado Pago. Você pode cancelar quando quiser.'
          }
        },
        {
          '@type': 'Question',
          name: 'Existe fidelidade?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Não. Você pode cancelar sem multa a qualquer momento.'
          }
        },
        {
          '@type': 'Question',
          name: 'Posso pedir reembolso?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sim, oferecemos garantia de 7 dias.'
          }
        }
      ]
    };
    const faq = document.createElement('script');
    faq.type = 'application/ld+json';
    faq.id = 'faq-jsonld-cadastro';
    faq.text = JSON.stringify(faqJsonLd);
    document.head.appendChild(faq);
    nodes.push(faq);

    return () => {
      nodes.forEach((n) => n.parentNode && n.parentNode.removeChild(n));
    };
  }, []);
  const testimonials = [
    { quote: 'O Sisdental nos ajudou a organizar a agenda e reduzir faltas.', author: 'Clínica Sorriso — São Paulo' },
    { quote: 'Facilitou o acompanhamento do histórico do paciente e do financeiro.', author: 'Odonto Vida — Belo Horizonte' },
    { quote: 'Equipe de suporte atenciosa e plataforma simples de usar.', author: 'Clínica Bem-Estar — Curitiba' },
  ];
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setActiveTestimonial((i) => (i + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(id);
  }, [testimonials.length]);
  return (
    <>
      <header className="glass-nav">
        <div className="container d-flex align-items-center justify-content-between py-2">
          <Link to="/" className="d-flex align-items-center text-decoration-none">
            <img src="/logo-sisdental.png" alt="Sisdental Odonto" height={28} />
          </Link>
          <nav className="d-none d-md-flex align-items-center gap-3">
            <a href="#planos" className="text-decoration-none text-dark">Planos</a>
            <a href="#comparativo" className="text-decoration-none text-dark">Comparativo</a>
            <a href="#depoimentos" className="text-decoration-none text-dark">Depoimentos</a>
          </nav>
          <div className="d-flex align-items-center gap-2">
            <Link to="/login" className="btn btn-outline-primary btn-sm btn-lift">Entrar</Link>
            <Link to="/cadastro/teste" className="btn btn-primary btn-sm btn-lift text-white">Teste grátis</Link>
          </div>
        </div>
      </header>
      <section className="hero-gradient full-bleed text-white d-flex align-items-center pt-nav py-5" style={{ minHeight: '80vh' }}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <h1 className="display-5 fw-bold mb-3">Sisdental</h1>
              <p className="lead mb-4">Simplifique a gestão da sua clínica: agenda, pacientes, financeiro e comunicação no mesmo lugar.</p>
              <div className="d-flex gap-2 flex-wrap">
                <a href="#planos" className="btn btn-light text-primary fw-semibold btn-lift">Ver Planos</a>
                <Link to="/login" className="btn btn-outline-light btn-lift">Entrar</Link>
              </div>
              <div className="trust-badges mt-3">
                <span className="badge bg-white border text-dark"><i className="fas fa-rotate-left text-success me-1"></i> Garantia 7 dias</span>
                <span className="badge bg-white border text-dark"><i className="fas fa-ban text-primary me-1"></i> Sem fidelidade</span>
                <span className="badge bg-white border text-dark"><i className="fas fa-lock text-success me-1"></i> Pagamento seguro</span>
              </div>
            </div>
            <div className="col-lg-6 d-none d-lg-block">
              <div className="text-center">
                <img
                  src="/dashboard.png"
                  alt="Print do painel Sisdental"
                  className="img-fluid rounded-4 shadow-sm"
                  style={{ maxHeight: 420, objectFit: 'cover' }}
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/vite.svg' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="container py-5">
      <div className="row justify-content-center w-100">
        <div className="col-lg-10">


          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <div className="card h-100 shadow-sm border-0 rounded-4 card-hover">
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
              <div className="card h-100 shadow-sm border-0 rounded-4 card-hover">
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

          {/* Cards com imagens (features) */}
          <div className="row g-4 mb-5">
            <div className="col-md-4">
              <div className="card h-100 shadow-sm border-0 rounded-4 card-hover overflow-hidden">
                <img src="/agendamento.png" alt="Agenda inteligente" className="card-img-top feature-img" loading="lazy" style={{ height: 160, objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/vite.svg' }} />
                <div className="card-body">
                  <h5 className="card-title">Agenda inteligente</h5>
                  <p className="text-muted mb-0">Confirmações automáticas e visão diária/mensal para reduzir faltas.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 shadow-sm border-0 rounded-4 card-hover overflow-hidden">
                <img src="/prontuario.png" alt="Prontuário completo" className="card-img-top feature-img" loading="lazy" style={{ height: 160, objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/vite.svg' }} />
                <div className="card-body">
                  <h5 className="card-title">Prontuário completo</h5>
                  <p className="text-muted mb-0">Histórico clínico centralizado e odontograma para melhor acompanhamento.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 shadow-sm border-0 rounded-4 card-hover overflow-hidden">
                <img src="/financeiro.png" alt="Financeiro claro" className="card-img-top feature-img" loading="lazy" style={{ height: 160, objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/vite.svg' }} />
                <div className="card-body">
                  <h5 className="card-title">Financeiro claro</h5>
                  <p className="text-muted mb-0">Fluxo de caixa, relatórios e organização para decisões com dados.</p>
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

          <div id="planos" className="">
            <div className="text-center mb-4">
              <h2 className="display-6">Escolha seu plano</h2>
              <p className="text-muted mb-0">Teste grátis e sem fidelidade.</p>
            </div>
            <div className="row g-3 mb-3">
              <div className="col-6 col-md-3">
                <div className="p-3 bg-white border rounded-4 shadow-sm h-100 d-flex align-items-center gap-2">
                  <i className="fas fa-shield-alt text-success"></i>
                  <div className="small">Pagamento seguro</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3 bg-white border rounded-4 shadow-sm h-100 d-flex align-items-center gap-2">
                  <i className="fas fa-rotate-left text-primary"></i>
                  <div className="small">7 dias de garantia</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3 bg-white border rounded-4 shadow-sm h-100 d-flex align-items-center gap-2">
                  <i className="fas fa-ban text-danger"></i>
                  <div className="small">Sem fidelidade</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-3 bg-white border rounded-4 shadow-sm h-100 d-flex align-items-center gap-2">
                  <i className="fas fa-headset text-success"></i>
                  <div className="small">Suporte dedicado</div>
                </div>
              </div>
            </div>
            <div className="row g-4">
            <div className="col-md-6">
              <div className="card h-100 shadow-sm border-0 rounded-4 card-hover">
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
                    <Link to="/cadastro/basico" className="btn btn-outline-primary w-100 btn-lift">
                      Cadastrar no Básico
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card h-100 plan-featured rounded-4 card-hover">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title mb-0">Plano Profissional</h5>
                    <span className="badge badge-recommended">Plano recomendado</span>
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
                    <Link to="/cadastro/profissional" className="btn btn-primary w-100 btn-lift">
                      Cadastrar no Profissional
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

          <div id="duvidas" className="faq-box mt-5 bg-light rounded-4 p-4">
            <h4 className="mb-3">Dúvidas frequentes</h4>
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

          <div id="comparativo" className="mt-5 bg-light rounded-4 p-4">
            <h4 className="mb-3 text-center">Comparativo de recursos</h4>
            <div className="table-responsive">
              <table className="table align-middle table-hover">
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

          <div id="depoimentos" className="mt-5 bg-light rounded-4 p-4">
            <h4 className="mb-3 text-center">Depoimentos</h4>
            <div className="row justify-content-center">
              <div className="col-md-8 col-lg-6">
                <div className="card border-0 shadow-sm rounded-4 h-100 card-hover carousel-fade">
                  <div className="card-body text-center">
                    <p className="mb-2">“{testimonials[activeTestimonial].quote}”</p>
                    <div className="small text-muted">{testimonials[activeTestimonial].author}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="d-flex justify-content-center mt-3 carousel-dots">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  aria-label={`Depoimento ${idx + 1}`}
                  className={idx === activeTestimonial ? 'active' : ''}
                  onClick={() => setActiveTestimonial(idx)}
                />
              ))}
            </div>
          </div>

          <div className="text-center mt-4">
            <Link to="/login" className="btn btn-outline-secondary btn-lift">Voltar ao Login</Link>
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
              <li><a href="#planos" className="link-light text-decoration-none">Planos</a></li>
              <li><a href="#comparativo" className="link-light text-decoration-none">Comparativo</a></li>
              <li><a href="#depoimentos" className="link-light text-decoration-none">Depoimentos</a></li>
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