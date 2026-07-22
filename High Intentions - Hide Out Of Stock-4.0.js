// ==UserScript==
// @name         High Intentions - Hide Out Of Stock
// @namespace    https://www.highintentions.life/
// @version      4.0
// @description  Hide out-of-stock products with toolbar toggle
// @match        https://www.highintentions.life/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const KEY = 'tm_hide_oos';

    function hideProducts() {
        const hide = localStorage.getItem(KEY) === 'true';

        document.querySelectorAll('.product-col').forEach(product => {
            const outOfStock = product.querySelector(
                '[data-stock="out-of-stock"], .out-of-stock'
            );

            product.style.display = (hide && outOfStock) ? 'none' : '';
        });
    }

    function updateButton() {
        const btn = document.getElementById('tm-hide-oos-btn');
        if (!btn) return;

        const enabled = localStorage.getItem(KEY) === 'true';

        btn.textContent = enabled
            ? 'Hide OOS ✓'
            : 'Hide OOS';
    }

    function addButton() {
        if (document.getElementById('tm-hide-oos-btn')) return;

        // ONLY target the toolbar containing the grid/list controls
        const collectionView = document.querySelector('.collection-view');
        if (!collectionView) return;

        const btn = document.createElement('button');
        btn.id = 'tm-hide-oos-btn';
        btn.type = 'button';
        btn.className = 'button button-lined-soft lh-1 p-1 ml-2';

        btn.addEventListener('click', () => {
            const current = localStorage.getItem(KEY) === 'true';
            localStorage.setItem(KEY, (!current).toString());

            hideProducts();
            updateButton();
        });

        // APPEND INSIDE collection-view
        // This cannot move the pagination block
        collectionView.appendChild(btn);

        updateButton();
    }

    function init() {
        addButton();
        hideProducts();
    }

    // Initial run
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-hide products loaded via "Show More Products"
    const observer = new MutationObserver(() => {
        hideProducts();

        if (!document.getElementById('tm-hide-oos-btn')) {
            addButton();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();