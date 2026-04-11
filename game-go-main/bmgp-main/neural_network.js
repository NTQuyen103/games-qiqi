// Kiểm tra xem các đối tượng đã tồn tại chưa
if (typeof window.neuralNet === 'undefined') {
    // Định nghĩa các hằng số cục bộ để tránh phụ thuộc vào biến toàn cục
    const NN_EMPTY = 0;
    const NN_BLACK = 1;
    const NN_WHITE = 2;
    const NN_OFFBOARD = 7;

    class NeuralNetwork {
        constructor() {
            this.weights = {
                territory: 1.0,
                liberties: 0.8,
                captures: 1.2,
                center_control: 0.9,
                connectivity: 0.7
            };
        }

        evaluate(gameState) {
            if (!gameState || !gameState.board) {
                console.error("GameState không hợp lệ:", gameState);
                return 0;
            }

            // Debug chi tiết gameState trong NeuralNetwork
            console.log('Debug chi tiết gameState trong NeuralNetwork:');
            console.log('Board:', gameState.board);
            console.log('Side:', gameState.side);
            console.log('Ko:', gameState.ko);
            console.log('Board size:', Math.sqrt(gameState.board.length));

          
            let blackCount = 0;
            let whiteCount = 0;
            let emptyCount = 0;
            
            
            console.log('Debug chi tiết từng ô:');
            for (let i = 0; i < gameState.board.length; i++) {
                const row = Math.floor(i / Math.sqrt(gameState.board.length));
                const col = i % Math.sqrt(gameState.board.length);
                
                if (gameState.board[i] === NN_BLACK) {
                    blackCount++;
                    console.log(`Ô [${row},${col}]: Đen`);
                }
                else if (gameState.board[i] === NN_WHITE) {
                    whiteCount++;
                    console.log(`Ô [${row},${col}]: Trắng`);
                }
                else if (gameState.board[i] === NN_EMPTY) {
                    emptyCount++;
                    console.log(`Ô [${row},${col}]: Trống`);
                }
                else {
                    console.log(`Ô [${row},${col}]: Giá trị không hợp lệ (${gameState.board[i]})`);
                }
            }
            
            console.log('Số lượng quân cờ (đếm thủ công):', {
                black: blackCount,
                white: whiteCount,
                empty: emptyCount
            });

            const features = this.extractFeatures(gameState);
            let score = 0;
            
            score += features.territory * this.weights.territory;
            score += features.liberties * this.weights.liberties; 
            score += features.captures * this.weights.captures;
            score += features.center_control * this.weights.center_control;
            score += features.connectivity * this.weights.connectivity;

            return score;
        }

        extractFeatures(gameState) {
            return {
                territory: this.calculateTerritory(gameState),
                liberties: this.calculateLiberties(gameState),
                captures: this.calculateCaptures(gameState),
                center_control: this.calculateCenterControl(gameState),
                connectivity: this.calculateConnectivity(gameState)
            };
        }

        calculateTerritory(gameState) {
            // Kiểm tra gameState
            if (!gameState || !gameState.board) {
                console.error("GameState không hợp lệ trong calculateTerritory:", gameState);
                return 0;
            }

            let territoryScore = 0;
            const visited = new Set();
            const boardSize = Math.sqrt(gameState.board.length);
            
            for (let sq = 0; sq < gameState.board.length; sq++) {
                if (gameState.board[sq] === NN_EMPTY && !visited.has(sq)) {
                    const [owner, points] = this.floodFillTerritory(gameState, sq, visited, boardSize);
                    if (owner === gameState.side) {
                        territoryScore += points;
                    }
                }
            }
            return territoryScore;
        }

        floodFillTerritory(gameState, sq, visited, boardSize) {
            const queue = [sq];
            const territory = new Set();
            const borders = new Set();
            
            while (queue.length > 0) {
                const current = queue.pop();
                if (visited.has(current)) continue;
                
                visited.add(current);
                if (gameState.board[current] === NN_EMPTY) {
                    territory.add(current);
                    // Thêm các ô xung quanh vào queue
                    for (const offset of [1, -1, boardSize, -boardSize]) {
                        const next = current + offset;
                        if (next >= 0 && next < gameState.board.length && !visited.has(next)) {
                            queue.push(next);
                        }
                    }
                } else if (gameState.board[current] !== NN_OFFBOARD) {
                    borders.add(gameState.board[current]);
                }
            }

            // Kiểm tra xem territory thuộc về ai
            if (borders.size === 1) {
                const owner = borders.values().next().value;
                return [owner, territory.size];
            }
            return [NN_EMPTY, territory.size];
        }

        calculateLiberties(gameState) {
            if (!gameState || !gameState.board) {
                return 0;
            }

            // Đơn giản hóa để tránh phụ thuộc vào biến toàn cục
            let totalLiberties = 0;
            const boardSize = Math.sqrt(gameState.board.length);
            
            for (let sq = 0; sq < gameState.board.length; sq++) {
                if (gameState.board[sq] === gameState.side) {
                    // Đếm số ô trống xung quanh
                    for (const offset of [1, -1, boardSize, -boardSize]) {
                        const next = sq + offset;
                        if (next >= 0 && next < gameState.board.length && gameState.board[next] === NN_EMPTY) {
                            totalLiberties++;
                        }
                    }
                }
            }
            return totalLiberties;
        }

        calculateCaptures(gameState) {
            if (!gameState || !gameState.board) {
                return 0;
            }
            
            // Đơn giản hóa
            let captures = 0;
            const boardSize = Math.sqrt(gameState.board.length);
            const opponent = 3 - gameState.side;
            
            // Đếm số quân địch có ít liberties
            for (let sq = 0; sq < gameState.board.length; sq++) {
                if (gameState.board[sq] === opponent) {
                    let liberties = 0;
                    for (const offset of [1, -1, boardSize, -boardSize]) {
                        const next = sq + offset;
                        if (next >= 0 && next < gameState.board.length && gameState.board[next] === NN_EMPTY) {
                            liberties++;
                        }
                    }
                    if (liberties <= 1) {
                        captures++;
                    }
                }
            }
            return captures;
        }

        calculateCenterControl(gameState) {
            if (!gameState || !gameState.board) {
                return 0;
            }
            
            let centerControl = 0;
            const boardSize = Math.sqrt(gameState.board.length);
            const center = Math.floor(boardSize / 2);
            
            for (let row = center - 2; row <= center + 2; row++) {
                for (let col = center - 2; col <= center + 2; col++) {
                    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
                        const sq = row * boardSize + col;
                        if (gameState.board[sq] === gameState.side) {
                            centerControl++;
                        }
                    }
                }
            }
            return centerControl;
        }

        calculateConnectivity(gameState) {
            if (!gameState || !gameState.board) {
                return 0;
            }
            
            let connectivity = 0;
            const boardSize = Math.sqrt(gameState.board.length);
            
            for (let sq = 0; sq < gameState.board.length; sq++) {
                if (gameState.board[sq] === gameState.side) {
                    for (const offset of [1, boardSize, -1, -boardSize]) {
                        const next = sq + offset;
                        if (next >= 0 && next < gameState.board.length && gameState.board[next] === gameState.side) {
                            connectivity++;
                        }
                    }
                }
            }
            return connectivity;
        }

        updateWeights(learningRate, gradient) {
            for (let feature in this.weights) {
                this.weights[feature] += learningRate * gradient[feature];
            }
        }
    }

    class GameDataCollector {
        constructor() {
            this.gameData = [];
            // Giới hạn kích thước dữ liệu để tránh tràn bộ nhớ và tăng tốc độ học
            this.maxDataSize = 200;
            
            // Tải dữ liệu đã lưu (nếu có)
            this.loadSavedData();
        }

        // Thêm phương thức kiểm tra dữ liệu trùng lặp
        isDuplicateData(board, move, side) {
            return this.gameData.some(item => {
                // So sánh nước đi và lượt chơi
                if (item.move !== move || item.side !== side) {
                    return false;
                }
                
                // So sánh bàn cờ (board)
                const existingBoard = item.board;
                if (existingBoard.length !== board.length) {
                    return false;
                }
                
                // So sánh từng ô trên bàn cờ
                for (let i = 0; i < board.length; i++) {
                    if (existingBoard[i] !== board[i]) {
                        return false;
                    }
                }
                
                return true; // Nếu tất cả đều giống nhau thì là dữ liệu trùng lặp
            });
        }

        saveGameState(board, move, side, result) {
            // Tạo một bản sao của board để tránh tham chiếu
            const boardCopy = JSON.parse(JSON.stringify(board));
            
            // Kiểm tra trùng lặp trước khi thêm vào
            if (this.isDuplicateData(boardCopy, move, side)) {
                console.log("Bỏ qua dữ liệu trùng lặp");
                return; // Bỏ qua nếu là dữ liệu trùng lặp
            }
            
            // Lưu trạng thái game với thông tin thêm
            this.gameData.push({
                board: boardCopy,
                move: move,
                side: side,
                result: result,
                timestamp: Date.now() // Thêm timestamp để có thể sắp xếp theo thời gian
            });
            
            // Giới hạn kích thước dữ liệu
            if (this.gameData.length > this.maxDataSize) {
                // Giữ lại 75% dữ liệu gần nhất
                const keepCount = Math.floor(this.maxDataSize * 0.75);
                this.gameData = this.gameData.slice(-keepCount);
            }
            
            // Tự động lưu dữ liệu
            this.saveData();
        }

        exportTrainingData() {
            return this.gameData;
        }
        
        // Lưu dữ liệu vào localStorage
        saveData() {
            try {
                localStorage.setItem('goGameTrainingData', JSON.stringify(this.gameData));
                console.log(`Đã lưu ${this.gameData.length} mẫu dữ liệu training`);
            } catch (error) {
                console.error("Lỗi khi lưu dữ liệu training:", error);
                // Nếu lỗi có thể do dữ liệu quá lớn, giảm kích thước và thử lại
                if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                    this.gameData = this.gameData.slice(-Math.floor(this.maxDataSize * 0.5));
                    this.saveData();
                }
            }
        }
        
        // Tải dữ liệu từ localStorage
        loadSavedData() {
            try {
                const savedData = localStorage.getItem('goGameTrainingData');
                if (savedData) {
                    this.gameData = JSON.parse(savedData);
                    console.log(`Đã tải ${this.gameData.length} mẫu dữ liệu training`);
                }
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu training:", error);
                // Nếu có lỗi, reset dữ liệu
                this.gameData = [];
            }
        }
        
        // Xóa dữ liệu đã lưu
        clearData() {
            this.gameData = [];
            localStorage.removeItem('goGameTrainingData');
            console.log("Đã xóa tất cả dữ liệu training");
        }
        
        // Xóa dữ liệu trùng lặp
        removeDuplicates() {
            const uniqueData = [];
            const seen = new Set();
            
            for (const item of this.gameData) {
                // Tạo key duy nhất cho mỗi bản ghi
                const key = `${item.move}-${item.side}-${JSON.stringify(item.board)}`;
                
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueData.push(item);
                }
            }
            
            const removedCount = this.gameData.length - uniqueData.length;
            this.gameData = uniqueData;
            
            if (removedCount > 0) {
                console.log(`Đã xóa ${removedCount} bản ghi trùng lặp`);
                this.saveData();
            }
            
            return removedCount;
        }
    }

    function trainNetwork(trainingData, epochs = 100) {
        const learningRate = 0.01;
        
        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;
            
            for (const data of trainingData) {
                const prediction = neuralNet.evaluate(data.board);
                const actual = data.result;
                
                const loss = actual - prediction;
                totalLoss += loss * loss;
                
                const gradient = calculateGradient(loss, data);
                neuralNet.updateWeights(learningRate, gradient);
            }
            
            console.log(`Epoch ${epoch + 1}, Loss: ${totalLoss / trainingData.length}`);
        }
    }

    function calculateGradient(loss, data) {
        const features = neuralNet.extractFeatures(data.board);
        const gradient = {};
        
        for (let feature in features) {
            gradient[feature] = loss * features[feature];
        }
        
        return gradient;
    }

    function saveWeights() {
        const weights = neuralNet.weights;
        localStorage.setItem('goGameWeights', JSON.stringify(weights));
    }

    function loadWeights() {
        const savedWeights = localStorage.getItem('goGameWeights');
        if (savedWeights) {
            neuralNet.weights = JSON.parse(savedWeights);
        }
    }

    // Khởi tạo neural network và data collector
    let neuralNet = new NeuralNetwork();
    let dataCollector = new GameDataCollector();
    
    // Thêm các biến và hàm vào window object
    window.neuralNet = neuralNet;
    window.dataCollector = dataCollector;
    window.saveWeights = saveWeights;
    window.loadWeights = loadWeights;
    window.trainNetwork = trainNetwork;
} 