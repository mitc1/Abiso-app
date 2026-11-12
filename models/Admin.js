const mongoose = require('mongoose');
module.exports = mongoose.model('Admin', new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  displayName: { type: String, default: 'Admin', trim: true },
  salt: String, passHash: String,
  logins: [{ at: Date, ip: String, ua: String }]
}));
