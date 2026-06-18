// ============================================================
// TORN GROUPS — API Helper
// Primary: fetches data.json from GitHub CDN (fast, no cold start)
// Fallback: Apps Script Web App (if data.json unavailable)
// ============================================================

const api = (() => {
  const CACHE_MS = 5 * 60 * 1000;
  const _cache   = {};

  // Fetch the full data.json from GitHub CDN
  async function fetchDataJson() {
    const key = 'data_json';
    const now = Date.now();
    if (_cache[key] && now - _cache[key].ts < CACHE_MS) return _cache[key].data;

    // Cache-bust with timestamp so browser never serves stale file
    const url = CONFIG.DATA_URL + '?t=' + Math.floor(now / CACHE_MS);
    const res  = await fetch(url);
    if (!res.ok) throw new Error('data.json fetch failed: ' + res.status);
    const data = await res.json();
    _cache[key] = { data, ts: now };
    return data;
  }

  // Fallback: call Apps Script Web App directly
  async function fetchScript(action, id) {
    const key = 'script_' + action + (id || '');
    const now = Date.now();
    if (_cache[key] && now - _cache[key].ts < CACHE_MS) return _cache[key].data;
    let url = CONFIG.SCRIPT_URL + '?action=' + action;
    if (id) url += '&id=' + encodeURIComponent(id);
    const res  = await fetch(url);
    const data = await res.json();
    _cache[key] = { data, ts: now };
    return data;
  }

  async function getData() {
    try {
      return await fetchDataJson();
    } catch(e) {
      console.warn('data.json unavailable, falling back to Apps Script:', e.message);
      return null;
    }
  }

  return {
    // All groups list
    getGroups: async () => {
      const d = await getData();
      if (d) return { groups: d.groups };
      return fetchScript('groups');
    },

    // Single group — finds it in data.json or falls back
    getGroup: async (id) => {
      const d = await getData();
      if (d) {
        const g = d.groups.find(g => g.id === id);
        if (g) return {
          ...g,
          contributors: g.contributors_detail || [],
        };
      }
      return fetchScript('group', id);
    },

    // User — finds in data.json members + scans group history
    getUser: async (userId) => {
      const d = await getData();
      if (d) {
        const member = d.members.find(m => m.userId === userId.toString());
        if (!member) return { error: 'User not found: ' + userId };
        const history = d.groups
          .map(g => {
            const contrib = (g.contributors_detail || []).find(c => c.senderId === userId.toString());
            if (!contrib) return null;
            return {
              groupId:     g.id,
              cacheName:   g.cacheName,
              itemName:    g.itemName,
              groupStatus: g.status,
              startDate:   g.startDate,
              endDate:     g.endDate,
              ...contrib,
            };
          })
          .filter(Boolean)
          .sort((a, b) => b.groupId.localeCompare(a.groupId));
        return { ...member, history };
      }
      return fetchScript('user', userId);
    },
  };
})();
