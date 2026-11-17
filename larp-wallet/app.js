(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let S = { bal: {}, connected: false, cur: 'USD', live: true, banner: true, ...(() => { try { return JSON.parse(localStorage.getItem('wl')) || {}; } catch { return {}; } })() };
const save = () => { try { localStorage.setItem('wl', JSON.stringify(S)); } catch {} };

/* ---------- données ---------- */
const A = [
  { id: 'BTC', n: 'Bitcoin', g: 'c', p: 95000, ch: 1.4, cg: 'bitcoin', ic: '#F7931A' },
  { id: 'ETH', n: 'Ethereum', g: 'c', p: 3300, ch: 0.9, cg: 'ethereum', ic: '#454A75' },
  { id: 'BNB', n: 'BNB Smart Chain', g: 'c', p: 680, ch: -0.4, cg: 'binancecoin', ic: '#F5C000' },
  { id: 'XRP', n: 'XRP', g: 'c', p: 2.3, ch: 2.1, cg: 'ripple', ic: '#2f2f31' },
  { id: 'USDT', n: 'Tether USD', g: 's', p: 1, ch: 0, cg: 'tether', ic: '#00a478' },
  { id: 'USDC', n: 'USD Coin', g: 's', p: 1, ch: 0, cg: 'usd-coin', ic: '#2775CA' },
  { id: 'NVDAB', n: 'NVIDIA (tokenisé)', g: 'a', p: 182, ch: 0.6, ic: '#76b900', l: 'N' },
  { id: 'CRCLB', n: 'Circle (tokenisé)', g: 'a', p: 138, ch: -1.1, ic: '#8a7bff', l: 'C' },
  { id: 'NVDAX', n: 'NVIDIA (tokenisé)', g: 'a', p: 181, ch: 0.5, ic: '#2dbd3a', l: 'N' },
  { id: 'MSTRX', n: 'Strategy (tokenisé)', g: 'a', p: 335, ch: 3.2, ic: '#e0283c', l: 'M' },
  { id: 'SPCXB', n: 'SpaceX (tokenisé)', g: 'a', p: 210, ch: 1.8, ic: '#111', l: 'S' },
  { id: 'STRCX', n: 'Strategy Pref. (tokenisé)', g: 'a', p: 98, ch: 0.2, ic: '#f4560c', l: 'B' },
  { id: 'CRCLX', n: 'Circle (tokenisé)', g: 'a', p: 138, ch: -1, ic: '#5aa8ff', l: 'C' },
  { id: 'GOOGX', n: 'Alphabet (tokenisé)', g: 'a', p: 305, ch: 0.7, ic: '#fff', l: 'G', dk: 1 },
];
const byId = Object.fromEntries(A.map(a => [a.id, a]));
let rate = 0.92;

/* ---------- format ---------- */
const money = v => {
  const x = v * (S.cur === 'EUR' ? rate : 1);
  const d = Math.abs(x) < 1 && x !== 0 ? 4 : 2;
  const s = x.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: d });
  return S.cur === 'EUR' ? s + ' €' : '$' + s;
};
const qty = v => v.toLocaleString('fr-FR', { maximumFractionDigits: 8 });
const pct = v => (v >= 0 ? '+' : '') + v.toFixed(2).replace('.', ',') + '%';
const bal = id => +S.bal[id] || 0;
const val = a => bal(a.id) * a.p;
const total = () => A.reduce((s, a) => s + val(a), 0);
const delta = () => A.reduce((s, a) => s + val(a) - val(a) / (1 + a.ch / 100), 0);

/* ---------- icônes ---------- */
const I = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  swap: '<path d="M17 3l4 4-4 4M3 11V9a2 2 0 0 1 2-2h16M7 21l-4-4 4-4M21 13v2a2 2 0 0 1-2 2H3"/>',
  earn: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 15l4-4 3 2 4-5"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  scan: '<path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3M10 9v5h4"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12h11l2-8H6.5"/>',
  chev: '<path d="M9 5l7 7-7 7"/>', back: '<path d="M15 5l-7 7 7 7"/>', x: '<path d="M5 5l14 14M19 5L5 19"/>',
  send: '<path d="M12 19V5M6 11l6-6 6 6"/>', recv: '<path d="M12 5v14M6 13l6 6 6-6"/>', plus: '<path d="M12 5v14M5 12h14"/>', down: '<path d="M6 9l6 6 6-6"/>',
};
const svg = (n, c = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${c}">${I[n]}</svg>`;
const glyph = {
  BTC: '<g transform="rotate(14 50 50)"><text x="50" y="66" font-size="52" font-weight="800" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif">B</text><rect x="43" y="22" width="4" height="9" fill="#fff"/><rect x="54" y="22" width="4" height="9" fill="#fff"/><rect x="43" y="69" width="4" height="9" fill="#fff"/><rect x="54" y="69" width="4" height="9" fill="#fff"/></g>',
  ETH: '<path d="M50 18l-17 29 17 10 17-10z" fill="#c9cce6"/><path d="M50 18v39l17-10z" fill="#fff"/><path d="M50 62l-17-10 17 30 17-30z" fill="#c9cce6"/><path d="M50 62v20l17-30z" fill="#fff"/>',
  BNB: '<g fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"><path d="M50 24l8 8-8 8-8-8z"/><path d="M30 44l8 8-8 8-8-8zM70 44l8 8-8 8-8-8z"/><path d="M50 62l8 8-8 8-8-8z"/><path d="M42 52l8-8 8 8-8 8z"/></g>',
  XRP: '<g fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M26 28l16 16c4 4 12 4 16 0l16-16"/><path d="M26 72l16-16c4-4 12-4 16 0l16 16"/></g>',
  USDT: '<path d="M30 30h40v9H55v7c10 .6 17 2.4 17 4.6S65 55 55 55.5V76h-10V55.5C35 55 28 53 28 50.6S35 46.6 45 46v-7H30z" fill="#fff"/><ellipse cx="50" cy="50.5" rx="23" ry="5.5" fill="none" stroke="#fff" stroke-width="3"/>',
  USDC: '<circle cx="50" cy="50" r="27" fill="none" stroke="#fff" stroke-width="6"/><text x="50" y="62" font-size="34" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif">$</text>',
};
const coin = (id, ex = '') => {
  const a = byId[id] || { ic: '#333', l: id[0] };
  const g = glyph[id] || `<text x="50" y="66" font-size="48" font-weight="800" text-anchor="middle" fill="${a.dk ? '#222' : '#fff'}" font-family="Arial,sans-serif">${a.l || id[0]}</text>`;
  return `<i class="ic ${ex}"><svg viewBox="0 0 100 100"><rect width="100" height="100" fill="${a.ic}"/>${g}</svg></i>`;
};

/* ---------- état UI ---------- */
let tab = 'home';
const view = $('#view');
const toast = t => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2200); };

/* ---------- accueil ---------- */
const rowH = a => {
  const v = val(a), b = bal(a.id);
  return `<button class="row" data-a="${a.id}">${coin(a.id)}<div class="rt"><b>${a.n}</b><span>${qty(b)} ${a.id}</span></div><div class="rv">${money(v)}${b ? `<small class="${a.ch >= 0 ? 'up' : 'dn'}">${pct(a.ch)}</small>` : ''}</div></button>`;
};
const gauge = `<svg width="56" height="40" viewBox="0 0 56 40"><defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="#ff6b6b"/><stop offset=".5" stop-color="#ffc14d"/><stop offset="1" stop-color="#4ade80"/></linearGradient></defs><path d="M6 36A22 22 0 0 1 50 36" fill="none" stroke="url(#gg)" stroke-width="5" stroke-linecap="round"/><circle cx="7.5" cy="30" r="4.5" fill="#fff" stroke="#000" stroke-width="2"/></svg>`;
const mkt = (id, l, c, color) => `<button class="mk" data-a="${byId[id] ? id : ''}">${coin(id).replace('class="ic ', 'class="ic ')}<span>${l}</span><em class="${c >= 0 ? 'up' : 'dn'}">${pct(c).replace('.', ',')}</em></button>`;
const circ = (bg, g) => `<i class="ic"><svg viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/>${g}</svg></i>`;

function home() {
  const t = total(), d = delta(), up = d >= 0;
  const head = S.connected
    ? `<div class="bal"><small>Solde total</small><h2>${money(t)}</h2><div class="dl ${up ? 'up' : 'dn'}">${up ? '▲' : '▼'} ${money(Math.abs(d))} · ${pct(t ? (d / (t - d)) * 100 : 0)} <span style="color:var(--mut)">24h</span></div></div>
       <div class="acts"><button data-do="send"><i>${svg('send')}</i>Envoyer</button><button data-do="recv"><i>${svg('recv')}</i>Recevoir</button><button data-do="buy"><i>${svg('plus')}</i>Acheter</button><button data-do="swap"><i>${svg('swap')}</i>Swap</button></div>`
    : `<div class="hero"><canvas id="cv"></canvas><h1>Votre wallet<br>crypto sécurisé</h1></div>
       <div class="two"><button class="big" data-do="connect">${svg('scan')}Connecter</button><button class="big" data-do="buyledger">${svg('cart')}Acheter un Ledger</button></div>
       ${S.banner ? `<div class="banner"><button class="x" data-do="closeban">${svg('x')}</button><b>Le choix de millions d’utilisateurs</b><span>Pour avoir l’esprit tranquille à chaque opération.</span><div class="dev"></div></div>` : ''}`;
  const g = k => A.filter(a => a.g === k);
  const pills = rows => `<div class="pr">${rows.map(a => `<button class="pill" data-a="${a.id}">${coin(a.id)}${a.id}</button>`).join('')}</div>`;
  const ac = g('a');
  view.innerHTML = `
  <div class="top" id="top"><button class="cb f" data-do="settings">${svg('user')}</button><button class="cb" data-do="discover">${svg('compass')}</button><button class="cb" data-do="search">${svg('search')}</button><span class="sp"></span><button class="cb" data-do="history">${svg('clock')}</button></div>
  ${head}
  <div class="sh"><h3>Marché ${svg('chev')}</h3><span class="m">Tendance ${svg('down')}</span></div>
  <div class="hs">
    <div class="mk"><div style="height:46px">${gauge}</div><span>Sentiment</span><em class="dn">Peur+</em></div>
    <button class="mk">${circ('#3a12f0', '<g fill="#fff"><rect x="30" y="30" width="40" height="9" rx="4"/><rect x="30" y="46" width="40" height="9" rx="4"/><rect x="30" y="62" width="40" height="9" rx="4"/></g>')}<span>EVAA</span><em class="up">+4,46%</em></button>
    <button class="mk">${circ('#111', '<g><rect x="26" y="30" width="48" height="9" rx="3" fill="#2dd4bf"/><rect x="26" y="46" width="48" height="9" rx="3" fill="#8b5cf6"/><rect x="26" y="62" width="48" height="9" rx="3" fill="#6366f1"/></g>')}<span>SOL</span><em class="up">+1,95%</em></button>
    <button class="mk">${circ('#111', '<path d="M38 24h10v38h-10zM54 52l10 0 0 14-10 0z" fill="#fff"/>')}<span>LIT</span><em class="up">+13,36%</em></button>
    <button class="mk" data-a="BTC">${coin('BTC')}<span>BTC</span><em class="${byId.BTC.ch >= 0 ? 'up' : 'dn'}">${pct(byId.BTC.ch)}</em></button>
    <button class="mk" data-a="ETH">${coin('ETH')}<span>ETH</span><em class="${byId.ETH.ch >= 0 ? 'up' : 'dn'}">${pct(byId.ETH.ch)}</em></button>
  </div>
  <div class="sh" style="margin-top:30px"><h3>Cryptos</h3></div>${g('c').map(rowH).join('')}
  <div class="sh"><h3>Stablecoins</h3></div>${g('s').map(rowH).join('')}
  <div class="sh"><h3>Actions</h3><a data-do="all">Explorer tout</a></div>
  <div class="hs"><div class="pills">${pills(ac.slice(0, 4))}${pills(ac.slice(4))}</div></div>`;
  const top = $('#top'); const onS = () => top && top.classList.toggle('s', scrollY > 8); onS();
  const cv = $('#cv'); if (cv) hero(cv);
}
function hero(c) {
  const dpr = devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
  c.width = w * dpr; c.height = h * dpr;
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  const step = 9;
  for (let j = 0; j * step < h; j++) for (let i = 0; i * step < w; i++) {
    const nx = i * step / w, ny = j * step / h;
    const wave = (Math.sin(nx * 7 + ny * 4) + Math.sin(ny * 9 - nx * 3) + 2) / 4;
    const k = Math.max(0, 1 - Math.abs(ny - 0.5 - 0.18 * Math.sin(nx * 5)) * 2.2) * (0.25 + 0.75 * wave);
    if (k < .04) continue;
    const r = k * 3.6;
    const rr = 215 - nx * 70, gg = 130 - nx * 40, bb = 70 + nx * 190;
    x.fillStyle = `rgba(${rr|0},${gg|0},${bb|0},${Math.min(1, k * 1.5)})`;
    x.beginPath(); x.arc(i * step + step / 2, j * step + step / 2, r, 0, 7); x.fill();
  }
}
addEventListener('scroll', () => { const t = $('#top'); if (t) t.classList.toggle('s', scrollY > 8); }, { passive: true });

/* ---------- autres onglets ---------- */
function swapView() {
  const f = S.sf || 'BTC', t = S.st || 'ETH';
  const opts = id => A.map(a => `<option ${a.id === id ? 'selected' : ''}>${a.id}</option>`).join('');
  view.innerHTML = `<div class="ttl">Swap</div><div class="sub">Échangez vos cryptos en toute sécurité.</div>
  <div class="sw"><label>Vous payez</label><div class="l"><input id="sa" inputmode="decimal" placeholder="0" value="${S.sv || ''}"><div class="sel">${coin(f)}${f}<select id="sf">${opts(f)}</select></div></div><label style="display:block;margin-top:8px">Solde : ${qty(bal(f))} ${f}</label></div>
  <button class="flip" data-do="flip">${svg('swap')}</button>
  <div class="sw"><label>Vous recevez</label><div class="l"><input id="sb" inputmode="decimal" placeholder="0" readonly><div class="sel">${coin(t)}${t}<select id="st">${opts(t)}</select></div></div></div>
  <button class="cta" data-do="doswap">Swap</button>`;
  const calc = () => { const v = parseFloat(($('#sa').value || '0').replace(',', '.')) || 0; S.sv = $('#sa').value; $('#sb').value = v ? qty(+(v * byId[f].p / byId[t].p).toFixed(8)) : ''; };
  $('#sa').oninput = calc; calc();
  $('#sf').onchange = e => { S.sf = e.target.value; swapView(); }; $('#st').onchange = e => { S.st = e.target.value; swapView(); };
}
function earnView() {
  const L = [['ETH', 'Ethereum', 'Staking liquide', '3,1%'], ['SOL', 'Solana', 'Staking', '6,8%'], ['BNB', 'BNB Smart Chain', 'Staking', '2,4%'], ['USDC', 'USD Coin', 'Prêt', '4,9%'], ['XRP', 'XRP', 'Prêt', '3,3%']];
  view.innerHTML = `<div class="ttl">Gagner</div><div class="sub">Faites fructifier vos cryptos.</div>` + L.map(([id, n, s, a]) => `<button class="row" data-do="toast:Bientôt disponible">${coin(byId[id] ? id : 'BNB')}<div class="rt"><b>${n}</b><span>${s}</span></div><div class="rv up">${a}<small style="color:var(--mut)">APY</small></div></button>`).join('');
}
function cardView() {
  view.innerHTML = `<div class="ttl">Carte</div><div class="sub">Dépensez vos cryptos partout.</div>
  <div class="card3"><span class="tag">Bientôt</span><div><b>Votre carte crypto,<br>directement depuis votre wallet</b><br><br><span>Payez en euros, dépensez en crypto.</span></div></div>
  <button class="cta" data-do="toast:Vous serez prévenu à la sortie">Rejoindre la liste d’attente</button>`;
}
const render = () => { ({ home, swap: swapView, earn: earnView, card: cardView })[tab](); tabs(); };
function tabs() {
  const T = [['home', 'Accueil', 'home'], ['swap', 'Swap', 'swap'], ['earn', 'Gagner', 'earn'], ['card', 'Carte', 'card']];
  $('#tabs').innerHTML = T.map(([k, l, i]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${svg(i, k === 'home' ? 'fillable' : '')}${l}</button>`).join('');
}

/* ---------- feuilles & pages ---------- */
const layer = $('#layer');
function sheet(html, mount) {
  const bk = document.createElement('div'); bk.className = 'bk';
  const s = document.createElement('div'); s.className = 'sheet'; s.innerHTML = `<div class="grab"></div>${html}`;
  layer.append(bk, s);
  const close = () => { bk.classList.remove('in'); s.classList.remove('in'); setTimeout(() => { bk.remove(); s.remove(); }, 300); };
  bk.onclick = close; s.close = close;
  requestAnimationFrame(() => { bk.classList.add('in'); s.classList.add('in'); });
  mount && mount(s, close); return s;
}
function page(html, mount) {
  const p = document.createElement('div'); p.className = 'page'; p.innerHTML = html; layer.append(p);
  const close = () => { p.classList.remove('in'); setTimeout(() => p.remove(), 300); };
  $$('[data-close]', p).forEach(b => b.onclick = close);
  requestAnimationFrame(() => p.classList.add('in'));
  mount && mount(p, close); return p;
}

/* graphique */
function rng(seed) { let h = 1779033703 ^ seed.length; for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
function series(a, r) {
  const R = rng(a.id + r), n = 80, M = { '1J': 1, '1S': 2.4, '1M': 5, '1A': 28 }[r];
  const end = a.p, c = a.ch * M || (R() - .5) * 2 * M * (a.g === 's' ? .02 : 1), start = end / (1 + c / 100), vol = a.g === 's' ? .0004 : .012 * Math.sqrt(M);
  let w = [0]; for (let i = 1; i < n; i++) w.push(w[i - 1] + (R() - .5) * 2 * vol);
  const e = w[n - 1];
  return w.map((x, i) => { const t = i / (n - 1); return (start + (end - start) * t) * (1 + (x - e * t)); }).concat();
}
function chart(el, a, r, onv) {
  const d = series(a, r), W = 400, H = 200, mn = Math.min(...d), mx = Math.max(...d), up = d[d.length - 1] >= d[0];
  const col = up ? '#6fe08a' : '#ff7a8a';
  const pts = d.map((v, i) => [i / (d.length - 1) * W, 14 + (H - 28) * (1 - (v - mn) / ((mx - mn) || 1))]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".28"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs><path d="${path}L${W} ${H}L0 ${H}Z" fill="url(#fg)"/><path d="${path}" fill="none" stroke="${col}" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/><line id="cl" y1="0" y2="${H}" stroke="#666" stroke-width="1" vector-effect="non-scaling-stroke" opacity="0"/></svg>`;
  const cl = $('#cl', el), mv = ev => { const b = el.getBoundingClientRect(), x = Math.max(0, Math.min(1, ((ev.touches ? ev.touches[0].clientX : ev.clientX) - b.left) / b.width)), i = Math.round(x * (d.length - 1)); cl.setAttribute('x1', pts[i][0]); cl.setAttribute('x2', pts[i][0]); cl.setAttribute('opacity', 1); onv(d[i]); };
  const out = () => { cl.setAttribute('opacity', 0); onv(null); };
  el.ontouchstart = el.ontouchmove = mv; el.ontouchend = out; el.onmousemove = mv; el.onmouseleave = out;
}

function detail(id) {
  const a = byId[id]; let r = '1J';
  page(`<div class="pt"><button class="cb" data-close>${svg('back')}</button>${coin(id)}<b>${a.n}</b></div>
  <div class="dh"><small id="dl">Solde</small><h2 id="dv"></h2><p id="dq"></p></div>
  <div class="ch" id="ch"></div>
  <div class="rg">${['1J', '1S', '1M', '1A'].map(k => `<button data-r="${k}" class="${k === r ? 'on' : ''}">${k}</button>`).join('')}</div>
  <button class="cta" data-do="edit">Modifier le solde</button>
  <div class="acts" style="padding-top:20px"><button data-do="send"><i>${svg('send')}</i>Envoyer</button><button data-do="recv"><i>${svg('recv')}</i>Recevoir</button><button data-do="buy"><i>${svg('plus')}</i>Acheter</button><button data-do="swap"><i>${svg('swap')}</i>Swap</button></div>
  <div style="margin-top:20px"><div class="kv"><span>Prix</span><b id="kp"></b></div><div class="kv"><span>Variation 24h</span><b class="${a.ch >= 0 ? 'up' : 'dn'}">${pct(a.ch)}</b></div><div class="kv"><span>Quantité</span><b id="kq"></b></div></div>
  <div style="height:60px"></div>`, (p, close) => {
    const fill = () => { $('#dv', p).textContent = money(val(a)); $('#dq', p).textContent = `${qty(bal(id))} ${id}`; $('#kp', p).textContent = money(a.p); $('#kq', p).textContent = `${qty(bal(id))} ${id}`; };
    const draw = () => chart($('#ch', p), a, r, v => { $('#dl', p).textContent = v ? 'Prix' : 'Solde'; if (v) { $('#dv', p).textContent = money(v); $('#dq', p).textContent = ''; } else fill(); });
    fill(); draw();
    p.onclick = e => {
      const b = e.target.closest('[data-r]'); if (b) { r = b.dataset.r; $$('[data-r]', p).forEach(x => x.classList.toggle('on', x === b)); draw(); return; }
      const dd = e.target.closest('[data-do]'); if (!dd) return;
      if (dd.dataset.do === 'edit') edit(id, () => { fill(); draw(); render(); });
      else act(dd.dataset.do, id);
    };
  });
}

function edit(id, done) {
  const a = byId[id];
  sheet(`<h4>Modifier le solde</h4>
  <div class="fld"><div style="flex:1"><label>Quantité</label><input id="eq" inputmode="decimal" placeholder="0" value="${bal(id) ? String(bal(id)).replace('.', ',') : ''}"></div><span class="u">${id}</span></div>
  <div class="fld"><div style="flex:1"><label>Valeur (${S.cur === 'EUR' ? '€' : '$'})</label><input id="ev" inputmode="decimal" placeholder="0"></div><span class="u">${S.cur}</span></div>
  <button class="cta" id="es">Enregistrer</button><div class="note">Modification locale : seul votre téléphone voit ce solde.</div>`, (s, close) => {
    const k = S.cur === 'EUR' ? rate : 1, P = a.p * k, n = x => parseFloat(String(x).replace(/\s/g, '').replace(',', '.')) || 0;
    const q = $('#eq', s), v = $('#ev', s), r2 = x => +x.toFixed(2);
    const fromQ = () => { v.value = n(q.value) ? String(r2(n(q.value) * P)).replace('.', ',') : ''; }; fromQ();
    q.oninput = fromQ; v.oninput = () => { q.value = n(v.value) ? String(+(n(v.value) / P).toFixed(8)).replace('.', ',') : ''; };
    $('#es', s).onclick = () => { S.bal[id] = n(q.value); save(); close(); toast('Solde mis à jour'); done && done(); };
    setTimeout(() => q.focus(), 350);
  });
}

function pick(cb) {
  sheet(`<h4>Choisir un actif</h4>` + A.slice(0, 6).map(a => `<button class="row" style="padding-left:0;padding-right:0" data-p="${a.id}">${coin(a.id)}<div class="rt"><b>${a.n}</b><span>${a.id}</span></div></button>`).join(''), (s, close) => { s.onclick = e => { const b = e.target.closest('[data-p]'); if (b) { close(); setTimeout(() => cb(b.dataset.p), 320); } }; });
}
const addr = id => { const R = rng('addr' + id), h = '0123456789abcdef', b = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'; const p = n => Array.from({ length: n }, () => h[R() * 16 | 0]).join(''); return id === 'BTC' ? 'bc1q' + Array.from({ length: 38 }, () => b[R() * 32 | 0]).join('') : id === 'XRP' ? 'r' + Array.from({ length: 33 }, () => b[R() * 32 | 0]).join('') : '0x' + p(40); };
function qr(seed) { const R = rng(seed), N = 29; let d = ''; const fin = (x, y) => (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!fin(x, y) && R() > .52) d += `M${x} ${y}h1v1h-1z`; const f = (x, y) => `<path d="M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5z" fill-rule="evenodd"/><path d="M${x + 2} ${y + 2}h3v3h-3z"/>`; return `<svg viewBox="-1 -1 ${N + 2} ${N + 2}" fill="#000" shape-rendering="crispEdges"><path d="${d}"/>${f(0, 0)}${f(N - 7, 0)}${f(0, N - 7)}</svg>`; }

function act(k, id) {
  if (k === 'recv') return id ? recv(id) : pick(recv);
  if (k === 'send') return id ? send(id) : pick(send);
  if (k === 'buy') return toast('Achat indisponible en mode démo');
  if (k === 'swap') { S.sf = id || S.sf; $$('.page').forEach(p => p.remove()); tab = 'swap'; render(); scrollTo(0, 0); }
}
function recv(id) { const ad = addr(id); sheet(`<h4>Recevoir ${id}</h4><div class="qr">${qr(ad)}</div><div class="addr">${ad}</div><button class="cta g" id="cp">Copier l’adresse</button><div class="note">Adresse de démonstration.</div>`, s => { $('#cp', s).onclick = () => { try { navigator.clipboard.writeText(ad); } catch {} toast('Adresse copiée'); }; }); }
function send(id) {
  sheet(`<h4>Envoyer ${id}</h4><div class="fld"><div style="flex:1"><label>Adresse</label><input style="font-size:18px" placeholder="Adresse du destinataire"></div></div><div class="fld"><div style="flex:1"><label>Montant</label><input inputmode="decimal" placeholder="0"></div><span class="u">${id}</span></div><button class="cta" id="go">Continuer</button>`, (s, close) => {
    $('#go', s).onclick = () => { s.innerHTML = `<div class="grab"></div><h4>Vérifiez sur votre appareil</h4><div class="spin"></div><div class="note">Confirmez la transaction sur votre Ledger…</div>`; setTimeout(() => { close(); toast('Mode démo : rien n’a été envoyé'); }, 2200); };
  });
}
function connect() {
  sheet(`<h4>Connecter un appareil</h4><div class="spin"></div><div class="note" id="cn">Recherche d’appareils Bluetooth…</div>`, (s, close) => {
    setTimeout(() => { $('.spin', s).outerHTML = `<button class="dvr" id="dv"><i></i>Nano X</button>`; $('#cn', s).textContent = 'Appuyez sur votre appareil pour vous connecter.'; $('#dv', s).onclick = () => { s.innerHTML = `<div class="grab"></div><h4>Connexion…</h4><div class="spin"></div>`; setTimeout(() => { S.connected = true; save(); close(); render(); toast('Appareil connecté'); }, 1300); }; }, 1800);
  });
}
function settings() {
  const s = sheet(`<h4>Réglages</h4>
  <div class="st">Devise<div class="seg"><button data-c="USD" class="${S.cur === 'USD' ? 'on' : ''}">USD</button><button data-c="EUR" class="${S.cur === 'EUR' ? 'on' : ''}">EUR</button></div></div>
  <div class="st">Prix en direct<button class="tg ${S.live ? 'on' : ''}" data-t="live"></button></div>
  <div class="st">Appareil connecté<button class="tg ${S.connected ? 'on' : ''}" data-t="conn"></button></div>
  <div class="st" style="border:0"><button data-reset style="color:var(--dn);font-size:18px">Remettre tous les soldes à zéro</button></div>
  <div class="note">Tout est enregistré uniquement sur ce téléphone.<br>Mode démo — aucune connexion à un vrai wallet.</div>`, (s, close) => {
    s.onclick = e => {
      const c = e.target.closest('[data-c]'); if (c) { S.cur = c.dataset.c; save(); close(); render(); return; }
      const t = e.target.closest('[data-t]'); if (t) { if (t.dataset.t === 'live') { S.live = !S.live; if (S.live) prices(); } else S.connected = !S.connected; save(); t.classList.toggle('on'); render(); return; }
      if (e.target.closest('[data-reset]')) { S.bal = {}; save(); close(); render(); toast('Soldes remis à zéro'); }
    };
  });
}
function search() {
  sheet(`<div class="srch">${svg('search')}<input id="q" placeholder="Rechercher un actif" autofocus></div><div id="rs"></div>`, s => {
    const f = () => { const q = $('#q', s).value.toLowerCase(); $('#rs', s).innerHTML = A.filter(a => !q || (a.n + a.id).toLowerCase().includes(q)).map(a => `<button class="row" style="padding-left:0;padding-right:0" data-a="${a.id}">${coin(a.id)}<div class="rt"><b>${a.n}</b><span>${a.id}</span></div><div class="rv">${money(a.p)}</div></button>`).join(''); };
    $('#q', s).oninput = f; f();
    s.onclick = e => { const b = e.target.closest('[data-a]'); if (b) { s.close(); detail(b.dataset.a); } };
  });
}

/* ---------- événements globaux ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; render(); scrollTo(0, 0); return; }
  if (e.target.closest('.sheet') && !e.target.closest('.page')) return;
  if (e.target.closest('.page')) return;
  const d = e.target.closest('[data-do]');
  if (d) {
    const k = d.dataset.do;
    if (k === 'connect') connect();
    else if (k === 'settings') settings();
    else if (k === 'search') search();
    else if (k === 'history') sheet(`<h4>Historique</h4><div class="note" style="margin:20px 0 30px">Aucune opération pour le moment.</div>`);
    else if (k === 'closeban') { S.banner = false; save(); render(); }
    else if (k === 'buyledger') toast('Boutique indisponible en mode démo');
    else if (k === 'discover') toast('Découvrir : bientôt disponible');
    else if (k === 'all') search();
    else if (k === 'flip') { [S.sf, S.st] = [S.st || 'ETH', S.sf || 'BTC']; swapView(); }
    else if (k === 'doswap') toast('Mode démo : swap non exécuté');
    else if (k.startsWith('toast:')) toast(k.slice(6));
    else act(k);
    return;
  }
  const a = e.target.closest('[data-a]'); if (a && a.dataset.a) detail(a.dataset.a);
});
$('#layer').addEventListener('click', e => { if (e.target.closest('.sheet') && e.target.closest('[data-do]')) { const k = e.target.closest('[data-do]').dataset.do; if (k === 'flip') return; } });

/* ---------- prix en direct (optionnel) ---------- */
async function prices() {
  if (!S.live) return;
  try {
    const ids = A.filter(a => a.cg).map(a => a.cg).join(',');
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,eur&include_24hr_change=true`);
    if (!r.ok) return; const j = await r.json();
    A.forEach(a => { const x = a.cg && j[a.cg]; if (x && x.usd) { a.p = x.usd; a.ch = x.usd_24h_change ?? a.ch; } });
    if (j.bitcoin && j.bitcoin.eur) rate = j.bitcoin.eur / j.bitcoin.usd;
    if (!$('.sheet') && !$('.page')) render();
  } catch {}
}

render(); prices(); setInterval(prices, 60000);
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
