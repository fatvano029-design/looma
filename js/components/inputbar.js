/* ================= components/inputbar.js — Real Voice + File Preview + Channel Lock ================= */
'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.inputbar = (() => {
  const { $, esc, icon } = App.utils;
  let currentChat = null;
  let recTimer = null, recSecs = 0, mediaRec = null, audioChunks = [];
  let lastTypePing = 0;

  function isEn() { return localStorage.getItem('looma_lang') === 'en'; }

  function mount(container, chat) {
    if (!container) return;
    currentChat = chat;
    const en = isEn();

    if (chat.type === 'channel' && chat.canPost === false) {
      container.innerHTML = '<div style="width:100%;text-align:center;padding:12px;color:var(--grey);font-size:13.5px;font-weight:600;">' +
        (en ? 'Only channel administrators can post messages' : 'Только администраторы канала могут публиковать посты') + '</div>';
      return;
    }

    container.innerHTML =
      '<button class="iconbtn" id="bAttach" title="' + (en ? 'Attach' : 'Прикрепить') + '">' + icon('attach') + '</button>' +
      '<div id="recorder"><span class="rdot"></span><span class="rtime">0:00</span>' +
        '<div class="rwaves">' + waves() + '</div>' +
        '<span class="rhint">' + (en ? 'recording… tap mic to send' : 'запись… нажмите микрофон для отправки') + '</span></div>' +
      '<input id="msgInput" placeholder="' + (en ? 'Write a message...' : 'Написать сообщение…') + '" autocomplete="off">' +
      '<button class="iconbtn" id="bEmoji" title="Эмодзи">' + icon('emoji') + '</button>' +
      '<button class="iconbtn" id="bMic" title="' + (en ? 'Voice message' : 'Голосовое сообщение') + '">' + icon('mic') + '</button>' +
      '<button class="iconbtn" id="sendBtn" title="' + (en ? 'Send' : 'Отправить') + '" style="display:none">' + icon('send') + '</button>' +
      '<div id="emojipick"><div class="etabs"></div><div class="egrid"></div></div>' +
      '<div id="attachmenu">' +
        '<button data-a="photo">' + icon('image') + (en ? 'Photo / Video' : 'Фото или видео') + '</button>' +
        '<button data-a="file">' + icon('file') + (en ? 'Document' : 'Документ (файл)') + '</button>' +
      '</div>';

    buildEmojiPicker();
    const input = $('msgInput');
    input.focus();

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && App.store.state.enterToSend) {
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
    if (r && r.mid) p.replyTo = { mid: r.mid, sender: r.sender, text: r.text };
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

  function openPreviewModal(file, dataUrl) {
    const en = isEn();
    const back = $('modalback');
    back.classList.add('open');
    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');

    const previewHtml = isImg
      ? '<img src="' + dataUrl + '" style="max-width:100%;max-height:260px;border-radius:12px;margin:0 auto 12px;display:block;object-fit:contain;">'
      : isVid
        ? '<video src="' + dataUrl + '" controls style="max-width:100%;max-height:240px;border-radius:12px;margin:0 auto 12px;display:block;"></video>'
        : '<div style="padding:18px;background:rgba(128,128,128,.12);border-radius:12px;margin-bottom:12px;text-align:center;font-weight:600;">📎 ' + esc(file.name) + '</div>';

    back.innerHTML =
      '<div style="width:100%;max-width:400px;background:var(--panel,#161926);border:1px solid var(--border);border-radius:20px;padding:20px;color:var(--text,#fff);box-shadow:0 20px 50px rgba(0,0,0,.5);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
          '<strong>' + (en ? 'Send attachment' : 'Предпросмотр отправки') + '</strong>' +
          '<button class="iconbtn" id="pvClose">' + icon('close') + '</button>' +
        '</div>' +
        previewHtml +
        '<input id="pvCaption" placeholder="' + (en ? 'Add a caption…' : 'Добавить подпись…') + '" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:rgba(0,0,0,.15);color:inherit;margin-bottom:12px;">' +
        '<div style="display:flex;justify-content:flex-end;gap:8px;">' +
          '<button type="button" id="pvCancel" style="padding:9px 14px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--grey);cursor:pointer;">' + (en ? 'Cancel' : 'Отмена') + '</button>' +
          '<button type="button" id="pvSend" style="padding:9px 18px;border-radius:10px;border:none;background:var(--accent,#7c4dff);color:#fff;font-weight:700;cursor:pointer;">' + (en ? 'Send' : 'Отправить') + '</button>' +
        '</div>' +
      '</div>';

    const closePv = () => { back.classList.remove('open'); back.innerHTML = ''; };
    $('pvClose').onclick = closePv;
    $('pvCancel').onclick = closePv;
    back.onclick = e => { if (e.target === back) closePv(); };

    const doSend = () => {
      const msgKind = isImg ? 'image' : (isVid ? 'video' : 'file');
      const p = basePayload(msgKind);
      p.data = dataUrl;
      p.text = $('pvCaption').value.trim();
      if (msgKind === 'file') { p.fileName = file.name; p.fileSize = file.size; }
      closePv();
      deliver(p);
    };

    $('pvSend').onclick = doSend;
    $('pvCaption').addEventListener('keydown', e => { if (e.key === 'Enter') doSend(); });
    setTimeout(() => $('pvCaption').focus(), 40);
  }

  function sendAttachment(kind) {
    if (!currentChat) return;
    const inp = document.createElement('input');
    inp.type = 'file';
    if (kind === 'photo') inp.accept = 'image/*,video/*';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      if (f.size > 4500000) {
        App.utils.toast(isEn() ? 'File too large (max 4.5MB)' : 'Файл слишком большой (макс. 4.5 МБ)');
        return;
      }
      const rd = new FileReader();
      rd.onload = () => openPreviewModal(f, rd.result);
      rd.onerror = () => App.utils.toast('Не удалось прочитать файл');
      rd.readAsDataURL(f);
    };
    inp.click();
  }

  async function deliver(payload) {
    const chat = currentChat;
    if (!chat) return;
    App.store.setReplyTo(null);
    hideReplyBar();

    const tempMid = 'temp_' + Date.now();
    const optimistic = Object.assign({}, payload, {
      id: tempMid,
      mid: tempMid,
      from: App.me && App.me.username,
      sender: App.me && App.me.name,
      out: true,
      ts: Date.now(),
      time: new Date().toTimeString().slice(0, 5)
    });
    App.components.chatview.appendMessage(chat, optimistic);

    try {
      const saved = await App.store.sendMessage(chat.id, payload);
      const tempEl = document.querySelector('.msg[data-mid="' + tempMid + '"]');
      if (tempEl && saved && saved.mid) tempEl.dataset.mid = saved.mid;
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
      t.textContent = pack.emojis[0];
      t.title = pack.name;
      if (i === 0) t.classList.add('on');
      t.addEventListener('click', () => {
        tabs.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        t.classList.add('on');
        fillGrid(pack);
      });
      tabs.appendChild(t);
    });
    fillGrid(App.data.stickerPacks[0]);
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
async function toggleRecorder() {
const rec = $('recorder'), input = $('msgInput');
const isOpening = !rec.classList.contains('open');
if (isOpening) {
try {
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
audioChunks = [];
mediaRec = new MediaRecorder(stream);
mediaRec.ondataavailable = e => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
mediaRec.onstop = () => {
stream.getTracks().forEach(t => t.stop());
const blob = new Blob(audioChunks, { type: 'audio/webm' });
const dur = recSecs;
if (dur > 0 && currentChat) {
const reader = new FileReader();
reader.onload = () => {
const p = basePayload('voice');
p.duration = dur;
p.data = reader.result;
deliver(p);
};
reader.readAsDataURL(blob);
}
};
mediaRec.start();
} catch (err) {
App.utils.toast(isEn() ? 'Microphone access denied' : 'Нет доступа к микрофону');
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
if (mediaRec && mediaRec.state !== 'inactive') mediaRec.stop();
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
