const PIECES = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};

const PIECE_VALUES = { K: 20000, Q: 900, R: 500, B: 330, N: 320, P: 100 };
const MATE_SCORE = 1000000;

const PST = {
  P: [
    [0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],
    [0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]
  ],
  N: [
    [-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],
    [-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  B: [
    [-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],
    [-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],[-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  R: [
    [0,0,0,5,5,0,0,0],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],[-5,0,0,0,0,0,0,-5],[5,10,10,10,10,10,10,5],[0,0,0,0,0,0,0,0]
  ],
  Q: [
    [-20,-10,-10,-5,-5,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,5,5,5,0,-10],[-5,0,5,5,5,5,0,-5],
    [0,0,5,5,5,5,0,-5],[-10,5,5,5,5,5,0,-10],[-10,0,5,0,0,0,0,-10],[-20,-10,-10,-5,-5,-10,-10,-20]
  ],
  K: [
    [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],[20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]
  ]
};

const boardEl = document.getElementById('board');
const statusText = document.getElementById('statusText');
const turnText = document.getElementById('turnText');
const lastMoveText = document.getElementById('lastMoveText');
const moveHistoryEl = document.getElementById('moveHistory');
const modeSelect = document.getElementById('modeSelect');
const difficultySelect = document.getElementById('difficultySelect');
const playerColorSelect = document.getElementById('playerColorSelect');
const orientationSelect = document.getElementById('orientationSelect');
const newGameBtn = document.getElementById('newGameBtn');
const undoBtn = document.getElementById('undoBtn');
const flipBtn = document.getElementById('flipBtn');
const soundToggle = document.getElementById('soundToggle');
const toastEl = document.getElementById('toast');
const resultModal = document.getElementById('resultModal');
const resultTitle = document.getElementById('resultTitle');
const resultSubtitle = document.getElementById('resultSubtitle');
const modalNewGameBtn = document.getElementById('modalNewGameBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');

const game = {
  turn: 'w',
  selected: null,
  legalMovesForSelected: [],
  history: [],
  mode: 'ai',
  playerColor: 'w',
  aiThinking: false,
  orientation: 'w',
  lastMove: null,
  result: null,
  modalShown: false,
  soundsEnabled: true,
  justMoved: false,
};

let audioContext = null;
let state = createInitialState();

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function createInitialState() {
  const order = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c += 1) {
    board[0][c] = { color: 'b', type: order[c] };
    board[1][c] = { color: 'b', type: 'P' };
    board[6][c] = { color: 'w', type: 'P' };
    board[7][c] = { color: 'w', type: order[c] };
  }
  return {
    board,
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
    lastMove: null,
  };
}

function resetGame() {
  state = createInitialState();
  game.turn = state.turn;
  game.selected = null;
  game.legalMovesForSelected = [];
  game.history = [];
  game.lastMove = null;
  game.result = null;
  game.modalShown = false;
  game.justMoved = false;
  game.mode = modeSelect.value;
  game.playerColor = playerColorSelect.value;
  updateOrientation();
  hideResultModal();
  render();
  maybeAIMove();
}

function updateOrientation() {
  const choice = orientationSelect.value;
  game.orientation = choice === 'auto' ? game.playerColor : choice;
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function opponent(color) {
  return color === 'w' ? 'b' : 'w';
}

function squareName(r, c) {
  return 'abcdefgh'[c] + (8 - r);
}

function findKing(board, color) {
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r][c];
      if (piece && piece.color === color && piece.type === 'K') return { r, c };
    }
  }
  return null;
}

function isSquareAttacked(board, row, col, byColor) {
  const pawnDir = byColor === 'w' ? -1 : 1;
  for (const dc of [-1, 1]) {
    const r = row - pawnDir;
    const c = col + dc;
    if (inBounds(r, c)) {
      const piece = board[r][c];
      if (piece && piece.color === byColor && piece.type === 'P') return true;
    }
  }

  const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of knightOffsets) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c)) {
      const piece = board[r][c];
      if (piece && piece.color === byColor && piece.type === 'N') return true;
    }
  }

  const bishopDirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const rookDirs = [[-1,0],[1,0],[0,-1],[0,1]];

  for (const [dr, dc] of bishopDirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const piece = board[r][c];
      if (piece) {
        if (piece.color === byColor && (piece.type === 'B' || piece.type === 'Q')) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  for (const [dr, dc] of rookDirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const piece = board[r][c];
      if (piece) {
        if (piece.color === byColor && (piece.type === 'R' || piece.type === 'Q')) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const r = row + dr;
      const c = col + dc;
      if (inBounds(r, c)) {
        const piece = board[r][c];
        if (piece && piece.color === byColor && piece.type === 'K') return true;
      }
    }
  }

  return false;
}

function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king.r, king.c, opponent(color));
}

function generatePseudoMoves(st, row, col) {
  const board = st.board;
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const addMove = (toRow, toCol, extra = {}) => {
    if (!inBounds(toRow, toCol)) return;
    const target = board[toRow][toCol];
    if (!target || target.color !== piece.color) {
      moves.push({
        fromRow: row,
        fromCol: col,
        toRow,
        toCol,
        piece: piece.type,
        color: piece.color,
        capture: !!target,
        ...extra,
      });
    }
  };

  if (piece.type === 'P') {
    const dir = piece.color === 'w' ? -1 : 1;
    const startRow = piece.color === 'w' ? 6 : 1;
    const promoteRow = piece.color === 'w' ? 0 : 7;

    if (inBounds(row + dir, col) && !board[row + dir][col]) {
      if (row + dir === promoteRow) addMove(row + dir, col, { promotion: 'Q' });
      else addMove(row + dir, col);
      if (row === startRow && !board[row + 2 * dir][col]) addMove(row + 2 * dir, col, { pawnDouble: true });
    }

    for (const dc of [-1, 1]) {
      const r = row + dir;
      const c = col + dc;
      if (!inBounds(r, c)) continue;
      const target = board[r][c];
      if (target && target.color !== piece.color) {
        if (r === promoteRow) addMove(r, c, { capture: true, promotion: 'Q' });
        else addMove(r, c, { capture: true });
      }
    }

    if (st.enPassant && row + dir === st.enPassant.row && Math.abs(col - st.enPassant.col) === 1) {
      moves.push({
        fromRow: row,
        fromCol: col,
        toRow: st.enPassant.row,
        toCol: st.enPassant.col,
        piece: 'P',
        color: piece.color,
        enPassant: true,
        capture: true,
      });
    }
  }

  if (piece.type === 'N') {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      addMove(row + dr, col + dc);
    }
  }

  if (piece.type === 'B' || piece.type === 'R' || piece.type === 'Q') {
    const dirs = [];
    if (piece.type === 'B' || piece.type === 'Q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
    if (piece.type === 'R' || piece.type === 'Q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);

    for (const [dr, dc] of dirs) {
      let r = row + dr;
      let c = col + dc;
      while (inBounds(r, c)) {
        const target = board[r][c];
        if (!target) {
          moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c, piece: piece.type, color: piece.color, capture: false });
        } else {
          if (target.color !== piece.color) {
            moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c, piece: piece.type, color: piece.color, capture: true });
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
  }

  if (piece.type === 'K') {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (!dr && !dc) continue;
        addMove(row + dr, col + dc);
      }
    }

    const enemy = opponent(piece.color);
    if (!isSquareAttacked(board, row, col, enemy)) {
      if (piece.color === 'w' && row === 7 && col === 4) {
        if (st.castling.wK && !board[7][5] && !board[7][6] && !isSquareAttacked(board, 7, 5, enemy) && !isSquareAttacked(board, 7, 6, enemy)) {
          moves.push({ fromRow: 7, fromCol: 4, toRow: 7, toCol: 6, piece: 'K', color: 'w', castle: 'K' });
        }
        if (st.castling.wQ && !board[7][1] && !board[7][2] && !board[7][3] && !isSquareAttacked(board, 7, 3, enemy) && !isSquareAttacked(board, 7, 2, enemy)) {
          moves.push({ fromRow: 7, fromCol: 4, toRow: 7, toCol: 2, piece: 'K', color: 'w', castle: 'Q' });
        }
      }
      if (piece.color === 'b' && row === 0 && col === 4) {
        if (st.castling.bK && !board[0][5] && !board[0][6] && !isSquareAttacked(board, 0, 5, enemy) && !isSquareAttacked(board, 0, 6, enemy)) {
          moves.push({ fromRow: 0, fromCol: 4, toRow: 0, toCol: 6, piece: 'K', color: 'b', castle: 'K' });
        }
        if (st.castling.bQ && !board[0][1] && !board[0][2] && !board[0][3] && !isSquareAttacked(board, 0, 3, enemy) && !isSquareAttacked(board, 0, 2, enemy)) {
          moves.push({ fromRow: 0, fromCol: 4, toRow: 0, toCol: 2, piece: 'K', color: 'b', castle: 'Q' });
        }
      }
    }
  }

  return moves;
}

function applyMove(st, move) {
  const nextState = {
    board: cloneBoard(st.board),
    turn: opponent(st.turn),
    castling: { ...st.castling },
    enPassant: null,
    halfmove: st.halfmove + 1,
    fullmove: st.fullmove + (st.turn === 'b' ? 1 : 0),
    lastMove: move,
  };

  const piece = { ...nextState.board[move.fromRow][move.fromCol] };
  const target = nextState.board[move.toRow][move.toCol];
  nextState.board[move.fromRow][move.fromCol] = null;

  if (piece.type === 'P' || target || move.enPassant) nextState.halfmove = 0;

  if (move.enPassant) {
    const captureRow = move.color === 'w' ? move.toRow + 1 : move.toRow - 1;
    nextState.board[captureRow][move.toCol] = null;
  }

  if (move.castle) {
    if (move.color === 'w') {
      if (move.castle === 'K') {
        nextState.board[7][6] = piece;
        nextState.board[7][5] = nextState.board[7][7];
        nextState.board[7][7] = null;
      } else {
        nextState.board[7][2] = piece;
        nextState.board[7][3] = nextState.board[7][0];
        nextState.board[7][0] = null;
      }
      nextState.castling.wK = false;
      nextState.castling.wQ = false;
    } else {
      if (move.castle === 'K') {
        nextState.board[0][6] = piece;
        nextState.board[0][5] = nextState.board[0][7];
        nextState.board[0][7] = null;
      } else {
        nextState.board[0][2] = piece;
        nextState.board[0][3] = nextState.board[0][0];
        nextState.board[0][0] = null;
      }
      nextState.castling.bK = false;
      nextState.castling.bQ = false;
    }
  } else {
    if (move.promotion) piece.type = move.promotion;
    nextState.board[move.toRow][move.toCol] = piece;
  }

  if (piece.type === 'K') {
    if (piece.color === 'w') {
      nextState.castling.wK = false;
      nextState.castling.wQ = false;
    } else {
      nextState.castling.bK = false;
      nextState.castling.bQ = false;
    }
  }

  if (piece.type === 'R') {
    if (move.fromRow === 7 && move.fromCol === 0) nextState.castling.wQ = false;
    if (move.fromRow === 7 && move.fromCol === 7) nextState.castling.wK = false;
    if (move.fromRow === 0 && move.fromCol === 0) nextState.castling.bQ = false;
    if (move.fromRow === 0 && move.fromCol === 7) nextState.castling.bK = false;
  }

  if (target && target.type === 'R') {
    if (move.toRow === 7 && move.toCol === 0) nextState.castling.wQ = false;
    if (move.toRow === 7 && move.toCol === 7) nextState.castling.wK = false;
    if (move.toRow === 0 && move.toCol === 0) nextState.castling.bQ = false;
    if (move.toRow === 0 && move.toCol === 7) nextState.castling.bK = false;
  }

  if (piece.type === 'P' && Math.abs(move.toRow - move.fromRow) === 2) {
    nextState.enPassant = { row: (move.fromRow + move.toRow) / 2, col: move.fromCol };
  }

  return nextState;
}

function generateLegalMoves(st, color = st.turn) {
  const moves = [];
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = st.board[r][c];
      if (!piece || piece.color !== color) continue;
      for (const move of generatePseudoMoves(st, r, c)) {
        const nextState = applyMove(st, move);
        if (!isInCheck(nextState.board, color)) moves.push(move);
      }
    }
  }
  return moves;
}

function moveToSAN(move) {
  if (move.castle === 'K') return 'O-O';
  if (move.castle === 'Q') return 'O-O-O';
  const piece = move.piece === 'P' ? '' : move.piece;
  const capture = move.capture ? 'x' : '';
  const fromFile = 'abcdefgh'[move.fromCol];
  const to = squareName(move.toRow, move.toCol);
  const promo = move.promotion ? `=${move.promotion}` : '';
  if (move.piece === 'P') return `${move.capture ? `${fromFile}x` : ''}${to}${promo}`;
  return `${piece}${capture}${to}${promo}`;
}

function evaluateBoard(st) {
  let score = 0;
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = st.board[r][c];
      if (!piece) continue;
      const base = PIECE_VALUES[piece.type];
      const pstScore = piece.color === 'w' ? PST[piece.type][r][c] : PST[piece.type][7 - r][c];
      const value = base + pstScore;
      score += piece.color === 'w' ? value : -value;
    }
  }

  const currentMoves = generateLegalMoves(st, st.turn).length;
  if (currentMoves === 0) {
    if (isInCheck(st.board, st.turn)) return st.turn === 'w' ? -MATE_SCORE : MATE_SCORE;
    return 0;
  }

  score += generateLegalMoves(st, 'w').length * 2;
  score -= generateLegalMoves(st, 'b').length * 2;
  return score;
}

function sortMoves(st, moves) {
  return moves.slice().sort((a, b) => {
    const aTarget = st.board[a.toRow][a.toCol];
    const bTarget = st.board[b.toRow][b.toCol];
    const aScore = (a.capture ? 10 * (aTarget ? PIECE_VALUES[aTarget.type] : 100) - PIECE_VALUES[a.piece] : 0) + (a.promotion ? 800 : 0) + (a.castle ? 50 : 0);
    const bScore = (b.capture ? 10 * (bTarget ? PIECE_VALUES[bTarget.type] : 100) - PIECE_VALUES[b.piece] : 0) + (b.promotion ? 800 : 0) + (b.castle ? 50 : 0);
    return bScore - aScore;
  });
}

function minimax(st, depth, alpha, beta, maximizingForWhite) {
  const legalMoves = generateLegalMoves(st, st.turn);
  if (depth === 0 || legalMoves.length === 0) {
    return { score: evaluateBoard(st), move: null };
  }

  const ordered = sortMoves(st, legalMoves);
  let bestMove = ordered[0] || null;

  if (maximizingForWhite) {
    let maxEval = -Infinity;
    for (const move of ordered) {
      const evalResult = minimax(applyMove(st, move), depth - 1, alpha, beta, false);
      if (evalResult.score > maxEval) {
        maxEval = evalResult.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, evalResult.score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  }

  let minEval = Infinity;
  for (const move of ordered) {
    const evalResult = minimax(applyMove(st, move), depth - 1, alpha, beta, true);
    if (evalResult.score < minEval) {
      minEval = evalResult.score;
      bestMove = move;
    }
    beta = Math.min(beta, evalResult.score);
    if (beta <= alpha) break;
  }
  return { score: minEval, move: bestMove };
}

function getGameStateInfo(st) {
  const legalMoves = generateLegalMoves(st, st.turn);
  const inCheck = isInCheck(st.board, st.turn);
  if (legalMoves.length === 0) {
    if (inCheck) {
      const winner = st.turn === 'w' ? 'Đen' : 'Trắng';
      return {
        isOver: true,
        isCheckmate: true,
        winner,
        title: `${winner} thắng`,
        text: `Chiếu hết - ${winner} thắng`,
      };
    }
    return {
      isOver: true,
      isDraw: true,
      title: 'Ván cờ hòa',
      text: 'Hòa - hết nước đi hợp lệ',
    };
  }
  return { isOver: false, inCheck };
}

function render() {
  boardEl.innerHTML = '';
  const rows = game.orientation === 'w' ? [...Array(8).keys()] : [...Array(8).keys()].reverse();
  const cols = game.orientation === 'w' ? [...Array(8).keys()] : [...Array(8).keys()].reverse();
  const legalLookup = new Set(game.legalMovesForSelected.map((move) => `${move.toRow},${move.toCol}`));
  const kingPos = findKing(state.board, state.turn);
  const checkSquare = kingPos && isInCheck(state.board, state.turn) ? `${kingPos.r},${kingPos.c}` : null;

  rows.forEach((r, visualR) => {
    cols.forEach((c, visualC) => {
      const square = document.createElement('div');
      square.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
      if (game.selected && game.selected.row === r && game.selected.col === c) square.classList.add('selected');
      if (legalLookup.has(`${r},${c}`)) {
        square.classList.add('move-option');
        if (state.board[r][c]) square.classList.add('capture-option');
      }
      if (game.lastMove && ((game.lastMove.fromRow === r && game.lastMove.fromCol === c) || (game.lastMove.toRow === r && game.lastMove.toCol === c))) {
        square.classList.add('last-move');
      }
      if (checkSquare === `${r},${c}`) square.classList.add('in-check');
      square.dataset.row = r;
      square.dataset.col = c;

      const piece = state.board[r][c];
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.className = `piece ${piece.color === 'w' ? 'white' : 'black'}`;
        if (game.justMoved && game.lastMove && game.lastMove.toRow === r && game.lastMove.toCol === c) {
          pieceEl.classList.add('arrive');
        }
        pieceEl.textContent = PIECES[piece.color][piece.type];
        square.appendChild(pieceEl);
      }

      if (visualR === 7) {
        const file = document.createElement('span');
        file.className = 'coord file';
        file.textContent = 'abcdefgh'[c];
        square.appendChild(file);
      }

      if (visualC === 0) {
        const rank = document.createElement('span');
        rank.className = 'coord rank';
        rank.textContent = 8 - r;
        square.appendChild(rank);
      }

      square.addEventListener('click', handleSquareClick);
      boardEl.appendChild(square);
    });
  });

  turnText.textContent = state.turn === 'w' ? 'Trắng' : 'Đen';
  lastMoveText.textContent = game.lastMove ? moveToSAN(game.lastMove) : '-';
  updateStatus();
  renderHistory();
  game.justMoved = false;
}

function updateStatus() {
  if (game.aiThinking) {
    statusText.textContent = 'AI đang tính nước đi...';
    return;
  }

  const resultInfo = getGameStateInfo(state);
  if (resultInfo.isOver) {
    game.result = resultInfo.text;
    statusText.textContent = resultInfo.text;
    if (!game.modalShown) {
      game.modalShown = true;
      window.setTimeout(() => showResultModal(resultInfo), 140);
    }
    return;
  }

  game.result = null;
  game.modalShown = false;
  const colorName = state.turn === 'w' ? 'Trắng' : 'Đen';
  const aiTurn = game.mode === 'ai' && state.turn !== game.playerColor;
  statusText.textContent = aiTurn ? `Đến lượt AI (${colorName})` : `Đến lượt ${colorName}`;
}

function renderHistory() {
  moveHistoryEl.innerHTML = '';
  for (let i = 0; i < game.history.length; i += 2) {
    const row = document.createElement('div');
    row.className = 'move-row';

    const num = document.createElement('div');
    num.className = 'move-num';
    num.textContent = `${Math.floor(i / 2) + 1}.`;

    const white = document.createElement('div');
    white.className = 'move-cell';
    white.textContent = game.history[i]?.san || '';

    const black = document.createElement('div');
    black.className = 'move-cell';
    black.textContent = game.history[i + 1]?.san || '';

    row.append(num, white, black);
    moveHistoryEl.appendChild(row);
  }
  moveHistoryEl.scrollTop = moveHistoryEl.scrollHeight;
}

function canHumanPlay(color) {
  return game.mode === 'pvp' || color === game.playerColor;
}

function handleSquareClick(event) {
  if (game.aiThinking || game.result) return;
  const row = Number(event.currentTarget.dataset.row);
  const col = Number(event.currentTarget.dataset.col);
  if (!canHumanPlay(state.turn)) return;

  const piece = state.board[row][col];
  if (game.selected) {
    const chosenMove = game.legalMovesForSelected.find((move) => move.toRow === row && move.toCol === col);
    if (chosenMove) {
      makeMove(chosenMove);
      return;
    }
  }

  if (piece && piece.color === state.turn) {
    game.selected = { row, col };
    game.legalMovesForSelected = generateLegalMoves(state, state.turn).filter((move) => move.fromRow === row && move.fromCol === col);
  } else {
    game.selected = null;
    game.legalMovesForSelected = [];
  }

  render();
}

function makeMove(move) {
  const san = moveToSAN(move);
  state = applyMove(state, move);
  game.lastMove = move;
  game.history.push({ move, san });
  game.selected = null;
  game.legalMovesForSelected = [];
  game.turn = state.turn;
  game.justMoved = true;

  const resultInfo = getGameStateInfo(state);
  if (resultInfo.isOver) {
    playSound('gameover');
  } else if (resultInfo.inCheck) {
    playSound('check');
  } else if (move.castle) {
    playSound('castle');
  } else if (move.capture || move.enPassant) {
    playSound('capture');
  } else if (move.promotion) {
    playSound('promotion');
  } else {
    playSound('move');
  }

  render();
  maybeAIMove();
}

function maybeAIMove() {
  if (game.mode !== 'ai' || state.turn === game.playerColor || game.result) return;
  const depth = Number(difficultySelect.value);
  game.aiThinking = true;
  render();
  window.setTimeout(() => {
    const maximizingForWhite = state.turn === 'w';
    const result = minimax(state, depth, -Infinity, Infinity, maximizingForWhite);
    game.aiThinking = false;
    if (result.move) makeMove(result.move);
    else render();
  }, 90);
}

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toastEl.classList.add('hidden'), 1800);
}

function undoMove() {
  if (game.history.length === 0) return;
  const removeCount = game.mode === 'ai' ? Math.min(2, game.history.length) : 1;
  const remaining = game.history.slice(0, game.history.length - removeCount);
  state = createInitialState();
  game.history = [];
  game.lastMove = null;
  game.result = null;
  game.modalShown = false;
  game.selected = null;
  game.legalMovesForSelected = [];
  hideResultModal();

  for (const entry of remaining) {
    state = applyMove(state, entry.move);
    game.history.push({ move: entry.move, san: entry.san });
    game.lastMove = entry.move;
  }

  game.turn = state.turn;
  game.justMoved = false;
  render();
  showToast('Đã đi lại nước cờ');
  playSound('undo');
}

function showResultModal(resultInfo) {
  resultTitle.textContent = resultInfo.title;
  if (resultInfo.isCheckmate) {
    resultSubtitle.textContent = `${resultInfo.winner} đã kết thúc ván cờ bằng chiếu hết sau ${game.history.length} nửa nước.`;
  } else {
    resultSubtitle.textContent = `Không còn nước đi hợp lệ. Ván cờ kết thúc sau ${game.history.length} nửa nước.`;
  }
  resultModal.classList.remove('hidden');
  resultModal.setAttribute('aria-hidden', 'false');
}

function hideResultModal() {
  resultModal.classList.add('hidden');
  resultModal.setAttribute('aria-hidden', 'true');
}

function ensureAudioContext() {
  try {
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      audioContext = new AudioCtor();
    }
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

function tone(ctx, frequency, startAt, duration, type = 'sine', volume = 0.035) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.03);
}

function playPattern(pattern) {
  if (!game.soundsEnabled) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  pattern.forEach((note) => {
    tone(ctx, note.freq, now + (note.delay || 0), note.duration || 0.08, note.type || 'sine', note.volume || 0.035);
  });
}

function playSound(kind) {
  switch (kind) {
    case 'move':
      playPattern([
        { freq: 660, duration: 0.055, volume: 0.028, type: 'triangle' },
        { freq: 530, delay: 0.05, duration: 0.06, volume: 0.022, type: 'triangle' },
      ]);
      break;
    case 'capture':
      playPattern([
        { freq: 420, duration: 0.06, volume: 0.034, type: 'sawtooth' },
        { freq: 260, delay: 0.045, duration: 0.1, volume: 0.03, type: 'triangle' },
      ]);
      break;
    case 'castle':
      playPattern([
        { freq: 520, duration: 0.06, volume: 0.03, type: 'triangle' },
        { freq: 660, delay: 0.06, duration: 0.08, volume: 0.03, type: 'triangle' },
      ]);
      break;
    case 'promotion':
      playPattern([
        { freq: 540, duration: 0.06, volume: 0.03, type: 'triangle' },
        { freq: 680, delay: 0.05, duration: 0.06, volume: 0.03, type: 'triangle' },
        { freq: 860, delay: 0.11, duration: 0.08, volume: 0.03, type: 'triangle' },
      ]);
      break;
    case 'check':
      playPattern([
        { freq: 320, duration: 0.05, volume: 0.032, type: 'square' },
        { freq: 470, delay: 0.05, duration: 0.1, volume: 0.03, type: 'square' },
      ]);
      break;
    case 'gameover':
      playPattern([
        { freq: 520, duration: 0.08, volume: 0.03, type: 'triangle' },
        { freq: 660, delay: 0.07, duration: 0.09, volume: 0.03, type: 'triangle' },
        { freq: 780, delay: 0.15, duration: 0.14, volume: 0.028, type: 'triangle' },
      ]);
      break;
    case 'undo':
      playPattern([
        { freq: 500, duration: 0.05, volume: 0.024, type: 'triangle' },
        { freq: 370, delay: 0.04, duration: 0.08, volume: 0.022, type: 'triangle' },
      ]);
      break;
    default:
      break;
  }
}

function updateSoundButton() {
  soundToggle.textContent = game.soundsEnabled ? '🔊' : '🔇';
  soundToggle.title = game.soundsEnabled ? 'Tắt âm thanh' : 'Bật âm thanh';
  soundToggle.setAttribute('aria-label', soundToggle.title);
}

function toggleSound() {
  game.soundsEnabled = !game.soundsEnabled;
  updateSoundButton();
  showToast(game.soundsEnabled ? 'Đã bật âm thanh' : 'Đã tắt âm thanh');
  if (game.soundsEnabled) playSound('move');
}

newGameBtn.addEventListener('click', () => {
  resetGame();
  showToast('Đã bắt đầu ván mới');
});
undoBtn.addEventListener('click', undoMove);
flipBtn.addEventListener('click', () => {
  game.orientation = game.orientation === 'w' ? 'b' : 'w';
  orientationSelect.value = game.orientation;
  render();
});
soundToggle.addEventListener('click', toggleSound);
modeSelect.addEventListener('change', resetGame);
playerColorSelect.addEventListener('change', resetGame);
difficultySelect.addEventListener('change', () => showToast('Đã đổi độ khó AI'));
orientationSelect.addEventListener('change', () => {
  updateOrientation();
  render();
});
modalNewGameBtn.addEventListener('click', () => {
  resetGame();
  showToast('Đã bắt đầu ván mới');
});
modalCloseBtn.addEventListener('click', hideResultModal);
resultModal.addEventListener('click', (event) => {
  if (event.target.classList.contains('modal-backdrop')) hideResultModal();
});
window.addEventListener('keydown', (event) => {
  ensureAudioContext();
  if (event.key.toLowerCase() === 'z') undoMove();
  if (event.key.toLowerCase() === 'r') {
    resetGame();
    showToast('Đã bắt đầu ván mới');
  }
  if (event.key.toLowerCase() === 'm') toggleSound();
});
window.addEventListener('pointerdown', ensureAudioContext, { passive: true });

updateSoundButton();
resetGame();
