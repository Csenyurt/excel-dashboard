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
