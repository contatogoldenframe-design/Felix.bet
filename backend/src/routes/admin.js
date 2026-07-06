const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const { getDashboard, adjustAdminBalance, listPlayers, approveWithdraw } = require('../controllers/adminController');

router.get('/dashboard', adminAuth, getDashboard);
router.post('/balance', adminAuth, adjustAdminBalance);
router.get('/players', adminAuth, listPlayers);
router.post('/approve-withdraw/:transactionId', adminAuth, approveWithdraw);

module.exports = router;
