/* ================= components/settings.js — Telegram-Style Settings ================= */
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

  // Сжимаем аватарку так, чтобы она мгновенно грузилась и всегда отображалась у всех
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

    const realName = (App.me && App.me.name) ? App.me.name : (s.profileName && s.profileName !== 'Looma User' ? s.profileName : 'Пользователь');
    const realUser = (App.me && App.me.username) ? ('@' + App.me.username) : (ext.username || '@user');
    const realBio = (App.me && App.me.bio !== undefined) ? App.me.bio : (ext.bio || '');
    const realAva = (App.me && App.me.avatar) ? App.me.avatar : ext.avatar;
    const realPhone = (App.me && App.me.phone) ? App.me.phone : '';
    const realEmail = (App.me && App.me.email) ? App.me.email : '';

    const avaStyle = realAva
      ? 'background-image:url(' + realAva + ');background-size:cover;background-position:center;color:transparent;'
      : 'background:linear-gradient(135deg,#00e676,#7c4dff);color:#fff;';

    const profileBlock = isEditingProfile
      ? '<div style="display:flex;flex-direction:column;gap:10px;padding-top:12px;">' +
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
          (realPhone || realEmail ? '<div style="font-size:12px;color:var(--grey);margin-top:2px;">' + esc([realPhone, realEmail].filter(Boolean).join(' • ')) + '</div>' : '') +
          (realBio ? '<div style="font-size:12.5px;color:var(--grey);margin-top:3px;">' + esc(realBio) + '</div>' : '') +
        '</div>' +
        '<button class="iconbtn" id="nameEdit" title="' + (en ? 'Edit profile' : 'Редактировать профиль') + '">' + icon('edit') + '</button>';

    p.innerHTML =
      '<div id="settingsview" class="open">' +
      '<div class="shead"><button class="iconbtn" id="setBack">' + icon('back') + '</button>' +
      '<h2>' + (en ? 'Looma Settings' : 'Настройки Looma') + '</h2></div>' +
      '<div class="sbody" style="display:flex;flex-direction:column;gap:14px;">' +
        '<div class="scard">' +
          '<div style="display:flex;align-items:center;gap:14px;">' +
            '<div class="avatar g2 a60" id="setAvaBox" title="' + (en ? 'Click to upload photo' : 'Нажмите, чтобы сменить фото') + '" style="cursor:pointer;flex-shrink:0;' + avaStyle + '">' + App.utils.initials(realName) + '</div>' +
            '<input type="file" id="setAvaInput" accept="image/*" style="display:none">' +
            (isEditingProfile
              ? '<div style="flex:1;min-width:0"><div style="font-weight:700;">' + (en ? 'Edit Profile' : 'Редактирование профиля') + '</div><div class="desc">' + (en ? 'Update name, tag or bio' : 'Измените имя, тег или описание') + '</div></div>'
              : profileBlock) +
          '</div>' +
          (isEditingProfile ? profileBlock : '') +
        '</div>' +

        '<div style="font-size:12px;font-weight:700;letter-spacing:0.6px;color:var(--grey);padding:0 6px;text-transform:uppercase;">' + (en ? 'Interface & Preferences' : 'Основные настройки') + '</div>' +
        '<div class="scard" style="padding:6px 14px;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;">' +
            '<div style="display:flex;align-items:center;gap:12px;min-width:0;">' +
              '<div style="width:32px;height:32px;border-radius:8px;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0;">Аа</div>' +
              '<div><div style="font-weight:600;font-size:14px;">' + (en ? 'Language' : 'Язык интерфейса') + '</div>' +
                '<div style="font-size:12px;color:var(--grey);">' + (en ? 'Choose Looma display language' : 'Выберите язык отображения Looma') + '</div></div>' +
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

        '<div class="scard"><div style="margin-bottom:10px;"><div style="font-weight:600;font-size:14px;">' + (en ? 'Accent color' : 'Цвет акцента') + '</div>' +
          '<div style="font-size:12px;color:var(--grey);">' + (en ? 'Applied to buttons and highlights' : 'Применяется к кнопкам, ссылкам и выделениям') + '</div></div>' +
          '<div class="swatchrow">' +
          ACCENTS.map(c =>
'').join('') +
'' +
'' +
'' +
'' +
'🚪' +
'' + (en ? 'Log out' : 'Выйти из аккаунта') + '' +
'' + (en ? 'Sign out and open login screen' : 'Выйти и открыть окно входа / регистрации') + '' +
'' +
icon('back') +
'' +
'' +
'' +
'🗑️' +
'' + (en ? 'Delete account' : 'Удалить аккаунт') + '' +
'' + (en ? 'Permanently delete account from server' : 'Навсегда удалить этот аккаунт с сервера') + '' +
'' +
icon('close') +
'' +
'' +
'';
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
const ok = confirm(en ? 'Delete your account permanently?' : 'Точно удалить этот аккаунт навсегда? Номер, почта и @username снова станут свободны.');
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
compressAva(f, async url => {
saveExt({ avatar: url });
if (App.me) App.me.avatar = url;
if (App.api && App.api.updateProfile) {
await App.api.updateProfile({ avatar: url }).catch(() => {});
}
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
p.querySelectorAll('.tg-switch').forEach(sw =>
sw.addEventListener('click', () => {
const key = sw.dataset.k;
const on = sw.dataset.on !== '1';
sw.dataset.on = on ? '1' : '0';
sw.style.background = on ? '#34c759' : 'rgba(120,120,128,0.36)';
const knob = sw.querySelector('span');
if (knob) knob.style.transform = on ? 'translateX(20px)' : 'translateX(2px)';
if (key === 'darkTheme') {
applyThemeMode(on);
App.utils.toast(on ? (en ? 'Dark theme enabled' : 'Тёмная тема включена') : (en ? 'Light theme enabled' : 'Светлая тема включена'));
return;
}
App.store.updateSettings({ [key]: on });
}));
p.querySelectorAll('.swatch').forEach(sw =>
sw.addEventListener('click', () => {
App.store.updateSettings({ accent: sw.dataset.c });
p.querySelectorAll('.swatch').forEach(x => x.classList.remove('on'));
sw.classList.add('on');
}));
}
function tgRow(key, iconBg, emoji, lab, desc, on) {
const bg = on ? '#34c759' : 'rgba(120,120,128,0.36)';
const tx = on ? 'translateX(20px)' : 'translateX(2px)';
return '' +
'' +
'' + emoji + '' +
'' + esc(lab) + '' +
'' + esc(desc) + '' +
'' +
'' +
'' +
'';
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
