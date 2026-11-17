// Veri dolu Excel giriş sekmesi: şablona göre eşleştirme + 12 hazır grafik
(function (G) {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s ?? '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
  const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const PAL = ['#f2d68a', '#5fb8f0', '#5dcaa5', '#c9a24a', '#8fa2ff', '#f0997b', '#3b7cb8', '#e9c46a', '#9fe1cb', '#ed93b1', '#7f93b8', '#d4b46a'];
  const TXT = '#b5c3dc', LINE = 'rgba(120,160,230,.14)';

  // ---------- number helpers ----------
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v === null || v === undefined || v === '') return 0;
    let s = String(v).replace(/[^\d,.\-]/g, '');
    if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (s.includes(',')) s = s.replace(',', '.');
    const n = parseFloat(s); return isFinite(n) ? n : 0;
  }
  function fmt(n, type) {
    const a = Math.abs(n);
    const short = a >= 1e9 ? (n / 1e9).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' Mr'
      : a >= 1e6 ? (n / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' M'
      : a >= 1e4 ? (n / 1e3).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' bin'
      : n.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
    if (type === 'Para') return '₺ ' + short;
    if (type === 'Yüzde') return '%' + n.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
    return short;
  }

  // ---------- time key ----------
  function timeKey(v) {
    if (v instanceof Date && !isNaN(v)) return { key: v.getFullYear() * 100 + v.getMonth(), label: AYLAR[v.getMonth()] + ' ' + String(v.getFullYear()).slice(2) };
    if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5)); return timeKey(d); }
    const s = String(v ?? '').trim();
    if (!s) return null;
    const n = norm(s);
    const tr = ['oca', 'şub', 'mar', 'nis', 'may', 'haz', 'tem', 'ağu', 'eyl', 'eki', 'kas', 'ara'];
    const en = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    let mi = tr.findIndex(m => n.startsWith(m)); if (mi < 0) mi = en.findIndex(m => n.startsWith(m));
    const y = (s.match(/(20\d\d|\b\d\d\b)/) || [])[1];
    if (mi >= 0) { const yy = y ? (y.length === 2 ? 2000 + +y : +y) : 0; return { key: yy * 100 + mi, label: AYLAR[mi] + (y ? ' ' + String(yy).slice(2) : '') }; }
    const m = s.match(/^(\d{1,2})[./-](\d{4})$/) || s.match(/^(\d{4})[./-](\d{1,2})$/);
    if (m) { const a = +m[1], b = +m[2]; const yy = a > 31 ? a : b, mm = (a > 31 ? b : a) - 1; return { key: yy * 100 + mm, label: AYLAR[mm] + ' ' + String(yy).slice(2) }; }
    return { key: s, label: s, text: true };
  }

  // ---------- model built from template + rows ----------
  function buildModel(tpl, rows) {
    const cols = tpl.columns.filter(c => c.role !== 'Kullanma');
    const dims = cols.filter(c => c.role === 'Kırılım').map(c => c.name);
    const measures = cols.filter(c => c.role === 'Ölçü');
    const timeCol = (cols.find(c => c.role === 'Zaman') || {}).name;
    const targetCol = cols.find(c => c.role === 'Hedef');
    const primary = measures.find(m => m.type === 'Para') || measures.find(m => m.type !== 'Yüzde') || measures[0];
    const secondary = measures.find(m => m !== primary && m.type !== 'Yüzde');
    // time order
    let times = [];
    if (timeCol) {
      const seen = new Map(); let textOrder = 0;
      rows.forEach(r => { const t = timeKey(r[timeCol]); if (t && !seen.has(t.label)) seen.set(t.label, t.text ? { ...t, key: 1e9 + textOrder++ } : t); r.__t = t ? t.label : null; });
      times = [...seen.values()].sort((a, b) => a.key - b.key).map(t => t.label);
    }
    return { tpl, rows, dims, measures, primary, secondary, timeCol, targetCol, times };
  }
  function sumBy(rows, keyFn, valCol) {
    const m = new Map();
    rows.forEach(r => { const k = keyFn(r); if (k === null || k === undefined || k === '') return; m.set(k, (m.get(k) || 0) + num(r[valCol])); });
    return m;
  }
  let CUR = {}; // settings of the chart being built
  function topN(map, n, other) {
    if (CUR.topN > 0) n = CUR.topN;
    let arr = [...map.entries()].sort((a, b) => b[1] - a[1]);
    if (arr.length > n) { const head = arr.slice(0, n), rest = arr.slice(n).reduce((s, x) => s + x[1], 0); arr = other ? head.concat([['Diğer', rest]]) : head; }
    if (CUR.sort === 'asc') arr.sort((a, b) => a[1] - b[1]);
    else if (CUR.sort === 'alpha') arr.sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'tr'));
    return arr;
  }

  // ---------- common chart styling ----------
  const base = () => ({
    backgroundColor: 'transparent', color: PAL, animationDuration: 900, animationEasing: 'cubicOut',
    textStyle: { fontFamily: 'Segoe UI, system-ui, sans-serif', color: TXT },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(6,16,36,.95)', borderColor: 'rgba(242,214,138,.35)', textStyle: { color: '#eaf0fa' } },
    grid: { left: 12, right: 18, top: 36, bottom: 10, containLabel: true }
  });
  const xCat = (data, rotate) => ({ type: 'category', data, axisLine: { lineStyle: { color: LINE } }, axisTick: { show: false }, axisLabel: { color: TXT, rotate: rotate || 0, hideOverlap: true } });
  const yVal = (type, extra) => Object.assign({ type: 'value', splitLine: { lineStyle: { color: LINE } }, axisLabel: { color: TXT, formatter: v => fmt(v, type) } }, extra || {});
  const legend = { top: 0, right: 0, textStyle: { color: TXT }, icon: 'roundRect', itemWidth: 10, itemHeight: 10 };
  const grad = (c1, c2) => ({ type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] });

  // ---------- the 12 charts ----------
  // each returns {title, sub, option} or {title, need}
  const CHARTS = [
    { id: 'cizgi', name: 'Çizgi', icon: 'ti-chart-line', build: M => {
      if (!M.timeCol || !M.primary) return { need: 'bir Zaman ve bir Ölçü sütunu' };
      const a = sumBy(M.rows, r => r.__t, M.primary.name);
      const series = [{ name: M.primary.name, type: 'line', smooth: true, symbolSize: 7, lineStyle: { width: 3 }, data: M.times.map(t => a.get(t) || 0),
        areaStyle: { color: grad('rgba(242,214,138,.28)', 'rgba(242,214,138,0)') } }];
      if (M.targetCol) { const h = sumBy(M.rows, r => r.__t, M.targetCol.name); series.push({ name: M.targetCol.name, type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2, type: 'dashed', color: '#5fb8f0' }, itemStyle: { color: '#5fb8f0' }, data: M.times.map(t => h.get(t) || 0) }); }
      return { sub: M.primary.name + ' · zaman içinde' + (M.targetCol ? ' · hedefle birlikte' : ''), option: { ...base(), legend, xAxis: xCat(M.times), yAxis: yVal(M.primary.type), series } };
    } },
    { id: 'sutun', name: 'Sütun', icon: 'ti-chart-bar', build: M => {
      const d = M.dims[1] || M.dims[0]; if (!d || !M.primary) return { need: 'bir Kırılım ve bir Ölçü sütunu' };
      const arr = topN(sumBy(M.rows, r => r[d], M.primary.name), 12);
      return { sub: M.primary.name + ' · ' + d + ' bazında', option: { ...base(), xAxis: xCat(arr.map(x => x[0]), arr.length > 6 ? 30 : 0), yAxis: yVal(M.primary.type),
        series: [{ type: 'bar', name: M.primary.name, barMaxWidth: 46, data: arr.map(x => x[1]), itemStyle: { borderRadius: [6, 6, 0, 0], color: grad('#f2d68a', '#9c7a2e') },
          label: { show: true, position: 'top', color: '#eaf0fa', formatter: p => fmt(p.value, M.primary.type) } }] } };
    } },
    { id: 'bar', name: 'Yatay bar', icon: 'ti-chart-bar-popular', build: M => {
      const d = M.dims[0]; if (!d || !M.primary) return { need: 'bir Kırılım ve bir Ölçü sütunu' };
      const arr = topN(sumBy(M.rows, r => r[d], M.primary.name), 10).reverse();
      return { sub: 'İlk 10 ' + d + ' · ' + M.primary.name, option: { ...base(), tooltip: { ...base().tooltip, trigger: 'item' }, grid: { left: 12, right: 60, top: 10, bottom: 10, containLabel: true },
        xAxis: yVal(M.primary.type, { splitLine: { show: false }, axisLabel: { show: false } }), yAxis: { ...xCat(arr.map(x => x[0])), axisLabel: { color: '#eaf0fa' } },
        series: [{ type: 'bar', barMaxWidth: 22, data: arr.map((x, i) => ({ value: x[1], itemStyle: { color: i === arr.length - 1 ? '#f2d68a' : '#5fb8f0', borderRadius: [0, 6, 6, 0] } })),
          label: { show: true, position: 'right', color: TXT, formatter: p => fmt(p.value, M.primary.type) } }] } };
    } },
    { id: 'halka', name: 'Daire (halka)', icon: 'ti-chart-donut', build: M => {
      const d = M.dims[2] || M.dims[1] || M.dims[0]; if (!d || !M.primary) return { need: 'bir Kırılım ve bir Ölçü sütunu' };
      const arr = topN(sumBy(M.rows, r => r[d], M.primary.name), 7, true), tot = arr.reduce((s, x) => s + x[1], 0);
      return { sub: d + ' payları · ' + M.primary.name, option: { ...base(), tooltip: { trigger: 'item', formatter: p => p.name + '<br>' + fmt(p.value, M.primary.type) + ' · %' + p.percent }, legend: { ...legend, orient: 'vertical', top: 'middle', right: 4 },
        title: { text: fmt(tot, M.primary.type), subtext: 'toplam', left: '34%', top: '42%', textAlign: 'center', textStyle: { color: '#eaf0fa', fontSize: 18 }, subtextStyle: { color: TXT } },
        series: [{ type: 'pie', radius: ['48%', '74%'], center: ['35%', '52%'], padAngle: 2, itemStyle: { borderRadius: 6 }, label: { show: false }, data: arr.map(x => ({ name: x[0], value: x[1] })) }] } };
    } },
    { id: 'pasta', name: 'Pasta dilim', icon: 'ti-chart-pie', build: M => {
      const d = M.dims[0]; if (!d || !M.primary) return { need: 'bir Kırılım ve bir Ölçü sütunu' };
      const arr = topN(sumBy(M.rows, r => r[d], M.primary.name), 6, true);
      return { sub: d + ' dağılımı · ' + M.primary.name, option: { ...base(), tooltip: { trigger: 'item', formatter: p => p.name + '<br>' + fmt(p.value, M.primary.type) + ' · %' + p.percent },
        series: [{ type: 'pie', radius: '70%', center: ['50%', '54%'], itemStyle: { borderColor: '#0a1630', borderWidth: 2 },
          label: { color: '#eaf0fa', formatter: p => p.name + '\n%' + Math.round(p.percent) }, labelLine: { lineStyle: { color: TXT } }, data: arr.map(x => ({ name: x[0], value: x[1] })) }] } };
    } },
    { id: 'radar', name: 'Radar', icon: 'ti-chart-radar', build: M => {
      const d = M.dims[1] || M.dims[0]; const ms = M.measures.concat(M.targetCol ? [M.targetCol] : []);
      if (!d || ms.length < 3) return { need: 'bir Kırılım ve en az 3 Ölçü/Hedef sütunu' };
      const groups = topN(sumBy(M.rows, r => r[d], M.primary.name), 4).map(x => x[0]);
      const vals = groups.map(g => ms.map(m => { const rs = M.rows.filter(r => r[d] === g); const s = rs.reduce((a, r) => a + num(r[m.name]), 0); return m.type === 'Yüzde' ? s / (rs.length || 1) : s; }));
      const max = ms.map((m, i) => Math.max(...vals.map(v => v[i]), 1));
      return { sub: d + ' karşılaştırması · ' + ms.length + ' gösterge', option: { ...base(), tooltip: { trigger: 'item' }, legend,
        radar: { indicator: ms.map((m, i) => ({ name: m.name, max: max[i] * 1.1 })), radius: '64%', center: ['50%', '56%'], axisName: { color: TXT }, splitLine: { lineStyle: { color: LINE } }, splitArea: { areaStyle: { color: ['rgba(95,184,240,.03)', 'rgba(95,184,240,.06)'] } }, axisLine: { lineStyle: { color: LINE } } },
        series: [{ type: 'radar', symbolSize: 5, areaStyle: { opacity: .18 }, data: groups.map((g, i) => ({ name: String(g), value: vals[i] })) }] } };
    } },
    { id: 'alan', name: 'Alan', icon: 'ti-chart-area-line', build: M => {
      if (!M.timeCol || !M.primary) return { need: 'bir Zaman ve bir Ölçü sütunu' };
      const cum = map => { let s = 0; return M.times.map(t => (s += map.get(t) || 0)); };
      const series = [{ name: M.primary.name + ' (kümülatif)', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#f2d68a' }, areaStyle: { color: grad('rgba(242,214,138,.45)', 'rgba(242,214,138,.02)') }, data: cum(sumBy(M.rows, r => r.__t, M.primary.name)) }];
      if (M.targetCol) series.push({ name: M.targetCol.name + ' (kümülatif)', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#5fb8f0' }, areaStyle: { color: grad('rgba(95,184,240,.30)', 'rgba(95,184,240,.02)') }, data: cum(sumBy(M.rows, r => r.__t, M.targetCol.name)) });
      return { sub: 'Yıl içi birikimli toplam', option: { ...base(), legend, xAxis: { ...xCat(M.times), boundaryGap: false }, yAxis: yVal(M.primary.type), series } };
    } },
    { id: 'yigilmis', name: 'Yığılmış sütun', icon: 'ti-chart-bar', build: M => {
      const d = M.dims[1] || M.dims[0]; if (!M.timeCol || !d || !M.primary) return { need: 'bir Zaman, bir Kırılım ve bir Ölçü sütunu' };
      const groups = topN(sumBy(M.rows, r => r[d], M.primary.name), 6).map(x => x[0]);
      return { sub: M.primary.name + ' · ' + d + ' kırılımıyla', option: { ...base(), legend, xAxis: xCat(M.times), yAxis: yVal(M.primary.type),
        series: groups.map(g => { const m = sumBy(M.rows.filter(r => r[d] === g), r => r.__t, M.primary.name); return { name: String(g), type: 'bar', stack: 's', barMaxWidth: 40, data: M.times.map(t => m.get(t) || 0) }; }) } };
    } },
    { id: 'kombine', name: 'Sütun + çizgi', icon: 'ti-chart-histogram', build: M => {
      if (!M.timeCol || !M.primary) return { need: 'bir Zaman ve bir Ölçü sütunu' };
      const a = M.times.map(t => sumBy(M.rows, r => r.__t, M.primary.name).get(t) || 0);
      const g = a.map((v, i) => i === 0 || !a[i - 1] ? null : +(((v / a[i - 1]) - 1) * 100).toFixed(1));
      return { sub: M.primary.name + ' ve aylık büyüme %', option: { ...base(), legend, xAxis: xCat(M.times),
        yAxis: [yVal(M.primary.type), yVal('Yüzde', { splitLine: { show: false } })],
        series: [{ name: M.primary.name, type: 'bar', barMaxWidth: 36, itemStyle: { borderRadius: [5, 5, 0, 0], color: grad('#5fb8f0', '#2e5c8a') }, data: a },
          { name: 'Büyüme %', type: 'line', yAxisIndex: 1, smooth: false, symbolSize: 7, lineStyle: { width: 3, color: '#f2d68a' }, itemStyle: { color: '#f2d68a' }, data: g }] } };
    } },
    { id: 'selale', name: 'Şelale', icon: 'ti-stairs-up', build: M => {
      const d = M.dims[1] || M.dims[0]; if (!d || !M.primary) return { need: 'bir Kırılım ve bir Ölçü sütunu' };
      const arr = topN(sumBy(M.rows, r => r[d], M.primary.name), 7, true); let acc = 0;
      const helper = [], vals = [];
      arr.forEach(x => { helper.push(acc); vals.push(x[1]); acc += x[1]; });
      const cats = arr.map(x => String(x[0])).concat(['Toplam']); helper.push(0); vals.push(acc);
      return { sub: M.primary.name + ' toplamının ' + d + ' bazında oluşumu', option: { ...base(), tooltip: { ...base().tooltip, formatter: p => { const q = p.find(x => x.seriesName === 'v'); return q.name + '<br>' + fmt(q.value, M.primary.type); } },
        xAxis: xCat(cats, cats.length > 6 ? 30 : 0), yAxis: yVal(M.primary.type),
        series: [{ name: 'h', type: 'bar', stack: 'w', itemStyle: { color: 'transparent' }, emphasis: { disabled: true }, data: helper },
          { name: 'v', type: 'bar', stack: 'w', barMaxWidth: 44, data: vals.map((v, i) => ({ value: v, itemStyle: { color: i === vals.length - 1 ? '#f2d68a' : '#5dcaa5', borderRadius: 4 } })),
            label: { show: true, position: 'top', color: TXT, formatter: p => fmt(p.value, M.primary.type) } }] } };
    } },
    { id: 'isi', name: 'Isı haritası', icon: 'ti-grid-dots', wide: true, build: M => {
      const d = M.dims[0]; if (!M.timeCol || !d || !M.primary) return { need: 'bir Zaman, bir Kırılım ve bir Ölçü sütunu' };
      const groups = topN(sumBy(M.rows, r => r[d], M.primary.name), 12).map(x => x[0]).reverse();
      const data = []; let mx = 0;
      groups.forEach((g, yi) => { const m = sumBy(M.rows.filter(r => r[d] === g), r => r.__t, M.primary.name); M.times.forEach((t, xi) => { const v = m.get(t) || 0; mx = Math.max(mx, v); data.push([xi, yi, v]); }); });
      return { sub: d + ' × zaman · ' + M.primary.name, option: { ...base(), tooltip: { trigger: 'item', backgroundColor: 'rgba(6,16,36,.95)', textStyle: { color: '#eaf0fa' }, formatter: p => groups[p.value[1]] + ' · ' + M.times[p.value[0]] + '<br>' + fmt(p.value[2], M.primary.type) },
        grid: { left: 12, right: 70, top: 10, bottom: 10, containLabel: true }, xAxis: { ...xCat(M.times), splitArea: { show: false } }, yAxis: { ...xCat(groups.map(String)), axisLabel: { color: '#eaf0fa' } },
        visualMap: { min: 0, max: mx || 1, calculable: true, orient: 'vertical', right: 0, top: 'middle', itemHeight: 140, textStyle: { color: TXT }, inRange: { color: ['#0f1f42', '#2e5c8a', '#5fb8f0', '#f2d68a'] }, formatter: v => fmt(v, M.primary.type) },
        series: [{ type: 'heatmap', data, itemStyle: { borderColor: '#0a1630', borderWidth: 2, borderRadius: 4 } }] } };
    } },
    { id: 'gosterge', name: 'Gösterge (kadran)', icon: 'ti-gauge', build: M => {
      let val, label, sub;
      if (M.targetCol && M.primary) {
        const a = M.rows.reduce((s, r) => s + num(r[M.primary.name]), 0), h = M.rows.reduce((s, r) => s + num(r[M.targetCol.name]), 0);
        val = h ? a / h * 100 : 0; label = 'Hedef gerçekleşme'; sub = fmt(a, M.primary.type) + ' / ' + fmt(h, M.targetCol.type);
      } else if (M.dims[0] && M.primary) {
        const arr = topN(sumBy(M.rows, r => r[M.dims[0]], M.primary.name), 1), tot = M.rows.reduce((s, r) => s + num(r[M.primary.name]), 0);
        val = tot ? arr[0][1] / tot * 100 : 0; label = 'En büyük ' + M.dims[0] + ' payı'; sub = String(arr[0][0]);
      } else return { need: 'bir Hedef ya da Kırılım + Ölçü sütunu' };
      return { sub: label + ' · ' + sub, option: { ...base(), tooltip: { show: false },
        series: [{ type: 'gauge', min: 0, max: Math.max(120, Math.ceil(val / 10) * 10), radius: '92%', center: ['50%', '60%'], startAngle: 205, endAngle: -25,
          progress: { show: true, width: 16, roundCap: true, itemStyle: { color: grad('#f2d68a', '#c9a24a') } },
          axisLine: { lineStyle: { width: 16, color: [[1, 'rgba(120,160,230,.15)']] } }, axisTick: { show: false }, splitLine: { length: 8, lineStyle: { color: LINE, width: 2 } },
          axisLabel: { color: TXT, distance: 22 }, pointer: { show: true, length: '58%', width: 5, itemStyle: { color: '#5fb8f0' } }, anchor: { show: true, size: 12, itemStyle: { color: '#f2d68a' } },
          detail: { valueAnimation: true, offsetCenter: [0, '38%'], fontSize: 28, fontWeight: 600, color: '#eaf0fa', formatter: v => '%' + v.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) },
          title: { offsetCenter: [0, '62%'], color: TXT, fontSize: 12 }, data: [{ value: +val.toFixed(1), name: label }] }] } };
    } }
  ];

  const BASE = { gosterge: M => M.targetCol ? 'Gerçekleşen ÷ hedef' : 'En büyük kalemin toplamdaki payı', radar: () => 'Kırılım bazında toplamlar (yüzde sütunları ortalama)',
    kombine: () => 'Aylık toplam; büyüme bir önceki aya göre', alan: () => 'Ay ay biriken toplam' };
  function noteFor(c, M, info) {
    const per = M.times.length ? M.times[0] + (M.times.length > 1 ? '–' + M.times[M.times.length - 1] : '') : 'tüm satırlar';
    const base = BASE[c.id] ? BASE[c.id](M) : (M.primary ? M.primary.name + ' toplamı' : '');
    return 'Kaynak: ' + info.file + ' · Dönem: ' + per + ' · Taban: ' + base;
  }

  // ---------- KPIs ----------
  function kpis(M) {
    const out = [];
    M.measures.filter(m => m.type !== 'Yüzde').slice(0, 2).forEach(m => out.push({ l: 'Toplam ' + m.name, v: fmt(M.rows.reduce((s, r) => s + num(r[m.name]), 0), m.type), i: m.type === 'Para' ? 'ti-coins' : 'ti-package' }));
    if (M.targetCol && M.primary) {
      const a = M.rows.reduce((s, r) => s + num(r[M.primary.name]), 0), h = M.rows.reduce((s, r) => s + num(r[M.targetCol.name]), 0);
      const p = h ? a / h * 100 : 0; out.push({ l: 'Hedef gerçekleşme', v: '%' + p.toLocaleString('tr-TR', { maximumFractionDigits: 1 }), i: 'ti-target-arrow', c: p >= 100 ? 'up' : p >= 95 ? 'mid' : 'down' });
    }
    if (M.dims[0]) out.push({ l: M.dims[0] + ' sayısı', v: new Set(M.rows.map(r => r[M.dims[0]]).filter(Boolean)).size, i: 'ti-users' });
    if (M.times.length) out.push({ l: 'Dönem', v: M.times[0] + (M.times.length > 1 ? ' – ' + M.times[M.times.length - 1] : ''), i: 'ti-calendar' });
    return out.slice(0, 5);
  }

  // ---------- page ----------
  let charts = [], ro = null, STYLES = {};
  async function loadStyles() { try { STYLES = await (await fetch('/api/styles')).json() || {}; } catch (_) { STYLES = {}; } }
  async function putStyle(key, style) {
    if (style === null) delete STYLES[key]; else STYLES[key] = style;
    try { await fetch('/api/styles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, style }) }); } catch (_) {}
  }
  function disposeCharts() { charts.forEach(c => c.dispose && c.dispose()); charts = []; }

  function renderResult(root, M, info) {
    const box = root.querySelector('#v-result');
    const styleOf = id => Object.assign({}, STYLES[info.tplId + ':*'] || {}, STYLES[info.tplId + ':' + id] || {});
    const make = (c, st) => { let r; CUR = st || {}; try { r = c.build(M); } catch (e) { r = { need: 'uygun veri' }; console.error(c.id, e); } CUR = {};
      if (r.option && G.Stil) r.option = G.Stil.applyStyle(r.option, st); return { ...c, ...r, style: st }; };
    const built = CHARTS.map(c => make(c, styleOf(c.id)));
    box.innerHTML = `
      <div class="v-sum"><span class="filechip"><i class="ti ti-file-spreadsheet"></i>${esc(info.file)}</span>
        <span class="pill"><i class="ti ti-rows"></i>${M.rows.length.toLocaleString('tr-TR')} satır</span>
        <span class="pill ${info.missing.length ? 'warn' : 'ok'}"><i class="ti ti-${info.missing.length ? 'alert-triangle' : 'circle-check'}"></i>${info.auto ? info.total + " sütun tanındı" : info.matched + "/" + info.total + " sütun eşleşti"}</span>
        ${info.missing.length ? `<span class="pill warn" title="${esc(info.missing.join(', '))}">Eksik: ${esc(info.missing.slice(0, 3).join(', '))}${info.missing.length > 3 ? '…' : ''}</span>` : ''}
        <button class="btn ghost" id="v-reset" style="margin-left:auto"><i class="ti ti-upload"></i> Başka dosya</button>
        <button class="btn ghost" id="v-show"><i class="ti ti-player-play"></i> Sunum modu</button>
        <button class="btn" id="v-all-video"><i class="ti ti-movie"></i> Rapor PPTX (video)</button>
        <button class="btn" id="v-all-pptx"><i class="ti ti-presentation"></i> Rapor PPTX</button>
        <button class="btn gold" id="v-all"><i class="ti ti-file-type-pdf"></i> Rapor PDF</button></div>
      ${info.tpl && M.dims.length ? `<div class="v-sum v-filter"><span class="pill"><i class="ti ti-user-star"></i> Müşteriye özel rapor</span>
        <select class="fsel" id="v-fdim">${M.dims.map(d => `<option${info.filter && info.filter.dim === d ? ' selected' : ''}>${esc(d)}</option>`).join('')}</select>
        <select class="fsel" id="v-fval"><option value="">Tümü</option></select>${info.filter ? `<span class="pill ok"><i class="ti ti-filter"></i> ${esc(info.filter.dim)}: ${esc(info.filter.val)}</span>` : ''}</div>` : ''}
      <div class="kpis">${kpis(M).map(k => `<div class="kpi"><i class="ti ${k.i}"></i><div><span>${esc(k.l)}</span><b class="${k.c || ''}">${esc(k.v)}</b></div></div>`).join('')}</div>
      <div class="cgrid">${built.map((c, i) => `<div class="ccard${c.wide ? ' wide' : ''}" style="animation-delay:${i * 60}ms">
        <div class="cc-h"><div><b><i class="ti ${c.icon}"></i> <span class="cc-t">${esc(c.style.title || c.name)}</span></b><small class="cc-s">${esc(c.need ? 'Bu grafik için ' + c.need + ' gerekli' : (c.style.sub || c.sub))}</small></div>
          <div class="cc-tools"><button class="icon-btn gear" data-gear="${c.id}" title="Görünüm ayarları"${c.need ? ' disabled' : ''}><i class="ti ti-adjustments"></i></button><button class="icon-btn add" data-add="${c.id}" title="Sunuma ekle"${c.need ? ' disabled' : ''}><i class="ti ti-presentation-analytics"></i></button><button class="icon-btn dl" data-dl="${c.id}" title="İndir: PNG · PDF · PPTX"${c.need ? ' disabled' : ''}><i class="ti ti-download"></i></button></div></div>
        <div class="cc-body" id="ch-${c.id}">${c.need ? '<div class="empty-small"><i class="ti ti-chart-dots-3"></i><br>Şablonda gerekli sütun yok</div>' : ''}</div>
        ${c.need ? '' : `<div class="cc-foot"><i class="ti ti-info-circle"></i> ${esc(noteFor(c, M, info))}</div>`}</div>`).join('')}</div>`;
    box.querySelector('#v-reset').onclick = () => { if (G.Stil) G.Stil.close(); disposeCharts(); box.innerHTML = ''; root.querySelector('#v-setup').style.display = ''; };
    root.querySelector('#v-setup').style.display = 'none';
    disposeCharts();
    if (typeof echarts === 'undefined') { box.querySelectorAll('.cc-body').forEach(b => b.innerHTML = '<div class="empty-small">Grafik kütüphanesi yüklenemedi, sayfayı yenile.</div>'); return; }
    const byId = {}, CURRENT = {};
    built.forEach(c => { if (!c.need) CURRENT[c.id] = { title: c.style.title || c.name, sub: c.style.sub || c.sub, option: c.option, note: noteFor(c, M, info), measureType: M.primary && M.primary.type }; });
    built.forEach(c => { if (c.need) return; const el = box.querySelector('#ch-' + c.id); const ch = echarts.init(el, null, { renderer: 'canvas' }); ch.setOption(c.option); charts.push(ch); byId[c.id] = ch; });
    box.querySelectorAll('[data-gear]').forEach(btn => btn.onclick = () => {
      const c = CHARTS.find(x => x.id === btn.dataset.gear), card = btn.closest('.ccard'), ch = byId[c.id];
      const cur = built.find(x => x.id === c.id);
      const redraw = st => { const r = make(c, st); if (r.option) ch.setOption(r.option, true);
        CURRENT[c.id] = { title: st.title || c.name, sub: st.sub || r.sub, option: r.option, note: noteFor(c, M, info), measureType: M.primary && M.primary.type };
        card.querySelector('.cc-t').textContent = st.title || c.name; card.querySelector('.cc-s').textContent = st.sub || r.sub || ''; return r; };
      box.querySelectorAll('.ccard').forEach(x => x.classList.toggle('editing', x === card));
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      G.Stil.open({ name: c.name, sub: cur.sub, style: styleOf(c.id), kindGroup: G.Stil.kindGroup(cur.option),
        onChange: st => redraw(st),
        onPlay: st => { ch.clear(); redraw(st); },
        onSave: async (st, all) => {
          if (all) {
            await putStyle(info.tplId + ':*', st);
            for (const k of Object.keys(STYLES)) if (k.startsWith(info.tplId + ':') && !k.endsWith(':*')) { const v = STYLES[k]; await putStyle(k, (v.title || v.sub || v.kind) ? { title: v.title, sub: v.sub, kind: v.kind } : null); }
            renderResult(root, M, info);
          } else await putStyle(info.tplId + ':' + c.id, st);
        },
        onReset: async () => { await putStyle(info.tplId + ':' + c.id, null); redraw(styleOf(c.id)); card.classList.remove('editing'); }
      });
    });
    box.querySelectorAll('[data-dl]').forEach(btn => btn.onclick = e => { e.stopPropagation(); G.Export.openMenu(btn, () => CURRENT[btn.dataset.dl]); });
    const fd = box.querySelector('#v-fdim'), fv = box.querySelector('#v-fval');
    if (fd) {
      const vals = () => { const d = fd.value; const u = [...new Set(info.rows.map(r => r[d]).filter(v => v !== null && v !== undefined && v !== ''))].map(String).sort((a, b) => a.localeCompare(b, 'tr'));
        fv.innerHTML = '<option value="">Tümü</option>' + u.map(v => `<option${info.filter && info.filter.dim === d && info.filter.val === v ? ' selected' : ''}>${esc(v)}</option>`).join(''); };
      vals(); fd.onchange = vals;
      fv.onchange = () => { const d = fd.value, v = fv.value; const rows = v ? info.rows.filter(r => String(r[d]) === v) : info.rows;
        renderResult(root, buildModel(info.tpl, rows.map(r => { const o = Object.assign({}, r); delete o.__t; return o; })), Object.assign({}, info, { filter: v ? { dim: d, val: v } : null })); };
    }
    box.querySelectorAll('[data-add]').forEach(btn => btn.onclick = () => { const c = CURRENT[btn.dataset.add]; if (!c || !G.Basket) return; G.Basket.add(c); btn.classList.add('done'); btn.innerHTML = '<i class="ti ti-check"></i>';
      setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = '<i class="ti ti-presentation-analytics"></i>'; }, 1400); });
    box.querySelector('#v-show').onclick = () => G.Present && G.Present.start(CHARTS.filter(c => CURRENT[c.id]).map(c => CURRENT[c.id]));
    if (G.Basket) G.Basket.kpis = kpis(M).map(k => ({ l: k.l, v: k.v, c: k.c }));
    const reportInfo = () => ({ title: (info.tplName || 'Rapor') + (info.filter ? ' · ' + info.filter.val : ''), subtitle: info.file + ' · ' + M.rows.length.toLocaleString('tr-TR') + ' satır', kpis: kpis(M),
      note: 'Kaynak: ' + info.file + (M.times.length ? ' · Dönem: ' + M.times[0] + '–' + M.times[M.times.length - 1] : '') });
    box.querySelector('#v-all-pptx').onclick = async () => {
      const b = box.querySelector('#v-all-pptx'), old = b.innerHTML; b.disabled = true; b.innerHTML = '<i class="ti ti-loader-2"></i> Hazırlanıyor…';
      try { await G.PptExport.save(CHARTS.filter(c => CURRENT[c.id]).map(c => CURRENT[c.id]), reportInfo()); } catch (err) { console.error(err); alert('Sunum oluşturulamadı.'); }
      b.innerHTML = old; b.disabled = false;
    };
    box.querySelector('#v-all-video').onclick = async () => {
      const b = box.querySelector('#v-all-video'), old = b.innerHTML; b.disabled = true;
      try { await G.PptExport.saveVideo(CHARTS.filter(c => CURRENT[c.id]).map(c => CURRENT[c.id]), reportInfo(), (i, n) => b.innerHTML = '<i class="ti ti-loader-2"></i> Video kaydediliyor ' + i + '/' + n); }
      catch (err) { console.error(err); alert('Video sunum oluşturulamadı: ' + err.message); }
      b.innerHTML = old; b.disabled = false;
    };
    box.querySelector('#v-all').onclick = async () => {
      const b = box.querySelector('#v-all'), old = b.innerHTML; b.disabled = true;
      try {
        await G.Export.pdfAll(CHARTS.filter(c => CURRENT[c.id]).map(c => CURRENT[c.id]), {
          title: info.tplName || 'Rapor', subtitle: info.file + ' · ' + M.rows.length.toLocaleString('tr-TR') + ' satır', kpis: kpis(M),
          note: 'Kaynak: ' + info.file + (M.times.length ? ' · Dönem: ' + M.times[0] + '–' + M.times[M.times.length - 1] : '') },
          (i, n) => b.innerHTML = '<i class="ti ti-loader-2"></i> Hazırlanıyor ' + i + '/' + n);
      } catch (err) { console.error(err); alert('Rapor oluşturulamadı.'); }
      b.innerHTML = old; b.disabled = false;
    };
    if (ro) ro.disconnect(); ro = new ResizeObserver(() => charts.forEach(c => c.resize())); ro.observe(box);
    G.__lastModel = M;
  }

  function matchColumns(tpl, header) {
    const idx = new Map(header.map((h, i) => [norm(h), i]));
    const map = {}, missing = [];
    tpl.columns.forEach(c => { if (c.role === 'Kullanma') return; const i = idx.get(norm(c.name)); if (i === undefined) missing.push(c.name); else map[c.name] = i; });
    return { map, missing };
  }

  function readFile(root, tpl, file, all) {
    const msg = root.querySelector('#v-msg');
    const fr = new FileReader();
    fr.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
        // her şablon × her sayfa × ilk 30 satır içinde en iyi eşleşmeyi bul
        const sheets = wb.SheetNames.map(n => ({ n, raw: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, blankrows: false, defval: null }) }));
        const score = t => { let b = null; sheets.forEach(sh => sh.raw.slice(0, 30).forEach((r, i) => { const hdr = r.map(x => String(x ?? '')); const mm = matchColumns(t, hdr);
          const tot = t.columns.filter(c => c.role !== 'Kullanma').length, ok = tot - mm.missing.length, sc = tot ? ok / tot : 0;
          if (!b || sc > b.sc || (sc === b.sc && sh.n === t.sheet && b.sheet !== t.sheet)) b = { sc, ok, tot, sheet: sh.n, raw: sh.raw, hi: i }; })); return b; };
        let pick = score(tpl), switched = false;
        if (all && all.length > 1 && (!pick || pick.sc < 1)) { all.forEach(t => { if (t.id === tpl.id) return; const s2 = score(t); if (s2 && s2.ok > 0 && (!pick || s2.sc > pick.sc + .2)) { pick = s2; tpl = t; switched = true; } }); }
        if (!pick || pick.ok === 0) { msg.className = 'msg err'; msg.textContent = 'Bu dosyadaki başlıklar kayıtlı şablonların hiçbiriyle eşleşmiyor. Önce bu dosyanın başlıklarıyla bir şablon kaydet.'; return; }
        const raw = pick.raw, hi = pick.hi;
        if (switched) { const sel = root.querySelector('#v-tpl'); if (sel) sel.value = tpl.id; try { localStorage.setItem('v-tpl', tpl.id); } catch (_) {} }
        const header = (raw[hi] || []).map(x => String(x ?? ''));
        const { map, missing } = matchColumns(tpl, header);
        const total = tpl.columns.filter(c => c.role !== 'Kullanma').length;
        const rows = raw.slice(hi + 1).map(r => { const o = {}; Object.entries(map).forEach(([k, i]) => o[k] = r[i]); return o; })
          .filter(o => Object.values(o).some(v => v !== null && v !== ''));
        if (!rows.length) { msg.className = 'msg err'; msg.textContent = 'Başlıklar eşleşti ama başlıkların altında veri satırı yok. Boş şablonu değil, dolu Excel dosyasını yükle.'; return; }
        const tplUsed = { ...tpl, columns: tpl.columns.filter(c => !missing.includes(c.name)) };
        msg.textContent = ''; renderResult(root, buildModel(tplUsed, rows), { tplId: tpl.id, tplName: tpl.name, file: file.name, matched: total - missing.length, total, missing, tpl: tplUsed, rows });
      } catch (err) { console.error(err); msg.className = 'msg err'; msg.textContent = 'Dosya işlenirken sorun oluştu (' + (err && err.message || err) + '). Bu mesajın ekran görüntüsünü gönderirsen hemen düzeltebilirim.'; }
    };
    fr.readAsArrayBuffer(file);
  }

  // ===================== Excel → Grafik (otomatik) =====================
  const sigOf = cols => { const t = cols.map(c => norm(c)).join('|'); let h = 5381; for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0; return 'a' + h.toString(16); };
  function autoDetect(wb) {
    const CG = G.ColGuess; let best = null;
    wb.SheetNames.forEach(n => {
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, blankrows: false, defval: null });
      // başlık: ilk 30 satırda, en az 2 metin hücresi olan ve altında veri bulunan satır
      let hi = -1;
      for (let i = 0; i < Math.min(30, raw.length); i++) {
        const r = raw[i] || [], txt = r.filter(v => typeof v === 'string' && v.trim()).length, nxt = raw[i + 1] || [];
        if (txt >= 2 && txt >= r.filter(v => v !== null && v !== '').length * .6 && nxt.some(v => v !== null && v !== '')) { hi = i; break; }
      }
      if (hi < 0) return;
      const head = raw[hi].map(h => String(h ?? '').trim()), body = raw.slice(hi + 1).filter(r => r.some(v => v !== null && v !== ''));
      const seen = {};
      const cols = head.map((name, i) => { if (!name) return null; let nm = name; if (seen[nm]) nm = name + ' (' + (++seen[name]) + ')'; else seen[nm] = 1;
        const smp = body.slice(0, 80).map(r => r[i]); let type = CG.guessType(name, smp);
        const vals = smp.filter(v => v !== null && v !== '');
        if (type === 'Metin' && vals.length && vals.filter(v => typeof v === 'number' || (typeof v === 'string' && /^-?[\d.,]+\s*(₺|%|tl)?$/i.test(v.trim()))).length >= vals.length * .8) type = /%/.test(name) ? 'Yüzde' : 'Sayı';
        if ((type === 'Para' || type === 'Sayı' || type === 'Yüzde') && vals.length && vals.filter(v => typeof v === 'string' && !/\d/.test(v)).length > vals.length * .5) type = 'Metin';
        if (type === 'Tarih' && vals.length && !vals.some(v => v instanceof Date || timeKey(v))) type = 'Metin';
        return { name: nm, i, type, role: CG.guessRole(name, type) }; }).filter(Boolean);
      // çok fazla farklı değeri olan metin sütunları (ör. açıklama, kod) kırılım olarak kullanılmasın
      cols.forEach(c => { if (c.role !== 'Kırılım') return; const u = new Set(body.map(r => r[c.i])).size; if (u > 300 && u > body.length * .9) c.role = 'Kullanma'; });
      const tz = cols.filter(c => c.role === 'Zaman'); tz.slice(1).forEach(c => c.role = 'Kırılım');
      const sc = body.length * Math.max(1, cols.filter(c => c.role === 'Ölçü').length);
      if (!best || sc > best.sc) best = { sc, sheet: n, head, body, cols, hi };
    });
    return best;
  }
  let AUTO = null;
  function autoRender(root) {
    const A = AUTO, msg = root.querySelector('#v-msg');
    const cols = A.cols.map(c => Object.assign({}, c, (A.over || {})[c.name] || {}));
    const tpl = { id: A.sig, name: A.file.replace(/\.[^.]+$/, ''), sheet: A.sheet, columns: cols.map(({ name, type, role }) => ({ name, type, role })) };
    const used = tpl.columns.filter(c => c.role !== 'Kullanma');
    if (!used.some(c => c.role === 'Ölçü' || c.role === 'Hedef')) { msg.className = 'msg err'; msg.textContent = 'Bu dosyada grafik çizilecek sayısal bir sütun bulamadım. Aşağıdan bir sütunu "Ölçü" yapabilirsin.'; }
    const rows = A.body.map(r => { const o = {}; cols.forEach(c => { if (c.role !== 'Kullanma') o[c.name] = r[c.i]; }); return o; });
    const tplUsed = { ...tpl, columns: used };
    disposeCharts();
    renderResult(root, buildModel(tplUsed, rows), { tplId: A.sig, tplName: tpl.name, file: A.file, matched: used.length, total: used.length, missing: [], tpl: tplUsed, rows, auto: true });
    // sütun düzeltme paneli
    const sum = root.querySelector('#v-result .v-sum');
    if (sum) { sum.insertAdjacentHTML('afterbegin', `<button class="btn ghost" id="v-colbtn"><i class="ti ti-columns-3"></i> Sütunları düzelt</button>`);
      sum.insertAdjacentHTML('afterend', `<section class="panel" id="v-cols" style="display:${A.open ? '' : 'none'};margin-bottom:18px"><div class="ph"><i class="ti ti-columns-3"></i> Sütunlar <small style="color:var(--muted);font-weight:400;margin-left:8px">${esc(A.sheet)} sayfası · ${A.body.length.toLocaleString('tr-TR')} satır · değişiklik bu dosya yapısı için hatırlanır</small></div>
        <div class="dtwrap" style="max-height:340px"><table class="coltable"><tr><th>Sütun</th><th>Örnek</th><th>Tür</th><th>Rol</th></tr>${cols.map(c => `<tr><td><b>${esc(c.name)}</b></td><td style="color:var(--muted);font-size:12px">${esc(String((A.body.find(r => r[c.i] !== null && r[c.i] !== '') || [])[c.i] instanceof Date ? (A.body.find(r => r[c.i]) || [])[c.i].toLocaleDateString('tr-TR') : (A.body.find(r => r[c.i] !== null && r[c.i] !== '') || [])[c.i] ?? '').slice(0, 24))}</td>
          <td><select data-cn="${esc(c.name)}" data-k="type">${G.ColGuess.TYPES.map(t => `<option${t === c.type ? ' selected' : ''}>${t}</option>`).join('')}</select></td>
          <td><select data-cn="${esc(c.name)}" data-k="role">${G.ColGuess.ROLES.map(t => `<option${t === c.role ? ' selected' : ''}>${t}</option>`).join('')}</select></td></tr>`).join('')}</table></div>
        <div style="display:flex;gap:8px;margin-top:10px"><button class="btn ghost" id="v-colreset"><i class="ti ti-restore"></i> Otomatik tahmine dön</button></div></section>`);
      root.querySelector('#v-colbtn').onclick = () => { A.open = !A.open; root.querySelector('#v-cols').style.display = A.open ? '' : 'none'; };
      root.querySelectorAll('#v-cols select').forEach(sl => sl.onchange = async () => { A.over = A.over || {}; const k = sl.dataset.cn; A.over[k] = Object.assign({}, A.over[k], { [sl.dataset.k]: sl.value });
        await saveOver(A); autoRender(root); });
      root.querySelector('#v-colreset').onclick = async () => { A.over = {}; await saveOver(A); autoRender(root); };
    }
  }
  async function saveOver(A) { STYLES['cols:' + A.sig] = { over: A.over }; try { await fetch('/api/styles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'cols:' + A.sig, style: Object.keys(A.over).length ? { over: A.over } : null }) }); } catch (_) {} }
  function autoRead(root, file) {
    const msg = root.querySelector('#v-msg'); msg.className = 'msg ok'; msg.textContent = 'Okunuyor…';
    const fr = new FileReader();
    fr.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
        const d = autoDetect(wb);
        if (!d) { msg.className = 'msg err'; msg.textContent = 'Bu dosyada başlık satırı olan bir tablo bulamadım. İlk satırlarda sütun başlıkları olduğundan emin ol.'; return; }
        const sig = sigOf(d.cols.map(c => c.name));
        AUTO = { file: file.name, sheet: d.sheet, body: d.body, cols: d.cols, sig, over: ((STYLES['cols:' + sig] || {}).over) || {}, open: false };
        msg.textContent = ''; autoRender(root);
      } catch (err) { console.error(err); msg.className = 'msg err'; msg.textContent = 'Dosya işlenirken sorun oluştu (' + (err && err.message || err) + '). Bu mesajın ekran görüntüsünü gönderirsen hemen düzeltebilirim.'; }
    };
    fr.readAsArrayBuffer(file);
  }
  G.renderExcel = async function (root) {
    disposeCharts(); await loadStyles();
    root.innerHTML = `<div id="v-setup"><section class="panel"><div class="ph"><i class="ti ti-table-import"></i> Excel → Grafik</div>
      <label class="drop" id="v-drop" style="min-height:240px"><input type="file" id="v-file" accept=".xlsx,.xls,.xlsm,.csv" hidden>
        <div class="drop-ic"><i class="ti ti-table-import"></i></div><b>Herhangi bir Excel dosyasını buraya bırak</b><span>ya da tıklayıp seç · sütunlar otomatik tanınır, grafikler anında oluşur</span></label>
      <span class="msg" id="v-msg"></span></section></div><div id="v-result"></div>`;
    const inp = root.querySelector('#v-file'), drop = root.querySelector('#v-drop');
    inp.onchange = () => { const f = inp.files[0]; inp.value = ''; f && autoRead(root, f); };
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); e.dataTransfer.files[0] && autoRead(root, e.dataTransfer.files[0]); };
    if (AUTO) autoRender(root);
  };
  G.__auto = { autoDetect, sigOf };

  G.renderVeri = async function (root) {
    disposeCharts(); await loadStyles();
    root.innerHTML = `<div id="v-setup"><section class="panel"><div class="ph"><i class="ti ti-table-import"></i> Veri yükle</div><div id="v-step"></div><span class="msg" id="v-msg"></span></section></div><div id="v-result"></div>`;
    const step = root.querySelector('#v-step');
    let list = []; try { list = await (await fetch('/api/templates')).json(); } catch (_) {}
    if (!list.length) { step.innerHTML = `<div class="empty-small"><i class="ti ti-books"></i><br>Önce bir şablon kaydetmelisin.<br><button class="btn gold" style="margin-top:14px" onclick="document.querySelector('[data-id=sablon]').click()"><i class="ti ti-file-spreadsheet"></i> Şablon sekmesine git</button></div>`; return; }
    let sel = list[0].id; try { sel = localStorage.getItem('v-tpl') || sel; } catch (_) {}
    if (!list.find(t => t.id === sel)) sel = list[0].id;
    step.innerHTML = `<div class="v-row"><label class="fld" style="flex:1"><span>1. Şablon seç</span><select id="v-tpl">${list.map(t => `<option value="${t.id}"${t.id === sel ? ' selected' : ''}>${esc(t.name)} · ${t.columns.length} sütun</option>`).join('')}</select></label></div>
      <label class="drop" id="v-drop" style="min-height:200px;margin-top:14px"><input type="file" id="v-file" accept=".xlsx,.xls,.xlsm,.csv" hidden>
        <div class="drop-ic"><i class="ti ti-table-import"></i></div><b>2. Dolu Excel'i buraya bırak</b><span>ya da tıklayıp seç · grafikler otomatik oluşur</span></label>`;
    const tplSel = step.querySelector('#v-tpl'), inp = step.querySelector('#v-file'), drop = step.querySelector('#v-drop');
    tplSel.onchange = () => { try { localStorage.setItem('v-tpl', tplSel.value); } catch (_) {} };
    const go = f => { const tpl = list.find(t => t.id === tplSel.value); const m = root.querySelector('#v-msg'); m.className = 'msg ok'; m.textContent = 'Okunuyor…'; readFile(root, tpl, f, list); };
    inp.onchange = () => { const f = inp.files[0]; inp.value = ''; f && go(f); };
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); e.dataTransfer.files[0] && go(e.dataTransfer.files[0]); };
  };
  // exported for tests
  G.__veri = { buildModel, CHARTS, kpis, timeKey, num, fmt };
})(typeof window !== 'undefined' ? window : globalThis);
