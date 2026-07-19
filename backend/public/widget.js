(function () {
  // 1. Get config from the script tag itself
  const scriptTag = document.currentScript;
  const orgKey = scriptTag.getAttribute('data-org');

  if (!orgKey) {
    console.error('YourBot widget: missing data-org attribute');
    return;
  }

  // Derive the backend URL from wherever this script itself was loaded from.
  // Works automatically in dev (localhost) and prod (your Railway domain)
  // without any hardcoding or rebuild.
  const BASE_URL = new URL(scriptTag.src).origin;

  // 2. Fetch widget config (theme, position, etc.) before rendering anything
  fetch(`${BASE_URL}/api/widget-config?key=${orgKey}`)

    .then((res) => res.json())
    .then((config) => {
      injectBubble(config);
    })
    .catch((err) => {
      console.error('YourBot widget: failed to load config', err);
    });

  function injectBubble(config) {
    const position = config.bubble_position || 'bottom-right';
    const positionStyles = position === 'bottom-left'
      ? 'left: 20px;'
      : 'right: 20px;';

    // 3. Create the floating bubble button
   const bubble = document.createElement('button');
bubble.id = 'yourbot-bubble';

// Use the configured avatar if one is set, otherwise fall back to the SVG icon
const dotColor = config.primary_color || '#5A2EFF';
bubble.innerHTML = config.avatar_url
  ? `<img src="${config.avatar_url}" alt="" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`
  : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8c-1.06 0-2.07-.207-2.995-.582L5 20l1.243-3.73A7.96 7.96 0 0 1 4 12Z"
        fill="white"
      />
      <circle cx="8.5" cy="12" r="1.2" fill="${dotColor}" />
      <circle cx="12" cy="12" r="1.2" fill="${dotColor}" />
      <circle cx="15.5" cy="12" r="1.2" fill="${dotColor}" />
    </svg>`;

    
bubble.style.cssText = `
  position: fixed;
  bottom: 20px;
  ${positionStyles}
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: ${config.primary_color || '#5A2EFF'};
  color: white;
  border: none;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 999998;
  padding: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

    document.body.appendChild(bubble);

    let iframe = null;
    let isOpen = false;

    // 4. Toggle iframe on click
    bubble.addEventListener('click', () => {
      isOpen = !isOpen;

      if (isOpen) {
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.id = 'yourbot-iframe';
          iframe.src = `${BASE_URL}/widget-app?org=${orgKey}`;
          iframe.style.cssText = `
            position: fixed;
            bottom: 90px;
            ${positionStyles}
            width: 380px;
            height: 600px;
            max-height: 70vh;
            border: none;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.2);
            z-index: 999999;
          `;
          document.body.appendChild(iframe);
        } else {
          iframe.style.display = 'block';
        }
      } else if (iframe) {
        iframe.style.display = 'none';
      }
    });

    // 5. Listen for messages FROM the iframe (e.g. "close me")
    window.addEventListener('message', (event) => {
      if (event.origin !== BASE_URL) return; // security: only trust your own domain
      if (event.data?.type === 'yourbot:close') {
        isOpen = false;
        if (iframe) iframe.style.display = 'none';
      }
    });
  }
})();