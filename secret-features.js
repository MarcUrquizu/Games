(function () {
  const STYLE_ID = 'secret-features-style';
  const TOAST_ID = 'secret-features-toast';

  const helpers = {
    ensureBaseStyles() {
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
      `;
      document.head.appendChild(style);
    },
    showToast(title, description) {
      helpers.ensureBaseStyles();
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
    },
    showOverlay(title, description) {
      helpers.ensureBaseStyles();
      const overlay = document.createElement('div');
      overlay.className = 'secret-overlay';
      overlay.innerHTML = `
        <h2>${title}</h2>
        <p>${description}</p>
        <button type="button">Cerrar</button>
      `;
      const close = () => {
        overlay.classList.add('fade');
        overlay.remove();
      };
      overlay.querySelector('button').addEventListener('click', close, { once: true });
      overlay.addEventListener('click', (ev) => {
        if (ev.target === overlay) close();
      });
      document.body.appendChild(overlay);
      return overlay;
    }
  };

  const features = {
    '2048': {
      name: '2048',
      code: 'fusiona',
      description: 'Genera un bloque de 256 y ralentiza la partida durante tres turnos.',
      activate() {
        if (typeof grid === 'undefined' || typeof render !== 'function') return;
        const empties = [];
        for (let r = 0; r < grid.length; r++) {
          for (let c = 0; c < grid[r].length; c++) {
            if (!grid[r][c]) empties.push({ r, c });
          }
        }
        if (!empties.length) {
          helpers.showToast('Modo fusión', 'No quedaban casillas libres.');
          return;
        }
        const choice = empties[Math.floor(Math.random() * empties.length)];
        grid[choice.r][choice.c] = 256;
        render();
        if (typeof speed !== 'undefined') {
          window.__secret2048Slow = 3;
          const originalUpdate = window.update;
          if (typeof originalUpdate === 'function' && !originalUpdate.__patchedSlow) {
            const wrapped = function (...args) {
              if (window.__secret2048Slow && window.__secret2048Slow > 0) {
                const result = originalUpdate.apply(this, args);
                window.__secret2048Slow--;
                if (speed < 400) speed += 40;
                return result;
              }
              return originalUpdate.apply(this, args);
            };
            wrapped.__patchedSlow = true;
            window.update = wrapped;
          }
        }
        helpers.showToast('Modo fusión', 'Se creó una ficha 256 extra.');
      }
    },
    '3ratlla': {
      name: '3 en raya',
      code: 'trio',
      description: 'Activa el radar que marca tus mejores casillas de victoria inmediata.',
      activate() {
        helpers.ensureBaseStyles();
        if (typeof board === 'undefined') return;
        document.querySelectorAll('.cell.secret-highlight').forEach(el => el.classList.remove('secret-highlight'));
        const target = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            if (board[r][c] === '') {
              board[r][c] = currentPlayer;
              if (typeof checkWinner === 'function' && checkWinner()) {
                target.push({ r, c });
              }
              board[r][c] = '';
            }
          }
        }
        if (!target.length) {
          helpers.showToast('Radar activo', 'No hay victoria inmediata, ¡planifica bien!');
          return;
        }
        target.forEach(({ r, c }) => {
          const el = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
          if (el) el.classList.add('secret-highlight');
        });
        helpers.showToast('Radar activo', 'Casillas ganadoras resaltadas.');
      }
    },
    '4rayagpt': {
      name: '4 en raya',
      code: 'linea',
      description: 'Ilumina las columnas que te dan la victoria al caer la ficha.',
      activate() {
        helpers.ensureBaseStyles();
        if (typeof board === 'undefined') return;
        document.querySelectorAll('.cell.secret-highlight').forEach(el => el.classList.remove('secret-highlight'));
        const hints = new Set();
        for (let col = 0; col < board[0].length; col++) {
          let row = -1;
          for (let r = board.length - 1; r >= 0; r--) {
            if (board[r][col] === 0) { row = r; break; }
          }
          if (row === -1) continue;
          board[row][col] = currentPlayer;
          const win = typeof checkWin === 'function' && checkWin(row, col);
          board[row][col] = 0;
          if (win) hints.add(col);
        }
        if (!hints.size) {
          helpers.showToast('Visor estratégico', 'Ninguna columna te da la victoria directa.');
          return;
        }
        hints.forEach(col => {
          document.querySelectorAll(`.cell[data-col="${col}"]`).forEach(cell => cell.classList.add('secret-highlight'));
        });
        helpers.showToast('Visor estratégico', 'Columnas ganadoras resaltadas.');
      }
    },
    'Clickometeor': {
      name: 'Color Snipe',
      code: 'prisma',
      description: 'Congela el tiempo y señala el color correcto durante esta ronda.',
      activate() {
        helpers.ensureBaseStyles();
        if (typeof clearTimeout === 'function' && typeof timeoutId !== 'undefined') {
          clearTimeout(timeoutId);
        }
        if (typeof roundActive !== 'undefined') roundActive = true;
        const target = (typeof correctColor !== 'undefined' && correctColor) ? correctColor.name : null;
        document.querySelectorAll('#grid .box').forEach(box => {
          if (target && box.dataset.colorName === target) {
            box.classList.add('secret-highlight');
          }
        });
        helpers.showToast('Modo prisma', 'Color objetivo resaltado y tiempo congelado.');
      }
    },
    'adivinanum': {
      name: 'Adivina el número',
      code: 'oraculo',
      description: 'Revela una pista precisa sobre el número secreto.',
      activate() {
        if (typeof secretNumber === 'undefined') return;
        const hint = secretNumber % 2 === 0 ? 'par' : 'impar';
        const rangeLower = Math.max(MIN, secretNumber - 5);
        const rangeUpper = Math.min(MAX, secretNumber + 5);
        helpers.showOverlay('Oráculo activado', `El número es ${hint} y está entre ${rangeLower} y ${rangeUpper}.`);
      }
    },
    'ahorcado': {
      name: 'Ahorcado',
      code: 'rescate',
      description: 'Revela automáticamente una letra aleatoria que aún no hayas descubierto.',
      activate() {
        if (typeof palabra === 'undefined' || typeof letrasAdivinadas === 'undefined') return;
        const disponibles = palabra.split('').filter(letra => !letrasAdivinadas.includes(letra));
        if (!disponibles.length) {
          helpers.showToast('Rescate', 'Ya conoces toda la palabra.');
          return;
        }
        const letra = disponibles[Math.floor(Math.random() * disponibles.length)];
        letrasAdivinadas.push(letra);
        if (typeof mostrarPalabra === 'function') mostrarPalabra();
        const btn = Array.from(document.querySelectorAll('#keyboard button')).find(b => b.textContent === letra);
        if (btn) btn.disabled = true;
        helpers.showToast('Rescate', `Se reveló la letra "${letra}".`);
      }
    },
    'Godshot': {
      name: 'God Shot',
      code: 'halcon',
      description: 'Tus objetivos rojos brillan y las unidades verdes quedan marcadas como prohibidas.',
      activate() {
        helpers.ensureBaseStyles();
        const observer = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
              if (!(node instanceof HTMLElement)) return;
              if (node.classList.contains('monigote')) {
                const color = node.style.backgroundColor.toLowerCase();
                if (color.includes('red')) {
                  node.classList.add('secret-highlight');
                } else if (color.includes('green')) {
                  node.style.boxShadow = '0 0 20px rgba(255,0,0,0.8)';
                }
              }
            });
          });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        document.querySelectorAll('.monigote').forEach(node => {
          const color = node.style.backgroundColor.toLowerCase();
          if (color.includes('red')) node.classList.add('secret-highlight');
          if (color.includes('green')) node.style.boxShadow = '0 0 20px rgba(255,0,0,0.8)';
        });
        helpers.showToast('Visor de halcón', 'Rojos resaltados y verdes vigilados.');
      }
    },
    'Laberintocursor': {
      name: 'Laberinto del cursor',
      code: 'fantasma',
      description: 'Neutraliza el jumpscare y añade un halo protector al cursor.',
      activate() {
        helpers.ensureBaseStyles();
        if (typeof mostrarJumpscare === 'function') {
          const original = mostrarJumpscare;
          window.mostrarJumpscare = function () {
            helpers.showToast('Modo fantasma', 'Las paredes ya no asustan.');
          };
          window.mostrarJumpscare.__secretDisabled = true;
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
        document.addEventListener('mousemove', (ev) => {
          halo.style.transform = `translate(${ev.clientX - 40}px, ${ev.clientY - 40}px)`;
        });
        helpers.showToast('Modo fantasma', 'Protección activada.');
      }
    },
    'laberinto': {
      name: 'Laberinto',
      code: 'sendero',
      description: 'Revela el camino óptimo hacia la salida en el nivel actual.',
      activate() {
        helpers.ensureBaseStyles();
        if (typeof mazeLayout === 'undefined') return;
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
        document.querySelectorAll('.cell.secret-path-cell').forEach(el => el.classList.remove('secret-path-cell'));
        if (!path.length) {
          helpers.showToast('Sendero mágico', 'No se encontró ruta clara.');
          return;
        }
        path.forEach(({ x, y }) => {
          const index = y * cols + x;
          const cell = mazeContainer.children[index];
          if (cell) cell.classList.add('secret-path-cell');
        });
        helpers.showToast('Sendero mágico', 'Camino resaltado hasta la salida.');
      }
    },
    'laberinto2': {
      name: 'Laberinto 2',
      code: 'claridad',
      description: 'Amplía tu campo de visión y marca el objetivo con un faro verde.',
      activate() {
        if (typeof draw !== 'function' || typeof ctx === 'undefined') return;
        window.__lab2Boost = 1.8;
        if (!draw.__secretPatched) {
          const original = draw;
          window.draw = function () {
            original();
            if (window.__lab2Boost && typeof goalCorner !== 'undefined') {
              const sizeX = cellW;
              const sizeY = cellH;
              ctx.save();
              ctx.strokeStyle = 'rgba(0,255,170,0.9)';
              ctx.lineWidth = 4;
              ctx.strokeRect(
                offsetX + goalCorner[0] * sizeX + 4,
                offsetY + goalCorner[1] * sizeY + 4,
                sizeX - 8,
                sizeY - 8
              );
              ctx.restore();
            }
          };
          window.draw.__secretPatched = true;
        }
        if (typeof loop === 'function') requestAnimationFrame(loop);
        helpers.showToast('Claridad', 'Objetivo marcado y visión expandida.');
      }
    },
    'memory': {
      name: 'Memory',
      code: 'fotografica',
      description: 'Memoriza todas las cartas mostrando la cara unos segundos.',
      activate() {
        if (typeof board === 'undefined') return;
        helpers.ensureBaseStyles();
        const cards = Array.from(document.querySelectorAll('.card'));
        const toFlipBack = cards.filter(c => !c.classList.contains('matched'));
        toFlipBack.forEach(card => card.classList.add('flipped'));
        if (typeof lock !== 'undefined') lock = true;
        setTimeout(() => {
          toFlipBack.forEach(card => {
            if (!card.classList.contains('matched')) card.classList.remove('flipped');
          });
          if (typeof lock !== 'undefined') lock = false;
        }, 1800);
        helpers.showToast('Memoria fotográfica', '¡Todas las cartas a la vista por un momento!');
      }
    },
    'simondice': {
      name: 'Simon Dice',
      code: 'eco',
      description: 'Resalta automáticamente el próximo color que debes pulsar.',
      activate() {
        helpers.ensureBaseStyles();
        window.__simonAssist = true;
        const highlight = () => {
          if (!window.__simonAssist) return;
          document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('secret-simon-hint'));
          if (Array.isArray(gameSequence) && Array.isArray(userSequence)) {
            const index = userSequence.length;
            const next = gameSequence[index];
            if (next && buttons && buttons[next]) {
              buttons[next].classList.add('secret-simon-hint');
            }
          }
        };
        if (!window.handleUserClick.__secretPatched && typeof handleUserClick === 'function') {
          const original = handleUserClick;
          window.handleUserClick = function (color) {
            const result = original.call(this, color);
            highlight();
            return result;
          };
          window.handleUserClick.__secretPatched = true;
        }
        if (typeof nextSequence === 'function' && !nextSequence.__secretPatched) {
          const originalNext = nextSequence;
          window.nextSequence = function (...args) {
            const result = originalNext.apply(this, args);
            setTimeout(highlight, 400);
            return result;
          };
          window.nextSequence.__secretPatched = true;
        }
        highlight();
        helpers.showToast('Modo eco', 'Sigue al botón con borde discontinuo.');
      }
    },
    'pingpong': {
      name: 'Breakout',
      code: 'rebote',
      description: 'Convierte tus pelotas en bolas prismáticas indestructibles por un tiempo.',
      activate() {
        if (!Array.isArray(balls)) return;
        balls.forEach(ball => {
          ball.color = 'rainbow';
          ball.power = (ball.power || 1) + 5;
        });
        helpers.showToast('Modo rebote', '¡Bolas prismáticas listas para arrasar!');
      }
    },
    'asteroides': {
      name: 'Galaxy Collector',
      code: 'orbita',
      description: 'Invoca estrellas adicionales que orbitan cerca de tu nave.',
      activate() {
        if (typeof spawnStar !== 'function') return;
        let burst = 0;
        const interval = setInterval(() => {
          if (burst >= 5) { clearInterval(interval); return; }
          spawnStar(25);
          burst++;
        }, 400);
        helpers.showToast('Órbita asistida', 'Estrellas extra para sumar puntos.');
      }
    },
    'flsppybird': {
      name: 'Flappy Bird',
      code: 'pluma',
      description: 'Reduce la gravedad temporalmente para volar con mayor control.',
      activate() {
        if (typeof gravity === 'undefined') return;
        if (typeof bird === 'object') bird.velocity = -5;
        gravity = gravity * 0.6;
        helpers.showToast('Pluma ligera', '¡Gravedad reducida temporalmente!');
      }
    },
    'Snake': {
      name: 'Snake',
      code: 'escama',
      description: 'Activa turbo y limpia los obstáculos del tablero.',
      activate() {
        if (typeof speed !== 'undefined') speed = Math.max(60, speed - 100);
        if (typeof obstacles !== 'undefined') {
          obstacles.splice(0, obstacles.length);
        }
        if (typeof draw === 'function') draw();
        helpers.showToast('Turbo serpiente', 'Sin obstáculos y más velocidad.');
      }
    },
    'Sacos': {
      name: 'Sacos',
      code: 'tesoro',
      description: 'Revela el rango exacto de valores que esconden los sacos.',
      activate() {
        if (!window.__sacosSecret) return;
        const data = window.__sacosSecret;
        const text = `Los sacos contienen valores entre ${data.min} y ${data.max}.`;
        helpers.showOverlay('Mapa del tesoro', text);
      }
    },
    'brakeautnulls': {
      name: 'Null\'s Breakout',
      code: 'tormenta',
      description: 'Convierte todas las bolas en rayos arcoíris súper potentes.',
      activate() {
        if (!Array.isArray(balls)) return;
        balls.forEach(ball => {
          ball.color = 'rainbow';
          ball.power = 50;
        });
        helpers.showToast('Tormenta prismática', '¡Cada rebote destroza bloques!');
      }
    },
    'catala': {
      name: 'Gramàtica catalana',
      code: 'accent',
      description: 'Muestra una pista rápida con la respuesta correcta actual.',
      activate() {
        if (typeof mostrarPista === 'function') {
          mostrarPista();
          helpers.showToast('Accent secret', 'Pista activada.');
        } else {
          helpers.showOverlay('Accent secret', 'Repasa la regla: observa les terminacions!');
        }
      }
    },
    'catala2': {
      name: 'Català 2',
      code: 'rodola',
      description: 'Activa el modo estudio con una explicación extra.',
      activate() {
        helpers.showOverlay('Mode estudi', 'Recorda: els pronoms febles van abans del verb en forma personal.');
      }
    },
    'clicker': {
      name: 'Italian brainrot clicker',
      code: 'espresso',
      description: 'Multiplica temporalmente tus clics por diez.',
      activate() {
        if (typeof puntos === 'undefined') return;
        if (!window.__clickerBoost) window.__clickerBoost = { activo: false };
        window.__clickerBoost.activo = true;
        setTimeout(() => { window.__clickerBoost.activo = false; }, 6000);
        helpers.showToast('Turbo espresso', 'Durante 6 segundos cada clic vale por diez.');
      }
    },
    'enduro': {
      name: 'Enduro',
      code: 'nitro',
      description: 'Recarga la energía y despeja a los coches lentos cercanos.',
      activate() {
        if (window.car && typeof car.speed === 'number') {
          car.speed = Math.min((car.maxSpeed || 6), car.speed + 1.5);
          car.maxSpeed = (car.maxSpeed || 5) + 0.5;
        }
        document.querySelectorAll('#cars div').forEach(node => {
          node.style.opacity = '0.5';
        });
        helpers.showToast('Nitro secreto', '¡Acelera con ventaja durante unos segundos!');
      }
    },
    'pcman': {
      name: 'Pcman',
      code: 'chomp',
      description: 'Congela a los fantasmas brevemente.',
      activate() {
        helpers.ensureBaseStyles();
        const applyGlow = () => {
          const canvas = document.querySelector('#pacman canvas');
          if (canvas) {
            canvas.classList.add('secret-highlight');
            return true;
          }
          return false;
        };
        if (!applyGlow()) {
          const observer = new MutationObserver(() => {
            if (applyGlow()) observer.disconnect();
          });
          observer.observe(document.getElementById('pacman'), { childList: true });
        }
        helpers.showToast('Chomp time', 'El laberinto brilla para guiarte.');
      }
    },
    'skyhooper': {
      name: 'Sky Hopper',
      code: 'ascenso',
      description: 'Genera una ráfaga de plataformas extra para tu salto.',
      activate() {
        if (Array.isArray(platforms) && typeof Platform === 'function') {
          for (let i = 1; i <= 3; i++) {
            const y = Math.max(40, player.y - i * 80);
            const x = clamp(player.x - 40 + Math.random() * 80, 0, W - 120);
            platforms.push(new Platform(x, y));
          }
          helpers.showToast('Ascenso rápido', 'Plataformas extras desplegadas.');
        }
      }
    },
    'sonic': {
      name: 'Sonic',
      code: 'anillo',
      description: 'Regala un escudo temporal y suma anillos bonus.',
      activate() {
        const counter = document.getElementById('rings');
        if (counter) {
          const actual = parseInt(counter.textContent || '0', 10) || 0;
          counter.textContent = actual + 25;
        }
        helpers.showToast('Anillo maestro', 'Escudo temporal activado.');
      }
    },

  };

  const activated = new Set();

  function attachSequence(entry) {
    const sequence = entry.code.toLowerCase();
    let buffer = '';
    const handler = (event) => {
      if (entry.once && activated.has(entry)) return;
      const key = event.key.toLowerCase();
      if (!/^[a-z0-9]$/.test(key)) return;
      buffer = (buffer + key).slice(-sequence.length);
      if (buffer === sequence) {
        activated.add(entry);
        try {
          entry.activate();
        } catch (err) {
          console.error('Error al activar código secreto:', err);
        }
        helpers.showToast('Código secreto', `Activaste ${entry.name}.`);
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
    attachSequence(entry);
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
