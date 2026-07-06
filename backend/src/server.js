require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const db = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const gameRoutes = require('./routes/games');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(cors());
app.use(express.json());
app.use(limiter);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/admin', adminRoutes);

// WebSocket - Jogos em tempo real
io.on('connection', (socket) => {
  console.log('🎲 Jogador conectado:', socket.id);

  socket.on('join:game', (gameId) => {
    socket.join(`game:${gameId}`);
  });

  socket.on('bet:crash', async (data) => {
    const { userId, amount, cashoutAt } = data;
    // Lógica do jogo Crash
    const crashPoint = Math.random() * 10 + 1;
    const cashedOut = cashoutAt <= crashPoint;
    // ... processar aposta
    io.to(`game:crash`).emit('crash:result', { crashPoint, cashedOut });
  });

  socket.on('disconnect', () => {
    console.log('❌ Jogador desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════╗
║     🎰 FELIXBET - ONLINE        ║
║     Porta: ${PORT}                ║
║     Data: ${new Date().toLocaleDateString('pt-BR')}        ║
╚══════════════════════════════════╝
  `);
});
