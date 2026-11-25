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
      : '';

    p.innerHTML =
      '<div id="settingsview" class="open">' +
      '<div class="shead"><button class="iconbtn" id="setBack">' + icon('back') + '</button>' +
      '<h2>Настройки Looma</h2></div>' +
      '<div class="sbody">' +
        '<div class="scard">' +
          '<div class="srow">' +
            '<div class="avatar g2 a60" id="setAvaBox" title="Нажмите, чтобы загрузить фото" style="cursor:pointer;' + avaStyle + '">' + App.utils.initials(s.profileName) + '</div>' +
            '<input type="file" id="setAvaInput" accept="image/*" style="display:none">' +
            '<div style="flex:1;min-width:0">' +
              '<input id="profilename" value="' + esc(s.profileName) + '" placeholder="Ваше имя" maxlength="40">' +
              '<div class="desc">Нажмите на кружок слева, чтобы сменить аватарку</div>' +
            '</div>' +
            '<button class="iconbtn" id="nameEdit">' + icon('edit') + '</button>' +
          '</div>' +
          '<div class="srow" style="gap:10px;flex-direction:column;align-items:stretch;">' +
            '<input id="profileUser" value="' + esc(ext.username || '') + '" placeholder="@username (ваш уникальный тег)" maxlength="32">' +
            '<input id="profileBio" value="' + esc(ext.bio || '') + '" placeholder="О себе (описание профиля)" maxlength="120">' +
          '</div>' +
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

    $('setBack').addEventListener('click', close);

    $('logoutRow').addEventListener('click', () => {
      try { localStorage.removeItem('tg_token'); } catch (e) {}
      if (App.api && App.api.setToken) App.api.setToken(null);
      location.reload();
    });

    $('setAvaBox').addEventListener('click', () => $('setAvaInput').click());
    $('setAvaInput').addEventListener('change', e => {
      const f = e.target.files.item(0);
      if (!f) return;
      compressAva(f, url => {
        saveExt({ avatar: url });
        App.utils.toast('Аватарка Looma обновлена');
        open();
      });
    });

    $('nameEdit').addEventListener('click', () => $('profilename').focus());
    $('profilename').addEventListener('change', e => {
      const name = e.target.value.trim() || 'Looma User';
      App.store.updateSettings({ profileName: name });
      App.utils.toast('Имя обновлено');
      open();
    });

    $('profileUser').addEventListener('change', e => {
      const val = e.target.value.trim().replace(/^@+/, '');
      saveExt({ username: val ? '@' + val : '' });
      App.utils.toast('Юзернейм сохранён');
    });

    $('profileBio').addEventListener('change', e => {
      saveExt({ bio: e.target.value.trim() });
      App.utils.toast('Описание профиля обновлено');
    });

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
