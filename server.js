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
