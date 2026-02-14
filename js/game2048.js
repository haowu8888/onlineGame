/* ========== 2048游戏 ========== */

(function () {
  'use strict';

  // --- Game2048 核心逻辑 ---
  class Game2048 {
    constructor(size = 4) {
      this.size = size;
      this.grid = [];
      this.score = 0;
      this.best = Storage.get('best_2048', 0);
      this.undoStack = [];
      this.maxUndo = 3;
      this.won = false;
      this.over = false;
      this.init();
    }

    init() {
      this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
      this.score = 0;
      this.won = false;
      this.over = false;
      this.undoStack = [];
      this.addRandom();
      this.addRandom();
    }

    addRandom() {
      const empty = [];
      for (let r = 0; r < this.size; r++)
        for (let c = 0; c < this.size; c++)
          if (this.grid[r][c] === 0) empty.push({ r, c });
      if (empty.length === 0) return false;
      const cell = empty[Math.floor(Math.random() * empty.length)];
      this.grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
      return cell;
    }

    clone(grid) {
      return grid.map(row => [...row]);
    }

    move(dir) {
      // dir: 0=up, 1=right, 2=down, 3=left
      const prev = this.clone(this.grid);
      const prevScore = this.score;
      let moved = false;
      const mergedCells = [];

      const rotate = (grid, times) => {
        let g = grid;
        for (let t = 0; t < times; t++) {
          const n = g.length;
          const ng = Array.from({ length: n }, () => Array(n).fill(0));
          for (let r = 0; r < n; r++)
            for (let c = 0; c < n; c++)
              ng[c][n - 1 - r] = g[r][c];
          g = ng;
        }
        return g;
      };

      // Normalize to left-move
      const rotations = [3, 2, 1, 0]; // up,right,down,left -> rotations to make it left
      const rot = rotations[dir];
      let g = rotate(this.grid, rot);

      for (let r = 0; r < this.size; r++) {
        // Compress
        let row = g[r].filter(v => v !== 0);
        const newRow = [];
        let i = 0;
        while (i < row.length) {
          if (i + 1 < row.length && row[i] === row[i + 1]) {
            const merged = row[i] * 2;
            newRow.push(merged);
            this.score += merged;
            if (merged === 2048) this.won = true;
            i += 2;
          } else {
            newRow.push(row[i]);
            i++;
          }
        }
        while (newRow.length < this.size) newRow.push(0);
        g[r] = newRow;
      }

      // Rotate back
      this.grid = rotate(g, (4 - rot) % 4);

      // Check if moved
      for (let r = 0; r < this.size; r++)
        for (let c = 0; c < this.size; c++)
          if (this.grid[r][c] !== prev[r][c]) moved = true;

      if (moved) {
        this.undoStack.push({ grid: prev, score: prevScore });
        if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
        const newCell = this.addRandom();
        if (this.score > this.best) {
          this.best = this.score;
          Storage.set('best_2048', this.best);
        }
        this.over = this.isGameOver();
        return { moved: true, newCell };
      }

      return { moved: false };
    }

    undo() {
      if (this.undoStack.length === 0) return false;
      const state = this.undoStack.pop();
      this.grid = state.grid;
      this.score = state.score;
      this.over = false;
      return true;
    }

    isGameOver() {
      for (let r = 0; r < this.size; r++)
        for (let c = 0; c < this.size; c++) {
          if (this.grid[r][c] === 0) return false;
          if (c + 1 < this.size && this.grid[r][c] === this.grid[r][c + 1]) return false;
          if (r + 1 < this.size && this.grid[r][c] === this.grid[r + 1][c]) return false;
        }
      return true;
    }

    saveState() {
      Storage.set('game_2048_save', {
        grid: this.grid,
        score: this.score,
        undoStack: this.undoStack,
        size: this.size,
        won: this.won,
        over: this.over
      });
    }

    static loadState() {
      return Storage.get('game_2048_save');
    }

    static clearSave() {
      Storage.remove('game_2048_save');
    }

    restoreFrom(saved) {
      this.size = saved.size;
      this.grid = saved.grid;
      this.score = saved.score;
      this.undoStack = saved.undoStack || [];
      this.won = saved.won || false;
      this.over = saved.over || false;
    }
  }

  // --- Game2048UI ---
  class Game2048UI {
    constructor() {
      this.boardEl = document.getElementById('board');
      this.tilesEl = document.getElementById('tiles');
      this.boardContainerEl = this.boardEl.parentElement;
      this.scoreEl = document.getElementById('score');
      this.bestEl = document.getElementById('best');
      this.undoCountEl = document.getElementById('undo-count');
      this.gameOverEl = document.getElementById('game-over');
      this.finalScoreEl = document.getElementById('final-score');

      this.settings = null;
      this.game = null;
      this.tileElements = new Map();
      this.tileId = 0;

      this.initSettings();
      this.newGame();
      this.bindEvents();
    }

    initSettings() {
      this.settings = new SettingsModal([
        {
          key: 'boardSize', label: '棋盘大小', type: 'select', default: 4,
          options: [
            { value: 3, label: '3×3 (简单)' },
            { value: 4, label: '4×4 (经典)' },
            { value: 5, label: '5×5 (困难)' }
          ]
        },
        {
          key: 'undoLimit', label: '悔棋次数', type: 'range',
          min: 0, max: 10, step: 1, default: 3
        },
        {
          key: 'animSpeed', label: '动画速度 (ms)', type: 'range',
          min: 50, max: 300, step: 25, default: 150
        }
      ], 'settings_2048', () => this.newGame(true));
    }

    newGame(forceNew) {
      const size = this.settings.get('boardSize');
      const saved = Game2048.loadState();
      if (!forceNew && saved && saved.size === size) {
        this.game = new Game2048(size);
        this.game.maxUndo = this.settings.get('undoLimit');
        this.game.restoreFrom(saved);
      } else {
        Game2048.clearSave();
        this.game = new Game2048(size);
        this.game.maxUndo = this.settings.get('undoLimit');
      }
      this.boardEl.className = `board size-${size}`;
      this.boardContainerEl.className = `board-container size-${size}`;
      this.renderBoard();
      this.renderTiles();
      this.updateStats();
      this.gameOverEl.classList.remove('active');
    }

    renderBoard() {
      const size = this.game.size;
      this.boardEl.innerHTML = '';
      for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell-bg';
        this.boardEl.appendChild(cell);
      }
    }

    getTileSize() {
      const sizes = { 3: 90, 4: 80, 5: 68 };
      let s = sizes[this.game.size] || 80;
      // 响应式
      if (window.innerWidth <= 360) {
        const small = { 3: 80, 4: 62, 5: 52 };
        s = small[this.game.size] || s;
      } else if (window.innerWidth <= 480) {
        const medium = { 3: 80, 4: 70, 5: 58 };
        s = medium[this.game.size] || s;
      }
      return s;
    }

    getGap() {
      if (window.innerWidth <= 360 && this.game.size >= 4) return this.game.size === 5 ? 5 : 6;
      return 8;
    }

    tilePos(r, c) {
      const size = this.getTileSize();
      const gap = this.getGap();
      return {
        top: r * (size + gap),
        left: c * (size + gap)
      };
    }

    renderTiles(newCell = null) {
      // Remove old tiles
      this.tilesEl.innerHTML = '';
      this.tileElements.clear();

      const speed = this.settings.get('animSpeed');
      this.tilesEl.style.setProperty('--anim-speed', `${speed}ms`);

      for (let r = 0; r < this.game.size; r++) {
        for (let c = 0; c < this.game.size; c++) {
          const val = this.game.grid[r][c];
          if (val === 0) continue;
          const el = document.createElement('div');
          const pos = this.tilePos(r, c);
          const cls = val <= 2048 ? `tile-${val}` : 'tile-super';
          el.className = `tile ${cls}`;
          el.style.top = pos.top + 'px';
          el.style.left = pos.left + 'px';
          el.textContent = val;

          if (newCell && newCell.r === r && newCell.c === c) {
            el.classList.add('tile-new');
          }

          this.tilesEl.appendChild(el);
        }
      }
    }

    updateStats() {
      this.scoreEl.textContent = this.game.score;
      this.bestEl.textContent = this.game.best;
      this.undoCountEl.textContent = this.game.undoStack.length;
    }

    handleMove(dir) {
      if (this.game.over) return;
      const result = this.game.move(dir);
      if (result.moved) {
        this.renderTiles(result.newCell);
        this.updateStats();
        if (this.game.over) {
          this.showGameOver();
        } else {
          this.game.saveState();
        }
      }
    }

    showGameOver() {
      this.finalScoreEl.textContent = this.game.score;
      this.gameOverEl.classList.add('active');
      Game2048.clearSave();
      updateLeaderboard('2048', this.game.score, { name: '修士' });
    }

    undo() {
      if (this.game.undo()) {
        this.renderTiles();
        this.updateStats();
        this.gameOverEl.classList.remove('active');
      } else {
        showToast('无法悔棋', 'error');
      }
    }

    bindEvents() {
      // 键盘
      const keyMap = {
        ArrowUp: 0, w: 0, W: 0,
        ArrowRight: 1, d: 1, D: 1,
        ArrowDown: 2, s: 2, S: 2,
        ArrowLeft: 3, a: 3, A: 3,
      };

      document.addEventListener('keydown', (e) => {
        if (keyMap[e.key] !== undefined) {
          e.preventDefault();
          this.handleMove(keyMap[e.key]);
        }
        if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          this.undo();
        }
      });

      // 按钮
      document.getElementById('btn-new').addEventListener('click', () => this.newGame(true));
      document.getElementById('btn-undo').addEventListener('click', () => this.undo());
      document.getElementById('btn-retry').addEventListener('click', () => this.newGame(true));

      // 触摸滑动
      let startX, startY;
      const board = this.boardEl.parentElement;

      board.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }, { passive: true });

      board.addEventListener('touchend', (e) => {
        if (!startX || !startY) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const threshold = 30;

        if (Math.max(absDx, absDy) < threshold) return;

        if (absDx > absDy) {
          this.handleMove(dx > 0 ? 1 : 3);
        } else {
          this.handleMove(dy > 0 ? 2 : 0);
        }
        startX = startY = null;
      }, { passive: true });

      // 窗口大小变化
      window.addEventListener('resize', () => this.renderTiles());
    }
  }

  // --- 初始化 ---
  initNav('2048');
  initParticles('#particles', 15);
  new Game2048UI();

})();
