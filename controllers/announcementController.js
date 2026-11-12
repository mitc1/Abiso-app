const Announcement = require('../models/Announcement');
const Household = require('../models/Household');
const { sendTo } = require('./smsController');
const { notifyHouseholds } = require('./emailController');

const KEYS = {
  PSA: ['psa', 'national id', 'birth certificate', 'registration', 'philsys'],
  Ayuda: ['ayuda', 'distribution', 'relief', 'cash', '4ps', 'bigas', 'assistance'],
  Health: ['medical', 'mission', 'health', 'bakuna', 'vaccine', 'check-up', 'checkup', 'gamot', 'dental'],
  Events: ['meeting', 'assembly', 'general', 'event', 'pulong', 'programa', 'clean-up', 'fiesta'],
  Emergency: ['bagyo', 'typhoon', 'baha', 'flood', 'sunog', 'fire', 'lindol', 'evacuat', 'emergency']
};
// Keyword-based AI classification (pwedeng palitan ng totoong AI API)
function classify(text) {
  text = (text || '').toLowerCase();
  let best = 'Others', top = 0;
  for (const [c, words] of Object.entries(KEYS)) {
    const s = words.filter(w => text.includes(w)).length;
    if (s > top) { top = s; best = c; }
  }
  return { category: best, confidence: top ? Math.min(98, 60 + top * 12) : 0 };
}

// Sabay na SMS at email sa mga household representative
async function notify(a) {
  const q = a.target === 'All' ? {} : { $or: [{ group: a.target }, { groups: a.target }] };
  const hh = await Household.find(q);
  const sms = await sendTo(hh, `${a.title}: ${a.message}`);
  let email = 0; try { email = await notifyHouseholds(hh, a); } catch (e) { console.error('Email error:', e.message); }
  return { sms, email };
}

exports.classify = (req, res) => res.json(classify(`${req.body.title} ${req.body.message}`));
exports.getAll = async (req, res) => res.json(await Announcement.find().sort({ createdAt: -1 }));
exports.create = async (req, res) => {
  try {
    const body = { ...req.body, category: classify(`${req.body.title} ${req.body.message}`).category };
    const a = await Announcement.create(body);
    const n = a.status === 'Published' ? await notify(a) : { sms: 0, email: 0 };
    res.status(201).json({ announcement: a, sms: n.sms, email: n.email });
  } catch (e) { res.status(400).json({ error: e.message }); }
};
exports.update = async (req, res) => {
  try { res.json(await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })); }
  catch (e) { res.status(400).json({ error: e.message }); }
};
exports.publish = async (req, res) => {
  const a = await Announcement.findByIdAndUpdate(req.params.id, { status: 'Published' }, { new: true });
  const n = await notify(a);
  res.json({ announcement: a, sms: n.sms, email: n.email });
};
exports.remove = async (req, res) => { await Announcement.findByIdAndDelete(req.params.id); res.json({ ok: true }); };
