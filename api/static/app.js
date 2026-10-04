/* Game Inventory — Interface Controller */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const STORE_ICONS = {
    steam: `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2A10 10 0 0 0 2 12c0 4.49 2.96 8.28 7.07 9.54l2.45-3.5a3.5 3.5 0 0 1 1.77.34l3.19 1.34c.78.33 1.68-.04 2.01-.82.33-.78-.04-1.68-.82-2.01l-2.92-1.23a3.5 3.5 0 0 1-4.75-2.06L8 14.15A3.48 3.48 0 0 1 4.5 12a3.5 3.5 0 0 1 6.55-1.74l3.32-2.37A10.02 10.02 0 0 0 12 2zm-7.5 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/></svg>`,
    psn: `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M8.56 16.79l-4.14-1.5c-1.07-.39-1.54-1.03-1.54-1.77 0-1.12.98-1.9 2.52-1.9 1.15 0 2.29.35 3.16.82l-3.32.96v.92l3.32 2.47zm3.84 2.21l-3.84-1.4v-1.13l3.84 1.4v1.13zm.6-14.5v12.23l4.31.69c.89.15 1.5.65 1.5 1.48 0 .96-.86 1.52-2.3 1.52-1.26 0-2.61-.43-3.51-1.03l.85-2.06 4.96.95v-1.03l-5.81-1.03V4.5l-3.21 1.25V4.5l3.21-1.25z"/></svg>`,
    epic: `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M4 2h16l-2 17-6 3-6-3L4 2zm3.5 4v9.5l4.5 2.25 4.5-2.25V6H7.5zm2 2h5v2h-3v2.2h2.5v1.8H11.5V14h3v2h-5V8z"/></svg>`,
    xbox: `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-4.3 4.14c.95 0 2.87 2.11 4.3 3.96 1.43-1.85 3.35-3.96 4.3-3.96a7.92 7.92 0 0 1 4.56 4.56c0 1.24-2.23 3.73-4.36 6.07a8 8 0 0 1-4.5 2.23 8 8 0 0 1-4.5-2.23c-2.13-2.34-4.36-4.83-4.36-6.07A7.92 7.92 0 0 1 7.7 6.14z"/></svg>`,
    gog: `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2A10 10 0 1 0 22 12 10 10 0 0 0 12 2zm1 14.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm-2-4.5a2.5 2.5 0 1 0 2.5-2.5A2.5 2.5 0 0 0 11 12z"/></svg>`,
    manual: `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H9v2H7v-2H5v-2h2V9h2v2h2v2zm4.5 1c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-3c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`
};

const GAMEPAD_ICON = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H9v2H7v-2H5v-2h2V9h2v2h2v2zm4.5 1c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-3c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`;

const state = {
    q: '',
    filter: 'all',
    offset: 0,
    limit: 60,
    total: 0,
    view: 'grid',
    sort: 'name-asc',
    items: [],
    stats: null
};

let debounceTimer = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Search listener
    const searchInput = $('#q');
    const clearBtn = $('#clear-search');

    searchInput.addEventListener('input', () => {
        clearBtn.hidden = !searchInput.value.trim();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            state.q = searchInput.value.trim();
            load(true);
        }, 250);
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.hidden = true;
        state.q = '';
        load(true);
    });

    // View toggle listeners
    $$('#view-toggle .view-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            $$('#view-toggle .view-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            state.view = btn.dataset.view;
            const gridEl = $('#grid');
            gridEl.className = `grid view-${state.view}`;
            renderItems();
        });
    });

    // Sort listener
    $('#sort-select').addEventListener('change', (e) => {
        state.sort = e.target.value;
        sortItems();
        renderItems();
    });

    // More button listener
    $('#more').addEventListener('click', () => {
        state.offset += state.limit;
        load(false);
    });

    // Sync button listener
    $('#sync').addEventListener('click', runSync);

    // Nav mobile toggles
    $('#nav-open').addEventListener('click', () => toggleNav(true));
    $('#nav-close').addEventListener('click', () => toggleNav(false));
    $('#scrim').addEventListener('click', () => toggleNav(false));

    // Modal close listeners
    $('#modal-close').addEventListener('click', closeModal);
    $('#modal-backdrop').addEventListener('click', (e) => {
        if (e.target === $('#modal-backdrop')) closeModal();
    });

    // Global Hotkeys
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
        if (e.key === 'Escape') {
            toggleNav(false);
            closeModal();
        }
    });

    await refreshStats();
    load(true);
}

function toggleNav(open) {
    $('#sidebar').classList.toggle('open', open);
    $('#scrim').hidden = !open;
}

/* ---------------------------------------------------------------- HUD Stats & Nav */
async function refreshStats() {
    let s;
    try {
        const res = await fetch('api/stats');
        s = await res.json();
        state.stats = s;
    } catch (e) {
        $('#sync-info').textContent = '⚠️ Sin conexión con la API';
        return;
    }

    // Render HUD metric cards
    $('#hud').innerHTML = `
        <div class="cell">
            <div class="k">Juegos</div>
            <div class="v">${s.unique_games}</div>
        </div>
        <div class="cell alt">
            <div class="k">Repetidos</div>
            <div class="v">${s.duplicates}</div>
        </div>
        <div class="cell wide">
            <div class="k">Horas Jugadas</div>
            <div class="v">${Math.round(s.playtime_hours)} h <span style="font-size:11px;opacity:0.7">(${s.entries} títulos)</span></div>
        </div>
    `;

    // Render navigation list
    const items = [
        { id: 'all', label: 'Todos los Juegos', n: s.unique_games, icon: 'manual' },
        { id: 'dupes', label: 'Repetidos', n: s.duplicates, icon: 'manual' },
    ];
    const stores = s.per_store.map((x) => ({ id: x.store, label: x.label, n: x.count, icon: x.store }));

    $('#nav').innerHTML =
        `<div class="nav-label">Biblioteca</div>` +
        items.map(navBtn).join('') +
        `<div class="nav-label">Tiendas Sync</div>` +
        stores.map(navBtn).join('');

    // Attach listener to nav buttons
    $('#nav').querySelectorAll('button').forEach((b) =>
        b.addEventListener('click', () => {
            setFilter(b.dataset.f, b.querySelector('.lbl').textContent);
            toggleNav(false);
        })
    );

    // Render Quick Filters Bar
    const quickChips = [
        { id: 'all', label: 'Todos', n: s.unique_games },
        { id: 'dupes', label: '⚡ Repetidos', n: s.duplicates },
        ...s.per_store.map((x) => ({ id: x.store, label: x.label, n: x.count }))
    ];

    $('#quick-filters').innerHTML = quickChips.map((c) => `
        <button class="quick-chip ${state.filter === c.id ? 'active' : ''}" data-f="${esc(c.id)}">
            <span>${esc(c.label)}</span>
            <span class="chip-count">(${c.n})</span>
        </button>
    `).join('');

    $('#quick-filters').querySelectorAll('.quick-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const filterId = chip.dataset.f;
            const targetNav = Array.from($('#nav').querySelectorAll('button')).find((b) => b.dataset.f === filterId);
            const label = targetNav ? targetNav.querySelector('.lbl').textContent : chip.textContent;
            setFilter(filterId, label);
        });
    });

    // Update last sync diagnostics
    const failed = (s.last_syncs || []).filter((r) => !r.ok);
    const last = (s.last_syncs || [])[0];
    $('#sync-info').innerHTML =
        (last ? `Último: <strong style="color:var(--cyan)">${esc(last.store)}</strong> · ${esc((last.ran_at || '').slice(0, 16).replace('T', ' '))}<br>` : '') +
        (s.igdb ? `IGDB: ${s.matched_igdb} resueltos` : 'IGDB: Standby') +
        (failed.length ? `<br><span style="color:#ff007f;font-weight:600">${failed.length} error(es) en sync</span>` : '');
}

function navBtn(x) {
    const iconSvg = STORE_ICONS[x.icon] || STORE_ICONS.manual;
    return `
        <button data-f="${esc(x.id)}" class="${state.filter === x.id ? 'on' : ''}">
            <span class="ico">${iconSvg}</span>
            <span class="lbl">${esc(x.label)}</span>
            <span class="n">${x.n}</span>
        </button>
    `;
}

function setFilter(filterId, labelText) {
    state.filter = filterId;
    
    // Update nav states
    $('#nav').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.f === filterId));
    $('#quick-filters').querySelectorAll('.quick-chip').forEach((x) => x.classList.toggle('active', x.dataset.f === filterId));

    $('#section-title').textContent = labelText || 'Juegos';
    load(true);
}

/* ---------------------------------------------------------------- Data Fetching */
async function load(reset) {
    if (reset) {
        state.offset = 0;
        state.items = [];
        $('#grid').innerHTML = '<div class="empty">// CARGANDO BASE DE DATOS...</div>';
    }

    const p = new URLSearchParams({ q: state.q, limit: state.limit, offset: state.offset });
    if (state.filter === 'dupes') p.set('dupes', 'true');
    else if (state.filter !== 'all') p.set('store', state.filter);

    try {
        const r = await fetch('api/games?' + p);
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || r.status);
        
        state.total = d.count;
        if (reset) {
            state.items = d.items;
        } else {
            state.items = [...state.items, ...d.items];
        }

        sortItems();
        renderItems();

        if (!d.count) {
            $('#grid').innerHTML = '<p class="empty">// SIN COINCIDENCIAS REGISTRADAS</p>';
        }

        $('#count').textContent = d.count
            ? `${Math.min(state.offset + state.limit, d.count)} / ${d.count}` : '0 / 0';
        $('#more').hidden = state.offset + state.limit >= d.count;

    } catch (e) {
        $('#grid').innerHTML = `<p class="empty" style="color:#ff007f">// ERROR SISTEMA: ${esc(e.message)}</p>`;
    }
}

function sortItems() {
    switch (state.sort) {
        case 'name-asc':
            state.items.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'name-desc':
            state.items.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case 'playtime-desc':
            state.items.sort((a, b) => (b.playtime_min || 0) - (a.playtime_min || 0));
            break;
        case 'stores-desc':
            state.items.sort((a, b) => (b.store_count || 0) - (a.store_count || 0) || a.title.localeCompare(b.title));
            break;
    }
}

function renderItems() {
    const container = $('#grid');
    if (!state.items.length) return;

    if (state.view === 'list') {
        container.innerHTML = state.items.map(listRow).join('');
    } else {
        container.innerHTML = state.items.map(card).join('');
    }

    // Attach click listeners to cards for Modal
    container.querySelectorAll('.card').forEach((cardEl, idx) => {
        cardEl.addEventListener('click', () => {
            const game = state.items[idx];
            if (game) openModal(game);
        });
    });
}

function card(g) {
    const dupe = g.store_count > 1;
    const tags = g.copies.map((c) => {
        const icon = STORE_ICONS[c.store] || STORE_ICONS.manual;
        return `<span class="tag ${esc(c.store)}">${icon} ${esc(c.store_label)}${c.platform ? ' · ' + esc(c.platform) : ''}</span>`;
    }).join('');
    
    const hours = g.playtime_min >= 60 ? `${Math.round(g.playtime_min / 60)}h` : '';
    const variants = [...new Set(g.copies.map((c) => c.raw_title))];
    
    const coverHtml = g.cover 
        ? `<img class="cover" loading="lazy" src="${esc(g.cover)}" alt="${esc(g.title)}">`
        : `<div class="cover-fallback">${GAMEPAD_ICON}</div>`;

    return `
        <article class="card ${dupe ? 'dupe' : ''}">
            <div class="cover-wrapper">${coverHtml}</div>
            <div class="info">
                <div class="title">${esc(g.title)}</div>
                <div class="meta-row">
                    ${hours ? `<span class="meta-item">🎮 ${hours}</span>` : ''}
                    ${variants.length > 1 ? `<span class="meta-item">📦 ${variants.length} ed.</span>` : ''}
                </div>
                <div class="tags">
                    ${dupe ? '<span class="tag dupe">⚡ REPETIDO</span>' : ''}
                    ${tags}
                </div>
            </div>
        </article>
    `;
}

function listRow(g) {
    const dupe = g.store_count > 1;
    const tags = g.copies.map((c) => {
        const icon = STORE_ICONS[c.store] || STORE_ICONS.manual;
        return `<span class="tag ${esc(c.store)}">${icon} ${esc(c.store_label)}</span>`;
    }).join('');

    const hours = g.playtime_min >= 60 ? `${Math.round(g.playtime_min / 60)}h` : '—';
    const coverHtml = g.cover 
        ? `<img class="cover" loading="lazy" src="${esc(g.cover)}" alt="">`
        : `<div class="cover-fallback" style="font-size:14px">${GAMEPAD_ICON}</div>`;

    return `
        <article class="card ${dupe ? 'dupe' : ''}">
            <div class="cover-wrapper">${coverHtml}</div>
            <div class="info">
                <div class="title">${esc(g.title)}</div>
                <div class="meta-row">
                    <span class="meta-item">🎮 ${hours}</span>
                </div>
                <div class="tags">
                    ${dupe ? '<span class="tag dupe">⚡ REPETIDO</span>' : ''}
                    ${tags}
                </div>
            </div>
        </article>
    `;
}

/* ------------------------------------------------------------- Modal Popup */
function openModal(g) {
    const backdrop = $('#modal-backdrop');
    const body = $('#modal-body');
    const dupe = g.store_count > 1;
    
    const coverHtml = g.cover 
        ? `<img class="modal-cover" src="${esc(g.cover)}" alt="${esc(g.title)}">`
        : `<div class="cover-fallback" style="height:100%">${GAMEPAD_ICON}</div>`;

    const copyItemsHtml = g.copies.map((c) => {
        const icon = STORE_ICONS[c.store] || STORE_ICONS.manual;
        const timeStr = c.playtime_min >= 60 ? `${Math.round(c.playtime_min / 60)} horas` : (c.playtime_min > 0 ? `${c.playtime_min} min` : 'Sin registrar');
        return `
            <div class="copy-item">
                <div class="copy-left">
                    <span class="tag ${esc(c.store)}" style="font-size:12px;padding:6px 10px">${icon} ${esc(c.store_label)}</span>
                    <div class="copy-details">
                        <div class="copy-store-name">${esc(c.raw_title || g.title)}</div>
                        <div class="copy-platform">Plataforma: <strong>${esc(c.platform || 'Digital')}</strong></div>
                    </div>
                </div>
                <div class="copy-right">
                    ⏱ ${timeStr}
                </div>
            </div>
        `;
    }).join('');

    body.innerHTML = `
        <div class="modal-hero">
            <div class="modal-cover-wrap">${coverHtml}</div>
            <div class="modal-title-box">
                <div class="modal-title">${esc(g.title)}</div>
                <div class="modal-subtitle">Registrado en ${g.store_count} tienda(s)</div>
                ${dupe ? `
                    <div class="modal-dupe-alert">
                        ⚡ ¡Atención! Posees este título en múltiples plataformas.
                    </div>
                ` : ''}
            </div>
        </div>

        <div class="modal-section-heading">EDICIONES Y LICENCIAS ADQUIRIDAS</div>
        <div class="copies-list">
            ${copyItemsHtml}
        </div>

        <div class="modal-actions">
            <a href="https://www.google.com/search?q=${encodeURIComponent(g.title + ' game')}" target="_blank" rel="noopener" class="modal-btn">
                🔍 Buscar Ficha en Web
            </a>
            <a href="https://www.igdb.com/search?q=${encodeURIComponent(g.title)}" target="_blank" rel="noopener" class="modal-btn">
                🎮 Ver en IGDB
            </a>
        </div>
    `;

    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const backdrop = $('#modal-backdrop');
    backdrop.hidden = true;
    document.body.style.overflow = '';
}

/* ------------------------------------------------------------- Sync Trigger */
async function runSync() {
    const btn = $('#sync');
    const originalContent = btn.innerHTML;
    
    btn.disabled = true;
    btn.classList.add('syncing');
    btn.innerHTML = '<span class="dot"></span> <span class="sync-text">Sincronizando...</span>';

    try {
        const res = await fetch('api/sync', { method: 'POST' });
        const d = await res.json();
        btn.innerHTML = `<span class="dot"></span> <span class="sync-text">${d.ok ? '✓ Completado' : '❌ Con Errores'}</span>`;
        await refreshStats();
        load(true);
    } catch (e) {
        btn.innerHTML = '<span class="dot"></span> <span class="sync-text">❌ Error Red</span>';
    }

    setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove('syncing');
        btn.innerHTML = originalContent;
    }, 2500);
}

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}