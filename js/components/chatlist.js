'use strict';
window.App = window.App || {};
App.components = App.components || {};

App.components.chatlist = (() => {
  const { $, esc, icon, initials } = App.utils;
  let foundUsers = [];
  let searchSeq = 0;

  function renderAva(chat, sizeClass) {
    if (chat.avatar) {
      return '<div class="avatar ' + sizeClass + '" style="background-image:url(' + chat.avatar + ');background-size:cover;background-position:center;color:transparent;">' + initials(chat.name) + '</div>';
    }
    return '<div class="avatar ' + sizeClass + '" style="background:' + esc(chat.color || '#6c47ff') + '">' + esc(chat.initials || initials(chat.name)) + '</div>';
  }

  function snippetHtml(chat, lm) {
    if (!lm) return '<span class="snippet">' + esc(chat.subtitle || '') + '</span>';
    let s = esc(lm.kind === 'text' ? lm.text : kindLabel(lm));
    if (lm.from === (App.me && App.me.username) && chat.type !== 'channel')
      s = '<span class="ticks">✓✓</span> ' + s;
    if (chat.type === 'group' && lm.from !== (App.me && App.me.username) && lm.sender)
      s = '<b>' + esc(lm.sender.split(' ')) + ':</b> ' + s;
    if (chat.type === 'channel') s = 'Канал · ' + s;
    return '<span class="snippet">' + s + '</span>';
  }

  function kindLabel(m) {
    return { image: '📷 Фото', video: '🎬 Видео', file: '📎 ' + (m.fileName || 'Файл'),
      voice: '🎤 Голосовое сообщение', sticker: m.text || 'Стикер' }[m.kind] || '';
  }

  function rowHtml(chat) {
    const lm = App.store.lastMessage(chat);
    const active = App.store.state.activeId === chat.id ? ' active' : '';
    const muted = chat.muted ? ' muted' : '';
    const badge = chat.unread ? '<span class="badge">' + chat.unread + '</span>' : '';
    const pin = chat.pinned ? '<span class="muteIcon">' + icon('pin', 'sm') + '</span>' : '';
    return (
      '<div class="chat' + active + muted + '" data-id="' + chat.id + '">' +
        renderAva(chat, 'a50') +
        '<div class="info"><div class="top">' +
          '<span class="name">' + esc(chat.name) + '</span>' +
          '<span class="time">' + (lm ? esc(lm.time) : '') + '</span>' +
        '</div><div class="bottom">' +
          snippetHtml(chat, lm) +
          '<span class="right">' + pin + badge +
          (chat.muted && !chat.unread ? '<span class="muteIcon">' + icon('mute', 'sm') + '</span>' : '') +
          '</span>' +
        '</div></div>' +
      '</div>'
    );
  }

  function rowMenu(e, chat) {
    e.preventDefault();
    App.components.chatview.closeMenu();
    const menu = App.utils.el(
      '<div class="ctxmenu">' +
        '<button data-a="pin">' + icon('pin') + (chat.pinned ? 'Открепить' : 'Закрепить сверху') + '</button>' +
        '<button data-a="mute">' + icon('mute') + (chat.muted ? 'Включить звук' : 'Без звука') + '</button>' +
        '<button data-a="read">' + icon('check-double') + 'Прочитано</button>' +
      '</div>');
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    $('overlay').appendChild(menu);
    menu.addEventListener('click', ev => {
      const a = ev.target.closest('button') && ev.target.closest('button').dataset.a;
      App.components.chatview.closeMenu();
      const done = () => render(App.store.state.filter);
      if (a === 'pin') App.store.togglePin(chat.id).then(done);
      else if (a === 'mute') App.store.toggleMute(chat.id).then(done);
      else if (a === 'read') App.store.clearUnread(chat.id).then(done);
      else done();
    });
  }

  function render(filter) {
    App.store.state.filter = filter == null ? App.store.state.filter : filter;
    const q = App.store.state.filter.trim().toLowerCase();
    const list = $('chatlist');
    if (!list) return;
    list.innerHTML = '';

    const chats = App.store.sortedChats().filter(c =>
      !q || c.name.toLowerCase().includes(q) ||
      App.store.getMessages(c.id).some(m => (m.text || '').toLowerCase().includes(q)));

    const pinned = chats.filter(c => c.pinned), rest = chats.filter(c => !c.pinned);
    if (pinned.length) {
      list.appendChild(App.utils.el('<div class="pin-sep">Закреплённые</div>'));
      pinned.forEach(c => list.appendChild(mountRow(c)));
    }
    rest.forEach(c => list.appendChild(mountRow(c)));

    // Глобальный поиск пользователей по @username и номеру телефона из верхней строки
    if (q && foundUsers.length) {
      list.appendChild(App.utils.el('<div class="pin-sep">Глобальный поиск людей</div>'));
      foundUsers.forEach(u => {
        const uRow = App.utils.el(
          '<div class="chat" data-user="' + esc(u.username) + '">' +
            renderAva(u, 'a50') +
            '<div class="info"><div class="top"><span class="name">' + esc(u.name) + '</span></div>' +
            '<div class="bottom"><span class="snippet" style="color:var(--accent);">@' + esc(u.username) + ' · написать сообщение</span></div></div>' +
          '</div>'
        );
        uRow.addEventListener('click', async () => {
          try {
            const d = await App.api.createChat({ type: 'dm', username: u.username });
            $('search').value = '';
            foundUsers = [];
            await App.store.loadChats();
            render('');
            App.components.chatview.open(d.chat.id);
          } catch (err) {
            App.utils.toast(err.message);
          }
        });
        list.appendChild(uRow);
      });
    }

    if (!chats.length && !foundUsers.length) {
      list.innerHTML = '<div class="empty-list">Ничего не найдено</div>';
    }
  }

  function mountRow(chat) {
    const row = App.utils.el(rowHtml(chat));
    row.addEventListener('click', () => App.components.chatview.open(chat.id));
    row.addEventListener('contextmenu', e => rowMenu(e, chat));
    return row;
  }

  function bindSearch() {
    $('search').addEventListener('input', async e => {
      const val = e.target.value;
      render(val);
      const q = val.trim();
      const seq = ++searchSeq;
      if (!q) {
        foundUsers = [];
        render('');
        return;
      }
      try {
        const res = await App.api.userSearch(q);
        if (seq !== searchSeq) return;
        foundUsers = res.users || [];
        render(val);
      } catch (err) {}
    });
  }

  return { render, bindSearch };
})();
