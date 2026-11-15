// Şablon Excel giriş sekmesi
(function () {
  const TYPES = ['Metin', 'Sayı', 'Para', 'Yüzde', 'Tarih'];
  const ROLES = ['Kırılım', 'Ölçü', 'Zaman', 'Hedef', 'Kullanma'];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const low = s => String(s).toLocaleLowerCase('tr-TR');

  // Guess type from header name, then from sample values if any
  function guessType(name, samples) {
    const n = low(name);
    if (/(tarih|date|ay$|^ay\b|ay |dönem|donem|hafta|yıl|yil|month|week|year|period)/.test(n)) return 'Tarih';
    if (/(%|oran|pay|yüzde|yuzde|share|rate|büyüme|buyume|growth)/.test(n)) return 'Yüzde';
    if (/(ciro|tutar|₺|tl\b|fiyat|hedef|bütçe|butce|maliyet|gelir|gider|iskonto|kâr|kar\b|revenue|sales value|price|cost|budget|amount)/.test(n)) return 'Para';
    if (/(tonaj|kg|adet|miktar|koli|ton\b|hacim|stok|sayı|sayi|units?|qty|volume|count)/.test(n)) return 'Sayı';
    const vals = samples.filter(v => v !== null && v !== undefined && v !== '');
    if (vals.length) {
      if (vals.every(v => v instanceof Date)) return 'Tarih';
      if (vals.every(v => typeof v === 'number')) return 'Sayı';
    }
    return 'Metin';
  }
  function guessRole(name, type) {
    const n = low(name);
    if (/(hedef|target|bütçe|butce|budget|plan)/.test(n)) return 'Hedef';
    if (type === 'Tarih') return 'Zaman';
    if (type === 'Metin') return 'Kırılım';
    return 'Ölçü';
  }

  let state = { wb: null, file: '', sheet: '', headerRow: 1, columns: [] };

  function readColumns() {
    const ws = state.wb.Sheets[state.sheet];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false, defval: null, cellDates: true });
    // Auto-detect header row: first row with at least 2 non-empty text cells
    if (!state.headerRowManual) {
      const idx = rows.findIndex(r => r.filter(v => typeof v === 'string' && v.trim()).length >= 2);
      state.headerRow = idx >= 0 ? idx + 1 : 1;
    }
    const head = rows[state.headerRow - 1] || [];
    const body = rows.slice(state.headerRow, state.headerRow + 50);
    state.columns = head.map((h, i) => {
      const name = String(h ?? '').trim();
      if (!name) return null;
      const type = guessType(name, body.map(r => r[i]));
      return { name, type, role: guessRole(name, type) };
    }).filter(Boolean);
    state.sampleRows = body.length;
  }

  function opts(list, sel) { return list.map(x => `<option${x === sel ? ' selected' : ''}>${x}</option>`).join(''); }

  function renderEditor(root) {
    const ed = root.querySelector('#tpl-editor');
    if (!state.wb) {
      ed.innerHTML = `<label class="drop" id="tpl-drop">
        <input type="file" id="tpl-file" accept=".xlsx,.xls,.xlsm,.csv" hidden>
        <div class="drop-ic"><i class="ti ti-file-upload"></i></div>
        <b>Şablon Excel'i buraya bırak</b><span>ya da tıklayıp seç · .xlsx, .xls, .csv</span></label>`;
      const inp = ed.querySelector('#tpl-file'), drop = ed.querySelector('#tpl-drop');
      inp.onchange = () => inp.files[0] && readFile(inp.files[0], root);
      drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
      drop.ondragleave = () => drop.classList.remove('over');
      drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); e.dataTransfer.files[0] && readFile(e.dataTransfer.files[0], root); };
      return;
    }
    const sheets = state.wb.SheetNames;
    ed.innerHTML = `
      <div class="row-top">
        <div class="filechip"><i class="ti ti-file-spreadsheet"></i>${esc(state.file)}</div>
        <button class="btn ghost" id="tpl-reset"><i class="ti ti-x"></i> Vazgeç</button>
      </div>
      <div class="grid3">
        <label class="fld"><span>Şablon adı</span><input id="tpl-name" value="${esc(state.name)}" placeholder="Aylık müşteri satış"></label>
        <label class="fld"><span>Sayfa</span><select id="tpl-sheet">${opts(sheets, state.sheet)}</select></label>
        <label class="fld"><span>Başlık satırı</span><input id="tpl-hrow" type="number" min="1" max="50" value="${state.headerRow}"></label>
      </div>
      <div class="hint"><i class="ti ti-sparkles"></i> ${state.columns.length} sütun bulundu. Türleri ve rolleri tahmin ettim, gerekirse düzelt.</div>
      <div class="coltable">
        <div class="ch"><span>Sütun</span><span>Veri türü</span><span>Rolü</span></div>
        ${state.columns.map((c, i) => `<div class="cr">
          <span class="cn" title="${esc(c.name)}">${esc(c.name)}</span>
          <select data-i="${i}" data-k="type">${opts(TYPES, c.type)}</select>
          <select data-i="${i}" data-k="role">${opts(ROLES, c.role)}</select></div>`).join('') || '<div class="empty-small">Bu satırda başlık bulunamadı. Başlık satırı numarasını değiştir.</div>'}
      </div>
      <div class="legend"><b>Kırılım:</b> neye göre gruplanacak (müşteri, kanal) · <b>Ölçü:</b> neyin toplanacağı (tonaj, ciro) · <b>Zaman:</b> ay/tarih · <b>Hedef:</b> gerçekleşenle karşılaştırılacak değer</div>
      <div class="actions"><span class="msg" id="tpl-msg"></span><button class="btn gold" id="tpl-save"><i class="ti ti-device-floppy"></i> Şablonu kaydet</button></div>`;
    ed.querySelector('#tpl-reset').onclick = () => { state = { wb: null }; renderEditor(root); };
    ed.querySelector('#tpl-name').oninput = e => state.name = e.target.value;
    ed.querySelector('#tpl-sheet').onchange = e => { state.sheet = e.target.value; state.headerRowManual = false; readColumns(); renderEditor(root); };
    ed.querySelector('#tpl-hrow').onchange = e => { state.headerRow = Math.max(1, +e.target.value || 1); state.headerRowManual = true; readColumns(); renderEditor(root); };
    ed.querySelectorAll('.coltable select').forEach(s => s.onchange = () => { state.columns[+s.dataset.i][s.dataset.k] = s.value; });
    ed.querySelector('#tpl-save').onclick = async () => {
      const msg = ed.querySelector('#tpl-msg');
      if (!String(state.name || '').trim()) { msg.className = 'msg err'; msg.textContent = 'Şablona bir ad ver.'; return; }
      if (!state.columns.length) { msg.className = 'msg err'; msg.textContent = 'Kaydedilecek sütun yok.'; return; }
      const r = await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: state.name.trim(), file: state.file, sheet: state.sheet, headerRow: state.headerRow, columns: state.columns }) });
      if (!r.ok) { msg.className = 'msg err'; msg.textContent = 'Kaydedilemedi, tekrar dene.'; return; }
      state = { wb: null }; renderEditor(root); loadList(root, 'Şablon kaydedildi');
    };
  }

  function readFile(file, root) {
    const fr = new FileReader();
    fr.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
        state = { wb, file: file.name, sheet: wb.SheetNames[0], headerRow: 1, name: file.name.replace(/\.(xlsx|xls|xlsm|csv)$/i, ''), columns: [] };
        readColumns(); renderEditor(root);
      } catch (err) { alertBox(root, 'Dosya okunamadı. Geçerli bir Excel dosyası olduğundan emin ol.'); }
    };
    fr.readAsArrayBuffer(file);
  }
  function alertBox(root, t) { const m = root.querySelector('#tpl-list-msg'); m.className = 'msg err'; m.textContent = t; }

  async function loadList(root, note) {
    const box = root.querySelector('#tpl-list');
    let list = [];
    try { list = await (await fetch('/api/templates')).json(); } catch (_) {}
    const m = root.querySelector('#tpl-list-msg'); m.className = 'msg ok'; m.textContent = note || '';
    root.querySelector('#tpl-count').textContent = list.length;
    box.innerHTML = list.length ? list.map(t => `<div class="tplcard">
        <div class="tc-top"><b>${esc(t.name)}</b><button class="icon-btn" data-del="${t.id}" title="Sil"><i class="ti ti-trash"></i></button></div>
        <div class="tc-meta">${t.columns.length} sütun · ${esc(t.sheet)} · ${new Date(t.createdAt).toLocaleDateString('tr-TR')}</div>
        <div class="chips">${t.columns.slice(0, 8).map(c => `<span class="chip r-${c.role === 'Kırılım' ? 'k' : c.role === 'Ölçü' ? 'o' : c.role === 'Zaman' ? 'z' : c.role === 'Hedef' ? 'h' : 'x'}">${esc(c.name)}</span>`).join('')}${t.columns.length > 8 ? `<span class="chip">+${t.columns.length - 8}</span>` : ''}</div>
      </div>`).join('') : `<div class="empty-small"><i class="ti ti-books"></i><br>Henüz kayıtlı şablon yok.<br>İlk şablonunu soldan yükle.</div>`;
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.innerHTML = '<i class="ti ti-check"></i>'; b.title = 'Silmek için tekrar tıkla'; b.classList.add('warn'); return; }
      await fetch('/api/templates/' + b.dataset.del, { method: 'DELETE' }); loadList(root, 'Şablon silindi');
    });
  }

  window.renderSablon = function (root) {
    root.innerHTML = `<div class="split">
      <section class="panel"><div class="ph"><i class="ti ti-file-spreadsheet"></i> Yeni şablon</div><div id="tpl-editor"></div></section>
      <section class="panel"><div class="ph"><i class="ti ti-books"></i> Kayıtlı şablonlar <span class="badge-n" id="tpl-count">0</span></div><span class="msg" id="tpl-list-msg"></span><div id="tpl-list" class="tpllist"></div></section>
    </div>`;
    if (typeof XLSX === 'undefined') { root.querySelector('#tpl-editor').innerHTML = '<div class="empty-small">Excel okuyucu yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.</div>'; }
    else renderEditor(root);
    loadList(root);
  };
})();
