// Excel Dashboard - server (no external packages)
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.DASHBOARD_PASSWORD || '';
const ROOT = path.join(__dirname, 'public');
const LOGIN = fs.readFileSync(path.join(__dirname, 'login.html'), 'utf8');
const SECRET = crypto.createHash('sha256').update('excel-dashboard:' + PASSWORD).digest();
const STARTED = new Date().toISOString();
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function sign(v) { return crypto.createHmac('sha256', SECRET).update(v).digest('hex'); }
function makeToken() { const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE); return exp + '.' + sign(exp); }
function validToken(t) {
  if (!t || !t.includes('.')) return false;
  const [exp, sig] = t.split('.');
  const good = sign(exp);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  return Number(exp) > Date.now() / 1000;
}
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
  return out;
}
function samePassword(a) {
  const x = crypto.createHash('sha256').update(a).digest(), y = crypto.createHash('sha256').update(PASSWORD).digest();
  return PASSWORD.length > 0 && crypto.timingSafeEqual(x, y);
}
function loginPage(res, msg, code) {
  res.writeHead(code || 200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' });
  res.end(LOGIN.replace('__ERROR__', msg || ''));
}

// ---------- Data store (JSON files in /app/data, kept in a Docker volume) ----------
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });
function load(name) { try { return JSON.parse(fs.readFileSync(path.join(DATA, name + '.json'), 'utf8')); } catch (_) { return []; } }
function save(name, v) { const f = path.join(DATA, name + '.json'); fs.writeFileSync(f + '.tmp', JSON.stringify(v)); fs.renameSync(f + '.tmp', f); }
function json(res, code, v) { res.writeHead(code, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' }); res.end(JSON.stringify(v)); }
function readBody(req, max, cb) {
  let b = '', over = false;
  req.on('data', c => { b += c; if (b.length > max) { over = true; req.destroy(); } });
  req.on('end', () => { if (over) return cb(new Error('too large')); try { cb(null, b ? JSON.parse(b) : {}); } catch (e) { cb(e); } });
}
const RSS = {
  tr_son: ['https://www.trthaber.com/manset_articles.rss', 'https://www.aa.com.tr/tr/rss/default?cat=guncel'],
  dunya_son: ['https://feeds.bbci.co.uk/turkce/rss.xml', 'https://www.trthaber.com/dunya_articles.rss'],
  spor: ['https://www.trthaber.com/spor_articles.rss', 'https://www.aa.com.tr/tr/rss/default?cat=spor'],
  ekonomi: ['https://www.trthaber.com/ekonomi_articles.rss', 'https://www.aa.com.tr/tr/rss/default?cat=ekonomi'],
  gundem: ['https://www.trthaber.com/gundem_articles.rss', 'https://www.aa.com.tr/tr/rss/default?cat=politika'],
  ortadogu: ['https://www.aljazeera.com/xml/rss/all.xml', 'https://www.aa.com.tr/tr/rss/default?cat=dunya']
};
const RSS_CACHE = {};
const ent = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim();
async function fetchRss(urls) {
  const all = [];
  await Promise.all(urls.map(async u => {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 ExcelDashboard' }, signal: AbortSignal.timeout(9000) }); if (!r.ok) return;
      const x = await r.text(); const src = new URL(u).hostname.replace(/^www\./, '').split('.')[0].toUpperCase();
      for (const it of x.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/g) || []) {
        const g = t => { const m = it.match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>')); return m ? ent(m[1]) : ''; };
        let link = g('link'); if (!link) { const m = it.match(/<link[^>]*href="([^"]+)"/); link = m ? m[1] : ''; }
        const d = new Date(g('pubDate') || g('updated') || g('dc:date') || Date.now());
        const title = g('title'); if (title) all.push({ title, link, src, t: isNaN(d) ? Date.now() : d.getTime() });
      }
    } catch (_) {}
  }));
  if (!all.length) throw new Error('boş');
  return all.sort((a, b) => b.t - a.t).filter((x, i, a) => a.findIndex(y => y.title === x.title) === i).slice(0, 30);
}
function api(req, res, url) {
  // Version & self-update
  if (url === '/api/version') {
    let v = 'yerel'; try { v = fs.readFileSync(path.join(__dirname, 'VERSION'), 'utf8').trim().slice(0, 7); } catch (_) {}
    return json(res, 200, { version: v, started: STARTED });
  }
  if (url === '/api/update' && req.method === 'POST') {
    json(res, 200, { ok: true });
    console.log('Güncelleme istendi, yeniden başlatılıyor');
    return setTimeout(() => process.exit(0), 400); // Docker (restart: unless-stopped) yeniden başlatır, start.sh yeni kodu çeker
  }
  // Templates
  if (url === '/api/templates' && req.method === 'GET') return json(res, 200, load('templates'));
  if (url === '/api/templates' && req.method === 'POST') {
    return readBody(req, 2e6, (err, t) => {
      if (err || !t || !t.name || !Array.isArray(t.columns)) return json(res, 400, { error: 'Geçersiz şablon' });
      const list = load('templates');
      const item = {
        id: crypto.randomBytes(6).toString('hex'),
        name: String(t.name).slice(0, 80),
        file: String(t.file || '').slice(0, 200),
        sheet: String(t.sheet || '').slice(0, 100),
        headerRow: Number(t.headerRow) || 1,
        columns: t.columns.slice(0, 300).map(c => ({ name: String(c.name).slice(0, 120), type: String(c.type).slice(0, 20), role: String(c.role).slice(0, 20) })),
        createdAt: new Date().toISOString()
      };
      list.unshift(item); save('templates', list); json(res, 201, item);
    });
  }
  // Chart styles: { "<templateId>:<chartId>": {...}, "<templateId>:*": {...} }
  if (url === '/api/styles' && req.method === 'GET') { const s = load('styles'); return json(res, 200, Array.isArray(s) ? {} : s); }
  if (url === '/api/styles' && req.method === 'PUT') {
    return readBody(req, 2e5, (err, b) => {
      if (err || !b || typeof b.key !== 'string' || b.key.length > 120) return json(res, 400, { error: 'Geçersiz' });
      let s = load('styles'); if (Array.isArray(s)) s = {};
      if (b.style === null) delete s[b.key]; else s[b.key] = b.style;
      if (b.clearPrefix) Object.keys(s).forEach(k => { if (k.startsWith(b.clearPrefix) && k !== b.key) delete s[k]; });
      save('styles', s); json(res, 200, { ok: true });
    });
  }
  // Nielsen yükleme arşivi
  if (url === '/api/nielsen' && req.method === 'GET') return json(res, 200, load('nielsen'));
  if (url === '/api/nielsen' && req.method === 'POST') {
    return readBody(req, 5e3, (err, b) => {
      if (err || !b || typeof b.name !== 'string') return json(res, 400, { error: 'Geçersiz' });
      const list = load('nielsen').filter(x => x.name !== b.name); list.unshift({ name: b.name.slice(0, 120), period: String(b.period || '').slice(0, 80), at: new Date().toISOString() });
      save('nielsen', list.slice(0, 24)); json(res, 200, { ok: true });
    });
  }
  // Tema
  if (url === '/api/theme' && req.method === 'GET') { const t = load('theme'); return json(res, 200, Array.isArray(t) ? {} : t); }
  if (url === '/api/theme' && req.method === 'PUT') {
    return readBody(req, 3e6, (err, b) => { if (err || !b || typeof b !== 'object') return json(res, 400, { error: 'Geçersiz' }); save('theme', b); json(res, 200, { ok: true }); });
  }
  // Radyo akışı vekili (https sayfada http yayınları çalabilmek için)
  if (url.startsWith('/api/stream')) {
    const u = new URL(req.url, 'http://x').searchParams.get('u') || '';
    if (!/^https?:\/\//i.test(u) || /^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[)/i.test(u)) return json(res, 400, { error: 'Geçersiz adres' });
    const ac = new AbortController(); req.on('close', () => ac.abort());
    return fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 ExcelDashboard', 'Icy-MetaData': '0' }, signal: ac.signal, redirect: 'follow' }).then(async r => {
      const ct = r.headers.get('content-type') || 'audio/mpeg';
      if (!r.ok || !r.body || /text\/html/i.test(ct)) { res.writeHead(502); return res.end(); }
      res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-store' });
      const { Readable } = require('stream'); Readable.fromWeb(r.body).on('error', () => res.end()).pipe(res);
    }).catch(() => { if (!res.headersSent) { res.writeHead(502); } res.end(); });
  }
  // Tema fotoğrafları (Wikimedia Commons, sunucuda önbelleklenir)
  if (url.startsWith('/api/photo')) {
    const sp = new URL(req.url, 'http://x').searchParams, id = (sp.get('id') || '').replace(/[^a-z0-9-]/g, '').slice(0, 40), q = (sp.get('q') || '').slice(0, 120), n = Math.max(0, Math.min(9, +sp.get('n') || 0)), small = sp.get('w') === 's';
    if (!id || !q) return json(res, 400, { error: 'Eksik' });
    const dir = path.join(DATA, 'photos'); fs.mkdirSync(dir, { recursive: true }); const file = path.join(dir, id + '-' + n + (small ? '-s' : '') + '.jpg');
    const send = () => { res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=604800' }); fs.createReadStream(file).pipe(res); };
    if (fs.existsSync(file)) return send();
    const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=' + (small ? 640 : 2400) + '&gsrsearch=' + encodeURIComponent('filetype:bitmap ' + q);
    const UA = { 'User-Agent': 'ExcelDashboard/1.0 (personal dashboard theme)' };
    return fetch(api, { headers: UA, signal: AbortSignal.timeout(12000) }).then(r => r.json()).then(async d => {
      const pages = Object.values((d.query || {}).pages || {}).sort((a, b) => a.index - b.index)
        .map(p => (p.imageinfo || [])[0]).filter(i => i && /jpe?g/i.test(i.mime) && i.width >= 1600 && i.width > i.height * 1.2);
      const pick = pages[n % Math.max(1, pages.length)]; if (!pick) throw new Error('foto yok');
      const img = await fetch(pick.thumburl || pick.url, { headers: UA, signal: AbortSignal.timeout(20000) }); if (!img.ok) throw new Error('indirilemedi');
      fs.writeFileSync(file, Buffer.from(await img.arrayBuffer())); send();
    }).catch(e => { console.error('photo', id, e.message); json(res, 502, { error: 'Fotoğraf alınamadı' }); });
  }
  // RSS vekil (yalnızca izinli kaynaklar)
  if (url.startsWith('/api/rss')) {
    const q = new URL(req.url, 'http://x').searchParams.get('k');
    const src = RSS[q]; if (!src) return json(res, 404, { error: 'Kaynak yok' });
    const hit = RSS_CACHE[q]; if (hit && Date.now() - hit.t < 5 * 60e3) return json(res, 200, hit.items);
    return fetchRss(src).then(items => { RSS_CACHE[q] = { t: Date.now(), items }; json(res, 200, items); })
      .catch(e => { console.error('rss', q, e.message); json(res, hit ? 200 : 502, hit ? hit.items : { error: 'Kaynağa ulaşılamadı' }); });
  }
  const m = url.match(/^\/api\/templates\/([a-f0-9]+)$/);
  if (m && req.method === 'DELETE') {
    const list = load('templates').filter(t => t.id !== m[1]); save('templates', list); return json(res, 200, { ok: true });
  }
  json(res, 404, { error: 'Bulunamadı' });
}

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }

  if (url === '/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 10000) req.destroy(); });
    req.on('end', () => {
      const pw = new URLSearchParams(body).get('password') || '';
      if (samePassword(pw)) {
        res.writeHead(302, { 'Set-Cookie': `ed_session=${makeToken()}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Lax`, Location: '/' });
        return res.end();
      }
      setTimeout(() => loginPage(res, PASSWORD ? 'Şifre hatalı, tekrar dene.' : 'Sunucuda şifre tanımlı değil.', 401), 1200);
    });
    return;
  }
  if (url === '/logout') {
    res.writeHead(302, { 'Set-Cookie': 'ed_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax', Location: '/login' });
    return res.end();
  }
  if (!validToken(cookies(req).ed_session)) {
    if (url === '/login') return loginPage(res);
    res.writeHead(302, { Location: '/login' }); return res.end();
  }
  if (url === '/login') { res.writeHead(302, { Location: '/' }); return res.end(); }
  if (url.startsWith('/api/')) return api(req, res, url);

  let file = path.normalize(path.join(ROOT, url));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (e, data) => {
      if (e) {
        return fs.readFile(path.join(ROOT, 'index.html'), (e2, d2) => {
          res.writeHead(e2 ? 404 : 200, { 'Content-Type': TYPES['.html'] }); res.end(e2 ? 'Not found' : d2);
        });
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
}).listen(PORT, () => console.log('Excel Dashboard listening on ' + PORT + (PASSWORD ? '' : ' (WARNING: no DASHBOARD_PASSWORD set)')));
