export const TRIAL_ACTIVE_KEY = 'trialActive';
export const TRIAL_START_KEY = 'trialStart';
export const TRIAL_EXPIRES_KEY = 'trialExpiresAt';
export const TRIAL_NAME_KEY = 'trialName';
export const TRIAL_EMAIL_KEY = 'trialEmail';

function getNow(): Date {
  return new Date();
}

export function startTrial(name?: string, email?: string, days: number = 15) {
  const now = getNow();
  const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  try {
    localStorage.setItem(TRIAL_ACTIVE_KEY, '1');
    localStorage.setItem(TRIAL_START_KEY, now.toISOString());
    localStorage.setItem(TRIAL_EXPIRES_KEY, expires.toISOString());
    if (name) localStorage.setItem(TRIAL_NAME_KEY, name);
    if (email) localStorage.setItem(TRIAL_EMAIL_KEY, email);
  } catch (e) {
    // no-op
  }
}

export function getTrialInfo() {
  try {
    const active = localStorage.getItem(TRIAL_ACTIVE_KEY) === '1';
    const startIso = localStorage.getItem(TRIAL_START_KEY) || '';
    const expiresIso = localStorage.getItem(TRIAL_EXPIRES_KEY) || '';
    const name = localStorage.getItem(TRIAL_NAME_KEY) || '';
    const email = localStorage.getItem(TRIAL_EMAIL_KEY) || '';

    const start = startIso ? new Date(startIso) : null;
    const expires = expiresIso ? new Date(expiresIso) : null;

    const now = getNow();
    const expired = active && !!expires && now >= expires;

    let daysLeft: number | null = null;
    if (active && expires) {
      const diffMs = expires.getTime() - now.getTime();
      daysLeft = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    }

    return { active, start, expires, expired, name, email, daysLeft } as const;
  } catch {
    return { active: false, start: null, expires: null, expired: false, name: '', email: '', daysLeft: null } as const;
  }
}

export function isTrialActive(): boolean {
  try {
    return localStorage.getItem(TRIAL_ACTIVE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isTrialExpired(): boolean {
  try {
    const active = localStorage.getItem(TRIAL_ACTIVE_KEY) === '1';
    if (!active) return false;
    const expiresIso = localStorage.getItem(TRIAL_EXPIRES_KEY);
    if (!expiresIso) return false;
    return getNow() >= new Date(expiresIso);
  } catch {
    return false;
  }
}

export function clearTrial() {
  try {
    localStorage.removeItem(TRIAL_ACTIVE_KEY);
    localStorage.removeItem(TRIAL_START_KEY);
    localStorage.removeItem(TRIAL_EXPIRES_KEY);
    localStorage.removeItem(TRIAL_NAME_KEY);
    localStorage.removeItem(TRIAL_EMAIL_KEY);
  } catch {
    // ignore
  }
}