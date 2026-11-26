/* ================= js/components/auth.js — Looma Auth ================= */
'use strict';
window.App = window.App || {};

App.auth = (() => {
  const $ = id => document.getElementById(id);
  let mode = 'signup';
  let avatarData = null;

  function hideSplash() {
    const sp = $('loomaSplash');
    if (sp) sp.classList.add('hide');
  }

  function ensureOverlay() {
    let ov = $('authOverlay');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'authOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 20%, #1a1e2e 0%, #0d0f17 100%);padding:16px;';
    ov.innerHTML = `
      <div style="width:100%;max-width:400px;background:#161926;border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:32px 28px;box-shadow:0 24px 64px rgba(0,0,0,.6);text-align:center;color:#fff;font-family:inherit;">
        <div id="authAvPick" title="Выбрать аватарку" style="width:72px;height:72px;margin:0 auto 14px;border-radius:22px;background:linear-gradient(135deg,#00e676,#448aff);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;cursor:pointer;overflow:hidden;box-shadow:0 8px 24px rgba(68,138,255,.3);">L</div>
        <input id="authAvFile" type="file" accept="image/*" style="display:none">
        <h2 id="authTitle" style="margin:0 0 6px;font-size:22px;font-weight:700;">Регистрация в Looma</h2>
        <p id="authSub" style="margin:0 0 20px;font-size:13px;color:rgba(255,255,255,.5);">Нажмите на иконку выше, чтобы выбрать аватарку</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;background:#0f111a;padding:4px;border-radius:12px;margin-bottom:16px;">
          <button id="tabSignup" type="button" style="border:none;border-radius:9px;padding:9px;font-weight:600;cursor:pointer;background:#6c47ff;color:#fff;">Регистрация</button>
          <button id="tabLogin" type="button" style="border:none;border-radius:9px;padding:9px;font-weight:600;cursor:pointer;background:transparent;color:rgba(255,255,255,.6);">Вход</button>
        </div>
        <form id="authForm" style="display:flex;flex-direction:column;gap:11px;">
          <input id="authName" type="text" placeholder="Ваше имя (например, Иван)" style="width:100%;box-sizing:border-box;background:#0f111a;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px 14px;color:#fff;font-size:14px;outline:none;">
          <input id="authUser" type="text" placeholder="@username (например, @ivan)" style="width:100%;box-sizing:border-box;background:#0f111a;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px 14px;color:#fff;font-size:14px;outline:none;">
          <input id="authContact" type="text" placeholder="Почта или телефон" style="width:100%;box-sizing:border-box;background:#0f111a;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px 14px;color:#fff;font-size:14px;outline:none;">
          <input id="authPass" type="password" placeholder="Пароль (от 4 символов)" style="width:100%;box-sizing:border-box;background:#0f111a;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px 14px;color:#fff;font-size:14px;outline:none;">
          <div id="authErr" style="min-height:18px;font-size:13px;color:#ff5252;"></div>
          <button id="authSubmit" type="submit" style="border:none;border-radius:14px;padding:14px;font-size:15px;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(90deg,#6c47ff,#00d2ff);box-shadow:0 8px 20px rgba(108,71,255,.35);">Создать аккаунт</button>
        </form>
      </div>
    `;
    document.body.appendChild(ov);

    $('authAvPick').onclick = () => $('authAvFile').click();
    $('authAvFile').onchange = e => {
      const f = e.target.files && e.target.files;
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        avatarData = r.result;
        $('authAvPick').innerHTML = `<img src="${avatarData}" style="width:100%;height:100%;object-fit:cover;">`;
      };
      r.readAsDataURL(f);
    };

    $('tabSignup').onclick = () => setMode('signup');
    $('tabLogin').onclick = () => setMode('login');

    $('authForm').onsubmit = async e => {
      e.preventDefault();
      const errEl = $('authErr');
      const btn = $('authSubmit');
      errEl.textContent = '';
      btn.disabled = true;
      const oldTxt = btn.textContent;
      btn.textContent = 'Подключение...';

      try {
        if (mode === 'signup') {
          await App.api.signup({
            name: $('authName').value,
            username: $('authUser').value,
            contact: $('authContact').value,
            password: $('authPass').value,
            avatar: avatarData
          });
        } else {
          await App.api.login($('authUser').value, $('authPass').value);
        }
        hide();
        await App.boot();
      } catch (err) {
        errEl.textContent = (err && err.message) ? err.message : 'Ошибка подключения к серверу';
      } finally {
        btn.disabled = false;
        btn.textContent = oldTxt;
      }
    };

    return ov;
  }

  function setMode(m) {
    mode = m;
    $('authErr').textContent = '';
    if (m === 'signup') {
      $('authTitle').textContent = 'Регистрация в Looma';
      $('authSub').style.display = 'block';
      $('authName').style.display = 'block';
      $('authContact').style.display = 'block';
      $('authUser').placeholder = '@username (например, @ivan)';
      $('authSubmit').textContent = 'Создать аккаунт';
      $('tabSignup').style.background = '#6c47ff';
      $('tabSignup').style.color = '#fff';
      $('tabLogin').style.background = 'transparent';
      $('tabLogin').style.color = 'rgba(255,255,255,.6)';
    } else {
      $('authTitle').textContent = 'Вход в Looma';
      $('authSub').style.display = 'none';
      $('authName').style.display = 'none';
      $('authContact').style.display = 'none';
      $('authUser').placeholder = '@username, почта или телефон';
      $('authSubmit').textContent = 'Войти';
      $('tabLogin').style.background = '#6c47ff';
      $('tabLogin').style.color = '#fff';
      $('tabSignup').style.background = 'transparent';
      $('tabSignup').style.color = 'rgba(255,255,255,.6)';
    }
  }

  function show(msg) {
    hideSplash();
    const ov = ensureOverlay();
    ov.style.display = 'flex';
    if (msg && $('authErr')) $('authErr').textContent = msg;
  }

  function hide() {
    hideSplash();
    const ov = $('authOverlay');
    if (ov) ov.style.display = 'none';
  }

  return { show, hide, setMode };
})();
