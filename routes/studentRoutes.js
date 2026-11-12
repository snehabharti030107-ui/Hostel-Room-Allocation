const router = require('express').Router();
const Student = require('../models/Student');
const Allocation = require('../models/Allocation');
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res, next) => {
  try { res.json(await Student.find().sort({ createdAt: -1 })); } catch (err) { next(err); }
});
router.post('/', async (req, res, next) => {
  try {
    const { name, rollNumber, email, phone, department, year } = req.body;
    if (![name, rollNumber, email, phone, department, year].every(v => String(v || '').trim())) return res.status(400).json({ message: 'Please fill in all student fields.' });
    res.status(201).json(await Student.create({ name, rollNumber, email, phone, department, year }));
  } catch (err) { next(err); }
});
router.put('/:id', async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    res.json(student);
  } catch (err) { next(err); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    if (await Allocation.exists({ student: req.params.id, status: 'active' })) return res.status(400).json({ message: 'Release this student\'s room before deleting the student.' });
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    res.json({ message: 'Student deleted successfully.' });
  } catch (err) { next(err); }
});
module.exports = router;
