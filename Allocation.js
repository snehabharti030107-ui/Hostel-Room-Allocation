const mongoose = require('mongoose');
const allocationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  allocatedAt: { type: Date, default: Date.now },
  releasedAt: { type: Date, default: null },
  status: { type: String, enum: ['active', 'released'], default: 'active' }
}, { timestamps: true });
allocationSchema.index({ student: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
module.exports = mongoose.model('Allocation', allocationSchema);
