// Canlı radyo: Türk radyoları (İstanbul frekansı ile) + dünya haritasından ülke radyoları
(function (G) {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FREQ = `87.5 Delta FM|87.7 Radyo 24 Spor|88.0 Radyo 34|88.2 TRT Radyo 3|88.4 Lalegül FM|88.6 İstanbul FM|88.8 Burç FM|89.0 Joy Türk|89.2 Alem FM|89.4 Radyo Duble|89.6 Müjde FM|89.8 Show Radyo|90.0 Radyo Viva|90.2 A Haber Radyo|90.4 Habertürk Radyo|90.6 Radyo 2000|90.8 Süper FM|91.0 Radyo Alaturka|91.2 Radyo Slowtime|91.4 TRT FM|91.6 Radyo Nur|91.8 İstanbul'un Sesi|92.0 Kral FM|92.3 Lig Radyo|92.5 CNN Türk Radyo|92.7 Bloomberg HT Radyo|92.9 Kanaltürk Radyo|93.1 TGRT FM|93.3 Radyo Karadenizin Sesi|93.5 Radyo Mehtap|93.7 FG Radio|93.9 Medya FM|94.1 Polis Radyosu|94.3 Radyo Ekin|94.5 Rock FM|94.7 Kral Pop|94.9 Açık Radyo|95.1 Özgür Radyo|95.3 Slow Türk|95.6 TRT Radyo 1|95.8 Bayram FM|96.0 Lounge FM|96.2 Radyo Eksen|96.4 Cem Radyo|96.6 Yön Radyo|96.8 Radyo Moda|97.0 Radyo Fenerbahçe|97.2 Metro FM|97.4 Radyo Feza|97.6 Radyo Müzik|97.8 Meltem Radyo|98.0 Damga FM|98.2 Radyo Karadeniz|98.4 Best FM|98.6 Number One Türk|98.8 Star FM|99.0 Karma Türk|99.2 Pal FM|99.4 Maxi Music|99.6 Zemzem FM|99.8 Power Türk|100.0 Power FM|100.2 Power Love|100.4 Radyo Fenomen|100.6 Joy FM|101.0 Capital Radio|101.2 Semerkand Radyo|101.4 Radyo Avrasya|101.6 TRT Nağme|101.8 Radyo Vatan|102.0 Luxury Lounge|102.2 Seyr FM|102.4 Number One FM|102.6 Radyo Planet|102.8 NTV Radyo|103.2 Özel FM|103.4 TRT Türkü|103.6 Radyo Light|103.8 Dinamo FM|104.0 Radyo D|104.2 Radyo Trafik|104.4 Bizim Radyo|104.6 Radyo 7|104.8 Radyo Ahenk|105.0 Moral FM|105.2 Radyo Cihan|105.4 Radyo Mega|105.6 Baba Radyo|105.8 Radyo İmparator|106.0 Pal Station|106.2 Virgin Radio Türkiye|106.6 Radio X|107.0 Radyo Seymen|107.2 Radyospor|107.4 Radyo Voyage|107.6 Akra FM|107.8 Radyo Özlem|108.0 Dolunay FM`
    .split('|').map(x => { const i = x.indexOf(' '); return { f: x.slice(0, i), n: x.slice(i + 1) }; });
  const HOSTS = ['https://de1.api.radio-browser.info', 'https://fi1.api.radio-browser.info', 'https://de2.api.radio-browser.info', 'https://nl1.api.radio-browser.info'];
  async function rb(path) {
    for (const h of HOSTS) { try { const r = await fetch(h + path, { signal: AbortSignal.timeout(9000) }); if (r.ok) return await r.json(); } catch (_) {} }
    throw new Error('Radyo servisine ulaşılamadı');
  }
  const norm = s => String(s || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/\b(fm|radyo|radio|turkiye|türkiye|istanbul|canli|live)\b/g, '').replace(/[^a-z0-9]/g, '');
  // haritadaki adlar → Radio Browser ülke kodları (eşleşmeyen özel durumlar)
  const ALIAS = { 'United States': 'US', 'Russia': 'RU', 'Dem. Rep. Congo': 'CD', 'Congo': 'CG', 'Korea': 'KR', 'Dem. Rep. Korea': 'KP', 'Czech Rep.': 'CZ', 'Bosnia and Herz.': 'BA', 'Central African Rep.': 'CF',
    'Dominican Rep.': 'DO', 'Eq. Guinea': 'GQ', 'Lao PDR': 'LA', 'Macedonia': 'MK', 'Moldova': 'MD', 'S. Sudan': 'SS', 'Solomon Is.': 'SB', 'Syria': 'SY', 'Tanzania': 'TZ', 'Venezuela': 'VE', 'Vietnam': 'VN',
    'Iran': 'IR', 'Bolivia': 'BO', 'Turkey': 'TR', 'United Kingdom': 'GB', 'Taiwan': 'TW', 'Côte d\'Ivoire': 'CI', 'W. Sahara': 'EH', 'Falkland Is.': 'FK', 'Fr. S. Antarctic Lands': 'TF', 'N. Cyprus': 'CY', 'Palestine': 'PS', 'Brunei': 'BN', 'Kosovo': 'XK', 'Somaliland': 'SO' };
  const TR_NAME = { US: 'ABD', GB: 'Birleşik Krallık', DE: 'Almanya', FR: 'Fransa', IT: 'İtalya', ES: 'İspanya', RU: 'Rusya', CN: 'Çin', JP: 'Japonya', TR: 'Türkiye', GR: 'Yunanistan', NL: 'Hollanda', BR: 'Brezilya', EG: 'Mısır', AZ: 'Azerbaycan' };

  const P = G.__radioPlayer = G.__radioPlayer || { audio: new Audio(), cur: null };
  P.audio.preload = 'none';
  let stTR = null, countries = null, root = null;

  function streamUrl(s, viaProxy) { const u = s.url_resolved || s.url; return (viaProxy || !/^https:/i.test(u)) ? '/api/stream?u=' + encodeURIComponent(u) : u; }
  function play(s) {
    P.cur = s; const a = P.audio; let triedProxy = false;
    a.src = streamUrl(s, false); a.onerror = () => { if (!triedProxy && /^https:/i.test(s.url_resolved || s.url)) { triedProxy = true; a.src = streamUrl(s, true); a.play().catch(() => {}); } else paint('Bu yayın şu an açılamıyor'); };
    a.play().catch(() => {}); paint();
    document.querySelectorAll('.st').forEach(x => x.classList.toggle('on', x.dataset.uuid === s.stationuuid));
  }
  function paint(err) {
    const el = document.getElementById('rd-player'); if (!el) return; const s = P.cur;
    el.classList.toggle('paused', !s || P.audio.paused);
    el.querySelector('.grow').innerHTML = s ? `<b>${esc(s.fq ? s.fq + ' · ' : '')}${esc(s.name)}</b><small>${esc(err || [s.country, s.tags && s.tags.split(',').slice(0, 3).join(', ')].filter(Boolean).join(' · '))}</small>` : '<b>Bir radyo seç</b><small>Listeden ya da haritadan</small>';
    el.querySelector('#rd-pp').innerHTML = `<i class="ti ti-player-${!s || P.audio.paused ? 'play' : 'pause'}-filled"></i>`;
  }
  P.audio.onplaying = () => paint(); P.audio.onpause = () => paint(); P.audio.onwaiting = () => { const el = document.querySelector('#rd-player small'); if (el) el.textContent = 'Bağlanıyor…'; };
  const icon = s => s.favicon ? `<img src="${esc(s.favicon)}" loading="lazy" onerror="this.outerHTML='<span class=&quot;ph0&quot;><i class=&quot;ti ti-radio&quot;></i></span>'">` : '<span class="ph0"><i class="ti ti-radio"></i></span>';
  const row = s => `<div class="st${P.cur && P.cur.stationuuid === s.stationuuid ? ' on' : ''}" data-uuid="${esc(s.stationuuid)}">${icon(s)}<div><b>${esc(s.name)}</b><small>${esc((s.tags || '').split(',').slice(0, 2).join(', ') || s.country || '')}</small></div>${s.fq ? `<span class="fq">${s.fq}</span>` : ''}</div>`;

  async function loadTR() {
    if (stTR) return stTR;
    const all = await rb('/json/stations/bycountrycodeexact/TR?hidebroken=true&order=votes&reverse=true&limit=800');
    const by = {}; all.forEach(s => { const k = norm(s.name); if (k && !by[k]) by[k] = s; });
    const used = new Set(), withF = [];
    FREQ.forEach(f => { const k = norm(f.n); let s = by[k];
      if (!s && k.length > 3) s = all.find(x => !used.has(x.stationuuid) && (norm(x.name).startsWith(k) || (norm(x.name).includes(k) && k.length > 4)));
      if (s && !used.has(s.stationuuid)) { used.add(s.stationuuid); withF.push(Object.assign({}, s, { fq: f.f, name: f.n })); } });
    const rest = all.filter(s => !used.has(s.stationuuid)).filter((s, i, a) => a.findIndex(x => norm(x.name) === norm(s.name)) === i);
    return stTR = { withF, rest };
  }
  function listTR(q) {
    const box = root.querySelector('#rd-list'); if (!stTR) return;
    const n = norm(q), qf = q.replace(',', '.').trim();
    const m = s => !q || norm(s.name).includes(n) || (s.fq && s.fq.startsWith(qf)) || (s.tags || '').toLowerCase().includes(q.toLowerCase());
    const a = stTR.withF.filter(m), b = stTR.rest.filter(m).slice(0, q ? 80 : 60);
    box.innerHTML = (a.length ? `<div class="navlbl">İstanbul frekansları · ${a.length}</div>` + a.map(row).join('') : '') + (b.length ? `<div class="navlbl">Diğer Türk radyoları (internet)</div>` + b.map(row).join('') : '') || '<div class="empty-small" style="height:120px">Sonuç yok</div>';
    const pool = [...stTR.withF, ...stTR.rest];
    box.querySelectorAll('.st').forEach(x => x.onclick = () => play(pool.find(s => s.stationuuid === x.dataset.uuid)));
  }
  async function country(name) {
    const out = root.querySelector('#rd-top5'), ttl = root.querySelector('#rd-ctitle');
    ttl.textContent = name + ' · yükleniyor…'; out.innerHTML = '';
    try {
      if (!countries) countries = await rb('/json/countries');
      let code = ALIAS[name]; if (!code) { const c = countries.find(x => norm(x.name) === norm(name)) || countries.find(x => norm(x.name).startsWith(norm(name))); code = c && c.iso_3166_1; }
      if (!code) throw new Error('Bu ülke için radyo bulunamadı');
      const st = await rb(`/json/stations/bycountrycodeexact/${code}?hidebroken=true&order=clickcount&reverse=true&limit=12`);
      const top = st.filter((s, i, a) => a.findIndex(x => norm(x.name) === norm(s.name)) === i).slice(0, 5);
      ttl.textContent = (TR_NAME[code] || name) + ' · en popüler 5 radyo';
      out.innerHTML = top.map(row).join('') || '<div class="empty-small">Bu ülke için yayın yok</div>';
      out.querySelectorAll('.st').forEach(x => x.onclick = () => play(top.find(s => s.stationuuid === x.dataset.uuid)));
    } catch (e) { ttl.textContent = name + ' · ' + e.message; }
  }
  let mapChart = null;
  async function drawMap() {
    const el = root.querySelector('#rd-map'); if (typeof echarts === 'undefined') return;
    try {
      if (!echarts.getMap('world')) { const geo = await (await fetch('https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json')).json(); echarts.registerMap('world', geo); }
      if (mapChart) mapChart.dispose(); mapChart = echarts.init(el);
      mapChart.setOption({ backgroundColor: 'transparent', tooltip: { trigger: 'item', formatter: p => p.name + '<br><small>Radyoları görmek için tıkla</small>', backgroundColor: 'rgba(6,16,36,.95)', textStyle: { color: '#eaf0fa' } },
        series: [{ type: 'map', map: 'world', roam: true, zoom: 1.15, scaleLimit: { min: 1, max: 8 }, selectedMode: 'single',
          itemStyle: { areaColor: 'rgba(95,184,240,.14)', borderColor: 'rgba(242,214,138,.35)', borderWidth: .6 },
          emphasis: { label: { show: false }, itemStyle: { areaColor: 'rgba(242,214,138,.55)' } }, select: { label: { show: false }, itemStyle: { areaColor: '#f2d68a' } } }] });
      mapChart.on('click', p => country(p.name));
      new ResizeObserver(() => mapChart && mapChart.resize()).observe(el);
    } catch (_) { el.innerHTML = '<div class="empty-small">Harita yüklenemedi</div>'; }
  }

  G.renderRadyo = async function (r) {
    root = r;
    root.innerHTML = `<div class="rd-grid"><section class="panel"><div class="ph"><i class="ti ti-radio"></i> Türk radyoları</div>
        <div class="rd-search"><input id="rd-q" placeholder="Frekans (ör. 92.0) ya da radyo adı yaz…" autocomplete="off"></div>
        <div class="rd-list" id="rd-list"><div class="empty-small" style="height:120px">Radyolar yükleniyor…</div></div></section>
      <section class="panel"><div class="ph"><i class="ti ti-world"></i> Dünya radyoları <small style="color:var(--muted);font-weight:400;margin-left:8px">Haritada bir ülkeye tıkla · tekerlekle yakınlaş</small></div>
        <div class="map-box" id="rd-map"></div><div class="ph" style="margin:14px 0 0" id="rd-ctitle">Ülke seçilmedi</div><div class="rd-top5" id="rd-top5"></div></section></div>
      <div class="player paused" id="rd-player"><div class="eq"><i></i><i></i><i></i><i></i><i></i></div><div class="grow"></div>
        <button class="icon-btn" id="rd-pp" style="width:46px;height:46px;font-size:22px;color:var(--gold);border-color:rgba(242,214,138,.4)"></button>
        <i class="ti ti-volume" style="color:var(--muted)"></i><input type="range" id="rd-vol" min="0" max="1" step="0.05"></div>`;
    paint();
    const vol = root.querySelector('#rd-vol'); vol.value = P.audio.volume; vol.oninput = () => P.audio.volume = +vol.value;
    root.querySelector('#rd-pp').onclick = () => { if (!P.cur) return; if (P.audio.paused) P.audio.play().catch(() => {}); else P.audio.pause(); };
    root.querySelector('#rd-q').oninput = e => listTR(e.target.value);
    drawMap();
    try { await loadTR(); listTR(''); } catch (e) { root.querySelector('#rd-list').innerHTML = `<div class="empty-small" style="height:120px">${esc(e.message)}</div>`; }
  };
})(window);
