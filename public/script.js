// public/script.js - CÓDIGO FINAL COM VALIDAÇÃO E UX

const socket = io(); 

// --- Variáveis e Constantes ---
const MAX_NUMBER = 75;
const NUMBERS_PER_COLUMN = 15;
const COLUMN_NAMES = ['B', 'I', 'N', 'G', 'O'];

let drawnNumbers = [];
let cardNumbers = {}; // Cartela local (para o servidor verificar)
let myUsername = '';
let isGameStarted = false;
let hasClaimedBingo = false; // Flag para evitar spam do botão BINGO

// --- Elementos do DOM ---
const drawnNumberElement = document.getElementById('drawnNumber');
const historyListElement = document.getElementById('historyList');
const generateCardButton = document.getElementById('generateCardButton');
const resetButton = document.getElementById('resetButton');
const bingoCardElement = document.getElementById('bingoCard');
const winStatusElement = document.getElementById('winStatus');
const drawButton = document.getElementById('drawButton'); // Mantido para referência

// Elementos NOVO para Login/Controle
const loginScreen = document.getElementById('login-screen');
const usernameInput = document.getElementById('usernameInput');
const joinButton = document.getElementById('joinButton');
const gameContent = document.getElementById('game-content');
const playerListElement = document.getElementById('playerList');
const startButton = document.getElementById('startButton');


// ----------------------------------------------------------------------
//                       FUNÇÕES DA CARTELA
// ----------------------------------------------------------------------

function generateCard() {
    cardNumbers = {};
    bingoCardElement.innerHTML = '<tr><th>B (1-15)</th><th>I (16-30)</th><th>N (31-45)</th><th>G (46-60)</th><th>O (61-75)</th></tr>';
    winStatusElement.textContent = 'Sua Cartela'; 
    winStatusElement.style.color = '#333';
    hasClaimedBingo = false; // Resetar o status de bingo

    // Lógica para gerar cartela e popular cardNumbers... (A mesma lógica anterior)
    for (let i = 0; i < 5; i++) {
        const row = bingoCardElement.insertRow(-1);
        for (let j = 0; j < 5; j++) {
            const cell = row.insertCell(-1);
            const colIndex = j;
            const min = colIndex * NUMBERS_PER_COLUMN + 1;
            const max = (colIndex + 1) * NUMBERS_PER_COLUMN;
            let number;

            if (i === 2 && j === 2) {
                number = 'Livre';
                cell.textContent = number;
                cell.classList.add('marked');
                cell.style.cursor = 'default';
            } else {
                const columnKey = COLUMN_NAMES[j];
                let columnUsedNumbers = cardNumbers[columnKey] || [];
                do {
                    number = Math.floor(Math.random() * (max - min + 1)) + min;
                } while (columnUsedNumbers.includes(number));

                columnUsedNumbers.push(number);
                cardNumbers[columnKey] = columnUsedNumbers;
                
                cell.textContent = number;
                cell.id = `cell-${number}`; 
                cell.addEventListener('click', () => markCard(number, cell));
            }
        }
    }
    
    // Marca os números já sorteados
    drawnNumbers.forEach(num => autoMarkCard(num));
    
    // NOVO: Se já logado, envia a cartela para o servidor registrar
    if (myUsername) {
        socket.emit('set_username_and_card', { username: myUsername, card: cardNumbers });
    }
}

function autoMarkCard(number) {
    const cell = document.getElementById(`cell-${number}`);
    if (cell && !cell.classList.contains('marked')) {
        cell.classList.add('marked');
        checkForWin();
    }
}

function markCard(number, cell) {
    if (drawnNumbers.includes(parseInt(number)) && !cell.classList.contains('marked')) {
        cell.classList.add('marked');
        checkForWin();
    } else if (!drawnNumbers.includes(parseInt(number)) && number !== 'Livre') {
        alert(`O número ${number} ainda não foi sorteado!`);
    }
}

// NOVO: Lógica de Bingo agora apenas REIVINDICA a vitória ao servidor
function checkForWin() {
    if (!isGameStarted || hasClaimedBingo) return;

    // ... (toda a lógica local de verificação de linha/coluna/diagonal)
    const rows = bingoCardElement.rows;
    let isBingo = false;
    
    if (rows.length < 6) return; 
    const cells = Array.from(rows).slice(1).map(row => Array.from(row.cells));

    // Verifica Linhas e Colunas
    for (let i = 0; i < 5; i++) {
        const rowWin = cells[i].every(cell => cell.classList.contains('marked'));
        const colWin = cells.every(row => row[i].classList.contains('marked'));
        if (rowWin || colWin) { isBingo = true; break; }
    }
    // Verifica Diagonais
    const diag1Win = cells.every((row, i) => row[i].classList.contains('marked'));
    if (!isBingo && diag1Win) isBingo = true;
    const diag2Win = cells.every((row, i) => row[4 - i].classList.contains('marked'));
    if (!isBingo && diag2Win) isBingo = true;

    // Se a vitória é detectada localmente, REIVINDICA ao servidor.
    if (isBingo) {
        hasClaimedBingo = true;
        socket.emit('bingo_claim'); // NOVO EVENTO
        winStatusElement.textContent = 'BINGO REIVINDICADO! AGUARDANDO VALIDAÇÃO DO SERVIDOR...';
        winStatusElement.style.color = 'orange';
    }
}


// ----------------------------------------------------------------------
//                  FUNÇÕES DE INICIALIZAÇÃO E DISPLAY
// ----------------------------------------------------------------------

function updateDisplay(drawn) {
    drawnNumberElement.textContent = drawn;
    
    // Lógica para colorir o último número
    drawnNumberElement.style.backgroundColor = 'var(--accent-color)';
    setTimeout(() => {
        drawnNumberElement.style.backgroundColor = 'var(--primary-color)';
    }, 500);

    historyListElement.innerHTML = ''; 
    if (drawnNumbers.length === 0) {
        historyListElement.innerHTML = 'Aguardando início do jogo.';
        return;
    }
    drawnNumbers.forEach(num => {
        const numElement = document.createElement('div');
        numElement.textContent = num;
        historyListElement.appendChild(numElement);
    });
}

function initializeGame() {
    drawnNumbers = [];
    isGameStarted = false;
    drawnNumberElement.textContent = '?';
    historyListElement.innerHTML = 'Aguardando início do jogo.';
    
    if (myUsername) {
        startButton.style.display = 'block';
    } else {
        startButton.style.display = 'none';
    }
    
    // Gera a cartela e a envia para o servidor (se já estiver logado)
    generateCard(); 
}

function updatePlayerListDisplay(playerNames) {
    playerListElement.innerHTML = '';
    if (playerNames.length === 0) {
        playerListElement.textContent = 'Ninguém mais online.';
        return;
    }
    playerNames.forEach(name => {
        const div = document.createElement('div');
        div.textContent = name;
        if (name === myUsername) {
            div.classList.add('my-player'); // NOVO: Adiciona destaque ao seu nome
        }
        playerListElement.appendChild(div);
    });
}

// ----------------------------------------------------------------------
//                         EVENT LISTENERS
// ----------------------------------------------------------------------

// 1. Lógica de Login (Atualizado para enviar a cartela)
joinButton.addEventListener('click', () => {
    let username = usernameInput.value.trim();
    if (username.length >= 2) {
        myUsername = username;
        // Gera a primeira cartela ANTES de enviar o login
        generateCard();
        // NOVO: Envia nome + cartela para o servidor
        socket.emit('set_username_and_card', { username: myUsername, card: cardNumbers });
    } else {
        alert('Por favor, digite um nome de usuário com pelo menos 2 caracteres.');
    }
});

// 2. Botão Iniciar Jogo
startButton.addEventListener('click', () => {
    socket.emit('iniciar_jogo');
});

// NOVO: Botão Reiniciar
resetButton.addEventListener('click', () => {
    if (confirm("Tem certeza que deseja REINICIAR o jogo para TODOS?")) {
        socket.emit('reset_game');
    }
});

// 4. Ações do Jogo
generateCardButton.addEventListener('click', generateCard);

// ----------------------------------------------------------------------
//                       ESCURO DO SERVIDOR (SOCKET.IO)
// ----------------------------------------------------------------------

// 1. Confirmação de Login
socket.on('username_set', (name) => {
    loginScreen.style.display = 'none';
    gameContent.style.display = 'block';
    console.log(`Logado como: ${name}`);
    initializeGame(); 
});

// 2. Ouve o estado inicial (ao entrar)
socket.on('estado_inicial', (data) => {
    drawnNumbers = data.drawn || [];
    isGameStarted = data.gameStarted;
    updateDisplay(data.lastDrawn || '?');
    
    if (isGameStarted) {
        startButton.style.display = 'none';
        historyListElement.innerHTML = 'Jogo em andamento. Boa sorte!';
    } else if (myUsername) {
        startButton.style.display = 'block';
    }

    updatePlayerListDisplay(data.players);
    drawnNumbers.forEach(num => autoMarkCard(num)); 
});

// 3. Ouve atualização da lista de jogadores
socket.on('player_list_update', (playerNames) => {
    updatePlayerListDisplay(playerNames);
});

// 4. Ouve o início/fim do jogo
socket.on('game_state_update', (data) => {
    isGameStarted = data.gameStarted;
    if (isGameStarted) {
        startButton.style.display = 'none';
        historyListElement.innerHTML = 'Sorteio Automático iniciado...';
    }
});

// 5. Ouve o número sorteado
socket.on('numero_sorteado', (drawn) => {
    drawnNumbers.push(drawn);
    drawnNumbers.sort((a, b) => a - b);
    updateDisplay(drawn); 
    
    autoMarkCard(drawn);
});

// 6. Ouve o RESET do jogo (Ação do servidor)
socket.on('game_reset', () => {
    alert("O jogo foi reiniciado!");
    initializeGame(); // Reinicia o estado do cliente
});

// 7. Ouve a vitória (Confirmação do Servidor)
socket.on('vencedor', (data) => {
    // Exibe o vencedor na tela
    winStatusElement.textContent = `VENCEDOR: ${data.name}!`;
    winStatusElement.style.color = 'red';
    
    // NOVO: Feedback visual do vencedor
    if (data.name === myUsername) {
        alert(`BINGO CONFIRMADO! VOCÊ VENCEU!`);
    } else {
        alert(`FIM DE JOGO! O vencedor é ${data.name}.`);
    }
    
    isGameStarted = false;
    startButton.style.display = 'block';
});

// NOVO: Ouve a REJEIÇÃO do Bingo (Se for inválido)
socket.on('bingo_reject', (message) => {
    alert(`BINGO INVÁLIDO: ${message}`);
    winStatusElement.textContent = 'Sua Cartela'; // Volta ao status normal
    winStatusElement.style.color = '#333';
    hasClaimedBingo = false; // Permite tentar novamente
});

// Inicializa a página
document.addEventListener('DOMContentLoaded', () => {
    // Apenas garante que os elementos estejam prontos
});
