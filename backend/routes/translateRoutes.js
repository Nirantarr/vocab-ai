const express = require('express');
const { translate } = require('../controllers/translateController');

const router = express.Router();

router.post('/', translate);

module.exports = router;
