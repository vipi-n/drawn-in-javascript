// Callout anchors registered by shots each frame (screen coordinates).
const M = new Map();
module.exports = {
  set(k, a, b) { M.set(k, [a, b]); },
  get(k) { return M.get(k); },
  clear() { M.clear(); },
};
