(function () {
  const DEBUG_SEQUENCE = "REMOVED_CODE";
  const HACK_STORAGE_PREFIX = "msi_hacks_";
  let recentKeys = "";
  let panel = null;

  function getDigitFromEvent(event) {
    if (typeof event.key === "string" && /^\d$/.test(event.key)) return event.key;
    const code = String(event.code || "");
    const m = code.match(/^Numpad(\d)$/);
    return m ? m[1] : null;
  }

  function showMiniToast(msg) {
    const toast = document.createElement("div");
    toast.textContent = msg;
    toast.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:1000001;background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:10px;padding:8px 10px;font:700 12px system-ui;";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1300);
  }

  function getGameName() {
    const path = window.location.pathname.split("/").pop() || "juego";
    return path.replace(".html", "") || "juego";
  }

  function gameKey() {
    return getGameName().toLowerCase();
  }

  function parseValueByType(raw, type) {
    if (type === "checkbox") return !!raw;
    if (type === "select") {
      if (raw === "" || raw == null) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : raw;
    }
    if (raw === "" || raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function setPathIfNumeric(path, value) {
    if (typeof value !== "number") return;
    const parts = path.split(".");
    let ref = window;
    for (let i = 0; i < parts.length - 1; i++) {
      ref = ref?.[parts[i]];
      if (!ref) return;
    }
    const k = parts[parts.length - 1];
    if (typeof ref[k] === "number") ref[k] = value;
  }

  function setPathIfBoolean(path, value) {
    if (typeof value !== "boolean") return;
    const parts = path.split(".");
    let ref = window;
    for (let i = 0; i < parts.length - 1; i++) {
      ref = ref?.[parts[i]];
      if (!ref) return;
    }
    const k = parts[parts.length - 1];
    if (typeof ref[k] === "boolean") ref[k] = value;
  }

  function applyCandidates(value, paths, type = "number") {
    for (const path of paths) {
      if (type === "number") setPathIfNumeric(path, value);
      if (type === "boolean") setPathIfBoolean(path, value);
    }
  }

  function baseApply(values, mapping) {
    for (const [fieldId, descriptor] of Object.entries(mapping)) {
      const value = values[fieldId];
      if (value == null) continue;
      applyCandidates(value, descriptor.paths || [], descriptor.type || "number");
    }
  }

  const HACK_PROFILES = {
    space: {
      title: "Hacks • Space Invaders",
      fields: [
        { id: "fireRate", label: "Cadencia", type: "number", min: 0.2, step: 0.1 },
        { id: "companions", label: "Compañeros", type: "number", min: 0, max: 2 },
        {
          id: "level",
          label: "Selector de nivel",
          type: "select",
          options: Array.from({ length: 100 }, (_, i) => ({ value: i + 1, label: `Nivel ${i + 1}` }))
        }
      ],
      apply(values) {
        if (window.__spaceDebug?.applyHacks) window.__spaceDebug.applyHacks(values);
      }
    },
    clicker: {
      title: "Hacks • Clicker",
      fields: [
        { id: "points", label: "Puntos", type: "number", min: 0 },
        { id: "clickPower", label: "Puntos por clic", type: "number", min: 1 },
        { id: "pps", label: "Puntos por segundo", type: "number", min: 0 },
        { id: "boostX10", label: "Boost x10", type: "checkbox" }
      ],
      apply(values) {
        window.__clickerBoost = { activo: !!values.boostX10 };
        if (window.__clickerDebug?.applyHacks) window.__clickerDebug.applyHacks(values);
      }
    },
    "2058": {
      title: "Hacks • 2048",
      fields: [
        { id: "injectTile", label: "Crear ficha", type: "number", min: 2, step: 2 },
        { id: "spawnValue", label: "Spawn fijo (2/4/8...)", type: "number", min: 2, step: 2 },
        { id: "lockNoGameOver", label: "No Game Over", type: "checkbox" }
      ],
      apply(values) {
        if (window.__game2048Debug?.applyHacks) window.__game2048Debug.applyHacks(values);
      }
    },
    "3ratlla": {
      title: "Hacks • 3 en raya",
      fields: [
        { id: "wins", label: "Victorias", type: "number", min: 0 },
        { id: "draws", label: "Empates", type: "number", min: 0 },
        { id: "aiDelay", label: "Delay IA (ms)", type: "number", min: 0 }
      ],
      apply(values) {
        baseApply(values, {
          wins: { paths: ["wins", "state.wins", "game.wins"] },
          draws: { paths: ["draws", "state.draws", "game.draws"] },
          aiDelay: { paths: ["aiDelay", "state.aiDelay", "game.aiDelay"] }
        });
      }
    },
    "4rayagpt": {
      title: "Hacks • 4 en raya",
      fields: [
        { id: "wins", label: "Victorias", type: "number", min: 0 },
        { id: "turnTime", label: "Tiempo turno", type: "number", min: 0 },
        { id: "aiDepth", label: "Dificultad IA", type: "number", min: 1 }
      ],
      apply(values) {
        baseApply(values, {
          wins: { paths: ["wins", "score.player", "state.wins"] },
          turnTime: { paths: ["turnTime", "state.turnTime"] },
          aiDepth: { paths: ["aiDepth", "state.aiDepth", "difficulty"] }
        });
      }
    },
    clickometeor: {
      title: "Hacks • Click-o-Meteor",
      fields: [
        { id: "points", label: "Puntos", type: "number", min: 0 },
        { id: "combo", label: "Combo", type: "number", min: 0 },
        { id: "meteorSpeed", label: "Velocidad meteoros", type: "number", min: 0.1, step: 0.1 }
      ],
      apply(values) {
        baseApply(values, {
          points: { paths: ["points", "score", "state.score"] },
          combo: { paths: ["combo", "state.combo"] },
          meteorSpeed: { paths: ["meteorSpeed", "state.meteorSpeed", "game.meteorSpeed"] }
        });
      }
    },
    godshot: {
      title: "Hacks • Godshot",
      fields: [
        { id: "ammo", label: "Munición", type: "number", min: 0 },
        { id: "damage", label: "Daño disparo", type: "number", min: 1 },
        { id: "fireRate", label: "Cadencia", type: "number", min: 0.1, step: 0.1 }
      ],
      apply(values) {
        baseApply(values, {
          ammo: { paths: ["ammo", "player.ammo", "state.ammo"] },
          damage: { paths: ["damage", "player.damage", "weapon.damage"] },
          fireRate: { paths: ["fireRate", "weapon.fireRate", "player.fireRate"] }
        });
      }
    },
    laberintocursor: {
      title: "Hacks • Laberinto cursor",
      fields: [
        { id: "speed", label: "Velocidad", type: "number", min: 0.1, step: 0.1 },
        { id: "lives", label: "Vidas", type: "number", min: 1 },
        { id: "timer", label: "Tiempo", type: "number", min: 0 }
      ],
      apply(values) {
        baseApply(values, {
          speed: { paths: ["player.speed", "speed", "state.speed"] },
          lives: { paths: ["lives", "state.lives", "player.lives"] },
          timer: { paths: ["timer", "timeLeft", "state.timer"] }
        });
      }
    },
    adivinanum: {
      title: "Hacks • Adivina número",
      fields: [
        { id: "attempts", label: "Intentos", type: "number", min: 0 },
        { id: "min", label: "Mínimo rango", type: "number" },
        { id: "max", label: "Máximo rango", type: "number" }
      ],
      apply(values) {
        baseApply(values, {
          attempts: { paths: ["attempts", "intentos", "state.attempts"] },
          min: { paths: ["minNumber", "min", "state.min"] },
          max: { paths: ["maxNumber", "max", "state.max"] }
        });
      }
    },
    ahorcado: {
      title: "Hacks • Ahorcado",
      fields: [
        { id: "lives", label: "Vidas", type: "number", min: 1 },
        { id: "score", label: "Puntuación", type: "number", min: 0 },
        { id: "hints", label: "Pistas", type: "number", min: 0 }
      ],
      apply(values) {
        baseApply(values, {
          lives: { paths: ["lives", "vidas", "state.lives"] },
          score: { paths: ["score", "state.score", "puntos"] },
          hints: { paths: ["hints", "state.hints", "pistas"] }
        });
      }
    },
    asteroides: {
      title: "Hacks • Asteroides",
      fields: [
        { id: "score", label: "Puntos", type: "number", min: 0 },
        { id: "lives", label: "Vidas", type: "number", min: 1 },
        { id: "shipSpeed", label: "Velocidad nave", type: "number", min: 0.1, step: 0.1 }
      ],
      apply(values) {
        baseApply(values, {
          score: { paths: ["score", "state.score"] },
          lives: { paths: ["lives", "state.lives", "ship.lives"] },
          shipSpeed: { paths: ["ship.speed", "shipSpeed", "player.speed"] }
        });
      }
    },
    brakeautnulls: {
      title: "Hacks • Breakout",
      fields: [
        { id: "lives", label: "Vidas", type: "number", min: 1 },
        { id: "ballSpeed", label: "Velocidad bola", type: "number", min: 0.1, step: 0.1 },
        { id: "paddleSize", label: "Tamaño pala", type: "number", min: 20 }
      ],
      apply(values) {
        baseApply(values, {
          lives: { paths: ["lives", "state.lives"] },
          ballSpeed: { paths: ["ball.speed", "ballSpeed", "state.ballSpeed"] },
          paddleSize: { paths: ["paddle.width", "paddleSize", "state.paddleSize"] }
        });
      }
    },
    catala: {
      title: "Hacks • Català quiz",
      fields: [
        { id: "score", label: "Puntuación", type: "number", min: 0 },
        { id: "streak", label: "Racha", type: "number", min: 0 },
        { id: "timeLeft", label: "Tiempo", type: "number", min: 0 }
      ],
      apply(values) {
        baseApply(values, {
          score: { paths: ["score", "state.score", "puntos"] },
          streak: { paths: ["streak", "state.streak"] },
          timeLeft: { paths: ["timeLeft", "timer", "state.timeLeft"] }
        });
      }
    },
    conway: {
      title: "Hacks • Conway",
      fields: [
        { id: "tickRate", label: "Velocidad ticks", type: "number", min: 1 },
        { id: "aliveCells", label: "Celdas vivas", type: "number", min: 0 },
        { id: "generation", label: "Generación", type: "number", min: 0 }
      ],
      apply(values) {
        baseApply(values, {
          tickRate: { paths: ["tickRate", "speed", "state.tickRate"] },
          aliveCells: { paths: ["aliveCells", "state.aliveCells"] },
          generation: { paths: ["generation", "state.generation"] }
        });
      }
    },
    enduro: {
      title: "Hacks • Enduro",
      fields: [
        { id: "speed", label: "Velocidad coche", type: "number", min: 0.1, step: 0.1 },
        { id: "fuel", label: "Combustible", type: "number", min: 0 },
        { id: "laps", label: "Vueltas", type: "number", min: 0 }
      ],
      apply(values) {
        baseApply(values, {
          speed: { paths: ["speed", "car.speed", "state.speed"] },
          fuel: { paths: ["fuel", "state.fuel"] },
          laps: { paths: ["laps", "state.laps", "lap"] }
        });
      }
    },
    flsppybird: {
      title: "Hacks • Flappy",
      fields: [
        { id: "score", label: "Puntos", type: "number", min: 0 },
        { id: "gravity", label: "Gravedad", type: "number", min: 0, step: 0.01 },
        { id: "pipeGap", label: "Hueco tuberías", type: "number", min: 20 }
      ],
      apply(values) {
        baseApply(values, {
          score: { paths: ["score", "state.score"] },
          gravity: { paths: ["gravity", "bird.gravity", "state.gravity"] },
          pipeGap: { paths: ["pipeGap", "state.pipeGap"] }
        });
      }
    },
    ia: {
      title: "Hacks • IA",
      fields: [
        { id: "tokens", label: "Tokens", type: "number", min: 0 },
        { id: "energy", label: "Energía", type: "number", min: 0 },
        { id: "cooldown", label: "Cooldown", type: "number", min: 0 }
      ],
      apply(values) {
        baseApply(values, {
          tokens: { paths: ["tokens", "state.tokens"] },
          energy: { paths: ["energy", "state.energy"] },
          cooldown: { paths: ["cooldown", "state.cooldown"] }
        });
      }
    },
    laberinto: {
      title: "Hacks • Laberinto",
      fields: [
        { id: "speed", label: "Velocidad", type: "number", min: 0.1, step: 0.1 },
        { id: "timer", label: "Tiempo", type: "number", min: 0 },
        { id: "lives", label: "Vidas", type: "number", min: 1 }
      ],
      apply(values) {
        baseApply(values, {
          speed: { paths: ["speed", "player.speed", "state.speed"] },
          timer: { paths: ["timer", "timeLeft", "state.timer"] },
          lives: { paths: ["lives", "state.lives"] }
        });
      }
    },
    laberinto2: {
      title: "Hacks • Laberinto 2",
      fields: [
        { id: "speed", label: "Velocidad", type: "number", min: 0.1, step: 0.1 },
        { id: "timer", label: "Tiempo", type: "number", min: 0 },
        { id: "coins", label: "Monedas", type: "number", min: 0 }
      ],
      apply(values) {
        baseApply(values, {
          speed: { paths: ["speed", "player.speed", "state.speed"] },
          timer: { paths: ["timer", "timeLeft", "state.timer"] },
          coins: { paths: ["coins", "state.coins", "money"] }
        });
      }
    },
    memory: {
      title: "Hacks • Memory",
      fields: [
        { id: "moves", label: "Movimientos", type: "number", min: 0 },
        { id: "timeLeft", label: "Tiempo", type: "number", min: 0 },
        { id: "pairs", label: "Parejas hechas", type: "number", min: 0 }
      ],
      apply(values) {
        baseApply(values, {
          moves: { paths: ["moves", "state.moves"] },
          timeLeft: { paths: ["timeLeft", "timer", "state.timeLeft"] },
          pairs: { paths: ["pairsFound", "state.pairs", "pairs"] }
        });
      }
    },
    pcman: {
      title: "Hacks • PCMan",
      fields: [
        { id: "score", label: "Puntos", type: "number", min: 0 },
        { id: "lives", label: "Vidas", type: "number", min: 1 },
        { id: "speed", label: "Velocidad", type: "number", min: 0.1, step: 0.1 }
      ],
      apply(values) {
        baseApply(values, {
          score: { paths: ["score", "state.score"] },
          lives: { paths: ["lives", "state.lives", "player.lives"] },
          speed: { paths: ["speed", "player.speed", "state.speed"] }
        });
      }
    },
    pingpong: {
      title: "Hacks • Ping Pong",
      fields: [
        { id: "playerScore", label: "Puntos jugador", type: "number", min: 0 },
        { id: "cpuScore", label: "Puntos CPU", type: "number", min: 0 },
        { id: "ballSpeed", label: "Velocidad bola", type: "number", min: 0.1, step: 0.1 }
      ],
      apply(values) {
        baseApply(values, {
          playerScore: { paths: ["playerScore", "score.player", "state.playerScore"] },
          cpuScore: { paths: ["cpuScore", "score.cpu", "state.cpuScore"] },
          ballSpeed: { paths: ["ball.speed", "ballSpeed", "state.ballSpeed"] }
        });
      }
    },
    simondice: {
      title: "Hacks • Simón dice",
      fields: [
        { id: "level", label: "Nivel", type: "number", min: 1 },
        { id: "lives", label: "Vidas", type: "number", min: 1 },
        { id: "showMs", label: "Tiempo muestra (ms)", type: "number", min: 50 }
      ],
      apply(values) {
        baseApply(values, {
          level: { paths: ["level", "state.level"] },
          lives: { paths: ["lives", "state.lives"] },
          showMs: { paths: ["showMs", "state.showMs", "displayTime"] }
        });
      }
    },
    skyhooper: {
      title: "Hacks • Sky Hooper",
      fields: [
        { id: "score", label: "Puntos", type: "number", min: 0 },
        { id: "jumpForce", label: "Fuerza salto", type: "number", min: 0.1, step: 0.1 },
        { id: "gravity", label: "Gravedad", type: "number", min: 0, step: 0.01 }
      ],
      apply(values) {
        baseApply(values, {
          score: { paths: ["score", "state.score"] },
          jumpForce: { paths: ["jumpForce", "player.jumpForce", "state.jumpForce"] },
          gravity: { paths: ["gravity", "state.gravity", "player.gravity"] }
        });
      }
    }
  };

  function currentProfile() {
    return HACK_PROFILES[gameKey()] || null;
  }

  function getHackState() {
    try {
      const raw = localStorage.getItem(HACK_STORAGE_PREFIX + gameKey());
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveHackState(nextState) {
    localStorage.setItem(HACK_STORAGE_PREFIX + gameKey(), JSON.stringify(nextState || {}));
  }

  function closePanel() {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
  }

  function addButton(container, label, onClick) {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.cssText = "padding:8px 10px;border-radius:8px;border:1px solid #4b5563;background:#111827;color:#e5e7eb;cursor:pointer;font-weight:700;";
    button.addEventListener("click", onClick);
    container.appendChild(button);
  }

  function renderField(container, field, value) {
    const wrap = document.createElement("label");
    wrap.style.cssText = "display:grid;gap:4px;font-size:12px;";
    wrap.textContent = field.label;

    let input;
    if (field.type === "select") {
      input = document.createElement("select");
      input.style.cssText = "padding:7px 8px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;";
      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "sin cambio";
      input.appendChild(emptyOpt);
      for (const opt of field.options || []) {
        const option = document.createElement("option");
        option.value = String(opt.value);
        option.textContent = opt.label;
        input.appendChild(option);
      }
      input.value = value == null ? "" : String(value);
    } else {
      input = document.createElement("input");
      input.type = field.type === "checkbox" ? "checkbox" : "number";
    }
    if (field.type === "checkbox") {
      input.checked = !!value;
      input.style.cssText = "width:18px;height:18px;";
    } else if (field.type !== "select") {
      input.value = value ?? "";
      input.placeholder = "vacío = desactivado";
      if (field.step != null) input.step = String(field.step);
      if (field.min != null) input.min = String(field.min);
      if (field.max != null) input.max = String(field.max);
      input.style.cssText = "padding:7px 8px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;";
    }
    wrap.appendChild(input);
    container.appendChild(wrap);
    return input;
  }

  function buildValuesFromInputs(profile, inputs) {
    const out = {};
    for (const field of profile.fields) {
      const input = inputs[field.id];
      const raw = field.type === "checkbox" ? input.checked : input.value;
      out[field.id] = parseValueByType(raw, field.type);
    }
    return out;
  }

  function applyProfileHacks(options = {}) {
    const profile = currentProfile();
    if (!profile) return;
    const hacks = window.__gameHacks || getHackState();
    let applied = hacks;
    const isSpace = gameKey() === "space";
    const includeLevel = !!options.includeLevel;
    if (isSpace && !includeLevel && hacks && hacks.level != null) {
      applied = { ...hacks, level: null };
    }
    profile.apply(applied);
  }

  function openPanel() {
    if (panel) {
      closePanel();
      return;
    }

    panel = document.createElement("div");
    panel.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:999999;background:#020617;color:#e2e8f0;border:1px solid #334155;border-radius:12px;padding:12px;min-width:250px;max-width:340px;box-shadow:0 10px 30px rgba(0,0,0,.6);font-family:system-ui,Segoe UI,Arial,sans-serif;";

    const title = document.createElement("div");
    const profile = currentProfile();
    title.textContent = profile ? profile.title : `Debug • ${getGameName()}`;
    title.style.cssText = "font-weight:800;margin-bottom:8px;";
    panel.appendChild(title);

    const actions = document.createElement("div");
    actions.style.cssText = "display:grid;gap:8px;";
    panel.appendChild(actions);

    addButton(actions, "Cerrar menú", closePanel);
    addButton(actions, "Recargar juego", () => window.location.reload());
    addButton(actions, "Limpiar progreso local", () => {
      if (confirm("¿Borrar progreso local de este navegador?")) {
        localStorage.clear();
        window.location.reload();
      }
    });

    if (gameKey() === "clicker") {
      addButton(actions, "Desbloquear logro 50M", () => {
        localStorage.setItem("msi_medal_clicker_50m", "1");
        alert("Logro secreto del clicker desbloqueado.");
      });
    }

    if (!profile) {
      const noProfile = document.createElement("div");
      noProfile.textContent = "Este juego no tiene hacks específicos todavía.";
      noProfile.style.cssText = "margin-top:8px;font-size:12px;opacity:.9;";
      panel.appendChild(noProfile);
      document.body.appendChild(panel);
      return;
    }

    const subtitle = document.createElement("div");
    subtitle.textContent = "Hacks adaptados a este juego";
    subtitle.style.cssText = "margin-top:8px;font-size:12px;opacity:.9;font-weight:700;";
    panel.appendChild(subtitle);

    const form = document.createElement("div");
    form.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;";
    panel.appendChild(form);

    const stored = getHackState();
    const inputs = {};
    for (const field of profile.fields) {
      inputs[field.id] = renderField(form, field, stored[field.id]);
    }

    const hackActions = document.createElement("div");
    hackActions.style.cssText = "display:grid;gap:8px;margin-top:8px;";
    panel.appendChild(hackActions);

    addButton(hackActions, "Aplicar hacks", () => {
      const values = buildValuesFromInputs(profile, inputs);
      window.__gameHacks = values;
      saveHackState(values);
      applyProfileHacks({ includeLevel: true });
      alert("Hacks aplicados para este juego.");
    });

    addButton(hackActions, "Quitar hacks", () => {
      window.__gameHacks = {};
      saveHackState({});
      applyProfileHacks({ includeLevel: true });
      alert("Hacks desactivados para este juego.");
    });

    document.body.appendChild(panel);
  }

  document.addEventListener("keydown", (event) => {
    const digit = getDigitFromEvent(event);
    if (digit == null) return;
    recentKeys = (recentKeys + digit).slice(-DEBUG_SEQUENCE.length);
    if (recentKeys === DEBUG_SEQUENCE) {
      recentKeys = "";
      openPanel();
      showMiniToast("Debug activado");
    }
  });

  window.__gameHacks = getHackState();
  window.setInterval(applyProfileHacks, 250);
})();
