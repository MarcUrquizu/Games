// script.js

// Configuración
const API_KEY = 'AIzaSyAu05y0gFk80o0gAb9kiU5hv3WXBn10w2Q'; // ⚠️ Reemplazar
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${API_KEY}`;

// Estado
let conversation = [];
let currentSessionId = Date.now().toString();
let lastRequestTime = 0;
const RATE_LIMIT_DELAY = 1000; // 1 segundo entre peticiones

// DOM Elements
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const chatForm = document.getElementById('chat-form');
const clearChatBtn = document.getElementById('clear-chat');
const newChatBtn = document.getElementById('new-chat-btn');
const themeToggle = document.getElementById('theme-toggle');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
const historyList = document.getElementById('history-list');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  loadHistory();
  renderHistory();
});

// --- FUNCIONES PRINCIPALES ---

async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  // Rate limiting
  const now = Date.now();
  if (now - lastRequestTime < RATE_LIMIT_DELAY) {
    alert('Espera un momento antes de enviar otro mensaje.');
    return;
  }
  lastRequestTime = now;

  // Agregar mensaje del usuario
  addMessageToDOM(message, 'user');
  conversation.push({ role: 'user', parts: [{ text: message }] });
  saveConversation();
  userInput.value = '';
  userInput.style.height = 'auto';

  // Mostrar indicador de escritura
  const aiMessageEl = addMessageToDOM('', 'ai', true);
  scrollToBottom();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: conversation,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text;

    // Actualizar conversación
    conversation.push({ role: 'model', parts: [{ text: aiText }] });
    saveConversation();

    // Animación de escritura
    await typeWriter(aiText, aiMessageEl);
    highlightCodeBlocks();
    scrollToBottom();
  } catch (error) {
    console.error('API Error:', error);
    aiMessageEl.textContent = 'Lo siento, hubo un error al procesar tu solicitud. Intenta de nuevo.';
    aiMessageEl.classList.remove('typing-indicator');
  }
}

function addMessageToDOM(text, sender, isTyping = false) {
  const div = document.createElement('div');
  div.classList.add('flex', 'justify-start');
  if (sender === 'user') {
    div.classList.add('justify-end');
  }

  const messageDiv = document.createElement('div');
  if (isTyping) {
    messageDiv.classList.add('typing-indicator');
    messageDiv.innerHTML = '<span class="animate-pulse">...</span>';
  } else if (sender === 'user') {
    messageDiv.classList.add('message-user');
    messageDiv.textContent = text;
  } else {
    messageDiv.classList.add('message-ai');
    messageDiv.innerHTML = marked.parse(text); // Renderizar Markdown
  }

  div.appendChild(messageDiv);
  chatContainer.querySelector('.max-w-3xl').appendChild(div);
  return messageDiv;
}

async function typeWriter(text, element) {
  element.classList.remove('typing-indicator');
  element.innerHTML = ''; // Limpiar animación previa

  const tokens = text.split('');
  for (let i = 0; i < tokens.length; i++) {
    // Detectar bloques de código y saltar animación
    if (text.substring(i, i + 7) === '```') {
      const end = text.indexOf('```', i + 3);
      if (end !== -1) {
        element.innerHTML += marked.parse(text.substring(i, end + 3));
        i = end + 2;
        continue;
      }
    }
    element.innerHTML += tokens[i];
    await new Promise(r => setTimeout(r, 15));
  }
}

function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- HISTORIAL ---

function saveConversation() {
  const history = JSON.parse(localStorage.getItem('chatHistory') || '{}');
  history[currentSessionId] = {
    title: conversation[0]?.parts[0]?.text.substring(0, 30) + (conversation[0]?.parts[0]?.text.length > 30 ? '...' : '') || 'Nueva conversación',
    conversation
  };
  localStorage.setItem('chatHistory', JSON.stringify(history));
  renderHistory();
}

function loadHistory() {
  const saved = localStorage.getItem('chatHistory');
  if (saved) {
    const history = JSON.parse(saved);
    const ids = Object.keys(history);
    if (ids.length > 0) {
      currentSessionId = ids[0];
      conversation = history[currentSessionId].conversation || [];
      renderConversation();
    }
  }
}

function renderHistory() {
  historyList.innerHTML = '';
  const history = JSON.parse(localStorage.getItem('chatHistory') || '{}');
  Object.entries(history)
    .reverse()
    .forEach(([id, data]) => {
      const btn = document.createElement('button');
      btn.className = `w-full text-left px-3 py-2 rounded-md text-sm truncate ${id === currentSessionId ? 'bg-gray-200 dark:bg-gray-700 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`;
      btn.textContent = data.title;
      btn.onclick = () => loadSession(id);
      historyList.appendChild(btn);
    });
}

function loadSession(id) {
  const history = JSON.parse(localStorage.getItem('chatHistory') || '{}');
  if (history[id]) {
    currentSessionId = id;
    conversation = history[id].conversation || [];
    renderConversation();
    renderHistory();
  }
}

function renderConversation() {
  chatContainer.querySelector('.max-w-3xl').innerHTML = '';
  conversation.forEach(msg => {
    const sender = msg.role === 'user' ? 'user' : 'ai';
    addMessageToDOM(msg.parts[0].text, sender);
  });
  highlightCodeBlocks();
  scrollToBottom();
}

// --- EVENTOS ---

chatForm.addEventListener('submit', e => {
  e.preventDefault();
  sendMessage();
});

userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

clearChatBtn.addEventListener('click', () => {
  if (confirm('¿Borrar esta conversación?')) {
    conversation = [];
    chatContainer.querySelector('.max-w-3xl').innerHTML = '';
    const history = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    delete history[currentSessionId];
    localStorage.setItem('chatHistory', JSON.stringify(history));
    currentSessionId = Date.now().toString();
    renderHistory();
  }
});

newChatBtn.addEventListener('click', () => {
  conversation = [];
  chatContainer.querySelector('.max-w-3xl').innerHTML = '';
  currentSessionId = Date.now().toString();
  renderHistory();
});

themeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
});

mobileMenuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('-translate-x-full');
});

// --- UTILIDADES ---

function loadTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
}

function highlightCodeBlocks() {
  document.querySelectorAll('pre code').forEach(block => {
    Prism.highlightElement(block);
  });
}

// Markdown renderer ligero (usamos marked.js)
const marked = {
  parse: (str) => {
    // Escapar HTML básico
    str = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Bloques de código
    str = str.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'plaintext';
      return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    });

    // Código en línea
    str = str.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Negritas e itálicas
    str = str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    str = str.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Enlaces
    str = str.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-primary-500 hover:underline">$1</a>');

    // Párrafos
    str = str.replace(/\n/g, '<br>');

    return str;
  }
};