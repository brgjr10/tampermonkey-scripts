// ==UserScript==
// @name         ZimaOS Glass Theme
// @namespace    https://tampermonkey.net/
// @version      1.0
// @description  A refined glassmorphism / neon-accent theme for the ZimaOS dashboard.
// @match        http://<<ZIMA_HOST>>/*
// @match        https://<<ZIMA_HOST>>/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Only run on the ZimaOS dashboard shell.
    if (!document.querySelector('#app') || !document.querySelector('#wallpaper')) return;

    /* ----------------------------------------------------------
       Theme tokens — tweak the accent here to re-skin everything.
    ---------------------------------------------------------- */
    const ACCENT   = '#4f8cff';
    const ACCENT2  = '#55c7ff';
    const GLASS    = 'rgba(22, 27, 38, 0.55)';
    const GLASS_HI = 'rgba(30, 37, 52, 0.62)';
    const BORDER   = 'rgba(255, 255, 255, 0.09)';
    const SHADOW   = '0 18px 45px rgba(0, 0, 0, 0.40)';

    GM_addStyle(`
    :root{
        --accent:${ACCENT};
        --accent-2:${ACCENT2};
        --glass:${GLASS};
        --glass-hi:${GLASS_HI};
        --border:${BORDER};
        --shadow:${SHADOW};
    }

    /* ---------- Wallpaper: vignette + accent glow ---------- */
    #wallpaper{
        background-image:url(https://i0.wp.com/cytel.com/wp-content/uploads/2024/05/iStock-1755974098-scaled.jpg?fit=2560,1440&ssl=1)!important;
        transform:scale(1.06);
        filter:brightness(.62) saturate(1.15);
        transition:filter .6s ease, transform 12s ease-out;
    }
    #wallpaper::after{
        content:"";
        position:absolute;
        inset:0;
        pointer-events:none;
        background:
            radial-gradient(120% 90% at 50% -10%, ${ACCENT}22, transparent 55%),
            radial-gradient(80% 80% at 100% 100%, ${ACCENT2}14, transparent 60%),
            linear-gradient(180deg, rgba(8,10,15,.40), rgba(8,10,15,.82));
    }

    /* ---------- Header: frosted glass + gradient edge ---------- */
    #page-header{
        background:linear-gradient(180deg, rgba(18,23,33,.70), rgba(18,23,33,.45))!important;
        backdrop-filter:blur(22px) saturate(140%)!important;
        -webkit-backdrop-filter:blur(22px) saturate(140%)!important;
        border-bottom:1px solid transparent!important;
        border-image:linear-gradient(90deg, transparent, ${ACCENT}66, ${ACCENT2}44, transparent) 1!important;
    }

    /* ---------- Cards: layered glassmorphism ---------- */
    .rounded-lg,
    .bg-blur{
        position:relative;
        background:
            linear-gradient(180deg, rgba(255,255,255,.04), transparent 40%),
            var(--glass)!important;
        backdrop-filter:blur(26px) saturate(150%)!important;
        -webkit-backdrop-filter:blur(26px) saturate(150%)!important;
        border:1px solid var(--border)!important;
        border-radius:22px!important;
        box-shadow:var(--shadow)!important;
        transition:transform .28s cubic-bezier(.22,1,.36,1),
                   box-shadow .28s ease,
                   border-color .28s ease;
        will-change:transform;
    }
    .rounded-lg::before{
        content:"";
        position:absolute;
        inset:0;
        border-radius:inherit;
        padding:1px;
        background:linear-gradient(160deg, ${ACCENT}33, transparent 45%);
        -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite:xor;
                mask-composite:exclude;
        opacity:0;
        transition:opacity .28s ease;
        pointer-events:none;
    }
    .rounded-lg:hover{
        transform:translateY(-4px);
        border-color:${ACCENT}40!important;
        box-shadow:
            0 24px 55px rgba(0,0,0,.50),
            0 0 0 1px ${ACCENT}33,
            0 0 32px ${ACCENT}22;
    }
    .rounded-lg:hover::before{ opacity:1; }

    /* ---------- Buttons ---------- */
    button{
        transition:transform .18s ease, background-color .18s ease, box-shadow .18s ease!important;
    }
    button:hover{ transform:scale(1.06); }
    button:active{ transform:scale(.96); }

    /* ---------- Search input ---------- */
    .bg-blur{
        border-radius:18px!important;
    }
    input[placeholder]{
        border-radius:18px!important;
    }
    input[placeholder]:focus{
        outline:none!important;
        box-shadow:
            0 0 0 2px var(--accent),
            0 0 28px ${ACCENT}66!important;
    }

    /* ---------- Scrollbars ---------- */
    .no-scrollbar{ scrollbar-width:thin; scrollbar-color:${ACCENT}88 transparent; }
    ::-webkit-scrollbar{ width:11px; height:11px; }
    ::-webkit-scrollbar-track{ background:rgba(255,255,255,.03); border-radius:20px; }
    ::-webkit-scrollbar-thumb{
        background:linear-gradient(${ACCENT}, ${ACCENT2});
        border:2px solid transparent;
        background-clip:padding-box;
        border-radius:20px;
    }
    ::-webkit-scrollbar-thumb:hover{ background:${ACCENT}; background-clip:padding-box; }

    /* ---------- Progress / storage bars ---------- */
    [data-pc-name="progressbar"]{
        border-radius:999px!important;
        overflow:hidden;
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);
    }
    [data-pc-section="value"]{
        background:linear-gradient(90deg, ${ACCENT}, ${ACCENT2})!important;
        box-shadow:0 0 12px ${ACCENT}66!important;
    }

    /* ---------- CPU / RAM gauge rings ---------- */
    svg circle.circle-container__background{
        stroke:rgba(255,255,255,.10)!important;
    }
    svg circle.circle-container__progress{
        stroke:url(#gradient)!important;
        filter:drop-shadow(0 0 6px ${ACCENT2}cc);
        transition:stroke-dashoffset .8s ease;
    }

    /* ---------- Network chart frame ---------- */
    [data-pc-name="chart"]{
        border-radius:16px;
        background:rgba(255,255,255,.03);
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.05);
        padding:6px;
    }

    /* ---------- Notification dot pulse ---------- */
    #page-header .bg-red-5{
        box-shadow:0 0 0 0 ${ACCENT}99;
        animation:pulse-dot 2s infinite;
    }
    @keyframes pulse-dot{
        0%{ box-shadow:0 0 0 0 rgba(255,90,90,.7); }
        70%{ box-shadow:0 0 0 7px rgba(255,90,90,0); }
        100%{ box-shadow:0 0 0 0 rgba(255,90,90,0); }
    }

    /* ---------- Text & selection ---------- */
    ::selection{ background:${ACCENT}55; color:#fff; }

    /* ---------- Toast container (empty shell, hidden) ---------- */
    [data-pc-name="toast"]{
        display:none!important;
    }

    /* ---------- Settings / dialog dark glass ---------- */
    [data-pc-name="dialog"]{
        background:linear-gradient(180deg, rgba(255,255,255,.05), transparent 30%),
                   var(--glass-hi)!important;
        backdrop-filter:blur(28px) saturate(150%)!important;
        -webkit-backdrop-filter:blur(28px) saturate(150%)!important;
        border:1px solid var(--border)!important;
        box-shadow:var(--shadow)!important;
    }
    /* Inner shell (bg-neutral-100) + every white panel */
    [data-pc-name="dialog"] .bg-neutral-100,
    [data-pc-name="dialog"] .bg-white{
        background:rgba(255,255,255,.045)!important;
        border-color:var(--border)!important;
    }
    /* Sidebar + highlighted tab stays readable */
    [data-pc-name="dialog"] .border-neutral-300,
    [data-pc-name="dialog"] .border-neutral-200{
        border-color:var(--border)!important;
    }
    /* Flip the dark text to light so it stays legible on the dark glass */
    [data-pc-name="dialog"] .text-neutral-900,
    [data-pc-name="dialog"] .text-neutral-800,
    [data-pc-name="dialog"] .text-neutral-700{
        color:#eef1f7!important;
    }
    [data-pc-name="dialog"] .text-neutral-500,
    [data-pc-name="dialog"] .text-neutral-400{
        color:#aab2c2!important;
    }
    /* Keep the colored "Create storage" promo card untouched */
    [data-pc-name="dialog"] .bg-\\[url\\(/images/noise-bg-success\\.png\\)\\]{
        background-image:url(/images/noise-bg-success.png)!important;
    }
    `);

    /* ----------------------------------------------------------
       Re-apply heavy styles to nodes injected after load
       (the App Store / swiper content is mounted asynchronously).
    ---------------------------------------------------------- */
    const refine = () => {
        document.querySelectorAll('.rounded-lg, .bg-blur').forEach(el => {
            el.style.willChange = 'transform';
        });
    };

    refine();
    new MutationObserver(refine).observe(document.body, {
        childList: true,
        subtree: true
    });

    /* ----------------------------------------------------------
       Auto-login: when the login form appears (logged out),
       fill it and submit. Put credentials in CONFIG to skip the
       prompt; leave blank to be asked once per session.
    ---------------------------------------------------------- */
    const LOGIN = { user: '<ZIMA_USER>', pass: '<ZIMA_PASSWORD>' };

    const setNativeValue = (el, val) => {
        const proto = el.tagName === 'TEXTAREA'
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    };

    let loginTried = false;

    const tryAutoLogin = () => {
        const pwd = document.querySelector('input[type="password"]');
        if (!pwd) { loginTried = false; return; }   // reset once we're back in

        let user = LOGIN.user, pass = LOGIN.pass;
        if (!user || !pass) {
            if (loginTried) return;
            user = window.prompt('ZimaOS username:');
            pass = window.prompt('ZimaOS password:');
            if (!user || !pass) return;
        }

        const scope = pwd.closest('form') || pwd.parentElement || document;
        const inputs = [...scope.querySelectorAll('input')].filter(i => i !== pwd);
        const userInput = inputs.find(i =>
            i.type === 'text' || i.type === 'email' ||
            /user|name|email/i.test(i.name + i.id + (i.placeholder || ''))
        ) || inputs[0];

        if (userInput) setNativeValue(userInput, user);
        setNativeValue(pwd, pass);

        const btn = [...document.querySelectorAll('button')].find(b =>
            /log\s?in|sign\s?in/i.test(b.textContent)
        );
        if (btn) setTimeout(() => btn.click(), 150);

        loginTried = true;
    };

    setInterval(tryAutoLogin, 1000);
})();
