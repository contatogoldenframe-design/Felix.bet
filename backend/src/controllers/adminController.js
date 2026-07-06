const db = require('../config/database');

// Dashboard administrativo
const getDashboard = async (req, res) => {
  try {
    const totalUsers = await db.query('SELECT COUNT(*) FROM users WHERE is_admin = false');
    const totalDeposits = await db.query("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'deposit' AND status = 'completed'");
    const totalWithdraws = await db.query("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'withdraw' AND status = 'completed'");
    const totalBets = await db.query('SELECT COUNT(*) FROM bets');
    const adminBalance = await db.query("SELECT balance FROM users WHERE is_admin = true");
    
    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalDeposits: parseFloat(totalDeposits.rows[0].coalesce),
      totalWithdraws: parseFloat(totalWithdraws.rows[0].coalesce),
      totalBets: parseInt(totalBets.rows[0].count),
      adminBalance: parseFloat(adminBalance.rows[0].balance)
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
};

// Ajustar saldo do admin (depositar/retirar)
const adjustAdminBalance = async (req, res) => {
  const { amount, type } = req.body;
  
  try {
    await db.query(
      `UPDATE users SET balance = balance + $1 WHERE is_admin = true`,
      [type === 'deposit' ? amount : -amount]
    );
    
    res.json({ success: true, message: 'Saldo do admin ajustado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ajustar saldo' });
  }
};

// Listar todos os jogadores
const listPlayers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, balance, total_deposits, total_withdraws, total_bets, total_wins, is_active, created_at 
       FROM users WHERE is_admin = false ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar jogadores' });
  }
};

// Aprovar saque
const approveWithdraw = async (req, res) => {
  const { transactionId } = req.params;
  
  try {
    const transaction = await db.query(
      `UPDATE transactions SET status = 'completed' WHERE id = $1 AND type = 'withdraw' RETURNING user_id, amount`,
      [transactionId]
    );
    
    if (transaction.rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    res.json({ success: true, message: 'Saque aprovado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao aprovar saque' });
  }
};

module.exports = { getDashboard, adjustAdminBalance, listPlayers, approveWithdraw };
