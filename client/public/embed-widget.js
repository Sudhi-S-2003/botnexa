/**
 * BotNexa AI Chatbot - Universal Embed Widget
 * Embed a floating AI assistant button & popup into any external website.
 *
 * Usage:
 * <script src="https://your-botnexa-domain.com/embed-widget.js"
 *         data-token="YOUR_SIGNED_EMBED_TOKEN"
 *         data-position="bottom-right"
 *         defer></script>
 */
(function () {
  'use strict';

  function initBotNexaWidget() {
    // 1. Locate script tag and configuration
    const currentScript =
      document.currentScript ||
      document.querySelector('script[data-token][src*="embed-widget"]');

    if (!currentScript) {
      console.warn('[BotNexa] embed-widget.js could not locate script tag with data-token.');
      return;
    }

    const token = currentScript.getAttribute('data-token');
    if (!token) {
      console.warn('[BotNexa] data-token attribute is required on script tag.');
      return;
    }

    const position = currentScript.getAttribute('data-position') || 'bottom-right';
    const isLeft = position === 'bottom-left';

    // Derive script origin (host domain)
    let scriptOrigin = window.location.origin;
    try {
      const srcUrl = new URL(currentScript.src);
      scriptOrigin = srcUrl.origin;
    } catch {
      // fallback to current origin
    }

    const embedUrl = `${scriptOrigin}/embed/chat?token=${encodeURIComponent(token)}`;

    // 2. Prevent duplicate initialization
    if (document.getElementById('botnexa-widget-container')) {
      return;
    }

    // 3. Create Widget DOM Container
    const container = document.createElement('div');
    container.id = 'botnexa-widget-container';
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      ${isLeft ? 'left: 24px;' : 'right: 24px;'}
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    // 4. Create Floating Launcher Button
    const button = document.createElement('button');
    button.id = 'botnexa-widget-btn';
    button.setAttribute('aria-label', 'Open AI Chat');
    button.style.cssText = `
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: #2563eb;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 12px 28px -6px rgba(37, 99, 235, 0.45), 0 4px 12px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      outline: none;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, box-shadow 0.2s ease;
    `;

    // Icon SVGs (Chat icon & Close icon)
    const chatIcon = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;

    const closeIcon = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;

    button.innerHTML = chatIcon;

    // Hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
      button.style.background = '#1d4ed8';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.background = '#2563eb';
    });

    // 5. Create Popup Window & IFrame
    const frameContainer = document.createElement('div');
    frameContainer.id = 'botnexa-widget-frame-wrapper';
    frameContainer.style.cssText = `
      position: absolute;
      bottom: 68px;
      ${isLeft ? 'left: 0;' : 'right: 0;'}
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 96px);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08);
      display: none;
      opacity: 0;
      transform: translateY(12px) scale(0.98);
      transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      background: #090a0f;
    `;

    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.title = 'BotNexa AI Assistant';
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    `;
    iframe.setAttribute('allow', 'clipboard-write');

    frameContainer.appendChild(iframe);

    // 6. Toggle State
    let isOpen = false;

    function toggleChat() {
      isOpen = !isOpen;
      if (isOpen) {
        frameContainer.style.display = 'block';
        button.innerHTML = closeIcon;
        // Trigger reflow for CSS transition
        void frameContainer.offsetWidth;
        frameContainer.style.opacity = '1';
        frameContainer.style.transform = 'translateY(0) scale(1)';
      } else {
        frameContainer.style.opacity = '0';
        frameContainer.style.transform = 'translateY(16px) scale(0.96)';
        button.innerHTML = chatIcon;
        setTimeout(() => {
          if (!isOpen) frameContainer.style.display = 'none';
        }, 250);
      }
    }

    button.addEventListener('click', toggleChat);

    container.appendChild(frameContainer);
    container.appendChild(button);
    document.body.appendChild(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBotNexaWidget);
  } else {
    initBotNexaWidget();
  }
})();
