/* ================= components/inputbar.js — Looma Composer (Preview + Real Mic + Channel Lock) ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.inputbar = (() => {
  const { $, esc, icon } = App.utils;
  let currentChat = null;
  let recTimer = null, recSecs = 0;
  let mediaRecorder = null, audioChunks = [];
  let lastTypePing = 0;

  function isEn() { return localStorage.getItem('looma_lang') === 'en'; }

  function mount(container, chat) {
    currentChat = chat;
    const en = isEn();

    if (chat.type === 'channel' && chat.canPost === false) {
      container.innerHTML =
        '<div style="width:100%;text-align:center;padding:10px;color:var(--grey);font-size:13.5px;font-weight:600;">' +
          (en ? 'Only channel administrators can post messages' : 'Публиковать посты в канале могут только администраторы') +
        '</div>';
      return;
    }

    container.innerHTML =
      '<button class="iconbtn" id="bAttach" title="' + (en ? 'Attach' : 'Прикрепить') + '">' + icon('attach') + '</button>' +
      '<div id="recorder"><span class="rdot"></span><span class="rtime">0:00</span>' +
        '<div class="rwaves">' + waves() + '</div>' +
        '<span class="rhint">' + (en ? 'recording… tap mic to send' : 'запись… нажмите микрофон для отправки') + '</span></div>' +
      '<input id="msgInput" placeholder="' + (en ? 'Write a message...' : 'Написать сообщение...') + '" autocomplete="off">' +
      '<button class="iconbtn" id="bEmoji" title="' + (en ? 'Emoji' : 'Эмодзи') + '">' + icon('emoji') + '</button>' +
      '<button class="iconbtn" id="bMic" title="' + (en ? 'Voice message' : 'Голосовое сообщение') + '">' + icon('mic') + '</button>' +
      '<button class="iconbtn" id="sendBtn" title="' + (en ? 'Send' : 'Отправить') + '" style="display:none">' + icon('send') + '</button>' +
      '<div id="emojipick"><div class="etabs"></div><div class="egrid"></div></div>' +
      '<div id="attachmenu">' +
        '<button data-a="photo">' + icon('image') + (en ? 'Photo / Video' : 'Фото или видео') + '</button>' +
        '<button data-a="file">' + icon('file') + (en ? 'Document (File)' : 'Документ (файл)') + '</button>' +
      '</div>';

    buildEmojiPicker();
    const input = $('msgInput');
    input.focus();

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && App.store.state.enterToSend !== false) {
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
      if (a) sendAttachment(a);
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
    if (r && r.mid && (r.text || r.sender)) p.replyTo = { mid: r.mid, sender: r.sender, text: r.text };
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
/* Окно предпросмотра фото, видео или документа перед отправкой /
function sendAttachment(kind) {
if (!currentChat) return;
const en = isEn();
const inp = document.createElement('input');
inp.type = 'file';
if (kind === 'photo') inp.accept = 'image/,video/*';
inp.onchange = () => {
const f = inp.files && inp.files;
if (!f) return;
if (f.size > 4194304) {
App.utils.toast(en ? 'File too large (max 4MB)' : 'Файл слишком большой (макс. 4 МБ)');
return;
}
const rd = new FileReader();
rd.onload = () => {
const isVideo = f.type.startsWith('video/');
const isImage = f.type.startsWith('image/');
const msgKind = isVideo ? 'video' : (isImage ? 'image' : 'file');
const back = $('modalback');
back.classList.add('open');
const previewHtml = isImage
? ''
: (isVideo
? ''
: '' +
'' + icon('file') + '' +
'' + esc(f.name) + '' +
'' + App.utils.fmtSize(f.size) + '' +
'');
back.innerHTML =
'' +
'' +
'' + (en ? 'Send attachment' : 'Предпросмотр перед отправкой') + '' +
'' + icon('close') + '' +
'' +
previewHtml +
'' +
'' +
'' + (en ? 'Cancel' : 'Отмена') + '' +
'' + (en ? 'Send' : 'Отправить') + '' +
'' +
'';
const closePv = () => { back.classList.remove('open'); back.innerHTML = ''; };
const confirmSend = () => {
const cap = ($('pvCaption') && $('pvCaption').value.trim()) || '';
closePv();
const p = basePayload(msgKind);
p.data = rd.result;
p.text = cap;
if (msgKind === 'file') { p.fileName = f.name; p.fileSize = f.size; }
deliver(p);
};
$('pvClose').onclick = closePv;
$('pvCancel').onclick = closePv;
$('pvSend').onclick = confirmSend;
back.onclick = ev => { if (ev.target === back) closePv(); };
setTimeout(() => {
if ($('pvCaption')) {
$('pvCaption').focus();
$('pvCaption').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); confirmSend(); } };
}
}, 40);
};
rd.readAsDataURL(f);
};
inp.click();
}
/* Мгновенная оптимистичная отправка без задержки */
async function deliver(payload) {
const chat = currentChat;
if (!chat) return;
App.store.setReplyTo(null);
hideReplyBar();
const tempMid = 'temp_' + Date.now();
const d = new Date();
const pad = n => String(n).padStart(2, '0');
const tempMsg = Object.assign({}, payload, {
id: tempMid,
mid: tempMid,
chatId: chat.id,
from: App.me && App.me.username,
sender: App.me && App.me.name,
out: true,
ts: Date.now(),
time: pad(d.getHours()) + ':' + pad(d.getMinutes())
});
App.components.chatview.appendMessage(chat, tempMsg);
try {
const saved = await App.store.sendMessage(chat.id, payload);
const oldEl = document.querySelector('.msg[data-mid="' + tempMid + '"]');
if (oldEl && saved && (saved.mid || saved.id)) {
oldEl.dataset.mid = saved.mid || saved.id;
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
mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
mediaRecorder.onstop = () => {
stream.getTracks().forEach(tr => tr.stop());
const dur = recSecs;
if (dur > 0 && currentChat && audioChunks.length) {
const blob = new Blob(audioChunks, { type: 'audio/webm' });
const rd = new FileReader();
rd.onload = () => {
const p = basePayload('voice');
p.duration = dur;
p.data = rd.result;
deliver(p);
};
rd.readAsDataURL(blob);
}
};
mediaRecorder.start();
} catch (err) {
App.utils.toast('Нет доступа к микрофону');
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
```
