/* ================= js/app.js — bootstrap & global wiring ================= */
'use strict';
window.App = window.App || {};

App.applyLang = function () {
  const lang = localStorage.getItem('looma_lang') || 'ru';
  const sInput = document.getElementById('search');
  const wText = document.getElementById('welcomeText');
  if (sInput) sInput.placeholder = lang === 'en' ? 'Search' : 'Поиск';
  if (wText) wText.textContent = lang === 'en'
    ? 'Select a chat to start messaging in Looma'
    : 'Выберите чат, чтобы начать общение в Looma';
};

App.init = function () {
  const { $, icon } = App.utils;

  $('menuBtn').innerHTML = icon('menu');
  $('menuBtn').addEventListener('click', () => App.components.settings.open());

  const ncb = $('newChatBtn');
  if (ncb) {
    ncb.innerHTML = icon('edit');
    ncb.addEventListener('click', () => App.components.newchat.open());
  }

  const sw = document.querySelector('#searchWrap .sic');
  if (sw) sw.innerHTML = icon('search');

  App.components.chatlist.bindSearch();

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const menus = document.querySelectorAll('.ctxmenu');
    if (menus.length) { App.components.chatview.closeMenu(); return; }
    const ip = $('infopanel');
    if (ip && ip.classList.contains('open')) { App.components.infopanel.close(); return; }
    const cs = $('chatsearch');
    if (cs && cs.classList.contains('open')) { App.components.chatview.toggleSearch(); return; }
    const mb = $('modalback');
    if (mb && mb.classList.contains('open')) { mb.classList.remove('open'); }
  });

  const ball = document.querySelector('#welcome .ball');
  if (ball) ball.innerHTML = icon('logo', 'lg');

  App.applyLang();

  if (!App.api.token) {
    App.auth.show();
    return;
  }
  App.boot();
};

App.boot = async function () {
  try {
    const res = await App.api.me();
    App.me = res.user || res;
  } catch (e) {
    App.auth.show('Не удалось подключиться к серверу. Войдите снова.');
    return;
  }
  App.auth.hide();

  if (App.me && App.me.name) {
    App.store.state.settings.profileName = App.me.name;
    try {
      const ext = JSON.parse(localStorage.getItem('looma_profile_ext') || '{}');
      ext.username = App.me.username ? '@' + App.me.username : ext.username;
      if (App.me.bio) ext.bio = App.me.bio;
      if (App.me.avatar) ext.avatar = App.me.avatar;
      localStorage.setItem('looma_profile_ext', JSON.stringify(ext));
    } catch (e) {}
  }

  try {
    await App.store.loadChats();
  } catch (e) {
    App.utils.toast('Ошибка загрузки чатов: ' + e.message);
  }
  App.components.chatlist.render('');
};
App.playMsgSound = function (isIncoming) {
  const s = App.store && App.store.state && App.store.state.settings;
  if (s && s.sounds === false) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isIncoming ? 660 : 520, ctx.currentTime);
    if (isIncoming) osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.17);
  } catch (e) {}
};

try {
  const savedAcc = localStorage.getItem('looma_accent');
  if (savedAcc) document.documentElement.style.setProperty('--accent', savedAcc);
} catch (e) {}

document.addEventListener('DOMContentLoaded', App.init);
