// Sinematik efekt motoru: grafiğin çizilmiş tuvalini (src) kare kare bir hedef tuvale (buf) işler.
// Aynı fonksiyonlar dashboard'da canlı oynatmada ve video PPTX kaydında kullanılır.
(function (G) {
  const PI = Math.PI, cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
  const E = {
    out: t => 1 - Math.pow(1 - t, 3), inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, quint: t => 1 - Math.pow(1 - t, 5),
    back: t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    elastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * PI / 3)) + 1,
    bounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; }
  };
  const rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const GOLD = '#f2d68a', CYAN = '#5fe3ff';

  // ---------- yardımcılar ----------
  function full(ctx, src, W, H) { ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, W, H); }
  function tf(o) { // dönüşüm ailesi: o(t) -> {x,y,s,sx,sy,r,a,blur,f,px,py,kx}
    return (ctx, src, t, W, H) => { const p = Object.assign({ x: 0, y: 0, s: 1, sx: 1, sy: 1, r: 0, a: 1, px: .5, py: .5, kx: 0 }, o(t, W, H));
      ctx.save(); ctx.globalAlpha = cl(p.a); let f = ''; if (p.blur > .3) f += `blur(${p.blur * W / 900}px) `; if (p.f) f += p.f; if (f) ctx.filter = f;
      const cx = W * p.px, cy = H * p.py; ctx.translate(cx + p.x * W, cy + p.y * H); ctx.rotate(p.r); ctx.transform(1, 0, p.kx, 1, 0, 0); ctx.scale(p.s * p.sx, p.s * p.sy);
      ctx.drawImage(src, 0, 0, src.width, src.height, -cx, -cy, W, H); ctx.restore(); };
  }
  function strips(axis, pivot) { // sahte 3B: şeritlerle perspektif
    return (ctx, src, t, W, H) => { const e = E.out(t), th = (1 - e) * PI * .48, n = 40, cos = Math.cos(th), sin = Math.sin(th);
      ctx.save(); ctx.globalAlpha = cl(t * 3);
      for (let i = 0; i < n; i++) { const u = i / n, u2 = (i + 1) / n;
        const map = v => { const d = pivot === 'c' ? v - .5 : pivot === 'l' ? v : 1 - v, z = d * sin * .9, k = 1 / (1 + z); const pos = pivot === 'c' ? .5 + d * cos * k : pivot === 'l' ? d * cos * k : 1 - d * cos * k; return { pos, k }; };
        const a = map(u), b = map(u2), sh = 1 - Math.abs(sin) * .5 * (pivot === 'c' ? Math.abs(u - .5) * 2 : pivot === 'l' ? u : 1 - u);
        ctx.filter = `brightness(${sh})`;
        if (axis === 'y') { const x0 = Math.min(a.pos, b.pos) * W, w = Math.abs(b.pos - a.pos) * W + 1, h = H * (a.k + b.k) / 2;
          ctx.drawImage(src, u * src.width, 0, src.width / n + 1, src.height, x0, (H - h) / 2, w, h); }
        else { const y0 = Math.min(a.pos, b.pos) * H, h = Math.abs(b.pos - a.pos) * H + 1, w = W * (a.k + b.k) / 2;
          ctx.drawImage(src, 0, u * src.height, src.width, src.height / n + 1, (W - w) / 2, y0, w, h); } }
      ctx.restore(); };
  }
  function mask(path, opt) { // maske ailesi: path(ctx,t,W,H,st) çizim yolunu kurar
    opt = opt || {};
    return (ctx, src, t, W, H, st) => { const e = (opt.ease || E.inOut)(t);
      if (e >= 1) return full(ctx, src, W, H);
      ctx.save(); ctx.beginPath(); path(ctx, e, W, H, st); ctx.clip(); full(ctx, src, W, H); ctx.restore();
      if (opt.edge !== false && e > 0 && e < 1) { ctx.save(); ctx.beginPath(); path(ctx, e, W, H, st); ctx.strokeStyle = opt.color || GOLD; ctx.lineWidth = W / 300; ctx.shadowColor = opt.color || GOLD; ctx.shadowBlur = W / 40; ctx.globalAlpha = Math.sin(e * PI); ctx.stroke(); ctx.restore(); } };
  }
  const poly = (ctx, pts) => pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  function cells(cols, rows, order) { // hücre sıralı maske
    return mask((ctx, e, W, H, st) => { if (!st.ord) { const r = rng(7), a = []; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) a.push({ x, y, k: order(x, y, cols, rows, r) }); a.sort((p, q) => p.k - q.k); st.ord = a; }
      const n = Math.ceil(e * st.ord.length), cw = W / cols, ch = H / rows; for (let i = 0; i < n; i++) { const c = st.ord[i]; ctx.rect(c.x * cw - .5, c.y * ch - .5, cw + 1, ch + 1); } }, { edge: false, ease: E.out });
  }
  function tiles(cols, rows, fn, order) { // karo ailesi: her karo kendi dönüşümüyle
    return (ctx, src, t, W, H, st) => { if (t >= 1) return full(ctx, src, W, H);
      if (!st.tl) { const r = rng(11); st.tl = []; for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) st.tl.push({ x, y, r1: r(), r2: r(), r3: r(), d: order ? order(x, y, cols, rows, r) : r() }); }
      const cw = W / cols, ch = H / rows, sw = src.width / cols, sh = src.height / rows;
      st.tl.forEach(c => { const lt = cl((t - c.d * .55) / .45); if (lt <= 0) return; const p = Object.assign({ x: 0, y: 0, s: 1, sx: 1, sy: 1, r: 0, a: 1, f: '' }, fn(lt, c, W, H));
        ctx.save(); ctx.globalAlpha = cl(p.a); if (p.f) ctx.filter = p.f; ctx.translate(c.x * cw + cw / 2 + p.x, c.y * ch + ch / 2 + p.y); ctx.rotate(p.r); ctx.scale(p.s * p.sx, p.s * p.sy);
        ctx.drawImage(src, c.x * sw, c.y * sh, sw, sh, -cw / 2 - .5, -ch / 2 - .5, cw + 1, ch + 1); ctx.restore(); }); };
  }
  function particles(start, opt) { // parçacık ailesi: son görüntünün piksellerinden parçacık
    opt = opt || {};
    return (ctx, src, t, W, H, st) => {
      if (st.pt && !st.pt.length) st.pt = null;
      if (!st.pt) { st.pt = []; const step = Math.max(4, Math.round(W / 150)); const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tc = tmp.getContext('2d'); full(tc, src, W, H);
        let d; try { d = tc.getImageData(0, 0, W, H).data; } catch (_) { d = null; } const r = rng(3);
        if (d) for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) { const i = (y * W + x) * 4; if (d[i + 3] < 40) continue;
          const p = { tx: x, ty: y, c: `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`, r1: r(), r2: r(), r3: r() }; Object.assign(p, start(p, W, H, r)); st.pt.push(p); }
        st.step = step; }
      const fade = cl((t - .82) / .18);
      st.pt.forEach(p => { const lt = cl((t - (p.delay || 0)) / (1 - (p.delay || 0) * .9)), e = (opt.ease || E.inOut)(lt);
        let x = lerp(p.sx, p.tx, e), y = lerp(p.sy, p.ty, e); if (opt.path) { const q = opt.path(p, e, W, H); x = q[0]; y = q[1]; }
        ctx.globalAlpha = cl(lt * 2) * (1 - fade); ctx.fillStyle = p.c; const s = st.step * (opt.size ? opt.size(e) : 1); ctx.fillRect(x, y, s, s); });
      ctx.globalAlpha = 1; if (opt.glow && t < .85) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .25 * (1 - t); st.pt.forEach((p, i) => { if (i % 9) return; ctx.fillStyle = GOLD; ctx.fillRect(lerp(p.sx, p.tx, E.inOut(t)), lerp(p.sy, p.ty, E.inOut(t)), 2, 2); }); ctx.restore(); }
      if (fade > 0) { ctx.save(); ctx.globalAlpha = fade; full(ctx, src, W, H); ctx.restore(); } };
  }
  function filt(fn) { return (ctx, src, t, W, H) => { ctx.save(); const p = fn(t); ctx.globalAlpha = p.a ?? 1; ctx.filter = p.f; if (p.s) { ctx.translate(W / 2, H / 2); ctx.scale(p.s, p.s); ctx.translate(-W / 2, -H / 2); } full(ctx, src, W, H); ctx.restore(); }; }
  const fadeIn = (ctx, src, t, W, H, a) => { ctx.save(); ctx.globalAlpha = a; full(ctx, src, W, H); ctx.restore(); };

  // ---------- efekt listesi ----------
  const L = [];
  const add = (cat, n, fn, o) => L.push(Object.assign({ cat, n, fn, still: true, dur: 1.0 }, o || {}));
  // 1. Kamera hareketleri
  const K = 'Kamera';
  add(K, 'Sinematik yakınlaşma', tf(t => { const e = E.quint(t); return { s: lerp(1.7, 1, e), blur: (1 - e) * 22, a: t * 2.5 }; }), { dur: 1.2 });
  add(K, 'Uzaktan belirme', tf(t => { const e = E.back(t); return { s: lerp(.3, 1, e), a: t * 3 }; }));
  add(K, 'Soldan hızlı geçiş', tf(t => { const e = E.back(t); return { x: lerp(-1.1, 0, e), blur: (1 - E.out(t)) * 30, a: t * 4 }; }));
  add(K, 'Sağdan hızlı geçiş', tf(t => { const e = E.back(t); return { x: lerp(1.1, 0, e), blur: (1 - E.out(t)) * 30, a: t * 4 }; }));
  add(K, 'Gökten düşüş', tf(t => ({ y: lerp(-1.1, 0, E.bounce(t)), a: t * 4 })), { dur: 1.3 });
  add(K, 'Yerden yükseliş', tf(t => ({ y: lerp(1, 0, E.quint(t)), s: lerp(.9, 1, E.out(t)), a: t * 3 })));
  add(K, 'Sarmal giriş', tf(t => { const e = E.out(t); return { r: (1 - e) * PI * 2.5, s: e, a: t * 3 }; }), { dur: 1.3 });
  add(K, 'Dönme dolap', tf(t => { const e = E.inOut(t); return { r: (1 - e) * PI * 2, s: lerp(.2, 1, e), y: Math.sin(e * PI) * -.15, a: t * 3 }; }), { dur: 1.4 });
  add(K, 'Sarkaç', tf(t => ({ py: 0, r: Math.exp(-5 * t) * Math.cos(t * 14) * .55, a: t * 4 })), { dur: 1.5 });
  add(K, 'Elastik patlama', tf(t => ({ s: E.elastic(t), a: t * 5 })), { dur: 1.3 });
  add(K, 'Jöle', tf(t => { const w = Math.exp(-4 * t) * Math.sin(t * 22); return { sx: 1 + w * .35, sy: 1 - w * .3, s: E.out(cl(t * 2)), a: t * 4 }; }), { dur: 1.4 });
  add(K, 'Kalp atışı', tf(t => { const b = t < .7 ? Math.pow(Math.sin(t / .7 * PI * 2), 8) * .12 : 0; return { s: lerp(.85, 1, E.out(t)) + b, a: t * 3 }; }), { dur: 1.5 });
  add(K, 'Deprem', tf(t => { const a = (1 - t) * .04; return { x: Math.sin(t * 90) * a, y: Math.cos(t * 77) * a, r: Math.sin(t * 60) * a, a: t * 3 }; }), { dur: 1.2 });
  add(K, 'Eğilerek kayma', tf(t => { const e = E.back(t); return { x: lerp(-.9, 0, e), kx: (1 - E.out(t)) * -.9, a: t * 3 }; }));
  add(K, 'Fırlatma', tf(t => { const e = E.out(t); return { x: lerp(-.8, 0, e), y: lerp(.8, 0, e) - Math.sin(e * PI) * .35, r: (1 - e) * -1.2, s: lerp(.3, 1, e), a: t * 3 }; }), { dur: 1.3 });
  add(K, 'Bumerang', tf(t => { const x = t < .55 ? lerp(1.2, -.25, E.out(t / .55)) : lerp(-.25, 0, E.elastic((t - .55) / .45)); return { x, r: (1 - t) * .4, a: t * 4 }; }), { dur: 1.5 });
  add(K, 'Dalga sörfü', tf(t => { const e = E.out(t); return { x: lerp(-1, 0, e), y: Math.sin(e * PI * 3) * .08 * (1 - e), r: Math.sin(e * PI * 3) * .12 * (1 - e), a: t * 3 }; }), { dur: 1.4 });
  add(K, 'Hiperuzay sıçraması', (ctx, src, t, W, H) => { const e = E.quint(t); if (t < .9) { ctx.save(); ctx.strokeStyle = 'rgba(200,230,255,.8)'; ctx.globalAlpha = (1 - e); const r = rng(5);
      for (let i = 0; i < 90; i++) { const a = r() * PI * 2, d0 = r() * W * .1 + W * .05, len = (1 - e) * W * .8 * r(); ctx.lineWidth = r() * 2 + .5; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * d0, H / 2 + Math.sin(a) * d0); ctx.lineTo(W / 2 + Math.cos(a) * (d0 + len), H / 2 + Math.sin(a) * (d0 + len)); ctx.stroke(); } ctx.restore(); }
    tf(() => ({ sx: lerp(4, 1, e), s: lerp(.4, 1, e), blur: (1 - e) * 20, a: e * 1.3 }))(ctx, src, t, W, H); }, { dur: 1.3 });
  add(K, 'Odak çekme', tf(t => ({ blur: (1 - E.out(t)) * 40, s: lerp(1.06, 1, E.out(t)), a: cl(t * 2) })));
  add(K, 'Yaprak süzülmesi', tf(t => { const e = E.out(t); return { y: lerp(-1, 0, e), x: Math.sin(e * PI * 4) * .12 * (1 - e), r: Math.sin(e * PI * 4) * .3 * (1 - e), a: t * 3 }; }), { dur: 1.6 });
  add(K, 'Sert iniş', tf(t => { if (t < .45) return { y: lerp(-1.2, 0, Math.pow(t / .45, 2)), s: 1.05 }; const k = (t - .45) / .55, a = Math.exp(-6 * k) * .03; return { x: Math.sin(k * 80) * a, y: Math.cos(k * 70) * a, sy: 1 - Math.exp(-8 * k) * Math.sin(k * 20) * .06 }; }), { dur: 1.3 });
  add(K, 'Uzay istasyonu', tf(t => { const e = E.inOut(t); return { s: lerp(.15, 1, e), r: (1 - e) * PI * .6, x: Math.sin(e * PI) * .25, y: Math.cos(e * PI) * .15 - .15 * (1 - e), a: t * 2 }; }), { dur: 1.6 });
  add(K, 'Tüneldan çıkış', (ctx, src, t, W, H) => { const e = E.quint(t); ctx.save(); for (let i = 5; i >= 1; i--) { const s = lerp(.05 * i, 1 + i * .15, e); ctx.globalAlpha = (1 - e) * .15 * (6 - i) / 5; ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); full(ctx, src, W, H); ctx.setTransform(1, 0, 0, 1, 0, 0); } ctx.restore();
    tf(() => ({ s: lerp(.05, 1, e), a: e * 1.5 }))(ctx, src, t, W, H); }, { dur: 1.3 });
  // 2. 3B
  const D3 = '3B hareket';
  add(D3, '3B yatay çevrilme', tf(t => { const e = E.back(t); return { sx: Math.max(.01, Math.abs(Math.cos((1 - e) * PI / 2))), f: `brightness(${lerp(.4, 1, e)})`, a: t * 4 }; }));
  add(D3, '3B dikey çevrilme', tf(t => { const e = E.back(t); return { sy: Math.max(.01, Math.abs(Math.cos((1 - e) * PI / 2))), f: `brightness(${lerp(.4, 1, e)})`, a: t * 4 }; }));
  add(D3, 'Kapı gibi açılma', strips('y', 'l'), { dur: 1.2 });
  add(D3, 'Kitap sayfası', strips('y', 'r'), { dur: 1.2 });
  add(D3, 'Döner kapı', strips('y', 'c'), { dur: 1.2 });
  add(D3, 'Tavandan katlanma', strips('x', 'l'), { dur: 1.2 });
  add(D3, 'Zeminden kalkma', strips('x', 'r'), { dur: 1.2 });
  add(D3, 'Para atışı', tf(t => { const e = E.out(t), a = (1 - e) * PI * 5; return { sx: Math.max(.02, Math.abs(Math.cos(a))), y: -Math.sin(e * PI) * .25, f: `brightness(${.6 + .4 * Math.abs(Math.cos(a))})`, a: t * 4 }; }), { dur: 1.4 });
  // 3. Perde ve maske
  const M = 'Perde ve maske';
  add(M, 'Soldan altın silme', mask((c, e, W, H) => c.rect(0, 0, W * e, H)));
  add(M, 'Sağdan altın silme', mask((c, e, W, H) => c.rect(W * (1 - e), 0, W * e, H)));
  add(M, 'Yukarıdan perde', mask((c, e, W, H) => c.rect(0, 0, W, H * e)));
  add(M, 'Aşağıdan yükselen', mask((c, e, W, H) => c.rect(0, H * (1 - e), W, H * e)));
  add(M, 'İris açılışı', mask((c, e, W, H) => c.arc(W / 2, H / 2, Math.hypot(W, H) / 2 * e, 0, PI * 2)));
  add(M, 'Elmas pencere', mask((c, e, W, H) => { const r = (W + H) * .55 * e; poly(c, [[W / 2, H / 2 - r], [W / 2 + r, H / 2], [W / 2, H / 2 + r], [W / 2 - r, H / 2]]); c.closePath(); }));
  add(M, 'Yıldız kapısı', mask((c, e, W, H) => { const R = Math.hypot(W, H) * .75 * e, pts = []; for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5 + e, r = i % 2 ? R * .45 : R; pts.push([W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r]); } poly(c, pts); c.closePath(); }));
  add(M, 'Kalp penceresi', mask((c, e, W, H) => { const s = Math.max(W, H) * 1.6 * e, x = W / 2, y = H / 2 + s * .05; c.moveTo(x, y + s * .35); c.bezierCurveTo(x - s * .6, y - s * .05, x - s * .3, y - s * .55, x, y - s * .22); c.bezierCurveTo(x + s * .3, y - s * .55, x + s * .6, y - s * .05, x, y + s * .35); }, { color: '#ff6b8b' }));
  add(M, 'Saat yönünde tarama', mask((c, e, W, H) => { c.moveTo(W / 2, H / 2); c.arc(W / 2, H / 2, Math.hypot(W, H), -PI / 2, -PI / 2 + e * PI * 2); c.closePath(); }));
  add(M, 'Radar taraması', mask((c, e, W, H) => { c.moveTo(W / 2, H); c.arc(W / 2, H, Math.hypot(W, H), PI, PI + e * PI); c.closePath(); }, { color: CYAN }));
  add(M, 'Yatay jaluzi', mask((c, e, W, H) => { const n = 12, h = H / n; for (let i = 0; i < n; i++) c.rect(0, i * h, W, h * e); }));
  add(M, 'Dikey jaluzi', mask((c, e, W, H) => { const n = 16, w = W / n; for (let i = 0; i < n; i++) c.rect(i * w, 0, w * e, H); }));
  add(M, 'Dama tahtası', cells(10, 6, (x, y) => ((x + y) % 2) * 1 + (x + y) / 30));
  add(M, 'Çapraz silme', mask((c, e, W, H) => { const d = (W + H) * e; poly(c, [[0, 0], [d, 0], [0, d]]); c.closePath(); }));
  add(M, 'Ahır kapıları', mask((c, e, W, H) => c.rect(W / 2 * (1 - e), 0, W * e, H)));
  add(M, 'Yarıktan açılma', mask((c, e, W, H) => c.rect(0, H / 2 * (1 - e), W, H * e), { color: '#ffffff' }));
  add(M, 'Kutu büyümesi', mask((c, e, W, H) => c.rect(W / 2 * (1 - e), H / 2 * (1 - e), W * e, H * e)));
  add(M, 'Zikzak silme', mask((c, e, W, H) => { const x = W * 1.2 * e, a = W * .04, n = 14; c.moveTo(0, 0); for (let i = 0; i <= n; i++) c.lineTo(x + (i % 2 ? a : -a), H * i / n); c.lineTo(0, H); c.closePath(); }));
  add(M, 'Dalgalı silme', mask((c, e, W, H) => { const x = W * 1.15 * e; c.moveTo(0, 0); for (let i = 0; i <= 40; i++) c.lineTo(x + Math.sin(i / 40 * PI * 4 + e * 8) * W * .04, H * i / 40); c.lineTo(0, H); c.closePath(); }));
  add(M, 'Güneş ışınları', mask((c, e, W, H) => { const R = Math.hypot(W, H), n = 16; for (let i = 0; i < n; i++) { const a = i / n * PI * 2, w = PI / n * e; c.moveTo(W / 2, H / 2); c.arc(W / 2, H / 2, R, a - w, a + w); c.closePath(); } }));
  add(M, 'Halka dalgaları', mask((c, e, W, H) => { const R = Math.hypot(W, H) / 2, n = 8; for (let i = 0; i < n; i++) { const r0 = R * i / n, r1 = r0 + R / n * cl(e * 1.6 - i / n * .6); c.moveTo(W / 2 + r1, H / 2); c.arc(W / 2, H / 2, r1, 0, PI * 2); c.moveTo(W / 2 + r0, H / 2); c.arc(W / 2, H / 2, r0, 0, PI * 2, true); } }, { edge: false }));
  add(M, 'Rastgele kareler', cells(16, 9, (x, y, c, r, R) => R()));
  add(M, 'Yağmur damlaları', mask((c, e, W, H, st) => { if (!st.dr) { const r = rng(21); st.dr = Array.from({ length: 40 }, () => [r() * W, r() * H, r() * .5]); }
    st.dr.forEach(([x, y, d]) => { const rr = cl((e - d) / .5) * Math.max(W, H) * .32; if (rr > 0) { c.moveTo(x + rr, y); c.arc(x, y, rr, 0, PI * 2); } }); }, { edge: false, ease: E.out }));
  add(M, 'Mürekkep lekesi', mask((c, e, W, H, st) => { if (!st.nz) { const r = rng(9); st.nz = Array.from({ length: 48 }, () => .7 + r() * .6); } const R = Math.hypot(W, H) * .62 * e;
    st.nz.forEach((k, i) => { const a = i / st.nz.length * PI * 2, rr = R * k * (1 + .15 * Math.sin(i * 3 + e * 6)); i ? c.lineTo(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr) : c.moveTo(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr); }); c.closePath(); }, { color: '#7a5cff' }));
  add(M, 'Fırça darbeleri', mask((c, e, W, H) => { const n = 6, h = H / n; for (let i = 0; i < n; i++) { const p = cl(e * n - i), y = i * h; if (p <= 0) continue; const ltr = i % 2 === 0, w = W * p;
      c.moveTo(ltr ? 0 : W, y); for (let k = 0; k <= 20; k++) { const x = (ltr ? 0 : W) + (ltr ? 1 : -1) * w * k / 20; c.lineTo(x, y - h * .12 * Math.sin(k)); } for (let k = 20; k >= 0; k--) { const x = (ltr ? 0 : W) + (ltr ? 1 : -1) * w * k / 20; c.lineTo(x, y + h * 1.15 + h * .12 * Math.cos(k)); } c.closePath(); } }, { edge: false, ease: t => t }));
  add(M, 'Spiral açılım', cells(16, 9, (x, y, C, R) => { const dx = x - (C - 1) / 2, dy = y - (R - 1) / 2; return Math.max(Math.abs(dx) / C, Math.abs(dy) / R) * 10 + (Math.atan2(dy, dx) + PI) / (2 * PI); }));
  add(M, 'Merdiven', cells(12, 7, (x, y) => x + (6 - y)));
  add(M, 'Tetris dolumu', cells(12, 7, (x, y, C, R, r) => (R - y) * 2 + r() * 3));
  add(M, 'Tiyatro perdesi', (ctx, src, t, W, H) => { full(ctx, src, W, H); const e = E.inOut(t), w = W / 2 * (1 - e); if (w <= 0) return; ctx.save();
    [[0, 1], [W, -1]].forEach(([x0, dir]) => { const g = ctx.createLinearGradient(0, 0, W / 14, 0); g.addColorStop(0, '#5b0b16'); g.addColorStop(.5, '#a3172a'); g.addColorStop(1, '#5b0b16'); g.setTransform && 0;
      ctx.save(); ctx.translate(dir > 0 ? x0 : x0 - w, 0); ctx.fillStyle = '#7d1020'; ctx.fillRect(0, 0, w, H); for (let i = 0; i < w; i += W / 14) { ctx.save(); ctx.translate(i, 0); ctx.fillStyle = g; ctx.globalAlpha = .7; ctx.fillRect(0, 0, W / 14, H); ctx.restore(); } ctx.restore(); });
    ctx.fillStyle = '#d4a017'; ctx.fillRect(0, 0, W, H * .02); ctx.restore(); }, { dur: 1.6 });
  // 4. Parça ve karo
  const T = 'Parça ve karo';
  add(T, 'Kayan şeritler', tiles(1, 10, (t, c, W) => ({ x: (1 - E.out(t)) * W * (c.y % 2 ? 1 : -1) }), (x, y) => y / 12));
  add(T, 'Dikey kayan şeritler', tiles(14, 1, (t, c, W, H) => ({ y: (1 - E.out(t)) * H * (c.x % 2 ? 1 : -1) }), x => x / 16));
  add(T, 'Mozaik çevrilme', tiles(12, 7, t => ({ sx: Math.max(.01, Math.sin(E.out(t) * PI / 2)), f: `brightness(${.5 + t / 2})` })));
  add(T, 'Dağınık karolar', tiles(10, 6, (t, c, W, H) => { const e = E.out(t); return { x: (1 - e) * (c.r1 - .5) * W * 1.4, y: (1 - e) * (c.r2 - .5) * H * 1.4, r: (1 - e) * (c.r3 - .5) * 6, a: t * 2 }; }, (x, y, C, R, r) => r() * .4));
  add(T, 'Kırık cam', tiles(9, 6, (t, c, W, H) => { const e = E.quint(t); return { x: (1 - e) * (c.r1 - .5) * W * .5, y: (1 - e) * (c.r2 - .5) * H * .5, r: (1 - e) * (c.r3 - .5) * 2, s: lerp(1.6, 1, e), f: `brightness(${1 + (1 - e)})`, a: e * 1.5 }; }, (x, y, C, R, r) => r() * .2));
  add(T, 'Yapboz yağmuru', tiles(10, 6, (t, c, W, H) => ({ y: (1 - E.bounce(t)) * -H * 1.2 }), (x, y, C, R, r) => x / C * .6 + r() * .3), { dur: 1.4 });
  add(T, 'Domino karolar', tiles(12, 7, t => ({ sy: Math.max(.01, Math.sin(E.back(t) * PI / 2)) }), (x, y, C, R) => (x + y) / (C + R)));
  add(T, 'Pikselden netleşme', (ctx, src, t, W, H, st) => { if (t >= 1) return full(ctx, src, W, H); const e = E.out(t), px = Math.max(1, Math.round(lerp(W / 6, 1, e)));
    if (!st.tmp) st.tmp = document.createElement('canvas'); const s = st.tmp; s.width = Math.max(1, Math.ceil(W / px)); s.height = Math.max(1, Math.ceil(H / px)); s.getContext('2d').drawImage(src, 0, 0, s.width, s.height);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = cl(t * 3); ctx.drawImage(s, 0, 0, W, H); ctx.restore(); });
  add(T, 'Kum düşüşü', tiles(24, 1, (t, c, W, H) => ({ y: (1 - E.bounce(t)) * -H }), (x, y, C, R, r) => r() * .7));
  add(T, 'Dört köşeden birleşme', tiles(2, 2, (t, c, W, H) => { const e = E.back(t); return { x: (1 - e) * (c.x ? W : -W) * .6, y: (1 - e) * (c.y ? H : -H) * .6, r: (1 - e) * (c.x === c.y ? .4 : -.4) }; }, () => 0));
  add(T, 'Dönen karolar', tiles(10, 6, t => ({ r: (1 - E.out(t)) * PI * 2, s: E.back(t) }), (x, y, C, R) => (x / C + y / R) / 2));
  add(T, 'Akordeon', tiles(16, 1, t => ({ sx: E.back(t) }), x => x / 18));
  add(T, '3B panjur', tiles(1, 12, t => ({ sy: Math.max(.01, Math.sin(E.out(t) * PI / 2)), f: `brightness(${.4 + .6 * t})` }), (x, y) => y / 14));
  add(T, 'Rubik küpü', tiles(8, 5, t => ({ sx: Math.max(.01, Math.abs(Math.cos((1 - E.out(t)) * PI))), f: t < .5 ? 'hue-rotate(160deg) saturate(2)' : '' }), (x, y, C, R, r) => r() * .6));
  add(T, 'Patlayan bloklar', tiles(12, 7, (t, c, W, H) => { const e = E.elastic(t); return { s: e, r: (1 - cl(t * 1.5)) * .8 }; }, (x, y, C, R) => Math.hypot(x - C / 2, y - R / 2) / Math.hypot(C / 2, R / 2)), { dur: 1.3 });
  // 5. Parçacık
  const P = 'Parçacık';
  add(P, 'Toz bulutundan oluşma', particles((p, W, H, r) => ({ sx: r() * W, sy: r() * H, delay: r() * .25 })), { dur: 1.8 });
  add(P, 'Patlamanın tersi', particles((p, W, H, r) => { const a = r() * PI * 2, d = Math.hypot(W, H) * (.6 + r()); return { sx: W / 2 + Math.cos(a) * d, sy: H / 2 + Math.sin(a) * d, delay: r() * .15 }; }, { ease: E.quint }), { dur: 1.6 });
  add(P, 'Girdap', particles((p, W, H, r) => ({ sx: 0, sy: 0, ang: r() * PI * 2, rad: Math.hypot(W, H) * .6 }), { path: (p, e, W, H) => { const a = p.ang + (1 - e) * 8, rr = p.rad * (1 - e); return [lerp(W / 2 + Math.cos(a) * rr, p.tx, e * e), lerp(H / 2 + Math.sin(a) * rr, p.ty, e * e)]; } }), { dur: 2 });
  add(P, 'Yağmur gibi yağma', particles((p, W, H, r) => ({ sx: p.tx, sy: -r() * H * .5 - 10, delay: p.tx / W * .4 + r() * .1 }), { ease: E.bounce }), { dur: 1.8 });
  add(P, 'Kum saati', particles((p, W, H, r) => ({ sx: W / 2 + (r() - .5) * W * .05, sy: -10, delay: (1 - p.ty / H) * .45 + r() * .1 }), { ease: E.out }), { dur: 2 });
  add(P, 'Mıknatıs akışı', particles((p, W, H, r) => ({ sx: -20, sy: H / 2 + (r() - .5) * H * .3, delay: p.tx / W * .5 }), { ease: E.out }), { dur: 1.8 });
  add(P, 'Yıldız tozu', particles((p, W, H, r) => ({ sx: p.tx + (r() - .5) * 60, sy: p.ty + (r() - .5) * 60, delay: r() * .6 }), { size: e => 1 + (1 - e) * 1.5, glow: true }), { dur: 1.8 });
  add(P, 'Havai fişek', particles((p, W, H, r) => { const k = Math.floor(r() * 3), cx = W * (.25 + k * .25), cy = H * .3; return { cx, cy, sx: cx, sy: H + 20, delay: k * .12 }; },
    { path: (p, e, W, H) => { if (e < .35) { const k = e / .35; return [p.cx, lerp(H + 10, p.cy, E.out(k))]; } const k = E.out((e - .35) / .65); return [lerp(p.cx, p.tx, k), lerp(p.cy, p.ty, k) + Math.sin(k * PI) * 30]; }, glow: true }), { dur: 2.2 });
  add(P, 'Galaksi', particles((p, W, H, r) => ({ ang: Math.atan2(p.ty - H / 2, p.tx - W / 2) + PI * 2, rad: Math.hypot(p.tx - W / 2, p.ty - H / 2) }),
    { path: (p, e, W, H) => { const a = lerp(p.ang + PI * 3, Math.atan2(p.ty - H / 2, p.tx - W / 2), e), rr = p.rad * (.3 + .7 * e); return [W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr]; } }), { dur: 2 });
  add(P, 'Kar fırtınası', particles((p, W, H, r) => ({ sx: W + r() * W * .5, sy: r() * H, delay: r() * .3 }), { path: (p, e, W, H) => [lerp(p.sx, p.tx, e), lerp(p.sy, p.ty, e) + Math.sin(e * 12 + p.r1 * 9) * 18 * (1 - e)] }), { dur: 2 });
  add(P, 'Kuş sürüsü', particles((p, W, H, r) => ({ sx: -30, sy: H * r(), c1x: W * r(), c1y: H * (r() * 1.6 - .3), delay: r() * .3 }),
    { path: (p, e) => { const u = 1 - e; return [u * u * p.sx + 2 * u * e * p.c1x + e * e * p.tx, u * u * p.sy + 2 * u * e * p.c1y + e * e * p.ty]; } }), { dur: 2 });
  add(P, 'Kum fırtınası', particles((p, W, H, r) => ({ sx: p.tx + (r() - .2) * W * .8, sy: p.ty + (r() - .5) * H * .3, delay: (1 - p.tx / W) * .35 }), { ease: E.out, size: e => .6 + e * .4 }), { dur: 1.8 });
  // 6. Işık ve bilim kurgu
  const I = 'Işık ve bilim kurgu';
  add(I, 'Altın ışık süpürmesi', (ctx, src, t, W, H) => { fadeIn(ctx, src, t, W, H, cl(t * 2)); const x = lerp(-W * .4, W * 1.4, t); ctx.save(); ctx.globalCompositeOperation = 'source-atop'; const g = ctx.createLinearGradient(x - W * .15, 0, x + W * .15, H * .3);
    g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, 'rgba(255,240,200,.75)'); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }, { dur: 1.4 });
  add(I, 'Spot ışığı', (ctx, src, t, W, H) => { if (t > .75) return fadeIn(ctx, src, t, W, H, 1); const x = W * (.2 + .6 * Math.sin(t * 5) * .5 + .3), y = H * (.5 + Math.cos(t * 7) * .25), r = lerp(W * .12, W * .9, cl((t - .5) / .25));
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); ctx.clip(); full(ctx, src, W, H); ctx.restore(); ctx.save(); const g = ctx.createRadialGradient(x, y, r * .6, x, y, r); g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(1, 'rgba(255,240,200,.25)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); ctx.fill(); ctx.restore(); }, { dur: 2 });
  add(I, 'Neon yanması', (ctx, src, t, W, H) => { const fl = t < .6 ? ((Math.sin(t * 90) > .2 ? 1 : .15) * (t < .1 ? 0 : 1)) : 1; ctx.save(); ctx.globalAlpha = fl; ctx.filter = `drop-shadow(0 0 ${W / 80}px ${CYAN}) brightness(${1 + (1 - t) * .6})`; full(ctx, src, W, H); ctx.restore(); }, { dur: 1.5 });
  add(I, 'Hologram', (ctx, src, t, W, H) => { const e = E.out(t); ctx.save(); ctx.globalAlpha = (t < .7 ? .55 + Math.random() * .25 : lerp(.8, 1, (t - .7) / .3)); ctx.filter = t < .8 ? 'sepia(1) hue-rotate(150deg) saturate(3) brightness(1.2)' : ''; full(ctx, src, W, H); ctx.restore();
    if (t < .85) { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.5); const sy = H * e; const g = ctx.createLinearGradient(0, sy - 40, 0, sy); g.addColorStop(0, 'rgba(95,227,255,0)'); g.addColorStop(1, 'rgba(95,227,255,.6)'); ctx.fillStyle = g; ctx.fillRect(0, sy - 40, W, 40); ctx.restore(); } }, { dur: 1.8 });
  add(I, 'Dijital bozulma (glitch)', (ctx, src, t, W, H) => { if (t > .85) return full(ctx, src, W, H); const r = rng(1 + Math.floor(t * 30)), k = 1 - t;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; [['#f00', -1], ['#0ff', 1]].forEach(([c, d]) => { ctx.save(); ctx.globalAlpha = .6; ctx.filter = c === '#f00' ? 'sepia(1) saturate(8) hue-rotate(-40deg)' : 'sepia(1) saturate(8) hue-rotate(140deg)'; ctx.drawImage(src, 0, 0, src.width, src.height, d * W * .015 * k * 3, 0, W, H); ctx.restore(); }); ctx.restore();
    for (let i = 0; i < 8; i++) { const y = r() * H, h = r() * H * .08, dx = (r() - .5) * W * .15 * k; ctx.drawImage(src, 0, y / H * src.height, src.width, h / H * src.height, dx, y, W, h); } }, { dur: 1.2 });
  add(I, 'Eski televizyon açılışı', (ctx, src, t, W, H) => { if (t < .35) { const k = t / .35; ctx.save(); ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 30; const w = W * E.out(k); ctx.fillRect((W - w) / 2, H / 2 - 1.5, w, 3); ctx.restore(); return; }
    const k = E.out((t - .35) / .65); ctx.save(); ctx.translate(0, H / 2 * (1 - k)); ctx.scale(1, Math.max(.01, k)); ctx.filter = `brightness(${1 + (1 - k) * 2})`; full(ctx, src, W, H); ctx.restore(); }, { dur: 1.2 });
  add(I, 'Eski film', (ctx, src, t, W, H) => { const k = cl((t - .6) / .4), r = rng(3 + Math.floor(t * 24)); ctx.save(); ctx.globalAlpha = cl(t * 3) * (t < .6 ? .75 + r() * .25 : 1); ctx.filter = `sepia(${1 - k}) contrast(${1.3 - .3 * k})`; ctx.drawImage(src, 0, 0, src.width, src.height, 0, (1 - k) * (r() - .5) * 6, W, H); ctx.restore();
    if (k < 1) { ctx.save(); ctx.globalAlpha = .5 * (1 - k); ctx.fillStyle = '#000'; for (let i = 0; i < 3; i++) ctx.fillRect(r() * W, 0, 1.5, H); for (let i = 0; i < 40; i++) ctx.fillRect(r() * W, r() * H, 2, 2); ctx.restore(); } }, { dur: 1.8 });
  add(I, 'Şimşek', (ctx, src, t, W, H) => { const fl = [.1, .14, .3, .33].some(x => Math.abs(t - x) < .025); fadeIn(ctx, src, t, W, H, t < .3 ? (fl ? 1 : 0) : cl((t - .3) * 3)); if (fl) { ctx.save(); ctx.fillStyle = 'rgba(220,235,255,.65)'; ctx.fillRect(0, 0, W, H); ctx.restore(); } }, { dur: 1.4 });
  add(I, 'Lens parlaması', (ctx, src, t, W, H) => { fadeIn(ctx, src, t, W, H, cl(t * 1.6)); if (t > .95) return; const x = lerp(-W * .2, W * 1.2, E.inOut(t)), y = H * .25; ctx.save(); ctx.globalCompositeOperation = 'lighter';
    [[1, 90, .5], [.4, 30, .3], [-.3, 50, .2], [-.7, 20, .35]].forEach(([k, r, a]) => { const px = W / 2 + (x - W / 2) * k, py = H / 2 + (y - H / 2) * k, g = ctx.createRadialGradient(px, py, 0, px, py, r * W / 600); g.addColorStop(0, `rgba(255,230,170,${a})`); g.addColorStop(1, 'rgba(255,230,170,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r * W / 600, 0, PI * 2); ctx.fill(); });
    ctx.fillStyle = 'rgba(255,240,210,.35)'; ctx.fillRect(x - W * .4, y - 1, W * .8, 2); ctx.restore(); }, { dur: 1.6 });
  add(I, 'Tanrı ışınları', (ctx, src, t, W, H) => { fadeIn(ctx, src, t, W, H, cl(t * 1.5)); if (t > .95) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin(t * PI) * .5;
    for (let i = 0; i < 9; i++) { const x = W * (i / 8) + Math.sin(t * 3 + i) * 20, g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,235,180,.5)'); g.addColorStop(1, 'rgba(255,235,180,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(W / 2, -20); ctx.lineTo(x - 15, H); ctx.lineTo(x + 15, H); ctx.closePath(); ctx.fill(); } ctx.restore(); }, { dur: 1.8 });
  add(I, 'Lazer taraması', (ctx, src, t, W, H) => { const y = H * E.inOut(t); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, y); ctx.clip(); full(ctx, src, W, H); ctx.restore(); if (t < 1) { ctx.save(); ctx.strokeStyle = '#ff2d55'; ctx.lineWidth = 2; ctx.shadowColor = '#ff2d55'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.restore(); } }, { dur: 1.5 });
  add(I, 'Dijital yağmurdan belirme', (ctx, src, t, W, H, st) => { fadeIn(ctx, src, t, W, H, cl((t - .35) * 1.6)); if (t > .95) return; const fs = Math.max(10, W / 60); if (!st.cols) { const r = rng(4); st.cols = Array.from({ length: Math.ceil(W / fs) }, () => r()); }
    ctx.save(); ctx.font = fs + 'px monospace'; ctx.globalAlpha = 1 - cl((t - .6) / .35); const ch = 'アカサタナハマヤラワ0123456789₺%'; st.cols.forEach((o, i) => { const head = (t * 2.2 + o) * H; for (let k = 0; k < 14; k++) { const y = head - k * fs; if (y < 0 || y > H) continue; ctx.fillStyle = k ? `rgba(57,255,20,${1 - k / 14})` : '#d9ffd0'; ctx.fillText(ch[(i * 7 + k * 3 + Math.floor(t * 20)) % ch.length], i * fs, y); } }); ctx.restore(); }, { dur: 2 });
  add(I, 'Elektrik akımı', (ctx, src, t, W, H) => { fadeIn(ctx, src, t, W, H, cl((t - .2) * 1.5)); if (t > .8) return; const r = rng(5 + Math.floor(t * 40)); ctx.save(); ctx.strokeStyle = '#bfe9ff'; ctx.shadowColor = CYAN; ctx.shadowBlur = 15; ctx.lineWidth = 2; ctx.globalAlpha = 1 - t;
    for (let b = 0; b < 3; b++) { let x = 0, y = r() * H; ctx.beginPath(); ctx.moveTo(x, y); while (x < W) { x += W / 20; y += (r() - .5) * H * .15; ctx.lineTo(x, y); } ctx.stroke(); } ctx.restore(); }, { dur: 1.4 });
  add(I, 'Kalp monitörü', (ctx, src, t, W, H) => { const x = W * E.inOut(t); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, H); ctx.clip(); full(ctx, src, W, H); ctx.restore(); if (t >= 1) return; ctx.save(); ctx.strokeStyle = '#3dff8a'; ctx.shadowColor = '#3dff8a'; ctx.shadowBlur = 12; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let k = 0; k <= 60; k++) { const px = x - W * .25 + k / 60 * W * .25, ph = (px / W * 6) % 1, py = H / 2 - (ph > .45 && ph < .5 ? -H * .25 : ph > .5 && ph < .55 ? H * .3 : 0); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); ctx.restore(); }, { dur: 1.8 });
  add(I, 'Plazma halkası', (ctx, src, t, W, H) => { mask((c, e) => c.arc(W / 2, H / 2, Math.hypot(W, H) / 2 * e, 0, PI * 2), { edge: false })(ctx, src, t, W, H, {}); if (t > .98) return; const r = Math.hypot(W, H) / 2 * E.inOut(t); ctx.save(); ctx.lineWidth = W / 60; ctx.strokeStyle = '#b06bff'; ctx.shadowColor = '#e1b3ff'; ctx.shadowBlur = 30; ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, PI * 2); ctx.stroke(); ctx.restore(); }, { dur: 1.4 });
  add(I, 'Işınlanma', (ctx, src, t, W, H) => { const n = 30, h = H / n; for (let i = 0; i < n; i++) { const lt = cl((t - (i % 5) * .08 - i / n * .3) / .4); if (lt <= 0) continue; ctx.save(); ctx.globalAlpha = lt; ctx.filter = lt < 1 ? `brightness(${1 + (1 - lt) * 2})` : ''; ctx.drawImage(src, 0, i * src.height / n, src.width, src.height / n, (1 - E.out(lt)) * W * .3 * (i % 2 ? 1 : -1), i * h, W, h + 1); ctx.restore(); }
    if (t < .8) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(150,220,255,.12)'; ctx.fillRect(W * .1, 0, W * .8, H); ctx.restore(); } }, { dur: 1.6 });
  // 7. Renk ve filtre
  const R = 'Renk ve filtre';
  add(R, 'Siyah-beyazdan renge', filt(t => ({ f: `grayscale(${1 - E.inOut(t)})`, a: cl(t * 3), s: lerp(1.04, 1, t) })), { dur: 1.6 });
  add(R, 'Negatiften pozitife', filt(t => ({ f: `invert(${1 - E.inOut(t)})`, a: cl(t * 3) })), { dur: 1.4 });
  add(R, 'Gökkuşağı tonu', filt(t => ({ f: `hue-rotate(${(1 - E.out(t)) * 720}deg) saturate(${1 + (1 - t) * 2})`, a: cl(t * 3) })), { dur: 1.6 });
  add(R, 'Termal kamera', filt(t => { const k = E.inOut(t); return { f: `invert(${(1 - k) * .9}) hue-rotate(${(1 - k) * 180}deg) saturate(${1 + (1 - k) * 4}) contrast(${1 + (1 - k)})`, a: cl(t * 3) }; }), { dur: 1.6 });
  add(R, 'Röntgen', filt(t => { const k = E.inOut(t); return { f: `grayscale(${1 - k}) invert(${1 - k}) brightness(${1 + (1 - k) * .5}) sepia(${(1 - k) * .3}) hue-rotate(${(1 - k) * 160}deg)`, a: cl(t * 3) }; }), { dur: 1.6 });
  add(R, 'Rüya', filt(t => { const k = E.inOut(t); return { f: `blur(${(1 - k) * 8}px) brightness(${1 + (1 - k) * .8}) saturate(${1 + (1 - k) * 1.5})`, a: cl(t * 2), s: lerp(1.08, 1, k) }; }), { dur: 1.8 });
  add(R, 'Aşırı pozlama', filt(t => { const k = E.out(t); return { f: `brightness(${1 + (1 - k) * 6}) contrast(${1 + (1 - k)})`, a: 1 }; }), { dur: 1.2 });
  add(R, 'Karanlıktan aydınlığa', filt(t => ({ f: `brightness(${E.inOut(t)}) contrast(${1 + (1 - t) * .5})`, a: 1 })), { dur: 1.5 });
  add(R, 'Sulu boya', (ctx, src, t, W, H, st) => { const k = E.inOut(t); mask((c, e, W2, H2, s2) => { if (!s2.nz) { const r = rng(17); s2.nz = Array.from({ length: 6 }, () => [r() * W2, r() * H2, Array.from({ length: 30 }, () => .7 + r() * .6)]); }
      s2.nz.forEach(([x, y, n], j) => { const R = Math.hypot(W2, H2) * .45 * cl(e * 1.3 - j * .05); n.forEach((q, i) => { const a = i / n.length * PI * 2; i ? c.lineTo(x + Math.cos(a) * R * q, y + Math.sin(a) * R * q) : c.moveTo(x + Math.cos(a) * R * q, y + Math.sin(a) * R * q); }); c.closePath(); }); }, { edge: false, ease: t2 => t2 })(ctx, src, k, W, H, st);
    if (t < 1) { ctx.save(); ctx.globalAlpha = (1 - t) * .5; ctx.filter = 'blur(6px) saturate(2)'; ctx.globalCompositeOperation = 'source-atop'; full(ctx, src, W, H); ctx.restore(); } }, { dur: 2 });
  add(R, 'Altın varak', filt(t => { const k = E.inOut(t); return { f: `sepia(${1 - k}) saturate(${1 + (1 - k) * 3}) brightness(${1 + (1 - k) * .4}) hue-rotate(${(1 - k) * -10}deg)`, a: cl(t * 3) }; }), { dur: 1.6 });
  add(R, 'Buzlu cam', filt(t => { const k = E.out(t); return { f: `blur(${(1 - k) * 14}px) brightness(${1 + (1 - k) * .5}) saturate(${k})`, a: cl(t * 2) }; }), { dur: 1.4 });

  // Grafik içi hareketle birlikte çalışan "canlı" kategoriler (grafik büyürken efekt)
  L.push({ cat: 'Yok', n: 'Yok', fn: null });
  const LIST = L, BY = Object.fromEntries(L.map(x => [x.n, x]));

  // ---------- oynatıcı ----------
  function render(buf, src, name, t, st) {
    const fx = BY[name]; const ctx = buf.getContext('2d'); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, buf.width, buf.height);
    try { if (!fx || !fx.fn || t >= 1) full(ctx, src, buf.width, buf.height); else fx.fn(ctx, src, cl(t), buf.width, buf.height, st); } catch (e) { console.error('fx', name, e); full(ctx, src, buf.width, buf.height); }
    ctx.restore();
  }
  const durOf = (name, speed) => Math.round((BY[name] && BY[name].dur || 1) * 1200 * (speed || 1));
  const runs = new WeakMap();
  // grafik kutusu üzerinde canlı oynat (chart: echarts örneği, option: çizilecek seçenek)
  function play(el, chart, option, name, speed) {
    const old = runs.get(el); if (old) old.stop();
    if (!BY[name] || !BY[name].fn) { if (chart && option) { chart.clear(); chart.setOption(option, true); } return; }
    if (chart && option) { chart.clear(); chart.setOption(Object.assign({}, option, { animation: false }), true); }
    const src = el.querySelector('canvas'); if (!src) return;
    const buf = document.createElement('canvas'); buf.width = src.width; buf.height = src.height; buf.className = 'fx-layer';
    buf.style.cssText = `position:absolute;left:${src.offsetLeft}px;top:${src.offsetTop}px;width:${src.style.width || src.offsetWidth + 'px'};height:${src.style.height || src.offsetHeight + 'px'};pointer-events:none;z-index:2`;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(buf); src.style.opacity = '0';
    const st = {}, dur = durOf(name, speed); let t0 = 0; let raf = 0, stopped = false;
    const stop = () => { if (stopped) return; stopped = true; cancelAnimationFrame(raf); buf.remove(); src.style.opacity = ''; runs.delete(el); };
    const tick = () => { if (!t0) t0 = performance.now(); const t = (performance.now() - t0) / dur; render(buf, src, name, t, st); if (t < 1) raf = requestAnimationFrame(tick); else stop(); };
    runs.set(el, { stop }); requestAnimationFrame(() => requestAnimationFrame(() => { if (!stopped) tick(); }));
  }
  // önizleme için örnek grafik tuvali
  let SAMPLE = null;
  function sample() {
    if (SAMPLE) return SAMPLE; const c = document.createElement('canvas'); c.width = 240; c.height = 140; const x = c.getContext('2d');
    x.fillStyle = '#0a1630'; x.fillRect(0, 0, 240, 140); x.strokeStyle = 'rgba(120,160,230,.2)'; for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(12, i * 26); x.lineTo(232, i * 26); x.stroke(); }
    const v = [.45, .7, .55, .9, .65, .8, .5, .95]; v.forEach((h, i) => { const g = x.createLinearGradient(0, 130 - h * 110, 0, 130); g.addColorStop(0, i % 2 ? '#5fb8f0' : '#f2d68a'); g.addColorStop(1, 'rgba(10,22,48,.4)'); x.fillStyle = g; x.fillRect(18 + i * 27, 130 - h * 110, 18, h * 110); });
    x.strokeStyle = '#5dcaa5'; x.lineWidth = 2.5; x.beginPath(); v.forEach((h, i) => { const px = 27 + i * 27, py = 125 - h * 95; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
    return SAMPLE = c;
  }
  G.FX = { LIST, BY, render, play, durOf, sample, CATS: [...new Set(L.filter(x => x.fn).map(x => x.cat))] };
})(typeof window !== 'undefined' ? window : globalThis);
