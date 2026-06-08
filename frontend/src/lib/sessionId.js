// Stable per-browser-session ID used for live-counts and analytics dedup.
// Persisted in sessionStorage so it survives tab navigation but resets per session.
const KEY = 'am_session_id';

export const getSessionId = () => {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // sessionStorage blocked — generate ephemeral id
    return `s_${Math.random().toString(36).slice(2, 14)}`;
  }
};
