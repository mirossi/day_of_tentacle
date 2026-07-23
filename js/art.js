// Elaborate cartoon rendering: rooms + characters in a chunky, wobbly,
// ink-outlined comic style inspired by classic 90s LucasArts adventures.
// Cel shading, gradients, glows and ambient animation — all procedural.

const Art = (() => {
  const OUT = '#12081f'; // outline ink color

  // ---------------------------------------------------------
  // primitives
  // ---------------------------------------------------------

  function ink(ctx, w) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = w || 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  function poly(ctx, pts, fill, stroke, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke !== false) { ink(ctx, lw); ctx.stroke(); }
  }

  // smooth organic closed shape through midpoints
  function blob(ctx, pts, fill, stroke, lw) {
    const n = pts.length;
    ctx.beginPath();
    ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke !== false) { ink(ctx, lw); ctx.stroke(); }
  }

  function ellipse(ctx, x, y, rx, ry, fill, stroke, lw) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke !== false) { ink(ctx, lw); ctx.stroke(); }
  }

  function line(ctx, x1, y1, x2, y2, w, color) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color || OUT;
    ctx.lineWidth = w || 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function curve(ctx, x1, y1, cx, cy, x2, y2, w, color) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.strokeStyle = color || OUT;
    ctx.lineWidth = w || 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // flat cel-shade overlay (no outline)
  function shade(ctx, pts, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 0.25 : alpha;
    poly(ctx, pts, color, false);
    ctx.restore();
  }

  function shadeE(ctx, x, y, rx, ry, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 0.25 : alpha;
    ellipse(ctx, x, y, rx, ry, color, false);
    ctx.restore();
  }

  function vgrad(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  }

  // soft radial glow; rgb = "r,g,b"
  function glow(ctx, x, y, r, rgb, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function softShadow(ctx, x, y, rx, ry, alpha) {
    shadeE(ctx, x, y, rx, ry, '#080314', alpha === undefined ? 0.28 : alpha);
  }

  function vignette(ctx) {
    const g = ctx.createRadialGradient(320, 185, 170, 320, 200, 470);
    g.addColorStop(0, 'rgba(8,3,20,0)');
    g.addColorStop(1, 'rgba(8,3,20,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 640, 400);
  }

  function sparkle(ctx, x, y, r, color) {
    line(ctx, x - r, y, x + r, y, 2, color);
    line(ctx, x, y - r, x, y + r, 2, color);
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
    // depth: darker toward the back wall
    ctx.fillStyle = vgrad(ctx, 0, y0, 0, y1, [[0, 'rgba(10,4,24,0.35)'], [0.55, 'rgba(10,4,24,0)']]);
    ctx.fillRect(0, y0, 640, y1 - y0);
    line(ctx, 0, y0, 640, y0, 3);
  }

  function crookedDoor(ctx, x, y, w, h, color, dark, label) {
    // frame
    poly(ctx, [[x - 7, y + 2], [x + w + 7, y - 5], [x + w + 11, y + h], [x - 11, y + h]], dark);
    shade(ctx, [[x - 7, y + 2], [x + w + 7, y - 5], [x + w + 8, y + 6], [x - 6, y + 13]], '#000', 0.3);
    // door
    poly(ctx, [[x, y + 8], [x + w, y + 2], [x + w + 3, y + h - 3], [x - 3, y + h - 3]], color);
    // panels
    const px = x + 10, pw = w - 22;
    poly(ctx, [[px, y + 22], [px + pw, y + 17], [px + pw, y + h * 0.42], [px, y + h * 0.45]], null, true, 2);
    poly(ctx, [[px, y + h * 0.55], [px + pw, y + h * 0.52], [px + pw, y + h - 16], [px, y + h - 14]], null, true, 2);
    // cel shading: light from top-left
    shade(ctx, [[x, y + 8], [x + 8, y + 7], [x + 5, y + h - 3], [x - 3, y + h - 3]], '#fff', 0.14);
    shade(ctx, [[x + w - 9, y + 3], [x + w, y + 2], [x + w + 3, y + h - 3], [x + w - 6, y + h - 3]], '#000', 0.22);
    // handle
    ellipse(ctx, x + w - 16, y + h / 2 + 6, 4.5, 4.5, '#ffd700');
    ellipse(ctx, x + w - 17.5, y + h / 2 + 4.5, 1.5, 1.5, '#fff8d0', false);
    if (label) {
      ctx.save();
      ctx.translate(x + w / 2, y - 12);
      ctx.rotate(-0.05);
      poly(ctx, [[-34, -10], [34, -12], [36, 6], [-36, 8]], '#3d2168', true, 2);
      ctx.fillStyle = '#ffe28a';
      ctx.font = 'bold 11px Trebuchet MS';
      ctx.textAlign = 'center';
      ctx.fillText(label, 0, 2);
      ctx.restore();
    }
  }

  function hangingLamp(ctx, x, coneW, t) {
    const sway = Math.sin(t * 0.9) * 2;
    line(ctx, x, 0, x + sway, 34, 3, '#241145');
    // light cone on the room
    ctx.fillStyle = 'rgba(255,238,170,0.06)';
    ctx.beginPath();
    ctx.moveTo(x + sway - 16, 52);
    ctx.lineTo(x + sway + 16, 52);
    ctx.lineTo(x + coneW, 285);
    ctx.lineTo(x - coneW, 285);
    ctx.closePath();
    ctx.fill();
    // shade
    poly(ctx, [[x + sway - 20, 52], [x + sway + 20, 52], [x + sway + 10, 34], [x + sway - 10, 34]], '#2d8f4b');
    shade(ctx, [[x + sway - 20, 52], [x + sway - 8, 52], [x + sway - 4, 34], [x + sway - 10, 34]], '#fff', 0.18);
    glow(ctx, x + sway, 58, 26, '255,238,170', 0.5);
    ellipse(ctx, x + sway, 55, 7, 6, '#fff3b0');
  }

  function cobweb(ctx, cx, cy, r) {
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * 0.5 + i * 0.32;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const a = Math.PI * 0.5 + i * 0.32;
        const x = cx - Math.cos(a) * r * (k / 3.4), y = cy + Math.sin(a) * r * (k / 3.4);
        if (i === 0) ctx.moveTo(x, y); else ctx.quadraticCurveTo(cx - Math.cos(a - 0.16) * r * (k / 3.9), cy + Math.sin(a - 0.16) * r * (k / 3.9), x, y);
      }
      ctx.stroke();
    }
  }

  // =========================================================
  // CHARACTERS  (anchored at feet, height ~150 at scale 1)
  // =========================================================

  function drawNed(ctx, x, y, scale, dir, t, talking, walking) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir * scale, scale);
    ctx.lineCap = 'round';
    const swing = walking ? Math.sin(t * 12) * 14 : 0;
    const bob = walking ? -Math.abs(Math.sin(t * 12)) * 3 : Math.sin(t * 2.2) * 1.4;
    const blink = ((t + 0.7) % 4.3) > 4.15;

    softShadow(ctx, 2, 2, 30, 7);

    // legs (jeans)
    line(ctx, -6, -54 + bob, -8 + swing * 0.6, -6, 12, '#3566d4');
    line(ctx, 6, -54 + bob, 8 - swing * 0.6, -6, 12, '#3566d4');
    line(ctx, -6, -54 + bob, -7 + swing * 0.3, -30 + bob * 0.5, 12, '#274ba0'); // back-leg shade
    // cuffs
    line(ctx, -10 + swing * 0.6, -12, -5 + swing * 0.6, -12, 5, '#274ba0');
    line(ctx, 5 - swing * 0.6, -12, 10 - swing * 0.6, -12, 5, '#274ba0');
    // big red sneakers
    blob(ctx, [[-22 + swing * 0.6, -2], [-14 + swing * 0.6, -12], [-2 + swing * 0.6, -10], [4 + swing * 0.6, -2]], '#e8402f');
    blob(ctx, [[0 - swing * 0.6, -2], [8 - swing * 0.6, -12], [20 - swing * 0.6, -10], [26 - swing * 0.6, -2]], '#e8402f');
    ellipse(ctx, -4 + swing * 0.6, -4, 5, 4, '#f7f1de', true, 2);
    ellipse(ctx, 22 - swing * 0.6, -4, 5, 4, '#f7f1de', true, 2);
    line(ctx, -20 + swing * 0.6, 0, 2 + swing * 0.6, 0, 3, '#fff');
    line(ctx, 2 - swing * 0.6, 0, 24 - swing * 0.6, 0, 3, '#fff');

    // torso (t-shirt + vest)
    blob(ctx, [[-17, -96 + bob], [17, -96 + bob], [21, -52 + bob], [-21, -52 + bob]], '#f7f1de');
    shade(ctx, [[8, -95 + bob], [17, -96 + bob], [21, -52 + bob], [10, -52 + bob]], '#b8a87e', 0.4);
    // lightning bolt print
    poly(ctx, [[-4, -84 + bob], [4, -84 + bob], [-1, -74 + bob], [3, -74 + bob], [-5, -62 + bob], [-2, -72 + bob], [-6, -72 + bob]], '#ffd700', true, 2);
    // open green vest
    poly(ctx, [[-17, -96 + bob], [-9, -94 + bob], [-13, -52 + bob], [-21, -54 + bob]], '#3fae4a');
    poly(ctx, [[17, -96 + bob], [9, -94 + bob], [13, -52 + bob], [21, -54 + bob]], '#2c8036');

    // arms
    const armSwing = walking ? Math.sin(t * 12 + Math.PI) * 10 : Math.sin(t * 2) * 2;
    line(ctx, -15, -88 + bob, -26 + armSwing * 0.4, -54 + bob, 9, '#f7f1de');
    line(ctx, 15, -88 + bob, 26 - armSwing * 0.4, -54 + bob, 9, '#e5dcbf');
    ellipse(ctx, -27 + armSwing * 0.4, -52 + bob, 7, 7, '#f2c49b');
    ellipse(ctx, 27 - armSwing * 0.4, -52 + bob, 7, 7, '#f2c49b');

    // neck + big head
    line(ctx, 0, -98 + bob, 0, -104 + bob, 10, '#f2c49b');
    blob(ctx, [[-23, -104 + bob], [-25, -122 + bob], [-14, -140 + bob], [10, -142 + bob], [24, -126 + bob], [22, -106 + bob], [4, -96 + bob]], '#f2c49b');
    shadeE(ctx, -14, -108 + bob, 9, 11, '#da9a68', 0.28); // jaw shade
    // ear
    ellipse(ctx, -18, -114 + bob, 5, 7, '#f2c49b', true, 2.5);
    ellipse(ctx, -18, -114 + bob, 2, 3, '#da9a68', false);
    // hair: messy spikes with a highlight streak
    blob(ctx, [[-26, -122 + bob], [-20, -146 + bob], [-8, -136 + bob], [-2, -152 + bob], [8, -138 + bob], [18, -148 + bob], [25, -126 + bob], [12, -134 + bob], [-12, -132 + bob]], '#8a4b1f');
    shade(ctx, [[-18, -140 + bob], [-4, -148 + bob], [2, -140 + bob], [-12, -134 + bob]], '#c17b3a', 0.55);
    // nose (big cartoon nose)
    ellipse(ctx, 15, -114 + bob, 8, 6, '#eab389');
    shadeE(ctx, 13, -116 + bob, 3, 2, '#fff', 0.35);
    // eyes
    if (blink) {
      line(ctx, -2, -122 + bob, 7, -122 + bob, 2.5);
      line(ctx, 10, -122 + bob, 19, -122 + bob, 2.5);
    } else {
      ellipse(ctx, 2, -122 + bob, 5, 6, '#fff', true, 2.5);
      ellipse(ctx, 14, -122 + bob, 5, 6, '#fff', true, 2.5);
      ctx.fillStyle = OUT;
      ctx.beginPath(); ctx.arc(3.5, -121 + bob, 2.2, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(15.5, -121 + bob, 2.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(4.3, -122 + bob, 0.8, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(16.3, -122 + bob, 0.8, 0, 7); ctx.fill();
    }
    // eyebrows
    curve(ctx, -3, -131 + bob, 2, -134 + bob, 7, -131 + bob, 3, '#6b3714');
    curve(ctx, 9, -131 + bob, 14, -134 + bob, 19, -131 + bob, 3, '#6b3714');
    // freckles
    ctx.fillStyle = '#d59a6b';
    ctx.beginPath(); ctx.arc(-8, -110 + bob, 1, 0, 7); ctx.arc(-4, -108 + bob, 1, 0, 7); ctx.arc(-10, -106 + bob, 1, 0, 7); ctx.fill();
    // mouth
    if (talking && Math.floor(t * 9) % 2 === 0) {
      ellipse(ctx, 8, -101 + bob, 7, 6, '#7a2020');
      poly(ctx, [[2, -105 + bob], [14, -105 + bob], [13, -102 + bob], [3, -102 + bob]], '#fff', false);
      ellipse(ctx, 8, -98 + bob, 4, 2.5, '#c9584f', false);
    } else {
      curve(ctx, 1, -102 + bob, 8, -98 + bob, 15, -103 + bob, 3);
    }
    ctx.restore();
  }

  function drawProfessor(ctx, x, y, scale, t, talking) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-scale, scale); // faces left toward the room
    ctx.lineCap = 'round';
    const bob = Math.sin(t * 1.8) * 1.2;
    const blink = ((t + 1.9) % 5.1) > 4.95;

    softShadow(ctx, 2, 2, 30, 7);

    // legs
    line(ctx, -5, -52, -7, -6, 10, '#4a4a55');
    line(ctx, 5, -52, 7, -6, 10, '#3a3a44');
    blob(ctx, [[-19, -2], [-13, -10], [-2, -8], [2, -2]], '#222');
    blob(ctx, [[-1, -2], [5, -10], [16, -8], [20, -2]], '#222');

    // lab coat with tails
    blob(ctx, [[-21, -94 + bob], [21, -94 + bob], [27, -40 + bob], [10, -46 + bob], [0, -40 + bob], [-10, -46 + bob], [-27, -40 + bob]], '#f4f4ee');
    shade(ctx, [[10, -93 + bob], [21, -94 + bob], [27, -40 + bob], [13, -44 + bob]], '#b9b9ac', 0.45);
    // sweater under the coat
    poly(ctx, [[-8, -92 + bob], [8, -92 + bob], [10, -62 + bob], [-10, -62 + bob]], '#7a3fa0');
    // coat opening
    line(ctx, -9, -90 + bob, -11, -46 + bob, 2.5);
    line(ctx, 9, -90 + bob, 11, -46 + bob, 2.5);
    // buttons + chest pocket with pen
    ctx.fillStyle = '#c9c9ba';
    ctx.beginPath(); ctx.arc(-13, -78 + bob, 2, 0, 7); ctx.arc(-13, -66 + bob, 2, 0, 7); ctx.fill();
    poly(ctx, [[13, -80 + bob], [22, -80 + bob], [22, -68 + bob], [13, -68 + bob]], '#e6e6da', true, 2);
    line(ctx, 17, -86 + bob, 17, -78 + bob, 3, '#e64ca8');
    // bowtie
    poly(ctx, [[-7, -90 + bob], [0, -86 + bob], [-7, -82 + bob]], '#e64ca8', true, 2);
    poly(ctx, [[7, -90 + bob], [0, -86 + bob], [7, -82 + bob]], '#c92f88', true, 2);

    // arms
    const wave = Math.sin(t * 3) * 4;
    line(ctx, -18, -88 + bob, -30, -60 + wave, 8, '#f4f4ee');
    line(ctx, 18, -88 + bob, 32, -72 - wave, 8, '#dcdccc');
    ellipse(ctx, -31, -58 + wave, 6, 6, '#e8b48e');
    ellipse(ctx, 33, -72 - wave, 6, 6, '#e8b48e');

    // head
    blob(ctx, [[-21, -102 + bob], [-23, -122 + bob], [-8, -136 + bob], [12, -134 + bob], [22, -118 + bob], [20, -102 + bob], [0, -94 + bob]], '#e8b48e');
    shadeE(ctx, -12, -104 + bob, 8, 9, '#c98f66', 0.28);
    // crazy gray hair
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI * 0.1 - i * 0.14;
      const wig = Math.sin(t * 2 + i) * 2;
      curve(ctx, Math.cos(a) * 17, -120 + bob + Math.sin(a) * 17,
        Math.cos(a) * 28, -122 + bob + Math.sin(a) * 28 + wig,
        Math.cos(a) * 36, -118 + bob + Math.sin(a) * 36 + wig, 5, i % 2 ? '#cfcfcf' : '#e4e4e4');
    }
    // shiny bald crown
    shadeE(ctx, -2, -128 + bob, 8, 5, '#fff', 0.4);
    // goggles on forehead
    ellipse(ctx, -7, -128 + bob, 7.5, 6.5, '#7fd4e0');
    ellipse(ctx, 8, -128 + bob, 7.5, 6.5, '#7fd4e0');
    line(ctx, 0, -128 + bob, 1, -128 + bob, 3);
    shadeE(ctx, -9, -130 + bob, 2.5, 2, '#fff', 0.6);
    shadeE(ctx, 6, -130 + bob, 2.5, 2, '#fff', 0.6);
    // big nose
    ellipse(ctx, 15, -110 + bob, 8.5, 6.5, '#dba57e');
    shadeE(ctx, 13, -112 + bob, 3, 2, '#fff', 0.3);
    // eyes with heavy white brows
    if (blink) {
      line(ctx, -3, -118 + bob, 5, -118 + bob, 2.5);
      line(ctx, 9, -118 + bob, 17, -118 + bob, 2.5);
    } else {
      ellipse(ctx, 1, -118 + bob, 4.5, 5.5, '#fff', true, 2.5);
      ellipse(ctx, 13, -118 + bob, 4.5, 5.5, '#fff', true, 2.5);
      ctx.fillStyle = OUT;
      ctx.beginPath(); ctx.arc(2, -117 + bob, 2, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(14, -117 + bob, 2, 0, 7); ctx.fill();
    }
    curve(ctx, -5, -126 + bob, 1, -130 + bob, 7, -126 + bob, 4, '#e8e8e8');
    curve(ctx, 8, -126 + bob, 14, -130 + bob, 20, -126 + bob, 4, '#e8e8e8');
    // mouth under a walrus mustache
    if (talking && Math.floor(t * 9) % 2 === 0) {
      ellipse(ctx, 8, -96 + bob, 6, 5, '#6b2020');
    }
    blob(ctx, [[-4, -103 + bob], [8, -106 + bob], [20, -103 + bob], [16, -97 + bob], [8, -99 + bob], [0, -97 + bob]], '#d4d4d4');
    ctx.restore();
  }

  function drawPlant(ctx, x, y, scale, t, talking, flags) {
    ctx.save();
    ctx.translate(x, y);
    const s = flags.plantShrunk ? scale * 0.18 : scale;
    ctx.scale(s, s);
    const sway = Math.sin(t * 1.6) * 8 + (flags.plantHiccups ? Math.sin(t * 14) * 5 : 0);
    const bend = flags.plantDrinking ? 60 : 0;

    softShadow(ctx, 0, 4, 58, 12);

    // pot
    poly(ctx, [[-45, 0], [45, 0], [34, -34], [-34, -34]], '#a04dc9');
    shade(ctx, [[20, 0], [45, 0], [34, -34], [16, -34]], '#000', 0.25);
    shade(ctx, [[-45, 0], [-32, 0], [-24, -34], [-34, -34]], '#fff', 0.15);
    poly(ctx, [[-40, -34], [40, -34], [40, -48], [-40, -48]], '#7a2f9e');
    shade(ctx, [[-40, -48], [40, -48], [40, -44], [-40, -44]], '#fff', 0.18);
    // crack + skull doodle
    line(ctx, -18, -2, -12, -18, 2, '#5c2378');
    line(ctx, -12, -18, -17, -26, 2, '#5c2378');
    ellipse(ctx, 8, -18, 6, 5, '#e8d9f5', true, 2);
    ctx.fillStyle = '#5c2378';
    ctx.beginPath(); ctx.arc(6, -19, 1.5, 0, 7); ctx.arc(10.5, -19, 1.5, 0, 7); ctx.fill();
    // soil
    ellipse(ctx, 0, -46, 34, 6, '#4a2c14', true, 2);

    // stalk (fat wiggly tentacle-ish stem)
    ctx.beginPath();
    ctx.moveTo(-16, -46);
    ctx.bezierCurveTo(-20, -110, 20 + sway - bend, -140, sway - bend * 1.4, -190);
    ctx.bezierCurveTo(sway * 1.2 - bend * 1.6, -215, 30 + sway - bend, -220, 26 + sway - bend * 1.5, -200 + bend * 0.5);
    ctx.bezierCurveTo(40 + sway, -140, 24, -100, 16, -46);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, -20, 0, 40, 0, [[0, '#57d465'], [0.55, '#3fae4a'], [1, '#2c8036']]);
    ctx.fill();
    ink(ctx, 4); ctx.stroke();
    // thorn bumps
    for (let i = 0; i < 4; i++) {
      const ty = -70 - i * 32;
      ellipse(ctx, 14 + Math.sin(i * 2) * 6 + sway * (i / 6), ty, 4, 4, '#2c8036', true, 2);
    }

    // leaves with veins
    for (const [lx, ly, lr, fl] of [[-34, -90, 24, 1], [36, -120, 24, -1], [-30, -150 + sway * 0.4, 21, 1]]) {
      blob(ctx, [[lx + 12 * fl, ly], [lx - lr * fl, ly - 9], [lx - (lr + 8) * fl, ly], [lx - lr * fl, ly + 9]], '#2f8f3a');
      line(ctx, lx + 8 * fl, ly, lx - lr * fl, ly, 2, '#1f6b2a');
    }

    // head
    const hx = sway - bend * 1.2, hy = -205 + bend * 1.5;
    // big petals around head (two-tone)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3 + Math.sin(t * 1.3) * 0.03;
      const flap = 1 + Math.sin(t * 2 + i) * 0.04;
      poly(ctx, [
        [hx + Math.cos(a - 0.06) * 36, hy + Math.sin(a - 0.06) * 29],
        [hx + Math.cos(a + 0.25) * 72 * flap, hy + Math.sin(a + 0.25) * 60 * flap],
        [hx + Math.cos(a + 0.56) * 36, hy + Math.sin(a + 0.56) * 29]
      ], i % 2 ? '#e64ca8' : '#f06bbb');
      poly(ctx, [
        [hx + Math.cos(a + 0.11) * 40, hy + Math.sin(a + 0.11) * 33],
        [hx + Math.cos(a + 0.25) * 62 * flap, hy + Math.sin(a + 0.25) * 51 * flap],
        [hx + Math.cos(a + 0.39) * 40, hy + Math.sin(a + 0.39) * 33]
      ], '#b02f7f', false);
    }
    ctx.beginPath();
    ctx.ellipse(hx, hy, 42, 34, 0, 0, Math.PI * 2);
    ctx.fillStyle = vgrad(ctx, hx, hy - 34, hx, hy + 34, [[0, '#5fdc6b'], [0.6, '#4cc957'], [1, '#379c42']]);
    ctx.fill();
    ink(ctx, 4); ctx.stroke();
    // spots
    shadeE(ctx, hx - 20, hy - 14, 5, 4, '#2c8036', 0.5);
    shadeE(ctx, hx + 24, hy + 4, 4, 3, '#2c8036', 0.5);
    shadeE(ctx, hx - 8, hy - 26, 3, 2.5, '#2c8036', 0.5);

    // angry eyes with slit pupils
    ellipse(ctx, hx - 14, hy - 8, 8, 9, '#fff');
    ellipse(ctx, hx + 14, hy - 8, 8, 9, '#fff');
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.ellipse(hx - 12, hy - 6, 2.2, 4, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + 16, hy - 6, 2.2, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(hx - 13, hy - 8, 1, 0, 7); ctx.arc(hx + 15, hy - 8, 1, 0, 7); ctx.fill();
    line(ctx, hx - 26, hy - 22, hx - 5, hy - 15, 5);
    line(ctx, hx + 26, hy - 22, hx + 5, hy - 15, 5);

    // mouth with teeth
    const open = (talking && Math.floor(t * 9) % 2 === 0) || flags.plantDrinking;
    if (open) {
      ellipse(ctx, hx, hy + 15, 22, 14, '#7a1030');
      ellipse(ctx, hx, hy + 24, 10, 5, '#c9584f', false); // tongue
      // teeth top + bottom
      for (const [tx, td] of [[-16, 1], [-5, 1], [6, 1], [-11, -1], [1, -1], [12, -1]]) {
        const ty = hy + (td > 0 ? 5 : 26);
        poly(ctx, [[hx + tx, ty], [hx + tx + 5, ty + td * 9], [hx + tx + 10, ty]], '#fff', true, 2);
      }
      if (flags.plantDrinking) {
        ellipse(ctx, hx + 18, hy + 26, 3, 4, '#c9210f', true, 2); // sauce drip
      }
    } else {
      curve(ctx, hx - 18, hy + 14, hx, hy + 20, hx + 18, hy + 12, 4);
      poly(ctx, [[hx - 10, hy + 16], [hx - 6, hy + 22], [hx - 2, hy + 16]], '#fff', true, 2); // one poking tooth
    }
    ctx.restore();
  }

  // =========================================================
  // ROOMS
  // =========================================================

  function drawLab(ctx, t, flags) {
    // wall with gradient + faint diamond wallpaper
    ctx.fillStyle = vgrad(ctx, 0, 0, 0, 285, [[0, '#6b34a0'], [1, '#48207a']]);
    ctx.fillRect(0, 0, 640, 285);
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 9; c++) {
        const dx = 40 + c * 72 + (r % 2) * 36, dy = 50 + r * 62;
        ctx.beginPath();
        ctx.moveTo(dx, dy - 9); ctx.lineTo(dx + 7, dy); ctx.lineTo(dx, dy + 9); ctx.lineTo(dx - 7, dy);
        ctx.closePath(); ctx.fill();
      }
    }
    // ceiling shadow + baseboard
    poly(ctx, [[0, 0], [640, 0], [640, 26], [0, 40]], '#3d1a63');
    poly(ctx, [[0, 272], [640, 266], [640, 285], [0, 285]], '#38175e', false);

    // window with moon + moonbeam
    poly(ctx, [[446, 34], [526, 28], [530, 106], [450, 112]], '#6b3f18');
    poly(ctx, [[452, 40], [520, 34], [524, 100], [456, 106]], '#141040');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(452, 40); ctx.lineTo(520, 34); ctx.lineTo(524, 100); ctx.lineTo(456, 106);
    ctx.closePath(); ctx.clip();
    ctx.fillStyle = vgrad(ctx, 0, 30, 0, 110, [[0, '#141040'], [1, '#312060']]);
    ctx.fillRect(446, 28, 90, 90);
    ctx.fillStyle = '#fff';
    for (const [sx, sy] of [[462, 52], [478, 88], [510, 46], [516, 78]]) {
      ctx.globalAlpha = 0.4 + Math.abs(Math.sin(t * 2 + sx)) * 0.6;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
    glow(ctx, 498, 62, 30, '255,243,176', 0.5);
    ellipse(ctx, 498, 62, 14, 14, '#fff3b0');
    shadeE(ctx, 494, 58, 3, 3, '#e8dc90', 0.8);
    ctx.restore();
    line(ctx, 452, 72, 524, 66, 2.5);
    line(ctx, 488, 36, 490, 104, 2.5);
    poly(ctx, [[452, 40], [520, 34], [524, 100], [456, 106]], null);
    // moonbeam
    ctx.fillStyle = 'rgba(210,220,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(456, 100); ctx.lineTo(522, 94); ctx.lineTo(600, 285); ctx.lineTo(430, 285);
    ctx.closePath(); ctx.fill();

    hangingLamp(ctx, 220, 150, t);

    // shelf with mad-science jars (top left)
    poly(ctx, [[46, 96], [166, 90], [168, 102], [48, 108]], '#8a5420');
    shade(ctx, [[46, 96], [166, 90], [167, 95], [47, 101]], '#fff', 0.15);
    // jar of green goo with eyeball
    poly(ctx, [[62, 62], [92, 60], [94, 94], [60, 96]], '#bfe8ee');
    shade(ctx, [[62, 62], [92, 60], [94, 76], [60, 78]], '#fff', 0.2);
    ellipse(ctx, 77, 84 + Math.sin(t * 2) * 2, 7, 7, '#7CFC00', true, 2);
    ellipse(ctx, 77, 84 + Math.sin(t * 2) * 2, 3, 3, OUT, false);
    poly(ctx, [[60, 62], [94, 60], [94, 56], [60, 58]], '#6b3f18');
    // jar of pink brain
    poly(ctx, [[104, 64], [136, 62], [138, 92], [102, 94]], '#bfe8ee');
    blob(ctx, [[110, 82], [114, 72], [122, 70], [130, 76], [128, 86], [116, 88]], '#f0a0c8', true, 2);
    curve(ctx, 114, 78, 120, 74, 126, 80, 2, '#c9709e');
    poly(ctx, [[102, 64], [138, 62], [138, 58], [102, 60]], '#6b3f18');
    // leaning books
    poly(ctx, [[146, 66], [158, 64], [162, 92], [150, 94]], '#c9412f', true, 2);
    poly(ctx, [[136, 70], [148, 66], [154, 92], [142, 95]], '#2d6fc9', true, 2);

    // floor
    checkerFloor(ctx, 285, 400, '#8a5cb8', '#6b3fa0');

    // kitchen door (left, green)
    crookedDoor(ctx, 42, 120, 72, 165, '#3fae4a', '#237a2e', 'KITCHEN');
    // garden door (right, red)
    crookedDoor(ctx, 538, 115, 74, 170, flags.gardenUnlocked ? '#e8703a' : '#c9412f', '#8a2418', 'GARDEN');
    if (!flags.gardenUnlocked) {
      // padlock
      poly(ctx, [[554, 194], [554, 184], [566, 184], [566, 194]], null, true, 3);
      blob(ctx, [[552, 194], [568, 194], [569, 208], [551, 208]], '#ffd700');
      shadeE(ctx, 556, 198, 2.5, 2.5, '#fff', 0.5);
      ctx.fillStyle = OUT;
      ctx.beginPath(); ctx.arc(560, 200, 2, 0, 7); ctx.fill();
    }

    // workbench
    poly(ctx, [[148, 222], [292, 216], [300, 284], [140, 290]], '#b5722f');
    shade(ctx, [[148, 240], [296, 234], [300, 284], [140, 290]], '#7c4c1c', 0.4);
    poly(ctx, [[148, 222], [292, 216], [292, 230], [148, 236]], '#d98f45');
    for (let i = 0; i < 4; i++) line(ctx, 160 + i * 34, 238 + i, 160 + i * 34 + 20, 270, 1.5, 'rgba(90,50,10,0.5)');
    line(ctx, 158, 288, 162, 340, 9, '#8a5420');
    line(ctx, 282, 282, 286, 336, 9, '#8a5420');
    softShadow(ctx, 222, 342, 90, 9, 0.2);
    // scattered paper
    poly(ctx, [[214, 222], [238, 219], [240, 231], [216, 234]], '#f5f0e0', true, 2);
    line(ctx, 219, 225, 233, 223, 1.5, '#9b8bb0');
    line(ctx, 220, 229, 234, 227, 1.5, '#9b8bb0');
    // beakers on bench: erlenmeyer + test tube with glowing liquid
    glow(ctx, 180, 210, 22, '127,240,150'.split(',').join(','), 0.25);
    poly(ctx, [[174, 196], [186, 196], [192, 224], [168, 224]], '#d8f2f6');
    poly(ctx, [[171, 212], [189, 212], [192, 224], [168, 224]], '#4ce87a', false);
    poly(ctx, [[174, 196], [186, 196], [192, 224], [168, 224]], null, true, 2.5);
    ellipse(ctx, 202, 206, 6, 13, '#d8f2f6', true, 2.5);
    ellipse(ctx, 202, 211, 5, 7, '#e64ca8', false);
    // rising bubbles
    for (let i = 0; i < 3; i++) {
      const by = 214 - ((t * 26 + i * 16) % 34);
      ellipse(ctx, 178 + i * 3, by, 2, 2, '#b6f0f8', false);
    }

    // crank on the bench
    if (!flags.crankTaken) {
      line(ctx, 240, 216, 258, 206, 6, '#9aa2ac');
      line(ctx, 258, 206, 268, 212, 6, '#9aa2ac');
      line(ctx, 241, 215, 257, 206, 2, '#d5dbe2');
      ellipse(ctx, 240, 216, 5, 5, '#666');
      ellipse(ctx, 240, 216, 2, 2, '#3a3a3a', false);
    }

    // shrink ray on tripod
    if (!flags.rayTaken) {
      if (flags.rayPowered) glow(ctx, 342, 210, 60, '124,252,0', 0.22);
      line(ctx, 330, 285, 312, 220, 5);
      line(ctx, 330, 285, 348, 220, 5);
      line(ctx, 330, 292, 330, 218, 5);
      softShadow(ctx, 330, 292, 30, 6, 0.2);
      // body with coil rings
      poly(ctx, [[302, 200], [362, 194], [366, 222], [306, 228]], '#e8703a');
      shade(ctx, [[302, 214], [366, 208], [366, 222], [306, 228]], '#a34518', 0.5);
      shade(ctx, [[302, 200], [362, 194], [363, 200], [303, 206]], '#fff', 0.25);
      for (let i = 0; i < 3; i++) line(ctx, 328 + i * 11, 196, 330 + i * 11, 226, 2.5, '#8a3c14');
      // emitter
      poly(ctx, [[362, 198], [384, 202], [384, 214], [362, 218]], '#ffd700');
      line(ctx, 384, 202, 384, 214, 3);
      // little antenna dish
      line(ctx, 330, 194, 328, 184, 2.5);
      ellipse(ctx, 328, 181, 6, 4, '#c9c9ba', true, 2);
      // power light
      ellipse(ctx, 316, 210, 5, 5, flags.rayPowered ? '#7CFC00' : '#555');
      if (flags.rayPowered) {
        ellipse(ctx, 316, 210, 2, 2, '#fff', false);
        // crackling arcs at the emitter
        ctx.strokeStyle = '#b6ff5e'; ctx.lineWidth = 2;
        for (let i = 0; i < 2; i++) {
          const j1 = Math.sin(t * 41 + i * 9) * 5, j2 = Math.cos(t * 37 + i * 5) * 5;
          ctx.beginPath();
          ctx.moveTo(384, 208);
          ctx.lineTo(392 + j1, 204 + j2);
          ctx.lineTo(399 + j2, 210 + j1);
          ctx.stroke();
        }
      }
    }

    // cuckoo clock
    poly(ctx, [[382, 88], [434, 82], [438, 168], [386, 174]], '#8a5420');
    shade(ctx, [[420, 84], [434, 82], [438, 168], [424, 170]], '#5e3812', 0.5);
    poly(ctx, [[378, 90], [408, 60], [438, 84]], '#6b3f18');
    line(ctx, 385, 86, 408, 65, 2, '#8a5420');
    line(ctx, 393, 88, 408, 72, 2, '#8a5420');
    // carved trim
    line(ctx, 386, 96, 434, 90, 2, '#5e3812');
    // dial
    ellipse(ctx, 410, 116, 18, 18, '#f7f1de');
    for (let i = 0; i < 12; i += 3) {
      const a = (i / 12) * Math.PI * 2;
      line(ctx, 410 + Math.cos(a) * 14, 116 + Math.sin(a) * 14, 410 + Math.cos(a) * 16.5, 116 + Math.sin(a) * 16.5, 2);
    }
    line(ctx, 410, 116, 410, 104, 3);
    line(ctx, 410, 116, 419, 118, 3);
    ctx.fillStyle = OUT;
    ctx.beginPath(); ctx.arc(410, 116, 2, 0, 7); ctx.fill();
    // little door
    poly(ctx, [[400, 138], [422, 136], [423, 156], [401, 158]], flags.cuckooOut ? '#3d2168' : '#6b3f18');
    if (flags.cuckooOut) {
      ellipse(ctx, 411, 147, 8, 7, '#ffd700');
      ellipse(ctx, 416, 144, 2, 2, OUT);
      poly(ctx, [[418, 147], [426, 149], [418, 151]], '#e8703a');
      line(ctx, 406, 141, 402, 137, 2, '#ffd700');
    }
    // chains with pinecone weights + pendulum
    const pa = Math.sin(t * 3) * 0.3;
    line(ctx, 396, 172, 396, 196, 2, '#c9a227');
    ellipse(ctx, 396, 200, 4, 7, '#8a5420', true, 2);
    line(ctx, 424, 170, 424, 190, 2, '#c9a227');
    ellipse(ctx, 424, 194, 4, 7, '#8a5420', true, 2);
    line(ctx, 410, 172, 410 + Math.sin(pa) * 26, 206, 3, '#c9a227');
    ellipse(ctx, 410 + Math.sin(pa) * 26, 208, 6, 6, '#ffd700');
    shadeE(ctx, 408 + Math.sin(pa) * 26, 206, 2, 2, '#fff', 0.6);

    // key on floor after cuckoo spits it
    if (flags.cuckooOut && !flags.keyTaken) {
      softShadow(ctx, 404, 334, 14, 3, 0.25);
      line(ctx, 398, 330, 412, 326, 4, '#ffd700');
      line(ctx, 410, 326, 412, 330, 3, '#ffd700');
      ellipse(ctx, 396, 331, 4.5, 4.5, '#ffd700');
      if (Math.floor(t * 1.4) % 3 === 0) sparkle(ctx, 414, 322, 4, '#fff8d0');
    }

    // poster gag with tape corners
    ctx.save();
    ctx.translate(234, 109); ctx.rotate(-0.04);
    poly(ctx, [[-38, -39], [38, -39], [38, 39], [-38, 39]], '#f7f1de');
    shade(ctx, [[-38, 26], [38, 26], [38, 39], [-38, 39]], '#c9b98e', 0.35);
    poly(ctx, [[-42, -41], [-30, -35], [-36, -29]], 'rgba(255,255,255,0.55)', false);
    poly(ctx, [[42, -41], [30, -35], [36, -29]], 'rgba(255,255,255,0.55)', false);
    ctx.fillStyle = '#c9412f';
    ctx.font = 'bold 13px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.fillText('SCIENCE', 0, -18);
    ctx.fillText('IS FUN*', 0, -2);
    // little atom doodle
    ellipse(ctx, 0, 18, 10, 4, null, true, 1.5);
    ctx.save(); ctx.translate(0, 18); ctx.rotate(1.05); ellipse(ctx, 0, 0, 10, 4, null, true, 1.5); ctx.restore();
    ctx.fillStyle = '#e8703a';
    ctx.beginPath(); ctx.arc(0, 18, 2.5, 0, 7); ctx.fill();
    ctx.font = '8px Trebuchet MS';
    ctx.fillStyle = '#555';
    ctx.fillText('*results may vary', 0, 34);
    ctx.restore();

    cobweb(ctx, 640, 0, 60);
    vignette(ctx);
  }

  function drawKitchen(ctx, t, flags) {
    // tiled wall with gradient
    ctx.fillStyle = vgrad(ctx, 0, 0, 0, 285, [[0, '#27a0a0'], [1, '#177070']]);
    ctx.fillRect(0, 0, 640, 285);
    ctx.strokeStyle = 'rgba(10,60,60,0.5)'; ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 90 - 20, 0);
      ctx.lineTo(i * 90 + Math.sin(i) * 14, 285);
      ctx.stroke();
    }
    for (let j = 1; j < 4; j++) line(ctx, 0, j * 72 + 8, 640, j * 72 - 8, 3, 'rgba(10,60,60,0.5)');
    // odd colored tiles + shine streaks
    shade(ctx, [[250, 82], [338, 76], [342, 148], [254, 154]], '#3fc9b0', 0.25);
    shade(ctx, [[70, 154], [158, 148], [162, 216], [74, 222]], '#1f9a8a', 0.3);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(300, 40); ctx.lineTo(250, 130); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(330, 40); ctx.lineTo(296, 100); ctx.stroke();
    poly(ctx, [[0, 0], [640, 0], [640, 24], [0, 36]], '#125e5e');
    poly(ctx, [[0, 272], [640, 266], [640, 285], [0, 285]], '#0f5252', false);

    hangingLamp(ctx, 330, 160, t);

    // hanging pot rail
    line(ctx, 216, 34, 292, 30, 4, '#3a3a44');
    for (let i = 0; i < 2; i++) {
      const hx = 234 + i * 42, sway = Math.sin(t * 1.1 + i * 2) * 2;
      line(ctx, hx, 33 - i, hx + sway, 48, 2, '#3a3a44');
      blob(ctx, [[hx + sway - 14, 48], [hx + sway + 14, 48], [hx + sway + 10, 66], [hx + sway - 10, 66]], i ? '#c9412f' : '#9aa2ac');
      shade(ctx, [[hx + sway - 14, 48], [hx + sway - 4, 48], [hx + sway - 4, 64], [hx + sway - 10, 64]], '#fff', 0.2);
      line(ctx, hx + sway - 14, 50, hx + sway + 14, 50, 2.5);
    }

    // floor
    checkerFloor(ctx, 285, 400, '#e8d9a0', '#c9b06b');

    // fridge (big, wobbly)
    softShadow(ctx, 115, 312, 70, 9, 0.22);
    poly(ctx, [[58, 128], [162, 120], [170, 302], [52, 308]], '#dfe8ea');
    shade(ctx, [[140, 122], [162, 120], [170, 302], [148, 304]], '#93a8ae', 0.5);
    shade(ctx, [[58, 128], [70, 127], [66, 306], [52, 308]], '#fff', 0.4);
    poly(ctx, [[58, 128], [162, 120], [163, 130], [59, 138]], '#b8c8cc');
    line(ctx, 62, 200, 166, 194, 4);
    // handles
    line(ctx, 150, 158, 150, 184, 6, '#8a999e');
    line(ctx, 149, 159, 149, 183, 2, '#e8f2f4');
    line(ctx, 152, 228, 152, 268, 6, '#8a999e');
    line(ctx, 151, 229, 151, 267, 2, '#e8f2f4');
    // brand
    ctx.fillStyle = '#8a999e';
    ctx.font = 'bold 9px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.save(); ctx.translate(110, 150); ctx.rotate(-0.04); ctx.fillText('COLDINATOR', 0, 0); ctx.restore();
    // magnets + crayon drawing + note
    ellipse(ctx, 95, 240, 7, 7, '#e64ca8');
    ellipse(ctx, 122, 226, 6, 6, '#3fae4a');
    ellipse(ctx, 78, 262, 5, 5, '#ffd700');
    ctx.save();
    ctx.translate(104, 262); ctx.rotate(0.06);
    poly(ctx, [[-16, -14], [16, -14], [16, 14], [-16, 14]], '#fffbe8', true, 2);
    ellipse(ctx, -6, -5, 4, 4, null, true, 1.5);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.4;
      line(ctx, -6 + Math.cos(a) * 5, -5 + Math.sin(a) * 5, -6 + Math.cos(a) * 8, -5 + Math.sin(a) * 8, 1.5, '#e8a23a');
    }
    line(ctx, -10, 8, 10, 8, 1.5, '#3fae4a');
    ellipse(ctx, 6, 2, 3, 5, null, true, 1.5);
    ctx.restore();

    // broom leaning next to fridge
    if (!flags.broomTaken) {
      softShadow(ctx, 192, 322, 20, 4, 0.2);
      line(ctx, 186, 300, 206, 170, 6, '#b5722f');
      line(ctx, 187, 296, 205, 176, 2, '#d99a4e');
      line(ctx, 199, 216, 205, 210, 3, '#8a5420'); // string wrap
      poly(ctx, [[174, 322], [200, 316], [206, 296], [182, 300]], '#e8c95e');
      shade(ctx, [[174, 322], [186, 319], [190, 298], [182, 300]], '#b5722f', 0.3);
      for (let i = 0; i < 5; i++) line(ctx, 178 + i * 6, 320 - i, 180 + i * 6, 300 - i, 2, '#c9a227');
    }

    // shelf top-right
    poly(ctx, [[418, 128], [582, 118], [584, 134], [420, 144]], '#8a5420');
    shade(ctx, [[418, 128], [582, 118], [583, 124], [419, 134]], '#fff', 0.18);
    line(ctx, 430, 142, 424, 172, 5, '#6b3f18');
    line(ctx, 572, 132, 578, 162, 5, '#6b3f18');
    // stuff on shelf: labeled cans
    poly(ctx, [[530, 96], [552, 94], [553, 122], [531, 124]], '#c9412f');
    poly(ctx, [[531, 104], [552, 102], [553, 114], [532, 116]], '#f7f1de', false);
    ctx.fillStyle = '#7a2418'; ctx.font = 'bold 7px Trebuchet MS'; ctx.textAlign = 'center';
    ctx.fillText('BEANS', 542, 112);
    poly(ctx, [[556, 92], [576, 90], [577, 120], [557, 122]], '#3fae4a');
    poly(ctx, [[557, 100], [576, 98], [577, 110], [558, 112]], '#f7f1de', false);
    ctx.fillStyle = '#1f6b2a';
    ctx.fillText('GOO', 566, 108);

    // radio (on shelf or fallen on floor)
    if (!flags.radioFell) {
      glow(ctx, 460, 110, 20, '255,215,0', 0.18);
      poly(ctx, [[438, 94], [508, 88], [512, 126], [442, 132]], '#c9412f');
      shade(ctx, [[438, 94], [508, 88], [509, 96], [439, 102]], '#fff', 0.2);
      shade(ctx, [[496, 89], [508, 88], [512, 126], [500, 127]], '#7a2418', 0.5);
      ellipse(ctx, 460, 110, 10, 10, '#ffd700');
      ellipse(ctx, 460, 110, 4, 4, '#8a6a00', false);
      // speaker grille
      poly(ctx, [[480, 100], [502, 98], [503, 118], [481, 120]], '#7a2418');
      for (let i = 0; i < 3; i++) line(ctx, 483, 105 + i * 5, 501, 103 + i * 5, 1.5, '#4a1410');
      line(ctx, 500, 90, 512, 68, 3);
      ellipse(ctx, 512, 67, 2, 2, '#c9412f');
      // music notes if radio intact (drawn, not font glyphs)
      for (let i = 0; i < 2; i++) {
        const nx = 522 + i * 15 + Math.sin(t * 2 + i * 2) * 4;
        const ny = 80 - ((t * 20 + i * 14) % 32);
        ctx.save();
        ctx.globalAlpha = Math.min(1, (80 - ny) / 10, (ny - 44) / 10);
        ellipse(ctx, nx, ny, 3.5, 2.5, OUT, false);
        line(ctx, nx + 3, ny, nx + 3, ny - 12, 2);
        curve(ctx, nx + 3, ny - 12, nx + 7, ny - 11, nx + 8, ny - 7, 2);
        ctx.restore();
      }
    } else {
      // smashed radio on floor
      softShadow(ctx, 478, 380, 48, 6, 0.22);
      poly(ctx, [[440, 352], [512, 346], [520, 376], [436, 380]], '#c9412f');
      shade(ctx, [[440, 366], [518, 360], [520, 376], [436, 380]], '#7a2418', 0.4);
      line(ctx, 452, 350, 472, 374, 3);
      line(ctx, 488, 348, 480, 376, 3);
      ellipse(ctx, 460, 364, 8, 8, '#ffd700');
      // a popped spring
      curve(ctx, 500, 350, 506, 336, 512, 348, 2.5, '#8a999e');
      if (!flags.batteryTaken && flags.radioOpen) {
        poly(ctx, [[526, 362], [548, 360], [549, 374], [527, 376]], '#3a3a44');
        poly(ctx, [[548, 364], [552, 364], [552, 370], [548, 371]], '#9aa2ac', true, 2);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 9px Trebuchet MS';
        ctx.textAlign = 'center';
        ctx.fillText('AA', 537, 371);
      }
    }

    // table with hot sauce
    softShadow(ctx, 330, 344, 76, 8, 0.2);
    poly(ctx, [[262, 244], [398, 238], [408, 288], [252, 294]], '#b5722f');
    shade(ctx, [[262, 262], [402, 256], [408, 288], [252, 294]], '#7c4c1c', 0.4);
    poly(ctx, [[262, 244], [398, 238], [399, 248], [263, 254]], '#d98f45', false);
    for (let i = 0; i < 3; i++) curve(ctx, 280 + i * 38, 248, 296 + i * 38, 252, 312 + i * 38, 247, 1.5, 'rgba(90,50,10,0.45)');
    poly(ctx, [[262, 244], [398, 238], [408, 288], [252, 294]], null);
    line(ctx, 270, 292, 274, 344, 9, '#8a5420');
    line(ctx, 392, 286, 396, 340, 9, '#8a5420');
    if (!flags.sauceTaken) {
      softShadow(ctx, 326, 243, 12, 3, 0.25);
      poly(ctx, [[318, 214], [334, 213], [336, 242], [316, 243]], '#e8402f');
      shade(ctx, [[318, 214], [322, 214], [321, 242], [316, 243]], '#fff', 0.3);
      poly(ctx, [[322, 206], [330, 205], [331, 214], [323, 215]], '#8a2418');
      poly(ctx, [[319, 222], [334, 221], [335, 236], [318, 237]], '#f7f1de', false);
      ctx.fillStyle = '#c9210f';
      ctx.font = 'bold 7px Trebuchet MS';
      ctx.textAlign = 'center';
      ctx.save(); ctx.translate(326, 230); ctx.rotate(-0.04);
      ctx.fillText('XXX', 0, 0);
      // tiny flame doodle
      poly(ctx, [[-3, 3], [0, 8], [3, 3], [1, 5]], '#e8703a', false);
      ctx.restore();
    }

    // door back to lab (right)
    crookedDoor(ctx, 542, 118, 72, 168, '#a04dc9', '#6b2f8a', 'LAB');
    vignette(ctx);
  }

  function drawGarden(ctx, t, flags) {
    // night sky
    ctx.fillStyle = vgrad(ctx, 0, 0, 0, 300, [[0, '#090320'], [0.6, '#2d1455'], [1, '#4a2470']]);
    ctx.fillRect(0, 0, 640, 300);
    // stars
    ctx.fillStyle = '#fff';
    const stars = [[80, 40], [150, 90], [240, 30], [330, 70], [420, 40], [590, 50], [560, 140], [200, 130], [50, 120], [110, 160], [280, 110], [370, 150], [610, 110], [30, 60], [460, 130], [260, 170], [520, 170], [180, 55]];
    for (const [sx, sy] of stars) {
      const tw = 0.35 + Math.abs(Math.sin(t * 2 + sx)) * 0.65;
      ctx.globalAlpha = tw;
      ctx.fillRect(sx, sy, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;
    sparkle(ctx, 240, 30, 5, 'rgba(255,255,255,' + (0.3 + Math.abs(Math.sin(t * 1.7)) * 0.7) + ')');
    sparkle(ctx, 110, 160, 4, 'rgba(255,255,255,' + (0.3 + Math.abs(Math.sin(t * 2.3 + 2)) * 0.7) + ')');
    // shooting star every few seconds
    const sp = t % 9;
    if (sp < 0.5) {
      const p = sp / 0.5;
      ctx.save();
      ctx.globalAlpha = 1 - p;
      line(ctx, 60 + p * 240 - 34, 36 + p * 60 - 12, 60 + p * 240, 36 + p * 60, 2.5, '#fff8d0');
      ctx.restore();
    }
    // drifting wispy clouds
    for (let i = 0; i < 2; i++) {
      const cx = ((t * 7 + i * 340) % 780) - 70, cy = 90 + i * 55;
      ctx.save();
      ctx.globalAlpha = 0.1;
      blob(ctx, [[cx - 55, cy], [cx - 25, cy - 14], [cx + 15, cy - 10], [cx + 55, cy - 16], [cx + 70, cy], [cx + 20, cy + 8], [cx - 30, cy + 8]], '#cfd8ff', false);
      ctx.restore();
    }
    // big moon with halo + craters
    glow(ctx, 520, 70, 90, '255,243,176', 0.3);
    ellipse(ctx, 520, 70, 38, 38, '#fff3b0');
    shadeE(ctx, 508, 62, 6, 6, '#e8dc90', 0.9);
    shadeE(ctx, 532, 82, 9, 9, '#e8dc90', 0.9);
    shadeE(ctx, 534, 54, 4, 4, '#e8dc90', 0.9);
    shadeE(ctx, 512, 84, 3, 3, '#ead88a', 0.9);

    // distant hills behind the fence
    blob(ctx, [[-20, 252], [90, 214], [220, 244], [360, 208], [500, 246], [620, 220], [680, 252], [660, 290], [-20, 290]], '#241145', false);

    // crooked fence
    for (let i = 0; i < 11; i++) {
      const fx = 20 + i * 60, lean = Math.sin(i * 2.7) * 8;
      poly(ctx, [[fx, 300], [fx + lean, 222 + Math.sin(i) * 12], [fx + lean + 8, 214 + Math.sin(i) * 12], [fx + lean + 16, 220 + Math.sin(i) * 12], [fx + 16, 300]], '#8a5420');
      shade(ctx, [[fx + 10, 300], [fx + lean + 10, 221 + Math.sin(i) * 12], [fx + lean + 16, 220 + Math.sin(i) * 12], [fx + 16, 300]], '#5e3812', 0.5);
      ctx.fillStyle = '#3d2410';
      ctx.beginPath(); ctx.arc(fx + lean + 8, 250 + Math.sin(i) * 8, 1.5, 0, 7); ctx.fill();
    }
    line(ctx, 0, 250, 640, 240, 8, '#6b3f18');
    line(ctx, 0, 247, 640, 237, 2, '#8a5420');

    // grass
    ctx.fillStyle = vgrad(ctx, 0, 296, 0, 400, [[0, '#255a26'], [1, '#387c39']]);
    ctx.fillRect(0, 296, 640, 104);
    line(ctx, 0, 296, 640, 296, 3);
    // tufts
    for (let i = 0; i < 14; i++) {
      const gx = 30 + i * 47, gy = 310 + (i % 4) * 20;
      curve(ctx, gx, gy, gx - 5, gy - 8, gx - 4, gy - 13, 2, '#3fae4a');
      curve(ctx, gx, gy, gx + 1, gy - 9, gx + 2, gy - 15, 2, '#57d465');
      curve(ctx, gx, gy, gx + 5, gy - 7, gx + 7, gy - 11, 2, '#3fae4a');
    }
    // little mushrooms
    for (const [mx, my] of [[128, 372], [388, 388], [598, 372]]) {
      line(ctx, mx, my, mx, my - 7, 4, '#e8d9c0');
      blob(ctx, [[mx - 8, my - 6], [mx, my - 14], [mx + 8, my - 6]], '#c9412f');
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(mx - 3, my - 9, 1.3, 0, 7); ctx.arc(mx + 3, my - 10, 1.3, 0, 7); ctx.fill();
    }
    // stepping stones toward the bowl
    for (const [px, py, pr] of [[200, 380, 15], [246, 368, 13], [360, 384, 14]]) {
      ellipse(ctx, px, py, pr, pr * 0.4, '#9b8bb0', true, 2);
      shadeE(ctx, px - 3, py - 2, pr * 0.5, pr * 0.16, '#fff', 0.2);
    }

    // house wall (left) with lab door + lit window
    poly(ctx, [[0, 60], [130, 84], [130, 340], [0, 356]], '#5b2a8c');
    for (let i = 1; i < 5; i++) line(ctx, 0, 60 + i * 56, 130, 82 + i * 52, 2, 'rgba(20,8,40,0.4)');
    poly(ctx, [[0, 60], [130, 84], [130, 98], [0, 76]], '#3d1a63');
    // drainpipe
    line(ctx, 124, 92, 124, 336, 6, '#443066');
    line(ctx, 122, 92, 122, 336, 1.5, '#6b50a0');
    // lit window above the door
    glow(ctx, 64, 112, 44, '255,223,158', 0.25);
    poly(ctx, [[34, 88], [96, 98], [96, 138], [34, 132]], '#6b3f18');
    poly(ctx, [[40, 94], [90, 103], [90, 132], [40, 126]], '#ffdf9e');
    line(ctx, 65, 98, 65, 129, 2.5);
    line(ctx, 40, 110, 90, 117, 2.5);
    poly(ctx, [[40, 94], [90, 103], [90, 132], [40, 126]], null, true, 2.5);
    crookedDoor(ctx, 30, 150, 70, 168, '#c9412f', '#8a2418', 'LAB');

    // food bowl
    softShadow(ctx, 306, 374, 42, 6, 0.25);
    poly(ctx, [[272, 372], [340, 372], [330, 352], [282, 352]], '#7fd4e0');
    shade(ctx, [[318, 372], [340, 372], [330, 352], [314, 352]], '#4a97a8', 0.5);
    shade(ctx, [[272, 372], [286, 372], [290, 352], [282, 352]], '#fff', 0.3);
    if (flags.sauceInBowl) {
      ellipse(ctx, 306, 354, 22, 5, '#c9210f');
      glow(ctx, 306, 352, 20, '255,80,40', 0.18);
      shadeE(ctx, 298, 353, 5, 1.5, '#ff7a5e', 0.8);
    } else {
      ellipse(ctx, 306, 354, 22, 5, '#6b4f2f');
      ctx.fillStyle = '#8a6a42';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(292 + i * 5.6, 353 + (i % 2) * 2, 1.8, 0, 7); ctx.fill(); }
    }
    ctx.fillStyle = '#12405c';
    ctx.font = 'bold 9px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.fillText('SNAPPY', 306, 367);

    // sad little flowers with droopy faces
    for (const [fx, fy] of [[170, 350], [560, 360], [610, 330]]) {
      curve(ctx, fx, fy, fx + 3, fy - 10, fx + 2, fy - 18, 3, '#3fae4a');
      ellipse(ctx, fx - 5, fy - 6, 5, 2.5, '#2f8f3a', true, 1.5);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - 0.3;
        ellipse(ctx, fx + 2 + Math.cos(a) * 7, fy - 21 + Math.sin(a) * 7, 4.5, 4.5, '#e8c95e', false);
      }
      ellipse(ctx, fx + 2, fy - 21, 4.5, 4.5, '#e8703a', true, 2);
      ctx.fillStyle = OUT;
      ctx.beginPath(); ctx.arc(fx + 0.7, fy - 22, 0.7, 0, 7); ctx.arc(fx + 3.5, fy - 22, 0.7, 0, 7); ctx.fill();
      curve(ctx, fx + 0.5, fy - 19, fx + 2, fy - 20.5, fx + 3.7, fy - 19, 1.2);
    }

    // fireflies
    for (let i = 0; i < 5; i++) {
      const fx = 130 + i * 105 + Math.sin(t * 0.7 + i * 2.1) * 34;
      const fy = 312 + (i % 3) * 24 + Math.sin(t * 1.3 + i * 1.4) * 12;
      const pulse = 0.25 + Math.abs(Math.sin(t * 2.2 + i * 2.6)) * 0.55;
      glow(ctx, fx, fy, 10, '216,255,112', pulse);
      ctx.fillStyle = 'rgba(240,255,190,' + (0.5 + pulse * 0.5) + ')';
      ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, 7); ctx.fill();
    }

    vignette(ctx);
  }

  // ---- inventory icons (40x40) ----
  const ICONS = {
    broom(c) {
      shadeE(c, 20, 36, 14, 3, '#000', 0.2);
      line(c, 10, 34, 32, 6, 4, '#b5722f');
      line(c, 11, 32, 31, 8, 1.5, '#d99a4e');
      poly(c, [[4, 38], [17, 34], [13, 25], [2, 29]], '#e8c95e');
      line(c, 6, 35, 9, 28, 1.5, '#b5722f');
      line(c, 10, 34, 13, 27, 1.5, '#b5722f');
      line(c, 13, 30, 15, 26, 2, '#8a5420');
    },
    hotsauce(c) {
      shadeE(c, 20, 37, 10, 2.5, '#000', 0.2);
      poly(c, [[14, 12], [26, 12], [28, 36], [12, 36]], '#e8402f');
      shade(c, [[14, 12], [17, 12], [16, 36], [12, 36]], '#fff', 0.35);
      poly(c, [[17, 5], [23, 5], [24, 12], [16, 12]], '#8a2418');
      poly(c, [[14, 20], [26, 20], [27, 31], [13, 31]], '#f7f1de', false);
      c.fillStyle = '#c9210f'; c.font = 'bold 7px Trebuchet MS'; c.textAlign = 'center';
      c.fillText('XXX', 20, 27);
    },
    crank(c) {
      shadeE(c, 20, 36, 12, 2.5, '#000', 0.2);
      line(c, 10, 30, 22, 14, 5, '#9aa2ac');
      line(c, 22, 14, 32, 20, 5, '#9aa2ac');
      line(c, 11, 28, 21, 15, 1.5, '#d5dbe2');
      ellipse(c, 10, 30, 4.5, 4.5, '#666');
      ellipse(c, 10, 30, 1.8, 1.8, '#3a3a3a', false);
    },
    battery(c) {
      shadeE(c, 21, 33, 12, 2.5, '#000', 0.2);
      poly(c, [[8, 13], [30, 13], [30, 29], [8, 29]], '#3a3a44');
      poly(c, [[30, 17], [35, 17], [35, 25], [30, 25]], '#9aa2ac');
      shade(c, [[8, 13], [30, 13], [30, 17], [8, 17]], '#fff', 0.18);
      c.fillStyle = '#ffd700'; c.font = 'bold 9px Trebuchet MS'; c.textAlign = 'center';
      c.fillText('AA', 19, 25);
      line(c, 12, 17, 12, 25, 1.5, '#ffd700');
    },
    key(c) {
      shadeE(c, 21, 35, 12, 2.5, '#000', 0.2);
      ellipse(c, 12, 15, 6.5, 6.5, '#ffd700');
      ellipse(c, 12, 15, 2.5, 2.5, '#8a6a00', false);
      line(c, 17, 19, 31, 33, 4.5, '#ffd700');
      line(c, 27, 31, 31, 27, 3.5, '#ffd700');
      line(c, 24, 27, 27, 24, 3, '#ffd700');
      sparkle(c, 8, 9, 3, '#fff8d0');
    },
    ray(c) {
      shadeE(c, 20, 34, 13, 2.5, '#000', 0.2);
      line(c, 14, 34, 12, 24, 3);
      line(c, 22, 34, 24, 24, 3);
      poly(c, [[6, 14], [26, 10], [28, 25], [8, 29]], '#e8703a');
      shade(c, [[6, 14], [26, 10], [26.5, 14], [6.5, 18]], '#fff', 0.3);
      line(c, 16, 12, 17, 27, 2, '#8a3c14');
      poly(c, [[26, 13], [36, 15], [36, 22], [26, 23]], '#ffd700');
      ellipse(c, 12, 20, 3, 3, '#7CFC00');
      line(c, 37, 15, 40, 12, 1.5, '#b6ff5e');
      line(c, 37, 22, 40, 25, 1.5, '#b6ff5e');
    }
  };

  function drawIcon(canvas, id) {
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, 40, 40);
    if (ICONS[id]) ICONS[id](c);
  }

  return { drawLab, drawKitchen, drawGarden, drawNed, drawProfessor, drawPlant, drawIcon };
})();
