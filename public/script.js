const $ = s => document.querySelector(s);
const GROUPS = ['Senior Citizens', 'Low Income', 'PWD', '4Ps', 'Single Parents', 'General'];
const CATS = ['PSA', 'Ayuda', 'Health', 'Events', 'Emergency', 'Others'];
let token = sessionStorage.getItem('tk') || '', page = 'dashboard', filter = 'All', hq = '', hg = 'All', sel = new Set(), cache = [];

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = s => s ? new Date(s).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';


/* ---- preferences, language (i18n), font size ---- */
let prefs = Object.assign({ lang: 'tl', fs: 1, mask: false, idle: 0 }, JSON.parse(localStorage.getItem('abiso_prefs') || '{}'));
const savePrefs = () => localStorage.setItem('abiso_prefs', JSON.stringify(prefs));
const SIZES = [14, 16, 18, 20];
document.documentElement.style.fontSize = SIZES[prefs.fs] + 'px';
document.documentElement.lang = prefs.lang === 'tl' ? 'fil' : 'en';
/* ---- dark / light mode ---- */
function applyTheme() {
  const t = prefs.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = t;
  document.querySelectorAll('.themebtn').forEach(b => b.textContent = t === 'dark' ? '\u2600\uFE0F' : '\u{1F319}');
}
function toggleTheme() { prefs.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; savePrefs(); applyTheme(); }
document.addEventListener('DOMContentLoaded', applyTheme); applyTheme();

/* ---- validation (pulang field kapag kulang / mali) ---- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, PHONE_RE = /^(09\d{9}|9\d{9}|639\d{9})$/;
function clearErr(el) { el.classList.remove('invalid'); const a = el.closest('.pwwrap') || el, n = a.nextElementSibling; if (n && n.classList.contains('ferr')) n.remove(); }
function setErr(el, msg) {
  el.classList.remove('invalid'); void el.offsetWidth; el.classList.add('invalid');
  const a = el.closest('.pwwrap') || el; let n = a.nextElementSibling; if (!n || !n.classList.contains('ferr')) { n = document.createElement('div'); n.className = 'ferr'; a.insertAdjacentElement('afterend', n); }
  n.textContent = tx(msg);
}
// list = [[element, ok?, message], ...]  ->  true kung lahat ay tama
function check(list) {
  let first = null;
  list.forEach(([el, ok, msg]) => { if (!el) return; if (ok) clearErr(el); else { setErr(el, msg); first = first || el; } });
  if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => first.focus({ preventScroll: true }), 250); toast('Punan o ayusin ang mga pulang field.'); }
  return !first;
}
['input', 'change'].forEach(ev => document.addEventListener(ev, e => { if (e.target.classList && e.target.classList.contains('invalid')) clearErr(e.target); }));

const D = {};
[ // [source text, English, Tagalog]  (0 = pareho sa source)
[' Barangay Notification System using AI-Based Announcement Classification and Household Profiling',0,'Matalinong Sistema ng Abiso ng Barangay gamit ang AI-Based na Pag-uuri ng Anunsyo at Profile ng Sambahayan'],
['Admin Login',0,'Pag-login ng Admin'],['Access the ABISO Admin Panel',0,'Pumasok sa ABISO Admin Panel'],['Log In',0,'Mag-login'],['Log out',0,'Mag-logout'],
['(nasa .env)','(in .env)',0],['Maling username o password.','Wrong username or password.',0],['Administrator',0,'Tagapangasiwa'],
['Announcements',0,'Mga Anunsyo'],['Households',0,'Mga Sambahayan'],['SMS Notifications',0,'Mga Abiso sa SMS'],['Reports',0,'Mga Ulat'],['Settings',0,'Mga Setting'],
['Overview of barangay information and system activity.',0,'Buod ng impormasyon ng barangay at aktibidad ng sistema.'],
['Total Households',0,'Kabuuang Sambahayan'],['SMS Sent',0,'Naipadala na SMS'],['Recent Announcements',0,'Mga Kamakailang Anunsyo'],
['Wala pang announcement.','No announcements yet.','Wala pang anunsyo.'],['Notification Delivery Summary',0,'Buod ng Paghahatid ng Abiso'],
['Delivered:',0,'Naihatid:'],['Sent:',0,'Naipadala:'],['Failed:',0,'Nabigo:'],['Delivered',0,'Naihatid'],['Failed',0,'Nabigo'],['Sent',0,'Naipadala'],['Published',0,'Na-publish'],
['Upcoming Events',0,'Mga Paparating na Event'],['Wala pang paparating na event.','No upcoming events.',0],
['Create, manage and track all barangay announcements.',0,'Gumawa, mamahala at subaybayan ang lahat ng anunsyo ng barangay.'],
['+ Create Announcement',0,'+ Gumawa ng Anunsyo'],['All',0,'Lahat'],['Title',0,'Pamagat'],['Category',0,'Kategorya'],['Date',0,'Petsa'],['Status',0,'Katayuan'],['Actions',0,'Mga Aksyon'],
['Publish',0,'I-publish'],['Edit',0,'I-edit'],['Delete',0,'Burahin'],['Walang announcement.','No announcements.','Walang anunsyo.'],
['Create Announcement',0,'Gumawa ng Anunsyo'],['Punan ang detalye at hayaang i-classify ng AI.','Fill in the details and let the AI classify it.',0],
['Announcement Details',0,'Detalye ng Anunsyo'],['Title *',0,'Pamagat *'],['Message *',0,'Mensahe *'],['Date & Time *',0,'Petsa at Oras *'],['Location',0,'Lokasyon'],
['Target Audience / Household Group',0,'Target na Audience / Grupo ng Sambahayan'],
['e.g. PSA Registration for National ID',0,'hal. PSA Registration para sa National ID'],['I-type ang announcement dito...','Type the announcement here...',0],['e.g. Barangay Hall',0,'hal. Barangay Hall'],
['Save Draft',0,'I-save bilang Draft'],['Publish & Notify',0,'I-publish at Abisuhan'],['AI Classification',0,'Pag-uuri ng AI'],
['Mag-type para makita ang suggestion.','Type to see the suggestion.',0],['Walang tugmang keyword','No matching keyword',0],
['Household & SMS Management',0,'Pamamahala ng Sambahayan at SMS'],['Manage household profiles and send SMS notifications.',0,'Pamahalaan ang mga profile ng sambahayan at magpadala ng SMS.'],
['+ Add Household',0,'+ Magdagdag ng Sambahayan'],['Search household ID, name, address...',0,'Maghanap ng ID, pangalan, address...'],
['Representative',0,'Kinatawan'],['Phone',0,'Telepono'],['Group',0,'Grupo'],['Walang household.','No households.','Walang sambahayan.'],
['Low Income',0,'Mababang Kita'],['Single Parents',0,'Single Parent'],['General',0,'Pangkalahatan'],['Household',0,'Sambahayan'],
['Good day! This is a reminder for the upcoming Medical Mission...',0,'Magandang araw! Paalala po ito para sa paparating na Medical Mission...'],['Send SMS',0,'Ipadala ang SMS'],
['Kasaysayan ng lahat ng ipinadalang SMS.','History of all sent SMS.',0],['Oras','Time',0],['Mensahe','Message',0],['Wala pang SMS.','No SMS yet.',0],
['Demo (simulated) ang pagpapadala hangga’t walang SMS_GATEWAY_URL sa .env.','Sending is simulated until SMS_GATEWAY_URL is set in .env.',0],
['Reports & Monitoring',0,'Mga Ulat at Pagsubaybay'],['Subaybayan ang performance ng system at abot sa komunidad.','Track system performance and community reach.',0],
['Announcements Published',0,'Mga Na-publish na Anunsyo'],['SMS Delivered',0,'Naihatid na SMS'],['Households Reached',0,'Naabot na Sambahayan'],
['Announcements by Category',0,'Anunsyo ayon sa Kategorya'],['Total',0,'Kabuuan'],['Most Targeted Household Groups',0,'Mga Pinakatinarget na Grupo'],
['Wala pang datos.','No data yet.',0],['Delivery Success Rate',0,'Antas ng Tagumpay ng Paghahatid'],
['Kailangan ang title at message.','Title and message are required.',0],['Na-save ang draft.','Draft saved.',0],['Na-update.','Updated.',0],
['Pumili muna ng households.','Select households first.',0],['Isulat muna ang mensahe.','Write a message first.',0],['May error.','Something went wrong.',0],
['Pumili ng households at magsulat ng mensahe.','Select households and write a message.',0],
['Burahin ang announcement?','Delete this announcement?','Burahin ang anunsyo?'],['Burahin ang household?','Delete this household?','Burahin ang sambahayan?'],
['Title:',0,'Pamagat:'],['Message:',0,'Mensahe:'],['Representative (Apelyido, Pangalan):','Representative (Last name, First name):','Kinatawan (Apelyido, Pangalan):'],['Phone number:',0,'Numero ng telepono:'],
['Manage your account, language and display.',0,'Pamahalaan ang account, wika at itsura.'],
['Account Settings',0,'Mga Setting ng Account'],['Display name',0,'Pangalang ipapakita'],['Save changes',0,'I-save ang mga pagbabago'],
['Language',0,'Wika'],['Choose the language of the system.',0,'Piliin ang wika ng sistema.'],['Font size',0,'Laki ng Font'],
['Choose a text size that is comfortable to read.',0,'Pumili ng laki ng teksto na komportableng basahin.'],
['Small',0,'Maliit'],['Normal',0,'Katamtaman'],['Large',0,'Malaki'],['Extra large',0,'Napakalaki'],
['Notice: Medical Mission tomorrow, 9:00 AM at the Barangay Hall.',0,'Abiso: Medical Mission bukas, 9:00 AM sa Barangay Hall.'],
['Privacy & Safety',0,'Privacy at Kaligtasan'],['Change password',0,'Palitan ang password'],['Current password',0,'Kasalukuyang password'],
['New password (at least 8 characters)',0,'Bagong password (hindi bababa sa 8 karakter)'],['Confirm new password',0,'Kumpirmahin ang bagong password'],['Update password',0,'I-update ang password'],
['Hide phone numbers',0,'Itago ang mga numero ng telepono'],['Show only the first and last digits in tables.',0,'Ipakita lamang ang una at huling digit sa mga talahanayan.'],
['Auto log out when idle',0,'Awtomatikong mag-logout kapag walang aktibidad'],['Off',0,'Naka-off'],['5 minutes',0,'5 minuto'],['15 minutes',0,'15 minuto'],['30 minutes',0,'30 minuto'],
['Log out on all devices',0,'Mag-logout sa lahat ng device'],['Recent logins',0,'Mga kamakailang pag-login'],
['Passwords do not match.',0,'Hindi magkatugma ang mga password.'],['Password updated.',0,'Na-update ang password.'],['Account updated.',0,'Na-update ang account.'],
['Current password is incorrect.',0,'Mali ang kasalukuyang password.'],['Password must be at least 8 characters.',0,'Dapat hindi bababa sa 8 karakter ang password.'],
['Username is already taken.',0,'Gamit na ang username na ito.'],['Username and display name are required.',0,'Kailangan ang username at pangalan.'],
['Members',0,'Mga Miyembro'],['Household Information',0,'Impormasyon ng Sambahayan'],['Household Members',0,'Mga Miyembro ng Sambahayan'],['Household ID',0,'ID ng Sambahayan'],['Address',0,'Tirahan'],['Total members',0,'Kabuuang miyembro'],['Senior citizens',0,'Mga Senior Citizen'],['Back to households',0,'Bumalik sa mga sambahayan'],['Add Household',0,'Magdagdag ng Sambahayan'],['Edit Household',0,'I-edit ang Sambahayan'],['Fill in the household details and list its members.',0,'Punan ang detalye ng sambahayan at ilista ang mga miyembro.'],['Representative name *',0,'Pangalan ng kinatawan *'],['Phone number *',0,'Numero ng telepono *'],['Apelyido, Pangalan','Last name, First name',0],['Full name',0,'Buong pangalan'],['Relationship',0,'Relasyon'],['Age',0,'Edad'],['Sex',0,'Kasarian'],['Male',0,'Lalaki'],['Female',0,'Babae'],['Head',0,'Puno ng Pamilya'],['Spouse',0,'Asawa'],['Child',0,'Anak'],['Parent',0,'Magulang'],['Sibling',0,'Kapatid'],['Grandparent',0,'Lolo/Lola'],['Other',0,'Iba pa'],['+ Add member',0,'+ Magdagdag ng miyembro'],['Cancel',0,'Kanselahin'],['Save household',0,'I-save ang sambahayan'],['Wala pang miyembro.','No members yet.',0],['Senior',0,0],['Send SMS to this household',0,'Magpadala ng SMS sa sambahayang ito'],['SMS History',0,'Kasaysayan ng SMS'],['Click a household to see its members.',0,'I-click ang sambahayan para makita ang mga miyembro.'],['Household saved.',0,'Na-save ang sambahayan.'],['Kailangan ang pangalan at numero ng kinatawan.','Representative name and phone are required.',0],
].forEach(([s, e, t]) => D[s] = { en: e || s, tl: t || s });
const RULES = [ // [regex, English, Tagalog]
[/^(\d+) published$/, n => `${n} published`, n => `${n} na-publish`],
[/^(\d+)% delivered$/, n => `${n}% delivered`, n => `${n}% naihatid`],
[/^(\d+)% confidence$/, n => `${n}% confidence`, n => `${n}% kumpiyansa`],
[/^Compose SMS \((\d+) napili\)$/, n => `Compose SMS (${n} selected)`, n => `Sumulat ng SMS (${n} napili)`],
[/^Published! SMS sa (\d+) household, email sa (\d+)\.$/, (n, e) => `Published! SMS sent to ${n} households, email to ${e}.`, (n, e) => `Na-publish! SMS sa ${n} sambahayan, email sa ${e}.`],
[/^Naipadala sa (\d+) household\.$/, n => `Sent to ${n} households.`, n => `Naipadala sa ${n} sambahayan.`],
[/^Group \((.*)\):$/, g => `Group (${g}):`, g => `Grupo (${g}):`],
];
function tx(s) {
  if (typeof s !== 'string') return s;
  const k = s.trim(); if (!k) return s;
  if (D[k]) return s.replace(k, D[k][prefs.lang]);
  for (const [re, en, tl] of RULES) { const m = k.match(re); if (m) return s.replace(k, (prefs.lang === 'en' ? en : tl)(...m.slice(1))); }
  return s;
}
function applyLang(root) {
  if (root.nodeType === 3) { const v = tx(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
  if (root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const v = tx(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  root.querySelectorAll('[placeholder]').forEach(e => e.placeholder = tx(e.placeholder));
}
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(applyLang))).observe(document.body, { childList: true, subtree: true });
applyLang(document.body);
const _confirm = window.confirm.bind(window), _prompt = window.prompt.bind(window);
window.confirm = m => _confirm(tx(m)); window.prompt = (m, d) => _prompt(tx(m), d);

function setLang(l) { prefs.lang = l; savePrefs(); sessionStorage.setItem('pg', 'settings'); location.reload(); }
function setFs(i) { prefs.fs = i; savePrefs(); document.documentElement.style.fontSize = SIZES[i] + 'px'; go('settings'); }
const ph = p => { p = String(p ?? ''); return esc(prefs.mask && p.length > 8 ? p.slice(0, 4) + ' *** ' + p.slice(-4) : p); };
let idleT; function resetIdle() { clearTimeout(idleT); if (prefs.idle > 0 && token) idleT = setTimeout(logout, prefs.idle * 60000); }
['click', 'keydown', 'mousemove', 'touchstart'].forEach(e => document.addEventListener(e, resetIdle, { passive: true }));

async function api(url, method = 'GET', body) {
  const r = await fetch('/api' + url, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== '/login') { logout(); throw 0; }
  if (!r.ok) { toast(j.error || 'May error.'); throw 0; }
  if (method === 'GET' && Array.isArray(j) && pendingDel.size) { const m = url.match(/^\/(households|announcements)$/); if (m) return j.filter(x => !pendingDel.has('/' + m[1] + '/' + x._id)); }
  return j;
}

/* ---- auth ---- */
async function doLogin(e) {
  e.preventDefault();
  const u = $('#u'), p = $('#p'); $('#lerr').textContent = '';
  if (!check([[u, !!u.value.trim(), 'Ilagay ang username.'], [p, !!p.value, 'Ilagay ang password.']])) { const c = $('.lcard'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); return false; }
  try { const j = await api('/login', 'POST', { username: $('#u').value.trim(), password: $('#p').value }); token = j.token; sessionStorage.setItem('tk', token); enter(); }
  catch { $('#lerr').textContent = 'Maling username o password.'; [u, p].forEach(x => x.classList.add('invalid')); const c = $('.lcard'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }
  return false;
}
function enter() { $('#login').classList.add('hide'); $('#app').classList.remove('hide'); resetIdle(); api('/account').then(m => { $('#dn').textContent = m.displayName; $('.av').textContent = m.displayName[0].toUpperCase(); }); go(sessionStorage.getItem('pg') || 'dashboard'); }
function logout() { flushDeletes(); sessionStorage.removeItem('tk'); location.reload(); }

/* ---- nav ---- */
const PAGES = [['dashboard', 'Dashboard'], ['announcements', 'Announcements'], ['households', 'Households'], ['sms', 'SMS Notifications'], ['reports', 'Reports'], ['settings', 'Settings']];
async function go(p) {
  page = p; if (p !== 'announcements') filter = 'All';
  $('#nav').innerHTML = '<div class="brand"><img class="blogo" src="logo.png" alt="Seal of Barangay Cambalo"><div class="bname">ABISO<small>Barangay Cambalo</small></div></div>' + PAGES.map(x => `<a class="${x[0] === ({ create: 'announcements', household: 'households', hhform: 'households' }[p] || p) ? 'on' : ''}" onclick="go('${x[0]}')">${x[1]}</a>`).join('') + '<div class="side-foot">2026 ABISO System</div>';
  $('#view').innerHTML = await V[p](); if (PAGES.some(x => x[0] === p)) sessionStorage.setItem('pg', p); if (p === 'create') liveAI(); window.scrollTo(0, 0); polish(); applyTheme();
}
function polish() { // count-up ng mga numero sa dashboard/reports
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('#view .stat .n').forEach(n => {
    const end = parseInt(n.textContent, 10); if (!isFinite(end) || String(end) !== n.textContent.trim() || end < 2) return;
    const t0 = performance.now(), dur = 700;
    (function step(t) { const k = Math.min(1, (t - t0) / dur); n.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); })(t0);
  });
}
const head = (t, s, b = '') => `<div class="top"><div><h1>${t}</h1><p class="lead">${s}</p></div>${b}</div>`;
const dotf = c => `<span class="dot ${c}">${c.slice(0, 3).toUpperCase()}</span>`;
const rate = s => s.sent ? Math.round(s.delivered / s.sent * 100) : 0;

/* ---- views ---- */
const V = {
  async dashboard() {
    const [A, H, S] = await Promise.all([api('/announcements'), api('/households'), api('/sms/stats')]);
    const up = A.filter(a => a.status === 'Published' && new Date(a.eventDate) >= new Date(new Date().toDateString())).sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate)).slice(0, 3);
    return head('Dashboard', 'Overview of barangay information and system activity.') + `
    <div class="grid g4">
      <div class="card stat"><div class="l">Total Households</div><div class="n">${H.length}</div></div>
      <div class="card stat"><div class="l">Announcements</div><div class="n">${A.length}</div><div class="up">${A.filter(a => a.status === 'Published').length} published</div></div>
      <div class="card stat"><div class="l">SMS Sent</div><div class="n">${S.sent}</div><div class="up">${rate(S)}% delivered</div></div>
    </div><br>
    <div class="grid g2">
      <div class="card"><h3>Recent Announcements</h3>${A.slice(0, 4).map(a => `<div class="row">${dotf(a.category)}<div class="grow"><b>${esc(a.title)}</b><br><small>${fmt(a.eventDate)} · ${a.category}</small></div><span class="tag t-${a.status}">${a.status}</span></div>`).join('') || '<small>Wala pang announcement.</small>'}</div>
      <div class="card"><h3>Notification Delivery Summary</h3><div class="flex"><div class="donut" style="--p:${rate(S)}"><b>${rate(S)}%<small>Delivered</small></b></div>
        <div class="leg"><div>Delivered: <b>${S.delivered}</b></div><div>Sent: <b>${S.sent}</b></div><div>Failed: <b>${S.failed}</b></div></div></div>
        <h3 style="margin-top:18px">Upcoming Events</h3>${up.map(a => `<div class="row">${dotf(a.category)}<div class="grow"><b>${esc(a.title)}</b><br><small>${fmt(a.eventDate)} · ${esc(a.location)}</small></div></div>`).join('') || '<small>Wala pang paparating na event.</small>'}</div>
    </div>`;
  },

  async announcements() {
    cache = await api('/announcements');
    const l = cache.filter(a => filter === 'All' || a.category === filter);
    return head('Announcements', 'Create, manage and track all barangay announcements.', '<button class="btn" onclick="go(\'create\')">+ Create Announcement</button>') + `
    <div class="bar">${['All', 'PSA', 'Ayuda', 'Health', 'Events', 'Others'].map(c => `<button class="pill ${filter === c ? 'on' : ''}" onclick="filter='${c}';go('announcements')">${c}</button>`).join('')}</div>
    <div class="card scroll"><table><tr><th>Title</th><th>Category</th><th>Date</th><th>Target</th><th>Status</th><th>Actions</th></tr>
    ${l.map(a => `<tr><td><b>${esc(a.title)}</b></td><td><span class="tag ${a.category}" style="color:#fff">${a.category}</span></td><td>${fmt(a.eventDate)}</td><td>${esc(a.target)}</td><td><span class="tag t-${a.status}">${a.status}</span></td>
    <td>${a.status === 'Draft' ? `<button class="btn sm" onclick="publish('${a._id}')">Publish</button> ` : ''}<button class="btn ghost sm" onclick="editAnn('${a._id}')">Edit</button> <button class="btn danger sm" onclick="delAnn('${a._id}')">Delete</button></td></tr>`).join('') || '<tr><td colspan=6>Walang announcement.</td></tr>'}</table></div>`;
  },

  async create() {
    const d = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10) + 'T09:00';
    return head('Create Announcement', 'Punan ang detalye at hayaang i-classify ng AI.') + `
    <div class="grid g2"><div class="card f"><h3>Announcement Details</h3>
      <label>Title <span class="rq">*</span></label><input id="t" oninput="liveAI()" placeholder="e.g. PSA Registration for National ID">
      <label>Message <span class="rq">*</span></label><textarea id="m" oninput="liveAI()" placeholder="I-type ang announcement dito..."></textarea>
      <label>Date &amp; Time <span class="rq">*</span></label><input id="dt" type="datetime-local" value="${d}">
      <label>Location</label><input id="lc" placeholder="e.g. Barangay Hall">
      <label>Target Audience / Household Group</label><select id="tg"><option value="All">All</option>${GROUPS.map(g => `<option value="${g}">${g}</option>`).join('')}</select>
      <div style="display:flex;gap:10px;margin-top:18px"><button class="btn ghost" onclick="saveAnn('Draft')">Save Draft</button><button class="btn" onclick="saveAnn('Published')">Publish &amp; Notify</button></div></div>
      <div class="ai"><h3>AI Classification</h3><div id="aiout"><small>Mag-type para makita ang suggestion.</small></div></div></div>`;
  },

  async households() {
    const H = await api('/households'); cache = H;
    const l = H.filter(h => (hg === 'All' || GS(h).includes(hg)) && (h.name + h.householdId + h.purok + ((h.head || {}).email || '')).toLowerCase().includes(hq.toLowerCase()));
    return head('Household &amp; SMS Management', 'Manage household profiles and send SMS notifications.', '<button class="btn" onclick="addHH()">+ Add Household</button>') + `
    <div class="bar"><input id="hs" placeholder="Search household ID, name, address..." value="${esc(hq)}" oninput="hq=this.value;search()"><select onchange="hg=this.value;go('households')"><option value="All">All</option>${GROUPS.map(g => `<option value="${g}" ${g === hg ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
    <p class="hint" style="margin:0 0 10px">Click a household to see its members.</p>
    <div class="card scroll"><table><tr><th></th><th>ID</th><th>Representative</th><th>Address</th><th>Phone</th><th>Email</th><th>Group</th><th>Members</th><th>Actions</th></tr>
    ${l.map(h => `<tr class="click" onclick="openHH('${h._id}')"><td onclick="event.stopPropagation()"><input type="checkbox" ${sel.has(h._id) ? 'checked' : ''} onchange="tog('${h._id}')"></td><td>${h.householdId}</td><td>${esc(h.name)}</td><td>${esc(h.purok)}</td><td>${ph(h.phone)}</td><td>${esc((h.head || {}).email) || '—'}</td><td>${GS(h).join(', ')}</td><td>${(h.members || []).length}</td>
    <td><button class="btn ghost sm" onclick="event.stopPropagation();editHH('${h._id}')">Edit</button> <button class="btn danger sm" onclick="event.stopPropagation();delHH('${h._id}')">Delete</button></td></tr>`).join('') || '<tr><td colspan=9>Walang household.</td></tr>'}</table></div><br>
    <div class="card f"><h3>Compose SMS (${sel.size} napili)</h3><textarea id="smsT" placeholder="Good day! This is a reminder for the upcoming Medical Mission..."></textarea><button class="btn" style="margin-top:12px" onclick="smsSel()">Send SMS</button></div>`;
  },

  async sms() {
    const L = await api('/sms');
    return head('SMS Notifications Status', 'Kasaysayan ng lahat ng ipinadalang SMS.') + `<div class="card scroll"><table><tr><th>Oras</th><th>Household</th><th>Phone</th><th>Mensahe</th><th>Status</th></tr>
    ${L.map(s => `<tr><td>${new Date(s.createdAt).toLocaleString('en-PH')}</td><td>${esc(s.name)}</td><td>${ph(s.phone)}</td><td>${esc((s.text || '').slice(0, 70))}</td><td><span class="tag t-${s.status}">${s.status}</span></td></tr>`).join('') || '<tr><td colspan=5>Wala pang SMS.</td></tr>'}</table>
    <p class="lead" style="margin-top:10px">Demo (simulated) ang pagpapadala hangga’t walang SMS_GATEWAY_URL sa .env.</p></div>`;
  },

  async reports() {
    const [A, S, L] = await Promise.all([api('/announcements'), api('/sms/stats'), api('/sms')]);
    const col = { PSA: '#2f6fed', Ayuda: '#e5484d', Health: '#1fa35b', Events: '#8e4ec6', Emergency: '#f5761a', Others: '#8794ab' };
    const c = {}; CATS.forEach(k => c[k] = A.filter(a => a.category === k).length);
    let acc = 0; const tot = A.length || 1;
    const stops = CATS.filter(k => c[k]).map(k => { const s = acc; acc += c[k] / tot * 100; return `${col[k]} ${s}% ${acc}%`; }).join(',') || '#e8edf6 0 100%';
    const g = {}; L.forEach(s => g[s.group] = (g[s.group] || 0) + 1);
    const gl = Object.entries(g).sort((a, b) => b[1] - a[1]), gm = gl[0] ? gl[0][1] : 1;
    return head('System Analytics &amp; Delivery Reports', 'Subaybayan ang performance ng system at abot sa komunidad.') + `
    <div class="grid g4"><div class="card stat"><div class="l">Announcements Published</div><div class="n">${A.filter(a => a.status === 'Published').length}</div></div><div class="card stat"><div class="l">SMS Delivered</div><div class="n">${S.delivered}</div></div><div class="card stat"><div class="l">Households Reached</div><div class="n">${new Set(L.filter(s => s.status !== 'Failed').map(s => s.householdId)).size}</div></div></div><br>
    <div class="grid g2"><div class="card"><h3>Announcements by Category</h3><div class="flex"><div class="donut" style="background:conic-gradient(${stops})"><b>${A.length}<small>Total</small></b></div><div class="leg">${CATS.map(k => `<div><i style="background:${col[k]}"></i>${k}: <b>${c[k]}</b></div>`).join('')}</div></div></div>
    <div class="card"><h3>Most Targeted Household Groups</h3>${gl.map(([n, v]) => `<div class="row"><div style="width:120px">${n}</div><div class="meter"><span style="width:${v / gm * 100}%"></span></div><b>${v}</b></div>`).join('') || '<small>Wala pang datos.</small>'}</div>
    <div class="card"><h3>Delivery Success Rate</h3><div class="flex"><div class="donut" style="--p:${rate(S)}"><b>${rate(S)}%</b></div><div class="leg"><div>Delivered: <b>${S.delivered}</b></div><div>Failed: <b>${S.failed}</b></div></div></div></div></div>`;
  }
};


/* ---- settings ---- */
V.settings = async function () {
  const [me, sc, ec] = await Promise.all([api('/account'), api('/sms/config'), api('/email/config')]);
  return head('Settings', 'Manage your account, language and display.') + `
  <div class="grid g2">
    <div class="card f"><h3>Account Settings</h3>
      <label>Display name</label><input id="an" value="${esc(me.displayName)}">
      <label>Username</label><input id="au" value="${esc(me.username)}">
      <button class="btn" style="margin-top:14px" onclick="saveAcc()">Save changes</button></div>
    <div class="card"><h3>Language</h3><p class="hint">Choose the language of the system.</p>
      <div class="opts"><button class="pill ${prefs.lang === 'tl' ? 'on' : ''}" onclick="setLang('tl')">Tagalog</button><button class="pill ${prefs.lang === 'en' ? 'on' : ''}" onclick="setLang('en')">English</button></div>
      <h3 style="margin-top:22px">Font size</h3><p class="hint">Choose a text size that is comfortable to read.</p>
      <div class="opts">${['Small', 'Normal', 'Large', 'Extra large'].map((n, i) => `<button class="pill ${prefs.fs === i ? 'on' : ''}" onclick="setFs(${i})">${n}</button>`).join('')}</div>
      
    <div class="card f"><h3>SMS Gateway (Android phone)</h3>
      <p class="hint">${sc.live ? '🟢 Real SMS: naka-on' : '⚪ Demo mode: simulated lang ang SMS'}</p>
      <div class="sw" style="border-top:0;margin-top:0"><div><b>Send real SMS</b><div class="hint">I-on kapag naka-open na ang SMS Gateway app sa phone.</div></div><input type="checkbox" id="sg_on" ${sc.enabled ? 'checked' : ''}></div>
      <div class="grid g2"><div><label>Phone IP address</label><input id="sg_ip" value="${esc(sc.ip)}" placeholder="192.168.43.1"></div><div><label>Port</label><input id="sg_port" type="number" value="${esc(sc.port)}"></div>
      <div><label>Username</label><input id="sg_user" value="${esc(sc.user)}" autocomplete="off"></div><div><label>Password</label><input id="sg_pass" type="password" placeholder="${sc.hasPass ? '•••••• (naka-save na)' : ''}" autocomplete="new-password"></div></div>
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap"><button class="btn" onclick="saveSms()">Save SMS settings</button></div>
      <label style="margin-top:18px">Test number</label><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="sg_test" type="tel" placeholder="09369477059" style="flex:1;min-width:10rem"><button class="btn ghost" onclick="testSms()">Send test SMS</button></div>
      <p class="hint" style="margin-top:10px">Makikita ang IP, username at password sa Home tab ng SMS Gateway for Android app (Local Server).</p></div>
    <div class="card f"><h3>Email Notification (Gmail)</h3>
      <p class="hint">${ec.enabled ? '🟢 Email: naka-on' : '⚪ Email: naka-off'}</p>
      <div class="sw" style="border-top:0;margin-top:0"><div><b>Send email notifications</b><div class="hint">Kasabay ng SMS tuwing may announcement.</div></div><input type="checkbox" id="em_on" ${ec.enabled ? 'checked' : ''}></div>
      <div class="grid g2"><div><label>Gmail address ng barangay</label><input id="em_user" type="email" value="${esc(ec.user)}" placeholder="barangaycambalo@gmail.com" autocomplete="off"></div><div><label>Gmail App Password</label><input id="em_pass" type="password" placeholder="${ec.hasPass ? '•••••• (naka-save na)' : '16-letter app password'}" autocomplete="new-password"></div></div>
      <button class="btn" style="margin-top:14px" onclick="saveEmail()">Save email settings</button>
      <label style="margin-top:18px">Test email</label><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="em_test" type="email" placeholder="email@gmail.com" style="flex:1;min-width:10rem"><button class="btn ghost" onclick="testEmail()">Send test email</button></div>
      <p class="hint" style="margin-top:10px">Hindi ang normal na password ang ilalagay. Sa Google Account: i-on ang 2-Step Verification, tapos gumawa ng “App Password”. Mga 500 email kada araw ang limit ng libreng Gmail.</p></div>
    <div class="card f"><h3>Privacy &amp; Safety</h3>
      <label>Change password</label>
      <input id="pc" type="password" placeholder="Current password" autocomplete="current-password">
      <input id="pn" type="password" placeholder="New password (at least 8 characters)" autocomplete="new-password" style="margin-top:8px">
      <input id="pn2" type="password" placeholder="Confirm new password" autocomplete="new-password" style="margin-top:8px">
      <button class="btn" style="margin-top:12px" onclick="changePw()">Update password</button>
      <div class="sw"><div><b>Hide phone numbers</b><div class="hint">Show only the first and last digits in tables.</div></div><input type="checkbox" ${prefs.mask ? 'checked' : ''} onchange="prefs.mask=this.checked;savePrefs();toast('Saved.')"></div>
      <div class="sw"><div><b>Auto log out when idle</b></div><select onchange="prefs.idle=+this.value;savePrefs();resetIdle();toast('Saved.')">${[[0, 'Off'], [5, '5 minutes'], [15, '15 minutes'], [30, '30 minutes']].map(([v, n]) => `<option value="${v}" ${prefs.idle === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="sw"><div><b>Log out on all devices</b></div><button class="btn ghost sm" onclick="logoutAll()">Log out</button></div></div>
    <div class="card"><h3>Recent logins</h3>${me.logins.map(l => `<div class="row"><div class="grow">${new Date(l.at).toLocaleString('en-PH')}<br><small>${esc(l.ip || '')} · ${esc((l.ua || '').slice(0, 40))}</small></div></div>`).join('')}</div>
  </div>`;
};
async function saveAcc() {
  if (!check([[$('#an'), !!$('#an').value.trim(), 'Ilagay ang display name.'], [$('#au'), $('#au').value.trim().length >= 3, 'Ilagay ang username (kahit 3 letra).']])) return;
  const m = await api('/account', 'PUT', { displayName: $('#an').value, username: $('#au').value });
  $('#dn').textContent = m.displayName; $('.av').textContent = m.displayName[0].toUpperCase(); toast('Account updated.');
}
async function changePw() {
  if (!check([[$('#pc'), !!$('#pc').value, 'Ilagay ang kasalukuyang password.'], [$('#pn'), $('#pn').value.length >= 8, 'Hindi bababa sa 8 karakter.'], [$('#pn2'), !!$('#pn2').value && $('#pn2').value === $('#pn').value, 'Hindi magkatugma ang mga password.']])) return;
  if ($('#pn').value !== $('#pn2').value) return toast('Passwords do not match.');
  if (!(await askConfirm({ title: 'Change password', message: 'Are you sure you want to change your password?', confirmText: 'Update' }))) return;
  await api('/account/password', 'PUT', { current: $('#pc').value, next: $('#pn').value });
  ['#pc', '#pn', '#pn2'].forEach(i => $(i).value = ''); toast('Password updated.');
}
async function saveSms() {
  if ($('#sg_on').checked && !check([[$('#sg_ip'), /^[\w.\-]+$/.test($('#sg_ip').value.trim()), 'Ilagay ang IP ng phone (hal. 192.168.43.1).'], [$('#sg_port'), +$('#sg_port').value >= 1 && +$('#sg_port').value <= 65535, 'Maling port.']])) return;
  if (!(await askConfirm({ title: 'Save settings', message: 'Are you sure you want to save these settings?', confirmText: 'Save' }))) return;
  await api('/sms/config', 'PUT', { enabled: $('#sg_on').checked, ip: $('#sg_ip').value, port: $('#sg_port').value, user: $('#sg_user').value, pass: $('#sg_pass').value });
  toast('SMS settings saved.'); go('settings');
}
async function testSms() {
  if (!check([[$('#sg_test'), PHONE_RE.test($('#sg_test').value.replace(/\D/g, '')), 'Maling mobile number. Gamitin ang format na 09xx xxx xxxx.']])) return;
  toast('Nagpapadala ng test...');
  await api('/sms/test', 'POST', { phone: $('#sg_test').value }); toast('Naipadala ang test SMS. I-check ang phone.');
}
async function saveEmail() {
  if ($('#em_on').checked && !check([[$('#em_user'), EMAIL_RE.test($('#em_user').value.trim()), 'Ilagay ang tamang Gmail address.'], [$('#em_pass'), !!$('#em_pass').value || $('#em_pass').placeholder.startsWith('\u2022'), 'Ilagay ang Gmail App Password.']])) return;
  if (!(await askConfirm({ title: 'Save settings', message: 'Are you sure you want to save these settings?', confirmText: 'Save' }))) return;
  await api('/email/config', 'PUT', { enabled: $('#em_on').checked, user: $('#em_user').value, pass: $('#em_pass').value });
  toast('Email settings saved.'); go('settings');
}
async function testEmail() {
  if (!check([[$('#em_test'), EMAIL_RE.test($('#em_test').value.trim()), 'Maling email address.']])) return;
  toast('Nagpapadala ng test email...');
  await api('/email/test', 'POST', { email: $('#em_test').value }); toast('Naipadala ang test email. I-check ang inbox.');
}
async function logoutAll() { if (!(await askConfirm({ title: 'Log out', message: 'Are you sure you want to log out from all devices?', confirmText: 'Log out', danger: true }))) return; await api('/account/logout-all', 'POST'); logout(); }


/* ---- household detail + form ---- */
const REL = ['Head', 'Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other'], SEX = ['Male', 'Female'];
let curHH = null;
const isSenior = m => +m.age >= 60;
const memRow = m => `<div class="mrow"><input class="mn" placeholder="Full name" value="${esc(m.name)}"><select class="mr">${REL.map(r => `<option value="${r}" ${(m.relation || 'Child') === r ? 'selected' : ''}>${r}</option>`).join('')}</select><input class="ma" type="number" min="0" max="120" placeholder="Age" value="${esc(m.age)}"><select class="ms">${SEX.map(x => `<option value="${x}" ${m.sex === x ? 'selected' : ''}>${x}</option>`).join('')}</select><button type="button" class="btn danger sm" onclick="rmRow(this)" aria-label="Remove">✕</button></div>`;

/* ---- category-specific household forms ---- */
const P = s => { const [e, t] = s.split('|'); if (t) D[e] = { en: e, tl: t }; return e; };
const mk = (k, l, t, o) => [k, P(l), t, (o || []).map(P)];
const YN = ['No|Hindi', 'Yes|Oo'];
const EC = [mk('ec', 'Emergency contact name|Pangalan ng emergency contact', 'text'), mk('ecp', 'Emergency contact number|Numero ng emergency contact', 'tel')];
const CATS2 = {
  'Senior Citizens': { icon: '👵', tip: P('For households with a senior citizen (60 and above).|Para sa sambahayang may senior citizen (60 pataas).'), title: P('Senior Citizen Information|Impormasyon ng Senior Citizen'), f: [
    mk('sc_id', 'Senior Citizen ID no.', 'text'),
    mk('pension', 'Pension|Pensyon', 'sel', ['None|Wala', 'Social Pension', 'SSS', 'GSIS', 'Other']),
    mk('living', 'Living arrangement|Kalagayan sa tirahan', 'sel', ['With family|Kasama ang pamilya', 'Lives alone|Mag-isa', 'With caregiver|Kasama ang tagapag-alaga']),
    mk('mobility', 'Mobility|Paggalaw', 'sel', ['Walks independently|Nakakalakad nang mag-isa', 'Needs assistance|Kailangan ng tulong', 'Uses wheelchair|Gumagamit ng wheelchair', 'Bedridden|Nakaratay']),
    mk('med', 'Needs regular medical care|Kailangan ng regular na medikal na pangangalaga', 'sel', YN), ...EC] },
  'PWD': { icon: '♿', tip: P('For households with a person with disability.|Para sa sambahayang may person with disability.'), title: P('PWD Information|Impormasyon ng PWD'), f: [
    mk('pwd_id', 'PWD ID no.', 'text'),
    mk('disability', 'Type of disability|Uri ng kapansanan', 'sel', ['Visual|Paningin', 'Hearing|Pandinig', 'Physical / Orthopedic|Pisikal / Orthopedic', 'Speech|Pagsasalita', 'Intellectual|Intelektwal', 'Psychosocial', 'Chronic illness|Malalang karamdaman', 'Other']),
    mk('device', 'Needs assistive device|Kailangan ng assistive device', 'sel', YN), mk('caregiver', 'Caregiver name|Pangalan ng tagapag-alaga', 'text'),
    mk('benefits', 'Receives PWD benefits|Tumatanggap ng PWD benefits', 'sel', YN), ...EC] },
  'Low Income': { icon: '💰', tip: P('For households with low or irregular income.|Para sa sambahayang mababa o hindi tiyak ang kita.'), title: P('Low Income Household Information|Impormasyon ng Sambahayang Mababa ang Kita'), f: [
    mk('income', 'Monthly household income|Buwanang kita ng sambahayan', 'sel', ['Below ₱5,000|Mas mababa sa ₱5,000', '₱5,000 – ₱10,000', '₱10,001 – ₱15,000', 'Above ₱15,000|Higit sa ₱15,000']),
    mk('source', 'Main source of income|Pangunahing pinagkukunan ng kita', 'sel', ['Farming / Fishing|Pagsasaka / Pangingisda', 'Daily wage|Arawang sahod', 'Small business|Maliit na negosyo', 'Remittance|Padala', 'None|Wala']),
    mk('housing', 'Housing|Tirahan', 'sel', ['Owned|Pag-aari', 'Rented|Inuupahan', 'Informal settler', 'Living with relatives|Nakikitira']),
    mk('children', 'School-age children|Mga batang nag-aaral', 'number'),
    mk('assist', 'Existing assistance|Kasalukuyang ayuda', 'sel', ['None|Wala', '4Ps', 'Other aid|Iba pang ayuda'])] },
  '4Ps': { icon: '🧾', tip: P('For 4Ps beneficiary households.|Para sa mga sambahayang benepisyaryo ng 4Ps.'), title: P('4Ps Information|Impormasyon ng 4Ps'), f: [
    mk('fps_id', '4Ps household ID no.', 'text'), mk('grantee', 'Grantee name|Pangalan ng grantee', 'text'), mk('kids', 'Child beneficiaries|Bilang ng batang benepisyaryo', 'number'),
    mk('school', 'Children enrolled in school|Naka-enroll sa paaralan ang mga bata', 'sel', YN), mk('checkup', 'Health check-ups complied|Natupad ang health check-up', 'sel', YN),
    mk('payout', 'Payout channel|Paraan ng payout', 'sel', ['Cash card', 'GCash / E-wallet', 'Over-the-counter'])] },
  'Single Parents': { icon: '👨‍👧', tip: P('For households headed by a single or solo parent.|Para sa sambahayang pinamumunuan ng single o solo parent.'), title: P('Single Parent Information|Impormasyon ng Single Parent'), f: [
    mk('sp_id', 'Solo Parent ID no.', 'text'),
    mk('reason', 'Reason|Dahilan', 'sel', ['Widowed|Balo', 'Separated|Hiwalay', 'Abandoned|Iniwan', 'Unmarried|Hindi kasal', 'Spouse working abroad|Asawa ay nasa ibang bansa', 'Other']),
    mk('nchild', 'Number of children|Bilang ng anak', 'number'), mk('youngest', 'Youngest child age|Edad ng bunsong anak', 'number'),
    mk('work', 'Employment|Trabaho', 'sel', ['Employed|May trabaho', 'Self-employed', 'Unemployed|Walang trabaho']),
    mk('childcare', 'Needs childcare assistance|Kailangan ng tulong sa pag-aalaga ng bata', 'sel', YN)] },
  'General': { icon: '🏘️', tip: P('For other households.|Para sa iba pang sambahayan.'), title: '', f: [] }
};
const T_CAT = P('Household category|Kategorya ng sambahayan'), T_START = P('Choose a category to start.|Pumili ng kategorya para magsimula.');
D['Pumili ng kategorya.'] = { en: 'Please choose a category.', tl: 'Pumili ng kategorya.' };
let curCat = '', curExtra = {};
const fld = ([k, l, t, o], v) => `<div><label>${l} <span class="rq">*</span></label>${t === 'sel' ? `<select data-x="${k}"><option value="">—</option>${o.map(x => `<option value="${x}" ${v === x ? 'selected' : ''}>${x}</option>`).join('')}</select>` : `<input data-x="${k}" type="${t}" value="${esc(v)}" ${t === 'number' ? 'min="0"' : ''}>`}</div>`;
const GS = h => (h.groups && h.groups.length) ? h.groups : [h.group || 'General'];
const extraCard = h => GS(h).map(g => { const c = CATS2[g]; if (!c || !c.f.length) return ''; const x = h.extra || {}; if (!c.f.some(([k]) => x[k])) return '';
  return `<div class="card"><h3>${c.title}</h3>${c.f.map(([k, l]) => `<div class="row"><div style="flex:0 0 42%;color:var(--mut)">${l}</div><div class="grow"><b>${esc(x[k]) || '—'}</b></div></div>`).join('')}</div>`; }).join('');
const caseCard = ms => { const rows = ms.filter(m => (m.cases || []).length); if (!rows.length) return '';
  return `<div class="card"><h3>Special Cases</h3>${rows.map(m => `<div class="row"><div class="grow"><b>${esc(m.name)}</b> <small>${esc(m.relation)}</small><br>${casesTags(m)}<br><small>${Object.entries(m.extra || {}).filter(([k, v]) => v && FL[k]).map(([k, v]) => esc(FL[k].split('|')[0]) + ': ' + esc(v)).join(' · ')}</small></div></div>`).join('')}</div>`; };
V.household = async function () {
  const [list, L] = await Promise.all([api('/households'), api('/sms')]);
  const h = list.find(x => x._id === curHH); if (!h) { curHH = null; return V.households(); }
  const ms = h.members || [], mine = L.filter(s => s.householdId === h.householdId).slice(0, 5);
  const f = (l, v) => `<div class="row"><div style="width:11rem;color:var(--mut)">${l}</div><div class="grow"><b>${v}</b></div></div>`;
  return head(esc(h.name), esc(h.householdId), `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" onclick="go('households')">Back to households</button><button class="btn" onclick="editHH('${h._id}')">Edit</button><button class="btn danger" onclick="delHH('${h._id}')">Delete</button></div>`) + `
  <div class="grid g2">
    <div class="card"><h3>Household Information</h3>${f('Household ID', esc(h.householdId))}${f('Representative', esc(h.name))}${f('Address', esc(h.purok) || '—')}${f('Phone', ph(h.phone))}${h.head && h.head.email ? f('Email Address', esc(h.head.email)) : ''}${h.head && h.head.dob ? f('Date of Birth', esc(h.head.dob)) : ''}${h.head && h.head.civilStatus ? f('Civil Status', esc(h.head.civilStatus)) : ''}${f('Group', GS(h).join(', '))}${f('Total members', ms.length)}${f('Senior citizens', ms.filter(isSenior).length)}</div>
    ${extraCard(h)}${caseCard(ms)}<div class="card"><h3>Household Members</h3>${ms.length ? `<div class="scroll"><table><tr><th>Full name</th><th>Relationship</th><th>Age</th><th>Sex</th><th>Special Cases</th></tr>${ms.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.relation)}</td><td>${esc(m.age) || '—'}</td><td>${esc(m.sex)}</td><td>${casesTags(m)}</td></tr>`).join('')}</table></div>` : '<small>Wala pang miyembro.</small>'}</div>
    <div class="card f"><h3>Send SMS to this household</h3><textarea id="hsms" placeholder="Good day! This is a reminder for the upcoming Medical Mission..."></textarea><button class="btn" style="margin-top:12px" onclick="sendOne('${h._id}')">Send SMS</button></div>
    <div class="card"><h3>SMS History</h3>${mine.map(s => `<div class="row"><div class="grow">${esc((s.text || '').slice(0, 60))}<br><small>${new Date(s.createdAt).toLocaleString('en-PH')}</small></div><span class="tag t-${s.status}">${s.status}</span></div>`).join('') || '<small>Wala pang SMS.</small>'}</div>
  </div>`;
};
/* ---- Add / Edit household wizard (Household Head -> Household Members + cases -> Reviews) ---- */
const CIVIL = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'];
const STEPS = ['Household Head|Puno ng Sambahayan', 'Household Member|Mga Miyembro', 'Reviews|Rebyu'].map(P);
const WG = ['PWD', 'Senior Citizens', 'Low Income', '4Ps', 'Single Parents'];
const FL = {}; Object.values(CATS2).forEach(c => c.f.forEach(([k, l]) => FL[k] = l));
const ageOf = d => { if (!d) return ''; const b = new Date(d), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a >= 0 ? a : ''; };
let W = null;
function wizInit(h) {
  const ms = h.members || [], hi = ms.findIndex(m => m.relation === 'Head'), hm = hi >= 0 ? ms[hi] : {}, hd = h.head || {};
  const anyCases = ms.some(m => (m.cases || []).length);
  const legacy = h._id && !anyCases ? GS(h).filter(g => g !== 'General') : []; // lumang data: ilipat sa Head ang cases
  W = {
    step: 1,
    head: { name: hd.name || h.name || '', phone: h.phone || '', purok: h.purok || '', placeOfBirth: hd.placeOfBirth || '', sex: hd.sex || hm.sex || '', email: hd.email || '', dob: hd.dob || '', civilStatus: hd.civilStatus || '' },
    members: [{ relation: 'Head', cases: (hm.cases && hm.cases.length) ? [...hm.cases] : legacy, extra: { ...(hm.extra || {}), ...(anyCases ? {} : (h.extra || {})) } },
      ...ms.filter((m, i) => i !== hi).map(m => ({ ...m, cases: [...(m.cases || [])], extra: { ...(m.extra || {}) } }))]
  };
}
const hin = (id, l, v, ph, t = 'text', req = true) => `<div><label>${l} <span class="rq">*</span></label><input id="${id}" type="${t}" value="${esc(v)}" placeholder="${ph}"></div>`;
const hsel = (id, l, v, opts, ph, req = true) => `<div><label>${l} <span class="rq">*</span></label><select id="${id}"><option value="">${ph}</option>${opts.map(o => `<option value="${o}" ${v === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
const stepper = () => `<div class="steps">${STEPS.map((s, i) => `<div class="st ${W.step === i + 1 ? 'on' : ''} ${W.step > i + 1 ? 'done' : ''}"><b>${i + 1}</b><span>${s}</span></div>`).join('')}</div>`;
const T_NEXT = [P('Next: Add Members →|Susunod: Mga Miyembro →'), P('Next: Review →|Susunod: Rebyu →'), P('Save household')];
const T_PH = { name: P('Dela Cruz, James'), pob: P('Poblacion, Cajidiocan, Romblon'), mail: P('shinzenzora@gmail.com'), sex: P('Select gender|Piliin ang kasarian'), civ: P('Select civil status|Piliin ang civil status'), addr: P('Cambalo Cajidiocan,Romblon.Sitio Central') };
P('Household Head Information|Impormasyon ng Puno ng Sambahayan'); P('Full Name|Buong Pangalan'); P('Place of Birth|Lugar ng Kapanganakan'); P('Email Address|Email Address'); P('Date of Birth|Petsa ng Kapanganakan'); P('Civil Status|Civil Status'); P('Relationship to Head|Relasyon sa Puno'); P('Back|Bumalik'); P('Special Cases|Mga Espesyal na Kaso'); P('Address|Tirahan'); P('Member|Miyembro');
P('Add every family member and mark their special cases (if any).|Idagdag ang bawat miyembro at markahan ang kanilang espesyal na kaso (kung mayroon).'); P('Review the details, then save.|Suriin ang detalye, saka i-save.');

/* mga miyembro (index 0 = ang Household Head, galing sa Step 1) */
const caseFields = m => { const seen = new Set(); return (m.cases || []).filter(g => CATS2[g] && CATS2[g].f.length).map(g => `<div class="mx"><h3>${CATS2[g].title}</h3><div class="grid g2">${CATS2[g].f.filter(f => !seen.has(f[0]) && seen.add(f[0])).map(f => fld(f, (m.extra || {})[f[0]] || '')).join('')}</div></div>`).join(''); };
const memCard = (m, i) => {
  const hd = i === 0, h = W.head;
  const sel = (cls, opts, v) => `<select class="${cls}">${opts.map(o => `<option value="${o}" ${v === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  return `<div class="card f mc" data-i="${i}" style="margin-bottom:0.75rem">
    <div class="mhead"><b>${hd ? 'Household Head' : 'Member ' + i}</b>${hd ? '' : `<button type="button" class="btn danger sm" onclick="memDel(${i})" aria-label="Remove">✕</button>`}</div>
    <div class="mrow2">
      <div><label>Full Name <span class="rq">*</span></label><input class="mn" value="${esc(hd ? h.name : m.name)}" ${hd ? 'disabled' : ''} placeholder="Full name"></div>
      <div><label>Relationship to Head</label>${hd ? '<input class="mr" value="Head" disabled>' : sel('mr', REL.filter(r => r !== 'Head'), m.relation || 'Child')}</div>
      <div><label>Age <span class="rq">*</span></label><input class="ma" type="number" min="0" max="120" value="${esc(hd ? ageOf(h.dob) : m.age)}" ${hd ? 'disabled' : ''}></div>
      <div><label>Sex</label>${hd ? `<input class="ms" value="${esc(h.sex)}" disabled>` : sel('ms', SEX, m.sex || 'Male')}</div>
    </div>
    <label>Special Cases</label>
    <div class="chips">${WG.map(g => `<button type="button" class="pill ${(m.cases || []).includes(g) ? 'on' : ''}" onclick="memCase(${i},'${g}')">${CATS2[g].icon} ${g}</button>`).join('')}</div>
    ${caseFields(m)}</div>`;
};
function collectMembers() {
  document.querySelectorAll('#mems .mc').forEach(c => {
    const i = +c.dataset.i, m = W.members[i]; if (!m) return;
    if (i > 0) { m.name = c.querySelector('.mn').value.trim(); m.relation = c.querySelector('.mr').value; m.age = c.querySelector('.ma').value; m.sex = c.querySelector('.ms').value; }
    c.querySelectorAll('[data-x]').forEach(e => (m.extra = m.extra || {})[e.dataset.x] = e.value);
  });
}
const showMems = () => { $('#mems').innerHTML = W.members.map(memCard).join(''); };
function memCase(i, g) { collectMembers(); const m = W.members[i]; m.cases = m.cases.includes(g) ? m.cases.filter(x => x !== g) : [...m.cases, g]; showMems(); }
function memAdd() { collectMembers(); W.members.push({ relation: 'Child', sex: 'Male', cases: [], extra: {} }); showMems(); }
async function memDel(i) { if (!(await askConfirm({ title: 'Remove member', message: 'Are you sure you want to remove this member?', confirmText: 'Remove', danger: true }))) return; collectMembers(); W.members.splice(i, 1); showMems(); }
const casesTags = m => (m.cases || []).map(g => `<span class="tag t-Draft">${g}</span>`).join(' ') || '—';

function wizHTML() {
  const h = W.head, s = W.step;
  let body = '';
  if (s === 1) body = `<div class="card f"><h3>Household Head Information</h3><div class="grid g2">
      ${hin('hf_name', 'Full Name', h.name, T_PH.name)}
      ${hin('hf_pob', 'Place of Birth', h.placeOfBirth, T_PH.pob, 'text', false)}
      ${hsel('hf_sex', 'Sex', h.sex, SEX, T_PH.sex)}
      ${hin('hf_mail', 'Email Address/Sitio', h.email, T_PH.mail, 'email')}
      ${hin('hf_dob', 'Date of Birth', h.dob, '', 'date')}
      ${hsel('hf_civ', 'Civil Status', h.civilStatus, CIVIL, T_PH.civ, false)}
      ${hin('hf_phone', 'Phone number', h.phone, '09369477059 ', 'tel')}
      ${hin('hf_addr', 'Address', h.purok, T_PH.addr, 'text', false)}</div></div>`;
  else if (s === 2) body = `<p class="hint" style="margin-bottom:10px">Add every family member and mark their special cases (if any).</p><div id="mems">${W.members.map(memCard).join('')}</div>
      <button type="button" class="btn ghost sm" onclick="memAdd()">+ Add member</button>`;
  else {
    const ms = W.members.map((m, i) => i === 0 ? { ...m, name: h.name, relation: 'Head', age: ageOf(h.dob), sex: h.sex } : m).filter(m => m.name);
    const r = (l, v) => `<span>${l}</span><b>${esc(v) || '—'}</b>`;
    body = `<p class="hint" style="margin-bottom:10px">Review the details, then save.</p><div class="grid g2">
      <div class="card"><h3>Household Head Information</h3><div class="rv">${r('Full Name', h.name)}${r('Sex', h.sex)}${r('Date of Birth', h.dob)}${r('Place of Birth', h.placeOfBirth)}${r('Civil Status', h.civilStatus)}${r('Email Address', h.email)}${r('Phone number', h.phone)}${r('Address', h.purok)}</div></div>
      <div class="card"><h3>Household Members</h3><div class="scroll"><table><tr><th>Full name</th><th>Relationship</th><th>Age</th><th>Sex</th><th>Special Cases</th></tr>${ms.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.relation)}</td><td>${esc(m.age) || '—'}</td><td>${esc(m.sex)}</td><td>${casesTags(m)}</td></tr>`).join('')}</table></div></div></div>`;
  }
  return stepper() + body + `<div class="wnav"><button type="button" class="btn ghost" onclick="wizBack()">← Back</button><button type="button" class="btn" onclick="${s === 3 ? 'saveHH()' : 'wizNext()'}">${T_NEXT[s - 1]}</button></div>`;
}
function wizCollect() {
  const s = W.step, v = i => { const e = $('#' + i); return e ? e.value.trim() : ''; };
  if (s === 1) Object.assign(W.head, { name: v('hf_name'), placeOfBirth: v('hf_pob'), sex: v('hf_sex'), email: v('hf_mail'), dob: v('hf_dob'), civilStatus: v('hf_civ'), phone: v('hf_phone'), purok: v('hf_addr') });
  else if (s === 2) collectMembers();
}
const wizShow = () => { $('#wiz').innerHTML = wizHTML(); window.scrollTo(0, 0); };
function wizNext() {
  if (W.step === 1) {
    const g = i => $('#' + i), v = i => g(i).value.trim(), today = new Date().toISOString().slice(0, 10), dg = v('hf_phone').replace(/\D/g, '');
    if (!check([
      [g('hf_name'), v('hf_name').length >= 2, 'Ilagay ang buong pangalan.'],
      [g('hf_pob'), !!v('hf_pob'), 'Ilagay ang lugar ng kapanganakan.'],
      [g('hf_sex'), !!v('hf_sex'), 'Piliin ang kasarian.'],
      [g('hf_mail'), EMAIL_RE.test(v('hf_mail')), v('hf_mail') ? 'Maling email address.' : 'Ilagay ang email address.'],
      [g('hf_dob'), !!v('hf_dob') && v('hf_dob') <= today, v('hf_dob') ? 'Hindi puwedeng petsa sa hinaharap.' : 'Ilagay ang petsa ng kapanganakan.'],
      [g('hf_civ'), !!v('hf_civ'), 'Piliin ang civil status.'],
      [g('hf_phone'), PHONE_RE.test(dg), dg ? 'Maling mobile number. Gamitin ang format na 09369477059.' : 'Ilagay ang mobile number.'],
      [g('hf_addr'), !!v('hf_addr'), 'Ilagay ang tirahan.']
    ])) return;
  } else if (W.step === 2 && !checkMembers()) return;
  wizCollect(); W.step++; wizShow();
}
function checkMembers() {
  const rules = [];
  document.querySelectorAll('#mems .mc').forEach(c => {
    if (+c.dataset.i > 0) { const n = c.querySelector('.mn'), a = c.querySelector('.ma');
      rules.push([n, n.value.trim().length >= 2, 'Ilagay ang pangalan ng miyembro.']);
      rules.push([a, a.value !== '' && +a.value >= 0 && +a.value <= 120, 'Ilagay ang tamang edad (0-120).']); }
    c.querySelectorAll('[data-x]').forEach(e => rules.push([e, e.value.trim() !== '', e.tagName === 'SELECT' ? 'Pumili ng sagot.' : 'Punan ang field na ito.']));
  });
  return check(rules);
}
function wizBack() { if (W.step === 1) return curHH ? openHH(curHH) : go('households'); wizCollect(); W.step--; wizShow(); }
D['Kailangan ang pangalan, email, numero at kasarian ng kinatawan.'] = { en: 'Head name, email, phone and sex are required.', tl: 'Kailangan ang pangalan, email, numero at kasarian ng kinatawan.' };
D['Maling mobile number. Gamitin ang format na 09369477059.'] = { en: 'Invalid mobile number. Use the format 09xx xxx xxxx.', tl: 'Maling mobile number. Gamitin ang format na 09369477059.' };
[['Ilagay ang username.', 'Enter your username.'], ['Ilagay ang password.', 'Enter your password.'], ['Punan o ayusin ang mga pulang field.', 'Please fill in or fix the red fields.'],
  ['Ilagay ang buong pangalan.', 'Enter the full name.'], ['Ilagay ang lugar ng kapanganakan.', 'Enter the place of birth.'], ['Piliin ang kasarian.', 'Select the sex.'],
  ['Ilagay ang email address.', 'Enter the email address.'], ['Ilagay ang petsa ng kapanganakan.', 'Enter the date of birth.'], ['Hindi puwedeng petsa sa hinaharap.', 'Date cannot be in the future.'],
  ['Piliin ang civil status.', 'Select the civil status.'], ['Ilagay ang mobile number.', 'Enter the mobile number.'], ['Ilagay ang tirahan.', 'Enter the address.'],
  ['Ilagay ang pangalan ng miyembro.', "Enter the member's name."], ['Ilagay ang tamang edad (0-120).', 'Enter a valid age (0-120).'], ['Pumili ng sagot.', 'Select an answer.'], ['Punan ang field na ito.', 'Fill in this field.'],
  ['Ilagay ang title (kahit 3 letra).', 'Enter a title (at least 3 characters).'], ['Isulat ang mensahe (kahit 10 letra).', 'Write the message (at least 10 characters).'], ['Piliin ang petsa at oras.', 'Select the date and time.'],
  ['Ilagay ang display name.', 'Enter the display name.'], ['Ilagay ang username (kahit 3 letra).', 'Enter a username (at least 3 characters).'], ['Ilagay ang kasalukuyang password.', 'Enter your current password.'],
  ['Hindi bababa sa 8 karakter.', 'At least 8 characters.'], ['Hindi magkatugma ang mga password.', 'Passwords do not match.'], ['Ilagay ang IP ng phone (hal. 192.168.43.1).', 'Enter the phone IP (e.g. 192.168.43.1).'], ['Maling port.', 'Invalid port.'],
  ['Ilagay ang tamang Gmail address.', 'Enter a valid Gmail address.'], ['Ilagay ang Gmail App Password.', 'Enter the Gmail App Password.'], ['Isulat muna ang mensahe.', 'Write a message first.']]
  .forEach(([tl, en]) => D[tl] = { en, tl });
D['Punan o ayusin ang mga pulang field.'] = { en: 'Please fill in or fix the red fields.', tl: 'Punan o ayusin ang mga pulang field.' };
D['Maling email address.'] = { en: 'Invalid email address.', tl: 'Maling email address.' };

V.hhform = async function () {
  let h = {}; if (curHH) h = (await api('/households')).find(x => x._id === curHH) || {};
  wizInit(h);
  return head(curHH ? 'Edit Household' : 'Add Household', 'Enter the household head and basic information.') + `<div id="wiz">${wizHTML()}</div>`;
};
D['Enter the household head and basic information.'] = { en: 'Enter the household head and basic information.', tl: 'Ilagay ang puno ng sambahayan at pangunahing impormasyon.' };
function openHH(id) { curHH = id; go('household'); }
function goForm(id) { curHH = id || null; go('hhform'); }
function addHH() { goForm(); }
function editHH(id) { goForm(id); }
async function saveHH() {
  wizCollect(); const hd = W.head;
  if (!hd.name || !hd.phone || !hd.email || !PHONE_RE.test(String(hd.phone).replace(/\D/g, '')) || !EMAIL_RE.test(hd.email)) { W.step = 1; wizShow(); return toast('Kailangan ang pangalan, email, numero at kasarian ng kinatawan.'); }
  if (!(await askConfirm({ title: 'Save household', message: 'Are you sure you want to save this household?', confirmText: 'Save' }))) return;
  const members = W.members.map((m, i) => {
    const keys = new Set(); (m.cases || []).forEach(g => CATS2[g].f.forEach(f => keys.add(f[0])));
    const extra = {}; keys.forEach(k => { if (m.extra && m.extra[k]) extra[k] = m.extra[k]; });
    return i === 0 ? { name: hd.name, relation: 'Head', age: ageOf(hd.dob), sex: hd.sex, cases: m.cases || [], extra }
      : { name: m.name, relation: m.relation, age: m.age, sex: m.sex, cases: m.cases || [], extra };
  }).filter(m => m.name);
  const groups = [...new Set(members.flatMap(m => m.cases))];
  const body = { name: hd.name, phone: hd.phone, purok: hd.purok, group: groups[0] || 'General', groups, head: hd, extra: {}, members };
  const h = curHH ? await api('/households/' + curHH, 'PUT', body) : await api('/households', 'POST', body);
  toast('Household saved.'); curHH = h._id; go('household');
}
async function sendOne(id) {
  const text = $('#hsms').value.trim(); if (!check([[$('#hsms'), !!text, 'Isulat muna ang mensahe.']])) return;
  if (!(await askConfirm({ title: 'Send SMS', message: 'Send this SMS to this household?', confirmText: 'Send' }))) return;
  const r = await api('/sms/send', 'POST', { ids: [id], text }); toast(`Naipadala sa ${r.sent} household.`); go('household');
}

/* ---- announcements ---- */
let aiT;
function liveAI() {
  clearTimeout(aiT);
  aiT = setTimeout(async () => {
    const title = $('#t').value, message = $('#m').value, o = $('#aiout');
    if (!(title + message).trim()) { o.innerHTML = '<small>Mag-type para makita ang suggestion.</small>'; return; }
    const r = await api('/announcements/classify', 'POST', { title, message });
    o.innerHTML = `<div class="sug">${dotf(r.category)}<div><b>${r.category}</b><br><small>${r.confidence ? r.confidence + '% confidence' : 'Walang tugmang keyword'}</small></div></div>`;
  }, 250);
}
async function saveAnn(status) {
  const title = $('#t').value.trim(), message = $('#m').value.trim();
  if (!check([[$('#t'), title.length >= 3, 'Ilagay ang title (kahit 3 letra).'], [$('#m'), message.length >= 10, 'Isulat ang mensahe (kahit 10 letra).'], [$('#dt'), !!$('#dt').value, 'Piliin ang petsa at oras.']])) return;
  if (status === 'Published' && !(await askConfirm(PUB_MSG))) return;
  const r = await api('/announcements', 'POST', { title, message, status, eventDate: $('#dt').value, location: $('#lc').value, target: $('#tg').value });
  toast(status === 'Published' ? `Published! SMS sa ${r.sms} household, email sa ${r.email}.` : 'Na-save ang draft.'); go('announcements');
}
async function publish(id) { if (!(await askConfirm(PUB_MSG))) return; const r = await api(`/announcements/${id}/publish`, 'POST'); toast(`Published! SMS sa ${r.sms} household, email sa ${r.email}.`); go('announcements'); }

/* ---- households ---- */
function tog(id) { sel.has(id) ? sel.delete(id) : sel.add(id); go('households'); }
let st; function search() { clearTimeout(st); st = setTimeout(async () => { await go('households'); const e = $('#hs'); e.focus(); e.setSelectionRange(99, 99); }, 300); }
async function smsSel() {
  const text = $('#smsT').value.trim();
  if (!sel.size) return toast('Pumili muna ng households.'); if (!check([[$('#smsT'), !!text, 'Isulat muna ang mensahe.']])) return;
  if (!(await askConfirm({ title: 'Send SMS', message: `Send this SMS to ${sel.size} household(s)?`, confirmText: 'Send' }))) return;
  const r = await api('/sms/send', 'POST', { ids: [...sel], text }); sel.clear(); toast(`Naipadala sa ${r.sent} household.`); go('households');
}

/* =====================================================================
   Confirmation dialogs, centered toast (may Undo), password eye toggle
   ===================================================================== */
const T = (s, tl) => { if (!D[s]) D[s] = { en: s, tl }; };
[
  ['Please confirm', 'Pakikumpirma'], ['Confirm', 'Kumpirmahin'], ['Cancel', 'Kanselahin'], ['Undo', 'I-undo'], ['Restored.', 'Naibalik.'],
  ['Delete household', 'Burahin ang sambahayan'], ['Are you sure you want to delete this household?', 'Sigurado ka bang gusto mong burahin ang sambahayan na ito?'],
  ['Delete announcement', 'Burahin ang anunsyo'], ['Are you sure you want to delete this announcement?', 'Sigurado ka bang gusto mong burahin ang anunsyo na ito?'],
  ['Household deleted.', 'Nabura ang sambahayan.'], ['Announcement deleted.', 'Nabura ang anunsyo.'],
  ['Remove member', 'Alisin ang miyembro'], ['Are you sure you want to remove this member?', 'Sigurado ka bang gusto mong alisin ang miyembrong ito?'], ['Remove', 'Alisin'],
  ['Log out', 'Mag-log out'], ['Are you sure you want to log out?', 'Sigurado ka bang gusto mong mag-log out?'],
  ['Are you sure you want to log out from all devices?', 'Sigurado ka bang gusto mong i-log out ang lahat ng device?'],
  ['Publish announcement', 'I-publish ang anunsyo'], ['This will send SMS and email notifications to the targeted households. Continue?', 'Magpapadala ito ng SMS at email sa mga target na sambahayan. Magpatuloy?'], ['Publish', 'I-publish'],
  ['Save household', 'I-save ang sambahayan'], ['Are you sure you want to save this household?', 'Sigurado ka bang gusto mong i-save ang sambahayan na ito?'], ['Save', 'I-save'],
  ['Change password', 'Palitan ang password'], ['Are you sure you want to change your password?', 'Sigurado ka bang gusto mong palitan ang password mo?'], ['Update', 'I-update'],
  ['Save settings', 'I-save ang settings'], ['Are you sure you want to save these settings?', 'Sigurado ka bang gusto mong i-save ang mga setting na ito?'],
  ['Send SMS', 'Magpadala ng SMS'], ['Send', 'Ipadala'], ['Send this SMS to this household?', 'Ipadala ang SMS na ito sa sambahayang ito?'],
  ['Edit announcement', 'I-edit ang anunsyo'], ['Save changes', 'I-save ang mga pagbabago'], ['Show password', 'Ipakita ang password'], ['Hide password', 'Itago ang password']
].forEach(([s, tl]) => T(s, tl));
RULES.push([/^Send this SMS to (\d+) household\(s\)\?$/, n => `Send this SMS to ${n} household(s)?`, n => `Ipadala ang SMS na ito sa ${n} sambahayan?`]);

/* ---- toast: nasa GITNA ng screen, may optional Undo ---- */
function toast(m, opt = {}) {
  const t = $('#toast'); clearTimeout(toast.h);
  t.innerHTML = ''; t.className = '';
  const s = document.createElement('span'); s.textContent = m; t.appendChild(s);
  if (opt.undo) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'toast-undo'; b.textContent = 'Undo';
    b.onclick = () => { clearTimeout(toast.h); t.classList.add('hide'); opt.undo(); };
    t.appendChild(b);
  }
  toast.h = setTimeout(() => t.classList.add('hide'), opt.undo ? 6000 : 2600);
}

/* ---- modal (nasa gitna). collect(ov) -> value para magsara, undefined para manatiling bukas ---- */
function modal(inner, collect, focusSel) {
  return new Promise(resolve => {
    const ov = document.createElement('div'); ov.className = 'modal-ov';
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${inner}</div>`;
    const prev = document.activeElement;
    const done = v => { document.removeEventListener('keydown', key, true); ov.remove(); try { prev && prev.focus && prev.focus(); } catch (e) {} resolve(v); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } };
    document.addEventListener('keydown', key, true);
    ov.addEventListener('mousedown', e => { if (e.target === ov) done(null); });
    ov.querySelector('[data-cancel]').onclick = () => done(null);
    ov.querySelector('[data-ok]').onclick = () => { const v = collect(ov); if (v !== undefined) done(v); };
    document.body.appendChild(ov);
    const f = ov.querySelector(focusSel || '[data-ok]'); if (f) f.focus();
  });
}
async function askConfirm({ title = 'Please confirm', message = '', confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
  const r = await modal(
    `<div class="modal-ic ${danger ? 'danger' : ''}">${danger ? '!' : '?'}</div><h3>${esc(title)}</h3><p>${esc(message)}</p>
     <div class="modal-act"><button type="button" class="btn ghost" data-cancel>${esc(cancelText)}</button><button type="button" class="btn ${danger ? 'danger' : ''}" data-ok>${esc(confirmText)}</button></div>`,
    () => true, danger ? '[data-cancel]' : '[data-ok]');
  return r === true;
}
const PUB_MSG = { title: 'Publish announcement', message: 'This will send SMS and email notifications to the targeted households. Continue?', confirmText: 'Publish' };
const askEdit = a => modal(
  `<h3>Edit announcement</h3><div class="modal-form"><label>Title</label><input id="ea_t" value="${esc(a.title)}"><label>Message</label><textarea id="ea_m" rows="5">${esc(a.message)}</textarea></div>
   <div class="modal-act"><button type="button" class="btn ghost" data-cancel>Cancel</button><button type="button" class="btn" data-ok>Save changes</button></div>`,
  ov => {
    const t = ov.querySelector('#ea_t'), m = ov.querySelector('#ea_m');
    if (!check([[t, t.value.trim().length >= 3, 'Ilagay ang title (kahit 3 letra).'], [m, m.value.trim().length >= 10, 'Isulat ang mensahe (kahit 10 letra).']])) return undefined;
    return { title: t.value.trim(), message: m.value.trim() };
  }, '#ea_t');

/* ---- delete na may Undo: ang totoong DELETE ay ipapadala pagkalipas ng 6 segundo ---- */
const pendingDel = new Map();
function queueDelete(url, label, onUndo) {
  const p = { timer: setTimeout(() => commitDelete(url), 6000) }; pendingDel.set(url, p);
  toast(label, { undo: () => { clearTimeout(p.timer); pendingDel.delete(url); onUndo(); } });
}
async function commitDelete(url) { if (!pendingDel.has(url)) return; pendingDel.delete(url); try { await api(url, 'DELETE'); } catch (e) {} }
function flushDeletes() {
  pendingDel.forEach((p, url) => { clearTimeout(p.timer); try { fetch('/api' + url, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token }, keepalive: true }); } catch (e) {} });
  pendingDel.clear();
}
window.addEventListener('pagehide', flushDeletes);

async function delHH(id) {
  if (!(await askConfirm({ title: 'Delete household', message: 'Are you sure you want to delete this household?', confirmText: 'Delete', danger: true }))) return;
  sel.delete(id); curHH = null;
  queueDelete('/households/' + id, 'Household deleted.', () => { toast('Restored.'); go('households'); });
  go('households');
}
async function delAnn(id) {
  if (!(await askConfirm({ title: 'Delete announcement', message: 'Are you sure you want to delete this announcement?', confirmText: 'Delete', danger: true }))) return;
  queueDelete('/announcements/' + id, 'Announcement deleted.', () => { toast('Restored.'); go('announcements'); });
  go('announcements');
}
async function editAnn(id) {
  const a = cache.find(x => x._id === id); if (!a) return;
  const r = await askEdit(a); if (!r) return;
  await api('/announcements/' + id, 'PUT', r); toast('Na-update.'); go('announcements');
}
async function rmRow(btn) {
  if (await askConfirm({ title: 'Remove member', message: 'Are you sure you want to remove this member?', confirmText: 'Remove', danger: true })) btn.parentNode.remove();
}
async function confirmLogout() {
  if (await askConfirm({ title: 'Log out', message: 'Are you sure you want to log out?', confirmText: 'Log out' })) logout();
}

/* ---- password: eye toggle (bukas = nakikita, may slash = nakatago) ---- */
const SVG = p => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const EYE_ON = SVG('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>');
const EYE_OFF = SVG('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/>');
function addEyes(root) {
  if (!root || root.nodeType !== 1) return;
  const list = [...(root.matches('input[type=password]') ? [root] : []), ...root.querySelectorAll('input[type=password]')];
  list.forEach(inp => {
    if (inp.dataset.eye) return; inp.dataset.eye = '1';
    const cs = getComputedStyle(inp), w = document.createElement('span'); w.className = 'pwwrap';
    w.style.marginTop = cs.marginTop; w.style.marginBottom = cs.marginBottom;
    inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'eye';
    const set = show => { inp.type = show ? 'text' : 'password'; b.innerHTML = show ? EYE_ON : EYE_OFF; b.setAttribute('aria-pressed', show); b.title = tx(show ? 'Hide password' : 'Show password'); b.setAttribute('aria-label', b.title); };
    set(false);
    b.onclick = () => { set(inp.type === 'password'); inp.focus(); };
    w.appendChild(b);
  });
}
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(addEyes))).observe(document.body, { childList: true, subtree: true });
addEyes(document.body);


if (token) enter();
