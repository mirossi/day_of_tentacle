// Cartoon drawing helpers + rooms + characters, in a wobbly bright style
// inspired by classic 90s LucasArts adventures.

const Art = (() => {
  const OUT = '#12081f'; // outline color

  function poly(ctx, pts, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke !== false) { ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke(); }
  }

  function ellipse(ctx, x, y, rx, ry, fill, stroke) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke !== false) { ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke(); }
  }

  function line(ctx, x1, y1, x2, y2, w, color) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color || OUT;
    ctx.lineWidth = w || 3;
    ctx.stroke();
  }

  // ---- perspective checkered floor with a vanishing feel ----
  function checkerFloor(ctx, y0, y1, c1, c2) {
    ctx.fillStyle = c1;
    ctx.fillRect(0, y0, 640, y1 - y0);
    const rows = 5, vx = 320;
    let y = y0;
    for (let r = 0; r < rows; r++) {
      const h0 = (y1 - y0) * (0.08 + r * 0.05);
      const yA = y, yB = Math.min(y1, y + h0);
      const cols = 10;
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 0) continue;
        const spreadA = 0.55 + (yA - y0) / (y1 - y0) * 0.45;
        const spreadB = 0.55 + (yB - y0) / (y1 - y0) * 0.45;
        const w = 640 / cols;
        const xa0 = vx + (c * w - vx) * spreadA, xa1 = vx + ((c + 1) * w - vx) * spreadA;
        const xb0 = vx + (c * w - vx) * spreadB, xb1 = vx + ((c + 1) * w - vx) * spreadB;
        ctx.beginPath();
        ctx.moveTo(xa0, yA); ctx.lineTo(xa1, yA);
        ctx.lineTo(xb1, yB); ctx.lineTo(xb0, yB);
        ctx.closePath();
        ctx.fillStyle = c2;
        ctx.fill();
      }
      y = yB;
      if (y >= y1) break;
    }
    line(ctx, 0, y0, 640, y0, 3);
  }

  function crookedDoor(ctx, x, y, w, h, color, dark, label) {
    poly(ctx, [[x, y + 6], [x + w, y], [x + w + 4, y + h], [x - 4, y + h]], dark);
    poly(ctx, [[x + 6, y + 12], [x + w - 6, y + 7], [x + w - 4, y + h - 4], [x + 2, y + h - 4]], color);
    ellipse(ctx, x + w - 16, y + h / 2 + 6, 4, 4, '#ffd700');
    if (label) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Trebuchet MS';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(x + w / 2, y - 8);
      ctx.rotate(-0.05);
      ctx.fillStyle = '#ffe28a';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }

  // =========================================================
  // CHARACTERS  (anchored at feet, height ~120 at scale 1)
  // =========================================================

  function drawNed(ctx, x, y, scale, dir, t, talking, walking) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir * scale, scale);
    const swing = walking ? Math.sin(t * 12) * 14 : 0;

    // legs (jeans)
    ctx.lineCap = 'round';
    line(ctx, -6, -52, -8 + swing * 0.6, -4, 11, '#2b5ccc');
    line(ctx, 6, -52, 8 - swing * 0.6, -4, 11, '#2b5ccc');
    // big red sneakers
    ellipse(ctx, -10 + swing * 0.6, -3, 14, 6, '#e33');
    ellipse(ctx, 12 - swing * 0.6, -3, 14, 6, '#e33');

    // torso (t-shirt)
    poly(ctx, [[-16, -92], [16, -92], [20, -50], [-20, -50]], '#f5f0e0');
    // arms
    const armSwing = walking ? Math.sin(t * 12 + Math.PI) * 10 : Math.sin(t * 2) * 2;
    line(ctx, -15, -86, -26 + armSwing * 0.4, -52, 8, '#f5f0e0');
    line(ctx, 15, -86, 26 - armSwing * 0.4, -52, 8, '#f5f0e0');
    ellipse(ctx, -27 + armSwing * 0.4, -50, 7, 7, '#f2c49b');
    ellipse(ctx, 27 - armSwing * 0.4, -50, 7, 7, '#f2c49b');

    // big head
    ellipse(ctx, 0, -114, 23, 25, '#f2c49b');
    // hair
    poly(ctx, [[-23, -120], [-18, -138], [-8, -130], [0, -142], [8, -130], [18, -138], [23, -120], [10, -128], [-10, -128]], '#8a4b1f');
    // nose (big cartoon nose)
    ellipse(ctx, 12, -110, 7, 5, '#eab389');
    // eyes
    ellipse(ctx, 2, -120, 4.5, 5.5, '#fff');
    ellipse(ctx, 13, -120, 4.5, 5.5, '#fff');
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.arc(3.5, -119, 2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(14.5, -119, 2, 0, 7); ctx.fill();
    // mouth
    if (talking && Math.floor(t * 9) % 2 === 0) {
      ellipse(ctx, 7, -99, 6, 5, '#7a2020');
    } else {
      line(ctx, 1, -99, 14, -100, 3);
    }
    ctx.restore();
  }

  function drawProfessor(ctx, x, y, scale, t, talking) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-scale, scale); // faces left toward the room
    ctx.lineCap = 'round';

    // legs
    line(ctx, -5, -50, -7, -4, 10, '#555');
    line(ctx, 5, -50, 7, -4, 10, '#555');
    ellipse(ctx, -9, -3, 12, 5, '#222');
    ellipse(ctx, 9, -3, 12, 5, '#222');

    // lab coat
    poly(ctx, [[-20, -92], [20, -92], [26, -44], [-26, -44]], '#f2f2ef');
    line(ctx, 0, -90, 0, -46, 2);
    // arms
    const wave = Math.sin(t * 3) * 4;
    line(ctx, -18, -86, -30, -60 + wave, 8, '#f2f2ef');
    line(ctx, 18, -86, 32, -70 - wave, 8, '#f2f2ef');
    ellipse(ctx, -31, -58 + wave, 6, 6, '#e8b48e');
    ellipse(ctx, 33, -70 - wave, 6, 6, '#e8b48e');

    // head
    ellipse(ctx, 0, -112, 21, 23, '#e8b48e');
    // crazy gray hair
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.15 - i * 0.14;
      line(ctx, Math.cos(a) * 18, -118 + Math.sin(a) * 18, Math.cos(a) * 34, -118 + Math.sin(a) * 34, 5, '#cfcfcf');
    }
    // goggles on forehead
    ellipse(ctx, -7, -128, 7, 6, '#7fd4e0');
    ellipse(ctx, 8, -128, 7, 6, '#7fd4e0');
    // big nose
    ellipse(ctx, 14, -108, 8, 6, '#dba57e');
    // eyes
    ellipse(ctx, 1, -116, 4, 5, '#fff');
    ellipse(ctx, 12, -116, 4, 5, '#fff');
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.arc(2, -115, 1.8, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(13, -115, 1.8, 0, 7); ctx.fill();
    // mustache + mouth
    if (talking && Math.floor(t * 9) % 2 === 0) {
      ellipse(ctx, 8, -96, 6, 5, '#6b2020');
    }
    line(ctx, -2, -100, 18, -101, 4, '#bdbdbd');
    ctx.restore();
  }

  function drawPlant(ctx, x, y, scale, t, talking, flags) {
    ctx.save();
    ctx.translate(x, y);
    const s = flags.plantShrunk ? scale * 0.18 : scale;
    ctx.scale(s, s);
    const sway = Math.sin(t * 1.6) * 8 + (flags.plantHiccups ? Math.sin(t * 14) * 5 : 0);
    const bend = flags.plantDrinking ? 60 : 0;

    // pot
    poly(ctx, [[-45, 0], [45, 0], [34, -34], [-34, -34]], '#a04dc9');
    poly(ctx, [[-40, -34], [40, -34], [40, -46], [-40, -46]], '#7a2f9e');

    // stalk (fat wiggly tentacle-ish stem)
    ctx.beginPath();
    ctx.moveTo(-16, -44);
    ctx.bezierCurveTo(-20, -110, 20 + sway - bend, -140, sway - bend * 1.4, -190);
    ctx.bezierCurveTo(sway * 1.2 - bend * 1.6, -215, 30 + sway - bend, -220, 26 + sway - bend * 1.5, -200 + bend * 0.5);
    ctx.bezierCurveTo(40 + sway, -140, 24, -100, 16, -44);
    ctx.closePath();
    ctx.fillStyle = '#3fae4a';
    ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.stroke();

    // leaves
    ellipse(ctx, -34, -90, 22, 9, '#2f8f3a');
    ellipse(ctx, 36, -120, 22, 9, '#2f8f3a');
    ellipse(ctx, -30, -150 + sway * 0.4, 20, 8, '#2f8f3a');

    // head
    const hx = sway - bend * 1.2, hy = -205 + bend * 1.5;
    ellipse(ctx, hx, hy, 42, 34, '#4cc957');
    // jagged petals around head
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      poly(ctx, [
        [hx + Math.cos(a) * 38, hy + Math.sin(a) * 31],
        [hx + Math.cos(a + 0.25) * 56, hy + Math.sin(a + 0.25) * 46],
        [hx + Math.cos(a + 0.5) * 38, hy + Math.sin(a + 0.5) * 31]
      ], '#e64ca8');
    }
    ellipse(ctx, hx, hy, 42, 34, '#4cc957');
    // eyes (angry)
    ellipse(ctx, hx - 14, hy - 8, 8, 9, '#fff');
    ellipse(ctx, hx + 14, hy - 8, 8, 9, '#fff');
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.arc(hx - 12, hy - 6, 3.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 16, hy - 6, 3.5, 0, 7); ctx.fill();
    line(ctx, hx - 24, hy - 20, hx - 6, hy - 14, 4);
    line(ctx, hx + 24, hy - 20, hx + 6, hy - 14, 4);
    // mouth with teeth
    const open = (talking && Math.floor(t * 9) % 2 === 0) || flags.plantDrinking;
    if (open) {
      ellipse(ctx, hx, hy + 14, 20, 13, '#7a1030');
      poly(ctx, [[hx - 16, hy + 6], [hx - 10, hy + 14], [hx - 4, hy + 6]], '#fff');
      poly(ctx, [[hx + 2, hy + 6], [hx + 8, hy + 14], [hx + 14, hy + 6]], '#fff');
    } else {
      line(ctx, hx - 16, hy + 14, hx + 16, hy + 12, 4);
    }
    ctx.restore();
  }

  // =========================================================
  // ROOMS
  // =========================================================

  function drawLab(ctx, t, flags) {
    // wall
    ctx.fillStyle = '#5b2a8c';
    ctx.fillRect(0, 0, 640, 285);
    // wonky wall panels
    ctx.strokeStyle = '#4a1f75'; ctx.lineWidth = 5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(60 + i * 130, 0);
      ctx.lineTo(75 + i * 130 + Math.sin(i * 3) * 18, 285);
      ctx.stroke();
    }
    // ceiling shadow
    poly(ctx, [[0, 0], [640, 0], [640, 26], [0, 40]], '#3d1a63');

    // window with moon
    poly(ctx, [[452, 40], [520, 34], [524, 100], [456, 106]], '#1a0b3e');
    ellipse(ctx, 498, 62, 14, 14, '#fff3b0');
    ctx.strokeStyle = OUT; ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 0, 0);
    poly(ctx, [[452, 40], [520, 34], [524, 100], [456, 106]], null);

    // floor
    checkerFloor(ctx, 285, 400, '#8a5cb8', '#6b3fa0');

    // kitchen door (left, green)
    crookedDoor(ctx, 42, 120, 72, 165, '#3fae4a', '#237a2e', 'KITCHEN');
    // garden door (right, red)
    crookedDoor(ctx, 538, 115, 74, 170, flags.gardenUnlocked ? '#e8703a' : '#c9412f', '#8a2418', 'GARDEN');
    if (!flags.gardenUnlocked) {
      // padlock
      ellipse(ctx, 560, 200, 8, 10, '#ffd700');
      poly(ctx, [[554, 194], [554, 186], [566, 186], [566, 194]], null);
    }

    // workbench
    poly(ctx, [[148, 222], [292, 216], [300, 284], [140, 290]], '#b5722f');
    poly(ctx, [[148, 222], [292, 216], [292, 228], [148, 234]], '#d98f45');
    line(ctx, 158, 288, 162, 340, 8, '#8a5420');
    line(ctx, 282, 282, 286, 336, 8, '#8a5420');
    // beakers on bench
    ellipse(ctx, 180, 214, 9, 12, '#7fd4e0');
    ellipse(ctx, 202, 212, 7, 9, '#e64ca8');
    // bubbling animation
    ellipse(ctx, 180, 198 - (Math.sin(t * 4) * 4 + 4), 3, 3, '#b6f0f8');

    // crank on the bench
    if (!flags.crankTaken) {
      line(ctx, 240, 216, 258, 206, 6, '#888');
      line(ctx, 258, 206, 268, 212, 6, '#888');
      ellipse(ctx, 240, 216, 5, 5, '#666');
    }

    // shrink ray on tripod
    if (!flags.rayTaken) {
      line(ctx, 330, 285, 312, 220, 5);
      line(ctx, 330, 285, 348, 220, 5);
      line(ctx, 330, 292, 330, 218, 5);
      poly(ctx, [[302, 200], [362, 194], [366, 222], [306, 228]], '#e8703a');
      poly(ctx, [[362, 198], [382, 202], [382, 214], [362, 218]], '#ffd700');
      ellipse(ctx, 316, 210, 5, 5, flags.rayPowered ? '#7CFC00' : '#555');
      if (flags.rayPowered) ellipse(ctx, 316, 210, 2, 2, '#fff');
    }

    // cuckoo clock
    poly(ctx, [[382, 88], [434, 82], [438, 168], [386, 174]], '#8a5420');
    poly(ctx, [[382, 88], [408, 62], [434, 82]], '#6b3f18');
    ellipse(ctx, 410, 116, 18, 18, '#f5f0e0');
    line(ctx, 410, 116, 410, 104, 3);
    line(ctx, 410, 116, 419, 118, 3);
    // little door
    poly(ctx, [[400, 138], [422, 136], [423, 156], [401, 158]], flags.cuckooOut ? '#3d2168' : '#6b3f18');
    if (flags.cuckooOut) {
      // cuckoo bird sticking out
      ellipse(ctx, 411, 147, 8, 7, '#ffd700');
      ellipse(ctx, 416, 144, 2, 2, OUT);
      poly(ctx, [[418, 147], [426, 149], [418, 151]], '#e8703a');
    }
    // pendulum
    const pa = Math.sin(t * 3) * 0.3;
    line(ctx, 410, 172, 410 + Math.sin(pa) * 26, 206, 3, '#c9a227');
    ellipse(ctx, 410 + Math.sin(pa) * 26, 208, 6, 6, '#ffd700');

    // key on floor after cuckoo spits it
    if (flags.cuckooOut && !flags.keyTaken) {
      line(ctx, 398, 330, 412, 326, 4, '#ffd700');
      ellipse(ctx, 396, 331, 4, 4, '#ffd700');
    }

    // poster gag
    poly(ctx, [[196, 78], [268, 70], [272, 140], [200, 148]], '#f5f0e0');
    ctx.fillStyle = '#c9412f';
    ctx.font = 'bold 12px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.save(); ctx.translate(234, 100); ctx.rotate(-0.06);
    ctx.fillText('SCIENCE', 0, 0);
    ctx.fillText('IS FUN*', 0, 16);
    ctx.font = '8px Trebuchet MS';
    ctx.fillStyle = '#555';
    ctx.fillText('*results may vary', 0, 32);
    ctx.restore();
  }

  function drawKitchen(ctx, t, flags) {
    // wall
    ctx.fillStyle = '#1f8a8a';
    ctx.fillRect(0, 0, 640, 285);
    // tiles
    ctx.strokeStyle = '#177070'; ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 90 - 20, 0);
      ctx.lineTo(i * 90 + Math.sin(i) * 14, 285);
      ctx.stroke();
    }
    for (let j = 1; j < 4; j++) line(ctx, 0, j * 72 + 8, 640, j * 72 - 8, 3, '#177070');
    poly(ctx, [[0, 0], [640, 0], [640, 24], [0, 36]], '#125e5e');

    // floor
    checkerFloor(ctx, 285, 400, '#e8d9a0', '#c9b06b');

    // fridge (big, wobbly)
    poly(ctx, [[58, 128], [162, 120], [170, 302], [52, 308]], '#dfe8ea');
    poly(ctx, [[58, 128], [162, 120], [163, 128], [59, 136]], '#b8c8cc');
    line(ctx, 62, 200, 166, 194, 4);
    line(ctx, 150, 160, 150, 184, 5, '#9aa8ac');
    line(ctx, 152, 230, 152, 268, 5, '#9aa8ac');
    // magnet
    ellipse(ctx, 95, 240, 7, 7, '#e64ca8');

    // broom leaning next to fridge
    if (!flags.broomTaken) {
      line(ctx, 186, 300, 206, 170, 5, '#b5722f');
      poly(ctx, [[174, 322], [200, 316], [206, 296], [182, 300]], '#e8c95e');
      for (let i = 0; i < 5; i++) line(ctx, 178 + i * 6, 320 - i, 180 + i * 6, 300 - i, 2, '#c9a227');
    }

    // shelf top-right
    poly(ctx, [[418, 128], [582, 118], [584, 132], [420, 142]], '#8a5420');
    line(ctx, 430, 140, 424, 170, 5, '#6b3f18');
    line(ctx, 572, 130, 578, 160, 5, '#6b3f18');
    // stuff on shelf: cans
    poly(ctx, [[530, 96], [552, 94], [553, 122], [531, 124]], '#c9412f');
    poly(ctx, [[556, 92], [576, 90], [577, 120], [557, 122]], '#3fae4a');

    // radio (on shelf or fallen on floor)
    if (!flags.radioFell) {
      poly(ctx, [[438, 94], [508, 88], [512, 126], [442, 132]], '#c9412f');
      ellipse(ctx, 460, 110, 10, 10, '#ffd700');
      poly(ctx, [[480, 100], [502, 98], [503, 118], [481, 120]], '#7a2418');
      line(ctx, 500, 90, 512, 68, 3);
      // music notes if radio intact
      ctx.fillStyle = '#12081f';
      ctx.font = 'bold 16px Trebuchet MS';
      ctx.fillText('♪', 520 + Math.sin(t * 2) * 4, 76 - (t * 20 % 30));
    } else {
      // smashed radio on floor
      poly(ctx, [[440, 352], [512, 346], [520, 376], [436, 380]], '#c9412f');
      line(ctx, 452, 350, 472, 374, 3);
      line(ctx, 488, 348, 480, 376, 3);
      ellipse(ctx, 460, 364, 8, 8, '#ffd700');
      if (!flags.batteryTaken && flags.radioOpen) {
        poly(ctx, [[526, 362], [548, 360], [549, 374], [527, 376]], '#3a3a3a');
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 9px Trebuchet MS';
        ctx.textAlign = 'center';
        ctx.fillText('AA', 537, 371);
      }
    }

    // table with hot sauce
    poly(ctx, [[262, 244], [398, 238], [408, 288], [252, 294]], '#b5722f');
    line(ctx, 270, 292, 274, 344, 8, '#8a5420');
    line(ctx, 392, 286, 396, 340, 8, '#8a5420');
    if (!flags.sauceTaken) {
      poly(ctx, [[318, 214], [334, 213], [336, 242], [316, 243]], '#e33');
      poly(ctx, [[322, 206], [330, 205], [331, 214], [323, 215]], '#8a2418');
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 7px Trebuchet MS';
      ctx.textAlign = 'center';
      ctx.save(); ctx.translate(326, 231); ctx.rotate(-0.04);
      ctx.fillText('XXX', 0, 0);
      ctx.restore();
    }

    // door back to lab (right)
    crookedDoor(ctx, 542, 118, 72, 168, '#a04dc9', '#6b2f8a', 'LAB');
  }

  function drawGarden(ctx, t, flags) {
    // night sky
    const g = ctx.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, '#0d0524');
    g.addColorStop(1, '#3d1a63');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 640, 300);
    // stars
    ctx.fillStyle = '#fff';
    const stars = [[80, 40], [150, 90], [240, 30], [330, 70], [420, 40], [500, 90], [590, 50], [560, 140], [200, 130], [50, 120]];
    for (const [sx, sy] of stars) {
      const tw = 0.5 + Math.abs(Math.sin(t * 2 + sx)) * 0.5;
      ctx.globalAlpha = tw;
      ctx.fillRect(sx, sy, 3, 3);
    }
    ctx.globalAlpha = 1;
    // big moon
    ellipse(ctx, 520, 70, 38, 38, '#fff3b0');
    ellipse(ctx, 508, 62, 6, 6, '#e8dc90', false);
    ellipse(ctx, 532, 82, 9, 9, '#e8dc90', false);

    // crooked fence
    for (let i = 0; i < 11; i++) {
      const fx = 20 + i * 60, lean = Math.sin(i * 2.7) * 8;
      poly(ctx, [[fx, 300], [fx + lean, 218 + Math.sin(i) * 12], [fx + lean + 16, 216 + Math.sin(i) * 12], [fx + 16, 300]], '#8a5420');
    }
    line(ctx, 0, 250, 640, 240, 8, '#6b3f18');

    // grass
    ctx.fillStyle = '#2f6b30';
    ctx.fillRect(0, 296, 640, 104);
    line(ctx, 0, 296, 640, 296, 3);
    // tufts
    for (let i = 0; i < 14; i++) {
      const gx = 30 + i * 47, gy = 310 + (i % 4) * 20;
      line(ctx, gx, gy, gx - 4, gy - 12, 2, '#3fae4a');
      line(ctx, gx, gy, gx + 2, gy - 14, 2, '#3fae4a');
      line(ctx, gx, gy, gx + 6, gy - 10, 2, '#3fae4a');
    }

    // house wall (left) with lab door
    poly(ctx, [[0, 60], [130, 84], [130, 340], [0, 356]], '#5b2a8c');
    poly(ctx, [[0, 60], [130, 84], [130, 96], [0, 74]], '#3d1a63');
    crookedDoor(ctx, 30, 150, 70, 168, '#c9412f', '#8a2418', 'LAB');

    // food bowl
    poly(ctx, [[272, 372], [340, 372], [330, 352], [282, 352]], '#7fd4e0');
    if (flags.sauceInBowl) {
      ellipse(ctx, 306, 354, 22, 5, '#c9210f');
    } else {
      ellipse(ctx, 306, 354, 22, 5, '#6b4f2f');
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.fillText('SNAPPY', 306, 368);

    // sad little flowers
    for (const [fx, fy] of [[170, 350], [560, 360], [610, 330]]) {
      line(ctx, fx, fy, fx + 2, fy - 18, 3, '#3fae4a');
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ellipse(ctx, fx + 2 + Math.cos(a) * 6, fy - 20 + Math.sin(a) * 6, 4, 4, '#e8c95e', false);
      }
      ellipse(ctx, fx + 2, fy - 20, 3.5, 3.5, '#e8703a', false);
    }
  }

  // ---- inventory icons (40x40) ----
  const ICONS = {
    broom(c) {
      line(c, 8, 34, 30, 6, 3, '#b5722f');
      poly(c, [[4, 38], [16, 34], [12, 26], [2, 30]], '#e8c95e');
    },
    hotsauce(c) {
      poly(c, [[14, 12], [26, 12], [28, 36], [12, 36]], '#e33');
      poly(c, [[17, 5], [23, 5], [24, 12], [16, 12]], '#8a2418');
      c.fillStyle = '#fff'; c.font = 'bold 7px Trebuchet MS'; c.textAlign = 'center';
      c.fillText('XXX', 20, 28);
    },
    crank(c) {
      line(c, 10, 30, 22, 14, 5, '#888');
      line(c, 22, 14, 32, 20, 5, '#888');
      ellipse(c, 10, 30, 4, 4, '#666');
    },
    battery(c) {
      poly(c, [[10, 14], [30, 14], [30, 28], [10, 28]], '#3a3a3a');
      poly(c, [[30, 18], [34, 18], [34, 24], [30, 24]], '#999');
      c.fillStyle = '#ffd700'; c.font = 'bold 9px Trebuchet MS'; c.textAlign = 'center';
      c.fillText('AA', 20, 24);
    },
    key(c) {
      ellipse(c, 12, 16, 6, 6, '#ffd700');
      line(c, 16, 20, 30, 32, 4, '#ffd700');
      line(c, 26, 30, 30, 26, 3, '#ffd700');
    },
    ray(c) {
      poly(c, [[6, 16], [26, 12], [28, 26], [8, 30]], '#e8703a');
      poly(c, [[26, 15], [36, 17], [36, 23], [26, 24]], '#ffd700');
      ellipse(c, 12, 21, 3, 3, '#7CFC00');
    }
  };

  function drawIcon(canvas, id) {
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, 40, 40);
    if (ICONS[id]) ICONS[id](c);
  }

  return { drawLab, drawKitchen, drawGarden, drawNed, drawProfessor, drawPlant, drawIcon };
})();
