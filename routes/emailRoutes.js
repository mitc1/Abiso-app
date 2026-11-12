const r = require('express').Router();
const c = require('../controllers/emailController');
r.get('/config', c.getConfig);
r.put('/config', c.saveConfig);
r.post('/test', c.test);
module.exports = r;
