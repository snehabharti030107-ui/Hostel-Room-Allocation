const router = require('express').Router();
const Room = require('../models/Room');
const Allocation = require('../models/Allocation');
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res, next) => {
  try { res.json(await Room.find().sort({ roomNumber: 1 })); } catch (err) { next(err); }
});
router.post('/', async (req, res, next) => {
  try {
    const { roomNumber, block, floor, capacity } = req.body;
    if (!roomNumber || !block || floor === '' || floor === undefined || !Number.isInteger(Number(capacity)) || Number(capacity) < 1) return res.status(400).json({ message: 'Enter a room number, block, floor and capacity of at least 1.' });
    res.status(201).json(await Room.create({ roomNumber, block, floor: Number(floor), capacity: Number(capacity) }));
  } catch (err) { next(err); }
});
router.put('/:id', async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    const newCapacity = req.body.capacity === undefined ? room.capacity : Number(req.body.capacity);
    if (!Number.isInteger(newCapacity) || newCapacity < 1) return res.status(400).json({ message: 'Capacity must be at least 1.' });
    if (newCapacity < room.occupied) return res.status(400).json({ message: `Capacity cannot be less than current occupancy (${room.occupied}).` });
    room.roomNumber = req.body.roomNumber ?? room.roomNumber;
    room.block = req.body.block ?? room.block;
    room.floor = req.body.floor === undefined ? room.floor : Number(req.body.floor);
    room.capacity = newCapacity;
    await room.save();
    res.json(room);
  } catch (err) { next(err); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    if (room.occupied > 0 || await Allocation.exists({ room: room._id, status: 'active' })) return res.status(400).json({ message: 'Release all students from this room before deleting it.' });
    await room.deleteOne();
    res.json({ message: 'Room deleted successfully.' });
  } catch (err) { next(err); }
});
module.exports = router;
