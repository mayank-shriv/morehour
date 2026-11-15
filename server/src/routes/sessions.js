import { Router } from 'express';
import StudySession from '../models/StudySession.js';
import { requireAuth } from '../middleware/auth.js';
import { dateKeyAt, isDateKey, serializeSession } from '../utils/time.js';
import { finishSession } from '../utils/session.js';

const router = Router();
router.use(requireAuth);

function closeActivity(session, now) {
  const active = session.activities.at(-1);
  if (active && !active.endTime) {
    active.endTime = now;
    active.duration = Math.max(0, now - active.startTime);
  }
}

function refreshDurations(session) {
  session.studyDuration = session.activities
    .filter((activity) => activity.type === 'study')
    .reduce((sum, activity) => sum + activity.duration, 0);
  session.breakDuration = session.activities
    .filter((activity) => activity.type === 'break')
    .reduce((sum, activity) => sum + activity.duration, 0);
  session.totalDuration = session.logoutAt
    ? Math.max(0, session.logoutAt - session.loginAt)
    : Math.max(0, Date.now() - session.loginAt);
}

router.post('/start', async (req, res, next) => {
  try {
    const active = await StudySession.exists({ userId: req.user.id, logoutAt: null });
    if (active) return res.status(409).json({ message: 'You already have an active tracking session.' });
    const now = new Date();
    const session = await StudySession.create({
      userId: req.user.id,
      dateKey: dateKeyAt(now, req.user.timezone),
      loginAt: now,
      status: 'studying',
      activities: [{ type: 'study', startTime: now }]
    });
    res.status(201).json({ session: serializeSession(session, now) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You already have an active tracking session.' });
    next(error);
  }
});

async function switchActivity(req, res, next, type) {
  try {
    const session = await StudySession.findOne({ userId: req.user.id, logoutAt: null });
    if (!session) return res.status(409).json({ message: 'Start a tracking session before changing activity.' });
    if (session.status === type) return res.json({ session: serializeSession(session) });
    const now = new Date();
    closeActivity(session, now);
    session.activities.push({ type, startTime: now });
    session.status = type === 'study' ? 'studying' : 'break';
    refreshDurations(session);
    await session.save();
    res.json({ session: serializeSession(session, now) });
  } catch (error) {
    if (error.name === 'VersionError') {
      let current;
      try {
        current = await StudySession.findOne({ userId: req.user.id, logoutAt: null });
      } catch (loadError) {
        return next(loadError);
      }
      if (current?.status === type) return res.json({ session: serializeSession(current) });
      return res.status(409).json({
        message: current
          ? 'Your activity changed in another request. Please try again.'
          : 'Your tracking session is no longer active.'
      });
    }
    next(error);
  }
}

router.post('/study', (req, res, next) => switchActivity(req, res, next, 'study'));
router.post('/break', (req, res, next) => switchActivity(req, res, next, 'break'));

router.post('/end', async (req, res, next) => {
  try {
    const session = await StudySession.findOne({ userId: req.user.id, logoutAt: null });
    if (!session) return res.status(409).json({ message: 'There is no active tracking session to finish.' });
    const now = new Date();
    finishSession(session, now);
    await session.save();
    res.json({ session: serializeSession(session, now) });
  } catch (error) {
    next(error);
  }
});

router.get('/current', async (req, res, next) => {
  try {
    const today = dateKeyAt(new Date(), req.user.timezone);
    const [active, todaySessions] = await Promise.all([
      StudySession.findOne({ userId: req.user.id, logoutAt: null }),
      StudySession.find({ userId: req.user.id, dateKey: today }).sort({ loginAt: 1 })
    ]);
    const now = new Date();
    const reports = todaySessions.map((session) => serializeSession(session, now));
    res.json({
      session: active ? serializeSession(active, now) : null,
      today: {
        date: today,
        sessions: reports,
        loginAt: reports[0]?.loginAt ?? null,
        logoutAt: reports.at(-1)?.logoutAt ?? null,
        totalDuration: reports.reduce((sum, item) => sum + item.totalDuration, 0),
        studyDuration: reports.reduce((sum, item) => sum + item.studyDuration, 0),
        breakDuration: reports.reduce((sum, item) => sum + item.breakDuration, 0),
        sessionCount: reports.length,
        studySessions: reports.reduce((sum, item) => sum + item.activities.filter((activity) => activity.type === 'study').length, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const query = { userId: req.user.id };
    if (req.query.date !== undefined) {
      if (!isDateKey(req.query.date)) return res.status(400).json({ message: 'Enter a valid date in YYYY-MM-DD format.' });
      query.dateKey = req.query.date;
    }
    const sessions = await StudySession.find(query).sort({ loginAt: -1 }).limit(200);
    res.json({ sessions: sessions.map((session) => serializeSession(session)) });
  } catch (error) {
    next(error);
  }
});

export default router;
