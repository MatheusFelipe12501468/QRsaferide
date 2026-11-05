/* =========================================================
   QR SafeRide — script da landing page
   Cole aqui a Access Key que o Web3Forms enviou para o seu e-mail
   (pegue em https://web3forms.com).
   ========================================================= */
const WEB3FORMS_KEY = 'COLE_AQUI_SUA_ACCESS_KEY';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const root = document.documentElement;

/* ---------- Tema claro / escuro ---------- */
const themeBtn = document.getElementById('theme-toggle');

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro');
  document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#0D1420' : '#F3F5F8');
}

applyTheme(root.getAttribute('data-theme') || 'dark');

themeBtn.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('sr-theme', next); } catch (e) { /* navegação privada */ }
});

/* ---------- Formulários de e-mail ---------- */
const forms = document.querySelectorAll('.signup');

function showError(form, message) {
  const input = form.querySelector('input[name="email"]');
  const error = form.querySelector('.error');
  error.textContent = message;
  error.hidden = false;
  input.setAttribute('aria-invalid', 'true');
  input.classList.remove('shake');
  void input.offsetWidth; // reinicia a animação
  input.classList.add('shake');
  input.focus();
}

function clearError(form) {
  form.querySelector('.error').hidden = true;
  form.querySelector('input[name="email"]').removeAttribute('aria-invalid');
}

function setLoading(form, loading) {
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = loading;
  btn.classList.toggle('is-loading', loading);
  btn.querySelector('.btn-text').textContent = loading ? 'Enviando…' : 'Quero acesso antecipado';
}

// Mostra a confirmação nos dois formulários, para não pedir o e-mail de novo
function showSuccessEverywhere(email) {
  forms.forEach((f) => {
    f.querySelector('.signup-fields').hidden = true;
    f.querySelector('.success-email').textContent = email;
    f.querySelector('.success').hidden = false;
  });
}

function resetAll() {
  forms.forEach((f) => {
    f.reset();
    clearError(f);
    f.querySelector('.success').hidden = true;
    f.querySelector('.signup-fields').hidden = false;
  });
}

async function sendEmail(email, origem, honeypot) {
  // Campo invisível preenchido = robô. Finge sucesso e não envia nada.
  if (honeypot) return { ok: true };

  // Sem chave configurada: simula o envio para você testar o visual
  if (WEB3FORMS_KEY.startsWith('COLE_AQUI')) {
    console.warn('[QR SafeRide] Chave do Web3Forms não configurada. O e-mail NÃO foi enviado:', email);
    await new Promise((r) => setTimeout(r, 700));
    return { ok: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: 'Novo cadastro na lista do QR SafeRide',
        from_name: 'Landing page QR SafeRide',
        email,
        origem,
      }),
      signal: controller.signal,
    });
    const data = await res.json();
    return { ok: Boolean(data.success) };
  } finally {
    clearTimeout(timer);
  }
}

forms.forEach((form) => {
  const input = form.querySelector('input[name="email"]');

  input.addEventListener('input', () => clearError(form));

  form.querySelector('.js-reset').addEventListener('click', () => {
    resetAll();
    form.querySelector('input[name="email"]').focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim().toLowerCase();

    if (!EMAIL_RE.test(email) || email.length > 254) {
      showError(form, 'Digite um e-mail válido, como nome@exemplo.com.');
      return;
    }

    clearError(form);
    setLoading(form, true);
    try {
      const data = await sendEmail(email, form.dataset.origem || '', form.querySelector('.hp').value);
      if (data && data.ok) {
        showSuccessEverywhere(email);
      } else if (data && data.error === 'invalid') {
        showError(form, 'Esse e-mail não parece válido. Confira e tente de novo.');
      } else {
        showError(form, 'Não conseguimos salvar agora. Tente de novo em alguns segundos.');
      }
    } catch (err) {
      showError(form, navigator.onLine
        ? 'Não conseguimos salvar agora. Tente de novo em alguns segundos.'
        : 'Você está sem internet. Conecte-se e tente de novo.');
    } finally {
      setLoading(form, false);
    }
  });
});
