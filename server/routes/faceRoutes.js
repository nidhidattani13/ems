const express = require('express');
const router = express.Router();
const faceController = require('../controller/faceController');

// Enroll descriptors for an employee
router.post('/enroll', faceController.enroll);

// Recognize a single descriptor
router.post('/recognize', faceController.recognize);

// List enrolled employees
router.get('/list', faceController.list);

module.exports = router;
