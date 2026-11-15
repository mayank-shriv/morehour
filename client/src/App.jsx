import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowUpRight, BarChart3, Bell, CalendarDays,
  Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Coffee, Command,
  Download, LayoutDashboard, LogOut, Menu, Play, Settings,
  ShieldCheck, Sparkles, Sun, Target, UserRound, X
} from 'lucide-react';
import api, { getErrorMessage } from './api.js';
import { durationLabel, StatCard } from './shared.jsx';

const AnalyticsPage = lazy(() => import('./AnalyticsPage.jsx'));

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'history', label: 'Study history', icon: CalendarDays },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 }
];

function dateLabel(date, options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }, timezone) {
  return new Intl.DateTimeFormat(undefined, { ...options, ...(timezone ? { timeZone: timezone } : {}) }).format(date);
}

function timeLabel(value, timezone) {
  return value ? new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    ...(timezone ? { timeZone: timezone } : {})
  }).format(new Date(value)) : '—';
}

function dateKeyInTimezone(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function daySessionTotals(sessions, active, now) {
  const rows = [...(sessions || [])];
  if (active && !rows.some((session) => session.id === active.id)) rows.push(active);
  return rows.reduce((totals, session) => {
    const activeActivity = session.activities.find((activity) => !activity.endTime);
    const liveActivityDuration = activeActivity ? Math.max(0, now - new Date(activeActivity.startTime).getTime()) : 0;
    const closedStudy = session.activities.filter((item) => item.type === 'study' && item.endTime).reduce((sum, item) => sum + item.duration, 0);
    const closedBreak = session.activities.filter((item) => item.type === 'break' && item.endTime).reduce((sum, item) => sum + item.duration, 0);
    const study = closedStudy + (activeActivity?.type === 'study' ? liveActivityDuration : 0);
    const rest = closedBreak + (activeActivity?.type === 'break' ? liveActivityDuration : 0);
    totals.studyDuration += study;
    totals.breakDuration += rest;
    totals.totalDuration += session.logoutAt ? session.totalDuration : Math.max(0, now - new Date(session.loginAt).getTime());
    totals.sessions += 1;
    totals.studySessions += session.activities.filter((item) => item.type === 'study').length;
    return totals;
  }, { studyDuration: 0, breakDuration: 0, totalDuration: 0, sessions: 0, studySessions: 0 });
}

function activityDuration(activity, now) {
  return activity.endTime ? activity.duration : Math.max(0, now - new Date(activity.startTime).getTime());
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const { data } = await api.post(`/auth/${mode}`, { ...form, timezone });
      onAuth(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand auth-brand flex items-center gap-2.5"><span className="brand-mark"><Command size={19} /></span><span>Study Time<span className="brand-dot">.</span></span></div>
        <div className="auth-copy">
          <div className="eyebrow"><Sparkles size={14} /> YOUR TIME, WELL SPENT</div>
          <h1>Make room for<br /><em>deep work.</em></h1>
          <p>A little structure goes a long way. Track your focus, take guilt-free breaks, and build a rhythm that lasts.</p>
        </div>
        <div className="auth-quote">
          <div className="avatar-stack"><span>J</span><span>M</span><span>A</span><b>+</b></div>
          <span>Join 2,400+ mindful learners</span>
        </div>
        <div className="auth-art" aria-hidden="true">
          <div className="art-sun" /><div className="art-arc art-arc-one" /><div className="art-arc art-arc-two" />
          <div className="art-card"><div className="art-card-top"><span>YOUR FOCUS TODAY</span><span className="live-dot" /></div><strong>04<span>h</span> 28<span>m</span></strong><div className="art-progress"><i /></div><div className="art-foot"><span>3 sessions</span><span>+12% this week</span></div></div>
          <div className="art-star star-one">✳</div><div className="art-star star-two">✳</div>
        </div>
        <div className="auth-bottom">DESIGNED FOR YOUR NEXT CHAPTER <span>© 2026 STUDY TIME</span></div>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="mobile-brand brand"><span className="brand-mark"><Command size={18} /></span><span>Study Time<span className="brand-dot">.</span></span></div>
          <span className="form-kicker">{mode === 'login' ? 'WELCOME BACK' : 'A FRESH START'}</span>
          <h2>{mode === 'login' ? 'Sign in to your space' : 'Create your account'}</h2>
          <p className="form-subtitle">{mode === 'login' ? 'Your progress is right where you left it.' : 'Make every focused minute count.'}</p>
          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && <label>Your name<input autoComplete="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Alex Morgan" /></label>}
            <label>Email address<input type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></label>
            <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" /></label>
            {error && <div className="inline-error">{error}</div>}
            <button className="button button-dark auth-submit flex w-full items-center" disabled={loading}>{loading ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}<ChevronRight size={17} /></button>
          </form>
          <div className="auth-switch">{mode === 'login' ? 'New to Study Time?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}> {mode === 'login' ? 'Create an account' : 'Sign in'}</button></div>
          <div className="auth-trust"><ShieldCheck size={15} /> Your data is private and secure</div>
        </div>
      </section>
    </main>
  );
}

function ActivityTimeline({ sessions = [], now, timezone }) {
  const activities = sessions.flatMap((session) => session.activities.map((activity) => ({ ...activity, sessionLogin: session.loginAt })))
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  if (!activities.length) return <div className="empty-inline">Your activity timeline will appear here once you get started.</div>;
  return (
    <div className="timeline">
      {activities.map((activity, index) => {
        const studying = activity.type === 'study';
        return <div className="timeline-row" key={`${activity.id}-${index}`}>
          <span className={`timeline-icon ${studying ? 'study' : 'break'}`}>{studying ? <Target size={15} /> : <Coffee size={15} />}</span>
          <div className="timeline-main"><strong>{studying ? 'Focus session' : 'Break'}</strong><span>{timeLabel(activity.startTime, timezone)} – {activity.endTime ? timeLabel(activity.endTime, timezone) : 'Now'}</span></div>
          <span className="timeline-duration">{durationLabel(activityDuration(activity, now), true)}</span>
        </div>;
      })}
    </div>
  );
}

function Dashboard({ user, current, onAction, busy, now, setPage }) {
  const totals = daySessionTotals(current?.today?.sessions, current?.session, now);
  const active = current?.session;
  const activeActivity = active?.activities.find((activity) => !activity.endTime);
  const activeActivityTime = activeActivity ? activityDuration(activeActivity, now) : 0;
  const progress = totals.studyDuration + totals.breakDuration
    ? Math.round((totals.studyDuration / (totals.studyDuration + totals.breakDuration)) * 100)
    : 0;
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: user.timezone || undefined }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <div className="welcome-row">
        <div><div className="eyebrow muted-eyebrow">{dateLabel(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }, user.timezone)}</div><h1>{greeting}, {user.name.split(' ')[0]} <span className="wave">✳</span></h1><p>A good day to make progress on what matters.</p></div>
        <div className="today-pill"><span className={`status-dot ${active ? active.status : ''}`} />{active ? active.status === 'break' ? 'On Break' : 'Studying' : 'Logged Out'}</div>
      </div>
      <section className={`focus-banner ${active?.status === 'break' ? 'is-break' : ''}`}>
        <div className="focus-copy">
          <div className="focus-status"><span className="pulse-dot" />{active ? active.status === 'break' ? 'BREAK IN PROGRESS' : 'FOCUS SESSION LIVE' : 'READY WHEN YOU ARE'}</div>
          <h2>{active ? active.status === 'break' ? 'Take a moment.' : 'You’re in the zone.' : 'Make today count.'}</h2>
          <p>{active ? active.status === 'break' ? 'Recharge. Your focus time is safely tracked.' : 'One thing at a time. You’re doing great.' : 'Start a session and give your goals some time.'}</p>
          <div className="focus-actions">
            {!active ? <button className="button button-light" onClick={() => onAction('start')} disabled={busy}><Play size={15} fill="currentColor" /> Start tracking</button> : <>
              {active.status === 'studying'
                ? <button className="button button-light" onClick={() => onAction('break')} disabled={busy}><Coffee size={16} /> Take a break</button>
                : <button className="button button-light" onClick={() => onAction('study')} disabled={busy}><Target size={16} /> Back to focus</button>}
              <button className="button button-danger" onClick={() => onAction('end')} disabled={busy}><LogOut size={15} /> Log out</button>
            </>}
          </div>
        </div>
        <div className="focus-clock"><span>{active ? active.status === 'break' ? 'BREAK TIME' : 'STUDY TIME' : 'READY WHEN YOU ARE'}</span><strong>{active ? durationLabel(activeActivityTime) : '00:00:00'}</strong><div><span className="pulse-dot" />{active ? `${active.status === 'break' ? 'On a break' : 'Focused'} since ${timeLabel(activeActivity?.startTime, user.timezone)}` : 'Your next focus starts here'}</div></div>
        <div className="banner-sun" />
      </section>
      <section className="stats-grid">
        <StatCard title="Study time" value={durationLabel(totals.studyDuration)} note="Focused minutes today" icon={Target} tone="green-icon" trend={totals.studyDuration > 0 ? 'On track' : null} />
        <StatCard title="Break time" value={durationLabel(totals.breakDuration)} note="Time to recharge" icon={Coffee} tone="orange-icon" />
        <StatCard title="Sessions" value={String(totals.studySessions).padStart(2, '0')} note={totals.sessions ? `${totals.sessions} tracking ${totals.sessions === 1 ? 'session' : 'sessions'} today` : 'No sessions yet'} icon={Activity} tone="violet-icon" />
        <StatCard title="Total time" value={durationLabel(totals.totalDuration)} note={active ? `Started at ${timeLabel(current.today.loginAt || active.loginAt, user.timezone)}` : 'Time spent tracking'} icon={Clock3} tone="blue-icon" />
      </section>
      <section className="dashboard-lower">
        <article className="card rhythm-card">
          <div className="section-heading"><div><span className="section-overline">TODAY AT A GLANCE</span><h3>Your daily rhythm</h3></div><button className="text-button" onClick={() => setPage('analytics')}>View analytics <ChevronRight size={15} /></button></div>
          <div className="rhythm-content">
            <div className="donut-wrap"><div className="donut-graphic" style={{ background: `conic-gradient(#e98420 ${progress}%, #f2c58b ${progress}% 100%)` }}><div className="donut-hole"><strong>{progress}%</strong><span>in focus</span></div></div></div>
            <div className="rhythm-legend"><div><span className="legend-dot green" /><span>Study time</span><strong>{durationLabel(totals.studyDuration, true)}</strong></div><div><span className="legend-dot orange" /><span>Break time</span><strong>{durationLabel(totals.breakDuration, true)}</strong></div><p>{totals.studyDuration ? `A ${progress}% focus ratio. Keep finding your flow.` : 'Start your first session to see your daily rhythm.'}</p></div>
          </div>
        </article>
        <article className="card activity-card">
          <div className="section-heading"><div><span className="section-overline">THE LITTLE THINGS ADD UP</span><h3>Today’s activity</h3></div><button className="icon-button subtle" onClick={() => setPage('history')} aria-label="View history"><ChevronRight size={18} /></button></div>
          <ActivityTimeline sessions={current?.today?.sessions} now={now} timezone={user.timezone} />
          <button className="activity-link" onClick={() => setPage('history')}>See full history <ArrowUpRight size={14} /></button>
        </article>
      </section>
    </>
  );
}

function HistoryPage({ now, timezone }) {
  const [history, setHistory] = useState([]);
  const [date, setDate] = useState(() => dateKeyInTimezone(new Date(), timezone));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sessions/history');
      setHistory(data.sessions);
      setError('');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  const selected = history.filter((session) => session.date === date);

  return <div className="page-content">
    <div className="page-intro"><div><div className="eyebrow muted-eyebrow">YOUR JOURNEY</div><h1>Study history</h1><p>Every focused minute, all in one place.</p></div><button className="button button-outline" onClick={() => {
      const lines = [['Date', 'Login', 'Logout', 'Study time', 'Break time', 'Total time'], ...history.map((item) => [item.date, timeLabel(item.loginAt, timezone), timeLabel(item.logoutAt, timezone), durationLabel(item.studyDuration), durationLabel(item.breakDuration), durationLabel(item.totalDuration)])];
      const csv = lines.map((row) => row.map((field) => `"${String(field).replaceAll('"', '""')}"`).join(',')).join('\n');
      const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'study-history.csv'; link.click(); URL.revokeObjectURL(link.href);
    }}><Download size={15} /> Export CSV</button></div>
    {error && <div className="inline-error">{error}</div>}
    <article className="card history-table-card">
      <div className="history-toolbar"><div><h3>All sessions</h3><span>{history.length} tracking {history.length === 1 ? 'session' : 'sessions'}</span></div><div className="date-filter"><CalendarDays size={15} /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /><button className="icon-button subtle" onClick={() => setDate(dateKeyInTimezone(new Date(), timezone))}>Today</button></div></div>
      <div className="table-scroll"><table><thead><tr><th>Date</th><th>Login</th><th>Logout</th><th>Study time</th><th>Break time</th><th>Total time</th></tr></thead><tbody>
        {loading ? <tr><td colSpan="6" className="table-empty">Loading your history…</td></tr> : history.length ? history.map((session) => <tr key={session.id} className={session.date === date ? 'selected-row' : ''} onClick={() => setDate(session.date)}><td><strong>{dateLabel(new Date(`${session.date}T12:00:00Z`), { month: 'short', day: 'numeric', year: 'numeric' }, 'UTC')}</strong><span className="table-sub">{dateLabel(new Date(`${session.date}T12:00:00Z`), { weekday: 'long' }, 'UTC')}</span></td><td>{timeLabel(session.loginAt, timezone)}</td><td>{timeLabel(session.logoutAt, timezone)}{!session.logoutAt && <span className="live-tag">LIVE</span>}</td><td><span className="table-study"><span className="legend-dot green" />{durationLabel(session.studyDuration)}</span></td><td><span className="table-study"><span className="legend-dot orange" />{durationLabel(session.breakDuration)}</span></td><td><strong>{durationLabel(session.totalDuration)}</strong></td></tr>) : <tr><td colSpan="6" className="table-empty">{error ? 'Could not load history.' : 'No sessions yet. Start tracking from your dashboard.'}</td></tr>}
      </tbody></table></div>
    </article>
    <article className="card timeline-card"><div className="section-heading"><div><span className="section-overline">A CLOSER LOOK</span><h3>{dateLabel(new Date(`${date}T12:00:00Z`), { weekday: 'long', month: 'long', day: 'numeric' }, 'UTC')}</h3></div><span className="history-count">{selected.reduce((sum, session) => sum + session.activities.length, 0)} activities</span></div>
      {selected.length ? selected.map((session) => <div key={session.id} className="history-session"><div className="session-day-head"><span>Session started {timeLabel(session.loginAt, timezone)}</span><span>{session.logoutAt ? `Finished ${timeLabel(session.logoutAt, timezone)}` : 'In progress'}</span></div><ActivityTimeline sessions={[session]} now={now} timezone={timezone} /></div>) : <div className="empty-inline">No activity recorded on this date.</div>}
    </article>
  </div>;
}

function ProfilePage({ user, updateUser, onSignOut }) {
  const [name, setName] = useState(user.name);
  const [timezone, setTimezone] = useState(user.timezone);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(event) {
    event.preventDefault(); setSaving(true); setMessage(''); setError('');
    try {
      const { data } = await api.patch('/auth/me', { name, timezone });
      updateUser(data.user); setMessage('Your profile has been updated.');
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setSaving(false); }
  }
  return <div className="page-content narrow-page">
    <div className="page-intro"><div><div className="eyebrow muted-eyebrow">YOUR CORNER OF THE WORLD</div><h1>Profile & settings</h1><p>Make Study Time feel a little more like you.</p></div></div>
    <article className="card profile-card"><div className="profile-header"><div className="profile-avatar">{user.name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()}</div><div><h3>{user.name}</h3><p>{user.email}</p></div><span className="member-badge"><Check size={13} /> MEMBER</span></div>
      <form className="profile-form" onSubmit={save}><div className="settings-title"><UserRound size={17} /><div><strong>Personal details</strong><span>Update your name and preferred timezone.</span></div></div><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} required /></label><label>Timezone<input value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="e.g. Europe/London" required /><span className="field-note">Use an IANA timezone, like America/New_York.</span></label>{message && <div className="success-message"><Check size={14} />{message}</div>}{error && <div className="inline-error">{error}</div>}<button className="button button-dark" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}<ChevronRight size={16} /></button></form>
    </article>
    <article className="card settings-card"><div className="settings-title"><Sun size={17} /><div><strong>Appearance</strong><span>White and orange, throughout the app.</span></div></div><div className="appearance-swatches" aria-label="White and orange theme"><span /><span /></div></article>
    <article className="card settings-card signout-card"><div className="settings-title"><ShieldCheck size={17} /><div><strong>Your account</strong><span>Your tracking history is saved securely.</span></div></div><button className="button button-outline signout-button" onClick={onSignOut}><LogOut size={15} /> Sign out</button></article>
  </div>;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('study-token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('study-user') || 'null'); } catch { return null; }
  });
  const [page, setPage] = useState('dashboard');
  const [current, setCurrent] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [loading, setLoading] = useState(Boolean(token));

  const clearAuth = useCallback(() => {
    localStorage.removeItem('study-token'); localStorage.removeItem('study-user');
    setToken(null); setUser(null); setCurrent(null); setLoading(false);
  }, []);
  const loadCurrent = useCallback(async () => {
    const { data } = await api.get('/sessions/current');
    setCurrent(data);
  }, []);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let active = true;
    Promise.all([api.get('/auth/me'), api.get('/sessions/current')])
      .then(([profile, tracking]) => {
        if (!active) return;
        setUser(profile.data.user); localStorage.setItem('study-user', JSON.stringify(profile.data.user));
        setCurrent(tracking.data); setLoading(false);
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.response?.status === 401) clearAuth();
        else {
          setLoading(false);
          setToast(getErrorMessage(requestError));
        }
      });
    return () => { active = false; };
  }, [token, clearAuth]);

  useEffect(() => {
    if (!token) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const refresh = window.setInterval(() => loadCurrent().catch((error) => setToast(getErrorMessage(error))), 30000);
    return () => { window.clearInterval(timer); window.clearInterval(refresh); };
  }, [token, loadCurrent]);

  useEffect(() => {
    const onExpired = () => clearAuth();
    window.addEventListener('auth-expired', onExpired);
    return () => window.removeEventListener('auth-expired', onExpired);
  }, [clearAuth]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleAuth = (result) => {
    localStorage.setItem('study-token', result.token);
    localStorage.setItem('study-user', JSON.stringify(result.user));
    setToken(result.token); setUser(result.user); setPage('dashboard');
  };
  const performAction = async (action) => {
    setBusy(true);
    const route = { start: '/sessions/start', study: '/sessions/study', break: '/sessions/break', end: '/sessions/end' }[action];
    try {
      const { data } = await api.post(route);
      if (action === 'end') {
        setCurrent((previous) => previous ? { ...previous, session: null, today: { ...previous.today, sessions: [...(previous.today?.sessions || []).filter((item) => item.id !== data.session.id), data.session] } } : previous);
        setToast('Session complete. Nicely done.');
      } else {
        await loadCurrent();
        setToast(action === 'start' ? 'Your session has started.' : action === 'break' ? 'Break time. You’ve earned it.' : 'Back to focus. You’ve got this.');
      }
    } catch (requestError) { setToast(getErrorMessage(requestError)); }
    finally { setBusy(false); }
  };
  const signOut = async () => {
    try { await api.post('/auth/logout'); } catch (requestError) { setToast(getErrorMessage(requestError)); return; }
    clearAuth();
  };
  const updateUser = (updated) => {
    setUser(updated); localStorage.setItem('study-user', JSON.stringify(updated));
  };

  const pageTitle = useMemo(() => ({ dashboard: 'Dashboard', history: 'Study history', analytics: 'Analytics', profile: 'Profile & settings' })[page], [page]);
  if (loading) return <div className="app-loading"><span className="loading-mark"><Command size={20} /></span><div className="loading-line" /><span>Getting your space ready…</span></div>;
  if (!token || !user) return <AuthScreen onAuth={handleAuth} />;

  const mainContent = page === 'dashboard'
    ? <Dashboard user={user} current={current} onAction={performAction} busy={busy} now={now} setPage={setPage} />
    : page === 'history' ? <HistoryPage now={now} timezone={user.timezone} />
      : page === 'analytics' ? <Suspense fallback={<div className="card chart-loading">Loading your analytics…</div>}><AnalyticsPage timezone={user.timezone} /></Suspense>
        : <ProfilePage user={user} updateUser={updateUser} onSignOut={signOut} />;

  return <div className="app-shell">
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand flex items-center gap-2.5"><span className="brand-mark"><Command size={18} /></span><span>Study Time<span className="brand-dot">.</span></span></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="main-nav" aria-label="Main navigation">
        {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${page === id ? 'selected' : ''}`} onClick={() => { setPage(id); setMobileNav(false); }}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{id === 'dashboard' && current?.session && <i className="nav-live" />}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-prompt"><span className="prompt-icon"><Sparkles size={15} /></span><strong>Small steps,<br />big momentum.</strong><p>Every session is a promise you keep to yourself.</p><div className="prompt-decoration">✳</div></div>
        <button className={`nav-item ${page === 'profile' ? 'selected' : ''}`} onClick={() => { setPage('profile'); setMobileNav(false); }}><Settings size={17} /><span>Profile & settings</span></button>
        <button className="user-switch" onClick={() => setProfileMenu(!profileMenu)}><span className="user-avatar">{user.name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()}</span><span className="user-ident"><strong>{user.name}</strong><span>{user.email}</span></span><ChevronDown size={15} />{profileMenu && <span className="user-menu"><span onClick={(event) => { event.stopPropagation(); setProfileMenu(false); setPage('profile'); }}><UserRound size={14} /> Profile</span><span onClick={(event) => { event.stopPropagation(); signOut(); }}><LogOut size={14} /> Sign out</span></span>}</button>
      </div>
    </aside>
    <main className="main-panel">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={19} /></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div></div><div className="topbar-actions"><span className="topbar-date"><CalendarDays size={15} />{dateLabel(new Date(), { month: 'short', day: 'numeric' }, user.timezone)}</span><button className="icon-button notification-button" onClick={() => setToast('You’re all caught up. No new notifications.')} aria-label="Notifications"><Bell size={17} /></button><button className="topbar-avatar" onClick={() => setPage('profile')}>{user.name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()}</button></div></header>
      <div className="page-wrap">{mainContent}<footer className="page-footer"><span>Make time for what matters <span className="footer-spark">✳</span></span><span>STUDY TIME · STUDY WITH INTENTION</span></footer></div>
    </main>
    {toast && <div className="toast" role="status" aria-live="polite"><span className="toast-check"><Check size={14} /></span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={15} /></button></div>}
  </div>;
}

export default App;
