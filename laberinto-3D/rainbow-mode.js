(function () {
  const RAINBOW_KEY = 'olap_rainbow_mode';
  const mode = localStorage.getItem(RAINBOW_KEY);
  if (mode !== '1' && mode !== '2') return;

  if (document.documentElement.dataset.rainbowInjected === '1') return;
  document.documentElement.dataset.rainbowInjected = '1';

  const style = document.createElement('style');
  style.id = 'olap-rainbow-style';
  style.textContent = `
    @keyframes olapRainbowShift {
      0% { filter: hue-rotate(0deg); }
      100% { filter: hue-rotate(360deg); }
    }

    @keyframes olapRainbowBg {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    html, body {
      background: linear-gradient(120deg, #ff0000, #ff7f00, #ffff00, #00ff00, #00b7ff, #4b00ff, #8f00ff, #ff0000) !important;
      background-size: 300% 300% !important;
      animation: olapRainbowBg 7s linear infinite !important;
    }

    body *, body *::before, body *::after {
      animation: olapRainbowShift 2.4s linear infinite !important;
      border-color: currentColor !important;
    }

    canvas, img, video {
      animation: olapRainbowShift 2s linear infinite !important;
    }

    .olap-rainbow-flag,
    .olap-rainbow-flag::before {
      animation: none !important;
      filter: none !important;
      background-blend-mode: normal !important;
    }

    .olap-rainbow-flag {
      position: fixed;
      top: -120px;
      left: 0;
      width: 96px;
      height: 64px;
      pointer-events: none;
      z-index: 999999;
      transform-origin: left center;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 180'%3E%3Cdefs%3E%3CclipPath id='f'%3E%3Cpath d='M18 16 C90 0 200 8 286 20 C276 46 286 74 286 102 C208 98 96 112 20 132 C22 108 14 78 16 46 Z'/%3E%3C/clipPath%3E%3C/defs%3E%3Cg clip-path='url(%23f)'%3E%3Crect width='300' height='30' y='0' fill='%23e40303'/%3E%3Crect width='300' height='30' y='30' fill='%23ff8c00'/%3E%3Crect width='300' height='30' y='60' fill='%23ffed00'/%3E%3Crect width='300' height='30' y='90' fill='%23008026'/%3E%3Crect width='300' height='30' y='120' fill='%23004dff'/%3E%3Crect width='300' height='30' y='150' fill='%23750787'/%3E%3C/g%3E%3C/svg%3E");
      background-size: 100% 100%;
      background-repeat: no-repeat;
      filter: drop-shadow(0 3px 5px rgba(0,0,0,.35));
    }

    .olap-rainbow-flag::before {
      content: '';
      position: absolute;
      left: -5px;
      top: 6px;
      width: 5px;
      height: 56px;
      border-radius: 5px;
      background: #f2f2f2 !important;
      box-shadow: 0 0 1px rgba(0,0,0,.5) inset;
    }
  `;
  document.head.appendChild(style);

  if (mode === '2') {
    const spawnFlag = () => {
      const flag = document.createElement('span');
      flag.className = 'olap-rainbow-flag';
      flag.style.left = `${Math.random() * Math.max(120, window.innerWidth - 120)}px`;
      const duration = 4000 + Math.random() * 2600;
      const drift = (Math.random() - 0.5) * 170;
      flag.style.transition = `top ${duration}ms linear, left ${duration}ms ease-in-out, opacity ${duration}ms linear, transform 900ms ease-in-out`;
      document.body.appendChild(flag);

      requestAnimationFrame(() => {
        flag.style.top = `${window.innerHeight + 160}px`;
        flag.style.left = `${Math.min(window.innerWidth - 30, Math.max(0, parseFloat(flag.style.left) + drift))}px`;
      });

      let wave = 0;
      const waveInterval = setInterval(() => {
        wave += 1;
        flag.style.transform = `rotate(${Math.sin(wave / 2) * 8}deg)`;
      }, 120);

      setTimeout(() => {
        clearInterval(waveInterval);
        flag.remove();
      }, duration + 140);
    };

    for (let i = 0; i < 10; i += 1) setTimeout(spawnFlag, i * 220);
    setInterval(spawnFlag, 520);
  }
})();
