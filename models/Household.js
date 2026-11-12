const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: String,
  relation: { type: String, default: 'Other' },
  age: mongoose.Schema.Types.Mixed,
  sex: { type: String, default: 'Male' },
  cases: { type: [String], default: [] },                    // special cases ng miyembro (PWD, Senior, atbp.)
  extra: { type: mongoose.Schema.Types.Mixed, default: {} }   // detalye ng cases (ID no., uri ng kapansanan...)
}, { _id: false, minimize: false });

module.exports = mongoose.model('Household', new mongoose.Schema({
  householdId: { type: String, required: true },
  name: { type: String, required: true, trim: true },       // kinatawan ng sambahayan
  purok: { type: String, default: '' },
  phone: { type: String, required: true },
  group: { type: String, enum: ['Senior Citizens', 'PWD', 'Low Income', '4Ps', 'Single Parents', 'General'], default: 'General' },
  groups: { type: [String], default: [] },                    // lahat ng category (PWD, Senior, atbp.)
  head: { type: mongoose.Schema.Types.Mixed, default: {} },   // detalye ng Household Head (email, DOB, civil status...)
  extra: { type: mongoose.Schema.Types.Mixed, default: {} }, // mga field na depende sa category
  members: { type: [memberSchema], default: [] }
}, { timestamps: true, minimize: false }));
