/* Game Inventory — interfaz */

const $ = (s) => document.querySelector(s);
const state = { q: '', filter: 'all', offset: 0, limit: 60, total: 0 };
let timer = null;

init();

async function init() {
    $('#q').addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => { state.q = $('#q').value.trim(); load(true); }, 250);
    });
    $('#more').addEventListener('click', () => { state.offset += state.limit; load(false); });
    $('#sync').addEventListener('click', runSync);
    $('#nav-open').addEventListener('click', () => toggleNav(true));
    $('#nav-close').addEventListener('click', () => toggleNav(false));
    $('#scrim').addEventListener('click', () => toggleNav(false));
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== $('#q')) { e.preventDefault(); $('#q').focus(); }
        if (e.key === 'Escape') toggleNav(false);
    });

    await refreshStats();
    load(true);
}

function toggleNav(open) {
    $('#sidebar').classList.toggle('open', open);
    $('#scrim').hidden = !open;
}

/* ------------------------------------------------------------------- HUD */
async function refreshStats() {
    let s;
    try {
        s = await (await fetch('api/stats')).json();
    } catch (e) {
        $('#sync-info').textContent = 'Sin conexión con la API';
        return;
    }

    $('#hud').innerHTML = `
    <div class="cell"><div class="k">Juegos</div><div class="v">${s.unique_games}</div></div>
    <div class="cell alt"><div class="k">Repetidos</div><div class="v">${s.duplicates}</div></div>
    <div class="cell wide"><div class="k">Horas jugadas</div>
      <div class="v">${s.playtime_hours} h · ${s.entries} entradas</div></div>`;

    const items = [
        { id: 'all', label: 'Todos', n: s.unique_games },
        { id: 'dupes', label: 'Repetidos', n: s.duplicates },
    ];
    const stores = s.per_store.map((x) => ({ id: x.store, label: x.label, n: x.count }));

    $('#nav').innerHTML =
        `<div class="nav-label">Biblioteca</div>` +
        items.map(navBtn).join('') +
        `<div class="nav-label">Tiendas</div>` +
        stores.map(navBtn).join('');

    $('#nav').querySelectorAll('button').forEach((b) =>
        b.addEventListener('click', () => {
            state.filter = b.dataset.f;
            $('#nav').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
            $('#section-title').textContent =
                { all: 'Todos los juegos', dupes: 'Repetidos entre tiendas' }[b.dataset.f]
                || b.querySelector('span.lbl').textContent;
            toggleNav(false);
            load(true);
        }));

    const failed = (s.last_syncs || []).filter((r) => !r.ok);
    const last = (s.last_syncs || [])[0];
    $('#sync-info').innerHTML =
        (last ? `último: ${esc(last.store)} · ${esc((last.ran_at || '').slice(0, 16).replace('T', ' '))}<br>` : '') +
        (s.igdb ? `igdb: ${s.matched_igdb} resueltos` : 'igdb: desactivado') +
        (failed.length ? `<br><span style="color:#fb7185">${failed.length} sync con error</span>` : '');
}

function navBtn(x) {
    return `<button data-f="${esc(x.id)}" class="${state.filter === x.id ? 'on' : ''}">
    <span class="ico"></span><span class="lbl">${esc(x.label)}</span><span class="n">${x.n}</span>
  </button>`;
}

/* ----------------------------------------------------------------- datos */
async function load(reset) {
    if (reset) { state.offset = 0; $('#grid').innerHTML = ''; }
    const p = new URLSearchParams({ q: state.q, limit: state.limit, offset: state.offset });
    if (state.filter === 'dupes') p.set('dupes', 'true');
    else if (state.filter !== 'all') p.set('store', state.filter);

    try {
        const r = await fetch('api/games?' + p);
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || r.status);
        state.total = d.count;
        $('#grid').insertAdjacentHTML('beforeend', d.items.map(card).join(''));
        if (!d.count) $('#grid').innerHTML = '<p class="empty">// sin resultados</p>';
        $('#count').textContent = d.count
            ? `${Math.min(state.offset + state.limit, d.count)} / ${d.count}` : '';
        $('#more').hidden = state.offset + state.limit >= d.count;
    } catch (e) {
        $('#grid').innerHTML = `<p class="empty" style="color:#fb7185">// error: ${esc(e.message)}</p>`;
    }
}

function card(g) {
    const dupe = g.store_count > 1;
    const tags = g.copies.map((c) =>
        `<span class="tag ${esc(c.store)}">${esc(c.store_label)}${c.platform ? ' · ' + esc(c.platform) : ''}</span>`
    ).join('');
    const hours = g.playtime_min >= 60 ? `${Math.round(g.playtime_min / 60)}h` : '';
    const variants = [...new Set(g.copies.map((c) => c.raw_title))];
    const meta = [hours, variants.length > 1 ? `${variants.length} ediciones` : '']
        .filter(Boolean).join('  //  ');

    return `<article class="card ${dupe ? 'dupe' : ''}" title="${esc(variants.join('\n'))}">
    ${g.cover ? `<img class="cover" loading="lazy" src="${esc(g.cover)}" alt="">`
            : '<div class="cover"></div>'}
    <div class="info">
      <div class="title">${esc(g.title)}</div>
      ${meta ? `<div class="meta">${esc(meta)}</div>` : ''}
      <div class="tags">${dupe ? '<span class="tag dupe">Repetido</span>' : ''}${tags}</div>
    </div></article>`;
}

/* ------------------------------------------------------------------ sync */
async function runSync() {
    const btn = $('#sync');
    const label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="dot"></span> Sincronizando…';
    try {
        const d = await (await fetch('api/sync', { method: 'POST' })).json();
        btn.innerHTML = `<span class="dot"></span> ${d.ok ? 'Listo' : 'Con errores'}`;
        await refreshStats();
        load(true);
    } catch (e) {
        btn.innerHTML = '<span class="dot"></span> Error';
    }
    setTimeout(() => { btn.disabled = false; btn.innerHTML = label; }, 2500);
}

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}