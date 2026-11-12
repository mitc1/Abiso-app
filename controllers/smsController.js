const SmsLog = require('../models/SmsLog');
const Household = require('../models/Household');
const Setting = require('../models/Setting');

// Dalawang mode:
//  1) REAL  - kapag may SMS_GATEWAY_URL sa .env: ipapadala sa Android phone (app: "SMS Gateway for Android")
//  2) DEMO  - kapag wala: simulated lang (random Delivered/Failed), walang totoong text
const GATEWAY = (process.env.SMS_GATEWAY_URL || '').trim();
const BATCH = +process.env.SMS_BATCH_SIZE || 20; // ilang numero kada request (para hindi ma-block ang SIM)

// 0917 123 4567 / 09171234567 / 9171234567 / 639171234567  ->  +639171234567
function toIntl(p) {
  const d = String(p || '').replace(/\D/g, '');
  if (/^09\d{9}$/.test(d)) return '+63' + d.slice(1);
  if (/^9\d{9}$/.test(d)) return '+63' + d;
  if (/^639\d{9}$/.test(d)) return '+' + d;
  return null;
}

// Settings galing sa app (Settings > SMS Gateway). Kapag wala, .env ang gagamitin.
async function getCfg() {
  const d = await Setting.findOne({ key: 'sms' }).lean(), v = (d && d.value) || {};
  if (v.enabled && v.ip) return { url: `http://${v.ip}:${v.port || 8080}/message`, user: v.user || '', pass: v.pass || '' };
  if (!d && GATEWAY) return { url: GATEWAY, user: process.env.SMS_GATEWAY_USER || '', pass: process.env.SMS_GATEWAY_PASS || '' };
  return { url: '' };
}

async function gatewaySend(cfg, numbers, text) {
  const auth = Buffer.from(`${cfg.user}:${cfg.pass}`).toString('base64');
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(cfg.url, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + auth },
      body: JSON.stringify({ textMessage: { text }, phoneNumbers: numbers })
    });
    if (r.ok) return { ok: true };
    return { ok: false, error: r.status === 401 ? 'Mali ang username o password ng phone.' : `Tinanggihan ng phone (code ${r.status}).` };
  } catch (e) { console.error('SMS gateway error:', e.message); return { ok: false, error: 'Hindi maabot ang phone. I-check ang IP, ang WiFi/hotspot, at kung naka-on ang Local Server.' }; }
  finally { clearTimeout(t); }
}

async function sendTo(households, text) {
  const cfg = await getCfg();
  let logs;
  if (!cfg.url) {
    logs = households.map(h => ({
      household: h._id, householdId: h.householdId, name: h.name, phone: h.phone, group: h.group,
      text, status: Math.random() < 0.92 ? 'Delivered' : 'Failed'
    }));
  } else {
    const items = households.map(h => ({ h, num: toIntl(h.phone) }));
    const ok = new Map();
    const valid = items.filter(i => i.num);
    for (let i = 0; i < valid.length; i += BATCH) {
      const chunk = valid.slice(i, i + BATCH);
      const r = await gatewaySend(cfg, chunk.map(c => c.num), text);
      chunk.forEach(c => ok.set(c.h, r.ok));
    }
    logs = items.map(({ h }) => ({
      household: h._id, householdId: h.householdId, name: h.name, phone: h.phone, group: h.group,
      text, status: ok.get(h) ? 'Sent' : 'Failed'
    }));
  }
  if (logs.length) await SmsLog.insertMany(logs);
  return logs.length;
}

exports.getConfig = async (req, res) => {
  const d = await Setting.findOne({ key: 'sms' }).lean(), v = (d && d.value) || {};
  res.json({ ip: v.ip || '', port: v.port || 8080, user: v.user || '', hasPass: !!v.pass, enabled: !!v.enabled, live: !!(await getCfg()).url });
};
exports.saveConfig = async (req, res) => {
  const { ip, port, user, pass, enabled } = req.body, old = ((await Setting.findOne({ key: 'sms' }).lean()) || {}).value || {};
  const cleanIp = String(ip || '').trim().replace(/^https?:\/\//, '').replace(/:\d+.*$/, '').replace(/\/.*$/, '');
  if (enabled && !/^[\w.\-]+$/.test(cleanIp)) return res.status(400).json({ error: 'Ilagay ang tamang IP ng phone (hal. 192.168.43.1).' });
  const p = +port || 8080; if (p < 1 || p > 65535) return res.status(400).json({ error: 'Maling port.' });
  const value = { ip: cleanIp, port: p, user: String(user || '').trim(), pass: pass ? String(pass) : (old.pass || ''), enabled: !!enabled };
  await Setting.findOneAndUpdate({ key: 'sms' }, { value }, { upsert: true });
  res.json({ ok: true });
};
exports.test = async (req, res) => {
  const cfg = await getCfg(), num = toIntl(req.body.phone);
  if (!cfg.url) return res.status(400).json({ error: 'Naka-off pa ang SMS gateway. I-on at i-save muna ang settings.' });
  if (!num) return res.status(400).json({ error: 'Maling numero. Gamitin ang format na 09xx xxx xxxx.' });
  const r = await gatewaySend(cfg, [num], 'ABISO: Test message. Gumagana ang SMS gateway ng barangay.');
  r.ok ? res.json({ ok: true }) : res.status(502).json({ error: r.error });
};
exports.sendTo = sendTo;

exports.send = async (req, res) => {
  const { ids = [], text } = req.body;
  if (!ids.length || !text) return res.status(400).json({ error: 'Pumili ng households at magsulat ng mensahe.' });
  const n = await sendTo(await Household.find({ _id: { $in: ids } }), text);
  res.json({ sent: n });
};
exports.list = async (req, res) => res.json(await SmsLog.find().sort({ createdAt: -1 }).limit(300));
exports.stats = async (req, res) => {
  const [sent, delivered, failed] = await Promise.all([
    SmsLog.countDocuments(), SmsLog.countDocuments({ status: { $in: ['Delivered', 'Sent'] } }), SmsLog.countDocuments({ status: 'Failed' })]);
  res.json({ sent, delivered, failed });
};
