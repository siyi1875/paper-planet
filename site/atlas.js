/* Paper Planet: a geographic front page. No build step.
   Reading always wins over motion: hovering, dragging, searching or reading pauses the tour and orbit. */
(async function () {
'use strict';
const root = document.getElementById('atlas-app'), $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const TONES = {urgent: 'Urgent', neutral: 'Neutral', good: 'Good news'};
const REGIONS = {europe: 'Europe', asia: 'Asia', africa: 'Africa', north_america: 'North America', south_america: 'South America', oceania: 'Oceania'};

/* Monoline figures, one per kind of story (names match scripts/build_events.py). */
const ICONS = {
  summit:'<circle cx="8" cy="8" r="2.2"/><circle cx="16" cy="8" r="2.2"/><path d="M4 19v-3.5a4 4 0 0 1 8 0V19M12 19v-3.5a4 4 0 0 1 8 0V19M3 19h18"/>',
  speaker:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
  flagpost:'<path d="M6 21V3.5M6 4h12l-2.5 4 2.5 4H6"/>',
  ballot:'<path d="M4 12h16v8H4zM8 12V4h8v8M10.5 7.5l1.2 1.2 2.3-2.4M2.5 12h19"/>',
  protest:'<path d="M12 21v-9M5 3.5h14V12H5zM8.5 7.8h7"/>',
  migrants:'<circle cx="8.5" cy="4.8" r="1.8"/><path d="M8.5 8v6l-2 6M8.5 14l3 6M8.5 9.5l3.5 2.5"/><circle cx="16.5" cy="7.3" r="1.6"/><path d="M16.5 10v5l-1.5 5M16.5 15l1.6 5"/>',
  court:'<path d="m13.5 3.5 6 6M10.5 6.5l6 6M12 5l-4.5 4.5 6 6L18 11M9.8 12.7 3.5 19M12 21h9"/>',
  missile:'<path d="M14.5 3.5c3.3 0 6 2.7 6 6l-8.5 8.5-6-6zM7.5 13.5 4 15l1.8-4.2M10.5 16.5 9 20l4.2-1.8M5.5 18.5l-2 2"/>',
  blast:'<path d="m12 2.5 1.8 5.2 5.4-2-3.2 4.6 5 3.2-5.6.9.8 5.7-4.2-3.9-4.2 3.9.8-5.7-5.6-.9 5-3.2-3.2-4.6 5.4 2z"/>',
  rubble:'<path d="M3 20.5h18M5.5 20.5v-9l5-3.5v12.5M13.5 20.5V15l3.5-2.5 2.5 2v6M10.5 8l2.5-2.5M8 12.5v1M8 16v1"/>',
  alert:'<path d="M12 3.5 21.5 20h-19zM12 10v4.5M12 17.2v.3"/>',
  boat:'<path d="M3 14.5h18l-3 5H6zM7.5 14.5v-5h9v5M12 9.5V4.5M3 21.5c1.5 0 1.5-.8 3-.8s1.5.8 3 .8 1.5-.8 3-.8 1.5.8 3 .8 1.5-.8 3-.8 1.5.8 3 .8"/>',
  tanker:'<path d="M2 13.5h20l-2.5 5.5h-15zM5.5 13.5v-4h10v4M15.5 9.5V6h2.5v3.5M8.5 11.5h4"/>',
  plane:'<path d="M21 3.5 3 10.5l7 2.8 2.8 7z"/><path d="m10 13.3 11-9.8"/>',
  flood:'<path d="m5 11.5 7-6 7 6M7 10.5v3.5M17 10.5v3.5M3 16.8c2 0 2-1.4 4.5-1.4S10 16.8 12 16.8s2.5-1.4 4.5-1.4 2.5 1.4 4.5 1.4M3 20.5c2 0 2-1.4 4.5-1.4S10 20.5 12 20.5s2.5-1.4 4.5-1.4 2.5 1.4 4.5 1.4"/>',
  wildfire:'<path d="M12 21.5c-3.9 0-6.3-2.7-6.3-6 0-4 4.1-6.2 4.1-10.5 3 1.8 4.5 4.2 4.5 6.4.9-.8 1.4-1.9 1.5-3 2 2 2.6 4.6 2.6 7.1 0 3.4-2.5 6-6.4 6z"/><path d="M12 21.5c-1.5 0-2.6-1.1-2.6-2.6 0-1.8 2.6-3 2.6-4.9 1.4 1.4 2.6 2.9 2.6 4.9 0 1.5-1.1 2.6-2.6 2.6z"/>',
  bank:'<path d="m3 9 9-5.5L21 9M5.5 9.5v8M10 9.5v8M14 9.5v8M18.5 9.5v8M3 20.5h18"/>',
  chart:'<path d="M4 20V4M4 20h16.5M7.5 15.5l4-5 3 3 5.5-6.5M16.5 7h3.5v3.5"/>',
  coin:'<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.4-.9-1.4-1.5-2.6-1.5-1.5 0-2.6.8-2.6 2s1.1 1.7 2.7 2.1 2.7 1 2.7 2.2-1.2 2-2.8 2c-1.3 0-2.3-.6-2.7-1.6M12 6v1.7M12 16.3V18"/>',
  barrel:'<path d="M7 3.5h10c1.3 2.5 1.3 14.5 0 17H7c-1.3-2.5-1.3-14.5 0-17zM5.9 9h12.2M5.9 15h12.2"/>',
  oil:'<path d="M7.5 21 12 3.5 16.5 21M9.3 14h5.4M10.4 9h3.2M4.5 21h15M8.5 17.5l7-3.5"/>',
  factory:'<path d="M3 20.5V10l5 3V10l5 3V10l5 3V3.5h3v17zM7 17h2M12 17h2"/>',
  medic:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M7.5 12h9"/>',
  footballer:'<circle cx="12" cy="12" r="8.5"/><path d="m12 7.8 3.6 2.6-1.4 4.2H9.8l-1.4-4.2zM12 3.5v4.3M15.6 10.4l4.2-1.3M14.2 14.6l2.6 3.6M9.8 14.6l-2.6 3.6M8.4 10.4 4.2 9.1"/>',
  guitar:'<path d="M9 17.5V5l11-2v12.5"/><circle cx="6.5" cy="17.5" r="2.7"/><circle cx="17.5" cy="15.5" r="2.7"/><path d="M9 9l11-2"/>',
  robot:'<rect x="5.5" y="8.5" width="13" height="11" rx="2.5"/><path d="M12 8.5V5M9.5 13v1M14.5 13v1M9.5 17h5M3 12.5v3.5M21 12.5v3.5"/><circle cx="12" cy="4" r="1"/>',
  globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c3 2.8 3 14.2 0 17M12 3.5c-3 2.8-3 14.2 0 17"/>'
};
const TICK = '<span class="tick"><svg viewBox="0 0 12 12"><path d="m2.5 6.3 2.3 2.2 4.7-5"/></svg></span>';
const fig = (e, size) => '<span class="fig" data-tone="'+esc(e.tone)+'" data-icon="'+esc(e.icon)+'"'+(size?' style="--s:'+size+'px"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[e.icon]||ICONS.globe)+'</svg>'+TICK+'</span>';
const glyph = e => '<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[e.icon]||ICONS.globe)+'</svg>';
const kicker = (e, g) => '<span class="kicker" data-tone="'+esc(e.tone)+'">'+(g?glyph(e):'')+'<span class="tone">'+TONES[e.tone]+'</span><span>·</span><span>'+esc(e.place)+(e.country&&e.country!==e.place?', '+esc(e.country):'')+'</span></span>';

/* ---------- data ---------- */
let data;
try { const r = await fetch('data/events.json'); if (!r.ok) throw Error(); data = await r.json(); }
catch (e) { $('#edition-date').textContent = 'Edition unavailable'; $('#story-list').innerHTML = '<p class="empty">The news edition could not be loaded. Please reload to try again.</p>'; $('#map-loading').textContent = 'News unavailable'; return; }
const continentOf = e => e.continent || (e.lat < -10 && e.lon > 110 ? 'oceania' : e.lon < -30 ? (e.lat > 12 ? 'north_america' : 'south_america') : e.lon > 60 || (e.lat > 12 && e.lon > 34) ? 'asia' : e.lat > 36 ? 'europe' : 'africa');
const events = data.events.map((e, i) => ({...e, continent: continentOf(e), score: e.score ?? ({heavy: 3, normal: 2, light: 1}[e.weight] || 2) * 100 - i}));
const byScore = [...events].sort((a, b) => b.score - a.score);
const isSeed = /seed/i.test(data.day.label || '') || /seed/.test(data.day.edition || '');

let seen = new Set(), active = null, filter = 'all', query = '', view = 'globe', rotation = [-16, -18, 0], zoom = 1, projection, world, animation;
const ZMAX = 6;
const flat = {z: 1, lon: 0, lat: 0, k0: 1};
let orbitSpeed = 2, resumeAt = 0, linked = null, frontIds = new Set();
const storageKey = 'pp-seen-' + (data.day.edition || data.day.iso);
try { seen = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]').filter(id => events.some(e => e.id === id))); } catch (e) {}

/* ---------- live edition line ---------- */
function liveLine() {
  const pill = $('#live-pill');
  if (isSeed) { $('#live-text').innerHTML = '<b>SAMPLE</b> Bundled stories · replaced by the first automatic run'; pill.classList.remove('is-live'); $('#mobile-live').innerHTML = pill.innerHTML; return; }
  const gen = data.meta?.generated_at ? new Date(data.meta.generated_at) : null;
  const ageMin = gen ? (Date.now() - gen) / 60000 : Infinity;
  let next = '';
  if (gen) { const n = new Date(Date.now()); n.setUTCMinutes(17, 0, 0); while (n.getUTCHours() % 3 || n <= Date.now()) n.setUTCHours(n.getUTCHours() + 1); const m = Math.max(1, Math.round((n - Date.now()) / 60000)); next = '<span class="when"> · next in ' + (m >= 60 ? Math.floor(m / 60) + 'h ' : '') + (m % 60) + 'm</span>'; }
  const fresh = ageMin < 6 * 60;
  pill.classList.toggle('is-live', fresh);
  $('#live-text').innerHTML = (fresh ? '<b>LIVE</b> ' : '') + 'Updated ' + esc(data.day.updated || '') + (fresh ? next : ' · ' + esc(data.day.label || ''));
  $('#mobile-live').innerHTML = pill.innerHTML; $('#mobile-live').classList.toggle('is-live', fresh);
}
$('#edition-date').textContent = new Date(data.day.iso + 'T12:00:00').toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long'});
liveLine(); setInterval(liveLine, 60000);

/* ---------- progress ---------- */
function progress(bump) {
  const n = seen.size, total = events.length;
  $('#explored-count').textContent = n + ' of ' + total;
  $('#ring-bar').setAttribute('stroke-dasharray', (total ? n / total * 100 : 0) + ' 100');
  if (bump) {
    const el = $('#explored'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    const conts = new Set(events.filter(e => seen.has(e.id)).map(e => e.continent)).size;
    const msg = n === total ? 'Every story explored. See you next edition.' : n === 1 ? 'First story explored — ' + (total - 1) + ' to go.' : n % 5 === 0 ? n + ' stories across ' + conts + (conts === 1 ? ' continent' : ' continents') + '.' : conts >= 3 && bump === 'new-continent' ? 'A new continent: ' + conts + ' so far.' : '';
    if (msg) toast(msg);
  }
}
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }

/* ---------- front page ---------- */
const filtered = () => byScore.filter(e => (filter === 'all' || e.tone === filter) && (!query || [e.title, e.place, e.country, e.source, REGIONS[e.continent]].join(' ').toLowerCase().includes(query)));
function leadNumber(e) {
  const custom = (e.stats || []).find(s => !/news sources|mentions tracked/i.test(s.l));
  if (custom) return {v: custom.v, l: custom.l};
  const m = (e.what || '').match(/(?:^|[\s(])(\$?\d{1,3}(?:,\d{3})+|\$?\d+(?:\.\d+)?)(\s?(?:%|percent|million|billion))?\s+((?:[A-Za-z’'-]+\s?){1,4})/);
  if (m && !/^(19|20)\d\d$/.test(m[1]) && !/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(m[3])) return {v: m[1] + (m[2] || '').replace(' percent', '%'), l: m[3].trim()};
  const src = (e.stats || []).find(s => /news sources/i.test(s.l));
  if (src && +src.v > 1) return {v: src.v, l: 'outlets covering this story'};
  return null;
}
const firstSentence = t => { const s = String(t || '').split(/(?<=[.!?])\s+(?=[A-Z])/)[0]; return s.length > 220 ? s.slice(0, 217).replace(/\s\S*$/, '') + '…' : s; };
function renderFront() {
  const counts = {all: events.length}; events.forEach(e => counts[e.tone] = (counts[e.tone] || 0) + 1);
  $$('[data-count]').forEach(c => c.textContent = counts[c.dataset.count] || 0);
  const list = filtered(), seenCls = e => seen.has(e.id) ? ' is-seen' : '';
  if (!list.length) { $('#lead').innerHTML = ''; $('#secondary').innerHTML = ''; $('#story-list').innerHTML = '<p class="empty">No stories match. Try another place or clear your search.</p>'; frontIds = new Set(); drawPins(); return; }
  const [lead, ...others] = list;
  frontIds = new Set([lead.id]);
  $('#lead').innerHTML = '<button class="lead story-link' + seenCls(lead) + '" data-id="' + esc(lead.id) + '" data-tone="' + esc(lead.tone) + '">' + kicker(lead) + '<h2>' + esc(lead.title) + '</h2><p>' + esc(lead.what) + '</p>' + (lead.source ? '<span class="lead-source">' + esc(lead.source) + '</span>' : '') + '</button>';
  $('#secondary').innerHTML = '';
  const groups = {}; others.forEach(e => (groups[e.continent] ||= []).push(e));
  $('#story-list').innerHTML = Object.entries(groups).sort((a, b) => b[1].length - a[1].length).map(([c, list]) =>
    '<section class="region"><div class="region-head"><b>' + (REGIONS[c] || 'Elsewhere') + '</b><span>' + list.length + '</span></div>' +
    list.map(e => '<button class="row story-link' + seenCls(e) + '" data-id="' + esc(e.id) + '" data-tone="' + esc(e.tone) + '"><i class="tone-dot ' + esc(e.tone) + '"></i><div><span class="place">' + esc(e.place) + (e.country && e.country !== e.place ? ', ' + esc(e.country) : '') + '</span><h4>' + esc(e.title) + '</h4></div></button>').join('') + '</section>').join('');
  $$('.story-link').forEach(b => {
    b.onclick = () => openStory(b.dataset.id);
    b.onmouseenter = b.onfocus = () => linkStory(b.dataset.id, true);
    b.onmouseleave = b.onblur = () => unlinkStory(b.dataset.id);
  });
  if (tour.on) tour.rebuild();
  drawPins();
}

/* ---------- list <-> globe link ---------- */
let linkTimer;
function linkStory(id, fromList) {
  clearTimeout(linkTimer);
  if (tour.on) tour.stop(true);
  setLinked(id);
  resumeAt = performance.now() + 2000;
  if (fromList) linkTimer = setTimeout(() => { const e = events.find(x => x.id === id); if (e && !active) flyTo(e); }, 140);
}
function unlinkStory(id) { clearTimeout(linkTimer); if (linked === id) setLinked(null); resumeAt = performance.now() + 2000; }
function setLinked(id) {
  linked = id;
  $$('.is-linked').forEach(n => n.classList.remove('is-linked'));
  if (!id) return;
  pinNodes.get(id)?.classList.add('is-linked');
  $$('.story-link[data-id="' + CSS.escape(id) + '"]').forEach(n => n.classList.add('is-linked'));
}

/* ---------- story view ---------- */
function openStory(id, focus = true) {
  const e = events.find(x => x.id === id); if (!e) return;
  tour.stop(true); setLinked(null);
  const firstTime = !seen.has(id), newContinent = firstTime && !events.some(x => seen.has(x.id) && x.continent === e.continent);
  active = e; seen.add(id); try { localStorage.setItem(storageKey, JSON.stringify([...seen])); } catch (err) {}
  progress(firstTime ? (newContinent ? 'new-continent' : true) : false);
  $('#edition-view').hidden = true; $('#story-view').hidden = false;
  const url = /^https?:\/\//i.test(e.url || '') ? e.url : null;
  const stats = (e.stats || []).filter(s => s.v);
  $('#story-view').innerHTML = '<button class="back-button">← Back to the front page</button>' +
    '<div class="article-head"><div><span class="tone-pill" data-tone="' + esc(e.tone) + '">' + glyph(e) + TONES[e.tone] + '</span><div class="article-place">' + esc(e.flag || '') + ' ' + esc(e.place) + (e.country && e.country !== e.place ? ' · ' + esc(e.country) : '') + '</div></div></div>' +
    '<h2 class="article-title">' + esc(e.title) + '</h2>' +
    [['What happened', e.what], ['Why it matters', e.why]].filter(x => x[1]).map(([h, p]) => '<section class="article-section"><h3>' + h + '</h3><p>' + esc(p) + '</p></section>').join('') +
    (stats.length ? '<div class="article-stats">' + stats.map(s => '<div><strong>' + esc(s.v) + '</strong><span>' + esc(s.l) + '</span></div>').join('') + '</div>' : '') +
    (e.jargon ? '<section class="article-section"><h3>' + esc(e.jargon.term) + '</h3><p>' + esc(e.jargon.def) + '</p></section>' : '') +
    (url ? '<a class="source-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Read the full story at ' + esc(e.source || new URL(url).hostname) + '<svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></a>' : '') +
    '<nav class="article-navigation" aria-label="Story navigation"><button class="text-button" id="prev-story">← Previous</button><button class="text-button" id="next-story">Next story →</button></nav>';
  $('.back-button').onclick = closeStory; $('#prev-story').onclick = () => step(-1); $('#next-story').onclick = () => step(1);
  $('#story-view').scrollTop = 0;
  $('#map-subtitle').textContent = e.place + ' · ' + TONES[e.tone];
  flyTo(e, Math.max(zoom, 1.12)); drawPins();
  if (focus) { $('.back-button').focus({preventScroll: true}); if (root.clientWidth < 701) $('#story-view').scrollIntoView({block: 'start'}); }
}
function closeStory() { active = null; if (zoom <= 1.13) zoomTo(1); resumeAt = performance.now() + 2500; $('#edition-view').hidden = false; $('#story-view').hidden = true; $('#map-subtitle').textContent = 'Explore the world at your pace.'; renderFront(); }
function step(n) { const list = filtered(), pool = list.some(e => e.id === active?.id) ? list : byScore; openStory(pool[(pool.findIndex(e => e.id === active?.id) + n + pool.length) % pool.length].id); }

$$('[data-filter]').forEach(b => b.onclick = () => { filter = b.dataset.filter; $$('[data-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); if (active) closeStory(); else renderFront(); });
$('#search').oninput = e => { query = e.target.value.trim().toLowerCase(); renderFront(); };
$('#random-button').onclick = () => { const list = filtered(); if (!list.length) return; const unread = list.filter(e => !seen.has(e.id)), pool = unread.length ? unread : list; openStory(pool[Math.floor(Math.random() * pool.length)].id); };
$('#about-button').onclick = () => $('#about-dialog').showModal(); $('#close-about').onclick = () => $('#about-dialog').close();
$('#about-dialog').onclick = e => { if (e.target === $('#about-dialog')) { const b = e.target.getBoundingClientRect(); if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) e.target.close(); } };
root.addEventListener('keydown', e => { if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return; if (e.key === 'Escape' && active) closeStory(); if (e.key === '/' && !active) { e.preventDefault(); $('#search').focus(); } if (active && e.key === 'ArrowRight') step(1); if (active && e.key === 'ArrowLeft') step(-1); });

/* ---------- globe ---------- */
const svg = $('#world-map'), stage = $('#map-stage'), pins = $('#map-pins'), labels = $('#map-labels');
const makeSvg = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
let earthRenderer = null;
function drawEarth() {
  if (!earthRenderer) return;
  const {gl, program, uniforms, canvas} = earthRenderer;
  canvas.hidden = view !== 'globe'; svg.classList.toggle('textured-earth', view === 'globe');
  if (view !== 'globe') return;
  const ratio = Math.min(devicePixelRatio || 1, 1.5), w = stage.clientWidth, h = stage.clientHeight;
  if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) { canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); }
  gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(program);
  gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
  gl.uniform2f(uniforms.center, projection.translate()[0] * ratio, projection.translate()[1] * ratio);
  gl.uniform1f(uniforms.radius, projection.scale() * ratio);
  gl.uniform2f(uniforms.orientation, -rotation[0] * Math.PI / 180, -rotation[1] * Math.PI / 180);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
// A sharper Earth (4096px) is fetched only once someone zooms in, so the first load stays light.
let hiRes = 0, hiImage = null;
function applyHiRes() {
  $('#flat-earth').src = hiImage.src;
  if (!earthRenderer) return;
  const {gl, texture} = earthRenderer;
  if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096) return;
  gl.bindTexture(gl.TEXTURE_2D, texture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, hiImage); drawEarth();
}
function wantHiRes() {
  if (hiRes) return; hiRes = 1;
  hiImage = new Image(); hiImage.src = 'assets/earth-4k.jpg';
  hiImage.decode().then(() => { hiRes = 2; applyHiRes(); }).catch(() => {});
}
async function initEarth() {
  const canvas = $('#earth-surface'), gl = canvas.getContext('webgl', {alpha: true, antialias: true, premultipliedAlpha: false});
  if (!gl) return;
  const vertex = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
  const fragment = `precision mediump float;
  uniform vec2 resolution,center,orientation;uniform float radius;uniform sampler2D earth;
  void main(){
    vec2 p=(vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y)-center)/radius;p.y=-p.y;
    float rr=dot(p,p);if(rr>1.07){gl_FragColor=vec4(0.);return;}
    if(rr>1.){float a=(1.-smoothstep(1.,1.07,rr))*.26;gl_FragColor=vec4(.5,.72,.82,a);return;}
    vec3 n=vec3(p,sqrt(1.-rr));float lon=orientation.x,lat=orientation.y;
    vec3 c=vec3(cos(lat)*cos(lon),sin(lat),cos(lat)*sin(lon));
    vec3 east=vec3(-sin(lon),0.,cos(lon));vec3 north=vec3(-sin(lat)*cos(lon),cos(lat),-sin(lat)*sin(lon));
    vec3 world=east*n.x+north*n.y+c*n.z;
    vec2 uv=vec2(.5+atan(world.z,world.x)/6.2831853,.5-asin(clamp(world.y,-1.,1.))/3.14159265);
    vec3 color=texture2D(earth,uv).rgb;
    vec3 L=normalize(vec3(-.6,.5,1.));float light=max(dot(n,L),0.);
    color*=.3+.8*light;
    float rim=pow(1.-n.z,3.);color=mix(color,vec3(.42,.66,.8),rim*.65);
    float spec=pow(max(dot(reflect(-L,n),vec3(0.,0.,1.)),0.),40.);
    color+=vec3(.95,.92,.82)*spec*.16;
    gl_FragColor=vec4(color,1.);
  }`;
  const shader = (type, source) => { const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; };
  try {
    const program = gl.createProgram(); gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Earth shader link failed'); gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const image = new Image(); image.src = 'assets/earth.jpg'; await image.decode();
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const uniforms = {}; ['resolution', 'center', 'radius', 'orientation'].forEach(k => uniforms[k] = gl.getUniformLocation(program, k));
    earthRenderer = {gl, program, uniforms, canvas, texture}; if (hiRes === 2) applyHiRes(); draw();
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); earthRenderer = null; canvas.hidden = true; svg.classList.remove('textured-earth'); });
  } catch (error) { canvas.hidden = true; }
}
const sphere = makeSvg('path', {fill: '#1c3830', stroke: '#79917d', 'stroke-width': '.7'}), grid = makeSvg('path', {fill: 'none', stroke: '#76927a', 'stroke-opacity': '.19', 'stroke-width': '.6'}), land = makeSvg('g', {});
svg.append(sphere, grid, land);

/* Pin size follows coverage: the more outlets, the bigger the badge. */
const scores = byScore.map(e => e.score), maxS = Math.max(...scores), minS = Math.min(...scores);
const weightOf = e => maxS > minS ? Math.sqrt((e.score - minS) / (maxS - minS)) : .5;
const sizeOf = e => { const t = weightOf(e); return Math.round(8 + t * (root.clientWidth <= 700 ? 3 : 5)); };
const pinNodes = new Map(), labelNodes = new Map();
events.forEach(e => {
  const b = document.createElement('button');
  b.className = 'pin'; b.dataset.tone = e.tone; b.setAttribute('aria-label', TONES[e.tone] + ': ' + e.title + ' — ' + e.place);
  b.style.setProperty('--d', sizeOf(e) + 'px'); b.style.setProperty('--fl', (1.95 - weightOf(e) * .35).toFixed(2)); b.style.setProperty('--gl', (1.4 + weightOf(e) * .1).toFixed(2)); b.style.setProperty('--tw', (-Math.random() * 7.5).toFixed(2) + 's');
  b.innerHTML = '<span class="ping"></span><span class="dot"></span>' + fig(e, 28) + '<span class="pin-tip">' + kicker(e) + '<strong>' + esc(e.title) + '</strong></span>';
  b.onclick = ev => { ev.stopPropagation(); openStory(e.id); };
  b.onmouseenter = b.onfocus = () => linkStory(e.id, false);
  b.onmouseleave = b.onblur = () => unlinkStory(e.id);
  pins.appendChild(b); pinNodes.set(e.id, b);
  const l = document.createElement('span'); l.className = 'globe-label'; l.dataset.tone = e.tone; l.textContent = e.place; labels.appendChild(l); labelNodes.set(e.id, l);
});
const graticule = d3.geoGraticule10();
function draw() {
  if (!world) return;
  const w = stage.clientWidth, h = stage.clientHeight, small = root.clientWidth <= 700;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const size = Math.min(w * (small ? .36 : .31), h * (small ? .3 : .34)) * zoom;
  const flatImg = $('#flat-earth'); flatImg.hidden = view !== 'map';
  if (view === 'globe') {
    projection = d3.geoOrthographic().rotate(rotation).translate([w * (small ? .5 : .46), h * (small ? .42 : .47)]).scale(size).clipAngle(90);
    const path = d3.geoPath(projection);
    sphere.setAttribute('d', path({type: 'Sphere'})); grid.setAttribute('d', path(graticule));
    [...land.children].forEach((p, i) => p.setAttribute('d', path(world.features[i]) || ''));
  } else {
    // Flat map: the same Earth imagery, unrolled. Pan and zoom, clamped so the map never leaves the stage.
    const R = Math.PI / 180, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    flat.k0 = Math.min((w - (small ? 16 : 48)) / (2 * Math.PI), (h - (small ? 150 : 190)) / Math.PI);
    const k = flat.k0 * flat.z;
    let tx = w / 2 - k * flat.lon * R, ty = h / 2 + k * flat.lat * R;
    tx = 2 * Math.PI * k <= w ? w / 2 : clamp(tx, w - Math.PI * k, Math.PI * k);
    ty = Math.PI * k <= h - (small ? 110 : 60) ? h / 2 + (small ? 10 : 14) : clamp(ty, h - Math.PI * k / 2, Math.PI * k / 2);
    flat.lon = (w / 2 - tx) / k / R; flat.lat = (ty - h / 2) / k / R;
    projection = d3.geoEquirectangular().scale(k).translate([tx, ty]);
    Object.assign(flatImg.style, {left: tx - Math.PI * k + 'px', top: ty - Math.PI * k / 2 + 'px', width: 2 * Math.PI * k + 'px', height: Math.PI * k + 'px'});
  }
  root.classList.toggle('zoomed', view === 'globe' && zoom > 1.5);
  if ((view === 'globe' ? zoom : flat.z) > 1.4) wantHiRes();
  drawPins(); drawEarth();
}
function drawPins() {
  if (!projection) return;
  const visible = new Set(filtered().map(e => e.id)), centre = [-rotation[0], -rotation[1]];
  const placed = [];
  events.forEach(e => {
    const b = pinNodes.get(e.id), l = labelNodes.get(e.id);
    const d = view === 'map' ? 0 : d3.geoDistance([e.lon, e.lat], centre);
    const [x, y] = projection([e.lon, e.lat]);
    const on = (visible.has(e.id) || e.id === active?.id) && (view === 'map' ? x > -8 && x < stage.clientWidth + 8 && y > -8 && y < stage.clientHeight + 8 : d < Math.PI / 2 - .04);
    b.hidden = !on; l.hidden = true;
    b.classList.toggle('is-active', e.id === active?.id);
    b.classList.toggle('is-seen', seen.has(e.id)); b.querySelector('.fig').classList.toggle('is-seen', seen.has(e.id));
    b.classList.toggle('dim', !!active && e.id !== active.id);
    if (!on) return;
    placed.push({e, b, l, x, y, ox: x, oy: y, r: sizeOf(e) / 2 + 2, edge: d});
  });
  // Declutter: nudge overlapping badges apart, never more than 30px from their true place.
  for (let it = 0; it < 6; it++) for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
    const a = placed[i], c = placed[j], dx = c.x - a.x, dy = c.y - a.y, dist = Math.hypot(dx, dy) || .01, min = a.r + c.r;
    if (dist < min) { const push = (min - dist) / 2, ux = dist > .02 ? dx / dist : Math.cos(i + j), uy = dist > .02 ? dy / dist : Math.sin(i + j); a.x -= ux * push; a.y -= uy * push; c.x += ux * push; c.y += uy * push; }
  }
  placed.forEach(p => {
    const dx = p.x - p.ox, dy = p.y - p.oy, m = Math.hypot(dx, dy);
    if (m > 30) { p.x = p.ox + dx / m * 30; p.y = p.oy + dy / m * 30; }
    p.b.style.left = p.x + 'px'; p.b.style.top = p.y + 'px';
    p.b.style.opacity = view === 'globe' && p.edge > 1.25 ? Math.max(.25, (Math.PI / 2 - p.edge) / (Math.PI / 2 - 1.25)) : '';
    p.b.classList.toggle('tip-below', p.y < 150);
  });
  // Place labels for the front-page stories, one per place, never on top of each other.
  const shown = [];
  placed.filter(p => tour.on && p.e.id === tour.current && p.edge < 1.2).forEach(p => {
    const lx = p.x + 12, ly = p.y;
    if (shown.some(s => s.name === p.e.place || (Math.abs(s.x - lx) < 90 && Math.abs(s.y - ly) < 16))) return;
    shown.push({name: p.e.place, x: lx, y: ly}); p.l.hidden = false; p.l.style.left = lx + 'px'; p.l.style.top = ly + 'px';
  });
}
function flyTo(e, z) {
  cancelAnimationFrame(animation);
  if (view === 'map') {
    const f0 = {...flat}, z1m = z ? Math.max(flat.z, 2.4) : flat.z, t0 = performance.now(), durM = reduced.matches ? 0 : 800;
    (function frame(now) { const t = durM ? Math.min(1, (now - t0) / durM) : 1, k = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; flat.z = f0.z + (z1m - f0.z) * k; flat.lon = f0.lon + (e.lon - f0.lon) * k; flat.lat = f0.lat + (e.lat - f0.lat) * k; draw(); if (t < 1) animation = requestAnimationFrame(frame); })(t0);
    return;
  }
  const from = [...rotation], target = [-e.lon, Math.max(-60, Math.min(60, -e.lat)) , 0], z0 = zoom, z1 = z ?? zoom;
  while (target[0] - from[0] > 180) target[0] -= 360; while (target[0] - from[0] < -180) target[0] += 360;
  const start = performance.now(), dur = reduced.matches ? 0 : 900;
  (function frame(now) { const t = dur ? Math.min(1, (now - start) / dur) : 1, k = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; rotation = from.map((v, i) => v + (target[i] - v) * k); zoom = z0 + (z1 - z0) * k; draw(); if (t < 1) animation = requestAnimationFrame(frame); })(start);
}
function zoomTo(z) { const z0 = zoom, start = performance.now(); (function f(now) { const t = Math.min(1, (now - start) / 500); zoom = z0 + (z - z0) * t; draw(); if (t < 1) requestAnimationFrame(f); })(start); }

$$('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view; root.classList.toggle('world-map-mode', view === 'map'); cancelAnimationFrame(animation); $$('[data-view]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); $$('#map-hints span').forEach((h, i) => { if (HINTS[view][i]) h.lastChild.textContent = HINTS[view][i]; }); draw(); });
function zoomFlat(f, px, py) {
  const w = stage.clientWidth, h = stage.clientHeight, R = Math.PI / 180; px ??= w / 2; py ??= h / 2;
  const at = projection.invert([px, py]); flat.z = Math.max(1, Math.min(6, flat.z * f));
  const k = flat.k0 * flat.z; flat.lon = at[0] - (px - w / 2) / (k * R); flat.lat = at[1] + (py - h / 2) / (k * R); draw();
}
const HINTS = {globe: ['Orbit', 'Zoom'], map: ['Pan', 'Zoom']};
$('#zoom-in').onclick = () => { resumeAt = performance.now() + 2000; cancelAnimationFrame(animation); if (view === 'map') return zoomFlat(1.5); zoom = Math.min(ZMAX, zoom * 1.3); draw(); };
$('#zoom-out').onclick = () => { resumeAt = performance.now() + 2000; cancelAnimationFrame(animation); if (view === 'map') return zoomFlat(1 / 1.5); zoom = Math.max(.7, zoom / 1.3); draw(); };
$('#reset-map').onclick = () => { cancelAnimationFrame(animation); if (view === 'map') { flat.z = 1; flat.lon = 0; flat.lat = 0; } else { rotation = [-16, -18, 0]; zoom = 1; } draw(); };
$('#orbit-speed').oninput = e => { orbitSpeed = Number(e.target.value); $('#speed-value').textContent = orbitSpeed.toFixed(1) + '° / s'; };
let drag = null;
stage.addEventListener('pointerdown', e => { if (e.target.closest('button') || drag) return; tour.stop(true); cancelAnimationFrame(animation); drag = {id: e.pointerId, x: e.clientX, y: e.clientY, r: [...rotation], f: {...flat}}; stage.setPointerCapture(e.pointerId); });
stage.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; if (view === 'map') { const k = flat.k0 * flat.z * Math.PI / 180; flat.lon = drag.f.lon - (e.clientX - drag.x) / k; flat.lat = drag.f.lat + (e.clientY - drag.y) / k; draw(); return; } rotation = [drag.r[0] + (e.clientX - drag.x) * .28 / zoom, Math.max(-80, Math.min(80, drag.r[1] - (e.clientY - drag.y) * .28 / zoom)), 0]; draw(); });
const end = e => { if (drag?.id === e.pointerId) { drag = null; resumeAt = performance.now() + 2000; } };
stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
stage.addEventListener('wheel', e => { if (root.clientWidth < 701) return; e.preventDefault(); resumeAt = performance.now() + 2000; if (view === 'map') { tour.stop(true); cancelAnimationFrame(animation); const b = stage.getBoundingClientRect(); return zoomFlat(Math.exp(-e.deltaY * .0015), e.clientX - b.left, e.clientY - b.top); } zoom = Math.max(.7, Math.min(ZMAX, zoom * Math.exp(-e.deltaY * .0015))); draw(); }, {passive: false});

/* ---------- tour: a gentle ticker through the top stories ---------- */
const DWELL = 6500;
const tour = {
  on: false, current: null, queue: [], i: 0, timer: null, bar: null, userStopped: false,
  rebuild() { const list = filtered(); const unread = list.filter(e => !seen.has(e.id)); this.queue = (unread.length >= 3 ? unread : list).slice(0, 8); },
  start() {
    if (!world || active) return;
    this.rebuild(); if (!this.queue.length) return;
    this.on = true; this.i = 0; this.userStopped = false;
    $('#tour-toggle').setAttribute('aria-pressed', 'true'); $('#tour-label').textContent = 'Pause tour';
    this.show();
  },
  show() {
    clearTimeout(this.timer);
    const e = this.queue[this.i % this.queue.length]; if (!e) return this.stop(); this.current = e.id;
    $$('.pin.is-tour').forEach(p => p.classList.remove('is-tour')); pinNodes.get(e.id)?.classList.add('is-tour');
    const card = $('#tour-card'); card.hidden = false; card.dataset.tone = e.tone; card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    $('#tour-kicker').innerHTML = kicker(e, true); $('#tour-title').textContent = e.title; $('#tour-summary').textContent = firstSentence(e.what);
    $('#tour-step').textContent = (this.i % this.queue.length + 1) + ' of ' + this.queue.length + ' top stories';
    $('#tour-open').dataset.id = e.id;
    flyTo(e);
    this.bar?.cancel(); this.bar = $('#tour-bar').animate([{width: '0%'}, {width: '100%'}], {duration: DWELL, easing: 'linear'});
    this.timer = setTimeout(() => this.next(), DWELL);
  },
  next() { this.i++; this.show(); },
  hold() { clearTimeout(this.timer); this.bar?.pause(); },
  release() { if (!this.on) return; const left = this.bar ? DWELL - (this.bar.currentTime || 0) : DWELL; this.bar?.play(); clearTimeout(this.timer); this.timer = setTimeout(() => this.next(), Math.max(800, left)); },
  stop(byUser) {
    if (!this.on) return;
    this.on = false; this.current = null; clearTimeout(this.timer); this.bar?.cancel();
    if (byUser) this.userStopped = true;
    $$('.pin.is-tour').forEach(p => p.classList.remove('is-tour'));
    $('#tour-card').hidden = true; $('#tour-toggle').setAttribute('aria-pressed', 'false'); $('#tour-label').textContent = this.userStopped ? 'Resume tour' : 'Play tour';
  }
};
$('#tour-toggle').onclick = () => tour.on ? tour.stop(true) : tour.start();
$('#tour-next').onclick = () => tour.next();
$('#tour-open').onclick = () => { const id = $('#tour-open').dataset.id; if (id) openStory(id); };
$('#tour-card').addEventListener('pointerenter', () => tour.hold()); $('#tour-card').addEventListener('pointerleave', () => tour.release());

/* ---------- ambient orbit when nothing else is happening ---------- */
let mapVisible = true, last = 0;
new IntersectionObserver(en => { mapVisible = en[0].isIntersecting; }, {threshold: .1}).observe(stage);
function frame(now) {
  requestAnimationFrame(frame);
  if (now - last < 33) return; const dt = Math.min(100, now - (last || now)); last = now;
  const idle = world && !reduced.matches && !document.hidden && mapVisible && view === 'globe' && !active && !drag && !tour.on && !linked && now > resumeAt && orbitSpeed > 0 && !pins.querySelector('.pin:hover');
  if (!idle) return;
  rotation[0] = (rotation[0] + dt * orbitSpeed / zoom / 1000) % 360; draw();
}

/* ---------- start ---------- */
renderFront(); progress(false); new ResizeObserver(draw).observe(stage);
try {
  const r = await fetch('data/world.json'); if (!r.ok) throw Error();
  world = await r.json(); world.features = world.features.filter(f => f.id !== '010');
  world.features.forEach(() => land.appendChild(makeSvg('path', {fill: '#355349', stroke: '#8fa88d', 'stroke-width': '.5', 'stroke-opacity': '.6'})));
  $('#map-loading').hidden = true;
  const lead = filtered()[0]; if (lead) rotation = [-lead.lon + 25, Math.max(-40, Math.min(40, -lead.lat * .6)), 0];
  draw();
} catch (e) { $('#map-loading').textContent = 'The map could not load. You can still read every story on the left.'; }
requestAnimationFrame(frame);
initEarth();
// Start the tour shortly after arrival, unless the reader has asked for less motion.
if (!reduced.matches) setTimeout(() => { if (!active && !linked && !drag && !tour.userStopped) tour.start(); }, 2500);
})();
