class CheckersGame {
  constructor() {
    this.board = [];
    this.currentPlayer = 'red';
    this.selectedPiece = null;
    this.validMoves = [];
    this.gameHistory = [];
    this.redScore = 0;
    this.blackScore = 0;
    this.gameActive = true;
    
 
    this.options = this.loadOptions();
    
    this.initializeBoard();
    this.setupEventListeners();
    this.updateDisplay();
  }

  loadOptions() {
    const savedOptions = localStorage.getItem('checkersOptions');
    if (savedOptions) {
      return JSON.parse(savedOptions);
    }
    // Default options
    return {
      gameMode: 'ai',
      boardSize: '8',
      difficulty: 'easy',
      soundEffects: true,
      backgroundMusic: false,
      theme: 'default',
      animationSpeed: 'normal',
      forcedCaptures: true,
      kingMoves: 'unlimited'
    };
  }

  applyTheme() {
    const theme = this.options.theme;
    const body = document.body;
    const gameContainer = document.querySelector('.game-container');
    
    body.className = '';
    gameContainer.className = 'game-container';
    
    // Apply theme
    switch (theme) {
      case 'classic':
        body.classList.add('theme-classic');
        break;
      case 'dark':
        body.classList.add('theme-dark');
        break;
      case 'nature':
        body.classList.add('theme-nature');
        break;
      default:
        break;
    }
  }

  applyAnimationSpeed() {
    const speed = this.options.animationSpeed;
    const root = document.documentElement;
    
    switch (speed) {
      case 'fast':
        root.style.setProperty('--transition-speed', '0.1s');
        break;
      case 'slow':
        root.style.setProperty('--transition-speed', '0.5s');
        break;
      default:
        root.style.setProperty('--transition-speed', '0.3s');
        break;
    }
  }

  playSound(soundType) {
    if (!this.options.soundEffects) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    switch (soundType) {
      case 'move':
        this.playTone(800, 0.1);
        break;
      case 'capture':
        this.playTone(400, 0.2);
        break;
      case 'king':
        this.playTone(1200, 0.3);
        break;
      case 'win':
        this.playTone(600, 0.5);
        break;
    }
  }

  playTone(frequency, duration) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }

  initializeBoard() {
    const boardSize = parseInt(this.options.boardSize);
    
   
    for (let row = 0; row < boardSize; row++) {
      this.board[row] = [];
      for (let col = 0; col < boardSize; col++) {
        this.board[row][col] = null;
      }
    }

   
    const piecesPerRow = Math.floor(boardSize / 2);
    const startRows = Math.floor(boardSize / 3);
    
   
    for (let row = 0; row < startRows; row++) {
      for (let col = 0; col < boardSize; col++) {
        if ((row + col) % 2 === 1) {
          this.board[row][col] = { color: 'black', isKing: false };
        }
      }
    }

    for (let row = boardSize - startRows; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if ((row + col) % 2 === 1) {
          this.board[row][col] = { color: 'red', isKing: false };
        }
      }
    }
  }

  setupEventListeners() {
    const boardElement = document.getElementById('game-board');
    const newGameBtn = document.getElementById('new-game-btn');
    const undoBtn = document.getElementById('undo-move-btn');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    this.applyTheme();
    this.applyAnimationSpeed();

    boardElement.addEventListener('click', (e) => {
      if (!this.gameActive) return;
      
      if (this.options.gameMode === 'ai' && this.currentPlayer === 'black') {
        return;
      }
      
      const square = e.target.closest('.square');
      if (!square) return;

      const row = parseInt(square.dataset.row);
      const col = parseInt(square.dataset.col);
      this.handleSquareClick(row, col);
    });

    newGameBtn.addEventListener('click', () => {
      this.newGame();
    });

    undoBtn.addEventListener('click', () => {
      this.undoMove();
    });

    modalCloseBtn.addEventListener('click', () => {
      this.hideModal();
      this.newGame();
    });
  }

  handleSquareClick(row, col) {
    const piece = this.board[row][col];
    
    if (piece && piece.color === this.currentPlayer) {
      this.selectPiece(row, col);
      this.playSound('move');
      return;
    }

    if (this.selectedPiece && this.isValidMove(row, col)) {
      this.makeMove(row, col);
      return;
    }
    this.clearSelection();
  }

  selectPiece(row, col) {
    this.clearSelection();
    this.selectedPiece = { row, col };
    this.validMoves = this.getValidMoves(row, col);
    
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    square.classList.add('selected');
    
    this.validMoves.forEach(move => {
      const moveSquare = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
      moveSquare.classList.add('valid-move');
    });
  }

  clearSelection() {
    this.selectedPiece = null;
    this.validMoves = [];
    
    document.querySelectorAll('.square').forEach(square => {
      square.classList.remove('selected', 'valid-move');
    });
  }

  getValidMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece) return [];

    const boardSize = parseInt(this.options.boardSize);
    const moves = [];
    
    let directions;
    if (piece.isKing) {
      if (this.options.kingMoves === 'limited') {
        directions = piece.color === 'red' ? [-1] : [1];
      } else {
        directions = [-1, 1];
      }
    } else {
      directions = piece.color === 'red' ? [-1] : [1];
    }

    for (const rowDir of directions) {
      for (const colDir of [-1, 1]) {
        const newRow = row + rowDir;
        const newCol = col + colDir;
        
        if (this.isValidPosition(newRow, newCol, boardSize) && !this.board[newRow][newCol]) {
          moves.push({ row: newRow, col: newCol, type: 'move' });
        }
      }
    }


    for (const rowDir of directions) {
      for (const colDir of [-1, 1]) {
        const jumpRow = row + rowDir * 2;
        const jumpCol = col + colDir * 2;
        const middleRow = row + rowDir;
        const middleCol = col + colDir;
        
        if (this.isValidPosition(jumpRow, jumpCol, boardSize) && 
            !this.board[jumpRow][jumpCol] &&
            this.board[middleRow][middleCol] &&
            this.board[middleRow][middleCol].color !== piece.color) {
          moves.push({ row: jumpRow, col: jumpCol, type: 'jump', captured: { row: middleRow, col: middleCol } });
        }
      }
    }

    if (this.options.forcedCaptures) {
      const jumps = moves.filter(m => m.type === 'jump');
      if (jumps.length > 0) {
        return jumps;
      }
    }

    return moves;
  }

  isValidPosition(row, col, boardSize) {
    return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
  }

  isValidMove(row, col) {
    return this.validMoves.some(move => move.row === row && move.col === col);
  }

  makeMove(toRow, toCol) {
    const move = this.validMoves.find(m => m.row === toRow && m.col === toCol);
    if (!move) return;

    const fromRow = this.selectedPiece.row;
    const fromCol = this.selectedPiece.col;
    const piece = this.board[fromRow][fromCol];

    this.gameHistory.push({
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece: { ...piece },
      captured: move.captured ? { ...this.board[move.captured.row][move.captured.col] } : null
    });

    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;

    // Remove captured piece
    if (move.captured) {
      this.board[move.captured.row][move.captured.col] = null;
      if (move.captured.color === 'red') {
        this.blackScore++;
        console.log(`Red piece captured! Black score: ${this.blackScore}`);
      } else {
        this.redScore++;
        console.log(`Black piece captured! Red score: ${this.redScore}`);
      }
      this.playSound('capture');
    } else {
      this.playSound('move');
    }

    const boardSize = parseInt(this.options.boardSize);
    if ((piece.color === 'red' && toRow === 0) || (piece.color === 'black' && toRow === boardSize - 1)) {
      piece.isKing = true;
      this.playSound('king');
    }
    const additionalJumps = this.getValidMoves(toRow, toCol).filter(m => m.type === 'jump');
    
    if (move.type === 'jump' && additionalJumps.length > 0) {
      this.selectedPiece = { row: toRow, col: toCol };
      this.validMoves = additionalJumps;
      this.renderBoard();
      this.updateDisplay();
      return;
    }

    this.switchTurn();
  }

  isGameOver() {
    const boardSize = parseInt(this.options.boardSize);
    const redPieces = this.countPieces('red');
    const blackPieces = this.countPieces('black');
    
    return redPieces === 0 || blackPieces === 0 || !this.hasValidMoves();
  }

  countPieces(color) {
    const boardSize = parseInt(this.options.boardSize);
    let count = 0;
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (this.board[row][col] && this.board[row][col].color === color) {
          count++;
        }
      }
    }
    return count;
  }

  hasValidMoves() {
    const boardSize = parseInt(this.options.boardSize);
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color === this.currentPlayer) {
          if (this.getValidMoves(row, col).length > 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  endGame() {
    this.gameActive = false;
    const winner = this.currentPlayer === 'red' ? 'Black' : 'Red';
    this.playSound('win');
    this.showModal('Game Over', `${winner} wins!`);
  }

  newGame() {
    this.board = [];
    this.currentPlayer = 'red';
    this.selectedPiece = null;
    this.validMoves = [];
    this.gameHistory = [];
    this.redScore = 0;
    this.blackScore = 0;
    this.gameActive = true;
    this.options = this.loadOptions();
    this.initializeBoard();
    this.applyTheme();
    this.applyAnimationSpeed();
    this.renderBoard();
    this.recalculateScores();
    this.updateDisplay();
    if (this.options.gameMode === 'ai' && this.currentPlayer === 'black') {
      setTimeout(() => {
        this.makeAIMove();
      }, 1000);
    }
  }

  undoMove() {
    if (this.gameHistory.length === 0) return;
    
    const lastMove = this.gameHistory.pop();
    this.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
    this.board[lastMove.to.row][lastMove.to.col] = null;
    if (lastMove.captured) {
      this.board[lastMove.captured.row][lastMove.captured.col] = lastMove.captured;
    }
    this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
    this.clearSelection();
    this.renderBoard();
    this.updateDisplay();
  }

  renderBoard() {
    const boardElement = document.getElementById('game-board');
    const boardSize = parseInt(this.options.boardSize);
    boardElement.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
    boardElement.style.gridTemplateRows = `repeat(${boardSize}, 1fr)`;
    const baseSize = 400;
    const sizeMultiplier = boardSize / 8;
    const newSize = baseSize * sizeMultiplier;
    boardElement.style.width = `${newSize}px`;
    boardElement.style.height = `${newSize}px`;
    
    boardElement.innerHTML = '';

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const square = document.createElement('div');
        square.classList.add('square');
        square.dataset.row = row;
        square.dataset.col = col;
        
        if ((row + col) % 2 === 0) {
          square.classList.add('light');
        } else {
          square.classList.add('dark');
          
          const piece = this.board[row][col];
          if (piece) {
            const pieceElement = document.createElement('div');
            pieceElement.classList.add('piece', piece.color);
            if (piece.isKing) {
              pieceElement.classList.add('king');
            }
            square.appendChild(pieceElement);
          }
        }
        
        boardElement.appendChild(square);
      }
    }
  }

  updateDisplay() {
    const gameMode = this.options.gameMode === 'ai' ? 'vs AI' : 'vs Human';
    const currentPlayerText = this.currentPlayer === 'red' ? 'Red' : 'Black';
    
    document.getElementById('current-player').textContent = `${currentPlayerText}'s Turn (${gameMode})`;
    document.querySelector('.red-score').textContent = `Red: ${this.redScore}`;
    document.querySelector('.black-score').textContent = `Black: ${this.blackScore}`;
    
    const undoBtn = document.getElementById('undo-move-btn');
    undoBtn.disabled = this.gameHistory.length === 0;
  }

  recalculateScores() {
    const redPiecesRemaining = this.countPieces('red');
    const blackPiecesRemaining = this.countPieces('black');
    const boardSize = parseInt(this.options.boardSize);
    const startRows = Math.floor(boardSize / 3);
    const piecesPerRow = Math.floor(boardSize / 2);
    const startingPieces = startRows * piecesPerRow;
    this.redScore = startingPieces - blackPiecesRemaining;
    this.blackScore = startingPieces - redPiecesRemaining;
    
    console.log(`Board size: ${boardSize}, Starting pieces: ${startingPieces}`);
    console.log(`Red remaining: ${redPiecesRemaining}, Black remaining: ${blackPiecesRemaining}`);
    console.log(`Recalculated scores - Red: ${this.redScore}, Black: ${this.blackScore}`);
  }

  showModal(title, message) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('game-modal').style.display = 'flex';
  }

  hideModal() {
    document.getElementById('game-modal').style.display = 'none';
  }

  calculateAIMove() {
    const boardSize = parseInt(this.options.boardSize);
    const difficulty = this.options.difficulty;
    const aiColor = 'black';
    let bestMove = null;
    let bestScore = -Infinity;
    const allMoves = [];
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color === aiColor) {
          const moves = this.getValidMoves(row, col);
          moves.forEach(move => {
            allMoves.push({
              from: { row, col },
              to: { row: move.row, col: move.col },
              type: move.type,
              captured: move.captured
            });
          });
        }
      }
    }

    if (allMoves.length === 0) return null;
    const captures = allMoves.filter(move => move.type === 'jump');
    if (captures.length > 0) {
      allMoves.splice(0, allMoves.length, ...captures);
    }

    // Simple AI logic 
    switch (difficulty) {
      case 'easy':
        bestMove = allMoves[Math.floor(Math.random() * allMoves.length)];
        break;
      case 'medium':
        bestMove = this.getMediumAIMove(allMoves);
        break;
      case 'hard':
        bestMove = this.getHardAIMove(allMoves);
        break;
      default:
        bestMove = allMoves[0];
    }

    return bestMove;
  }

  getMediumAIMove(moves) {
    const captures = moves.filter(move => move.type === 'jump');
    if (captures.length > 0) {
      return captures[Math.floor(Math.random() * captures.length)];
    }

    const kingMoves = moves.filter(move => {
      const piece = this.board[move.from.row][move.from.col];
      return piece && piece.isKing;
    });

    if (kingMoves.length > 0) {
      return kingMoves[Math.floor(Math.random() * kingMoves.length)];
    }

    return moves[Math.floor(Math.random() * moves.length)];
  }

  getHardAIMove(moves) {
    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      let score = 0;
      if (move.type === 'jump') {
        score += 10;
      }
      const piece = this.board[move.from.row][move.from.col];
      if (piece && piece.isKing) {
        score += 5;
      }
      if (move.to.row > move.from.row) {
        score += 2;
      }
      const distanceToPromotion = move.to.row;
      score += (8 - distanceToPromotion);
      
      if (this.isPositionSafe(move.to.row, move.to.col)) {
        score += 3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  isPositionSafe(row, col) {
    const boardSize = parseInt(this.options.boardSize);
    for (let rowDir of [-1, 1]) {
      for (let colDir of [-1, 1]) {
        const attackerRow = row + rowDir;
        const attackerCol = col + colDir;
        const jumpRow = row - rowDir;
        const jumpCol = col - colDir;
        
        if (this.isValidPosition(attackerRow, attackerCol, boardSize) && 
            this.isValidPosition(jumpRow, jumpCol, boardSize)) {
          const attacker = this.board[attackerRow][attackerCol];
          const jumpSpace = this.board[jumpRow][jumpCol];
          
          if (attacker && attacker.color === 'red' && !jumpSpace) {
            return false; 
          }
        }
      }
    }
    
    return true;
  }

  makeAIMove() {
    if (this.options.gameMode !== 'ai' || this.currentPlayer !== 'black') {
      return;
    }

    const aiMove = this.calculateAIMove();
    if (!aiMove) {
      this.endGame();
      return;
    }

    const boardElement = document.getElementById('game-board');
    boardElement.classList.add('ai-thinking');
    
    setTimeout(() => {
      boardElement.classList.remove('ai-thinking');
      this.executeAIMove(aiMove);
    }, 800);
  }

  executeAIMove(aiMove) {
    const fromRow = aiMove.from.row;
    const fromCol = aiMove.from.col;
    const toRow = aiMove.to.row;
    const toCol = aiMove.to.col;
    const piece = this.board[fromRow][fromCol];
    
    this.gameHistory.push({
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece: { ...piece },
      captured: aiMove.captured ? { ...this.board[aiMove.captured.row][aiMove.captured.col] } : null
    });

    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = null;

    if (aiMove.captured) {
      this.board[aiMove.captured.row][aiMove.captured.col] = null;
      if (aiMove.captured.color === 'red') {
        this.blackScore++;
      } else {
        this.redScore++;
      }
      this.playSound('capture');
    } else {
      this.playSound('move');
    }

    const boardSize = parseInt(this.options.boardSize);
    if ((piece.color === 'black' && toRow === boardSize - 1)) {
      piece.isKing = true;
      this.playSound('king');
    }

    const additionalJumps = this.getValidMoves(toRow, toCol).filter(m => m.type === 'jump');
    
    if (aiMove.type === 'jump' && additionalJumps.length > 0) {
      setTimeout(() => {
        const nextMove = this.calculateAIMove();
        if (nextMove) {
          this.executeAIMove(nextMove);
        } else {
          this.switchTurn();
        }
      }, 300);
      return;
    }

    this.switchTurn();
  }

  switchTurn() {
    this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
    this.clearSelection();
    this.renderBoard();
    this.updateDisplay();
    
    if (this.isGameOver()) {
      this.endGame();
      return;
    }

    if (this.options.gameMode === 'ai' && this.currentPlayer === 'black') {
      setTimeout(() => {
        this.makeAIMove();
      }, 500);
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  window.checkersGame = new CheckersGame();
});
