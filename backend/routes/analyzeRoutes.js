const express = require('express');
const { analyzeText } = require('../controllers/analyzeController');

const router = express.Router();

router.post('/', analyzeText);

module.exports = router;
