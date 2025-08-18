(function() {
  if (document.getElementById('controlsGraphic')) return;
  document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('touch-controls')) return;
    const container = document.createElement('div');
    container.id = 'touch-controls';
    container.innerHTML = `
      <div class="tc-left-controls">
        <button class="tc-btn tc-left">←</button>
        <button class="tc-btn tc-right">→</button>
      </div>
      <div class="tc-right-controls">
        <button class="tc-btn tc-jump">↑</button>
      </div>
    `;
    document.body.appendChild(container);
    const map = {
      'tc-left': 'ArrowLeft',
      'tc-right': 'ArrowRight',
      'tc-jump': 'ArrowUp'
    };
    Object.keys(map).forEach(cls => {
      const btn = container.querySelector('.' + cls);
      const key = map[cls];
      ['touchstart','mousedown'].forEach(evt => {
        btn.addEventListener(evt, e => {
          e.preventDefault();
          document.dispatchEvent(new KeyboardEvent('keydown', {key}));
        });
      });
      ['touchend','mouseup','mouseleave'].forEach(evt => {
        btn.addEventListener(evt, e => {
          e.preventDefault();
          document.dispatchEvent(new KeyboardEvent('keyup', {key}));
        });
      });
    });
  });
})();
