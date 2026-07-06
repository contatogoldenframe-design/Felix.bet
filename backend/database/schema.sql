-- Criar banco
CREATE DATABASE felixbet;

-- Conectar ao banco e rodar abaixo:

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    total_deposits DECIMAL(15,2) DEFAULT 0.00,
    total_withdraws DECIMAL(15,2) DEFAULT 0.00,
    total_bets INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de transações
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdraw', 'bet', 'win', 'bonus', 'admin_adjust')),
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rejected')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de apostas
CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    game_type VARCHAR(50) NOT NULL,
    bet_amount DECIMAL(15,2) NOT NULL,
    win_amount DECIMAL(15,2) DEFAULT 0,
    multiplier DECIMAL(10,2) DEFAULT 1.00,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'cashout')),
    game_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de jogos
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    min_bet DECIMAL(10,2) DEFAULT 0.50,
    max_bet DECIMAL(10,2) DEFAULT 1000,
    rtp DECIMAL(5,2) DEFAULT 95.00,
    is_active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Inserir conta administrativa (senha: AdminFelix@2024!)
INSERT INTO users (name, email, password_hash, balance, is_admin)
VALUES ('Administrador FelixBet', 'admin@felixbet.com', crypt('AdminFelix@2024!', gen_salt('bf')), 999999.99, true);

-- Inserir jogos
INSERT INTO games (name, type, description, min_bet, max_bet, rtp) VALUES
('Crash', 'crash', 'Jogo do aviãozinho - multiplique seus ganhos', 0.50, 500, 95.00),
('Mines', 'mines', 'Campo minado - encontre as estrelas', 0.50, 500, 96.00),
('Double', 'double', 'Clássico jogo de duplicar', 0.50, 1000, 94.00),
('Plinko', 'plinko', 'Jogo da bolinha caindo', 0.50, 500, 95.50),
('Slots Classic', 'slots', 'Caça-níqueis clássico 3x3', 0.50, 200, 94.00),
('Slots Fruit', 'slots', 'Caça-níqueis frutas 5x3', 0.50, 300, 95.00),
('Blackjack', 'cards', '21 - vença o dealer', 1.00, 500, 97.00),
('Poker Texas', 'cards', 'Texas Holdem contra a mesa', 1.00, 500, 96.00),
('Roleta', 'roulette', 'Roleta europeia', 0.50, 1000, 97.30),
('Dice', 'dice', 'Jogo de dados - escolha acima ou abaixo', 0.50, 1000, 96.00),
('Limbo', 'limbo', 'Multiplicador infinito', 0.50, 500, 95.00),
('Tower', 'tower', 'Subida na torre', 0.50, 300, 94.00),
('Wheel', 'wheel', 'Roda da fortuna', 0.50, 500, 93.00),
('Baccarat', 'cards', 'Baccarat clássico', 1.00, 1000, 98.00),
('Video Poker', 'cards', 'Poker de vídeo', 0.50, 300, 97.00),
('Keno', 'keno', 'Loteria Keno', 0.50, 200, 92.00),
('Minesweeper Pro', 'mines', 'Campo minado profissional', 1.00, 1000, 96.50),
('Crash 2x', 'crash', 'Crash com multiplicador dobrado', 0.50, 300, 94.00),
('Diamond Rush', 'slots', 'Caça ao diamante', 0.50, 400, 95.50),
('Lucky 7', 'slots', 'Sorte com o 7', 0.50, 250, 94.50);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Função para processar aposta
CREATE OR REPLACE FUNCTION process_bet(
    p_user_id UUID,
    p_game_type VARCHAR,
    p_amount DECIMAL,
    p_multiplier DECIMAL,
    p_win BOOLEAN
) RETURNS JSONB AS $$
DECLARE
    v_user_balance DECIMAL;
    v_win_amount DECIMAL;
    v_house_edge DECIMAL;
BEGIN
    -- Verificar saldo
    SELECT balance INTO v_user_balance FROM users WHERE id = p_user_id FOR UPDATE;
    
    IF v_user_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
    END IF;

    -- Calcular valor do ganho
    IF p_win THEN
        v_win_amount := p_amount * p_multiplier;
        -- Aplicar house edge (5%)
        v_house_edge := v_win_amount * 0.05;
        v_win_amount := v_win_amount - v_house_edge;
    ELSE
        v_win_amount := 0;
    END IF;

    -- Atualizar saldo do usuário
    UPDATE users 
    SET balance = balance - p_amount + v_win_amount,
        total_bets = total_bets + 1,
        total_wins = total_wins + CASE WHEN p_win THEN 1 ELSE 0 END
    WHERE id = p_user_id;

    -- Se perdeu, dinheiro vai pro admin
    IF NOT p_win THEN
        UPDATE users 
        SET balance = balance + p_amount
        WHERE is_admin = true;
    END IF;

    -- Registrar transação
    INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, status)
    VALUES (p_user_id, 'bet', -p_amount, v_user_balance, v_user_balance - p_amount, 
            CONCAT('Aposta em ', p_game_type), 'completed');

    IF p_win THEN
        INSERT INTO transactions (user_id, type, amount, description, status)
        VALUES (p_user_id, 'win', v_win_amount, 
                CONCAT('Ganhou em ', p_game_type, ' x', p_multiplier), 'completed');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'win', p_win,
        'win_amount', v_win_amount,
        'multiplier', p_multiplier
    );
END;
$$ LANGUAGE plpgsql;
