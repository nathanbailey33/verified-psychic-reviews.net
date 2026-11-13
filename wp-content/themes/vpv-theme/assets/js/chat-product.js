(() => {
  const app = document.getElementById('vpc-app');
  if (!app) return;
  const api = app.dataset.api.replace(/\/$/, '');
  const form = document.getElementById('vpc-form');
  const input = document.getElementById('vpc-input');
  const model = document.getElementById('vpc-model');
  const thread = document.getElementById('vpc-thread');
  const welcome = document.getElementById('vpc-welcome');
  const send = document.getElementById('vpc-send');
  const hint = document.getElementById('vpc-key-hint');
  const guides = {
    reflector: 'You are The Reflector, a warm and grounded AI companion. Help the user explore their own values and options. Ask one useful question at a time. Never claim certainty about the future or replace professional advice.',
    tarot: 'You are Tarot Journal, a reflective AI writing companion. Offer symbolic, tarot-inspired questions for self-reflection, never predictions or claims of supernatural certainty. Keep the user in charge of their choices.',
    storyteller: 'You are The Storyteller, an imaginative and kind AI companion. Help the user explore a situation through gentle metaphors or alternate perspectives. Clearly distinguish imagination from facts and avoid predictions.'
  };
  let guide = 'reflector';
  let history = [];
  let clockStarted = false;
  let activeSeconds = 0;
  let offerShown = false;
  let activeTimer = null;

  const startClock = () => { clockStarted = true; };
  const onVisible = () => {
    if (!clockStarted || offerShown || activeTimer || document.hidden) return;
    activeTimer = window.setInterval(() => {
      if (document.hidden) return;
      activeSeconds += 1;
      if (activeSeconds >= 25) { window.clearInterval(activeTimer); activeTimer = null; showOffer(); }
    }, 1000);
  };
  const resetClock = () => {
    clockStarted = false; activeSeconds = 0; offerShown = false;
    if (activeTimer) window.clearInterval(activeTimer);
    activeTimer = null;
    document.querySelector('.vpc-human-offer')?.remove();
  };
  function showOffer() {
    if (offerShown) return;
    offerShown = true;
    const card = document.createElement('aside');
    card.className = 'vpc-human-offer';
    card.setAttribute('aria-label', 'AskNebula offer');
    card.innerHTML = '<button class="vpc-offer-close" type="button" aria-label="Dismiss">×</button><strong>Want to talk with a person?</strong><p>AskNebula says new users may receive free minutes for a first text chat with an advisor.</p><small>Offer amount, eligibility and advisor availability can vary. This partner link may earn us a commission.</small><a href="/go/" rel="nofollow sponsored">Explore AskNebula</a>';
    card.querySelector('button').addEventListener('click', () => card.remove());
    document.body.append(card);
    card.querySelector('button').focus({ preventScroll: true });
  }
  const addMessage = (role, text, error = false) => {
    const row = document.createElement('article');
    row.className = `vpc-message ${role}`;
    const avatar = document.createElement('span');
    avatar.className = 'vpc-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = role === 'user' ? '·' : '✦';
    const bubble = document.createElement('div');
    bubble.className = `vpc-bubble${error ? ' vpc-error' : ''}`;
    bubble.textContent = text;
    if (role === 'user') row.append(bubble, avatar); else row.append(avatar, bubble);
    thread.append(row);
    thread.scrollTop = thread.scrollHeight;
    return bubble;
  };
  const prepareThread = () => { welcome.hidden = true; thread.hidden = false; };
  const submitPrompt = (text) => {
    input.value = text;
    startClock();
    form.requestSubmit();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && activeTimer) { window.clearInterval(activeTimer); activeTimer = null; }
    else onVisible();
  });
  input.addEventListener('focus', () => { startClock(); onVisible(); });
  input.addEventListener('input', () => { startClock(); onVisible(); input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 155)}px`; });
  app.querySelectorAll('[data-guide]').forEach((button) => button.addEventListener('click', () => {
    startClock(); onVisible(); guide = button.dataset.guide;
    app.querySelectorAll('[data-guide]').forEach((item) => item.classList.toggle('is-selected', item === button));
  }));
  app.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => submitPrompt(button.dataset.prompt)));
  document.getElementById('vpc-new-chat').addEventListener('click', () => {
    history = []; thread.replaceChildren(); thread.hidden = true; welcome.hidden = false; input.value = ''; hint.textContent = ''; resetClock(); input.focus();
  });
  onVisible();

  fetch(`${api}/api/models`, { headers: { Accept: 'application/json' } })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('Model list unavailable')))
    .then((data) => {
      for (const item of (data.models || [])) {
        if (!item.id || item.id === 'openrouter/free') continue;
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name || item.id;
        model.append(option);
      }
    })
    .catch(() => { hint.textContent = 'Free model list is temporarily unavailable.'; });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || send.disabled) return;
    startClock(); onVisible(); prepareThread();
    history.push({ role: 'user', content: message });
    addMessage('user', message);
    input.value = ''; input.style.height = 'auto'; send.disabled = true; hint.textContent = 'Thinking…';
    const pending = addMessage('assistant', '');
    try {
      const response = await fetch(`${api}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ model: model.value, guide, messages: history.slice(-12) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The chat service is unavailable. Please try again in a little while.');
      const answer = String(data.reply || '').trim();
      if (!answer) throw new Error('No reply received. Please try again.');
      pending.textContent = answer;
      history.push({ role: 'assistant', content: answer });
      hint.textContent = data.model ? `Reply from ${data.model}` : '';
    } catch (error) {
      pending.textContent = error.message || 'The chat service is unavailable. Please try again.';
      pending.classList.add('vpc-error');
      history.pop();
      hint.textContent = 'Your message was not saved.';
    } finally {
      send.disabled = false; thread.scrollTop = thread.scrollHeight; input.focus();
    }
  });
})();
