// SCUMM-style point & click engine

const W = 640, H = 400;

const state = { room: null, flags: {}, inv: [] };
const player = { x: 320, y: 345, dir: 1, walking: false, target: null, walkResolve: null };

let canvas, ctx;
let selectedVerb = 'walk';
let selectedItem = null;   // item id when using/giving an inventory item
let hoverName = '';
let busy = false;          // a script is running
let gameStarted = false;
let talk = null;           // {actorId, text, color, getPos}
let startTime = 0;

const VERBS = [
  ['give', 'Give'], ['open', 'Open'], ['close', 'Close'],
  ['pickup', 'Pick up'], ['look', 'Look at'], ['talkto', 'Talk to'],
  ['use', 'Use'], ['push', 'Push'], ['pull', 'Pull']
];
const VERB_LABEL = Object.fromEntries(VERBS);
VERB_LABEL.walk = 'Walk to';

const DEFAULT_LINES = {
  give: "I don't think they'd want that.",
  open: "It doesn't open.",
  close: "It's not the closing type.",
  pickup: "I don't need that. Probably. Maybe. No.",
  look: "It's... a thing. A very thingy thing.",
  talkto: "I talk to inanimate objects enough already.",
  use: "I can't use that.",
  push: "It won't budge.",
  pull: "Pulling that would accomplish exactly nothing.",
  walk: ""
};

const ACTOR_VOICES = {
  ned: { pitch: 1.05, rate: 1.05, voiceIdx: 0, color: '#ffffff' },
  prof: { pitch: 0.6, rate: 0.92, voiceIdx: 1, color: '#7fd4e0' },
  plant: { pitch: 0.25, rate: 0.85, voiceIdx: 2, color: '#8aff8a' },
  plantSmall: { pitch: 1.9, rate: 1.35, voiceIdx: 2, color: '#8aff8a' },
  narrator: { pitch: 1.0, rate: 1.0, voiceIdx: 3, color: '#ffe28a' }
};

// ---------------------------------------------------------
// script API (used by gamedata.js)
// ---------------------------------------------------------

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function playSfx(name) { AudioEngine.sfx(name); }

function flag(name) { return !!state.flags[name]; }
function setFlag(name, v) { state.flags[name] = v === undefined ? true : v; }

function hasItem(id) { return state.inv.includes(id); }
function addItem(id) {
  if (!hasItem(id)) state.inv.push(id);
  AudioEngine.sfx('pickup');
  renderInventory();
}
function removeItem(id) {
  state.inv = state.inv.filter(i => i !== id);
  if (selectedItem === id) selectedItem = null;
  renderInventory();
}

function currentRoom() { return ROOMS[state.room]; }

function actorTalkPos(actorId) {
  if (actorId === 'ned') {
    const s = playerScale();
    return [player.x, player.y - 150 * s];
  }
  if (actorId === 'narrator') return [320, 40];
  const room = currentRoom();
  const a = room.actors && room.actors[actorId];
  if (a) return [a.x, a.y - (a.textH || 130)];
  return [320, 60];
}

function say(actorId, text) {
  const v = ACTOR_VOICES[actorId] || ACTOR_VOICES.narrator;
  talk = { actorId: actorId === 'plantSmall' ? 'plant' : actorId, text, color: v.color };
  return Speech.say(text, v).then(() => { talk = null; });
}

function playerScale() {
  const yy = Math.max(285, Math.min(400, player.y));
  return 0.62 + ((yy - 285) / 115) * 0.38;
}

function walkTo(x, y) {
  const room = currentRoom();
  const f = room.floor;
  x = Math.max(f.minX, Math.min(f.maxX, x));
  y = Math.max(f.minY, Math.min(f.maxY, y));
  if (Math.abs(x - player.x) < 4 && Math.abs(y - player.y) < 4) return Promise.resolve();
  return new Promise(res => {
    if (player.walkResolve) player.walkResolve();
    player.target = { x, y };
    player.dir = x >= player.x ? 1 : -1;
    player.walking = true;
    player.walkResolve = res;
  });
}

function face(dir) { player.dir = dir; }

function goRoom(id, entryName) {
  Speech.stop();
  talk = null;
  const room = ROOMS[id];
  const entry = (room.entry && room.entry[entryName]) || room.entry.default;
  state.room = id;
  player.x = entry[0];
  player.y = entry[1];
  player.dir = entry[2] || 1;
  player.target = null;
  player.walking = false;
  hoverName = '';
  updateSentence();
  AudioEngine.setRoomMusic(room.music);
  if (room.onEnter) return room.onEnter();
}

function choose(options) {
  return new Promise(res => {
    const panel = document.getElementById('dialog-panel');
    panel.innerHTML = '';
    options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'dialog-option';
      b.textContent = '▶ ' + opt;
      b.onclick = () => {
        panel.classList.add('hidden');
        document.getElementById('panel').classList.remove('hidden');
        res(i);
      };
      panel.appendChild(b);
    });
    document.getElementById('panel').classList.add('hidden');
    panel.classList.remove('hidden');
  });
}

function endGame(text) {
  AudioEngine.setRoomMusic('victory');
  document.getElementById('ending-text').textContent = text;
  document.getElementById('ending-overlay').classList.remove('hidden');
}

// ---------------------------------------------------------
// interaction
// ---------------------------------------------------------

function visibleHotspots() {
  return currentRoom().hotspots.filter(h => !h.visible || h.visible());
}

function hotspotAt(x, y) {
  // earlier-listed hotspots take priority when rects overlap
  for (const h of visibleHotspots()) {
    const [rx, ry, rw, rh] = h.rect;
    if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) return h;
  }
  return null;
}

function sentenceText() {
  let s = VERB_LABEL[selectedVerb];
  if (selectedItem) {
    const item = ITEMS[selectedItem];
    s += ' ' + item.name + (selectedVerb === 'give' ? ' to' : ' with');
  }
  if (hoverName) s += ' ' + hoverName;
  return s;
}

function updateSentence() {
  document.getElementById('sentence-line').textContent = sentenceText();
}

function resetVerb() {
  selectedVerb = 'walk';
  selectedItem = null;
  renderVerbs();
  renderInventory();
  updateSentence();
}

async function interact(hs, verb, itemId) {
  busy = true;
  try {
    if (hs.walkPos) {
      await walkTo(hs.walkPos[0], hs.walkPos[1]);
      if (hs.faceDir) face(hs.faceDir);
      else face(hs.rect[0] + hs.rect[2] / 2 >= player.x ? 1 : -1);
    }
    let handler = null;
    if (itemId) {
      const table = verb === 'give' ? hs.give : hs.useItem;
      if (table && table[itemId]) handler = table[itemId];
    } else if (hs.verbs && hs.verbs[verb]) {
      handler = hs.verbs[verb];
    }
    if (handler) {
      await handler();
    } else if (verb !== 'walk') {
      if (itemId) {
        AudioEngine.sfx('nope');
        await say('ned', pickRandom([
          "That doesn't work. Trust me, I'm nearly a scientist.",
          "Nope. Physics says no.",
          "I don't see how that would help."
        ]));
      } else {
        await say('ned', hs.defaults && hs.defaults[verb] ? hs.defaults[verb] : DEFAULT_LINES[verb]);
      }
    }
  } finally {
    busy = false;
    resetVerb();
  }
}

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function useItemAlone(itemId, verb) {
  const item = ITEMS[itemId];
  busy = true;
  try {
    if (verb === 'look') {
      await say('ned', item.look || "It's my " + item.name + '.');
    } else {
      await say('ned', "I should use that ON something.");
    }
  } finally {
    busy = false;
    resetVerb();
  }
}

// ---------------------------------------------------------
// UI
// ---------------------------------------------------------

function renderVerbs() {
  const div = document.getElementById('verbs');
  div.innerHTML = '';
  for (const [id, label] of VERBS) {
    const b = document.createElement('button');
    b.textContent = label;
    if (id === selectedVerb) b.classList.add('selected');
    b.onclick = () => {
      if (busy) return;
      selectedVerb = id;
      selectedItem = null;
      renderVerbs();
      renderInventory();
      updateSentence();
    };
    div.appendChild(b);
  }
}

function renderInventory() {
  const div = document.getElementById('inventory');
  div.innerHTML = '';
  for (const id of state.inv) {
    const item = ITEMS[id];
    const cell = document.createElement('div');
    cell.className = 'inv-item';
    cell.title = item.name;
    if (id === selectedItem) cell.classList.add('selected');
    const c = document.createElement('canvas');
    c.width = 40; c.height = 40;
    Art.drawIcon(c, item.icon || id);
    cell.appendChild(c);
    cell.onclick = () => {
      if (busy) return;
      if (selectedVerb === 'use' || selectedVerb === 'give') {
        selectedItem = id;
        renderInventory();
        updateSentence();
      } else if (selectedVerb === 'look') {
        useItemAlone(id, 'look');
      } else {
        selectedVerb = 'use';
        selectedItem = id;
        renderVerbs();
        renderInventory();
        updateSentence();
      }
    };
    div.appendChild(cell);
  }
}

function canvasCoords(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
}

function onCanvasMove(e) {
  const [x, y] = canvasCoords(e);
  const hs = hotspotAt(x, y);
  hoverName = hs ? hs.name : '';
  updateSentence();
}

function onCanvasClick(e) {
  if (!gameStarted || busy) return;
  const [x, y] = canvasCoords(e);
  const hs = hotspotAt(x, y);
  if (hs) {
    interact(hs, selectedVerb, selectedItem);
  } else {
    if (selectedVerb === 'walk') {
      walkTo(x, y);
    } else {
      resetVerb();
      walkTo(x, y);
    }
  }
}

// ---------------------------------------------------------
// render loop
// ---------------------------------------------------------

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) { lines.push(cur.trim()); cur = w; }
    else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

function drawTalkText() {
  if (!talk) return;
  const [tx, ty] = actorTalkPos(talk.actorId);
  const lines = wrapText(talk.text, 38);
  ctx.font = 'bold 15px Trebuchet MS';
  ctx.textAlign = 'center';
  const x = Math.max(120, Math.min(520, tx));
  let y = Math.max(20 + lines.length * 18, ty - (lines.length - 1) * 18);
  y = Math.min(y, 380);
  for (const ln of lines) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#12081f';
    ctx.strokeText(ln, x, y);
    ctx.fillStyle = talk.color;
    ctx.fillText(ln, x, y);
    y += 18;
  }
}

function updatePlayer(dt) {
  if (!player.target) return;
  const speed = 170 * dt;
  const dx = player.target.x - player.x;
  const dy = player.target.y - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= speed) {
    player.x = player.target.x;
    player.y = player.target.y;
    player.target = null;
    player.walking = false;
    if (player.walkResolve) { const r = player.walkResolve; player.walkResolve = null; r(); }
  } else {
    player.x += (dx / dist) * speed;
    player.y += (dy / dist) * speed;
  }
}

let lastFrame = 0;
function frame(ts) {
  const t = (ts - startTime) / 1000;
  const dt = Math.min(0.05, (ts - lastFrame) / 1000);
  lastFrame = ts;

  if (gameStarted && state.room) {
    updatePlayer(dt);
    const room = currentRoom();
    room.draw(ctx, t, state.flags);

    // gather drawables sorted by feet-y
    const drawables = [];
    if (room.actors) {
      for (const [id, a] of Object.entries(room.actors)) {
        if (a.visible && !a.visible()) continue;
        drawables.push({ y: a.y, fn: () => a.draw(ctx, t, talk && talk.actorId === id, state.flags) });
      }
    }
    if (!room.hidePlayer || !room.hidePlayer()) {
      drawables.push({
        y: player.y,
        fn: () => Art.drawNed(ctx, player.x, player.y, playerScale(), player.dir, t, talk && talk.actorId === 'ned', player.walking)
      });
    }
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.fn();

    drawTalkText();
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------
// boot
// ---------------------------------------------------------

window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('screen');
  ctx = canvas.getContext('2d');
  canvas.addEventListener('mousemove', onCanvasMove);
  canvas.addEventListener('click', onCanvasClick);

  renderVerbs();
  renderInventory();
  updateSentence();

  document.getElementById('mute-music').onclick = (e) => {
    e.target.textContent = 'MUSIC: ' + (AudioEngine.toggleMusic() ? 'ON' : 'OFF');
  };
  document.getElementById('mute-voice').onclick = (e) => {
    e.target.textContent = 'VOICE: ' + (Speech.toggle() ? 'ON' : 'OFF');
  };

  document.getElementById('start-btn').onclick = async () => {
    AudioEngine.init();
    Speech.unlock();
    document.getElementById('title-overlay').classList.add('hidden');
    gameStarted = true;
    goRoom('lab', 'default');
    busy = true;
    try { await INTRO(); } finally { busy = false; resetVerb(); }
  };

  document.getElementById('restart-btn').onclick = () => location.reload();

  startTime = performance.now();
  lastFrame = startTime;
  requestAnimationFrame(frame);
});
