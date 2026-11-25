/* ================= components/settings.js — Looma Settings View ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.settings = (() => {
  const { $, esc, icon } = App.utils;

  const ACCENTS = ['#7c4dff', '#00e5ff', '#2f80ed', '#00e676', '#ff5252', '#ff9100', '#e040fb', '#ffd740'];
  const THEME_KEY = 'looma_theme';
  const PROFILE_EXT_KEY = 'looma_profile_ext';

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
    App.store.setActive(null);
    if (App.components.chatview.stopPoll) App.components.chatview.stopPoll();
    App.components.chatlist.render(App.store.state.filter);
    App.components.infopanel.close();
    const s = App.store.state.settings;
    const ext = getExt();
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const p = $('chatpane');
    p.classList.add('open');

    const avaStyle = ext.avatar
      ? 'background-image:url(' + ext.avatar + ');background-size:cover;background-position:center;color:transparent;'
      : 'background:linear-gradient(135deg,#00e676,#7c4dff);color:#fff;';

    const profileBlock = isEditingProfile
      ? '<div class="srow" style="flex-direction:column;align-items:stretch;gap:10px;padding-top:4px;">' +
          '<input id="profilename" value="' + esc(s.profileName) + '" placeholder="Ваше имя" maxlength="40" style="padding:10px 12px;">' +
          '<input id="profileUser" value="' + esc(ext.username || '') + '" placeholder="@username (уникальный тег)" maxlength="32" style="padding:10px 12px;">' +
          '<input id="profileBio" value="' + esc(ext.bio || '') + '" placeholder="О себе (описание профиля)" maxlength="120" style="padding:10px 12px;">' +
          '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
            '<button type="button" id="cancelProfileBtn" style="padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--grey);cursor:pointer;font-weight:600;">Отмена</button>' +
            '<button type="button" id="saveProfileBtn" style="padding:8px 16px;border-radius:10px;border:none;background:var(--accent);color:#fff;cursor:pointer;font-weight:700;">Сохранить</button>' +
          '</div>' +
        '</div>'
      : '<div style="flex:1;min-width:0">' +
          '<div style="font-size:16px;font-weight:700;color:var(--text);">' + esc(s.profileName) + '</div>' +
          '<div class="desc" style="color:#00e5ff;font-weight:600;margin-top:2px;">' + esc(ext.username || '@looma_user') + '</div>' +
          (ext.bio ? '<div class="desc" style="margin-top:3px;">' + esc(ext.bio) + '</div>' : '<div class="desc" style="margin-top:2px;">Нажмите на кружок слева для смены фото</div>') +
        '</div>' +
        '<button class="iconbtn" id="nameEdit" title="Редактировать профиль">' + icon('edit') + '</button>';

    p.innerHTML =
      '<div id="settingsview" class="open">' +
      '<div class="shead"><button class="iconbtn" id="setBack">' + icon('back') + '</button>' +
      '<h2>Настройки Looma</h2></div>' +
      '<div class="sbody">' +
        '<div class="scard">' +
          '<div class="srow">' +
            '<div class="avatar g2 a60" id="setAvaBox" title="Нажмите, чтобы загрузить фото" style="cursor:pointer;' + avaStyle + '">' + App.utils.initials(s.profileName) + '</div>' +
            '<input type="file" id="setAvaInput" accept="image/*" style="display:none">' +
            (isEditingProfile
              ? '<div style="flex:1;min-width:0"><div style="font-weight:700;">Редактирование профиля</div><div class="desc">Измените имя, тег или описание ниже</div></div>'
              : profileBlock) +
          '</div>' +
          (isEditingProfile ? profileBlock : '') +
        '</div>' +
        '<div class="scard">' +
          togRow('darkTheme', 'Тёмная тема', 'Глубокий графитовый стиль Looma (выкл. — светлая)', isDark) +
          togRow('notifications', 'Уведомления', 'Показывать счётчики непрочитанных сообщений', s.notifications) +
          togRow('sounds', 'Звуки сообщений', 'Воспроизводить звук при новых сообщениях', s.sounds) +
          togRow('enterToSend', 'Отправка по Enter', 'Enter — отправить, Shift+Enter — новая строка', s.enterToSend) +
        '</div>' +
        '<div class="scard"><div class="srow"><div class="lab">Цвет акцента' +
          '<div class="desc">Применяется к кнопкам, ссылкам и выделениям</div></div></div>' +
          '<div class="srow"><div class="swatchrow">' +
          ACCENTS.map(c =>
            '<div class="swatch' + (s.accent === c ? ' on' : '') + '" data-c="' + c +
            '" style="background:' + c + '" title="' + c + '"></div>').join('') +
          '</div></div></div>' +
        '<div class="scard"><div class="srow danger-row" id="logoutRow" style="cursor:pointer;"><div class="lab">Выйти из аккаунта' +
          '<div class="desc">Выйти и открыть окно входа / регистрации Looma</div></div>' +
          icon('back') + '</div></div>' +
      '</div></div>';

    $('setBack').addEventListener('click', () => { isEditingProfile = false; close(); });

    $('logoutRow').addEventListener('click', () => {
      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('tg_') || k.startsWith('looma_profile')) localStorage.removeItem(k);
        });
      } catch (e) {}
      if (App.api && App.api.setToken) App.api.setToken(null);
      location.reload();
    });

    $('setAvaBox').addEventListener('click', () => $('setAvaInput').click());
    $('setAvaInput').addEventListener('change', e => {
      const f = e.target.files.item(0);
      if (!f) return;
      compressAva(f, url => {
        saveExt({ avatar: url });
        if (App.api && App.api.updateProfile) App.api.updateProfile({ avatar: url }).catch(() => {});
        App.utils.toast('Аватарка Looma обновлена');
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
        const name = $('profilename').value.trim() || 'Looma User';
        const rawUser = $('profileUser').value.trim().replace(/^@+/, '');
        const bio = $('profileBio').value.trim();
        App.store.updateSettings({ profileName: name });
        saveExt({ username: rawUser ? '@' + rawUser : '', bio });
        if (App.api && App.api.updateProfile) {
          App.api.updateProfile({ name, username: rawUser, bio }).catch(() => {});
        }
        isEditingProfile = false;
        App.utils.toast('Профиль Looma сохранён');
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
          App.utils.toast(on ? 'Тёмная тема включена' : 'Светлая тема включена');
          return;
        }
        App.store.updateSettings({ [key]: on });
        App.utils.toast(label(key) + (on ? ': вкл' : ': выкл'));
      }));

    p.querySelectorAll('.swatch').forEach(sw =>
      sw.addEventListener('click', () => {
        App.store.updateSettings({ accent: sw.dataset.c });
        p.querySelectorAll('.swatch').forEach(x => x.classList.remove('on'));
        sw.classList.add('on');
      }));
  }

  function togRow(key, lab, desc, on) {
    return '<div class="srow"><div class="lab">' + esc(lab) +
      '<div class="desc">' + esc(desc) + '</div></div>' +
      '<button class="toggle' + (on ? ' on' : '') + '" data-k="' + key +
      '" role="switch" aria-checked="' + on + '"></button></div>';
  }
  function label(k) {
    return { notifications: 'Уведомления', sounds: 'Звуки', enterToSend: 'Отправка по Enter' }[k] || k;
  }

  function close() {
    const p = $('chatpane');
    p.classList.remove('open');
    p.innerHTML =
      '<div id="welcome"><div class="ball">' + icon('logo', 'lg') + '</div>' +
      '<p>Выберите чат, чтобы начать общение в Looma</p></div>';
  }

  return { open, close };
})();
