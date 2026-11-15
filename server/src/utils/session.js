export function finishSession(session, now = new Date()) {
  const active = session.activities.at(-1);
  if (active && !active.endTime) {
    active.endTime = now;
    active.duration = Math.max(0, now - active.startTime);
  }
  session.logoutAt = now;
  session.status = 'logged_out';
  session.studyDuration = session.activities
    .filter((activity) => activity.type === 'study')
    .reduce((sum, activity) => sum + activity.duration, 0);
  session.breakDuration = session.activities
    .filter((activity) => activity.type === 'break')
    .reduce((sum, activity) => sum + activity.duration, 0);
  session.totalDuration = Math.max(0, now - session.loginAt);
}
