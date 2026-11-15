import { Router } from 'express';
import StudySession from '../models/StudySession.js';
import { requireAuth } from '../middleware/auth.js';
import { dateKeyAt, dayKeyOffset, isDateKey, serializeSession } from '../utils/time.js';

const router = Router();
router.use(requireAuth);

function sumSessions(sessions) {
  return sessions.reduce((result, session) => {
    const data = serializeSession(session);
    result.studyDuration += data.studyDuration;
    result.breakDuration += data.breakDuration;
    result.totalDuration += data.totalDuration;
    result.sessionCount += 1;
    return result;
  }, { studyDuration: 0, breakDuration: 0, totalDuration: 0, sessionCount: 0 });
}

router.get('/daily', async (req, res, next) => {
  try {
    if (req.query.date !== undefined && !isDateKey(req.query.date)) {
      return res.status(400).json({ message: 'Enter a valid date in YYYY-MM-DD format.' });
    }
    const date = req.query.date ?? dateKeyAt(new Date(), req.user.timezone);
    const sessions = await StudySession.find({ userId: req.user.id, dateKey: date }).sort({ loginAt: 1 });
    res.json({ date, ...sumSessions(sessions), sessions: sessions.map((session) => serializeSession(session)) });
  } catch (error) {
    next(error);
  }
});

async function groupedReport(req, res, next, period) {
  try {
    const today = dateKeyAt(new Date(), req.user.timezone);
    const range = period === 'weekly' ? 6 : Number(today.slice(8, 10)) - 1;
    const start = dayKeyOffset(today, -range);
    const sessions = await StudySession.find({
      userId: req.user.id,
      dateKey: { $gte: start, $lte: today }
    }).sort({ loginAt: 1 });
    const groups = new Map();
    for (let offset = range; offset >= 0; offset -= 1) {
      groups.set(dayKeyOffset(today, -offset), { date: dayKeyOffset(today, -offset), studyDuration: 0, breakDuration: 0, totalDuration: 0, sessionCount: 0 });
    }
    for (const session of sessions) {
      const group = groups.get(session.dateKey);
      if (!group) continue;
      const data = serializeSession(session);
      group.studyDuration += data.studyDuration;
      group.breakDuration += data.breakDuration;
      group.totalDuration += data.totalDuration;
      group.sessionCount += 1;
    }
    const days = [...groups.values()];
    const totals = days.reduce((sum, day) => ({
      studyDuration: sum.studyDuration + day.studyDuration,
      breakDuration: sum.breakDuration + day.breakDuration,
      totalDuration: sum.totalDuration + day.totalDuration,
      sessionCount: sum.sessionCount + day.sessionCount
    }), { studyDuration: 0, breakDuration: 0, totalDuration: 0, sessionCount: 0 });
    res.json({
      period,
      days,
      ...totals,
      averageStudyDuration: days.length ? Math.round(totals.studyDuration / days.length) : 0
    });
  } catch (error) {
    next(error);
  }
}

router.get('/weekly', (req, res, next) => groupedReport(req, res, next, 'weekly'));
router.get('/monthly', (req, res, next) => groupedReport(req, res, next, 'monthly'));

export default router;
