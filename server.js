// server.js - CÓDIGO ATUALIZADO

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
let players = {}; // Novo: Armazena jogadores { socketId: 'Nome do Jogador' }
let gameStarted = false;
let gameInterval; // Novo: Variável para o temporizador

// 2. Servir Arquivos Estáticos
app.use(express.static(path.join(__dirname, 'public')));

// --- Lógica de Sorteio Automático ---
function startGame() {
    if (gameStarted) return; // Evita iniciar o jogo duas vezes
    
    // Novo: Reinicia o estado do jogo
    availableNumbers = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1);
    drawnNumbers = [];
    gameStarted = true;
    io.emit('game_state_update', { gameStarted: true }); // Avisa aos clientes que o jogo iniciou

    // NOVO: Sorteio automático a cada 5 segundos
    gameInterval = setInterval(() => {
        if (availableNumbers.length > 0) {
            drawNumber();
        } else {
            clearInterval(gameInterval);
            io.emit('game_end', 'Todos os números sorteados. Fim de jogo!');
            gameStarted = false;
        }
    }, 5000); // 5000ms = 5 segundos
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
    // Converte o objeto de jogadores em um array de nomes
    const playerNames = Object.values(players);
    io.emit('player_list_update', playerNames);
}

// --- WebSockets ---
io.on('connection', (socket) => {
    console.log(`Novo jogador conectado: ${socket.id}`);

    // 1. Envia o estado atual do sorteio e a lista de jogadores
    socket.emit('estado_inicial', {
        drawn: drawnNumbers,
        lastDrawn: drawnNumbers[drawnNumbers.length - 1],
        gameStarted: gameStarted,
        players: Object.values(players)
    });

    // Ouve a definição do nome do usuário ao se conectar
    socket.on('set_username', (username) => {
        players[socket.id] = username || `Jogador ${socket.id.substring(0, 4)}`;
        updatePlayerList(); // Atualiza a lista para todos os clientes
        socket.emit('username_set', players[socket.id]); // Confirma o nome
    });
    
    // Ouve o evento 'iniciar_jogo' (o primeiro jogador a clicar inicia)
    socket.on('iniciar_jogo', () => {
        startGame();
        console.log("Jogo iniciado pelo jogador!");
    });

    // Ouve o 'bingo' de um jogador
    socket.on('bingo', (data) => {
        const playerName = players[socket.id] || "Um jogador anônimo";
        console.log(`BINGO! Recebido de ${playerName}`);
        
        // Em um jogo real, você checaria a cartela aqui
        // Avisa a todos que alguém venceu e finaliza o sorteio
        clearInterval(gameInterval); // Para o sorteio
        gameStarted = false;
        
        io.emit('vencedor', { 
            name: playerName, 
            mensagem: `${playerName} fez BINGO! O jogo acabou.` 
        });
    });

    // Ouve a desconexão
    socket.on('disconnect', () => {
        console.log(`Jogador desconectado: ${socket.id}`);
        delete players[socket.id];
        updatePlayerList(); // Atualiza a lista
    });
});

// 4. Iniciar o Servidor
server.listen(PORT, () => {
    console.log(`Servidor de Bingo rodando em http://localhost:${PORT}`);
});
