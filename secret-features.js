(function () {
  const STYLE_ID = 'secret-features-style';
  const TOAST_ID = 'secret-features-toast';
  const TIMER_CONTAINER_ID = 'secret-timer-container';
  const activeEffects = new Map();

  const helpers = {
    ensureBaseStyles,
    showToast,
    showOverlay,
    ensureCountdownContainer,
    activateWithTimer
  };

  function ensureBaseStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .secret-toast {
        position: fixed;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        padding: 14px 18px;
        border-radius: 10px;
        font-family: 'Press Start 2P', system-ui, sans-serif;
        font-size: 11px;
        letter-spacing: 1px;
        z-index: 99999;
        box-shadow: 0 6px 20px rgba(0,0,0,0.35);
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      .secret-toast.show {
        opacity: 1;
        transform: translate(-50%, 0);
      }
      .secret-highlight {
        animation: secret-pulse 1.2s ease-in-out infinite;
        box-shadow: 0 0 0 3px rgba(0, 255, 170, 0.45), 0 0 18px rgba(0,255,170,0.7);
      }
      @keyframes secret-pulse {
        0%, 100% { box-shadow: 0 0 0 3px rgba(0,255,170,0.35), 0 0 14px rgba(0,255,170,0.7); }
        50% { box-shadow: 0 0 0 6px rgba(0,255,170,0.55), 0 0 28px rgba(0,255,170,0.9); }
      }
      .secret-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 5, 12, 0.82);
        backdrop-filter: blur(6px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: #0ff;
        font-family: 'Press Start 2P', system-ui, sans-serif;
        z-index: 99998;
        padding: 32px 18px;
      }
      .secret-overlay h2 {
        font-size: 20px;
        margin-bottom: 18px;
        text-shadow: 0 0 18px rgba(0,255,255,0.8);
      }
      .secret-overlay p {
        max-width: 520px;
        font-size: 12px;
        line-height: 1.6;
      }
      .secret-overlay button {
        margin-top: 28px;
        padding: 12px 18px;
        font-size: 12px;
        border: 2px solid #0ff;
        color: #0ff;
        background: transparent;
        border-radius: 6px;
        cursor: pointer;
      }
      .secret-path-cell {
        position: relative;
      }
      .secret-path-cell::after {
        content: '';
        position: absolute;
        inset: 4px;
        border-radius: 6px;
        background: rgba(255, 255, 0, 0.25);
        box-shadow: 0 0 12px rgba(255, 255, 0, 0.8);
        pointer-events: none;
      }
      .secret-simon-hint {
        outline: 4px dashed rgba(255,255,0,0.8);
        outline-offset: 4px;
        filter: saturate(1.4);
      }
      .secret-timer-container {
        position: fixed;
        top: 16px;
        right: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 99999;
        font-family: 'Press Start 2P', system-ui, sans-serif;
      }
      .secret-timer {
        min-width: 220px;
        background: rgba(4, 26, 32, 0.92);
        border: 1px solid rgba(0, 255, 213, 0.6);
        border-radius: 12px;
        padding: 12px 16px;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
        color: #d8ffff;
      }
      .secret-timer-name {
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 1px;
        color: #7fffd4;
      }
      .secret-timer-count {
        font-size: 14px;
        margin-top: 6px;
      }
      .secret-timer-count strong {
        font-size: 24px;
        margin-right: 4px;
      }
      .secret-timer-detail {
        display: block;
        margin-top: 8px;
        font-size: 10px;
        line-height: 1.4;
        color: #b4f5ff;
      }
    `;
    document.head.appendChild(style);
  }

  function showToast(title, description) {
    ensureBaseStyles();
    const existing = document.getElementById(TOAST_ID);
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.className = 'secret-toast';
    toast.innerHTML = `<strong>${title}</strong><br>${description}`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 3600);
  }

  function showOverlay(title, description) {
    ensureBaseStyles();
    const overlay = document.createElement('div');
    overlay.className = 'secret-overlay';
    overlay.innerHTML = `
      <h2>${title}</h2>
      <p>${description}</p>
      <button type="button">Cerrar</button>
    `;
    const close = () => {
      overlay.remove();
    };
    overlay.querySelector('button').addEventListener('click', close, { once: true });
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) close();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function ensureCountdownContainer() {
    ensureBaseStyles();
    let container = document.getElementById(TIMER_CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = TIMER_CONTAINER_ID;
      container.className = 'secret-timer-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function activateWithTimer(entry, options = {}) {
    if (!entry || !entry.key) return () => {};
    ensureBaseStyles();
    const previous = activeEffects.get(entry.key);
    if (previous && typeof previous.stop === 'function') {
      previous.stop();
    }

    const duration = typeof options.duration === 'number' ? options.duration : 10000;
    const container = ensureCountdownContainer();
    const seconds = Math.max(1, Math.ceil(duration / 1000));
    const timerEl = document.createElement('div');
    timerEl.className = 'secret-timer';
    timerEl.innerHTML = `
      <span class="secret-timer-name">${options.label || entry.name}</span>
      <div class="secret-timer-count"><strong>${seconds}</strong>s</div>
      <span class="secret-timer-detail">${options.detail || entry.description || ''}</span>
    `;
    const detailEl = timerEl.querySelector('.secret-timer-detail');
    if (!detailEl.textContent.trim()) {
      detailEl.style.display = 'none';
    }
    container.appendChild(timerEl);

    const countEl = timerEl.querySelector('.secret-timer-count strong');
    let remaining = seconds;
    const cleanupFns = [];
    let finished = false;

    const registerCleanup = (fn) => {
      if (typeof fn === 'function') cleanupFns.push(fn);
    };

    const context = {
      registerCleanup,
      setDetail(text) {
        if (!detailEl) return;
        if (!text) {
          detailEl.textContent = '';
          detailEl.style.display = 'none';
        } else {
          detailEl.textContent = text;
          detailEl.style.display = '';
        }
      },
      setLabel(text) {
        const labelEl = timerEl.querySelector('.secret-timer-name');
        if (labelEl && text) labelEl.textContent = text;
      },
      element: timerEl
    };

    const stop = () => {
      if (finished) return;
      finished = true;
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      while (cleanupFns.length) {
        const fn = cleanupFns.shift();
        try {
          fn();
        } catch (err) {
          console.error('Error al limpiar efecto secreto:', err);
        }
      }
      if (typeof options.onEnd === 'function') {
        try {
          options.onEnd();
        } catch (err) {
          console.error('Error al finalizar efecto secreto:', err);
        }
      }
      timerEl.remove();
      activeEffects.delete(entry.key);
    };

    const intervalId = setInterval(() => {
      remaining -= 1;
      if (remaining >= 0 && countEl) countEl.textContent = String(remaining);
      if (remaining <= 0) stop();
    }, 1000);

    const timeoutId = setTimeout(stop, duration + 60);

    try {
      const result = typeof options.onStart === 'function' ? options.onStart(context) : null;
      if (typeof result === 'function') {
        registerCleanup(result);
      }
    } catch (err) {
      console.error('Error al iniciar efecto secreto:', err);
      stop();
      return () => {};
    }

    activeEffects.set(entry.key, { stop });
    return stop;
  }

  const features = {
    '2048': {
      name: '2048',
      code: '4821',
      description: 'Genera un bloque 256 y garantiza fichas altas durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof grid === 'undefined' || typeof addRandom !== 'function' || typeof render !== 'function') return;
        runTimedEffect({
          label: 'Modo fusión',
          detail: 'Los nuevos bloques aparecen como 16 o 32.',
          onStart({ registerCleanup }) {
            const empties = [];
            for (let r = 0; r < grid.length; r++) {
              for (let c = 0; c < grid[r].length; c++) {
                if (!grid[r][c]) empties.push({ r, c });
              }
            }
            if (empties.length) {
              const choice = empties[Math.floor(Math.random() * empties.length)];
              grid[choice.r][choice.c] = 256;
              render();
            }

            const originalAddRandom = window.addRandom;
            window.addRandom = function (...args) {
              if (typeof originalAddRandom === 'function') {
                originalAddRandom.apply(this, args);
              }
              const candidates = [];
              for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                  if (!grid[r][c]) candidates.push({ r, c });
                }
              }
              if (!candidates.length) return;
              const { r, c } = candidates[Math.floor(Math.random() * candidates.length)];
              grid[r][c] = Math.random() < 0.6 ? 16 : 32;
              render();
            };
            registerCleanup(() => {
              window.addRandom = originalAddRandom;
            });

            const container = document.getElementById('game');
            const highlight = () => {
              if (!container || !Array.isArray(grid)) return;
              const tiles = Array.from(container.querySelectorAll('.tile'));
              tiles.forEach(tile => tile.classList.remove('secret-highlight'));
              let max = 0;
              for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                  if (grid[r][c] > max) max = grid[r][c];
                }
              }
              if (!max) return;
              for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                  if (grid[r][c] === max) {
                    const index = r * grid[r].length + c;
                    const tile = tiles[index];
                    if (tile) tile.classList.add('secret-highlight');
                  }
                }
              }
            };
            highlight();
            const interval = setInterval(highlight, 250);
            registerCleanup(() => {
              clearInterval(interval);
              if (container) {
                container.querySelectorAll('.secret-highlight').forEach(el => el.classList.remove('secret-highlight'));
              }
            });
          }
        });
      }
    },
    '3ratlla': {
      name: '3 en raya',
      code: '7035',
      description: 'Activa un radar de victorias inmediatas durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof board === 'undefined' || typeof checkWinner !== 'function') return;
        runTimedEffect({
          label: 'Radar activo',
          detail: 'Las casillas ganadoras se iluminan.',
          onStart({ registerCleanup }) {
            const refresh = () => {
              const cells = document.querySelectorAll('.cell');
              cells.forEach(cell => cell.classList.remove('secret-highlight'));
              if (!Array.isArray(board)) return;
              const plays = [];
              for (let r = 0; r < board.length; r++) {
                for (let c = 0; c < board[r].length; c++) {
                  if (board[r][c] === '') {
                    board[r][c] = currentPlayer;
                    if (checkWinner()) plays.push({ r, c });
                    board[r][c] = '';
                  }
                }
              }
              plays.forEach(({ r, c }) => {
                const el = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
                if (el) el.classList.add('secret-highlight');
              });
            };
            refresh();
            const interval = setInterval(refresh, 200);
            registerCleanup(() => {
              clearInterval(interval);
              document.querySelectorAll('.cell.secret-highlight').forEach(el => el.classList.remove('secret-highlight'));
            });
          }
        });
      }
    },
    '4rayagpt': {
      name: '4 en raya',
      code: '1569',
      description: 'Ilumina las columnas ganadoras durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof board === 'undefined' || typeof checkWin !== 'function') return;
        runTimedEffect({
          label: 'Visor estratégico',
          detail: 'Columnas victoriosas resaltadas.',
          onStart({ registerCleanup }) {
            const highlight = () => {
              document.querySelectorAll('.cell.secret-highlight').forEach(el => el.classList.remove('secret-highlight'));
              if (!Array.isArray(board)) return;
              const columns = new Set();
              for (let col = 0; col < board[0].length; col++) {
                let row = -1;
                for (let r = board.length - 1; r >= 0; r--) {
                  if (board[r][col] === 0) { row = r; break; }
                }
                if (row === -1) continue;
                board[row][col] = currentPlayer;
                const win = checkWin(row, col);
                board[row][col] = 0;
                if (win) columns.add(col);
              }
              columns.forEach(col => {
                document.querySelectorAll(`.cell[data-col="${col}"]`).forEach(cell => cell.classList.add('secret-highlight'));
              });
            };
            highlight();
            const interval = setInterval(highlight, 250);
            registerCleanup(() => {
              clearInterval(interval);
              document.querySelectorAll('.cell.secret-highlight').forEach(el => el.classList.remove('secret-highlight'));
            });
          }
        });
      }
    },
    'Clickometeor': {
      name: 'Color Snipe',
      code: '9182',
      description: 'Congela el tiempo y revela el color objetivo durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        const gridEl = document.getElementById('grid');
        if (!gridEl) return;
        runTimedEffect({
          label: 'Modo prisma',
          detail: 'Tiempo detenido y objetivo marcado.',
          onStart({ registerCleanup, setDetail }) {
            if (typeof timeoutId !== 'undefined') {
              clearTimeout(timeoutId);
            }
            roundActive = true;
            const boxes = Array.from(gridEl.querySelectorAll('.box'));
            boxes.forEach(box => box.classList.remove('secret-highlight'));
            if (correctColor && correctColor.name) {
              boxes.filter(box => box.dataset.colorName === correctColor.name)
                .forEach(box => box.classList.add('secret-highlight'));
              setDetail(`Busca ${correctColor.name} sin presión.`);
            }
            registerCleanup(() => {
              boxes.forEach(box => box.classList.remove('secret-highlight'));
              if (typeof score !== 'undefined' && typeof endGame === 'function') {
                if (roundActive) {
                  const delay = Math.max(3000 - score * 100, 1000);
                  timeoutId = setTimeout(() => {
                    if (roundActive) {
                      roundActive = false;
                      endGame();
                    }
                  }, delay);
                }
              }
            });
          }
        });
      }
    },
    'adivinanum': {
      name: 'Adivina el número',
      code: '6743',
      description: 'El oráculo estrecha el rango correcto y guía tus intentos durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof secretNumber === 'undefined') return;
        runTimedEffect({
          label: 'Oráculo activado',
          detail: 'El número se encierra en un rango muy corto.',
          onStart({ registerCleanup, setDetail }) {
            const lower = Math.max(MIN, secretNumber - 3);
            const upper = Math.min(MAX, secretNumber + 3);
            setDetail(`El número está entre ${lower} y ${upper}.`);
            const input = document.getElementById('guessInput');
            const feedback = document.getElementById('feedback');
            let onInput;
            if (input) {
              const originalBorder = input.style.borderColor;
              input.style.borderColor = '#00ffd5';
              onInput = () => {
                const guess = parseInt(input.value, 10);
                if (isNaN(guess) || !feedback) return;
                const diff = Math.abs(secretNumber - guess);
                if (diff === 0) {
                  feedback.textContent = '¡Exacto!';
                } else if (diff <= 2) {
                  feedback.textContent = '¡Muy muy cerca!';
                } else if (diff <= 5) {
                  feedback.textContent = 'Caliente.';
                } else {
                  feedback.textContent = 'Frío.';
                }
              };
              input.addEventListener('input', onInput);
              registerCleanup(() => {
                input.style.borderColor = originalBorder;
                if (onInput) input.removeEventListener('input', onInput);
              });
            }
          }
        });
      }
    },
    'ahorcado': {
      name: 'Ahorcado',
      code: '8217',
      description: 'Revela una letra y resalta opciones correctas durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof palabra === 'undefined' || typeof letrasAdivinadas === 'undefined') return;
        runTimedEffect({
          label: 'Rescate',
          detail: 'Letras disponibles resaltadas.',
          onStart({ registerCleanup }) {
            const disponibles = palabra.split('').filter(letra => !letrasAdivinadas.includes(letra));
            if (disponibles.length) {
              const letra = disponibles[Math.floor(Math.random() * disponibles.length)];
              letrasAdivinadas.push(letra);
              if (typeof mostrarPalabra === 'function') mostrarPalabra();
              const btn = Array.from(document.querySelectorAll('#keyboard button')).find(b => b.textContent === letra);
              if (btn) btn.disabled = true;
            }
            const keyboardButtons = Array.from(document.querySelectorAll('#keyboard button'));
            const updateHints = () => {
              keyboardButtons.forEach(btn => btn.classList.remove('secret-highlight'));
              palabra.split('').forEach(letra => {
                const btn = keyboardButtons.find(b => b.textContent === letra);
                if (btn && !btn.disabled) btn.classList.add('secret-highlight');
              });
            };
            updateHints();
            const interval = setInterval(updateHints, 400);
            registerCleanup(() => {
              clearInterval(interval);
              keyboardButtons.forEach(btn => btn.classList.remove('secret-highlight'));
            });
          }
        });
      }
    },
    'Godshot': {
      name: 'God Shot',
      code: '5408',
      description: 'Los objetivos rojos brillan y los prohibidos quedan marcados durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        runTimedEffect({
          label: 'Visor de halcón',
          detail: 'Identifica unidades objetivo al instante.',
          onStart({ registerCleanup }) {
            const touched = new Set();
            const apply = (node) => {
              if (!(node instanceof HTMLElement)) return;
              if (!node.classList.contains('monigote')) return;
              const color = (node.style.backgroundColor || '').toLowerCase();
              if (color.includes('red')) {
                node.classList.add('secret-highlight');
                touched.add(node);
              } else if (color.includes('green')) {
                node.dataset.secretShadow = node.style.boxShadow || '';
                node.style.boxShadow = '0 0 20px rgba(255,0,0,0.8)';
                touched.add(node);
              }
            };
            document.querySelectorAll('.monigote').forEach(apply);
            const observer = new MutationObserver(mutations => {
              mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => apply(node));
              });
            });
            observer.observe(document.body, { childList: true, subtree: true });
            registerCleanup(() => {
              observer.disconnect();
              touched.forEach(node => {
                node.classList.remove('secret-highlight');
                if (node.dataset && Object.prototype.hasOwnProperty.call(node.dataset, 'secretShadow')) {
                  node.style.boxShadow = node.dataset.secretShadow;
                  delete node.dataset.secretShadow;
                }
              });
              touched.clear();
            });
          }
        });
      }
    },
    'Laberintocursor': {
      name: 'Laberinto del cursor',
      code: '3974',
      description: 'Desactiva el susto y añade un halo protector durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        runTimedEffect({
          label: 'Modo fantasma',
          detail: 'Sin sustos y con aura protectora.',
          onStart({ registerCleanup }) {
            const original = window.mostrarJumpscare;
            if (typeof original === 'function') {
              window.mostrarJumpscare = function () {};
              registerCleanup(() => {
                window.mostrarJumpscare = original;
              });
            }
            const halo = document.createElement('div');
            halo.style.position = 'fixed';
            halo.style.pointerEvents = 'none';
            halo.style.width = '80px';
            halo.style.height = '80px';
            halo.style.borderRadius = '50%';
            halo.style.border = '2px solid rgba(0,255,170,0.7)';
            halo.style.boxShadow = '0 0 16px rgba(0,255,170,0.9)';
            halo.style.zIndex = '99997';
            document.body.appendChild(halo);
            const onMove = (ev) => {
              halo.style.transform = `translate(${ev.clientX - 40}px, ${ev.clientY - 40}px)`;
            };
            document.addEventListener('mousemove', onMove);
            registerCleanup(() => {
              document.removeEventListener('mousemove', onMove);
              halo.remove();
            });
          }
        });
      }
    },
    'laberinto': {
      name: 'Laberinto',
      code: '2635',
      description: 'Traza y resalta la ruta óptima durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof mazeLayout === 'undefined' || typeof player === 'undefined') return;
        const mazeContainer = document.getElementById('maze');
        if (!mazeContainer) return;
        runTimedEffect({
          label: 'Sendero mágico',
          detail: 'La salida queda iluminada paso a paso.',
          onStart({ registerCleanup }) {
            const drawPath = () => {
              const cells = Array.from(mazeContainer.querySelectorAll('.cell'));
              cells.forEach(cell => cell.classList.remove('secret-path-cell'));
              const matrix = mazeLayout.map(row => row.split(''));
              const rows = matrix.length;
              const cols = matrix[0].length;
              const start = { x: player.x, y: player.y };
              const exit = { x: cols - 2, y: rows - 2 };
              const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
              const queue = [[start.x, start.y]];
              const parent = new Map();
              visited[start.y][start.x] = true;
              const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
              while (queue.length) {
                const [x, y] = queue.shift();
                if (x === exit.x && y === exit.y) break;
                for (const [dx, dy] of dirs) {
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !visited[ny][nx] && matrix[ny][nx] !== '#') {
                    visited[ny][nx] = true;
                    parent.set(`${nx},${ny}`, `${x},${y}`);
                    queue.push([nx, ny]);
                  }
                }
              }
              let current = `${exit.x},${exit.y}`;
              const path = [];
              while (current !== `${start.x},${start.y}` && parent.has(current)) {
                const [cx, cy] = current.split(',').map(Number);
                path.push({ x: cx, y: cy });
                current = parent.get(current);
              }
              path.forEach(({ x, y }) => {
                const index = y * cols + x;
                const cell = cells[index];
                if (cell) cell.classList.add('secret-path-cell');
              });
            };
            drawPath();
            const interval = setInterval(drawPath, 300);
            registerCleanup(() => {
              clearInterval(interval);
              mazeContainer.querySelectorAll('.secret-path-cell').forEach(el => el.classList.remove('secret-path-cell'));
            });
          }
        });
      }
    },
    'laberinto2': {
      name: 'Laberinto 2',
      code: '7496',
      description: 'Aumenta tu velocidad y marca el objetivo durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof draw !== 'function' || typeof ctx === 'undefined') return;
        runTimedEffect({
          label: 'Claridad total',
          detail: 'Movimiento ágil y meta visible.',
          onStart({ registerCleanup }) {
            if (typeof speed === 'number') {
              const originalSpeed = speed;
              speed = speed * 1.4;
              registerCleanup(() => { speed = originalSpeed; });
            }
            const originalDraw = window.draw;
            window.draw = function (...args) {
              originalDraw.apply(this, args);
              try {
                ctx.save();
                ctx.strokeStyle = 'rgba(0,255,170,0.9)';
                ctx.lineWidth = 4;
                ctx.strokeRect(
                  offsetX + goalCorner[0] * cellW + 4,
                  offsetY + goalCorner[1] * cellH + 4,
                  cellW - 8,
                  cellH - 8
                );
                ctx.strokeStyle = 'rgba(0,255,213,0.6)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(px, py, Math.min(cellW, cellH) * 3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
              } catch (err) {
                console.error('No se pudo dibujar el faro secreto:', err);
              }
            };
            registerCleanup(() => {
              window.draw = originalDraw;
            });
          }
        });
      }
    },
    'memory': {
      name: 'Memory',
      code: '3187',
      description: 'Memoriza todas las cartas mostrando su cara durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        const cards = Array.from(document.querySelectorAll('.card'));
        if (!cards.length) return;
        runTimedEffect({
          label: 'Memoria fotográfica',
          detail: 'Todas las cartas quedan boca arriba temporalmente.',
          onStart({ registerCleanup }) {
            const toFlip = cards.filter(card => !card.classList.contains('matched'));
            toFlip.forEach(card => card.classList.add('flipped'));
            if (typeof lock !== 'undefined') {
              const previousLock = lock;
              lock = true;
              registerCleanup(() => { lock = previousLock; });
            }
            registerCleanup(() => {
              toFlip.forEach(card => {
                if (!card.classList.contains('matched')) card.classList.remove('flipped');
              });
            });
          }
        });
      }
    },
    'simondice': {
      name: 'Simon Dice',
      code: '4520',
      description: 'Resalta automáticamente el próximo color durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof handleUserClick !== 'function' || typeof nextSequence !== 'function') return;
        runTimedEffect({
          label: 'Modo eco',
          detail: 'Sigue al botón con borde discontinuo.',
          onStart({ registerCleanup }) {
            const highlight = () => {
              document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('secret-simon-hint'));
              if (Array.isArray(gameSequence) && Array.isArray(userSequence) && buttons) {
                const index = userSequence.length;
                const next = gameSequence[index];
                if (next && buttons[next]) {
                  buttons[next].classList.add('secret-simon-hint');
                }
              }
            };
            highlight();
            const interval = setInterval(highlight, 400);
            registerCleanup(() => {
              clearInterval(interval);
              document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('secret-simon-hint'));
            });

            const originalHandle = handleUserClick;
            window.handleUserClick = function (color) {
              const result = originalHandle.call(this, color);
              highlight();
              return result;
            };
            registerCleanup(() => {
              window.handleUserClick = originalHandle;
            });

            const originalNext = nextSequence;
            window.nextSequence = function (...args) {
              const result = originalNext.apply(this, args);
              setTimeout(highlight, 500);
              return result;
            };
            registerCleanup(() => {
              window.nextSequence = originalNext;
            });
          }
        });
      }
    },
    'pingpong': {
      name: 'Breakout',
      code: '6391',
      description: 'Convierte tus pelotas en prismas indestructibles durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (!Array.isArray(balls)) return;
        runTimedEffect({
          label: 'Modo rebote',
          detail: 'Bolas prismáticas listas para arrasar.',
          onStart({ registerCleanup }) {
            const touched = new Set();
            const buffBall = (ball) => {
              if (!ball) return;
              if (!ball.__secretOriginal) {
                ball.__secretOriginal = { color: ball.color, power: ball.power };
                touched.add(ball);
              }
              ball.color = 'rainbow';
              ball.power = Math.max(ball.power || 1, 8);
            };
            balls.forEach(buffBall);
            const originalPush = balls.push.bind(balls);
            balls.push = function (...items) {
              items.forEach(buffBall);
              return originalPush(...items);
            };
            registerCleanup(() => {
              balls.push = originalPush;
              touched.forEach(ball => {
                if (ball.__secretOriginal) {
                  ball.color = ball.__secretOriginal.color;
                  ball.power = ball.__secretOriginal.power;
                  delete ball.__secretOriginal;
                }
              });
            });
          }
        });
      }
    },
    'asteroides': {
      name: 'Galaxy Collector',
      code: '2874',
      description: 'Invoca estrellas compañeras durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof ship === 'undefined' || !Array.isArray(stars)) return;
        runTimedEffect({
          label: 'Órbita asistida',
          detail: 'Estrellas extra orbitan cerca de tu nave.',
          onStart({ registerCleanup }) {
            const spawned = [];
            const spawnCompanion = () => {
              if (typeof ship === 'undefined') return;
              const angle = Math.random() * Math.PI * 2;
              const distance = 60;
              const star = {
                x: ship.x + Math.cos(angle) * distance,
                y: ship.y + Math.sin(angle) * distance,
                r: 12,
                vx: ship.vx * 0.3,
                vy: ship.vy * 0.3
              };
              stars.push(star);
              spawned.push(star);
            };
            for (let i = 0; i < 3; i++) spawnCompanion();
            const interval = setInterval(spawnCompanion, 1500);
            registerCleanup(() => {
              clearInterval(interval);
              spawned.forEach(star => {
                const index = stars.indexOf(star);
                if (index >= 0) stars.splice(index, 1);
              });
            });
          }
        });
      }
    },
    'flsppybird': {
      name: 'Flappy Bird',
      code: '8640',
      description: 'Reduce la gravedad para volar con mayor control durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof bird === 'undefined') return;
        runTimedEffect({
          label: 'Pluma ligera',
          detail: 'Gravedad reducida temporalmente.',
          onStart({ registerCleanup }) {
            const originalBirdGravity = bird.gravity;
            const originalLift = bird.lift;
            bird.gravity = bird.gravity * 0.6;
            bird.lift = bird.lift * 1.2;
            bird.velocity = Math.min(bird.velocity, -4);
            registerCleanup(() => {
              bird.gravity = originalBirdGravity;
              bird.lift = originalLift;
            });
            if (typeof gravity !== 'undefined') {
              const originalGravity = gravity;
              gravity = gravity * 0.6;
              registerCleanup(() => {
                gravity = originalGravity;
              });
            }
          }
        });
      }
    },
    'Snake': {
      name: 'Snake',
      code: '9156',
      description: 'Activa turbo y limpia los obstáculos del tablero durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof speed === 'undefined' || !Array.isArray(obstacles)) return;
        runTimedEffect({
          label: 'Turbo serpiente',
          detail: 'Sin obstáculos y más velocidad.',
          onStart({ registerCleanup }) {
            const backupObstacles = obstacles.slice();
            const originalSpeed = speed;
            obstacles.length = 0;
            speed = Math.max(60, speed - 120);
            registerCleanup(() => {
              obstacles.splice(0, obstacles.length, ...backupObstacles);
              speed = originalSpeed;
            });
            const canvas = document.getElementById('gameCanvas');
            if (canvas) {
              canvas.classList.add('secret-highlight');
              registerCleanup(() => canvas.classList.remove('secret-highlight'));
            }
          }
        });
      }
    },
    'Sacos': {
      name: 'Sacos',
      code: '7042',
      description: 'Revela el rango y acelera la apertura de sacos durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        const nextBtn = document.getElementById('nextBtn');
        const sacs = Array.from(document.querySelectorAll('.sack'));
        if (!nextBtn || !sacs.length) return;
        runTimedEffect({
          label: 'Mapa del tesoro',
          detail: window.__sacosSecret ? `Valores entre ${window.__sacosSecret.min} y ${window.__sacosSecret.max}.` : 'Autorevelando sacos.',
          onStart({ registerCleanup, setDetail }) {
            if (window.__sacosSecret) {
              const { min, max } = window.__sacosSecret;
              setDetail(`Valores entre ${min} y ${max}. Revelando sacos automáticamente.`);
            }
            sacs.forEach(sack => sack.classList.add('secret-highlight'));
            const interval = setInterval(() => {
              if (nextBtn && !nextBtn.disabled) nextBtn.click();
            }, 1500);
            registerCleanup(() => {
              clearInterval(interval);
              sacs.forEach(sack => sack.classList.remove('secret-highlight'));
            });
          }
        });
      }
    },
    'brakeautnulls': {
      name: "Null's Breakout",
      code: '5713',
      description: 'Convierte todas las bolas en rayos arcoíris súper potentes durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (!Array.isArray(balls)) return;
        runTimedEffect({
          label: 'Tormenta prismática',
          detail: 'Cada rebote destroza bloques.',
          onStart({ registerCleanup }) {
            const touched = new Set();
            const buffBall = (ball) => {
              if (!ball) return;
              if (!ball.__secretOriginal) {
                ball.__secretOriginal = { color: ball.color, power: ball.power };
                touched.add(ball);
              }
              ball.color = 'rainbow';
              ball.power = Math.max(ball.power || 1, 25);
            };
            balls.forEach(buffBall);
            const originalPush = balls.push.bind(balls);
            balls.push = function (...items) {
              items.forEach(buffBall);
              return originalPush(...items);
            };
            registerCleanup(() => {
              balls.push = originalPush;
              touched.forEach(ball => {
                if (ball.__secretOriginal) {
                  ball.color = ball.__secretOriginal.color;
                  ball.power = ball.__secretOriginal.power;
                  delete ball.__secretOriginal;
                }
              });
            });
          }
        });
      }
    },
    'catala': {
      name: 'Gramàtica catalana',
      code: '8342',
      description: 'Muestra rápidamente todas las respuestas correctas del modo activo durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof answers === 'undefined') return;
        runTimedEffect({
          label: 'Accent secret',
          detail: 'Palabras correctas iluminadas.',
          onStart({ registerCleanup, setDetail }) {
            const mode = typeof currentMode === 'string' && currentMode ? currentMode : 'pronoms';
            const list = answers[mode] || [];
            setDetail(`Modo ${mode}. Palabras válidas resaltadas.`);
            const spans = Array.from(document.querySelectorAll('.word'));
            spans.forEach(span => {
              if (list.includes(span.dataset.word)) span.classList.add('secret-highlight');
            });
            registerCleanup(() => {
              spans.forEach(span => span.classList.remove('secret-highlight'));
            });
          }
        });
      }
    },
    'catala2': {
      name: 'Català 2',
      code: '6207',
      description: 'Activa el modo estudi marcando todos los adverbis durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof answers === 'undefined') return;
        runTimedEffect({
          label: 'Mode estudi',
          detail: 'Els adverbis correctes es ressalten automàticament.',
          onStart({ registerCleanup }) {
            const list = answers.adverbis || [];
            const spans = Array.from(document.querySelectorAll('.word'));
            spans.forEach(span => {
              if (list.includes(span.dataset.word)) span.classList.add('secret-highlight');
            });
            registerCleanup(() => {
              spans.forEach(span => span.classList.remove('secret-highlight'));
            });
          }
        });
      }
    },
    'clicker': {
      name: 'Italian brainrot clicker',
      code: '7591',
      description: 'Multiplica temporalmente tus clics por diez durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        runTimedEffect({
          label: 'Turbo espresso',
          detail: 'Durante el efecto cada clic vale por diez.',
          onStart({ registerCleanup }) {
            if (!window.__clickerBoost) window.__clickerBoost = { activo: false };
            window.__clickerBoost.activo = true;
            const button = document.getElementById('firefly-btn');
            if (button) button.classList.add('secret-highlight');
            registerCleanup(() => {
              window.__clickerBoost.activo = false;
              if (button) button.classList.remove('secret-highlight');
            });
          }
        });
      }
    },
    'enduro': {
      name: 'Enduro',
      code: '4683',
      description: 'Recarga la energía y despeja el tráfico cercano durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof car === 'undefined' || typeof cars === 'undefined') return;
        runTimedEffect({
          label: 'Nitro secreto',
          detail: 'Menos tráfico y turbo extra.',
          onStart({ registerCleanup }) {
            const originalMax = car.maxSpeed;
            const originalSpeed = car.speed;
            car.maxSpeed = (car.maxSpeed || 5) + 2;
            car.speed = (car.speed || 0) + 0.8;

            const originalEasy = cars.easy;
            cars.easy = Math.min(cars.easy || 0.2, 0.05);

            const fog = window.fog;
            const fogWasHidden = fog ? fog.classList.contains('hidden') : false;
            const originalFogValue = fog && typeof fog.value === 'number' ? fog.value : null;
            if (fog) {
              fog.classList.add('hidden');
              fog.value = 0.01;
            }

            const carEl = document.getElementById('car');
            if (carEl) carEl.classList.add('secret-highlight');

            document.querySelectorAll('#cars .car').forEach(node => {
              node.style.opacity = '0.5';
            });

            registerCleanup(() => {
              if (typeof originalMax === 'number') car.maxSpeed = originalMax;
              if (typeof originalSpeed === 'number') car.speed = originalSpeed;
              if (typeof originalEasy === 'number') cars.easy = originalEasy;
              if (fog && originalFogValue !== null) {
                fog.value = originalFogValue;
                if (!fogWasHidden) fog.classList.remove('hidden');
              }
              if (carEl) carEl.classList.remove('secret-highlight');
              document.querySelectorAll('#cars .car').forEach(node => {
                node.style.opacity = '';
              });
            });
          }
        });
      }
    },
    'pcman': {
      name: 'Pcman',
      code: '2314',
      description: 'Congela a los fantasmas haciéndolos comestibles durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (!Array.isArray(ghosts)) return;
        runTimedEffect({
          label: 'Chomp time',
          detail: 'Los fantasmas se mantienen vulnerables.',
          onStart({ registerCleanup }) {
            const canvas = document.querySelector('#pacman canvas');
            if (canvas) canvas.classList.add('secret-highlight');
            const reapply = () => {
              ghosts.forEach(ghost => {
                if (ghost && typeof ghost.makeEatable === 'function') {
                  ghost.makeEatable();
                }
              });
            };
            reapply();
            const interval = setInterval(reapply, 1500);
            registerCleanup(() => {
              clearInterval(interval);
              if (canvas) canvas.classList.remove('secret-highlight');
            });
          }
        });
      }
    },
    'skyhooper': {
      name: 'Sky Hopper',
      code: '8925',
      description: 'Genera plataformas extra y aligera la gravedad durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof player === 'undefined' || !Array.isArray(platforms)) return;
        runTimedEffect({
          label: 'Ascenso rápido',
          detail: 'Plataformas de apoyo desplegadas.',
          onStart({ registerCleanup }) {
            const originalGravity = player.gravity;
            const originalJump = player.jumpStrength;
            player.gravity = Math.max(0.4, player.gravity * 0.7);
            player.jumpStrength = player.jumpStrength * 1.2;

            const spawnPlatform = () => {
              const y = Math.max(40, player.y - 80);
              const x = Math.max(0, Math.min(player.x - 40 + Math.random() * 80, W - 120));
              if (typeof Platform === 'function') {
                platforms.push(new Platform(x, y));
              } else {
                platforms.push({ x, y, width: 120, height: 24, draw() {} });
              }
            };
            for (let i = 0; i < 3; i++) spawnPlatform();
            const interval = setInterval(spawnPlatform, 2000);
            registerCleanup(() => {
              clearInterval(interval);
              player.gravity = originalGravity;
              player.jumpStrength = originalJump;
            });
          }
        });
      }
    },
    'sonic': {
      name: 'Sonic',
      code: '3468',
      description: 'Regala un escudo temporal y suma velocidad durante 10 segundos.',
      activate({ entry, runTimedEffect }) {
        if (typeof player === 'undefined' || typeof loseLife !== 'function') return;
        runTimedEffect({
          label: 'Anillo maestro',
          detail: 'Escudo temporal activado.',
          onStart({ registerCleanup }) {
            const canvas = document.getElementById('game');
            const originalSpeed = player.speed;
            const originalJump = player.jump;
            player.speed = (player.speed || 0) + 2.5;
            player.jump = (player.jump || 0) + 4;

            const originalLoseLife = loseLife;
            let shieldActive = true;
            window.loseLife = function (...args) {
              if (shieldActive) return;
              return originalLoseLife.apply(this, args);
            };
            registerCleanup(() => {
              shieldActive = false;
              window.loseLife = originalLoseLife;
              player.speed = originalSpeed;
              player.jump = originalJump;
              if (canvas) canvas.classList.remove('secret-highlight');
            });
            if (canvas) canvas.classList.add('secret-highlight');
          }
        });
      }
    }
  };

  const activated = new Set();

  function attachSequence(entry, key) {
    const sequence = String(entry.code || '').toLowerCase();
    if (!sequence) return;
    let buffer = '';
    const handler = (event) => {
      if (entry.once && activated.has(entry)) return;
      const pressed = event.key.toLowerCase();
      if (!/^[a-z0-9]$/.test(pressed)) return;
      buffer = (buffer + pressed).slice(-sequence.length);
      if (buffer === sequence) {
        activated.add(entry);
        try {
          entry.activate({
            entry,
            helpers,
            runTimedEffect: (options) => activateWithTimer(entry, options)
          });
        } catch (err) {
          console.error('Error al activar código secreto:', err);
        }
        showToast('Código secreto', `Activaste ${entry.name}.`);
      }
    };
    if (!entry._listener) {
      entry._listener = handler;
      document.addEventListener('keydown', handler);
    }
  }

  function initPage(gameKey) {
    const entry = features[gameKey];
    if (!entry) return;
    entry.once = entry.once !== false;
    entry.key = gameKey;
    attachSequence(entry, gameKey);
  }

  function listFeatures() {
    return Object.keys(features).map(key => {
      const entry = features[key];
      return {
        key,
        name: entry.name,
        code: entry.code,
        description: entry.description
      };
    });
  }

  window.SecretFeatures = {
    initPage,
    listFeatures
  };

  document.addEventListener('DOMContentLoaded', () => {
    const key = document.body?.dataset?.gameKey;
    if (key) initPage(key);
  });
})();
