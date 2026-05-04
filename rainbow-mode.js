(function () {
  const RAINBOW_KEY = 'olap_rainbow_mode';
  const mode = localStorage.getItem(RAINBOW_KEY);
  if (mode !== '1' && mode !== '2') return;

  if (document.documentElement.dataset.rainbowInjected === '1') return;
  document.documentElement.dataset.rainbowInjected = '1';

  const style = document.createElement('style');
  style.id = 'olap-rainbow-style';

  const classicModeCss = `
    @keyframes olapRainbowShift {
      0% { filter: hue-rotate(0deg); }
      100% { filter: hue-rotate(360deg); }
    }

    html, body {
      background: linear-gradient(120deg, #ff0000, #ff7f00, #ffff00, #00ff00, #00b7ff, #4b00ff, #8f00ff, #ff0000) !important;
      background-size: 300% 300% !important;
      animation: olapRainbowBg 7s linear infinite !important;
    }

    @keyframes olapRainbowBg {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    body *, body *::before, body *::after {
      animation: olapRainbowShift 2.4s linear infinite !important;
      border-color: currentColor !important;
    }

    canvas, img, video {
      animation: olapRainbowShift 2s linear infinite !important;
    }
  `;

  const ultraModeCss = `
    @keyframes olapRainbowFlow {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes olapRainbowShift {
      0% { filter: hue-rotate(0deg); }
      100% { filter: hue-rotate(360deg); }
    }
    html, body {
      background-image:
        radial-gradient(circle at 20% 15%, rgba(255,255,255,.48) 0%, rgba(255,255,255,0) 32%),
        radial-gradient(circle at 78% 10%, rgba(255,255,255,.3) 0%, rgba(255,255,255,0) 28%),
        linear-gradient(135deg, #ff2f2f 0%, #ff8f00 16%, #faff00 32%, #00d84a 48%, #10d7ff 64%, #3d45ff 80%, #d000ff 100%);
      background-size: 220% 220%, 230% 230%, 260% 260% !important;
      animation: olapRainbowFlow 9s ease-in-out infinite !important;
    }
    body * {
      background-image: linear-gradient(120deg, rgba(255,0,0,.75), rgba(255,150,0,.75), rgba(255,255,0,.72), rgba(0,255,65,.72), rgba(0,195,255,.75), rgba(75,0,255,.72), rgba(255,0,255,.75)) !important;
      background-size: 260% 260% !important;
      animation: olapRainbowFlow 4s linear infinite, olapRainbowShift 5s linear infinite !important;
      color: #fff !important;
      text-shadow: 0 0 7px rgba(0,0,0,.4) !important;
      border-color: rgba(255,255,255,.9) !important;
    }
    canvas, img, video {
      filter: saturate(1.25) contrast(1.08);
      animation: olapRainbowShift 2.5s linear infinite !important;
    }
    .olap-rainbow-flag {
      position: fixed;
      top: -120px;
      left: 0;
      width: 54px;
      height: 36px;
      pointer-events: none;
      z-index: 999999;
      background: repeating-linear-gradient(to bottom,#e40303 0px,#e40303 6px,#ff8c00 6px,#ff8c00 12px,#ffed00 12px,#ffed00 18px,#008026 18px,#008026 24px,#004dff 24px,#004dff 30px,#750787 30px,#750787 36px);
      border-radius: 3px;
      box-shadow: 0 3px 8px rgba(0,0,0,.35);
      transform-origin: top left;
      animation: olapFlagWave .85s ease-in-out infinite alternate;
    }
    .olap-rainbow-flag::before {
      content: '';
      position: absolute;
      left: -5px;
      top: -2px;
      width: 4px;
      height: 44px;
      background: rgba(245,245,245,.95);
      border-radius: 3px;
    }
    @keyframes olapFlagWave {
      from { transform: rotate(-4deg) skewY(-2deg); }
      to { transform: rotate(4deg) skewY(2deg); }
    }
  `;

  style.textContent = mode === '2' ? ultraModeCss : classicModeCss;
  document.head.appendChild(style);

  if (mode === '2') {
    const spawnFlag = () => {
      const flag = document.createElement('span');
      flag.className = 'olap-rainbow-flag';
      flag.style.left = `${Math.random() * Math.max(120, window.innerWidth - 80)}px`;
      const duration = 3500 + Math.random() * 3200;
      flag.style.transition = `transform ${duration}ms linear, top ${duration}ms linear, opacity ${duration}ms linear`;
      document.body.appendChild(flag);
      requestAnimationFrame(() => {
        flag.style.top = `${window.innerHeight + 140}px`;
        flag.style.transform = `translateX(${(Math.random() - 0.5) * 140}px) rotate(${(Math.random() - 0.5) * 32}deg)`;
        flag.style.opacity = '0.95';
      });
      setTimeout(() => flag.remove(), duration + 120);
    };
    for (let i = 0; i < 12; i += 1) setTimeout(spawnFlag, i * 180);
    setInterval(spawnFlag, 420);
  }
})();
