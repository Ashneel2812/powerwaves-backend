const express = require('express');
const { createOrder } = require('../controllers/orderController');
const router = express.Router();

router.post('/', createOrder); // Route to create a new order

module.exports = router;