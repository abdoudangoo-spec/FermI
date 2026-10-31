const m = new Map();
module.exports = { getItemAsync: async (k) => m.get(k) ?? null, setItemAsync: async (k, v) => { m.set(k, v); }, deleteItemAsync: async (k) => { m.delete(k); }, __m: m };
