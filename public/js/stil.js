// Grafik görünüm ayarları: stil uygulama + ayar paneli
(function (G) {
  const PALETS = {
    'Varsayılan': null,
    'Tema': 'theme',
    'Gece altını': ['#f2d68a', '#c9a24a', '#5fb8f0', '#3b7cb8', '#e9c46a', '#9fc7ea', '#8a6e2f', '#2e5c8a'],
    'Neon': ['#3fd0ff', '#b46bff', '#ff5fa2', '#5dffb0', '#ffd23f', '#5f7bff', '#ff8a3d', '#2ee6d6'],
    'Okyanus': ['#5fb8f0', '#2e86c1', '#76d7c4', '#1abc9c', '#a9cce3', '#21618c', '#48c9b0', '#d6eaf8'],
    'Gün batımı': ['#ff9a5a', '#ff6b6b', '#ffd166', '#f78fb3', '#e76f51', '#f4a261', '#c44569', '#ffb4a2'],
    'Zümrüt': ['#5dcaa5', '#1d9e75', '#9fe1cb', '#0f6e56', '#c9f2e0', '#3fb68b', '#085041', '#e1f5ee'],
    'HARIBO': ['#e3001b', '#ffd500', '#0055a4', '#ff7f00', '#00a651', '#8b1e3f', '#ffffff', '#ffb3c1'],
    'Grafit': ['#eaf0fa', '#b5c3dc', '#7f93b8', '#5d7096', '#9fb0cf', '#40537a', '#c9d4e8', '#2c3a59'],
    'Tek renk (ton)': 'mono'
  };
  // 30 animasyon: hareket eğrisi (e) + sıralama deseni (d) + hız çarpanı (k)
  const rnd = i => ((i * 9301 + 49297) % 233280) / 233280;
  const D = { none: null, seq: i => i * 80, rev: i => Math.max(0, 11 - i) * 80, rand: i => rnd(i) * 600, center: i => Math.abs(i - 5.5) * 90,
    wave: i => (Math.sin(i * .9) + 1) * 260, domino: i => i * 130, stairs: i => Math.floor(i / 3) * 220, fast: i => i * 35 };
  const ANIMS = [
    ['Yükselme', 'cubicOut'], ['Yumuşak yükselme', 'sinusoidalOut'], ['Hızlı başlangıç', 'exponentialOut'], ['Ağır çekim', 'quinticInOut', 'none', 1.8],
    ['Sırayla', 'cubicOut', 'seq'], ['Tersten sırayla', 'cubicOut', 'rev'], ['Rastgele', 'cubicOut', 'rand'], ['Ortadan dışa', 'quarticOut', 'center'],
    ['Dalga', 'sinusoidalOut', 'wave'], ['Zıplama', 'elasticOut'], ['Yaylanma', 'backOut'], ['Top sekmesi', 'bounceOut'],
    ['Sırayla zıplama', 'elasticOut', 'seq'], ['Sırayla sekme', 'bounceOut', 'seq'], ['Sırayla yaylanma', 'backOut', 'seq'], ['Doğrusal', 'linear'],
    ['Hızlanarak', 'cubicIn'], ['Yavaşlayarak', 'quarticOut'], ['Dairesel', 'circularOut'], ['Kademeli', 'quadraticInOut', 'stairs'],
    ['Patlama', 'backOut', 'none', .55, true], ['Şimşek', 'exponentialOut', 'fast', .45], ['Süzülme', 'sinusoidalInOut', 'none', 2], ['Elastik dalga', 'elasticOut', 'wave'],
    ['Domino', 'linear', 'domino'], ['Yağmur', 'bounceOut', 'rand'], ['Nefes', 'sinusoidalInOut', 'center', 1.4, true], ['Kuyruklu yıldız', 'circularOut', 'rev', 1.2],
    ['Soluklaşma', 'linear', 'none', 1.3], ['Yok']
  ].map(([n, e, d, k, pieScale]) => ({ n, e, d: D[d || 'none'], k: k || 1, pieScale: !!pieScale }));
  const ANIM = Object.fromEntries(ANIMS.map(a => [a.n, a]));
  const DEF = { palette: 'Varsayılan', hue: 42, sat: 80, light: 70, gradient: 40, opacity: 100, glow: 0, colorByData: false,
    radius: 6, barWidth: 44, lineWidth: 3, smooth: true, symbolSize: 7, labels: true, grid: true, legend: true, fontSize: 12,
    topN: 0, sort: 'desc', anim: 'Yükselme', speed: 900, kind: '', title: '', sub: '' };

  const hsl = (h, s, l, a) => `hsla(${Math.round(h)},${Math.round(s)}%,${Math.round(Math.max(3, Math.min(97, l)))}%,${a === undefined ? 1 : a})`;
  function palette(s) {
    const p = PALETS[s.palette];
    if (p === 'mono') return Array.from({ length: 8 }, (_, i) => hsl(s.hue, s.sat, s.light - i * 7 + (i % 2) * 3));
    if (p === 'theme') return (typeof window !== 'undefined' && window.__THEME_COLORS) || null;
    if (Array.isArray(p)) return p;
    return null;
  }
  // hex/hsla -> hsla with lightness shift (for gradient ends)
  function shade(c, dl, a) {
    let h, s, l;
    if (c.startsWith('#')) {
      const n = c.length === 4 ? c.slice(1).split('').map(x => x + x).join('') : c.slice(1, 7);
      let r = parseInt(n.slice(0, 2), 16) / 255, g = parseInt(n.slice(2, 4), 16) / 255, b = parseInt(n.slice(4, 6), 16) / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b); l = (mx + mn) / 2;
      if (mx === mn) { h = 0; s = 0; } else { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
        h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
      s *= 100; l *= 100;
    } else { const m = c.match(/hsla?\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%/); if (!m) return c; h = +m[1]; s = +m[2]; l = +m[3]; }
    return hsl(h, s, l + dl, a);
  }
  const grad = (c, g, op, vertical) => g <= 0 ? shade(c, 0, op) : ({ type: 'linear', x: 0, y: 0, x2: vertical ? 0 : 1, y2: vertical ? 1 : 0,
    colorStops: [{ offset: 0, color: shade(c, g / 4, op) }, { offset: 1, color: shade(c, -g / 2.2, op) }] });

  // chart kinds that can be switched
  const KINDS = { cat: ['Sütun', 'Yatay bar', 'Çizgi', 'Alan'], pie: ['Halka', 'Pasta', 'Gül (rose)'] };
  function kindGroup(opt) {
    const s = opt.series || [];
    if (s.length && s.every(x => x.type === 'pie')) return 'pie';
    if (opt.yAxis && !Array.isArray(opt.yAxis) && s.length && s.every(x => (x.type === 'bar' || x.type === 'line') && !x.yAxisIndex) && !s.some(x => x.stack === 'w')) return 'cat';
    return null;
  }

  function applyStyle(opt, s) {
    s = Object.assign({}, DEF, s || {});
    const o = JSON.parse(JSON.stringify(opt, (k, v) => v)); // functions are dropped by JSON; restore below
    // restore formatter functions dropped by JSON
    (function copyFns(src, dst) { if (!src || typeof src !== 'object') return; for (const k in src) { if (typeof src[k] === 'function') dst[k] = src[k]; else if (src[k] && typeof src[k] === 'object' && dst[k]) copyFns(src[k], dst[k]); } })(opt, o);
    const pal = palette(s);
    const series = o.series || [];
    // chart kind switch
    const grp = kindGroup(o);
    if (grp === 'cat' && s.kind && KINDS.cat.includes(s.kind)) {
      const horiz = o.yAxis.type === 'category';
      const wantH = s.kind === 'Yatay bar';
      if (horiz !== wantH) { const t = o.xAxis; o.xAxis = o.yAxis; o.yAxis = t; if (wantH) { o.yAxis.axisLabel = Object.assign({}, o.yAxis.axisLabel, { rotate: 0 }); } }
      series.forEach(x => { x.type = s.kind === 'Çizgi' || s.kind === 'Alan' ? 'line' : 'bar';
        if (s.kind === 'Alan') x.areaStyle = x.areaStyle || { opacity: .35 }; else if (s.kind === 'Çizgi') delete x.areaStyle;
        if (x.label && x.label.position) x.label.position = wantH ? 'right' : 'top'; });
      if (s.kind === 'Alan' && o.xAxis.type === 'category') o.xAxis.boundaryGap = false;
    }
    if (grp === 'pie' && s.kind && KINDS.pie.includes(s.kind)) {
      series.forEach(x => { x.radius = s.kind === 'Halka' ? ['48%', '74%'] : '72%'; x.roseType = s.kind === 'Gül (rose)' ? 'radius' : undefined; });
      if (s.kind !== 'Halka' && o.title) o.title = { show: false };
    }
    // colors
    if (pal) {
      o.color = pal;
      series.forEach((x, i) => {
        const c = pal[i % pal.length];
        if (x.itemStyle) delete x.itemStyle.color;
        if (x.lineStyle) delete x.lineStyle.color;
        if (Array.isArray(x.data)) x.data.forEach(d => { if (d && typeof d === 'object' && d.itemStyle) delete d.itemStyle.color; });
        if (x.type === 'bar') { x.itemStyle = Object.assign({}, x.itemStyle); if (!s.colorByData) x.itemStyle.color = grad(c, s.gradient, s.opacity / 100, o.yAxis && o.yAxis.type !== 'category'); }
        if (x.type === 'line') { x.itemStyle = Object.assign({}, x.itemStyle, { color: c }); x.lineStyle = Object.assign({}, x.lineStyle, { color: c });
          if (x.areaStyle) x.areaStyle = { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: shade(c, 0, .45 * s.opacity / 100) }, { offset: 1, color: shade(c, 0, 0) }] } }; }
        if (x.type === 'gauge' && x.progress) x.progress.itemStyle = { color: grad(c, s.gradient, 1, true) };
        if (x.type === 'heatmap' && o.visualMap) o.visualMap.inRange = { color: ['#0f1f42', shade(pal[1] || c, -10), pal[1] || c, c] };
      });
    }
    series.forEach((x, i) => {
      const c = (pal || o.color || ['#f2d68a'])[i % (pal || o.color || ['#f2d68a']).length];
      if (x.type === 'bar') {
        x.barMaxWidth = s.barWidth; x.colorBy = s.colorByData ? 'data' : 'series';
        const horiz = o.yAxis && o.yAxis.type === 'category';
        const r = s.radius; x.itemStyle = Object.assign({}, x.itemStyle, { borderRadius: x.stack ? Math.min(r, 3) : (horiz ? [0, r, r, 0] : [r, r, 0, 0]) });
        if (Array.isArray(x.data)) x.data.forEach(d => { if (d && typeof d === 'object' && d.itemStyle) d.itemStyle.borderRadius = x.itemStyle.borderRadius; });
      }
      if (x.type === 'line') { x.smooth = s.smooth; x.symbolSize = s.symbolSize; x.lineStyle = Object.assign({}, x.lineStyle, { width: s.lineWidth }); }
      if (x.itemStyle || x.type === 'bar' || x.type === 'pie') {
        x.itemStyle = Object.assign({}, x.itemStyle, { opacity: s.opacity / 100 });
        if (s.glow > 0) Object.assign(x.itemStyle, { shadowBlur: s.glow * 3, shadowColor: shade(c, 10, .8) });
      }
      if (s.glow > 0 && x.type === 'line') x.lineStyle = Object.assign({}, x.lineStyle, { shadowBlur: s.glow * 3, shadowColor: shade(c, 10, .9) });
      if (x.label) x.label.show = s.labels && x.label.show !== false;
      else if (s.labels && (x.type === 'bar' || x.type === 'line') && series.length === 1) x.label = { show: true, position: 'top', color: '#eaf0fa', fontSize: s.fontSize - 1 };
      if (x.label) x.label.fontSize = s.fontSize;
    });
    // grid, legend, fonts
    const axes = [].concat(o.xAxis || [], o.yAxis || []);
    axes.forEach(a => { if (!a) return; a.axisLabel = Object.assign({}, a.axisLabel, { fontSize: s.fontSize }); if (a.type === 'value') a.splitLine = Object.assign({}, a.splitLine, { show: s.grid && (a.splitLine ? a.splitLine.show !== false || s.grid : true) }); });
    if (o.legend) o.legend.show = s.legend;
    if (o.radar) o.radar.axisName = Object.assign({}, o.radar.axisName, { fontSize: s.fontSize });
    o.textStyle = Object.assign({}, o.textStyle, { fontSize: s.fontSize });
    // animation
    const A = ANIM[s.anim] || ANIM['Yükselme'];
    if (A.n === 'Yok') o.animation = false;
    else {
      const dur = Math.round(s.speed * A.k), f = s.speed / 900;
      o.animation = true; o.animationDuration = dur; o.animationDurationUpdate = Math.min(600, dur); o.animationEasing = A.e;
      o.animationDelay = A.d ? (idx => Math.round(A.d(idx) * f)) : 0;
      series.forEach(x => { if (x.type === 'pie') x.animationType = A.pieScale ? 'scale' : 'expansion'; x.animationEasing = A.e; });
    }
    return o;
  }

  // ---------- drawer UI ----------
  let drawer = null;
  function ensureDrawer() {
    if (drawer) return drawer;
    drawer = document.createElement('div'); drawer.className = 'drawer';
    document.body.appendChild(drawer);
    return drawer;
  }
  function close() { if (drawer) drawer.classList.remove('open'); }

  function open(ctx) {
    // ctx: {name, kindGroup, style, onChange(style), onSave(style, all), onReset()}
    const d = ensureDrawer(); let s = Object.assign({}, DEF, ctx.style || {});
    const kinds = ctx.kindGroup ? KINDS[ctx.kindGroup] : null;
    const sel = (k, list) => `<select data-k="${k}">${list.map(x => `<option${String(s[k]) === String(x) ? ' selected' : ''}>${x}</option>`).join('')}</select>`;
    const rng = (k, label, min, max, step, unit) => `<label class="dr-r"><span>${label}</span><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step || 1}" value="${s[k]}"><b data-v="${k}">${s[k]}${unit || ''}</b></label>`;
    const tog = (k, label) => `<label class="dr-t"><input type="checkbox" data-k="${k}"${s[k] ? ' checked' : ''}><i></i><span>${label}</span></label>`;
    d.innerHTML = `<div class="dr-head"><div><b><i class="ti ti-adjustments"></i> Görünüm ayarları</b><small>${ctx.name}</small></div><button class="icon-btn" id="dr-x" title="Kapat"><i class="ti ti-x"></i></button></div>
      <div class="dr-body">
        ${kinds ? `<div class="dr-sec"><h4>Grafik tipi</h4><div class="seg" data-seg="kind">${['', ...kinds].map(k => `<span data-v="${k}" class="${s.kind === k ? 'on' : ''}">${k || 'Orijinal'}</span>`).join('')}</div></div>` : ''}
        <div class="dr-sec"><h4>Renk</h4>
          <div class="pals">${Object.keys(PALETS).map(n => `<button class="pal${s.palette === n ? ' on' : ''}" data-pal="${n}" title="${n}">${(PALETS[n] === 'theme' ? ((typeof window !== 'undefined' && window.__THEME_COLORS) || ['#f2d68a', '#5fb8f0', '#5dcaa5', '#c9a24a']) : PALETS[n] === 'mono' ? Array.from({ length: 4 }, (_, i) => hsl(s.hue, s.sat, s.light - i * 10)) : (PALETS[n] || ['#f2d68a', '#5fb8f0', '#5dcaa5', '#c9a24a'])).slice(0, 4).map(c => `<i style="background:${c}"></i>`).join('')}<span>${n}</span></button>`).join('')}</div>
          <div class="mono-box" style="${s.palette === 'Tek renk (ton)' ? '' : 'display:none'}">${rng('hue', 'Renk tonu', 0, 360)}${rng('sat', 'Doygunluk', 0, 100, 1, '%')}${rng('light', 'Parlaklık', 20, 90, 1, '%')}</div>
          ${rng('gradient', 'Renk geçişi', 0, 80)}${rng('opacity', 'Saydamlık', 20, 100, 1, '%')}${rng('glow', 'Işıltı', 0, 10)}${tog('colorByData', 'Her çubuk/dilim farklı renk')}</div>
        <div class="dr-sec"><h4>Şekil</h4>${rng('radius', 'Köşe yuvarlaklığı', 0, 24)}${rng('barWidth', 'Çubuk kalınlığı', 8, 90)}${rng('lineWidth', 'Çizgi kalınlığı', 1, 8)}${rng('symbolSize', 'Nokta boyutu', 0, 16)}${tog('smooth', 'Yumuşak çizgi')}</div>
        <div class="dr-sec"><h4>Yazı ve düzen</h4>
          <label class="dr-f"><span>Başlık</span><input data-k="title" value="${(s.title || '').replace(/"/g, '&quot;')}" placeholder="${ctx.name}"></label>
          <label class="dr-f"><span>Alt başlık</span><input data-k="sub" value="${(s.sub || '').replace(/"/g, '&quot;')}" placeholder="${ctx.sub || ''}"></label>
          ${rng('fontSize', 'Yazı boyutu', 9, 18)}${tog('labels', 'Değer etiketleri')}${tog('grid', 'Izgara çizgileri')}${tog('legend', 'Açıklama (lejant)')}</div>
        <div class="dr-sec"><h4>Veri</h4>
          <label class="dr-f"><span>Sıralama</span>${sel('sort', ['desc', 'asc', 'alpha'])}</label>
          ${rng('topN', 'Gösterilecek kalem (0 = otomatik)', 0, 20)}</div>
        <div class="dr-sec"><h4>Hareket</h4>
          <label class="dr-f"><span>Animasyon (30 seçenek)</span>${sel('anim', ANIMS.map(a => a.n))}</label>
          ${rng('speed', 'Hız (ms)', 200, 3000, 100)}<button class="btn ghost" id="dr-play" style="width:100%;justify-content:center;margin-top:6px"><i class="ti ti-player-play"></i> Animasyonu oynat</button></div>
      </div>
      <div class="dr-foot"><span class="msg" id="dr-msg"></span>
        <button class="btn ghost" id="dr-reset"><i class="ti ti-restore"></i> Sıfırla</button>
        <button class="btn ghost" id="dr-all"><i class="ti ti-copy"></i> Tümüne uygula</button>
        <button class="btn gold" id="dr-save"><i class="ti ti-device-floppy"></i> Kaydet</button></div>`;
    // the select for sort shows codes; relabel
    const so = d.querySelector('select[data-k=sort]'); [...so.options].forEach(o => o.textContent = { desc: 'Büyükten küçüğe', asc: 'Küçükten büyüğe', alpha: 'Alfabetik' }[o.value]);
    const changed = () => ctx.onChange(Object.assign({}, s));
    d.querySelectorAll('input[type=range]').forEach(i => i.oninput = () => { s[i.dataset.k] = +i.value; d.querySelector(`[data-v=${i.dataset.k}]`).textContent = i.value + (i.nextElementSibling.textContent.replace(/[\d.-]/g, '')); changed(); });
    d.querySelectorAll('input[type=checkbox]').forEach(i => i.onchange = () => { s[i.dataset.k] = i.checked; changed(); });
    d.querySelectorAll('input[data-k=title],input[data-k=sub]').forEach(i => i.oninput = () => { s[i.dataset.k] = i.value; changed(); });
    d.querySelectorAll('select').forEach(i => i.onchange = () => { s[i.dataset.k] = i.value; changed(); });
    d.querySelectorAll('[data-seg] span').forEach(x => x.onclick = () => { d.querySelectorAll('[data-seg] span').forEach(y => y.classList.toggle('on', y === x)); s.kind = x.dataset.v; changed(); });
    d.querySelectorAll('.pal').forEach(b => b.onclick = () => { d.querySelectorAll('.pal').forEach(y => y.classList.toggle('on', y === b)); s.palette = b.dataset.pal; d.querySelector('.mono-box').style.display = s.palette === 'Tek renk (ton)' ? '' : 'none'; changed(); });
    d.querySelector('#dr-x').onclick = close;
    d.querySelector('#dr-play').onclick = () => ctx.onPlay(Object.assign({}, s));
    const msg = d.querySelector('#dr-msg');
    d.querySelector('#dr-save').onclick = async () => { await ctx.onSave(Object.assign({}, s), false); msg.className = 'msg ok'; msg.textContent = 'Kaydedildi'; };
    d.querySelector('#dr-all').onclick = async () => { const c = Object.assign({}, s); delete c.title; delete c.sub; delete c.kind; await ctx.onSave(c, true); msg.className = 'msg ok'; msg.textContent = 'Tüm grafiklere uygulandı'; };
    d.querySelector('#dr-reset').onclick = async () => { await ctx.onReset(); close(); };
    requestAnimationFrame(() => d.classList.add('open'));
  }
  if (typeof document !== 'undefined') document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  G.Stil = { applyStyle, open, close, DEF, kindGroup, ANIMS };
})(typeof window !== 'undefined' ? window : globalThis);
