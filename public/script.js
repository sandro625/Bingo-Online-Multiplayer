// script.js

// --- Configuração e Conexão Socket.IO ---
const socket = io(); 

// --- Constantes do Jogo ---
const MAX_NUMBER = 75;
const NUMBERS_PER_COLUMN = 15;
const COLUMN_NAMES = ['B', 'I', 'N', 'G', 'O'];

// --- Variáveis Globais (Local) ---
let drawnNumbers = [];
let cardNumbers = {}; // Armazena a estrutura da cartela

// --- Elementos do DOM ---
// É CRUCIAL que todos esses elementos existam no seu index.html
const drawnNumberElement = document.getElementById('drawnNumber');
const historyListElement = document.getElementById('historyList');
const drawButton = document.getElementById('drawButton');
const generateCardButton = document.getElementById('generateCardButton');
const resetButton = document.getElementById('resetButton');
const bingoCardElement = document.getElementById('bingoCard');
const winStatusElement = document.getElementById('winStatus');


// ----------------------------------------------------------------------
//                       FUNÇÕES DA CARTELA
// ----------------------------------------------------------------------

/**
 * Gera uma cartela de Bingo com números únicos por coluna.
 */
function generateCard() {
    cardNumbers = {};
    bingoCardElement.innerHTML = '<tr><th>B (1-15)</th><th>I (16-30)</th><th>N (31-45)</th><th>G (46-60)</th><th>O (61-75)</th></tr>';
    winStatusElement.textContent = 'Sua Cartela'; 
    winStatusElement.style.color = '#333';

    for (let i = 0; i < 5; i++) { // 5 linhas
        const row = bingoCardElement.insertRow(-1);
        
        for (let j = 0; j < 5; j++) { // 5 colunas
            const cell = row.insertCell(-1);
            const colIndex = j;
            
            const min = colIndex * NUMBERS_PER_COLUMN + 1;
            const max = (colIndex + 1) * NUMBERS_PER_COLUMN;
            
            let number;

            // Célula central (Livre)
            if (i === 2 && j === 2) {
                number = 'Livre';
                cell.textContent = number;
                cell.classList.add('marked');
                cell.style.cursor = 'default';
            } else {
                // Sorteia números únicos para a coluna
                const columnKey = COLUMN_NAMES[j];
                let columnUsedNumbers = cardNumbers[columnKey] || [];
                
                do {
                    number = Math.floor(Math.random() * (max - min + 1)) + min;
                } while (columnUsedNumbers.includes(number));

                columnUsedNumbers.push(number);
                cardNumbers[columnKey] = columnUsedNumbers;
                
                cell.textContent = number;
                cell.id = `cell-${number}`; // ID crucial para o autoMarkCard
                cell.addEventListener('click', () => markCard(number, cell));
            }
        }
    }
    
    // Após gerar, marca os números que já foram sorteados
    drawnNumbers.forEach(num => autoMarkCard(num));
    console.log('Nova Cartela Gerada com sucesso.');
}

/**
 * Marca automaticamente o número sorteado na cartela, se ele existir.
 */
function autoMarkCard(number) {
    const cell = document.getElementById(`cell-${number}`);
    if (cell && !cell.classList.contains('marked')) {
        cell.classList.add('marked');
        checkForWin(); // Verifica a vitória após a marcação automática
    }
}

/**
 * Permite marcação manual APENAS se o número tiver sido sorteado.
 */
function markCard(number, cell) {
    if (drawnNumbers.includes(parseInt(number)) && !cell.classList.contains('marked')) {
        cell.classList.add('marked');
        checkForWin();
    } else if (!drawnNumbers.includes(parseInt(number)) && number !== 'Livre') {
        alert(`O número ${number} ainda não foi sorteado!`);
    }
}

/**
 * Verifica se o jogador fez Bingo (linha, coluna ou diagonal completa) e notifica o servidor.
 */
function checkForWin() {
    const rows = bingoCardElement.rows;
    let isBingo = false;

    // Se a tabela não foi gerada ou está vazia, retorna
    if (rows.length < 6) return; 

    // Converte a cartela para uma matriz de células
    const cells = Array.from(rows).slice(1).map(row => Array.from(row.cells));

    // 1. Verificar Linhas e Colunas
    for (let i = 0; i < 5; i++) {
        const rowWin = cells[i].every(cell => cell.classList.contains('marked'));
        const colWin = cells.every(row => row[i].classList.contains('marked'));
        
        if (rowWin || colWin) {
            isBingo = true;
            break;
        }
    }

    // 2. Verificar Diagonais
    const diag1Win = cells.every((row, i) => row[i].classList.contains('marked'));
    if (!isBingo && diag1Win) isBingo = true;

    const diag2Win = cells.every((row, i) => row[4 - i].classList.contains('marked'));
    if (!isBingo && diag2Win) isBingo = true;

    if (isBingo && winStatusElement.textContent !== 'BINGO! AGUARDANDO VERIFICAÇÃO...') {
        // AVISAR O SERVIDOR QUE FOI BINGO!
        socket.emit('bingo', { playerId: socket.id, card: cardNumbers }); 
        winStatusElement.textContent = 'BINGO! AGUARDANDO VERIFICAÇÃO...';
        winStatusElement.style.color = 'blue';
    } else if (!isBingo && winStatusElement.textContent !== 'BINGO! AGUARDANDO VERIFICAÇÃO...') {
        winStatusElement.textContent = 'Sua Cartela';
        winStatusElement.style.color = '#333';
    }
}


// ----------------------------------------------------------------------
//                  FUNÇÕES DE INICIALIZAÇÃO E DISPLAY
// ----------------------------------------------------------------------

/**
 * Atualiza o número exibido e a lista de histórico.
 */
function updateDisplay(drawn) {
    // Exibe o último número sorteado
    drawnNumberElement.textContent = drawn;

    // Atualiza a lista de histórico
    historyListElement.innerHTML = ''; 
    if (drawnNumbers.length === 0) {
        historyListElement.innerHTML = 'Nenhum número sorteado ainda.';
        return;
    }
    drawnNumbers.forEach(num => {
        const numElement = document.createElement('div');
        numElement.textContent = num;
        historyListElement.appendChild(numElement);
    });
}

/**
 * Prepara o estado inicial do cliente e gera a cartela.
 */
function initializeGame() {
    drawnNumbers = [];
    drawnNumberElement.textContent = '?';
    historyListElement.innerHTML = 'Nenhum número sorteado ainda.';
    drawButton.disabled = false;
    
    // GERAÇÃO DA CARTELA
    generateCard(); 
    
    console.log('Cliente pronto.');
}


// ----------------------------------------------------------------------
//                         EVENT LISTENERS
// ----------------------------------------------------------------------

// AÇÃO 1: Botão de Sortear (Envia comando ao servidor)
drawButton.addEventListener('click', () => {
    socket.emit('sortear');
    drawButton.disabled = true;
});

// AÇÃO 2: Botão de Reiniciar (Gera nova cartela e limpa o estado local)
// Note que o sorteio em si só é reiniciado pelo servidor
resetButton.addEventListener('click', initializeGame);

// AÇÃO 3: Botão de Gerar Nova Cartela
generateCardButton.addEventListener('click', generateCard);

// Inicializa a página assim que o DOM estiver carregado
document.addEventListener('DOMContentLoaded', initializeGame);


// ----------------------------------------------------------------------
//                       ESCURO DO SERVIDOR (SOCKET.IO)
// ----------------------------------------------------------------------

// 1. Ouve o estado inicial ao entrar no jogo (o servidor envia isso)
socket.on('estado_inicial', (data) => {
    drawnNumbers = data.drawn || [];
    if (data.lastDrawn) {
        updateDisplay(data.lastDrawn);
    } else {
        updateDisplay('?');
    }
    // Marca na cartela nova os números já sorteados
    drawnNumbers.forEach(num => autoMarkCard(num));
    console.log('Estado inicial do jogo carregado.');
});

// 2. Ouve o número sorteado pelo Servidor
socket.on('numero_sorteado', (drawn) => {
    drawButton.disabled = false; 
    
    // Armazena e atualiza a interface localmente
    drawnNumbers.push(drawn);
    drawnNumbers.sort((a, b) => a - b);
    updateDisplay(drawn); 
    
    // Marca na cartela localmente e verifica vitória
    autoMarkCard(drawn);
});

// 3. Ouve a vitória de outro jogador ou a confirmação de vitória
socket.on('vencedor', (data) => {
    // Geralmente o servidor enviaria 'VENCEDOR CONFIRMADO' ou 'BINGO INVÁLIDO'
    if (data.id === socket.id) {
         winStatusElement.textContent = 'BINGO! VOCÊ GANHOU!';
    } else {
        winStatusElement.textContent = `VENCEDOR: Jogador ${data.id.substring(0, 4)}!`;
    }
    alert(`FIM DE JOGO! ${data.mensagem}`);
    winStatusElement.style.color = 'red';
});