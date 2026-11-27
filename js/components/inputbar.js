/* ================= components/inputbar.js — Preview Modal, Real Mic & Instant Send ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.inputbar = (() => {
  const { $, esc, icon, fmtSize } = App.utils;
  let currentChat = null;
  let recTimer = null, recSecs = 0;
  let mediaRecorder = null, audioChunks = [];
  let lastTypePing = 0;

  function isEn() { return localStorage.getItem('looma_lang') === 'en'; }

  function mount(container, chat) {
    currentChat = chat;
    const en = isEn();

    // В канале обычным подписчикам запрещаем писать
    if (chat.type === 'channel' && chat.canPost === false) {
      container.innerHTML =
        '<div style="width:100%;text-align:center;padding:8px 12px;color:var(--grey);font-size:13.5px;font-weight:600;">' +
          (en ? 'Only channel administrators can post messages' : 'В этом канале писать могут только администраторы') +
        '</div>';
      return;
    }

    container.innerHTML =
      '<button class="iconbtn" id="bAttach" title="' + (en ? 'Attach' : 'Прикрепить') + '">' + icon('attach') + '</button>' +
      '<div id="recorder"><span class="rdot"></span><span class="rtime">0:00</span>' +
        '<div class="rwaves">' + waves() + '</div>' +
        '<span class="rhint">' + (en ? 'Recording… tap mic to send' : 'Запись… нажмите микрофон для отправки') + '</span></div>' +
      '<input id="msgInput" placeholder="' + (en ? 'Write a message...' : 'Написать сообщение…') + '" autocomplete="off">' +
      '<button class="iconbtn" id="bEmoji" title="Emoji">' + icon('emoji') + '</button>' +
      '<button class="iconbtn" id="bMic" title="' + (en ? 'Voice message' : 'Голосовое сообщение') + '">' + icon('mic') + '</button>' +
      '<button class="iconbtn" id="sendBtn" title="' + (en ? 'Send' : 'Отправить') + '" style="display:none">' + icon('send') + '</button>' +
      '<div id="emojipick"><div class="etabs"></div><div class="egrid"></div></div>' +
      '<div id="attachmenu">' +
        '<button data-a="photo">' + icon('image') + (en ? 'Photo or Video' : 'Фото или видео') + '</button>' +
        '<button data-a="file">' + icon('file') + (en ? 'Document / File' : 'Документ (файл)') + '</button>' +
      '</div>';

    buildEmojiPicker();
    const input = $('msgInput');
    input.focus();

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && App.store.state.settings.enterToSend !== false) {
        e.preventDefault();
        sendText();
      }
    });
    input.addEventListener('input', () => {
      const has = input.value.trim().length > 0;
      $('sendBtn').style.display = has ? 'flex' : 'none';
      $('bMic').style.display = has ? 'none' : 'flex';
      const n = Date.now();
      if (n - lastTypePing > 2200 && currentChat) {
        lastTypePing = n;
        App.api.typing(currentChat.id).catch(() => {});
      }
    });
    $('sendBtn').addEventListener('click', sendText);
    $('bEmoji').addEventListener('click', e => {
      e.stopPropagation();
      $('attachmenu').classList.remove('open');
      $('emojipick').classList.toggle('open');
    });
    $('bAttach').addEventListener('click', e => {
      e.stopPropagation();
      $('emojipick').classList.remove('open');
      $('attachmenu').classList.toggle('open');
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#emojipick') && !e.target.closest('#attachmenu')) {
        $('emojipick') && $('emojipick').classList.remove('open');
        $('attachmenu') && $('attachmenu').classList.remove('open');
      }
    });
    $('attachmenu').addEventListener('click', e => {
      const a = e.target.closest('button') && e.target.closest('button').dataset.a;
      if (a) openAttachmentPicker(a);
      $('attachmenu').classList.remove('open');
    });
    $('bMic').addEventListener('click', toggleRecorder);
    if (App.store.state.replyTo) showReplyBar(App.store.state.replyTo);
  }

  function waves() {
    let h = '';
    for (let i = 0; i < 40; i++)
      h += '<i style="animation-delay:' + (i * 37 % 500) + 'ms"></i>';
    return h;
  }

  function basePayload(kind) {
    const r = App.store.state.replyTo;
    const p = { kind: kind || 'text', text: '' };
    if (r && r.text) p.replyTo = { mid: r.mid, sender: r.sender, text: r.text };
    return p;
  }

  function sendText() {
    const input = $('msgInput');
    const text = input.value.trim();
    if (!text || !currentChat) return;
    input.value = '';
    $('sendBtn').style.display = 'none';
    $('bMic').style.display = 'flex';
    const p = basePayload('text');
    p.text = text;
    deliver(p);
  }

  function sendSticker(emoji) {
    if (!currentChat) return;
    const p = basePayload('sticker');
    p.text = emoji;
    $('emojipick').classList.remove('open');
    deliver(p);
  }

  /* Окно предпросмотра перед отправкой фото, видео или документа */
  function openAttachmentPicker(kind) {
    if (!currentChat) return;
    const inp = document.createElement('input');
    inp.type = 'file';
    if (kind === 'photo') inp.accept = 'image/*,video/*';
    inp.onchange = () => {
      const f = inp.files && inp.files;
      if (!f) return;
      if (f.size > 4194304) {
        App.utils.toast('Файл слишком большой (макс. 4 МБ)');
        return;
      }
      const rd = new FileReader();
      rd.onload = () => {
        const isVideo = f.type.startsWith('video/');
        const isImg = f.type.startsWith('image/');
        const realKind = isVideo ? 'video' : (isImg ? 'image' : 'file');
        showPreviewModal(realKind, rd.result, f.name, f.size);
      };
      rd.onerror = () => App.utils.toast('Не удалось прочитать файл');
      rd.readAsDataURL(f);
    };
    inp.click();
  }

  function showPreviewModal(kind, dataUrl, fileName, fileSize) {
    const back = $('modalback');
    const en = isEn();
    back.classList.add('open');

    let mediaPreview = '';
    if (kind === 'image') {
      mediaPreview = '<img src="' + dataUrl + '" style="max-width:100%;max-height:280px;border-radius:12px;object-fit:contain;margin:0 auto 12px;display:block;">';
    } else if (kind === 'video') {
      mediaPreview = '<video src="' + dataUrl + '" controls style="max-width:100%;max-height:260px;border-radius:12px;margin:0 auto 12px;display:block;background:#000;"></video>';
    } else {
      mediaPreview =
        '<div style="display:flex;align-items:center;gap:12px;padding:14px;background:rgba(128,128,128,.12);border-radius:12px;margin-bottom:12px;">' +
          '<div style="width:42px;height:42px;border-radius:50%;background:var(--accent,#7c4dff);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + icon('file') + '</div>' +
          '<div style="min-width:0;"><div style="font-weight:700;word-break:break-all;">' + esc(fileName) + '</div>' +
          '<div style="font-size:12px;color:var(--grey);">' + fmtSize(fileSize) + '</div></div>' +
        '</div>';
    }

    back.innerHTML =
      '<div style="width:100%;max-width:400px;background:var(--panel,#161926);border:1px solid var(--border);border-radius:20px;padding:20px;color:var(--text,#fff);box-shadow:0 20px 50px rgba(0,0,0,.55);animation:popFade .2s ease;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
          '<strong style="font-size:16px;">' + (en ? 'Send media' : 'Предпросмотр перед отправкой') + '</strong>' +
          '<button class="iconbtn" id="pvClose">' + icon('close') + '</button>' +
        '</div>' +
        mediaPreview +
        '<input id="pvCaption" placeholder="' + (en ? 'Add a caption…' : 'Добавить подпись…') + '" style="width:100%;box-sizing:border-box;padding:11px 14px;border-radius:12px;border:1px solid var(--border);background:var(--bg);color:var(--text);margin-bottom:14px;outline:none;">' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
          '<button type="button" id="pvCancel" style="padding:9px 16px;border-radius:12px;border:1px solid var(--border);background:transparent;color:var(--grey);cursor:pointer;font-weight:600;">' + (en ? 'Cancel' : 'Отмена') + '</button>' +
          '<button type="button" id="pvSend" style="padding:9px 20px;border-radius:12px;border:none;background:var(--accent,#7c4dff);color:#fff;cursor:pointer;font-weight:700;">' + (en ? 'Send' : 'Отправить') + '</button>' +
        '</div>' +
      '</div>';

    const closePv = () => { back.classList.remove('open'); back.innerHTML = ''; };
    const confirmPv = () => {
      const cap = $('pvCaption').value.trim();
      closePv();
      const p = basePayload(kind);
      p.data = dataUrl;
      p.text = cap;
      if (kind === 'file') { p.fileName = fileName; p.fileSize = fileSize; }
      deliver(p);
    };

    $('pvClose').onclick = closePv;
    $('pvCancel').onclick = closePv;
    $('pvSend').onclick = confirmPv;
    $('pvCaption').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); confirmPv(); }
    });
    back.onclick = ev => { if (ev.target === back) closePv(); };
    setTimeout(() => $('pvCaption').focus(), 40);
  }

  /* Мгновенная оптимистичная отправка без задержки */
  async function deliver(payload) {
    const chat = currentChat;
    if (!chat) return;
    App.store.setReplyTo(null);
    hideReplyBar();

    const tempId = 'temp_' + Date.now() + '_' + Math.floor(Math.random() * 999);
    const d = new Date();
    const timeStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const optimistic = Object.assign({}, payload, {
      id: tempId,
      mid: tempId,
      from: App.me && App.me.username,
      sender: App.me && App.me.name,
      out: true,
      ts: Date.now(),
      time: timeStr
    });
App.components.chatview.appendMessage(chat, optimistic);
try {
const saved = await App.store.sendMessage(chat.id, payload);
const tempEl = document.querySelector('.msg[data-mid="' + tempId + '"]');
if (tempEl && saved && (saved.mid || saved.id)) {
tempEl.dataset.mid = saved.mid || saved.id;
}
App.components.chatlist.render(App.store.state.filter);
} catch (e) {
App.utils.toast('Ошибка отправки: ' + e.message);
}
}
function buildEmojiPicker() {
const tabs = document.querySelector('#emojipick .etabs');
const grid = document.querySelector('#emojipick .egrid');
App.data.stickerPacks.forEach((pack, i) => {
const t = document.createElement('button');
t.textContent = pack.emojis;
t.title = pack.name;
if (i === 0) t.classList.add('on');
t.addEventListener('click', () => {
tabs.querySelectorAll('button').forEach(x => x.classList.remove('on'));
t.classList.add('on');
fillGrid(pack);
});
tabs.appendChild(t);
});
fillGrid(App.data.stickerPacks);
function fillGrid(pack) {
grid.innerHTML = '';
pack.emojis.forEach(e => {
const b = document.createElement('button');
b.textContent = e;
b.title = pack.name;
b.addEventListener('click', () => insertAtCursor(e));
b.addEventListener('dblclick', () => sendSticker(e));
grid.appendChild(b);
});
}
}
function insertAtCursor(emoji) {
const input = $('msgInput');
if (!input) return;
const s = input.selectionStart || 0, e = input.selectionEnd || 0;
input.value = input.value.slice(0, s) + emoji + input.value.slice(e);
input.focus();
input.selectionStart = input.selectionEnd = s + emoji.length;
input.dispatchEvent(new Event('input'));
}
/* Настоящая запись голоса с микрофона браузера */
async function toggleRecorder() {
const rec = $('recorder'), input = $('msgInput');
const isOpening = !rec.classList.contains('open');
if (isOpening) {
try {
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
audioChunks = [];
mediaRecorder = new MediaRecorder(stream);
mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
mediaRecorder.onstop = () => {
stream.getTracks().forEach(t => t.stop());
const blob = new Blob(audioChunks, { type: 'audio/webm' });
const rd = new FileReader();
rd.onload = () => {
if (recSecs > 0 && currentChat) {
const p = basePayload('voice');
p.duration = recSecs;
p.data = rd.result;
deliver(p);
}
};
rd.readAsDataURL(blob);
};
mediaRecorder.start();
} catch (err) {
App.utils.toast('Разрешите доступ к микрофону в браузере');
return;
}
rec.classList.add('open');
input.style.display = 'none';
$('bEmoji').style.display = 'none';
recSecs = 0;
rec.querySelector('.rtime').textContent = '0:00';
recTimer = setInterval(() => {
recSecs++;
const t = rec.querySelector('.rtime');
if (t) t.textContent = App.utils.fmtDur(recSecs);
}, 1000);
} else {
rec.classList.remove('open');
input.style.display = '';
$('bEmoji').style.display = 'flex';
clearInterval(recTimer);
if (mediaRecorder && mediaRecorder.state !== 'inactive') {
mediaRecorder.stop();
}
}
}
function setReply(q) {
App.store.setReplyTo(q);
showReplyBar(q);
const input = $('msgInput');
if (input) input.focus();
}
function clearReply() {
App.store.setReplyTo(null);
hideReplyBar();
}
function showReplyBar(q) {
const bar = $('replybar');
if (!bar) return;
$('rsSender').textContent = q.sender;
$('rsText').textContent = q.text;
bar.classList.add('open');
}
function hideReplyBar() {
const bar = $('replybar');
if (bar) bar.classList.remove('open');
}
return { mount, setReply, clearReply };
})();
