// PPTX dışa aktarma: düzenlenebilir PowerPoint grafikleri + giriş animasyonları
(function (G) {
  const BG = '081226', PANEL = '0F1F42', GOLD = 'F2D68A', TXT = 'B5C3DC', WHITE = 'EAF0FA', MUTED = '7F93B8', GRIDC = '23345C';

  // ---------- color helpers ----------
  function hslToHex(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))).toString(16).padStart(2, '0'); return (f(0) + f(8) + f(4)).toUpperCase(); }
  function hex(c) {
    if (!c) return null;
    if (typeof c === 'object' && c.colorStops) return hex(c.colorStops[0].color);
    c = String(c).trim();
    if (c.startsWith('#')) { let h = c.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join(''); return h.slice(0, 6).toUpperCase(); }
    let m = c.match(/hsla?\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%/); if (m) return hslToHex(+m[1], +m[2], +m[3]);
    m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); if (m) return [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('').toUpperCase();
    return null;
  }
  const val = d => (d && typeof d === 'object' && 'value' in d) ? (d.value === null ? 0 : +d.value) : (d === null || d === undefined ? 0 : +d);
  const seriesColor = (s, i, pal) => hex(s.itemStyle && s.itemStyle.color) || hex(s.lineStyle && s.lineStyle.color) || pal[i % pal.length];

  function numFormat(max, type) {
    const pre = type === 'Para' ? '"₺"' : '';
    if (type === 'Yüzde') return '0.0"%"';
    if (max >= 1e6) return pre + '#,##0.0,," M"';
    if (max >= 1e4) return pre + '#,##0," bin"';
    return pre + '#,##0';
  }

  // ---------- option -> slide spec ----------
  function spec(c) {
    const o = c.option, ser = o.series || [];
    const pal = (o.color || []).map(hex).filter(Boolean);
    const P = pal.length ? pal : ['F2D68A', '5FB8F0', '5DCAA5', 'C9A24A', '8FA2FF', 'F0997B', '3B7CB8', 'E9C46A'];
    const type = c.measureType || 'Sayı';
    const t0 = ser[0] && ser[0].type;
    if (t0 === 'heatmap') {
      const xs = o.xAxis.data, ys = o.yAxis.data; const grid = ys.map(() => xs.map(() => 0)); let mx = 0;
      ser[0].data.forEach(([x, y, v]) => { grid[y][x] = v; mx = Math.max(mx, v); });
      const stops = ((o.visualMap && o.visualMap.inRange && o.visualMap.inRange.color) || ['#0f1f42', '#2e5c8a', '#5fb8f0', '#f2d68a']).map(hex);
      return { kind: 'heat', xs, ys: ys.slice().reverse(), grid: grid.slice().reverse(), mx, stops, type };
    }
    if (t0 === 'gauge') return { kind: 'gauge', value: val(ser[0].data[0]), label: ser[0].data[0].name, color: hex(ser[0].progress && ser[0].progress.itemStyle && ser[0].progress.itemStyle.color) || GOLD };
    if (t0 === 'pie') {
      const d = ser[0].data.map(x => ({ n: String(x.name), v: val(x) }));
      const donut = Array.isArray(ser[0].radius);
      return { kind: 'chart', type: donut ? 'doughnut' : 'pie', anim: 'wheel', data: [{ name: c.title, labels: d.map(x => x.n), values: d.map(x => x.v) }], colors: P, type2: type };
    }
    if (t0 === 'radar') {
      const ind = o.radar.indicator.map(x => x.name);
      const mx = ind.map((_, k) => Math.max(1e-9, ...ser[0].data.map(x => Math.abs(+x.value[k] || 0))));
      return { kind: 'chart', type: 'radar', anim: 'zoom', data: ser[0].data.map(x => ({ name: String(x.name), labels: ind.map(n => n + ' (endeks)'), values: x.value.map((v, k) => Math.round((+v || 0) / mx[k] * 100)) })), colors: P, type2: type };
    }
    // category based (bar / line / area / stacked / waterfall / combo)
    const horiz = o.yAxis && !Array.isArray(o.yAxis) && o.yAxis.type === 'category';
    const cats = (horiz ? o.yAxis.data : (Array.isArray(o.xAxis) ? o.xAxis[0] : o.xAxis).data).map(String);
    const waterfall = ser.some(s => s.stack === 'w');
    const combo = ser.some(s => s.yAxisIndex === 1);
    const items = ser.map((s, i) => ({ s, i, name: s.name === 'v' ? c.title : s.name === 'h' ? ' ' : String(s.name || c.title),
      values: (s.data || []).map(val), color: seriesColor(s, i, P), kind: s.type === 'line' ? (s.areaStyle ? 'area' : 'line') : 'bar' }));
    const max = Math.max(1, ...items.filter(x => x.s.yAxisIndex !== 1).map(x => Math.max(...x.values.map(Math.abs), 0)));
    if (waterfall) {
      const v = items.find(x => x.s.name === 'v');
      return { kind: 'chart', type: 'bar', barDir: 'col', grouping: 'stacked', anim: 'wipeUp', fmt: numFormat(max, type),
        data: [{ name: ' ', labels: cats, values: items.find(x => x.s.name === 'h').values }, { name: c.title, labels: cats, values: v.values }], colors: [BG, hex('#5dcaa5')], hideFirst: true };
    }
    if (combo) {
      return { kind: 'combo', anim: 'wipeUp', cats, fmt: numFormat(max, type),
        bars: items.filter(x => x.kind === 'bar').map(x => ({ name: x.name, labels: cats, values: x.values, color: x.color })),
        lines: items.filter(x => x.kind !== 'bar').map(x => ({ name: x.name, labels: cats, values: x.s.data.map(v => v === null || v === undefined ? null : +v), color: x.color })) };
    }
    const allLine = items.every(x => x.kind !== 'bar'), allArea = items.every(x => x.kind === 'area');
    const stacked = ser.some(s => s.stack);
    const t = allArea ? 'area' : allLine ? 'line' : 'bar';
    const colorByData = ser.length === 1 && ser[0].colorBy === 'data';
    let colors = items.map(x => x.color);
    // single-series bars with per-point colours (e.g. horizontal bar highlight)
    if (ser.length === 1 && t === 'bar') {
      const per = (ser[0].data || []).map(d => d && typeof d === 'object' && d.itemStyle ? hex(d.itemStyle.color) : null);
      if (colorByData) colors = cats.map((_, i) => P[i % P.length]);
      else if (per.some(Boolean)) colors = per.map(x => x || items[0].color);
    }
    return { kind: 'chart', type: t, barDir: horiz ? 'bar' : 'col', grouping: stacked ? 'stacked' : 'clustered', anim: t === 'bar' ? (horiz ? 'wipeRight' : 'wipeUp') : 'wipeRight',
      data: items.map(x => ({ name: x.name, labels: cats, values: x.values })), colors, varyColors: ser.length === 1 && t === 'bar' && colors.length > 1, fmt: numFormat(max, type),
      labels: ser.some(s => s.label && s.label.show), smooth: ser.some(s => s.smooth), legend: ser.length > 1, horiz };
  }

  // ---------- slide building ----------
  function frame(pptx, slide, c, idx) {
    slide.background = { color: BG };
    slide.addShape(pptx.ShapeType.rect, { x: 0.45, y: 0.42, w: 0.06, h: 0.55, fill: { color: GOLD }, line: { color: GOLD } });
    slide.addText(c.title, { x: 0.65, y: 0.32, w: 11.8, h: 0.5, fontFace: 'Segoe UI', fontSize: 26, bold: true, color: WHITE, objectName: 'baslik' });
    slide.addText(c.sub || '', { x: 0.65, y: 0.8, w: 11.8, h: 0.35, fontFace: 'Segoe UI', fontSize: 13, color: TXT, objectName: 'altbaslik' });
    slide.addShape(pptx.ShapeType.line, { x: 0.5, y: 6.82, w: 12.33, h: 0, line: { color: GRIDC, width: 0.75 } });
    slide.addText(c.note || '', { x: 0.5, y: 6.88, w: 10.4, h: 0.4, fontFace: 'Segoe UI', fontSize: 10, color: MUTED });
    slide.addText('Excel Dashboard' + (idx ? '  ·  ' + idx : ''), { x: 10.4, y: 6.88, w: 2.43, h: 0.4, fontFace: 'Segoe UI', fontSize: 10, color: 'C9A24A', align: 'right' });
  }
  const BOX = { x: 0.6, y: 1.35, w: 12.13, h: 5.3 };
  function axisOpts(sp) {
    return { catAxisLabelColor: TXT, valAxisLabelColor: TXT, catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, catAxisLabelFontFace: 'Segoe UI', valAxisLabelFontFace: 'Segoe UI',
      catAxisLineShow: true, catAxisLineColor: GRIDC, valAxisLineShow: false, valGridLine: { color: GRIDC, style: 'solid', size: 0.75 }, catGridLine: { style: 'none' },
      valAxisLabelFormatCode: sp.fmt || '#,##0' };
  }
  function addChartSlide(pptx, c, idx) {
    const slide = pptx.addSlide(); frame(pptx, slide, c, idx);
    const sp = spec(c); let anim = sp.anim || 'fade';
    const legend = { showLegend: true, legendPos: 't', legendColor: TXT, legendFontSize: 11, legendFontFace: 'Segoe UI' };
    if (sp.kind === 'chart') {
      const T = pptx.ChartType[sp.type];
      const o = Object.assign({}, BOX, { chartColors: sp.colors, objectName: 'grafik', showTitle: false, dataLabelColor: WHITE, dataLabelFontSize: 10, dataLabelFontFace: 'Segoe UI' });
      if (sp.type === 'pie' || sp.type === 'doughnut') {
        Object.assign(o, legend, { legendPos: 'r', showPercent: true, showValue: false, showLabel: false, dataLabelColor: '0A1630', holeSize: 55, firstSliceAng: 0, dataBorder: { pt: 1.5, color: BG } });
      } else if (sp.type === 'radar') {
        Object.assign(o, legend, { radarStyle: 'filled', catAxisLabelColor: TXT, valAxisHidden: true, valGridLine: { color: GRIDC, size: 0.75 }, lineSize: 2, chartColorsOpacity: 35 });
      } else {
        Object.assign(o, axisOpts(sp), { barDir: sp.barDir, barGrouping: sp.grouping, barGapWidthPct: 60, showValue: !!sp.labels && sp.grouping !== 'stacked', dataLabelFormatCode: sp.fmt,
          dataLabelPosition: sp.type === 'bar' ? 'outEnd' : 't', lineSize: 3, lineSmooth: !!sp.smooth, lineDataSymbolSize: 7, varyColors: !!sp.varyColors });
        if (sp.legend) Object.assign(o, legend); else o.showLegend = false;
        if (sp.horiz) o.catAxisOrientation = 'minMax';
        if (sp.hideFirst) o.showValue = false;
      }
      slide.addChart(T, sp.data, o);
    } else if (sp.kind === 'combo') {
      const types = [];
      sp.bars.forEach(b => types.push({ type: pptx.ChartType.bar, data: [b], options: { chartColors: [b.color], barGapWidthPct: 60 } }));
      sp.lines.forEach(l => types.push({ type: pptx.ChartType.line, data: [l], options: { chartColors: [l.color], lineSize: 3, lineDataSymbolSize: 7, secondaryValAxis: true, secondaryCatAxis: true } }));
      slide.addChart(types, Object.assign({}, BOX, axisOpts(sp), legend, { objectName: 'grafik', valAxes: [{ showValAxisTitle: false, valAxisLabelColor: TXT, valAxisLabelFormatCode: sp.fmt, valGridLine: { color: GRIDC, size: 0.75 } },
        { showValAxisTitle: false, valAxisLabelColor: TXT, valAxisLabelFormatCode: '0"%"', valGridLine: { style: 'none' } }], catAxes: [{ catAxisLabelColor: TXT }, { catAxisHidden: true }] }));
    } else if (sp.kind === 'gauge') {
      const v = Math.max(0, Math.min(100, sp.value));
      slide.addChart(pptx.ChartType.doughnut, [{ name: 'Gösterge', labels: ['Değer', 'Kalan', ' '], values: [v, 100 - v, 100] }],
        { x: 3.67, y: 1.4, w: 6, h: 6, holeSize: 68, firstSliceAng: 270, chartColors: [sp.color, '1C2E55', BG], showLegend: false, showValue: false, showPercent: false, dataBorder: { pt: 0, color: BG }, objectName: 'grafik' });
      slide.addText('%' + sp.value.toLocaleString('tr-TR', { maximumFractionDigits: 1 }), { x: 3.67, y: 3.25, w: 6, h: 0.9, align: 'center', fontFace: 'Segoe UI', fontSize: 44, bold: true, color: WHITE, objectName: 'deger' });
      slide.addText(sp.label || '', { x: 3.67, y: 4.1, w: 6, h: 0.45, align: 'center', fontFace: 'Segoe UI', fontSize: 14, color: TXT });
      anim = 'wheel';
    } else if (sp.kind === 'heat') {
      const lerp = (a, b, t) => Math.round(parseInt(a, 16) + (parseInt(b, 16) - parseInt(a, 16)) * t).toString(16).padStart(2, '0');
      const col = v => { const t = sp.mx ? v / sp.mx : 0, seg = Math.min(sp.stops.length - 2, Math.floor(t * (sp.stops.length - 1))), lt = t * (sp.stops.length - 1) - seg;
        const A = sp.stops[seg], B = sp.stops[seg + 1]; return (lerp(A.slice(0, 2), B.slice(0, 2), lt) + lerp(A.slice(2, 4), B.slice(2, 4), lt) + lerp(A.slice(4, 6), B.slice(4, 6), lt)).toUpperCase(); };
      const f = v => { const a = Math.abs(v); return a >= 1e6 ? (v / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' M' : a >= 1e4 ? Math.round(v / 1e3).toLocaleString('tr-TR') + ' bin' : Math.round(v).toLocaleString('tr-TR'); };
      const head = [{ text: '', options: { fill: { color: BG } } }].concat(sp.xs.map(x => ({ text: String(x), options: { bold: true, color: TXT, fill: { color: BG }, align: 'center' } })));
      const rows = [head].concat(sp.ys.map((y, yi) => [{ text: String(y), options: { color: WHITE, bold: true, fill: { color: BG } } }]
        .concat(sp.grid[yi].map(v => { const c2 = col(v); const dark = parseInt(c2.slice(0, 2), 16) * .3 + parseInt(c2.slice(2, 4), 16) * .59 + parseInt(c2.slice(4, 6), 16) * .11 > 150;
          return { text: f(v), options: { fill: { color: c2 }, color: dark ? '0A1630' : WHITE, align: 'center' } }; }))));
      const fs = sp.xs.length > 10 ? 9 : 10;
      slide.addTable(rows, { x: 0.6, y: 1.45, w: 12.13, colW: [1.9].concat(sp.xs.map(() => (12.13 - 1.9) / sp.xs.length)), fontFace: 'Segoe UI', fontSize: fs,
        border: { type: 'solid', pt: 1.5, color: BG }, rowH: Math.min(0.42, 5.1 / (sp.ys.length + 1)), valign: 'middle', objectName: 'grafik' });
      anim = 'fade';
    }
    return anim;
  }
  function addCover(pptx, info) {
    const s = pptx.addSlide(); s.background = { color: BG };
    s.addShape(pptx.ShapeType.rect, { x: 0.6, y: 0.75, w: 0.08, h: 0.5, fill: { color: GOLD }, line: { color: GOLD } });
    s.addText('EXCEL DASHBOARD · RAPOR', { x: 0.85, y: 0.72, w: 8, h: 0.55, fontFace: 'Segoe UI', fontSize: 14, bold: true, color: GOLD, charSpacing: 2 });
    s.addText(info.title, { x: 0.6, y: 1.55, w: 12, h: 1, fontFace: 'Segoe UI', fontSize: 40, bold: true, color: WHITE, objectName: 'baslik' });
    s.addText(info.subtitle, { x: 0.6, y: 2.5, w: 12, h: 0.5, fontFace: 'Segoe UI', fontSize: 16, color: TXT, objectName: 'altbaslik' });
    const k = info.kpis.slice(0, 5), gap = 0.25, w = (12.13 - gap * (k.length - 1)) / k.length;
    k.forEach((x, i) => {
      const X = 0.6 + i * (w + gap);
      s.addShape(pptx.ShapeType.roundRect, { x: X, y: 3.5, w, h: 1.6, fill: { color: PANEL }, line: { color: GRIDC, width: 1 }, rectRadius: 0.12 });
      s.addText(x.l, { x: X + 0.2, y: 3.65, w: w - 0.4, h: 0.4, fontFace: 'Segoe UI', fontSize: 12, color: TXT });
      s.addText(String(x.v), { x: X + 0.2, y: 4.1, w: w - 0.4, h: 0.7, fontFace: 'Segoe UI', fontSize: 24, bold: true, color: x.c === 'up' ? '5DCAA5' : x.c === 'down' ? 'F09595' : x.c === 'mid' ? 'F2C46A' : WHITE, fit: 'shrink' });
    });
    s.addText(info.note, { x: 0.6, y: 6.3, w: 12, h: 0.35, fontFace: 'Segoe UI', fontSize: 11, color: MUTED });
    s.addText('Hazırlanma: ' + new Date().toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' }), { x: 0.6, y: 6.65, w: 12, h: 0.35, fontFace: 'Segoe UI', fontSize: 11, color: MUTED });
    return 'fade';
  }

  // ---------- animation XML ----------
  const EFFECTS = {
    fade: { preset: 10, sub: 0, filter: 'fade' },
    wipeUp: { preset: 22, sub: 4, filter: 'wipe(down)' },
    wipeRight: { preset: 22, sub: 8, filter: 'wipe(left)' },
    wheel: { preset: 21, sub: 1, filter: 'wheel(1)' },
    zoom: { preset: 53, sub: 16, filter: 'fade', zoom: true }
  };
  function effectXml(spid, eff, ids, node, delay, dur) {
    const e = EFFECTS[eff] || EFFECTS.fade;
    const a = ids.next(), b = ids.next(), c = ids.next();
    let extra = '';
    if (e.zoom) { const z1 = ids.next(), z2 = ids.next();
      extra = `<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="${z1}" dur="${dur}" fill="hold"/><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>ppt_w</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:fltVal val="0"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="#ppt_w"/></p:val></p:tav></p:tavLst></p:anim>`
        + `<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="${z2}" dur="${dur}" fill="hold"/><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>ppt_h</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:fltVal val="0"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="#ppt_h"/></p:val></p:tav></p:tavLst></p:anim>`; }
    return `<p:par><p:cTn id="${a}" presetID="${e.preset}" presetClass="entr" presetSubtype="${e.sub}" fill="hold" grpId="0" nodeType="${node}"><p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>`
      + `<p:set><p:cBhvr><p:cTn id="${b}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>`
      + `<p:animEffect transition="in" filter="${e.filter}"><p:cBhvr><p:cTn id="${c}" dur="${dur}"/><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cBhvr></p:animEffect>${extra}`
      + `</p:childTnLst></p:cTn></p:par>`;
  }
  function timingXml(steps) {
    // steps: [{spid, eff, dur}] -> first step starts with slide, rest after previous
    let n = 2; const ids = { next: () => ++n };
    // one auto-start group; effects inside start with small offsets (title, subtitle, then chart)
    const body = `<p:par><p:cTn id="${ids.next()}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>`
      + steps.map((s, i) => { const inner = ids.next(); return `<p:par><p:cTn id="${inner}" fill="hold"><p:stCondLst><p:cond delay="${s.at}"/></p:stCondLst><p:childTnLst>${effectXml(s.spid, s.eff, ids, i === 0 ? 'withEffect' : 'afterEffect', 0, s.dur)}</p:childTnLst></p:cTn></p:par>`; }).join('')
      + `</p:childTnLst></p:cTn></p:par>`;
    const bld = steps.map(s => s.graphic ? `<p:bldGraphic spid="${s.spid}" grpId="0"><p:bldAsOne/></p:bldGraphic>` : `<p:bldP spid="${s.spid}" grpId="0"/>`).join('');
    return `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>`
      + `<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${body}</p:childTnLst></p:cTn>`
      + `<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>`
      + `</p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>${bld}</p:bldLst></p:timing>`;
  }
  function idOf(xml, name) {
    const re = new RegExp('<p:cNvPr id="(\\d+)" name="' + name + '"'); const m = xml.match(re); return m ? m[1] : null;
  }
  async function addAnimations(buf, anims, JSZipLib) {
    const zip = await JSZipLib.loadAsync(buf);
    for (let i = 0; i < anims.length; i++) {
      const path = `ppt/slides/slide${i + 1}.xml`; const f = zip.file(path); if (!f) continue;
      let xml = await f.async('string');
      const t = idOf(xml, 'baslik'), st = idOf(xml, 'altbaslik'), g = idOf(xml, 'grafik'), dv = idOf(xml, 'deger');
      const steps = [];
      if (t) steps.push({ spid: t, eff: 'fade', dur: 500, at: 0 });
      if (st) steps.push({ spid: st, eff: 'fade', dur: 400, at: 150 });
      if (g) steps.push({ spid: g, eff: anims[i], dur: anims[i] === 'wheel' ? 1200 : 1000, at: 200, graphic: /<p:graphicFrame>[\s\S]*?name="grafik"/.test(xml) });
      if (dv) steps.push({ spid: dv, eff: 'zoom', dur: 500, at: 100 });
      if (!steps.length) continue;
      const tr = '<p:transition spd="med"><p:fade/></p:transition>';
      xml = xml.replace(/<p:timing>[\s\S]*?<\/p:timing>/, '').replace(/<p:transition[\s\S]*?(<\/p:transition>|\/>)/, '');
      const ins = tr + timingXml(steps);
      xml = xml.includes('<p:extLst>') && xml.lastIndexOf('<p:extLst>') > xml.indexOf('</p:clrMapOvr>') ? xml.replace(/(<p:extLst>(?![\s\S]*<p:extLst>))/, ins + '$1') : xml.replace('</p:sld>', ins + '</p:sld>');
      zip.file(path, xml);
    }
    return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  }

  // ---------- public ----------
  async function build(list, info, opts) {
    const PptxGen = opts && opts.PptxGenJS || G.PptxGenJS, JSZipLib = opts && opts.JSZip || G.JSZip;
    const pptx = new PptxGen(); pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'Excel Dashboard'; pptx.title = info ? info.title : list[0].title;
    const anims = [];
    if (info) anims.push(addCover(pptx, info));
    list.forEach((c, i) => anims.push(addChartSlide(pptx, c, info ? (i + 1) + '/' + list.length : '')));
    const buf = await pptx.write({ outputType: 'arraybuffer' });
    return addAnimations(buf, anims, JSZipLib);
  }
  function slug(s) { return String(s || 'sunum').toLocaleLowerCase('tr-TR').replace(/[ğ]/g, 'g').replace(/[ü]/g, 'u').replace(/[ş]/g, 's').replace(/[ı]/g, 'i').replace(/[ö]/g, 'o').replace(/[ç]/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'sunum'; }
  async function save(list, info) {
    const bytes = await build(list, info);
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = slug(info ? info.title + '-rapor' : list[0].title) + '.pptx';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  // ---------- video deck ----------
  function videoTiming(spid, ms) {
    return `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>`
      + `<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>`
      + `<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>`
      + `<p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>`
      + `<p:par><p:cTn id="5" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="afterEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>`
      + `<p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="6" dur="${Math.round(ms)}" fill="hold"/><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cBhvr></p:cmd>`
      + `</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`
      + `</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>`
      + `<p:video><p:cMediaNode vol="80000"><p:cTn id="7" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cMediaNode></p:video>`
      + `</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`;
  }
  const toB64 = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob); });
  async function buildVideo(list, info, onProgress, opts) {
    const PptxGen = opts && opts.PptxGenJS || G.PptxGenJS, JSZipLib = opts && opts.JSZip || G.JSZip;
    const rec = opts && opts.record || G.Export.recordVideo;
    const pptx = new PptxGen(); pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'Excel Dashboard'; pptx.title = info ? info.title : list[0].title;
    const anims = [], durs = [];
    if (info) { anims.push(addCover(pptx, info)); durs.push(0); }
    for (let i = 0; i < list.length; i++) {
      onProgress && onProgress(i + 1, list.length);
      const v = await rec(list[i]);
      const s = pptx.addSlide(); s.background = { color: BG };
      let data = await toB64(v.blob); data = data.replace(/^data:[^;]+/, 'data:' + v.mime);
      s.addMedia({ type: 'video', data, extn: v.ext, cover: v.poster, x: 0, y: 0, w: 13.333, h: 7.5 });
      anims.push('video'); durs.push(v.seconds * 1000);
    }
    const buf = await pptx.write({ outputType: 'arraybuffer' });
    const zip = await JSZipLib.loadAsync(buf);
    for (let i = 0; i < anims.length; i++) {
      const path = `ppt/slides/slide${i + 1}.xml`; const f = zip.file(path); if (!f) continue;
      let xml = await f.async('string');
      if (anims[i] === 'video') {
        const m = xml.match(/<p:pic>[\s\S]*?<p:cNvPr id="(\d+)"[\s\S]*?<a:videoFile/); if (!m) continue;
        xml = xml.replace(/<p:timing>[\s\S]*?<\/p:timing>/, '').replace('</p:sld>', '<p:transition spd="med"><p:fade/></p:transition>' + videoTiming(m[1], durs[i]) + '</p:sld>');
      } else {
        const t = idOf(xml, 'baslik'), st = idOf(xml, 'altbaslik'); const steps = [];
        if (t) steps.push({ spid: t, eff: 'fade', dur: 500, at: 0 }); if (st) steps.push({ spid: st, eff: 'fade', dur: 400, at: 150 });
        if (steps.length) xml = xml.replace('</p:sld>', '<p:transition spd="med"><p:fade/></p:transition>' + timingXml(steps) + '</p:sld>');
      }
      zip.file(path, xml);
    }
    return zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
  }
  async function saveVideo(list, info, onProgress) {
    const bytes = await buildVideo(list, info, onProgress);
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = slug(info ? info.title + '-rapor-video' : list[0].title + '-video') + '.pptx';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  G.PptExport = { build, save, spec, timingXml, buildVideo, saveVideo };
})(typeof window !== 'undefined' ? window : globalThis);
