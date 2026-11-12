const mongoose = require('mongoose');
module.exports = mongoose.model('Announcement', new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  category: { type: String, enum: ['PSA', 'Ayuda', 'Health', 'Events', 'Emergency', 'Others'], default: 'Others' },
  eventDate: { type: Date, default: Date.now },
  location: { type: String, default: '' },
  target: { type: String, default: 'All' },
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft' }
}, { timestamps: true }));
