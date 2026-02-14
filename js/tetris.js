/* ========== 俄罗斯方块 ========== */

(function () {
  'use strict';

  // 方块颜色（仙侠主题）
  const COLORS = {
    I: '#4adad4', // 青
    O: '#d4a44a', // 金
    T: '#9a6ad4', // 紫
    S: '#4ad46a', // 绿
    Z: '#d44a4a', // 红
    L: '#d4884a', // 橙
    J: '#4a7ad4', // 蓝
  };

  const GHOST_ALPHA = 0.2;

  // 方块形状定义
  const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
  };

  // 墙踢数据 (SRS)
  const WALL_KICKS = {
    normal: [
      [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
      [[0,0],[1,0],[1,-1],[0,2],[1,2]],
      [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
      [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    ],
    I: [
      [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
      [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
      [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
      [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    ]
  };

  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 25;

  // 计分系统
  const LINE_SCORES = [0, 100, 300, 500, 800];

  // --- Tetris核心类 ---
  class Tetris {
    constructor() {
      this.board = [];
      this.score = 0;
      this.level = 1;
      this.lines = 0;
      this.bag = [];
      this.current = null;
      this.next = null;
      this.gameOver = false;
      this.paused = false;
      this.playing = false;
      this.startLevel = 1;
    }

    init(startLevel = 1) {
      this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      this.score = 0;
      this.startLevel = startLevel;
      this.level = startLevel;
      this.lines = 0;
      this.bag = [];
      this.gameOver = false;
      this.paused = false;
      this.playing = true;
      this.next = this.nextPiece();
      this.spawnPiece();
    }

    fillBag() {
      const types = Object.keys(SHAPES);
      // Fisher-Yates shuffle
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }
      this.bag = types;
    }

    nextPiece() {
      if (this.bag.length === 0) this.fillBag();
      const type = this.bag.pop();
      const shape = SHAPES[type].map(r => [...r]);
      return {
        type,
        shape,
        row: 0,
        col: Math.floor((COLS - shape[0].length) / 2),
        rotation: 0
      };
    }

    spawnPiece() {
      this.current = this.next;
      this.next = this.nextPiece();
      if (this.collides(this.current.shape, this.current.row, this.current.col)) {
        this.gameOver = true;
        this.playing = false;
      }
    }

    collides(shape, row, col) {
      for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const nr = row + r;
          const nc = col + c;
          if (nc < 0 || nc >= COLS || nr >= ROWS) return true;
          if (nr >= 0 && this.board[nr][nc]) return true;
        }
      return false;
    }

    rotate(dir = 1) {
      if (!this.current || this.paused || this.gameOver) return false;
      const p = this.current;
      const n = p.shape.length;
      const rotated = Array.from({ length: n }, () => Array(n).fill(0));

      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          rotated[c][n - 1 - r] = p.shape[r][c];

      // 墙踢
      const kickData = p.type === 'I' ? WALL_KICKS.I : WALL_KICKS.normal;
      const kickIdx = p.rotation;
      const kicks = kickData[kickIdx];

      for (const [dx, dy] of kicks) {
        if (!this.collides(rotated, p.row - dy, p.col + dx)) {
          p.shape = rotated;
          p.col += dx;
          p.row -= dy;
          p.rotation = (p.rotation + 1) % 4;
          return true;
        }
      }
      return false;
    }

    moveLeft() {
      if (!this.current || this.paused || this.gameOver) return false;
      if (!this.collides(this.current.shape, this.current.row, this.current.col - 1)) {
        this.current.col--;
        return true;
      }
      return false;
    }

    moveRight() {
      if (!this.current || this.paused || this.gameOver) return false;
      if (!this.collides(this.current.shape, this.current.row, this.current.col + 1)) {
        this.current.col++;
        return true;
      }
      return false;
    }

    moveDown() {
      if (!this.current || this.paused || this.gameOver) return false;
      if (!this.collides(this.current.shape, this.current.row + 1, this.current.col)) {
        this.current.row++;
        return true;
      }
      this.lock();
      return false;
    }

    hardDrop() {
      if (!this.current || this.paused || this.gameOver) return 0;
      let dropped = 0;
      while (!this.collides(this.current.shape, this.current.row + 1, this.current.col)) {
        this.current.row++;
        dropped++;
      }
      this.score += dropped * 2;
      this.lock();
      return dropped;
    }

    getGhostRow() {
      if (!this.current) return 0;
      let row = this.current.row;
      while (!this.collides(this.current.shape, row + 1, this.current.col)) {
        row++;
      }
      return row;
    }

    lock() {
      const p = this.current;
      for (let r = 0; r < p.shape.length; r++)
        for (let c = 0; c < p.shape[r].length; c++) {
          if (!p.shape[r][c]) continue;
          const nr = p.row + r;
          const nc = p.col + c;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            this.board[nr][nc] = p.type;
          }
        }

      const cleared = this.clearLines();
      this.score += LINE_SCORES[cleared] * this.level;
      this.lines += cleared;
      this.level = this.startLevel + Math.floor(this.lines / 10);
      this.spawnPiece();
      if (!this.gameOver) {
        this.saveState();
      }
      return cleared;
    }

    clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.board[r].every(cell => cell !== null)) {
          this.board.splice(r, 1);
          this.board.unshift(Array(COLS).fill(null));
          cleared++;
          r++; // recheck this row
        }
      }
      return cleared;
    }

    getDropInterval() {
      return Math.max(50, 800 - (this.level - 1) * 70);
    }

    saveState() {
      Storage.set('game_tetris_save', {
        board: this.board,
        score: this.score,
        level: this.level,
        lines: this.lines,
        current: this.current,
        next: this.next,
        bag: this.bag,
        startLevel: this.startLevel
      });
    }

    static loadState() {
      return Storage.get('game_tetris_save');
    }

    static clearSave() {
      Storage.remove('game_tetris_save');
    }

    restoreFrom(saved) {
      this.board = saved.board;
      this.score = saved.score;
      this.level = saved.level;
      this.lines = saved.lines;
      this.current = saved.current;
      this.next = saved.next;
      this.bag = saved.bag || [];
      this.startLevel = saved.startLevel || 1;
      this.gameOver = false;
      this.paused = false;
      this.playing = true;
    }
  }

  // --- TetrisUI ---
  class TetrisUI {
    constructor() {
      this.canvas = document.getElementById('tetris-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.nextCanvas = document.getElementById('next-canvas');
      this.nextCtx = this.nextCanvas.getContext('2d');
      this.overlay = document.getElementById('overlay');
      this.overlayTitle = document.getElementById('overlay-title');
      this.overlaySub = document.getElementById('overlay-sub');
      this.overlayBtn = document.getElementById('overlay-btn');
      this.scoreEl = document.getElementById('score');
      this.levelEl = document.getElementById('level');
      this.linesEl = document.getElementById('lines');

      this.game = new Tetris();
      this.showGhost = true;
      this.animFrame = null;
      this.lastDrop = 0;
      this.lastTime = 0;

      this.initSettings();
      this.bindEvents();
      const saved = Tetris.loadState();
      if (saved) {
        this.showOverlay('天降奇石', '检测到上次进度', false, true);
      } else {
        this.showOverlay('天降奇石', '按 开始 按钮或 Enter 键开始', false);
      }
    }

    initSettings() {
      this.settingsModal = new SettingsModal([
        {
          key: 'startLevel', label: '起始等级', type: 'range',
          min: 1, max: 15, step: 1, default: 1
        },
        {
          key: 'showGhost', label: '幽灵方块', type: 'checkbox',
          default: true, checkLabel: '显示落点预览'
        }
      ], 'settings_tetris', (vals) => {
        this.showGhost = vals.showGhost;
      });
      this.showGhost = this.settingsModal.get('showGhost');
    }

    startGame() {
      Tetris.clearSave();
      const startLevel = this.settingsModal.get('startLevel');
      this.game.init(startLevel);
      this.overlay.classList.remove('active');
      this.lastDrop = 0;
      this.updateStats();
      this.loop(0);
    }

    resumeGame() {
      const saved = Tetris.loadState();
      if (!saved) { this.startGame(); return; }
      this.game.restoreFrom(saved);
      this.overlay.classList.remove('active');
      this.lastDrop = 0;
      this.updateStats();
      this.loop(0);
    }

    loop(time) {
      if (!this.game.playing) return;
      if (this.game.paused) {
        this.animFrame = requestAnimationFrame((t) => this.loop(t));
        return;
      }

      const delta = time - this.lastDrop;
      if (delta > this.game.getDropInterval()) {
        this.game.moveDown();
        this.lastDrop = time;
      }

      this.render();
      this.updateStats();

      if (this.game.gameOver) {
        this.onGameOver();
        return;
      }

      this.animFrame = requestAnimationFrame((t) => this.loop(t));
    }

    render() {
      const ctx = this.ctx;
      const bs = BLOCK_SIZE;

      // 清空
      ctx.fillStyle = 'rgba(10, 14, 26, 0.95)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // 网格线
      ctx.strokeStyle = 'rgba(212, 164, 74, 0.06)';
      ctx.lineWidth = 0.5;
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * bs);
        ctx.lineTo(COLS * bs, r * bs);
        ctx.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * bs, 0);
        ctx.lineTo(c * bs, ROWS * bs);
        ctx.stroke();
      }

      // 已锁定方块
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          if (this.game.board[r][c]) {
            this.drawBlock(ctx, c * bs, r * bs, bs, COLORS[this.game.board[r][c]]);
          }
        }

      // 幽灵方块
      if (this.game.current && this.showGhost) {
        const ghostRow = this.game.getGhostRow();
        const p = this.game.current;
        const color = COLORS[p.type];
        ctx.globalAlpha = GHOST_ALPHA;
        for (let r = 0; r < p.shape.length; r++)
          for (let c = 0; c < p.shape[r].length; c++) {
            if (!p.shape[r][c]) continue;
            this.drawBlock(ctx, (p.col + c) * bs, (ghostRow + r) * bs, bs, color);
          }
        ctx.globalAlpha = 1;
      }

      // 当前方块
      if (this.game.current) {
        const p = this.game.current;
        const color = COLORS[p.type];
        for (let r = 0; r < p.shape.length; r++)
          for (let c = 0; c < p.shape[r].length; c++) {
            if (!p.shape[r][c]) continue;
            const nr = p.row + r;
            if (nr < 0) continue;
            this.drawBlock(ctx, (p.col + c) * bs, nr * bs, bs, color);
          }
      }

      // 下一个预览
      this.renderNext();
    }

    drawBlock(ctx, x, y, size, color) {
      const padding = 1;
      ctx.fillStyle = color;
      ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);

      // 高光
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(x + padding, y + padding, size - padding * 2, 3);
      ctx.fillRect(x + padding, y + padding, 3, size - padding * 2);

      // 阴影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(x + padding, y + size - 3 - padding, size - padding * 2, 3);
      ctx.fillRect(x + size - 3 - padding, y + padding, 3, size - padding * 2);
    }

    renderNext() {
      const ctx = this.nextCtx;
      const bs = 20;
      ctx.fillStyle = 'rgba(26, 34, 53, 1)';
      ctx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

      if (!this.game.next) return;
      const shape = this.game.next.shape;
      const color = COLORS[this.game.next.type];
      const offsetX = (this.nextCanvas.width - shape[0].length * bs) / 2;
      const offsetY = (this.nextCanvas.height - shape.length * bs) / 2;

      for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          this.drawBlock(ctx, offsetX + c * bs, offsetY + r * bs, bs, color);
        }
    }

    updateStats() {
      this.scoreEl.textContent = this.game.score;
      this.levelEl.textContent = this.game.level;
      this.linesEl.textContent = this.game.lines;
    }

    showOverlay(title, sub, showBtn = false, showResume = false) {
      this.overlayTitle.textContent = title;
      this.overlaySub.textContent = sub;
      this.overlayBtn.style.display = showBtn ? 'inline-flex' : 'none';
      // Resume/new buttons
      let resumeWrap = this.overlay.querySelector('.resume-btns');
      if (resumeWrap) resumeWrap.remove();
      if (showResume) {
        resumeWrap = document.createElement('div');
        resumeWrap.className = 'resume-btns';
        resumeWrap.style.cssText = 'display:flex;gap:12px;justify-content:center;margin-top:16px;';
        const btnResume = document.createElement('button');
        btnResume.className = 'btn btn-gold btn-sm';
        btnResume.textContent = '继续上局';
        btnResume.addEventListener('click', () => this.resumeGame());
        const btnNew = document.createElement('button');
        btnNew.className = 'btn btn-outline btn-sm';
        btnNew.textContent = '新对局';
        btnNew.addEventListener('click', () => this.startGame());
        resumeWrap.append(btnResume, btnNew);
        this.overlay.appendChild(resumeWrap);
      }
      this.overlay.classList.add('active');
    }

    onGameOver() {
      Tetris.clearSave();
      this.showOverlay('道心破碎', `最终分数：${this.game.score}`, true);
      updateLeaderboard('tetris', this.game.score, { name: '修士', level: this.game.level });
    }

    bindEvents() {
      // 键盘
      document.addEventListener('keydown', (e) => {
        if (!this.game.playing) {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.startGame();
          }
          return;
        }

        switch (e.key) {
          case 'ArrowLeft': case 'a': case 'A':
            e.preventDefault(); this.game.moveLeft(); break;
          case 'ArrowRight': case 'd': case 'D':
            e.preventDefault(); this.game.moveRight(); break;
          case 'ArrowDown': case 's': case 'S':
            e.preventDefault(); this.game.moveDown(); this.score += 1; break;
          case 'ArrowUp': case 'w': case 'W':
            e.preventDefault(); this.game.rotate(); break;
          case ' ':
            e.preventDefault(); this.game.hardDrop(); break;
          case 'p': case 'P':
            e.preventDefault(); this.togglePause(); break;
        }
      });

      // 按钮
      document.getElementById('btn-start').addEventListener('click', () => this.startGame());
      document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
      this.overlayBtn.addEventListener('click', () => this.startGame());

      // 触控按钮
      document.querySelectorAll('.touch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (!this.game.playing || this.game.paused) return;
          const action = btn.dataset.action;
          switch (action) {
            case 'left': this.game.moveLeft(); break;
            case 'right': this.game.moveRight(); break;
            case 'down': this.game.moveDown(); break;
            case 'rotate': this.game.rotate(); break;
            case 'drop': this.game.hardDrop(); break;
          }
        });
      });
    }

    togglePause() {
      if (!this.game.playing || this.game.gameOver) return;
      this.game.paused = !this.game.paused;
      if (this.game.paused) {
        this.showOverlay('暂停', '按 P 继续', false);
      } else {
        this.overlay.classList.remove('active');
      }
    }
  }

  // --- 初始化 ---
  initNav('tetris');
  initParticles('#particles', 15);
  new TetrisUI();

})();
