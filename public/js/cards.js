// Ortak grafik kartı sistemi: çizim, görünüm ayarı, indirme, sunum sepeti, sunum modu
(function (G) {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let STYLES = null;
  async function styles() { if (STYLES) return STYLES; try { STYLES = await (await fetch('/api/styles')).json() || {}; } catch (_) { STYLES = {}; } return STYLES; }
  async function putStyle(key, style) {
    const S = await styles(); if (style === null) delete S[key]; else S[key] = style;
    try { await fetch('/api/styles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, style }) }); } catch (_) {}
  }

  // card: {id, name, icon, wide, tall, build(style) -> {option, sub, need}, note, notes(text for speaker notes), measureType}
  // opts: {prefix (style key prefix), after(container)}
  async function render(container, cards, opts) {
    opts = opts || {}; const prefix = opts.prefix || 'genel';
    const S = await styles();
    const styleOf = id => Object.assign({}, S[prefix + ':*'] || {}, S[prefix + ':' + id] || {});
    const make = (c, st) => { let r; try { r = c.build(st || {}) || {}; } catch (e) { console.error(c.id, e); r = { need: 'uygun veri' }; }
      if (r.option && G.Stil) r.option = G.Stil.applyStyle(r.option, st); return r; };
    const state = {};
    const charts = [];
    container.innerHTML = `<div class="cgrid">${cards.map((c, i) => {
      const st = styleOf(c.id), r = make(c, st); state[c.id] = { card: c, st, r };
      return `<div class="ccard${c.wide ? ' wide' : ''}${c.tall ? ' tall' : ''}" data-card="${c.id}" style="animation-delay:${i * 50}ms">
        <div class="cc-h"><div><b><i class="ti ${c.icon || 'ti-chart-bar'}"></i> <span class="cc-t">${esc(st.title || c.name)}</span></b><small class="cc-s">${esc(r.need ? 'Bu grafik için ' + r.need + ' gerekli' : (st.sub || r.sub || ''))}</small></div>
          <div class="cc-tools">${c.html ? '' : `<button class="icon-btn add" data-add="${c.id}" title="Sunuma ekle"${r.need ? ' disabled' : ''}><i class="ti ti-presentation-analytics"></i></button>
          <button class="icon-btn gear" data-gear="${c.id}" title="Görünüm ayarları"${r.need ? ' disabled' : ''}><i class="ti ti-adjustments"></i></button>
          <button class="icon-btn dl" data-dl="${c.id}" title="İndir: PNG · PDF · PPTX"${r.need ? ' disabled' : ''}><i class="ti ti-download"></i></button>`}</div></div>
        <div class="cc-body" id="cb-${prefix}-${c.id}">${c.html ? c.html : r.need ? '<div class="empty-small"><i class="ti ti-chart-dots-3"></i><br>Gerekli veri yok</div>' : ''}</div>
        ${!c.html && !r.need && c.note ? `<div class="cc-foot"><i class="ti ti-info-circle"></i> ${esc(c.note)}</div>` : ''}</div>`; }).join('')}</div>`;
    const byId = {};
    cards.forEach(c => { const s = state[c.id]; if (c.html || s.r.need || typeof echarts === 'undefined') return;
      const el = container.querySelector('#cb-' + prefix + '-' + c.id); const ch = echarts.init(el); ch.setOption(s.r.option); charts.push(ch); byId[c.id] = ch; });
    const ro = new ResizeObserver(() => charts.forEach(c => c.resize())); ro.observe(container);
    const current = id => { const s = state[id]; return { title: s.st.title || s.card.name, sub: s.st.sub || s.r.sub, option: s.r.option, note: s.card.note, notes: s.card.notes, measureType: s.card.measureType }; };
    container.querySelectorAll('[data-gear]').forEach(btn => btn.onclick = () => {
      const id = btn.dataset.gear, s = state[id], card = btn.closest('.ccard'), ch = byId[id];
      const redraw = st => { s.st = st; s.r = make(s.card, st); if (s.r.option && ch) ch.setOption(s.r.option, true);
        card.querySelector('.cc-t').textContent = st.title || s.card.name; card.querySelector('.cc-s').textContent = st.sub || s.r.sub || ''; };
      container.querySelectorAll('.ccard').forEach(x => x.classList.toggle('editing', x === card));
      G.Stil.open({ name: s.card.name, sub: s.r.sub, style: s.st, kindGroup: G.Stil.kindGroup(s.r.option), onChange: redraw, onPlay: st => { ch && ch.clear(); redraw(st); },
        onSave: async (st, all) => {
          if (all) { await putStyle(prefix + ':*', st); const SS = await styles();
            for (const k of Object.keys(SS)) if (k.startsWith(prefix + ':') && !k.endsWith(':*')) { const v = SS[k]; await putStyle(k, (v.title || v.sub || v.kind) ? { title: v.title, sub: v.sub, kind: v.kind } : null); }
            cards.forEach(c => { if (state[c.id] && !c.html && !state[c.id].r.need) { const ns = styleOf(c.id); state[c.id].st = ns; state[c.id].r = make(c, ns); byId[c.id] && byId[c.id].setOption(state[c.id].r.option, true); } });
          } else await putStyle(prefix + ':' + id, st);
        },
        onReset: async () => { await putStyle(prefix + ':' + id, null); redraw(styleOf(id)); card.classList.remove('editing'); } });
    });
    container.querySelectorAll('[data-dl]').forEach(btn => btn.onclick = e => { e.stopPropagation(); G.Export.openMenu(btn, () => current(btn.dataset.dl)); });
    container.querySelectorAll('[data-add]').forEach(btn => btn.onclick = () => { Basket.add(current(btn.dataset.add)); btn.classList.add('done'); btn.innerHTML = '<i class="ti ti-check"></i>'; setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = '<i class="ti ti-presentation-analytics"></i>'; }, 1400); });
    return { list: () => cards.filter(c => !c.html && !state[c.id].r.need).map(c => current(c.id)), dispose: () => { ro.disconnect(); charts.forEach(c => c.dispose()); } };
  }

  // ---------- Sunum sepeti (sunum oluşturucu) ----------
  const Basket = {
    items: [],
    add(item) { this.items.push(Object.assign({ key: Date.now() + Math.random() }, item)); this.paint(); this.pulse(); },
    pulse() { const b = document.getElementById('basket-btn'); if (!b) return; b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); },
    paint() {
      let b = document.getElementById('basket-btn');
      if (!b) { b = document.createElement('button'); b.id = 'basket-btn'; b.onclick = () => this.open(); document.body.appendChild(b); }
      b.innerHTML = `<i class="ti ti-presentation-analytics"></i> Sunum <span>${this.items.length}</span>`; b.style.display = this.items.length ? '' : 'none';
      if (document.querySelector('.drawer.basket.open')) this.open();
    },
    open() {
      let d = document.querySelector('.drawer.basket'); if (!d) { d = document.createElement('div'); d.className = 'drawer basket'; document.body.appendChild(d); }
      const it = this.items;
      d.innerHTML = `<div class="dr-head"><div><b><i class="ti ti-presentation-analytics"></i> Sunum oluşturucu</b><small>${it.length} slayt · sıralamayı oklarla değiştir</small></div><button class="icon-btn" id="bk-x"><i class="ti ti-x"></i></button></div>
        <div class="dr-body"><label class="dr-f"><span>Sunum başlığı</span><input id="bk-title" value="${esc(this.title || 'Yönetim Sunumu')}"></label>
          <label class="dr-f"><span>Alt başlık</span><input id="bk-sub" value="${esc(this.sub || new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }))}"></label>
          <label class="dr-t"><input type="checkbox" id="bk-notes" checked><i></i><span>Konuşmacı notlarını otomatik ekle</span></label>
          <div class="bk-list">${it.map((x, i) => `<div class="bk-it"><span class="bk-n">${i + 1}</span><div><b>${esc(x.title)}</b><small>${esc(x.sub || '')}</small></div>
            <div class="bk-tools"><button class="icon-btn" data-up="${i}" ${i ? '' : 'disabled'}><i class="ti ti-arrow-up"></i></button><button class="icon-btn" data-down="${i}" ${i < it.length - 1 ? '' : 'disabled'}><i class="ti ti-arrow-down"></i></button><button class="icon-btn" data-rm="${i}"><i class="ti ti-trash"></i></button></div></div>`).join('') || '<div class="empty-small">Grafik kartlarındaki <i class="ti ti-presentation-analytics"></i> simgesiyle slayt ekle.</div>'}</div></div>
        <div class="dr-foot"><span class="msg" id="bk-msg"></span>
          <button class="btn ghost" id="bk-show"${it.length ? '' : ' disabled'}><i class="ti ti-player-play"></i> Sunum modu</button>
          <button class="btn ghost" id="bk-clear"${it.length ? '' : ' disabled'}><i class="ti ti-trash"></i> Boşalt</button>
          <button class="btn ghost" id="bk-pdf"${it.length ? '' : ' disabled'}><i class="ti ti-file-type-pdf"></i> PDF</button>
          <button class="btn ghost" id="bk-video"${it.length ? '' : ' disabled'}><i class="ti ti-movie"></i> Video PPTX</button>
          <button class="btn gold" id="bk-pptx"${it.length ? '' : ' disabled'}><i class="ti ti-presentation"></i> PPTX</button></div>`;
      const q = s => d.querySelector(s), msg = q('#bk-msg');
      q('#bk-x').onclick = () => d.classList.remove('open');
      q('#bk-title').oninput = e => this.title = e.target.value; q('#bk-sub').oninput = e => this.sub = e.target.value;
      d.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const i = +b.dataset.up; [it[i - 1], it[i]] = [it[i], it[i - 1]]; this.open(); });
      d.querySelectorAll('[data-down]').forEach(b => b.onclick = () => { const i = +b.dataset.down; [it[i + 1], it[i]] = [it[i], it[i + 1]]; this.open(); });
      d.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { it.splice(+b.dataset.rm, 1); this.paint(); this.open(); });
      q('#bk-clear').onclick = () => { it.length = 0; this.paint(); this.open(); };
      q('#bk-show').onclick = () => { d.classList.remove('open'); Present.start(it.slice()); };
      const info = () => ({ title: q('#bk-title').value || 'Sunum', subtitle: q('#bk-sub').value || '', kpis: this.kpis || [], note: 'Excel Dashboard · ' + it.length + ' slayt', noNotes: !q('#bk-notes').checked });
      const run = async (btn, fn) => { const old = btn.innerHTML; btn.disabled = true; try { await fn(); msg.className = 'msg ok'; msg.textContent = 'İndirildi ✓'; } catch (e) { console.error(e); msg.className = 'msg err'; msg.textContent = 'Bir sorun oluştu.'; } btn.innerHTML = old; btn.disabled = false; };
      q('#bk-pptx').onclick = () => run(q('#bk-pptx'), () => G.PptExport.save(it.slice(), info()));
      q('#bk-video').onclick = () => run(q('#bk-video'), () => G.PptExport.saveVideo(it.slice(), info(), (i, n) => msg.textContent = 'Video ' + i + '/' + n));
      q('#bk-pdf').onclick = () => run(q('#bk-pdf'), () => G.Export.pdfAll(it.slice(), info(), (i, n) => msg.textContent = 'Sayfa ' + i + '/' + n));
      requestAnimationFrame(() => d.classList.add('open'));
    }
  };

  // ---------- Sunum modu (tam ekran) ----------
  const Present = {
    start(list) {
      if (!list || !list.length) return;
      let i = 0; const ov = document.createElement('div'); ov.className = 'present';
      ov.innerHTML = `<div class="pr-top"><span class="pr-n"></span><span class="pr-hint">← → geçiş · Esc çıkış</span><button class="icon-btn" id="pr-x"><i class="ti ti-x"></i></button></div>
        <div class="pr-slide"><h1></h1><p></p><div class="pr-chart"></div><div class="pr-note"></div></div>
        <button class="pr-nav l"><i class="ti ti-chevron-left"></i></button><button class="pr-nav r"><i class="ti ti-chevron-right"></i></button>`;
      document.body.appendChild(ov);
      const ch = echarts.init(ov.querySelector('.pr-chart'));
      const show = () => { const c = list[i]; ov.querySelector('h1').textContent = c.title; ov.querySelector('p').textContent = c.sub || ''; ov.querySelector('.pr-note').textContent = c.note || '';
        ov.querySelector('.pr-n').textContent = (i + 1) + ' / ' + list.length; ch.clear(); ch.setOption(Object.assign({}, c.option, { textStyle: Object.assign({}, c.option.textStyle, { fontSize: 15 }) }), true);
        const s = ov.querySelector('.pr-slide'); s.classList.remove('in'); void s.offsetWidth; s.classList.add('in'); };
      const go = d => { i = Math.max(0, Math.min(list.length - 1, i + d)); show(); };
      const key = e => { if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') go(1); else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1); else if (e.key === 'Escape') close(); };
      const close = () => { document.removeEventListener('keydown', key); removeEventListener('resize', rs); ch.dispose(); ov.remove(); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
      const rs = () => ch.resize();
      ov.querySelector('#pr-x').onclick = close; ov.querySelector('.pr-nav.l').onclick = () => go(-1); ov.querySelector('.pr-nav.r').onclick = () => go(1);
      document.addEventListener('keydown', key); addEventListener('resize', rs);
      if (ov.requestFullscreen) ov.requestFullscreen().catch(() => {});
      setTimeout(() => { ch.resize(); show(); }, 120);
    }
  };
  G.Cards = { render, styles, putStyle, esc }; G.Basket = Basket; G.Present = Present;
})(typeof window !== 'undefined' ? window : globalThis);
