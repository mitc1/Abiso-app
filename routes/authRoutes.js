const r = require('express').Router();
r.post('/login', require('../controllers/authController').login);
module.exports = r;
