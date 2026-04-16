(function () {
  const DEBUG_SEQUENCE = "111000333";
  let recentKeys = "";
  let panel = null;
  let clickerBoostEnabled = false;

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
})();
