/* ================= components/chatview.js — Looma Safe Conversation Pane ================= */
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

    const avaStyle = chat.avatar
      ? 'background-image:url(' + chat.avatar + ');background-size:cover;background-position:center;color:transparent;'
      : 'background:' + esc(chat.color || '#6c47ff') + ';';

    pane().innerHTML =
      '<div id="cheader">' +
        '<button class="iconbtn" id="mobBackBtn" title="Назад">' + icon('back') + '</button>' +
        '<div class="avatar ' + (chat.grad || 'g2') + ' a44" data-info style="' + avaStyle + '">' + App.utils.initials(chat.name) + '</div>' +
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

    if ($('mobBackBtn')) {
      $('mobBackBtn').addEventListener('click', () => {
        stopPoll();
        App.store.setActive(null);
        pane().classList.remove('open');
        App.components.chatlist.render(App.store.state.filter);
      });
    }

    document.querySelectorAll('[data-info]').forEach(el =>
      el.addEventListener('click', () => {
        if (App.components.infopanel && App.components.infopanel.open) App.components.infopanel.open(chat.id);
      }));
    if ($('hSearch')) $('hSearch').addEventListener('click', toggleSearch);
    if ($('csClose')) $('csClose').addEventListener('click', toggleSearch);
    if ($('csInput')) {
      $('csInput').addEventListener('input', e => runSearch(chat, e.target.value));
      $('csInput').addEventListener('keydown', e => { if (e.key === 'Enter') nextMatch(1); });
    }
    if ($('hMore')) $('hMore').addEventListener('click', e => headerMenu(e, chat));
    if ($('rsClose')) $('rsClose').addEventListener('click', () => App.components.inputbar.clearReply());

    try {
      await App.store.loadMessages(chat.id);
    } catch (e) {
      if ($('msgsInner')) $('msgsInner').innerHTML = '<div class="datebubble">' + (en ? 'Could not load messages' : 'Не удалось загрузить сообщения') + '</div>';
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
        if (pollCount % 3 === 0) {
          try {
            const keepFilter = App.store.state.filter;
            await App.store.loadChats();
            const ae = document.activeElement;
            if (!ae || ae.id !== 'search') App.components.chatlist.render(keepFilter);
          } catch (e) {}
        }
      } catch (e) {}
    };
    pollTimer = setInterval(tick, 1800);
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
      msgMenu(e, chat, m);
    });
  }

  function msgMenu(e, chat, m) {
    closeMenu();
    const en = isEn();
    const canCopy = m.kind === 'text' && m.text;
    const own = m.from === (App.me && App.me.username) || m.out;
    const isChanAdmin = chat.type === 'channel' && chat.canPost;
    const canDeleteForAll = own || isChanAdmin;

    const menu = App.utils.el(
      '<div class="ctxmenu">' +
        '<button data-a="reply">' + icon('back') + (en ? 'Reply' : 'Ответить') + '</button>' +
        '<button data-a="forward">' + icon('send') + (en ? 'Forward' : 'Переслать') + '</button>' +
        (canCopy ? '<button data-a="copy">' + icon('check') + (en ? 'Copy text' : 'Копировать') + '</button>' : '') +
        '<hr><button data-a="del_me" class="danger">' + icon('close') + (en ? 'Delete for me' : 'Удалить у себя') + '</button>' +
        (canDeleteForAll ? '<button data-a="del_all" class="danger">' + icon('close') + (en ? 'Delete for everyone' : 'Удалить у всех') + '</button>' : '') +
      '</div>');
    menu.style.left = Math.min(e.clientX, window.innerWidth - 215) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 250) + 'px';
    $('overlay').appendChild(menu);
    menu.addEventListener('click', async ev => {
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
      if (a === 'del_me' || a === 'del_all') {
