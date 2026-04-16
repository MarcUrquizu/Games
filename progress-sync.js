(function () {
  const AUTH_KEY = 'google_auth';
  const META_KEY = 'progress_sync_meta';
  const ACHIEVEMENT_MESSAGES = {
    msi_medal_hardcore: '🏅 Logro desbloqueado: Medalla Hardcore',
    msi_medal_2048: '🧠 Logro desbloqueado: Maestro del 2048',
    msi_medal_skyhooper_1500: '🚀 Logro desbloqueado: Escalador del cielo',
    msi_medal_flappy_50: '🐦 Logro desbloqueado: Aleteo legendario',
    msi_medal_pacman_level10: '🟡 Logro desbloqueado: Rey del Pacman',
    msi_medal_laberinto2_10: '🧩 Logro desbloqueado: Maestro del Laberinto 2',
  };
  let isApplyingRemote = false;
  let hasSyncedAfterLogin = false;
  let toastContainer = null;

  function ensureAchievementToasts() {
    if (toastContainer || !document?.body) return toastContainer;
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      .achievement-toast-stack {
        position: fixed;
        left: 14px;
        bottom: 14px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      }
      .achievement-toast {
        max-width: min(360px, calc(100vw - 28px));
        background: linear-gradient(140deg, rgba(36, 28, 6, 0.94), rgba(94, 70, 6, 0.94));
        color: #ffe7a6;
        border: 1px solid rgba(255, 214, 120, 0.85);
        border-radius: 10px;
        padding: 10px 12px;
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.45), 0 0 18px rgba(255, 199, 65, 0.28);
        font: 700 12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        transform: translateX(-120%);
        opacity: 0;
        animation: achievement-toast-slide 3400ms ease forwards;
        will-change: transform, opacity;
      }
      @keyframes achievement-toast-slide {
        0% { transform: translateX(-120%); opacity: 0; }
        12% { transform: translateX(0); opacity: 1; }
        78% { transform: translateX(0); opacity: 1; }
        100% { transform: translateX(-120%); opacity: 0; }
      }
    `;
    document.head.appendChild(styleTag);

    toastContainer = document.createElement('div');
    toastContainer.className = 'achievement-toast-stack';
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  function showAchievementToast(message) {
    if (!message) return;
    const container = ensureAchievementToasts();
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3600);
  }

  function getApiBase() {
    if (window.PROGRESS_API_BASE) return window.PROGRESS_API_BASE;
    if (window.location.protocol === 'file:') return 'http://localhost:3000';
    return window.location.origin;
  }

  function readAuth() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return null;
      const auth = JSON.parse(raw);
      if (!auth?.credential || !auth?.userInfo?.email || !auth?.expiresAt || auth.expiresAt <= Date.now()) return null;
      return auth;
    } catch {
      return null;
    }
  }

  function getSnapshot() {
    const snapshot = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || key === AUTH_KEY || key === META_KEY) continue;
      snapshot[key] = localStorage.getItem(key);
    }
    return snapshot;
  }

  async function uploadProgress() {
    const auth = readAuth();
    if (!auth) return false;

    const updatedAt = Date.now();
    const response = await fetch(`${getApiBase()}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.credential}`,
      },
      body: JSON.stringify({
        credential: auth.credential,
        progress: getSnapshot(),
        updatedAt,
      }),
    });

    if (!response.ok) throw new Error(`Error ${response.status} subiendo progreso`);
    localStorage.setItem(META_KEY, JSON.stringify({ updatedAt }));
    return true;
  }

  async function syncFromRemote() {
    const auth = readAuth();
    if (!auth) {
      hasSyncedAfterLogin = false;
      return;
    }

    const response = await fetch(`${getApiBase()}/progress`, {
      headers: {
        Authorization: `Bearer ${auth.credential}`,
      },
    });
    if (!response.ok) return;

    const remote = await response.json();
    const localMeta = JSON.parse(localStorage.getItem(META_KEY) || '{}');
    const localUpdatedAt = Number(localMeta.updatedAt || 0);

    if (!remote || !remote.progress || typeof remote.progress !== 'object') {
      await uploadProgress();
      return;
    }

    const remoteUpdatedAt = Number(remote.updatedAt || 0);
    if (remoteUpdatedAt > localUpdatedAt) {
      isApplyingRemote = true;
      const keysToDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || key === AUTH_KEY || key === META_KEY) continue;
        if (!Object.prototype.hasOwnProperty.call(remote.progress, key)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => localStorage.removeItem(key));
      Object.entries(remote.progress).forEach(([key, value]) => {
        if (key === AUTH_KEY || key === META_KEY) return;
        localStorage.setItem(key, value);
      });
      isApplyingRemote = false;
      localStorage.setItem(META_KEY, JSON.stringify({ updatedAt: remoteUpdatedAt }));
      window.dispatchEvent(new Event('progress-synced'));
    } else {
      await uploadProgress();
    }

    hasSyncedAfterLogin = true;
  }

  let pendingUpload = null;
  function queueUpload(delayMs) {
    if (pendingUpload) clearTimeout(pendingUpload);
    pendingUpload = setTimeout(() => {
      uploadProgress().catch((err) => console.warn('No se pudo subir progreso:', err));
      pendingUpload = null;
    }, delayMs);
  }

  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    const previousValue = localStorage.getItem(key);
    originalSetItem(key, value);
    if (key === AUTH_KEY) {
      syncFromRemote().catch((err) => console.warn('No se pudo sincronizar tras login:', err));
      return;
    }

    if (!isApplyingRemote && value === '1' && previousValue !== '1' && ACHIEVEMENT_MESSAGES[key]) {
      showAchievementToast(ACHIEVEMENT_MESSAGES[key]);
    }

    if (!isApplyingRemote && key !== META_KEY) queueUpload(1500);
  };

  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  localStorage.removeItem = function (key) {
    originalRemoveItem(key);
    if (key === AUTH_KEY) {
      hasSyncedAfterLogin = false;
      return;
    }

    if (!isApplyingRemote && key !== META_KEY) queueUpload(1500);
  };

  setInterval(() => {
    uploadProgress().catch(() => {});
  }, 30000);

  window.addEventListener('beforeunload', () => {
    const auth = readAuth();
    if (!auth?.credential || !navigator.sendBeacon) return;

    const payload = JSON.stringify({
      credential: auth.credential,
      progress: getSnapshot(),
      updatedAt: Date.now(),
    });

    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(`${getApiBase()}/progress`, blob);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      uploadProgress().catch(() => {});
    }
  });

  window.progressSync = {
    syncNow: () => syncFromRemote(),
    uploadNow: () => uploadProgress(),
  };

  syncFromRemote().catch((err) => console.warn('No se pudo sincronizar progreso:', err));

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || hasSyncedAfterLogin) return;
    syncFromRemote().catch(() => {});
  });
})();
