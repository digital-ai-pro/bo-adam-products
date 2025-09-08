// Minimal client to use the local Node API from the static pages
const API_BASE = window.API_BASE || (location.origin);
let ADMIN_TOKEN = null;

function headers(extra){ const h = { 'Content-Type':'application/json' }; if(ADMIN_TOKEN) h['x-admin-token'] = ADMIN_TOKEN; return Object.assign(h, extra||{}); }

async function apiGet(path){ return fetch(API_BASE + path, { headers: headers() }).then(r=>r.json()); }
async function apiPost(path, body){ return fetch(API_BASE + path, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(r=>r.json()); }
async function apiPut(path, body){ return fetch(API_BASE + path, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then(r=>r.json()); }
async function apiDelete(path){ return fetch(API_BASE + path, { method: 'DELETE', headers: headers() }).then(r=>r.json()); }

async function login(username, password){
	const res = await apiPost('/api/login', { username, password });
	if(res && res.token){ ADMIN_TOKEN = res.token; try{ localStorage.setItem('lp_admin_token', ADMIN_TOKEN); }catch(e){} }
	return res;
}
async function logout(){ ADMIN_TOKEN = null; try{ localStorage.removeItem('lp_admin_token'); }catch(e){}; return apiPost('/api/logout',{}).catch(()=>({})); }
async function verify(){ const stored = localStorage.getItem('lp_admin_token'); if(stored) ADMIN_TOKEN = stored; try{ const res = await apiGet('/api/verify'); return res; }catch(e){ return { ok:false }; } }

// auto load token
try{ const t = localStorage.getItem('lp_admin_token'); if(t) ADMIN_TOKEN = t; }catch(e){}

// Example helpers
async function fetchProducts(){ return apiGet('/api/products'); }
async function fetchReviews(){ return apiGet('/api/reviews'); }
async function postReview(r){ return apiPost('/api/reviews', r); }

window.apiClient = { fetchProducts, fetchReviews, postReview, apiGet, apiPost, apiPut, apiDelete, login, logout, verify, setToken: t=>{ ADMIN_TOKEN=t; } };
