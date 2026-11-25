/* ================= components/settings.js — Looma Settings View ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.settings = (() => {
  const { $, esc, icon } = App.utils;

  const ACCENTS = ['#7c4dff', '#00e5ff', '#2f80ed', '#00e676', '#ff5252', '#ff9100', '#e040fb', '#ffd740'];
  const THEME_KEY = 'looma_theme';

  function applyThemeMode(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch (e) {}
  }

  // Применяем сохранённую тему сразу при загрузке страницы
  let savedTheme = 'dark';
  try { savedTheme = localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) {}
  applyThemeMode(savedTheme !== 'light');

  function open() {
    App.store.setActive(null);
    if (App.components.chatview.stopPoll) App.components.chatview.stopPoll();
    App.components.chatlist.render(App.store.state.filter);
    App.components.infopanel.close();
    const s = App.store.state.settings;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const p = $('chatpane');
    p.classList.add('open');
    p.innerHTML =
      '<div id="settingsview" class="open">' +
      '<div class="shead"><button class="iconbtn" id="setBack">' + icon('back') + '</button>' +
      '<h2>Настройки Looma</h2></div>' +
      '<div class="sbody">' +
        '<div class="scard"><div class="srow">' +
          '<div class="avatar g2 a60">' + App.utils.initials(s.profileName) + '</div>' +
          '<div style="flex:1;min-width:0"><input id="profilename" value="' + esc(s.profileName) + '" maxlength="40">' +
          '<div class="desc">Нажмите, чтобы изменить отображаемое имя</div></div>' +
          '<button class="iconbtn" id="nameEdit">' + icon('edit') + '</button>' +
        '</div></div>' +
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
        '<div class="scard"><div class="srow"><div class="lab">О приложении Looma' +
          '<div class="desc">Looma Messenger · Веб и мобильная версия · Облако Cloud Firestore</div></div>' +
          icon('logo') + '</div></div>' +
        '<div class="scard"><div class="srow danger-row" id="logoutRow"><div class="lab">Выйти из аккаунта' +
          '<div class="desc">Завершить сессию на этом устройстве</div></div>' +
          icon('back') + '</div></div>' +
      '</div></div>';

    $('setBack').addEventListener('click', close);
    $('logoutRow').addEventListener('click', () => {
      App.api.setToken(null);
      location.reload();
    });
    $('nameEdit').addEventListener('click', () => $('profilename').focus());
    $('profilename').addEventListener('change', e => {
      const name = e.target.value.trim() || 'User';
      App.store.updateSettings({ profileName: name });
      App.utils.toast('Имя обновлено');
      open();
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
