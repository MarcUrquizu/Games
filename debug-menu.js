(function () {
  const DEBUG_SEQUENCE = "111000333";
  const HACK_STORAGE_PREFIX = "msi_hacks_";
  let recentKeys = "";
  let panel = null;

  function getGameName() {
    const path = window.location.pathname.split("/").pop() || "juego";
    return path.replace(".html", "") || "juego";
  }

  function gameKey() {
    return getGameName().toLowerCase();
  }

  function parseValueByType(raw, type) {
    if (type === "checkbox") return !!raw;
    if (raw === "" || raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  const HACK_PROFILES = {
    space: {
      title: "Hacks • Space Invaders",
      fields: [
        { id: "score", label: "Puntuación", type: "number", min: 0 },
        { id: "lives", label: "Vidas", type: "number", min: 1 },
        { id: "fireRate", label: "Cadencia", type: "number", min: 0.2, step: 0.1 },
        { id: "damage", label: "Daño", type: "number", min: 1 },
        { id: "companions", label: "Compañeros", type: "number", min: 0, max: 2 },
        { id: "speed", label: "Velocidad nave", type: "number", min: 60 }
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

    const input = document.createElement("input");
    input.type = field.type === "checkbox" ? "checkbox" : "number";
    if (field.type === "checkbox") {
      input.checked = !!value;
      input.style.cssText = "width:18px;height:18px;";
    } else {
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

  function applyProfileHacks() {
    const profile = currentProfile();
    if (!profile) return;
    const hacks = window.__gameHacks || getHackState();
    profile.apply(hacks);
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
      applyProfileHacks();
      alert("Hacks aplicados para este juego.");
    });

    addButton(hackActions, "Quitar hacks", () => {
      window.__gameHacks = {};
      saveHackState({});
      applyProfileHacks();
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
  window.setInterval(applyProfileHacks, 250);
})();
