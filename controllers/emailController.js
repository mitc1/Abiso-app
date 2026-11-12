const path = require('path');
const Setting = require('../models/Setting');
const LOGO = { filename: 'logo.png', path: path.join(__dirname, '..', 'public', 'logo-email.png'), cid: 'abisologo' };

// Gmail notification. Kailangan ng Gmail address + App Password (Settings > Email sa app).
const okMail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());
let cached = null;

async function getCfg() {
  const d = await Setting.findOne({ key: 'email' }).lean(), v = (d && d.value) || {};
  return v.enabled && v.user && v.pass ? { user: v.user, pass: v.pass } : null;
}
function makeTransport(cfg) {
  const nodemailer = require('nodemailer'); // kailangan ang: npm install
  const sig = cfg.user + cfg.pass;
  if (!cached || cached.sig !== sig) cached = { sig, tr: nodemailer.createTransport({ service: 'gmail', pool: true, maxConnections: 3, auth: { user: cfg.user, pass: cfg.pass } }) };
  return cached.tr;
}
const when = d => { try { return new Date(d).toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Manila' }); } catch (e) { return ''; } };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function build(a) {
  const lines = [a.message, '', a.eventDate ? 'Petsa/Oras: ' + when(a.eventDate) : '', a.location ? 'Lokasyon: ' + a.location : ''].filter((x, i) => x || i === 1);
  const text = lines.join('\n') + '\n\n— Barangay Cambalo (ABISO)';
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:34rem;margin:auto;border:1px solid #dcebe3;border-radius:12px;overflow:hidden">
    <div style="background:#2f6b57;color:#fff;padding:12px 18px"><table role="presentation" style="border:0"><tr><td style="padding-right:12px"><img src="cid:abisologo" width="44" height="44" alt="" style="display:block"></td><td style="color:#fff"><b style="font-size:20px;letter-spacing:1px">ABISO</b><br><span style="font-size:12px;opacity:.85">Barangay Cambalo, Cajidiocan, Romblon</span></td></tr></table></div>
    <div style="padding:18px;color:#1c3029"><h2 style="margin:0 0 10px">${esc(a.title)}</h2><p style="white-space:pre-line">${esc(a.message)}</p>
    ${a.eventDate ? `<p><b>Petsa/Oras:</b> ${esc(when(a.eventDate))}</p>` : ''}${a.location ? `<p><b>Lokasyon:</b> ${esc(a.location)}</p>` : ''}</div>
    <div style="padding:10px 18px;background:#f3f8f5;color:#66807a;font-size:12px">Mensaheng ito ay mula sa Barangay Cambalo.</div></div>`;
  return { subject: 'ABISO: ' + a.title, text, html, attachments: [LOGO] };
}

// Ipinapadala sa background (hindi hinihintay) para hindi bumagal ang pag-publish. Ibinabalik ang bilang ng may email.
exports.notifyHouseholds = async (households, a) => {
  const cfg = await getCfg(); if (!cfg) return 0;
  const to = households.map(h => h.head && h.head.email).filter(okMail);
  if (!to.length) return 0;
  let tr; try { tr = makeTransport(cfg); } catch (e) { console.error('Email: wala ang nodemailer. Patakbuhin ang "npm install".'); return 0; }
  const m = build(a);
  (async () => {
    for (const addr of to) {
      try { await tr.sendMail({ from: `"ABISO Barangay Cambalo" <${cfg.user}>`, to: addr, ...m }); }
      catch (e) { console.error('Email failed:', addr, e.message); }
    }
  })();
  return to.length;
};

exports.getConfig = async (req, res) => {
  const d = await Setting.findOne({ key: 'email' }).lean(), v = (d && d.value) || {};
  res.json({ user: v.user || '', hasPass: !!v.pass, enabled: !!v.enabled });
};
exports.saveConfig = async (req, res) => {
  const { user, pass, enabled } = req.body, old = ((await Setting.findOne({ key: 'email' }).lean()) || {}).value || {};
  if (enabled && !okMail(user)) return res.status(400).json({ error: 'Ilagay ang tamang Gmail address.' });
  const value = { user: String(user || '').trim(), pass: pass ? String(pass).replace(/\s+/g, '') : (old.pass || ''), enabled: !!enabled };
  if (enabled && !value.pass) return res.status(400).json({ error: 'Ilagay ang Gmail App Password.' });
  await Setting.findOneAndUpdate({ key: 'email' }, { value }, { upsert: true });
  res.json({ ok: true });
};
exports.test = async (req, res) => {
  const cfg = await getCfg(), to = String(req.body.email || '').trim();
  if (!cfg) return res.status(400).json({ error: 'Naka-off pa ang email. I-on at i-save muna ang settings.' });
  if (!okMail(to)) return res.status(400).json({ error: 'Maling email address.' });
  let tr; try { tr = makeTransport(cfg); } catch (e) { return res.status(500).json({ error: 'Wala pa ang nodemailer. Patakbuhin ang "npm install" sa folder ng app.' }); }
  try { await tr.sendMail({ from: `"ABISO Barangay Cambalo" <${cfg.user}>`, to, ...build({ title: 'Test email', message: 'Gumagana ang email notification ng ABISO.' }) }); res.json({ ok: true }); }
  catch (e) { res.status(502).json({ error: /Invalid login|Username and Password|535/i.test(e.message) ? 'Mali ang Gmail o App Password.' : 'Hindi naipadala: ' + e.message }); }
};
