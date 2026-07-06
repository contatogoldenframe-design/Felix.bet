const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/database');

// Ver saldo
router.get('/balance', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT balance FROM users WHERE id = $1', [req.userId]);
    res.json({ balance: parseFloat(result.rows[0].balance) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar saldo' });
  }
});

// Depositar
router.post('/deposit', auth, async (req, res) => {
  const { amount, paymentMethod } = req.body;
  
  if (amount < 1) {
    return res.status(400).json({ error: 'Depósito mínimo é R$ 1,00' });
  }

  try {
    await db.query(
      `UPDATE users SET balance = balance + $1, total_deposits = total_deposits + $1 WHERE id = $2`,
      [amount, req.userId]
    );

    await db.query(
      `INSERT INTO transactions (user_id, type, amount, description, status) 
       VALUES ($1, 'deposit', $2, 'Depósito via ' || $3, 'completed')`,
      [req.userId, amount, paymentMethod]
    );

    // Transferir para o admin (100% do depósito)
    await db.query(
      `UPDATE users SET balance = balance + $1 WHERE is_admin = true`,
      [amount]
    );

    res.json({ success: true, message: `Depósito de R$ ${amount} realizado` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar depósito' });
  }
});

// Sacar
router.post('/withdraw', auth, async (req, res) => {
  const { amount, pixKey } = req.body;
  
  if (amount < 50) {
    return res.status(400).json({ error: 'Saque mínimo é R$ 50,00' });
  }

  try {
    const user = await db.query('SELECT balance FROM users WHERE id = $1', [req.userId]);
    
    if (parseFloat(user.rows[0].balance) < amount) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    await db.query(
      `UPDATE users SET balance = balance - $1 WHERE id = $2`,
      [amount, req.userId]
    );

    await db.query(
      `INSERT INTO transactions (user_id, type, amount, description, status) 
       VALUES ($1, 'withdraw', -$2, 'Saque via PIX: ' || $3, 'pending')`,
      [req.userId, amount, pixKey]
    );

    res.json({ success: true, message: 'Solicitação de saque enviada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar saque' });
  }
});

// Histórico de transações
router.get('/transactions', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

module.exports = router;
