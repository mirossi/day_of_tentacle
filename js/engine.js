// SCUMM-style point & click engine — SVG renderer

const W = 640, H = 400;

const state = { room: null, flags: {}, inv: [] };
const player = { x: 320, y: 345, dir: 1, walking: false, target: null, walkResolve: null };

let screen, roomLayer, actorLayer, fxLayer, defsLayer;
let actorEls = {};          // id -> { wrap, mouthO, mouthC }
let selectedVerb = 'walk';
let selectedItem = null;
let hoverName = '';
let busy = false;
let gameStarted = false;
let talk = null;
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

// maps talk actor id -> rendered actor element id
const ACTOR_EL = { ned: 'ned', prof: 'prof', plant: 'plant', plantSmall: 'plant' };

// ---------------------------------------------------------
// script API (used by gamedata.js)
// ---------------------------------------------------------

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function playSfx(name) { AudioEngine.sfx(name); }
function flag(name) { return !!state.flags[name]; }
function setFlag(name, v) { state.flags[name] = v === undefined ? true : v; renderRoom(); }

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
  talk = { actorId, text, color: v.color };
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
  renderRoom();
  buildActors();
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
// SVG rendering
// ---------------------------------------------------------

function renderRoom() {
  if (!state.room || !roomLayer) return;
  roomLayer.innerHTML = SVGART.rooms[state.room](state.flags);
}

function buildActors() {
  const room = currentRoom();
  let html = '';
  // room actors first (behind), player Ned drawn last (front)
  if (room.actors) {
    for (const id of Object.keys(room.actors)) {
      if (id === 'prof') html += SVGART.chars.professor();
      else if (id === 'plant') html += SVGART.chars.snappy(state.flags);
    }
  }
  if (!room.hidePlayer || !room.hidePlayer()) html += SVGART.chars.ned();
  actorLayer.innerHTML = html;

  actorEls = {};
  const grab = (elid, actor) => {
    const wrap = document.getElementById(elid);
    if (!wrap) return;
    actorEls[actor] = {
      wrap,
      mouthO: document.getElementById(elid + (actor === 'ned' ? 'MouthO' : actor === 'prof' ? '' : 'MouthO')),
    };
  };
  const ned = document.getElementById('ned');
  if (ned) actorEls.ned = { wrap: ned, mo: document.getElementById('nedMouthO'), mc: document.getElementById('nedMouthC') };
  const prof = document.getElementById('professor');
  if (prof) actorEls.prof = { wrap: prof, mo: document.getElementById('profMouthO'), mc: document.getElementById('profMouthC') };
  const plant = document.getElementById('snappy');
  if (plant) actorEls.plant = { wrap: plant, mo: document.getElementById('snappyMouthO'), mc: document.getElementById('snappyMouthC') };
}

function positionActors(t) {
  // Ned
  const ned = actorEls.ned;
  if (ned && ned.wrap) {
    const s = playerScale();
    const bob = player.walking ? -Math.abs(Math.sin(t * 10)) * 2.5 : 0;
    ned.wrap.setAttribute('transform', `translate(${player.x.toFixed(1)},${(player.y + bob).toFixed(1)}) scale(${(player.dir * s).toFixed(3)},${s.toFixed(3)})`);
  }
  // Professor (faces left as drawn)
  const prof = actorEls.prof;
  if (prof && prof.wrap) {
    const a = currentRoom().actors.prof;
    prof.wrap.setAttribute('transform', `translate(${a.x},${a.y}) scale(0.95,0.95)`);
  }
  // Snappy
  const plant = actorEls.plant;
  if (plant && plant.wrap) {
    const a = currentRoom().actors.plant;
    const sc = flag('plantShrunk') ? 0.18 : 1;
    let jx = 0, jy = 0;
    if (flag('plantHiccups')) { jx = Math.sin(t * 40) * 1.6; jy = Math.cos(t * 33) * 1.2; }
    plant.wrap.setAttribute('transform', `translate(${(a.x + jx).toFixed(1)},${(a.y + jy).toFixed(1)}) scale(${sc},${sc})`);
  }
  // mouth flap
  const talkId = talk ? ACTOR_EL[talk.actorId] : null;
  for (const id of ['ned', 'prof', 'plant']) {
    const e = actorEls[id];
    if (!e || !e.mo) continue;
    const speaking = (talkId === id) && (Math.floor(t * 9) % 2 === 0);
    e.mo.style.display = speaking ? 'none' : '';
    if (e.mc) e.mc.style.display = speaking ? '' : 'none';
  }
}

function escapeXml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

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

function renderTalk() {
  if (!talk) { if (fxLayer.childNodes.length) fxLayer.innerHTML = ''; return; }
  const [tx, ty] = actorTalkPos(talk.actorId);
  const lines = wrapText(talk.text, 34);
  const x = Math.max(120, Math.min(520, tx));
  let y = Math.max(20 + lines.length * 18, ty - (lines.length - 1) * 18);
  y = Math.min(y, 384);
  let out = '';
  for (const ln of lines) {
    out += `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" text-anchor="middle" font-family="Trebuchet MS, Verdana, sans-serif" font-size="15" font-weight="bold" paint-order="stroke" stroke="#12081f" stroke-width="4" stroke-linejoin="round" fill="${talk.color}">${escapeXml(ln)}</text>`;
    y += 18;
  }
  fxLayer.innerHTML = out;
}

// ---------------------------------------------------------
// interaction
// ---------------------------------------------------------

function visibleHotspots() {
  return currentRoom().hotspots.filter(h => !h.visible || h.visible());
}

function hotspotAt(x, y) {
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

const ICON_SVG = {
  broom: '<path d="M9,33 L30,7" stroke="#a06a2c" stroke-width="4" stroke-linecap="round"/><path d="M4,38 L17,34 L13,25 L2,29 Z" fill="#e8c95e" stroke="#8a5a28" stroke-width="1.4"/>',
  hotsauce: '<path d="M14,12 L26,12 L28,36 L12,36 Z" fill="#e8402f" stroke="#8a2418" stroke-width="1.6"/><path d="M14,12 L17,12 L15,36 L12,36 Z" fill="#ff7a5e"/><path d="M17,5 L23,5 L24,12 L16,12 Z" fill="#8a2418"/><rect x="14" y="20" width="12" height="11" fill="#f4ecd4"/><text x="20" y="29" font-family="Verdana" font-size="7" font-weight="bold" text-anchor="middle" fill="#c9210f">XXX</text>',
  crank: '<line x1="10" y1="30" x2="22" y2="14" stroke="#9aa2ac" stroke-width="5" stroke-linecap="round"/><line x1="22" y1="14" x2="32" y2="20" stroke="#9aa2ac" stroke-width="5" stroke-linecap="round"/><circle cx="10" cy="30" r="4.5" fill="#666"/>',
  battery: '<rect x="8" y="13" width="22" height="16" fill="#3a3a44" stroke="#12101a" stroke-width="1.4"/><rect x="30" y="17" width="5" height="8" fill="#9aa2ac"/><text x="19" y="25" font-family="Verdana" font-size="9" font-weight="bold" text-anchor="middle" fill="#ffd700">AA</text>',
  key: '<circle cx="12" cy="15" r="6.5" fill="#ffd700" stroke="#8a6a00" stroke-width="1.4"/><circle cx="12" cy="15" r="2.5" fill="#8a6a00"/><line x1="17" y1="19" x2="31" y2="33" stroke="#ffd700" stroke-width="4.5" stroke-linecap="round"/><line x1="27" y1="31" x2="31" y2="27" stroke="#ffd700" stroke-width="3.5"/>',
  ray: '<path d="M6,14 L26,10 L28,25 L8,29 Z" fill="#e8703a" stroke="#8a3c14" stroke-width="1.6"/><path d="M26,13 L36,15 L36,22 L26,23 Z" fill="#ffd700" stroke="#8a6a00" stroke-width="1.4"/><circle cx="12" cy="20" r="3" fill="#7CFC00"/>'
};

function renderInventory() {
  const div = document.getElementById('inventory');
  div.innerHTML = '';
  for (const id of state.inv) {
    const item = ITEMS[id];
    const cell = document.createElement('div');
    cell.className = 'inv-item';
    cell.title = item.name;
    if (id === selectedItem) cell.classList.add('selected');
    cell.innerHTML = `<svg viewBox="0 0 40 40" width="40" height="40">${ICON_SVG[item.icon || id] || ''}</svg>`;
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

function svgCoords(e) {
  const r = screen.getBoundingClientRect();
  const cx = (e.touches ? e.touches[0].clientX : e.clientX);
  const cy = (e.touches ? e.touches[0].clientY : e.clientY);
  return [(cx - r.left) * (W / r.width), (cy - r.top) * (H / r.height)];
}

function onSvgMove(e) {
  if (!gameStarted) return;
  const [x, y] = svgCoords(e);
  const hs = hotspotAt(x, y);
  hoverName = hs ? hs.name : '';
  updateSentence();
}

function onSvgClick(e) {
  if (!gameStarted || busy) return;
  const [x, y] = svgCoords(e);
  const hs = hotspotAt(x, y);
  if (hs) {
    interact(hs, selectedVerb, selectedItem);
  } else {
    if (selectedVerb !== 'walk') resetVerb();
    walkTo(x, y);
  }
}

// ---------------------------------------------------------
// render loop
// ---------------------------------------------------------

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
    positionActors(t);
    renderTalk();
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------
// boot
// ---------------------------------------------------------

window.addEventListener('DOMContentLoaded', () => {
  screen = document.getElementById('screen');
  // inject shared defs once
  defsLayer = document.getElementById('shared-defs');
  if (defsLayer) defsLayer.innerHTML = SVGART.SHARED_DEFS;
  roomLayer = document.getElementById('room-layer');
  actorLayer = document.getElementById('actor-layer');
  fxLayer = document.getElementById('fx-layer');

  screen.addEventListener('mousemove', onSvgMove);
  screen.addEventListener('click', onSvgClick);

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
