/* ================= components/bubbles.js — Real Audio Playback, Video & Clean Quotes ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.bubbles = (() => {
  const { esc, icon, seeded, fmtDur, fmtSize } = App.utils;
  let activeAudio = null;
  let activeBtn = null;

  function waveform(mid, bars) {
    const rnd = seeded(mid || 'x');
    let h = '';
    for (let i = 0; i < (bars || 28); i++)
      h += '<i style="height:' + (5 + Math.round(rnd() * 20)) + 'px"></i>';
    return h;
  }

  function ticksHtml(m) {
    return '<span class="meta">' + esc(m.time || '') + ' ' +
      '<span class="ticks sent" data-tick>✓✓</span></span>';
  }
  function metaHtml(m) {
    return '<span class="meta">' + esc(m.time || '') + '</span>';
  }

  // Строгая проверка цитаты: убирает пустую синюю полоску над текстом
  function quoteHtml(q) {
    if (!q || (!q.text && !q.sender)) return '';
    return '<div class="quote" data-q><div class="qsender">' + esc(q.sender || '') +
      '</div><div class="qtext">' + esc(q.text || '') + '</div></div>';
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
        return '<video class="pic" src="' + esc(m.src || m.data) + '" controls playsinline style="max-height:320px;background:#000;"></video>' +
          (m.text ? '<span class="body">' + esc(m.text) + '</span>' : '');
      case 'file':
        return '<a class="file" href="' + esc(m.data || '#') + '" download="' + esc(m.fileName || 'file') + '">' +
          '<div class="fic">' + icon('file') + '</div>' +
          '<div><div class="fname">' + esc(m.fileName || 'Документ') + '</div>' +
          '<div class="fsize">' + fmtSize(m.fileSize || 0) + ' · Нажмите, чтобы скачать</div></div></a>' +
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
    if (!out && (chat.type === 'group' || chat.type === 'channel') && m.sender) {
      head = '<div class="sender" style="color:' + esc(m.color || '#00e5ff') + '">' + esc(m.sender) + '</div>';
    }

    d.innerHTML = head + fwdHtml(m) + quoteHtml(m.replyTo) + bodyHtml(m) +
      (out ? ticksHtml(m) : metaHtml(m)) + '<div class="clear"></div>';

    // Настоящее воспроизведение записанного голосового сообщения
    const play = d.querySelector('[data-play]');
    if (play) {
      play.addEventListener('click', () => {
        if (!m.data) {
          App.utils.toast('Аудиофайл не найден');
          return;
        }
        if (activeAudio && activeBtn === play) {
          activeAudio.pause();
          activeAudio = null;
          play.innerHTML = icon('play', 'sm');
          activeBtn = null;
          return;
        }
        if (activeAudio) {
          activeAudio.pause();
          if (activeBtn) activeBtn.innerHTML = icon('play', 'sm');
        }
        const audio = new Audio(m.data);
        activeAudio = audio;
        activeBtn = play;
        play.innerHTML = icon('close', 'sm');
        const bars = d.querySelectorAll('.vwave i');

        audio.ontimeupdate = () => {
          if (!audio.duration) return;
          const pct = audio.currentTime / audio.duration;
          const activeCount = Math.floor(pct * bars.length);
          bars.forEach((b, idx) => b.classList.toggle('played', idx <= activeCount));
        };
        audio.onended = () => {
          play.innerHTML = icon('play', 'sm');
          bars.forEach(b => b.classList.remove('played'));
          activeAudio = null;
          activeBtn = null;
        };
        audio.play().catch(() => App.utils.toast('Не удалось воспроизвести аудио'));
      });
    }
    return d;
  }

  function animateTicks(bubbleEl) {
    const t = bubbleEl.querySelector('[data-tick]');
    if (!t) return;
    setTimeout(() => { t.textContent = '✓✓'; }, 250);
    setTimeout(() => { t.classList.remove('sent'); t.classList.add('read'); }, 800);
  }

  return { render, animateTicks };
})();
