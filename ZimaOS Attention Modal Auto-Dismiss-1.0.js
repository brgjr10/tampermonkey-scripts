// ==UserScript==
// @name         ZimaOS Attention Modal Auto-Dismiss
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically dismisses the ZimaOS "Attention" import modal
// @author       You
// @match        http://192.168.4.110/*
// @match        http://192.168.4.110:*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const MODAL_TITLE_TEXT = '⚠️ Attention';
    const OK_TEXT = 'OK';

    function log(msg) {
        console.log('[ZimaDismiss] ' + msg);
    }

    function getVisibleText(node) {
        if (!node) return '';
        return node.textContent.replace(/\s+/g, ' ').trim();
    }

    function closeModalInDoc(doc, label) {
        const cards = doc.querySelectorAll('.modal-card');
        for (const card of cards) {
            const title = card.querySelector('.modal-card-title');
            if (!title || getVisibleText(title) !== MODAL_TITLE_TEXT) continue;

            const btn = card.querySelector('button');
            if (btn && getVisibleText(btn) === OK_TEXT) {
                log(label + ': clicking OK');
                btn.click();
            }

            const modal = card.closest('.modal');
            if (modal && modal.classList.contains('is-active')) {
                log(label + ': removing .is-active from .modal');
                modal.classList.remove('is-active');
            }

            const dialog = doc.querySelector('.dialog.modal.is-active');
            if (dialog) {
                log(label + ': removing .is-active from .dialog.modal');
                dialog.classList.remove('is-active');
            }

            const html = doc.documentElement;
            if (html.classList.contains('is-clipped')) {
                log(label + ': removing .is-clipped from <html>');
                html.classList.remove('is-clipped');
            }

            const body = doc.body;
            if (body.classList.contains('is-clipped')) {
                log(label + ': removing .is-clipped from <body>');
                body.classList.remove('is-clipped');
            }

            return true;
        }
        return false;
    }

    function scanIframes() {
        const frames = document.querySelectorAll('iframe');
        for (const frame of frames) {
            try {
                const doc = frame.contentDocument || frame.contentWindow.document;
                if (!doc) continue;
                if (closeModalInDoc(doc, 'iframe[' + frame.src + ']')) return true;
            } catch (e) {
                log('iframe cross-origin: ' + frame.src);
            }
        }
        return false;
    }

    let dismissed = false;
    let pollCount = 0;

    function init() {
        log('Script loaded, @match=' + location.href);

        const observer = new MutationObserver(() => {
            if (!dismissed) {
                closeModalInDoc(document, 'main');
                scanIframes();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });

        const interval = setInterval(() => {
            pollCount++;
            if (!dismissed) {
                if (closeModalInDoc(document, 'main') || scanIframes()) {
                    dismissed = true;
                    clearInterval(interval);
                    observer.disconnect();
                    log('Modal dismissed after ' + pollCount + ' polls');
                }
            } else {
                clearInterval(interval);
            }
        }, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
