const r = require('express').Router();
const c = require('../controllers/authController');
r.get('/', c.me);
r.put('/', c.updateAccount);
r.put('/password', c.changePassword);
r.post('/logout-all', c.logoutAll);
module.exports = r;
