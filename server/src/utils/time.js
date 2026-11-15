export function dateKeyAt(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function dayKeyOffset(dateKey, offset) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function isDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function durationForActivity(activity, now = new Date()) {
  return Math.max(0, (activity.endTime ?? now) - activity.startTime);
}

export function serializeSession(session, now = new Date()) {
  const activities = session.activities.map((activity) => ({
    id: activity._id.toString(),
    type: activity.type,
    startTime: activity.startTime,
    endTime: activity.endTime,
    duration: activity.endTime
      ? activity.duration
      : durationForActivity(activity, now)
  }));
  const studyDuration = activities
    .filter((activity) => activity.type === 'study')
    .reduce((total, activity) => total + activity.duration, 0);
  const breakDuration = activities
    .filter((activity) => activity.type === 'break')
    .reduce((total, activity) => total + activity.duration, 0);
  return {
    id: session._id.toString(),
    date: session.dateKey,
    loginAt: session.loginAt,
    logoutAt: session.logoutAt,
    totalDuration: session.logoutAt
      ? session.totalDuration
      : Math.max(0, now - session.loginAt),
    studyDuration,
    breakDuration,
    status: session.status,
    activities
  };
}
