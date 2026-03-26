(function () {
  const AUTH_KEY = 'google_auth';
  const META_KEY = 'progress_sync_meta';

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
      if (!auth?.userInfo?.email || !auth?.expiresAt || auth.expiresAt <= Date.now()) return null;
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: auth.userInfo.email,
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
    if (!auth) return;

    const email = encodeURIComponent(auth.userInfo.email);
    const response = await fetch(`${getApiBase()}/progress?email=${email}`);
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
      Object.entries(remote.progress).forEach(([key, value]) => {
        if (key === AUTH_KEY || key === META_KEY) return;
        localStorage.setItem(key, value);
      });
      localStorage.setItem(META_KEY, JSON.stringify({ updatedAt: remoteUpdatedAt }));
      window.dispatchEvent(new Event('progress-synced'));
    } else {
      await uploadProgress();
    }
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
    originalSetItem(key, value);
    if (key !== AUTH_KEY && key !== META_KEY) queueUpload(1500);
  };

  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  localStorage.removeItem = function (key) {
    originalRemoveItem(key);
    if (key !== AUTH_KEY && key !== META_KEY) queueUpload(1500);
  };

  setInterval(() => {
    uploadProgress().catch(() => {});
  }, 30000);

  window.addEventListener('beforeunload', () => {
    const auth = readAuth();
    if (!auth?.userInfo?.email || !navigator.sendBeacon) return;

    const payload = JSON.stringify({
      email: auth.userInfo.email,
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

  syncFromRemote().catch((err) => console.warn('No se pudo sincronizar progreso:', err));
})();
