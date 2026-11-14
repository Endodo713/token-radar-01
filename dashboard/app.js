// Token Radar's dashboard: a static page, no framework, no network.
// Reads window.RADAR (written by main.ts from the same board), renders the ranked board with
// search, category, chain and watchlist filters, a sort, and a detail drawer for every protocol
// with its model breakdown and its farm plan. Hash routes drive the three screenshot states:
//   #/            the board
//   #/detail/<slug>  one protocol's detail view
//   #/?category=Lending&watchlist=1  a filtered view
'use strict';

const R = window.RADAR;
const rows = R.rows;
const bySlug = new Map(rows.map((r) => [r.slug, r]));
const watchlist = new Set(rows.filter((r) => r.watchlist).map((r) => r.slug));

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** $2.75B, $514.2M, $48.3K, $812. */
function fmtUsd(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

/** +12.5%, -4.0%, or an em dash when unreported. */
function fmtPct(n) {
  if (n === null || n === undefined) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}

/** 3.2y, 214d, or an em dash when unknown. */
function fmtAge(days) {
  if (days === null || days === undefined) return '—';
  if (days >= 365) return `${(days / 365).toFixed(1)}y`;
  return `${days}d`;
}

function fmtMult(n) {
  return `${n.toFixed(2)}×`;
}

// ---------------------------------------------------------------- header + stats

$('asof').textContent = R.as_of;
$('asof2').textContent = R.as_of;
$('src').textContent = R.source;
$('gmed').textContent = `${R.global_median.toFixed(4)}×`;
$('meta').innerHTML =
  `<span>Snapshot <b>${esc(R.as_of)}</b></span>` +
  `<span>Watchlist <b>${R.watchlist_size}</b></span>` +
  `<span>Board <b>${R.board_size} rows</b></span>` +
  `<span>Model <b>${esc(R.model_version)}</b></span>`;
$('stats').innerHTML =
  `<div class="stat"><b>${R.board_size}</b><span>protocols ranked</span></div>` +
  `<div class="stat"><b>${R.watchlist_size}</b><span>on the watchlist floor</span></div>` +
  `<div class="stat"><b>${fmtUsd(R.total_implied_usd)}</b><span>total implied value</span></div>` +
  `<div class="stat"><b>${fmtUsd(rows[0].implied_value_usd)}</b><span>top implied value · ${esc(rows[0].name)}</span></div>`;

// ---------------------------------------------------------------- filters

const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))].sort();
for (const c of categories) {
  const o = document.createElement('option');
  o.value = c;
  o.textContent = c;
  $('cat').appendChild(o);
}
const chains = [...new Set(rows.flatMap((r) => r.chains))].sort();
for (const c of chains) {
  const o = document.createElement('option');
  o.value = c;
  o.textContent = c;
  $('chain').appendChild(o);
}

const state = { q: '', cat: '', chain: '', wl: false, sort: 'rank' };
const maxImplied = rows[0].implied_value_usd;

function filtered() {
  const q = state.q.trim().toLowerCase();
  let list = rows.filter((r) => {
    if (state.wl && !r.watchlist) return false;
    if (state.cat && r.category !== state.cat) return false;
    if (state.chain && !r.chains.includes(state.chain)) return false;
    if (q && !(r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q))) return false;
    return true;
  });
  if (state.sort === 'tvl') list = [...list].sort((a, b) => b.tvl_usd - a.tvl_usd);
  else if (state.sort === 'growth') list = [...list].sort((a, b) => (b.change_7d ?? -1e9) - (a.change_7d ?? -1e9));
  else if (state.sort === 'age') list = [...list].sort((a, b) => (b.age_days ?? -1) - (a.age_days ?? -1));
  return list;
}

function render() {
  const list = filtered();
  const tb = $('rows');
  tb.innerHTML = list.map((r) => {
    const g = r.change_7d;
    const cls = g === null ? '' : g >= 0 ? 'up' : 'down';
    const pct = Math.max(2, Math.round((r.implied_value_usd / maxImplied) * 100));
    return `<tr data-slug="${esc(r.slug)}" data-open="${openSlug === r.slug}">` +
      `<td class="num">${r.rank}</td>` +
      `<td class="namecell"><b>${esc(r.name)}${r.watchlist ? '<span class="tag">WATCHLIST</span>' : ''}</b><span class="sub">${esc(r.slug)}</span></td>` +
      `<td>${esc(r.category ?? '—')}</td>` +
      `<td>${esc(r.chains.slice(0, 3).join(', '))}${r.chains.length > 3 ? ` +${r.chains.length - 3}` : ''}</td>` +
      `<td class="num">${fmtUsd(r.tvl_usd)}</td>` +
      `<td class="num ${cls}">${fmtPct(g)}</td>` +
      `<td class="num">${fmtAge(r.age_days)}</td>` +
      `<td><span class="implied">${fmtUsd(r.implied_value_usd)}</span><span class="bar"><i style="width:${pct}%"></i></span></td>` +
      `</tr>`;
  }).join('');
  $('count').textContent = `Showing ${list.length} of ${rows.length} protocols`;
  $('empty').hidden = list.length > 0;
}

$('rows').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-slug]');
  if (tr) openDetail(tr.dataset.slug);
});
$('q').addEventListener('input', () => { state.q = $('q').value; render(); });
$('cat').addEventListener('change', () => { state.cat = $('cat').value; render(); });
$('chain').addEventListener('change', () => { state.chain = $('chain').value; render(); });
$('wl').addEventListener('change', () => { state.wl = $('wl').checked; render(); });
$('sort').addEventListener('change', () => { state.sort = $('sort').value; render(); });
$('reset').addEventListener('click', () => {
  state.q = ''; state.cat = ''; state.chain = ''; state.wl = false; state.sort = 'rank';
  $('q').value = ''; $('cat').value = ''; $('chain').value = ''; $('wl').checked = false; $('sort').value = 'rank';
  render();
});

// ---------------------------------------------------------------- detail drawer

let openSlug = null;

function openDetail(slug) {
  const r = bySlug.get(slug);
  if (!r) return;
  openSlug = slug;
  const math =
    `${fmtUsd(r.tvl_usd)} TVL × <b>${fmtMult(r.multiple)}</b> ${esc(r.multiple_source)}` +
    ` × <b>${r.growth_multiplier.toFixed(2)}</b> growth` +
    ` × <b>${r.maturity_multiplier.toFixed(2)}</b> maturity` +
    ` = <b>${fmtUsd(r.implied_value_usd)}</b>`;
  $('detail').innerHTML =
    `<div class="detail-head"><div>` +
    `<span class="sub">RANK #${r.rank}${r.watchlist ? ' · WATCHLIST' : ''} · ${esc(r.category ?? 'Uncategorized')}</span>` +
    `<h2>${esc(r.name)}</h2>` +
    `<p class="sub">${esc(r.slug)} · ${esc(r.chains.join(', ') || '—')} · tracked since ${esc(r.listed_at ?? 'unknown')}</p>` +
    `</div><button class="close" id="close" type="button" aria-label="Close">✕</button></div>` +
    `<p class="big-value">${fmtUsd(r.implied_value_usd)}</p>` +
    `<p class="big-label">implied token value, if it launched at its comparables multiple</p>` +
    `<div class="kv">` +
    `<div><span>TVL</span><b>${fmtUsd(r.tvl_usd)}</b></div>` +
    `<div><span>7-day TVL change</span><b>${fmtPct(r.change_7d)}</b></div>` +
    `<div><span>Age with no token</span><b>${fmtAge(r.age_days)}</b></div>` +
    `<div><span>Token recorded</span><b>none</b></div>` +
    `</div>` +
    `<div class="math">${math}</div>` +
    `<h3>Farm plan — ${esc(r.name)}</h3>` +
    `<ol class="steps">${r.farm_steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` +
    `<p class="note">Implied value is this entry's estimate from the snapshot's own figures. It is not a prediction that ${esc(r.name)} will issue a token, or when — and never investment advice. Claim only from links the protocol itself publishes.</p>`;
  $('detail').hidden = false;
  $('close').addEventListener('click', closeDetail);
  render();
}

function closeDetail() {
  openSlug = null;
  $('detail').hidden = true;
  $('detail').innerHTML = '';
  render();
}

// ---------------------------------------------------------------- comparables + live tables

$('comp-rows').innerHTML = R.comps.map((c) =>
  `<tr><td>${esc(c.category)}</td><td class="num">${c.sample}</td><td class="num">${fmtMult(c.median)}</td></tr>`
).join('') +
`<tr><td><b>Global median (fallback)</b></td><td class="num">${R.live.length} shown of 144</td><td class="num">${fmtMult(R.global_median)}</td></tr>`;

$('live-rows').innerHTML = R.live.map((p) =>
  `<tr><td><b>${esc(p.name)}</b><br><span class="sub">${esc(p.slug)}</span></td>` +
  `<td>${esc(p.category ?? '—')}</td>` +
  `<td class="num">${fmtUsd(p.tvl_usd)}</td>` +
  `<td class="num">${p.mcap_usd === null ? '—' : fmtUsd(p.mcap_usd)}</td>` +
  `<td class="num">${p.mcap_usd === null ? '—' : fmtMult(p.mcap_usd / p.tvl_usd)}</td></tr>`
).join('');

// ---------------------------------------------------------------- hash routes (board / detail / filtered)

function applyHash() {
  const h = location.hash || '#/';
  if (h.startsWith('#/detail/')) {
    openDetail(decodeURIComponent(h.slice(9).split('?')[0]));
    return;
  }
  if (h.startsWith('#/?')) {
    const params = new URLSearchParams(h.slice(3));
    if (params.get('category')) { state.cat = params.get('category'); $('cat').value = state.cat; }
    if (params.get('chain')) { state.chain = params.get('chain'); $('chain').value = state.chain; }
    if (params.get('q')) { state.q = params.get('q'); $('q').value = state.q; }
    if (params.get('watchlist') === '1') { state.wl = true; $('wl').checked = true; }
    if (params.get('sort')) { state.sort = params.get('sort'); $('sort').value = state.sort; }
    render();
  }
}

window.addEventListener('hashchange', applyHash);
render();
applyHash();
