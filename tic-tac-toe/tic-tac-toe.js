function Game() {
	// `human = 1` đại diện cho người chơi.
	// `ai = -1` đại diện cho máy.
	// Việc dùng 1 và -1 giúp phần kiểm tra thắng/thua và minimax tính toán dễ hơn.
	var human = 1,
		ai = -1,

		// Lấy đối tượng `document` để truy cập các phần tử HTML.
		doc = document,

		// Khu vực bàn cờ 3x3.
		boardEl = doc.getElementById('board'),

		// Khối trạng thái hiển thị lượt chơi / trạng thái hiện tại của ván.
		statusEl = doc.getElementById('game-status'),

		// 3 phần tử thống kê số trận thắng, thua, hòa.
		winEl = doc.getElementById('stat-win'),
		lossEl = doc.getElementById('stat-loss'),
		drawEl = doc.getElementById('stat-draw'),

		// Ô chọn độ khó của AI.
		difficultyEl = doc.getElementById('difficulty'),

		// Nút reset ván chơi.
		resetButton = doc.getElementById('reset-game'),

		// Các phần tử thuộc popup kết quả cuối ván.
		resultModal = doc.getElementById('result-modal'),
		resultCard = doc.getElementById('result-card'),
		resultChip = doc.getElementById('result-chip'),
		resultTitle = doc.getElementById('result-title'),
		resultText = doc.getElementById('result-text'),
		resultClose = doc.getElementById('result-close'),

		// Mặc định bắt đầu ở mức trung bình.
		difficulty = 'medium',

		// Mảng lưu trạng thái 9 ô bàn cờ.
		// 0 = trống, 1 = người chơi, -1 = AI.
		board = [],

		// Mảng chứa 9 nút HTML của từng ô cờ.
		cells = [],

		// Thống kê số ván thắng, thua, hòa trong phiên hiện tại.
		stats = { win: 0, loss: 0, draw: 0 },

		// Các tổ hợp thắng trong tic-tac-toe:
		// 3 hàng ngang, 3 cột dọc, 2 đường chéo.
		combos = [
			[0, 1, 2],
			[3, 4, 5],
			[6, 7, 8],
			[0, 3, 6],
			[1, 4, 7],
			[2, 5, 8],
			[0, 4, 8],
			[2, 4, 6]
		],

		// Biến đánh dấu ván hiện tại đã kết thúc hay chưa.
		gameOver = false,

		// `undef` dùng để biểu diễn giá trị `undefined`
		// theo đúng phong cách code gốc.
		undef;

	function createSoundPlayer() {
		var AudioContext = window.AudioContext || window.webkitAudioContext;
		var audioCtx;

		function getContext() {
			if (!AudioContext) {
				return null;
			}
			if (!audioCtx) {
				audioCtx = new AudioContext();
			}
			if (audioCtx.state === 'suspended') {
				audioCtx.resume();
			}
			return audioCtx;
		}

		function tone(frequency, start, duration, type, gainValue) {
			var ctx = getContext();
			var oscillator, gain;

			if (!ctx) {
				return;
			}

			oscillator = ctx.createOscillator();
			gain = ctx.createGain();
			oscillator.type = type || 'sine';
			oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + start);
			gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
			gain.gain.exponentialRampToValueAtTime(gainValue || 0.08, ctx.currentTime + start + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
			oscillator.connect(gain);
			gain.connect(ctx.destination);
			oscillator.start(ctx.currentTime + start);
			oscillator.stop(ctx.currentTime + start + duration + 0.02);
		}

		return function playSound(name) {
			if (name === 'human') {
				tone(520, 0, 0.08, 'triangle', 0.16);
			} else if (name === 'ai') {
				tone(330, 0, 0.09, 'sine', 0.16);
			} else if (name === 'win') {
				tone(523, 0, 0.1, 'triangle', 0.18);
				tone(659, 0.08, 0.1, 'triangle', 0.18);
				tone(784, 0.16, 0.16, 'triangle', 0.18);
			} else if (name === 'loss') {
				tone(392, 0, 0.12, 'sawtooth', 0.12);
				tone(294, 0.12, 0.16, 'sawtooth', 0.12);
			} else if (name === 'draw') {
				tone(440, 0, 0.08, 'sine', 0.14);
				tone(440, 0.1, 0.08, 'sine', 0.14);
			} else if (name === 'reset') {
				tone(620, 0, 0.06, 'square', 0.1);
				tone(480, 0.07, 0.08, 'square', 0.1);
			}
		};
	}

	var playSound = createSoundPlayer();

	// Tạo 9 ô cờ trên giao diện ngay từ đầu.
	createBoard();

	// Hiển thị thống kê ban đầu.
	renderStats();

	// Reset để chuẩn bị trạng thái ban đầu cho ván đầu tiên.
	resetGame();

	// Khi bấm nút reset thì bắt đầu lại ván mới.
	if (resetButton) {
		resetButton.onclick = function () {
			playSound('reset');
			resetGame();
		};
	}

	// Khi bấm nút đóng trên popup kết quả thì ẩn popup đi.
	if (resultClose) {
		resultClose.onclick = hideResultModal;
	}

	// Nếu người dùng bấm vào vùng nền tối bên ngoài popup,
	// cũng đóng popup kết quả.
	if (resultModal) {
		resultModal.onclick = function (event) {
			if (event.target === resultModal) {
				hideResultModal();
			}
		};
	}

	// Khi người dùng đổi độ khó, cập nhật biến `difficulty`
	// để AI dùng mức phù hợp ở các nước đi sau đó.
	if (difficultyEl) {
		difficultyEl.onchange = function () {
			difficulty = difficultyEl.value;
		};
		difficulty = difficultyEl.value;
	}

	function createBoard() {
		// Hàm này tạo ra 9 button đại diện cho 9 ô của bàn cờ.
		var i, cell;

		// Xóa mọi nội dung cũ trong khu vực board trước khi tạo lại.
		boardEl.innerHTML = '';
		cells = [];

		// Tạo 9 ô từ index 0 đến 8.
		for (i = 0; i < 9; i++) {
			cell = doc.createElement('button');
			cell.type = 'button';
			cell.className = 'cell';

			// Gắn nhãn hỗ trợ truy cập.
			cell.setAttribute('aria-label', 'Ô ' + (i + 1));

			// Mỗi ô có một hàm xử lý click riêng tương ứng với index của nó.
			cell.onclick = createMoveHandler(i);

			boardEl.appendChild(cell);
			cells.push(cell);
		}
	}

	function createMoveHandler(index) {
		// Trả về hàm xử lý khi người chơi click vào 1 ô cụ thể.
		return function () {
			var next, outcome;

			// Nếu ván đã kết thúc hoặc ô này đã có quân cờ thì không làm gì cả.
			if (gameOver || board[index]) {
				return;
			}

			// Người chơi đánh trước bằng quân X.
			makeMove(index, human);

			// Sau nước đi của người chơi, kiểm tra xem ván đã kết thúc chưa.
			outcome = getOutcome();
			if (outcome) {
				finishOutcome(outcome);
				return;
			}

			// Nếu chưa kết thúc, AI sẽ chọn nước đi tiếp theo.
			next = chooseAIMove();

			// Nếu không còn ô trống để đi thì kết quả là hòa.
			if (next === undef) {
				finishOutcome('draw');
				return;
			}

			// Cập nhật trạng thái để báo rằng AI đang đi.
			setStatus(
				'playing',
				'AI đang chơi',
				'AI đang tính nước đi',
				'AI đang đánh quân O. Vui lòng chờ trong giây lát.'
			);

			// AI thực hiện nước đi.
			makeMove(next, ai);

			// Kiểm tra lại sau khi AI đi.
			outcome = getOutcome();
			if (outcome) {
				finishOutcome(outcome);
				return;
			}

			// Nếu vẫn chưa kết thúc, trả lại lượt cho người chơi.
			setStatus(
				'playing',
				'Đến lượt bạn',
				'Lượt của bạn',
				'Bạn đang đánh quân X. Hãy chọn một ô trống để tiếp tục.'
			);
		};
	}

	function makeMove(index, player) {
		// Ghi trạng thái vào mảng board.
		board[index] = player;

		// Hiển thị ký tự X hoặc O lên ô tương ứng.
		cells[index].textContent = player === human ? 'X' : 'O';

		// Gắn class màu cho X hoặc O.
		cells[index].classList.add(player === human ? 'cell-x' : 'cell-o');

		// Sau khi một ô đã được đánh thì không cho click lại nữa.
		cells[index].disabled = true;
		playSound(player === human ? 'human' : 'ai');
	}

	function chk(depth) {
		// Hàm này trả về điểm số để minimax đánh giá trạng thái bàn cờ.
		// Điểm dương: có lợi cho người chơi.
		// Điểm âm: có lợi cho AI.
		var winner = getWinner();

		// Nếu người chơi thắng, trả điểm dương.
		// Trừ theo `depth` để ưu tiên thắng nhanh hơn.
		if (winner === human) {
			return 10 - depth;
		}

		// Nếu AI thắng, trả điểm âm.
		// Cộng theo `depth` để AI ưu tiên thắng sớm.
		if (winner === ai) {
			return depth - 10;
		}
	}

	function chooseAIMove() {
		// Hàm chọn nước đi cho AI tùy theo độ khó.
		var moves, randomIndex;

		// Lấy danh sách ô còn trống.
		moves = getAvailableMoves();
		if (!moves.length) {
			return undef;
		}

		// Mức dễ: đi ngẫu nhiên hoàn toàn.
		if (difficulty === 'easy') {
			randomIndex = Math.floor(Math.random() * moves.length);
			return moves[randomIndex];
		}

		// Mức trung bình: có xác suất đi ngẫu nhiên để AI không quá mạnh.
		if (difficulty === 'medium' && Math.random() < 0.35) {
			randomIndex = Math.floor(Math.random() * moves.length);
			return moves[randomIndex];
		}

		// Nếu không đi ngẫu nhiên thì dùng minimax + alpha-beta pruning.
		return search(0, ai, -10, 10, getDepthLimit());
	}

	function getDepthLimit() {
		// Độ khó càng cao thì AI nhìn trước càng sâu.
		if (difficulty === 'easy') {
			return 1;
		}
		if (difficulty === 'medium') {
			return 3;
		}
		return 9;
	}

	function getAvailableMoves() {
		// Trả về danh sách index của các ô còn trống.
		var i, moves;

		moves = [];
		for (i = 0; i < 9; i++) {
			if (!board[i]) {
				moves.push(i);
			}
		}
		return moves;
	}

	function getOutcome() {
		// Xác định kết quả hiện tại của bàn cờ.
		var winner = getWinner();

		if (winner === human) {
			return 'win';
		}
		if (winner === ai) {
			return 'loss';
		}
		if (isBoardFull()) {
			return 'draw';
		}
	}

	function getWinner() {
		// Kiểm tra xem có tổ hợp nào 3 ô giống nhau không.
		var i, line, a, b, c;

		for (i = 0; i < combos.length; i++) {
			line = combos[i];
			a = board[line[0]];
			b = board[line[1]];
			c = board[line[2]];

			// Nếu 3 ô đều khác 0 và giống nhau thì đã có người thắng.
			if (a && a === b && b === c) {
				return a;
			}
		}
	}

	function search(depth, player, alpha, beta, maxDepth) {
		// Đây là hàm minimax có alpha-beta pruning.
		// Nó thử các nước đi có thể xảy ra và chấm điểm để tìm nước tối ưu.
		var i, value, best, next;

		// Nếu trạng thái hiện tại đã có người thắng/thua thì trả điểm luôn.
		if ((value = chk(depth))) {
			return value * player;
		}

		// Nếu đầy bàn thì hòa.
		if (isBoardFull()) {
			return depth ? 0 : undef;
		}

		// Chỉ tìm kiếm sâu đến mức độ khó cho phép.
		if (maxDepth > depth) {
			for (i = 0; i < 9; i++) {
				if (!board[i]) {
					// Thử đánh tạm vào ô trống này.
					board[i] = player;

					// Gọi đệ quy để đánh giá phản ứng của đối thủ.
					value = -search(depth + 1, -player, -beta, -alpha, maxDepth);

					// Hoàn tác nước đi thử để xét nhánh khác.
					board[i] = 0;

					// Lưu nước đi tốt nhất hiện tại.
					if (best === undef || value > best) {
						best = value;
						next = i;
					}

					// Cập nhật alpha.
					if (value > alpha) {
						alpha = value;
					}

					// Alpha-beta pruning:
					// nếu alpha >= beta thì không cần xét tiếp nhánh này nữa.
					if (alpha >= beta) {
						break;
					}
				}
			}
		}

		// Nếu đang ở sâu trong cây tìm kiếm thì trả điểm.
		// Nếu ở gốc cây (depth = 0) thì trả index của nước đi tốt nhất.
		return depth ? best || 0 : next;
	}

	function isBoardFull() {
		// Kiểm tra bàn cờ đã kín 9 ô hay chưa.
		var i;

		for (i = 0; i < 9; i++) {
			if (!board[i]) {
				return false;
			}
		}
		return true;
	}

	function setStatus(type, chip, title, text) {
		// Cập nhật phần trạng thái hiển thị trong khung chính.
		// Dùng để báo: lượt của ai, AI đang đi, hoặc ván đã kết thúc.
		statusEl.className = '';
		statusEl.classList.add('status-' + type);
		statusEl.innerHTML =
			'<div class="status-chip">' + chip + '</div>' +
			'<div class="status-title">' + title + '</div>' +
			'<div class="status-text">' + text + '</div>';
	}

	function showResultModal(type, chip, title, text) {
		// Hiển thị popup kết quả sau khi ván đấu kết thúc.
		resultCard.className = 'result-card result-' + type;
		resultChip.textContent = chip;
		resultTitle.textContent = title;
		resultText.textContent = text;
		resultModal.classList.add('is-open');
		resultModal.setAttribute('aria-hidden', 'false');
	}

	function hideResultModal() {
		// Ẩn popup kết quả.
		resultModal.classList.remove('is-open');
		resultModal.setAttribute('aria-hidden', 'true');
	}

	function finishOutcome(result) {
		// Chuyển từ trạng thái kết quả thô (`win/loss/draw`)
		// sang bước xử lý kết thúc ván.
		if (result === 'win') {
			endGame('win');
			return;
		}
		if (result === 'loss') {
			endGame('loss');
			return;
		}
		endGame('draw');
	}

	function endGame(result) {
		// Hàm xử lý khi ván chơi kết thúc.
		var i;

		gameOver = true;

		// Hiển thị trạng thái trong khung chính
		// và đồng thời bật popup kết quả.
		if (result === 'win') {
			playSound('win');
			setStatus('playing', 'Ván đấu kết thúc', 'Bạn đã thắng', 'Bạn đã tạo được ba ô liên tiếp trước AI.');
			showResultModal('win', 'Chiến thắng', 'Bạn đã thắng ván này', 'Bạn đã tạo được ba ô liên tiếp trước AI. Nhấn reset để bắt đầu ván mới.');
		} else if (result === 'loss') {
			playSound('loss');
			setStatus('playing', 'Ván đấu kết thúc', 'AI đã thắng', 'AI đã hoàn thành một hàng trước bạn.');
			showResultModal('loss', 'Thất bại', 'AI đã thắng ván này', 'AI đã hoàn thành một hàng trước bạn. Hãy thử lại hoặc đổi độ khó để tiếp tục.');
		} else {
			playSound('draw');
			setStatus('playing', 'Ván đấu kết thúc', 'Kết quả hòa', 'Không bên nào tạo được ba ô liên tiếp.');
			showResultModal('draw', 'Hòa', 'Ván đấu kết thúc hòa', 'Không bên nào tạo được ba ô liên tiếp. Nhấn reset để chơi thêm một ván mới.');
		}

		// Cập nhật thống kê sau khi ván kết thúc.
		updateStats(result);

		// Khóa toàn bộ ô cờ để người dùng không đánh tiếp khi ván đã xong.
		for (i = 0; i < cells.length; i++) {
			cells[i].disabled = true;
		}
	}

	function updateStats(result) {
		// Tăng bộ đếm thống kê tương ứng.
		if (!result) {
			return;
		}

		stats[result]++;
		renderStats();
	}

	function renderStats() {
		// Đổ số liệu thống kê từ biến JS lên giao diện.
		winEl.textContent = stats.win;
		lossEl.textContent = stats.loss;
		drawEl.textContent = stats.draw;
	}

	function resetGame() {
		// Reset lại bàn cờ để bắt đầu ván mới.
		// Lưu ý: chỉ reset ván hiện tại, không xóa thống kê.
		var i;

		board = [0, 0, 0, 0, 0, 0, 0, 0, 0];
		gameOver = false;

		// Khi reset thì ẩn popup kết quả cũ.
		hideResultModal();

		// Đưa trạng thái về lượt của người chơi.
		setStatus('playing', 'Đến lượt bạn', 'Lượt của bạn', 'Bạn đang đánh quân X. Hãy chọn một ô trống để bắt đầu ván mới.');

		// Xóa nội dung từng ô và mở khóa để có thể chơi tiếp.
		for (i = 0; i < cells.length; i++) {
			cells[i].textContent = '';
			cells[i].disabled = false;
			cells[i].className = 'cell';
		}
	}
}
