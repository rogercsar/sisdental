import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setAllowed(false); return; }
    sb.auth.getSession()
      .then(({ data }) => setAllowed(!!data.session))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) {
    return (
      <div className="container py-5">
        <div className="d-flex justify-content-center"><span className="spinner-border" /></div>
      </div>
    );
  }

  return allowed ? <>{children}</> : <Navigate to="/login" replace />;
};

export const RequirePortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const pid = localStorage.getItem('portalPacienteId');
    setAllowed(!!pid);
  }, []);

  if (allowed === null) {
    return (
      <div className="container py-5">
        <div className="d-flex justify-content-center"><span className="spinner-border" /></div>
      </div>
    );
  }

  return allowed ? <>{children}</> : <Navigate to="/portal/login" replace />;
};