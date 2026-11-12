const mongoose = require('mongoose');
const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true, trim: true },
  block: { type: String, required: true, trim: true },
  floor: { type: Number, required: true, min: 0 },
  capacity: { type: Number, required: true, min: 1 },
  occupied: { type: Number, default: 0, min: 0 }
}, { timestamps: true });
roomSchema.virtual('availableBeds').get(function () { return this.capacity - this.occupied; });
roomSchema.set('toJSON', { virtuals: true });
module.exports = mongoose.model('Room', roomSchema);
