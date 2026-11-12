const Household = require('../models/Household');

const GROUPS = ['Senior Citizens', 'PWD', 'Low Income', '4Ps', 'Single Parents', 'General'];
const RELATIONS = ['Head', 'Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other'];

// Linisin ang members at extra bago i-save
const cleanMembers = arr => (Array.isArray(arr) ? arr : []).map(m => ({
  name: String(m.name || '').trim(),
  relation: RELATIONS.includes(m.relation) ? m.relation : 'Other',
  age: m.age === '' || m.age == null ? '' : Math.max(0, Math.min(120, +m.age || 0)),
  sex: m.sex === 'Female' ? 'Female' : 'Male',
  cases: (Array.isArray(m.cases) ? m.cases : []).filter(g => GROUPS.includes(g) && g !== 'General'),
  extra: cleanExtra(m.extra)
})).filter(m => m.name);

const cleanExtra = o => Object.fromEntries(
  Object.entries(o && typeof o === 'object' ? o : {}).slice(0, 40)
    .map(([k, v]) => [String(k).replace(/[^\w]/g, '').slice(0, 30), String(v ?? '').slice(0, 100)]));

const cleanGroups = a => (Array.isArray(a) ? a : []).filter(g => GROUPS.includes(g) && g !== 'General');
const cleanHead = o => Object.fromEntries(['name', 'placeOfBirth', 'sex', 'email', 'dob', 'civilStatus', 'relation']
  .map(k => [k, String((o && o[k]) ?? '').trim().slice(0, 120)]));

const okMail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());
const okPhone = p => { const d = String(p || '').replace(/\D/g, ''); return /^09\d{9}$/.test(d) || /^9\d{9}$/.test(d) || /^639\d{9}$/.test(d); };
const checkContact = (phone, head) => !okPhone(phone) ? 'Maling mobile number. Gamitin ang format na 09xx xxx xxxx.'
  : (!okMail(head && head.email) ? 'Kailangan ang tamang email address ng kinatawan.' : null);

exports.getAll = async (req, res) => res.json(await Household.find().sort({ householdId: 1 }));

exports.create = async (req, res) => {
  try {
    const { name, phone, purok, group, groups, head, members, extra } = req.body;
    const bad = checkContact(phone, head); if (bad) return res.status(400).json({ error: bad });
    const gs = cleanGroups(groups).length ? cleanGroups(groups) : [...new Set(cleanMembers(members).flatMap(m => m.cases))];
    const last = await Household.findOne().sort({ householdId: -1 });
    const n = last ? (parseInt(last.householdId.slice(3)) || 0) + 1 : 1;
    const h = await Household.create({
      householdId: 'HC-' + String(n).padStart(3, '0'), name, phone, purok,
      group: gs[0] || (GROUPS.includes(group) ? group : 'General'), groups: gs, head: cleanHead(head),
      extra: cleanExtra(extra), members: cleanMembers(members)
    });
    res.status(201).json(h);
  } catch (e) { res.status(400).json({ error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const { name, phone, purok, group, groups, head, members, extra } = req.body;
    const bad = checkContact(phone, head || { email: 'x@x.x' }); if (bad) return res.status(400).json({ error: bad });
    const set = { name, phone, purok };
    if (Array.isArray(groups)) { set.groups = cleanGroups(groups); set.group = set.groups[0] || 'General'; }
    else if (GROUPS.includes(group)) set.group = group;
    if (head) set.head = cleanHead(head);
    if (members) set.members = cleanMembers(members);
    if (extra) set.extra = cleanExtra(extra);
    res.json(await Household.findByIdAndUpdate(req.params.id, set, { new: true, runValidators: true }));
  } catch (e) { res.status(400).json({ error: e.message }); }
};

exports.remove = async (req, res) => { await Household.findByIdAndDelete(req.params.id); res.json({ ok: true }); };
