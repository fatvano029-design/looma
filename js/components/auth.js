/* ================= components/auth.js — Looma 100% Cloud Auth ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.auth = (() => {
  const FS_PROJECT = 'projects/looma-14497/databases/(default)/documents';
  const FS_DOC_BASE = FS_PROJECT + '/looma_v2';
  const FS_QUERY = 'https://googleapis.com' + FS_PROJECT + ':runQuery';
  const FS_COMMIT = 'https://googleapis.com' + FS_PROJECT + ':commit';
  const COLORS = ['#7c4dff', '#00e5ff', '#00e676', '#ff5252', '#ffd740', '#e040fb', '#448aff'];
  const getColor = s => COLORS[Math.abs(String(s).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length];

  let isRegister = true;
  let regAvatar = null;

  function normPhone(p) {
    let digits = String(p || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 11 && digits.startsWith('8')) digits = '7' + digits.slice(1);
    return '+' + digits;
  }

  async function fetchCloudUsers() {
    const res = await fetch(FS_QUERY, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'looma_v2' }],
          limit: 500
        }
      })
    });
    if (!res.ok) throw new Error('Ошибка облака: ' + res.status);
    const rows = await res.json();
    const users = [];
    (rows || []).forEach(r => {
      if (!r.document || !r.document.name) return;
      const id = decodeURIComponent(r.document.name.split('/').pop());
      if (!id.startsWith('user__')) return;
      const raw = r.document.fields && r.document.fields.v && r.document.fields.v.stringValue;
      if (raw) { try { users.push(JSON.parse(raw)); } catch (e) {} }
    });
    return users;
  }

  async function saveCloudUser(userObj, createSavedChat) {
    const writes = [{
      update: {
        name: FS_DOC_BASE + '/user__' + userObj.id,
        fields: { v: { stringValue: JSON.stringify(userObj) } }
      }
    }];
    if (createSavedChat) {
      writes.push({
        update: {
          name: FS_DOC_BASE + '/chat__c_saved_' + userObj.id,
          fields: {
            v: {
              stringValue: JSON.stringify({
                id: 'c_saved_' + userObj.id,
                type: 'group',
                name: 'Избранное',
                members: [userObj.id],
                userState: { [userObj.id]: { pinned: true, muted: false, lastRead: Date.now() } }
              })
            }
          }
        }
      });
    }
    const res = await fetch(FS_COMMIT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ writes })
    });
    if (!res.ok) throw new Error('Ошибка записи в облако: ' + res.status);
  }

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
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0c0e14;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Segoe UI,system-ui,sans-serif;color:#f1f5f9;animation:loomaFadeIn .3s ease;';

    wrap.innerHTML =
      '<div style="width:100%;max-width:400px;background:#161b26;border:1px solid rgba(255,255,255,0.1);border-radius:22px;padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,0.85);animation:loomaCardPop .35s cubic-bezier(.22,1,.36,1);">' +
        '<div style="display:flex;flex-direction:column;align-items:center;margin-bottom:20px;">' +
          '<div id="authAvaCircle" title="Нажмите, чтобы загрузить аватарку" style="width:74px;height:74px;border-radius:22px;background:linear-gradient(135deg,#00e676,#7c4dff);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 28px rgba(124,77,255,0.45);cursor:pointer;background-size:cover;background-position:center;margin-bottom:12px;">' +
            '<svg id="authLogoSvg" width="38" height="38" viewBox="0 0 24 24" fill="none"><path d="M7 4v14h11" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</div>' +
          '<input type="file" id="authAvaInput" accept="image/*" style="display:none">' +
          '<h1 id="authHeading" style="font-size:22px;font-weight:800;margin:0;color:#fff;">Регистрация в Looma</h1>' +
          '<p id="authSub" style="font-size:13px;color:#8b95a5;margin:6px 0 0;text-align:center;">Нажмите на иконку выше, чтобы выбрать аватарку</p>' +
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
      if (/^\d+$/.test(v)) {
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
      btn.textContent = isRegister ? 'Сохранение в облако...' : 'Подключение...';

      try {
        const users = await fetchCloudUsers();
        const contactRaw = contactInp.value.trim();
        const password = document.getElementById('authPassInp').value.trim();
let activeUser = null;
if (isRegister) {
const name = document.getElementById('authNameInp').value.trim();
const username = document.getElementById('authUserInp').value.trim().replace(/^@+/, '').toLowerCase();
if (!name) throw new Error('Введите ваше имя или ник');
if (!username || username.length < 3) throw new Error('Придумайте @username (от 3 символов)');
if (!contactRaw) throw new Error('Укажите номер телефона или почту');
if (!password || password.length < 4) throw new Error('Пароль должен быть от 4 символов');
const isEmail = contactRaw.includes('@');
const email = isEmail ? contactRaw.toLowerCase() : '';
const phone = !isEmail ? normPhone(contactRaw) : '';
if (!email && (!phone || phone.length < 8)) throw new Error('Введите корректный телефон или почту');
if (users.some(u => u.username === username)) throw new Error('Этот @username уже занят');
if (email && users.some(u => u.email === email)) throw new Error('Эта почта уже зарегистрирована');
if (phone && users.some(u => u.phone === phone)) throw new Error('Этот номер телефона уже зарегистрирован');
const isOwner = username === 'loomaadmin' || email === 'fatvano029@gmail.com';
activeUser = {
id: isOwner ? 'admin_looma' : ('u_' + Date.now() + '_' + Math.floor(Math.random() * 999)),
username,
name,
email,
phone,
password,
bio: '',
avatar: regAvatar,
initials: name.slice(0, 2).toUpperCase(),
color: isOwner ? '#ffd740' : getColor(username),
isAdmin: isOwner,
lastSeen: Date.now()
};
await saveCloudUser(activeUser, true);
} else {
const qLower = contactRaw.replace(/^@+/, '').toLowerCase();
const qPhone = normPhone(contactRaw);
activeUser = users.find(u =>
u.password === password && (
u.username === qLower ||
(u.email && u.email === qLower) ||
(u.phone && qPhone && u.phone === qPhone)
)
);
if (!activeUser) throw new Error('Аккаунт не найден в облаке или неверный пароль');
activeUser.lastSeen = Date.now();
await saveCloudUser(activeUser, false);
}
localStorage.setItem('tg_token', activeUser.id);
localStorage.setItem('looma_profile_ext', JSON.stringify({
username: '@' + activeUser.username,
bio: activeUser.bio || '',
avatar: activeUser.avatar || null
}));
const rawStore = JSON.parse(localStorage.getItem('tg_state') || '{}');
rawStore.settings = Object.assign({}, rawStore.settings, { profileName: activeUser.name });
localStorage.setItem('tg_state', JSON.stringify(rawStore));
location.reload();
} catch (err) {
errBox.textContent = err.message || 'Ошибка соединения с облаком';
btn.disabled = false;
btn.textContent = isRegister ? 'Создать аккаунт' : 'Войти в Looma';
}
};
}
let hasToken = false;
try { hasToken = !!localStorage.getItem('tg_token'); } catch (e) {}
if (!hasToken) {
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
