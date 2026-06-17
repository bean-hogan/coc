// ============================================================
// TORN GROUPS — API Helper
// Fetches data from the Apps Script Web App
// ============================================================

const api = (() => {
  const CACHE_MS = 5 * 60 * 1000; // 5 minutes browser-side cache
  const _cache   = {};

  async function fetch_(action, id) {
    const key = action + (id || '');
    const now = Date.now();

    if (_cache[key] && now - _cache[key].ts < CACHE_MS) {
      return _cache[key].data;
    }

    let url = CONFIG.SCRIPT_URL + '?action=' + action;
    if (id) url += '&id=' + encodeURIComponent(id);

    const res  = await fetch(url);
    const data = await res.json();

    _cache[key] = { data, ts: now };
    return data;
  }

  return {
    getGroups: ()       => fetch_('groups'),
    getGroup:  (id)     => fetch_('group', id),
    getUser:   (userId) => fetch_('user',  userId),
  };
})();
