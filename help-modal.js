document.addEventListener('DOMContentLoaded', () => {
  const modal = document.createElement('div');
  modal.id = 'help-modal-overlay';
  Object.assign(modal.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  });

  const box = document.createElement('div');
  Object.assign(box.style, {
    background: '#fff',
    color: '#000',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '500px',
    textAlign: 'center',
  });

  const text = document.createElement('p');
  text.id = 'help-modal-text';
  text.style.marginBottom = '20px';
  box.appendChild(text);

  const close = document.createElement('button');
  close.textContent = 'Cerrar';
  close.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  box.appendChild(close);

  modal.appendChild(box);
  document.body.appendChild(modal);

  document.querySelectorAll('.help-button').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      text.textContent = btn.dataset.help || 'Sin información.';
      modal.style.display = 'flex';
    });
  });
});
