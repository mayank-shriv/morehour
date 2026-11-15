import { useEffect, useState } from 'react';
import { Activity, ArrowDownRight, Check, ChevronRight, Flame, Sparkles, Target, Clock3 } from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import api, { getErrorMessage } from './api.js';
import { durationLabel, StatCard } from './shared.jsx';

export default function AnalyticsPage() {
  const [range, setRange] = useState('weekly');
  const [report, setReport] = useState(null);
  const [daily, setDaily] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([api.get(`/analytics/${range}`), api.get('/analytics/daily')])
      .then(([periodResponse, dailyResponse]) => {
        if (active) {
          setReport(periodResponse.data);
          setDaily(dailyResponse.data);
          setError('');
        }
      })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); });
    return () => { active = false; };
  }, [range]);
  const data = (report?.days || []).map((day) => ({
    ...day,
    label: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${day.date}T12:00:00`)),
    studyHours: Number((day.studyDuration / 3600000).toFixed(2)),
    breakHours: Number((day.breakDuration / 3600000).toFixed(2))
  }));
  const ratio = report?.breakDuration ? (report.studyDuration / report.breakDuration).toFixed(1) : report?.studyDuration ? '∞' : '0';
  const dailyPie = [{ name: 'Study', value: daily?.studyDuration || 0.001 }, { name: 'Break', value: daily?.breakDuration || 0.001 }];
  const tooltipStyle = { borderRadius: 12, border: '1px solid #e8e9e5', boxShadow: '0 8px 24px #17231a12', fontSize: 12 };

  return <div className="page-content">
    <div className="page-intro"><div><div className="eyebrow muted-eyebrow">A LITTLE PERSPECTIVE</div><h1>Your analytics</h1><p>Notice your patterns. Celebrate your progress.</p></div><div className="range-toggle"><button className={range === 'weekly' ? 'active' : ''} onClick={() => setRange('weekly')}>7 days</button><button className={range === 'monthly' ? 'active' : ''} onClick={() => setRange('monthly')}>This month</button></div></div>
    {error && <div className="inline-error">{error}</div>}
    <section className="stats-grid analytics-stats">
      <StatCard title="Productive hours" value={durationLabel(report?.studyDuration || 0, true)} note={range === 'weekly' ? 'Last 7 days' : 'This month'} icon={Target} tone="green-icon" />
      <StatCard title="Daily average" value={durationLabel(report?.averageStudyDuration || 0, true)} note="Including days off" icon={Flame} tone="orange-icon" />
      <StatCard title="Study / break" value={`${ratio}:1`} note="Focus-to-rest ratio" icon={Activity} tone="violet-icon" />
      <StatCard title="Sessions" value={String(report?.sessionCount || 0)} note="Tracking sessions" icon={Clock3} tone="blue-icon" />
    </section>
    <section className="analytics-grid">
      <article className="card chart-card wide-chart"><div className="section-heading"><div><span className="section-overline">YOUR CONSISTENCY</span><h3>Time, thoughtfully spent</h3></div><div className="chart-legend"><span><i className="legend-dot green" /> Study</span><span><i className="legend-dot orange" /> Break</span></div></div>
        <div className="chart-area">{data.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}><defs><linearGradient id="studyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#64896d" stopOpacity={0.2} /><stop offset="95%" stopColor="#64896d" stopOpacity={0} /></linearGradient><linearGradient id="breakFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e9a16d" stopOpacity={0.18} /><stop offset="95%" stopColor="#e9a16d" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eef0ec" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#929790', fontSize: 11 }} dy={10} interval={range === 'monthly' ? 4 : 0} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#929790', fontSize: 11 }} tickFormatter={(value) => `${value}h`} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} h`]} /><Area type="monotone" dataKey="studyHours" name="Study" stroke="#527c5d" strokeWidth={2.5} fill="url(#studyFill)" activeDot={{ r: 4 }} /><Area type="monotone" dataKey="breakHours" name="Break" stroke="#e5a06f" strokeWidth={2} fill="url(#breakFill)" activeDot={{ r: 4 }} /></AreaChart></ResponsiveContainer> : <div className="chart-empty">Your chart will come to life after your first session.</div>}</div>
      </article>
      <article className="card today-chart-card"><div className="section-heading"><div><span className="section-overline">TODAY</span><h3>Focus balance</h3></div><button className="icon-button subtle" aria-label="Today's focus"><ChevronRight size={17} /></button></div><div className="today-pie-wrap"><div className="donut-label"><strong>{daily?.studyDuration ? `${Math.round((daily.studyDuration / (daily.studyDuration + daily.breakDuration || 1)) * 100)}%` : '—'}</strong><span>in focus</span></div><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dailyPie} dataKey="value" innerRadius="72%" outerRadius="91%" startAngle={90} endAngle={-270} paddingAngle={4} stroke="none"><Cell fill="#527c5d" /><Cell fill="#e5a06f" /></Pie></PieChart></ResponsiveContainer></div><div className="today-chart-stats"><div><span><i className="legend-dot green" />Study</span><strong>{durationLabel(daily?.studyDuration || 0, true)}</strong></div><div><span><i className="legend-dot orange" />Break</span><strong>{durationLabel(daily?.breakDuration || 0, true)}</strong></div></div></article>
      <article className="card chart-card weekly-bars"><div className="section-heading"><div><span className="section-overline">SMALL WINS</span><h3>Daily study hours</h3></div><span className="chart-unit">HOURS</span></div><div className="bar-chart">{data.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}><CartesianGrid stroke="#eef0ec" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#929790', fontSize: 11 }} dy={9} interval={range === 'monthly' ? 4 : 0} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#929790', fontSize: 11 }} tickFormatter={(value) => `${value}h`} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} h`, 'Study']} /><Bar dataKey="studyHours" fill="#64896d" radius={[5, 5, 1, 1]} maxBarSize={28} /></BarChart></ResponsiveContainer> : <div className="chart-empty">No data to show just yet.</div>}</div></article>
      <article className="card insight-card"><div className="insight-icon"><Sparkles size={19} /></div><span className="section-overline">A NOTE FOR YOU</span><h3>{report?.studyDuration ? 'Consistency is a superpower.' : 'Every journey starts somewhere.'}</h3><p>{report?.studyDuration ? `You’ve invested ${durationLabel(report.studyDuration, true)} in focused work ${range === 'weekly' ? 'this week' : 'this month'}. That time adds up—keep showing up for yourself.` : 'Start a session whenever you’re ready. Your first focused minute is the beginning of a great habit.'}</p><div className="insight-footer"><span><Check size={14} /> Your progress is yours</span><ArrowDownRight size={17} /></div></article>
    </section>
  </div>;
}
