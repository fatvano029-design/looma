/* ================= components/settings.js — Looma Settings + Delete Account ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.settings = (() => {
  const { $, esc, icon } = App.utils;

  const ACCENTS = ['#7c4dff', '#00e5ff', '#2f80ed', '#00e676', '#ff5252', '#ff9100', '#e040fb', '#ffd740'];
  const THEME_KEY = 'looma_theme';
  const LANG_KEY = 'looma_lang';
  const PROFILE_EXT_KEY = 'looma_profile_ext';

  function getLang() {
    try { return localStorage.getItem(LANG_KEY) || 'ru'; } catch (e) { return 'ru'; }
  }

  function setLang(l) {
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
    if (App.applyLang) App.applyLang();
  }

  function getExt() {
    try { return JSON.parse(localStorage.getItem(PROFILE_EXT_KEY) || '{}'); } catch (e) { return {}; }
  }

  function saveExt(patch) {
    const next = Object.assign(getExt(), patch);
    try { localStorage.setItem(PROFILE_EXT_KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  }

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

  let isEditingProfile = false;

  function open() {
    try {
      if (App.store && App.store.setActive) App.store.setActive(null);
      if (App.components.chatview && App.components.chatview.stopPoll) App.components.chatview.stopPoll();
      if (App.components.chatlist && App.components.chatlist.render) App.components.chatlist.render(App.store.state.filter || '');
      if (App.components.infopanel && App.components.infopanel.close) App.components.infopanel.close();
    } catch (e) {}

    const s = (App.store && App.store.state && App.store.state.settings) || {};
    const ext = getExt();
    const lang = getLang();
    const en = lang === 'en';
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const p = $('chatpane');
    if (!p) return;
    p.classList.add('open');

    const realName = (App.me && App.me.name) ? App.me.name : (s.profileName || 'Пользователь');
    const realUser = (App.me && App.me.username) ? ('@' + App.me.username) : (ext.username || '@user');
    const realBio = (App.me && App.me.bio !== undefined) ? App.me.bio : (ext.bio || '');
    const realAva = (App.me && App.me.avatar) ? App.me.avatar : ext.avatar;

    const avaStyle = realAva
      ? 'background-image:url(' + realAva + ');background-size:cover;background-position:center;color:transparent;'
      : 'background:linear-gradient(135deg,#00e676,#7c4dff);color:#fff;';

    const profileBlock = isEditingProfile
      ? '<div class="srow" style="flex-direction:column;align-items:stretch;gap:10px;padding-top:4px;">' +
          '<input id="profilename" value="' + esc(realName) + '" placeholder="' + (en ? 'Your name' : 'Ваше имя') + '" maxlength="40" style="padding:10px 12px;">' +
          '<input id="profileUser" value="' + esc(realUser) + '" placeholder="@username" maxlength="32" style="padding:10px 12px;">' +
          '<input id="profileBio" value="' + esc(realBio) + '" placeholder="' + (en ? 'Bio' : 'О себе (описание профиля)') + '" maxlength="120" style="padding:10px 12px;">' +
          '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
            '<button type="button" id="cancelProfileBtn" style="padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--grey);cursor:pointer;font-weight:600;">' + (en ? 'Cancel' : 'Отмена') + '</button>' +
            '<button type="button" id="saveProfileBtn" style="padding:8px 16px;border-radius:10px;border:none;background:var(--accent);color:#fff;cursor:pointer;font-weight:700;">' + (en ? 'Save' : 'Сохранить') + '</button>' +
          '</div>' +
        '</div>'
      : '<div style="flex:1;min-width:0">' +
          '<div style="font-size:16px;font-weight:700;color:var(--text);">' + esc(realName) + '</div>' +
          '<div class="desc" style="color:#00e5ff;font-weight:600;margin-top:2px;">' + esc(realUser) + '</div>' +
          (realBio ? '<div class="desc" style="margin-top:3px;">' + esc(realBio) + '</div>' : '<div class="desc" style="margin-top:2px;">' + (en ? 'Click the circle on the left to change photo' : 'Нажмите на кружок слева для смены фото') + '</div>') +
        '</div>' +
        '<button class="iconbtn" id="nameEdit" title="' + (en ? 'Edit profile' : 'Редактировать профиль') + '">' + icon('edit') + '</button>';

    p.innerHTML =
      '<div id="settingsview" class="open">' +
      '<div class="shead"><button class="iconbtn" id="setBack">' + icon('back') + '</button>' +
      '<h2>' + (en ? 'Looma Settings' : 'Настройки Looma') + '</h2></div>' +
      '<div class="sbody">' +
        '<div class="scard">' +
          '<div class="srow">' +
            '<div class="avatar g2 a60" id="setAvaBox" title="' + (en ? 'Click to upload photo' : 'Нажмите, чтобы загрузить фото') + '" style="cursor:pointer;' + avaStyle + '">' + App.utils.initials(realName) + '</div>' +
            '<input type="file" id="setAvaInput" accept="image/*" style="display:none">' +
            (isEditingProfile
              ? '<div style="flex:1;min-width:0"><div style="font-weight:700;">' + (en ? 'Edit Profile' : 'Редактирование профиля') + '</div><div class="desc">' + (en ? 'Update name, tag or bio below' : 'Измените имя, тег или описание ниже') + '</div></div>'
              : profileBlock) +
          '</div>' +
          (isEditingProfile ? profileBlock : '') +
        '</div>' +
        '<div class="scard">' +
          '<div class="srow">' +
            '<div class="lab">' + (en ? 'Language' : 'Язык интерфейса') +
              '<div class="desc">' + (en ? 'Choose Looma display language' : 'Выберите язык отображения Looma') + '</div>' +
            '</div>' +
            '<div style="display:flex;gap:6px;">' +
              '<button type="button" class="lang-btn" data-lang="ru" style="padding:6px 12px;border-radius:10px;border:1px solid var(--border);cursor:pointer;font-weight:700;background:' + (!en ? 'var(--accent)' : 'transparent') + ';color:' + (!en ? '#fff' : 'var(--text)') + ';">Русский</button>' +
              '<button type="button" class="lang-btn" data-lang="en" style="padding:6px 12px;border-radius:10px;border:1px solid var(--border);cursor:pointer;font-weight:700;background:' + (en ? 'var(--accent)' : 'transparent') + ';color:' + (en ? '#fff' : 'var(--text)') + ';">English</button>' +
            '</div>' +
          '</div>' +
          togRow('darkTheme', en ? 'Dark theme' : 'Тёмная тема', en ? 'Deep graphite Looma style (off — light)' : 'Глубокий графитовый стиль Looma (выкл. — светлая)', isDark) +
          togRow('notifications', en ? 'Notifications' : 'Уведомления', en ? 'Show unread message counters' : 'Показывать счётчики непрочитанных сообщений', s.notifications) +
          togRow('sounds', en ? 'Message sounds' : 'Звуки сообщений', en ? 'Play sound on incoming messages' : 'Воспроизводить звук при новых сообщениях', s.sounds) +
          togRow('enterToSend', en ? 'Send with Enter' : 'Отправка по Enter', en ? 'Enter — send, Shift+Enter — new line' : 'Enter — отправить, Shift+Enter — новая строка', s.enterToSend) +
        '</div>' +
        '<div class="scard"><div class="srow"><div class="lab">' + (en ? 'Accent color' : 'Цвет акцента') +
          '<div class="desc">' + (en ? 'Applied to buttons, links and highlights' : 'Применяется к кнопкам, ссылкам и выделениям') + '</div></div></div>' +
          '<div class="srow"><div class="swatchrow">' +
          ACCENTS.map(c =>
            '<div class="swatch' + (s.accent === c ? ' on' : '') + '" data-c="' + c +
            '" style="background:' + c + '" title="' + c + '"></div>').join('') +
          '</div></div></div>' +
        '<div class="scard">' +
          '<div class="srow danger-row" id="logoutRow" style="cursor:pointer;"><div class="lab">' + (en ? 'Log out' : 'Выйти из аккаунта') +
            '<div class="desc">' + (en ? 'Sign out and open login / signup screen' : 'Выйти и открыть окно входа / регистрации Looma') + '</div></div>' +
            icon('back') + '</div>' +
          '<div class="srow danger-row" id="deleteAccRow" style="cursor:pointer;color:#ff5252;border-top:1px solid var(--border);"><div class="lab" style="color:#ff5252;">' + (en ? 'Delete account' : 'Удалить аккаунт') +
            '<div class="desc">' + (en ? 'Permanently delete this account from server' : 'Навсегда удалить этот аккаунт с сервера') + '</div></div>' +
            icon('close') + '</div>' +
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
      try {
Object.keys(localStorage).forEach(k => {
if (k.startsWith('tg_') || k.startsWith('looma_profile')) localStorage.removeItem(k);
});
} catch (e) {}
if (App.api && App.api.setToken) App.api.setToken(null);
location.reload();
});
$('deleteAccRow').addEventListener('click', async () => {
const ok = confirm(en ? 'Delete your account permanently?' : 'Точно удалить этот аккаунт навсегда? Номер и @username снова станут свободны.');
if (!ok) return;
try {
if (App.api && App.api.deleteAccount) await App.api.deleteAccount();
} catch (e) {}
try {
Object.keys(localStorage).forEach(k => {
if (k.startsWith('tg_') || k.startsWith('looma_profile')) localStorage.removeItem(k);
});
} catch (e) {}
location.reload();
});
$('setAvaBox').addEventListener('click', () => $('setAvaInput').click());
$('setAvaInput').addEventListener('change', e => {
const f = e.target.files.item(0);
if (!f) return;
compressAva(f, url => {
saveExt({ avatar: url });
if (App.me) App.me.avatar = url;
if (App.api && App.api.updateProfile) App.api.updateProfile({ avatar: url }).catch(() => {});
App.utils.toast(en ? 'Avatar updated' : 'Аватарка Looma обновлена');
open();
});
});
if ($('nameEdit')) {
$('nameEdit').addEventListener('click', () => {
isEditingProfile = true;
open();
setTimeout(() => { if ($('profilename')) $('profilename').focus(); }, 30);
});
}
if ($('cancelProfileBtn')) {
$('cancelProfileBtn').addEventListener('click', () => {
isEditingProfile = false;
open();
});
}
if ($('saveProfileBtn')) {
$('saveProfileBtn').addEventListener('click', () => {
const name = $('profilename').value.trim() || 'Пользователь';
const rawUser = $('profileUser').value.trim().replace(/^@+/, '');
const bio = $('profileBio').value.trim();
App.store.updateSettings({ profileName: name });
saveExt({ username: rawUser ? '@' + rawUser : '', bio });
if (App.me) {
App.me.name = name;
if (rawUser) App.me.username = rawUser;
App.me.bio = bio;
}
if (App.api && App.api.updateProfile) {
App.api.updateProfile({ name, username: rawUser, bio }).catch(() => {});
}
isEditingProfile = false;
App.utils.toast(en ? 'Profile saved' : 'Профиль Looma сохранён');
open();
});
}
p.querySelectorAll('.toggle').forEach(t =>
t.addEventListener('click', () => {
const key = t.dataset.k;
const on = !t.classList.contains('on');
t.classList.toggle('on', on);
t.setAttribute('aria-checked', on);
if (key === 'darkTheme') {
applyThemeMode(on);
App.utils.toast(on ? (en ? 'Dark theme enabled' : 'Тёмная тема включена') : (en ? 'Light theme enabled' : 'Светлая тема включена'));
return;
}
App.store.updateSettings({ [key]: on });
App.utils.toast(label(key, en) + (on ? ': вкл' : ': выкл'));
}));
p.querySelectorAll('.swatch').forEach(sw =>
sw.addEventListener('click', () => {
App.store.updateSettings({ accent: sw.dataset.c });
p.querySelectorAll('.swatch').forEach(x => x.classList.remove('on'));
sw.classList.add('on');
}));
}
function togRow(key, lab, desc, on) {
return '' + esc(lab) +
'' + esc(desc) + '' +
'';
}
function label(k, en) {
if (en) return { notifications: 'Notifications', sounds: 'Sounds', enterToSend: 'Send with Enter' }[k] || k;
return { notifications: 'Уведомления', sounds: 'Звуки', enterToSend: 'Отправка по Enter' }[k] || k;
}
function close() {
const p = $('chatpane');
p.classList.remove('open');
const en = getLang() === 'en';
p.innerHTML =
'' + icon('logo', 'lg') + '' +
'' + (en ? 'Select a chat to start messaging in Looma' : 'Выберите чат, чтобы начать общение в Looma') + '';
}
return { open, close };
})();
