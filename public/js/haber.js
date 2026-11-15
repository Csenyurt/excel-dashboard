// Haber kanalı: canlı TV, son dakika (10 dk), konu kutuları, piyasalar
(function (G) {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TV = [
    { n: 'TRT Haber', ch: 'UCBgTP2LOFVPmq15W-RH-WXA', yt: 'https://www.youtube.com/@trthaber/live' },
    { n: 'Habertürk', ch: 'UCn6dNfiRE_Xunu7iMyvD7AA', yt: 'https://www.youtube.com/@haberturktv/live' },
    { n: 'Al Jazeera', ch: 'UCNye-wNBqNL5ZzHSJj3l8Bg', yt: 'https://www.youtube.com/@aljazeeraenglish/live' },
    { n: 'DW News', ch: 'UCknLrEdhRCp1aegoMqRaCZg', yt: 'https://www.youtube.com/@dwnews/live' }
  ];
  const BOX = [['spor', 'Spor', 'ti-ball-football'], ['ekonomi', 'Ekonomi', 'ti-coin'], ['gundem', 'Türkiye gündemi', 'ti-flag'], ['ortadogu', 'Ortadoğu', 'ti-world']];
  const seen = {}; let timer = null, tvi = 0;
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'şimdi' : m < 60 ? m + ' dk önce' : m < 1440 ? Math.round(m / 60) + ' sa önce' : new Date(t).toLocaleDateString('tr-TR'); };

  async function fill(root, key) {
    const ul = root.querySelector(`[data-news="${key}"]`); if (!ul) return;
    try {
      const items = await (await fetch('/api/rss?k=' + key)).json(); if (!Array.isArray(items)) throw 0;
      const old = seen[key]; seen[key] = new Set(items.map(x => x.title));
      ul.innerHTML = items.slice(0, 20).map(x => `<li class="${old && !old.has(x.title) ? 'new' : ''}"><a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.title)}</a><small>${esc(x.src)} · ${ago(x.t)}</small></li>`).join('');
    } catch (_) { ul.innerHTML = '<li><small>Kaynağa şu an ulaşılamadı, 10 dk içinde tekrar denenecek.</small></li>'; }
    const st = root.querySelector(`[data-upd="${key}"]`); if (st) st.textContent = 'Güncellendi ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }
  function tvWidget(el, name, cfg) {
    const box = document.createElement('div'); box.className = 'tradingview-widget-container'; box.style.height = '100%';
    const w = document.createElement('div'); w.className = 'tradingview-widget-container__widget'; w.style.height = '100%'; box.appendChild(w);
    const s = document.createElement('script'); s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-' + name + '.js'; s.async = true; s.innerHTML = JSON.stringify(cfg);
    box.appendChild(s); el.innerHTML = ''; el.appendChild(box);
  }
  function setTv(root, i) {
    tvi = i; const t = TV[i];
    root.querySelectorAll('[data-tv]').forEach(b => b.classList.toggle('on', +b.dataset.tv === i));
    root.querySelector('.hb-frame').innerHTML = `<iframe src="https://www.youtube.com/embed/live_stream?channel=${t.ch}&autoplay=1&mute=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    root.querySelector('#hb-yt').href = t.yt;
  }

  G.renderHaber = function (root) {
    clearInterval(timer);
    root.innerHTML = `<div class="ticker" id="hb-tick"></div>
      <div class="hb-grid"><div class="hb-tv"><div class="hb-tabs">${TV.map((t, i) => `<span class="chsel" data-tv="${i}">${t.n}</span>`).join('')}
          <a class="chsel" id="hb-yt" target="_blank" rel="noopener" style="margin-left:auto;text-decoration:none"><i class="ti ti-brand-youtube"></i> YouTube'da aç</a></div>
          <div class="hb-frame"></div></div>
        <div class="hb-col"><div class="news"><h4><i class="live"></i> Son dakika · Türkiye <small data-upd="tr_son"></small></h4><ul data-news="tr_son"><li><small>Yükleniyor…</small></li></ul></div>
          <div class="news"><h4><i class="live"></i> Son dakika · Dünya <small data-upd="dunya_son"></small></h4><ul data-news="dunya_son"><li><small>Yükleniyor…</small></li></ul></div></div></div>
      <div class="hb-four">${BOX.map(([k, n, i]) => `<div class="news"><h4><i class="ti ${i}"></i> ${n} <small data-upd="${k}"></small></h4><ul data-news="${k}"><li><small>Yükleniyor…</small></li></ul></div>`).join('')}</div>
      <div class="hb-mk"><div class="tvbox" id="mk1"></div><div class="tvbox" id="mk2"></div><div class="tvbox" id="mk3"></div></div>
      <p class="cc-foot" style="border:0;margin-top:8px"><i class="ti ti-info-circle"></i> Haberler 10 dakikada bir kendiliğinden yenilenir · Kaynaklar: TRT Haber, AA, BBC Türkçe, Al Jazeera RSS · Piyasa verileri: TradingView (gecikmeli olabilir)</p>`;
    root.querySelectorAll('[data-tv]').forEach(b => b.onclick = () => setTv(root, +b.dataset.tv));
    setTv(root, tvi);
    const keys = ['tr_son', 'dunya_son', ...BOX.map(b => b[0])];
    keys.forEach(k => fill(root, k));
    timer = setInterval(() => { if (!document.body.contains(root.querySelector('.hb-grid'))) return clearInterval(timer); keys.forEach(k => fill(root, k)); }, 10 * 60e3);
    const theme = { colorTheme: 'dark', isTransparent: true, locale: 'tr' };
    tvWidget(root.querySelector('#hb-tick'), 'ticker-tape', { ...theme, displayMode: 'adaptive', showSymbolLogo: true, symbols: [
      { proName: 'FX_IDC:USDTRY', title: 'Dolar/TL' }, { proName: 'FX_IDC:EURTRY', title: 'Euro/TL' }, { proName: 'FX_IDC:GBPTRY', title: 'Sterlin/TL' },
      { proName: 'BIST:XU100', title: 'BIST 100' }, { proName: 'OANDA:XAUUSD', title: 'Altın (ons)' }, { proName: 'TVC:UKOIL', title: 'Brent' },
      { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' }, { proName: 'BITSTAMP:ETHUSD', title: 'Ethereum' }, { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' }] });
    const mini = (id, syms) => tvWidget(root.querySelector('#' + id), 'symbol-overview', { ...theme, symbols: syms, chartOnly: false, width: '100%', height: '100%', showVolume: false, hideDateRanges: false, scalePosition: 'right', fontColor: '#b5c3dc', gridLineColor: 'rgba(120,160,230,.08)', lineWidth: 2, dateRanges: ['1d|15', '1m|30', '12m|1D', '60m|1W'] });
    mini('mk1', [['Dolar/TL', 'FX_IDC:USDTRY|1D'], ['Euro/TL', 'FX_IDC:EURTRY|1D'], ['Altın', 'OANDA:XAUUSD|1D']]);
    mini('mk2', [['BIST 100', 'BIST:XU100|1D'], ['S&P 500', 'FOREXCOM:SPXUSD|1D'], ['Brent', 'TVC:UKOIL|1D']]);
    mini('mk3', [['Bitcoin', 'BITSTAMP:BTCUSD|1D'], ['Ethereum', 'BITSTAMP:ETHUSD|1D'], ['Solana', 'COINBASE:SOLUSD|1D']]);
  };
})(window);
