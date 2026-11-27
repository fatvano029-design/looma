/* ================= components/bubbles.js — Loud Audio Voice + Video + Clean Bubbles ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.bubbles = (() => {
  const { esc, icon, seeded, fmtDur, fmtSize } = App.utils;

  function waveform(mid, bars) {
    const rnd = seeded(mid || 'x');
    let h = '';
    for (let i = 0; i < (bars || 28); i++)
      h += '<i style="height:' + (5 + Math.round(rnd() * 20)) + 'px"></i>';
    return h;
  }

  function ticksHtml(m) {
    return '<span class="meta">' + esc(m.time) + ' ' +
      '<span class="ticks sent" data-tick>✓</span></span>';
  }
  function metaHtml(m) {
    return '<span class="meta">' + esc(m.time) + '</span>';
  }

  function quoteHtml(q) {
    if (!q || (!q.text && !q.sender)) return '';
    return '<div class="quote" data-q><div class="qsender">' + esc(q.sender) +
      '</div><div class="qtext">' + esc(q.text) + '</div></div>';
  }

  function fwdHtml(m) {
    return m.forwardedFrom
      ? '<div class="fwd">Переслано от ' + esc(m.forwardedFrom) + '</div>' : '';
  }

  function bodyHtml(m) {
    switch (m.kind) {
      case 'image':
        return '<img class="pic" src="' + esc(m.src || m.data) + '" alt="photo" loading="lazy">' +
          (m.text ? '<span class="body">' + esc(m.text) + '</span>' : '');
      case 'video':
        return '<video class="pic" src="' + esc(m.src || m.data) + '" controls playsinline></video>' +
          (m.text ? '<span class="body">' + esc(m.text) + '</span>' : '');
      case 'file':
        return '<a class="file" href="' + esc(m.data || '#') + '" download="' + esc(m.fileName || 'file') + '"><div class="fic">' + icon('file') + '</div>' +
          '<div><div class="fname">' + esc(m.fileName || 'Файл') + '</div>' +
          '<div class="fsize">' + fmtSize(m.fileSize || 0) + '</div></div></a>' +
          (m.text ? '<span class="body">' + esc(m.text) + '</span>' : '');
      case 'voice':
        return '<div class="voice"><button class="vplay" data-play>' + icon('play', 'sm') +
          '</button><div class="vwave">' + waveform(m.mid) + '</div>' +
          '<span class="vdur">' + fmtDur(m.duration || 0) + '</span></div>';
      case 'sticker':
        return '<span class="sticker">' + esc(m.text || '👍') + '</span>';
      default:
        return '<span class="body">' + esc(m.text || '') + '</span>';
    }
  }

  function render(chat, m) {
    const d = document.createElement('div');
    const out = m.out || (m.from === (App.me && App.me.username));
    d.className = 'msg ' + (out ? 'out' : 'in') + (m.kind === 'sticker' ? ' stickerbox' : '');
    d.dataset.mid = m.mid || m.id;

    let head = '';
    if (!out && (chat.type === 'group' || chat.type === 'channel') && m.sender)
      head = '<div class="sender" style="color:' + esc(m.color || '#00e5ff') + '">' +
        esc(m.sender) + '</div>';

    d.innerHTML = head + fwdHtml(m) + quoteHtml(m.replyTo) + bodyHtml(m) +
      (out ? ticksHtml(m) : metaHtml(m)) + '<div class="clear"></div>';

    // Настоящее воспроизведение голосовых сообщений с усилением громкости
    const play = d.querySelector('[data-play]');
    if (play) {
      let audioEl = null;
      play.addEventListener('click', () => {
        if (!m.data) {
          App.utils.toast('Аудиофайл не найден');
          return;
        }
        if (!audioEl) {
          audioEl = new Audio(m.data);
          audioEl.volume = 1.0;
          try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) {
              const ctx = new Ctx();
              const src = ctx.createMediaElementSource(audioEl);
              const gain = ctx.createGain();
              gain.gain.value = 3.0; // Усиление громкости x3
              src.connect(gain);
              gain.connect(ctx.destination);
            }
          } catch (e) {}
          audioEl.onended = () => {
            play.classList.remove('on');
            play.innerHTML = icon('play', 'sm');
          };
        }
        const on = play.classList.toggle('on');
        if (on) {
          play.innerHTML = icon('check', 'sm');
          audioEl.play().catch(() => {});
        } else {
          play.innerHTML = icon('play', 'sm');
          audioEl.pause();
        }
      });
    }
    return d;
  }

  function animateTicks(bubbleEl) {
    const t = bubbleEl.querySelector('[data-tick]');
    if (!t) return;
    setTimeout(() => { t.textContent = '✓✓'; }, 350);
    setTimeout(() => { t.classList.remove('sent'); t.classList.add('read'); }, 1100);
  }

  return { render, animateTicks };
})();
