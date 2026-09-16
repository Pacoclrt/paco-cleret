// Web Worker : charge le vérificateur Go compilé en WebAssembly et exécute les demandes de la page.
// Tourne à part pour qu'une boucle infinie ne fige jamais la page : la page coupe le worker après un délai.
importScripts("wasm_exec.js");

let stderr = "";
const decoder = new TextDecoder();
// Capture la sortie d'erreur de Go (pour reconnaître une récursion sans fin) sans polluer la console.
globalThis.fs.writeSync = (fd, buf) => {
  if (stderr.length < 1500) stderr += decoder.decode(buf);
  return buf.length;
};

const go = new Go();
const ready = new Promise((resolve, reject) => {
  self.carnetVerifReady = resolve;
  const url = "verif.wasm";
  const load = () => fetch(url).then(r => {
    if (!r.ok) throw new Error("verif.wasm introuvable (" + r.status + ")");
    return r.arrayBuffer();
  }).then(buf => WebAssembly.instantiate(buf, go.importObject));
  const start = WebAssembly.instantiateStreaming
    ? WebAssembly.instantiateStreaming(fetch(url), go.importObject).catch(load)
    : load();
  start.then(result => go.run(result.instance)).catch(reject);
});

onmessage = async event => {
  const {id, op, args} = event.data;
  try {
    await ready;
    if (go.exited) throw new Error("le vérificateur s'est arrêté");
    stderr = "";
    const out = self.carnetVerif[op](...args);
    if (go.exited) throw new Error("le vérificateur s'est arrêté");
    postMessage({id, ok: true, data: JSON.parse(out)});
  } catch (err) {
    postMessage({id, ok: false, crash: (stderr || String((err && err.message) || err)).slice(0, 1500)});
  }
};
