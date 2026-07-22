// ==UserScript==
// @name         Factor - Hide Sold Out (Stable)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @match        https://*.factor75.com/*
// @match        https://*.factor.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const hidden = new WeakSet();

    function process(root = document) {

        root.querySelectorAll('[data-test-id="product-label-sold-out"]').forEach(label => {

            const card = label.closest('li');

            if (!card || hidden.has(card))
                return;

            hidden.add(card);

            // Remove it completely instead of display:none
            card.remove();
        });
    }

    process();

    new MutationObserver(mutations => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType === 1)
                    process(node);
            }
        }
    }).observe(document.body, {
        childList: true,
        subtree: true
    });

})();