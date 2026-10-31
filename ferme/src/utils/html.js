// Échappement HTML — indispensable avant d'injecter du texte saisi par l'utilisateur dans un PDF.
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => MAP[ch]);
}
