const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const DB_PATH = path.join(__dirname, 'db.json');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(cors());

// Simple in-memory sessions (for demo). For production use real sessions or JWTs.
const SESSIONS = new Map(); // token -> { user, exp }
const ADMIN_USER = { username: 'aboadam', password: '1992' };
function genToken(){ return Math.random().toString(36).slice(2,12); }
function authMiddleware(req,res,next){
  const token = req.headers['x-admin-token'] || req.query._token;
  if(!token) return res.status(401).json({ error: 'no token' });
  const s = SESSIONS.get(token);
  if(!s || s.exp < Date.now()) return res.status(401).json({ error: 'invalid or expired' });
  req.admin = s.user; next();
}

// login
app.post('/api/login', (req,res)=>{
  const { username, password } = req.body || {};
  if(username === ADMIN_USER.username && String(password) === ADMIN_USER.password){
    const token = genToken();
    SESSIONS.set(token, { user: { username }, exp: Date.now() + 1000*60*60*24 }); // 24h
    return res.json({ ok: true, token });
  }
  return res.status(401).json({ error: 'invalid credentials' });
});
app.post('/api/logout', (req,res)=>{ const token = req.headers['x-admin-token']; if(token) SESSIONS.delete(token); res.json({ ok:true }); });
app.get('/api/verify', (req,res)=>{ const token = req.headers['x-admin-token']; const s = SESSIONS.get(token); if(s && s.exp > Date.now()) return res.json({ ok:true, user: s.user }); return res.status(401).json({ ok:false }); });

function readDB(){
  try{ const raw = fs.readFileSync(DB_PATH, 'utf8'); return JSON.parse(raw); }catch(e){ return { settings: { title: 'طراز الجاحد', currency: 'د.إ' }, products: [], reviews: [] }; }
}
function writeDB(obj){
  fs.writeFileSync(DB_PATH, JSON.stringify(obj, null, 2), 'utf8');
}

app.get('/api/ping', (req,res)=> res.json({ ok: true, now: Date.now() }));

app.get('/api/data', (req,res)=>{
  const db = readDB(); res.json(db);
});

// PRODUCTS
app.get('/api/products', (req,res)=>{
  const db = readDB(); res.json(db.products || []);
});
app.post('/api/products', (req,res)=>{
  // protect
  // allow creation only if admin
  const token = req.headers['x-admin-token'];
  const s = SESSIONS.get(token);
  if(!s) return res.status(401).json({ error: 'unauthorized' });
  const db = readDB(); const p = req.body;
  if(!p.id) p.id = Math.random().toString(36).slice(2,9);
  db.products = db.products || [];
  db.products.push(p);
  writeDB(db);
  res.json(p);
});
app.put('/api/products/:id', authMiddleware, (req,res)=>{
  const id = req.params.id; const db = readDB();
  const idx = (db.products || []).findIndex(x=>x.id===id);
  if(idx===-1) return res.status(404).json({error:'not found'});
  db.products[idx] = Object.assign({}, db.products[idx], req.body);
  writeDB(db);
  res.json(db.products[idx]);
});
app.delete('/api/products/:id', authMiddleware, (req,res)=>{
  const id = req.params.id; const db = readDB();
  db.products = (db.products||[]).filter(x=>x.id!==id);
  writeDB(db);
  res.json({ ok: true });
});

// REVIEWS
app.get('/api/reviews', (req,res)=>{
  const db = readDB(); res.json(db.reviews || []);
});
app.post('/api/reviews', (req,res)=>{
  const db = readDB(); const r = req.body;
  r.at = r.at || Date.now();
  db.reviews = db.reviews || [];
  db.reviews.push(r);
  writeDB(db);
  res.json(r);
});
app.delete('/api/reviews/:at', authMiddleware, (req,res)=>{
  const at = parseInt(req.params.at,10);
  const db = readDB(); db.reviews = (db.reviews||[]).filter(x=>x.at!==at); writeDB(db); res.json({ok:true});
});

// SETTINGS
app.get('/api/settings', (req,res)=>{ const db = readDB(); res.json(db.settings || {}); });
app.put('/api/settings', (req,res)=>{ const db = readDB(); db.settings = Object.assign({}, db.settings||{}, req.body); writeDB(db); res.json(db.settings); });

// save full DB (admin-only)
app.post('/api/save-fallback', authMiddleware, (req,res)=>{
  const body = req.body || {};
  writeDB(body);
  res.json({ ok: true });
});

// simple static for production (optional)
app.use(express.static(path.join(__dirname)));

app.listen(PORT, ()=> console.log('Server listening on', PORT));
