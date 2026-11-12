const router = require('express').Router();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Room = require('../models/Room');
const Allocation = require('../models/Allocation');
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const allocations = await Allocation.find().populate('student', 'name rollNumber department').populate('room', 'roomNumber block floor').sort({ allocatedAt: -1 });
    res.json(allocations);
  } catch (err) { next(err); }
});

// A transaction plus an atomic capacity check prevents two simultaneous requests from overfilling a room.
router.post('/', async (req, res, next) => {
  const session = await mongoose.startSession();
  let created;
  try {
    const { studentId, roomId } = req.body;
    if (!studentId || !roomId) return res.status(400).json({ message: 'Choose a student and a room.' });
    await session.withTransaction(async () => {
      const student = await Student.findById(studentId).session(session);
      if (!student) throw Object.assign(new Error('Student not found.'), { status: 404 });
      const existing = await Allocation.findOne({ student: studentId, status: 'active' }).session(session);
      if (existing) throw Object.assign(new Error('This student already has an active room allocation.'), { status: 409 });
      const room = await Room.findOneAndUpdate(
        { _id: roomId, $expr: { $lt: ['$occupied', '$capacity'] } },
        { $inc: { occupied: 1 } },
        { new: true, session }
      );
      if (!room) {
        const exists = await Room.exists({ _id: roomId }).session(session);
        throw Object.assign(new Error(exists ? 'This room is full. Choose another room.' : 'Room not found.'), { status: exists ? 400 : 404 });
      }
      const docs = await Allocation.create([{ student: studentId, room: roomId }], { session });
      created = docs[0];
    });
    const result = await Allocation.findById(created._id).populate('student', 'name rollNumber').populate('room', 'roomNumber block');
    res.status(201).json({ message: 'Room allocated successfully.', allocation: result });
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});

router.patch('/:id/release', async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    let released = false;
    await session.withTransaction(async () => {
      const allocation = await Allocation.findOne({ _id: req.params.id, status: 'active' }).session(session);
      if (!allocation) throw Object.assign(new Error('Active allocation not found.'), { status: 404 });
      allocation.status = 'released';
      allocation.releasedAt = new Date();
      await allocation.save({ session });
      const roomUpdate = await Room.updateOne({ _id: allocation.room, occupied: { $gt: 0 } }, { $inc: { occupied: -1 } }, { session });
      if (roomUpdate.modifiedCount !== 1) throw new Error('Room occupancy could not be updated. Please contact the administrator.');
      released = true;
    });
    res.json({ message: released ? 'Room released successfully.' : 'Unable to release room.' });
  } catch (err) { next(err); }
  finally { await session.endSession(); }
});
module.exports = router;
