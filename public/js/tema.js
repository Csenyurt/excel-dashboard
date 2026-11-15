// Tema ve renk: 22 fotoğraflı tema, tüm dashboard'a uygulanır; renk/ton ince ayarı
(function (G) {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // id, ad, Wikimedia araması, [vurgu, ikinci vurgu, üçüncü], zemin karartma
  const THEMES = [
    ['klasik', 'Gece altını (varsayılan)', '', ['#f2d68a', '#5fb8f0', '#5dcaa5'], .72],
    ['uzay', 'Uzay', 'Pillars of Creation James Webb', ['#c9a7ff', '#5fd4f0', '#ff9ecf'], .55],
    ['formula', 'Formula', 'Formula One car race track', ['#ff2d2d', '#f5f5f5', '#ffc400'], .7],
    ['antikroma', 'Antik Roma', 'Roman Forum ruins Rome', ['#e3b261', '#b5482f', '#efe0c0'], .68],
    ['antikmisir', 'Antik Mısır', 'Karnak temple columns Luxor', ['#e9c46a', '#2a9d8f', '#f4a261'], .66],
    ['surreal', 'Sürrealistik', 'Salar de Uyuni reflection', ['#ff9de2', '#7ae7ff', '#fff59d'], .5],
    ['antiksavas', 'Antik dönem savaş', 'Roman legion reenactment', ['#d4a373', '#9b2226', '#e9d8a6'], .7],
    ['modernsavas', 'Modern savaş', 'Leopard 2 tank exercise', ['#a3b18a', '#dda15e', '#e9edc9'], .72],
    ['gokyuzu', 'Gökyüzü', 'cumulus clouds blue sky', ['#ffd166', '#8ecae6', '#ffffff'], .5],
    ['harita', 'Dünya haritası', 'antique world map 17th century', ['#e9c46a', '#8ab17d', '#f4a261'], .62],
    ['kadran', 'Yarış arabası kadranı', 'sports car instrument cluster speedometer', ['#ff6b35', '#4cc9f0', '#f72585'], .62],
    ['yazilim', 'Yazılım dünyası', 'source code computer screen programming', ['#61dafb', '#c792ea', '#c3e88d'], .7],
    ['dijital', 'Dijital yağmur', 'server room data center', ['#39ff14', '#00e5a0', '#b2ff59'], .82],
    ['kolezyum', 'Kolezyum', 'Colosseum Rome exterior', ['#f2c48d', '#c1666b', '#d4e09b'], .62],
    ['paris', 'Paris ve Eyfel', 'Eiffel Tower Paris Trocadero', ['#f7c873', '#8ecae6', '#ffafcc'], .6],
    ['roma', 'Roma', 'Trevi Fountain Rome', ['#e9c46a', '#e76f51', '#a8dadc'], .62],
    ['venedik', 'Venedik', 'Venice Grand Canal Rialto', ['#ffb703', '#219ebc', '#fb8500'], .58],
    ['kahire', 'Kahire', 'Cairo skyline Nile', ['#f4a261', '#e9c46a', '#2a9d8f'], .62],
    ['piramitler', 'Piramitler', 'Giza pyramids', ['#f6bd60', '#f28482', '#84a59d'], .55],
    ['istanbul', 'İstanbul', 'Istanbul Bosphorus Sultan Ahmed Mosque skyline', ['#f2d68a', '#e63946', '#5fb8f0'], .6],
    ['tokyo', 'Tokyo', 'Tokyo Shibuya night', ['#ff4d6d', '#4cc9f0', '#ffd60a'], .62],
    ['pekin', 'Pekin', 'Forbidden City Beijing', ['#e63946', '#ffb703', '#f1faee'], .62],
    ['newyork', 'New York ve Özgürlük Heykeli', 'Statue of Liberty Manhattan skyline', ['#7bdff2', '#f2d68a', '#b2f7ef'], .6]];
  const DEF = { id: 'klasik', n: 0, a1: null, a2: null, a3: null, hue: 0, sat: 100, light: 100, dim: null, blur: 0, custom: null };
  let T = Object.assign({}, DEF), rain = null;

  function hsl(hex) { let c = hex.replace('#', ''); const r = parseInt(c.slice(0, 2), 16) / 255, g = parseInt(c.slice(2, 4), 16) / 255, b = parseInt(c.slice(4, 6), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s * 100, l * 100]; }
  function toHex(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return '#' + [f(0), f(8), f(4)].map(x => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')).join(''); }
  const adj = (hex, t) => { const [h, s, l] = hsl(hex); return toHex((h + t.hue + 360) % 360, Math.min(100, s * t.sat / 100), Math.min(95, l * t.light / 100)); };
  const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
  const def = id => THEMES.find(x => x[0] === id) || THEMES[0];
  const photoUrl = t => { const d = def(t.id); return t.custom ? t.custom : d[2] ? `/api/photo?id=${d[0]}&n=${t.n || 0}&q=${encodeURIComponent(d[2])}` : ''; };
  function colors(t) { const d = def(t.id); return [t.a1 || d[3][0], t.a2 || d[3][1], t.a3 || d[3][2]].map(c => adj(c, t)); }

  function apply(t) {
    const [g, n, x] = colors(t), d = def(t.id), dim = t.dim ?? d[4];
    const r = document.documentElement.style;
    r.setProperty('--gold', g); r.setProperty('--gold2', adj(g, { hue: 0, sat: 100, light: 78 })); r.setProperty('--neon', n); r.setProperty('--acc3', x); r.setProperty('--dim', dim);
    G.__THEME_COLORS = [g, n, x, adj(g, { hue: 0, sat: 90, light: 70 }), adj(n, { hue: 0, sat: 90, light: 70 }), adj(x, { hue: 0, sat: 90, light: 70 }), adj(g, { hue: 30, sat: 100, light: 100 }), adj(n, { hue: -30, sat: 100, light: 100 })];
    let bg = document.getElementById('themebg'); if (!bg) { bg = document.createElement('div'); bg.id = 'themebg'; document.body.insertBefore(bg, document.querySelector('.app')); }
    const url = photoUrl(t); bg.style.filter = t.blur ? `blur(${t.blur}px)` : '';
    if (url) { const im = new Image(); im.onload = () => { bg.style.backgroundImage = `url("${url}")`; bg.classList.add('on'); }; im.onerror = () => bg.classList.remove('on'); im.src = url; } else bg.classList.remove('on');
    let st = document.getElementById('theme-css'); if (!st) { st = document.createElement('style'); st.id = 'theme-css'; document.head.appendChild(st); }
    st.textContent = `
      .tab.on{color:${g};border-color:${rgba(g, .4)};background:linear-gradient(90deg,${rgba(g, .16)},${rgba(g, .02)})}.tab.on i{color:${g};filter:drop-shadow(0 0 6px ${rgba(g, .6)})}.tab.on::before{background:${g};box-shadow:0 0 12px ${g}}
      .logo,.btn.gold,#basket-btn,.chsel.on,.dr-t input:checked+i{background:linear-gradient(145deg,${g},${adj(g, { hue: 0, sat: 100, light: 72 })})!important}
      .ph,.digital b,.kpi>i,.cc-h b i,.dr-head b,.bk-n,.st .fq,.news h4,.ins h4,.wz-steps span.on,.tgrid button i,.empty .ic{color:${g}}
      .ccard:hover,.tgrid button.on,.wz-steps span.on,.st.on,.th.on{border-color:${rgba(g, .6)}}.kpi>i{background:${rgba(g, .12)}}
      .filechip{color:${n};border-color:${rgba(n, .35)};background:${rgba(n, .08)}}.drop:hover,.drop.over{border-color:${g}}
      .player{border-color:${rgba(g, .4)};background:linear-gradient(120deg,${rgba(g, .14)},${rgba(n, .08)})}.player .eq i{background:${g}}
      aside{background:rgba(6,13,31,${Math.min(.85, dim + .05)})}.panel,.ccard,.kpi,.ins,.news,.hb-tv{backdrop-filter:blur(10px)}
      #sky{opacity:${url ? 0 : 1};transition:opacity .8s}canvas#stars{opacity:${t.id === 'uzay' || t.id === 'klasik' ? .55 : .15}}`;
    if (t.id === 'dijital') startRain(g); else stopRain();
  }
  function startRain(color) {
    stopRain(); const c = document.createElement('canvas'); c.id = 'rain'; c.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.35'; document.body.insertBefore(c, document.querySelector('.app'));
    const x = c.getContext('2d'); let cols = [], W, H; const fs = 16, chars = 'アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF₺%';
    const size = () => { W = c.width = innerWidth; H = c.height = innerHeight; cols = Array(Math.ceil(W / fs)).fill(0).map(() => Math.random() * H / fs); }; size(); addEventListener('resize', size);
    rain = setInterval(() => { x.fillStyle = 'rgba(6,13,31,.12)'; x.fillRect(0, 0, W, H); x.fillStyle = color; x.font = fs + 'px monospace';
      cols.forEach((y, i) => { x.fillText(chars[Math.floor(Math.random() * chars.length)], i * fs, y * fs); cols[i] = y * fs > H && Math.random() > .975 ? 0 : y + 1; }); }, 55);
  }
  function stopRain() { clearInterval(rain); rain = null; const c = document.getElementById('rain'); if (c) c.remove(); }
  let saveT = null;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => fetch('/api/theme', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(T) }).catch(() => {}), 400); };

  G.renderTema = function (root) {
    const paint = () => {
      const [g, n, x] = colors(T), d = def(T.id);
      root.innerHTML = `<section class="panel"><div class="ph"><i class="ti ti-photo"></i> Temalar (${THEMES.length}) <small style="color:var(--muted);font-weight:400;margin-left:8px">Seçtiğin tema tüm sekmelere uygulanır</small></div>
        <div class="th-grid">${THEMES.map(t => `<div class="th${t[0] === T.id ? ' on' : ''}" data-th="${t[0]}" style="${t[2] ? `background-image:url('/api/photo?w=s&id=${t[0]}&n=0&q=${encodeURIComponent(t[2])}')` : 'background:linear-gradient(160deg,#060d1f,#0a1630 55%,#1a2a50)'}">
          <div class="dots">${t[3].map(c => `<i style="background:${c}"></i>`).join('')}</div><b>${esc(t[1])}</b></div>`).join('')}</div></section>
        <div class="th-tune"><section class="panel"><div class="ph"><i class="ti ti-palette"></i> Tema renkleri · ${esc(d[1])}</div>
            <div class="sw"><input type="color" id="c1" value="${T.a1 || d[3][0]}"><span>Ana vurgu (başlıklar, butonlar)</span><b style="color:${g}">●</b></div>
            <div class="sw"><input type="color" id="c2" value="${T.a2 || d[3][1]}"><span>İkinci vurgu</span><b style="color:${n}">●</b></div>
            <div class="sw"><input type="color" id="c3" value="${T.a3 || d[3][2]}"><span>Üçüncü vurgu</span><b style="color:${x}">●</b></div>
            <button class="btn ghost" id="t-def"><i class="ti ti-restore"></i> Temanın varsayılan renkleri</button></section>
          <section class="panel"><div class="ph"><i class="ti ti-adjustments-horizontal"></i> Ton, doygunluk, parlaklık</div>
            <div class="dr-f"><span>Renk tonu (tüm renkleri kaydırır) · ${T.hue}°</span><input type="range" class="hue" id="t-hue" min="-180" max="180" value="${T.hue}"></div>
            <div class="dr-r"><span>Doygunluk</span><input type="range" id="t-sat" min="0" max="200" value="${T.sat}"><b>${T.sat}%</b></div>
            <div class="dr-r"><span>Parlaklık</span><input type="range" id="t-light" min="40" max="160" value="${T.light}"><b>${T.light}%</b></div>
            <div class="dr-r"><span>Fotoğraf karartma</span><input type="range" id="t-dim" min="0" max="95" value="${Math.round((T.dim ?? d[4]) * 100)}"><b>${Math.round((T.dim ?? d[4]) * 100)}%</b></div>
            <div class="dr-r"><span>Fotoğraf bulanıklığı</span><input type="range" id="t-blur" min="0" max="20" value="${T.blur}"><b>${T.blur}px</b></div></section>
          <section class="panel"><div class="ph"><i class="ti ti-camera"></i> Fotoğraf</div>
            <p class="cc-foot" style="border:0;padding:0 0 10px">Fotoğraflar Wikimedia Commons'tan gelir (gerçek, telifsiz fotoğraflar). Beğenmezsen başka bir kare dene ya da kendi fotoğrafını yükle.</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px"><button class="btn" id="t-next"${d[2] ? '' : ' disabled'}><i class="ti ti-refresh"></i> Başka fotoğraf (${(T.n || 0) + 1}/10)</button>
            <label class="btn"><i class="ti ti-upload"></i> Kendi fotoğrafım<input type="file" id="t-up" accept="image/*" hidden></label>${T.custom ? '<button class="btn ghost" id="t-rmc"><i class="ti ti-x"></i> Kendi fotoğrafımı kaldır</button>' : ''}</div>
            <p class="cc-foot" style="border:0;padding:12px 0 0"><i class="ti ti-chart-bar"></i> Grafiklerin de temaya uyması için ⚙️ → Renk → <b>"Tema"</b> paletini seç, sonra "Tümüne uygula".</p></section></div>`;
      const q = s => root.querySelector(s), set = (k, v, re) => { T[k] = v; apply(T); save(); if (re) paint(); };
      root.querySelectorAll('[data-th]').forEach(el => el.onclick = () => { T = Object.assign({}, DEF, { id: el.dataset.th }); apply(T); save(); paint(); });
      q('#c1').oninput = e => set('a1', e.target.value); q('#c2').oninput = e => set('a2', e.target.value); q('#c3').oninput = e => set('a3', e.target.value);
      ['c1', 'c2', 'c3'].forEach(id => q('#' + id).onchange = () => paint());
      q('#t-def').onclick = () => { Object.assign(T, { a1: null, a2: null, a3: null, hue: 0, sat: 100, light: 100, dim: null, blur: 0 }); apply(T); save(); paint(); };
      const rng = (id, k, f) => { const el = q('#' + id); el.oninput = () => { T[k] = f ? f(+el.value) : +el.value; const b = el.parentElement.querySelector('b'); if (b) b.textContent = el.value + (id === 't-blur' ? 'px' : '%'); apply(T); save(); }; el.onchange = () => paint(); };
      rng('t-hue', 'hue'); rng('t-sat', 'sat'); rng('t-light', 'light'); rng('t-dim', 'dim', v => v / 100); rng('t-blur', 'blur');
      q('#t-next').onclick = () => { T.n = ((T.n || 0) + 1) % 10; T.custom = null; apply(T); save(); paint(); };
      q('#t-up').onchange = e => { const f = e.target.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = ev => { const im = new Image(); im.onload = () => {
        const c = document.createElement('canvas'), s = Math.min(1, 2200 / im.width); c.width = im.width * s; c.height = im.height * s; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        T.custom = c.toDataURL('image/jpeg', .82); apply(T); save(); paint(); }; im.src = ev.target.result; }; fr.readAsDataURL(f); };
      if (q('#t-rmc')) q('#t-rmc').onclick = () => { T.custom = null; apply(T); save(); paint(); };
    };
    paint();
  };
  // açılışta kayıtlı temayı uygula
  if (typeof document !== 'undefined') fetch('/api/theme').then(r => r.json()).then(t => { if (t && t.id) { T = Object.assign({}, DEF, t); apply(T); } }).catch(() => {});
  G.__tema = { THEMES, apply };
})(window);
