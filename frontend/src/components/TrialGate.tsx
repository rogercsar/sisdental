import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isTrialActive, isTrialExpired } from '../lib/trial';

const ALLOWLIST_PREFIXES = [
  '/',
  '/login',
  '/register',
  '/portal/login',
  '/cadastro',
  '/upgrade',
];

function isAllowed(pathname: string) {
  // Allow public paths and all /cadastro* pages
  return ALLOWLIST_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export default function TrialGate() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname;
    if (isTrialActive() && isTrialExpired() && !isAllowed(path)) {
      if (path !== '/upgrade') {
        navigate('/upgrade', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  return null;
}