const r = require('express').Router();
const c = require('../controllers/announcementController');
r.post('/classify', c.classify);
r.get('/', c.getAll);
r.post('/', c.create);
r.put('/:id', c.update);
r.post('/:id/publish', c.publish);
r.delete('/:id', c.remove);
module.exports = r;
