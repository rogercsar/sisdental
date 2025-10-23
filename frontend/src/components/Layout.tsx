import React, { useEffect, useMemo, useState, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

interface LayoutProps { children: React.ReactNode }

interface AgendamentoSugestao {
  id: number;
  paciente_id: number | null;
  paciente_nome?: string;
  data?: string | null;
  hora?: string | null;
  servico?: string | null;
  observacoes?: string | null;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem('sidebarCollapsed') === '1');
  const [theme] = useState<string>(() => localStorage.getItem('theme') || 'light');
  const navigate = useNavigate();
  const location = useLocation();

  // Supabase para busca global
  const sb = useMemo(() => getSupabase(), []);
  const [query, setQuery] = useState('');
  const [resultsPacientes, setResultsPacientes] = useState<Array<{ id: number; nome: string }>>([]);
  const [resultsAgendamentos, setResultsAgendamentos] = useState<AgendamentoSugestao[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // Navegação por teclado
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  
  // Lista achatada de sugestões para navegação com teclado
  const suggestions = useMemo(() => {
    const ss: Array<{ key: string; to: string }> = []
    resultsPacientes.forEach((r) => ss.push({ key: `p-${r.id}`, to: `/pacientes/${r.id}/detalhes` }))
    resultsAgendamentos.forEach((a) => ss.push({ key: `a-${a.id}`, to: `/agendamentos/${a.id}/editar` }))
    ss.push({ key: 'nav-pacientes', to: '/pacientes' }, { key: 'nav-agendamentos', to: '/agendamentos' })
    return ss
  }, [resultsPacientes, resultsAgendamentos])
  
  const findIndexByKey = (key: string) => suggestions.findIndex((s) => s.key === key)
  
  // Realça o termo da busca em um texto
  const highlight = (text: string, q: string) => {
    if (!q) return text
    const i = text.toLowerCase().indexOf(q.toLowerCase())
    if (i < 0) return text
    return (
      <>
        {text.slice(0, i)}
        <mark>{text.slice(i, i + q.length)}</mark>
        {text.slice(i + q.length)}
      </>
    )
  }
  
  // Zera seleção ao alterar a query
  useEffect(() => { setActiveIndex(-1) }, [query])
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCollapsed((c) => !c);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Busca global de pacientes e agendamentos (debounced)
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = query.trim();
      if (!sb || q.length < 2) {
        setResultsPacientes([]);
        setResultsAgendamentos([]);
        return;
      }
      setSearchLoading(true);
      try {
        const [p, a] = await Promise.all([
          sb.from('pacientes').select('id, nome').ilike('nome', `%${q}%`).order('nome', { ascending: true }).limit(8),
          sb.from('agendamentos').select('id, paciente_id, data, hora, servico, observacoes')
            .or(`servico.ilike.%${q}%,observacoes.ilike.%${q}%`)
            .order('data', { ascending: true })
            .order('hora', { ascending: true })
            .limit(8),
        ]);
        if (!p.error) setResultsPacientes((p.data ?? []) as Array<{ id: number; nome: string }>);

        let ag: AgendamentoSugestao[] = (a.data ?? []) as AgendamentoSugestao[];
        const ids = Array.from(new Set(ag.map((x) => x.paciente_id).filter(Boolean))) as number[];
        if (ids.length > 0) {
          const { data: pacs } = await sb.from('pacientes').select('id, nome').in('id', ids);
          const map = new Map<number, string>();
          (pacs ?? []).forEach((pp: any) => map.set(pp.id, pp.nome));
          ag = ag.map((x) => ({ ...x, paciente_nome: x.paciente_id ? map.get(x.paciente_id) : undefined }));
        }
        setResultsAgendamentos(ag);
      } finally {
        setSearchLoading(false);
        setSearchOpen(true);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, sb]);

  const toggleSidebar = () => setCollapsed((c) => !c);

  const handleLogout = async () => {
    try {
      const sb = getSupabase();
      if (sb) {
        await sb.auth.signOut();
      }
    } catch (e) {
      // noop
    }
    const wasPortal = !!localStorage.getItem('portalPacienteId');
    localStorage.removeItem('portalPacienteId');
    navigate(wasPortal ? '/portal/login' : '/login');
  };

  const menuItems = [
    { to: '/dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
    { to: '/pacientes', label: 'Pacientes', icon: 'fa-users' },
    { to: '/agendamentos', label: 'Agendamentos', icon: 'fa-calendar-alt' },
    { to: '/orcamentos', label: 'Orçamentos', icon: 'fa-file-invoice-dollar' },
    { to: '/financeiro', label: 'Financeiro', icon: 'fa-dollar-sign' },
    { to: '/importar', label: 'Importar', icon: 'fa-file-import' },
    { to: '/exportar', label: 'Exportar', icon: 'fa-file-export' },
    { to: '/configuracoes', label: 'Configurações', icon: 'fa-gear' },
    { to: '/relatorios', label: 'Relatórios', icon: 'fa-chart-line' },
  ];

  // Breadcrumb simples baseado no caminho atual
  const basePath = '/' + (location.pathname.split('/')[1] || '');
  const currentItem = menuItems.find((mi) => mi.to === basePath);
  const breadcrumb = currentItem ? currentItem.label : 'SisDental';

  return (
    <div id="wrapper">
      <aside id="sidebar" className={collapsed ? 'collapsed' : ''}>
        <div className="brand d-flex align-items-center justify-content-between">
          <span className="fw-bold d-flex align-items-center">
            <img src="/logo-sisdental.png" alt="Sisdental Odonto" height={110} />
          </span>
          <button
            className="btn btn-sm btn-outline-light"
            onClick={toggleSidebar}
            title={collapsed ? 'Expandir' : 'Recolher'}
            aria-label="Alternar sidebar"
          >
            <i className={`fas ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </div>
        <hr className="my-2 opacity-25" />
        <nav className="px-2 pb-3">
          <ul className="nav nav-pills flex-column gap-1">
            {menuItems.map((item) => (
              <li key={item.to} className="nav-item">
                <NavLink
                  to={item.to}
                  title={item.label}
                  className={({ isActive }) => `nav-link d-flex align-items-center ${isActive ? 'active' : ''}`}
                >
                  <i className={`fas ${item.icon}`}></i>
                  {!collapsed && <span className="ms-2">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <button className="btn btn-outline-light w-100 btn-logout" onClick={handleLogout} title="Sair">
              <i className="fas fa-sign-out-alt me-1"></i>
              {!collapsed && 'Sair'}
            </button>
          </div>
        </nav>
      </aside>
      <div className={`sidebar-overlay ${collapsed ? '' : 'show'}`} onClick={() => setCollapsed(true)} />
      <div id="content" className="bg-body">
        <header className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={toggleSidebar} title="Alternar Sidebar" aria-label="Alternar sidebar">
            <i className="fas fa-bars"></i>
          </button>
          <span className="ms-2 text-muted small">{breadcrumb}</span>
          <div className="flex-grow-1 position-relative header-search">
            {/* search input and dropdown untouched */}
            <input
              ref={searchRef}
              className="form-control form-control-sm pe-4"
              placeholder="Buscar... (Ctrl+K)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => (resultsPacientes.length || resultsAgendamentos.length) && setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchOpen(false)
                  setActiveIndex(-1)
                  setQuery('')
                  setResultsPacientes([])
                  setResultsAgendamentos([])
                  ;(e.target as HTMLInputElement).blur()
                  return
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  if (!searchOpen) setSearchOpen(true)
                  if (suggestions.length === 0) return
                  setActiveIndex((idx) => (idx < suggestions.length - 1 ? idx + 1 : 0))
                  return
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  if (!searchOpen) setSearchOpen(true)
                  if (suggestions.length === 0) return
                  setActiveIndex((idx) => (idx > 0 ? idx - 1 : suggestions.length - 1))
                  return
                }
                if (e.key === 'Enter') {
                  if (activeIndex >= 0 && activeIndex < suggestions.length) {
                    const s = suggestions[activeIndex]
                    navigate(s.to)
                    setSearchOpen(false)
                    setActiveIndex(-1)
                    ;(e.target as HTMLInputElement).blur()
                  }
                }
              }}
              aria-label="Buscar"
            />
            {searchLoading && (
              <span
                className="spinner-border spinner-border-sm text-secondary position-absolute"
                style={{ right: 8, top: '50%', transform: 'translateY(-50%)' }}
                role="status"
                aria-hidden="true"
              ></span>
            )}
            {searchOpen && (
              <div className="dropdown-menu show w-100 shadow-sm" style={{ top: '100%', left: 0 }}>
                {searchLoading ? (
                  <div className="dropdown-item text-muted">Buscando...</div>
                ) : (
                  <>
                    {(resultsPacientes.length === 0 && resultsAgendamentos.length === 0) && (
                      <div className="dropdown-item text-muted">Nenhum resultado</div>
                    )}
                    {resultsPacientes.length > 0 && (
                      <>
                        <h6 className="dropdown-header">Pacientes ({resultsPacientes.length})</h6>
                        {resultsPacientes.map((r) => (
                          <NavLink
                            key={`p-${r.id}`}
                            to={`/pacientes/${r.id}/detalhes`}
                            className={`dropdown-item ${suggestions[activeIndex]?.key === `p-${r.id}` ? 'active' : ''}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setActiveIndex(findIndexByKey(`p-${r.id}`))}
                          >
                            <i className="fas fa-user me-2"></i>{highlight(r.nome, query)}
                          </NavLink>
                        ))}
                      </>
                    )}
                    {resultsAgendamentos.length > 0 && (
                      <>
                        <div className="dropdown-divider"></div>
                        <h6 className="dropdown-header">Agendamentos ({resultsAgendamentos.length})</h6>
                        {resultsAgendamentos.map((a) => {
                          const label = `${a.data ?? '-'} ${(a.hora ?? '').slice(0,5)} — ${a.servico ?? '-'}${a.paciente_nome ? ` • ${a.paciente_nome}` : ''}`
                          return (
                            <NavLink
                              key={`a-${a.id}`}
                              to={`/agendamentos/${a.id}/editar`}
                              className={`dropdown-item ${suggestions[activeIndex]?.key === `a-${a.id}` ? 'active' : ''}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onMouseEnter={() => setActiveIndex(findIndexByKey(`a-${a.id}`))}
                            >
                              <i className="fas fa-calendar-alt me-2"></i>
                              {highlight(label, query)}
                            </NavLink>
                          )
                        })}
                      </>
                    )}
                    <div className="dropdown-divider"></div>
                    <NavLink to="/pacientes" className="dropdown-item" onMouseDown={(e) => e.preventDefault()}>
                      <i className="fas fa-users me-2"></i>Ir para Pacientes
                    </NavLink>
                    <NavLink to="/agendamentos" className="dropdown-item" onMouseDown={(e) => e.preventDefault()}>
                      <i className="fas fa-calendar-alt me-2"></i>Ir para Agendamentos
                    </NavLink>
                  </>
                )}
              </div>
            )}
          </div>
          {/* Espaço para ações globais */}
        </header>
        <div className="content-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;