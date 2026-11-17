// İndirme sistemi: PNG, PDF (tek grafik ve tüm rapor)
(function (G) {
  const W = 1600, H = 900; // export canvas size (16:9)

  function slug(s) { return String(s || 'grafik').toLocaleLowerCase('tr-TR').replace(/[ğ]/g, 'g').replace(/[ü]/g, 'u').replace(/[ş]/g, 's').replace(/[ı]/g, 'i').replace(/[ö]/g, 'o').replace(/[ç]/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'grafik'; }
  function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

  // render an option off-screen at fixed size without animation -> dataURL
  function chartImage(option, w, h) {
    const el = document.createElement('div'); el.style.cssText = `position:fixed;left:-99999px;top:0;width:${w}px;height:${h}px`;
    document.body.appendChild(el);
    const ch = echarts.init(el, null, { renderer: 'canvas', width: w, height: h });
    const o = Object.assign({}, option, { animation: false });
    // larger fonts for export
    ch.setOption(o);
    const url = ch.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: 'rgba(0,0,0,0)' });
    ch.dispose(); el.remove(); return url;
  }
  const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

  function bg(ctx) {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#081226'); g.addColorStop(.6, '#0d1b3a'); g.addColorStop(1, '#060d1f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const r = ctx.createRadialGradient(W * .9, 0, 0, W * .9, 0, 700); r.addColorStop(0, 'rgba(95,184,240,.14)'); r.addColorStop(1, 'rgba(95,184,240,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f2d68a'; ctx.fillRect(60, 64, 6, 52);
  }
  function wrapText(ctx, t, max) { if (ctx.measureText(t).width <= max) return t; while (t.length > 3 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; }

  // compose a full 16:9 slide image of one chart: title, subtitle, chart, footnote
  async function slideImage(c) {
    const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2;
    const ctx = cv.getContext('2d'); ctx.scale(2, 2); bg(ctx);
    ctx.textBaseline = 'top'; ctx.fillStyle = '#eaf0fa'; ctx.font = '600 38px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(wrapText(ctx, c.title, W - 200), 88, 62);
    ctx.fillStyle = '#9fb0cf'; ctx.font = '22px "Segoe UI", system-ui, sans-serif'; ctx.fillText(wrapText(ctx, c.sub || '', W - 200), 88, 110);
    const img = await loadImg(chartImage(c.option, W - 160, H - 270));
    ctx.drawImage(img, 80, 168, W - 160, H - 270);
    ctx.fillStyle = 'rgba(120,160,230,.18)'; ctx.fillRect(80, H - 82, W - 160, 1);
    ctx.fillStyle = '#7f93b8'; ctx.font = '18px "Segoe UI", system-ui, sans-serif'; ctx.fillText(wrapText(ctx, c.note || '', W - 360), 80, H - 64);
    ctx.textAlign = 'right'; ctx.fillStyle = '#c9a24a'; ctx.fillText('Excel Dashboard', W - 80, H - 64);
    return cv.toDataURL('image/png');
  }

  async function png(c) { download(await slideImage(c), slug(c.title) + '.png'); }

  function pdfDoc() { const { jsPDF } = window.jspdf; return new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H], hotfixes: ['px_scaling'] }); }
  async function pdf(c) { const d = pdfDoc(); d.addImage(await slideImage(c), 'PNG', 0, 0, W, H); d.save(slug(c.title) + '.pdf'); }

  // cover page for full report
  async function coverImage(info) {
    const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2;
    const ctx = cv.getContext('2d'); ctx.scale(2, 2); bg(ctx);
    ctx.textBaseline = 'top'; ctx.fillStyle = '#f2d68a'; ctx.font = '600 22px "Segoe UI", system-ui, sans-serif'; ctx.fillText('EXCEL DASHBOARD · RAPOR', 88, 70);
    ctx.fillStyle = '#eaf0fa'; ctx.font = '600 64px "Segoe UI", system-ui, sans-serif'; ctx.fillText(wrapText(ctx, info.title, W - 200), 88, 150);
    ctx.fillStyle = '#9fb0cf'; ctx.font = '26px "Segoe UI", system-ui, sans-serif'; ctx.fillText(wrapText(ctx, info.subtitle, W - 200), 88, 236);
    const k = info.kpis.slice(0, 5), bw = (W - 176 - (k.length - 1) * 24) / k.length;
    k.forEach((x, i) => {
      const X = 88 + i * (bw + 24), Y = 360;
      ctx.fillStyle = 'rgba(18,34,70,.75)'; ctx.strokeStyle = 'rgba(120,160,230,.25)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(X, Y, bw, 170, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9fb0cf'; ctx.font = '20px "Segoe UI", system-ui, sans-serif'; ctx.fillText(wrapText(ctx, x.l, bw - 48), X + 24, Y + 32);
      ctx.fillStyle = x.c === 'up' ? '#5dcaa5' : x.c === 'down' ? '#f09595' : x.c === 'mid' ? '#f2c46a' : '#eaf0fa';
      ctx.font = '600 40px "Segoe UI", system-ui, sans-serif'; ctx.fillText(wrapText(ctx, String(x.v), bw - 48), X + 24, Y + 80);
    });
    ctx.fillStyle = '#7f93b8'; ctx.font = '20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(wrapText(ctx, info.note, W - 200), 88, H - 120);
    ctx.fillText('Hazırlanma: ' + new Date().toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' }), 88, H - 88);
    return cv.toDataURL('image/png');
  }
  async function pdfAll(list, info, onProgress) {
    const d = pdfDoc(); d.addImage(await coverImage(info), 'PNG', 0, 0, W, H);
    for (let i = 0; i < list.length; i++) { onProgress && onProgress(i + 1, list.length); d.addPage([W, H], 'landscape'); d.addImage(await slideImage(list[i]), 'PNG', 0, 0, W, H); await new Promise(r => setTimeout(r, 0)); }
    d.save(slug(info.title) + '-rapor.pdf');
  }

  // ---------- menu ----------
  let menu = null;
  function closeMenu() { if (menu) { menu.remove(); menu = null; } }
  document.addEventListener('click', e => { if (menu && !menu.contains(e.target) && !e.target.closest('[data-dl]')) closeMenu(); });
  function openMenu(btn, getChart) {
    closeMenu();
    menu = document.createElement('div'); menu.className = 'dlmenu';
    menu.innerHTML = `
      <button data-f="png"><i class="ti ti-photo"></i><div>PNG olarak indir<small>Görsel · e-posta, WhatsApp</small></div></button>
      <button data-f="pdf"><i class="ti ti-file-type-pdf"></i><div>PDF olarak indir<small>Yazdırma ve paylaşım</small></div></button>
      <hr>
      <button data-f="pptx"><i class="ti ti-presentation"></i><div>PPTX · düzenlenebilir + animasyonlu<small>PowerPoint'te değiştirilebilir grafik</small></div></button>
      <button data-f="video"><i class="ti ti-movie"></i><div>PPTX · video olarak<small>Dashboard'daki hareketin aynısı</small></div></button>
      <div class="dl-msg"></div>`;
    document.body.appendChild(menu);
    const r = btn.getBoundingClientRect();
    menu.style.top = Math.min(r.bottom + 6, innerHeight - menu.offsetHeight - 10) + 'px';
    menu.style.left = Math.max(10, r.right - menu.offsetWidth) + 'px';
    menu.querySelectorAll('button[data-f]:not([disabled])').forEach(b => b.onclick = async () => {
      const m = menu.querySelector('.dl-msg'); m.textContent = 'Hazırlanıyor…';
      try { const c = getChart(); if (b.dataset.f === 'png') await png(c); else if (b.dataset.f === 'pptx') await G.PptExport.save([c]); else if (b.dataset.f === 'video') { m.textContent = 'Video kaydediliyor…'; await G.PptExport.saveVideo([c], null, () => {}); } else await pdf(c); m.textContent = 'İndirildi ✓'; setTimeout(closeMenu, 700); }
      catch (e) { console.error(e); m.textContent = 'Bir sorun oluştu, tekrar dene.'; }
    });
  }
  // ---------- video recording (MP4) ----------
  function videoMime() {
    const list = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
    return (typeof MediaRecorder !== 'undefined' && list.find(t => MediaRecorder.isTypeSupported(t))) || null;
  }
  async function recordVideo(c) {
    const mime = videoMime(); if (!mime) throw new Error('Bu tarayıcı video kaydedemiyor');
    const cw = W - 160, chh = H - 270;
    const el = document.createElement('div'); el.style.cssText = `position:fixed;left:-99999px;top:0;width:${cw}px;height:${chh}px`;
    document.body.appendChild(el);
    const ch = echarts.init(el, null, { renderer: 'canvas', width: cw, height: chh, devicePixelRatio: 1.5 });
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    // static layer (background, texts) drawn once
    const st = document.createElement('canvas'); st.width = W; st.height = H; const sx = st.getContext('2d'); bg(sx);
    sx.textBaseline = 'top'; sx.fillStyle = '#eaf0fa'; sx.font = '600 38px "Segoe UI", system-ui, sans-serif'; sx.fillText(wrapText(sx, c.title, W - 200), 88, 62);
    sx.fillStyle = '#9fb0cf'; sx.font = '22px "Segoe UI", system-ui, sans-serif'; sx.fillText(wrapText(sx, c.sub || '', W - 200), 88, 110);
    sx.fillStyle = 'rgba(120,160,230,.18)'; sx.fillRect(80, H - 82, W - 160, 1);
    sx.fillStyle = '#7f93b8'; sx.font = '18px "Segoe UI", system-ui, sans-serif'; sx.fillText(wrapText(sx, c.note || '', W - 360), 80, H - 64);
    sx.textAlign = 'right'; sx.fillStyle = '#c9a24a'; sx.fillText('Excel Dashboard', W - 80, H - 64);
    const FXN = c.fx && G.FX && G.FX.BY[c.fx] && G.FX.BY[c.fx].fn ? c.fx : null, fxSt = {}; let fxBuf = null, fxT0 = 0; const fxDur = FXN ? G.FX.durOf(FXN, c.fxSpeed) : 0;
    const draw = () => { ctx.drawImage(st, 0, 0); const src = el.querySelector('canvas'); if (!src) return;
      if (FXN && fxT0) { if (!fxBuf) { fxBuf = document.createElement('canvas'); fxBuf.width = src.width; fxBuf.height = src.height; } G.FX.render(fxBuf, src, FXN, (performance.now() - fxT0) / fxDur, fxSt); ctx.drawImage(fxBuf, 80, 168, cw, chh); }
      else if (!FXN) ctx.drawImage(src, 80, 168, cw, chh); };
    draw();
    const stream = cv.captureStream(30); const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 });
    const parts = []; rec.ondataavailable = e => e.data.size && parts.push(e.data);
    const done = new Promise(r => rec.onstop = r);
    rec.start(200);
    const o = c.option, dur = FXN ? fxDur + 300 : (o.animation === false ? 0 : (o.animationDuration || 900)) + 600 + (typeof o.animationDelay === 'function' ? o.animationDelay(12) : 0);
    await new Promise(r => setTimeout(r, 400)); // short intro on empty background
    ch.setOption(Object.assign({}, o, FXN ? { animation: false } : o.animation === false ? { animation: true, animationDuration: 900 } : {})); if (FXN) fxT0 = performance.now() + 150;
    const t0 = performance.now();
    await new Promise(res => { const tick = () => { draw(); if (performance.now() - t0 < dur + 1800) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
    draw(); const poster = cv.toDataURL('image/png');
    rec.stop(); await done; ch.dispose(); el.remove();
    const blob = new Blob(parts, { type: mime.split(';')[0] });
    return { blob, mime: mime.split(';')[0], ext: mime.includes('mp4') ? 'mp4' : 'webm', poster, seconds: (dur + 2200) / 1000 };
  }
  G.Export = { openMenu, pdfAll, png, pdf, closeMenu, recordVideo, videoMime };
})(typeof window !== 'undefined' ? window : globalThis);
