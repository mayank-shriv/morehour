import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function createToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '14d' });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, timezone: user.timezone };
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, timezone } = req.body;
    if (typeof name !== 'string' || !name.trim()
      || typeof email !== 'string' || !email.trim()
      || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Enter your name, a valid email, and a password of at least 8 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (typeof timezone === 'string' && timezone) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: timezone });
      } catch {
        return res.status(400).json({ message: 'Enter a valid timezone.' });
      }
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      timezone: typeof timezone === 'string' && timezone ? timezone : 'UTC'
    });
    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireAuth, (_req, res) => res.json({ message: 'Signed out successfully.' }));

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { name, timezone } = req.body;
    if (typeof name === 'string') {
      if (!name.trim()) return res.status(400).json({ message: 'Name cannot be empty.' });
      req.user.name = name.trim();
    }
    if (typeof timezone === 'string' && timezone) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: timezone });
      } catch {
        return res.status(400).json({ message: 'Enter a valid timezone.' });
      }
      req.user.timezone = timezone;
    }
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  } catch (error) {
    next(error);
  }
});

export default router;
