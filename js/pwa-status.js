(function () {
  const OFFLINE_MESSAGE = "Offline mode";
  const READY_MESSAGE = "App ready for offline use";
  const SUCCESS_HIDE_DELAY = 3500;

  let statusEl;
  let hideTimer;

  function ensureStatusEl() {
    if (statusEl) return statusEl;

    statusEl = document.createElement("div");
    statusEl.setAttribute("role", "status");
    statusEl.setAttribute("aria-live", "polite");
    statusEl.style.position = "fixed";
    statusEl.style.left = "50%";
    statusEl.style.bottom = "calc(1rem + env(safe-area-inset-bottom, 0px))";
    statusEl.style.transform = "translateX(-50%)";
    statusEl.style.zIndex = "3000";
    statusEl.style.padding = "0.65rem 1rem";
    statusEl.style.borderRadius = "var(--radius-pill, 999px)";
    statusEl.style.border = "1px solid rgba(226, 232, 240, 0.95)";
    statusEl.style.background = "rgba(255, 255, 255, 0.96)";
    statusEl.style.color = "var(--text-main, #0f172a)";
    statusEl.style.boxShadow = "0 12px 30px -10px rgba(15, 23, 42, 0.16), 0 2px 8px -2px rgba(15, 23, 42, 0.05)";
    statusEl.style.fontFamily = "inherit";
    statusEl.style.fontSize = "0.875rem";
    statusEl.style.fontWeight = "600";
    statusEl.style.pointerEvents = "none";
    statusEl.style.opacity = "0";
    statusEl.style.visibility = "hidden";
    statusEl.style.transition = "opacity 0.2s ease, visibility 0.2s ease";

    document.body.appendChild(statusEl);
    return statusEl;
  }

  function showStatus(message, options = {}) {
    const el = ensureStatusEl();
    clearTimeout(hideTimer);
    el.textContent = message;
    el.style.opacity = "1";
    el.style.visibility = "visible";

    if (options.autoHide) {
      hideTimer = setTimeout(() => {
        if (!navigator.onLine) return;
        hideStatus();
      }, SUCCESS_HIDE_DELAY);
    }
  }

  function hideStatus() {
    if (!statusEl) return;
    statusEl.style.opacity = "0";
    statusEl.style.visibility = "hidden";
  }

  function syncOfflineStatus() {
    if (navigator.onLine) {
      hideStatus();
    } else {
      showStatus(OFFLINE_MESSAGE);
    }
  }

  function initPwaStatus() {
    syncOfflineStatus();

    window.addEventListener("offline", () => {
      showStatus(OFFLINE_MESSAGE);
    });

    window.addEventListener("online", () => {
      hideStatus();
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => {
        if (navigator.onLine) {
          showStatus(READY_MESSAGE, { autoHide: true });
        }
      }).catch(() => {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPwaStatus);
  } else {
    initPwaStatus();
  }
})();
