// ==UserScript==
// @name         4ndr0tools — GitHub Redesign (Violet Minimal)
// @namespace    https://www.github.com/4ndr0666
// @version      2.5.1
// @description  Minimal, calmer GitHub. Flat dark neutrals, disciplined multi-color palette around a violet accent, cleaner repo/profile layout, card grid for repos/stars/search, simplified navbar, clutter hidden, and the dashboard changelog box replaced with a live GitHub Trending feed. Port of the old Stylus theme to Tampermonkey. Adds starred repo list labels.
// @author       4ndr0666
// @license      CC0-1.0
// @match        https://github.com/*
// @match        https://gist.github.com/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @connect      github.com
// @connect      mshibanami.github.io
// ==/UserScript==

/*
  ────────────────────────────────────────────────────────────────────────────
  HOW TO TWEAK
  ────────────────────────────────────────────────────────────────────────────
  Everything is driven by the :root CONFIG block below. To customize:

    • Change the accent      -> edit --x-accent
    • Change the background   -> edit --x-bg / --x-surface / --x-surface-2
    • Corner roundness        -> edit --x-radius
    • Turn a feature OFF      -> set its --x-*  variable to `initial`
                                 (e.g. --x-hide-clutter: initial;  disables hiding)
    • Card grid columns       -> edit --x-grid-cols

  The disciplined "still colorful" palette keeps green (success), cyan (info),
  amber (warning) and red (danger) — but they are only used for their MEANING,
  not sprinkled everywhere. Violet is the single brand/interactive accent.
  ────────────────────────────────────────────────────────────────────────────
*/

(function () {
  'use strict';

  /* ============================================================
     TRENDING FEED CONFIG  (edit these)
     ------------------------------------------------------------
     enabled   : true  -> replace the dashboard changelog box with a
                          GitHub Trending feed. false -> leave changelog.
     period    : 'daily' | 'weekly' | 'monthly'
     language  : 'all' for every language, or a language slug such as
                 'python', 'javascript', 'typescript', 'go', 'rust',
                 'c++', 'c#', 'shell', 'html', 'jupyter-notebook', etc.
                 (Use the slug from a github.com/trending/<slug> URL.
                  Spaces/'+'/'#' are handled automatically.)
     maxItems  : how many repos to show (feed provides up to 25).
     title     : heading text shown above the list.
     cacheTTL  : how long (ms) to cache the feed before refetching.
     placement : 'sidebar'   -> put the feed in the right "Explore" sidebar
                               (reuses the space left by the removed promo).
                 'changelog' -> replace the "Latest from our changelog" box.
     ============================================================ */
  const TRENDING = {
    enabled: true,
    period: 'daily',
    language: 'all',
    maxItems: 8,
    title: 'Trending on GitHub',
    cacheTTL: 60 * 60 * 1000, // 1 hour
    placement: 'sidebar',      // 'sidebar' | 'changelog'
  };

  const CSS = `
  /* ===================== CONFIG ===================== */
  :root {
    /* --- brand / interactive accent (single, dominant hue) --- */
    --x-accent:        #8b5cf6;   /* violet */
    --x-accent-hover:  #a78bfa;   /* lighter violet on hover */
    --x-accent-dim:    #6d43d6;   /* pressed / borders */
    --x-accent-soft:   rgba(139, 92, 246, .14); /* subtle fills / selections */

    /* --- neutral surfaces (flat, no wallpaper) --- */
    --x-bg:         #0b0b0d;   /* page background */
    --x-surface:    #121216;   /* cards / boxes */
    --x-surface-2:  #17171d;   /* insets / hovered rows */
    --x-border:     #26262e;   /* hairline borders */
    --x-border-mut: #1c1c22;   /* quieter borders */

    /* --- text --- */
    --x-text:       #e6e6ea;   /* primary text */
    --x-text-mut:   #9a9aa6;   /* muted/secondary text */
    --x-text-faint: #6c6c78;   /* placeholders / disabled */

    /* --- semantic colors (used ONLY for meaning) --- */
    --x-success: #3fb950;   /* additions, merged-ok    (green) */
    --x-info:    #38bec9;   /* info highlights          (cyan) */
    --x-warning: #d9a441;   /* warnings                 (amber) */
    --x-danger:  #f0616d;   /* deletions, destructive   (red) */

    /* --- shape / rhythm --- */
    --x-radius:   10px;
    --x-radius-sm: 7px;
    --x-grid-cols: 2;

    /* --- feature flags (set to 'initial' to disable) --- */
    --x-hide-clutter: 1;
    --x-card-grid:    1;
  }

  /* ============ MAP GITHUB PRIMER VARS -> OUR PALETTE ============ */
  /* This is the heart of the recolor. GitHub uses Primer CSS variables
     everywhere, so overriding them recolors the whole site consistently
     instead of chasing individual selectors. */
  :root,
  [data-color-mode],
  [data-dark-theme],
  [data-light-theme] {
    color-scheme: dark !important;

    /* text */
    --fgColor-default: var(--x-text) !important;
    --fgColor-muted:   var(--x-text-mut) !important;
    --fgColor-onEmphasis: #ffffff !important;
    --color-fg-default: var(--x-text) !important;
    --color-fg-muted:   var(--x-text-mut) !important;
    --color-fg-subtle:  var(--x-text-faint) !important;

    /* interactive / links -> violet */
    --fgColor-accent:  var(--x-accent) !important;
    --fgColor-link:    var(--x-accent) !important;
    --color-accent-fg: var(--x-accent) !important;
    --control-transparent-bgColor-hover: var(--x-accent-soft) !important;
    --control-transparent-bgColor-active: var(--x-accent-soft) !important;
    --control-transparent-bgColor-selected: var(--x-accent-soft) !important;

    /* focus rings / outlines (GitHub uses blue here) */
    --focus-outlineColor: var(--x-accent) !important;
    --fgColor-link-hover: var(--x-accent-hover) !important;
    --borderColor-accent-emphasis: var(--x-accent) !important;
    --borderColor-accent-muted: var(--x-accent-dim) !important;

    /* RAW blue palette scale — this is where most stray blue comes from.
       Remap the whole blue ramp onto violet shades so anything that
       references it directly turns purple too. */
    --base-color-scale-blue-0: #efeaff !important;
    --base-color-scale-blue-1: #d9cbff !important;
    --base-color-scale-blue-2: #c3adff !important;
    --base-color-scale-blue-3: #ad8fff !important;
    --base-color-scale-blue-4: #a78bfa !important;
    --base-color-scale-blue-5: #8b5cf6 !important;
    --base-color-scale-blue-6: #7c4ddb !important;
    --base-color-scale-blue-7: #6d43d6 !important;
    --base-color-scale-blue-8: #5a35b0 !important;
    --base-color-scale-blue-9: #3d2178 !important;

    /* legacy Primer "blue" aliases */
    --color-scale-blue-0: #efeaff !important;
    --color-scale-blue-1: #d9cbff !important;
    --color-scale-blue-2: #c3adff !important;
    --color-scale-blue-3: #ad8fff !important;
    --color-scale-blue-4: #a78bfa !important;
    --color-scale-blue-5: #8b5cf6 !important;
    --color-scale-blue-6: #7c4ddb !important;
    --color-scale-blue-7: #6d43d6 !important;
    --color-scale-blue-8: #5a35b0 !important;
    --color-scale-blue-9: #3d2178 !important;

    /* backgrounds */
    --bgColor-default:  var(--x-bg) !important;
    --bgColor-muted:    var(--x-surface) !important;
    --bgColor-inset:    var(--x-surface-2) !important;
    --overlay-bgColor:  var(--x-surface) !important;
    --color-canvas-default: var(--x-bg) !important;
    --color-canvas-subtle:  var(--x-surface) !important;
    --color-canvas-overlay: var(--x-surface) !important;
    --color-canvas-inset:   var(--x-surface-2) !important;
    --color-page-header-bg: var(--x-bg) !important;
    --color-header-bg:      var(--x-bg) !important;

    /* borders */
    --borderColor-default: var(--x-border) !important;
    --borderColor-muted:   var(--x-border-mut) !important;
    --color-border-default: var(--x-border) !important;
    --color-border-muted:   var(--x-border-mut) !important;

    /* accent emphasis surfaces (selected filters, badges) */
    --bgColor-accent-muted:   var(--x-accent-soft) !important;
    --bgColor-accent-emphasis: var(--x-accent) !important;
    --color-accent-subtle:    var(--x-accent-soft) !important;
    --color-accent-emphasis:  var(--x-accent) !important;
    --color-accent-muted:     var(--x-accent-dim) !important;

    /* "open" state (issues/PRs open badge is green normally, but the blue
       "draft"/link emphasis and selected menu use accent) */
    --bgColor-accent-muted-hover: var(--x-accent-soft) !important;
    --button-outline-fgColor-rest: var(--x-accent) !important;
    --button-outline-fgColor-hover: #fff !important;
    --button-outline-bgColor-hover: var(--x-accent) !important;
    --button-outline-borderColor-hover: var(--x-accent) !important;

    /* primary button vars (some flows use these instead of .btn-primary) */
    --button-primary-bgColor-rest: var(--x-accent) !important;
    --button-primary-bgColor-hover: var(--x-accent-hover) !important;
    --button-primary-bgColor-active: var(--x-accent-dim) !important;
    --button-primary-borderColor-rest: var(--x-accent-dim) !important;
    --bgColor-emphasis: var(--x-accent) !important;

    /* selection / underline nav / segmented control indicators */
    --underlineNav-borderColor-active: var(--x-accent) !important;
    --controlKnob-borderColor-checked: var(--x-accent) !important;
    --control-checked-bgColor-rest: var(--x-accent) !important;
    --control-checked-bgColor-hover: var(--x-accent-hover) !important;
    --control-checked-borderColor-rest: var(--x-accent) !important;
    --selection-bgColor: var(--x-accent-soft) !important;

    /* header text/logo */
    --color-header-text: var(--x-text-mut) !important;
    --color-header-logo: var(--x-text) !important;
    --header-bgColor:    var(--x-bg) !important;
    --header-color:      var(--x-text-mut) !important;

    /* semantic (meaning only) */
    --fgColor-success: var(--x-success) !important;
    --fgColor-attention: var(--x-warning) !important;
    --fgColor-danger:  var(--x-danger) !important;
    --color-success-fg: var(--x-success) !important;
    --color-attention-fg: var(--x-warning) !important;
    --color-danger-fg:  var(--x-danger) !important;

    /* kill heavy shadows/gradients for a flat, calm surface */
    --color-shadow-small: none !important;
    --color-shadow-medium: none !important;
    --color-shadow-large: none !important;
    --shadow-resting-small: none !important;
    --shadow-resting-medium: none !important;
    --shadow-floating-small: 0 0 0 1px var(--x-border) !important;
  }

  /* ============ KILL STRAY / HARDCODED BLUE ============ */
  /* Primer utility color classes that hardcode blue. */
  .color-fg-accent, .color-fg-accent *,
  .text-blue, .color-text-link,
  .Link, .Link--primary { color: var(--x-accent) !important; }
  .color-fg-accent:hover, .Link:hover, .text-blue:hover { color: var(--x-accent-hover) !important; }

  .color-bg-accent, .bg-blue, .color-bg-accent-emphasis {
    background-color: var(--x-accent) !important;
  }
  .color-bg-accent-muted, .bg-blue-light {
    background-color: var(--x-accent-soft) !important;
  }
  .color-border-accent-emphasis, .border-blue {
    border-color: var(--x-accent) !important;
  }
  .color-border-accent-muted { border-color: var(--x-accent-dim) !important; }

  /* Octicons / SVGs explicitly filled blue via inline or utility color */
  svg.octicon.color-fg-accent, .octicon.color-fg-accent { fill: var(--x-accent) !important; }

  /* Selected / current states that GitHub paints blue */
  [aria-current="true"], [aria-selected="true"],
  .selected > .octicon,
  .ActionList-item--navActive::after,
  .ActionListItem--navActive::after {
    color: var(--x-accent) !important;
  }
  .ActionList-item--navActive::before,
  .ActionListItem--navActive::before { background-color: var(--x-accent) !important; }

  /* Form controls: checkboxes, radios, toggles (default checked = blue) */
  [type="checkbox"]:checked, [type="radio"]:checked {
    background-color: var(--x-accent) !important;
    border-color: var(--x-accent) !important;
    accent-color: var(--x-accent) !important;
  }
  input, textarea, select { accent-color: var(--x-accent) !important; }
  .ToggleSwitch-track { background-color: var(--x-surface-2) !important; }
  .ToggleSwitch--checked .ToggleSwitch-track {
    background-color: var(--x-accent) !important;
  }
  ::selection { background: var(--x-accent-soft) !important; }

  /* Focus rings */
  :focus-visible,
  .btn:focus-visible, .Button:focus-visible, .form-control:focus,
  .FormControl-input:focus {
    outline-color: var(--x-accent) !important;
    box-shadow: 0 0 0 3px var(--x-accent-soft) !important;
  }

  /* Progress / spinners */
  .Progress-item, progress::-webkit-progress-value {
    background-color: var(--x-accent) !important;
  }

  /* Selected menu / dropdown items */
  .SelectMenu-item[aria-checked="true"], .SelectMenu-item.selected,
  .ActionList-item[aria-selected="true"], .ActionListItem[aria-selected="true"] {
    color: var(--x-text) !important;
  }
  .SelectMenu-item[aria-checked="true"] .octicon,
  .ActionList-item[aria-selected="true"] .octicon { color: var(--x-accent) !important; }

  /* "Open"/link-blue anchors inside labels, mentions, refs */
  .user-mention, .team-mention, .commit-ref .user,
  .issue-link, a.commit-link { color: var(--x-accent) !important; }

  /* ===================== BASE ===================== */
  html, body {
    background: var(--x-bg) !important;
    background-image: none !important; /* explicitly drop old wallpaper */
    color: var(--x-text);
  }

  /* Calmer typography & spacing */
  body {
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    letter-spacing: .1px;
  }
  h1, h2, h3, .h1, .h2, .h3, .Subhead-heading {
    letter-spacing: -.2px !important;
    font-weight: 600 !important;
  }

  /* Links: violet, underline only on hover -> quieter page */
  a, .Link--primary, .Link--secondary {
    color: var(--x-text);
    text-decoration: none !important;
  }
  a:hover { color: var(--x-accent-hover) !important; }
  a[href]:not(.btn):not(.Button):not(.UnderlineNav-item):not(.tabnav-tab):hover {
    text-decoration: underline !important;
    text-underline-offset: 2px;
  }
  .Link--muted, .color-fg-muted a { color: var(--x-text-mut); }

  /* ===================== SURFACES / BOXES ===================== */
  .Box, .Layout-sidebar .BorderGrid, .js-comment-container,
  .TimelineItem-body, .Popover-message, details-menu, .SelectMenu-modal,
  .color-shadow-small, .color-shadow-medium {
    background-color: var(--x-surface) !important;
    border-color: var(--x-border) !important;
    border-radius: var(--x-radius) !important;
    box-shadow: none !important;
  }
  .Box-header, .Box-footer {
    background-color: var(--x-surface) !important;
    border-color: var(--x-border-mut) !important;
  }
  .Box-row {
    background-color: transparent !important;
    border-color: var(--x-border-mut) !important;
  }
  .Box-row:hover { background-color: var(--x-surface-2) !important; }

  /* ===================== BUTTONS ===================== */
  .btn, .Button, .btn-octicon {
    border-radius: var(--x-radius-sm) !important;
    box-shadow: none !important;
    background-image: none !important;
  }
  .btn:not(.btn-primary):not(.btn-danger),
  .Button--secondary, .Button--invisible {
    background-color: var(--x-surface) !important;
    border-color: var(--x-border) !important;
    color: var(--x-text) !important;
  }
  .btn:not(.btn-primary):not(.btn-danger):hover,
  .Button--secondary:hover {
    background-color: var(--x-surface-2) !important;
    border-color: var(--x-accent) !important;
  }
  /* Primary -> violet */
  .btn-primary, .Button--primary,
  .types__StyledButton-sc-ws60qy-0.btn-primary {
    background: var(--x-accent) !important;
    border-color: var(--x-accent-dim) !important;
    color: #fff !important;
  }
  .btn-primary:hover, .Button--primary:hover {
    background: var(--x-accent-hover) !important;
    border-color: var(--x-accent) !important;
  }
  /* Danger keeps meaning (red) */
  .btn-danger, .Button--danger {
    color: var(--x-danger) !important;
    border-color: var(--x-border) !important;
    background: var(--x-surface) !important;
  }
  .Counter, .CounterLabel {
    background-color: var(--x-surface-2) !important;
    color: var(--x-text-mut) !important;
    border: 1px solid var(--x-border-mut) !important;
  }

  /* ===================== SIMPLIFIED TOP NAVBAR ===================== */
  .AppHeader, .Header, .js-header-wrapper {
    background: var(--x-bg) !important;
    border-bottom: 1px solid var(--x-border-mut) !important;
    box-shadow: none !important;
  }
  .AppHeader .AppHeader-globalBar { padding-block: 10px !important; }
  /* quieter search box */
  .AppHeader-search button, .AppHeader-searchButton,
  .header-search-input, .search-input {
    background: var(--x-surface) !important;
    border-color: var(--x-border) !important;
    color: var(--x-text-mut) !important;
    border-radius: var(--x-radius-sm) !important;
  }
  .AppHeader-search button:hover { border-color: var(--x-accent) !important; }
  /* de-emphasize secondary header actions */
  .AppHeader .AppHeader-actions .AppHeader-button,
  .AppHeader-context-item { color: var(--x-text-mut) !important; }

  /* ===================== TABS / NAV: clear active indicator ===================== */
  .UnderlineNav {
    background: transparent !important;
    border-bottom: 1px solid var(--x-border-mut) !important;
    box-shadow: none !important;
  }
  .UnderlineNav-item {
    color: var(--x-text-mut) !important;
    border-bottom: 2px solid transparent !important;
    font-weight: 500 !important;
  }
  .UnderlineNav-item:hover {
    color: var(--x-text) !important;
    border-bottom-color: var(--x-border) !important;
  }
  .UnderlineNav-item.selected,
  .UnderlineNav-item[aria-current]:not([aria-current="false"]) {
    color: var(--x-text) !important;
    border-bottom-color: var(--x-accent) !important;
  }
  .UnderlineNav-item .Counter { background: transparent !important; }

  .tabnav-tab, .tabnav-tab.selected {
    border-radius: var(--x-radius-sm) var(--x-radius-sm) 0 0 !important;
  }
  .tabnav-tab.selected, .tabnav-tab[aria-current] {
    color: var(--x-text) !important;
    border-color: var(--x-border) !important;
    border-bottom-color: var(--x-bg) !important;
  }

  /* Sidebar nav (settings, etc.) active marker -> violet */
  .SideNav-item[aria-current="page"], .SideNav-item.selected {
    color: var(--x-text) !important;
    font-weight: 600 !important;
  }
  .SideNav-item[aria-current="page"]::before,
  .SideNav-item.selected::before {
    background: var(--x-accent) !important;
  }
  .menu-item.selected::before { background: var(--x-accent) !important; }

  /* ===================== CLEANER REPO / PROFILE PAGE ===================== */
  /* Wider, quieter repo header */
  #repository-container-header {
    background: var(--x-bg) !important;
    border-bottom: 1px solid var(--x-border-mut) !important;
  }
  #repository-container-header .Label {
    background: var(--x-surface) !important;
    border-color: var(--x-border) !important;
    color: var(--x-text-mut) !important;
  }
  /* File browser rows: calmer, roomier */
  .react-directory-row, .Details .Box-row, .js-navigation-item {
    border-color: var(--x-border-mut) !important;
  }
  .react-directory-row:hover { background: var(--x-surface-2) !important; }
  .react-directory-filename-column a { color: var(--x-text) !important; }
  .react-directory-filename-column a:hover { color: var(--x-accent-hover) !important; }
  /* Code / blob surfaces */
  .blob-wrapper, .highlight, .react-code-lines,
  .js-file-line-container, .CodeMirror {
    background: var(--x-surface) !important;
  }
  /* Language dots keep their real colors — untouched on purpose. */

  /* Profile page tweaks */
  .user-profile-nav { background: transparent !important; }
  .js-yearly-contributions, .js-calendar-graph {
    background: var(--x-surface) !important;
    border: 1px solid var(--x-border) !important;
    border-radius: var(--x-radius) !important;
    padding: 12px !important;
  }
  .pinned-item-list-item, .pinned-item-list-item-content {
    background: var(--x-surface) !important;
    border-color: var(--x-border) !important;
    border-radius: var(--x-radius) !important;
  }

  /* Inputs */
  .form-control, .FormControl-input, input[type="text"], input[type="search"],
  textarea, .form-select {
    background: var(--x-surface) !important;
    border-color: var(--x-border) !important;
    color: var(--x-text) !important;
    border-radius: var(--x-radius-sm) !important;
  }
  .form-control:focus, .FormControl-input:focus {
    border-color: var(--x-accent) !important;
    box-shadow: 0 0 0 3px var(--x-accent-soft) !important;
  }
  ::placeholder { color: var(--x-text-faint) !important; }

  /* Topic tags -> violet-tinted, quiet */
  .topic-tag {
    background: var(--x-accent-soft) !important;
    color: var(--x-accent-hover) !important;
    border: 1px solid transparent !important;
    border-radius: 999px !important;
  }
  .topic-tag:hover { border-color: var(--x-accent) !important; }

  /* Diffs keep meaning: green add / red delete (harmonized shades) */
  .blob-code-addition, .blob-num-addition { background: rgba(63,185,80,.15) !important; }
  .blob-code-deletion, .blob-num-deletion { background: rgba(240,97,109,.15) !important; }

  /* ===================== CARD GRID: repos / stars / search ===================== */
  /* Applies only while --x-card-grid is set. */
  @supports (grid-template-columns: repeat(var(--x-grid-cols), 1fr)) {
    #user-repositories-list > ul,
    #user-starred-repos .col-lg-12,
    ul.repo-list {
      display: grid !important;
      grid-template-columns: repeat(var(--x-grid-cols), minmax(0, 1fr)) !important;
      gap: 16px !important;
      margin-top: 16px !important;
    }
    #user-repositories-list > ul > li.py-4,
    #user-starred-repos .col-lg-12 > .py-4,
    ul.repo-list > li.py-4 {
      background: var(--x-surface) !important;
      border: 1px solid var(--x-border) !important;
      border-radius: var(--x-radius) !important;
      padding: 16px !important;
      margin: 0 !important;
    }
    /* keep long descriptions from breaking the grid */
    ul.repo-list * , #user-repositories-list > ul * { min-width: 0 !important; }
    /* clamp descriptions to one tidy line */
    #user-repositories-list p.col-9,
    ul.repo-list p.mb-1 {
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
  }

  /* ===================== HIDE CLUTTER ===================== */
  /* Promo / nag / low-signal elements. */
  .js-notice, .flash-warn.flash-full,
  .AppHeader .AppHeader-context .AppHeader-context-full,
  .feed-item-suggested, .js-recommended-repositories,
  [data-target="sponsors-dashboard.card"] .Box--sponsors,
  a[href^="/sponsors/"] .octicon-heart,
  .octicon-heart-fill.color-fg-sponsors ~ .d-none,
  .js-feed-item-component .Box-row .color-fg-sponsors,
  x-banner, x-banner + div[style],
  .footer .mt-lg-0 .col-lg-4 /* trimmed footer promos */ {
    display: none !important;
  }

  /* Footer: quiet it down */
  .footer { border-top: 1px solid var(--x-border-mut) !important; }

  /* ===================== TRENDING FEED (replaces changelog) ===================== */
  .x-trending__title {
    display: flex; align-items: center; gap: 6px;
  }
  .x-trending__title .octicon { color: var(--x-accent) !important; }
  .x-trending ul.x-trending__list { margin: 0; padding: 0; list-style: none; }
  .x-trending__item {
    padding: 10px 0;
    border-top: 1px solid var(--x-border-mut);
  }
  .x-trending__item:first-child { border-top: 0; }
  .x-trending__repo {
    display: block;
    font-weight: 600;
    color: var(--x-accent) !important;
    font-size: 13px;
    line-height: 1.3;
  }
  .x-trending__repo:hover { color: var(--x-accent-hover) !important; text-decoration: underline; }
  .x-trending__desc {
    margin: 3px 0 0;
    color: var(--x-text-mut) !important;
    font-size: 12px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .x-trending__foot {
    margin-top: 10px; padding-top: 8px;
    border-top: 1px solid var(--x-border-mut);
  }
  .x-trending__foot a { color: var(--x-text-mut) !important; font-size: 12px; }
  .x-trending__foot a:hover { color: var(--x-accent-hover) !important; }
  .x-trending__status { color: var(--x-text-faint) !important; font-size: 12px; padding: 8px 0; }

  /* ===================== STARRED REPO LIST BADGES ===================== */
  .x-star-list-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    margin-left: 8px;
    font-size: 11px;
    font-weight: 500;
    border-radius: 999px;
    background: var(--x-accent-soft) !important;
    color: var(--x-accent-hover) !important;
    border: 1px solid transparent;
    white-space: nowrap;
    line-height: 1;
  }
  .x-star-list-badge:hover {
    border-color: var(--x-accent) !important;
  }
  .x-star-list-badge .octicon {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
  .x-badge-emoji {
    font-size: 12px;
    line-height: 1;
    flex-shrink: 0;
  }
  .x-star-list-badge.multiple::after {
    content: ' +' attr(data-count) ' more';
    font-size: 10px;
    opacity: 0.8;
  }

  /* Standalone card when the feed lives in the sidebar aside. */
  .x-trending-card {
    max-width: 356px;
    background-color: var(--x-surface) !important;
    border: 1px solid var(--x-border) !important;
    border-radius: var(--x-radius) !important;
    padding: 16px !important;
    margin-bottom: 16px;
  }
  .x-trending-card .x-trending__title { margin: 0 0 8px !important; }
  /* keep the emptied 'Explore' aside from adding blank vertical gaps */
  .feed-right-sidebar:empty { display: none !important; }
  `;

  // Inject at document-start so there's no flash of default GitHub.
  const style = document.createElement('style');
  style.id = 'x-github-redesign';
  style.textContent = CSS;

  const mount = () => (document.head || document.documentElement).appendChild(style);
  mount();

  // GitHub uses Turbo/PJAX SPA navigation; re-assert the style if it ever
  // gets stripped from the DOM on navigation.
  document.addEventListener('turbo:load', () => {
    if (!document.getElementById('x-github-redesign')) mount();
  });

  /* ============================================================
     REPLACE DASHBOARD CHANGELOG -> GITHUB TRENDING RSS
     (driven by the TRENDING config near the top of this file)
     ============================================================ */

  // Normalize a language into the slug the feed/URLs use.
  // e.g. "C++" -> "c++", "C#" -> "c#", "Jupyter Notebook" -> "jupyter-notebook"
  function langSlug(lang) {
    if (!lang) return 'all';
    return String(lang).trim().toLowerCase().replace(/\s+/g, '-');
  }

  const PERIOD = ['daily', 'weekly', 'monthly'].includes(TRENDING.period)
    ? TRENDING.period : 'daily';
  const LANG = langSlug(TRENDING.language);
  const MAX_ITEMS = Math.max(1, Math.min(25, TRENDING.maxItems | 0 || 8));

  // The feed host URL-encodes special chars in the filename (c++ -> c%2B%2B).
  const FEED_URL =
    `https://mshibanami.github.io/GitHubTrendingRSS/${PERIOD}/${encodeURIComponent(LANG)}.xml`;

  // Matching github.com/trending link (period -> ?since=, language -> path).
  const SINCE = { daily: 'daily', weekly: 'weekly', monthly: 'monthly' }[PERIOD];
  const TRENDING_LINK = LANG === 'all'
    ? `https://github.com/trending?since=${SINCE}`
    : `https://github.com/trending/${encodeURIComponent(LANG)}?since=${SINCE}`;

  // A human label for headings, e.g. "Trending on GitHub · Python · weekly".
  const LANG_LABEL = LANG === 'all' ? '' : ` · ${TRENDING.language}`;
  const PERIOD_LABEL = PERIOD === 'daily' ? 'today'
    : PERIOD === 'weekly' ? 'this week' : 'this month';
  const HEADING = `${TRENDING.title}${LANG_LABEL} · ${PERIOD_LABEL}`;

  const CACHE_KEY = `x-trending-cache:${PERIOD}:${LANG}:${MAX_ITEMS}`;
  const CACHE_TTL = Number.isFinite(TRENDING.cacheTTL) ? TRENDING.cacheTTL : 60 * 60 * 1000;

  const esc = (s) => (s == null ? '' : String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;'));

  // Strip HTML tags from RSS description and grab the first sentence/line.
  function shortDesc(html) {
    if (!html) return '';
    const firstBlock = html.split(/<hr\s*\/?>/i)[0]; // text before the README dump
    const tmp = document.createElement('div');
    tmp.innerHTML = firstBlock;
    let text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length > 160) text = text.slice(0, 157).trimEnd() + '…';
    return text;
  }

  function parseFeed(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    const items = [...doc.querySelectorAll('item')].slice(0, MAX_ITEMS).map((it) => ({
      title: (it.querySelector('title')?.textContent || '').trim(),
      link: (it.querySelector('link')?.textContent || '').trim(),
      desc: shortDesc(it.querySelector('description')?.textContent || ''),
    }));
    return items;
  }

  function fetchFeed() {
    return new Promise((resolve, reject) => {
      // Try cache first.
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const c = JSON.parse(raw);
          if (Date.now() - c.t < CACHE_TTL && Array.isArray(c.items) && c.items.length) {
            resolve(c.items);
            return;
          }
        }
      } catch (_) { }

      GM_xmlhttpRequest({
        method: 'GET',
        url: FEED_URL,
        onload: (res) => {
          try {
            if (res.status && (res.status < 200 || res.status >= 300)) {
              throw new Error('HTTP ' + res.status);
            }
            const items = parseFeed(res.responseText);
            if (!items.length) throw new Error('no items');
            try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), items })); } catch (_) { }
            resolve(items);
          } catch (e) { reject(e); }
        },
        onerror: reject,
        ontimeout: reject,
        timeout: 15000,
      });
    });
  }

  function innerHTML(items) {
    const list = items.map((it) => `
      <li class="x-trending__item">
        <a class="x-trending__repo" href="${esc(it.link)}">${esc(it.title)}</a>
        ${it.desc ? `<p class="x-trending__desc">${esc(it.desc)}</p>` : ''}
      </li>`).join('');

    return `
      <h2 class="f5 text-bold tmp-mb-3 width-full x-trending__title">
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" class="octicon">
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.53 4.53-4 4a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 1 1 1.06-1.06L7 6.94l3.47-3.47a.75.75 0 1 1 1.06 1.06Z"></path>
        </svg>
        ${esc(HEADING)}
      </h2>
      <ul class="x-trending__list">${list}</ul>
      <div class="x-trending__foot">
        <a href="${esc(TRENDING_LINK)}">View all trending →</a>
      </div>`;
  }

  function errorHTML() {
    return `
      <h2 class="f5 text-bold tmp-mb-3 width-full x-trending__title">${esc(HEADING)}</h2>
      <div class="x-trending__status">Couldn't load the trending feed.
        <a href="${esc(TRENDING_LINK)}">Open github.com/trending →</a>
      </div>`;
  }

  function fillBox(box) {
    box.classList.add('x-trending');
    const status = document.createElement('div');
    status.className = 'x-trending__status';
    status.textContent = 'Loading trending repositories…';
    box.appendChild(status);

    fetchFeed()
      .then((items) => { box.innerHTML = innerHTML(items); })
      .catch(() => { box.innerHTML = errorHTML(); });
  }

  // ---- Placement A: replace the "Latest from our changelog" box ----
  function replaceChangelog() {
    const box = document.querySelector('.dashboard-changelog');
    if (!box || box.dataset.xTrending) return true;
    box.dataset.xTrending = '1';
    box.innerHTML = '';
    fillBox(box);
    return true;
  }

  // ---- Placement B: inject into the right "Explore" sidebar aside ----
  function injectSidebar() {
    const aside = document.querySelector('.feed-right-sidebar');
    if (!aside || aside.dataset.xTrending) return !!aside;
    aside.dataset.xTrending = '1';

    // Remove GitHub's promo banner content from the aside.
    aside.querySelectorAll('.js-notice, .marketing-banner').forEach((n) => n.remove());

    const card = document.createElement('div');
    card.className = 'x-trending x-trending-card';
    aside.prepend(card);
    fillBox(card);
    return true;
  }

  function placeTrending() {
    if (!TRENDING.enabled) return;
    if (TRENDING.placement === 'changelog') return replaceChangelog();
    return injectSidebar();
  }

  // Dashboard loads async; watch for the target container to appear.
  function watchDashboard() {
    if (!TRENDING.enabled) return;
    placeTrending();
    const obs = new MutationObserver(() => placeTrending());
    obs.observe(document.documentElement, { childList: true, subtree: true });
    // stop observing after a while to avoid overhead
    setTimeout(() => obs.disconnect(), 15000);
  }

  if (TRENDING.enabled) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', watchDashboard);
    } else {
      watchDashboard();
    }
    document.addEventListener('turbo:load', watchDashboard);
  }

  /* ============================================================
     STARRED REPO LIST LABELS
     On /user?tab=stars pages, fetch the user's starred lists and
     show which list(s) each repo belongs to.
     ============================================================ */

  // Config for starred lists feature
  const STAR_LISTS = {
    enabled: true,
    maxListsPerRepo: 2,        // show up to N list badges, then "+N more"
    cacheTTL: 30 * 60 * 1000,  // 30 minutes (longer cache)
  };

// Check if we're on a stars page (own or other user's)
  function isStarsPage() {
    // Check URL patterns (pathname + search)
    const urlMatch = (location.pathname + location.search).match(/^\/[^/]+\?tab=stars($|&)/) ||
           location.pathname.match(/^\/[^/]+\/stars\//) ||
           location.pathname.match(/^\/stars\/[^/]+\/lists\//);
    
    // Also check if the stars tab is currently active in the UI
    // Selected tab has class "selected" and/or aria-current="page"
    const tabMatch = document.querySelector('.UnderlineNav-item[data-tab-item="stars"].selected, .UnderlineNav-item[data-tab-item="stars"][aria-current="page"]');
    
    const result = urlMatch || tabMatch;
    console.log('[GitHub Redesign] isStarsPage check:', location.pathname + location.search, 'urlMatch:', !!urlMatch, 'tabMatch:', !!tabMatch, '->', !!result);
    return result;
  }

  // Extract username from the stars page URL
  function getStarsUsername() {
    const m = location.pathname.match(/^\/([^/]+)/);
    return m ? m[1] : null;
  }

  // Fetch all starred lists for a user from the sidebar
  async function fetchUserStarredLists(username) {
    const cacheKey = `x-star-lists:${username}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const c = JSON.parse(raw);
        // Check version for cache invalidation when structure changes
        if (c.version === 3 && Date.now() - c.t < STAR_LISTS.cacheTTL && c.lists?.length) {
          console.log('[GitHub Redesign] Using cached starred lists:', c.lists.map(l => `${l.name}${l.emoji ? ' ' + l.emoji : ''}`));
          return c.lists;
        }
      }
    } catch (_) { }

    // Scrape the lists from the stars page sidebar
    // The lists are in #profile-lists-container a[href*="/lists/"]
    return new Promise((resolve) => {
      // We need to fetch the stars page HTML to get the list links
      GM_xmlhttpRequest({
        method: 'GET',
        url: `https://github.com/${username}?tab=stars`,
        onload: (res) => {
          try {
            if (res.status < 200 || res.status >= 300) throw new Error('HTTP ' + res.status);
            const doc = new DOMParser().parseFromString(res.responseText, 'text/html');
            const listLinks = doc.querySelectorAll('#profile-lists-container a[href*="/lists/"]');
            const lists = Array.from(listLinks).map((a) => {
              const href = a.getAttribute('href');
              const nameMatch = href.match(/\/lists\/([^/]+)$/);
              // Try to find emoji in the list item (may be in a child element)
              const emojiEl = a.querySelector('.emoji, [class*="emoji"], .octicon');
              let emoji = '';
              if (emojiEl) {
                // If it's an octicon, we'll use a fallback
                if (emojiEl.classList.contains('octicon')) {
                  emoji = ''; // We'll use octicon fallback in badge
                } else {
                  emoji = emojiEl.textContent?.trim() || '';
                }
              }
              return {
                name: nameMatch ? nameMatch[1] : 'unknown',
                url: href,
                fullUrl: `https://github.com${href}`,
                emoji: emoji || null,
              };
            }).filter((l) => l.name);
            console.log('[GitHub Redesign] Found starred lists:', lists.map(l => `${l.name}${l.emoji ? ' ' + l.emoji : ''}`));
            try {
              localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), lists, version: 3 }));
            } catch (_) { }
            resolve(lists);
          } catch (e) {
            console.warn('[GitHub Redesign] Failed to parse starred lists:', e);
            resolve([]);
          }
        },
        onerror: () => resolve([]),
        ontimeout: () => resolve([]),
        timeout: 15000,
      });
    });
  }

  // Fetch emoji for a list from its page (GitHub lists can have custom emojis)
  async function fetchListEmoji(listUrl) {
    const cacheKey = `x-star-list-emoji:${listUrl}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const c = JSON.parse(raw);
        if (Date.now() - c.t < STAR_LISTS.cacheTTL && c.emoji) {
          return c.emoji;
        }
      }
    } catch (_) {}

    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: listUrl,
        onload: (res) => {
          try {
            if (res.status < 200 || res.status >= 300) throw new Error('HTTP ' + res.status);
            const doc = new DOMParser().parseFromString(res.responseText, 'text/html');
            
            // Extract emoji from og:title meta tag (format: "username's list / 😎 List Name")
            let emoji = '';
            const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
            if (ogTitle) {
              // Decode HTML entities
              const decoded = ogTitle.replace(/'/g, "'").replace(/&/g, '&');
              // Match emoji before the list name (after " / ")
              const match = decoded.match(/\/ ([^a-zA-Z0-9\s].*?) [A-Z]/);
              if (match) {
                emoji = match[1].trim();
              }
            }
            
            // Fallback: check for emoji in header elements
            if (!emoji) {
              const emojiSelectors = [
                'h1 .emoji',
                '.list-header .emoji',
                '[data-list-emoji]',
                '.Box-header .emoji',
              ];
              for (const sel of emojiSelectors) {
                const el = doc.querySelector(sel);
                if (el) {
                  emoji = el.textContent?.trim() || '';
                  break;
                }
              }
            }
            
            try {
              localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), emoji: emoji || null }));
            } catch (_) {}
            resolve(emoji || null);
          } catch (e) {
            console.warn('[GitHub Redesign] Failed to fetch list emoji:', e);
            resolve(null);
          }
        },
        onerror: () => resolve(null),
        ontimeout: () => resolve(null),
        timeout: 15000,
      });
    });
  }

  // Fetch repositories in a specific starred list
  async function fetchListRepos(listUrl) {
    const cacheKey = `x-star-list-repos:${listUrl}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const c = JSON.parse(raw);
        if (Date.now() - c.t < STAR_LISTS.cacheTTL && c.repos?.length) {
          return c.repos;
        }
      }
    } catch (_) { }

    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: listUrl,
        onload: (res) => {
          try {
            if (res.status < 200 || res.status >= 300) throw new Error('HTTP ' + res.status);
            const doc = new DOMParser().parseFromString(res.responseText, 'text/html');
            // List pages have repo items in the main content area
            // Look for links in the list content (not nav)
            const mainContent = doc.querySelector('main') || doc.querySelector('#main') || doc.querySelector('.Layout-main') || doc;
            const repos = Array.from(mainContent.querySelectorAll('a[href^="/"]')).map((a) => {
              const href = a.getAttribute('href');
              // Match /owner/repo pattern (not /stars/... or /user/... or /settings/...)
              const m = href.match(/^\/([^/]+)\/([^/]+)$/);
              if (m && !href.includes('/stars/') && !href.includes('/lists/') && !href.includes('/settings/') && !href.includes('/orgs/')) {
                return `${m[1]}/${m[2]}`;
              }
              return null;
            }).filter(Boolean);
            // Deduplicate
            const uniqueRepos = [...new Set(repos)];
            console.log(`[GitHub Redesign] List ${listUrl} -> ${uniqueRepos.length} repos:`, uniqueRepos.slice(0, 5));
            try {
              localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), repos: uniqueRepos }));
            } catch (_) { }
            resolve(uniqueRepos);
          } catch (e) {
            console.warn('[GitHub Redesign] Failed to parse list repos:', e);
            resolve([]);
          }
        },
        onerror: () => resolve([]),
        ontimeout: () => resolve([]),
        timeout: 15000,
      });
    });
  }

  // Build a map of repo full_name -> list names (with emojis)
  async function buildRepoListMap(username) {
    const lists = await fetchUserStarredLists(username);
    if (!lists.length) return new Map();

    const repoToLists = new Map();

    // Fetch repos and emojis for each list in parallel
    const listPromises = lists.map(async (list) => {
      const [repos, emoji] = await Promise.all([
        fetchListRepos(list.fullUrl),
        fetchListEmoji(list.fullUrl),
      ]);
      return { listName: list.name, repos, emoji: emoji || list.emoji };
    });

    const results = await Promise.all(listPromises);

    for (const { listName, repos, emoji } of results) {
      for (const repoFullName of repos) {
        if (!repoToLists.has(repoFullName)) {
          repoToLists.set(repoFullName, []);
        }
        repoToLists.get(repoFullName).push({ name: listName, emoji });
      }
    }

    return repoToLists;
  }

  // Create a list badge element
  function createListBadge(listName, emoji, isMultiple, extraCount) {
    const span = document.createElement('span');
    span.className = 'x-star-list-badge' + (isMultiple ? ' multiple' : '');
    if (isMultiple) span.dataset.count = extraCount;
    
    const emojiHtml = emoji ? `<span class="x-badge-emoji">${emoji}</span> ` : 
      `<svg class="octicon" aria-hidden="true" viewBox="0 0 16 16" width="12" height="12">
         <path fill-rule="evenodd" d="M3.75 1.5a.25.25 0 00-.25.25v11.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25v-7.5a.75.75 0 00-1.5 0v7.5h-8.5v-11.5a.25.25 0 00-.25-.25h-8.5zM8.5 1h-6a1.5 1.5 0 00-1.5 1.5v10A1.5 1.5 0 012.5 14h9a1.5 1.5 0 001.5-1.5v-10A1.5 1.5 0 018.5 1z"/>
       </svg> `;
    
    span.innerHTML = `${emojiHtml}${listName}`;
    return span;
  }

  // Apply list badges to repo items on the stars page
  function applyStarListBadges(repoToLists) {
    if (!repoToLists.size) return;

    const frame = document.getElementById('user-starred-repos');
    const searchRoot = frame || document;
    const repoItems = searchRoot.querySelectorAll('.col-12.d-block.width-full.tmp-py-4, .Box-row');

    let updated = 0;

    for (const item of repoItems) {
      // Find the repo link to get the full name
      const repoLink = item.querySelector('h3 a[href^="/"]');
      if (!repoLink) continue;

      const href = repoLink.getAttribute('href');
      const m = href.match(/^\/([^/]+)\/([^/]+)$/);
      if (!m) continue;

      const repoFullName = `${m[1]}/${m[2]}`;
      const lists = repoToLists.get(repoFullName);
      if (!lists?.length) continue;

      // Find where to insert the badge (after the repo name, before description)
      const nameContainer = item.querySelector('h3') || item.querySelector('.d-inline-block.mb-1');
      if (!nameContainer) continue;

      // Check if already added
      if (nameContainer.querySelector('.x-star-list-badge')) continue;

      const maxShow = STAR_LISTS.maxListsPerRepo;
      const showLists = lists.slice(0, maxShow);
      const extraCount = lists.length - maxShow;

      const badgeContainer = document.createElement('span');
      badgeContainer.style.display = 'inline-flex';
      badgeContainer.style.gap = '4px';
      badgeContainer.style.flexWrap = 'wrap';
      badgeContainer.style.marginLeft = '8px';

      for (const listObj of showLists) {
        badgeContainer.appendChild(createListBadge(listObj.name, listObj.emoji, false, 0));
      }
      if (extraCount > 0) {
        badgeContainer.appendChild(createListBadge('more', null, true, extraCount));
      }

      nameContainer.appendChild(badgeContainer);
      updated++;
    }

    if (updated) {
      console.log(`[GitHub Redesign] Added list badges to ${updated} starred repos`);
    }
  }

  // Main function to load and apply starred list data
  async function loadStarredLists(bypassPageCheck = false) {
    if (!STAR_LISTS.enabled) return;
    if (!bypassPageCheck && !isStarsPage()) return;

    const username = getStarsUsername();
    if (!username) return;

    // Avoid duplicate runs for same username
    if (document.body.dataset.xStarListsLoaded === username) return;
    document.body.dataset.xStarListsLoaded = username;

    // Wait for the turbo-frame content to be present
    await waitForStarredRepos();

    try {
      const repoToLists = await buildRepoListMap(username);
      applyStarListBadges(repoToLists);
    } catch (e) {
      console.warn('[GitHub Redesign] Failed to load starred lists:', e);
    }
  }

  // Wait for starred repo items to appear in the turbo-frame
  function waitForStarredRepos(timeout = 10000) {
    return new Promise((resolve) => {
      const frame = document.getElementById('user-starred-repos');
      if (!frame) {
        resolve();
        return;
      }

      // Check if content already loaded
      const checkContent = () => {
        const items = frame.querySelectorAll('.col-12.d-block.width-full.tmp-py-4, .Box-row');
        if (items.length > 0) return true;
        return false;
      };

      if (checkContent()) {
        resolve();
        return;
      }

      // Watch for turbo-frame load
      const onFrameLoad = () => {
        if (checkContent()) {
          frame.removeEventListener('load', onFrameLoad);
          resolve();
        }
      };
      frame.addEventListener('load', onFrameLoad);

      // Fallback: MutationObserver
      const obs = new MutationObserver(() => {
        if (checkContent()) {
          obs.disconnect();
          frame.removeEventListener('load', onFrameLoad);
          resolve();
        }
      });
      obs.observe(frame, { childList: true, subtree: true });

      // Timeout fallback
      setTimeout(() => {
        obs.disconnect();
        frame.removeEventListener('load', onFrameLoad);
        resolve();
      }, timeout);
    });
  }

  // Run on page load and on Turbo navigation
  function watchStarredLists() {
    if (!STAR_LISTS.enabled) return;
    if (!isStarsPage()) return;
    loadStarredLists();
  }

  // Also watch for tab switches to Stars via Turbo
  function watchTabSwitches() {
    // Listen for turbo-frame loads (Stars tab content)
    document.addEventListener('turbo:frame-load', (e) => {
      if (e.target.id === 'user-starred-repos') {
        document.body.dataset.xStarListsLoaded = '';
        loadStarredLists(true);
      }
    });

    // Listen for turbo:load (full page PJAX navigation)
    document.addEventListener('turbo:load', () => {
      if (isStarsPage()) {
        document.body.dataset.xStarListsLoaded = '';
        loadStarredLists(true);
      }
    });

    // Listen for tab clicks on the Stars nav item
    document.addEventListener('click', (e) => {
      const starsTab = e.target.closest('[data-tab-item="stars"], [href*="tab=stars"]');
      if (starsTab) {
        setTimeout(() => {
          document.body.dataset.xStarListsLoaded = '';
          loadStarredLists(true);
        }, 100);
      }
    });

    // Fallback: MutationObserver to detect when starred repo content appears
    const starsFrame = document.getElementById('user-starred-repos');
    if (starsFrame) {
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'childList' && m.addedNodes.length > 0) {
            // Check if repo items were added
            const hasRepos = starsFrame.querySelector('.col-12.d-block.width-full.tmp-py-4, .Box-row');
            if (hasRepos && !document.body.dataset.xStarListsLoaded) {
              document.body.dataset.xStarListsLoaded = '';
              loadStarredLists(true);
              observer.disconnect();
              break;
            }
          }
        }
      });
      observer.observe(starsFrame, { childList: true, subtree: true });
      
      // Cleanup after 30 seconds
      setTimeout(() => observer.disconnect(), 30000);
    }
  }

  // Debug: expose functions to window for console access
  window.__githubRedesign = {
    loadStarredLists: () => loadStarredLists(true),
    clearStarCache: () => {
      const username = getStarsUsername();
      localStorage.removeItem(`x-star-lists:${username}`);
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('x-star-list-repos:') || key.startsWith('x-star-list-emoji:')) {
          localStorage.removeItem(key);
        }
      });
      console.log('[GitHub Redesign] Star cache cleared');
    },
    getStarCache: () => {
      const username = getStarsUsername();
      return JSON.parse(localStorage.getItem(`x-star-lists:${username}`) || 'null');
    },
  };
  console.log('[GitHub Redesign] Debug commands: __githubRedesign.loadStarredLists(), .clearStarCache(), .getStarCache()');

  if (STAR_LISTS.enabled) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', watchStarredLists);
    } else {
      watchStarredLists();
    }
    document.addEventListener('turbo:load', watchStarredLists);
    watchTabSwitches();
  }
})();