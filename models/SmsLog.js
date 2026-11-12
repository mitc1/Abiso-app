const mongoose = require('mongoose');
module.exports = mongoose.model('SmsLog', new mongoose.Schema({
  household: { type: mongoose.Schema.Types.ObjectId, ref: 'Household' },
  householdId: String, name: String, phone: String, group: String,
  text: String,
  status: { type: String, enum: ['Delivered', 'Sent', 'Failed'], default: 'Delivered' }
}, { timestamps: true }));
