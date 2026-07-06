const db = require('../config/database');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  const { name, email, password } = req.body;
  
  try {
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ($1, $2, crypt($3, gen_salt('bf'))) 
       RETURNING id, name, email, balance, created_at`,
      [name, email, password]
    );

    const token = jwt.sign(
      { userId: result.rows[0].id, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({ user: result.rows[0], token });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    res.status(500).json({ error: 'Erro ao cadastrar' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await db.query(
      `SELECT id, name, email, balance, is_admin, is_active 
       FROM users 
       WHERE email = $1 AND password_hash = crypt($2, password_hash)`,
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    if (!result.rows[0].is_active) {
      return res.status(403).json({ error: 'Conta desativada' });
    }

    const token = jwt.sign(
      { userId: result.rows[0].id, isAdmin: result.rows[0].is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ user: result.rows[0], token });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

module.exports = { register, login };
