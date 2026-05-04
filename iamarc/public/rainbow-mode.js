(function () {
  const RAINBOW_KEY = 'olap_rainbow_mode';
  if (localStorage.getItem(RAINBOW_KEY) !== '1') return;

  if (document.documentElement.dataset.rainbowInjected === '1') return;
  document.documentElement.dataset.rainbowInjected = '1';

  const style = document.createElement('style');
  style.id = 'olap-rainbow-style';
  style.textContent = `
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
  document.head.appendChild(style);
})();
