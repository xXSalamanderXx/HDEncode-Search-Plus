// ==UserScript==
// @name         HD-Encode Search+
// @namespace    https://hdencode.org/
// @version      1.0
// @description  Filtering, live custom search, safer clear handling, custom pagination, empty-state messaging, and quick links for HDEncode.org
// @author       xXSalamanderXx
// @homepage     https://github.com/xXSalamanderXx/HDEncode-Search-Plus/
// @supportURL   https://github.com/xXSalamanderXx/HDEncode-Search-Plus/issues/
// @updateURL    https://github.com/xXSalamanderXx/HDEncode-Search-Plus/raw/refs/heads/main/hdencode-filter-suite.user.js
// @downloadURL  https://github.com/xXSalamanderXx/HDEncode-Search-Plus/raw/refs/heads/main/hdencode-filter-suite.user.js
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

    const SEARCH_GREEN_TOP = '#166534';
    const SEARCH_GREEN_BOTTOM = '#0f5132';
    const SEARCH_GREEN_HOVER_TOP = '#1f7a4d';
    const SEARCH_GREEN_HOVER_BOTTOM = '#14532d';
    const SEARCH_GREEN_BORDER = 'rgba(34, 197, 94, 0.60)';
    const SEARCH_GREEN_GLOW = 'rgba(34, 197, 94, 0.22)';
    const SEARCH_STATUS_GREEN = '#22c55e';

    let isLoadingPages = false;
    let abortController = null;
    let nextPageToLoad = 2;
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
                0%   { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            #${SCRIPT_ID}-bar {
                position: relative;
                z-index: 5;
                clear: both;
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
                overflow: visible;
            }

            #${SCRIPT_ID}-bar .fs-toolbar-row {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                align-items: center;
                min-width: 0;
                width: 100%;
            }

            #${SCRIPT_ID}-bar .fs-toolbar-left {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                align-items: center;
                min-width: 0;
                flex: 1 1 420px;
            }

            #${SCRIPT_ID}-bar .fs-toolbar-right {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                align-items: center;
                justify-content: flex-end;
                min-width: 0;
                flex: 1 1 280px;
            }

            #${SCRIPT_ID}-bar .fs-search-select {
                flex: 0 1 180px;
                min-width: 165px;
            }

            #${SCRIPT_ID}-bar .fs-search-input {
                flex: 1 1 340px;
                min-width: 240px;
                max-width: 100%;
            }

            #${SCRIPT_ID}-bar .fs-section-line {
                border-top: 1px solid #21262d;
                margin: 10px 0;
            }

            #f-progress-bar.fs-active {
                width: 100% !important;
                background: linear-gradient(
                    90deg,
                    rgba(229, 9, 20, 0.08) 0%,
                    rgba(229, 9, 20, 0.24) 18%,
                    rgba(229, 9, 20, 0.55) 36%,
                    #E50914 50%,
                    rgba(229, 9, 20, 0.55) 64%,
                    rgba(229, 9, 20, 0.24) 82%,
                    rgba(229, 9, 20, 0.08) 100%
                );
                background-size: 220% 100%;
                animation: fs-activity-scan 1.15s linear infinite;
            }

            .fs-search-match {
                outline: 1px solid rgba(34, 197, 94, 0.60);
                box-shadow:
                    0 0 0 1px rgba(34, 197, 94, 0.26) inset,
                    0 0 18px rgba(34, 197, 94, 0.20),
                    0 0 34px rgba(34, 197, 94, 0.12) !important;
            }

            .fs-visible-card {
                border-radius: 14px !important;
                overflow: hidden;
                box-shadow:
                    0 0 0 1px rgba(34,197,94,0.24),
                    0 0 22px rgba(34,197,94,0.22),
                    0 0 40px rgba(34,197,94,0.12) !important;
                transition: box-shadow 0.2s ease, transform 0.2s ease;
            }

            .fs-visible-card:hover {
                box-shadow:
                    0 0 0 1px rgba(34,197,94,0.32),
                    0 0 26px rgba(34,197,94,0.28),
                    0 0 46px rgba(34,197,94,0.16) !important;
                transform: translateY(-1px);
            }

            .fs-hide-pagination {
                display: none !important;
            }

            #f-load-status,
            #f-search-status {
                min-height: 18px;
            }

            #f-custom-pagination {
                margin-top: 18px;
                padding-top: 16px;
                border-top: 1px solid #21262d;
            }

            #f-custom-pagination .fs-pagination-wrap {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                align-items: center;
            }

            #f-custom-pagination a,
            #f-custom-pagination span {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 34px;
                height: 32px;
                padding: 0 10px;
                border-radius: 8px;
                font-size: 13px;
                line-height: 1;
                text-decoration: none;
                box-sizing: border-box;
                white-space: nowrap;
            }

            #f-custom-pagination a {
                color: #e6edf3;
                background: #161b22;
                border: 1px solid rgba(255,255,255,0.10);
                transition: all 0.18s ease;
            }

            #f-custom-pagination a:hover {
                border-color: rgba(34,197,94,0.45);
                box-shadow: 0 0 0 1px rgba(34,197,94,0.12) inset;
                transform: translateY(-1px);
            }

            #f-custom-pagination .current,
            #f-custom-pagination .active {
                color: #ffffff;
                background: linear-gradient(180deg, ${SEARCH_GREEN_TOP} 0%, ${SEARCH_GREEN_BOTTOM} 100%);
                border: 1px solid ${SEARCH_GREEN_BORDER};
                font-weight: 700;
                text-shadow:
                    -1px 0 rgba(0,0,0,0.98),
                    0 1px rgba(0,0,0,0.98),
                    1px 0 rgba(0,0,0,0.98),
                    0 -1px rgba(0,0,0,0.98);
            }

            #fs-empty-state {
                display: none;
                margin: 18px 0 10px 0;
                padding: 18px 16px;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 10px;
                background: #11161c;
                color: #c9d1d9;
                font-size: 14px;
                line-height: 1.5;
                text-align: center;
            }

            @media (max-width: 980px) {
                #${SCRIPT_ID}-bar .fs-toolbar-left,
                #${SCRIPT_ID}-bar .fs-toolbar-right {
                    flex: 1 1 100%;
                    justify-content: flex-start;
                }

                #${SCRIPT_ID}-bar .fs-search-select,
                #${SCRIPT_ID}-bar .fs-search-input {
                    flex: 1 1 100%;
                    min-width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function findContainer() {
        return document.querySelector('div.peliculas') || document.querySelector('.box');
    }

    function findResultsGrid(container = document) {
        return container.querySelector('.item_2.items') ||
               container.querySelector('.item_2');
    }

    function getActiveResultsGrid(container = rootContainer || document) {
        return resultsGrid ||
               findResultsGrid(container) ||
               container.querySelector('.peliculas .item_2.items') ||
               container.querySelector('.box .item_2.items') ||
               container;
    }

    function findNativePaginationElement(doc = document) {
        return doc.querySelector('#paginador, .wp-pagenavi, .pagination, .pagenavi, .nav-links');
    }

    function captureNativePagination() {
        const el = findNativePaginationElement(document);
        if (el) nativePaginationHTML = el.outerHTML;
    }

    function hideNativePagination() {
        document.querySelectorAll('#paginador, .wp-pagenavi, .pagination, .pagenavi, .nav-links')
            .forEach(el => el.classList.add('fs-hide-pagination'));
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
            const text = (clone.textContent || '').trim();
            if (!text) continue;

            if (clone.tagName.toLowerCase() === 'span') {
                const cls = clone.className || '';
                const isCurrent = /current|active/i.test(cls);
                if (isCurrent || /^\d+$/.test(text)) {
                    clone.classList.add('current');
                    wrap.appendChild(clone);
                }
            } else {
                wrap.appendChild(clone);
            }
        }

        if (wrap.children.length) host.appendChild(wrap);
    }

    function ensureEmptyState(container) {
        const itemGrid = getActiveResultsGrid(container);
        let emptyState = document.getElementById('fs-empty-state');

        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.id = 'fs-empty-state';
            emptyState.textContent = 'Press Clear To Return Normal Results or Search In The Custom Search';
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

        if (pageNum <= 1) {
            return base.toString();
        }

        const cleanPath = base.pathname.replace(/\/+$/, '');
        return `${base.origin}${cleanPath}/page/${pageNum}/${base.search}`;
    }

    function normalizeSearchText(str) {
        return (str || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    function squeezeSearchText(str) {
        return normalizeSearchText(str).replace(/[^a-z0-9]+/g, '');
    }

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function matchesCustomSearchText(text, query) {
        if (!query) return true;

        const normalizedText = normalizeSearchText(text);
        const squeezedText = squeezeSearchText(text);
        const tokens = normalizeSearchText(query).split(/[^a-z0-9]+/).filter(Boolean);

        if (!tokens.length) return true;

        const squeezedQuery = tokens.join('');
        if (squeezedQuery && squeezedText.includes(squeezedQuery)) return true;

        const loosePattern = tokens.map(escapeRegExp).join('[^a-z0-9]*');
        try {
            return new RegExp(loosePattern, 'i').test(normalizedText);
        } catch (_) {
            return normalizedText.includes(normalizeSearchText(query));
        }
    }

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
        const a = item.querySelector('h5 a');
        const title = a?.innerText || a?.textContent || '';
        const match = title.match(/–\s*(\d+(\.\d+)?)\s*GB/i);
        return match ? parseFloat(match[1]) : null;
    }

    function getGroup(item) {
        const a = item.querySelector('h5 a');
        const title = a?.innerText || a?.textContent || '';
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

    function getItemKey(item) {
        return item.querySelector('h5 a')?.href ||
               item.querySelector('h5 a')?.textContent?.trim() ||
               item.textContent.trim().slice(0, 200);
    }

    function indexExistingItems(container) {
        for (const item of container.querySelectorAll('.fit.item')) {
            const key = getItemKey(item);
            if (key) seenReleaseLinks.add(key);
        }
    }

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

        select.innerHTML = '<option value="">All Release Groups</option>';
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

    function syncCategorySelectToLocation() {
        const select = document.getElementById('f-category');
        if (!select) return;

        const href = window.location.href.replace(/\/+$/, '/');
        const options = [
            'https://hdencode.org/tag/movies/',
            'https://hdencode.org/tag/tv-shows/',
            'https://hdencode.org/tag/tv-packs/',
            'https://hdencode.org/top-downloads/',
            'https://hdencode.org/quality/2160p/'
        ];

        const matched = options.find(url => href.startsWith(url));
        select.value = matched || 'https://hdencode.org/tag/movies/';
    }

    function getFilterValues() {
        return {
            onlyDV: document.getElementById('f-dv')?.checked || false,
            onlyHDR: document.getElementById('f-hdr')?.checked || false,
            res: document.getElementById('f-res')?.value || '',
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

    function saveFilters() {
        const data = {};
        for (const el of document.querySelectorAll(`#${SCRIPT_ID}-bar input, #${SCRIPT_ID}-bar select`)) {
            if (el.id === 'f-pagelimit' || el.id === 'f-category') continue;
            data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
        }
        try {
            localStorage.setItem('hdencodeFilters', JSON.stringify(data));
        } catch (_) {}
    }

    function loadFilters() {
        try {
            const data = JSON.parse(localStorage.getItem('hdencodeFilters') || '{}');
            for (const [id, val] of Object.entries(data)) {
                if (id === 'f-pagelimit' || id === 'f-category') continue;
                const el = document.getElementById(id);
                if (!el) continue;
                if (el.type === 'checkbox') el.checked = val;
                else el.value = val;
            }
        } catch (_) {}
    }

    function setStatus(text = '') {
        const el = document.getElementById('f-load-status');
        if (el) el.textContent = text;
    }

    function showProgress() {
        const wrap = document.getElementById('f-progress-wrap');
        const bar = document.getElementById('f-progress-bar');
        if (wrap) wrap.style.display = 'block';
        if (bar) bar.classList.add('fs-active');
    }

    function hideProgress(immediate = false) {
        const wrap = document.getElementById('f-progress-wrap');
        const bar = document.getElementById('f-progress-bar');

        const done = () => {
            if (wrap) wrap.style.display = 'none';
            if (bar) bar.classList.remove('fs-active');
        };

        if (immediate) done();
        else setTimeout(done, 350);
    }

    function pauseObserver() {
        if (observer && !observerPaused) {
            observer.disconnect();
            observerPaused = true;
        }
    }

    function resumeObserver() {
        if (observer && observerPaused && resultsGrid) {
            observer.observe(resultsGrid, { childList: true, subtree: true });
            observerPaused = false;
        }
    }

    function styleVisibleResults(container) {
        const items = Array.from(container.querySelectorAll('.fit.item'));
        for (const item of items) {
            if (item.style.display === 'none') {
                item.classList.remove('fs-visible-card');
            } else {
                item.classList.add('fs-visible-card');
            }
        }
    }

    function applyFilters(container) {
        const f = getFilterValues();
        const items = Array.from(container.querySelectorAll('.fit.item'));
        let searchMatches = 0;
        let visibleCount = 0;

        for (const item of items) {
            const matchesBase = itemMatchesBaseFilters(item, f);
            const matchesSearch = f.search ? matchesCustomSearchText(item.innerText, f.search) : false;

            if (f.search) {
                const finalMatch = matchesBase && matchesSearch;
                item.style.display = finalMatch ? '' : 'none';
                item.classList.toggle('fs-search-match', finalMatch);
                if (finalMatch) {
                    searchMatches++;
                    visibleCount++;
                }
            } else {
                item.style.display = matchesBase ? '' : 'none';
                item.classList.remove('fs-search-match');
                if (matchesBase) visibleCount++;
            }
        }

        if (!f.group) buildGroupDropdown(container);

        const searchStatus = document.getElementById('f-search-status');
        if (searchStatus) {
            if (f.search) {
                searchStatus.textContent = isLoadingPages
                    ? `${searchMatches} Results Found For Custom Search — searching more pages...`
                    : `${searchMatches} Results Found For Custom Search`;
                searchStatus.style.display = 'block';
                searchStatus.style.color = SEARCH_STATUS_GREEN;
            } else {
                searchStatus.textContent = '';
                searchStatus.style.display = 'none';
            }
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
            injectLinkButtons(container);

            if (opts.clearStatus) {
                setStatus('');
                const searchStatus = document.getElementById('f-search-status');
                if (searchStatus && !getFilterValues().search) {
                    searchStatus.textContent = '';
                    searchStatus.style.display = 'none';
                }
            }
        });
    }

    function scheduleRefresh(container) {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
            queueUIRefresh(container);
        }, 80);
    }

    function abortActiveLoading(reason = 'stopped') {
        if (!abortController || isStoppingNow) return false;

        isStoppingNow = true;
        suppressObserverUntil = Date.now() + 800;
        activeLoadToken++;
        searchRunId++;

        try {
            abortController.abort(reason);
        } catch (_) {}

        return true;
    }

    function finishStopUI() {
        abortController = null;
        isLoadingPages = false;
        isStoppingNow = false;

        const stopBtn = document.getElementById('f-stop-loading');
        const loadBtn = document.getElementById('f-loadall');

        if (stopBtn) {
            stopBtn.style.display = 'none';
            stopBtn.disabled = false;
        }
        if (loadBtn) loadBtn.disabled = false;

        hideProgress(true);
    }

    function stopLoading() {
        if (!isLoadingPages && !abortController) {
            if (pendingClearAfterStop && rootContainer) {
                pendingClearAfterStop = false;
                clearFilters(rootContainer);
            }
            return;
        }

        if (isStoppingNow) return;

        const didAbort = abortActiveLoading('user-stop');

        const stopBtn = document.getElementById('f-stop-loading');
        const loadBtn = document.getElementById('f-loadall');

        if (stopBtn) stopBtn.disabled = true;
        if (loadBtn) loadBtn.disabled = true;

        setStatus('Stopping search...');
        hideProgress(true);

        if (!didAbort) {
            finishStopUI();
            queueUIRefresh(rootContainer);

            if (pendingClearAfterStop && rootContainer) {
                pendingClearAfterStop = false;
                clearFilters(rootContainer);
            }
        }
    }

    function clearFilters(container) {
        if (clearInProgress) return;

        if (isLoadingPages || abortController || isStoppingNow) {
            pendingClearAfterStop = true;
            stopLoading();

            clearTimeout(clearRetryTimer);
            clearRetryTimer = setTimeout(function waitForStop() {
                if (isLoadingPages || abortController || isStoppingNow) {
                    clearRetryTimer = setTimeout(waitForStop, 60);
                    return;
                }

                pendingClearAfterStop = false;
                clearFilters(container);
            }, 60);

            return;
        }

        clearInProgress = true;
        suppressObserverUntil = Date.now() + 1000;

        try {
            clearTimeout(refreshTimer);
            clearTimeout(clearRetryTimer);
            pauseObserver();

            for (const el of document.querySelectorAll(`#${SCRIPT_ID}-bar input, #${SCRIPT_ID}-bar select`)) {
                if (el.id === 'f-pagelimit') {
                    el.value = 'all';
                } else if (el.id === 'f-category') {
                    continue;
                } else if (el.type === 'checkbox') {
                    el.checked = false;
                } else {
                    el.value = '';
                }
            }

            try {
                localStorage.removeItem('hdencodeFilters');
            } catch (_) {}

            syncCategorySelectToLocation();

            const stopBtn = document.getElementById('f-stop-loading');
            const loadBtn = document.getElementById('f-loadall');

            if (stopBtn) {
                stopBtn.style.display = 'none';
                stopBtn.disabled = false;
            }

            if (loadBtn) {
                loadBtn.disabled = false;
            }

            abortController = null;
            isLoadingPages = false;
            isStoppingNow = false;

            setStatus('');

            const searchStatus = document.getElementById('f-search-status');
            if (searchStatus) {
                searchStatus.textContent = '';
                searchStatus.style.display = 'none';
            }

            applyFilters(container);
            styleVisibleResults(container);
            hideNativePagination();
            renderCustomPagination();
            updateEmptyState(
                container,
                Array.from(container.querySelectorAll('.fit.item')).some(item => item.style.display !== 'none')
            );
        } finally {
            setTimeout(() => {
                resumeObserver();
            }, 50);

            clearInProgress = false;
        }
    }

    async function resetResultsToFirstPage(container, signal, runId) {
        const itemGrid = getActiveResultsGrid(container);
        const firstPageUrl = buildPageUrl(1);

        setStatus('Loading first page...');

        const res = await fetch(firstPageUrl, {
            credentials: 'same-origin',
            signal,
            cache: 'no-store'
        });

        if (!res.ok || signal.aborted || runId !== searchRunId) return false;

        const html = await res.text();
        if (signal.aborted || runId !== searchRunId) return false;

        const doc = new DOMParser().parseFromString(html, 'text/html');
        const nativePager = findNativePaginationElement(doc);
        if (nativePager) nativePaginationHTML = nativePager.outerHTML;

        doc.querySelectorAll('#paginador, .wp-pagenavi, .pagination, .pagenavi, .nav-links, .page-numbers')
            .forEach(el => el.remove());

        const sourceGrid = findResultsGrid(doc) || doc;
        const fetchedItems = Array.from(sourceGrid.querySelectorAll('.fit.item'));
        if (!fetchedItems.length) return false;

        const fragment = document.createDocumentFragment();
        seenReleaseLinks.clear();

        for (const node of fetchedItems) {
            const clone = document.importNode(node, true);
            clone.removeAttribute('style');
            fragment.appendChild(clone);

            const key = getItemKey(clone);
            if (key) seenReleaseLinks.add(key);
        }

        pauseObserver();
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                itemGrid.innerHTML = '';
                itemGrid.appendChild(fragment);
                resolve();
            });
        });
        resumeObserver();

        resultsGrid = itemGrid;
        nextPageToLoad = 2;
        hideNativePagination();
        renderCustomPagination();
        injectLinkButtons(container);
        applyFilters(container);

        return true;
    }

    async function loadAllPages(container) {
        const limitVal = document.getElementById('f-pagelimit')?.value || 'all';
        const limit = limitVal === 'all' ? Number.MAX_SAFE_INTEGER : parseInt(limitVal, 10);
        const runId = ++searchRunId;
        const localToken = ++activeLoadToken;

        showProgress();
        abortController = new AbortController();
        const { signal } = abortController;

        let loaded = 0;
        let stopReason = 'complete';

        try {
            baseListingUrl = getBaseListingUrl();
            resultsGrid = getActiveResultsGrid(container);

            const firstPageLoaded = await resetResultsToFirstPage(container, signal, runId);
            if (!firstPageLoaded) {
                stopReason = signal.aborted ? 'stopped' : 'complete';
                return;
            }

            loaded = 1;

            const firstState = applyFilters(container);
            if (getFilterValues().search) {
                setStatus(`${firstState.searchMatches} result(s) found so far — scanned ${loaded} page(s)`);
            } else {
                setStatus(`${loaded} page(s) loaded`);
            }

            for (let p = 2; loaded < limit; p++) {
                if (signal.aborted || runId !== searchRunId || localToken !== activeLoadToken) {
                    stopReason = 'stopped';
                    break;
                }

                setStatus(`Checking page ${p}`);

                const url = buildPageUrl(p);
                const res = await fetch(url, {
                    credentials: 'same-origin',
                    signal,
                    cache: 'no-store'
                });

                if (!res.ok) {
                    stopReason = 'complete';
                    break;
                }

                const html = await res.text();
                if (signal.aborted || runId !== searchRunId || localToken !== activeLoadToken) {
                    stopReason = 'stopped';
                    break;
                }

                const doc = new DOMParser().parseFromString(html, 'text/html');
                doc.querySelectorAll('#paginador, .wp-pagenavi, .pagination, .pagenavi, .nav-links, .page-numbers')
                    .forEach(el => el.remove());

                const sourceGrid = findResultsGrid(doc) || doc;
                const fetchedItems = Array.from(sourceGrid.querySelectorAll('.fit.item'));
                if (!fetchedItems.length) {
                    stopReason = 'complete';
                    break;
                }

                const itemGrid = getActiveResultsGrid(container);
                const fragment = document.createDocumentFragment();
                let newItemsCount = 0;

                for (const node of fetchedItems) {
                    const key = getItemKey(node);
                    if (!key || seenReleaseLinks.has(key)) continue;

                    const clone = document.importNode(node, true);
                    clone.removeAttribute('style');
                    fragment.appendChild(clone);
                    seenReleaseLinks.add(key);
                    newItemsCount++;
                }

                if (newItemsCount === 0) {
                    continue;
                }

                pauseObserver();
                await new Promise(resolve => {
                    requestAnimationFrame(() => {
                        itemGrid.appendChild(fragment);
                        resolve();
                    });
                });
                resumeObserver();

                resultsGrid = itemGrid;
                loaded++;
                nextPageToLoad = p + 1;

                const state = applyFilters(container);
                injectLinkButtons(container);

                if (getFilterValues().search) {
                    setStatus(`${state.searchMatches} result(s) found so far — scanned ${loaded} page(s)`);
                } else {
                    setStatus(`${loaded} page(s) loaded`);
                }

                await new Promise(r => setTimeout(r, 60));
            }
        } catch (e) {
            if (e.name === 'AbortError' || signal.aborted) {
                stopReason = 'stopped';
            } else {
                console.error(`${SCRIPT_NAME}: load pages error`, e);
                stopReason = 'error';
            }
        } finally {
            const wasStopping = isStoppingNow;

            finishStopUI();

            const finalState = applyFilters(container);
            queueUIRefresh(container);

            if (!clearInProgress) {
                if (stopReason === 'stopped' || wasStopping) {
                    setStatus(getFilterValues().search
                        ? `${finalState.searchMatches} result(s) found`
                        : (loaded > 0 ? `Stopped — ${loaded} page(s) loaded` : 'Search stopped'));
                } else if (stopReason === 'error') {
                    setStatus('Error loading pages');
                } else {
                    setStatus(getFilterValues().search
                        ? `${finalState.searchMatches} result(s) found`
                        : (loaded > 0 ? `${loaded} page(s) loaded` : 'No more pages to load'));
                }
            }

            if (pendingClearAfterStop && !clearInProgress) {
                setTimeout(() => {
                    if (rootContainer && !isLoadingPages && !abortController && !isStoppingNow) {
                        pendingClearAfterStop = false;
                        clearFilters(rootContainer);
                    }
                }, 40);
            }

            setTimeout(() => {
                const t = document.getElementById('f-load-status')?.textContent || '';
                if (
                    t === 'Error loading pages' ||
                    t === 'Search stopped' ||
                    t === 'Stopping search...' ||
                    t.startsWith('Stopped —') ||
                    t.endsWith('page(s) loaded') ||
                    t.endsWith('result(s) found') ||
                    t === 'No more pages to load'
                ) {
                    setStatus('');
                }
            }, 2500);
        }
    }

    async function fetchLinks(url) {
        if (linkCache.has(url)) return linkCache.get(url);

        try {
            const getRes = await fetch(url, { credentials: 'same-origin' });
            if (!getRes.ok) return null;

            const doc = new DOMParser().parseFromString(await getRes.text(), 'text/html');
            const form = doc.querySelector('form[id^="content-protector-access-form"]');
            if (!form) return null;

            const formData = new FormData();
            for (const input of form.querySelectorAll('input')) {
                if (input.name) formData.append(input.name, input.value);
            }

            const action = new URL(form.getAttribute('action'), url).href;
            const postRes = await fetch(action, {
                method: 'POST',
                credentials: 'same-origin',
                body: formData,
            });
            if (!postRes.ok) return null;

            const unlockedDoc = new DOMParser().parseFromString(await postRes.text(), 'text/html');

            const HOST_NAMES = {
                rg: 'Rapidgator',
                rapidgator: 'Rapidgator',
                nf: 'Nitroflare',
                nitroflare: 'Nitroflare',
                ddl: 'DDL',
                mega: 'Mega',
                '1fichier': '1Fichier',
                ul: 'Uploadgig',
                uploadgig: 'Uploadgig',
                katfile: 'Katfile',
                filefox: 'Filefox',
            };

            const links = [];
            for (const blockquote of unlockedDoc.querySelectorAll('.content-protector-access-form blockquote')) {
                const img = blockquote.previousElementSibling?.querySelector('img');
                const raw = (img?.alt || img?.src?.split('/').pop().replace(/\.(png|jpg|gif)$/i, '') || 'Link')
                    .toLowerCase()
                    .trim();
                const host = HOST_NAMES[raw] || raw.charAt(0).toUpperCase() + raw.slice(1);

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
            color: ACCENT,
            border: `1px solid ${ACCENT_BORDER}`,
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

                const HOST_COLORS = {
                    Rapidgator: '#00b4d8',
                    Nitroflare: '#f59e0b',
                    Mega: '#e74c3c',
                    '1Fichier': '#8b5cf6',
                    Uploadgig: '#22c55e',
                    Katfile: '#ec4899',
                    Filefox: '#f97316',
                    DDL: '#8b949e',
                };

                panel.innerHTML = Object.entries(grouped).map(([host, urls]) => {
                    const color = HOST_COLORS[host] || '#8b949e';
                    const allUrls = urls.join('\n');

                    return `<div style="margin-bottom:8px;">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:3px;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color}; flex-shrink:0;"></span>
                                <span style="color:#8b949e; text-transform:uppercase; font-size:10px; letter-spacing:0.5px; font-weight:600;">${host}</span>
                            </div>
                            ${urls.length > 1 ? `<span class="fs-copy-btn" data-url="${allUrls}" data-label="📋 Copy all" title="Copy all ${host} links"
                                style="cursor:pointer; font-size:10px; color:#8b949e; white-space:nowrap;
                                       padding:1px 6px; border:1px solid #30363d; border-radius:4px;
                                       user-select:none; flex-shrink:0;">📋 Copy all</span>` : ''}
                        </div>
                        ${urls.map(u =>
                            `<span style="display:inline-flex; align-items:center; gap:6px; margin:1px 0;">
                                <a href="${u}" target="_blank"
                                    style="color:${ACCENT}; text-decoration:none; word-break:break-all;">${u}</a>
                                <span class="fs-copy-btn" data-url="${u}" data-label="📋" title="Copy link"
                                    style="cursor:pointer; font-size:11px; color:#8b949e; white-space:nowrap;
                                           padding:1px 5px; border:1px solid #30363d; border-radius:4px;
                                           user-select:none; flex-shrink:0;">📋</span>
                            </span>`
                        ).join('<br>')}
                    </div>`;
                }).join('');
            }

            btn.innerHTML = '🔗 Links';
            panel.style.display = 'block';
            open = true;

            panel.querySelectorAll('.fs-copy-btn').forEach(copyBtn => {
                copyBtn.addEventListener('mouseover', () => {
                    copyBtn.style.color = '#e6edf3';
                    copyBtn.style.borderColor = '#8b949e';
                });

                copyBtn.addEventListener('mouseout', () => {
                    copyBtn.style.color = '#8b949e';
                    copyBtn.style.borderColor = '#30363d';
                });

                copyBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const urlToCopy = copyBtn.dataset.url;
                    const originalLabel = copyBtn.dataset.label || '📋';

                    try {
                        await navigator.clipboard.writeText(urlToCopy);
                        copyBtn.textContent = '✓';
                        copyBtn.style.color = ACCENT;
                        copyBtn.style.borderColor = ACCENT;
                        setTimeout(() => {
                            copyBtn.textContent = originalLabel;
                            copyBtn.style.color = '#8b949e';
                            copyBtn.style.borderColor = '#30363d';
                        }, 1500);
                    } catch (_) {
                        copyBtn.textContent = '✗';
                        setTimeout(() => {
                            copyBtn.textContent = originalLabel;
                        }, 1500);
                    }
                });
            });
        });

        btn.addEventListener('mouseover', () => {
            if (!open) btn.style.background = ACCENT_BG;
        });

        btn.addEventListener('mouseout', () => {
            if (!open) btn.style.background = 'transparent';
        });

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

    function createBar() {
        const bar = document.createElement('div');
        bar.id = `${SCRIPT_ID}-bar`;

        Object.assign(bar.style, {
            background: '#0d1117',
            padding: '14px 18px 18px 18px',
            borderRadius: '12px',
            border: '1px solid #21262d',
            margin: '0 0 28px 0',
            color: '#e6edf3',
            fontSize: '13px',
            boxShadow: '0 4px 20px rgba(229,9,20,0.15)',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflow: 'visible'
        });

        bar.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                <strong style="color:${ACCENT}; font-size:14px; letter-spacing:0.5px;">⚡ ${SCRIPT_NAME}</strong>
            </div>

            <div class="fs-toolbar-row">
                <div class="fs-toolbar-left">
                    <label style="display:flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap;">
                        <input type="checkbox" id="f-dv" style="accent-color:${ACCENT};">
                        <span>Dolby Vision</span>
                    </label>

                    <label style="display:flex; align-items:center; gap:4px; cursor:pointer; white-space:nowrap;">
                        <input type="checkbox" id="f-hdr" style="accent-color:${ACCENT};">
                        <span>HDR</span>
                    </label>

                    <select id="f-res" style="${INPUT_STYLE} width:145px;">
                        <option value="">All Resolutions</option>
                        <option value="2160p">2160p</option>
                        <option value="1080p">1080p</option>
                        <option value="720p">720p</option>
                    </select>

                    <input type="number" id="f-rating" placeholder="Minimum Rating" step="0.1" min="0" max="10"
                        style="${INPUT_STYLE} width:145px;">

                    <input type="number" id="f-minsize" placeholder="Min GB" min="0"
                        style="${INPUT_STYLE} width:88px;">

                    <input type="number" id="f-maxsize" placeholder="Max GB" min="0"
                        style="${INPUT_STYLE} width:88px;">
                </div>

                <div class="fs-toolbar-right">
                    <select id="f-category" style="${INPUT_STYLE} width:150px;">
                        <option value="https://hdencode.org/tag/movies/">Movies</option>
                        <option value="https://hdencode.org/tag/tv-shows/">TV Shows</option>
                        <option value="https://hdencode.org/tag/tv-packs/">TV Packs</option>
                        <option value="https://hdencode.org/top-downloads/">Top Downloads</option>
                        <option value="https://hdencode.org/quality/2160p/">4K UHD</option>
                    </select>
                </div>
            </div>

            <div class="fs-section-line"></div>

            <div class="fs-toolbar-row">
                <div class="fs-toolbar-left">
                    <select id="f-group" class="fs-search-select" style="${INPUT_STYLE} width:165px;">
                        <option value="">All Release Groups</option>
                    </select>

                    <input type="text" id="f-search" class="fs-search-input" placeholder="Search anything..."
                        style="${INPUT_STYLE} width:100%;">
                </div>

                <div class="fs-toolbar-right">
                    <select id="f-pagelimit" style="${INPUT_STYLE} width:100px;">
                        <option value="all">All Pages</option>
                        <option value="5">5 Pages</option>
                        <option value="10">10 Pages</option>
                        <option value="20">20 Pages</option>
                        <option value="50">50 Pages</option>
                        <option value="100">100 Pages</option>
                    </select>

                    <button id="f-stop-loading"
                        style="display:none; background:transparent; color:#f59e0b;
                               border:1px solid rgba(245,158,11,0.35);
                               border-radius:6px; padding:5px 12px; cursor:pointer; font-size:13px;
                               height:30px; box-sizing:border-box; transition:all 0.2s; white-space:nowrap;">
                        ⏹ Stop Page Loading
                    </button>

                    <button id="f-loadall"
                        style="background:linear-gradient(180deg, ${SEARCH_GREEN_TOP} 0%, ${SEARCH_GREEN_BOTTOM} 100%);
                               color:#ffffff;
                               border:1px solid ${SEARCH_GREEN_BORDER};
                               border-radius:8px; padding:5px 16px; cursor:pointer; font-size:13px;
                               font-weight:800; height:30px; box-sizing:border-box; transition:all 0.2s ease;
                               white-space:nowrap;
                               -webkit-text-stroke:0.9px rgba(0,0,0,0.98);
                               text-shadow:
                                   -1px 0 rgba(0,0,0,0.98),
                                   0 1px rgba(0,0,0,0.98),
                                   1px 0 rgba(0,0,0,0.98),
                                   0 -1px rgba(0,0,0,0.98),
                                   -1px -1px rgba(0,0,0,0.75),
                                   1px 1px rgba(0,0,0,0.75);
                               box-shadow:
                                   inset 0 1px 0 rgba(255,255,255,0.14),
                                   0 0 0 1px rgba(20,83,45,0.5),
                                   0 8px 18px rgba(0,0,0,0.24),
                                   0 0 12px ${SEARCH_GREEN_GLOW};">
                        Search
                    </button>

                    <div style="width:1px; height:20px; background:#30363d;"></div>

                    <button id="f-clear"
                        style="background:transparent; color:#e06c75;
                               border:1px solid rgba(224,108,117,0.35);
                               border-radius:6px; padding:5px 12px; cursor:pointer; font-size:13px;
                               height:30px; box-sizing:border-box; transition:all 0.2s; white-space:nowrap;">
                        ✕ Clear
                    </button>
                </div>
            </div>

            <div style="margin-top:12px;">
                <div id="f-load-status"
                    style="color:#8b949e; font-size:12px; line-height:18px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>
            </div>

            <div style="margin-top:4px; margin-bottom:12px;">
                <div id="f-search-status"
                    style="display:none; color:${SEARCH_STATUS_GREEN}; font-size:12px; font-weight:700; letter-spacing:0.2px; line-height:18px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>
            </div>

            <div id="f-progress-wrap" style="display:none; margin-top:6px;">
                <div style="background:#21262d; border-radius:999px; height:6px; overflow:hidden;">
                    <div id="f-progress-bar" style="height:100%; width:100%; border-radius:999px;"></div>
                </div>
            </div>

            <div id="f-custom-pagination"></div>
        `;

        bar.addEventListener('mouseover', e => {
            if (e.target.id === 'f-loadall') {
                e.target.style.background = `linear-gradient(180deg, ${SEARCH_GREEN_HOVER_TOP} 0%, ${SEARCH_GREEN_HOVER_BOTTOM} 100%)`;
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow =
                    'inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px rgba(21,128,61,0.60), 0 10px 20px rgba(0,0,0,0.28), 0 0 16px rgba(34,197,94,0.24)';
            }
            if (e.target.id === 'f-stop-loading') {
                e.target.style.background = 'rgba(245,158,11,0.12)';
                e.target.style.borderColor = 'rgba(245,158,11,0.6)';
            }
            if (e.target.id === 'f-clear') {
                e.target.style.background = 'rgba(224,108,117,0.12)';
                e.target.style.borderColor = 'rgba(224,108,117,0.6)';
            }
        });

        bar.addEventListener('mouseout', e => {
            if (e.target.id === 'f-loadall') {
                e.target.style.background = `linear-gradient(180deg, ${SEARCH_GREEN_TOP} 0%, ${SEARCH_GREEN_BOTTOM} 100%)`;
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow =
                    `inset 0 1px 0 rgba(255,255,255,0.14),
                     0 0 0 1px rgba(20,83,45,0.5),
                     0 8px 18px rgba(0,0,0,0.24),
                     0 0 12px ${SEARCH_GREEN_GLOW}`;
            }
            if (e.target.id === 'f-stop-loading') {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = 'rgba(245,158,11,0.35)';
            }
            if (e.target.id === 'f-clear') {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = 'rgba(224,108,117,0.35)';
            }
        });

        return bar;
    }

    function createObserver() {
        if (!resultsGrid) return;

        if (observer) {
            try { observer.disconnect(); } catch (_) {}
        }

        let debounceTimer;
        observer = new MutationObserver(() => {
            if (observerPaused || clearInProgress || isStoppingNow) return;
            if (Date.now() < suppressObserverUntil) return;

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                indexExistingItems(rootContainer);
                queueUIRefresh(rootContainer);
            }, 100);
        });

        observer.observe(resultsGrid, { childList: true, subtree: true });
        observerPaused = false;
    }

    function init(container) {
        if (document.getElementById(`${SCRIPT_ID}-bar`)) return;

        rootContainer = container;
        resultsGrid = getActiveResultsGrid(container);
        baseListingUrl = getBaseListingUrl();
        nextPageToLoad = 2;

        injectStyles();
        captureNativePagination();
        hideNativePagination();
        indexExistingItems(container);

        const bar = createBar();
        resultsGrid.insertAdjacentElement('beforebegin', bar);
        resultsGrid.style.marginTop = '6px';

        ensureEmptyState(container);
        renderCustomPagination();

        const searchInput = bar.querySelector('#f-search');

        bar.querySelector('#f-clear').addEventListener('click', () => clearFilters(container));
        bar.querySelector('#f-stop-loading').addEventListener('click', () => stopLoading());

        bar.querySelector('#f-loadall').addEventListener('click', async function () {
            if (clearInProgress || isStoppingNow) return;
            if (isLoadingPages && abortController) return;

            this.disabled = true;

            const stopBtn = document.getElementById('f-stop-loading');
            if (stopBtn) {
                stopBtn.style.display = 'inline-block';
                stopBtn.disabled = false;
            }

            isLoadingPages = true;
            isStoppingNow = false;
            baseListingUrl = getBaseListingUrl();
            nextPageToLoad = 2;
            resultsGrid = getActiveResultsGrid(container);

            applyFilters(container);
            await loadAllPages(container);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!isLoadingPages && !clearInProgress && !isStoppingNow) {
                    bar.querySelector('#f-loadall').click();
                }
            }
        });

        for (const el of bar.querySelectorAll('input, select')) {
            if (el.id === 'f-search' || el.id === 'f-category') continue;
            el.addEventListener('input', () => applyFilters(container));
        }

        bar.querySelector('#f-category').addEventListener('change', function () {
            const targetUrl = this.value;
            if (targetUrl && window.location.href.replace(/\/+$/, '/') !== targetUrl.replace(/\/+$/, '/')) {
                window.location.href = targetUrl;
            }
        });

        searchInput.addEventListener('input', () => applyFilters(container));

        buildGroupDropdown(container);
        loadFilters();
        syncCategorySelectToLocation();
        applyFilters(container);
        injectLinkButtons(container);
        createObserver();
    }

    function waitForContainer() {
        const container = findContainer();
        if (container) init(container);
        else setTimeout(waitForContainer, 400);
    }

    waitForContainer();
})();
