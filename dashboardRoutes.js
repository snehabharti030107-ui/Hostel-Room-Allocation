const router = require('express').Router();
const Student = require('../models/Student');
const Room = require('../models/Room');
const Allocation = require('../models/Allocation');
const auth = require('../middleware/auth');
router.use(auth);
router.get('/', async (req, res, next) => {
  try {
    const [students, rooms, activeAllocations, roomStats] = await Promise.all([
      Student.countDocuments(), Room.countDocuments(), Allocation.countDocuments({ status: 'active' }),
      Room.aggregate([{ $group: { _id: null, beds: { $sum: '$capacity' }, occupied: { $sum: '$occupied' } } }])
    ]);
    const stats = roomStats[0] || { beds: 0, occupied: 0 };
    res.json({ students, rooms, activeAllocations, totalBeds: stats.beds, occupiedBeds: stats.occupied, availableBeds: stats.beds - stats.occupied });
  } catch (err) { next(err); }
});
module.exports = router;
