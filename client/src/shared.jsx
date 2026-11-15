import { ArrowUpRight } from 'lucide-react';

export function durationLabel(milliseconds = 0, short = false) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return short
    ? `${hours}h ${minutes.toString().padStart(2, '0')}m`
    : [hours, minutes, remainder].map((part) => String(part).padStart(2, '0')).join(':');
}

export function StatCard({ title, value, note, icon: Icon, tone, trend }) {
  return (
    <article className="stat-card">
      <div className="stat-top"><span>{title}</span><span className={`stat-icon ${tone}`}><Icon size={17} /></span></div>
      <strong>{value}</strong>
      <div className="stat-foot"><span>{trend && <span className="trend"><ArrowUpRight size={13} /> {trend}</span>}{note}</span></div>
    </article>
  );
}
