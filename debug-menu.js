(function () {
  const DEBUG_SEQUENCE = "111000333";
  const HACK_STORAGE_PREFIX = "msi_hacks_";
  let recentKeys = "";
  let panel = null;
  let clickerBoostEnabled = false;
  let hackTick = null;

  function gameKey() {
    return getGameName().toLowerCase();
  }

  function parseNumberOrNull(value) {
    if (value === "" || value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
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

  function getGameName() {
    const path = window.location.pathname.split("/").pop() || "juego";
    return path.replace(".html", "") || "juego";
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

  function addField(container, label, field, type = "number") {
    const wrap = document.createElement("label");
    wrap.style.cssText = "display:grid;gap:4px;font-size:12px;";
    wrap.textContent = label;

    const input = document.createElement("input");
    input.type = type;
    input.value = field ?? "";
    input.placeholder = "sin límite";
    input.style.cssText = "padding:7px 8px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;";
    wrap.appendChild(input);
    container.appendChild(wrap);
    return input;
  }

  function applyValueToTargets(targets, keys, value) {
    if (value == null) return;
    for (const target of targets) {
      if (!target || typeof target !== "object") continue;
      for (const key of keys) {
        if (typeof target[key] === "number") {
          target[key] = value;
        }
      }
    }
  }

  function runUniversalHackTick() {
    const hacks = window.__gameHacks || getHackState();
    if (!hacks || typeof hacks !== "object") return;

    const objTargets = [
      window,
      window.game,
      window.state,
      window.player,
      window.Game,
      window.__spaceDebug && window.__spaceDebug.state,
      window.__spaceDebug && window.__spaceDebug.player,
      window.__clickerDebug
    ];

    applyValueToTargets(objTargets, ["money", "coins", "gold", "cash", "dinero"], hacks.money);
    applyValueToTargets(objTargets, ["lives", "vida", "vidas", "health", "hp"], hacks.lives);
    applyValueToTargets(objTargets, ["damage", "dmg", "attack"], hacks.damage);
    applyValueToTargets(objTargets, ["fireRate", "fire_rate", "cadence", "cadencia"], hacks.fireRate);
    applyValueToTargets(objTargets, ["speed", "velocity", "velocidad"], hacks.speed);
    applyValueToTargets(objTargets, ["buddies", "companions"], hacks.companions);

    if (window.__spaceDebug && typeof window.__spaceDebug.applyHacks === "function") {
      window.__spaceDebug.applyHacks(hacks);
    }
    if (window.__clickerDebug && typeof window.__clickerDebug.applyHacks === "function") {
      window.__clickerDebug.applyHacks(hacks);
    }
  }

  function openPanel() {
    if (panel) {
      closePanel();
      return;
    }

    panel = document.createElement("div");
    panel.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:999999;background:#020617;color:#e2e8f0;border:1px solid #334155;border-radius:12px;padding:12px;min-width:240px;box-shadow:0 10px 30px rgba(0,0,0,.6);font-family:system-ui,Segoe UI,Arial,sans-serif;";

    const title = document.createElement("div");
    title.textContent = `Debug • ${getGameName()}`;
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

    if (window.location.pathname.endsWith("/clicker.html") || window.location.pathname.endsWith("clicker.html")) {
      addButton(actions, "Desbloquear logro 50M", () => {
        localStorage.setItem("msi_medal_clicker_50m", "1");
        alert("Logro secreto del clicker desbloqueado.");
      });
      addButton(actions, "Toggle boost x10", () => {
        clickerBoostEnabled = !clickerBoostEnabled;
        window.__clickerBoost = { activo: clickerBoostEnabled };
        alert(`Boost x10 ${clickerBoostEnabled ? "activado" : "desactivado"}.`);
      });
    }

    const subtitle = document.createElement("div");
    subtitle.textContent = "Hacks persistentes para este juego";
    subtitle.style.cssText = "margin-top:8px;font-size:12px;opacity:.9;font-weight:700;";
    panel.appendChild(subtitle);

    const hackForm = document.createElement("div");
    hackForm.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;";
    panel.appendChild(hackForm);

    const stored = getHackState();
    const inputMoney = addField(hackForm, "Dinero/Puntos", stored.money);
    const inputLives = addField(hackForm, "Vidas", stored.lives);
    const inputFireRate = addField(hackForm, "Cadencia", stored.fireRate);
    const inputDamage = addField(hackForm, "Daño", stored.damage);
    const inputCompanions = addField(hackForm, "Compañeros", stored.companions);
    const inputSpeed = addField(hackForm, "Velocidad", stored.speed);

    const hackActions = document.createElement("div");
    hackActions.style.cssText = "display:grid;gap:8px;margin-top:8px;";
    panel.appendChild(hackActions);

    addButton(hackActions, "Aplicar hacks", () => {
      const next = {
        money: parseNumberOrNull(inputMoney.value),
        lives: parseNumberOrNull(inputLives.value),
        fireRate: parseNumberOrNull(inputFireRate.value),
        damage: parseNumberOrNull(inputDamage.value),
        companions: parseNumberOrNull(inputCompanions.value),
        speed: parseNumberOrNull(inputSpeed.value)
      };
      window.__gameHacks = next;
      saveHackState(next);
      runUniversalHackTick();
      alert("Hacks aplicados. Se guardan para este juego.");
    });

    addButton(hackActions, "Quitar hacks", () => {
      window.__gameHacks = {};
      saveHackState({});
      alert("Hacks desactivados para este juego.");
    });

    document.body.appendChild(panel);
  }

  document.addEventListener("keydown", (event) => {
    if (!/^\d$/.test(event.key)) return;
    recentKeys = (recentKeys + event.key).slice(-DEBUG_SEQUENCE.length);
    if (recentKeys === DEBUG_SEQUENCE) {
      recentKeys = "";
      openPanel();
    }
  });

  window.__gameHacks = getHackState();
  hackTick = window.setInterval(runUniversalHackTick, 250);
})();
