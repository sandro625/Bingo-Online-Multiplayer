// server.js - CÓDIGO FINAL COM VALIDAÇÃO DE BINGO

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Variáveis de Estado do Jogo (Servidor)
const MAX_NUMBER = 75;
let availableNumbers = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1);
let drawnNumbers = [];
let players = {}; // Armazena { socketId: { username: 'Nome', card: {} } }
let gameStarted = false;
let gameInterval;
let winningPlayer = null; // Rastreia o vencedor

// 2. Servir Arquivos Estáticos
app.use(express.static(path.join(__dirname, 'public')));

// --- Funções Auxiliares de Lógica ---

// Função de validação de Bingo (Verifica se a cartela está completa)
function checkBingoWin(card, drawnNums) {
    if (!card || Object.keys(card).length === 0) return false;

    const BINGO_SIZE = 5;
    const COLUMN_NAMES = ['B', 'I', 'N', 'G', 'O'];

    // Converte a cartela para uma matriz 5x5 de células, marcando 'true' se o número foi sorteado.
    // O 'Livre' central é sempre true.
    const matrix = [];
    for (let i = 0; i < BINGO_SIZE; i++) {
        matrix[i] = [];
        for (let j = 0; j < BINGO_SIZE; j++) {
            if (i === 2 && j === 2) {
                matrix[i][j] = true; // Célula central é livre
            } else {
                const column = COLUMN_NAMES[j];
                const number = card[column][i];
                // Verifica se o número da cartela foi sorteado
                matrix[i][j] = drawnNums.includes(number);
            }
        }
    }

    // 1. Verificar Linhas e Colunas
    for (let i = 0; i < BINGO_SIZE; i++) {
        const rowWin = matrix[i].every(cell => cell === true);
        const colWin = matrix.every(row => row[i] === true);
        if (rowWin || colWin) return true;
    }

    // 2. Verificar Diagonais
    const diag1Win = matrix.every((row, i) => row[i] === true);
    if (diag1Win) return true;

    const diag2Win = matrix.every((row, i) => row[BINGO_SIZE - 1 - i] === true);
    if (diag2Win) return true;

    return false;
}

function resetGame() {
    clearInterval(gameInterval);
    availableNumbers = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1);
    drawnNumbers = [];
    gameStarted = false;
    winningPlayer = null;

    // Remove as cartelas, mas mantém os jogadores conectados
    Object.keys(players).forEach(id => {
        if (players[id]) {
            players[id].card = {}; // Limpa a cartela
        }
    });

    io.emit('game_reset'); // Avisa a todos para reiniciarem
    updatePlayerList();
}

// --- Lógica de Sorteio Automático ---
function startGame() {
    if (gameStarted) return;
    
    // Reinicia o jogo antes de começar
    resetGame();
    
    gameStarted = true;
    io.emit('game_state_update', { gameStarted: true });

    gameInterval = setInterval(() => {
        if (availableNumbers.length > 0 && !winningPlayer) {
            drawNumber();
        } else {
            clearInterval(gameInterval);
            gameStarted = false;
            // Só emite 'game_end' se não tiver havido um vencedor
            if (!winningPlayer) {
                io.emit('game_end', 'Todos os números sorteados. Fim de jogo sem vencedor!');
            }
        }
    }, 5000); // 5 segundos
}

function drawNumber() {
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const drawn = availableNumbers.splice(randomIndex, 1)[0]; 
    drawnNumbers.push(drawn);
    
    console.log(`Número Sorteado: ${drawn}`);

    // Envia o novo número sorteado para todos
    io.emit('numero_sorteado', drawn);
}

function updatePlayerList() {
    // Envia a lista de nomes para os clientes
    const playerNames = Object.values(players).map(p => p.username);
    io.emit('player_list_update', playerNames);
}

// --- WebSockets ---
io.on('connection', (socket) => {
    console.log(`Novo jogador conectado: ${socket.id}`);

    // 1. Envia o estado atual do sorteio e a lista de jogadores
    socket.emit('estado_inicial', {
        drawn: drawnNumbers,
        lastDrawn: drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null,
        gameStarted: gameStarted,
        players: Object.values(players).map(p => p.username)
    });

    // Ouve a definição do nome e o envio da cartela
    socket.on('set_username_and_card', (data) => {
        if (players[socket.id]) {
             // Se o jogador já está conectado, apenas atualiza a cartela
             players[socket.id].card = data.card;
             console.log(`${players[socket.id].username} atualizou a cartela.`);
             return;
        }

        // Se é um novo jogador
        const username = data.username || `Jogador ${socket.id.substring(0, 4)}`;
        players[socket.id] = { username: username, card: data.card };
        
        updatePlayerList(); 
        socket.emit('username_set', username);
        console.log(`Novo jogador definido: ${username}`);
    });
    
    // NOVO EVENTO: Ouve o clique de 'Reiniciar' de um cliente
    socket.on('reset_game', () => {
        console.log(`Comando de Reiniciar recebido de ${players[socket.id].username}`);
        resetGame(); // Reinicia o jogo no servidor
    });

    // Ouve o evento 'iniciar_jogo' (o primeiro jogador a clicar inicia)
    socket.on('iniciar_jogo', () => {
        startGame();
        console.log(`Jogo iniciado por ${players[socket.id].username}!`);
    });

    // Ouve o 'bingo' de um jogador
    socket.on('bingo_claim', () => {
        const player = players[socket.id];
        
        if (!gameStarted || winningPlayer) {
            socket.emit('bingo_reject', 'O jogo não está ativo ou já tem um vencedor.');
            return;
        }
        
        // --- VALIDAÇÃO CRÍTICA DO SERVIDOR ---
        const isWinValid = checkBingoWin(player.card, drawnNumbers);
        
        if (isWinValid) {
            winningPlayer = player;
            clearInterval(gameInterval); // Para o sorteio
            gameStarted = false;

            io.emit('vencedor', { 
                name: player.username, 
                mensagem: `${player.username} fez BINGO! Vitória confirmada.` 
            });
            console.log(`*** VITÓRIA CONFIRMADA PARA: ${player.username} ***`);
        } else {
            // Se o jogador trapaceou ou errou, avisa apenas a ele
            socket.emit('bingo_reject', 'Sua cartela ainda não tem BINGO. Continue jogando!');
            console.log(`BINGO FALSO detectado de: ${player.username}`);
        }
    });

    // Ouve a desconexão
    socket.on('disconnect', () => {
        if (players[socket.id]) {
            console.log(`Jogador desconectado: ${players[socket.id].username}`);
            delete players[socket.id];
            updatePlayerList(); // Atualiza a lista
        }
    });
});

// 4. Iniciar o Servidor
server.listen(PORT, () => {
    console.log(`Servidor de Bingo rodando na porta ${PORT}`);
});
