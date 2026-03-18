// ==UserScript==
// @name         HD-Encode Search+
// @namespace    https://hdencode.org/
// @version      1.1.0
// @description  Filtering, advanced sorting, live custom search, custom pagination, category switching, quick links, NFO panel, settings, presets, bulk copy, and sticky UI for HDEncode.org
// @author       xXSalamanderXx
// @homepage     https://github.com/xXSalamanderXx/HDEncode-Search-Plus/
// @supportURL   https://github.com/xXSalamanderXx/HDEncode-Search-Plus/issues/
// @updateURL    https://github.com/xXSalamanderXx/HDEncode-Search-Plus/raw/refs/heads/main/HDEncode-Search-Plus.user.js
// @downloadURL  https://github.com/xXSalamanderXx/HDEncode-Search-Plus/raw/refs/heads/main/HDEncode-Search-Plus.user.js
// @match        *://hdencode.org/*
// @match        *://www.hdencode.org/*
// @match        *://hdencode.com/*
// @match        *://www.hdencode.com/*
// @match        *://hdencode.ro/*
// @match        *://www.hdencode.ro/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const SCRIPT_NAME = 'HD-Encode Search+';
    const SCRIPT_ID = 'hdencode-filter-suite';

    const ACCENT = '#E50914';
    const ACCENT_BG = 'rgba(229, 9, 20, 0.08)';
    const ACCENT_BORDER = 'rgba(229, 9, 20, 0.35)';

    const SEARCH_TOP = '#6d5cff';
    const SEARCH_BOTTOM = '#3f48ff';
    const SEARCH_HOVER_TOP = '#8374ff';
    const SEARCH_HOVER_BOTTOM = '#5260ff';
    const SEARCH_BORDER = 'rgba(109, 92, 255, 0.68)';
    const SEARCH_GLOW = 'rgba(109, 92, 255, 0.26)';
    const SEARCH_STATUS = '#5a67ff';

    const CARD_GLOW = 'rgba(109, 92, 255, 0.22)';
    const CARD_GLOW_STRONG = 'rgba(109, 92, 255, 0.32)';
    const FRAME_RED_GLOW = 'rgba(229, 9, 20, 0.18)';
    const FRAME_RED_GLOW_HOVER = 'rgba(229, 9, 20, 0.34)';

    let isLoadingPages = false;
    let abortController = null;
    let rootContainer = null;
    let resultsGrid = null;
    let observer = null;
    let observerPaused = false;
    let clearInProgress = false;
    let nativePaginationHTML = '';
    let refreshTimer = null;
    let baseListingUrl = '';
    let searchRunId = 0;
    let activeLoadToken = 0;
    let isStoppingNow = false;
    let uiRefreshQueued = false;
    let suppressObserverUntil = 0;
    let pendingClearAfterStop = false;
    let clearRetryTimer = null;

    const seenReleaseLinks = new Set();
    const linkCache = new Map();

    function injectStyles() {
        if (document.getElementById(`${SCRIPT_ID}-styles`)) return;

        const style = document.createElement('style');
        style.id = `${SCRIPT_ID}-styles`;
        style.textContent = `
            @keyframes fs-activity-scan {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            #${SCRIPT_ID}-bar {
                position: sticky;
                top: 10px;
                z-index: 1000;
                clear: both;
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
                overflow: visible;
                background: rgba(13, 17, 23, 0.96);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                padding: 14px 18px 18px 18px;
                border-radius: 14px;
                border: 1px solid #21262d;
                margin: 0 0 28px 0;
                color: #e6edf3;
                font-size: 13px;
                box-shadow:
                    0 10px 30px rgba(0,0,0,0.5),
                    0 0 0 1px rgba(255,255,255,0.02) inset,
                    0 0 20px ${FRAME_RED_GLOW};
                transition: box-shadow 0.22s ease, transform 0.22s ease;
            }

            #${SCRIPT_ID}-bar:hover {
                box-shadow:
                    0 12px 35px rgba(0,0,0,0.6),
                    0 0 0 1px rgba(255,255,255,0.03) inset,
                    0 0 30px ${FRAME_RED_GLOW_HOVER};
            }

            @keyframes fs-brand-glow-move {
                0% { background-position: 0% 50%; filter: drop-shadow(0 0 8px rgba(109, 92, 255, 0.18)); }
                50% { background-position: 100% 50%; filter: drop-shadow(0 0 16px rgba(109, 92, 255, 0.34)); }
                100% { background-position: 0% 50%; filter: drop-shadow(0 0 8px rgba(109, 92, 255, 0.18)); }
            }

            #${SCRIPT_ID}-bar .fs-brand-text {
                display: inline-block;
                font-family: Inter, Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
                font-size: 20px;
                font-weight: 800;
                letter-spacing: 0.8px;
                line-height: 1.1;
                background: linear-gradient(90deg, #ffffff 0%, #dbe2ff 18%, #8da2ff 42%, #ffffff 58%, #ff6b75 80%, #ffffff 100%);
                background-size: 220% auto;
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                color: transparent;
                animation: fs-brand-glow-move 3.8s linear infinite;
                text-shadow: none;
            }

            #${SCRIPT_ID}-bar .fs-toolbar-row {
                display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-width: 0; width: 100%;
            }

            #${SCRIPT_ID}-bar .fs-toolbar-left {
                display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-width: 0;
            }

            #${SCRIPT_ID}-bar .fs-toolbar-right {
                display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: flex-end; min-width: 0;
            }

            #${SCRIPT_ID}-bar .fs-search-select { flex: 0 1 180px; min-width: 145px; }
            #${SCRIPT_ID}-bar .fs-search-input { flex: 1 1 340px; min-width: 240px; max-width: 100%; }
            #${SCRIPT_ID}-bar .fs-section-line { border-top: 1px solid #21262d; }

            /* Remove default spin buttons for a cleaner look on numbers */
            #${SCRIPT_ID}-bar input[type=number]::-webkit-inner-spin-button, 
            #${SCRIPT_ID}-bar input[type=number]::-webkit-outer-spin-button { 
                opacity: 0.5; 
            }

            #f-progress-bar { width: 0%; transition: width 0.3s ease-out; }
            #f-progress-bar.fs-active {
                background: linear-gradient(90deg, rgba(229, 9, 20, 0.08) 0%, rgba(229, 9, 20, 0.24) 18%, rgba(229, 9, 20, 0.55) 36%, #E50914 50%, rgba(229, 9, 20, 0.55) 64%, rgba(229, 9, 20, 0.24) 82%, rgba(229, 9, 20, 0.08) 100%);
                background-size: 220% 100%;
                animation: fs-activity-scan 1.15s linear infinite;
            }

            .fs-search-match {
                outline: 1px solid rgba(109, 92, 255, 0.62);
                box-shadow: 0 0 0 1px rgba(109, 92, 255, 0.24) inset, 0 0 18px rgba(109, 92, 255, 0.18), 0 0 34px rgba(109, 92, 255, 0.10) !important;
            }

            .fs-visible-card {
                border-radius: 14px !important;
                overflow: hidden;
                box-shadow: 0 0 0 1px rgba(109, 92, 255, 0.20), 0 0 20px ${CARD_GLOW}, 0 0 38px rgba(109, 92, 255, 0.10) !important;
                transition: box-shadow 0.2s ease, transform 0.2s ease;
            }

            .fs-visible-card:hover {
                box-shadow: 0 0 0 1px rgba(109, 92, 255, 0.30), 0 0 26px ${CARD_GLOW_STRONG}, 0 0 46px rgba(109, 92, 255, 0.16) !important;
                transform: translateY(-1px);
            }

            .fs-hide-pagination { display: none !important; }
            #f-load-status, #f-search-status { min-height: 18px; }

            #f-custom-pagination { margin-top: 18px; padding-top: 16px; border-top: 1px solid #21262d; }
            #f-custom-pagination .fs-pagination-wrap { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
            #f-custom-pagination a, #f-custom-pagination span {
                display: inline-flex; align-items: center; justify-content: center; min-width: 34px; height: 32px; padding: 0 10px; border-radius: 8px; font-size: 13px; line-height: 1; text-decoration: none; box-sizing: border-box; white-space: nowrap;
            }
            #f-custom-pagination a { color: #e6edf3; background: #161b22; border: 1px solid rgba(255,255,255,0.10); transition: all 0.18s ease; }
            #f-custom-pagination a:hover { border-color: rgba(109, 92, 255, 0.45); box-shadow: 0 0 0 1px rgba(109, 92, 255, 0.12) inset; transform: translateY(-1px); }
            #f-custom-pagination .current, #f-custom-pagination .active {
                color: #ffffff; background: linear-gradient(180deg, ${SEARCH_TOP} 0%, ${SEARCH_BOTTOM} 100%); border: 1px solid ${SEARCH_BORDER}; font-weight: 700; text-shadow: -1px 0 rgba(0,0,0,0.98), 0 1px rgba(0,0,0,0.98), 1px 0 rgba(0,0,0,0.98), 0 -1px rgba(0,0,0,0.98);
            }

            #fs-empty-state { display: none; margin: 18px 0 10px 0; padding: 18px 16px; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; background: #11161c; color: #c9d1d9; font-size: 14px; line-height: 1.5; text-align: center; }
            
            #f-category-note { display: none; margin-top: 10px; margin-bottom: 12px; padding: 12px 14px; border-radius: 14px; background: transparent; color: #e6edf3; border: 1px solid rgba(229, 9, 20, 0.28); box-shadow: 0 0 18px rgba(229, 9, 20, 0.22), 0 0 34px rgba(229, 9, 20, 0.14), inset 0 0 0 1px rgba(255,255,255,0.02); font-size: 13px; line-height: 1.5; }

            .fs-preset-pill {
                display: inline-flex; align-items: center; justify-content: center; background: #1f242c;
                border: 1px solid #30363d; border-radius: 12px; padding: 3px 10px; font-size: 11px;
                color: #c9d1d9; cursor: pointer; transition: all 0.2s ease;
            }
            .fs-preset-pill:hover { background: #30363d; border-color: #8b949e; color: #ffffff; }
            .fs-preset-delete { margin-left: 6px; color: #e06c75; font-weight: bold; font-size: 12px; }
            .fs-preset-delete:hover { color: #ff8c95; }

            @media (max-width: 980px) { #${SCRIPT_ID}-bar .fs-toolbar-left, #${SCRIPT_ID}-bar .fs-toolbar-right { flex: 1 1 100%; justify-content: flex-start; } }
        `;
        document.head.appendChild(style);
    }

    function getCurrentOrigin() { return window.location.origin; }
    function getHomeUrl() { return `${getCurrentOrigin()}/`; }
    function getMoviesUrl() { return `${getCurrentOrigin()}/tag/movies/`; }
    function getTvShowsUrl() { return `${getCurrentOrigin()}/tag/tv-shows/`; }
    function getTvPacksUrl() { return `${getCurrentOrigin()}/tag/tv-packs/`; }
    function getTopDownloadsUrl() { return `${getCurrentOrigin()}/top-downloads/`; }
    function getUhd4kUrl() { return `${getCurrentOrigin()}/quality/2160p/`; }
    function getCurrentPath() { return window.location.pathname.replace(/\/+$/, '/') || '/'; }

    function isHomeCategoryPage() { return getCurrentPath() === '/'; }
    function isMoviesCategoryPage() { return getCurrentPath().startsWith('/tag/movies/'); }
    function isTvShowsCategoryPage() { return getCurrentPath().startsWith('/tag/tv-shows/'); }
    function isTvPacksCategoryPage() { return getCurrentPath().startsWith('/tag/tv-packs/'); }
    function isTopDownloadsCategoryPage() { return getCurrentPath().startsWith('/top-downloads/'); }
    function isUhd4kCategoryPage() { return getCurrentPath().startsWith('/quality/2160p/'); }

    function updateRecommendedUseNotice() {
        const note = document.getElementById('f-category-note');
        if (!note) return;
        const isBroadPage = getCurrentPath() === '/' && !window.location.search;
        if (isBroadPage) {
            note.innerHTML = '<strong>Recommended:</strong> You are viewing the broad homepage. Search or browse a specific category first to load targeted pages faster.';
            note.style.display = 'block'; note.style.borderColor = 'rgba(245, 158, 11, 0.4)'; note.style.boxShadow = '0 0 18px rgba(245, 158, 11, 0.15), inset 0 0 0 1px rgba(255,255,255,0.02)';
        } else {
            note.innerHTML = '<strong>Recommended Use:</strong> Search on the main site first, then use this script to narrow down your results.';
            note.style.display = 'block'; note.style.borderColor = 'rgba(229, 9, 20, 0.28)'; note.style.boxShadow = '0 0 18px rgba(229, 9, 20, 0.22), inset 0 0 0 1px rgba(255,255,255,0.02)';
        }
    }

    function syncCategorySelectToLocation() {
        const select = document.getElementById('f-category');
        if (!select) return;
        if (isHomeCategoryPage()) select.value = getHomeUrl();
        else if (isMoviesCategoryPage()) select.value = getMoviesUrl();
        else if (isTvShowsCategoryPage()) select.value = getTvShowsUrl();
        else if (isTvPacksCategoryPage()) select.value = getTvPacksUrl();
        else if (isTopDownloadsCategoryPage()) select.value = getTopDownloadsUrl();
        else if (isUhd4kCategoryPage()) select.value = getUhd4kUrl();
        else select.value = '';
        updateRecommendedUseNotice();
    }

    function findContainer() {
        return document.querySelector('.peliculas') || document.querySelector('div.peliculas') || document.querySelector('.box');
    }

    function findResultsGrid(container = document) {
        return container.querySelector('.peliculas .item_2.items') || container.querySelector('.box .item_2.items') || container.querySelector('.item_2.items') || container.querySelector('.peliculas .item_2') || container.querySelector('.box .item_2') || container.querySelector('.item_2');
    }

    function getActiveResultsGrid(container = rootContainer || document) {
        return resultsGrid || findResultsGrid(container) || container;
    }

    function findNativePaginationElement(doc = document) {
        return doc.querySelector('#paginador, .wp-pagenavi, .pagination, .pagenavi, .nav-links, .page-numbers');
    }

    function extractMaxPage(doc = document) {
        const pager = findNativePaginationElement(doc);
        let max = 1;
        if (pager) {
            const links = pager.querySelectorAll('a');
            for (const link of links) {
                const matchHref = link.href.match(/\/page\/(\d+)\/?/i);
                if (matchHref) { const val = parseInt(matchHref[1], 10); if (val > max) max = val; }
                const textVal = parseInt(link.textContent.trim(), 10);
                if (!isNaN(textVal) && textVal > max) max = textVal;
            }
            const spans = pager.querySelectorAll('span');
            for (const span of spans) {
                const textVal = parseInt(span.textContent.trim(), 10);
                if (!isNaN(textVal) && textVal > max) max = textVal;
            }
        }
        const fullText = doc.body ? doc.body.innerText : '';
        const matchText = fullText.match(/(?:Page|Página)\s+\d+\s+(?:of|de)\s+(\d+)/i);
        if (matchText) { const val = parseInt(matchText[1], 10); if (val > max) max = val; }
        return max;
    }

    function captureNativePagination() {
        const el = findNativePaginationElement(document);
        if (el) nativePaginationHTML = el.outerHTML;
    }

    function hideNativePagination() {
        document.querySelectorAll('#paginador, .wp-pagenavi, .pagination, .pagenavi, .nav-links, .page-numbers').forEach(el => el.classList.add('fs-hide-pagination'));
    }

    function renderCustomPagination() {
        const host = document.getElementById('f-custom-pagination');
        if (!host) return;
        host.innerHTML = '';
        if (!nativePaginationHTML) return;
        const temp = document.createElement('div');
        temp.innerHTML = nativePaginationHTML;
        const original = temp.firstElementChild;
        if (!original) return;
        const wrap = document.createElement('div');
        wrap.className = 'fs-pagination-wrap';
        const items = Array.from(original.querySelectorAll('a, span'));
        for (const item of items) {
            const clone = item.cloneNode(true);
            const rawText = (clone.textContent || '').trim();
            if (!rawText) continue;
            if (/^previous(\s+page)?$/i.test(rawText) || /^prev(ious)?$/i.test(rawText)) { clone.textContent = '←'; clone.title = 'Previous Page'; }
            else if (/^next(\s+page)?$/i.test(rawText) || /^next$/i.test(rawText)) { clone.textContent = '→'; clone.title = 'Next Page'; }
            const finalText = (clone.textContent || '').trim();
            if (clone.tagName.toLowerCase() === 'span') {
                const cls = clone.className || '';
                const isCurrent = /current|active/i.test(cls);
                if (isCurrent || /^\d+$/.test(finalText) || finalText === '←' || finalText === '→') {
                    if (isCurrent) clone.classList.add('current');
                    wrap.appendChild(clone);
                }
            } else wrap.appendChild(clone);
        }
        if (wrap.children.length) host.appendChild(wrap);
    }

    function ensureEmptyState(container) {
        const itemGrid = getActiveResultsGrid(container);
        let emptyState = document.getElementById('fs-empty-state');
        if (!emptyState) {
            emptyState = document.createElement('div'); emptyState.id = 'fs-empty-state';
            emptyState.textContent = 'No Results: Press Clear To Reset Search Filters or Modify Your Current Filters';
            itemGrid.parentNode.insertBefore(emptyState, itemGrid);
        }
        return emptyState;
    }

    function updateEmptyState(container, hasVisibleItems) {
        const emptyState = ensureEmptyState(container);
        emptyState.style.display = hasVisibleItems ? 'none' : 'block';
    }

    function getBaseListingUrl() {
        const url = new URL(window.location.href);
        url.pathname = url.pathname.replace(/\/page\/\d+\/?$/, '/');
        return `${url.origin}${url.pathname}${url.search}`;
    }

    function buildPageUrl(pageNum) {
        const base = new URL(baseListingUrl || getBaseListingUrl());
        if (pageNum <= 1) return base.toString();
        const cleanPath = base.pathname.replace(/\/+$/, '');
        return `${base.origin}${cleanPath}/page/${pageNum}/${base.search}`;
    }

    function normalizeSearchText(str) { return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
    function squeezeSearchText(str) { return normalizeSearchText(str).replace(/[^a-z0-9]+/g, ''); }
    function escapeRegExp(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    // Advanced Regex for Negative/Positive queries
    function matchesCustomSearchText(text, query) {
        if (!query) return true;
        const normalizedText = normalizeSearchText(text);
        const tokens = query.split(/\s+/).filter(Boolean);

        const positiveTokens = [];
        const negativeTokens = [];

        for (const t of tokens) {
            if (t.startsWith('-') && t.length > 1) negativeTokens.push(normalizeSearchText(t.slice(1)));
            else positiveTokens.push(normalizeSearchText(t));
        }

        for (const neg of negativeTokens) {
            if (normalizedText.includes(neg)) return false;
        }

        if (!positiveTokens.length) return true;

        const squeezedText = squeezeSearchText(text);
        const squeezedQuery = positiveTokens.map(squeezeSearchText).join('');
        if (squeezedQuery && squeezedText.includes(squeezedQuery)) return true;

        const loosePattern = positiveTokens.map(escapeRegExp).join('[^a-z0-9]*');
        try {
            return new RegExp(loosePattern, 'i').test(normalizedText);
        } catch (_) {
            return normalizedText.includes(positiveTokens.join(' '));
        }
    }

    function getAllItems(scope = rootContainer || document) { return Array.from(scope.querySelectorAll('.fit.item')); }

    function getCleanTitle(item) {
        const h5 = item.querySelector('h5 a');
        if (!h5) return '';
        let text = h5.textContent || h5.innerText;

        // Strip bracketed tags, parenthesis years (temporarily) and sizes
        text = text.replace(/\[.*?\]/g, ' '); 
        text = text.replace(/\(\d{4}\)/g, (match) => match.replace(/[()]/g, '')); 
        text = text.replace(/[–-]\s*[\d.]+\s*(GB|MB).*$/i, ''); 

        // Cut off exactly at the scene release tags to remove the clutter
        const sceneCutoff = /\b(1080p|720p|2160p|480p|4k|uhd|web-dl|webrip|bluray|bdrip|brrip|hdtv|x264|x265|hevc|ddp\d|aac|ac3|dts|remux)\b.*/i;
        text = text.replace(sceneCutoff, '');

        // Replace all dots and underscores with spaces
        text = text.replace(/[._]/g, ' ');

        // Clean up extra spaces and trailing hyphens
        text = text.replace(/\s+/g, ' ').replace(/\s-\s*$/, '').trim();

        // Apply clean Title Case formatting
        text = text.split(' ').map(word => {
            if (word.match(/^s\d{2}e\d{2}$/i)) return word.toUpperCase(); // Preserve formatting for S01E01
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');

        return text;
    }

    function hasDV(item) {
        const span = item.querySelector('.imdb_r span');
        return !!span && (span.getAttribute('style') || '').includes('dv.png');
    }

    function hasHDR(item) { return item.querySelector('.buttonhdr') !== null; }

    function getRating(item) {
        const match = (item.innerText || '').match(/Rating\s*:\s*(\d+(\.\d+)?)\/10/i);
        return match ? parseFloat(match[1]) : 0;
    }

    function getSize(item) {
        const a = item.querySelector('h5 a');
        const title = a?.innerText || a?.textContent || '';
        const match = title.match(/[–-]\s*(\d+(\.\d+)?)\s*GB/i);
        return match ? parseFloat(match[1]) : null;
    }

    function getGroup(item) {
        const a = item.querySelector('h5 a');
        const title = a?.innerText || a?.textContent || '';
        const clean = title.replace(/\s*[–-]\s*[\d.]+\s*(GB|MB)\s*$/i, '').trim();
        const parts = clean.split('-');
        return parts.length > 1 ? parts.pop().trim() : '';
    }

    function getResolution(item) {
        for (const span of item.querySelectorAll('.calidad3')) {
            const text = (span.innerText || span.textContent || '').trim();
            if (/\b2160p\b/i.test(text)) return '2160p';
            if (/\b1080p\b/i.test(text)) return '1080p';
            if (/\b720p\b/i.test(text)) return '720p';
        }
        return '';
    }

    function getItemKey(item) {
        return item.querySelector('h5 a')?.href || item.querySelector('h5 a')?.textContent?.trim() || item.textContent.trim().slice(0, 200);
    }

    function indexExistingItems(container) {
        for (const item of getAllItems(container)) { const key = getItemKey(item); if (key) seenReleaseLinks.add(key); }
    }

    function buildGroupDropdown(container) {
        const select = document.getElementById('f-group');
        if (!select) return;

        const current = select.value;
        const casingMap = {};   

        for (const item of getAllItems(container)) {
            if (item.style.display === 'none') continue;
            const rawGroup = getGroup(item);
            if (!rawGroup) continue;

            const lower = rawGroup.toLowerCase();
            if (!casingMap[lower]) casingMap[lower] = {};
            casingMap[lower][rawGroup] = (casingMap[lower][rawGroup] || 0) + 1;
        }

        const finalGroups = [];
        for (const lower in casingMap) {
            let bestCase = ''; let maxCount = 0;
            for (const exactCase in casingMap[lower]) {
                if (casingMap[lower][exactCase] > maxCount) {
                    maxCount = casingMap[lower][exactCase];
                    bestCase = exactCase;
                }
            }
            finalGroups.push({ lower, display: bestCase });
        }

        const sorted = finalGroups.sort((a, b) => a.display.toLowerCase().localeCompare(b.display.toLowerCase()));
        select.innerHTML = '<option value="">All Release Groups</option>';

        for (const g of sorted) {
            const opt = document.createElement('option');
            opt.value = g.lower; opt.textContent = g.display;
            select.appendChild(opt);
        }
        if (current && Array.from(select.options).some(o => o.value === current)) select.value = current;
    }

    function getFilterValues() {
        return {
            onlyDV: document.getElementById('f-dv')?.checked || false,
            onlyHDR: document.getElementById('f-hdr')?.checked || false,
            res: document.getElementById('f-res')?.value || '',
            sort: document.getElementById('f-sort')?.value || '',
            minRating: parseFloat(document.getElementById('f-rating')?.value) || 0,
            minSize: parseFloat(document.getElementById('f-minsize')?.value) || 0,
            maxSize: parseFloat(document.getElementById('f-maxsize')?.value) || Infinity,
            group: (document.getElementById('f-group')?.value || '').toLowerCase().trim(),
            search: (document.getElementById('f-search')?.value || '').trim(),
        };
    }

    function itemMatchesBaseFilters(item, f) {
        if (f.onlyDV && !hasDV(item)) return false;
        if (f.onlyHDR && !hasHDR(item)) return false;
        if (f.res && getResolution(item) !== f.res) return false;
        if (getRating(item) < f.minRating) return false;
        const size = getSize(item);
        if (size !== null && (size < f.minSize || size > f.maxSize)) return false;
        if (f.group && getGroup(item).toLowerCase() !== f.group) return false;
        return true;
    }

    // Presets Management
    function loadPresets() {
        try { return JSON.parse(localStorage.getItem('hdencodePresets')) || {}; } catch (_) { return {}; }
    }
    
    function savePresets(presets) {
        try { localStorage.setItem('hdencodePresets', JSON.stringify(presets)); } catch (_) {}
    }

    function renderPresets(container) {
        const pContainer = document.getElementById('fs-presets-container');
        if (!pContainer) return;
        pContainer.innerHTML = '';
        const presets = loadPresets();
        
        for (const [name, data] of Object.entries(presets)) {
            const pill = document.createElement('span');
            pill.className = 'fs-preset-pill';
            pill.innerHTML = `<span>${name}</span> <span class="fs-preset-delete" title="Delete Preset">×</span>`;
            
            pill.querySelector('span').addEventListener('click', () => {
                for (const [id, val] of Object.entries(data)) {
                    const el = document.getElementById(id);
                    if (!el) continue;
                    if (el.type === 'checkbox') el.checked = val;
                    else el.value = val;
                }
                applyFilters(container);
            });
            
            pill.querySelector('.fs-preset-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete preset '${name}'?`)) {
                    const currentPresets = loadPresets();
                    delete currentPresets[name];
                    savePresets(currentPresets);
                    renderPresets(container);
                }
            });
            pContainer.appendChild(pill);
        }
    }

    function loadSettings() {
        const defaultSettings = { 'f-dv': true, 'f-hdr': true, 'f-res': true, 'f-rating': true, 'f-size': true, 'f-group': true, 'f-search': true, 'f-sort': true };
        try { const saved = JSON.parse(localStorage.getItem('hdencodeSettings')); return { ...defaultSettings, ...saved }; } catch (_) { return defaultSettings; }
    }
    function saveSettings(settings) { try { localStorage.setItem('hdencodeSettings', JSON.stringify(settings)); } catch (_) {} }

    function saveFilters() {
        const settings = loadSettings();
        const data = {};
        for (const el of document.querySelectorAll(`#${SCRIPT_ID}-bar input[id^="f-"], #${SCRIPT_ID}-bar select[id^="f-"]`)) {
            if (el.id === 'f-category') continue;
            let shouldSave = true;
            if (el.id === 'f-minsize' || el.id === 'f-maxsize') shouldSave = settings['f-size'];
            else shouldSave = settings[el.id];
            if (shouldSave) data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
        }
        try { localStorage.setItem('hdencodeFilters', JSON.stringify(data)); } catch (_) {}
    }

    function loadFilters() {
        const settings = loadSettings();
        try {
            const data = JSON.parse(localStorage.getItem('hdencodeFilters') || '{}');
            for (const [id, val] of Object.entries(data)) {
                if (id === 'f-category') continue;
                if (id === 'f-minsize' || id === 'f-maxsize') { if (!settings['f-size']) continue; } 
                else if (!settings[id]) continue;
                const el = document.getElementById(id);
                if (!el) continue;
                if (el.type === 'checkbox') el.checked = val;
                else el.value = val;
            }
        } catch (_) {}
    }

    function setStatus(text = '') { const el = document.getElementById('f-load-status'); if (el) el.textContent = text; }

    function updateProgressBar(current, total) {
        const bar = document.getElementById('f-progress-bar');
        if (bar) { const safeTotal = Math.max(1, total); const pct = Math.min(100, Math.max(0, (current / safeTotal) * 100)); bar.style.width = `${pct}%`; }
    }

    function showProgress() {
        const wrap = document.getElementById('f-progress-wrap'); const bar = document.getElementById('f-progress-bar');
        if (wrap) wrap.style.display = 'block';
        if (bar) { bar.style.width = '0%'; bar.classList.add('fs-active'); }
    }

    function hideProgress(immediate = false) {
        const wrap = document.getElementById('f-progress-wrap'); const bar = document.getElementById('f-progress-bar');
        const done = () => { if (wrap) wrap.style.display = 'none'; if (bar) { bar.classList.remove('fs-active'); bar.style.width = '0%'; } };
        if (immediate) done(); else setTimeout(done, 350);
    }

    function pauseObserver() { if (observer && !observerPaused) { observer.disconnect(); observerPaused = true; } }
    function resumeObserver() { if (observer && observerPaused && resultsGrid) { observer.observe(resultsGrid, { childList: true, subtree: true }); observerPaused = false; } }

    function styleVisibleResults(container) {
        const items = getAllItems(container);
        for (const item of items) {
            if (item.style.display === 'none') item.classList.remove('fs-visible-card');
            else item.classList.add('fs-visible-card');
        }
    }

    function applyFilters(container) {
        const f = getFilterValues();
        const items = getAllItems(container);
        let searchMatches = 0; let visibleCount = 0;

        pauseObserver();

        for (const item of items) {
            const matchesBase = itemMatchesBaseFilters(item, f);
            const matchesSearch = f.search ? matchesCustomSearchText(item.innerText || item.textContent || '', f.search) : false;

            if (f.search) {
                const finalMatch = matchesBase && matchesSearch;
                item.style.display = finalMatch ? '' : 'none';
                item.classList.toggle('fs-search-match', finalMatch);
                if (finalMatch) { searchMatches++; visibleCount++; }
            } else {
                item.style.display = matchesBase ? '' : 'none';
                item.classList.remove('fs-search-match');
                if (matchesBase) visibleCount++;
            }
        }

        // Apply Sorting
        if (f.sort && f.sort !== 'default') {
            const grid = getActiveResultsGrid(container);
            items.sort((a, b) => {
                if (f.sort === 'rating-desc') return getRating(b) - getRating(a);
                if (f.sort === 'size-desc') return (getSize(b) || 0) - (getSize(a) || 0);
                if (f.sort === 'size-asc') return (getSize(a) || 0) - (getSize(b) || 0);
                
                const nameA = getCleanTitle(a).toLowerCase();
                const nameB = getCleanTitle(b).toLowerCase();
                if (f.sort === 'name-asc') return nameA.localeCompare(nameB);
                if (f.sort === 'name-desc') return nameB.localeCompare(nameA);
                return 0;
            });
            items.forEach(item => grid.appendChild(item));
        }

        resumeObserver();

        if (!f.group) buildGroupDropdown(container);

        const searchStatus = document.getElementById('f-search-status');
        if (searchStatus) {
            if (f.search) {
                searchStatus.textContent = isLoadingPages ? `${searchMatches} Results Found For Custom Search — Searching More Pages....` : `${searchMatches} Results Found For Custom Search`;
                searchStatus.style.display = 'block'; searchStatus.style.color = SEARCH_STATUS;
            } else { searchStatus.textContent = ''; searchStatus.style.display = 'none'; }
        }

        styleVisibleResults(container);
        updateEmptyState(container, visibleCount > 0);
        saveFilters();
        return { searchMatches, visibleCount };
    }

    function queueUIRefresh(container, opts = {}) {
        if (uiRefreshQueued) return;
        uiRefreshQueued = true;
        requestAnimationFrame(() => {
            uiRefreshQueued = false;
            hideNativePagination();
            renderCustomPagination();
            buildGroupDropdown(container);
            applyFilters(container);
            injectFeatures(container);
            syncCategorySelectToLocation();
            if (opts.clearStatus) {
                setStatus('');
                const searchStatus = document.getElementById('f-search-status');
                if (searchStatus && !getFilterValues().search) { searchStatus.textContent = ''; searchStatus.style.display = 'none'; }
            }
        });
    }

    function scheduleRefresh(container) {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => queueUIRefresh(container), 80);
    }

    function abortActiveLoading(reason = 'stopped') {
        if (!abortController || isStoppingNow) return false;
        isStoppingNow = true; suppressObserverUntil = Date.now() + 800; activeLoadToken++; searchRunId++;
        try { abortController.abort(reason); } catch (_) {}
        return true;
    }

    function finishStopUI() {
        abortController = null; isLoadingPages = false; isStoppingNow = false;
        const stopBtn = document.getElementById('f-stop-loading'); const loadBtn = document.getElementById('f-loadall');
        if (stopBtn) { stopBtn.style.display = 'none'; stopBtn.disabled = false; }
        if (loadBtn) loadBtn.disabled = false;
        hideProgress(true);
    }

    function stopLoading() {
        if (!isLoadingPages && !abortController) {
            if (pendingClearAfterStop && rootContainer) { pendingClearAfterStop = false; clearFilters(rootContainer); }
            return;
        }
        if (isStoppingNow) return;
        const didAbort = abortActiveLoading('user-stop');
        const stopBtn = document.getElementById('f-stop-loading'); const loadBtn = document.getElementById('f-loadall');
        if (stopBtn) stopBtn.disabled = true; if (loadBtn) loadBtn.disabled = true;
        setStatus('Stopping Search....'); hideProgress(true);
        if (!didAbort) { finishStopUI(); queueUIRefresh(rootContainer); if (pendingClearAfterStop && rootContainer) { pendingClearAfterStop = false; clearFilters(rootContainer); } }
    }

    function clearFilters(container) {
        if (clearInProgress) return;
        if (isLoadingPages || abortController || isStoppingNow) {
            pendingClearAfterStop = true; stopLoading();
            clearTimeout(clearRetryTimer);
            clearRetryTimer = setTimeout(function waitForStop() {
                if (isLoadingPages || abortController || isStoppingNow) { clearRetryTimer = setTimeout(waitForStop, 60); return; }
                pendingClearAfterStop = false; clearFilters(container);
            }, 60);
            return;
        }
        clearInProgress = true; suppressObserverUntil = Date.now() + 1000;
        try {
            clearTimeout(refreshTimer); clearTimeout(clearRetryTimer); pauseObserver();
            for (const el of document.querySelectorAll(`#${SCRIPT_ID}-bar input[id^="f-"], #${SCRIPT_ID}-bar select[id^="f-"]`)) {
                if (el.id === 'f-category') continue;
                else if (el.type === 'checkbox') el.checked = false;
                else el.value = '';
            }
            try { localStorage.removeItem('hdencodeFilters'); } catch (_) {}
            syncCategorySelectToLocation();
            const stopBtn = document.getElementById('f-stop-loading'); const loadBtn = document.getElementById('f-loadall');
            if (stopBtn) { stopBtn.style.display = 'none'; stopBtn.disabled = false; }
            if (loadBtn) loadBtn.disabled = false;
            abortController = null; isLoadingPages = false; isStoppingNow = false;
            setStatus('');
            const searchStatus = document.getElementById('f-search-status'); if (searchStatus) { searchStatus.textContent = ''; searchStatus.style.display = 'none'; }
            applyFilters(container); styleVisibleResults(container); hideNativePagination(); renderCustomPagination(); updateEmptyState(container, getAllItems(container).some(item => item.style.display !== 'none'));
        } finally { setTimeout(() => resumeObserver(), 50); clearInProgress = false; }
    }

    async function resetResultsToFirstPage(container, signal, runId) {
        const itemGrid = getActiveResultsGrid(container); const firstPageUrl = buildPageUrl(1);
        setStatus('Loading First Page....');
        const res = await fetch(firstPageUrl, { credentials: 'same-origin', signal, cache: 'no-store' });
        if (!res.ok || signal.aborted || runId !== searchRunId) return false;
        const html = await res.text(); if (signal.aborted || runId !== searchRunId) return false;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const nativePager = findNativePaginationElement(doc); if (nativePager) nativePaginationHTML = nativePager.outerHTML;
        doc.querySelectorAll('#paginador, .wp-pagenavi, .pagination, .pagenavi, .nav-links, .page-numbers').forEach(el => el.remove());
        const sourceGrid = findResultsGrid(doc) || doc;
        const fetchedItems = Array.from(sourceGrid.querySelectorAll('.fit.item')); if (!fetchedItems.length) return false;
        const fragment = document.createDocumentFragment(); seenReleaseLinks.clear();
        for (const node of fetchedItems) { const clone = document.importNode(node, true); clone.removeAttribute('style'); fragment.appendChild(clone); const key = getItemKey(clone); if (key) seenReleaseLinks.add(key); }
        pauseObserver();
        await new Promise(resolve => { requestAnimationFrame(() => { itemGrid.innerHTML = ''; itemGrid.appendChild(fragment); resolve(); }); });
        resumeObserver();
        resultsGrid = itemGrid; hideNativePagination(); renderCustomPagination(); injectFeatures(container); applyFilters(container); syncCategorySelectToLocation();
        return true;
    }

    async function loadAllPages(container) {
        const runId = ++searchRunId; const localToken = ++activeLoadToken; let totalPages = extractMaxPage(document);
        showProgress(); updateProgressBar(0, totalPages);
        abortController = new AbortController(); const { signal } = abortController;
        let loaded = 0; let stopReason = 'complete';

        try {
            baseListingUrl = getBaseListingUrl(); resultsGrid = getActiveResultsGrid(container);
            const firstPageLoaded = await resetResultsToFirstPage(container, signal, runId);
            if (!firstPageLoaded) { stopReason = signal.aborted ? 'stopped' : 'complete'; return; }
            loaded = 1; totalPages = Math.max(totalPages, extractMaxPage(document)); updateProgressBar(loaded, totalPages);
            const firstState = applyFilters(container);
            if (getFilterValues().search) setStatus(`${firstState.searchMatches} Result(s) Found So Far — Scanned ${loaded} Page(s)`); else setStatus(`${loaded} Page(s) Loaded`);

            for (let p = 2; ; p++) {
                if (signal.aborted || runId !== searchRunId || localToken !== activeLoadToken) { stopReason = 'stopped'; break; }
                setStatus(`Searching Page ${p} out of ${Math.max(totalPages, p)}....`);
                const url = buildPageUrl(p); const res = await fetch(url, { credentials: 'same-origin', signal, cache: 'no-store' });
                if (!res.ok) { stopReason = 'complete'; break; }
                const html = await res.text(); if (signal.aborted || runId !== searchRunId || localToken !== activeLoadToken) { stopReason = 'stopped'; break; }
                const doc = new DOMParser().parseFromString(html, 'text/html');
                totalPages = Math.max(totalPages, extractMaxPage(doc), p);
                doc.querySelectorAll('#paginador, .wp-pagenavi, .pagination, .pagenavi, .nav-links, .page-numbers').forEach(el => el.remove());
                const sourceGrid = findResultsGrid(doc) || doc;
                const fetchedItems = Array.from(sourceGrid.querySelectorAll('.fit.item'));
                if (!fetchedItems.length) { stopReason = 'complete'; break; }
                const itemGrid = getActiveResultsGrid(container); const fragment = document.createDocumentFragment(); let newItemsCount = 0;
                for (const node of fetchedItems) { const key = getItemKey(node); if (!key || seenReleaseLinks.has(key)) continue; const clone = document.importNode(node, true); clone.removeAttribute('style'); fragment.appendChild(clone); seenReleaseLinks.add(key); newItemsCount++; }
                if (newItemsCount === 0) continue;
                pauseObserver();
                await new Promise(resolve => { requestAnimationFrame(() => { itemGrid.appendChild(fragment); resolve(); }); });
                resumeObserver();
                resultsGrid = itemGrid; loaded++; updateProgressBar(loaded, totalPages);
                const state = applyFilters(container); injectFeatures(container);
                if (getFilterValues().search) setStatus(`${state.searchMatches} Result(s) Found So Far — Scanned ${loaded} Page(s)`); else setStatus(`${loaded} Page(s) Loaded`);
                await new Promise(r => setTimeout(r, 60));
            }
        } catch (e) {
            if (e.name === 'AbortError' || signal.aborted) stopReason = 'stopped'; else { console.error(`${SCRIPT_NAME}: load pages error`, e); stopReason = 'error'; }
        } finally {
            const wasStopping = isStoppingNow; finishStopUI();
            const finalState = applyFilters(container); queueUIRefresh(container);
            if (!clearInProgress) {
                if (stopReason === 'stopped' || wasStopping) setStatus(getFilterValues().search ? `${finalState.searchMatches} Result(s) Found` : (loaded > 0 ? `Stopped — ${loaded} Page(s) Loaded` : 'Search Stopped'));
                else if (stopReason === 'error') setStatus('Error Loading Pages');
                else setStatus(getFilterValues().search ? `${finalState.searchMatches} Result(s) Found` : (loaded > 0 ? `${loaded} Page(s) Loaded` : 'No More Pages To Load'));
            }
            if (pendingClearAfterStop && !clearInProgress) { setTimeout(() => { if (rootContainer && !isLoadingPages && !abortController && !isStoppingNow) { pendingClearAfterStop = false; clearFilters(rootContainer); } }, 40); }
            setTimeout(() => { const t = document.getElementById('f-load-status')?.textContent || ''; if (t === 'Error Loading Pages' || t === 'Search Stopped' || t === 'Stopping Search....' || t.startsWith('Stopped —') || t.endsWith('Page(s) Loaded') || t.endsWith('Result(s) Found') || t === 'No More Pages To Load') setStatus(''); }, 2500);
        }
    }

    async function fetchReleaseDetails(url) {
        if (linkCache.has(url)) return linkCache.get(url);
        try {
            const getRes = await fetch(url, { credentials: 'same-origin' }); if (!getRes.ok) return null;
            const html = await getRes.text(); const doc = new DOMParser().parseFromString(html, 'text/html');
            const form = doc.querySelector('form[id^="content-protector-access-form"]'); let unlockedDoc = doc;
            if (form) {
                const formData = new FormData(); for (const input of form.querySelectorAll('input')) { if (input.name) formData.append(input.name, input.value); }
                const action = new URL(form.getAttribute('action') || url, url).href;
                const postRes = await fetch(action, { method: 'POST', credentials: 'same-origin', body: formData });
                if (postRes.ok) unlockedDoc = new DOMParser().parseFromString(await postRes.text(), 'text/html');
            }
            const HOST_NAMES = { rg: 'Rapidgator', rapidgator: 'Rapidgator', nf: 'Nitroflare', nitroflare: 'Nitroflare', ddl: 'DDL', mega: 'Mega', '1fichier': '1Fichier', ul: 'Uploadgig', uploadgig: 'Uploadgig', katfile: 'Katfile', filefox: 'Filefox' };
            const links = [];
            for (const blockquote of unlockedDoc.querySelectorAll('.content-protector-access-form blockquote, .box_post blockquote')) {
                const img = blockquote.previousElementSibling?.querySelector('img');
                const raw = (img?.alt || img?.src?.split('/').pop().replace(/\.(png|jpg|gif)$/i, '') || 'Link').toLowerCase().trim();
                const host = HOST_NAMES[raw] || raw.charAt(0).toUpperCase() + raw.slice(1);
                for (const a of blockquote.querySelectorAll('a')) links.push({ host, url: a.href });
            }
            let nfoText = ''; const infDiv = unlockedDoc.querySelector('.inf, pre, .info, .nfo');
            if (infDiv) nfoText = infDiv.innerText.trim();
            else { const contentNode = unlockedDoc.querySelector('.box_post, .single_post, article'); if (contentNode) { const clone = contentNode.cloneNode(true); clone.querySelectorAll('form, script, style, blockquote, a.button, iframe, img, .sharedaddy').forEach(e => e.remove()); nfoText = clone.innerText.trim(); } }
            nfoText = nfoText.replace(/\n{3,}/g, '\n\n').trim();
            const result = { links, nfo: nfoText }; linkCache.set(url, result); return result;
        } catch (e) { console.error(`${SCRIPT_NAME}: failed to fetch details`, e); return null; }
    }

    // Quick External Links for IMDb & Youtube
    function injectQuickExternalLinks(item) {
        if (item.querySelector('.fs-ext-link')) return;
        const h5 = item.querySelector('h5'); if (!h5) return;
        const cleanTitle = getCleanTitle(item); if (!cleanTitle) return;
        const encodeTitle = encodeURIComponent(cleanTitle);

        const imdb = document.createElement('a');
        imdb.href = `https://www.imdb.com/find?q=${encodeTitle}`;
        imdb.target = '_blank'; imdb.className = 'fs-ext-link'; imdb.title = 'Search IMDb'; imdb.innerHTML = '🎬';
        imdb.style.cssText = 'margin-left:6px; font-size:12px; text-decoration:none; filter:grayscale(100%); transition:filter 0.2s;';
        imdb.onmouseover = () => imdb.style.filter = 'none'; imdb.onmouseout = () => imdb.style.filter = 'grayscale(100%)';

        const yt = document.createElement('a');
        yt.href = `https://www.youtube.com/results?search_query=${encodeTitle}+trailer`;
        yt.target = '_blank'; yt.className = 'fs-ext-link'; yt.title = 'Search YouTube Trailer'; yt.innerHTML = '📺';
        yt.style.cssText = 'margin-left:4px; font-size:12px; text-decoration:none; filter:grayscale(100%); transition:filter 0.2s;';
        yt.onmouseover = () => yt.style.filter = 'none'; yt.onmouseout = () => yt.style.filter = 'grayscale(100%)';

        h5.appendChild(imdb); h5.appendChild(yt);
    }

    function injectLinkButton(item) {
        if (item.querySelector('.fs-link-btn')) return;
        const h5 = item.querySelector('h5'); if (!h5) return;
        const detailUrl = h5.querySelector('a')?.href; if (!detailUrl) return;

        const btnContainer = document.createElement('span');
        btnContainer.style.cssText = 'display:inline-flex; gap:6px; margin-left:8px; vertical-align:middle;';

        const linkBtn = document.createElement('span'); linkBtn.className = 'fs-link-btn'; linkBtn.title = 'Show download links'; linkBtn.innerHTML = '🔗 Links';
        const nfoBtn = document.createElement('span'); nfoBtn.className = 'fs-link-btn fs-nfo-btn'; nfoBtn.title = 'Show media info'; nfoBtn.innerHTML = '📄 NFO';
        const btnStyle = { cursor: 'pointer', fontSize: '11px', color: ACCENT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: '4px', padding: '1px 7px', background: 'transparent', userSelect: 'none', whiteSpace: 'nowrap', flexShrink: '0', opacity: '0.6', transition: 'opacity 0.2s, background 0.2s' };
        Object.assign(linkBtn.style, btnStyle); Object.assign(nfoBtn.style, btnStyle);

        const linkPanel = document.createElement('div'); linkPanel.className = 'fs-link-panel';
        const nfoPanel = document.createElement('div'); nfoPanel.className = 'fs-nfo-panel';
        const panelStyle = { display: 'none', marginTop: '6px', padding: '8px 10px', background: '#161b22', border: '1px solid #21262d', borderRadius: '6px', fontSize: '12px', lineHeight: '1.8' };
        Object.assign(linkPanel.style, panelStyle); Object.assign(nfoPanel.style, panelStyle);
        nfoPanel.style.cssText += 'max-height: 250px; overflow-y: auto; white-space: pre-wrap; font-family: monospace; color: #c9d1d9; font-size: 11px;';

        let linksOpen = false; let nfoOpen = false; let detailsFetched = false;
        const handleFetch = async () => {
            if (detailsFetched) return true;
            linkBtn.innerHTML = '⏳'; nfoBtn.innerHTML = '⏳'; linkBtn.style.opacity = '1'; nfoBtn.style.opacity = '1';
            const details = await fetchReleaseDetails(detailUrl); detailsFetched = true;
            linkBtn.innerHTML = '🔗 Links'; nfoBtn.innerHTML = '📄 NFO';
            if (!details) { linkPanel.innerHTML = '<span style="color:#8b949e;">Failed to load.</span>'; nfoPanel.innerHTML = '<span style="color:#8b949e;">Failed to load.</span>'; return false; }
            if (details.links.length === 0) linkPanel.innerHTML = '<span style="color:#8b949e;">No links found.</span>';
            else {
                const grouped = {}; for (const l of details.links) { if (!grouped[l.host]) grouped[l.host] = []; grouped[l.host].push(l.url); }
                const HOST_COLORS = { Rapidgator: '#00b4d8', Nitroflare: '#f59e0b', Mega: '#e74c3c', '1Fichier': '#8b5cf6', Uploadgig: '#22c55e', Katfile: '#ec4899', Filefox: '#f97316', DDL: '#8b949e' };
                linkPanel.innerHTML = Object.entries(grouped).map(([host, urls]) => {
                    const color = HOST_COLORS[host] || '#8b949e'; const allUrls = urls.join('\n');
                    return `
                        <div style="margin-bottom:8px;">
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:3px;">
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color}; flex-shrink:0;"></span>
                                    <span style="color:#8b949e; text-transform:uppercase; font-size:10px; letter-spacing:0.5px; font-weight:600;">${host}</span>
                                </div>
                                ${urls.length > 1 ? `<span class="fs-copy-btn" data-url="${allUrls.replace(/"/g, '&quot;')}" data-label="Copy all" title="Copy all ${host} links" style="cursor:pointer; font-size:10px; color:#8b949e; white-space:nowrap; padding:1px 6px; border:1px solid #30363d; border-radius:4px; user-select:none; flex-shrink:0;">Copy all</span>` : ''}
                            </div>
                            ${urls.map(u => `<div style="margin:1px 0;"><a href="${u}" target="_blank" style="color:${ACCENT}; text-decoration:none; word-break:break-all;">${u}</a><span class="fs-copy-btn" data-url="${u.replace(/"/g, '&quot;')}" data-label="Copy" title="Copy link" style="cursor:pointer; font-size:11px; color:#8b949e; white-space:nowrap; padding:1px 5px; border:1px solid #30363d; border-radius:4px; user-select:none; margin-left:6px;">Copy</span></div>`).join('')}
                        </div>`;
                }).join('');
                linkPanel.querySelectorAll('.fs-copy-btn').forEach(copyBtn => {
                    copyBtn.addEventListener('mouseover', () => { copyBtn.style.color = '#e6edf3'; copyBtn.style.borderColor = '#8b949e'; });
                    copyBtn.addEventListener('mouseout', () => { copyBtn.style.color = '#8b949e'; copyBtn.style.borderColor = '#30363d'; });
                    copyBtn.addEventListener('click', async (ev) => {
                        ev.stopPropagation(); const urlToCopy = copyBtn.dataset.url; const originalLabel = copyBtn.dataset.label || 'Copy';
                        try {
                            await navigator.clipboard.writeText(urlToCopy); copyBtn.textContent = 'Copied'; copyBtn.style.color = ACCENT; copyBtn.style.borderColor = ACCENT;
                            setTimeout(() => { copyBtn.textContent = originalLabel; copyBtn.style.color = '#8b949e'; copyBtn.style.borderColor = '#30363d'; }, 1500);
                        } catch (_) { copyBtn.textContent = 'Failed'; setTimeout(() => copyBtn.textContent = originalLabel, 1500); }
                    });
                });
            }
            if (!details.nfo) nfoPanel.innerHTML = '<span style="color:#8b949e;">No media info found.</span>'; else nfoPanel.textContent = details.nfo;
            return true;
        };

        linkBtn.addEventListener('click', async (e) => { e.preventDefault(); e.stopPropagation(); if (linksOpen) { linkPanel.style.display = 'none'; linkBtn.style.opacity = '0.6'; linksOpen = false; return; } await handleFetch(); linkPanel.style.display = 'block'; linkBtn.style.opacity = '1'; linksOpen = true; });
        nfoBtn.addEventListener('click', async (e) => { e.preventDefault(); e.stopPropagation(); if (nfoOpen) { nfoPanel.style.display = 'none'; nfoBtn.style.opacity = '0.6'; nfoOpen = false; return; } await handleFetch(); nfoPanel.style.display = 'block'; nfoBtn.style.opacity = '1'; nfoOpen = true; });
        [linkBtn, nfoBtn].forEach(b => { b.addEventListener('mouseover', () => { if (b.style.opacity !== '1') b.style.background = ACCENT_BG; }); b.addEventListener('mouseout', () => { if (b.style.opacity !== '1') b.style.background = 'transparent'; }); });

        btnContainer.appendChild(linkBtn); btnContainer.appendChild(nfoBtn); h5.appendChild(btnContainer); h5.after(nfoPanel); h5.after(linkPanel);
    }

    function injectFeatures(container) {
        for (const item of getAllItems(container)) {
            injectQuickExternalLinks(item);
            injectLinkButton(item);
        }
    }

    const INPUT_STYLE = `
        background: #161b22; color: #e6edf3; border: 1px solid rgba(255,255,255,0.15);
        border-radius: 6px; padding: 5px 8px; font-size: 13px; outline: none;
        transition: border-color 0.2s; height: 30px; box-sizing: border-box;
    `;

    function createBar() {
        const bar = document.createElement('div');
        bar.id = `${SCRIPT_ID}-bar`;

        bar.innerHTML = `
            <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap: 10px;">
                    <strong class="fs-brand-text">${SCRIPT_NAME}</strong>
                    <button id="fs-settings-btn" title="Persistence Settings" style="background:transparent; border:none; color:#8b949e; cursor:pointer; font-size:16px; padding:0; transition:color 0.2s;">⚙️</button>
                    <button id="fs-save-preset-btn" title="Save current filters as Preset" style="background:transparent; border:1px solid #30363d; border-radius: 6px; color:#8b949e; cursor:pointer; font-size:12px; padding:4px 8px; transition:all 0.2s;">💾 Save Preset</button>
                </div>
                <div style="display:flex; gap: 8px;">
                    <div id="fs-presets-container" style="display:flex; gap: 6px; overflow-x:auto;"></div>
                    <select id="f-category" style="${INPUT_STYLE} flex: 1 1 200px; max-width: 100%;">
                        <option value="">Select Category (page reloads)</option>
                        <option value="${getHomeUrl()}">Home</option>
                        <option value="${getMoviesUrl()}">Movies</option>
                        <option value="${getTvShowsUrl()}">TV Shows</option>
                        <option value="${getTvPacksUrl()}">TV Packs</option>
                        <option value="${getTopDownloadsUrl()}">Top Downloads</option>
                        <option value="${getUhd4kUrl()}">4K UHD</option>
                    </select>
                </div>
            </div>

            <div id="fs-settings-panel" style="display:none; margin-bottom: 12px; padding: 12px; border-radius: 8px; background: #161b22; border: 1px solid #30363d; font-size: 12px; color: #8b949e;">
                <div style="font-weight: 600; margin-bottom: 10px; color: #e6edf3;">💾 Persistence Settings: Choose which filters should be remembered next time you visit the site:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 14px;">
                    <label style="cursor:pointer;"><input type="checkbox" data-setting="f-dv"> Dolby Vision</label>
                    <label style="cursor:pointer;"><input type="checkbox" data-setting="f-hdr"> HDR</label>
                    <label style="cursor:pointer;"><input type="checkbox" data-setting="f-res"> Resolution</label>
                    <label style="cursor:pointer;"><input type="checkbox" data-setting="f-rating"> Rating</label>
                    <label style="cursor:pointer;"><input type="checkbox" data-setting="f-size"> File Size</label>
                    <label style="cursor:pointer;"><input type="checkbox" data-setting="f-group"> Release Group</label>
                    <label style="cursor:pointer;"><input type="checkbox" data-setting="f-sort"> Sorting</label>
                    <label style="cursor:pointer;"><input type="checkbox" data-setting="f-search"> Custom Search</label>
                </div>
            </div>

            <div id="f-category-note"></div>

            <div class="fs-toolbar-row" style="margin-bottom: 8px;">
                <div class="fs-toolbar-left" style="flex: 1 1 100%;">
                    <label style="display:flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap;">
                        <input type="checkbox" id="f-dv" style="accent-color:${ACCENT};"><span>Dolby Vision</span>
                    </label>

                    <label style="display:flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap;">
                        <input type="checkbox" id="f-hdr" style="accent-color:${ACCENT};"><span>HDR</span>
                    </label>

                    <select id="f-res" style="${INPUT_STYLE} width:145px;">
                        <option value="">All Resolutions</option>
                        <option value="2160p">2160p</option>
                        <option value="1080p">1080p</option>
                        <option value="720p">720p</option>
                    </select>

                    <input type="number" id="f-rating" placeholder="Min Rating" step="0.1" min="0" max="10" style="${INPUT_STYLE} width:100px; padding-right: 4px;">
                    <input type="number" id="f-minsize" placeholder="Min GB" min="0" style="${INPUT_STYLE} width:85px; padding-right: 4px;">
                    <input type="number" id="f-maxsize" placeholder="Max GB" min="0" style="${INPUT_STYLE} width:85px; padding-right: 4px;">
                        
                    <select id="f-group" class="fs-search-select" style="${INPUT_STYLE} width:165px;">
                        <option value="">All Release Groups</option>
                    </select>
                    
                    <select id="f-sort" style="${INPUT_STYLE} width:155px; border-color: rgba(109, 92, 255, 0.4);">
                        <option value="default">Sort: Default</option>
                        <option value="name-asc">Name: A to Z</option>
                        <option value="name-desc">Name: Z to A</option>
                        <option value="rating-desc">Rating: Highest First</option>
                        <option value="size-desc">Size: Highest First</option>
                        <option value="size-asc">Size: Lowest First</option>
                    </select>
                </div>
            </div>

            <div class="fs-toolbar-row">
                <div class="fs-toolbar-left" style="flex: 1 1 100%;">
                    <input type="text" id="f-search" class="fs-search-input" placeholder="Search Anything... (Tip: use '-word' to exclude)"
                        style="${INPUT_STYLE} width:100%;">
                </div>
            </div>
            
            <div style="font-size: 11px; color: #8b949e; margin-top: 8px; font-weight: 500; letter-spacing: 0.2px;">
                Search Filters - Modify these to customize your results...
            </div>
            <div class="fs-section-line" style="margin: 6px 0 12px 0;"></div>
            
            <div class="fs-toolbar-row" style="justify-content: space-between;">
                <div class="fs-toolbar-left">
                    <button id="f-copy-visible" title="Copy all download links for currently visible items"
                        style="background:transparent; color:#22c55e; border:1px solid rgba(34,197,94,0.35); border-radius:6px; padding:5px 12px; cursor:pointer; font-size:13px; height:30px; box-sizing:border-box; transition:all 0.2s; white-space:nowrap;">
                        📋 Copy Visible Links
                    </button>
                </div>
                
                <div class="fs-toolbar-right" style="flex: 1 1 auto;">
                    <button id="f-stop-loading" style="display:none; background:transparent; color:#f59e0b; border:1px solid rgba(245,158,11,0.35); border-radius:6px; padding:5px 12px; cursor:pointer; font-size:13px; height:30px; box-sizing:border-box; transition:all 0.2s; white-space:nowrap;">⏹ Stop Page Loading</button>

                    <button id="f-loadall"
                        style="background:linear-gradient(180deg, ${SEARCH_TOP} 0%, ${SEARCH_BOTTOM} 100%); color:#ffffff; border:1px solid ${SEARCH_BORDER}; border-radius:8px; padding:5px 16px; cursor:pointer; font-size:13px; font-weight:800; height:30px; box-sizing:border-box; transition:all 0.2s ease; white-space:nowrap; -webkit-text-stroke:0.9px rgba(0,0,0,0.98); text-shadow: -1px 0 rgba(0,0,0,0.98), 0 1px rgba(0,0,0,0.98), 1px 0 rgba(0,0,0,0.98), 0 -1px rgba(0,0,0,0.98), -1px -1px rgba(0,0,0,0.75), 1px 1px rgba(0,0,0,0.75); box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 1px rgba(109,92,255,0.28), 0 8px 18px rgba(0,0,0,0.24), 0 0 12px ${SEARCH_GLOW};">
                        Search
                    </button>

                    <div style="width:1px; height:20px; background:#30363d;"></div>

                    <button id="f-clear" style="background:transparent; color:#e06c75; border:1px solid rgba(224,108,117,0.35); border-radius:6px; padding:5px 12px; cursor:pointer; font-size:13px; height:30px; box-sizing:border-box; transition:all 0.2s; white-space:nowrap;">✕ Clear</button>
                </div>
            </div>

            <div style="margin-top:12px;">
                <div id="f-load-status" style="color:#8b949e; font-size:12px; line-height:18px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>
            </div>

            <div style="margin-top:4px; margin-bottom:12px;">
                <div id="f-search-status" style="display:none; color:${SEARCH_STATUS}; font-size:12px; font-weight:700; letter-spacing:0.2px; line-height:18px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>
            </div>

            <div id="f-progress-wrap" style="display:none; margin-top:6px;">
                <div style="background:#21262d; border-radius:999px; height:6px; overflow:hidden;">
                    <div id="f-progress-bar" style="height:100%; border-radius:999px;"></div>
                </div>
            </div>
            <div id="f-custom-pagination"></div>
        `;

        const settingsBtn = bar.querySelector('#fs-settings-btn');
        const settingsPanel = bar.querySelector('#fs-settings-panel');
        const savePresetBtn = bar.querySelector('#fs-save-preset-btn');
        const copyVisibleBtn = bar.querySelector('#f-copy-visible');
        
        const currentSettings = loadSettings();
        for (const cb of settingsPanel.querySelectorAll('input[type="checkbox"]')) {
            const settingKey = cb.getAttribute('data-setting');
            cb.checked = currentSettings[settingKey] !== false;
            cb.addEventListener('change', () => {
                const newSettings = loadSettings(); newSettings[settingKey] = cb.checked; saveSettings(newSettings);
            });
        }

        settingsBtn.addEventListener('click', () => {
            settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
            settingsBtn.style.opacity = settingsPanel.style.display === 'block' ? '1' : '0.6';
            settingsBtn.style.color = settingsPanel.style.display === 'block' ? '#e6edf3' : '#8b949e';
        });
        settingsBtn.style.opacity = '0.6';

        // Presets logic
        savePresetBtn.addEventListener('mouseover', () => { savePresetBtn.style.background = '#1f242c'; savePresetBtn.style.color = '#e6edf3'; });
        savePresetBtn.addEventListener('mouseout', () => { savePresetBtn.style.background = 'transparent'; savePresetBtn.style.color = '#8b949e'; });
        savePresetBtn.addEventListener('click', () => {
            const name = prompt("Enter a name for this preset (e.g. '4K HDR'):");
            if (!name) return;
            const presets = loadPresets();
            const data = {};
            for (const el of document.querySelectorAll(`#${SCRIPT_ID}-bar input[id^="f-"], #${SCRIPT_ID}-bar select[id^="f-"]`)) {
                if (el.id === 'f-category') continue;
                data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
            }
            presets[name] = data; savePresets(presets); renderPresets(rootContainer);
        });

        // Copy Visible logic
        copyVisibleBtn.addEventListener('mouseover', () => { copyVisibleBtn.style.background = 'rgba(34,197,94,0.1)'; copyVisibleBtn.style.borderColor = 'rgba(34,197,94,0.6)'; });
        copyVisibleBtn.addEventListener('mouseout', () => { copyVisibleBtn.style.background = 'transparent'; copyVisibleBtn.style.borderColor = 'rgba(34,197,94,0.35)'; });
        copyVisibleBtn.addEventListener('click', async () => {
            const items = getAllItems(rootContainer).filter(item => item.style.display !== 'none');
            if (items.length === 0) return alert('No visible items to copy!');
            
            copyVisibleBtn.disabled = true; copyVisibleBtn.innerHTML = `⏳ Fetching (0/${items.length})...`;
            const allLinks = []; let fetched = 0;
            
            for (const item of items) {
                const h5 = item.querySelector('h5 a'); if (!h5 || !h5.href) { fetched++; continue; }
                const details = await fetchReleaseDetails(h5.href);
                if (details && details.links.length > 0) {
                    const cleanTitle = getCleanTitle(item) || h5.textContent;
                    allLinks.push(`--- ${cleanTitle} ---`);
                    details.links.forEach(l => allLinks.push(l.url));
                    allLinks.push(''); 
                }
                fetched++; copyVisibleBtn.innerHTML = `⏳ Fetching (${fetched}/${items.length})...`;
            }
            
            if (allLinks.length > 0) { await navigator.clipboard.writeText(allLinks.join('\n')); copyVisibleBtn.innerHTML = '✅ Copied!'; } 
            else copyVisibleBtn.innerHTML = '❌ None Found';
            
            setTimeout(() => { copyVisibleBtn.innerHTML = '📋 Copy Visible Links'; copyVisibleBtn.disabled = false; }, 2500);
        });

        bar.addEventListener('mouseover', e => {
            if (e.target.id === 'f-loadall') {
                e.target.style.background = `linear-gradient(180deg, ${SEARCH_HOVER_TOP} 0%, ${SEARCH_HOVER_BOTTOM} 100%)`; e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px rgba(109,92,255,0.48), 0 10px 20px rgba(0,0,0,0.28), 0 0 16px rgba(109,92,255,0.24)';
            }
            if (e.target.id === 'f-stop-loading') { e.target.style.background = 'rgba(245,158,11,0.12)'; e.target.style.borderColor = 'rgba(245,158,11,0.6)'; }
            if (e.target.id === 'f-clear') { e.target.style.background = 'rgba(224,108,117,0.12)'; e.target.style.borderColor = 'rgba(224,108,117,0.6)'; }
        });

        bar.addEventListener('mouseout', e => {
            if (e.target.id === 'f-loadall') {
                e.target.style.background = `linear-gradient(180deg, ${SEARCH_TOP} 0%, ${SEARCH_BOTTOM} 100%)`; e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 1px rgba(109,92,255,0.28), 0 8px 18px rgba(0,0,0,0.24), 0 0 12px ${SEARCH_GLOW}`;
            }
            if (e.target.id === 'f-stop-loading') { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(245,158,11,0.35)'; }
            if (e.target.id === 'f-clear') { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(224,108,117,0.35)'; }
        });

        return bar;
    }

    function createObserver() {
        if (!resultsGrid) return;
        if (observer) try { observer.disconnect(); } catch (_) {}
        let debounceTimer;
        observer = new MutationObserver(() => {
            if (observerPaused || clearInProgress || isStoppingNow) return;
            if (Date.now() < suppressObserverUntil) return;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => { indexExistingItems(rootContainer); scheduleRefresh(rootContainer); }, 100);
        });
        observer.observe(resultsGrid, { childList: true, subtree: true }); observerPaused = false;
    }

    function init(container) {
        if (document.getElementById(`${SCRIPT_ID}-bar`)) return;
        rootContainer = container; resultsGrid = getActiveResultsGrid(container); baseListingUrl = getBaseListingUrl();
        if (!resultsGrid || !resultsGrid.parentNode) return;

        injectStyles(); captureNativePagination(); hideNativePagination(); indexExistingItems(container);

        const bar = createBar(); resultsGrid.insertAdjacentElement('beforebegin', bar); resultsGrid.style.marginTop = '6px';
        ensureEmptyState(container); renderCustomPagination(); renderPresets(container);

        const searchInput = bar.querySelector('#f-search');

        bar.querySelector('#f-clear').addEventListener('click', () => clearFilters(container));
        bar.querySelector('#f-stop-loading').addEventListener('click', () => stopLoading());
        bar.querySelector('#f-loadall').addEventListener('click', async function () {
            if (clearInProgress || isStoppingNow) return;
            if (isLoadingPages && abortController) return;
            this.disabled = true;
            const stopBtn = document.getElementById('f-stop-loading'); if (stopBtn) { stopBtn.style.display = 'inline-block'; stopBtn.disabled = false; }
            isLoadingPages = true; isStoppingNow = false; baseListingUrl = getBaseListingUrl(); resultsGrid = getActiveResultsGrid(container);
            applyFilters(container); await loadAllPages(container);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (!isLoadingPages && !clearInProgress && !isStoppingNow) bar.querySelector('#f-loadall').click(); }
        });

        for (const el of bar.querySelectorAll('input[id^="f-"], select[id^="f-"]')) {
            if (el.id === 'f-search' || el.id === 'f-category') continue;
            el.addEventListener('input', () => applyFilters(container));
        }

        bar.querySelector('#f-category').addEventListener('change', function () {
            const targetUrl = this.value; if (!targetUrl) return;
            const here = window.location.href.replace(/\/+$/, '/'); const there = targetUrl.replace(/\/+$/, '/');
            if (here !== there) window.location.href = targetUrl;
        });

        searchInput.addEventListener('input', () => applyFilters(container));
        buildGroupDropdown(container); loadFilters(); syncCategorySelectToLocation(); applyFilters(container); injectFeatures(container); createObserver();
    }

    function waitForContainer() {
        const container = findContainer(); const grid = container ? findResultsGrid(container) : null;
        if (container && grid) init(container); else setTimeout(waitForContainer, 400);
    }
    waitForContainer();
})();
