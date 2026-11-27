/* ================= components/settings.js — Looma Isolated Telegram-Style Settings ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.settings = (() => {
  const { $, esc, icon } = App.utils;

  const ACCENTS = ['#7c4dff', '#00e5ff', '#2f80ed', '#00e676', '#ff5252', '#ff9100', '#e040fb', '#ffd740'];
  const THEME_KEY = 'looma_theme';
  const LANG_KEY = 'looma_lang';
  const PROFILE_EXT_KEY = 'looma_profile_ext';

  function injectStyles() {
    if (document.getElementById('lm-settings-css')) return;
    const st = document.createElement('style');
    st.id = 'lm-settings-css';
       st.textContent = `
      #settingsview .sbody { display: flex !important; flex-direction: column !important; gap: 14px !important; padding: 16px !important; max-width: 680px; margin: 0 auto; width: 100%; box-sizing: border-box; }
      .lm-card { display: block !important; background: var(--panel, #161926) !important; border: 1px solid var(--border, rgba(255,255,255,0.08)) !important; border-radius: 16px !important; padding: 4px 16px !important; box-sizing: border-box !important; }
      [data-theme="light"] .lm-card { background: #ffffff !important; border: 1px solid #d1d5db !important; box-shadow: 0 2px 10px rgba(0,0,0,0.04) !important; }
      [data-theme="light"] .lm-title { color: #111827 !important; }
      [data-theme="light"] .lm-sub { color: #4b5563 !important; }
      [data-theme="light"] #settingsview .shead { background: #ffffff !important; color: #111827 !important; }
      .lm-card-pad { padding: 14px 16px !important; }
      .lm-row { display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; gap: 14px !important; padding: 12px 0 !important; border-top: 1px solid var(--border, rgba(255,255,255,0.07)) !important; }
      [data-theme="light"] .lm-row { border-top-color: #e5e7eb !important; }
      .lm-row:first-child { border-top: none !important; }
      .lm-left { display: flex !important; flex-direction: row !important; align-items: center !important; gap: 12px !important; flex: 1 !important; min-width: 0 !important; }
      .lm-ico { width: 32px !important; height: 32px !important; border-radius: 8px !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 16px !important; font-weight: 800 !important; color: #fff !important; flex-shrink: 0 !important; }
      .lm-texts { display: flex !important; flex-direction: column !important; gap: 2px !important; min-width: 0 !important; }
      .lm-title { font-size: 14.5px !important; font-weight: 600 !important; color: var(--text, #fff) !important; line-height: 1.25 !important; }
      .lm-sub { font-size: 12px !important; color: var(--grey, #8e95a5) !important; line-height: 1.3 !important; }
      .lm-sw { width: 48px !important; height: 28px !important; border-radius: 999px !important; border: none !important; position: relative !important; cursor: pointer !important; flex-shrink: 0 !important; padding: 0 !important; transition: background 0.22s ease !important; }
      .lm-sw-knob { position: absolute !important; top: 3px !important; left: 3px !important; width: 22px !important; height: 22px !important; border-radius: 50% !important; background: #ffffff !important; box-shadow: 0 2px 6px rgba(0,0,0,0.35) !important; transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1) !important; display: block !important; }
      .lm-sw[data-on="1"] { background: #34c759 !important; }
      .lm-sw[data-on="0"] { background: rgba(120, 120, 128, 0.36) !important; }
      .lm-sw[data-on="1"] .lm-sw-knob { transform: translateX(20px) !important; }
      .lm-sw[data-on="0"] .lm-sw-knob { transform: translateX(0px) !important; }
    `;
    document.head.appendChild(st);
  }

  function getLang() { try { return localStorage.getItem(LANG_KEY) || 'ru'; } catch (e) { return 'ru'; } }
  function setLang(l) { try { localStorage.setItem(LANG_KEY, l); } catch (e) {} if (App.applyLang) App.applyLang(); }
  function getExt() { try { return JSON.parse(localStorage.getItem(PROFILE_EXT_KEY) || '{}'); } catch (e) { return {}; } }
  function saveExt(patch) { const next = Object.assign(getExt(), patch); try { localStorage.setItem(PROFILE_EXT_KEY, JSON.stringify(next)); } catch (e) {} return next; }

  function applyThemeMode(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch (e) {}
  }

  let savedTheme = 'dark';
  try { savedTheme = localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) {}
  applyThemeMode(savedTheme !== 'light');

  function compressAva(file, cb) {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 120 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  let isEditingProfile = false;

  function tgRow(key, bg, emoji, title, sub, on) {
    return (
      '<div class="lm-row">' +
        '<div class="lm-left">' +
          '<div class="lm-ico" style="background:' + bg + '">' + emoji + '</div>' +
          '<div class="lm-texts">' +
            '<div class="lm-title">' + esc(title) + '</div>' +
            '<div class="lm-sub">' + esc(sub) + '</div>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="lm-sw" data-k="' + key + '" data-on="' + (on ? '1' : '0') + '">' +
          '<span class="lm-sw-knob"></span>' +
        '</button>' +
      '</div>'
    );
  }
  function open() {
    injectStyles();
    try {
      if (App.store && App.store.setActive) App.store.setActive(null);
      if (App.components.chatview && App.components.chatview.stopPoll) App.components.chatview.stopPoll();
      if (App.components.chatlist && App.components.chatlist.render) App.components.chatlist.render(App.store.state.filter || '');
      if (App.components.infopanel && App.components.infopanel.close) App.components.infopanel.close();
    } catch (e) {}

    const s = (App.store && App.store.state && App.store.state.settings) || {};
    const ext = getExt();
    const en = getLang() === 'en';
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const p = $('chatpane');
    if (!p) return;
    p.classList.add('open');

    const realName = (App.me && App.me.name) ? App.me.name : (s.profileName && s.profileName !== 'Looma User' ? s.profileName : 'Пользователь');
    const realUser = (App.me && App.me.username) ? ('@' + App.me.username) : (ext.username || '@user');
    const realBio = (App.me && App.me.bio !== undefined) ? App.me.bio : (ext.bio || '');
    const realAva = (App.me && App.me.avatar) ? App.me.avatar : ext.avatar;
    const realContact = [App.me && App.me.phone, App.me && App.me.email].filter(Boolean).join(' • ');

    const avaStyle = realAva
      ? 'background-image:url(' + realAva + ');background-size:cover;background-position:center;color:transparent;'
      : 'background:linear-gradient(135deg,#00e676,#7c4dff);color:#fff;';

    const profileBlock = isEditingProfile
      ? '<div style="display:flex;flex-direction:column;gap:10px;margin-top:12px;">' +
          '<input id="profilename" value="' + esc(realName) + '" placeholder="' + (en ? 'Your name' : 'Ваше имя') + '" maxlength="40" style="padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:rgba(0,0,0,.15);color:inherit;">' +
          '<input id="profileUser" value="' + esc(realUser) + '" placeholder="@username" maxlength="32" style="padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:rgba(0,0,0,.15);color:inherit;">' +
          '<input id="profileBio" value="' + esc(realBio) + '" placeholder="' + (en ? 'Bio' : 'О себе') + '" maxlength="120" style="padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:rgba(0,0,0,.15);color:inherit;">' +
          '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
            '<button type="button" id="cancelProfileBtn" style="padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--grey);cursor:pointer;font-weight:600;">' + (en ? 'Cancel' : 'Отмена') + '</button>' +
            '<button type="button" id="saveProfileBtn" style="padding:8px 16px;border-radius:10px;border:none;background:var(--accent);color:#fff;cursor:pointer;font-weight:700;">' + (en ? 'Save' : 'Сохранить') + '</button>' +
          '</div>' +
        '</div>'
      : '<div style="flex:1;min-width:0">' +
          '<div style="font-size:16px;font-weight:700;color:var(--text);">' + esc(realName) + '</div>' +
          '<div style="font-size:13px;color:#00e5ff;font-weight:600;margin-top:2px;">' + esc(realUser) + '</div>' +
          (realContact ? '<div style="font-size:12px;color:var(--grey);margin-top:2px;">' + esc(realContact) + '</div>' : '') +
          (realBio ? '<div style="font-size:12.5px;color:var(--grey);margin-top:3px;">' + esc(realBio) + '</div>' : '') +
        '</div>' +
        '<button class="iconbtn" id="nameEdit" title="' + (en ? 'Edit profile' : 'Редактировать профиль') + '">' + icon('edit') + '</button>';

    p.innerHTML =
      '<div id="settingsview" class="open">' +
      '<div class="shead"><button class="iconbtn" id="setBack">' + icon('back') + '</button>' +
      '<h2>' + (en ? 'Looma Settings' : 'Настройки Looma') + '</h2></div>' +
      '<div class="sbody">' +
        '<div class="lm-card lm-card-pad">' +
          '<div style="display:flex;align-items:center;gap:14px;">' +
            '<div class="avatar g2 a60" id="setAvaBox" title="' + (en ? 'Click to upload photo' : 'Нажмите, чтобы сменить фото') + '" style="cursor:pointer;flex-shrink:0;' + avaStyle + '">' + App.utils.initials(realName) + '</div>' +
            '<input type="file" id="setAvaInput" accept="image/*" style="display:none">' +
            (isEditingProfile
              ? '<div style="flex:1;min-width:0"><div class="lm-title">' + (en ? 'Edit Profile' : 'Редактирование профиля') + '</div><div class="lm-sub">' + (en ? 'Update name, tag or bio' : 'Измените имя, тег или описание') + '</div></div>'
              : profileBlock) +
          '</div>' +
          (isEditingProfile ? profileBlock : '') +
        '</div>' +

        '<div style="font-size:12px;font-weight:700;letter-spacing:0.6px;color:var(--grey);padding:0 6px;text-transform:uppercase;">' + (en ? 'Preferences' : 'Основные настройки') + '</div>' +
        '<div class="lm-card">' +
          '<div class="lm-row">' +
            '<div class="lm-left">' +
              '<div class="lm-ico" style="background:#3b82f6">Аа</div>' +
              '<div class="lm-texts">' +
                '<div class="lm-title">' + (en ? 'Language' : 'Язык интерфейса') + '</div>' +
                '<div class="lm-sub">' + (en ? 'Choose Looma display language' : 'Выберите язык отображения Looma') + '</div>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;gap:6px;flex-shrink:0;">' +
              '<button type="button" class="lang-btn" data-lang="ru" style="padding:6px 11px;border-radius:9px;border:1px solid var(--border);cursor:pointer;font-weight:700;font-size:12px;background:' + (!en ? '#34c759' : 'transparent') + ';color:' + (!en ? '#fff' : 'var(--text)') + ';">Русский</button>' +
              '<button type="button" class="lang-btn" data-lang="en" style="padding:6px 11px;border-radius:9px;border:1px solid var(--border);cursor:pointer;font-weight:700;font-size:12px;background:' + (en ? '#34c759' : 'transparent') + ';color:' + (en ? '#fff' : 'var(--text)') + ';">English</button>' +
            '</div>' +
          '</div>' +
          tgRow('darkTheme', '#5856d6', '🌙', en ? 'Dark theme' : 'Тёмная тема', en ? 'Deep graphite Looma style (off — light)' : 'Глубокий графитовый стиль Looma (выкл. — светлая)', isDark) +
          tgRow('notifications', '#ff3b30', '🔔', en ? 'Notifications' : 'Уведомления', en ? 'Show unread message counters' : 'Показывать счётчики непрочитанных сообщений', s.notifications) +
          tgRow('sounds', '#ff9500', '🔊', en ? 'Message sounds' : 'Звуки сообщений', en ? 'Play sound on incoming messages' : 'Воспроизводить звук при новых сообщениях', s.sounds) +
          tgRow('enterToSend', '#00c7be', '⌨️', en ? 'Send with Enter (PC)' : 'Отправка по Enter (для ПК)', en ? 'Enter — send, Shift+Enter — new line' : 'Enter — отправить, Shift+Enter — новая строка', s.enterToSend) +
        '</div>' +

        '<div class="lm-card lm-card-pad">' +
          '<div class="lm-title" style="margin-bottom:2px;">' + (en ? 'Accent color' : 'Цвет акцента') + '</div>' +
          '<div class="lm-sub" style="margin-bottom:10px;">' + (en ? 'Applied to buttons and highlights' : 'Применяется к кнопкам, ссылкам и выделениям') + '</div>' +
          '<div class="swatchrow">' +
          ACCENTS.map(c =>
            '<div class="swatch' + (s.accent === c ? ' on' : '') + '" data-c="' + c +
            '" style="background:' + c + '" title="' + c + '"></div>').join('') +
          '</div>' +
        '</div>' +

        '<div class="lm-card">' +
          '<div class="lm-row" id="logoutRow" style="cursor:pointer;">' +
            '<div class="lm-left">' +
              '<div class="lm-ico" style="background:#64748b">🚪</div>' +
              '<div class="lm-texts">' +
                '<div class="lm-title">' + (en ? 'Log out' : 'Выйти из аккаунта') + '</div>' +
                '<div class="lm-sub">' + (en ? 'Sign out and open login screen' : 'Выйти и открыть окно входа / регистрации') + '</div>' +
              '</div>' +
            '</div>' +
            icon('back') +
          '</div>' +
          '<div class="lm-row" id="deleteAccRow" style="cursor:pointer;">' +
            '<div class="lm-left">' +
              '<div class="lm-ico" style="background:#ff3b30">🗑️</div>' +
              '<div class="lm-texts">' +
                '<div class="lm-title" style="color:#ff453a !important;">' + (en ? 'Delete account' : 'Удалить аккаунт') + '</div>' +
                '<div class="lm-sub">' + (en ? 'Permanently delete account from server' : 'Навсегда удалить этот аккаунт с сервера') + '</div>' +
              '</div>' +
            '</div>' +
            icon('close') +
          '</div>' +
        '</div>' +
      '</div></div>';

    $('setBack').addEventListener('click', () => { isEditingProfile = false; close(); });

    p.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextLang = btn.dataset.lang;
        setLang(nextLang);
        App.utils.toast(nextLang === 'en' ? 'Language: English' : 'Язык: Русский');
        open();
      });
    });

    $('logoutRow').addEventListener('click', () => {
      try { Object.keys(localStorage).forEach(k => { if (k.startsWith('tg_') || k.startsWith('looma_profile')) localStorage.removeItem(k); }); } catch (e) {}
      if (App.api && App.api.setToken) App.api.setToken(null);
      location.reload();
    });

    $('deleteAccRow').addEventListener('click', async () => {
      const ok = confirm(en ? 'Delete your account permanently?' : 'Точно удалить этот аккаунт навсегда? Номер, почта и @username снова станут свободны.');
      if (!ok) return;
      try { if (App.api && App.api.deleteAccount) await App.api.deleteAccount(); } catch (e) {}
try { Object.keys(localStorage).forEach(k => { if (k.startsWith('tg_') || k.startsWith('looma_profile')) localStorage.removeItem(k); }); } catch (e) {}
location.reload();
});
$('setAvaBox').addEventListener('click', () => $('setAvaInput').click());
$('setAvaInput').addEventListener('change', e => {
const f = e.target.files.item(0);
if (!f) return;
compressAva(f, async url => {
saveExt({ avatar: url });
if (App.me) App.me.avatar = url;
if (App.api && App.api.updateProfile) await App.api.updateProfile({ avatar: url }).catch(() => {});
App.utils.toast(en ? 'Avatar updated' : 'Аватарка Looma обновлена');
open();
});
});
if ($('nameEdit')) $('nameEdit').addEventListener('click', () => { isEditingProfile = true; open(); setTimeout(() => { if ($('profilename')) $('profilename').focus(); }, 30); });
if ($('cancelProfileBtn')) $('cancelProfileBtn').addEventListener('click', () => { isEditingProfile = false; open(); });
if ($('saveProfileBtn')) {
$('saveProfileBtn').addEventListener('click', async () => {
const name = $('profilename').value.trim() || 'Пользователь';
const rawUser = $('profileUser').value.trim().replace(/^@+/, '');
const bio = $('profileBio').value.trim();
try {
if (App.api && App.api.updateProfile) {
const res = await App.api.updateProfile({ name, username: rawUser, bio });
if (res && res.user) App.me = res.user;
}
App.store.updateSettings({ profileName: name });
saveExt({ username: rawUser ? '@' + rawUser : '', bio });
isEditingProfile = false;
App.utils.toast(en ? 'Profile saved' : 'Профиль Looma сохранён');
open();
} catch (err) {
App.utils.toast(err.message || 'Ошибка сохранения');
}
});
}
p.querySelectorAll('.lm-sw').forEach(sw =>
sw.addEventListener('click', () => {
const key = sw.dataset.k;
const on = sw.dataset.on !== '1';
sw.dataset.on = on ? '1' : '0';
if (key === 'darkTheme') {
applyThemeMode(on);
App.utils.toast(on ? (en ? 'Dark theme enabled' : 'Тёмная тема включена') : (en ? 'Light theme enabled' : 'Светлая тема включена'));
return;
}
App.store.updateSettings({ [key]: on });
}));
    p.querySelectorAll('.swatch').forEach(sw =>
      sw.addEventListener('click', () => {
        const c = sw.dataset.c;
        document.documentElement.style.setProperty('--accent', c);
        try { localStorage.setItem('looma_accent', c); } catch (e) {}
        if (App.store && App.store.updateSettings) App.store.updateSettings({ accent: c });
        p.querySelectorAll('.swatch').forEach(x => x.classList.remove('on'));
        sw.classList.add('on');
        App.utils.toast('Цвет акцента обновлён');
      }));
}
function close() {
const p = $('chatpane');
if (!p) return;
p.classList.remove('open');
const en = getLang() === 'en';
p.innerHTML =
'' + icon('logo', 'lg') + '' +
'' + (en ? 'Select a chat to start messaging in Looma' : 'Выберите чат, чтобы начать общение в Looma') + '';
}
return { open, close };
})();
