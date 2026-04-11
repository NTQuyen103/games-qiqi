// Khai báo các hằng số
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const MARKER = 4;
const OFFBOARD = 7;
const LIBERTY = 8;

// Biến toàn cục cho game state
let board = [];
let size = 9;
let side = BLACK;
let liberties = [];
let block = [];
let points_side = [];
let points_count = [];
let ko = EMPTY;
let bestMove = EMPTY;
let userMove = 0;
let cell;
let gameMode = 'computer';
// Thêm biến để lưu lịch sử nước đi trong ván
let moveHistory = [];

// DOM elements
let canvas;
let ctx;
let selectSize;
let gameModeSelect;
let startButton;
let moveList;
let autoLearningStatus; // Thêm element hiển thị trạng thái

// Các cài đặt tự động học và lưu dữ liệu
const AUTO_EXPORT_FREQUENCY = 30; // Tự động xuất file sau 30 nước đi
let exportCounter = 0; // Bộ đếm để xuất file
let AUTO_RESTART = true; // Tự động khởi động lại trò chơi
let isAutoLearning = false; // Đánh dấu nếu đang trong quá trình học tự động
let gameInterval = null; // Để theo dõi và có thể dừng bộ đếm thời gian

// Sử dụng các thành phần neural network trực tiếp từ window
// không khai báo lại với let
console.log("Neural network available:", !!window.neuralNet);
const neuralNet = window.neuralNet;
const dataCollector = window.dataCollector; 
// const saveWeights = window.saveWeights;
// const loadWeights = window.loadWeights;

// Thêm biến đếm số nước đi trước khi học
let moveCounter = 0;
const LEARN_FREQUENCY = 10; // Học sau mỗi 10 nước đi

// Thêm biến quản lý thời gian và điểm số
let timeMode = 'turn'; // 'turn' hoặc 'total'
let turnTime = 30; // giây/lượt
let totalTime = 300; // giây/tổng
let playerTimes = [0, 0, 0]; // [unused, black, white]
let timerInterval = null;
let currentTimer = 0;
let playerNames = ['-', 'Đen', 'Trắng'];
let playerScores = [0, 0, 0]; // [unused, black, white]
let gameEnded = false;

// Lấy các DOM element liên quan đến thời gian (nếu có)
let player1Time, player2Time, player1Name, player2Name, timeModeRadios, turnTimeInput, totalTimeInput;

// Khởi tạo bàn cờ và vẽ khi trang web được tải
document.addEventListener('DOMContentLoaded', function() {
    // Ẩn game-container khi load trang, chỉ hiện setup-container
    const setupContainer = document.getElementById('setup-container');
    const gameContainer = document.getElementById('game-container');
    if (setupContainer && gameContainer) {
        setupContainer.style.display = '';
        gameContainer.style.display = 'none';
    }
    console.log("DOM đã load xong");
    
    // Tự động tải trọng số từ localStorage khi khởi động
    if (window.loadWeights) {
        console.log("Đang tải trọng số đã lưu...");
        window.loadWeights();
        console.log("Trọng số đã được tải thành công");
    }
    
    // Lấy các DOM elements
    canvas = document.getElementById('gobang');
    if (!canvas) {
        console.error('Không tìm thấy canvas');
        return;
    }
    ctx = canvas.getContext('2d');
    
    selectSize = document.getElementById('size');
    gameModeSelect = document.getElementById('gameMode');
    startButton = document.getElementById('startButton');
    moveList = document.getElementById('moveList');
    autoLearningStatus = document.getElementById('auto-learning-status');

    // Thêm các elements mới
    const viewWeightsButton = document.getElementById('viewWeightsButton');
    const saveWeightsButton = document.getElementById('saveWeightsButton');
    const loadWeightsButton = document.getElementById('loadWeightsButton');
    const viewDataButton = document.getElementById('viewDataButton');
    const clearDataButton = document.getElementById('clearDataButton');
    const exportDataButton = document.getElementById('exportDataButton');
    const importDataButton = document.getElementById('importDataButton');
    const importFileInput = document.getElementById('importFileInput');
    const weightsDisplay = document.getElementById('weights-display');
    const weightsContent = document.getElementById('weights-content');
    const removeDuplicatesButton = document.getElementById('removeDuplicatesButton');

    player1Time = document.getElementById('player1-time');
    player2Time = document.getElementById('player2-time');
    player1Name = document.getElementById('player1-name');
    player2Name = document.getElementById('player2-name');
    timeModeRadios = document.getElementsByName('timeMode');
    turnTimeInput = document.getElementById('turnTimeInput');
    totalTimeInput = document.getElementById('totalTimeInput');

    if (!selectSize || !gameModeSelect || !startButton || !moveList) {
        console.error('Không tìm thấy một hoặc nhiều phần tử DOM cần thiết');
        return;
    }

    // Khởi tạo kích thước ô
    size = parseInt(selectSize.value);
    cell = canvas.width / size;

    // Khởi tạo game
    initBoard();
    drawBoard();

    // Thêm event listeners
    selectSize.addEventListener('change', function() {
        size = parseInt(selectSize.value);
        cell = canvas.width / size;
        initBoard();
        drawBoard();
    });

gameModeSelect.addEventListener('change', function() {
    gameMode = gameModeSelect.value;
    });

    // Xử lý nút Xem trọng số
    if (viewWeightsButton) {
        viewWeightsButton.addEventListener('click', function() {
            if (!neuralNet) {
                alert('Neural network chưa được khởi tạo!');
                return;
            }
            
            // Hiển thị/ẩn khu vực trọng số
            if (weightsDisplay.style.display === 'none') {
                weightsDisplay.style.display = 'block';
                weightsContent.textContent = JSON.stringify(neuralNet.weights, null, 2);
            } else {
                weightsDisplay.style.display = 'none';
            }
        });
    }

    // Xử lý nút Lưu trọng số
    if (saveWeightsButton) {
        saveWeightsButton.addEventListener('click', function() {
            if (!neuralNet) {
                alert('Neural network chưa được khởi tạo!');
                return;
            }
            
            // Lưu trọng số vào localStorage
            window.saveWeights();
            alert('Đã lưu trọng số thành công!');
        });
    }

    // Xử lý nút Tải trọng số
    if (loadWeightsButton) {
        loadWeightsButton.addEventListener('click', function() {
            // Tải trọng số từ localStorage
            window.loadWeights();
            
            if (weightsDisplay.style.display === 'block') {
                weightsContent.textContent = JSON.stringify(neuralNet.weights, null, 2);
            }
            
            alert('Đã tải trọng số thành công!');
        });
    }

    // Xử lý nút Xem dữ liệu
    if (viewDataButton) {
        viewDataButton.addEventListener('click', function() {
            if (!dataCollector) {
                alert('Data collector chưa được khởi tạo!');
                return;
            }
            
            const trainingData = dataCollector.exportTrainingData();
            alert(`Hiện có ${trainingData.length} mẫu dữ liệu training đã được thu thập.`);
        });
    }
    
    // Xử lý nút Xóa dữ liệu
    if (clearDataButton) {
        clearDataButton.addEventListener('click', function() {
            if (!dataCollector) {
                alert('Data collector chưa được khởi tạo!');
                return;
            }
            
            if (confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu training? Hành động này không thể hoàn tác.')) {
                dataCollector.clearData();
                alert('Đã xóa tất cả dữ liệu training.');
            }
        });
    }

    // Xử lý nút Xuất dữ liệu
    if (exportDataButton) {
        exportDataButton.addEventListener('click', function() {
            if (!dataCollector) {
                alert('Data collector chưa được khởi tạo!');
                return;
            }
            
            const trainingData = dataCollector.exportTrainingData();
            if (trainingData.length === 0) {
                alert('Không có dữ liệu training để xuất!');
                return;
            }
            
            // Tạo file JSON để tải xuống
            const dataStr = JSON.stringify(trainingData);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const dataUrl = URL.createObjectURL(dataBlob);
            
            // Tạo link tải xuống và click tự động
            const downloadLink = document.createElement('a');
            downloadLink.href = dataUrl;
            downloadLink.download = 'go_training_data.json';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            alert(`Đã xuất ${trainingData.length} mẫu dữ liệu training thành công!`);
        });
    }
    
    // Xử lý nút Nhập dữ liệu
    if (importDataButton && importFileInput) {
        importDataButton.addEventListener('click', function() {
            importFileInput.click();
        });
        
        importFileInput.addEventListener('change', function(event) {
            if (!dataCollector) {
                alert('Data collector chưa được khởi tạo!');
                return;
            }
            
            const file = event.target.files[0];
            if (!file) {
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    if (!Array.isArray(importedData)) {
                        throw new Error('Dữ liệu không đúng định dạng!');
                    }
                    
                    // Thêm dữ liệu vào dataCollector
                    importTrainingData(importedData);
                    
                    alert(`Đã nhập ${importedData.length} mẫu dữ liệu training thành công!`);
                } catch (error) {
                    alert('Lỗi khi nhập dữ liệu: ' + error.message);
                }
            };
            
            reader.readAsText(file);
            // Reset input để có thể chọn lại file
            event.target.value = null;
        });
    }

    // Xử lý nút Xóa trùng lặp
    if (removeDuplicatesButton) {
        removeDuplicatesButton.addEventListener('click', function() {
            if (!dataCollector) {
                alert('Data collector chưa được khởi tạo!');
                return;
            }
            
            const removedCount = dataCollector.removeDuplicates();
            
            if (removedCount > 0) {
                alert(`Đã xóa ${removedCount} bản ghi dữ liệu trùng lặp!`);
            } else {
                alert('Không tìm thấy dữ liệu trùng lặp.');
            }
        });
    }

    startButton.addEventListener('click', function() {
        // Ẩn setup-container, hiện game-container
        if (setupContainer && gameContainer) {
            setupContainer.style.display = 'none';
            gameContainer.style.display = '';
        }
        console.log('Nút Start được nhấn');
        // Cập nhật kích thước bàn cờ và tính lại kích thước ô
        size = parseInt(selectSize.value);
        cell = canvas.width / size;
        
        // Khởi tạo lại bàn cờ
        initBoard();
        
        // Xóa lịch sử nước đi
        moveList.innerHTML = '';
        
        // Vẽ lại bàn cờ
        drawBoard();
        console.log('Đã vẽ lại bàn cờ với kích thước:', size);

        // Remove existing listener
        canvas.removeEventListener('click', userInput);

        // Add correct listener based on game mode
        if (gameModeSelect.value === 'human') {
            canvas.addEventListener('click', userInput);
            console.log('Human vs. Human mode');
        } else if (gameModeSelect.value === 'computer') {
            canvas.addEventListener('click', userInput);
            console.log('Human vs Computer mode');
        } else if (gameModeSelect.value === 'computer-computer') {
            console.log('Computer vs Computer mode');
            canvas.removeEventListener('click', userInput);
            startComputerVsComputer();
        } else {
            console.log('Invalid game mode');
        }
    });

    // Tự động nhập file dữ liệu nếu có
    tryAutoImportData();

    // Hiển thị trạng thái học tự động
    updateLearningStatus("Hệ thống sẵn sàng học tự động sau mỗi 10 nước đi");

    // Thêm xử lý cho checkbox tự động khởi động lại
    const autoRestartCheckbox = document.getElementById('autoRestartCheckbox');
    if (autoRestartCheckbox) {
        // Đặt trạng thái ban đầu dựa trên biến AUTO_RESTART
        autoRestartCheckbox.checked = AUTO_RESTART;
        
        // Thêm event listener để cập nhật biến AUTO_RESTART khi người dùng thay đổi
        autoRestartCheckbox.addEventListener('change', function() {
            AUTO_RESTART = this.checked;
            console.log("Tự động khởi động lại:", AUTO_RESTART);
            
            if (AUTO_RESTART) {
                updateLearningStatus("Đã bật tự động bắt đầu lại - AI sẽ tiếp tục học liên tục");
            } else {
                updateLearningStatus("Đã tắt tự động bắt đầu lại - Trò chơi sẽ dừng sau khi kết thúc");
            }
        });
    }

    // Thêm xử lý cho nút tự động học
    const autoLearnButton = document.getElementById('autoLearnButton');
    if (autoLearnButton) {
        autoLearnButton.addEventListener('click', function() {
            // Đảm bảo tính năng tự động bắt đầu lại được bật
            AUTO_RESTART = true;
            if (autoRestartCheckbox) {
                autoRestartCheckbox.checked = true;
            }
            
            // Chuyển sang chế độ computer-computer
            gameMode = 'computer-computer';
            if (gameModeSelect) {
                gameModeSelect.value = 'computer-computer';
            }
            
            // Bắt đầu quá trình tự động học
            updateLearningStatus("Đã bắt đầu chế độ tự động học liên tục");
            
            // Khởi tạo lại bàn cờ và bắt đầu
            initBoard();
            moveList.innerHTML = '';
            drawBoard();
            
            // Bắt đầu chế độ computer-computer
            startComputerVsComputer();
        });
    }

    // Thêm xử lý cho nút xóa dữ liệu trùng
    const cleanDuplicatesButton = document.getElementById('cleanDuplicatesButton');
    if (cleanDuplicatesButton) {
        cleanDuplicatesButton.addEventListener('click', function() {
            if (!dataCollector) {
                alert('Data collector chưa được khởi tạo!');
                return;
            }
            
            updateLearningStatus("Đang kiểm tra và xóa dữ liệu trùng lặp...");
            const removedCount = dataCollector.removeDuplicates();
            
            if (removedCount > 0) {
                updateLearningStatus(`Đã xóa ${removedCount} bản ghi dữ liệu trùng lặp!`);
            } else {
                updateLearningStatus('Không tìm thấy dữ liệu trùng lặp.');
            }
        });
    }

    // Đổi chế độ thời gian
    if (timeModeRadios) {
        function updateTimeModeDisplay() {
            if (timeMode === 'turn') {
                if (turnTimeInput) turnTimeInput.style.display = '';
                if (totalTimeInput) totalTimeInput.style.display = 'none';
            } else {
                if (turnTimeInput) turnTimeInput.style.display = 'none';
                if (totalTimeInput) totalTimeInput.style.display = '';
            }
        }
        timeModeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                timeMode = this.value;
                updateTimeModeDisplay();
            });
        });
        updateTimeModeDisplay();
    }

    // Khi nhấn Start, khởi tạo lại thời gian
    if (startButton) {
        startButton.addEventListener('click', function() {
            if (turnTimeInput && totalTimeInput) {
                if (timeMode === 'turn') {
                    turnTime = parseInt(turnTimeInput.value);
                    playerTimes[BLACK] = turnTime;
                    playerTimes[WHITE] = turnTime;
                } else {
                    totalTime = parseInt(totalTimeInput.options[totalTimeInput.selectedIndex].value);
                    playerTimes[BLACK] = totalTime;
                    playerTimes[WHITE] = totalTime;
                }
                updatePlayerTimes();
                startTimer();
            }
        });
    }

    // Xử lý nút Quay lại
    const backToSetupButton = document.getElementById('backToSetupButton');
    if (backToSetupButton) {
        backToSetupButton.addEventListener('click', function() {
            if (setupContainer && gameContainer) {
                setupContainer.style.display = '';
                gameContainer.style.display = 'none';
            }
            // Dừng game nếu đang chạy
            if (typeof stopAutoLearning === 'function') stopAutoLearning();
            if (typeof timerInterval !== 'undefined' && timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        });
    }
});

// GUI
function drawBoard() {
    // Tính lại kích thước ô
    cell = canvas.width / size;
    // Xóa bàn cờ cũ
  ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Vẽ nền bàn cờ
    ctx.fillStyle = "#F4A460";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Vẽ lưới
  ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    // Vẽ các đường ngang
    for (let i = 0; i < size; i++) {
        const y = i * cell + cell / 2;
    ctx.moveTo(cell / 2, y);
    ctx.lineTo(canvas.width - cell / 2, y);
    }
    // Vẽ các đường dọc
    for (let i = 0; i < size; i++) {
        const x = i * cell + cell / 2;
    ctx.moveTo(x, cell / 2);
    ctx.lineTo(x, canvas.height - cell / 2);
    }
    ctx.stroke();
    // Vẽ điểm hoshi (điểm đánh dấu)
    const hoshiPoints = getHoshiPoints(size);
    for (const point of hoshiPoints) {
        const x = point.x * cell + cell / 2;
        const y = point.y * cell + cell / 2;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "black";
        ctx.fill();
    }

    // Vẽ quân cờ
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      let sq = row * size + col;
            if (board[sq] == OFFBOARD) continue;
      if (board[sq]) {
                let color = board[sq] == BLACK ? "black" : "white";
        ctx.beginPath();
                ctx.arc(col * cell + cell / 2, row * cell + cell / 2, cell * 0.45, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
                ctx.strokeStyle = "black";
                ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (sq == userMove) {
                let color = board[sq] == BLACK ? "white" : "black";
        ctx.beginPath();
                ctx.arc(col * cell + cell / 2, row * cell + cell / 2, cell * 0.2, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

// Hàm trả về vị trí các điểm hoshi dựa trên kích thước bàn cờ
function getHoshiPoints(size) {
    const points = [];
    if (size === 9) {
        points.push({x: 2, y: 2}, {x: 6, y: 2}, {x: 4, y: 4}, {x: 2, y: 6}, {x: 6, y: 6});
    } else if (size === 13) {
        points.push(
            {x: 3, y: 3}, {x: 9, y: 3},
            {x: 6, y: 6},
            {x: 3, y: 9}, {x: 9, y: 9}
        );
    } else if (size === 19) {
        points.push(
            {x: 3, y: 3}, {x: 9, y: 3}, {x: 15, y: 3},
            {x: 3, y: 9}, {x: 9, y: 9}, {x: 15, y: 9},
            {x: 3, y: 15}, {x: 9, y: 15}, {x: 15, y: 15}
        );
    }
    return points;
}

// Hàm trả về danh sách các nước đi hợp lệ cho bên hiện tại
function getValidMoves() {
    const validMoves = [];
    for (let sq = 0; sq < size * size; sq++) {
        // Không xét ô đã có quân
        if (board[sq] !== EMPTY) continue;
        // Không xét nước Ko
        if (sq === ko) continue;
        // Thử đặt quân tạm thời để kiểm tra tự sát
        const oldBoard = [...board];
        const oldKo = ko;
        board[sq] = side;
        captures(3 - side, sq);
        count(sq, side);
        const suicide = liberties.length === 0;
        restoreBoard();
        board[sq] = oldBoard[sq];
        ko = oldKo;
        if (suicide) continue;
        validMoves.push(sq);
    }
    return validMoves;
}

function userInput(event) {
  // Chỉ cho phép người chơi đi nếu đúng lượt (chế độ người vs máy)
  if (gameMode === 'computer' && side !== BLACK) return;
  let rect = canvas.getBoundingClientRect();
  let mouseX = event.clientX - rect.left;
  let mouseY = event.clientY - rect.top;
  let col = Math.floor(mouseX / cell);
  let row = Math.floor(mouseY / cell);
    // Kiểm tra biên
    if (col < 0 || col >= size || row < 0 || row >= size) {
        return;
    }
  let sq = row * size + col;
  // Lấy danh sách nước đi hợp lệ
  const validMoves = getValidMoves();
  if (!validMoves.includes(sq)) {
    alert('Bạn phải đi vào một ô hợp lệ (không phải Ko, không tự sát, không trùng)!');
    return;
  }
  if (!setStone(sq, side, true)) return;
  drawBoard();
  addToHistory(sq, side);
  if (gameMode === 'computer') {
        side = 3 - side;
    setTimeout(function() { 
        play(6); 
        // Thêm dòng này để chuyển lượt về người chơi sau khi máy đi xong
        side = 3 - side;
        // Cập nhật giao diện
        updateScore();
    }, 10);
  } else {
        side = 3 - side;
  }
}

function territory(sq) { /* Count territory, returns [side, points] */
  stone = board[sq]; // Lấy giá trị của ô tại chỉ số sq.
  
  if (stone == OFFBOARD) return OFFBOARD; // Nếu ô nằm ngoài bàn cờ, trả về OFFBOARD.
  
  if (stone == EMPTY) { // Nếu ô là trống.
    block.push(sq); // Thêm ô vào mảng block (các ô đang được kiểm tra).
    points_count.push(sq); // Thêm ô vào mảng points_count (các ô tính điểm).
    board[sq] |= MARKER; // Đánh dấu ô này bằng cách sử dụng MARKER.
    
    // Gọi đệ quy hàm territory cho các ô xung quanh.
    for (let offset of [1, size, -1, -size]) territory(sq + offset);
  } else if (stone != MARKER) { // Nếu ô không phải là MARKER.
    points_side.push(stone); // Thêm màu của viên đá vào mảng points_side.
  }
  
  // Nếu không có màu nào trong points_side, trả về [EMPTY, số lượng ô tính điểm].
  if (!points_side.length) return [EMPTY, points_count.length];
  
  // Nếu tất cả các màu trong points_side đều giống nhau, trả về màu đó và số lượng ô tính điểm.
  else if (points_side.every((element) => element == points_side[0]))
    return [points_side[0], points_count.length];
  
  // Nếu có nhiều màu khác nhau, trả về [EMPTY, số lượng ô tính điểm].
  else return [EMPTY, points_count.length];
}

function score() { /* Scores game, returns points [empty, black, white]*/
  let scorePosition = [0, 0, 0];
  for (let sq = 0; sq < size ** 2; sq++) {
    if (board[sq]) continue;
    let result = territory(sq);
    scorePosition[result[0]] += result[1];
    points_side = [];
    points_count = [];
  } restoreBoard();
  let prisoners = (side == BLACK ? evaluate(): -evaluate());
  if (prisoners > 0) scorePosition[BLACK] += prisoners;
  if (prisoners < 0) scorePosition[WHITE] += Math.abs(prisoners);
  scorePosition[WHITE] += 6.5; // komi
  return scorePosition;
}

function updateScore() {
    const pts = score();
    const element = document.getElementById("score");
    let scoreText = '';
    
    // Tính điểm chi tiết
    const blackStones = board.filter(sq => sq === BLACK).length;
    const whiteStones = board.filter(sq => sq === WHITE).length;
    const blackTerritory = pts[BLACK];
    const whiteTerritory = pts[WHITE];
    const komi = 6.5;
    
    // Hiển thị điểm chi tiết
    scoreText += `Đen:<br>`;
    scoreText += `- Số quân: ${blackStones}<br>`;
    scoreText += `- Lãnh thổ: ${blackTerritory.toFixed(1)}<br>`;
    scoreText += `- Tổng điểm: ${(blackStones + blackTerritory).toFixed(1)}<br><br>`;
    
    scoreText += `Trắng:<br>`;
    scoreText += `- Số quân: ${whiteStones}<br>`;
    scoreText += `- Lãnh thổ: ${whiteTerritory.toFixed(1)}<br>`;
    scoreText += `- Komi: ${komi}<br>`;
    scoreText += `- Tổng điểm: ${(whiteStones + whiteTerritory + komi).toFixed(1)}<br>`;
    
    if (gameEnded) {
        const finalScore = calculateScore();
        scoreText += `<br>Kết quả cuối cùng:<br>`;
        scoreText += `Đen: ${finalScore.black.toFixed(1)} điểm<br>`;
        scoreText += `Trắng: ${finalScore.white.toFixed(1)} điểm<br>`;
        scoreText += `Người thắng: ${finalScore.winner === BLACK ? 'Đen' : 'Trắng'}`;
    }
    
    element.innerHTML = scoreText;
}

// ENGINE
function initBoard() {
    // Tính lại kích thước ô
    cell = canvas.width / size;
    
    // Khởi tạo mảng board với kích thước mới
    board = new Array(size * size).fill(EMPTY);
    
    // Reset các biến trạng thái
    side = BLACK;
    ko = EMPTY;
    userMove = 0;
    bestMove = EMPTY;
    liberties = [];
    block = [];
    points_side = [];
    points_count = [];
    moveHistory = []; // Reset lịch sử nước đi
}

function inEye(sq) { /* Check if square is in diamond shape */
  let eyeColor = -1; // Khởi tạo biến để lưu màu của viên đá trong "mắt", -1 có nghĩa là chưa xác định.
  let otherColor = -1; // Khởi tạo biến để lưu màu của viên đá khác, -1 có nghĩa là chưa xác định.
  
  for (let offset of [1, size, -1, -size]) { // Lặp qua các offset để kiểm tra các ô xung quanh ô sq.
    if (board[sq + offset] == OFFBOARD) continue; // Nếu ô nằm ngoài bàn cờ, bỏ qua.
    if (board[sq + offset] == EMPTY) return 0; // Nếu ô là trống, trả về 0 (không phải là "mắt").
    
    if (eyeColor == -1) { // Nếu chưa xác định màu của viên đá trong "mắt".
      eyeColor = board[sq + offset]; // Gán màu của viên đá hiện tại cho eyeColor.
      otherColor = 3 - eyeColor; // Tính màu của viên đá khác (nếu eyeColor là 1, thì otherColor là 2 và ngược lại).
    } else if (board[sq + offset] == otherColor) // Nếu ô hiện tại có màu khác với eyeColor.
      return 0; // Trả về 0 (không phải là "mắt").
  }
  
  if (eyeColor > 2) eyeColor -= MARKER; // Nếu eyeColor lớn hơn 2 (có thể là một ô đã đánh dấu), trừ đi MARKER.
  
  return eyeColor; // Trả về màu của viên đá trong "mắt" (1 hoặc 2), hoặc 0 nếu không phải là "mắt".
}

function clearBlock(move) { /* Erase stones when captured */
  if (block.length == 1 && inEye(block[0]) == 3 - side) // Nếu chỉ có một viên đá trong block và ô move là "mắt" của bên đối thủ.
    ko = block[0]; // Đặt vị trí ko là vị trí của viên đá bị bắt.
  
  for (let i = 0; i < block.length; i++) // Lặp qua tất cả các viên đá trong block.
    board[block[i]] = EMPTY; // Đặt các ô tương ứng trong board thành EMPTY (xóa viên đá).
}

function captures(color, move) { /* Handle captured stones */
  for (let sq = 0; sq < size ** 2; sq++) { // Lặp qua tất cả các ô trên bàn cờ.
    let stone = board[sq]; // Lấy giá trị của ô tại chỉ số sq.
    
    if (stone == OFFBOARD) continue; // Nếu ô nằm ngoài bàn cờ, bỏ qua.
    
    if (stone & color) { // Kiểm tra xem ô có chứa viên đá của màu đã cho không.
      count(sq, color); // Gọi hàm count để đếm số ô tự do cho nhóm viên đá tại ô sq.
      
      if (liberties.length == 0) // Nếu không còn ô tự do nào.
        clearBlock(move); // Gọi hàm clearBlock để xóa các viên đá bị bắt.
      
      restoreBoard(); // Khôi phục trạng thái bàn cờ về trước khi kiểm tra nhóm tiếp theo
    }
  }
}

function count(sq, color) { /* Count group liberties */
  stone = board[sq]; // Lấy giá trị của ô tại chỉ số sq.
  
  if (stone == OFFBOARD) return; // Nếu ô nằm ngoài bàn cờ, kết thúc hàm.
  
  // Kiểm tra xem ô có chứa viên đá của màu đã cho và chưa được đánh dấu không.
  if (stone && (stone & color) && (stone & MARKER) == 0) {
    block.push(sq); // Thêm ô vào mảng block (các ô đang được kiểm tra).
    board[sq] |= MARKER; // Đánh dấu ô này để tránh kiểm tra lại.
    
    // Gọi đệ quy hàm count cho các ô xung quanh.
    for (let offset of [1, size, -1, -size]) 
      count(sq + offset, color);
  } else if (stone == EMPTY) { // Nếu ô là trống.
    board[sq] |= LIBERTY; // Đánh dấu ô này là ô tự do.
    liberties.push(sq); // Thêm ô vào mảng liberties (các ô tự do).
  }
}

function restoreBoard() { /* Remove group markers */
  block = []; liberties = []; points_side = [];
  for (let sq = 0; sq < size ** 2; sq++) {
    if (board[sq] != OFFBOARD) board[sq] &= 3;
  }
}

function setStone(sq, color, user) { /* Place stone on board */
    const oldBoard = [...board];
    const oldKo = ko;

    if (board[sq] != EMPTY) {
        if (user) alert("Illegal move!");
        return false;
    } 
    //else if (sq === ko) {
    //     if (user) alert("Ko!");
    //     return false;
    // }
    
    ko = EMPTY;
    
    // Thử đặt quân và xử lý bắt quân
    board[sq] = color;
    captures(3 - color, sq);
    
    // Kiểm tra tự do của nhóm mới
    count(sq, color);
    const suicide = liberties.length === 0;
    
    // Khôi phục các đánh dấu (không ảnh hưởng đến quân đã đặt/bị xóa)
    restoreBoard();
    
    // if (suicide) {
    //     // Rollback trạng thái
    //     board = [...oldBoard];
    //     ko = oldKo;
    //     if (user) alert("Suicide move!");
    //     return false;
    // }
    
    // Cập nhật lịch sử và userMove
    userMove = sq;
    moveHistory.push(sq);
    
    return true;
}

function getUrgentMoves() { /* Get escape squares of groups with less than 3 liberties */
  let urgent = []; // Khởi tạo mảng để lưu các nước đi khẩn cấp.
  
  for (let sq = 0; sq < size ** 2; sq++) { // Lặp qua tất cả các ô trên bàn cờ.
    if (board[sq] == OFFBOARD || board[sq] == EMPTY) continue; // Bỏ qua các ô ngoài bàn cờ hoặc ô trống.
    
    count(sq, board[sq]); // Gọi hàm count để đếm số ô tự do cho nhóm viên đá tại ô sq.
    
    if (liberties.length < 3) { // Nếu số ô tự do của nhóm viên đá nhỏ hơn 3.
      // Chỉ xem xét những ô chưa từng đi
      for (let lib of liberties) {
        if (!moveHistory.includes(lib) && board[lib] === EMPTY) {
          urgent.push(lib);
        }
      }
    }
    restoreBoard(); // Khôi phục trạng thái bàn cờ về trước khi gọi hàm count.
  }
  
  return [...new Set(urgent)]; // Trả về mảng các nước đi khẩn cấp mà không có giá trị trùng lặp.
}

// Sửa đổi hàm evaluate để sử dụng neural network
function evaluate() {
    if (!neuralNet) {
        window.loadWeights();
    }
    const gameState = {
        board: board,
        side: side,
        ko: ko
    };
    // Debug một số ô cụ thể trên bàn cờ
    const center = Math.floor(Math.sqrt(board.length) / 2);
    const centerIndex = center * Math.sqrt(board.length) + center;
    console.log('Debug ô trung tâm:', {
        index: centerIndex,
        value: board[centerIndex],
        position: {
            row: Math.floor(centerIndex / Math.sqrt(board.length)),
            col: centerIndex % Math.sqrt(board.length)
        }
    });

    return neuralNet.evaluate(gameState);
}

function search(depth) {
    if (!depth) return evaluate();

    let bestScore = -10000;
    // Chỉ xem xét những nước chưa từng được đi
    let validMoves = getUrgentMoves().filter(sq => !moveHistory.includes(sq));
    
    // Nếu không có nước đi khẩn cấp hợp lệ nào, thử tất cả các ô trống chưa được đi
    if (validMoves.length === 0) {
        for (let sq = 0; sq < size * size; sq++) {
            if (board[sq] === EMPTY && !moveHistory.includes(sq)) {
                validMoves.push(sq);
            }
        }
    }

    // Nếu không còn nước đi hợp lệ nào, trả về điểm đánh giá
    if (validMoves.length === 0) {
        return evaluate();
    }

    let bestMoveAtCurrentDepth = EMPTY;

    for (let sq of validMoves) {
        // Bỏ qua các ô nằm sát cạnh bàn cờ nếu đang ở độ sâu 1
        let skipMove = false;
        for (let offset of [1, size, -1, -size]) {
            if (board[sq + offset] == OFFBOARD && depth == 1) {
                skipMove = true;
                break;
            }
        }
        if (skipMove) continue;

        if (sq == ko) continue;

        let oldBoard = JSON.stringify(board);
        let oldSide = side;
        let oldKo = ko;

        if (!setStone(sq, side, false)) continue;

        let currentScore = -search(depth - 1);

        if (currentScore > bestScore) {
            bestScore = currentScore;
            bestMoveAtCurrentDepth = sq;
        }

        board = JSON.parse(oldBoard);
        side = oldSide;
        ko = oldKo;
    }

    // Chỉ cập nhật bestMove ở cấp độ cao nhất
    if (depth === 6 && bestMoveAtCurrentDepth !== EMPTY) {
        bestMove = bestMoveAtCurrentDepth;
    }

    return bestScore;
}

function tenuki(direction) { /* Play away when no urgent moves */
  // Các vị trí tiêu biểu để di chuyển
  for (let sq of [
    (4*size+4), (4*size+(size-5)), ((size-5)*size+4), ((size-5)*size+(size-5)),
    ((size-1)/2*size+3), (3*size+(size-1)/2), ((size-1)/2*size+(size-4)), ((size-4)*size+(size-1)/2)
  ]) {
    // Chỉ xem xét các ô trống chưa từng đi
    if (board[sq] === EMPTY && !moveHistory.includes(sq)) {
      if (inEye(sq)) break;
      else return sq;
    }
  };
  
  if (score()[EMPTY]) {
    let smallestGroup = 100, tenuki = 0;
    for (let sq = 0; sq < size ** 2; sq++) {
      if (board[sq] == (3-side)) {
        let attack = 0;
        count(sq, board[sq]);
        
        if (liberties.length < smallestGroup) {
          smallestGroup = liberties.length;
          // Lọc các ô tự do chưa từng đi
          const availableLibs = liberties.filter(lib => 
            !moveHistory.includes(lib) && board[lib] === EMPTY
          );
          if (availableLibs.length > 0) {
            attack = availableLibs[0];
          }
        } else if (liberties.length) {
          // Lọc các ô tự do chưa từng đi
          const availableLibs = liberties.filter(lib => 
            !moveHistory.includes(lib) && board[lib] === EMPTY
          );
          if (availableLibs.length > 0) {
            attack = availableLibs[(direction ? availableLibs.length-1 : 0)];
          }
        }
        
        restoreBoard();
        
        let libs = 0;
        for (let lib of [1, -1, size, -size])
          if (board[attack+lib] == EMPTY) libs++;
          
        if (attack && libs && attack != ko && !moveHistory.includes(attack)) {
          tenuki = attack;
        }
      }
    }
    return tenuki;
  }
}

// Thêm hàm để tìm nước đi tốt nhất từ dữ liệu training
function findBestMoveFromTraining(currentBoard, currentSide) {
    if (!dataCollector) return null;
    
    const trainingData = dataCollector.exportTrainingData();
    if (trainingData.length === 0) return null;
    
    // Tính toán điểm tương đồng giữa trạng thái hiện tại và các trạng thái đã lưu
    let bestSimilarity = 0.65; // Ngưỡng tối thiểu để coi là tương tự
    let bestMove = null;
    let bestScore = -Infinity;
    
    // Lấy tất cả mẫu dữ liệu
    for (const sample of trainingData) {
        // Bỏ qua nếu khác bên đi
        if (sample.side !== currentSide) continue;
        
        // Tính độ tương đồng
        const similarity = calculateBoardSimilarity(currentBoard, sample.board);
        
        // Nếu độ tương đồng đủ cao và có kết quả tốt hơn
        if (similarity > bestSimilarity && sample.result > bestScore) {
            bestSimilarity = similarity;
            bestMove = sample.move;
            bestScore = sample.result;
            
            // Nếu tìm thấy trận đấu gần hoàn hảo (>90% tương đồng)
            if (similarity > 0.9) {
                console.log("Tìm thấy trận đấu gần như giống hệt!");
                break;
            }
        }
    }
    
    if (bestMove !== null) {
        console.log(`Tìm thấy nước đi tốt nhất từ dữ liệu: ${bestMove}, với độ tương đồng: ${bestSimilarity.toFixed(2)}, điểm: ${bestScore.toFixed(2)}`);
    }
    
    return bestMove;
}

// Tính độ tương đồng giữa hai trạng thái bàn cờ
function calculateBoardSimilarity(board1, board2) {
    if (!board1 || !board2 || board1.length !== board2.length) return 0;
    
    let matchCount = 0;
    let totalCount = 0;
    
    for (let i = 0; i < board1.length; i++) {
        // Bỏ qua các ô ngoài bàn cờ
        if (board1[i] === OFFBOARD || board2[i] === OFFBOARD) continue;
        
        // Đếm các ô giống nhau
        if (board1[i] === board2[i]) {
            matchCount++;
        }
        
        totalCount++;
    }
    
    return totalCount > 0 ? matchCount / totalCount : 0;
}

function play(depth) {
    if (gameEnded) return false;

    let currentScore = 0;
    let bestMove = EMPTY;
    
    console.log('Debug - Bắt đầu lượt đi của máy:');
    console.log('Bên đang đi:', side === BLACK ? 'Đen' : 'Trắng');
    
    // Đếm số ô trống để kiểm tra
    let emptyCount = 0;
    for (let i = 0; i < board.length; i++) {
        if (board[i] === EMPTY) emptyCount++;
    }
    console.log('Số ô trống:', emptyCount);
    
    // Kiểm tra xem game có thể tiếp tục không
    if (emptyCount === 0) {
        console.log("Bàn cờ đã đầy - kết thúc ván!");
        endGame();
        return false;
    }
    
    // Trước tiên, thử tìm nước đi tốt nhất từ dữ liệu training
    const trainingMove = findBestMoveFromTraining(board, side);
    
    // Kiểm tra nước đi từ training có hợp lệ không
    let useTrainingMove = false;
    if (trainingMove !== null && board[trainingMove] === EMPTY) {
        console.log("Sử dụng nước đi từ dữ liệu training:", trainingMove);
        updateLearningStatus("AI đang sử dụng kinh nghiệm đã học");
        bestMove = trainingMove;
        useTrainingMove = true;
    }
    
    // Nếu không dùng được nước đi từ training, dùng thuật toán tìm kiếm
    if (!useTrainingMove) {
        console.log("Dùng thuật toán tìm kiếm");
        updateLearningStatus("AI đang tính toán nước đi tốt nhất");
        currentScore = search(depth);
        
        // DEBUG: Kiểm tra bestMove sau khi chạy search
        console.log("Sau khi search, bestMove =", bestMove);
    }

    // Kiểm tra lại nước đi đã chọn có hợp lệ không
    if (bestMove === EMPTY || board[bestMove] !== EMPTY) {
        console.log("Nước đi đã chọn không hợp lệ, tìm nước đi mới");
        
        // Tìm tất cả các ô trống
        let emptySquares = [];
        for (let i = 0; i < size * size; i++) {
            if (board[i] === EMPTY) {
                emptySquares.push(i);
            }
        }
        
        console.log('Các ô trống còn lại:', emptySquares);
        if (emptySquares.length > 0) {
            bestMove = emptySquares[Math.floor(Math.random() * emptySquares.length)];
            console.log("Đã chọn nước đi ngẫu nhiên:", bestMove);
        } else {
            console.log("Không còn nước đi hợp lệ - kết thúc ván!");
            endGame();
            return false;
        }
    }

    console.log("Chuẩn bị đặt quân tại vị trí:", bestMove);
    
    // Đặt quân cờ, trả về false nếu không thể đặt
    if (!setStone(bestMove, side, true)) {
        console.log("Không thể đặt quân cờ tại vị trí " + bestMove + ", tìm vị trí khác");
        
        // Tìm một ô trống bất kỳ nếu không đặt được
        let anyEmptySquare = -1;
        for (let i = 0; i < board.length; i++) {
            if (board[i] === EMPTY) {
                anyEmptySquare = i;
                break;
            }
        }
        
        // Nếu còn ô trống, thử đặt vào đó
        if (anyEmptySquare !== -1) {
            console.log("Thử đặt vào ô trống:", anyEmptySquare);
            if (!setStone(anyEmptySquare, side, true)) {
                console.log("Vẫn không thể đặt quân, bỏ qua lượt");
                return false;
            }
            bestMove = anyEmptySquare;
        } else {
            console.log("Không còn ô trống, kết thúc ván");
            endGame();
            return false;
        }
    }

    // Lưu trạng thái game sau mỗi nước đi
    if (dataCollector) {
        dataCollector.saveGameState(board, bestMove, side, evaluate());
    }
    
    // Tăng bộ đếm nước đi
    moveCounter++;
    exportCounter++;
    
    // Thực hiện học liên tục sau mỗi X nước đi
    if (moveCounter >= LEARN_FREQUENCY) {
        continuousLearning();
        moveCounter = 0; // Reset bộ đếm
    }
    
    // Kiểm tra xuất file
    if (exportCounter >= AUTO_EXPORT_FREQUENCY) {
        exportData();
        exportCounter = 0;
    }

    // Cập nhật giao diện và lịch sử
    drawBoard();
    addToHistory(bestMove, side);
    updateScore();
    
    console.log('Debug - Kết thúc lượt đi của máy:');
    console.log('Nước đi vừa thực hiện:', bestMove);
    console.log('Bên tiếp theo:', (3 - side) === BLACK ? 'Đen' : 'Trắng');
    
    // Sau khi đặt quân, kiểm tra điều kiện kết thúc
    if (moveHistory.length >= size * size * 0.8) { // Khi đã đi được 80% số ô
        let passCount = 0;
        for (let i = moveHistory.length - 1; i >= 0; i--) {
            if (moveHistory[i] === -1) { // -1 đại diện cho nước pass
                passCount++;
                if (passCount >= 2) { // Hai người chơi pass liên tiếp
                    endGame();
                    return false;
                }
            } else {
                break;
            }
        }
    }

    return true;
}
// Hàm học liên tục trên dữ liệu đã thu thập
function continuousLearning() {
    console.log("Đang thực hiện học liên tục...");
    updateLearningStatus("Đang học từ dữ liệu đã thu thập...");
    
    if (!window.neuralNet || !window.dataCollector || !window.trainNetwork || !window.saveWeights) {
        console.error("Không thể học liên tục: thiếu các thành phần cần thiết");
        updateLearningStatus("Lỗi: Không thể học do thiếu thành phần");
        return;
    }
    
    try {
        // Lấy dữ liệu training từ data collector
        const trainingData = window.dataCollector.exportTrainingData();
        
        if (trainingData.length > 0) {
            // Nếu có quá nhiều dữ liệu, chỉ lấy 50 mẫu gần nhất để học
            const recentData = trainingData.slice(-50);
            console.log(`Học liên tục trên ${recentData.length} mẫu dữ liệu gần nhất`);
            
            // Huấn luyện neural network với dữ liệu mới - chỉ 3 epochs để tránh chậm
            window.trainNetwork(recentData, 3);
            
            // Lưu trọng số đã được cập nhật vào localStorage
            window.saveWeights();
            
            console.log("Học liên tục hoàn tất, đã lưu trọng số");
            updateLearningStatus(`Đã học từ ${recentData.length} mẫu dữ liệu. Tổng cộng: ${trainingData.length} mẫu`);
        } else {
            updateLearningStatus("Chưa có đủ dữ liệu để học");
        }
    } catch (error) {
        console.error("Lỗi khi học liên tục:", error);
        updateLearningStatus("Lỗi khi học: " + error.message);
    }
}

// Lịch sử nước đi
function addToHistory(sq, side) {
    const moveItem = document.createElement('li');
    const row = Math.floor(sq / size);
    const col = sq % size;
    const color = side === BLACK ? 'Đen' : 'Trắng';
    moveItem.textContent = `${color}: (${col}, ${row})`;
    moveList.insertBefore(moveItem, moveList.firstChild);
}

// Thêm hàm endGame để training network
function endGame() {
    if (gameEnded) return;
    gameEnded = true;

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // Tính điểm cuối cùng
    const finalScore = calculateScore();
    
    // Hiển thị kết quả
    let resultMessage = `Kết thúc ván đấu!\n`;
    resultMessage += `Đen: ${finalScore.black.toFixed(1)} điểm\n`;
    resultMessage += `Trắng: ${finalScore.white.toFixed(1)} điểm\n`;
    resultMessage += `Người thắng: ${finalScore.winner === BLACK ? 'Đen' : 'Trắng'}`;
    alert(resultMessage);

    // Cập nhật giao diện điểm số
    updateScore();

    // Sau khi hiện kết quả, hỏi người dùng muốn quay về trang tùy chọn không
    setTimeout(function() {
        if (confirm('Bạn có muốn quay về trang tùy chọn không?')) {
            // Ẩn game-container, hiện setup-container
            const setupContainer = document.getElementById('setup-container');
            const gameContainer = document.getElementById('game-container');
            if (setupContainer && gameContainer) {
                setupContainer.style.display = '';
                gameContainer.style.display = 'none';
            }
            // Reset bàn cờ
            if (typeof stopAutoLearning === 'function') stopAutoLearning();
            if (typeof timerInterval !== 'undefined' && timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            if (typeof initBoard === 'function') initBoard();
            if (typeof drawBoard === 'function') drawBoard();
            if (typeof updateScore === 'function') updateScore();
            if (typeof updatePlayerTimes === 'function') updatePlayerTimes();
            if (typeof moveList !== 'undefined' && moveList) moveList.innerHTML = '';
        } else {
            // Nếu không, có thể tự động chơi lại hoặc không làm gì
        }
    }, 200);

    // Nếu đang trong chế độ tự động học
    if (isAutoLearning) {
        // Lưu kết quả vào dữ liệu training
        if (dataCollector) {
            dataCollector.saveGameResult(finalScore.winner);
        }
        // Huấn luyện AI với kết quả ván đấu
        if (AUTO_RESTART) {
            setTimeout(() => {
                autoRestartGame();
            }, 2000);
        }
    }
}

// Thêm hàm để nhập dữ liệu training từ file
function importTrainingData(importedData) {
    if (!dataCollector || !Array.isArray(importedData)) {
        console.error("Không thể nhập dữ liệu: DataCollector không tồn tại hoặc dữ liệu không phải mảng");
        return;
    }
    
    // Số lượng dữ liệu hiện tại
    const currentDataCount = dataCollector.gameData.length;
    
    // Trích xuất từng mẫu dữ liệu và thêm vào dataCollector
    let importCount = 0;
    let duplicateCount = 0;
    
    for (const sample of importedData) {
        // Kiểm tra mẫu dữ liệu có đúng định dạng không
        if (!sample.board || !sample.move || !sample.side || sample.result === undefined) {
            console.warn("Bỏ qua mẫu dữ liệu không đúng định dạng:", sample);
            continue;
        }
        
        // Kiểm tra dữ liệu trùng lặp trước khi thêm
        if (dataCollector.isDuplicateData(sample.board, sample.move, sample.side)) {
            duplicateCount++;
            continue;
        }
        
        // Thêm vào dataCollector (không gọi saveGameState để tránh lưu tự động)
        dataCollector.gameData.push({
            board: sample.board,
            move: sample.move,
            side: sample.side,
            result: sample.result,
            timestamp: sample.timestamp || Date.now()
        });
        
        importCount++;
    }
    
    // Giới hạn kích thước dữ liệu nếu vượt quá ngưỡng
    if (dataCollector.gameData.length > dataCollector.maxDataSize) {
        const keepCount = Math.floor(dataCollector.maxDataSize * 0.9);
        dataCollector.gameData = dataCollector.gameData.slice(-keepCount);
    }
    
    // Lưu dữ liệu đã nhập
    dataCollector.saveData();
    
    console.log(`Đã nhập ${importCount} mẫu dữ liệu, bỏ qua ${duplicateCount} mẫu trùng lặp, giữ lại tổng cộng ${dataCollector.gameData.length} mẫu`);
}

// Thêm hàm để tự động xuất file
function exportData() {
    if (!dataCollector) {
        console.error("DataCollector không tồn tại");
        return;
    }
    
    const trainingData = dataCollector.exportTrainingData();
    if (trainingData.length === 0) {
        console.warn("Không có dữ liệu training để xuất");
        return;
    }
    
    // Tạo file JSON để tải xuống
    const dataStr = JSON.stringify(trainingData);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const dataUrl = URL.createObjectURL(dataBlob);
    
    // Tạo link tải xuống và click tự động
    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = 'go_training_data.json';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    console.log("Đã xuất dữ liệu training thành công");
}

// Hàm cập nhật thông báo trạng thái học
function updateLearningStatus(message) {
    if (autoLearningStatus) {
        autoLearningStatus.textContent = message;
    }
}

// Hàm thử tự động nhập file dữ liệu từ localStorage 
function tryAutoImportData() {
    try {
        // Kiểm tra xem đã có dữ liệu trong localStorage chưa
        const savedData = localStorage.getItem('goGameTrainingData');
        if (savedData && dataCollector) {
            const parsedData = JSON.parse(savedData);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
                // Đã có dữ liệu, hiển thị thông báo
                updateLearningStatus(`Đã tải ${parsedData.length} mẫu dữ liệu training từ bộ nhớ`);
            } else {
                // Chưa có dữ liệu, nhắc người dùng chơi để thu thập dữ liệu
                updateLearningStatus("Chưa có dữ liệu training. Hãy chơi để thu thập dữ liệu");
            }
        }
    } catch (error) {
        console.error("Lỗi khi tự động nhập dữ liệu:", error);
    }
}

// Hàm để tự động khởi động lại trò chơi
function autoRestartGame() {
    // Reset các biến trạng thái
    isAutoLearning = false;
    moveCounter = 0;
    exportCounter = 0;
    ko = EMPTY;
    userMove = 0;
    bestMove = EMPTY;
    side = BLACK;
    moveHistory = [];
    gameEnded = false;
    
    // Reset thời gian
    if (timeMode === 'turn') {
        playerTimes[BLACK] = turnTime;
        playerTimes[WHITE] = turnTime;
    } else {
        playerTimes[BLACK] = totalTime;
        playerTimes[WHITE] = totalTime;
    }
    
    // Reset điểm số
    playerScores = [0, 0, 0];
    
    // Khởi tạo lại bàn cờ
    initBoard();
    
    // Xóa lịch sử nước đi
    if (moveList) {
        moveList.innerHTML = '';
    }
    
    // Cập nhật giao diện
    drawBoard();
    updateScore();
    updatePlayerTimes();
    updateLearningStatus("Trò chơi đã tự động khởi động lại - AI tiếp tục học");
    
    // Nếu là chế độ computer-computer thì bắt đầu lại việc đi
    if (gameMode === 'computer-computer') {
        console.log("Tự động bắt đầu lại chế độ computer-computer");
        startComputerVsComputer();
    }
}

function startComputerVsComputer() {
    console.log('Bắt đầu chế độ Computer vs Computer');
    canvas.removeEventListener('click', userInput);
    
    // Dừng interval trước đó nếu có
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    
    // Đánh dấu rằng đang trong chế độ học tự động
    isAutoLearning = true;
    
    // Bắt đầu interval mới
    gameInterval = setInterval(() => {
        console.log('Debug - Chuẩn bị lượt đi mới:');
        console.log('Bên đang đi:', side === BLACK ? 'Đen' : 'Trắng');
        
        if (!play(6)) {
            console.log('Không thể thực hiện nước đi, kết thúc game');
            clearInterval(gameInterval);
            endGame();
            return;
        }
        
        // Chuyển lượt
        side = 3 - side;
        console.log('Đã chuyển lượt, bên tiếp theo:', side === BLACK ? 'Đen' : 'Trắng');
        
        drawBoard();
    }, 1000);
}

// Hàm để dừng chế độ tự động học
function stopAutoLearning() {
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
    isAutoLearning = false;
    updateLearningStatus("Đã dừng chế độ tự động học");
}

// Hàm tính điểm và xác định người thắng
function calculateScore() {
    let blackScore = 0;
    let whiteScore = 0;
    let komi = 6.5; // Điểm komi cho quân trắng

    // Đếm số quân cờ
    for (let i = 0; i < board.length; i++) {
        if (board[i] === BLACK) blackScore++;
        else if (board[i] === WHITE) whiteScore++;
    }

    // Đếm lãnh thổ
    let territory = score();
    blackScore += territory[BLACK];
    whiteScore += territory[WHITE];
    
    // Cộng komi cho quân trắng
    whiteScore += komi;

    // Cập nhật điểm số
    playerScores[BLACK] = blackScore;
    playerScores[WHITE] = whiteScore;

    return {
        black: blackScore,
        white: whiteScore,
        winner: blackScore > whiteScore ? BLACK : WHITE
    };
}

// Cập nhật hàm startTimer để xử lý thời gian
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        playerTimes[side]--;
        if (playerTimes[side] <= 0) {
            playerTimes[side] = 0;
            updatePlayerTimes();
            clearInterval(timerInterval);
            // Kết thúc trò chơi và tổng kết người thắng cuộc
            alert(`${playerNames[side]} hết giờ!`);
            endGame();
            return;
        }
        updatePlayerTimes();
    }, 1000);
}

// Cập nhật hàm updatePlayerTimes để cập nhật thời gian còn lại
function updatePlayerTimes() {
    if (player1Time && player2Time) {
        player1Time.textContent = formatTime(playerTimes[BLACK]);
        player2Time.textContent = formatTime(playerTimes[WHITE]);
    }
}

function formatTime(sec) {
    let m = Math.floor(sec / 60);
    let s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}