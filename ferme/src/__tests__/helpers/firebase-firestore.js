const g = globalThis.__fb || (globalThis.__fb = {});
g.docs = g.docs || new Map();
let auto = 0;
const ts = () => ({ __ts: true, toMillis: () => Date.now() });
const segs = (a) => a.slice(1).join('/').split('/').filter(Boolean);
const mkRef = (path) => ({ path, id: path.split('/').pop(), type: 'doc' });
const snap = (path) => ({ id: path.split('/').pop(), ref: mkRef(path), exists: () => g.docs.has(path), data: () => ({ ...g.docs.get(path) }) });
const direct = (colPath) => [...g.docs.keys()].filter((p) => p.startsWith(colPath + '/') && p.slice(colPath.length + 1).split('/').length === 1);
function run(q) {
  const base = q.base || q;
  let paths = base.type === 'group' ? [...g.docs.keys()].filter((p) => { const s = p.split('/'); return s[s.length - 2] === base.name; }) : direct(base.path);
  for (const w of q.wheres || []) paths = paths.filter((p) => g.docs.get(p)[w.f] === w.v);
  if (q.order) { const { f, dir } = q.order; paths.sort((a, b) => { const x = g.docs.get(a)[f], y = g.docs.get(b)[f]; const vx = x && x.toMillis ? x.toMillis() : x, vy = y && y.toMillis ? y.toMillis() : y; return (vx > vy ? 1 : vx < vy ? -1 : 0) * (dir === 'desc' ? -1 : 1); }); }
  if (q.lim) paths = paths.slice(0, q.lim);
  const docs = paths.map(snap);
  return { docs, forEach: (cb) => docs.forEach(cb), size: docs.length, empty: docs.length === 0 };
}
module.exports = {
  getFirestore: () => ({}), serverTimestamp: ts,
  doc: (db, ...s) => mkRef(s.join('/')), collection: (db, ...s) => ({ path: s.join('/'), type: 'col' }), collectionGroup: (db, name) => ({ type: 'group', name }),
  setDoc: async (ref, data) => { g.docs.set(ref.path, { ...data }); }, getDoc: async (ref) => snap(ref.path),
  updateDoc: async (ref, data) => { if (!g.docs.has(ref.path)) throw Object.assign(new Error('nf'), { code: 'not-found' }); g.docs.set(ref.path, { ...g.docs.get(ref.path), ...data }); },
  deleteDoc: async (ref) => { g.docs.delete(ref.path); },
  addDoc: async (col, data) => { const p = `${col.path}/auto${++auto}`; g.docs.set(p, { ...data }); return mkRef(p); },
  getDocs: async (q) => { if (g.failFirestore) throw Object.assign(new Error('x'), { code: 'unavailable' }); return run(q); },
  query: (base, ...cs) => { const q = { base, wheres: [] }; for (const c of cs) { if (c.t === 'w') q.wheres.push(c); else if (c.t === 'o') q.order = c; else if (c.t === 'l') q.lim = c.n; } return q; },
  where: (f, op, v) => ({ t: 'w', f, op, v }), orderBy: (f, dir = 'asc') => ({ t: 'o', f, dir }), limit: (n) => ({ t: 'l', n }),
  writeBatch: () => { const ops = []; return { set: (r, d) => ops.push(['s', r, d]), delete: (r) => ops.push(['d', r]), commit: async () => { if (g.failFirestore) throw Object.assign(new Error('x'), { code: 'unavailable' }); ops.forEach(([t, r, d]) => (t === 's' ? g.docs.set(r.path, { ...d }) : g.docs.delete(r.path))); } }; },
};
