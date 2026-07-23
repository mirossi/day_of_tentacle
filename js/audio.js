const AudioEngine = (() => {
  let ctx = null, musicGain = null, sfxGain = null;
  let musicOn = true;
  let schedTimer = null, currentSong = null, step = 0, nextTime = 0;
  let noiseBuf = null;

  const _ = null;
  const SONGS = {
    // 32 eighth-note steps per loop, midi note numbers
    lab: {
      tempo: 138,
      bass: [38,_,38,_,45,_,38,_, 41,_,41,_,48,_,45,_, 38,_,38,_,45,_,38,_, 36,_,36,_,43,_,45,_],
      lead: [62,_,65,_,69,67,_,65, _,62,_,60,_,62,65,_, 62,_,65,_,69,_,72,_, 70,_,67,_,65,_,62,_],
      hat:  [1,0,1,0,1,0,1,1, 1,0,1,0,1,0,1,0, 1,0,1,0,1,0,1,1, 1,0,1,0,1,1,1,0]
    },
    kitchen: {
      tempo: 126,
      bass: [43,_,43,_,50,_,43,_, 48,_,48,_,43,_,40,_, 43,_,43,_,50,_,43,_, 45,_,47,_,48,_,50,_],
      lead: [67,_,71,_,74,_,71,_, 72,71,_,67,_,64,_,_, 67,_,71,_,74,_,79,_, 78,_,74,_,71,_,67,_],
      hat:  [1,0,0,1,1,0,0,1, 1,0,0,1,1,0,1,0, 1,0,0,1,1,0,0,1, 1,0,1,0,1,0,1,1]
    },
    garden: {
      tempo: 108,
      bass: [33,_,_,33,_,_,40,_, 36,_,_,36,_,_,43,_, 33,_,_,33,_,_,40,_, 31,_,_,31,_,38,_,40],
      lead: [57,_,_,60,_,_,64,_, 63,_,_,60,_,_,57,_, 57,_,_,60,_,_,64,_, 66,_,_,64,_,63,_,60],
      hat:  [1,0,0,1,0,0,1,0, 1,0,0,1,0,0,1,0, 1,0,0,1,0,0,1,0, 1,0,1,0,1,0,1,1]
    },
    victory: {
      tempo: 140,
      bass: [36,_,43,_,48,_,43,_, 41,_,48,_,53,_,48,_, 36,_,43,_,48,_,43,_, 43,_,43,_,48,_,_,_],
      lead: [72,_,76,_,79,_,84,_, 77,_,81,_,84,_,89,_, 72,76,79,84,_,79,84,_, 86,_,84,_,84,_,_,_],
      hat:  [1,0,1,0,1,0,1,0, 1,0,1,0,1,0,1,0, 1,1,1,1,0,1,1,0, 1,0,1,0,1,0,0,0]
    }
  };

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.3;
    sfxGain.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function tone(freq, t, dur, type, dest, vol) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur);
    return o;
  }

  function noise(t, dur, dest, vol, hp) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp || 4000;
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t); src.stop(t + dur);
  }

  function scheduleStep(song, i, t) {
    const b = song.bass[i], l = song.lead[i];
    if (b !== null) tone(mtof(b), t, 0.22, 'triangle', musicGain, 0.9);
    if (l !== null) tone(mtof(l), t, 0.16, 'square', musicGain, 0.35);
    if (song.hat[i]) noise(t, 0.04, musicGain, 0.25, 6000);
  }

  function playMusic(name) {
    if (!ctx) return;
    stopMusic();
    currentSong = SONGS[name];
    if (!currentSong || !musicOn) return;
    step = 0;
    nextTime = ctx.currentTime + 0.1;
    schedTimer = setInterval(() => {
      const stepDur = 60 / currentSong.tempo / 2;
      while (nextTime < ctx.currentTime + 0.15) {
        scheduleStep(currentSong, step, nextTime);
        nextTime += stepDur;
        step = (step + 1) % 32;
      }
    }, 30);
  }

  function stopMusic() {
    if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
    currentSong = null;
  }

  let lastMusicName = null;
  function setRoomMusic(name) {
    lastMusicName = name;
    playMusic(name);
  }

  function toggleMusic() {
    musicOn = !musicOn;
    if (!musicOn) stopMusic();
    else if (lastMusicName) playMusic(lastMusicName);
    return musicOn;
  }

  const SFX = {
    pickup(t) { tone(660, t, 0.08, 'square', sfxGain, 0.5); tone(990, t + 0.08, 0.12, 'square', sfxGain, 0.5); },
    nope(t) { tone(120, t, 0.12, 'square', sfxGain, 0.5); tone(100, t + 0.14, 0.18, 'square', sfxGain, 0.5); },
    doorOpen(t) {
      const o = tone(300, t, 0.35, 'sawtooth', sfxGain, 0.3);
      o.frequency.exponentialRampToValueAtTime(140, t + 0.35);
    },
    doorClose(t) { noise(t, 0.12, sfxGain, 0.6, 300); tone(80, t, 0.15, 'sine', sfxGain, 0.8); },
    crash(t) {
      noise(t, 0.4, sfxGain, 0.9, 1500);
      tone(70, t, 0.3, 'sine', sfxGain, 0.9);
      tone(523, t + 0.05, 0.1, 'square', sfxGain, 0.3);
      tone(392, t + 0.15, 0.1, 'square', sfxGain, 0.3);
    },
    cuckoo(t) { tone(784, t, 0.18, 'triangle', sfxGain, 0.6); tone(622, t + 0.22, 0.25, 'triangle', sfxGain, 0.6); },
    boing(t) {
      const o = tone(200, t, 0.4, 'sine', sfxGain, 0.7);
      o.frequency.setValueAtTime(200, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.4);
    },
    zap(t) {
      const o = tone(1400, t, 0.5, 'sawtooth', sfxGain, 0.5);
      o.frequency.exponentialRampToValueAtTime(80, t + 0.5);
      noise(t, 0.4, sfxGain, 0.35, 3000);
    },
    glug(t) {
      tone(400, t, 0.1, 'sine', sfxGain, 0.6);
      tone(330, t + 0.15, 0.1, 'sine', sfxGain, 0.6);
      tone(260, t + 0.3, 0.12, 'sine', sfxGain, 0.6);
    },
    hiccup(t) {
      const o = tone(200, t, 0.12, 'sine', sfxGain, 0.7);
      o.frequency.exponentialRampToValueAtTime(650, t + 0.12);
    },
    growl(t) {
      const o = tone(90, t, 0.6, 'sawtooth', sfxGain, 0.5);
      o.frequency.setValueAtTime(90, t);
      o.frequency.linearRampToValueAtTime(60, t + 0.3);
      o.frequency.linearRampToValueAtTime(110, t + 0.6);
    },
    wind(t) {
      for (let i = 0; i < 6; i++) tone(500 + i * 60, t + i * 0.07, 0.06, 'square', sfxGain, 0.3);
    },
    shrink(t) {
      for (let i = 0; i < 10; i++) tone(300 + i * 180, t + i * 0.06, 0.06, 'square', sfxGain, 0.4);
    }
  };

  function sfx(name) {
    if (!ctx || !SFX[name]) return;
    SFX[name](ctx.currentTime + 0.02);
  }

  return { init, sfx, setRoomMusic, toggleMusic, stopMusic };
})();
