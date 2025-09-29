// public/script.js - Versão Completa e Corrigida

const socket = io(); 

// --- Variáveis e Constantes ---
const MAX_NUMBER = 75;
const NUMBERS_PER_COLUMN = 15;
const COLUMN_NAMES = ['B', 'I', 'N', 'G', 'O'];

let drawnNumbers = [];
let cardNumbers = {};
let myUsername = '';
let isGameStarted = false;

// --- Elementos do DOM ---
const drawnNumberElement = document.getElementById('drawnNumber');
const historyListElement = document.getElementById('historyList');
const generateCardButton = document.getElementById('generateCardButton');
const resetButton = document.getElementById('resetButton');
const bingoCardElement = document.getElementById('bingoCard');
const winStatusElement = document.getElementById('winStatus');

// Elementos NOVO para Login/Controle
const loginScreen = document.getElementById('login-screen');
const usernameInput = document.getElementById('usernameInput');
const joinButton = document.getElementById('joinButton');
const gameContent = document.getElementById('game-content');
const playerListElement = document.getElementById('playerList');
const startButton = document.getElementById('startButton');


// ----------------------------------------------------------------------
//                       FUNÇÕES DA CARTELA (COMPLETAS)
// ----------------------------------------------------------------------

function generateCard() {
    cardNumbers = {};
    bingoCardElement.innerHTML = '<tr><th>B (1-15)</th><th>I (16-30)</th><th>N (31-45)</th><th>G (46-60)</th><th>O (61-75)</th></tr>';
    winStatusElement.textContent = 'Sua Cartela'; 
    winStatusElement.style.color = '#333';

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
    drawnNumbers.forEach(num => autoMarkCard(num));
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

function checkForWin() {
    const rows = bingoCardElement.rows;
    let isBingo = false;

    if (rows.length < 6) return; 
    const cells = Array.from(rows).slice(1).map(row => Array.from(row.cells));

    for (let i = 0; i < 5; i++) {
        const rowWin = cells[i].every(cell => cell.classList.contains('marked'));
        const colWin = cells.every(row => row[i].classList.contains('marked'));
        if (rowWin || colWin) { isBingo = true; break; }
    }
    const diag1Win = cells.every((row, i) => row[i].classList.contains('marked'));
    if (!isBingo && diag1Win) isBingo = true;

    const diag2Win = cells.every((row, i) => row[4 - i].classList.contains('marked'));
    if (!isBingo && diag2Win) isBingo = true;

    if (isBingo && winStatusElement.textContent !== 'BINGO! AGUARDANDO VERIFICAÇÃO...') {
        socket.emit('bingo', { playerId: socket.id, card: cardNumbers }); 
        winStatusElement.textContent = 'BINGO! AGUARDANDO VERIFICAÇÃO...';
        winStatusElement.style.color = 'blue';
    } else if (!isBingo && winStatusElement.textContent !== 'BINGO! AGUARDANDO VERIFICAÇÃO...') {
        winStatusElement.textContent = 'Sua Cartela';
        winStatusElement.style.color = '#333';
    }
}


// ----------------------------------------------------------------------
//                 FUNÇÕES DE INICIALIZAÇÃO E DISPLAY
// ----------------------------------------------------------------------

function updateDisplay(drawn) {
    drawnNumberElement.textContent = drawn;

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
    
    if (myUsername) { // Só mostra o botão de start se estiver logado
        startButton.style.display = 'block';
    } else {
        startButton.style.display = 'none';
    }
    
    generateCard(); 
}

// ----------------------------------------------------------------------
//                         EVENT LISTENERS
// ----------------------------------------------------------------------

// 1. Lógica de Login
joinButton.addEventListener('click', () => {
    let username = usernameInput.value.trim();
    if (username.length >= 2) {
        myUsername = username;
        // Envia o nome de usuário para o servidor
        socket.emit('set_username', myUsername);
    } else {
        alert('Por favor, digite um nome de usuário com pelo menos 2 caracteres.');
    }
});

// 2. Botão Iniciar Jogo
startButton.addEventListener('click', () => {
    socket.emit('iniciar_jogo');
    startButton.style.display = 'none';
});

// 3. Ações do Jogo
generateCardButton.addEventListener('click', generateCard);
resetButton.addEventListener('click', initializeGame);

// 4. Inicializa ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    // A inicialização aqui apenas prepara o DOM
    // O jogo real começa após o login.
});


// ----------------------------------------------------------------------
//                       ESCURO DO SERVIDOR (SOCKET.IO)
// ----------------------------------------------------------------------

// 1. Confirmação de Login
socket.on('username_set', (name) => {
    loginScreen.style.display = 'none';
    gameContent.style.display = 'block';
    console.log(`Logado como: ${name}`);
    
    // Inicia o jogo no cliente após o login
    initializeGame(); 
});

// 2. Ouve o estado inicial (ao entrar)
socket.on('estado_inicial', (data) => {
    drawnNumbers = data.drawn || [];
    isGameStarted = data.gameStarted;
    updateDisplay(data.lastDrawn || '?');
    
    if (isGameStarted) {
        startButton.style.display = 'none';
    } else if (myUsername) {
        startButton.style.display = 'block';
    }

    updatePlayerListDisplay(data.players);
    // Marca na cartela (importante para quem está gerando a cartela depois)
    drawnNumbers.forEach(num => autoMarkCard(num)); 
});

// 3. Ouve atualização da lista de jogadores
socket.on('player_list_update', (playerNames) => {
    updatePlayerListDisplay(playerNames);
});

function updatePlayerListDisplay(playerNames) {
    playerListElement.innerHTML = '';
    if (playerNames.length === 0) {
        playerListElement.textContent = 'Ninguém mais online.';
        return;
    }
    playerNames.forEach(name => {
        const div = document.createElement('div');
        div.textContent = name;
        playerListElement.appendChild(div);
    });
}

// 4. Ouve o início/fim do jogo
socket.on('game_state_update', (data) => {
    isGameStarted = data.gameStarted;
    if (isGameStarted) {
        startButton.style.display = 'none';
        historyListElement.innerHTML = 'Jogo iniciado. Aguardando sorteio...';
    }
});

// 5. Ouve o número sorteado
socket.on('numero_sorteado', (drawn) => {
    // Adiciona número ao histórico
    drawnNumbers.push(drawn);
    drawnNumbers.sort((a, b) => a - b);
    updateDisplay(drawn); 
    
    // Marca na cartela
    autoMarkCard(drawn);
});

// 6. Ouve a vitória
socket.on('vencedor', (data) => {
    alert(`FIM DE JOGO! ${data.mensagem}`);
    winStatusElement.textContent = `VENCEDOR: ${data.name}!`;
    winStatusElement.style.color = 'red';
});
