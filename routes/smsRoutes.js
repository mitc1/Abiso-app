const r = require('express').Router();
const c = require('../controllers/smsController');
r.get('/', c.list);
r.get('/stats', c.stats);
r.post('/send', c.send);
r.get('/config', c.getConfig);
r.put('/config', c.saveConfig);
r.post('/test', c.test);
module.exports = r;
