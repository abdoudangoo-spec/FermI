module.exports = { printToFileAsync: async ({ html }) => { globalThis.__lastPdfHtml = html; return { uri: '/tmp/rapport.pdf' }; } };
