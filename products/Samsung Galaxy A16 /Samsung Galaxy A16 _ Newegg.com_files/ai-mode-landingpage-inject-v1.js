(function () {
  // const iframeDomain = `${window.location.protocol}//${window.location.host}`;
  // const iframeDomain = `https://e11wwwtest.newegg.com`
  const iframeDomain = `https://www.newegg.com`;

  var aimodeConfig =
    window.__remoteState__?.siteConf?.aiLabBiz?.AiMode?.Pin ||
    window.__SITE__?.aiLabBiz?.AiMode?.Pin;
  var countryAlpha3 = window.__neweggState__?.country?.alpha3 || "USA";
  var countryAlpha2 = (
    window.__neweggState__?.country?.alpha2 || ""
  ).toUpperCase();
  var defaultRegions = ["USA", "CAN", "US", "CA", "USB"];
  var isGlobal = !defaultRegions.includes(countryAlpha2);
  var countryTag = isGlobal ? "Global" : countryAlpha3.toUpperCase();
  var pinModeTargetPercent = aimodeConfig?.PinModeTargetPercent;
  var disablePinModePageAlias = aimodeConfig?.DisablePinModePageAlias;
  var routeName = window?.__pageInfo__?.routeName ?? "";
  const style = document.createElement("style");
  const iconNeweggStyle = `
  @keyframes fabPulse {
        0% {
          opacity: .5;
          transform: scale(.95);
        }
        100% {
          opacity: 0;
          transform: scale(1.35);
        }
      }
      .floating-robot {
        width: 70px;
        height: 70px;
        --d: 70px;
        background: #242332;
        margin: 10px auto 0;
        background-size: contain;
        border-radius: 50%;
        position: fixed;
        right: 16px;
        bottom: 24px;
        z-index: 999;
        cursor: pointer;
        transition: width .12s linear, height .12s linear;
        -webkit-box-shadow: 0 3px 10px rgb(0 0 0 / 50%);
        -moz-box-shadow: 0 3px 10px rgba(0, 0, 0, .5);
        -ms-box-shadow: 0 3px 10px rgba(0, 0, 0, .5);
        -o-box-shadow: 0 3px 10px rgba(0, 0, 0, .5);
        box-shadow: 0 3px 10px rgb(0 0 0 / 50%);
        margin: 0 auto 10px 0 !important;
      }
      /* hover label pill (from AI assistant demo · .fab-label) */
      .floating-robot .fab-label {
        position: absolute;
        right: calc(100% + 12px);
        top: 50%;
        transform: translateY(-50%) translateX(8px);
        background: #002D6A;
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        white-space: nowrap;
        padding: 8px 14px;
        border-radius: 999px;
        opacity: 0;
        pointer-events: none;
        box-shadow: 0 4px 14px rgba(0, 0, 0, .18);
        transition: opacity .2s, transform .2s;
      }
      .floating-robot .fab-label::after {
        content: "";
        position: absolute;
        right: -4px;
        top: 50%;
        transform: translateY(-50%) rotate(45deg);
        width: 12px;
        height: 12px;
        background: #002D6A;
        border-radius: 2px;
      }
      .floating-robot:hover .fab-label {
        opacity: 1;
        transform: translateY(-50%) translateX(0);
      }
      .dark-mode .floating-robot {
        background: #464462;
      }
      .floating-robot .floating-robot-icon {
        width: 48px;
        height: 48px;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
      }
      .floating-robot .floating-robot-icon img {
        width: 100%;
        height: 100%;
        background-size: 100% 100%;
        /* animation: robot_scaleAnimation 1s ease-in-out infinite; */
      }
      @keyframes robot_scaleAnimation {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.2);
        }
      }
      .floating-right-tools.is-active .floating-robot-tips {
        display: block;
      }
      .floating-right-tools.is-active .floating-robot .fab-label {
        display: none !important;
      }

      .floating-robot {
        margin: 20px auto 0 0;
      }

      /* .floating-robot .floating-robot-tag {
      background: linear-gradient(90deg, #BD4B00 0%, #EF6C02 100%);
      font-size: 10px;
      width: 100%;
      max-width: 32px;
      text-align: center;
      line-height: 15px;
      color: #fff;
      border-radius: 2px;
      position: absolute;
      display: flex;
      justify-content: center;
      align-items: center;
      top: -6px;
      left: 50%;
      transform: translateX(-50%);
    }
    .floating-robot .floating-robot-tag span {
      font-size: 12px;
      font-weight: 800;
      font-style: italic;
      transform: scale(.85);
      display: block;
    } */
      /* .floating-robot::before {
        content: '';
        background: linear-gradient(90deg, #bd4b00 0%, #ef6c02 100%);
        font-size: 10px;
        width: 32px;
        height: 15px;
        max-width: 32px;
        text-align: center;
        color: #fff;
        border-radius: 2px;
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        top: -6px;
        left: 50%;
        transform: translateX(-50%);
        display: block;
        z-index: 2;
      }

      .floating-robot::after {
        content: 'NEW';
        position: absolute;
        top: -9px;
        color: #fff;
        left: 50%;
        transform: translateX(-50%) scale(0.85);
        font-size: 12px;
        font-weight: 800;
        font-style: italic;
        z-index: 3;
      } */

      @media (max-width: 1999px) {
        .floating-robot {
          margin-top: 15px;
        }

        .floating-robot::before {
          width: 30px;
        }
      }

      /* ===== fab-core AI spark effect (from AI assistant demo · "Twinkle & Burst") ===== */
      .floating-robot {
        --tw-min: .7;
        --tw-op: 1;
      }
      .floating-robot .floating-robot-icon {
        width: 100%;
        height: 100%;
        left: 0;
        top: 0;
        transform: none;
      }
      .floating-robot .fab-core {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: linear-gradient(155deg, #ffffff 30%, #eaf2ff 100%);
        box-shadow: 0 6px 18px rgba(0, 45, 106, .22), 0 2px 5px rgba(0, 0, 0, .12);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        z-index: 3;
      }
      .floating-robot .fab-core .spark {
        position: relative;
        z-index: 4;
        width: 62%;
        height: 62%;
        display: block;
        overflow: visible;
      }
      .floating-robot .fab-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 3px solid rgba(16, 97, 205, .3);
        opacity: 0;
        z-index: 1;
        pointer-events: none;
      }
      .floating-robot .think {
        position: absolute;
        inset: 0;
        z-index: 3;
        opacity: 1;
        pointer-events: none;
      }
      .floating-robot .think i {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 3px;
        height: 3px;
        margin: -1.5px;
        border-radius: 50%;
        opacity: 0;
        box-shadow: 0 0 5px currentColor;
      }
      .floating-robot .think i:nth-child(1) { --dx: 0; --dy: -1; background: #FA9D28; color: #FA9D28; }
      .floating-robot .think i:nth-child(2) { --dx: .7; --dy: -.7; background: #5AA0FF; color: #5AA0FF; }
      .floating-robot .think i:nth-child(3) { --dx: 1; --dy: 0; background: #FFD46B; color: #FFD46B; }
      .floating-robot .think i:nth-child(4) { --dx: .7; --dy: .7; background: #5AA0FF; color: #5AA0FF; }
      .floating-robot .think i:nth-child(5) { --dx: 0; --dy: 1; background: #FA9D28; color: #FA9D28; }
      .floating-robot .think i:nth-child(6) { --dx: -.7; --dy: .7; background: #5AA0FF; color: #5AA0FF; }
      .floating-robot .think i:nth-child(7) { --dx: -1; --dy: 0; background: #FFD46B; color: #FFD46B; }
      .floating-robot .think i:nth-child(8) { --dx: -.7; --dy: -.7; background: #5AA0FF; color: #5AA0FF; }

      /* AI spark idle animation: twinkle + spark burst + ring ripple.
          Pure-CSS infinite loop (no JS needed) so it also works when the footer
          is injected via jQuery .load(), which strips inline <script> tags.
          The visible motion happens in the first 35% (~1.4s of a 5s cycle),
          then the star rests for the remaining gap. */
      .floating-robot .spark { animation: twinkle9 5s ease-in-out infinite; }
      .floating-robot .think i { animation: emit9 5s ease-out infinite; }
      .floating-robot .fab-ring { animation: ring9 5s ease-out infinite; }
      .floating-robot .ring-b { animation-delay: .13s; }

      @keyframes twinkle9 {
        0% { transform: scale(1) rotate(0deg); opacity: 1; }
        10.5% { transform: scale(var(--tw-min, .7)) rotate(-16deg); opacity: var(--tw-op, 1); }
        18.2% { transform: scale(1.12) rotate(6deg); opacity: 1; }
        25.2% { transform: scale(.98) rotate(-1deg); opacity: 1; }
        35%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }
      @keyframes emit9 {
        0%, 10.5% { opacity: 0; transform: translate(0, 0) scale(.2); }
        16.8% { opacity: .9; }
        35% { opacity: 0; transform: translate(calc(var(--dx) * 22px), calc(var(--dy) * 22px)) scale(1); }
        35.01%, 100% { opacity: 0; transform: translate(0, 0) scale(.2); }
      }
      @keyframes ring9 {
        0%, 11.2% { transform: scale(1); opacity: 0; }
        17.5% { opacity: 1; }
        35% { transform: scale(1.4); opacity: 0; }
        35.01%, 100% { transform: scale(1); opacity: 0; }
      }

      @media (max-width: 799px) {
        .floating-robot {
          right: 10px;
        }
      }
    `;
  const iframeFloatDiyStyle = `
    #ai-side-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 320px;
        height: 100%;
        z-index: 1900;
        transform: translateX(100%);
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                    box-shadow 0.35s ease;
        background: #fff;
        box-shadow: none;
        display: flex;
        flex-direction: column;
        background: linear-gradient(184.06deg, #FFFFFF -15.79%, #ECF2FC 27.78%);
    }
    #ai-side-panel.is-open {
        transform: translateX(0);
    }
    body.ai-panel-open {
        padding-right: var(--ai-panel-width) !important;
    }
    body.has-ai-panel .header2021 {
        transition: padding-right 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
    body.has-ai-panel.ai-panel-open .header2021 {
        padding-right: var(--ai-panel-width) !important;
    }
    html:not(.sticky-header-top) body.has-ai-panel.ai-panel-open .header2021 {
        padding-right: 0 !important;
    }
    .ai-panel-header {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        height: 50px;
        background-color: transparent;
        flex-shrink: 0;
        user-select: none;
        cursor: default;
    }
    #ai-side-panel.is-float .ai-panel-header {
        cursor: grab;
    }
     #ai-side-panel.dark-mode {
        background: #060606;
    }
    #ai-side-panel.dark-mode .ai-panel-header {
        background-color: #060606;
    }
    .ai-panel-title {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .ai-panel-spark-wrap {
        position: relative;
        width: 35px;
        height: 27px;
        flex-shrink: 0;
    }
    .ai-panel-spark {
        position: absolute;
        display: block;
    }
    .ai-panel-spark-1 {
        width: 35px;
        top: 0;
        left: 0;
    }
    .ai-panel-spark-2 {
        width: 13px;
        height: 13px;
        bottom: 0;
        right: 0;
    }
    .ai-panel-title-text {
        font-size: 18px;
        font-weight: 700;
        color: #000;
        letter-spacing: 0.01em;
    }
    .ai-panel-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
    }
    .ai-panel-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        border-radius: 6px;
        cursor: pointer;
        color: #000;
        font-size: 20px;
        transition: background 0.15s, color 0.15s;
        padding: 0;
        flex-shrink: 0;
    }
    .ai-panel-btn.ai-panel-btn-menu img { width: 4px; }
    .ai-panel-btn.ai-panel-btn-float img { width: 26px; }
    .ai-panel-btn-float { display: none; }
    #ai-side-panel.pin-enabled .ai-panel-btn-float { display: flex; }
    .ai-panel-btn:hover { background: #f0f0f0; color: #111; }
    #ai-side-panel:not(.is-float) .ai-panel-icon-pin   { display: none; }
    #ai-side-panel.is-float       .ai-panel-icon-float { display: none; }
    .ai-panel-iframe {
        width: 100%;
        flex: 1;
        border: none;
        display: block;
        background: #fff;
    }
    #ai-side-panel.is-float {
        width: 380px;
        height: 600px;
        top: auto;
        right: 20px;
        z-index: 2500;
        left: auto;
        bottom: 20px;
        border-radius: 14px;
        overflow: hidden;
        transform: none;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.22);
    }
    #ai-side-panel.is-float,
    #ai-side-panel.is-float.is-open { transform: none; }
    #ai-side-panel.is-float.is-closing-float {
        transform: translateY(-48px) !important;
        opacity: 0 !important;
        transition: transform 0.3s cubic-bezier(0.4, 0, 1, 1),
                    opacity 0.3s ease !important;
        pointer-events: none;
    }
    #ai-side-panel.is-dragging {
        transition: none !important;
        animation: none !important;
        will-change: transform;
    }
    #ai-side-panel.is-dragging .ai-panel-iframe { pointer-events: none; }
    body.ai-panel-dragging,
    body.ai-panel-dragging * {
        cursor: grabbing !important;
        user-select: none;
        -webkit-user-select: none;
    }
    .dark-mode .ai-panel-title-text { color: #fff; }
    .dark-mode .ai-panel-btn { color: #fff; }
    .dark-mode .ai-panel-btn:hover { color: #212121; }
    .dark-mode .ai-panel-btn.ai-panel-btn-menu img { filter: brightness(0) invert(1); }
    .dark-mode .ai-panel-btn.ai-panel-btn-menu:hover img { filter: brightness(0) invert(0); }
    @media (max-width: 768px) {
        #ai-side-panel:not(.is-float) { width: 100%; }
        body.ai-panel-open { padding-right: 0 !important; }
    }
    #ai-side-panel.is-mobile {
        top: var(--ai-panel-header-h, 70px) !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: auto !important;
        border-radius: 0 !important;
        transform: translateY(100%) !important;
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                    box-shadow 0.35s ease !important;
    }
    #ai-side-panel.is-mobile.is-open {
        transform: translateY(0) !important;
        box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.18) !important;
    }
    #ai-side-panel.is-mobile.is-float.is-closing-float {
        transform: translateY(100%) !important;
        opacity: 0 !important;
        transition: transform 0.3s cubic-bezier(0.4, 0, 1, 1),
                    opacity 0.3s ease !important;
    }
    #ai-side-panel.is-mobile .ai-assistant-resizer,
    #ai-side-panel.is-mobile .ai-assistant-resizer-top,
    #ai-side-panel.is-mobile .ai-assistant-resizer-right,
    #ai-side-panel.is-mobile .ai-assistant-resizer-bottom {
        display: none;
    }
    .ai-assistant-resizer {
        position: absolute;
        left: 0;
        top: 50px;
        bottom: 0;
        width: 5px;
        cursor: ew-resize;
        z-index: 1101;
        background: transparent;
    }
    .ai-assistant-resizer-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 5px;
        cursor: ns-resize;
        z-index: 1101;
        background: transparent;
    }
    .ai-assistant-resizer-right {
        position: absolute;
        right: 0;
        top: 50px;
        bottom: 0;
        width: 5px;
        cursor: ew-resize;
        z-index: 1101;
        background: transparent;
    }
    .ai-assistant-resizer-bottom {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 5px;
        cursor: ns-resize;
        z-index: 1101;
        background: transparent;
    }
    /* pin 模式下所有 resizer 隐藏，宽度固定 360px */
    #ai-side-panel:not(.is-float) .ai-assistant-resizer,
    #ai-side-panel:not(.is-float) .ai-assistant-resizer-top,
    #ai-side-panel:not(.is-float) .ai-assistant-resizer-right,
    #ai-side-panel:not(.is-float) .ai-assistant-resizer-bottom {
        display: none;
    }
    #ai-side-panel:not(.is-float) {
        width: 360px !important;
    }

    /* ---- Robot intro popup ---- */
    .robot-intro-popup {
        position: absolute;
        bottom: calc(100% + 15px);
        right: 0;
        width: 300px;
        background: #EFF3FF;
        border-radius: 8px;
        padding: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);
        z-index: 1200;
        opacity: 1;
        transform: translateY(0) scale(1);
        transition: opacity 0.35s ease, transform 0.35s ease;
        pointer-events: auto;
    }
    .robot-intro-popup::after {
        content: '';
        position: absolute;
        bottom: -8px;
        right: 7px;
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 10px solid #EFF3FF;
        filter: drop-shadow(0 3px 3px rgba(0, 0, 0, 0.08));
    }
    .robot-intro-popup.is-hidden {
        opacity: 0;
        transform: translateY(6px) scale(0.97);
        pointer-events: none;
    }
    .robot-intro-close {
        position: absolute;
        top: 7px;
        right: 8px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        color: #999;
        padding: 2px 4px;
        border-radius: 4px;
        transition: color 0.15s, background 0.15s;
    }
    .robot-intro-close:hover {
        color: #333;
        background: #f0f0f0;
    }
    .robot-intro-text {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: #111;
        font-weight: 500;
    }
    .robot-intro-btn {
        display: block;
        background: #f5c400;
        color: #111;
        text-align: center;
        padding: 7px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 700;
        text-decoration: none;
        transition: background 0.15s;
        white-space: nowrap;
    }
    .robot-intro-btn:hover {
        background: #e0b200;
        color: #111;
        text-decoration: none;
    }
    @media (max-width: 768px) {
        .robot-intro-popup { width: 150px; }
    }

    /* ---- Pin Panel Skeleton Loading ---- */
    @keyframes ai-panel-skeleton-shimmer {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    .ai-pin-skeleton {
        display: none;
        position: absolute;
        top: 50px;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 10;
        flex-direction: column;
        gap: 16px;
        padding: 20px 16px 16px;
        background: #fff;
        overflow: hidden;
        box-sizing: border-box;
    }
    .ai-pin-skeleton.is-visible {
        display: flex;
    }
    .ai-pin-skl-line,
    .ai-pin-skl-chip,
    .ai-pin-skl-block,
    .ai-pin-skl-input {
        display: block;
        position: relative;
        background-color: #e8e8e8;
        overflow: hidden;
        flex-shrink: 0;
    }
    .ai-pin-skl-line::after,
    .ai-pin-skl-chip::after,
    .ai-pin-skl-block::after,
    .ai-pin-skl-input::after {
        content: '';
        display: block;
        position: absolute;
        inset: 0;
        background: linear-gradient(270deg,
            rgba(255,255,255,0),
            rgba(255,255,255,0.3),
            rgba(255,255,255,0.6),
            rgba(255,255,255,0.3),
            rgba(255,255,255,0));
        background-size: 400% 400%;
        animation: ai-panel-skeleton-shimmer 2s ease-in-out infinite forwards;
    }
    #ai-side-panel.dark-mode .ai-pin-skl-line,
    #ai-side-panel.dark-mode .ai-pin-skl-chip,
    #ai-side-panel.dark-mode .ai-pin-skl-block,
    #ai-side-panel.dark-mode .ai-pin-skl-input { background-color: #2a2a2a; }
    #ai-side-panel.dark-mode .ai-pin-skeleton { background: #060606; }
    .ai-pin-skeleton-lines { display: flex; flex-direction: column; gap: 10px; }
    .ai-pin-skl-line { height: 12px; border-radius: 6px; }
    .ai-pin-skl-line-a { width: 32%; }
    .ai-pin-skl-line-b { width: 55%; }
    .ai-pin-skeleton-chips { display: flex; flex-direction: column; gap: 10px; }
    .ai-pin-skl-chip { height: 42px; border-radius: 22px; }
    .ai-pin-skl-chip-1 { width: 38%; }
    .ai-pin-skl-chip-2 { width: 62%; }
    .ai-pin-skl-chip-3 { width: 72%; }
    .ai-pin-skl-chip-4 { width: 66%; }
    .ai-pin-skl-block { height: 50px; width: 100%; border-radius: 18px; }
    .ai-pin-skeleton-spacer { flex: 1 1 auto; }
    .ai-pin-skl-input { height: 92px; width: 100%; border-radius: 26px; }
    #ai-side-panel.is-float .ai-pin-skeleton-chips.is-two,
    #ai-side-panel.is-float .ai-pin-skeleton-chips.is-three { display: none; }
  `;
  style.textContent = `
    ${iconNeweggStyle}
    ${iframeFloatDiyStyle}  
    `;
  document.head.appendChild(style);

  function getCookie(name) {
    var v = document.cookie.match("(^|;) ?" + name + "=([^;]*)(;|$)");
    return v ? v[2] : null;
  }

  function getLoginEmail() {
    try {
      const m = document.cookie.match(/(?:^|; )CustomerLogin=([^;]*)/);
      if (!m) return "";
      const data = JSON.parse(decodeURIComponent(m[1]));
      const email = data && data.LoginName ? String(data.LoginName) : "";
      return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : "";
    } catch (e) {
      return "";
    }
  }
  function showAiChat() {
    return !!(
      aimodeConfig?.Enable &&
      aimodeConfig?.EnableCountries?.includes(countryTag)
    );
  }

  function isPinEnabled() {
    try {
      const isDisabledPage =
        disablePinModePageAlias?.some(
          (item) => item.toLowerCase() === routeName.toLowerCase(),
        ) ?? false;
      var isNeweggUser = getLoginEmail()?.toLowerCase()?.includes("newegg.com");
      var nvtc = getCookie("NVTC").split(".")[3]?.slice(-2);
      return (
        (Number(nvtc) < (pinModeTargetPercent ?? 0) || isNeweggUser) &&
        !isDisabledPage
      );
    } catch (e) {
      return false;
    }
  }

  var _show = showAiChat();
  if (!_show) return; // 尽早 prefetch iframe 页面，加速后续加载
  (function () {
    try {
      var _prefetchSrc = `${iframeDomain}/ai/pin?routeName=${window?.__pageInfo__?.routeName || "LandingPage"}&pageName=${window?.__ga_pageInfo?.pageName || "landingpage"}&pageType=${window?.__ga_pageInfo?.pageType || "landingpage"}&parentUrl=${window.location.href}`;
      var _link = document.createElement("link");
      _link.rel = "prefetch";
      _link.href = _prefetchSrc;
      _link.as = "document";
      document.head.appendChild(_link);
    } catch (e) { }
  })();
  const robotDiv = document.createElement("div");
  robotDiv.className = "floating-robot";
  robotDiv.style.cssText = "height: 70px; width: 70px; --d: 70px;";
  robotDiv.innerHTML = `
        <span class="fab-label">Ask AI</span>
        <span class="floating-robot-icon">
          <span class="fab-ring ring-a"></span>
          <span class="fab-ring ring-b"></span>
          <span class="fab-core">
            <span class="think"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
            <svg class="spark" viewBox="0 0 20 18" aria-hidden="true"><use href="#ne-spark"></use></svg>
          </span>
        </span>
        <!-- shared AI spark gradient defs (from AI assistant demo) -->
        <svg width="0" height="0" style="position:absolute" aria-hidden="true">
          <defs>
            <linearGradient id="paint0_linear_2056_7190" x1="14.7437" y1="4.62717" x2="5.06126" y2="10.7887" gradientUnits="userSpaceOnUse">
              <stop offset="0.425906" stop-color="#FF8C07"></stop>
              <stop offset="1" stop-color="#0048F1"></stop>
            </linearGradient>
            <linearGradient id="paint1_linear_2056_7190" x1="13.6432" y1="5.50738" x2="16.724" y2="2.42662" gradientUnits="userSpaceOnUse">
              <stop stop-color="#FF8307"></stop>
              <stop offset="1" stop-color="#FFCD07"></stop>
            </linearGradient>
            <g id="ne-spark">
              <path d="M6.82169 1.98651C6.82169 1.98651 7.7738 5.5613 9.46235 6.82771C11.2228 8.14804 14.0835 8.36809 14.0835 8.36809C14.0835 8.36809 10.678 9.33439 9.24229 10.7887C7.75944 12.2907 7.2618 17.8304 7.2618 17.8304C7.2618 17.8304 6.32405 12.2907 4.8412 10.7887C3.40548 9.33439 0 8.36809 0 8.36809C0 8.36809 3.18543 7.84191 4.62115 6.3876C6.104 4.88555 6.82169 1.98651 6.82169 1.98651Z" fill="url(#paint0_linear_2056_7190)"></path>
              <path d="M15.5583 0C15.5583 0 16.0987 2.02893 17.057 2.74771C18.0562 3.49708 19.6799 3.62198 19.6799 3.62198C19.6799 3.62198 17.747 4.17042 16.9321 4.99583C16.0905 5.84835 15.8081 8.9925 15.8081 8.9925C15.8081 8.9925 15.2758 5.84835 14.4342 4.99583C13.6194 4.17042 11.6865 3.62198 11.6865 3.62198C11.6865 3.62198 13.4945 3.32333 14.3093 2.49792C15.151 1.6454 15.5583 0 15.5583 0Z" fill="url(#paint1_linear_2056_7190)"></path>
            </g>
          </defs>
        </svg>
    `;

  document.body.appendChild(robotDiv);

  (function () {
    var _diyRoutes = [
      "DIYSubcategory",
      "DIYItemList",
      "WorkstationSubcategory",
    ];
    if (_diyRoutes.indexOf(window?.__pageInfo__?.routeName) !== -1) {
      robotDiv.style.right = "130px";
    }
  })();
  (function () {
    var fab = document.querySelector(".floating-robot");
    if (!fab) return;
    var MIN = 40,
      RANGE = 180,
      ticking = false;
    // On refresh, check viewport width once: narrow screens (< 800px) start at 50px, others at 70px.
    var MAX = window.innerWidth < 800 ? 50 : 70;
    function onScroll() {
      var p = Math.min(1, Math.max(0, window.scrollY) / RANGE); // scroll progress 0 -> 1
      var size = Math.round(MAX - (MAX - MIN) * p); // 70 -> 40
      fab.style.width = fab.style.height = size + "px";
      fab.style.setProperty("--d", size + "px"); // keep --d in sync for inner animations
      ticking = false;
    }
    onScroll(); // initialise (also correct if the page loads already scrolled)
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          requestAnimationFrame(onScroll);
          ticking = true;
        }
      },
      { passive: true },
    );
  })();

  (function () {
    var LS_KEY = "AIModeTip";
    var EXPIRES = 1000 * 60 * 60 * 24 * 7;

    function lsGet(key) {
      try {
        return JSON.parse(localStorage.getItem(key));
      } catch (e) {
        return null;
      }
    }
    function lsSet(key, val) {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ value: val, ts: Date.now() }),
        );
      } catch (e) { }
    }
    function lsRemoveIfExpired(key, expires) {
      try {
        var raw = JSON.parse(localStorage.getItem(key));
        if (raw && raw.ts && Date.now() - raw.ts > expires)
          localStorage.removeItem(key);
      } catch (e) { }
    }

    lsRemoveIfExpired(LS_KEY, EXPIRES);
    var stored = lsGet(LS_KEY);
    var isShown = stored && stored.value;

    if (!isShown) {
      var popup = document.createElement("div");
      popup.className = "robot-intro-popup is-hidden";
      popup.id = "robot-intro-popup";
      popup.setAttribute("aria-live", "polite");
      popup.setAttribute("role", "dialog");
      popup.setAttribute("aria-label", "AI Assistant introduction");
      popup.innerHTML =
        '<p class="robot-intro-text">Hi, Celeste here! I’m now available as you browse the website too</p>';
      robotDiv.appendChild(popup);

      requestAnimationFrame(function () {
        popup.classList.remove("is-hidden");
      });

      var hideTimer = setTimeout(function () {
        popup.classList.add("is-hidden");
      }, 5000);

      popup.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }

    lsSet(LS_KEY, "true");
  })();

  const ICON_BASE =
    "https://c1.neweggimages.com/WebResource/Themes/Nest/images/icons/";
  var AI_PANEL_DURATION = 350;
  var _aiPanelTimer = null;
  var _aiPanelIsFloat = !isPinEnabled();
  var _floatCloseTimer = null;
  var _iframeLoaded = false;
  var _pendingAskDetail = null;

  function createPanel() {
    if (document.getElementById("ai-side-panel"))
      return document.getElementById("ai-side-panel");
    const panel = document.createElement("div");
    panel.id = "ai-side-panel";
    if (_aiPanelIsFloat) panel.classList.add("is-float");
    if (isPinEnabled()) panel.classList.add("pin-enabled");
    panel.style.display = "none";
    const iframeSrc = `${iframeDomain}/ai/pin?routeName=${window?.__pageInfo__?.routeName || "LandingPage"}&pageName=${window?.__ga_pageInfo?.pageName || "landingpage"}&pageType=${window?.__ga_pageInfo?.pageType || "landingpage"}&parentUrl=${window.location.href}`;
    var pinIconSrc = _aiPanelIsFloat
      ? ICON_BASE + "ai-pin-float.png"
      : ICON_BASE + "ai-pin.png";
    var floatBtnHtml = isPinEnabled()
      ? `<button class="ai-panel-btn ai-panel-btn-float" id="js-ai-panel-float-btn" title="Toggle float/pin" aria-label="Toggle float or pin panel">
            <img src="${pinIconSrc}" alt="">
          </button>`
      : "";

    panel.innerHTML = `
      <div class="ai-panel-header" id="js-ai-panel-header">
        <div class="ai-panel-title">
          <span class="ai-panel-spark-wrap">
            <img class="ai-panel-spark ai-panel-spark-1" src="${ICON_BASE}AI-spark1.png" alt="">
          </span>
          <span class="ai-panel-title-text">AI Mode</span>
        </div>
        <div class="ai-panel-actions">
          <button class="ai-panel-btn ai-panel-btn-menu" id="js-ai-panel-menu-btn" title="Menu" aria-label="Menu" aria-expanded="false">
            <img src="${ICON_BASE}ai-panel-menu.png" alt="">
          </button>
          ${floatBtnHtml}
          <button class="ai-panel-btn" id="js-ai-panel-close" title="Close" aria-label="Close AI panel">
            <i class="ico ico-times"></i>
          </button>
        </div>
      </div>
      <div class="ai-assistant-resizer"></div>
      <div class="ai-assistant-resizer-top"></div>
      <div class="ai-assistant-resizer-right"></div>
      <div class="ai-assistant-resizer-bottom"></div>
      <iframe class="ai-panel-iframe" id="js-ai-panel-iframe" title="AI Shopping Assistant" frameborder="0" fetchpriority="high"></iframe>
      <div id="js-ai-pin-skeleton" class="ai-pin-skeleton">
        <div class="ai-pin-skeleton-lines">
          <span class="ai-pin-skl-line ai-pin-skl-line-a"></span>
          <span class="ai-pin-skl-line ai-pin-skl-line-b"></span>
        </div>
        <div class="ai-pin-skeleton-chips">
          <span class="ai-pin-skl-chip ai-pin-skl-chip-1"></span>
          <span class="ai-pin-skl-chip ai-pin-skl-chip-2"></span>
          <span class="ai-pin-skl-chip ai-pin-skl-chip-3"></span>
          <span class="ai-pin-skl-chip ai-pin-skl-chip-4"></span>
          <span class="ai-pin-skl-block"></span>
        </div>
        <div class="ai-pin-skeleton-chips is-two">
          <span class="ai-pin-skl-block"></span>
          <span class="ai-pin-skl-chip ai-pin-skl-chip-2"></span>
          <span class="ai-pin-skl-chip ai-pin-skl-chip-3"></span>
        </div>
        <div class="ai-pin-skeleton-chips is-three">
          <span class="ai-pin-skl-block"></span>
          <span class="ai-pin-skl-chip ai-pin-skl-chip-2"></span>
          <span class="ai-pin-skl-chip ai-pin-skl-chip-3"></span>
        </div>
        <span class="ai-pin-skeleton-spacer"></span>
        <span class="ai-pin-skl-input"></span>
      </div>
    `;

    document.body.appendChild(panel);

    // 应用初始主题：优先读 NV_Theme cookie，其次检查 <html> dark-mode 类
    (function () {
      var isDark = false;
      try {
        var match = document.cookie.match(/(?:^|;\s*)NV_Theme=([^;]*)/);
        if (match) {
          isDark = match[1].trim() === "true";
        } else {
          isDark = document.documentElement.classList.contains("dark-mode");
        }
      } catch (e) {
        isDark = document.documentElement.classList.contains("dark-mode");
      }
      if (isDark) panel.classList.add("dark-mode");
    })();

    const iframe = panel.querySelector("#js-ai-panel-iframe");
    iframe.allow = "microphone";
    iframe.setAttribute(
      "sandbox",
      "allow-same-origin allow-scripts allow-popups allow-forms",
    );
    iframe.style.zIndex = "1";
    const resizer = panel.querySelector(".ai-assistant-resizer");
    const resizerTop = panel.querySelector(".ai-assistant-resizer-top");
    const resizerRight = panel.querySelector(".ai-assistant-resizer-right");
    const resizerBottom = panel.querySelector(".ai-assistant-resizer-bottom");

    // 拖拽调整宽度
    resizer.addEventListener("mousedown", (e) => {
      if (!panel.classList.contains("is-float")) return;
      e.preventDefault();
      resizer.classList.add("dragging");
      const startX = e.clientX;
      const startWidth = panel.offsetWidth;
      const startLeft = panel.getBoundingClientRect().left;
      const isPinned = !panel.classList.contains("is-float");
      const isLeftAnchored =
        !isPinned && panel.style.left && panel.style.left !== "auto";
      let rafId = null;

      iframe.style.pointerEvents = "none";
      document.body.style.userSelect = "none";
      panel.style.transition = "none";
      document.body.style.transition = "none";

      function onMouseMove(e) {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const dx = startX - e.clientX;
          const newWidth = isPinned
            ? Math.min(Math.max(startWidth + dx, 320), 400)
            : Math.min(Math.max(startWidth + dx, 380), 430);
          const actualDx = newWidth - startWidth;
          panel.style.width = newWidth + "px";
          if (isPinned) {
            // FIX BUG#2: 同步更新 --ai-panel-width，保持 body padding 正确
            document.body.style.setProperty(
              "--ai-panel-width",
              newWidth + "px",
            );
            document.body.style.setProperty(
              "--ai-msg-viewport",
              newWidth + "px",
            );
          } else if (isLeftAnchored) {
            panel.style.left = Math.max(0, startLeft - actualDx) + "px";
          }
        });
      }

      function onMouseUp() {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        resizer.classList.remove("dragging");
        iframe.style.pointerEvents = "";
        document.body.style.userSelect = "";
        panel.style.transition = "";
        document.body.style.transition = "";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    iframe.addEventListener(
      "load",
      function () {
        _iframeLoaded = true;
        if (_pendingAskDetail !== null) {
          iframe.contentWindow &&
            iframe.contentWindow.postMessage(
              { type: "AI_ASK_QUESTION", detail: _pendingAskDetail },
              "*",
            );
          _pendingAskDetail = null;
        }
      },
      { once: true },
    );

    // 拖拽调整高度（浮窗模式）
    resizerBottom.addEventListener("mousedown", (e) => {
      if (!panel.classList.contains("is-float")) return;
      e.preventDefault();
      resizerBottom.classList.add("dragging");
      const startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      const startHeight = rect.height;
      const panelTop = rect.top;
      const headerEl = document.querySelector(".header2021");
      const headerBottom = Math.max(
        8,
        (headerEl ? headerEl.getBoundingClientRect().bottom : 0) + 8,
      );
      const maxHeight = Math.min(
        window.innerHeight - panelTop - 20,
        window.innerHeight - headerBottom - 20,
      );
      let rafId = null;

      // 切换为顶部锚定，确保 resize 从底边变化而非顶边
      panel.style.top = panelTop + "px";
      panel.style.bottom = "auto";

      iframe.style.pointerEvents = "none";
      document.body.style.userSelect = "none";
      panel.style.transition = "none";

      function onMouseMove(e) {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const newHeight = Math.min(
            Math.max(startHeight + e.clientY - startY, 600),
            maxHeight,
          );
          panel.style.height = newHeight + "px";
        });
      }

      function onMouseUp() {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        resizerBottom.classList.remove("dragging");
        iframe.style.pointerEvents = "";
        document.body.style.userSelect = "";
        panel.style.transition = "";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    // 拖拽调整高度-顶部（浮窗模式）
    resizerTop.addEventListener("mousedown", (e) => {
      if (!panel.classList.contains("is-float")) return;
      e.preventDefault();
      resizerTop.classList.add("dragging");
      const startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      const startHeight = rect.height;
      const startTopPx = rect.top;
      const panelBottom = rect.bottom;
      const isTopAnchored = !!panel.style.top;
      const headerEl = document.querySelector(".header2021");
      const headerBottom = Math.max(
        8,
        (headerEl ? headerEl.getBoundingClientRect().bottom : 0) + 8,
      );
      const maxHeight = panelBottom - headerBottom;
      let rafId = null;

      iframe.style.pointerEvents = "none";
      document.body.style.userSelect = "none";
      panel.style.transition = "none";

      function onMouseMove(e) {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const dy = e.clientY - startY;
          const newHeight = Math.min(
            Math.max(startHeight - dy, 600),
            maxHeight,
          );
          const actualDy = startHeight - newHeight;
          panel.style.height = newHeight + "px";
          if (isTopAnchored) {
            panel.style.top =
              Math.max(headerBottom, startTopPx + actualDy) + "px";
          }
        });
      }

      function onMouseUp() {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        resizerTop.classList.remove("dragging");
        iframe.style.pointerEvents = "";
        document.body.style.userSelect = "";
        panel.style.transition = "";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    // 拖拽调整宽度-右侧（浮窗模式）
    resizerRight.addEventListener("mousedown", (e) => {
      if (!panel.classList.contains("is-float")) return;
      e.preventDefault();
      resizerRight.classList.add("dragging");
      const startX = e.clientX;
      const rect = panel.getBoundingClientRect();
      const startWidth = rect.width;
      const startRight = window.innerWidth - rect.right;
      const isLeftAnchored = panel.style.left && panel.style.left !== "auto";
      let rafId = null;

      iframe.style.pointerEvents = "none";
      document.body.style.userSelect = "none";
      panel.style.transition = "none";

      function onMouseMove(e) {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const dx = e.clientX - startX;
          const newWidth = Math.min(Math.max(startWidth + dx, 380), 430);
          const actualDx = newWidth - startWidth;
          panel.style.width = newWidth + "px";
          if (!isLeftAnchored) {
            panel.style.right = Math.max(0, startRight - actualDx) + "px";
          }
        });
      }

      function onMouseUp() {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        resizerRight.classList.remove("dragging");
        iframe.style.pointerEvents = "";
        document.body.style.userSelect = "";
        panel.style.transition = "";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    iframe.src = iframeSrc;
    (function hideSkeleton() {
      var skl = panel.querySelector("#js-ai-pin-skeleton");
      if (!skl) return;
      skl.classList.add("is-visible");
      function poll() {
        try {
          var rs = iframe.contentDocument && iframe.contentDocument.readyState;
          if (rs === "interactive" || rs === "complete") {
            skl.classList.remove("is-visible");
            return;
          }
        } catch (e) { }
        setTimeout(poll, 200);
      }
      poll();
    })();

    return panel;
  }

  var _STATE_KEY = "ai-panel-state";

  function _saveState() {
    var panelEl = document.getElementById("ai-side-panel");
    var isOpen = panelEl
      ? panelEl.classList.contains("is-open") &&
      panelEl.style.display !== "none"
      : false;
    try {
      sessionStorage.setItem(
        _STATE_KEY,
        JSON.stringify({
          pin: !_aiPanelIsFloat ? isOpen : false,
          float: _aiPanelIsFloat ? isOpen : false,
        }),
      );
    } catch (e) { }
  }

  function _restoreState() {
    try {
      if (_isMobile()) return;
      var raw = sessionStorage.getItem(_STATE_KEY);
      if (!raw) return;
      var state = JSON.parse(raw);
      if (!state.pin && !state.float) return;
      var panelEl = document.getElementById("ai-side-panel") || createPanel();
      if (!isPinEnabled() || state.float) {
        switchToFloat();
      } else {
        switchToPin();
      }
      var iframeEl = panelEl.querySelector("#js-ai-panel-iframe");
      var _opened = false;
      function _doRestore() {
        if (_opened) return;
        _opened = true;
        panelEl.style.transition = "none";
        showPanel();
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            panelEl.style.transition = "";
          });
        });
      }
      if (iframeEl) {
        (function poll() {
          try {
            var rs =
              iframeEl.contentDocument && iframeEl.contentDocument.readyState;
            if (rs === "interactive" || rs === "complete") {
              _doRestore();
              return;
            }
          } catch (e) { }
          setTimeout(poll, 100);
        })();
      } else {
        _doRestore();
      }
    } catch (e) { }
  }

  function PopupOpenClass() {
    var el = document.querySelector("body");
    el.style.paddingRight = "17px";
    el.classList.add("modal-open");
  }

  function PopupCloseClass() {
    var el = document.querySelector("body");
    el.style.paddingRight = "";
    el.classList.remove("modal-open");
  }

  function _isMobile() {
    var ua = navigator.userAgent;
    var isWindowsPhone = /(Windows Phone);?[\s\/]+([\d.]+)?/.test(ua);
    var isAndroid = /(Android);?[\s\/]+([\d,]+)?/.test(ua);
    var isIpad = /(iPad).*OS\s([\d_]+)/.test(ua);
    var isIpod = /(iPod)(.*OS\s([\d_]+))/.test(ua);
    var isIphone = !isIpad && /(iPhone\sOS|iOS)\s([\d_]+)/.test(ua);
    var isWebView =
      (isIphone || isIpad || isIpod) &&
      (/.*AppleWebKit(?!.*Safari)/i.test(ua) || navigator.standalone);
    return (
      isWindowsPhone ||
      isAndroid ||
      isIpad ||
      isIpod ||
      isIphone ||
      isWebView ||
      window.innerWidth < 599
    );
  }
  function _syncMobileClass(panelEl) {
    if (!panelEl) return;
    var isMob = _isMobile();
    panelEl.classList.toggle("is-mobile", isMob);
    if (isMob) {
      var headerEl = document.querySelector(".header2021");
      var top = headerEl
        ? Math.max(0, headerEl.getBoundingClientRect().bottom)
        : 70;
      panelEl.style.setProperty("--ai-panel-header-h", top + "px");
    }
  }

  function openPanel(panel) {
    document.body.classList.add("has-ai-panel");
    panel.style.display = "";
    panel.classList.add("is-open");
    _syncMobileClass(panel);
    if (_aiPanelIsFloat) {
      if (_isMobile() && typeof PopupOpenClass === "function") PopupOpenClass();
    } else {
      document.body.classList.add("ai-panel-open");
      var panelW = panel.offsetWidth + "px";
      document.body.style.setProperty("--ai-panel-width", panelW);
      document.body.style.setProperty("--ai-msg-viewport", panelW);
    }
    _saveState();
    window.dispatchEvent(new Event("resize"));
  }

  function showPanel() {
    const existingPanel = document.getElementById("ai-side-panel");
    if (existingPanel) {
      document.body.classList.add("has-ai-panel");
      if (_floatCloseTimer) {
        clearTimeout(_floatCloseTimer);
        _floatCloseTimer = null;
      }
      existingPanel.style.display = "";
      existingPanel.classList.remove("is-closing-float");
      existingPanel.classList.add("is-open");
      _syncMobileClass(existingPanel);
      if (
        _aiPanelIsFloat &&
        _isMobile() &&
        typeof PopupOpenClass === "function"
      )
        PopupOpenClass();
      if (!_aiPanelIsFloat) {
        document.body.classList.add("ai-panel-open");
        // FIX BUG#2: 同时设置 --ai-panel-width
        var panelW = existingPanel.offsetWidth + "px";
        document.body.style.setProperty("--ai-panel-width", panelW);
        document.body.style.setProperty("--ai-msg-viewport", panelW);
      }
      _saveState();
    } else {
      var newPanel = createPanel();
      openPanel(newPanel);
    }
    window.dispatchEvent(new Event("resize"));
  }

  function closeAiPanel() {
    var panelEl = document.getElementById("ai-side-panel");
    if (!panelEl) return;
    if (_aiPanelIsFloat) {
      if (_floatCloseTimer) clearTimeout(_floatCloseTimer);
      if (_isMobile() && typeof PopupCloseClass === "function")
        PopupCloseClass();
      panelEl.classList.add("is-closing-float");
      panelEl.classList.remove("is-open");
      _floatCloseTimer = setTimeout(function () {
        panelEl.classList.remove("is-closing-float");
        panelEl.style.display = "none";
        panelEl.style.transform = "";
        panelEl.style.opacity = "";
        _saveState();
        window.dispatchEvent(new Event("resize"));
      }, 320);
    } else {
      _bodyTransition(true);
      document.body.classList.remove("ai-panel-open");
      // FIX BUG#2: 清除 --ai-panel-width，消除页面右侧留白
      document.body.style.setProperty("--ai-panel-width", "0px");
      document.body.style.setProperty("--ai-msg-viewport", "0px");
      // FIX BUG#5: 改用原生 classList
      panelEl.classList.remove("is-open");
      // FIX BUG#3: pin 模式关闭后动画结束再设 display:none，彻底脱离渲染
      // resize 必须等 padding-right transition 结束，否则 getBodyContentWidth 仍是旧值
      if (_aiPanelTimer) clearTimeout(_aiPanelTimer);
      _aiPanelTimer = setTimeout(function () {
        if (!panelEl.classList.contains("is-open")) {
          panelEl.style.display = "none";
        }
        document.body.style.transition = "";
        window.dispatchEvent(new Event("resize"));
      }, AI_PANEL_DURATION);
      _saveState();
    }
  }

  function _bodyTransition(on) {
    if (_aiPanelTimer) clearTimeout(_aiPanelTimer);
    // FIX BUG#5: 改用原生 style 而非 jQuery，确保样式设置时序可靠
    document.body.style.transition = on
      ? "padding-right " + AI_PANEL_DURATION + "ms cubic-bezier(0.4,0,0.2,1)"
      : "";
    if (on) {
      _aiPanelTimer = setTimeout(function () {
        document.body.style.transition = "";
      }, AI_PANEL_DURATION);
    }
  }

  function syncIframeFloatClass() {
    var iframe = document.getElementById("js-ai-panel-iframe");
    if (!iframe) return;
    var isFloat = _aiPanelIsFloat;
    try {
      var iframeDoc =
        iframe.contentDocument ||
        (iframe.contentWindow && iframe.contentWindow.document);
      if (iframeDoc && iframeDoc.documentElement) {
        iframeDoc.documentElement.classList.toggle("ai-panel-float", isFloat);
      }
    } catch (e) { }
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          { type: "ai-panel-sync", isFloat: isFloat },
          "*",
        );
      }
    } catch (e) { }
  }

  window.aiPanel = {
    close: function () {
      closeAiPanel();
    },
    toggleFloat: function () {
      _aiPanelIsFloat ? switchToPin() : switchToFloat();
    },
    isFloat: function () {
      return _aiPanelIsFloat;
    },
  };

  function sendGA4Click(action) {
    var isLocalhost = /^localhost$|^127\.|^\[::1\]/.test(
      window.location.hostname,
    );
    if (!isLocalhost && window?.GA4LPHandler) {
      try {
        new window.GA4LPHandler().sendLPClick({
          event: "legacy_click",
          legacy_element_value: `pin | aimode-${action}-${window?.__ga_pageInfo?.pageName}`,
        });
      } catch (e) { }
    }
  }

  function switchToFloat() {
    _aiPanelIsFloat = true;
    var panelEl = document.getElementById("ai-side-panel");
    // 清除所有内联定位，让 CSS 的 right:20px / bottom:20px 生效
    panelEl.style.left = "";
    panelEl.style.top = "";
    panelEl.style.right = "";
    panelEl.style.bottom = "";
    panelEl.style.transform = "";
    panelEl.style.opacity = "";
    panelEl.style.width = "";
    panelEl.style.height = "";
    _bodyTransition(true);
    // FIX BUG#2: 清除 --ai-panel-width
    document.body.style.setProperty("--ai-panel-width", "0px");
    document.body.classList.remove("ai-panel-open");
    document.body.style.setProperty("--ai-msg-viewport", "0px");
    panelEl.classList.add("is-float");
    panelEl.style.top = "auto";
    panelEl.style.right = "12px";
    panelEl.style.bottom = "20px";
    panelEl.style.left = "auto";
    var floatBtnImg = document.querySelector("#js-ai-panel-float-btn img");
    if (floatBtnImg) floatBtnImg.src = ICON_BASE + "ai-pin-float.png";
    syncIframeFloatClass();
    _saveState();
    if (_aiPanelTimer) clearTimeout(_aiPanelTimer);
    _aiPanelTimer = setTimeout(function () {
      document.body.style.transition = "";
      window.dispatchEvent(new Event("resize"));
    }, AI_PANEL_DURATION);
    sendGA4Click("tofloat");
  }

  function switchToPin() {
    _aiPanelIsFloat = false;
    var panelEl = document.getElementById("ai-side-panel");
    panelEl.style.left = "";
    panelEl.style.top = "";
    panelEl.style.right = "";
    panelEl.style.bottom = "";
    panelEl.style.transform = "";
    panelEl.style.opacity = "";
    panelEl.style.height = "";
    panelEl.style.width = "";
    var floatBtnImg = document.querySelector("#js-ai-panel-float-btn img");
    if (floatBtnImg) floatBtnImg.src = ICON_BASE + "ai-pin.png";
    // FIX BUG#5: 用原生 classList 确保类名同步
    panelEl.classList.remove("is-float");
    _bodyTransition(true);
    document.body.classList.add("ai-panel-open");
    // FIX BUG#2: 同时设置 --ai-panel-width
    var panelW = (panelEl.offsetWidth || 400) + "px";
    document.body.style.setProperty("--ai-panel-width", panelW);
    document.body.style.setProperty("--ai-msg-viewport", panelW);
    syncIframeFloatClass();
    _saveState();
    if (_aiPanelTimer) clearTimeout(_aiPanelTimer);
    _aiPanelTimer = setTimeout(function () {
      document.body.style.transition = "";
      window.dispatchEvent(new Event("resize"));
    }, AI_PANEL_DURATION);
    sendGA4Click("topin");
  }

  (function () {
    var dragging = false;
    var startX, startY;
    var baseL, baseT;
    var lastDx = 0,
      lastDy = 0;
    var pendingX, pendingY;
    var rafId = null;
    var bounds = null;
    var DRAG_EDGE_MARGIN = 12;

    function calcBounds(panelEl) {
      var headerEl = document.querySelector(".header2021");
      var vpW = document.documentElement.clientWidth;
      var vpH = document.documentElement.clientHeight;
      return {
        minL: DRAG_EDGE_MARGIN,
        maxL: vpW - panelEl.offsetWidth,
        minT: Math.max(
          DRAG_EDGE_MARGIN,
          (headerEl ? headerEl.getBoundingClientRect().bottom : 0) +
          DRAG_EDGE_MARGIN,
        ),
        maxT: vpH - panelEl.offsetHeight - DRAG_EDGE_MARGIN,
      };
    }

    function commitPosition(panelEl) {
      panelEl.style.left = baseL + lastDx + "px";
      panelEl.style.top = baseT + lastDy + "px";
      panelEl.style.right = "auto";
      panelEl.style.bottom = "auto";
      panelEl.style.transform = "none";
      panelEl.style.willChange = "";
    }

    function stopDrag() {
      if (!dragging) return;
      dragging = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      bounds = null;
      var panelEl = document.getElementById("ai-side-panel");
      if (panelEl) {
        commitPosition(panelEl);
        requestAnimationFrame(function () {
          panelEl.classList.remove("is-dragging");
          panelEl.style.transform = "";
        });
      }
      document.body.classList.remove("ai-panel-dragging");
    }

    document.addEventListener("mousedown", function (e) {
      if (!_aiPanelIsFloat) return;
      if (!e.target.closest("#js-ai-panel-header")) return;
      if (_isMobile()) return;
      if (e.target.closest(".ai-panel-actions, .ai-panel-menu-popup")) return;
      var panelEl = document.getElementById("ai-side-panel");
      if (!panelEl) return;
      var rect = panelEl.getBoundingClientRect();
      dragging = true;
      lastDx = 0;
      lastDy = 0;
      startX = e.clientX;
      startY = e.clientY;
      baseL = rect.left;
      baseT = rect.top;
      bounds = calcBounds(panelEl);
      panelEl.style.left = baseL + "px";
      panelEl.style.top = baseT + "px";
      panelEl.style.right = "auto";
      panelEl.style.bottom = "auto";
      panelEl.style.transform = "translate3d(0,0,0)";
      panelEl.style.willChange = "transform";
      panelEl.classList.add("is-dragging");
      document.body.classList.add("ai-panel-dragging");
      e.preventDefault();
    });

    window.addEventListener(
      "mousemove",
      function (e) {
        if (!dragging || !bounds) return;
        pendingX = e.clientX;
        pendingY = e.clientY;
        if (rafId) return;
        rafId = requestAnimationFrame(function () {
          rafId = null;
          if (!dragging) return;
          var panelEl = document.getElementById("ai-side-panel");
          if (!panelEl) return;
          var clampedL = Math.max(
            bounds.minL,
            Math.min(bounds.maxL, baseL + (pendingX - startX)),
          );
          var clampedT = Math.max(
            bounds.minT,
            Math.min(bounds.maxT, baseT + (pendingY - startY)),
          );
          lastDx = clampedL - baseL;
          lastDy = clampedT - baseT;
          panelEl.style.transform =
            "translate3d(" + lastDx + "px," + lastDy + "px,0)";
        });
      },
      { passive: true },
    );

    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("blur", stopDrag);
  })();

  // 监听主题切换：页面 toggle 按钮会在 body 上加/移除 dark-mode 类
  (function () {
    function applyTheme(isDark) {
      var panelEl = document.getElementById("ai-side-panel");
      if (!panelEl) return;
      panelEl.classList.toggle("dark-mode", isDark);
      // 通知 iframe 同步主题
      var iframeEl = document.getElementById("js-ai-panel-iframe");
      if (iframeEl && iframeEl.contentWindow) {
        try {
          iframeEl.contentWindow.postMessage(
            { type: "AI_PIN_THEME", dark: isDark ? "true" : "false" },
            "*",
          );
        } catch (e) { }
      }
    }

    // 监听 html 元素的 class 变化（dark-mode 类加在 <html> 上，不是 <body>）
    var _lastIsDark = document.documentElement.classList.contains("dark-mode");
    var themeObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.attributeName === "class") {
          var isDark = document.documentElement.classList.contains("dark-mode");
          if (isDark !== _lastIsDark) {
            _lastIsDark = isDark;
            applyTheme(isDark);
          }
        }
      });
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  })();

  // [FEATURE] 监听视口宽度，< 1000px 时强制 float 模式，>= 1000px 时恢复 pin 模式
  (function () {
    var BREAKPOINT = 1360;
    function clampFloatPanel(panelEl) {
      if (!panelEl || !panelEl.classList.contains("is-float")) return;
      if (panelEl.classList.contains("is-mobile")) return;
      var rect = panelEl.getBoundingClientRect();
      var vpW = document.documentElement.clientWidth;
      var vpH = document.documentElement.clientHeight;
      var headerEl = document.querySelector(".header2021");
      var minT = Math.max(
        8,
        (headerEl ? headerEl.getBoundingClientRect().bottom : 0) + 8,
      );
      var MARGIN = 12;
      var curLeft = parseFloat(panelEl.style.left);
      var curTop = parseFloat(panelEl.style.top);
      var usedLeft =
        !isNaN(curLeft) && panelEl.style.left && panelEl.style.left !== "auto";
      var usedTop =
        !isNaN(curTop) && panelEl.style.top && panelEl.style.top !== "auto";
      if (usedLeft) {
        var maxL = vpW - rect.width - MARGIN;
        panelEl.style.left = Math.max(MARGIN, Math.min(maxL, curLeft)) + "px";
      } else {
        var curRight = parseFloat(panelEl.style.right) || MARGIN;
        var maxRight = vpW - rect.width - MARGIN;
        panelEl.style.right =
          Math.max(MARGIN, Math.min(maxRight, curRight)) + "px";
      }
      if (usedTop) {
        var maxT = vpH - rect.height - MARGIN;
        panelEl.style.top = Math.max(minT, Math.min(maxT, curTop)) + "px";
      }
    }
    function onResize() {
      var panelEl = document.getElementById("ai-side-panel");
      var btnEl = document.getElementById("ai-panel-btn");
      var btnFloatEl = document.getElementById("js-ai-panel-float-btn");
      var isNarrow = window.innerWidth < BREAKPOINT;
      if (btnEl) btnEl.style.display = isNarrow ? "none" : "";
      if (btnFloatEl) {
        if (!isPinEnabled() || isNarrow) btnFloatEl.style.display = "none";
        else btnFloatEl.style.display = "";
      }
      if (!panelEl || !panelEl.classList.contains("is-open")) return;
      if (isNarrow && !_aiPanelIsFloat) {
        switchToFloat();
      }
      // else if (window.innerWidth >= BREAKPOINT && _aiPanelIsFloat && !hasConflictModal()) {
      //   switchToPin()
      // }
      _syncMobileClass(panelEl);
      clampFloatPanel(panelEl);
    }
    var resizeTimer = null;
    var clampRafId = null;
    window.addEventListener("resize", function () {
      if (clampRafId) cancelAnimationFrame(clampRafId);
      clampRafId = requestAnimationFrame(function () {
        clampRafId = null;
        clampFloatPanel(document.getElementById("ai-side-panel"));
      });
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(onResize, 150);
    });
    onResize();
  })();

  // pin:true 或 float:true 时恢复上次打开状态
  try {
    var _sessionRaw = sessionStorage.getItem(_STATE_KEY);
    var _sessionState = _sessionRaw ? JSON.parse(_sessionRaw) : null;
    if (_sessionState && (_sessionState.pin || _sessionState.float)) {
      _restoreState();
    }
  } catch (e) { }

  robotDiv.addEventListener("click", () => {
    showPanel();
    sendGA4Click("open");
  });

  window.addEventListener(
    "setOpenModal",
    function (e) {
      showPanel();
      var detail = e.detail;
      var iframeEl = document.getElementById("js-ai-panel-iframe");
      if (!iframeEl) return;
      if (_iframeLoaded) {
        iframeEl.contentWindow &&
          iframeEl.contentWindow.postMessage(
            { type: "AI_ASK_QUESTION", detail: detail },
            "*",
          );
      } else {
        _pendingAskDetail = detail;
      }
    },
    true,
  );

  function _isAllowedMessageOrigin(origin) {
    try {
      var h = new URL(origin).hostname;
      return (
        h.endsWith("newegg.com") ||
        h.endsWith("newegg.ca") ||
        h.endsWith("newegg6.org")
      );
    } catch (_) {
      return false;
    }
  }

  function _showAiAssistantFeedback() {
    var feedbackId = countryAlpha3 == "CAN" ? "3ED42CDD" : "E69EF3A7";
    var survey = window.newegg_inhouse_ai_assistant_feedback;
    if (!survey) {
      var ua = navigator.userAgent.toLowerCase();
      var isPhone =
        (/android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua) ||
          navigator.userAgent.indexOf("Mobi") > -1) &&
        !/ipad/i.test(ua);
      if (isPhone || !window.neweggFeedback) {
        window.open(
          "https://promotions.newegg.com/newegg/survey/feedback.html?surveyId=" +
          feedbackId,
          "_blank",
        );
        return;
      }
      try {
        survey = window.newegg_inhouse_ai_assistant_feedback =
          new neweggFeedback.NeweggSurvey({ cardType: "Id", key: feedbackId });
      } catch (err) {
        console.error(err);
        return;
      }
    }
    survey.show?.();
  }

  window.addEventListener("message", function (e) {
    if (!_isAllowedMessageOrigin(e.origin) || !e.data) return;
    var payload = e.data;

    if (
      payload.action === "feedback.show" &&
      payload.data?.source === "ai_mode"
    ) {
      _showAiAssistantFeedback();
      return;
    }

    if (payload.type !== "AI_PIN_NAVIGATE") return;
    var url = payload.pdpLink || payload.url;
    if (!url || typeof url !== "string") return;
    try {
      var resolved = new URL(url, window.location.origin);
      if (resolved.protocol === "javascript:") return;
      window.location.assign(resolved.href);
    } catch (err) { }
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("#js-ai-panel-close")) {
      closeAiPanel();
    }

    if (e.target.closest("#js-ai-panel-float-btn")) {
      if (!isPinEnabled()) return;
      _aiPanelIsFloat ? switchToPin() : switchToFloat();
    }

    if (e.target.closest("#js-ai-panel-menu-btn")) {
      const iframeEl = document.getElementById("js-ai-panel-iframe");
      iframeEl &&
        iframeEl.contentWindow.postMessage({ type: "AI_PIN_OPEN_MENU" }, "*");
    }
  });
})();
