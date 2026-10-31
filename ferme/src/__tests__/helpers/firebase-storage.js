const g = globalThis.__fb || (globalThis.__fb = {});
g.deletedFiles = g.deletedFiles || [];
module.exports = { getStorage: () => ({}), ref: (s, path) => ({ path }), uploadBytes: async () => {}, getDownloadURL: async (r) => 'https://files.example/' + r.path, deleteObject: async (r) => { g.deletedFiles.push(r.path); } };
