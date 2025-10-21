import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

interface LayoutProps { children: React.ReactNode }

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') || 'light');
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
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

  return (
    <div id="wrapper">
      <aside id="sidebar" className={collapsed ? 'collapsed' : ''}>
        <div className="brand d-flex align-items-center justify-content-between">
          <span>🦷 SisDental</span>
          <button className="btn btn-sm btn-outline-light" onClick={toggleSidebar} title={collapsed ? 'Expandir' : 'Recolher'}>
            <i className={`fas ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </button>
        </div>
        <nav className="px-2 pb-3">
          <div className="mb-2 text-uppercase text-muted small">Menu</div>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/pacientes">Pacientes</Link>
          <Link to="/agendamentos">Agendamentos</Link>
          <Link to="/financeiro">Financeiro</Link>
          <div className="mt-3">
            <button className="btn btn-outline-danger w-100" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt me-1"></i>
              Sair
            </button>
          </div>
        </nav>
      </aside>
      <div id="content" className="bg-body">
        <header>
          <button className="btn btn-outline-secondary btn-sm" onClick={toggleSidebar} title="Alternar Sidebar">
            <i className="fas fa-bars"></i>
          </button>
          <div className="ms-auto d-flex align-items-center gap-2">
            <span className="text-muted small">Tema</span>
            <button className="btn btn-outline-primary btn-sm" onClick={toggleTheme} title="Alternar tema claro/escuro">
              <i className={`fas ${theme === 'light' ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
          </div>
        </header>
        <div className="content-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;