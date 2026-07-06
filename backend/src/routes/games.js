const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { listGames, crashGame, minesGame, doubleGame, plinkoGame, slotsGame } = require('../controllers/gameController');

router.get('/', listGames);
router.post('/crash', auth, crashGame);
router.post('/mines', auth, minesGame);
router.post('/double', auth, doubleGame);
router.post('/plinko', auth, plinkoGame);
router.post('/slots', auth, slotsGame);

module.exports = router;
