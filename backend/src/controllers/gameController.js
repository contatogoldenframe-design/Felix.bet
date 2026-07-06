const db = require('../config/database');

// Listar todos os jogos ativos
const listGames = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, type, description, min_bet, max_bet, rtp, image_url FROM games WHERE is_active = true'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar jogos' });
  }
};

// Lógica do jogo Crash
const crashGame = async (req, res) => {
  const { userId, amount, gameId } = req.body;
  
  try {
    // Gerar ponto de crash aleatório (1.0x a 50.0x)
    const crashPoint = 1 + Math.random() * 49;
    
    // Aleatoriamente decide se vai crashar cedo (95% de chance de crash < 2x para manter a casa)
    const houseEdge = Math.random();
    let finalCrash;
    
    if (houseEdge < 0.05) {
      finalCrash = 10 + Math.random() * 40; // 5% de chance de ir longe
    } else {
      finalCrash = 1 + Math.random() * 1.5; // 95% de chance de crash rápido
    }

    res.json({
      game: 'crash',
      crashPoint: finalCrash,
      multiplier: finalCrash,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no jogo Crash' });
  }
};

// Lógica do jogo Mines
const minesGame = async (req, res) => {
  const { userId, amount, minesCount } = req.body;
  
  try {
    const grid = Array(25).fill('safe');
    let minesPlaced = 0;
    
    while (minesPlaced < minesCount) {
      const pos = Math.floor(Math.random() * 25);
      if (grid[pos] === 'safe') {
        grid[pos] = 'mine';
        minesPlaced++;
      }
    }

    // Multiplicadores baseados em quantas minas
    const multipliers = {
      1: 1.25, 2: 1.5, 3: 2.0, 4: 2.5, 5: 3.0,
      6: 4.0, 7: 5.0, 8: 6.5, 9: 8.0, 10: 10.0
    };

    res.json({
      game: 'mines',
      grid,
      minesCount,
      revealed: [],
      multiplier: multipliers[minesCount] || 1.25,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no jogo Mines' });
  }
};

// Lógica do jogo Double
const doubleGame = async (req, res) => {
  const { userId, amount, choice } = req.body;
  
  try {
    const result = Math.random() < 0.5 ? 'red' : 'black';
    const won = choice === result;
    
    res.json({
      game: 'double',
      result,
      choice: won ? 'win' : 'loss',
      multiplier: won ? 2 : 0,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no jogo Double' });
  }
};

// Lógica do jogo Plinko
const plinkoGame = async (req, res) => {
  const { userId, amount, rows } = req.body;
  
  try {
    const totalRows = rows || 16;
    const multipliers = {
      0: 100, 1: 25, 2: 10, 3: 5, 4: 3, 5: 2, 6: 1.5, 7: 1.2,
      8: 1.2, 9: 1.5, 10: 2, 11: 3, 12: 5, 13: 10, 14: 25, 15: 100
    };

    let position = 0;
    for (let i = 0; i < totalRows; i++) {
      position += Math.random() < 0.5 ? 0 : 1;
    }

    res.json({
      game: 'plinko',
      position,
      multiplier: multipliers[position] || 1.2,
      rows: totalRows,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no jogo Plinko' });
  }
};

// Lógica de Slots
const slotsGame = async (req, res) => {
  const { userId, amount, slotType } = req.body;
  
  try {
    const symbols = ['🍒', '🍋', '🍊', '🍇', '🍀', '💎', '7️⃣', '⭐', '🔔', '💰'];
    const reels = [];
    
    for (let i = 0; i < 3; i++) {
      const row = [];
      for (let j = 0; j < 3; j++) {
        row.push(symbols[Math.floor(Math.random() * symbols.length)]);
      }
      reels.push(row);
    }

    // Verificar ganhos
    let winMultiplier = 0;
    // Linhas
    for (let i = 0; i < 3; i++) {
      if (reels[0][i] === reels[1][i] && reels[1][i] === reels[2][i]) {
        winMultiplier += 3;
      }
    }

    res.json({
      game: 'slots',
      reels,
      winMultiplier,
      winAmount: amount * winMultiplier,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no jogo Slots' });
  }
};

module.exports = { listGames, crashGame, minesGame, doubleGame, plinkoGame, slotsGame };
