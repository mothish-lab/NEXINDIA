const express = require('express');
const router = express.Router();
const { classify, similarity } = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticateToken);
router.post('/classify', upload.single('image'), classify);
router.post('/similarity', similarity);

module.exports = router;
