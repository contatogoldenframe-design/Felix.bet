const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.isAdmin = decoded.isAdmin;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (!req.isAdmin) {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }
    next();
  });
};

module.exports = { auth, adminAuth };
