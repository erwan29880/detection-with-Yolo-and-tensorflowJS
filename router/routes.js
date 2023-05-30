const express = require('express');
const controller = require('../controller/ctrl');
const router = express.Router();

router.get('/', controller.objectDetection)

module.exports = router