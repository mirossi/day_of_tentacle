const Speech = (() => {
  let voiceOn = true;
  let enVoices = [];
  let current = null;

  function loadVoices() {
    if (!window.speechSynthesis) return;
    const all = speechSynthesis.getVoices();
    enVoices = all.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
    if (!enVoices.length) enVoices = all;
  }

  if (window.speechSynthesis) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  function pickVoice(idx) {
    if (!enVoices.length) return null;
    return enVoices[idx % enVoices.length];
  }

  function fallbackMs(text) {
    return Math.max(1300, 850 + text.length * 55);
  }

  function say(text, cfg) {
    cfg = cfg || {};
    return new Promise((resolve) => {
      if (!voiceOn || !window.speechSynthesis) {
        const t = setTimeout(resolve, fallbackMs(text));
        current = { cancel: () => { clearTimeout(t); resolve(); } };
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = cfg.pitch != null ? cfg.pitch : 1;
      u.rate = cfg.rate != null ? cfg.rate : 1;
      u.volume = 1;
      const v = pickVoice(cfg.voiceIdx || 0);
      if (v) u.voice = v;
      let done = false;
      const finish = () => { if (!done) { done = true; clearTimeout(guard); resolve(); } };
      // guard in case onend never fires (some browsers/headless)
      const guard = setTimeout(finish, fallbackMs(text) + 4000);
      u.onend = finish;
      u.onerror = finish;
      current = { cancel: () => { speechSynthesis.cancel(); finish(); } };
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    });
  }

  function stop() {
    if (current) current.cancel();
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  function toggle() {
    voiceOn = !voiceOn;
    if (!voiceOn) stop();
    return voiceOn;
  }

  function unlock() {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  }

  return { say, stop, toggle, unlock };
})();
