/**
 * Registry of every file on the site that an imported agent is allowed to read.
 *
 * Listed here (rather than auto-discovered) so the agent's read-surface is
 * explicit and reviewable, and so this works on any static host without a
 * directory listing endpoint.
 *
 * Add new files here when you create them.
 */
(function (global) {
  const FILES = [
    { path: 'README.md', kind: 'text', description: 'Project overview.' },
    { path: 'index.html', kind: 'html', description: 'Host page where consciousnesses are imported.' },
    { path: 'export.html', kind: 'html', description: 'Page for forging a consciousness QR code.' },
    { path: 'about.html', kind: 'html', description: 'About the project and the schema.' },
    { path: 'assets/css/style.css', kind: 'css', description: 'Site styles.' },
    { path: 'assets/js/main.js', kind: 'js', description: 'Bootstrap and UI wiring for the host page.' },
    { path: 'assets/js/consciousness.js', kind: 'js', description: 'Consciousness schema, encode, and decode.' },
    { path: 'assets/js/scanner.js', kind: 'js', description: 'Camera + QR scanning logic.' },
    { path: 'assets/js/generator.js', kind: 'js', description: 'QR code generator on the export page.' },
    { path: 'assets/js/speech.js', kind: 'js', description: 'Speech recognition and synthesis helpers.' },
    { path: 'assets/js/engine.js', kind: 'js', description: 'Response engine for the imported agent.' },
    { path: 'assets/js/file-index.js', kind: 'js', description: 'This file. The agent\'s map of the site.' },
    { path: 'samples/aria.json', kind: 'json', description: 'Sample consciousness: Aria, an archivist.' },
    { path: 'samples/thunder.json', kind: 'json', description: 'Sample consciousness: Thunder, a terse oracle.' },
  ];

  const cache = new Map();

  async function read(path) {
    if (cache.has(path)) return cache.get(path);
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to read ${path}: ${res.status}`);
    const text = await res.text();
    cache.set(path, text);
    return text;
  }

  function list() {
    return FILES.slice();
  }

  function find(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return FILES.filter(
      (f) =>
        f.path.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.kind.toLowerCase() === q
    );
  }

  function summarize(text, maxChars = 240) {
    if (!text) return '';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxChars) return cleaned;
    return cleaned.slice(0, maxChars - 1).trimEnd() + '…';
  }

  global.FileIndex = { list, read, find, summarize };
})(window);
