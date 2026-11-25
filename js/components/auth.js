'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.auth = (() => {
  let isRegister = true;
  let regAvatar = null;

  function compressImg(file, cb) {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 220 / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function hide() {
    const box = document.getElementById('loomaAuthScreen');
    if (box) box.remove();
  }

  function show(noticeMsg) {
    hide();
    const wrap = document.createElement('div');
    wrap.id = 'loomaAuthScreen';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0c0e14;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Segoe UI,system-ui,sans-serif;color:#f1f5f9;';

    wrap.innerHTML =
      '<div style="width:100%;max-width:400px;background:#161b26;border:1px solid rgba(255,255,255,0.1);border-radius:22px;padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,0.85);">' +
        '<div style="display:flex;flex-direction:column;align-items:center;margin-bottom:20px;">' +
          '<div id="authAvaCircle" title="Нажмите, чтобы загрузить аватарку" style="width:74px;height:74px;border-radius:22px;background:linear-gradient(135deg,#00e676,#7c4dff);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 28px rgba(124,77,255,0.45);cursor:pointer;background-size:cover;background-position:center;margin-bottom:12px;">' +
            '<svg id="authLogoSvg" width="38" height="38" viewBox="0 0 24 24" fill="none"><path d="M7 4v14h11" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</div>' +
          '<input type="file" id="authAvaInput" accept="image/*" style="display:none">' +
          '<h1 id="authHeading" style="font-size:22px;font-weight:800;margin:0;color:#fff;">Регистрация в Looma</h1>' +
          '<p id="authSub" style="font-size:13px;color:#8b95a5;margin:6px 0 0;text-align:center;">Создайте аккаунт один раз, чтобы общаться с друзьями</p>' +
        '</div>' +

        '<div style="display:flex;background:#0c0e14;padding:4px;border-radius:12px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.06);">' +
          '<button type="button" id="tabRegBtn" style="flex:1;padding:9px;border:none;border-radius:9px;font-weight:700;font-size:13px;cursor:pointer;background:#7c4dff;color:#fff;">Регистрация</button>' +
          '<button type="button" id="tabLogBtn" style="flex:1;padding:9px;border:none;border-radius:9px;font-weight:700;font-size:13px;cursor:pointer;background:transparent;color:#8b95a5;">Вход</button>' +
        '</div>' +

        '<form id="loomaAuthForm" style="display:flex;flex-direction:column;gap:11px;">' +
          '<div id="regOnlyFields" style="display:flex;flex-direction:column;gap:11px;">' +
            '<input id="authNameInp" type="text" placeholder="Ваше имя / Никнейм" maxlength="36" style="padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:#0c0e14;color:#fff;font-size:14px;outline:none;">' +
            '<input id="authUserInp" type="text" placeholder="@username (уникальный тег)" maxlength="28" style="padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:#0c0e14;color:#fff;font-size:14px;outline:none;">' +
          '</div>' +
          '<input id="authContactInp" type="text" placeholder="Номер телефона (+7...) или почта" required style="padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:#0c0e14;color:#fff;font-size:14px;outline:none;">' +
          '<input id="authPassInp" type="password" placeholder="Пароль" required style="padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:#0c0e14;color:#fff;font-size:14px;outline:none;">' +
          '<div id="authErrBox" style="color:#ff5252;font-size:13px;font-weight:600;text-align:center;min-height:18px;">' + (noticeMsg || '') + '</div>' +
          '<button type="submit" id="authGoBtn" style="padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#7c4dff,#00e5ff);color:#0b0d10;font-weight:800;font-size:15px;cursor:pointer;margin-top:2px;">Создать аккаунт</button>' +
        '</form>' +
      '</div>';

    document.body.appendChild(wrap);

    const avaCircle = document.getElementById('authAvaCircle');
    const avaInput = document.getElementById('authAvaInput');
    const logoSvg = document.getElementById('authLogoSvg');
    const contactInp = document.getElementById('authContactInp');
    const errBox = document.getElementById('authErrBox');

    avaCircle.onclick = () => { if (isRegister) avaInput.click(); };
    avaInput.onchange = e => {
      const f = e.target.files.item(0);
      if (!f) return;
      compressImg(f, url => {
        regAvatar = url;
        avaCircle.style.backgroundImage = 'url(' + url + ')';
        if (logoSvg) logoSvg.style.display = 'none';
      });
    };

    contactInp.addEventListener('input', () => {
      const v = contactInp.value;
      if (/^[789]\d+$/.test(v)) {
        contactInp.value = '+' + (v.startsWith('8') ? '7' + v.slice(1) : v);
      }
    });

    function switchMode(reg) {
      isRegister = reg;
      errBox.textContent = '';
      document.getElementById('regOnlyFields').style.display = reg ? 'flex' : 'none';
      document.getElementById('authHeading').textContent = reg ? 'Регистрация в Looma' : 'Вход в Looma';
      document.getElementById('authSub').textContent = reg
        ? 'Нажмите на иконку выше, чтобы выбрать аватарку'
        : 'Войдите по телефону, почте или @username';
      contactInp.placeholder = reg ? 'Номер телефона (+7...) или почта' : 'Телефон, почта или @username';
      document.getElementById('authGoBtn').textContent = reg ? 'Создать аккаунт' : 'Войти в Looma';
      document.getElementById('tabRegBtn').style.background = reg ? '#7c4dff' : 'transparent';
      document.getElementById('tabRegBtn').style.color = reg ? '#fff' : '#8b95a5';
      document.getElementById('tabLogBtn').style.background = !reg ? '#7c4dff' : 'transparent';
      document.getElementById('tabLogBtn').style.color = !reg ? '#fff' : '#8b95a5';
    }

    document.getElementById('tabRegBtn').onclick = () => switchMode(true);
    document.getElementById('tabLogBtn').onclick = () => switchMode(false);

    document.getElementById('loomaAuthForm').onsubmit = async e => {
      e.preventDefault();
      const btn = document.getElementById('authGoBtn');
      errBox.textContent = '';
      btn.disabled = true;
      btn.textContent = isRegister ? 'Создание аккаунта...' : 'Вход...';

      try {
        let res;
        if (isRegister) {
          res = await App.api.signup({
            name: document.getElementById('authNameInp').value,
            username: document.getElementById('authUserInp').value,
            contact: contactInp.value,
            password: document.getElementById('authPassInp').value,
            avatar: regAvatar
          });
        } else {
          res = await App.api.login(contactInp.value, document.getElementById('authPassInp').value);
        }

        if (res && res.user) {
          try {
            localStorage.setItem('looma_profile_ext', JSON.stringify({
              username: '@' + res.user.username,
              bio: res.user.bio || '',
              avatar: res.user.avatar || null
            }));
            const rawStore = JSON.parse(localStorage.getItem('tg_state') || '{}');
            rawStore.settings = Object.assign({}, rawStore.settings, { profileName: res.user.name });
            localStorage.setItem('tg_state', JSON.stringify(rawStore));
          } catch (err) {}
          location.reload();
        }
      } catch (err) {
        errBox.textContent = err.message || 'Ошибка входа';
        btn.disabled = false;
        btn.textContent = isRegister ? 'Создать аккаунт' : 'Войти в Looma';
      }
    };
  }

  // Если токен пустой — сразу показываем экран регистрации/входа при открытии сайта
  if (!App.api || !App.api.token) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => show());
    } else {
      show();
    }
  }

  const apiObj = { show, hide };
  App.auth = apiObj;
  return apiObj;
})();
