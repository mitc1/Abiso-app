const crypto = require('crypto');
const Admin = require('../models/Admin');
const tokens = new Map(); // token -> adminId
const hash = (p, salt) => crypto.scryptSync(p, salt, 64).toString('hex');
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const make = pw => { const salt = crypto.randomBytes(16).toString('hex'); return { salt, passHash: hash(pw, salt) }; };
const tokenOf = req => (req.headers.authorization || '').replace('Bearer ', '');

// Gagawa ng unang admin mula sa .env (isang beses lang)
exports.ensureAdmin = async () => {
  if (await Admin.countDocuments()) return;
  await Admin.create({ username: process.env.ADMIN_USER, displayName: 'Admin', ...make(process.env.ADMIN_PASS) });
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const a = await Admin.findOne({ username });
  if (!a || !same(hash(password || '', a.salt), a.passHash)) return res.status(401).json({ error: 'Maling username o password.' });
  a.logins.unshift({ at: new Date(), ip: req.ip, ua: (req.headers['user-agent'] || '').slice(0, 80) });
  a.logins = a.logins.slice(0, 8); await a.save();
  const t = crypto.randomBytes(24).toString('hex'); tokens.set(t, String(a._id));
  res.json({ token: t });
};

exports.protect = (req, res, next) => {
  const id = tokens.get(tokenOf(req));
  if (!id) return res.status(401).json({ error: 'Unauthorized' });
  req.adminId = id; next();
};

exports.me = async (req, res) => {
  const a = await Admin.findById(req.adminId);
  res.json({ username: a.username, displayName: a.displayName, logins: a.logins });
};

exports.updateAccount = async (req, res) => {
  const username = (req.body.username || '').trim(), displayName = (req.body.displayName || '').trim();
  if (!username || !displayName) return res.status(400).json({ error: 'Username and display name are required.' });
  const taken = await Admin.findOne({ username, _id: { $ne: req.adminId } });
  if (taken) return res.status(400).json({ error: 'Username is already taken.' });
  const a = await Admin.findByIdAndUpdate(req.adminId, { username, displayName }, { new: true });
  res.json({ username: a.username, displayName: a.displayName });
};

exports.changePassword = async (req, res) => {
  const { current = '', next = '' } = req.body;
  const a = await Admin.findById(req.adminId);
  if (!same(hash(current, a.salt), a.passHash)) return res.status(400).json({ error: 'Current password is incorrect.' });
  if (next.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  Object.assign(a, make(next)); await a.save();
  const mine = tokenOf(req);
  for (const [t, id] of tokens) if (id === req.adminId && t !== mine) tokens.delete(t); // logout sa ibang device
  res.json({ ok: true });
};

exports.logoutAll = (req, res) => {
  for (const [t, id] of tokens) if (id === req.adminId) tokens.delete(t);
  res.json({ ok: true });
};
