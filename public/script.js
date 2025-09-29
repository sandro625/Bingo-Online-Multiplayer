// public/script.js - CÓDIGO ATUALIZADO

const socket = io(); 

// --- Variáveis e Constantes (Mantidas) ---
const MAX_NUMBER = 75;
const NUMBERS_PER_COLUMN = 15;
const COLUMN_NAMES = ['B', 'I', 'N', 'G', 'O'];

let drawnNumbers = [];
let cardNumbers = {};
let myUsername = '';
let isGameStarted = false;

// --- Elementos do DOM (Novos e Atualizados) ---
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
//                       FUNÇÕES DA CARTELA (Mantidas)
// ----------------------------------------------------------------------
// ... (Copie e cole aqui as funções generateCard(), autoMarkCard(), markCard(), e checkForWin() do seu código anterior)

// EXEMPLO de generateCard para lembrar de incluir:
function generateCard() {
    // ... lógica de gerar a cartela no bingoCardElement ...
    // É crucial que esta função esteja aqui!
}
// ----------------------------------------------------------------------


// ----------------------------------------------------------------------
//                 FUNÇÕES DE INICIALIZAÇÃO E DISPLAY
// ----------------------------------------------------------------------

function updateDisplay(drawn) {
    // ... (Mantido: Lógica para atualizar o número sorteado e o histórico) ...
}

function initializeGame() {
    // Esta função é chamada ao reiniciar
    drawnNumbers = [];
    isGameStarted = false;
    drawnNumberElement.textContent = '?';
    historyListElement.innerHTML = 'Aguardando início do jogo.';
    
    // O botão 'Iniciar' é re-exibido quando o jogo está pronto
    if (myUsername) {
        startButton.style.display = 'block';
    }
    
    // Gerar cartela padrão
    generateCard(); 
}

// ----------------------------------------------------------------------
//                         EVENT LISTENERS
// ----------------------------------------------------------------------

// NOVO: Lógica de Login
joinButton.addEventListener('click', () => {
    let username = usernameInput.value.trim();
    if (username.length > 2) {
        myUsername = username;
        // Envia o nome de usuário para o servidor
        socket.emit('set_username', myUsername);
    } else {
        alert('Por favor, digite um nome de usuário válido.');
    }
});

// NOVO: Botão Iniciar Jogo
startButton.addEventListener('click', () => {
    // Envia o comando para o SERVIDOR iniciar o sorteio automático
    socket.emit('iniciar_jogo');
    startButton.style.display = 'none'; // Esconde o botão após o clique
});

// AÇÕES DO JOGO
generateCardButton.addEventListener('click', generateCard);
resetButton.addEventListener('click', initializeGame);


// ----------------------------------------------------------------------
//                       ESCURO DO SERVIDOR (SOCKET.IO)
// ----------------------------------------------------------------------

// 1. Confirmação de Login
socket.on('username_set', (name) => {
    loginScreen.style.display = 'none';
    gameContent.style.display = 'block';
    console.log(`Logado como: ${name}`);
    // Exibe o botão de início
    startButton.style.display = 'block';
});

// 2. Ouve o estado inicial (ao entrar)
socket.on('estado_inicial', (data) => {
    drawnNumbers = data.drawn || [];
    isGameStarted = data.gameStarted;
    updateDisplay(data.lastDrawn || '?');
    
    // Se o jogo já estiver rolando, esconde o botão de início
    if (isGameStarted) {
        startButton.style.display = 'none';
    } else if (myUsername) {
        startButton.style.display = 'block';
    }

    // Atualiza a lista de jogadores ao entrar
    updatePlayerListDisplay(data.players);
    drawnNumbers.forEach(num => autoMarkCard(num));
});

// 3. Ouve atualização da lista de jogadores
socket.on('player_list_update', (playerNames) => {
    updatePlayerListDisplay(playerNames);
});

// NOVO: Função auxiliar para atualizar a lista
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
        console.log("Servidor iniciou o sorteio automático!");
    }
});

// 5. Ouve o número sorteado (Mantido)
socket.on('numero_sorteado', (drawn) => {
    // ... (Lógica de adicionar número ao histórico e marcar cartela) ...
});

// 6. Ouve a vitória (Atualizado para mostrar o nome)
socket.on('vencedor', (data) => {
    alert(`FIM DE JOGO! ${data.mensagem}`);
    winStatusElement.textContent = `VENCEDOR: ${data.name}!`;
    winStatusElement.style.color = 'red';
});


// Inicializa a página
document.addEventListener('DOMContentLoaded', () => {
    // Se o usuário já tiver o nome definido (em um cenário mais complexo), pularia o login.
    // Neste caso, apenas gera a cartela ao carregar.
    generateCard(); 
});
