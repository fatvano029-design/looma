'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.chatview = (() => {
  const { $, esc, icon, avatar } = App.utils;
  let searchState = null;
  let pollTimer = null;
  let pollCount = 0;

  function pane() { return $('chatpane'); }
  function isEn() { return localStorage.getItem('looma_lang') === 'en'; }

  function stopPoll() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  async function open(id) {
    const chat = App.store.getChat(id);
    if (!chat) return;
    const en = isEn();
    stopPoll();
    App.store.setActive(id);
    if (App.components.infopanel && App.components.infopanel.close) App.components.infopanel.close();
    if (App.components.settings && App.components.settings.close) App.components.settings.close();
    searchState = null;
    pollCount = 0;

    pane().innerHTML =
      '<div id="cheader">' +
        '<div class="avatar ' + (chat.grad || 'g2') + ' a44" data-info style="background:' + esc(chat.color || '#6c47ff') + '">' + App.utils.initials(chat.name) + '</div>' +
        '<div id="ctitle" data-info><div class="name">' + esc(chat.name) + '</div>' +
        '<div class="status" id="cstatus">' + esc(chat.status || chat.subtitle || '') + '</div></div>' +
        '<button class="iconbtn" id="hSearch" title="' + (en ? 'Search in chat' : 'Поиск в чате') + '">' + icon('search') + '</button>' +
        '<button class="iconbtn" id="hMore" title="' + (en ? 'Info & Members' : 'Инфо и участники') + '">' + icon('more') + '</button>' +
      '</div>' +
      '<div id="chatsearch"><input id="csInput" placeholder="' + (en ? 'Search in conversation…' : 'Поиск по сообщениям…') + '">' +
      '<span class="count" id="csCount"></span>' +
      '<button class="iconbtn" id="csClose" title="' + (en ? 'Close' : 'Закрыть') + '">' + icon('close') + '</button></div>' +
      '<div id="messages"><div id="msgsInner"><div class="datebubble">' + (en ? 'Loading…' : 'Загрузка…') + '</div></div></div>' +
      '<div id="replybar"><div style="flex:1;min-width:0">' +
        '<div class="rsender" id="rsSender"></div><div class="rtext" id="rsText"></div></div>' +
        '<button class="iconbtn" id="rsClose" title="' + (en ? 'Cancel reply' : 'Отменить ответ') + '">' + icon('close') + '</button></div>' +
      '<div id="inputbar"></div>';

    pane().classList.add('open');
    document.querySelectorAll('[data-info]').forEach(el =>
      el.addEventListener('click', () => App.components.infopanel.open(chat.id)));
    $('hSearch').addEventListener('click', toggleSearch);
    $('csClose').addEventListener('click', toggleSearch);
    $('csInput').addEventListener('input', e => runSearch(chat, e.target.value));
    $('csInput').addEventListener('keydown', e => { if (e.key === 'Enter') nextMatch(1); });
    $('hMore').addEventListener('click', e => headerMenu(e, chat));
    $('rsClose').addEventListener('click', () => App.components.inputbar.clearReply());

    try {
      await App.store.loadMessages(chat.id);
    } catch (e) {
      $('msgsInner').innerHTML = '<div class="datebubble">' + (en ? 'Could not load messages' : 'Не удалось загрузить сообщения') + '</div>';
    }
    renderMessages(chat);
    App.components.inputbar.mount($('inputbar'), chat);
    App.store.clearUnread(chat.id);
    chat.unread = 0;
    App.components.chatlist.render(App.store.state.filter);
    startPoll(chat);
  }

  function startPoll(chat) {
    stopPoll();
    let lastTs = 0;
    for (const m of App.store.getMessages(chat.id))
      if (m.ts > lastTs) lastTs = m.ts;

    const tick = async () => {
      if (App.store.state.activeId !== chat.id) { stopPoll(); return; }
      try {
        const d = await App.api.messages(chat.id, lastTs);
        const fresh = App.store.mergeMessages(chat.id, d.messages);
        for (const m of fresh) {
          appendMessage(chat, m);
          if (m.ts > lastTs) lastTs = m.ts;
        }
        if (fresh.length) {
          App.store.clearUnread(chat.id);
          chat.unread = 0;
          App.components.chatlist.render(App.store.state.filter);
        }
        const ty = await App.api.getTyping(chat.id);
        renderTyping(chat, (ty && ty.typing) || []);
        pollCount++;
        if (pollCount % 4 === 0) {
          try {
            const keepFilter = App.store.state.filter;
            await App.store.loadChats();
            const ae = document.activeElement;
            if (!ae || ae.id !== 'search') App.components.chatlist.render(keepFilter);
          } catch (e) {}
        }
      } catch (e) {}
    };
    pollTimer = setInterval(tick, 2200);
    tick();
  }

  function renderTyping(chat, typing) {
    const s = $('cstatus');
    const en = isEn();
    if (!s || App.store.state.activeId !== chat.id) return;
    if (typing.length) {
      const names = typing.map(t => (t.name || '').split(' ')[0]);
      s.textContent = en
        ? (names[0] + ' is typing...')
        : (names[0] + ' печатает...');
      s.classList.add('typing');
    } else {
      s.textContent = chat.status || chat.subtitle || '';
      s.classList.remove('typing');
    }
  }

  function headerMenu(e, chat) {
    e.stopPropagation();
    closeMenu();
    const en = isEn();
    const menu = App.utils.el(
      '<div class="ctxmenu">' +
        '<button data-a="info">' + icon('search') + (en ? 'Info & Members (+)' : 'Инфо и участники (+)') + '</button>' +
        '<button data-a="mute">' + icon('mute') + (chat.muted ? (en ? 'Unmute' : 'Включить звук') : (en ? 'Mute' : 'Без звука')) + '</button>' +
      '</div>');
    const r = e.currentTarget.getBoundingClientRect();
    menu.style.top = (r.bottom + 6) + 'px';
    menu.style.right = (window.innerWidth - r.right) + 'px';
    $('overlay').appendChild(menu);
    menu.addEventListener('click', ev => {
      const a = ev.target.closest('button') && ev.target.closest('button').dataset.a;
      closeMenu();
      if (a === 'info') App.components.infopanel.open(chat.id);
      if (a === 'mute') {
        App.store.toggleMute(chat.id).then(() => {
          open(chat.id);
          App.components.chatlist.render(App.store.state.filter);
        });
      }
    });
  }

  function renderMessages(chat) {
    const inner = $('msgsInner');
    const en = isEn();
    if (!inner) return;
    inner.innerHTML = '<div class="datebubble">' + (en ? 'Today' : 'Сегодня') + '</div>';
    for (const m of App.store.getMessages(chat.id)) {
      const b = App.components.bubbles.render(chat, m);
      wireBubble(b, chat, m);
      inner.appendChild(b);
    }
    scrollBottom();
  }

  function appendMessage(chat, m) {
    const inner = $('msgsInner');
    if (!inner || App.store.state.activeId !== chat.id) return;
    const mid = m.mid || m.id;
    if (mid && inner.querySelector('.msg[data-mid="' + mid + '"]')) return;
    const b = App.components.bubbles.render(chat, m);
    wireBubble(b, chat, m);
    inner.appendChild(b);
    App.components.bubbles.animateTicks(b);
    scrollBottom();
  }

  function wireBubble(bubbleEl, chat, m) {
    bubbleEl.addEventListener('contextmenu', e => {
      e.preventDefault();
      msgMenu(e, chat, m, bubbleEl);
    });
  }

  function msgMenu(e, chat, m) {
    closeMenu();
    const en = isEn();
    const canCopy = m.kind === 'text' && m.text;
    const own = m.from === (App.me && App.me.username) || m.out;
    const menu = App.utils.el(
      '<div class="ctxmenu">' +
        '<button data-a="reply">' + icon('back') + (en ? 'Reply' : 'Ответить') + '</button>' +
        '<button data-a="forward">' + icon('send') + (en ? 'Forward' : 'Переслать') + '</button>' +
        (canCopy ? '<button data-a="copy">' + icon('check') + (en ? 'Copy text' : 'Копировать') + '</button>' : '') +
        (own ? '<hr><button data-a="delete" class="danger">' + icon('close') + (en ? 'Delete' : 'Удалить') + '</button>' : '') +
      '</div>');
    menu.style.left = Math.min(e.clientX, window.innerWidth - 210) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 220) + 'px';
    $('overlay').appendChild(menu);
    menu.addEventListener('click', ev => {
      const btn = ev.target.closest('button');
      closeMenu();
      if (!btn) return;
      const a = btn.dataset.a;
      if (a === 'reply') {
        const sender = own ? (en ? 'You' : 'Вы') : (m.sender || chat.name);
        App.components.inputbar.setReply({ mid: m.mid || m.id, sender, text: m.text || kindText(m) });
      }
      if (a === 'forward') openForwardPicker(m);
      if (a === 'copy') {
        try { navigator.clipboard.writeText(m.text); App.utils.toast(en ? 'Copied' : 'Скопировано'); }
        catch (err) {}
      }
      if (a === 'delete') {
        App.store.deleteMessage(chat.id, m.mid || m.id).then(() => {
          renderMessages(chat);
          App.components.chatlist.render(App.store.state.filter);
        }).catch(err => App.utils.toast(err.message));
      }
    });
  }

  function kindText(m) {
    return { image: '📷 Фото', file: '📎 ' + (m.fileName || 'Файл'),
      voice: '🎤 Голосовое сообщение', sticker: m.text || 'Стикер' }[m.kind] || '';
  }

  function openForwardPicker(m) {
    const back = $('modalback');
    const en = isEn();
    back.classList.add('open');
    back.innerHTML =
      '<div id="fwdmodal"><div class="fhead">' + (en ? 'Forward to…' : 'Переслать…') + '</div><div class="flist">' +
      App.store.sortedChats().map(c =>
        '<div class="frow" data-id="' + c.id + '">' + avatar(c, 'a44') +
        '<span class="fname">' + esc(c.name) + '</span></div>').join('') +
      '</div></div>';
    back.querySelectorAll('.frow').forEach(row =>
      row.addEventListener('click', async () => {
        const to = App.store.getChat(row.dataset.id);
const payload = {
kind: m.kind, text: m.text || '',
forwardedFrom: (m.from === (App.me && App.me.username)) ? (App.me.name || 'Вы') : (m.sender || 'Пользователь')
};
if (m.data) payload.data = m.data;
if (m.fileName) payload.fileName = m.fileName;
if (m.fileSize != null) payload.fileSize = m.fileSize;
if (m.duration != null) payload.duration = m.duration;
try {
const saved = await App.store.sendMessage(to.id, payload);
App.utils.toast((en ? 'Forwarded to ' : 'Переслано в ') + to.name);
if (App.store.state.activeId === to.id) appendMessage(to, saved);
App.components.chatlist.render(App.store.state.filter);
} catch (err) {
App.utils.toast(err.message);
}
back.classList.remove('open');
}));
back.onclick = ev => { if (ev.target === back) back.classList.remove('open'); };
}
function showTyping(on, realStatus) {
const s = $('cstatus');
if (!s) return;
if (on) { s.textContent = isEn() ? 'typing...' : 'печатает...'; s.classList.add('typing'); }
else { s.textContent = realStatus || ''; s.classList.remove('typing'); }
}
function toggleSearch() {
const bar = $('chatsearch');
if (!bar) return;
bar.classList.toggle('open');
if (bar.classList.contains('open')) $('csInput').focus();
else { searchState = null; clearHighlights(); }
}
function clearHighlights() {
App.utils.$$('.msg.hl').forEach(x => x.classList.remove('hl'));
const c = $('csCount');
if (c) c.textContent = '';
}
function runSearch(chat, q) {
clearHighlights();
q = q.trim().toLowerCase();
if (!q) { searchState = null; return; }
const matches = [];
App.utils.$$('#msgsInner .msg').forEach(el => {
const m = App.store.findMessage(chat.id, el.dataset.mid);
if (m && (m.text || '').toLowerCase().includes(q)) matches.push(el.dataset.mid);
});
searchState = { matches, idx: -1 };
$('csCount').textContent = matches.length ? '0 / ' + matches.length : (isEn() ? 'no results' : 'нет совпадений');
if (matches.length) nextMatch(1);
}
function nextMatch(dir) {
if (!searchState || !searchState.matches.length) return;
searchState.idx = (searchState.idx + dir + searchState.matches.length) % searchState.matches.length;
App.utils.$$('.msg.hl').forEach(x => x.classList.remove('hl'));
const mid = searchState.matches[searchState.idx];
const el = document.querySelector('#msgsInner .msg[data-mid="' + mid + '"]');
if (el) {
el.classList.add('hl');
el.scrollIntoView({ block: 'center', behavior: 'smooth' });
$('csCount').textContent = (searchState.idx + 1) + ' / ' + searchState.matches.length;
}
}
function scrollBottom() {
const box = $('messages');
if (box) box.scrollTop = box.scrollHeight;
}
function closeMenu() {
App.utils.$$('.ctxmenu').forEach(x => x.remove());
}
document.addEventListener('click', e => {
if (!e.target.closest('.ctxmenu')) closeMenu();
});
return {
open, renderMessages, appendMessage, showTyping,
closeMenu, scrollBottom, toggleSearch, stopPoll
};
})();
