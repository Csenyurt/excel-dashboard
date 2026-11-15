// Nielsen sekmesi: 15 sayfalı aylık Nielsen dosyasından HARIBO analizleri
(function (G) {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TXT = '#b5c3dc', LINE = 'rgba(120,160,230,.14)', GOLD = '#f2d68a', BLUE = '#5fb8f0', GREEN = '#5dcaa5', RED = '#f09595', GREY = '#34507f';
  const MARKETS = [
    [/total tr w bim/i, 'Toplam TR'], [/total tr w\/o/i, 'TR (indirim hariç)'], [/total supermarkets \(conf\)/i, 'Süpermarketler'],
    [/total nka/i, 'NKA'], [/total lka/i, 'LKA'], [/total rka/i, 'RKA'], [/^total \(bim/i, 'İndirim marketleri'], [/downline/i, 'Downline']];
  const mName = s => { for (const [re, n] of MARKETS) if (re.test(s)) return n; return String(s); };
  const F = { vol: /^sales \(kgs\)/i, volSh: /share of sales - sales \(kgs\)/i, val: /^sales value/i, valSh: /share of sales value/i, nd: /numeric distribution/i, price: /price per/i };
  const AY = { Jan: 'Oca', Feb: 'Şub', Mar: 'Mar', Apr: 'Nis', May: 'May', Jun: 'Haz', Jul: 'Tem', Aug: 'Ağu', Sep: 'Eyl', Oct: 'Eki', Nov: 'Kas', Dec: 'Ara' };
  const nf = (n, d = 1) => (+n).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const money = v => { const a = Math.abs(v); return '₺ ' + (a >= 1e9 ? nf(v / 1e9, 2) + ' Mr' : a >= 1e6 ? nf(v / 1e6, 2) + ' M' : a >= 1e3 ? nf(v / 1e3, 0) + ' bin' : nf(v, 0)); };
  const ton = v => nf(v, 0) + ' ton';
  const pct = (a, b) => b ? (a / b - 1) * 100 : 0;
  const sgn = (x, d = 1) => (x >= 0 ? '+' : '−') + nf(Math.abs(x), d);

  // ---------- parse ----------
  function parse(wb) {
    const find = re => wb.SheetNames.find(n => re.test(n));
    const rows = n => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, blankrows: false, defval: null });
    const md = find(/^main data$/i); if (!md) throw new Error('"Main Data" sayfası bulunamadı');
    const R = rows(md); const hi = R.findIndex(r => /markets/i.test(String(r[0] || ''))); const H = R[hi].map(x => String(x || ''));
    const iYA = H.findIndex(h => /^YTD YA/i.test(h)), iYTD = H.findIndex(h => /^YTD -/i.test(h));
    const iY = H.map((h, i) => /^Cal Yr (\d{4})/i.test(h) ? i : -1).filter(i => i >= 0);
    const mIdx = H.map((h, i) => /^[A-Z][a-z]{2} \d\d - /.test(h) ? i : -1).filter(i => i >= 0);
    const months = mIdx.map(i => { const m = H[i].match(/^([A-Z][a-z]{2}) (\d\d)/); return (AY[m[1]] || m[1]) + ' ' + m[2]; });
    const ytdLabel = (H[iYTD].match(/YTD - (\d+) w\/e ([\d/]+)/) || []);
    const data = {};
    R.slice(hi + 1).forEach(r => {
      if (!r[0] || !r[1] || !r[2]) return; const m = mName(r[0]); const fk = Object.keys(F).find(k => F[k].test(String(r[1]))); if (!fk) return;
      data[m] = data[m] || {}; data[m][fk] = data[m][fk] || {};
      data[m][fk][String(r[2]).trim()] = { ya: +r[iYA] || 0, ytd: +r[iYTD] || 0, years: iY.map(i => +r[i] || 0), months: mIdx.map(i => +r[i] || 0) };
    });
    const markets = Object.keys(data);
    const jelly = Object.keys(data[markets[0]].vol || {}).find(p => /jelly/i.test(p)) || 'IMPULSE CHILDREN JELLY';
    const brand = Object.keys(data[markets[0]].vol || {}).find(p => /^haribo$/i.test(p)) || 'HARIBO';
    const products = Object.keys(data[markets[0]].vol || {}).filter(p => p !== jelly && p !== brand);
    // competitors (total candy)
    let comp = [];
    const cs = find(/^comp share$/i);
    if (cs) rows(cs).forEach(r => { const p = String(r[1] || ''); const m = p.match(/\|\s*([^|]+)$/); if (m && typeof r[2] === 'number') comp.push({ n: m[1].trim(), volYA: +r[2], vol: +r[3], valYA: +r[4], val: +r[5] }); });
    comp = comp.filter((x, i, a) => a.findIndex(y => y.n === x.n) === i);
    // categories
    let cats = [];
    const cb = find(/^category breakdown$/i);
    if (cb) { const C = rows(cb); C.forEach(r => { if (!r[0] || !/total tr w bim/i.test(String(r[0])) || typeof r[2] !== 'number') return;
      const n = String(r[1]).replace(/^TOTAL CANDY \| IMPULSE \| /i, '').trim(); cats.push({ n: (n.charAt(0) + n.slice(1).toLowerCase()).replace(/^total /i, 'Toplam ').replace(/^toplam candy$/i, 'Toplam şekerleme').replace('w/o', 'hariç'), valYA: +r[4], val: +r[5], volYA: +r[8], vol: +r[9] }); }); }
    return { data, markets, months, jelly, brand, products, comp, cats, weeks: ytdLabel[1], weekEnd: ytdLabel[2], yearLabels: iY.map(i => (H[i].match(/(\d{4})/) || [])[1]) };
  }

  // ---------- analysis ----------
  function core(N, m) {
    const D = N.data[m], g = (f, p) => (D[f] && D[f][p]) || { ya: 0, ytd: 0, months: [] };
    const b = N.brand, j = N.jelly;
    return { vol: g('vol', b), val: g('val', b), volSh: g('volSh', b), valSh: g('valSh', b), nd: g('nd', b), price: g('price', b),
      mVol: g('vol', j), mVal: g('val', j), mPrice: g('price', j), g };
  }
  function bridge(N, m) {
    const D = N.data[m]; let Q0 = 0, Q1 = 0, V0 = 0, V1 = 0, Q1P0 = 0;
    N.products.forEach(p => { const q = D.vol[p], v = D.val[p]; if (!q || !v) return; Q0 += q.ya; Q1 += q.ytd; V0 += v.ya; V1 += v.ytd; if (q.ya > 0) Q1P0 += q.ytd * (v.ya / q.ya); else Q1P0 += v.ytd; });
    const P0 = Q0 ? V0 / Q0 : 0; const volE = (Q1 - Q0) * P0, mixE = Q1P0 - Q1 * P0, priceE = V1 - Q1P0;
    return { V0: V0 * 1000, V1: V1 * 1000, volE: volE * 1000, mixE: mixE * 1000, priceE: priceE * 1000 };
  }
  function insights(N, m) {
    const c = core(N, m), out = [], warn = [];
    const mg = pct(c.mVol.ytd, c.mVol.ya), hg = pct(c.vol.ytd, c.vol.ya), shd = c.volSh.ytd - c.volSh.ya, vshd = c.valSh.ytd - c.valSh.ya;
    out.push(`Jelly pazarı hacimde %${nf(mg)} ${mg >= 0 ? 'büyürken' : 'küçülürken'} HARIBO %${nf(hg)} ${hg >= 0 ? 'büyüdü' : 'küçüldü'}; hacim payı ${sgn(shd)} puan (${nf(c.volSh.ytd)}%).`);
    const vg = pct(c.val.ytd, c.val.ya), pg = pct(c.price.ytd, c.price.ya);
    out.push(`Değer satışı %${nf(vg)} ${vg >= 0 ? 'arttı' : 'azaldı'}; kg fiyatı %${nf(pg)} değişti. Değer payı ${sgn(vshd)} puan (${nf(c.valSh.ytd)}%).`);
    const B = bridge(N, m), dv = B.V1 - B.V0;
    if (dv) out.push(`Ciro değişiminin ${money(B.priceE)} kadarı fiyattan, ${money(B.volE)} kadarı hacimden, ${money(B.mixE)} kadarı ürün karmasından geliyor.`);
    if (N.comp.length) { const cc = N.comp.filter(x => !/diger|diğer/i.test(x.n)).map(x => ({ n: x.n, d: x.val - x.valYA })).sort((a, b) => b.d - a.d);
      if (cc[0] && cc[0].d > 0) out.push(`Toplam şekerlemede en çok değer payı kazanan ${cc[0].n} (${sgn(cc[0].d)} puan).`); }
    const chs = N.markets.filter(x => x !== m && N.data[x].valSh && N.data[x].valSh[N.brand]).map(x => ({ n: x, d: N.data[x].valSh[N.brand].ytd - N.data[x].valSh[N.brand].ya }));
    if (chs.length) { chs.sort((a, b) => a.d - b.d); out.push(`Kanallar içinde değer payında en iyi ${chs[chs.length - 1].n} (${sgn(chs[chs.length - 1].d)} p), en zayıf ${chs[0].n} (${sgn(chs[0].d)} p).`);
      chs.filter(x => x.d <= -1.5).forEach(x => warn.push(`${x.n} kanalında değer payı ${sgn(x.d)} puan geriledi.`)); }
    const D = N.data[m], tot = c.vol.ya || 1;
    const prods = N.products.filter(p => D.vol[p] && D.vol[p].ya > tot * 0.02 && !/others/i.test(p)).map(p => ({ p, g: pct(D.vol[p].ytd, D.vol[p].ya) })).sort((a, b) => b.g - a.g);
    if (prods.length) out.push(`En hızlı büyüyen ürün ${prods[0].p} (%${sgn(prods[0].g)}), en çok kaybeden ${prods[prods.length - 1].p} (%${sgn(prods[prods.length - 1].g)}).`);
    prods.filter(x => x.g <= -15).forEach(x => warn.push(`${x.p} hacmi %${nf(-x.g)} düştü.`));
    if (c.nd.ytd - c.nd.ya <= -2) warn.push(`Numerik dağılım ${sgn(c.nd.ytd - c.nd.ya)} puan geriledi.`);
    const L = c.vol.months.length; if (L > 12) { const yoy = pct(c.vol.months[L - 1], c.vol.months[L - 13]); if (yoy <= -5) warn.push(`Son ay (${N.months[L - 1]}) hacim geçen yılın aynı ayına göre %${nf(-yoy)} düşük.`); }
    if (shd <= -1) warn.push(`Jelly hacim payı ${sgn(shd)} puan kaybetti: pazar HARIBO'dan hızlı büyüyor.`);
    return { out, warn: warn.slice(0, 7) };
  }

  // ---------- chart builders ----------
  const base = () => ({ backgroundColor: 'transparent', color: [GOLD, BLUE, GREEN, '#c9a24a', '#8fa2ff', '#f0997b', '#3b7cb8', '#e9c46a'], textStyle: { fontFamily: 'Segoe UI, system-ui, sans-serif', color: TXT },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(6,16,36,.95)', borderColor: 'rgba(242,214,138,.35)', textStyle: { color: '#eaf0fa' } }, grid: { left: 12, right: 18, top: 36, bottom: 10, containLabel: true }, animationDuration: 900 });
  const cat = (d, rot) => ({ type: 'category', data: d, axisLine: { lineStyle: { color: LINE } }, axisTick: { show: false }, axisLabel: { color: TXT, rotate: rot || 0, hideOverlap: true } });
  const valAx = (fmt, extra) => Object.assign({ type: 'value', splitLine: { lineStyle: { color: LINE } }, axisLabel: { color: TXT, formatter: fmt || (v => nf(v, 0)) } }, extra || {});
  const legend = { top: 0, right: 0, textStyle: { color: TXT }, icon: 'roundRect', itemWidth: 10, itemHeight: 10 };
  const lbl = f => ({ show: true, position: 'top', color: '#eaf0fa', formatter: p => f(p.value) });
  const pctF = v => '%' + nf(v); const ptF = v => sgn(v) + ' p';
  const yaL = N => N.weeks ? `YTD ${N.weeks} hafta` : 'YTD';

  function buildCards(N, m, file) {
    const c = core(N, m), D = N.data[m], note = base2 => `Kaynak: ${file} · Dönem: ${yaL(N)} (${N.weekEnd || ''}) vs geçen yıl · Pazar: ${m} · Taban: ${base2}`;
    const T = N.months, L = T.length;
    const cards = [];
    // 1. Pazar vs HARIBO büyüme
    cards.push({ id: 'buyume', name: 'Pazar ve HARIBO büyümesi', icon: 'ti-trending-up', note: note('jelly segmenti'), measureType: 'Yüzde',
      notes: 'Jelly pazarının ve HARIBO\'nun hacim ve değer büyümeleri. Pazarın üzerinde büyümek pay kazanmak demektir.',
      build: () => ({ sub: 'Yıl başından bugüne, geçen yıla göre %', option: { ...base(), legend, xAxis: cat(['Hacim', 'Değer', 'Kg fiyatı']), yAxis: valAx(pctF),
        series: [{ name: 'Jelly pazarı', type: 'bar', barMaxWidth: 46, data: [pct(c.mVol.ytd, c.mVol.ya), pct(c.mVal.ytd, c.mVal.ya), pct(c.mPrice.ytd, c.mPrice.ya)].map(v => +v.toFixed(1)), itemStyle: { color: BLUE, borderRadius: [6, 6, 0, 0] }, label: lbl(pctF) },
          { name: 'HARIBO', type: 'bar', barMaxWidth: 46, data: [pct(c.vol.ytd, c.vol.ya), pct(c.val.ytd, c.val.ya), pct(c.price.ytd, c.price.ya)].map(v => +v.toFixed(1)), itemStyle: { color: GOLD, borderRadius: [6, 6, 0, 0] }, label: lbl(pctF) }] } }) });
    // 2. Köprü
    const B = bridge(N, m);
    cards.push({ id: 'kopru', name: 'Fiyat – hacim – karma köprüsü', icon: 'ti-stairs-up', note: note('ürün bazında değer ve hacim (bin ₺)'), measureType: 'Para',
      notes: 'Geçen yılki cirodan bu yılki ciroya köprü: hacim etkisi, ürün karması etkisi ve fiyat etkisi.',
      build: () => { const steps = [['Geçen yıl', B.V0], ['Hacim etkisi', B.volE], ['Karma etkisi', B.mixE], ['Fiyat etkisi', B.priceE], ['Bu yıl', B.V1]]; let acc = 0; const h = [], v = [];
        steps.forEach(([n, x], i) => { if (i === 0 || i === steps.length - 1) { h.push(0); v.push({ value: x, itemStyle: { color: i ? GOLD : GREY, borderRadius: 4 } }); acc = x; }
          else { h.push(x >= 0 ? acc : acc + x); v.push({ value: Math.abs(x), itemStyle: { color: x >= 0 ? GREEN : RED, borderRadius: 4 }, raw: x }); acc += x; } });
        return { sub: 'Geçen yıldan bu yıla ciro değişiminin kaynakları', option: { ...base(), tooltip: { ...base().tooltip, formatter: p => { const q = p.find(x => x.seriesName === 'v'); return q.name + '<br>' + money(q.data.raw !== undefined ? q.data.raw : q.value); } },
          xAxis: cat(steps.map(s => s[0])), yAxis: valAx(v2 => money(v2)), series: [{ name: 'h', type: 'bar', stack: 'w', itemStyle: { color: 'transparent' }, emphasis: { disabled: true }, data: h },
            { name: 'v', type: 'bar', stack: 'w', barMaxWidth: 60, data: v, label: { show: true, position: 'top', color: '#eaf0fa', formatter: p => (p.data.raw !== undefined && p.data.raw < 0 ? '−' : p.data.raw !== undefined ? '+' : '') + money(p.value).replace('₺ ', '₺') } }] } }; } });
    // 3. Rakip payları
    if (N.comp.length) {
      const cc = N.comp.slice().sort((a, b) => b.val - a.val);
      cards.push({ id: 'rakip', name: 'Şirket değer payları (toplam şekerleme)', icon: 'ti-chart-bar-popular', note: note('toplam şekerleme pazarı, Toplam TR'), measureType: 'Yüzde',
        notes: 'Toplam şekerleme pazarında şirketlerin değer payları; geçen yıl ve bu yıl.',
        build: () => { const a = cc.slice().reverse(); return { sub: 'Geçen yıl ve bu yıl, %', option: { ...base(), legend, grid: { left: 12, right: 50, top: 30, bottom: 6, containLabel: true }, xAxis: valAx(pctF), yAxis: { ...cat(a.map(x => x.n)), axisLabel: { color: '#eaf0fa' } },
          series: [{ name: 'Geçen yıl', type: 'bar', barMaxWidth: 12, itemStyle: { color: GREY, borderRadius: [0, 4, 4, 0] }, data: a.map(x => x.valYA) },
            { name: 'Bu yıl', type: 'bar', barMaxWidth: 12, data: a.map(x => ({ value: x.val, itemStyle: { color: /haribo/i.test(x.n) ? GOLD : BLUE, borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right', color: TXT, formatter: p => '%' + nf(p.value) } }] } }; } });
      cards.push({ id: 'paydegisim', name: 'Pay kazanan ve kaybedenler', icon: 'ti-arrows-diff', note: note('değer payı farkı, puan'), measureType: 'Yüzde',
        build: () => { const a = cc.map(x => ({ n: x.n, d: +(x.val - x.valYA).toFixed(2) })).sort((p, q) => p.d - q.d); return { sub: 'Değer payı değişimi, puan', option: { ...base(), tooltip: { ...base().tooltip, valueFormatter: ptF }, grid: { left: 12, right: 50, top: 10, bottom: 6, containLabel: true },
          xAxis: valAx(ptF), yAxis: { ...cat(a.map(x => x.n)), axisLabel: { color: '#eaf0fa' } }, series: [{ type: 'bar', barMaxWidth: 16, data: a.map(x => ({ value: x.d, itemStyle: { color: x.d >= 0 ? GREEN : RED, borderRadius: 4 } })), label: { show: true, position: 'right', color: TXT, formatter: p => ptF(p.value) } }] } }; } });
    }
    // 4. Pay trendi
    cards.push({ id: 'paytrend', name: 'HARIBO pay trendi', icon: 'ti-chart-line', wide: true, note: note('jelly segmenti içinde pay'), measureType: 'Yüzde',
      notes: 'HARIBO\'nun jelly segmentindeki aylık hacim ve değer payı.',
      build: () => ({ sub: L + ' aylık hacim ve değer payı, %', option: { ...base(), legend, xAxis: cat(T), yAxis: valAx(pctF, { scale: true }),
        series: [{ name: 'Değer payı', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 3, color: GOLD }, itemStyle: { color: GOLD }, data: c.valSh.months.map(v => +v.toFixed(1)), areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(242,214,138,.25)' }, { offset: 1, color: 'rgba(242,214,138,0)' }] } } },
          { name: 'Hacim payı', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 3, color: BLUE }, itemStyle: { color: BLUE }, data: c.volSh.months.map(v => +v.toFixed(1)) }] } }) });
    // 5. Kanallar
    const chs = N.markets.filter(x => N.data[x].valSh && N.data[x].valSh[N.brand]);
    cards.push({ id: 'kanalpay', name: 'Kanallarda HARIBO değer payı', icon: 'ti-building-store', note: note('kanal bazında jelly değer payı'), measureType: 'Yüzde',
      build: () => ({ sub: 'Geçen yıl ve bu yıl, %', option: { ...base(), legend, xAxis: cat(chs, 25), yAxis: valAx(pctF),
        series: [{ name: 'Geçen yıl', type: 'bar', barMaxWidth: 22, itemStyle: { color: GREY, borderRadius: [5, 5, 0, 0] }, data: chs.map(x => +N.data[x].valSh[N.brand].ya.toFixed(1)) },
          { name: 'Bu yıl', type: 'bar', barMaxWidth: 22, itemStyle: { color: GOLD, borderRadius: [5, 5, 0, 0] }, data: chs.map(x => +N.data[x].valSh[N.brand].ytd.toFixed(1)), label: lbl(v => nf(v)) }] } }) });
    cards.push({ id: 'kanalbuyume', name: 'Kanallarda büyüme', icon: 'ti-chart-arrows-vertical', note: note('HARIBO hacim ve değer büyümesi'), measureType: 'Yüzde',
      build: () => ({ sub: 'HARIBO, geçen yıla göre %', option: { ...base(), legend, xAxis: cat(chs, 25), yAxis: valAx(pctF),
        series: [['Hacim', 'vol', BLUE], ['Değer', 'val', GOLD]].map(([n, k, col]) => ({ name: n, type: 'bar', barMaxWidth: 22, itemStyle: { color: col, borderRadius: 4 }, data: chs.map(x => { const q = N.data[x][k][N.brand]; return +pct(q.ytd, q.ya).toFixed(1); }) })) } }) });
    cards.push({ id: 'kanalfiyat', name: 'Kanallarda fiyat ve dağılım', icon: 'ti-tag', note: note('kg fiyatı (₺) ve numerik dağılım (%)'), measureType: 'Para',
      build: () => ({ sub: 'Kg fiyatı (sütun) ve numerik dağılım (çizgi)', option: { ...base(), legend, xAxis: cat(chs, 25), yAxis: [valAx(v => '₺' + nf(v, 0)), valAx(pctF, { splitLine: { show: false }, max: 100 })],
        series: [{ name: 'Kg fiyatı', type: 'bar', barMaxWidth: 30, itemStyle: { color: BLUE, borderRadius: [5, 5, 0, 0] }, data: chs.map(x => +N.data[x].price[N.brand].ytd.toFixed(1)), label: lbl(v => '₺' + nf(v, 0)) },
          { name: 'Numerik dağılım', type: 'line', yAxisIndex: 1, symbolSize: 8, lineStyle: { width: 3, color: GOLD }, itemStyle: { color: GOLD }, data: chs.map(x => +N.data[x].nd[N.brand].ytd.toFixed(1)) }] } }) });
    // 6. Ürünler
    const prods = N.products.filter(p => D.vol[p] && (D.vol[p].ya || D.vol[p].ytd));
    cards.push({ id: 'urunbuyume', name: 'Ürünlerin hacim büyümesi', icon: 'ti-candy', tall: true, note: note('ürün hacmi (ton)'), measureType: 'Yüzde',
      notes: 'HARIBO ürünlerinin hacim büyümesi; yeşil büyüyen, kırmızı küçülen ürünler.',
      build: st => { let a = prods.filter(p => D.vol[p].ya > 0 && !/others/i.test(p)).map(p => ({ p, g: +pct(D.vol[p].ytd, D.vol[p].ya).toFixed(1) })).sort((x, y) => x.g - y.g);
        if (st.topN > 0) a = a.slice(-st.topN); const cap = 60;
        return { sub: 'Geçen yıla göre %, uç değerler ' + cap + "'ta kesilir", option: { ...base(), tooltip: { ...base().tooltip, formatter: p => p[0].name + '<br>%' + nf(a[p[0].dataIndex].g) }, grid: { left: 12, right: 60, top: 10, bottom: 6, containLabel: true },
          xAxis: valAx(pctF, { max: cap, min: v => Math.max(v.min, -cap) }), yAxis: { ...cat(a.map(x => x.p)), axisLabel: { color: '#eaf0fa', fontSize: 11 } },
          series: [{ type: 'bar', barMaxWidth: 12, data: a.map(x => ({ value: Math.max(-cap, Math.min(cap, x.g)), itemStyle: { color: x.g >= 0 ? GREEN : RED, borderRadius: 3 } })), label: { show: true, position: 'right', color: TXT, fontSize: 10, formatter: p => '%' + nf(a[p.dataIndex].g) } }] } }; } });
    cards.push({ id: 'urunpay', name: 'HARIBO cirosunun ürün dağılımı', icon: 'ti-chart-donut', tall: true, note: note('ürün değer satışı'), measureType: 'Para',
      build: () => { const a = prods.map(p => ({ name: p, value: Math.round(D.val[p].ytd * 1000) })).sort((x, y) => y.value - x.value); const top = a.slice(0, 9), rest = a.slice(9).reduce((s, x) => s + x.value, 0); if (rest) top.push({ name: 'Diğer', value: rest });
        return { sub: 'Yıl başından bugüne değer satışı', option: { ...base(), tooltip: { trigger: 'item', formatter: p => p.name + '<br>' + money(p.value) + ' · %' + p.percent }, legend: { ...legend, orient: 'vertical', top: 'middle', right: 0, type: 'scroll' },
          series: [{ type: 'pie', radius: ['45%', '72%'], center: ['36%', '52%'], padAngle: 2, itemStyle: { borderRadius: 6 }, label: { show: false }, data: top }] } }; } });
    const topP = prods.filter(p => !/others/i.test(p)).sort((a, b) => D.val[b].ytd - D.val[a].ytd).slice(0, 12);
    cards.push({ id: 'urunkanal', name: 'Ürün × kanal değer büyümesi', icon: 'ti-grid-dots', wide: true, note: note('ürün değer satışı, geçen yıla göre %'), measureType: 'Yüzde',
      build: () => { const ys = topP.slice().reverse(), data = []; ys.forEach((p, yi) => chs.forEach((x, xi) => { const q = N.data[x].val[p]; data.push([xi, yi, q && q.ya ? +pct(q.ytd, q.ya).toFixed(1) : '-']); }));
        return { sub: 'En büyük 12 ürün · yeşil büyüme, kırmızı küçülme', option: { ...base(), tooltip: { trigger: 'item', backgroundColor: 'rgba(6,16,36,.95)', textStyle: { color: '#eaf0fa' }, formatter: p => ys[p.value[1]] + ' · ' + chs[p.value[0]] + '<br>%' + p.value[2] },
          grid: { left: 12, right: 80, top: 10, bottom: 10, containLabel: true }, xAxis: cat(chs), yAxis: { ...cat(ys), axisLabel: { color: '#eaf0fa' } },
          visualMap: { min: -40, max: 60, calculable: true, orient: 'vertical', right: 0, top: 'middle', itemHeight: 150, textStyle: { color: TXT }, inRange: { color: ['#c0392b', '#7a2f3b', '#1a2747', '#1d6b54', '#5dcaa5'] }, formatter: v => '%' + nf(v, 0) },
          series: [{ type: 'heatmap', data, label: { show: true, color: '#eaf0fa', fontSize: 10, formatter: p => p.value[2] === '-' ? '' : nf(p.value[2], 0) }, itemStyle: { borderColor: '#0a1630', borderWidth: 2, borderRadius: 4 } }] } }; } });
    // 7. Kategoriler
    if (N.cats.length) {
      const cs = N.cats.filter(x => !/^toplam şekerleme$/i.test(x.n));
      cards.push({ id: 'kategori', name: 'Kategori büyümeleri', icon: 'ti-category', note: note('toplam şekerleme kategorileri, Toplam TR'), measureType: 'Yüzde',
        build: () => ({ sub: 'Hacim ve değer, geçen yıla göre %', option: { ...base(), legend, xAxis: cat(cs.map(x => x.n), 25), yAxis: valAx(pctF),
          series: [{ name: 'Hacim', type: 'bar', barMaxWidth: 20, itemStyle: { color: BLUE, borderRadius: 4 }, data: cs.map(x => +pct(x.vol, x.volYA).toFixed(1)) }, { name: 'Değer', type: 'bar', barMaxWidth: 20, itemStyle: { color: GOLD, borderRadius: 4 }, data: cs.map(x => +pct(x.val, x.valYA).toFixed(1)) }] } }) });
      cards.push({ id: 'kategoripay', name: 'Şekerleme pazarının kategori dağılımı', icon: 'ti-chart-pie', note: note('kategori değer satışı'), measureType: 'Para',
        build: () => ({ sub: 'Yıl başından bugüne değer satışı', option: { ...base(), tooltip: { trigger: 'item', formatter: p => p.name + '<br>' + money(p.value * 1000) + ' · %' + p.percent },
          series: [{ type: 'pie', radius: '68%', center: ['50%', '54%'], itemStyle: { borderColor: '#0a1630', borderWidth: 2 }, label: { color: '#eaf0fa', formatter: p => p.name + '\n%' + Math.round(p.percent) }, data: cs.filter(x => !/^toplam|gifting/i.test(x.n)).map(x => ({ name: x.n, value: Math.round(x.val) })) }] } }) });
    }
    // 8. Fiyat ve dağılım trendi
    cards.push({ id: 'fiyattrend', name: 'Kg fiyatı trendi', icon: 'ti-currency-lira', note: note('kg başına fiyat (₺)'), measureType: 'Para',
      build: () => ({ sub: 'HARIBO ve jelly pazarı, aylık', option: { ...base(), legend, xAxis: cat(T), yAxis: valAx(v => '₺' + nf(v, 0), { scale: true }),
        series: [{ name: 'HARIBO', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 3, color: GOLD }, itemStyle: { color: GOLD }, data: c.price.months.map(v => +v.toFixed(1)) },
          { name: 'Jelly pazarı', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2, color: BLUE, type: 'dashed' }, itemStyle: { color: BLUE }, data: c.mPrice.months.map(v => +v.toFixed(1)) }] } }) });
    cards.push({ id: 'dagilim', name: 'Numerik dağılım trendi', icon: 'ti-map-pin', note: note('ürünün bulunduğu mağaza oranı (%)'), measureType: 'Yüzde',
      build: () => ({ sub: 'HARIBO, aylık %', option: { ...base(), xAxis: cat(T), yAxis: valAx(pctF, { scale: true }), series: [{ name: 'Numerik dağılım', type: 'line', smooth: true, symbolSize: 6, lineStyle: { width: 3, color: GREEN }, itemStyle: { color: GREEN },
        data: c.nd.months.map(v => +v.toFixed(1)), areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(93,202,165,.3)' }, { offset: 1, color: 'rgba(93,202,165,0)' }] } } }] } }) });
    // 9. Trend & mevsimsellik
    cards.push({ id: 'trend', name: L + ' aylık hacim ve değer', icon: 'ti-chart-histogram', wide: true, note: note('HARIBO hacim (ton) ve değer (₺)'), measureType: 'Para',
      notes: 'HARIBO\'nun aylık hacim ve değer satışı; mevsimsellik ve trend birlikte görülür.',
      build: () => ({ sub: 'HARIBO · sütun değer, çizgi hacim', option: { ...base(), legend, xAxis: cat(T), yAxis: [valAx(v => money(v * 1000)), valAx(v => nf(v, 0) + ' t', { splitLine: { show: false } })],
        series: [{ name: 'Değer', type: 'bar', barMaxWidth: 22, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: GOLD }, { offset: 1, color: '#8a6e2f' }] }, borderRadius: [4, 4, 0, 0] }, data: c.val.months.map(v => Math.round(v)) },
          { name: 'Hacim', type: 'line', yAxisIndex: 1, smooth: true, symbolSize: 5, lineStyle: { width: 3, color: BLUE }, itemStyle: { color: BLUE }, data: c.vol.months.map(v => +v.toFixed(0)) }] } }) });
    if (L > 12) cards.push({ id: 'yoy', name: 'Geçen yılın aynı ayına göre', icon: 'ti-calendar-stats', wide: true, note: note('HARIBO aylık hacim ve değer'), measureType: 'Yüzde',
      build: () => { const idx = T.map((_, i) => i).filter(i => i >= 12); return { sub: 'Aylık büyüme, %', option: { ...base(), legend, xAxis: cat(idx.map(i => T[i])), yAxis: valAx(pctF),
        series: [['Hacim', c.vol, BLUE], ['Değer', c.val, GOLD]].map(([n, s, col]) => ({ name: n, type: 'bar', barMaxWidth: 16, itemStyle: { color: col, borderRadius: 3 }, data: idx.map(i => +pct(s.months[i], s.months[i - 12]).toFixed(1)) })) } }; } });
    return cards;
  }

  function kpiHtml(N, m) {
    const c = core(N, m);
    const k = [['Hacim', ton(c.vol.ytd), pct(c.vol.ytd, c.vol.ya), '%', 'ti-package'], ['Değer', money(c.val.ytd * 1000), pct(c.val.ytd, c.val.ya), '%', 'ti-coins'],
      ['Kg fiyatı', '₺ ' + nf(c.price.ytd), pct(c.price.ytd, c.price.ya), '%', 'ti-tag'], ['Hacim payı (jelly)', '%' + nf(c.volSh.ytd), c.volSh.ytd - c.volSh.ya, 'p', 'ti-chart-pie'],
      ['Değer payı (jelly)', '%' + nf(c.valSh.ytd), c.valSh.ytd - c.valSh.ya, 'p', 'ti-chart-donut'], ['Numerik dağılım', '%' + nf(c.nd.ytd), c.nd.ytd - c.nd.ya, 'p', 'ti-map-pin']];
    return { html: k.map(([l, v, d, u, i]) => `<div class="kpi"><i class="ti ${i}"></i><div><span>${l}</span><b>${v}</b><em class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${u === '%' ? '%' + nf(Math.abs(d)) : nf(Math.abs(d)) + ' puan'}</em></div></div>`).join(''),
      list: k.map(([l, v, d, u]) => ({ l, v, c: d >= 0 ? 'up' : 'down' })) };
  }

  // ---------- Nielsen + kendi sell-in ----------
  const TRM = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const LONG = [/^oca|^jan/i, /^şub|^sub|^feb/i, /^mar/i, /^nis|^apr/i, /^may/i, /^haz|^jun/i, /^tem|^jul/i, /^ağu|^agu|^aug/i, /^eyl|^sep/i, /^eki|^oct/i, /^kas|^nov/i, /^ara|^dec/i];
  function monthKey(v) {
    let d = null;
    if (v instanceof Date) d = v; else if (typeof v === 'number' && v > 20000 && v < 80000) d = new Date(Math.round((v - 25569) * 864e5));
    else if (typeof v === 'string') { const t = v.trim(); let m;
      if ((m = t.match(/^(\d{4})[-/.](\d{1,2})/))) d = new Date(+m[1], +m[2] - 1, 1);
      else if ((m = t.match(/^(\d{1,2})[-/.](\d{4})$/))) d = new Date(+m[2], +m[1] - 1, 1);
      else if ((m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/))) d = new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, 1);
      else { const mi = LONG.findIndex(re => re.test(t)), y = t.match(/(\d{4}|\d{2})\s*$/); if (mi >= 0 && y) d = new Date(y[1].length === 2 ? 2000 + +y[1] : +y[1], mi, 1); } }
    return d && !isNaN(d) ? TRM[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) : null;
  }
  let SELLIN = null;
  function readSellin(wb) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, blankrows: false, defval: null });
    const hi = rows.findIndex(r => r.filter(x => typeof x === 'string' && x.trim()).length >= 2); if (hi < 0) throw new Error('Başlık satırı bulunamadı');
    const H = rows[hi].map(x => String(x ?? '')), body = rows.slice(hi + 1);
    const ti = H.findIndex((h, i) => body.slice(0, 20).filter(r => monthKey(r[i])).length >= Math.min(5, body.length * .6)); if (ti < 0) throw new Error('Tarih / ay sütunu bulunamadı');
    const nums = H.map((h, i) => i).filter(i => i !== ti && body.slice(0, 30).filter(r => typeof r[i] === 'number').length >= Math.min(5, body.length * .6));
    if (!nums.length) throw new Error('Sayısal sütun bulunamadı');
    const pref = nums.find(i => /ciro|tutar|net|sales|value|satış|satis|₺|tl/i.test(H[i])) ?? nums[0];
    return { H, body, ti, nums, vi: pref };
  }
  function sellinCard(N, m) {
    const c = core(N, m), T = N.months;
    const agg = {}; SELLIN.body.forEach(r => { const k = monthKey(r[SELLIN.ti]); if (k) agg[k] = (agg[k] || 0) + (+r[SELLIN.vi] || 0); });
    const si = T.map(k => agg[k] ?? null), so = c.val.months.map(v => Math.round(v * 1000));
    const ratio = T.map((_, i) => si[i] && so[i] ? +(si[i] / so[i] * 100).toFixed(0) : null);
    const both = T.map((_, i) => si[i] !== null).filter(Boolean).length;
    return { id: 'sellin', name: 'Nielsen sell-out ve kendi sell-in', icon: 'ti-arrows-exchange', wide: true, measureType: 'Para',
      note: `Kaynak: ${fileName} + ${SELLIN.file} (${SELLIN.H[SELLIN.vi]}) · Pazar: ${m} · ${both} ortak ay · Oran = sell-in ÷ sell-out`,
      notes: 'HARIBO sell-in ile Nielsen sell-out karşılaştırması; oran 100 üstünde ise stok birikiyor olabilir.',
      build: () => ({ sub: 'Aylık, ₺ · çizgi: sell-in ÷ sell-out %', option: { ...base(), legend, xAxis: cat(T), yAxis: [valAx(v => money(v)), valAx(pctF, { splitLine: { show: false } })],
        series: [{ name: 'Nielsen sell-out', type: 'bar', barMaxWidth: 16, itemStyle: { color: BLUE, borderRadius: [4, 4, 0, 0] }, data: so },
          { name: 'Sell-in', type: 'bar', barMaxWidth: 16, itemStyle: { color: GOLD, borderRadius: [4, 4, 0, 0] }, data: si },
          { name: 'Oran', type: 'line', yAxisIndex: 1, connectNulls: true, symbolSize: 6, lineStyle: { width: 2, color: GREEN }, itemStyle: { color: GREEN }, data: ratio,
            markLine: { silent: true, symbol: 'none', lineStyle: { color: 'rgba(240,149,149,.6)', type: 'dashed' }, data: [{ yAxis: 100 }], label: { color: TXT, formatter: '%100' } } }] } }) };
  }
  let handle = null, model = null, fileName = '';
  function renderAll(root, m) {
    const N = model, box = root.querySelector('#n-result');
    if (handle) handle.dispose();
    const ins = insights(N, m), k = kpiHtml(N, m);
    G.Basket.kpis = k.list;
    box.innerHTML = `<div class="v-sum"><span class="filechip"><i class="ti ti-file-spreadsheet"></i>${esc(fileName)}</span><span class="pill">${esc(yaL(N))} · ${esc(N.weekEnd || '')}</span>
        <div class="chips-sel">${N.markets.map(x => `<span class="chsel${x === m ? ' on' : ''}" data-m="${esc(x)}">${esc(x)}</span>`).join('')}</div>
        <button class="btn ghost" id="n-reset" style="margin-left:auto"><i class="ti ti-upload"></i> Başka dosya</button>
        <button class="btn ghost" id="n-show"><i class="ti ti-player-play"></i> Sunum modu</button>
        <button class="btn" id="n-pptx"><i class="ti ti-presentation"></i> Rapor PPTX</button><button class="btn gold" id="n-pdf"><i class="ti ti-file-type-pdf"></i> Rapor PDF</button></div>
      <div class="kpis six">${k.html}</div>
      <div class="ins-grid"><div class="ins"><h4><i class="ti ti-bulb"></i> Otomatik çıkarımlar</h4>${ins.out.map(t => `<p>${esc(t)}</p>`).join('')}</div>
        <div class="ins warn"><h4><i class="ti ti-alert-triangle"></i> Uyarılar</h4>${ins.warn.length ? ins.warn.map(t => `<p>${esc(t)}</p>`).join('') : '<p class="okp">Kritik bir uyarı yok. 👍</p>'}</div></div>
      <section class="panel" style="margin-bottom:20px"><div class="ph" style="margin-bottom:8px"><i class="ti ti-arrows-exchange"></i> Nielsen + kendi sell-in verim</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><label class="btn"><i class="ti ti-upload"></i> Sell-in Excel'i yükle<input type="file" id="n-si" accept=".xlsx,.xls,.csv" hidden></label>
        ${SELLIN ? `<span class="filechip"><i class="ti ti-file-spreadsheet"></i>${esc(SELLIN.file)}</span><select class="fsel" id="n-sicol">${SELLIN.nums.map(i => `<option value="${i}"${i === SELLIN.vi ? ' selected' : ''}>${esc(SELLIN.H[i])}</option>`).join('')}</select><button class="btn ghost" id="n-sirm"><i class="ti ti-x"></i> Kaldır</button>` : '<small style="color:var(--muted)">Ay (tarih) sütunu ve tutar sütunu olan herhangi bir Excel olabilir. Aylık toplanıp Nielsen ile yan yana konur.</small>'}
        <span class="msg" id="n-simsg"></span></div></section>
      <div id="n-cards"></div>`;
    const cards = buildCards(N, m, fileName);
    if (SELLIN) cards.unshift(sellinCard(N, m));
    const siIn = box.querySelector('#n-si');
    siIn.onchange = () => { const f = siIn.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = e => { try { SELLIN = Object.assign(readSellin(XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true })), { file: f.name }); renderAll(root, m); }
      catch (err) { const mm = box.querySelector('#n-simsg'); mm.className = 'msg err'; mm.textContent = err.message; } }; fr.readAsArrayBuffer(f); };
    if (SELLIN) { box.querySelector('#n-sicol').onchange = e => { SELLIN.vi = +e.target.value; renderAll(root, m); }; box.querySelector('#n-sirm').onclick = () => { SELLIN = null; renderAll(root, m); }; }
    cards.forEach(c => { if (!c.notes) c.notes = c.name + ': ' + ins.out[0]; });
    G.Cards.render(box.querySelector('#n-cards'), cards, { prefix: 'nielsen' }).then(h => {
      handle = h;
      const info = () => ({ title: 'HARIBO Nielsen Raporu · ' + m, subtitle: fileName + ' · ' + yaL(N) + (N.weekEnd ? ' (' + N.weekEnd + ')' : ''), kpis: k.list.slice(0, 5), note: ins.out[0] });
      const run = async (b, fn) => { const o = b.innerHTML; b.disabled = true; try { await fn(); } catch (e) { console.error(e); alert('Rapor oluşturulamadı.'); } b.innerHTML = o; b.disabled = false; };
      box.querySelector('#n-pptx').onclick = e => run(e.currentTarget, () => G.PptExport.save(h.list(), info()));
      box.querySelector('#n-pdf').onclick = e => { const b = e.currentTarget; run(b, () => G.Export.pdfAll(h.list(), info(), (i, n) => b.innerHTML = '<i class="ti ti-loader-2"></i> ' + i + '/' + n)); };
      box.querySelector('#n-show').onclick = () => G.Present.start(h.list());
    });
    box.querySelectorAll('.chsel').forEach(x => x.onclick = () => renderAll(root, x.dataset.m));
    box.querySelector('#n-reset').onclick = () => { if (handle) handle.dispose(); box.innerHTML = ''; root.querySelector('#n-setup').style.display = ''; };
    root.querySelector('#n-setup').style.display = 'none';
  }
  async function saveArchive(name, N) { try { await fetch('/api/nielsen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, period: yaL(N) + ' ' + (N.weekEnd || ''), at: new Date().toISOString() }) }); } catch (_) {} }

  G.renderNielsen = async function (root) {
    if (handle) { handle.dispose(); handle = null; }
    root.innerHTML = `<div id="n-setup"><section class="panel"><div class="ph"><i class="ti ti-chart-dots-3"></i> Nielsen dosyası</div>
      <label class="drop" id="n-drop" style="min-height:230px"><input type="file" id="n-file" accept=".xlsx,.xls,.xlsm" hidden><div class="drop-ic"><i class="ti ti-chart-dots-3"></i></div>
      <b>Aylık Nielsen Excel'ini buraya bırak</b><span>15 sayfalı standart format · analizler otomatik oluşur</span></label><span class="msg" id="n-msg"></span>
      <div class="n-arch" id="n-arch"></div></section></div><div id="n-result"></div>`;
    const inp = root.querySelector('#n-file'), drop = root.querySelector('#n-drop'), msg = root.querySelector('#n-msg');
    const go = f => { msg.textContent = 'Okunuyor…'; msg.className = 'msg ok'; const fr = new FileReader();
      fr.onload = e => { try { const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' }); model = parse(wb); fileName = f.name; msg.textContent = ''; saveArchive(f.name, model); renderAll(root, model.markets[0]); }
        catch (err) { console.error(err); msg.className = 'msg err'; msg.textContent = 'Dosya okunamadı: ' + err.message; } };
      fr.readAsArrayBuffer(f); };
    inp.onchange = () => inp.files[0] && go(inp.files[0]);
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); e.dataTransfer.files[0] && go(e.dataTransfer.files[0]); };
    try { const a = await (await fetch('/api/nielsen')).json(); if (a.length) root.querySelector('#n-arch').innerHTML = '<h4>Son yüklenenler</h4>' + a.slice(0, 6).map(x => `<div><i class="ti ti-history"></i> ${esc(x.name)} <small>${esc(x.period)} · ${new Date(x.at).toLocaleDateString('tr-TR')}</small></div>`).join(''); } catch (_) {}
    if (model) renderAll(root, model.markets[0]);
  };
  G.__nielsen = { parse, insights, buildCards, bridge, core, monthKey };
})(typeof window !== 'undefined' ? window : globalThis);
