// Grafik sihirbazı: 7 adımda sıfırdan grafik
(function (G) {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SAMPLE = 'Ay\tCiro 2025\tCiro 2026\tHedef\nOcak\t820\t910\t900\nŞubat\t760\t880\t880\nMart\t910\t1040\t980\nNisan\t980\t1010\t1020\nMayıs\t1050\t1190\t1100\nHaziran\t1120\t1260\t1180';
  const TYPES = [
    ['sutun', 'Sütun', 'ti-chart-bar'], ['yigilmis', 'Yığılmış sütun', 'ti-chart-bar'], ['yuzde', '%100 yığılmış', 'ti-percentage'], ['yatay', 'Yatay bar', 'ti-chart-bar-popular'],
    ['yatayyig', 'Yığılmış yatay', 'ti-layout-list'], ['lolipop', 'Lolipop', 'ti-lollipop'], ['kelebek', 'Kelebek', 'ti-butterfly'], ['kutup', 'Kutup sütun', 'ti-chart-arcs'],
    ['piktogram', 'Piktogram', 'ti-users'], ['kombine', 'Sütun + çizgi', 'ti-chart-histogram'], ['selale', 'Şelale', 'ti-stairs-up'], ['cizgi', 'Çizgi', 'ti-chart-line'],
    ['yumusak', 'Yumuşak çizgi', 'ti-wave-sine'], ['basamak', 'Basamak çizgi', 'ti-stairs'], ['alan', 'Alan', 'ti-chart-area'], ['yigalan', 'Yığılmış alan', 'ti-chart-area-line'],
    ['pasta', 'Pasta', 'ti-chart-pie'], ['halka', 'Halka', 'ti-chart-donut'], ['gul', 'Gül', 'ti-flower'], ['yarim', 'Yarım halka', 'ti-chart-arcs-3'],
    ['radar', 'Radar', 'ti-chart-radar'], ['dagilim', 'Dağılım', 'ti-chart-dots'], ['kabarcik', 'Kabarcık', 'ti-chart-bubble'], ['huni', 'Huni', 'ti-filter'],
    ['gosterge', 'Gösterge', 'ti-gauge'], ['isi', 'Isı haritası', 'ti-grid-dots'], ['agac', 'Ağaç haritası', 'ti-layout-grid'], ['gunes', 'Güneş patlaması', 'ti-sun'], ['halkalar', 'İlerleme halkaları', 'ti-circles']];
  const SHAPES = [['duz', 'Düz', 'ti-square'], ['yuvarlak', 'Yuvarlak köşe', 'ti-square-rounded'], ['hap', 'Hap', 'ti-pill'], ['ucgen', 'Üçgen', 'ti-triangle'], ['dag', 'Dağ', 'ti-mountain'],
    ['elmas', 'Elmas', 'ti-diamond'], ['ok', 'Ok', 'ti-arrow-big-up'], ['igne', 'İğne', 'ti-map-pin'], ['daire', 'Daire yığını', 'ti-circle-dot'], ['kare', 'Kare yığını', 'ti-grid-pattern'],
    ['yildiz', 'Yıldız yığını', 'ti-star'], ['kalp', 'Kalp yığını', 'ti-heart'], ['altigen', 'Altıgen', 'ti-hexagon'], ['damla', 'Damla', 'ti-droplet'], ['silindir', 'Silindir (3B)', 'ti-cylinder'],
    ['cam', 'Cam parlak', 'ti-sparkles'], ['golge', 'Arka planlı', 'ti-layers-subtract']];
  const PATH = { dag: 'path://M0,10 L10,10 C5.5,10 5.5,5 5,0 C4.5,5 4.5,10 0,10 z', yildiz: 'path://M5,0 L6.2,3.6 L10,3.6 L6.9,5.8 L8.1,9.5 L5,7.2 L1.9,9.5 L3.1,5.8 L0,3.6 L3.8,3.6 Z',
    kalp: 'path://M5,9 C-3,3 2,-2 5,2 C8,-2 13,3 5,9 Z', altigen: 'path://M2.5,0 L7.5,0 L10,5 L7.5,10 L2.5,10 L0,5 Z', damla: 'path://M5,0 C5,0 10,6 10,7.5 A5,5 0 0 1 0,7.5 C0,6 5,0 5,0 Z', ok: 'arrow', igne: 'pin', elmas: 'diamond', ucgen: 'triangle', daire: 'circle', kare: 'rect' };
  const PALS = { 'Altın gece': ['#f2d68a', '#5fb8f0', '#5dcaa5', '#f0997b', '#8fa2ff', '#c9a24a', '#e46f8c', '#3b7cb8'], 'Neon': ['#00f5d4', '#f15bb5', '#fee440', '#00bbf9', '#9b5de5', '#ff6b6b', '#4ade80', '#fb923c'],
    'Okyanus': ['#03045e', '#0077b6', '#00b4d8', '#48cae4', '#90e0ef', '#0096c7', '#023e8a', '#ade8f4'], 'Gün batımı': ['#ff9e00', '#ff6d00', '#ff4800', '#e63946', '#c9184a', '#ffb703', '#fb8500', '#ffd166'],
    'Zümrüt': ['#064e3b', '#047857', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669', '#065f46'], 'HARIBO': ['#e30613', '#ffcc00', '#0057a3', '#ffffff', '#f39200', '#7ab800', '#e5007d', '#00a0e1'],
    'Pastel': ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'], 'Kurumsal': ['#1f3a5f', '#4d648d', '#acc2ef', '#3d5a80', '#98c1d9', '#ee6c4d', '#293241', '#e0fbfc'],
    'Mor rüya': ['#240046', '#5a189a', '#7b2cbf', '#9d4edd', '#c77dff', '#e0aaff', '#3c096c', '#10002b'], 'Toprak': ['#7f5539', '#9c6644', '#b08968', '#ddb892', '#e6ccb2', '#ede0d4', '#582f0e', '#936639'],
    'Gri tonlar': ['#f8f9fa', '#dee2e6', '#adb5bd', '#6c757d', '#495057', '#343a40', '#ced4da', '#212529'], 'Gökkuşağı': ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'] };
  const FONTS = ['Segoe UI', 'Georgia', 'Trebuchet MS', 'Courier New', 'Impact', 'Verdana', 'Palatino', 'Garamond', 'Arial Black', 'Gill Sans'];
  const DEF = { data: SAMPLE, type: 'sutun', shape: 'yuvarlak', barWidth: 50, radius: 8, gap: 30, lineWidth: 3, symbol: 'circle', symbolSize: 8, inner: 45, palette: 'Altın gece', colors: {},
    hue: 0, sat: 100, light: 100, grad: 'dikey', opacity: 100, glow: 0, colorByData: false, bg: 'saydam', bg1: '#0a1630', bg2: '#1d2f5c', gridLine: 'kesik', axisColor: '#b5c3dc', font: 'Segoe UI', fontSize: 13,
    legend: 'üst', title: 'Yeni grafik', sub: 'Grafik sihirbazı ile oluşturuldu', labels: 'değer', labelPos: 'üst', fmt: 'otomatik', dec: 0, prefix: '', suffix: '', table: true, xName: '', yName: '', note: '',
    anim: 'Yükselme', speed: 900, step: 1, topN: 0, sort: 'dosyadaki sıra' };
  let S = null, chart = null, ro = null;
  const STEPS = ['Veri', 'Grafik türü', 'Şekil', 'Renk ve ton', 'Zemin ve tema', 'Etiketler', 'Hareket ve indirme'];

  // ---------- veri ----------
  function parseData(txt) {
    const lines = String(txt || '').trim().split(/\r?\n/).filter(l => l.trim()); if (lines.length < 2) return null;
    const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
    const rows = lines.map(l => l.split(sep).map(x => x.trim()));
    const head = rows[0], num = v => { const s = String(v).replace(/[₺%\s]/g, ''); const n = /,\d{1,2}$/.test(s) ? +s.replace(/\./g, '').replace(',', '.') : +s.replace(/,/g, ''); return isNaN(n) ? 0 : n; };
    return { cats: rows.slice(1).map(r => r[0]), series: head.slice(1).map((h, i) => ({ name: h || 'Seri ' + (i + 1), data: rows.slice(1).map(r => num(r[i + 1])) })) };
  }
  // ---------- renk ----------
  function hsl(hex) { let c = hex.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); const r = parseInt(c.slice(0, 2), 16) / 255, g = parseInt(c.slice(2, 4), 16) / 255, b = parseInt(c.slice(4, 6), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s * 100, l * 100]; }
  const tone = (hex, S) => { const [h, s, l] = hsl(hex); return `hsl(${(h + S.hue + 360) % 360},${Math.min(100, s * S.sat / 100)}%,${Math.min(96, l * S.light / 100)}%)`; };
  const alpha = (c, a) => c.replace('hsl(', 'hsla(').replace(')', ',' + a + ')');
  function fill(c, S) {
    const a = S.opacity / 100, c2 = alpha(c, a * .35);
    if (S.grad === 'yok') return alpha(c, a);
    if (S.grad === 'radyal') return { type: 'radial', x: .5, y: .5, r: .8, colorStops: [{ offset: 0, color: alpha(c, a) }, { offset: 1, color: c2 }] };
    const yatay = S.grad === 'yatay'; return { type: 'linear', x: 0, y: 0, x2: yatay ? 1 : 0, y2: yatay ? 0 : 1, colorStops: [{ offset: 0, color: alpha(c, a) }, { offset: 1, color: c2 }] };
  }
  const colorsOf = (S, n) => { const p = PALS[S.palette] || PALS['Altın gece']; return Array.from({ length: n }, (_, i) => tone(S.colors[i] || p[i % p.length], S)); };
  // ---------- biçim ----------
  function fmtV(v, S) {
    if (typeof v !== 'number') return v; let x = v, suf = '';
    const f = S.fmt === 'otomatik' ? (Math.abs(v) >= 1e9 ? 'milyar' : Math.abs(v) >= 1e6 ? 'milyon' : Math.abs(v) >= 1e4 ? 'bin' : 'ham') : S.fmt;
    if (f === 'bin') { x = v / 1e3; suf = ' bin'; } else if (f === 'milyon') { x = v / 1e6; suf = ' M'; } else if (f === 'milyar') { x = v / 1e9; suf = ' Mr'; }
    return (S.prefix || '') + x.toLocaleString('tr-TR', { minimumFractionDigits: +S.dec, maximumFractionDigits: +S.dec }) + suf + (S.suffix || '');
  }

  // ---------- grafik ----------
  function build(S) {
    const D = parseData(S.data); if (!D || !D.series.length) return null;
    const n = D.series.length, C = colorsOf(S, Math.max(n, D.cats.length)), T = S.type, txt = S.axisColor;
    const font = { fontFamily: S.font + ', system-ui, sans-serif', color: txt, fontSize: +S.fontSize };
    const grid = { left: 16, right: 24, top: S.legend === 'üst' ? 46 : 22, bottom: S.legend === 'alt' ? 46 : 14, containLabel: true };
    const split = { show: S.gridLine !== 'yok', lineStyle: { color: 'rgba(120,160,230,.16)', type: S.gridLine === 'kesik' ? 'dashed' : S.gridLine === 'noktalı' ? 'dotted' : 'solid' } };
    const cat = { type: 'category', data: D.cats, name: S.xName, nameTextStyle: font, axisLabel: { ...font, hideOverlap: true }, axisLine: { lineStyle: { color: 'rgba(120,160,230,.3)' } }, axisTick: { show: false } };
    const val = { type: 'value', name: S.yName, nameTextStyle: font, axisLabel: { ...font, formatter: v => fmtV(v, S) }, splitLine: split };
    const legend = S.legend === 'yok' ? { show: false } : { show: true, textStyle: font, icon: 'roundRect', ...(S.legend === 'üst' ? { top: 0 } : S.legend === 'alt' ? { bottom: 0 } : { orient: 'vertical', right: 0, top: 'middle' }) };
    const pos = { 'üst': 'top', 'iç': 'inside', 'iç üst': 'insideTop', 'dış': 'outside' }[S.labelPos] || 'top';
    const lab = (p0, hz) => S.labels === 'yok' ? { show: false } : { show: true, position: hz && pos === 'top' ? 'right' : p0 || pos, ...font, color: '#eaf0fa', fontSize: +S.fontSize - 1,
      formatter: p => S.labels === 'ad' ? p.name : S.labels === 'yüzde' && p.percent !== undefined ? '%' + p.percent : S.labels === 'ad+değer' ? p.name + '\n' + fmtV(Array.isArray(p.value) ? p.value[p.value.length - 1] : p.value, S) : fmtV(Array.isArray(p.value) ? p.value[p.value.length - 1] : p.value, S) };
    const glow = S.glow ? { shadowBlur: +S.glow, shadowColor: 'rgba(242,214,138,.6)' } : {};
    const tip = { trigger: ['pasta', 'halka', 'gul', 'yarim', 'huni', 'agac', 'gunes', 'dagilim', 'kabarcik', 'isi'].includes(T) ? 'item' : 'axis', backgroundColor: 'rgba(6,16,36,.95)', borderColor: 'rgba(242,214,138,.35)', textStyle: { color: '#eaf0fa' }, valueFormatter: v => fmtV(v, S) };
    const o = { backgroundColor: 'transparent', textStyle: font, tooltip: tip, legend, color: C, grid };
    const horiz = ['yatay', 'yatayyig', 'kelebek'].includes(T);
    const isBar = ['sutun', 'yigilmis', 'yuzde', 'yatay', 'yatayyig', 'kombine'].includes(T);
    const barItem = (i, hz) => ({ color: S.colorByData ? undefined : fill(C[i], S), borderRadius: S.shape === 'hap' ? 999 : S.shape === 'duz' ? 0 : hz ? [0, +S.radius, +S.radius, 0] : [+S.radius, +S.radius, 0, 0], ...glow,
      ...(S.shape === 'cam' ? { borderColor: 'rgba(255,255,255,.55)', borderWidth: 1 } : {}) });
    const dataBy = (s, i) => S.colorByData ? s.data.map((v, j) => ({ value: v, itemStyle: { color: fill(C[j % C.length], S) } })) : s.data;
    const bw = +S.barWidth + '%';
    if (isBar) {
      const stack = ['yigilmis', 'yuzde', 'yatayyig'].includes(T) ? 'x' : undefined;
      let ser = D.series;
      if (T === 'yuzde') { const tot = D.cats.map((_, j) => D.series.reduce((a, s) => a + Math.abs(s.data[j]), 0) || 1); ser = D.series.map(s => ({ name: s.name, data: s.data.map((v, j) => +(v / tot[j] * 100).toFixed(1)) })); }
      const sym = PATH[S.shape] || (S.shape === 'dag' ? PATH.dag : null), rep = ['daire', 'kare', 'yildiz', 'kalp'].includes(S.shape);
      o.xAxis = horiz ? { ...val, ...(T === 'yuzde' ? { max: 100 } : {}) } : cat; o.yAxis = horiz ? { ...cat, inverse: true } : { ...val, ...(T === 'yuzde' ? { max: 100, axisLabel: { ...font, formatter: '%{value}' } } : {}) };
      o.series = ser.map((s, i) => {
        const line = T === 'kombine' && i === ser.length - 1 && ser.length > 1;
        if (line) return { name: s.name, type: 'line', smooth: true, symbol: S.symbol, symbolSize: +S.symbolSize, lineStyle: { width: +S.lineWidth, color: C[i] }, itemStyle: { color: C[i] }, data: s.data, label: lab('top') };
        if (sym && !stack) return { name: s.name, type: 'pictorialBar', symbol: sym, symbolRepeat: rep ? true : false, symbolSize: rep ? ['70%', '30%'] : ['100%', '100%'], symbolMargin: rep ? 2 : 0, barGap: '10%', barCategoryGap: S.gap + '%',
          symbolClip: rep, itemStyle: { color: fill(C[i], S), ...glow }, data: dataBy(s, i), label: lab(undefined, horiz) };
        const b = { name: s.name, type: 'bar', stack, barMaxWidth: S.shape === 'silindir' ? 36 : undefined, barWidth: n === 1 ? bw : undefined, barCategoryGap: S.gap + '%', itemStyle: barItem(i, horiz), data: dataBy(s, i), label: lab(stack ? 'inside' : undefined, horiz),
          showBackground: S.shape === 'golge', backgroundStyle: { color: 'rgba(120,160,230,.08)', borderRadius: +S.radius } };
        if (S.shape === 'cam') b.itemStyle.color = { type: 'linear', x: 0, y: 0, x2: horiz ? 0 : 1, y2: horiz ? 1 : 0, colorStops: [{ offset: 0, color: alpha(C[i], .95) }, { offset: .45, color: alpha(C[i], .55) }, { offset: .5, color: alpha(C[i], .85) }, { offset: 1, color: alpha(C[i], .4) }] };
        return b;
      });
      if (S.shape === 'silindir' && !stack && !horiz) {
        const k = o.series.filter(x => x.type === 'bar').length, w = 36, g = 8;
        o.series.filter(x => x.type === 'bar').forEach((x, i) => { x.barWidth = w; x.barGap = (g / w * 100) + '%'; x.itemStyle.borderRadius = 0; const off = (i - (k - 1) / 2) * (w + g);
          o.series.push({ type: 'pictorialBar', symbol: 'circle', symbolSize: [w, 12], symbolOffset: [off, -6], symbolPosition: 'end', z: 3, itemStyle: { color: tone(PALS[S.palette][i % 8], { ...S, light: S.light * 1.25 }) }, data: x.data, tooltip: { show: false }, legendHoverLink: false },
            { type: 'pictorialBar', symbol: 'circle', symbolSize: [w, 12], symbolOffset: [off, 6], z: 1, itemStyle: { color: C[i] }, data: x.data.map(() => 1), tooltip: { show: false } }); });
        o.legend.data = D.series.map(s => s.name);
      }
      return o;
    }
    if (T === 'lolipop') { o.xAxis = cat; o.yAxis = val; o.series = D.series.flatMap((s, i) => [{ name: s.name, type: 'bar', barWidth: 3, itemStyle: { color: alpha(C[i], .6) }, data: s.data, barGap: '400%' },
      { name: s.name, type: 'scatter', symbol: S.symbol, symbolSize: Math.max(14, +S.symbolSize * 2), itemStyle: { color: C[i], ...glow }, data: s.data, label: lab('top') }]); return o; }
    if (T === 'kelebek') { const [a, b] = D.series; o.xAxis = { ...val, axisLabel: { ...font, formatter: v => fmtV(Math.abs(v), S) } }; o.yAxis = { ...cat, inverse: true };
      o.series = [{ name: a.name, type: 'bar', stack: 'k', data: a.data.map(v => -v), itemStyle: { ...barItem(0, true), borderRadius: [+S.radius, 0, 0, +S.radius] }, label: { ...lab('left'), formatter: p => fmtV(-p.value, S) } },
        ...(b ? [{ name: b.name, type: 'bar', stack: 'k', data: b.data, itemStyle: barItem(1, true), label: lab('right') }] : [])]; o.tooltip.valueFormatter = v => fmtV(Math.abs(v), S); return o; }
    if (T === 'kutup') { delete o.grid; o.polar = { radius: ['12%', '78%'] }; o.angleAxis = { type: 'category', data: D.cats, axisLabel: font, axisLine: { lineStyle: { color: 'rgba(120,160,230,.3)' } } }; o.radiusAxis = { axisLabel: { ...font, formatter: v => fmtV(v, S) }, splitLine: split };
      o.series = D.series.map((s, i) => ({ name: s.name, type: 'bar', coordinateSystem: 'polar', stack: 'p', itemStyle: barItem(i), data: s.data, roundCap: S.shape === 'hap' })); return o; }
    if (T === 'piktogram') { o.xAxis = { ...val, show: false }; o.yAxis = { ...cat, inverse: true, axisLine: { show: false } }; const s = D.series[0], mx = Math.max(...s.data);
      o.series = [{ type: 'pictorialBar', name: s.name, symbol: PATH[S.shape] && S.shape !== 'duz' ? PATH[S.shape] : 'path://M5,0 A2.2,2.2 0 1 1 4.99,0 Z M1.5,10 L1.5,6.5 Q1.5,4.8 3.2,4.8 L6.8,4.8 Q8.5,4.8 8.5,6.5 L8.5,10 Z', symbolRepeat: true, symbolSize: [22, 22], symbolMargin: 4,
        symbolClip: true, itemStyle: { color: C[0], ...glow }, data: s.data, label: { ...lab('right'), offset: [10, 0] }, z: 2 }, { type: 'pictorialBar', symbol: 'path://M5,0 A2.2,2.2 0 1 1 4.99,0 Z M1.5,10 L1.5,6.5 Q1.5,4.8 3.2,4.8 L6.8,4.8 Q8.5,4.8 8.5,6.5 L8.5,10 Z', symbolRepeat: true, symbolSize: [22, 22], symbolMargin: 4, itemStyle: { color: 'rgba(120,160,230,.12)' }, data: s.data.map(() => mx), tooltip: { show: false }, z: 1 }]; return o; }
    if (T === 'selale') { const s = D.series[0]; let acc = 0; const h = [], v = []; s.data.forEach((x, j) => { h.push(x >= 0 ? acc : acc + x); v.push({ value: Math.abs(x), raw: x, itemStyle: { color: fill(x >= 0 ? C[2] || '#5dcaa5' : '#f09595', S), borderRadius: 4 } }); acc += x; });
      h.push(0); v.push({ value: acc, raw: acc, itemStyle: { color: fill(C[0], S), borderRadius: 4 } });
      o.xAxis = { ...cat, data: [...D.cats, 'Toplam'] }; o.yAxis = val; o.tooltip = { ...o.tooltip, formatter: p => { const q = p.find(x => x.seriesIndex === 1); return q.name + '<br>' + fmtV(q.data.raw, S); } };
      o.series = [{ type: 'bar', stack: 'w', itemStyle: { color: 'transparent' }, data: h, emphasis: { disabled: true } }, { name: s.name, type: 'bar', stack: 'w', data: v, barCategoryGap: S.gap + '%', label: { ...lab('top'), formatter: p => fmtV(p.data.raw, S) } }]; return o; }
    if (['cizgi', 'yumusak', 'basamak', 'alan', 'yigalan'].includes(T)) {
      o.xAxis = { ...cat, boundaryGap: false }; o.yAxis = val;
      o.series = D.series.map((s, i) => ({ name: s.name, type: 'line', smooth: T === 'yumusak' || T === 'yigalan' ? .4 : false, step: T === 'basamak' ? 'middle' : false, stack: T === 'yigalan' ? 'a' : undefined,
        symbol: S.symbol, symbolSize: +S.symbolSize, lineStyle: { width: +S.lineWidth, color: C[i], ...glow }, itemStyle: { color: C[i] }, data: s.data, label: lab('top'),
        areaStyle: ['alan', 'yigalan'].includes(T) ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: alpha(C[i], .55 * S.opacity / 100) }, { offset: 1, color: alpha(C[i], .02) }] } } : undefined }));
      return o;
    }
    const pieData = () => { const s = D.series[0]; return D.cats.map((c, j) => ({ name: c, value: s.data[j], itemStyle: { color: fill(C[j % C.length], S), borderRadius: S.shape === 'duz' ? 0 : +S.radius, borderColor: '#0a1630', borderWidth: 2, ...glow } })); };
    if (['pasta', 'halka', 'gul', 'yarim'].includes(T)) { delete o.grid; o.tooltip.formatter = p => p.name + '<br>' + fmtV(p.value, S) + ' · %' + p.percent;
      o.series = [{ type: 'pie', name: D.series[0].name, roseType: T === 'gul' ? 'area' : undefined, radius: T === 'pasta' ? '70%' : T === 'gul' ? ['14%', '74%'] : [+S.inner + '%', T === 'yarim' ? '95%' : '74%'], center: T === 'yarim' ? ['50%', '75%'] : ['50%', '54%'],
        startAngle: T === 'yarim' ? 180 : 90, endAngle: T === 'yarim' ? 360 : 'auto', padAngle: S.gap > 40 ? 3 : 1, data: pieData(), label: S.labels === 'yok' ? { show: false } : { ...font, color: '#eaf0fa', formatter: p => S.labels === 'değer' ? p.name + '\n' + fmtV(p.value, S) : S.labels === 'ad' ? p.name : p.name + '\n%' + p.percent } }]; return o; }
    if (T === 'radar') { delete o.grid; const mx = Math.max(...D.series.flatMap(s => s.data)) * 1.1; o.radar = { indicator: D.cats.map(c => ({ name: c, max: mx })), axisName: font, splitLine: { lineStyle: { color: 'rgba(120,160,230,.25)' } }, splitArea: { show: false }, shape: S.shape === 'daire' || S.shape === 'hap' ? 'circle' : 'polygon' };
      o.series = [{ type: 'radar', data: D.series.map((s, i) => ({ name: s.name, value: s.data, lineStyle: { width: +S.lineWidth, color: C[i] }, itemStyle: { color: C[i] }, symbol: S.symbol, symbolSize: +S.symbolSize, areaStyle: { color: alpha(C[i], .25 * S.opacity / 100) } })) }]; o.tooltip.trigger = 'item'; return o; }
    if (T === 'dagilim' || T === 'kabarcik') { const [a, b, c] = D.series; o.xAxis = { ...val, name: S.xName || (a && a.name) }; o.yAxis = { ...val, name: S.yName || (b && b.name) };
      const mx = c ? Math.max(...c.data) : 1; o.tooltip.formatter = p => p.name + '<br>' + p.value.map(v => fmtV(v, S)).join(' · ');
      o.series = [{ type: 'scatter', symbol: S.symbol, data: D.cats.map((n2, j) => ({ name: n2, value: [a.data[j], b ? b.data[j] : j, ...(c ? [c.data[j]] : [])] })),
        symbolSize: T === 'kabarcik' && c ? (v => 12 + 50 * Math.sqrt(v[2] / mx)) : +S.symbolSize * 2, itemStyle: { color: p => fill(C[p.dataIndex % C.length], S), opacity: S.opacity / 100, ...glow }, label: S.labels === 'yok' ? { show: false } : { show: true, formatter: '{b}', color: '#eaf0fa', position: 'top', ...font } }]; return o; }
    if (T === 'huni') { delete o.grid; o.series = [{ type: 'funnel', left: '12%', width: '76%', top: 40, bottom: 10, sort: 'descending', gap: S.gap / 10, data: pieData(), label: { ...font, color: '#eaf0fa', position: 'inside', formatter: p => p.name + ' · ' + fmtV(p.value, S) } }]; return o; }
    if (T === 'gosterge') { delete o.grid; const s = D.series, v = s[0].data[s[0].data.length - 1], mx = s[1] ? s[1].data[s[1].data.length - 1] : Math.max(...s[0].data) * 1.2;
      o.series = [{ type: 'gauge', min: 0, max: mx, startAngle: 210, endAngle: -30, radius: '90%', progress: { show: true, width: 22, roundCap: S.shape !== 'duz', itemStyle: { color: fill(C[0], S), ...glow } },
        axisLine: { lineStyle: { width: 22, color: [[1, 'rgba(120,160,230,.14)']] } }, pointer: { show: S.shape !== 'hap', width: 5, itemStyle: { color: C[1] || '#eaf0fa' } }, axisTick: { show: false }, splitLine: { length: 10, lineStyle: { color: 'rgba(120,160,230,.4)' } },
        axisLabel: { ...font, distance: 28, formatter: x => fmtV(x, S) }, title: { ...font, offsetCenter: [0, '70%'] }, detail: { ...font, fontSize: +S.fontSize * 2.4, color: C[0], offsetCenter: [0, '35%'], formatter: x => fmtV(x, S) }, data: [{ value: v, name: s[0].name }] }]; return o; }
    if (T === 'isi') { const data = []; D.series.forEach((s, y) => s.data.forEach((v, x) => data.push([x, y, v]))); const all = data.map(d => d[2]);
      o.xAxis = cat; o.yAxis = { ...cat, data: D.series.map(s => s.name) }; o.grid.right = 70; o.legend = { show: false };
      o.visualMap = { min: Math.min(...all), max: Math.max(...all), calculable: true, orient: 'vertical', right: 0, top: 'middle', textStyle: font, inRange: { color: [alpha(C[1] || C[0], .15), C[1] || C[0], C[0]] } };
      o.series = [{ type: 'heatmap', data, label: { show: S.labels !== 'yok', ...font, color: '#eaf0fa', formatter: p => fmtV(p.value[2], S) }, itemStyle: { borderColor: '#0a1630', borderWidth: 2, borderRadius: +S.radius / 2 } }]; return o; }
    if (T === 'agac' || T === 'gunes') { delete o.grid; const kids = D.series.map((s, i) => ({ name: s.name, itemStyle: { color: fill(C[i], S) }, children: D.cats.map((c, j) => ({ name: c, value: Math.abs(s.data[j]) })) }));
      const data = D.series.length > 1 ? kids : D.cats.map((c, j) => ({ name: c, value: Math.abs(D.series[0].data[j]), itemStyle: { color: fill(C[j % C.length], S) } }));
      o.tooltip.formatter = p => p.name + '<br>' + fmtV(p.value, S);
      o.series = T === 'agac' ? [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, data, itemStyle: { borderColor: '#0a1630', borderWidth: 2, gapWidth: 2, borderRadius: +S.radius / 2 }, levels: [{ itemStyle: { gapWidth: 4 } }], label: { ...font, color: '#fff', formatter: p => p.name + '\n' + fmtV(p.value, S) } }]
        : [{ type: 'sunburst', radius: ['12%', '92%'], data, itemStyle: { borderColor: '#0a1630', borderWidth: 2, borderRadius: +S.radius / 2 }, label: { ...font, color: '#fff', rotate: 'radial' } }]; return o; }
    if (T === 'halkalar') { delete o.grid; const s = D.series[0], mx = Math.max(...s.data) || 1, k = Math.min(6, D.cats.length);
      o.polar = { radius: ['18%', '86%'] }; o.angleAxis = { max: mx, show: false, startAngle: 90 }; o.radiusAxis = { type: 'category', data: D.cats.slice(0, k), axisLabel: { ...font, interval: 0 }, axisLine: { show: false }, axisTick: { show: false } };
      o.series = [{ type: 'bar', coordinateSystem: 'polar', roundCap: S.shape !== 'duz', barWidth: '62%', showBackground: true, backgroundStyle: { color: 'rgba(120,160,230,.1)' }, data: s.data.slice(0, k).map((v, j) => ({ value: v, itemStyle: { color: fill(C[j], S), ...glow } })),
        label: { show: S.labels !== 'yok', position: 'start', ...font, color: '#eaf0fa', formatter: p => fmtV(p.value, S) } }]; o.tooltip.trigger = 'item'; return o; }
    return null;
  }
  function animate(o, S) {
    const A = (G.Stil && G.Stil.ANIMS || []).find(a => a.n === S.anim);
    if (!A || A.n === 'Yok') { o.animation = false; return o; }
    const f = S.speed / 900; o.animation = true; o.animationDuration = Math.round(S.speed * A.k); o.animationEasing = A.e; o.animationDelay = A.d ? (i => Math.round(A.d(i) * f)) : 0;
    (o.series || []).forEach(x => { if (x.type === 'pie') x.animationType = A.pieScale ? 'scale' : 'expansion'; }); return o;
  }
  const finalOption = S => { const o = build(S); return o ? animate(o, S) : null; };

  // ---------- arayüz ----------
  const btns = (list, key, cur) => `<div class="tgrid">${list.map(([id, n, i]) => `<button data-k="${key}" data-v="${id}" class="${cur === id ? 'on' : ''}"><i class="ti ${i}"></i>${n}</button>`).join('')}</div>`;
  const range = (k, l, mn, mx, st, u) => `<div class="dr-r"><span>${l}</span><input type="range" data-k="${k}" min="${mn}" max="${mx}" step="${st || 1}" value="${S[k]}"><b data-out="${k}">${S[k]}${u || ''}</b></div>`;
  const sel = (k, l, opts) => `<label class="dr-f"><span>${l}</span><select data-k="${k}">${opts.map(o => `<option${String(S[k]) === String(o) ? ' selected' : ''}>${o}</option>`).join('')}</select></label>`;
  const inp = (k, l, ph) => `<label class="dr-f"><span>${l}</span><input data-k="${k}" value="${esc(S[k])}" placeholder="${esc(ph || '')}"></label>`;
  const tog = (k, l) => `<label class="dr-t"><input type="checkbox" data-k="${k}"${S[k] ? ' checked' : ''}><i></i><span>${l}</span></label>`;
  function stepHtml() {
    const D = parseData(S.data);
    switch (S.step) {
      case 1: if (HOOK && HOOK.embedded) { const D2 = parseData(S.data); return `<div class="dr-sec"><h4>Grafiğin verisi</h4><p class="cc-foot" style="border:0;padding:0 0 8px">Bu grafik yüklediğin Excel'den otomatik geliyor. Hangi kategorilerin, hangi sırayla görüneceğini buradan seçebilirsin.</p>
        ${range('topN', 'Gösterilecek kategori (0 = hepsi)', 0, 30)}${sel('sort', 'Sıralama', ['büyükten küçüğe', 'küçükten büyüğe', 'alfabetik', 'dosyadaki sıra'])}
        <div class="dtwrap" style="max-height:260px">${D2 ? `<table class="dtable"><tr><th></th>${D2.series.map(x => `<th>${esc(x.name)}</th>`).join('')}</tr>${D2.cats.map((c, j) => `<tr><td>${esc(c)}</td>${D2.series.map(x => `<td>${esc(fmtV(x.data[j], S))}</td>`).join('')}</tr>`).join('')}</table>` : ''}</div></div>`; }
        return `<div class="dr-sec"><h4>Verini yapıştır</h4><p class="cc-foot" style="border:0;padding:0 0 8px">Excel'den hücreleri kopyalayıp buraya yapıştır. İlk satır başlık, ilk sütun kategori olmalı.</p>
        <label class="dr-f"><textarea data-k="data" spellcheck="false">${esc(S.data)}</textarea></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn ghost"><i class="ti ti-file-spreadsheet"></i> Excel'den al<input type="file" id="wz-x" accept=".xlsx,.xls,.csv" hidden></label><button class="btn ghost" id="wz-sample"><i class="ti ti-sparkles"></i> Örnek veri</button></div>
        <div class="msg ${D ? 'ok' : 'err'}" style="margin-top:8px">${D ? `✓ ${D.cats.length} kategori · ${D.series.length} seri (${D.series.map(s => esc(s.name)).join(', ')})` : 'En az 2 satır gerekli'}</div></div>`;
      case 2: return `<div class="dr-sec"><h4>${TYPES.length} grafik türü</h4>${btns(TYPES, 'type', S.type)}</div>`;
      case 3: return `<div class="dr-sec"><h4>Çubuk / dilim şekli (${SHAPES.length})</h4>${btns(SHAPES, 'shape', S.shape)}</div>
        <div class="dr-sec"><h4>Ölçüler</h4>${range('barWidth', 'Çubuk genişliği', 10, 100, 1, '%')}${range('radius', 'Köşe yuvarlaklığı', 0, 30)}${range('gap', 'Aralık', 0, 80, 1, '%')}${range('lineWidth', 'Çizgi kalınlığı', 1, 10)}${range('symbolSize', 'Nokta boyu', 0, 24)}${range('inner', 'Halka iç boşluğu', 0, 80, 1, '%')}
        ${sel('symbol', 'Nokta şekli', ['circle', 'emptyCircle', 'rect', 'roundRect', 'triangle', 'diamond', 'pin', 'arrow', 'none'])}</div>`;
      case 4: { const p = PALS[S.palette], n = D ? Math.max(D.series.length, ['pasta', 'halka', 'gul', 'yarim', 'huni', 'agac', 'halkalar'].includes(S.type) ? D.cats.length : 0) : 4;
        return `<div class="dr-sec"><h4>Palet (${Object.keys(PALS).length})</h4><div class="pals">${Object.keys(PALS).map(k => `<button class="pal${k === S.palette ? ' on' : ''}" data-pal="${esc(k)}" title="${esc(k)}">${PALS[k].slice(0, 5).map(c => `<i style="background:${c}"></i>`).join('')}<span>${esc(k)}</span></button>`).join('')}</div></div>
        <div class="dr-sec"><h4>Tek tek renkler</h4>${Array.from({ length: Math.min(n, 10) }, (_, i) => `<div class="sw"><input type="color" data-col="${i}" value="${S.colors[i] || p[i % p.length]}"><span>${esc(D ? (D.series[i] || {}).name || D.cats[i] : 'Renk ' + (i + 1))}</span></div>`).join('')}</div>
        <div class="dr-sec"><h4>Ton ve parlaklık</h4>${range('hue', 'Ton kaydır', -180, 180, 1, '°')}${range('sat', 'Doygunluk', 0, 200, 1, '%')}${range('light', 'Parlaklık', 30, 160, 1, '%')}${range('opacity', 'Saydamlık', 10, 100, 1, '%')}${range('glow', 'Parıltı', 0, 40)}
        ${sel('grad', 'Geçiş (gradyan)', ['yok', 'dikey', 'yatay', 'radyal'])}${tog('colorByData', 'Her çubuğa ayrı renk')}</div>`; }
      case 5: return `<div class="dr-sec"><h4>Zemin</h4>${sel('bg', 'Arka plan', ['saydam', 'düz renk', 'geçişli'])}<div class="sw"><input type="color" data-k="bg1" value="${S.bg1}"><span>Renk 1</span></div><div class="sw"><input type="color" data-k="bg2" value="${S.bg2}"><span>Renk 2</span></div></div>
        <div class="dr-sec"><h4>Eksen ve yazı</h4>${sel('gridLine', 'Kılavuz çizgileri', ['kesik', 'düz', 'noktalı', 'yok'])}<div class="sw"><input type="color" data-k="axisColor" value="${S.axisColor}"><span>Yazı ve eksen rengi</span></div>
        ${sel('font', 'Yazı tipi', FONTS)}${range('fontSize', 'Yazı boyu', 9, 22)}${sel('legend', 'Lejant', ['üst', 'alt', 'sağ', 'yok'])}</div>`;
      case 6: return `<div class="dr-sec"><h4>Başlıklar</h4>${inp('title', 'Başlık')}${inp('sub', 'Alt başlık')}${inp('xName', 'Yatay eksen adı')}${inp('yName', 'Dikey eksen adı')}${inp('note', 'Dipnot (kaynak, dönem…)', 'Kaynak: … · Dönem: …')}</div>
        <div class="dr-sec"><h4>Veri etiketleri</h4>${sel('labels', 'Gösterim', ['değer', 'yüzde', 'ad', 'ad+değer', 'yok'])}${sel('labelPos', 'Konum', ['üst', 'iç', 'iç üst', 'dış'])}
        ${sel('fmt', 'Sayı biçimi', ['otomatik', 'ham', 'bin', 'milyon', 'milyar'])}${range('dec', 'Ondalık', 0, 3)}${inp('prefix', 'Ön ek', '₺ ')}${inp('suffix', 'Son ek', ' ton')}${tog('table', 'Grafiğin altında veri tablosu')}</div>`;
      case 7: return `<div class="dr-sec"><h4>Hareket</h4>${sel('anim', 'Animasyon (30)', (G.Stil && G.Stil.ANIMS || [{ n: 'Yükselme' }]).map(a => a.n))}${range('speed', 'Süre', 200, 3000, 100, ' ms')}
          <button class="btn ghost" id="wz-play"><i class="ti ti-player-play"></i> Animasyonu oynat</button></div>
        <div class="dr-sec"><h4>İndir ve kullan</h4><div style="display:flex;flex-wrap:wrap;gap:8px"><button class="btn gold" id="wz-dl"><i class="ti ti-download"></i> İndir (PNG · PDF · PPTX · video)</button>
          <button class="btn" id="wz-add"><i class="ti ti-presentation-analytics"></i> Sunuma ekle</button><button class="btn" id="wz-save"><i class="ti ti-device-floppy"></i> Kütüphaneye kaydet</button></div><span class="msg" id="wz-msg"></span></div>
        <div class="dr-sec"><h4>Kayıtlı grafiklerim</h4><div id="wz-lib" class="bk-list"></div></div>`;
    }
  }
  function current() { const o = finalOption(S); return o && { title: S.title, sub: S.sub, option: o, note: S.note, notes: S.sub }; }
  function draw(play) {
    const pv = document.getElementById('wz-chart'), box = document.getElementById('wz-prevcard'); if (!pv) return;
    const o = finalOption(S);
    box.style.background = S.bg === 'düz renk' ? S.bg1 : S.bg === 'geçişli' ? `linear-gradient(160deg,${S.bg1},${S.bg2})` : '';
    document.getElementById('wz-t').textContent = S.title; document.getElementById('wz-s').textContent = S.sub;
    document.getElementById('wz-n').innerHTML = S.note ? `<i class="ti ti-info-circle"></i> ${esc(S.note)}` : ''; document.getElementById('wz-n').style.display = S.note ? '' : 'none';
    if (!o) { if (chart) chart.clear(); return; }
    if (S.bg !== 'saydam') o.backgroundColor = S.bg === 'düz renk' ? S.bg1 : { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: S.bg1 }, { offset: 1, color: S.bg2 }] };
    if (typeof echarts !== 'undefined') { if (!chart) chart = echarts.init(pv); if (play) chart.clear(); chart.setOption(o, true); }
    const D = parseData(S.data), tb = document.getElementById('wz-table');
    tb.innerHTML = S.table && D ? `<table class="dtable"><tr><th></th>${D.cats.map(c => `<th>${esc(c)}</th>`).join('')}</tr>${D.series.map(s => `<tr><td>${esc(s.name)}</td>${s.data.map(v => `<td>${esc(fmtV(v, S))}</td>`).join('')}</tr>`).join('')}</table>` : '';
  }
  let saveT = null;
  let HOOK = null;
  function persist() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem('wz', JSON.stringify(S)); } catch (_) {} }, 300); }
  async function lib(root) {
    const el = root.querySelector('#wz-lib'); if (!el) return; const all = await G.Cards.styles(); const list = all['sihirbaz:kutuphane'] && all['sihirbaz:kutuphane'].list || [];
    el.innerHTML = list.map((x, i) => `<div class="bk-it"><span class="bk-n"><i class="ti ${(TYPES.find(t => t[0] === x.type) || [0, 0, 'ti-chart-bar'])[2]}"></i></span><div><b>${esc(x.title)}</b><small>${esc(new Date(x.at).toLocaleDateString('tr-TR'))}</small></div>
      <div class="bk-tools"><button class="icon-btn" data-open="${i}" title="Aç"><i class="ti ti-folder-open"></i></button><button class="icon-btn" data-del="${i}" title="Sil"><i class="ti ti-trash"></i></button></div></div>`).join('') || '<div class="empty-small" style="height:60px">Henüz kayıt yok</div>';
    el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { S = Object.assign({}, DEF, list[+b.dataset.open], { step: 1 }); paintAll(root); });
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { list.splice(+b.dataset.del, 1); await G.Cards.putStyle('sihirbaz:kutuphane', { list }); lib(root); });
  }
  function paintStep(root) {
    root.querySelector('.wz-steps').innerHTML = STEPS.map((n, i) => `<span data-step="${i + 1}" class="${S.step === i + 1 ? 'on' : S.step > i + 1 ? 'done' : ''}"><b>${i + 1}</b>${n}</span>`).join('');
    const pnl = root.querySelector('.wz-panel'); pnl.innerHTML = `<div class="ph" style="margin:0 0 4px"><i class="ti ti-wand"></i> ${S.step}. ${STEPS[S.step - 1]}</div>` + stepHtml() +
      `<div class="wz-nav"><button class="btn ghost" id="wz-prev"${S.step === 1 ? ' disabled' : ''}><i class="ti ti-arrow-left"></i> Geri</button><button class="btn ghost" id="wz-new"><i class="ti ti-refresh"></i> Sıfırdan başla</button>${S.step < 7 ? '<button class="btn gold" id="wz-next">İleri <i class="ti ti-arrow-right"></i></button>' : ''}</div>`;
    root.querySelectorAll('[data-step]').forEach(x => x.onclick = () => { S.step = +x.dataset.step; paintStep(root); HOOK.persist(); });
    const q = s => pnl.querySelector(s);
    q('#wz-prev').onclick = () => { S.step--; paintStep(root); HOOK.persist(); }; if (q('#wz-next')) q('#wz-next').onclick = () => { S.step++; paintStep(root); HOOK.persist(); };
    if (HOOK.embedded) q('#wz-new').style.display = 'none'; else q('#wz-new').onclick = () => { S = Object.assign({}, DEF); paintAll(root); HOOK.persist(); };
    pnl.querySelectorAll('[data-k]').forEach(el => {
      const ev = el.tagName === 'BUTTON' ? 'click' : (el.type === 'range' || el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') && el.type !== 'checkbox' ? 'input' : 'change';
      el.addEventListener(ev, () => { const k = el.dataset.k; S[k] = el.tagName === 'BUTTON' ? el.dataset.v : el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
        const out = pnl.querySelector(`[data-out="${k}"]`); if (out) out.textContent = el.value + (out.textContent.replace(/^-?[\d.]+/, '') || '');
        if (el.tagName === 'BUTTON') { pnl.querySelectorAll(`[data-k="${k}"]`).forEach(b => b.classList.toggle('on', b === el)); }
        if (k === 'data') { const D = parseData(S.data), m = pnl.querySelector('.msg'); if (m) { m.className = 'msg ' + (D ? 'ok' : 'err'); m.textContent = D ? `✓ ${D.cats.length} kategori · ${D.series.length} seri` : 'En az 2 satır gerekli'; } }
        HOOK.draw(false); HOOK.persist(); });
    });
    pnl.querySelectorAll('[data-pal]').forEach(b => b.onclick = () => { S.palette = b.dataset.pal; S.colors = {}; paintStep(root); HOOK.draw(false); HOOK.persist(); });
    pnl.querySelectorAll('[data-col]').forEach(el => el.oninput = () => { S.colors = Object.assign({}, S.colors, { [el.dataset.col]: el.value }); HOOK.draw(false); HOOK.persist(); });
    if (q('#wz-sample')) q('#wz-sample').onclick = () => { S.data = SAMPLE; paintStep(root); HOOK.draw(true); HOOK.persist(); };
    if (q('#wz-x')) q('#wz-x').onchange = e => { const f = e.target.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = ev => { try { const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, blankrows: false }).filter(r => r.some(x => x !== null && x !== '')).slice(0, 60);
      S.data = rows.map(r => r.map(x => x instanceof Date ? x.toLocaleDateString('tr-TR') : x ?? '').join('\t')).join('\n'); paintStep(root); HOOK.draw(true); HOOK.persist(); } catch (_) { alert('Dosya okunamadı'); } }; fr.readAsArrayBuffer(f); };
    if (q('#wz-play')) q('#wz-play').onclick = () => HOOK.draw(true);
    if (q('#wz-dl')) q('#wz-dl').onclick = e => { e.stopPropagation(); G.Export.openMenu(q('#wz-dl'), current); };
    if (q('#wz-add')) q('#wz-add').onclick = () => { const c = current(); if (c) { G.Basket.add(c); q('#wz-msg').className = 'msg ok'; q('#wz-msg').textContent = 'Sunuma eklendi ✓'; } };
    if (q('#wz-save')) q('#wz-save').onclick = async () => { const all = await G.Cards.styles(); const list = (all['sihirbaz:kutuphane'] && all['sihirbaz:kutuphane'].list || []).slice(0, 39);
      const item = Object.assign({}, S, { at: Date.now() }); delete item.step; list.unshift(item); await G.Cards.putStyle('sihirbaz:kutuphane', { list }); q('#wz-msg').className = 'msg ok'; q('#wz-msg').textContent = 'Kaydedildi ✓'; lib(root); };
    lib(root);
  }
  function paintAll(root) { paintStep(root); HOOK.draw(true); }

  G.renderSihirbaz = function (root) {
    if (chart) { chart.dispose(); chart = null; } if (ro) ro.disconnect();
    HOOK = { draw, persist, embedded: false };
    if (!S) { try { S = Object.assign({}, DEF, JSON.parse(localStorage.getItem('wz') || '{}')); } catch (_) { S = Object.assign({}, DEF); } }
    root.innerHTML = `<div class="wz"><section class="panel"><div class="wz-steps"></div><div class="wz-panel"></div></section>
      <div class="wz-prev"><div class="ccard" id="wz-prevcard"><div class="cc-h"><div><b><i class="ti ti-eye"></i> <span id="wz-t"></span></b><small id="wz-s"></small></div></div>
        <div class="cc-body" id="wz-chart"></div><div class="dtwrap" id="wz-table"></div><div class="cc-foot" id="wz-n"></div></div></div></div>`;
    paintAll(root);
    ro = new ResizeObserver(() => chart && chart.resize()); ro.observe(root.querySelector('#wz-chart'));
  };
  function optionFor(S0) { const o = finalOption(S0); if (o && S0.bg && S0.bg !== 'saydam') o.backgroundColor = S0.bg === 'düz renk' ? S0.bg1 : { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: S0.bg1 }, { offset: 1, color: S0.bg2 }] }; return o; }
  // Excel → Grafik kartları için gömülü düzenleyici (çekmece)
  function openEditor(ctx) {
    closeEditor(true);
    const d = document.createElement('div'); d.className = 'drawer wzd'; document.body.appendChild(d);
    S = ctx.S; S.step = S.step || 2;
    d.innerHTML = `<div class="dr-head"><div><b><i class="ti ti-wand"></i> ${esc(ctx.name)}</b><small>Sihirbazın tüm seçenekleri · değişiklikler anında görünür</small></div><button class="icon-btn" id="wzd-x"><i class="ti ti-x"></i></button></div>
      <div class="dr-body"><div class="wz-steps"></div><div class="wz-panel"></div></div>
      <div class="dr-foot"><span class="msg" id="wzd-msg"></span><button class="btn ghost" id="wzd-reset"><i class="ti ti-restore"></i> Sıfırla</button>
        <button class="btn ghost" id="wzd-all"><i class="ti ti-copy"></i> Tümüne uygula</button><button class="btn gold" id="wzd-save"><i class="ti ti-device-floppy"></i> Kaydet</button></div>`;
    HOOK = { embedded: true, draw: play => { ctx.onChange(S, play); }, persist: () => {} };
    paintStep(d);
    const msg = d.querySelector('#wzd-msg'), ok = t => { msg.className = 'msg ok'; msg.textContent = t; };
    d.querySelector('#wzd-x').onclick = () => closeEditor();
    d.querySelector('#wzd-save').onclick = async () => { await ctx.onSave(S, false); ok('Kaydedildi ✓'); };
    d.querySelector('#wzd-all').onclick = async () => { await ctx.onSave(S, true); ok('Tüm grafiklere uygulandı ✓'); };
    d.querySelector('#wzd-reset').onclick = async () => { await ctx.onReset(); closeEditor(); };
    G.__wzClose = ctx.onClose;
    requestAnimationFrame(() => d.classList.add('open'));
  }
  function closeEditor(silent) { const d = document.querySelector('.drawer.wzd'); if (d) { d.classList.remove('open'); setTimeout(() => d.remove(), 300); }
    if (HOOK && HOOK.embedded) { S = null; HOOK = null; } if (!silent && G.__wzClose) { const f = G.__wzClose; G.__wzClose = null; f(); } }
  G.Wizard = { openEditor, closeEditor, optionFor, DEF, TYPES };
  G.__wizard = { build, parseData, TYPES, SHAPES, DEF, finalOption, optionFor };
})(typeof window !== 'undefined' ? window : globalThis);
