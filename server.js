// server.js

// 1. Configurações básicas do Servidor
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Variáveis Globais do Jogo (O SERVIDOR gerencia o jogo)
const MAX_NUMBER = 75;
let availableNumbers = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1);
let drawnNumbers = [];

// 2. Servir Arquivos Estáticos (HTML, CSS, JS)
// Isso permite que o navegador carregue seus arquivos de frontend
app.use(express.static(path.join(__dirname, 'public'))); 
// Coloque seus arquivos index.html, style.css e script.js dentro de uma pasta chamada 'public'

// 3. Lógica do Jogo (WebSockets)
io.on('connection', (socket) => {
    console.log(`Novo jogador conectado: ${socket.id}`);

    // Envia o estado atual do sorteio para o jogador que acabou de se conectar
    socket.emit('estado_inicial', {
        drawn: drawnNumbers,
        lastDrawn: drawnNumbers[drawnNumbers.length - 1]
    });

    // Ouve o evento 'sortear' (geralmente vindo de um botão do sorteador)
    socket.on('sortear', () => {
        if (availableNumbers.length === 0) {
            socket.emit('mensagem', 'FIM! Todos os números foram sorteados.');
            return;
        }

        // Lógica de Sorteio do Servidor
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        const drawn = availableNumbers.splice(randomIndex, 1)[0]; 
        drawnNumbers.push(drawn);
        
        console.log(`Número Sorteado: ${drawn}`);

        // AQUI ESTÁ A MAGIA MULTIPLAYER:
        // io.emit() envia a mensagem para TODOS os clientes conectados.
        io.emit('numero_sorteado', drawn);
    });

    // Ouve o evento 'bingo' de um jogador
    socket.on('bingo', (data) => {
        console.log(`BINGO! Recebido de ${socket.id}`);
        // Em um jogo real, você checaria a cartela aqui para evitar trapaça.
        
        // Avisa a todos que alguém venceu
        io.emit('vencedor', { id: socket.id, mensagem: 'Um jogador fez BINGO!' });
    });

    // Ouve quando um jogador se desconecta
    socket.on('disconnect', () => {
        console.log(`Jogador desconectado: ${socket.id}`);
    });
});

// 4. Iniciar o Servidor
server.listen(PORT, () => {
    console.log(`Servidor de Bingo rodando em http://localhost:${PORT}`);
    console.log('--- Coloque seus arquivos HTML, CSS e JS na pasta /public ---');
});