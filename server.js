const dns = require('dns');

dns.setServers([
    '8.8.8.8',
    '1.1.1.1'
]);
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { protect, ensureAdmin } = require('./controllers/authController');
const Household = require('./models/Household');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', require('./routes/authRoutes'));
app.use('/api/announcements', protect, require('./routes/announcementRoutes'));
app.use('/api/households', protect, require('./routes/householdRoutes'));
app.use('/api/sms', protect, require('./routes/smsRoutes'));
app.use('/api/email', protect, require('./routes/emailRoutes'));
app.use('/api/account', protect, require('./routes/accountRoutes'));

async function seed() {
  if (await Household.countDocuments()) return;
  const M = (n, r, a, s) => ({ name: n, relation: r, age: a, sex: s });
  await Household.insertMany([
    { householdId: 'HC-001', name: 'Cruz, Juan Dela', purok: 'Purok 1', phone: '0917 123 4567', group: 'Senior Citizens',
      extra: { sc_id: 'SC-0141', dob: '1958-03-12', pension: 'Social Pension', living: 'With family', mobility: 'Walks independently', med: 'Yes', ec: 'Cruz, Mark', ecp: '0917 555 0101' },
      members: [M('Cruz, Juan Dela', 'Head', 68, 'Male'), M('Cruz, Lourdes', 'Spouse', 65, 'Female'), M('Cruz, Mark', 'Child', 34, 'Male')] },
    { householdId: 'HC-002', name: 'Santos, Maria', purok: 'Purok 2', phone: '0998 765 4321', group: 'Low Income',
      extra: { income: '\u20B15,000 \u2013 \u20B110,000', source: 'Daily wage', housing: 'Rented', children: '2', assist: 'None' },
      members: [M('Santos, Maria', 'Head', 42, 'Female'), M('Santos, Jose', 'Child', 16, 'Male'), M('Santos, Ella', 'Child', 9, 'Female')] },
    { householdId: 'HC-003', name: 'Reyes, Antonio', purok: 'Purok 3', phone: '0910 985 6543', group: 'PWD',
      extra: { pwd_id: 'PWD-0932', disability: 'Physical / Orthopedic', device: 'Yes', caregiver: 'Reyes, Carla', benefits: 'Yes', ec: 'Reyes, Carla', ecp: '0910 555 0202' },
      members: [M('Reyes, Antonio', 'Head', 51, 'Male'), M('Reyes, Carla', 'Spouse', 49, 'Female')] },
    { householdId: 'HC-004', name: 'Garcia, Elena', purok: 'Purok 4', phone: '0927 456 7890', group: '4Ps',
      extra: { fps_id: '4PS-77120', grantee: 'Garcia, Elena', kids: '2', school: 'Yes', checkup: 'Yes', payout: 'Cash card' },
      members: [M('Garcia, Elena', 'Head', 38, 'Female'), M('Garcia, Liam', 'Child', 7, 'Male'), M('Garcia, Mia', 'Child', 4, 'Female')] },
    { householdId: 'HC-005', name: 'Lopez, Ramon', purok: 'Purok 5', phone: '0966 123 7890', group: 'Senior Citizens',
      extra: { sc_id: 'SC-0188', dob: '1954-08-02', pension: 'SSS', living: 'With family', mobility: 'Needs assistance', med: 'Yes' },
      members: [M('Lopez, Ramon', 'Head', 72, 'Male'), M('Lopez, Teresa', 'Spouse', 70, 'Female')] },
    { householdId: 'HC-006', name: 'Torres, Ana', purok: 'Purok 6', phone: '0918 654 3210', group: 'Single Parents',
      extra: { sp_id: 'SP-0456', reason: 'Separated', nchild: '1', youngest: '10', work: 'Self-employed', childcare: 'Yes' },
      members: [M('Torres, Ana', 'Head', 33, 'Female'), M('Torres, Ben', 'Child', 10, 'Male')] }
  ]);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await seed();
    await ensureAdmin();
    app.listen(process.env.PORT || 3000, () => console.log(`ABISO running: http://localhost:${process.env.PORT || 3000}`));
  })
  .catch(err => { console.error('MongoDB error:', err.message); process.exit(1); });
