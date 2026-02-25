// ==UserScript==
// @name         HDEncode Filter Suite
// @namespace    https://hdencode.org/
// @version      1.1
// @description  A Tampermonkey userscript that adds powerful filtering, searching and multi-page loading to HDEncode.org
// @author       mikeymuis
// @homepage     https://github.com/mikeymuis/hdencode-filter-suite
// @supportURL   https://github.com/mikeymuis/hdencode-filter-suite/issues
// @updateURL    https://raw.githubusercontent.com/mikeymuis/hdencode-filter-suite/main/hdencode-filter-suite.user.js
// @downloadURL  https://raw.githubusercontent.com/mikeymuis/hdencode-filter-suite/main/hdencode-filter-suite.user.js
// @match        *://hdencode.org/*
// @match        *://www.hdencode.org/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ─── Script constants ─────────────────────────────────────────────────────

    const SCRIPT_NAME    = 'HDEncode Filter Suite';
    const SCRIPT_VERSION = '1.1';
    const SCRIPT_ID      = 'hdencode-filter-suite';

    // ─── Helpers: item data extraction ───────────────────────────────────────

    function hasDV(item) {
        const span = item.querySelector('.imdb_r span');
        return !!span && span.getAttribute('style')?.includes('dv.png');
    }

    function hasHDR(item) {
        return item.querySelector('.buttonhdr') !== null;
    }

    function getRating(item) {
        const match = item.innerText.match(/Rating\s*:\s*(\d+\.\d+)\/10/i);
        return match ? parseFloat(match[1]) : 0;
    }

    function getSize(item) {
        const title = item.querySelector('h5')?.innerText || '';
        const match = title.match(/–\s*(\d+(\.\d+)?)\s*GB/i);
        return match ? parseFloat(match[1]) : null;
    }

    function getGroup(item) {
        const title = item.querySelector('h5')?.innerText || '';
        const clean = title.replace(/\s*–\s*[\d.]+\s*(GB|MB)\s*$/i, '').trim();
        const parts = clean.split('-');
        return parts.length > 1 ? parts.pop().trim() : '';
    }

    function getResolution(item) {
        for (const span of item.querySelectorAll('.calidad3')) {
            if (span.innerText.match(/\d{3,4}p/i)) return span.innerText.trim();
        }
        return '';
    }

    function getCategory(item) {
        // Check .calidad4 links for tv-shows and tv-packs
        // Items without .calidad4 are movies
        const links = Array.from(item.querySelectorAll('.calidad4 a'));
        const hrefs = links.map(a => a.href || a.getAttribute('href') || '');
        if (hrefs.some(h => h.includes('tv-packs'))) return 'tv-packs';
        if (hrefs.some(h => h.includes('tv-shows'))) return 'tv-shows';
        return 'movies';
    }

    // ─── Release group dropdown ───────────────────────────────────────────────

    function buildGroupDropdown(container) {
        const select = document.getElementById('f-group');
        if (!select) return;

        const current = select.value;

        const groups = new Set();
        for (const item of container.querySelectorAll('.fit.item')) {
            if (item.style.display === 'none') continue;
            const g = getGroup(item);
            if (g) groups.add(g);
        }

        const sorted = Array.from(groups).sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase())
        );

        select.innerHTML = '<option value="">All groups</option>';
        for (const g of sorted) {
            const opt = document.createElement('option');
            opt.value = g.toLowerCase();
            opt.textContent = g;
            select.appendChild(opt);
        }

        if (current && Array.from(select.options).some(o => o.value === current)) {
            select.value = current;
        }
    }

    // ─── Filter logic ─────────────────────────────────────────────────────────

    function getFilterValues() {
        return {
            onlyDV:    document.getElementById('f-dv')?.checked || false,
            onlyHDR:   document.getElementById('f-hdr')?.checked || false,
            res:       document.getElementById('f-res')?.value || '',
            category:  document.getElementById('f-category')?.value || '',
            minRating: parseFloat(document.getElementById('f-rating')?.value) || 0,
            minSize:   parseFloat(document.getElementById('f-minsize')?.value) || 0,
            maxSize:   parseFloat(document.getElementById('f-maxsize')?.value) || Infinity,
            group:     (document.getElementById('f-group')?.value || '').toLowerCase().trim(),
            search:    (document.getElementById('f-search')?.value || '').toLowerCase().trim(),
        };
    }

    function itemMatchesFilters(item, f) {
        if (f.onlyDV && !hasDV(item)) return false;
        if (f.onlyHDR && !hasHDR(item)) return false;
        if (f.res && getResolution(item) !== f.res) return false;
        if (f.category && getCategory(item) !== f.category) return false;
        if (getRating(item) < f.minRating) return false;
        const size = getSize(item);
        if (size !== null && (size < f.minSize || size > f.maxSize)) return false;
        if (f.group && getGroup(item).toLowerCase() !== f.group) return false;
        if (f.search && !item.innerText.toLowerCase().includes(f.search)) return false;
        return true;
    }

    function applyFilters(container) {
        const f = getFilterValues();
        const items = Array.from(container.querySelectorAll('.fit.item'));

        // Pass 1: filter without group — determines which items are visible for the dropdown
        for (const item of items) {
            item.style.display = itemMatchesFilters(item, { ...f, group: '' }) ? '' : 'none';
        }

        // Only rebuild the group dropdown when no group is selected —
        // otherwise the current selection disappears from the list.
        if (!f.group) buildGroupDropdown(container);


        let visible = 0;
        for (const item of items) {
            if (item.style.display === 'none') continue;
            if (f.group && getGroup(item).toLowerCase() !== f.group) {
                item.style.display = 'none';
            } else {
                visible++;
            }
        }

        const counter = document.getElementById('f-counter');
        if (!counter) return;

        if (visible === 0 && items.length > 0) {
            const hasActiveFilters =
                f.onlyDV || f.onlyHDR || f.res || f.category ||
                f.minRating > 0 || f.minSize > 0 || f.maxSize < Infinity ||
                f.group || f.search;

            counter.innerHTML = hasActiveFilters
                ? `<span style="color:#e06c75;">No results — try adjusting your filters</span>`
                : `Showing 0 / ${items.length} releases`;
        } else {
            counter.innerHTML = `Showing ${visible} / ${items.length} releases`;
        }

        for (const el of document.querySelectorAll(`#${SCRIPT_ID}-bar input, #${SCRIPT_ID}-bar select`)) {
            if (el.id === 'f-pagelimit') continue; // not a filter, don't highlight
            const active = el.type === 'checkbox' ? el.checked : el.value !== '';
            el.style.borderColor = active ? '#00e5ff' : 'rgba(255,255,255,0.15)';
        }

        saveFilters();
    }

    // ─── LocalStorage ─────────────────────────────────────────────────────────

    function saveFilters() {
        const data = {};
        for (const el of document.querySelectorAll(`#${SCRIPT_ID}-bar input, #${SCRIPT_ID}-bar select`)) {
            if (el.id === 'f-pagelimit') continue; // always reset to "All pages" on page load
            data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
        }
        try { localStorage.setItem('hdencodeFilters', JSON.stringify(data)); } catch (_) {}
    }

    function loadFilters() {
        try {
            const data = JSON.parse(localStorage.getItem('hdencodeFilters') || '{}');
            for (const [id, val] of Object.entries(data)) {
                if (id === 'f-pagelimit') continue;
                const el = document.getElementById(id);
                if (!el) continue;
                if (el.type === 'checkbox') el.checked = val;
                else el.value = val;
            }
        } catch (_) {}
    }

    function clearFilters(container) {
        for (const el of document.querySelectorAll(`#${SCRIPT_ID}-bar input, #${SCRIPT_ID}-bar select`)) {
            if (el.id === 'f-pagelimit') el.value = 'all'; // always reset to All pag., not empty
            else if (el.type === 'checkbox') el.checked = false;
            else el.value = '';
        }
        try { localStorage.removeItem('hdencodeFilters'); } catch (_) {}
        applyFilters(container);
    }

    // ─── Quick links ──────────────────────────────────────────────────────────

    const linkCache = new Map();

    async function fetchLinks(url) {
        if (linkCache.has(url)) return linkCache.get(url);

        try {
            // Step 1: GET the detail page to get the form and its tokens
            const getRes = await fetch(url, { credentials: 'same-origin' });
            if (!getRes.ok) return null;

            const doc = new DOMParser().parseFromString(await getRes.text(), 'text/html');

            // Step 2: Find the content protector form and collect all its fields
            const form = doc.querySelector('form[id^="content-protector-access-form"]');
            if (!form) return null;

            const formData = new FormData();
            for (const input of form.querySelectorAll('input')) {
                if (input.name) formData.append(input.name, input.value);
            }

            // Step 3: POST the form to unlock the links
            const action = new URL(form.getAttribute('action'), url).href;
            const postRes = await fetch(action, {
                method: 'POST',
                credentials: 'same-origin',
                body: formData,
            });
            if (!postRes.ok) return null;

            const unlockedDoc = new DOMParser().parseFromString(await postRes.text(), 'text/html');

            // Step 4: Extract links from blockquotes inside content-protector div
            const links = [];
            for (const blockquote of unlockedDoc.querySelectorAll('.content-protector-access-form blockquote')) {
                const img = blockquote.previousElementSibling?.querySelector('img');
                const host = img?.alt || img?.src?.split('/').pop().replace(/\.(png|jpg|gif)$/i, '') || 'Link';
                for (const a of blockquote.querySelectorAll('a')) {
                    links.push({ host, url: a.href });
                }
            }

            linkCache.set(url, links);
            return links;
        } catch (e) {
            console.error(`${SCRIPT_NAME}: failed to fetch links for`, url, e);
            return null;
        }
    }

    function injectLinkButton(item) {
        if (item.querySelector('.fs-link-btn')) return;

        const h5 = item.querySelector('h5');
        if (!h5) return;

        const detailUrl = h5.querySelector('a')?.href;
        if (!detailUrl) return;

        const btn = document.createElement('span');
        btn.className = 'fs-link-btn';
        btn.title = 'Show download links';
        btn.innerHTML = '🔗 Links';
        Object.assign(btn.style, {
            cursor: 'pointer',
            marginLeft: '8px',
            fontSize: '11px',
            color: '#00e5ff',
            border: '1px solid rgba(0,229,255,0.35)',
            borderRadius: '4px',
            padding: '1px 7px',
            background: 'transparent',
            userSelect: 'none',
            verticalAlign: 'middle',
            whiteSpace: 'nowrap',
            flexShrink: '0',
        });

        const panel = document.createElement('div');
        panel.className = 'fs-link-panel';
        Object.assign(panel.style, {
            display: 'none',
            marginTop: '6px',
            padding: '8px 10px',
            background: '#161b22',
            border: '1px solid #21262d',
            borderRadius: '6px',
            fontSize: '12px',
            lineHeight: '1.8',
        });

        let open = false;

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (open) {
                panel.style.display = 'none';
                btn.style.opacity = '0.6';
                open = false;
                return;
            }

            btn.innerHTML = '⏳';
            btn.style.opacity = '1';

            const links = await fetchLinks(detailUrl);

            if (!links || links.length === 0) {
                panel.innerHTML = '<span style="color:#8b949e;">No links found.</span>';
            } else {
                const grouped = {};
                for (const l of links) {
                    if (!grouped[l.host]) grouped[l.host] = [];
                    grouped[l.host].push(l.url);
                }

                panel.innerHTML = Object.entries(grouped).map(([host, urls]) =>
                    `<div style="margin-bottom:4px;">
                        <span style="color:#8b949e; text-transform:uppercase; font-size:10px; letter-spacing:0.5px;">${host}</span><br>
                        ${urls.map(u =>
                            `<span style="display:inline-flex; align-items:center; gap:6px; margin:1px 0;">
                                <a href="${u}" target="_blank"
                                    style="color:#00e5ff; text-decoration:none; word-break:break-all;"
                                    onmouseover="this.style.textDecoration='underline'"
                                    onmouseout="this.style.textDecoration='none'"
                                >${u}</a>
                                <span class="fs-copy-btn" data-url="${u}" title="Copy link"
                                    style="cursor:pointer; font-size:11px; color:#8b949e; white-space:nowrap;
                                           padding:1px 5px; border:1px solid #30363d; border-radius:4px;
                                           user-select:none; flex-shrink:0;"
                                    onmouseover="this.style.color='#e6edf3'; this.style.borderColor='#8b949e';"
                                    onmouseout="this.style.color='#8b949e'; this.style.borderColor='#30363d';"
                                >📋</span>
                            </span>`
                        ).join('<br>')}
                    </div>`
                ).join('');
            }

            btn.innerHTML = '🔗';
            panel.style.display = 'block';
            open = true;

            // Copy button handlers
            panel.querySelectorAll('.fs-copy-btn').forEach(copyBtn => {
                copyBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const urlToCopy = copyBtn.dataset.url;
                    try {
                        await navigator.clipboard.writeText(urlToCopy);
                        copyBtn.textContent = '✓';
                        copyBtn.style.color = '#00e5ff';
                        copyBtn.style.borderColor = '#00e5ff';
                        setTimeout(() => {
                            copyBtn.textContent = '📋';
                            copyBtn.style.color = '#8b949e';
                            copyBtn.style.borderColor = '#30363d';
                        }, 1500);
                    } catch (_) {
                        copyBtn.textContent = '✗';
                        setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
                    }
                });
            });
        });

        btn.addEventListener('mouseover', () => { if (!open) btn.style.background = 'rgba(0,229,255,0.08)'; });
        btn.addEventListener('mouseout',  () => { if (!open) btn.style.background = 'transparent'; });

        h5.appendChild(btn);
        h5.after(panel);
    }

    function injectLinkButtons(container) {
        for (const item of container.querySelectorAll('.fit.item')) {
            injectLinkButton(item);
        }
    }



    const INPUT_STYLE = `
        background: #161b22;
        color: #e6edf3;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 6px;
        padding: 5px 8px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s;
        height: 30px;
        box-sizing: border-box;
    `;

    // Consistent width for all number inputs
    const NUMBER_W = 'width:88px;';

    function createBar() {
        const bar = document.createElement('div');
        bar.id = `${SCRIPT_ID}-bar`;
        Object.assign(bar.style, {
            background:   '#0d1117',
            padding:      '14px 18px',
            borderRadius: '12px',
            border:       '1px solid #21262d',
            margin:       '16px 0',
            color:        '#e6edf3',
            fontSize:     '13px',
            boxShadow:    '0 4px 20px rgba(0,0,0,0.4)',
        });

        bar.innerHTML = `
            <!-- Header row: title + counter -->
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                <strong style="color:#00e5ff; font-size:14px; letter-spacing:0.5px;">⚡ ${SCRIPT_NAME}</strong>
                <span id="f-counter" style="color:#8b949e; font-size:12px;"></span>
            </div>

            <!-- Row 1: quality filters left, category right -->
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <label style="display:flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap;">
                        <input type="checkbox" id="f-dv" style="accent-color:#00e5ff;">
                        <span>Dolby Vision</span>
                    </label>
                    <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
                        <input type="checkbox" id="f-hdr" style="accent-color:#00e5ff;">
                        <span>HDR</span>
                    </label>

                    <select id="f-res" style="${INPUT_STYLE} width:130px;">
                        <option value="">All resolutions</option>
                        <option value="2160p">2160p</option>
                        <option value="1080p">1080p</option>
                        <option value="720p">720p</option>
                    </select>

                    <input type="number" id="f-rating" placeholder="Min rating" step="0.1" min="0" max="10"
                        style="${INPUT_STYLE} ${NUMBER_W}">
                    <input type="number" id="f-minsize" placeholder="Min GB" min="0"
                        style="${INPUT_STYLE} ${NUMBER_W}">
                    <input type="number" id="f-maxsize" placeholder="Max GB" min="0"
                        style="${INPUT_STYLE} ${NUMBER_W}">
                </div>

                <!-- Category: right-aligned but visually part of row 1 -->
                <select id="f-category" style="${INPUT_STYLE} width:110px;">
                    <option value="">All</option>
                    <option value="movies">Movies</option>
                    <option value="tv-shows">TV Shows</option>
                    <option value="tv-packs">TV Packs</option>
                </select>
            </div>

            <!-- Subtle divider between rows -->
            <div style="border-top: 1px solid #21262d; margin-bottom:8px;"></div>

            <!-- Row 2: search & group left, load controls + clear right -->
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <select id="f-group" style="${INPUT_STYLE} width:150px;">
                        <option value="">All groups</option>
                    </select>
                    <input type="text" id="f-search" placeholder="Search anything..."
                        style="${INPUT_STYLE} width:180px;">
                </div>

                <div style="display:flex; align-items:center; gap:8px;">
                    <span id="f-load-status" style="color:#8b949e; font-size:12px;"></span>

                    <select id="f-pagelimit" style="${INPUT_STYLE} width:100px;">
                        <option value="all">All pages</option>
                        <option value="5">5 pages</option>
                        <option value="10">10 pages</option>
                        <option value="20">20 pages</option>
                        <option value="50">50 pages</option>
                        <option value="100">100 pages</option>
                    </select>

                    <button id="f-loadall"
                        style="background:#21262d; color:#e6edf3;
                               border:1px solid rgba(0,229,255,0.25);
                               border-radius:6px; padding:5px 12px; cursor:pointer; font-size:13px;
                               height:30px; box-sizing:border-box; transition: all 0.2s;">
                        ↓ Load pages
                    </button>

                    <!-- Subtle separator -->
                    <div style="width:1px; height:20px; background:#30363d;"></div>

                    <button id="f-clear"
                        style="background:transparent; color:#e06c75;
                               border:1px solid rgba(224,108,117,0.35);
                               border-radius:6px; padding:5px 12px; cursor:pointer; font-size:13px;
                               height:30px; box-sizing:border-box; transition: all 0.2s;">
                        ✕ Clear
                    </button>
                </div>
            </div>

            <!-- Progress bar: hidden until loading starts -->
            <div id="f-progress-wrap" style="display:none; margin-top:10px;">
                <div style="background:#21262d; border-radius:999px; height:5px; overflow:hidden;">
                    <div id="f-progress-bar"
                        style="height:100%; width:0%; background:#00e5ff;
                               border-radius:999px; transition: width 0.3s ease;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:5px;">
                    <span id="f-progress-label" style="color:#8b949e; font-size:12px;"></span>
                    <span id="f-progress-pct" style="color:#8b949e; font-size:12px;"></span>
                </div>
            </div>
        `;

        bar.addEventListener('mouseover', e => {
            if (e.target.id === 'f-loadall') {
                e.target.style.background = '#30363d';
                e.target.style.borderColor = 'rgba(0,229,255,0.5)';
            }
            if (e.target.id === 'f-clear') {
                e.target.style.background = 'rgba(224,108,117,0.12)';
                e.target.style.borderColor = 'rgba(224,108,117,0.6)';
            }
        });
        bar.addEventListener('mouseout', e => {
            if (e.target.id === 'f-loadall') {
                e.target.style.background = '#21262d';
                e.target.style.borderColor = 'rgba(0,229,255,0.25)';
            }
            if (e.target.id === 'f-clear') {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = 'rgba(224,108,117,0.35)';
            }
        });

        return bar;
    }

    // ─── Progress bar ─────────────────────────────────────────────────────────

    function showProgress() {
        document.getElementById('f-progress-wrap').style.display = 'block';
    }

    function updateProgress(loaded, total) {
        const pct = Math.round((loaded / total) * 100);
        document.getElementById('f-progress-bar').style.width = `${pct}%`;
        document.getElementById('f-progress-label').textContent = `Page ${loaded + 1} of ${total}`;
        document.getElementById('f-progress-pct').textContent = `${pct}%`;
    }

    function hideProgress() {
        // Fill bar to 100% then hide after a short pause
        document.getElementById('f-progress-bar').style.width = '100%';
        document.getElementById('f-progress-pct').textContent = '100%';
        document.getElementById('f-progress-label').textContent = 'Done!';
        setTimeout(() => {
            document.getElementById('f-progress-wrap').style.display = 'none';
            document.getElementById('f-progress-bar').style.width = '0%';
        }, 1500);
    }

    // ─── Load pages ───────────────────────────────────────────────────────────

    async function loadAllPages(container, statusEl) {
        const itemGrid = container.querySelector('.item_2.items') || container;
        const currentUrl = new URL(window.location.href);

        // Determine limit based on dropdown choice
        // We do NOT use maxPage as upper limit — HDEncode only shows 1,2,3 and "Last"
        // meaning maxPage is always 3. Instead we keep fetching until a page returns
        // no items or the chosen limit is reached.
        const limitVal = document.getElementById('f-pagelimit')?.value || 'all';
        const limit = limitVal === 'all' ? 99999 : parseInt(limitVal);

        showProgress();
        updateProgress(0, limit === 99999 ? 1 : limit);

        let loaded = 0;
        for (let p = 2; loaded < limit; p++) {
            const url = currentUrl.pathname.match(/\/page\/\d+\//)
                ? window.location.href.replace(/\/page\/\d+\//, `/page/${p}/`)
                : currentUrl.origin + currentUrl.pathname.replace(/\/$/, '') + `/page/${p}/` + currentUrl.search;

            try {
                const res = await fetch(url, { credentials: 'same-origin' });
                if (!res.ok) break;

                const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
                const sourceGrid = doc.querySelector('.item_2.items') || doc;

                // Remove pagination element from fetched pages so it doesn't appear in the grid
                sourceGrid.querySelector('#paginador')?.remove();

                const fetchedItems = sourceGrid.querySelectorAll('.fit.item');
                if (!fetchedItems.length) break; // no more items = last page reached

                const fragment = document.createDocumentFragment();
                for (const node of fetchedItems) {
                    const clone = document.importNode(node, true);
                    clone.removeAttribute('style');
                    fragment.appendChild(clone);
                }
                itemGrid.appendChild(fragment);

                loaded++;
                if (limit !== 99999) updateProgress(loaded, limit);
                else {
                    // For "all": show pages loaded as running count
                    document.getElementById('f-progress-bar').style.width = '100%';
                    document.getElementById('f-progress-label').textContent = `${loaded} page(s) loaded...`;
                    document.getElementById('f-progress-pct').textContent = '';
                }
                await new Promise(r => setTimeout(r, 300));
            } catch (e) {
                console.error(`${SCRIPT_NAME}: fetch failed for`, url, e);
                break;
            }
        }

        hideProgress();
        statusEl.textContent = `${loaded} page(s) loaded`;
        setTimeout(() => statusEl.textContent = '', 5000);
    }

    // ─── Init ─────────────────────────────────────────────────────────────────

    function init(container) {
        if (document.getElementById(`${SCRIPT_ID}-bar`)) return;

        const bar = createBar();
        try {
            container.parentNode.insertBefore(bar, container);
        } catch (_) {
            document.body.insertBefore(bar, document.body.firstChild);
        }

        bar.querySelector('#f-clear').addEventListener('click', () => clearFilters(container));

        bar.querySelector('#f-loadall').addEventListener('click', async function () {
            this.disabled = true;
            const status = document.getElementById('f-load-status');

            // Hide the existing page pagination — no longer relevant once we load extra pages
            document.querySelector('#paginador')?.style.setProperty('display', 'none');

            try {
                await loadAllPages(container, status);
                buildGroupDropdown(container);
                applyFilters(container);
            } catch (e) {
                console.error(`${SCRIPT_NAME}: load pages error`, e);
                status.textContent = 'Error loading pages';
            } finally {
                this.disabled = false;
            }
        });

        for (const el of bar.querySelectorAll('input, select')) {
            el.addEventListener('input', () => applyFilters(container));
        }

        buildGroupDropdown(container);
        loadFilters();
        applyFilters(container);
        injectLinkButtons(container);

        let debounceTimer;
        new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                applyFilters(container);
                injectLinkButtons(container);
            }, 150);
        }).observe(container, { childList: true, subtree: true });
    }

    function findContainer() {
        return document.querySelector('div.peliculas') || document.querySelector('.box');
    }

    function waitForContainer() {
        const container = findContainer();
        if (container) {
            init(container);
        } else {
            setTimeout(waitForContainer, 400);
        }
    }

    waitForContainer();

})();
